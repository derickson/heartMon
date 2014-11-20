// import for Express
var express = require('express')
var app = express()
var server = null;

// import for MongoDB functionality
var async = require('async');


// ######### Prep Database
var dbConn = "mongodb://localhost:61017/config";
var MongoClient = require('mongodb').MongoClient;

var db = null;
var shardsCol = null;
var shardList = {}
var shardClients = {};


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
							MongoClient.connect("mongodb://"+hosts+"/admin", {"replSet": repSet}, function(err, dbgiven) {
								if(!err) {
									shardClients[repSet] = dbgiven;
								} else {
									console.log("DB Problem connecting to: " + repSet);
								}
								callback();
							});
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
					repStatus = infoRS;
					adminDB.command({"serverStatus":1}, function(err, infoSS){
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
					});
				});
			}, 
			function(err){
				status['wide'] = status['shards'].length;
				status['deep'] = deep;
				getStatusCallback( status );
			});
	}
};



app.get('/heartMon', function (req, res) {
	HeartMon.getStatus( function(status) {
		res.json(status);
	});
});

app.use(express.static(__dirname + '/../static'));


HeartMon.init( function () {
	server = app.listen(3000, function () {
		var host = server.address().address
		var port = server.address().port
		console.log('MongoDB Monitor Service listening at http://%s:%s', host, port)
	});
});



