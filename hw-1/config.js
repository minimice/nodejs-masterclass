// Export config variables

// Container for all environments
var environments = {};

// Default to staging
environments.staging = {
	'httpPort' : 3100,
	'httpsPort' : 3101,
	'envName' : 'staging'
};

environments.production = {
	'httpPort' : 5000,
	'httpsPort' : 5001,
	'envName' : 'production'
};

// Determine which one to export
const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check current env exists
const envToExport = typeof(environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging;

module.exports = envToExport;