// Request handlers

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Define handlers
var handlers = {};

handlers.users = function(data, callback) {
    var acceptableMethods = ['post','get','put','delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for user's submethods
handlers._users = {};

// Post
// Required data: firstname, lastname, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback) {
    const payload = data.payload;
    // Check all required fields are filled out
    const firstName = typeof(payload.firstName) == 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
    const lastName = typeof(payload.lastName) == 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
    const phone = typeof(payload.phone) == 'string' && payload.phone.trim().length == 10 ? payload.phone.trim() : false;
    const password = typeof(payload.password) == 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;
    const tosAgreement = typeof(payload.tosAgreement) == 'boolean' && payload.tosAgreement ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure user doesn't already exist
        _data.read('users', phone, function(err, data) {
            if (err) {
                // Hash password
                const hashedPassword = helpers.hash(password);

                if (!hashedPassword) {
                    callback(500, {'Error' : 'Could not hash user\'s password'});
                } else {
                    // Create the user
                    const user = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'hashedPassword' : hashedPassword,
                        'tosAgreement' : true
                    };

                    _data.create('users', phone, user, function(err) {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error' : 'Could not create new user'});
                        }
                    });
                }
            } else {
                // User already exists
                callback(400, {'Error' : 'User already exists'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Get
// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user access their object
handlers._users.get = function(data, callback) {
    const queryString = data.queryStringObject;
    console.log("Getting " + queryString.phone);
    // Check phone number is valid
    const phone = typeof(queryString.phone) == 'string' && queryString.phone.trim().length == 10 ? queryString.phone.trim() : false;
    if (phone) {
        _data.read('users', phone, function(error, data) {
            if (!error && data) {
                // Removed hash password from user object
                delete data.hashedPassword;
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required phone number'});
    }
};

// Put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only let an authenticated user access their object
handlers._users.put = function(data, callback) {
    const payload = data.payload;
    // Check all required fields are filled out
    const phone = typeof(payload.phone) == 'string' && payload.phone.trim().length == 10 ? payload.phone.trim() : false;
    // Optional fields
    const firstName = typeof(payload.firstName) == 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
    const lastName = typeof(payload.lastName) == 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
    const password = typeof(payload.password) == 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;

    if (phone) {
        if (firstName || lastName || password) {
            _data.read('users', phone, function(err, userData) {
                if (!err && userData) {
                    // Update fields
                    if (firstName) {
                        userData.firstName = firstName;
                    }
                    if (lastName) {
                        userData.lastName = lastName;
                    }
                    if (password) {
                        userData.password = helpers.hash(password);
                    }
                    // Store the updated user
                    _data.update('users', phone, userData, function(error) {
                        if (!error) {
                            callback(200);
                        } else {
                            console.log(error);
                            callback(500, {'Error' : 'Could not update the user'});
                        }
                    });
                } else {
                    callback(400, {'Error' : 'Specified user does not exist'});
                }
            });
        } else {
            callback(400, {'Error' : 'Missing fields to update'});
        }
    } else {
        callback(400, {'Error' : 'Missing required field phone'});
    }
};

// Delete
// Required data: phone
// @TODO Only let an authenticated user delete their object
// @TODO Cleanup other data files
handlers._users.delete = function(data, callback) {
    const queryString = data.queryStringObject;
    console.log("Deleting " + queryString.phone);
    // Check phone number is valid
    const phone = typeof(queryString.phone) == 'string' && queryString.phone.trim().length == 10 ? queryString.phone.trim() : false;
    if (phone) {
        _data.read('users', phone, function(error, data) {
            if (!error && data) {
                _data.delete('users', phone, function(error) {
                    if (!error) {
                        callback(200);
                    } else {
                        callback(500, {'Error' : 'Could not delete specified user'})
                    }
                });
            } else {
                callback(400, {'Error' : 'Could not find user'});
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required phone number'});
    }
};

handlers.ping = function(data, callback) {
	// Callback http status code
	callback(200);
};

handlers.notFound = function(data, callback) {
	callback(404);
};

handlers.hello = function(data, callback) {
	callback(200, {'message' : 'Hello this is Chooi-Guan Lim, Team Cloud Lead at Scania AB!'});
};

module.exports = handlers;