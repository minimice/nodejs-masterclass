// Worker related tasks

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');

// Instantiate worker object
const workers = {};

// Timer to execute worker-process once per minute
workers.loop = function() {
    setInterval(function() {
        workers.gatherAllChecks();
    },100 * 60);
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
                        console.log("Error: reading one of the check's data", err);
                    }
                });
            });
        } else {
            console.log("Warning: No checks to process");
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
            console.log("Error: One of the checks is not properly formatted");
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
    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();
    // Save the update
    _data.update('checks',newCheckData.id,newCheckData, function(err) {
        if (!err) {
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome not changed, no alert needed');
            }
        } else {
            console.log("Error trying to save check updates");
        }
    });
};

// Alert use to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
    const msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
        if (!err) {
            console.log("Success: User was alerted to a status change in their check via sms: ", msg);
        } else {
            console.log("Error: could not send sms alert to user who had a state change in their check");
        }
    });
};

// Init script
workers.init = function() {
    // Execute all checks
    workers.gatherAllChecks();

    // Call loop so checks will execute later on
    workers.loop();
};

module.exports = workers;

