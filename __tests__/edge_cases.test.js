const injector = require('../injector/style-injection.js');

describe('Edge cases and uncovered branches', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = false;
        injector.config.log.level = 'info';
        // Reset certain flags and state
        injector.config.observer.tempObservers.length = 0;
        try {
            injector.watcher.clear();
        } catch (err) {
            void err;
        }
        injector.config.watcher.cycleCount = 0;
    });

    test('version.getAllFromHead should handle <script> tags src with ?v=', () => {
        const script = document.createElement('script');
        script.src = '/assets/script.js?v=abcxyz';
        document.head.appendChild(script);
        const versions = injector.version.getAllFromHead();
        expect(Array.isArray(versions)).toBe(true);
        expect(versions[0].urlVersion).toBe('abcxyz');
    });

    test('version.getAllFromHead should handle STYLE elements with custom href property', () => {
        const styleEl = document.createElement('style');
        // Artificially add a href property to mimic a style tag that has a URL
        styleEl.href = '/assets/style.css?v=style123';
        document.head.appendChild(styleEl);
        const versions = injector.version.getAllFromHead();
        expect(versions[0].urlVersion).toBe('style123');
    });

    test('element.create.link should throw and be caught when document.createElement fails', () => {
        // Monkey patch document.createElement to throw when used to create 'link'
        const originalCreate = document.createElement;
        document.createElement = function (tagName) {
            if (tagName === 'link') throw new Error('boom');
            return originalCreate.call(document, tagName);
        };
        try {
            expect(() => injector.element.create.link({ url: '/a?v=1' })).toThrow();
        } finally {
            document.createElement = originalCreate;
        }
    });

    test('element.waitAll should throw when count < 1', async () => {
        await expect(injector.element.waitAll({ selector: '.x', count: 0 })).rejects.toThrow(
            /Failed to wait for all elements/
        );
    });

    test('element.waitAll MutationObserver callback error is caught', async () => {
        // Prepare DOM and ensure element.getAll works initially then fails on subsequent calls
        document.body.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'target';

        let first = true;
        const originalGetAll = injector.element.getAll;
        injector.element.getAll = function ({ selector }) {
            if (first) {
                first = false;
                // initial call: return an empty NodeList to enter the observer
                return document.querySelectorAll(selector);
            }
            // subsequent calls: simulate an error inside the mutation observer callback
            throw new Error('boom');
        };

        try {
            // call waitAll and mutate DOM to fire observer callback that will throw
            const p = injector.element.waitAll({ selector: '.target', count: 1, timeout: 20 });
            // trigger mutation so the observer callback runs and hits the error
            document.body.appendChild(div);
            await expect(p).rejects.toBeDefined();
        } finally {
            injector.element.getAll = originalGetAll;
        }
    });

    test('element.build.link uses version even when getFirst is null', () => {
        // Temporarily stub version.getFirst to return null
        const original = injector.version.getFirst;
        injector.version.getFirst = function () {
            return null;
        };
        try {
            const link = injector.element.build.link();
            expect(link.href).toContain('/assets/built/portal.css?v=null');
        } finally {
            injector.version.getFirst = original;
        }
    });

    test('inject.check.isLinkInjected returns false and can throw when builtLinkElement missing', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        // Ensure the head has a link that doesn't match builtLinkElement
        iframeDoc.head.innerHTML = '<link rel="stylesheet" href="/assets/different.css?v=abc">';

        // case: builtLinkElement is null -> read fails or returns false
        const builtOriginal = injector.builtLinkElement;
        try {
            // simulate missing builtLinkElement
            Object.defineProperty(injector, 'builtLinkElement', { get: () => null });
            injector.config.errors.throwOnLinkInjectionCheckFailure = false;
            expect(injector.inject.check.isLinkInjected({ iframe })).toBe(false);

            // Now make the method rethrow when configured
            injector.config.errors.throwOnLinkInjectionCheckFailure = true;
            expect(() => injector.inject.check.isLinkInjected({ iframe })).toThrow();
        } finally {
            // restore
            injector.config.errors.throwOnLinkInjectionCheckFailure = false;
            Object.defineProperty(injector, 'builtLinkElement', { get: () => builtOriginal });
        }
    });

    test('inject.check.areFontsInjected returns false and can throw when iframe has no doc', () => {
        const fakeIframe = { getAttribute: () => 'fake-iframe' };
        injector.config.errors.throwOnLinkInjectionCheckFailure = false;
        expect(injector.inject.check.areFontsInjected({ iframe: fakeIframe, fontCount: 1 })).toBe(false);
        injector.config.errors.throwOnLinkInjectionCheckFailure = true;
        expect(() => injector.inject.check.areFontsInjected({ iframe: fakeIframe, fontCount: 1 })).toThrow();
        injector.config.errors.throwOnLinkInjectionCheckFailure = false;
    });

    test('inject.linkElement should return early when iframe.contentDocument.head is null', async () => {
        const versioned = document.createElement('link');
        versioned.href = '/assets/built/portal.css?v=abc';
        versioned.rel = 'stylesheet';
        document.head.appendChild(versioned);
        await injector.onload.initialSetup();

        // Use a fake iframe object so we can simulate contentDocument.head === null
        const fakeIframe = {
            getAttribute: () => 'portal-fake',
            contentDocument: { head: null },
            contentWindow: { document: { head: null } },
        };

        // Call should return early without appending
        injector.inject.linkElement({ iframe: fakeIframe });
        // Nothing to query inside fakeIframe, but the call should not throw
        expect(true).toBe(true);
    });

    test('watcher.set returns early if watcher already running and watcher.clear respects cleanup flag', () => {
        // set watcher.current to a value
        injector.config.watcher.current = 123;
        injector.watcher.set();
        // still the same value, since it should return early
        expect(injector.config.watcher.current).toBe(123);

        // now set cleanup false and set a fake current then clear, it should not clear
        injector.config.watcher.current = setInterval(() => {}, 10);
        injector.config.watcher.cleanup = false;
        injector.watcher.clear();
        expect(injector.config.watcher.current).not.toBeNull();
        // restore cleanup and clear
        injector.config.watcher.cleanup = true;
        injector.watcher.clear();
        expect(injector.config.watcher.current).toBeNull();
    });

    test('observer.clear catches disconnect errors when current disconnect throws', () => {
        // Put object that throws on disconnect
        const badObserver = {
            disconnect: () => {
                throw new Error('bad');
            },
        };
        injector.config.observer.current = badObserver;
        injector.config.observer.tempObservers.push({ disconnect: () => {} });
        // call clear, should not throw
        injector.observer.clear();
        expect(injector.config.observer.current).toBeNull();
        expect(injector.config.observer.tempObservers.length).toBe(0);
    });

    test('observer.setup mutation callback errors are caught and do not bubble', async () => {
        // Create root element for observer setup
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);

        const originalInjectEverything = injector.inject.everything;
        const originalConfig = { ...injector.config }; // shallow copy for later restoration
        // Make the injection function throw when called by observer callback
        injector.inject.everything = function () {
            throw new Error('boom');
        };

        try {
            // Set up the observer. It should return without throwing.
            await injector.observer.setup();

            // Append an iframe to the root; this triggers observer callback which will call inject.everything and throw
            const iframe = document.createElement('iframe');
            iframe.setAttribute('title', 'portal-test');
            root.appendChild(iframe);

            // wait briefly to allow the mutation observer to run
            await new Promise((r) => setTimeout(r, 30));

            // Ensure the observer stays configured and no unhandled exceptions propagated
            expect(injector.config.observer.current).not.toBeNull();
        } finally {
            // restore
            injector.inject.everything = originalInjectEverything;
            try {
                injector.observer.clear();
            } catch (err) {
                void err;
            }
            // cleanup root
            document.body.removeChild(root);
            injector.config = originalConfig;
        }
    });

    test('element.count, countIframes and countFonts propagate errors when element.getAll throws', () => {
        const originalGetAll = injector.element.getAll;
        injector.element.getAll = function () {
            throw new Error('boom-getAll');
        };
        try {
            expect(() => injector.element.count({ selector: '.x' })).toThrow();
            expect(() => injector.element.countIframes()).toThrow();
            expect(() => injector.element.countFonts()).toThrow();
        } finally {
            injector.element.getAll = originalGetAll;
        }
    });
});
