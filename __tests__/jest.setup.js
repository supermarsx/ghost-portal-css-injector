/* Jest setup file to enable verbose logging for tests and tear down async helpers */
const injector = require('../injector/style-injection.js');
// Enable logs and set level to 'info' (verbose) for test runs
injector.config.log.enabled = true;
injector.config.log.level = 'info';
// Keep defaults for other settings

// Ensure we cleanup any running watchers/observers after each test so
// Jest doesn't complain 'Cannot log after tests are done'. This will
// temporarily disable logging while cleanup runs to avoid races.
// Combine teardown: clear observers, watchers, injector state and DOM elements
afterEach(() => {
    try {
        // prevent logs while cleaning up
        injector.config._shutdown = true;
        if (typeof injector.clearAll === 'function') injector.clearAll();
        if (injector && injector.observer && typeof injector.observer.clear === 'function') {
            injector.observer.clear();
        }
        if (injector && injector.watcher && typeof injector.watcher.clear === 'function') {
            injector.watcher.clear();
        }
    } catch (err) {
        /* ignore */
    } finally {
        // reset DOM so subsequent tests do not inherit previous state
        try {
            document.head.innerHTML = '';
            document.body.innerHTML = '';
        } catch (err) {
            /* ignore */
        }
        injector.config._shutdown = false;
    }
});

// Export injector for convenience in debugging tools
module.exports = injector;

// Make sure long-lived async helpers are cleaned up between tests so
// we don't get "Cannot log after tests are done" from lingering
// MutationObserver callbacks or watcher intervals.
// No-op: Already cleared in the combined teardown above

afterAll(() => {
    // Additional safety: try clearing again at the very end
    try {
        if (injector && injector.observer && typeof injector.observer.clear === 'function') {
            injector.observer.clear();
        }
    } catch (err) {
        // ignore
    }
    try {
        if (injector && injector.watcher && typeof injector.watcher.clear === 'function') {
            injector.watcher.clear();
        }
    } catch (err) {
        // ignore
    }
});
