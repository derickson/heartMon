function classFromRepStatus(status) {
	if(status == "(not reachable\/healthy)") {
		return "NOTREACH"
	} else {
		return status
	}
}

// utility sort function
var sort_by = function(field, reverse, primer){

   var key = primer ? 
       function(x) {return primer(x[field])} : 
       function(x) {return x[field]};

   reverse = [-1, 1][+!!reverse];

   return function (a, b) {
       return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
     } 
}

function updateCounterObjWData( statsCounter, data ){
	
	var width = data.wide;
	var depth = data.deep;
	
	for(var w = 0; w < width; ++w){
		var shard = data.shards[w];
	
		var primaryMachine = null;
		for(var dd=0; dd<depth; ++dd){
			if( shard.machines[dd].state === "PRIMARY" ){
				primaryMachine = shard.machines[dd];
				//console.log("Found Primary");
				break;
			}
		}
		if(primaryMachine !== null){
			var c = primaryMachine.counters;
			statsCounter.shards[shard["name"]] = c;
			statsCounter.shards[shard["name"]].total = 
				c.getmore + c.insert + c.update + c.command + c.query + c.delete;
		} else {
			//console.log("Did not find primary");
			statsCounter.shards[shard["name"]] = {
				"getmore": 0,
				"insert": 0,
				"update": 0,
				"command": 0,
				"query": 0,
				"delete": 0,
				"total": 0
			};
		}
		
	}
	
}


