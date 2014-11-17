function classFromRepStatus(status) {
	if(status == "(not reachable\/healthy)") {
		return "NOTREACH"
	} else {
		return status
	}
}


heartMon = {
	
	initialize : function() {
		console.log("heartMon");
		var hDiv = $("div#heartMon");
		
		$.ajax({
			url: '/heartMon',
			async: true,
			cache: false,
			dataType: "json",
			type: 'GET',
			success: function(data) {
				
				var tableStr = "<span>MongoDB Health Monitor</span><table id='heartMonTable'>";

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
						var machine = shard.machines[d];
						if(machine){
							tableStr += "<td><div class='"+classFromRepStatus(machine.state)+"'>"+machine["state"]+"</div> </td>"
						}
					}
					
					tableStr += "</tr>";
				}

				tableStr += "</table>";
				hDiv.html(tableStr);
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
	updateHeartMon : function() {
		console.log("heartMon");
		var htable = $("table#heartMonTable","div#heartMon");
		
		$.ajax({
			url: '/heartMon',
			async: true,
			cache: false,
			dataType: "json",
			type: 'GET',
			success: function(data) {
				
				
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
						var machine = shard.machines[d];
						if(machine){
							tableStr += "<td><div class='"+classFromRepStatus(machine.state)+"'>"+machine["state"]+"</div> </td>"
						}
					}
					
					tableStr += "</tr>";
				}

				htable.html(tableStr);
			},
			error: function(data) {
				console.log("Update HeartMon Error");
				console.log(data);
			}
		});
		
	}
};