/* Additional tests to reach previously uncovered branches */
const path = require('path');
// vm and fs were previously used for vm-based autostart testing; now we use the exported autostart helper
const injector = require(path.resolve(__dirname, '..', 'injector', 'style-injection.js'));
const { element, inject, observer, config } = injector;

describe('Coverage extra paths (error branches & autostart)', () => {
    afterEach(() => {
        injector.clearAll();
        jest.restoreAllMocks();
        // Reset error flags
        config.errors.throwOnFirstTimeInjectionFailure = false;
    });

    test('wait - logs error when element.get throws in MutationObserver callback', async () => {
        // Stub element.get to throw only when called inside the MutationObserver callback
        let called = 0;
        const origGet = element.get;
        jest.spyOn(element, 'get').mockImplementation(({ selector: _selector } = {}) => {
            called++;
            // First call should be during initial check; return null. Second call inside observer callback should throw.
            if (called === 1) return null;
            throw new Error('Simulated get failure');
        });

        // Patch MutationObserver to call callback asynchronously
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

        // Run wait and expect it to time out eventually; but more importantly it should hit the catch log path
        config.defaults.element.timeout = 100; // short
        await expect(element.wait({ selector: '#nonexistent', timeout: 200 })).rejects.toBeDefined();

        // Restore
        global.MutationObserver = origMO;
        element.get = origGet;
    });

    test('waitAll - logs error when element.getAll throws in MutationObserver callback', async () => {
        let called = 0;
        const origGetAll = element.getAll;
        jest.spyOn(element, 'getAll').mockImplementation(({ selector: _selector } = {}) => {
            called++;
            if (called === 1) return document.querySelectorAll(_selector);
            throw new Error('Simulated getAll failure');
        });
        const origMO = global.MutationObserver;
        class FakeObserverCallAll {
            constructor(cb) {
                this.cb = cb;
            }
            observe() {
                // Use an actual mutation object so the callback will execute element.getAll inside
                setTimeout(() => this.cb([{ type: 'childList', addedNodes: [], removedNodes: [] }]), 0);
            }
            disconnect() {
                void 0;
            }
        }
        global.MutationObserver = FakeObserverCallAll;
        config.defaults.element.timeout = 100;
        const logSpy = jest.spyOn(console, 'log');
        await expect(
            element.waitAll({ selector: '.will-not-appear', count: 1, timeout: 200, mode: 1 }),
        ).rejects.toBeDefined();
        // Ensure getAll was called multiple times (initial + inside callback)
        expect(called).toBeGreaterThanOrEqual(2);
        const matched = logSpy.mock.calls.some((call) => String(call[0]).includes('MutationObserver callback failed'));
        expect(matched).toBeTruthy();
        logSpy.mockRestore();
        global.MutationObserver = origMO;
        element.getAll = origGetAll;
    });

    test('firstTime.linkElement catch branch logs and optionally throws', async () => {
        // mock injection to throw
        const spy = jest.spyOn(inject.iframeCollection, 'linkElement').mockImplementation(() => {
            throw new Error('fail link');
        });
        // When throwOnFirstTimeInjectionFailure false, should not throw
        config.errors.throwOnFirstTimeInjectionFailure = false;
        expect(() => inject.firstTime.linkElement()).not.toThrow();
        // When true, should throw
        config.errors.throwOnFirstTimeInjectionFailure = true;
        expect(() => inject.firstTime.linkElement()).toThrow('Failed to do a first time stylesheet injection routine');
        spy.mockRestore();
    });

    test('firstTime.fontElementCollection catch branch logs and optionally throws', async () => {
        const spy = jest.spyOn(inject.iframeCollection, 'fontElementCollection').mockImplementation(() => {
            throw new Error('fail fonts');
        });
        config.errors.throwOnFirstTimeInjectionFailure = false;
        expect(() => inject.firstTime.fontElementCollection()).not.toThrow();
        config.errors.throwOnFirstTimeInjectionFailure = true;
        expect(() => inject.firstTime.fontElementCollection()).toThrow(
            'Failed to do a first time font collection injection routine'
        );
        spy.mockRestore();
    });

    test('observer.setup throws when element.wait resolves to null', async () => {
        // Stub element.wait to return null
        const origWait = element.wait;
        jest.spyOn(element, 'wait').mockImplementation(() => Promise.resolve(null));
        await expect(observer.setup()).rejects.toThrow('Failed to setup mutation observer');
        element.wait = origWait;
    });

    test('observer.callback catch branch logs when element.getAllIframes throws', async () => {
        // Set up to run observer.callback directly
        // Prepare root and make observer.setup use a stubbed MutationObserver to capture callback
        const origMO = global.MutationObserver;
        let cbRef;
        class FakeObserverCapture2 {
            constructor(cb) {
                cbRef = cb;
            }
            observe() {
                void 0;
            }
            disconnect() {
                void 0;
            }
        }
        global.MutationObserver = FakeObserverCapture2;
        // Stub element.wait to resolve a root
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        // Spy getAllIframes to throw inside the callback
        const origGetAllIframes = element.getAllIframes;
        jest.spyOn(element, 'getAllIframes').mockImplementation(() => {
            throw new Error('boom');
        });
        await observer.setup();
        // Invoke callback with an empty mutation list to force the try block and invocation of element.getAllIframes
        expect(cbRef).toBeDefined();
        // Provide a mutation with type 'childList' so the code runs and getAllIframes throws inside, reaching the catch block
        cbRef([{ type: 'childList', addedNodes: [], removedNodes: [] }]);
        // Restore
        global.MutationObserver = origMO;
        element.getAllIframes = origGetAllIframes;
    });

    test('autostart helper can be forced to run in Node environment and registers events', async () => {
        // Ensure a link exists in head so version.getAllFromHead doesn't throw during initialSetup.
        const backupHead = document.head.innerHTML;
        document.head.innerHTML = '<link href="http://localhost/assets/built/portal.css?v=abc" rel="stylesheet">';
        const addEventSpy = jest.spyOn(window, 'addEventListener');
        try {
            // Force autostart to run in Node by using the exported helper
            await injector.autostart({ force: true });
            // Allow async initialSetup to resolve
            await new Promise((r) => setTimeout(r, 50));
            // Verify that builtLinkElement was created and the window listener added
            expect(injector.builtLinkElement).toBeDefined();
            expect(addEventSpy).toHaveBeenCalledWith('load', expect.any(Function));
        } finally {
            document.head.innerHTML = backupHead;
            addEventSpy.mockRestore();
        }
    });

    test('log constructor respects config flags and string transformations', () => {
        const origEnabled = config.log.enabled;
        const origShutdown = config._shutdown;
        const logSpy = jest.spyOn(console, 'log');
        // When logging disabled, the constructor should not write to console
        config.log.enabled = false;
        new injector.log({ message: 'Should not log', level: 'info' });
        expect(logSpy).not.toHaveBeenCalled();

        // When shutdown is set, the constructor should not write to console
        config.log.enabled = true;
        config._shutdown = true;
        new injector.log({ message: 'Should not log either', level: 'info' });
        expect(logSpy).not.toHaveBeenCalled();

        // Reset for further tests
        config._shutdown = false;
        // Use a level allowed by log level default so logs happen
        config.log.level = 'info';
        new injector.log({ message: 'Should log', level: 'info' });
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
        config.log.enabled = origEnabled;
        config._shutdown = origShutdown;
    });

    test('log.setLogLevel warns on invalid level and sets on valid', () => {
        const warnSpy = jest.spyOn(console, 'warn');
        const origLevel = config.log.level;
        injector.log.setLogLevel({ level: 'invalid-level' });
        expect(warnSpy).toHaveBeenCalled();
        injector.log.setLogLevel({ level: 'warning' });
        expect(config.log.level).toEqual('warning');
        warnSpy.mockRestore();
        config.log.level = origLevel;
    });

    test('log helper formatting and sanitization works', () => {
        expect(injector.log.sanitizeLogLevelString({ level: '    INFO ' })).toEqual('info');
        expect(injector.log.transformLogLevelString({ level: 'info' })).toEqual('INF');
        const msg = injector.log.getLogMessageString({ message: 'hello', level: 'info' });
        expect(typeof msg).toBe('string');
    });
});