heartMon = {
	graphSeries : null,
	lastStats: {
		shards: {}
	},
	nowStats: {
		shards: {}
	},
	initialize : function() {
		console.log("heartMon");
		var hDiv = $("div#heartMon");
		
		$.ajax({
			url: '/heartMon',
			async: true,
			cache: false,
			dataType: "json",
			type: 'GET',
			timeout: 5000,
			success: function(data) {
				
				data.shards.sort(sort_by('name', true));
				
				
				var tableStr = "<table id='heartMonTable'>";

				var width = data.wide;
				var depth = data.deep;
				
				var shardNames = [];
				
				updateCounterObjWData(heartMon.nowStats, data);
				
				for(var d = 0; d < depth; ++d){
					
					if(d === 0 ){
						tableStr += "<thead><tr>";
						for(var w = 0; w < width; ++w){
							var shard = data.shards[w];
							tableStr += "<td><span class='shardHead'>"+shard["name"]+"</span> </td>"
							shardNames.push(shard["name"]);
							
						}
						tableStr += "</tr></thead>";
						tableStr += "<tr>";
					}
					
					
					for(var w = 0; w < width; ++w){
						shard.machines.sort(sort_by('id', true));
						
						var shard = data.shards[w];
						var machine = shard.machines[d];
						if(machine){
							tableStr += '<td><div class="'+ classFromRepStatus(machine.state)+'">'+ machine['name'].split('.')[0] + ': ' +machine['state']+'</div> </td>'
						}
					}
					
					tableStr += "</tr>";
				}

				tableStr += "</table>";
				hDiv.html(tableStr);
				
				heartMon.initChart(shardNames);
				
				window.setInterval(function() {
					heartMon.updateHeartMon();
				}, 1000);
			},
			error: function(data) {
				console.log("Init HeartMon Error");
				console.log(data);
			}
		});
	},
	updateCount : 0,
	updateHeartMon : function() {
		heartMon.updateCount++;
		console.log("heartMon");
		var htable = $("table#heartMonTable","div#heartMon");
		
		$.ajax({
			url: '/heartMon',
			async: true,
			cache: false,
			dataType: "json",
			type: 'GET',
			timeout: 1000,
			success: function(data) {

				data.shards.sort(sort_by('name', true));


				var tableStr = "";

				var width = data.wide;
				var depth = data.deep;
				
				for(var d = 0; d < depth; ++d){
					
					if(d === 0 ){
						tableStr += "<thead><tr>";
						for(var w = 0; w < width; ++w){
							var shard = data.shards[w];
							tableStr += "<td><span class='shardHead'>"+shard["name"]+"</span> </td>"
						}
						tableStr += "</tr></thead>";
						tableStr += "<tr>";
					}
					
					
					for(var w = 0; w < width; ++w){
						var shard = data.shards[w];
						
						shard.machines.sort(sort_by('id', true));
						
						var machine = shard.machines[d];
						if(machine){
							//console.log(machine);
							tableStr += '<td><div class="'+ classFromRepStatus(machine.state)+'">'+ machine['name'].split('.')[0] + ': ' +machine['state']+'</div> </td>'
						}
					}
					
					tableStr += "</tr>";
				}

				htable.html(tableStr);
				if(heartMon.graphSeries !== null){
					var time = (new Date()).getTime();
					
					heartMon.lastStats =  JSON.parse(JSON.stringify( heartMon.nowStats ))  ;
					
					updateCounterObjWData(heartMon.nowStats, data);
					
					
					for(var w = 0; w < width; ++w){
						var shard = data.shards[w];
						var shardName = shard["name"];
						
					}
					
					for(var i=0; i< heartMon.graphSeries.length; ++i){
						var shardName = heartMon.shardNames[i];
						var last = heartMon.lastStats.shards[shardName];
						var now = heartMon.nowStats.shards[shardName];
						var val = last.total === 0 ? 0 : now.total - last.total;
						//console.log("Shard: " + shardName + " val: " + val);
						
						var x = time, // current time
	                        y = val;
	                    heartMon.graphSeries[i].addPoint([x, y], true, true);
					}
					
				}
				
			},
			error: function(data) {
				console.log("Update HeartMon Error");
				console.log(data);
			}
		});
		
	},
	
	
	initChart: function( shardNames ) {
		heartMon["shardNames"] = shardNames;
		Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });

        var graphOptions = {
            chart: {
                type: 'column',
                animation: Highcharts.svg, // don't animate in old IE
                marginRight: 10
                
            },
            title: {
                text: 'MongoDB OpCounter'
            },
            xAxis: {
                type: 'datetime',
                tickPixelInterval: 150
            },
            yAxis: {
                min: 0,
				title: {
                    text: 'Op Count'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }],
				stackLabels: {
				 enabled: true,
				 style: {
				   fontWeight: 'bold',
				   color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
				 }
			    }
            },
            tooltip: {
                formatter: function () {
                    return '<b>' + this.series.name + '</b><br/>' +
                        Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br/>' +
                        Highcharts.numberFormat(this.y, 2);
                }
            },
            legend: {
                enabled: true
            },
			plotOptions: {
			            column: {
							borderWidth: 0,
							groupPadding: 0,
							animation: false,
							lineWidth: 0,
							shadow: false,
			                stacking: 'normal',
			                dataLabels: {
			                    enabled: false,
			                    color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
			                    style: {
			                        textShadow: '0 0 3px black, 0 0 3px black'
			                    }
			                }
			            }
			        },
            exporting: {
                enabled: false
            },
            series: []
        };

		var len = shardNames.length;
		for(var x=0; x<len; ++x){
			graphOptions.series.push({
	            name: shardNames[x],
				data: (function () {
	                // generate an array of random data
	                var data = [],
	                    time = (new Date()).getTime(),
	                    i;

	                for (i = -60; i <= 0; i += 1) {
	                    data.push({
	                        x: time + i * 1000,
	                        y: 0
	                    });
	                }
	                return data;
	            }()) 
				
	        });
			
		}
		
		graphOptions.chart.events =  {
            load: function () {
                // set up the updating of the chart each second
                heartMon.graphSeries = this.series;
                //setInterval(function () {
                //    var x = (new Date()).getTime(), // current time
                //        y = Math.random();
                //    series.addPoint([x, y], true, true);
                //}, 1000);
            }
        }

		graph = $('#heartGraph').highcharts(graphOptions);
	}
	


};