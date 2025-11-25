/* Wait helpers and MutationObserver behavior
 * Formerly: coverage_extra.test.js
 */
const path = require('path');
const injector = require(path.resolve(__dirname, '..', 'injector', 'style-injection.js'));
const { element, observer, inject, config } = injector;

describe('Wait and Observer behavior (renamed)', () => {
    afterEach(() => {
        injector.clearAll();
        jest.restoreAllMocks();
        config.selector.iframes = '#ghost-portal-root iframe';
        config.selector.fonts = '[injection-type="font"]';
        config.observer.mutation = undefined;
        if (global.__originalMutationObserver) {
            global.MutationObserver = global.__originalMutationObserver;
            delete global.__originalMutationObserver;
        }
        if (global.__originalAddEventListener) {
            window.addEventListener = global.__originalAddEventListener;
            delete global.__originalAddEventListener;
        }
    });

    test('element.get throws when selector is empty', () => {
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

    test('wait removes temp observer even when disconnect throws', async () => {
        global.__originalMutationObserver = global.MutationObserver;
        class FakeObserver {
            constructor(cb) {
                this.cb = cb;
            }
            observe(_target) {
                setTimeout(() => this.cb([]), 0);
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
        expect(Array.isArray(config.observer.tempObservers)).toBeTruthy();
        const div = document.createElement('div');
        div.id = testElementId;
        document.body.appendChild(div);
        const el = await waitPromise;
        expect(el).toBeDefined();
        expect(config.observer.tempObservers.length).toBe(0);
    });

    test('waitAll removes temp observer even when disconnect throws', async () => {
        global.__originalMutationObserver = global.MutationObserver;
        class FakeObserverAll {
            constructor(cb) {
                this.cb = cb;
            }
            observe(_target) {
                setTimeout(() => this.cb([]), 0);
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
        const div = document.createElement('div');
        div.className = 'will-appear-all-disconnect-throws';
        document.body.appendChild(div);
        const list = await waitAllPromise;
        expect(list).toBeDefined();
        expect(config.observer.tempObservers.length).toBe(0);
    });

    test('waitAll handles observe throwing and rejects with clear error', async () => {
        const testSelector = '.will-not-satisfy-observe-throws';
        const div = document.createElement('div');
        div.className = testSelector.replace('.', '');
        document.body.appendChild(div);

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

        await expect(element.waitAll({ selector: testSelector, count: 2, timeout: 500, mode: 1 })).rejects.toThrow(
            'Failed to wait for all elements.'
        );
    });

    test('observer.setup calls inject.everything when new iframe added and mutation type configured', async () => {
        config.observer.mutation = 'childList';
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        const spyInjectEverything = jest.spyOn(inject, 'everything');

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
        const fakeIframeNode = { tagName: 'IFRAME', contentDocument: { head: {} } };
        config.observer.current.cb([{ type: 'childList', addedNodes: [fakeIframeNode], removedNodes: [] }]);
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(spyInjectEverything).toHaveBeenCalled();
        spyInjectEverything.mockRestore();
    });

    test('observer.setup logs iframe removed when removedNodes include iframe', async () => {
        config.observer.mutation = 'childList';
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        const logSpy = jest.spyOn(console, 'log');
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
        const matched = logSpy.mock.calls.some((call) => String(call[0]).includes('Iframe removed'));
        expect(matched).toBeTruthy();
        logSpy.mockRestore();
    });

    test('waitAll resolves in default (equal) mode via observer callback', async () => {
        global.__originalMutationObserver = global.MutationObserver;
        class FakeObserverDefault {
            constructor(cb) {
                this.cb = cb;
            }
            observe(_target) {
                // Insert element before callback is invoked to simulate append / mutation
                setTimeout(() => {
                    const el = document.createElement('div');
                    el.className = 'will-appear-default';
                    document.body.appendChild(el);
                    this.cb([]);
                }, 0);
            }
            disconnect() {
                void 0;
            }
        }
        global.MutationObserver = FakeObserverDefault;
        const list = await element.waitAll({ selector: '.will-appear-default', count: 1, timeout: 2000, mode: 0 });
        expect(list.length).toBeGreaterThanOrEqual(1);
        global.MutationObserver = global.__originalMutationObserver;
        delete global.__originalMutationObserver;
    });

    test('onload.setupEvent throws when window.addEventListener throws', () => {
        global.__originalAddEventListener = window.addEventListener;
        window.addEventListener = () => {
            throw new Error('addEventListener failed');
        };
        const onload = require('../injector/style-injection.js').onload;
        expect(() => onload.setupEvent()).toThrow('Failed to set window onload event');
        // clean up restored in afterEach
    });
});
