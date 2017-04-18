var http = require('http');

var fs = require('fs');

var path = require('path');

var mime = require('mime');

var cache = {};

// send error response

function send404(response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found');
	response.end();
}

// send file data

function sendFile(response, filePath, fileContent) {
	response.writeHead(200, {
		'Content-Type': mime.lookup(path.basename(filePath))
	});
	response.end(fileContent);
}

// file cache service

function serveStatic(response, cache, absPath) {
	if (cache[absPath]) {
		sendFile(response, absPath, cache[absPath]);
	} else {
		// check file exists
		fs.exists(absPath, function(exists) {
			if (exists) {

				// read target file
				fs.readFile(absPath, function(err, data) {
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data;
						sendFile(response, absPath, data);
					}
				});
			} else {
				send404(response);
			}
		});
	}
}

// create http server

var server = http.createServer(function(request, response) {
	var filePath = false;

	if (request.url == '/') {
		filePath = 'client/index.html';
	} else {
		filePath = 'client' + request.url;
	}

	var absPath = './' + filePath;
	serveStatic(response, cache, absPath);
});

server.listen(1234, function() {
	console.log('server listening on part 1234.');
});
