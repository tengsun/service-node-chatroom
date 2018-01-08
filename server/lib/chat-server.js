var socketio = require('socket.io');

var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var roomsUsed = [];
var userRooms = {};

exports.listen = function(server) {
	// init on current http server
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket) {
		console.log('new client: ' + socket.id);

		// assign new name for guest
		guestNumber = assignGuestName(socket, guestNumber, nickNames, 
			namesUsed);

		// join the default room lobby
		joinRoom(socket, 'Lobby');

		// handle msg broadcast, room change, and room join
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeRequest(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		socket.on('rooms', function() {
			socket.emit('rooms', roomsUsed);
		});

		// handle client disconnection
		handleClientDisconnection(socket, nickNames, namesUsed);
	});
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber;
	nickNames[socket.id] = name;

	// emit guest name
	socket.emit('guestName', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

function joinRoom(socket, room) {
	socket.join(room);
	userRooms[socket.id] = room;

	// put into room list
	if (roomsUsed.indexOf(room) == -1) {
		roomsUsed.push(room);
	}

	// emit room and message
	socket.emit('joinRoom', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});

	var roomObj = io.sockets.adapter.rooms[room];
	console.log('room: ' + room + ', users: ' + roomObj.length);
	if (roomObj.length > 1) {
		var summary = 'Users currently in ' + room + ': ';
		var array = [];
		for (var sid in roomObj.sockets) {
			if (sid != socket.id) {
				array.push(nickNames[sid]);
			}
		}
		summary += array.join(', ') + '.';

		// emit message
		socket.emit('message', {text: summary});
	}
}

function handleNameChangeRequest(socket, nickNames, namesUsed) {
	// listen change name
	socket.on('changeName', function(name) {

		// emit guest name
		if (name.indexOf('Guest') == 0) {
			socket.emit('guestName', {
				success: false,
				message: 'Name cannot begin with "Guest".'
			});
		} else {
			if (namesUsed.indexOf(name) == -1) {
				var prevName = nickNames[socket.id];
				var prevNameIdx = namesUsed.indexOf(prevName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[prevNameIdx];

				socket.emit('guestName', {
					success: true,
					name: name
				});
			} else {
				socket.emit('guestName', {
					success: false,
					message: 'The name is already in use.'
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket) {
	// listen message
	socket.on('message', function(message) {
		// emit message
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	})
}

function handleRoomJoining(socket) {
	// listen join
	socket.on('join', function(room) {
		socket.leave(userRooms[socket.id]);
		joinRoom(socket, room.newRoom);
	})
}

function handleClientDisconnection(socket) {
	// listen disconnect
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}
