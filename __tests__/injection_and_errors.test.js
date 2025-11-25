/* Tests to cover injection and error handling edge branches */
const path = require('path');
const injector = require(path.resolve(__dirname, '..', 'injector', 'style-injection.js'));
const { element, inject, observer, config } = injector;

describe('Injection and error handling branches', () => {
    afterEach(() => {
        injector.clearAll();
        jest.restoreAllMocks();
        config.observer.mutation = undefined;
        config.errors.throwOnFirstTimeInjectionFailure = false;
    });

    test('element.getAllIframes throws when element.getAll errors', () => {
        const origGetAll = element.getAll;
        jest.spyOn(element, 'getAll').mockImplementation(() => {
            throw new Error('whoops getAll');
        });
        expect(() => element.getAllIframes()).toThrow('Failed to get all portal iframes.');
        element.getAll = origGetAll;
    });

    test('element.getAllFonts throws when element.getAll errors', () => {
        const origGetAll = element.getAll;
        jest.spyOn(element, 'getAll').mockImplementation(() => {
            throw new Error('whoops getAll');
        });
        expect(() => element.getAllFonts()).toThrow('Failed to get all portal iframes.');
        element.getAll = origGetAll;
    });

    test('firstTime.linkElement success path calls inject.iframeCollection.linkElement', async () => {
        // Create dummy iframe and ensure element.getAllIframes returns it
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const spy = jest.spyOn(inject.iframeCollection, 'linkElement').mockImplementation(() => {});
        // Ensure flags enabled
        config.inject.enabled = true;
        config.inject.firstTime.enabled = true;
        config.inject.firstTime.style = true;
        // call firstTime link; should call the spy
        inject.firstTime.linkElement();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test('firstTime.fontElementCollection success path calls inject.iframeCollection.fontElementCollection', async () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const spy = jest.spyOn(inject.iframeCollection, 'fontElementCollection').mockImplementation(() => {});
        config.inject.enabled = true;
        config.inject.firstTime.enabled = true;
        config.inject.firstTime.fonts = true;
        inject.firstTime.fontElementCollection();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test('firstTime.linkElement catch branch logs and optionally throws', () => {
        const spy = jest.spyOn(inject.iframeCollection, 'linkElement').mockImplementation(() => {
            throw new Error('fail link');
        });
        config.errors.throwOnFirstTimeInjectionFailure = false;
        expect(() => inject.firstTime.linkElement()).not.toThrow();
        config.errors.throwOnFirstTimeInjectionFailure = true;
        expect(() => inject.firstTime.linkElement()).toThrow('Failed to do a first time stylesheet injection routine');
        spy.mockRestore();
        config.errors.throwOnFirstTimeInjectionFailure = false;
    });

    test('firstTime.fontElementCollection catch branch logs and optionally throws', () => {
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
        config.errors.throwOnFirstTimeInjectionFailure = false;
    });

    test('observer.setup throws when element.wait resolves to null', async () => {
        const origWait = element.wait;
        jest.spyOn(element, 'wait').mockImplementation(() => Promise.resolve(null));
        await expect(observer.setup()).rejects.toThrow('Failed to setup mutation observer');
        element.wait = origWait;
    });

    test('observer.setup throws when MutationObserver.observe throws', async () => {
        // stub MutationObserver to throw on observe
        const origMO = global.MutationObserver;
        class ThrowsOnObserve {
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
        global.MutationObserver = ThrowsOnObserve;
        // create root so element.wait resolves normally
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        await expect(observer.setup()).rejects.toThrow('Failed to setup mutation observer');
        global.MutationObserver = origMO;
    });
});
