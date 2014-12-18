
// import for MongoDB functionality
var async = require('async');

// ######### Prep Database
var MongoClient = require('mongodb').MongoClient;


// aggressive timeout settings for connecting to sets of things that
// may or may not be active.  Don't want to have to wait for timeouts
// if first thing in sequence of connections is down
var aggConOps = {
	"server": {
		"socketOptions": {
			"connectTimeoutMS": 250,
			"socketTimeoutMS": 250,
			"autoReconnect": true
		}
	}
};

// variable related to server polling
var currentlyCheckingServers = false;
var pollCounter = 0;

// variables related to understanding of discovered topology (cluster)
var db = null;
var shardsCol = null;
var shardList = {};
var shardClients = {};

// variables related to primary connection
var isMongoS = false;
var isRepSet = false;
var dbConnection = null;


function determineIfMongos( hostString, cb) {
	MongoClient.connect( 'mongodb://'+ hostString + '/local' , aggConOps, function(err, dbgiven) {
		if(err){
			console.error('Could Not Connect to DB');
			cb();
		} else {
			
			var test = dbgiven.collection('heartMonShouldNotExist');
			test.stats(function(err,stats){ 
				if(err) {
					if(err.code === 13644){ // can't use local database through mongos
						isMongoS = true;
					} else if(err.errmsg === 'Collection [local.heartMonShouldNotExist] not found.') {
						isMongoS = false;
					} else {
						console.error('Error checking whether this is a mongos or a mongod');
						console.error(err);
					}
				} else { 
					isMongoS = true; 
				}
				dbgiven.close(false, cb);
			});
		}
	});
}

function discoverMongoS(hostString, cb){
	console.log('Discovery MongoS');
	currentlyCheckingServers = false;
	
	shardsCol = null;
	shardList = {};
	shardClients = {};
	
	var dbConn = 'mongodb://'+ hostString + '/config';
	MongoClient.connect(dbConn, function(err, dbgiven) {
		if(err) {
			console.error('error connecting to mongos');
			console.error(err);
		} else {
	    	console.log("  MongoDB mongos discovery connection obtained");
			dbConnection = dbgiven;
			
	        db = dbgiven;
	
	        shardsCol = db.collection('shards');
			shardsCol.find({}).toArray(function(err, shards){
				console.log('  Obtained array of shards, length: ' + shards.length);
				async.each(
					shards, 
					function(s, callback){
						var hostString = s.host;
						var repSet = hostString.split('/')[0];
						var hosts = hostString.split('/')[1];
						shardList[repSet] = {'repSet': repSet, 'hosts': hosts};
						console.log('  Attempting to connect to: ' + repSet + ' at hosts: ' + hosts)
						MongoClient.connect(
							'mongodb://'+hosts+'/admin', 
							// aggressive connection to replica set
							{
								'replSet': repSet,
								'server': aggConOps.server
							}, 
							function(err, dbgiven) {
								if(!err) {
									shardClients[repSet] = dbgiven;
									console.log('    Connection established with: ' + repSet);
								} else {
									console.error('    DB Problem connecting to: ' + repSet);
								}
								callback();
							}
						);
					},
					function(err){
						//done with DB setup, start the server
						cb();
					});
			});
	  } 
	});

}

function discoverMongoD(hostString, cb){
	console.log('Discovery MongoD');
	cb();
}


