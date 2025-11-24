/* Jest setup file to enable verbose logging for tests */
const injector = require('../injector/style-injection.js');
// Enable logs and set level to 'info' (verbose) for test runs
injector.config.log.enabled = true;
injector.config.log.level = 'info';
// Keep defaults for other settings

// Export injector for convenience in debugging tools
module.exports = injector;
