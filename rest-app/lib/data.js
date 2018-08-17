// Lib for storing data

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for module to be exported
var lib = {};

// Base directory of data folder
lib.baseDir = path.join(__dirname,'/../.data/');

// Write data to a file
lib.create = function(dir, file, data, callback) {
	// Open file for writing
	fs.open(lib.baseDir+dir+'/'+file+'.json','wx', function(err, fileDescriptor) {
		if (!err && fileDescriptor) {
			// Convert data to string
			const stringData = JSON.stringify(data);
			// Write to file and close it
			fs.writeFile(fileDescriptor, stringData, function(err) {
				if (!err) {
					fs.close(fileDescriptor, function(err) {
						if (!err) {
							callback(false);
						} else {
							callback('Error closing new file');
						}
					});
				} else {
					callback('Error writing to new file');
				}
			})
		} else {
			callback('Could not create new file, it may already exist');
		}
	});
};

// Read data from a file
lib.read = function(dir, file, callback) {
	fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8', function(err,data) {
		if (!err && data) {
			const parsedData = helpers.parseJsonToObject(data);
			callback(false, parsedData);
		} else {
			callback(err, data);
		}
	});
}

// Update data inside a file
lib.update = function(dir, file, data, callback) {
	fs.open(lib.baseDir+dir+'/'+file+'.json','r+', function(err,fileDescriptor) {
		if (!err && fileDescriptor) {
			const stringData = JSON.stringify(data);
			fs.truncate(fileDescriptor, function(err) {
				if (!err) {
					fs.writeFile(fileDescriptor, stringData, function(err) {
						if (!err) {
							fs.close(fileDescriptor, function (err) {
								if (!err) {
									callback(false);
								} else {
									callback('Error closing file');
								}
							})
						} else {
							callback('Error writing file');
						}
					});
				} else {
					callback('Error truncating file');
				}
			});
		} else {
			callback('Could not open file as it may not exist yet');
		}
	});
}

// Delete file
lib.delete = function(dir, file, callback) {
	// Unlink the file
	fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err) {
		if (!err) {
			callback(false);
		} else {
			callback('Error deleting file');
		}
	});
}

// List all items in the directory
lib.list = function(dir, callback) {
	fs.readdir(lib.baseDir+dir+'/', function(err, data) {
		if (!err && data && data.length > 0) {
			const trimmedFileNames = [];
			data.forEach(function(filename) {
				trimmedFileNames.push(filename.replace('.json',''));
			});
			callback(false, trimmedFileNames);
		} else {
			callback(err, data);
		}
	});
};

module.exports = lib;