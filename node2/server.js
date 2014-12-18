var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var heartMon = require('./heartMon').heartMon;

// server static folder
app.use(express.static(__dirname + '/static'));

// socket.io server setup
io.of('/heartmon').on('connection', function(socket){
	console.log('a user connected');
});


var count = 0;
function start(){
	setInterval(function(){
	    io.emit('chat message', ('serverping: ' + count + ' message: ' + heartMon.getMessage())); 
		count++;
	}, 1000);
};

function statusHB( status ) {
	console.log( status );
}

// start node web server
//heartMon.init( 'localhost:27017', function(){    // standalone
//heartMon.init( 'localhost:29106', function(){  // primary
//heartMon.init( 'localhost:29107', function(){  // secondary
//heartMon.init( 'localhost:29108', function(){  // arbiter	
//heartMon.init( 'localhost:29107,localhost:29106', function(){  // repset
heartMon.init( 'localhost:28017', statusHB, function(){  // mongos
//heartMon.init( 'localhost:22222', function(){  // everything down TODO
	var server = http.listen(3000, function(){
		var host = server.address().address;
		var port = server.address().port;
		console.log('Listening at http://%s:%s', host, port);
		start();
	});
});



/**
NOTES

socket.broadcast.emit('hi');
socket.on('chat message', function(msg){
	io.emit('chat message', msg)
});
//	socket.on('disconnect', function(){
//		console.log('user disconnected');
//	});



socket.volatile.emit('bieber tweet', tweet);


//server
socket.on('ferret', function (name, fn) {
    fn('woot');
  });
// client
socket.emit('ferret', 'tobi', function (data) {
      console.log(data); // data will be 'woot'
    });

// send to everyone but person who started socket
io.sockets.on('connection', function (socket) {
  socket.broadcast.emit('user connected');
});






*/