// Helpers for various tasks

const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

const helpers = {};

// Create SHA256 hash
helpers.hash = function(password) {
    if (typeof(password) == 'string' && password.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse JSON string to an object
helpers.parseJsonToObject = function(json) {
    try {
        const obj = JSON.parse(json);
        return obj;
    } catch (e) {
        return {};
    }
};

helpers.createRandomString = function(strLength) {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        const possibleChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var str = '';
        for (i = 1; i <= strLength; i++) {
            // Get random char
            const randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
            // Append to str
            str += randomChar;
        }
        return str;
    } else {
        return false;
    }
}

// Send an SMS message to Twilio
helpers.sendTwilioSms = function(phone, msg, callback) {
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if (phone && msg) {
        // Configure the request payload
        const payload = {
            'From' : config.twilio.fromPhone,
            'To' : '+1'+phone,
            'Body' : msg
        };
        // Send payload to Twilio as a POST
        const stringPayload = querystring.stringify(payload);

        //console.log('/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json');
        //console.log(config.twilio.accountSid+':'+config.twilio.authToken);

        // Configure request details
        const requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate request object
        const request = https.request(requestDetails, function(res) {
            const status = res.statusCode;
            // Callback successfully if request went through
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was '+status);
            }
        });

        // Bind to the error event so it doesn't get thrown
        request.on('error', function(e) {
            callback(e);
        });

        // Add payload
        request.write(stringPayload);

        // End request
        request.end();
    } else {
        callback('Given parameters were missing or invald');
    }
}

module.exports = helpers;