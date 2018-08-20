
// Server tasks

const http = require('http');
const https = require('https');
const url = require('url');
const config = require('./config');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

// Instantiate server module object
const server = {};

// Instantiating server
server.httpServer = http.createServer(function(req,res) {
	server.unifiedServer(req, res);
});

server.httpsServerOptions = {
	'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
	'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function(req,res) {
	server.unifiedServer(req, res);
});


server.unifiedServer = function(req, res) {
	// Parse URL
	const parsedUrl = url.parse(req.url, true);

	// Get path of URL
	const path = parsedUrl.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g,'');

	// Get query string as object
	const queryStringObject = parsedUrl.query;

	// Get http method
	const method = req.method.toLowerCase();

	// Get headers as an object
	const headers = req.headers;

	// Get the payload if any.  Payloads come in as a stream.
	const decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', function(data) {
		buffer +=  decoder.write(data);
	});
	req.on('end', function() {
		buffer += decoder.end();

		// Chooser handler request should go to
		const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

		// Construct data object
		const data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject' : queryStringObject,
			'method' : method,
			'headers' : headers,
			'payload' : helpers.parseJsonToObject(buffer)
		}

		// Route request to chosen handler
		chosenHandler(data, function(statusCode, payLoad) {
			// Use status code called back by handler
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			// Use payload called by handler
			payLoad = typeof(payLoad) == 'object' ? payLoad : {};

			// Convert payload to string
			const payLoadString = JSON.stringify(payLoad);

			// Return response
			res.setHeader('Content-Type', 'application/json');
			res.writeHead(statusCode);

			// Send response
			res.end(payLoadString);

			// Log request path
			console.log('Returning: ', statusCode, payLoadString);
		});
	});
};

// Define request router
server.router = {
	'ping' : handlers.ping,
	'hello' : handlers.hello,
	'users' : handlers.users,
	'tokens' : handlers.tokens,
	'checks' : handlers.checks
}

// Server init
server.init = function() {
    // Start HTTP server listen to port
    server.httpServer.listen(config.httpPort, function() {
		console.log('\x1b[36m%s\x1b[0m','Server listening on port ' + config.httpPort + ' in ' + config.envName);
    });
    // Start HTTPS server listen to port
    server.httpsServer.listen(config.httpsPort, function() {
		console.log('\x1b[35m%s\x1b[0m','Server listening on port ' + config.httpsPort + ' in ' + config.envName);
    });
}

module.exports = server;