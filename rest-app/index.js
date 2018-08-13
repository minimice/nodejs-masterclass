// API

const http = require('http');
const https = require('https');
const url = require('url');
const config = require('./lib/config');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');
// const _data = require('./lib/data');

// Instantiating server
const httpServer = http.createServer(function(req,res) {
	unifiedServer(req, res);
});

// Start server listen to port
httpServer.listen(config.httpPort, function() {
	console.log('Server listening on port %s in %s', config.httpPort, config.envName);
});

const httpsServerOptions = {
	'key' : fs.readFileSync('./https/key.pem'),
	'cert' : fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, function(req,res) {
	unifiedServer(req, res);
});

// Start server listen to port
httpsServer.listen(config.httpsPort, function() {
	console.log('Server listening on port %s in %s', config.httpsPort, config.envName);
});

const unifiedServer = function(req, res) {
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
		const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
var router = {
	'ping' : handlers.ping,
	'hello' : handlers.hello,
	'users' : handlers.users
}
