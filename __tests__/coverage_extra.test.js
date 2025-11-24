/*
 * Additional tests to hit edge-case branches in style-injection.js
 */
const path = require('path');
const injector = require(path.resolve(__dirname, '..', 'injector', 'style-injection.js'));
const { element, observer, inject, onload, config } = injector;

describe('Coverage extra tests for uncovered branches', () => {
    afterEach(() => {
        // Reset relevant config values to defaults so tests remain isolated
        config.selector.iframes = '#ghost-portal-root iframe';
        config.selector.fonts = '[injection-type="font"]';
        config.observer.mutation = undefined;
        injector.clearAll();
        // Ensure MutationObserver stub restored by tests if they mutated it
        if (global.__originalMutationObserver) {
            global.MutationObserver = global.__originalMutationObserver;
            delete global.__originalMutationObserver;
        }
        // Restore addEventListener if stubbed
        if (global.__originalAddEventListener) {
            window.addEventListener = global.__originalAddEventListener;
            delete global.__originalAddEventListener;
        }
    });

    test('element.get throws when selector is empty', () => {
        // Override document.querySelector to not throw on empty selector so code reaches the 'empty' branch
        const origQuery = document.querySelector;
        document.querySelector = (selector) => {
            if (selector === '') return null;
            return origQuery(selector);
        };
        try {
            expect(() => element.get({ selector: '' })).toThrow('Failed to get element from selector.');
        } finally {
            document.querySelector = origQuery;
        }
    });

    test('element.getAll throws when selector is empty', () => {
        // Same trick as above so the function executes the empty selector branch
        const origQueryAll = document.querySelectorAll;
        document.querySelectorAll = (selector) => {
            if (selector === '') return [];
            return origQueryAll(selector);
        };
        try {
            expect(() => element.getAll({ selector: '' })).toThrow('Failed to get all elements from selector.');
        } finally {
            document.querySelectorAll = origQueryAll;
        }
    });

    test('element.getAllIframes catches and rethrows when selector invalid', () => {
        const oldSelector = config.selector.iframes;
        config.selector.iframes = '';
        expect(() => element.getAllIframes()).toThrow();
        config.selector.iframes = oldSelector;
    });

    test('element.getAllFonts catches and rethrows when selector invalid', () => {
        const oldSelector = config.selector.fonts;
        config.selector.fonts = '';
        expect(() => element.getAllFonts()).toThrow();
        config.selector.fonts = oldSelector;
    });

    test('element.clone and cloneAll throw with invalid inputs', () => {
        expect(() => element.clone({ elementHandle: undefined })).toThrow();
        // Force default collection to undefined to trigger cloneAll error
        const oldDefaultHandleCollection = element.default.handleCollection;
        element.default.handleCollection = undefined;
        expect(() => element.cloneAll({})).toThrow();
        element.default.handleCollection = oldDefaultHandleCollection;
    });

    test('wait removes temp observer even when disconnect throws', async () => {
        // Save original MutationObserver to restore later
        global.__originalMutationObserver = global.MutationObserver;
        class FakeObserver {
            constructor(cb) {
                this.cb = cb;
                this.target = null;
            }
            observe(_target) {
                this.target = _target;
                // schedule callback to simulate a mutation record after the element is appended
                setTimeout(() => {
                    try {
                        this.cb([]);
                    } catch (e) {
                        void e;
                    }
                }, 0);
            }
            disconnect() {
                throw new Error('disconnect failed');
            }
            takeRecords() {
                return [];
            }
        }
        global.MutationObserver = FakeObserver;

        const testElementId = 'will-appear-disconnect-throws';
        const waitPromise = element.wait({ selector: `#${testElementId}`, timeout: 2000 });
        // Ensure the observer was added to tempObservers
        expect(Array.isArray(config.observer.tempObservers)).toBeTruthy();
        // Create the element to trigger the observer
        const div = document.createElement('div');
        div.id = testElementId;
        document.body.appendChild(div);
        const el = await waitPromise;
        expect(el).toBeDefined();
        // The tempObservers entry should be removed even if disconnect throws
        expect(config.observer.tempObservers.length).toBe(0);
    });

    test('waitAll removes temp observer even when disconnect throws', async () => {
        // Save original MutationObserver to restore later
        global.__originalMutationObserver = global.MutationObserver;
        class FakeObserverAll {
            constructor(cb) {
                this.cb = cb;
            }
            observe(_target) {
                setTimeout(() => {
                    try {
                        this.cb([]);
                    } catch (e) {
                        void e;
                    }
                }, 0);
            }
            disconnect() {
                throw new Error('disconnect failed');
            }
            takeRecords() {
                return [];
            }
        }
        global.MutationObserver = FakeObserverAll;

        const testSelector = '.will-appear-all-disconnect-throws';
        const waitAllPromise = element.waitAll({ selector: testSelector, count: 1, timeout: 2000, mode: 1 });
        // Create the element to trigger the observer
        const div = document.createElement('div');
        div.className = 'will-appear-all-disconnect-throws';
        document.body.appendChild(div);
        const list = await waitAllPromise;
        expect(list).toBeDefined();
        // The tempObservers entry should be removed even if disconnect throws
        expect(config.observer.tempObservers.length).toBe(0);
    });

    test('waitAll handles observe throwing and rejects with clear error', async () => {
        // Arrange: create a single element so count is not satisfied and waitAll will call observe
        const testSelector = '.will-not-satisfy-observe-throws';
        const div = document.createElement('div');
        div.className = testSelector.replace('.', '');
        document.body.appendChild(div);

        // Save original MutationObserver to restore in afterEach
        global.__originalMutationObserver = global.MutationObserver;
        class ObserverThrows {
            constructor(cb) {
                this.cb = cb;
            }
            observe() {
                throw new Error('observe failed');
            }
            disconnect() {
                void 0;
            }
        }
        global.MutationObserver = ObserverThrows;

        // Act & Assert
        await expect(
            element.waitAll({ selector: testSelector, count: 2, timeout: 500, mode: 1 }),
        ).rejects.toThrow('Failed to wait for all elements.');
    });

    test('observer.setup calls inject.everything when new iframe added and mutation type is configured', async () => {
        config.observer.mutation = 'childList';
        // create root element
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        // Spy on inject.everything
        const spyInjectEverything = jest.spyOn(inject, 'everything');

        // Override MutationObserver to capture the installed callback
        global.__originalMutationObserver = global.MutationObserver;
        class FakeObserverCapture {
            constructor(cb) {
                this.cb = cb;
            }
            observe() {
                void 0;
            }
            disconnect() {
                void 0;
            }
        }
        global.MutationObserver = FakeObserverCapture;

        await observer.setup();
        // Simulate a mutation record where an iframe was added
        const fakeIframeNode = { tagName: 'IFRAME', contentDocument: { head: {} } };
        config.observer.current.cb([{ type: 'childList', addedNodes: [fakeIframeNode], removedNodes: [] }]);
        // Allow any async code to execute
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(spyInjectEverything).toHaveBeenCalled();
        spyInjectEverything.mockRestore();
    });

    test('observer.setup logs iframe removed when removedNodes include iframe', async () => {
        config.observer.mutation = 'childList';
        // create root element
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        // Spy console.log
        const logSpy = jest.spyOn(console, 'log');
        // Override MutationObserver to capture callback
        global.__originalMutationObserver = global.MutationObserver;
        class FakeObserverCapture2 {
            constructor(cb) {
                this.cb = cb;
            }
            observe() {
                void 0;
            }
            disconnect() {
                void 0;
            }
        }
        global.MutationObserver = FakeObserverCapture2;
        await observer.setup();
        config.observer.current.cb([{ type: 'childList', addedNodes: [], removedNodes: [{ tagName: 'IFRAME' }] }]);
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(logSpy).toHaveBeenCalled();
        // Check there is a call with Iframe removed message
        const matched = logSpy.mock.calls.some((call) => String(call[0]).includes('Iframe removed'));
        expect(matched).toBeTruthy();
        logSpy.mockRestore();
    });

    test('onload.setupEvent throws when window.addEventListener throws', () => {
        // Backup original
        global.__originalAddEventListener = window.addEventListener;
        window.addEventListener = () => {
            throw new Error('addEventListener failed');
        };
        expect(() => onload.setupEvent()).toThrow('Failed to set window onload event');
        // Restored in afterEach
    });

    test('onload.setupMonitor invokes observer.setup and inject.firstTime', async () => {
        const spyObserverSetup = jest.spyOn(observer, 'setup').mockImplementation(async () => {});
        const spyFirstTime = jest.spyOn(inject.firstTime, 'everything').mockImplementation(() => {});
        onload.setupMonitor();
        expect(spyObserverSetup).toHaveBeenCalled();
        expect(spyFirstTime).toHaveBeenCalled();
        spyObserverSetup.mockRestore();
        spyFirstTime.mockRestore();
    });

    test('firstTime.linkElement returns early when flags disabled', () => {
        const oldEnabled = config.inject.enabled;
        const oldFirstTimeEnabled = config.inject.firstTime.enabled;
        config.inject.enabled = false;
        config.inject.firstTime.enabled = true;
        expect(() => inject.firstTime.linkElement()).not.toThrow();
        config.inject.enabled = true;
        config.inject.firstTime.enabled = false;
        expect(() => inject.firstTime.linkElement()).not.toThrow();
        config.inject.enabled = oldEnabled;
        config.inject.firstTime.enabled = oldFirstTimeEnabled;
    });

    test('firstTime.fontElementCollection returns early when flags disabled', () => {
        const oldEnabled = config.inject.enabled;
        const oldFirstTimeEnabled = config.inject.firstTime.enabled;
        config.inject.enabled = false;
        config.inject.firstTime.enabled = true;
        expect(() => inject.firstTime.fontElementCollection()).not.toThrow();
        config.inject.enabled = true;
        config.inject.firstTime.enabled = false;
        expect(() => inject.firstTime.fontElementCollection()).not.toThrow();
        config.inject.enabled = oldEnabled;
        config.inject.firstTime.enabled = oldFirstTimeEnabled;
    });
});
