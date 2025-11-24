const injector = require('../injector/style-injection.js');

describe('Injection additional edge and error cases', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = true;
        injector.config.log.level = 'info';
        injector.config.errors.throwOnUndefinedIFrameLinkInjection = false;
        injector.config.errors.throwOnUndefinedIFrameFontInjection = false;
        injector.config.inject.enabled = true;
        injector.config.inject.style = true;
        injector.config.inject.fonts = true;
        injector.config.watcher.enabled = true;
        injector.config.watcher.cleanup = true;
        // Reset watcher properties
        try {
            injector.watcher.clear();
        } catch (err) {
            /* ignore */
        }
        injector.config.watcher.cycleCount = 0;
    });

    test('inject.linkElement throws when iframe undefined and throwOnUndefinedIFrameLinkInjection enabled', () => {
        injector.config.errors.throwOnUndefinedIFrameLinkInjection = true;
        // Also enable the general 'throwOnRegularInjectionFailure' so the catch block will rethrow
        injector.config.errors.throwOnRegularInjectionFailure = true;
        expect(() => injector.inject.linkElement({ iframe: undefined })).toThrow();
        injector.config.errors.throwOnRegularInjectionFailure = false;
    });

    test('inject.fontElementCollection throws when iframe undefined and throwOnUndefinedIFrameFontInjection enabled', () => {
        injector.config.errors.throwOnUndefinedIFrameFontInjection = true;
        injector.config.errors.throwOnRegularInjectionFailure = true;
        expect(() => injector.inject.fontElementCollection({ iframe: undefined })).toThrow();
        injector.config.errors.throwOnRegularInjectionFailure = false;
    });

    test('inject.linkElement clears watcher when current date > watcher.timer.end and link is injected', async () => {
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(versioned);
        await injector.onload.initialSetup();

        // Create iframe and mark link as injected
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.head.innerHTML = '';
        const cloned = injector.element.clone({ elementHandle: injector.builtLinkElement });
        iframeDoc.head.appendChild(cloned);

        // Force watcher timer to be in the past
        injector.config.watcher.timer.end = Date.now() - 1000;

        const clearSpy = jest.spyOn(injector.watcher, 'clear');
        injector.inject.linkElement({ iframe });
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });

    test('inject.fontElementCollection clears watcher when setWatcherOnFont and clearWatcherOnFont true and timer expired', async () => {
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(versioned);
        const fontLink = document.createElement('link');
        fontLink.setAttribute('injection-type', 'font');
        fontLink.rel = 'preload';
        fontLink.href = '/assets/fonts/test.woff2';
        document.head.appendChild(fontLink);
        await injector.onload.initialSetup();

        // Create iframe and add fonts to it
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.head.innerHTML = '';

        // Set the injector to use watcher on fonts
        injector.config.inject.setWatcherOnFont = true;
        injector.config.inject.clearWatcherOnFont = true;
        injector.config.inject.fontCountAuto = true; // ensure fontCount matches out-of-iframe head count
        // Make watcher timer expired
        injector.config.watcher.timer.end = Date.now() - 1000;

        // Build builtFontElementCollection first-time
        injector.onload.initialSetup();

        // Force font injections into the iframe
        // Clone the built collection into the iframe head
        const builtFonts = injector.builtFontElementCollection;
        builtFonts.forEach(function (font) {
            iframeDoc.head.appendChild(injector.element.clone({ elementHandle: font }));
        });

        const clearSpy = jest.spyOn(injector.watcher, 'clear');
        injector.inject.fontElementCollection({ iframe });
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();

        // reset flags
        injector.config.inject.setWatcherOnFont = false;
        injector.config.inject.clearWatcherOnFont = false;
    });

    test('observer.clear properly disconnects temp observers', () => {
        // Create dummy observers with disconnect functions
        const dummyObs = {
            disconnect: jest.fn(),
        };
        const dummyObs2 = {
            disconnect: jest.fn(),
        };
        injector.config.observer.tempObservers.push(dummyObs);
        injector.config.observer.tempObservers.push(dummyObs2);
        expect(injector.config.observer.tempObservers.length).toBeGreaterThanOrEqual(2);
        injector.observer.clear();
        expect(injector.config.observer.tempObservers.length).toBe(0);
        expect(dummyObs.disconnect).toHaveBeenCalled();
        expect(dummyObs2.disconnect).toHaveBeenCalled();
    });

    test('onload.initialSetup throws when element.build.link throws error', async () => {
        // Temporarily override element.build.link to throw
        const original = injector.element.build.link;
        injector.element.build.link = function () {
            throw new Error('Injected build error');
        };
        try {
            await expect(injector.onload.initialSetup()).rejects.toThrow();
        } finally {
            // restore
            injector.element.build.link = original;
        }
    });

    test('inject.iframeCollection functions call inject linkElement and fontElementCollection per iframe', async () => {
        const iframe1 = document.createElement('iframe');
        iframe1.setAttribute('title', 'portal1');
        const iframe2 = document.createElement('iframe');
        iframe2.setAttribute('title', 'portal2');
        document.body.appendChild(iframe1);
        document.body.appendChild(iframe2);

        const spyLink = jest.spyOn(injector.inject, 'linkElement');
        const spyFonts = jest.spyOn(injector.inject, 'fontElementCollection');

        const collection = [iframe1, iframe2];
        injector.inject.iframeCollection.linkElement({ iframes: collection });
        injector.inject.iframeCollection.fontElementCollection({ iframes: collection });

        expect(spyLink).toHaveBeenCalledTimes(2);
        expect(spyFonts).toHaveBeenCalledTimes(2);

        spyLink.mockRestore();
        spyFonts.mockRestore();
    });

    test('inject.everything and inject.firstTime.* routines call the expected helpers', async () => {
        // Add versioned link and font to head to allow initial setup
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(versioned);
        const fontLink = document.createElement('link');
        fontLink.setAttribute('injection-type', 'font');
        fontLink.rel = 'preload';
        fontLink.href = '/assets/fonts/test.woff2';
        document.head.appendChild(fontLink);
        await injector.onload.initialSetup();

        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'portal');
        document.body.appendChild(iframe);

        const spyLink = jest.spyOn(injector.inject, 'linkElement');
        const spyFonts = jest.spyOn(injector.inject, 'fontElementCollection');

        injector.inject.everything({ iframe });
        expect(spyLink).toHaveBeenCalled();
        expect(spyFonts).toHaveBeenCalled();

        // Test firstTime helpers
        injector.inject.firstTime.linkElement();
        injector.inject.firstTime.fontElementCollection();
        const spyIframeLink = jest.spyOn(injector.inject.iframeCollection, 'linkElement');
        const spyIframeFont = jest.spyOn(injector.inject.iframeCollection, 'fontElementCollection');
        injector.inject.firstTime.everything();
        expect(spyIframeLink).toHaveBeenCalled();
        expect(spyIframeFont).toHaveBeenCalled();

        spyLink.mockRestore();
        spyFonts.mockRestore();
        spyIframeLink.mockRestore();
        spyIframeFont.mockRestore();
    });

    test('inject.firstTime functions return early when style or fonts flags are false', async () => {
        // Ensure we have initial setup
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=abc';
        document.head.appendChild(versioned);
        await injector.onload.initialSetup();

        const spyIframeLink = jest.spyOn(injector.inject.iframeCollection, 'linkElement');
        const spyIframeFont = jest.spyOn(injector.inject.iframeCollection, 'fontElementCollection');

        injector.config.inject.firstTime.style = false;
        injector.inject.firstTime.linkElement();
        expect(spyIframeLink).not.toHaveBeenCalled();
        injector.config.inject.firstTime.style = true;

        injector.config.inject.firstTime.fonts = false;
        injector.inject.firstTime.fontElementCollection();
        expect(spyIframeFont).not.toHaveBeenCalled();
        injector.config.inject.firstTime.fonts = true;

        spyIframeLink.mockRestore();
        spyIframeFont.mockRestore();
    });

    test('onload.setupEvent registers window load and setupMonitor invokes observer.setup and inject.firstTime', () => {
        // Spy on addEventListener
        const spyAdd = jest.spyOn(window, 'addEventListener');
        const spyObserver = jest.spyOn(injector.observer, 'setup').mockImplementation(() => Promise.resolve());
        const spyFirstTime = jest.spyOn(injector.inject.firstTime, 'everything').mockImplementation(() => {});

        injector.onload.setupEvent();

        expect(spyAdd).toHaveBeenCalledWith('load', expect.any(Function));

        // Invoke the attached callback (simulate load event)
        const registered = spyAdd.mock.calls.find((c) => c[0] === 'load');
        if (registered) {
            const callback = registered[1];
            callback();
        }

        expect(spyObserver).toHaveBeenCalled();
        expect(spyFirstTime).toHaveBeenCalled();

        spyAdd.mockRestore();
        spyObserver.mockRestore();
        spyFirstTime.mockRestore();
    });
});
