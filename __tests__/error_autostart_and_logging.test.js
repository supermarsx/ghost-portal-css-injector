/* Additional tests to reach previously uncovered branches (renamed)
 * Formerly: coverage_more.test.js
 */
const path = require('path');
// vm and fs were previously used for vm-based autostart testing; now we use the exported autostart helper
const injector = require(path.resolve(__dirname, '..', 'injector', 'style-injection.js'));
const { element, config } = injector;

describe('Error branches, autostart and logging (renamed)', () => {
    afterEach(() => {
        injector.clearAll();
        jest.restoreAllMocks();
        // Reset error flags
        config.errors.throwOnFirstTimeInjectionFailure = false;
    });

    test('wait - logs error when element.get throws in MutationObserver callback', async () => {
        let called = 0;
        const origGet = element.get;
        jest.spyOn(element, 'get').mockImplementation(({ selector: _selector } = {}) => {
            called++;
            if (called === 1) return null;
            throw new Error('Simulated get failure');
        });

        const origMO = global.MutationObserver;
        class FakeObserverCall {
            constructor(cb) {
                this.cb = cb;
            }
            observe() {
                setTimeout(() => this.cb([]), 0);
            }
            disconnect() {
                void 0;
            }
        }
        global.MutationObserver = FakeObserverCall;

        config.defaults.element.timeout = 100;
        await expect(element.wait({ selector: '#nonexistent', timeout: 200 })).rejects.toBeDefined();

        global.MutationObserver = origMO;
        element.get = origGet;
    });

    test('log constructor respects config flags and string transformations', () => {
        const origEnabled = config.log.enabled;
        const origShutdown = config._shutdown;
        const logSpy = jest.spyOn(console, 'log');
        config.log.enabled = false;
        new injector.log({ message: 'Should not log', level: 'info' });
        expect(logSpy).not.toHaveBeenCalled();

        config.log.enabled = true;
        config._shutdown = true;
        new injector.log({ message: 'Should not log either', level: 'info' });
        expect(logSpy).not.toHaveBeenCalled();

        config._shutdown = false;
        config.log.level = 'info';
        new injector.log({ message: 'Should log', level: 'info' });
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
        config.log.enabled = origEnabled;
        config._shutdown = origShutdown;
    });

    test('autostart helper can be forced to run in Node environment and registers events', async () => {
        const backupHead = document.head.innerHTML;
        document.head.innerHTML = '<link href="http://localhost/assets/built/portal.css?v=abc" rel="stylesheet">';
        const addEventSpy = jest.spyOn(window, 'addEventListener');
        try {
            await injector.autostart({ force: true });
            await new Promise((r) => setTimeout(r, 50));
            expect(injector.builtLinkElement).toBeDefined();
            expect(addEventSpy).toHaveBeenCalledWith('load', expect.any(Function));
        } finally {
            document.head.innerHTML = backupHead;
            addEventSpy.mockRestore();
        }
    });
});
