const injector = require('../injector/style-injection.js');

describe('Injection routines', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = false;
    });

    test('inject.linkElement injects link into iframe head', () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        injector.onload.initialSetup();

        const iframeDoc = document.implementation.createHTMLDocument('iframe');
        const iframe = document.createElement('iframe');
        iframe.contentDocument = iframeDoc;
        iframe.contentWindow = { document: iframeDoc };
        iframeDoc.head.innerHTML = '';

        injector.inject.linkElement({ iframe });

        const found = iframeDoc.head.querySelector('link[rel="stylesheet"]');
        expect(found).not.toBeNull();
        expect(found.href).toContain('/assets/built/portal.css');
    });

    test('inject.fontElementCollection injects font links into iframe head', () => {
        const fontLink = document.createElement('link');
        fontLink.setAttribute('injection-type', 'font');
        fontLink.rel = 'preload';
        fontLink.href = '/assets/fonts/test.woff2';
        document.head.appendChild(fontLink);
        injector.onload.initialSetup();

        const iframeDoc = document.implementation.createHTMLDocument('iframe');
        const iframe = document.createElement('iframe');
        iframe.contentDocument = iframeDoc;
        iframe.contentWindow = { document: iframeDoc };
        iframeDoc.head.innerHTML = '';

        injector.inject.fontElementCollection({ iframe });

        const foundFonts = iframeDoc.head.querySelectorAll('[injection-type="font"]');
        expect(foundFonts.length).toBeGreaterThan(0);
    });

    test('inject.linkElement uses fallback contentWindow appendChild when isLinkInjected fails after append', () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        injector.onload.initialSetup();

        const iframeDoc = document.implementation.createHTMLDocument('iframe');
        const iframe = document.createElement('iframe');
        iframe.contentDocument = iframeDoc;
        iframe.contentWindow = { document: iframeDoc };

        const appendSpy = jest.spyOn(iframe.contentWindow.document.head, 'appendChild');
        const originalCheck = injector.inject.check.isLinkInjected;
        injector.inject.check.isLinkInjected = function () {
            return false;
        };

        injector.inject.linkElement({ iframe });

        expect(appendSpy).toHaveBeenCalled();
        injector.inject.check.isLinkInjected = originalCheck;
        appendSpy.mockRestore();
    });

    test('inject.check functions identify presence correctly', () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        injector.onload.initialSetup();

        const iframeDoc = document.implementation.createHTMLDocument('iframe');
        const iframe = document.createElement('iframe');
        iframe.contentDocument = iframeDoc;
        iframe.contentWindow = { document: iframeDoc };
        const clonedLink = injector.element.clone({ elementHandle: injector.builtLinkElement });
        iframeDoc.head.appendChild(clonedLink);
        expect(injector.inject.check.isLinkInjected({ iframe })).toBe(true);

        const font = document.createElement('link');
        font.setAttribute('injection-type', 'font');
        font.rel = 'preload';
        font.href = '/assets/fonts/test.woff2';
        document.head.appendChild(font);
        injector.onload.initialSetup();
        const clonedFonts = injector.element.cloneAll({ elementHandleCollection: injector.builtFontElementCollection });
        clonedFonts.forEach(function (f) {
            iframeDoc.head.appendChild(f);
        });
        const fontCount = clonedFonts.length;
        expect(injector.inject.check.areFontsInjected({ iframe, fontCount })).toBe(true);
    });
});
