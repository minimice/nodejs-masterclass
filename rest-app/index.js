// API

const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

// Respond to requests with string
const server = http.createServer(function(req,res) {

	// Parse URL
	const parsedUrl = url.parse(req.url, true);

	// Get path of URL
	const path = parsedUrl.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g,'');

	// Get query string as object
	var queryStringObject = parsedUrl.query;

	// Get http method
	const method = req.method.toLowerCase();

	// Get headers as an object
	const headers = req.headers;

	// Get the payload if any
	const decoder = new StringDecoder('utf-8');

	// Send response
	res.end('Hello World\n');

	// Log request path
	console.log('Request received with headers', headers);
});

// Start server listen to port 3000
server.listen(3100, function() {
	console.log('Server listening on port 3100');
});

