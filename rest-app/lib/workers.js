// Worker related tasks

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');

// Instantiate worker object
const workers = {};

// Timer to execute worker-process once per minute
workers.loop = function() {
    setInterval(function() {
        workers.gatherAllChecks();
    },1000 * 60);
};

workers.gatherAllChecks = function() {
    _data.list('checks', function(err, checks) {
        if (!err && checks && checks.length > 0) {
            checks.forEach(function(check) {
                // Read in the check dataa
                _data.read('checks', check, function(err, originalCheckData) {
                    if (!err && originalCheckData) {
                        // Pass to check validator and let function continue
                        workers.validateCheckData(originalCheckData);
                    } else {
                        debug("Error: reading one of the check's data", err);
                    }
                });
            });
        } else {
            debug("Warning: No checks to process");
            // Nothing to call back
        }
    });
};

// Sanity-check the check data
workers.validateCheckData = function(originalCheckData) {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all checks pass, pass data along to next step
    if (originalCheckData.id && 
        originalCheckData.userPhone && 
        originalCheckData.protocol && 
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {
            workers.performCheck(originalCheckData);
        } else {
            debug("Error: One of the checks is not properly formatted");
        }
};

// Perform the check, send outcome of check to next step in process
workers.performCheck = function(originalCheckData) {
    // Prepare initial check outcome
    const checkOutcome = {
        'error' : false,
        'responseCode' : false
    };

    // Mark that outcome has not been sent yet
    var outcomeSent = false;

    // Parse hostname and path out of original check data
    const parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // path and not pathname because we want the query string

    // Construct request
    const requestDetails = {
        'protocol' : originalCheckData.protocol+':',
        'hostname' : hostName,
        'method' : originalCheckData.method.toUpperCase(),
        'path' : path,
        'timeout' : originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate request object using http or https module
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, function(res) {
        const status = res.statusCode;
        // Update the checkoutcome and pass data along
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.performCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function(e) {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : e
        };
        if (!outcomeSent) {
            workers.performCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to timeout event
    req.on('timeout', function(e) {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : 'timeout'
        };
        if (!outcomeSent) {
            workers.performCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request
    req.end();
}

// Process the check outcome, update the check data as needed
// Special logic for acommodating a check that has never beem tested before

workers.performCheckOutcome = function(originalCheckData, checkOutcome) {
    // Decide if check is up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    // Decide if alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state;

    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;


    // Save the update
    _data.update('checks',newCheckData.id,newCheckData, function(err) {
        if (!err) {
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debug('Check outcome not changed, no alert needed');
            }
        } else {
            debug("Error trying to save check updates");
        }
    });
};

// Alert use to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
    const msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
        if (!err) {
            debug("Success: User was alerted to a status change in their check via sms: ", msg);
        } else {
            debug("Error: could not send sms alert to user who had a state change in their check");
        }
    });
};

workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // Form log data
    const logData = {
        'check' : originalCheckData,
        'outcome' : checkOutcome,
        'state' : state,
        'alert' : alertWarranted,
        'time' : timeOfCheck
    }
    // Convert data to a string
    const logString = JSON.stringify(logData);
    // Determine name of log file
    const logFileName = originalCheckData.id;
    // Append log string to the file
    _logs.append(logFileName, logString, function(err) {
        if (!err) {
            debug("Logging to a file succeeded");
        } else {
            debug("Logging to file failed");
        }
    });

};

// Timer to execute log rotation process once per day
workers.logRotationLoop = function() {
    setInterval(function() {
        workers.rotateLogs();
    },1000 * 60 * 60 * 24);
};

// Rotate (compress) the log files
workers.rotateLogs = function() {
    // List all uncompressed log files
    _logs.list(false, function(err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(function(logName) {
                const logId = logName.replace('.log','');
                const newFileId = logId+'-'+Date.now();
                _logs.compress(logId,newFileId, function(err) {
                    if (!err) {
                        // Truncate the logs
                        _logs.truncate(logId, function(err) {
                            if (!err) {
                                debug('Success truncating log file');
                            } else {
                                debug('Error truncating log file');
                            }
                        });
                    } else {
                        debug('Error compressiong one of the log files', err);
                    }
                });
            });
        } else {
            debug('No logs found to rotate');
        }
    });
};

// Init script
workers.init = function() {

    // Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m','Background workers are running');

    // Execute all checks
    workers.gatherAllChecks();

    // Call loop so checks will execute later on
    workers.loop();

    // Compress all logs immediately
    workers.rotateLogs();

    // Call compresion loop so logs will be compressed later
    workers.logRotationLoop();
};

module.exports = workers;