var HeartMon = {
	'init': function( hostString, statusHB, cb ) {
		dbConn = 'mongodb://'+ hostString + '/config';
		console.log('Initializing HeartMon Connection with connection string: ' + dbConn);

		HeartMon.discover(hostString, function() {
			
			// sleep for 4 seconds
			setTimeout(function() {
				
			  	// start the heartbeat
				console.log('Starting internal heartbeat');
				setInterval(function(){
					pollCounter++;
					HeartMon.getMongoDBStatus(pollCounter, statusHB);
				}, 1000);

				cb();
				
			}, 4000);
			

		});

	},
	
	// discover shape of cluster .. can be called publicly
	'discover': function(hostString, cb) {
		determineIfMongos(hostString, function() {
			
			var whenDiscoveryDone = function() {
				console.log('Done with discovery');
				currentlyCheckingServers = true;
				cb();
			}
			
			if(isMongoS){
				discoverMongoS(hostString, whenDiscoveryDone);
			} else {
				discoverMongoD(hostString, whenDiscoveryDone)
			}
			
		});
	},
	
	// query mongodb resources for status and health
	'getMongoDBStatus': function(pollCount, getStatusCallback ){
		if(!currentlyCheckingServers){ // !currentlyCheckingServers
			console.log('-- skipping getMongoDBStatus as currentlyCheckingServers is false')
		} else { 
			console.log('-- internal heartbeat ping: ' + pollCount);
			
			var status = { 'statusCount': pollCount };
			status.shards = [];
			var deep = 0;

			var keys = Object.keys(shardList)
			async.each( 
				keys, 
				function(repSet, callback){

					var adminDB = shardClients[repSet];
					var repStatus = null;
					var counters = null;
					adminDB.command( {'replSetGetStatus':1},  function(err, infoRS){
						if(!err) {
							repStatus = infoRS;
							adminDB.command({'serverStatus':1}, function(err, infoSS){
								if(!err) {
									counters = infoSS.opcounters;

									var shardDetail =  {
										'name': repSet,
										'machines': []
									};

									var memLen = repStatus.members.length;
									for(var i=0; i<memLen; ++i){
										var stat = repStatus.members[i];
										shardDetail.machines.push({
											'id': String(stat['_id']),
											'name': String(stat['name']),
											'state': String(stat['stateStr']),
											'counters': counters
										});
									}
									deep = Math.max(deep, shardDetail.machines.length);

									status.shards.push(  shardDetail );
									callback();
								} else {
									callback();
								}
							});
						}
						else {
							callback();
						}

					});
				}, 
				function(err){
					status.wide = status.shards.length;
					status.deep = deep;
					getStatusCallback( status );
				});

		}
	},
	
	// public function for getting MongoDB Status
	'checkMongoDBStatus': function(){}
};



/*
var HeartMon = {
	
	
	init: function ( callback ){
		MongoClient.connect(dbConn, function(err, dbgiven) {
		  if(!err) {
		    console.log("MongoDB mongos connection obtained");
		        db = dbgiven;
		        shardsCol = db.collection('shards');

				shardsCol.find({}).toArray(function(err, docs){

					async.each(
						docs, 
						function(s, callback){
							var hostString = s['host'];
							var repSet = hostString.split("/")[0];
							var hosts = hostString.split("/")[1];
							shardList[repSet] = {"repSet": repSet, "hosts": hosts};
							console.log(new Date() + ": attempting to connect to: " + repSet + " at hosts: " + hosts)
							MongoClient.connect(
								"mongodb://"+hosts+"/admin", 
								{
									"replSet": repSet,
									"server": {
										"socketOptions": {
											"connectTimeoutMS": 250,
											"socketTimeoutMS": 250,
											"autoReconnect": true
										}
									}
								}, 
								//?connectTimeoutMS=1000&socketTimeoutMS=1000&autoReconnect=true
								//"autoReconnect": true, "socketOptions": {"connectTimeoutMS": 50}
								function(err, dbgiven) {
									if(!err) {
										shardClients[repSet] = dbgiven;
										console.log(new Date() + ": Connection established with: " + repSet);
									} else {
										console.log(new Date() + ": DB Problem connecting to: " + repSet);
									}
									callback();
								}
							);
						},
						function(err){
							//done with DB setup, start the server
							callback();
						});
				});
		  } else {
		        "DB Problems baby"
		  }
		});
	},
	
	
	getStatus: function( getStatusCallback ) {
		var status = {};
		status['shards'] = [];
		var deep = 0;

		var keys = Object.keys(shardList)
		async.each( 
			keys, 
			function(repSet, callback){

				var adminDB = shardClients[repSet];
				var repStatus = null;
				var counters = null;
				adminDB.command( {"replSetGetStatus":1},  function(err, infoRS){
					if(!err) {
						repStatus = infoRS;
						adminDB.command({"serverStatus":1}, function(err, infoSS){
							if(!err) {
								counters = infoSS['opcounters'];

								var shardDetail =  {
									"name": repSet,
									"machines": []
								};

								var memLen = repStatus['members'].length;
								for(var i=0; i<memLen; ++i){
									var stat = repStatus['members'][i];
									shardDetail['machines'].push({
										"id": String(stat['_id']),
										"name": String(stat['name']),
										"state": String(stat['stateStr']),
										"counters": counters
									});
								}
								deep = Math.max(deep, shardDetail['machines'].length);

								status['shards'].push(  shardDetail );
								callback();
							} else {
								callback();
							}
						});
					}
					else {
						callback();
					}
					
				});
			}, 
			function(err){
				status['wide'] = status['shards'].length;
				status['deep'] = deep;
				getStatusCallback( status );
			});
	}
};	
*/	


exports.heartMon = {
	'init': HeartMon.init,
	'discover': HeartMon.discover,
	'getMongoDBStatus': HeartMon.getMongoDBStatus,
	'getMessage': function() {
		return 'Hello World!';
	}
};