// Export config variables

// Container for all environments
const environments = {};

// Default to staging
environments.staging = {
	'httpPort' : 3100,
	'httpsPort' : 3101,
	'envName' : 'staging',
	'hashingSecret' : 'superSecret',
	'maxChecks' : 5,
	'twilio' : {
		'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
		'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
		'fromPhone' : '+15005550006'
	}
};

environments.production = {
	'httpPort' : 5000,
	'httpsPort' : 5001,
	'envName' : 'production',
	'hashingSecret' : 'superSecretHuge',
	'maxChecks' : 5,
	'twilio' : {
		'accountSid' : '',
		'authToken' : '',
		'fromPhone' : ''
	}
};

// Determine which one to export
const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check current env exists
const envToExport = typeof(environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging;

module.exports = envToExport;