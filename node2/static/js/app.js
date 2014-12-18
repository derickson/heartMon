App = {
	init: function() {
		var socket = io();
		$('form').submit( function(event){
			var msg = $('#m').val();
			console.log(msg);
			socket.emit('chat message', msg);
			$('#m').val('');
			event.preventDefault();
		});
		socket.on('chat message', function(msg){
			$('#messages').append($('<li>').text(msg));
		});
		
	}
}



$( document ).ready( App.init )