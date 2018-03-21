function prepareUserMsg(message) {
	return $('<div></div>').text(message);
}

function prepareSystemMsg(message) {
	return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
	var message = $('#send-msg').val();
	var sysMessage;

	if (message.charAt(0) == '/') {
		sysMessage = chatApp.processCommand(message);
		if (sysMessage) {
			$('#messages').append(prepareSystemMsg(sysMessage));
		}
	} else {
		chatApp.sendMessage($('#room').text(), message);
		$('#messages').append(prepareUserMsg(message));
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));
	}

	$('#send-msg').val('');
}

// init socket and handle events

var socket = io.connect();

$(document).ready(function() {
	console.log(socket.id);

	var chatApp = new Chat(socket);

	// show guest name
	socket.on('guestName', function(result) {
		var message;
		if (result.success) {
			message = 'You are now known as ' + result.name;
		} else {
			message = result.message;
		}
		$('#messages').append(prepareSystemMsg(message));
	});

	// show join room
	socket.on('joinRoom', function(result) {
		$('#room').text(result.room);
		$('#messages').append(prepareSystemMsg('Room changed.'));
	});

	// show message
	socket.on('message', function(message) {
		var newElement = $('<div></div>').text(message.text);
		$('#messages').append(newElement);
	});

	// show rooms available
	socket.on('rooms', function(rooms) {
		$('#room-list').empty();

		for (var rid in rooms) {
			var room = rooms[rid];
			if (room != '') {
				$('#room-list').append(prepareSystemMsg(room));
			}
		}

		// click room to join
		$('#room-list div').click(function() {
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-msg').focus();
		});
	});

	// refresh rooms info
	setInterval(function() {
		socket.emit('rooms');
	}, 1000);

	$('#send-msg').focus();
	$('#send-form').submit(function() {
		processUserInput(chatApp, socket);
		return false;
	});
});
