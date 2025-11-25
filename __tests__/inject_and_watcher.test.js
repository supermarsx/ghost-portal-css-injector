/* Injection and watcher focused tests
 * Formerly: coverage_final.test.js
 */
const path = require('path');
const injector = require(path.resolve(__dirname, '..', 'injector', 'style-injection.js'));
const { inject, config } = injector;

describe('Injection & watcher behavior (renamed)', () => {
    afterEach(() => {
        injector.clearAll();
        jest.restoreAllMocks();
        config.inject.enabled = true;
        config.inject.style = true;
        config.inject.fonts = true;
        config.errors.throwOnUndefinedIFrameLinkInjection = false;
        config.errors.throwOnUndefinedIFrameFontInjection = false;
        config.errors.throwOnLinkInjectionCheckFailure = false;
        config.inject.setWatcherOnFont = false;
        config.inject.clearWatcherOnFont = false;
        config.watcher.enabled = true;
        config.watcher.cleanup = true;
    });

    test('inject returns early when style injection disabled', async () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        config.inject.style = false;
        const appendSpy = jest.spyOn(iframe.contentDocument.head, 'appendChild');
        inject.linkElement({ iframe });
        expect(appendSpy).not.toHaveBeenCalled();
        appendSpy.mockRestore();
    });

    test('inject.fontElementCollection returns early when fonts disabled', async () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        config.inject.fonts = false;
        const appendSpy = jest.spyOn(iframe.contentDocument.head, 'appendChild');
        inject.fontElementCollection({ iframe });
        expect(appendSpy).not.toHaveBeenCalled();
        appendSpy.mockRestore();
    });

    test('inject.fontElementCollection acts when fontCountAuto true', async () => {
        // We want to test fontCountAuto logic triggers counting and uses that count
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

        // enable auto counting
        config.inject.fontCountAuto = true;
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.head.innerHTML = '';
        inject.fontElementCollection({ iframe });
        const foundFonts = iframeDoc.head.querySelectorAll('[injection-type="font"]');
        expect(foundFonts.length).toBeGreaterThan(0);
        // Reset auto flag
        config.inject.fontCountAuto = false;
    });
});
