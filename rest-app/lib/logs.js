// Lib for storing and rotating logs

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for module
const lib = {};

// Base directory of logs folder
lib.baseDir = path.join(__dirname,'/../.logs/');

// Append string to a file, create file if it doesn't exist
lib.append = function(file, str, callback) {
    // Open file for appending
    fs.open(lib.baseDir+file+'.log', 'a', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Append to the file and close it
            fs.appendFile(fileDescriptor, str+'\n', function(err) {
                if (!err) {
                    fs.close(fileDescriptor, function(err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing file that was appended');
                        }
                    })
                } else {
                    callback('Error appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
};

// List logs
lib.list = function(includeCompressedLogs, callback) {
    fs.readdir(lib.baseDir, function(err, data) {
        if (!err && data && data.length > 0) {
            const trimmedFileNames = [];
            data.forEach(function(fileName) {
                // Add the .log files
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log',''));
                }
                // Add on the .gz
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64',''));
                }
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};

// Compress contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId, newFileId, callback) {
    const sourceFile = logId+'.log';
    const destFile = newFileId+'.gz.b64';
    // Read source file
    fs.readFile(lib.baseDir+sourceFile, 'utf8', function(err, inputString) {
        if (!err && inputString) {
            // Compress data using gzip
            zlib.gzip(inputString, function(err, buffer) {
                if (!err && buffer) {
                    // Data data to destination file
                    fs.open(lib.baseDir+destFile, 'wx', function(err, fileDescriptor) {
                        if (!err && fileDescriptor) {
                            // Write to the destination file
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                                if (!err) {
                                    // Close detination file
                                    fs.close(fileDescriptor, function(err) {
                                        if (!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    })
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    });
};

// Decompress contents of one .gz.b64 file into a string variable
lib.decompress = function(fileId, callback) {
    const fileName = fileId+'.gz.b64';
    fs.readFile(lib.baseDir+fileName,'utf8', function(err, str) {
        if (!err && str) {
            // Decompress data
            const inputBuffer = Buffer.from(str,'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer) {
                if (!err && outputBuffer) {
                    const str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// Truncate a log file
lib.truncate = function(logId, callback) {
    fs.truncate(lib.baseDir+logId+'.log', 0, function(err) {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
}

module.exports = lib;