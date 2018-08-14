// Helpers for various tasks

const crypto = require('crypto');
const config = require('./config');

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

module.exports = helpers;