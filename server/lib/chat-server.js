var socketio = require('socket.io');

var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
	// init on current http server
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket) {
		console.log('new connection: ' + socket.id);

		// assign new name for guest
		guestNumber = assignGuestName(socket, guestNumber, nickNames, 
			namesUsed);

		joinRoom(socket, 'Lobby');

		// handle msg, room change, and room join
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeRequest(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		socket.on('rooms', function() {
			socket.emit('rooms', io.socket.manager.rooms);
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
	currentRoom[socket.id] = room;

	// emit room and message
	socket.emit('joinRoom', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});

	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var summary = 'Users currently in ' + room + ': ';
		for (var idx in usersInRoom) {
			var userSocketId = usersInRoom[idx].id;
			if (userSocketId != socket.id) {
				if (idx > 0) {
					summary += ', ';
				}
				summary += nickNames[userSocketId];
			}
			summary += '.';

			socket.emit('message', {text: summary});
		}
	}
}

function handleNameChangeRequest(socket, nickNames, namesUsed) {
	socket.on('changeName', function(name) {
		if (name.indexOf('Guest') == 0) {
			socket.emit('guestName', {
				success: false,
				message: 'Name cannot begin with "Guest".'
			});
		} else {
			if (namesUsed.indexOf(names) == -1) {
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
	socket.on('message', function(message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	})
}

function handleRoomJoining(socket) {
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	})
}

function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}
