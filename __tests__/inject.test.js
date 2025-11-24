const injector = require('../injector/style-injection.js');

describe('Injection routines', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = true;
        injector.config.log.level = 'info';
    });

    test('inject.linkElement injects link into iframe head', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        // Debug: check element.build.link() returns link
        const builtLink = injector.element.build.link();
        new injector.log({
            message: `DEBUG element.build.link returned ${builtLink ? builtLink.href || builtLink : String(builtLink)}`,
            level: 'info',
        });
        await injector.onload.initialSetup();
        // Ensure built link element exists after initialization
        new injector.log({
            message: `DEBUG builtLinkElement after initialSetup ${injector.builtLinkElement ? injector.builtLinkElement.href || injector.builtLinkElement : String(injector.builtLinkElement)}`,
            level: 'info',
        });
        expect(injector.builtLinkElement).toBeDefined();
        // Ensure we can clone the builtLinkElement
        new injector.log({
            message: `DEBUG builtLinkElement before clone ${injector.builtLinkElement ? injector.builtLinkElement.href || injector.builtLinkElement : String(injector.builtLinkElement)}`,
            level: 'info',
        });
        const clonedBuiltLink = injector.element.clone({ elementHandle: injector.builtLinkElement });
        expect(clonedBuiltLink).toBeDefined();

        const iframe = document.createElement('iframe');
        // jsdom doesn't automatically provide a separate document for iframes unless attached
        document.body.appendChild(iframe);
        // jsdom: ensure we can access the iframe document; use contentDocument or contentWindow
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.head.innerHTML = '';

        const appendSpy = jest.spyOn(iframeDoc.head, 'appendChild');
        new injector.log({
            message: `DEBUG before inject: contentDocument exists ${!!iframe.contentDocument}`,
            level: 'info',
        });
        new injector.log({
            message: `DEBUG before inject: isLinkInjected ${injector.inject.check.isLinkInjected({ iframe })}`,
            level: 'info',
        });
        injector.inject.linkElement({ iframe });
        new injector.log({
            message: `DEBUG after inject: contentDocument head innerHTML ${iframeDoc.head.innerHTML}`,
            level: 'info',
        });
        expect(appendSpy).toHaveBeenCalled();
        appendSpy.mockRestore();
        // Verify using the internal helper that injection succeeded
        expect(injector.inject.check.isLinkInjected({ iframe })).toBe(true);
        // debug: ensure link appended
        // console.log('iframe head after inject:', iframeDoc.head.innerHTML);

        const found = iframeDoc.head.querySelector('link[rel="stylesheet"]');
        expect(found).not.toBeNull();
        expect(found.href).toContain('/assets/built/portal.css');
    });

    test('inject.fontElementCollection injects font links into iframe head', async () => {
        // Ensure initialSetup can extract the version from head; add a versioned stylesheet link
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
        document.body.appendChild(iframe);
        // ensure contentDocument is present for assert checks
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.head.innerHTML = '';

        injector.inject.fontElementCollection({ iframe });

        const foundFonts = iframeDoc.head.querySelectorAll('[injection-type="font"]');
        expect(foundFonts.length).toBeGreaterThan(0);
    });

    test('inject.linkElement uses fallback contentWindow appendChild when isLinkInjected fails after append', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        await injector.onload.initialSetup();

        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        // not keeping doc variable here because we use contentWindow directly

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

    test('inject.check functions identify presence correctly', async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        await injector.onload.initialSetup();

        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const clonedLink = injector.element.clone({ elementHandle: injector.builtLinkElement });
        iframeDoc.head.appendChild(clonedLink);
        expect(injector.inject.check.isLinkInjected({ iframe })).toBe(true);

        const font = document.createElement('link');
        font.setAttribute('injection-type', 'font');
        font.rel = 'preload';
        font.href = '/assets/fonts/test.woff2';
        document.head.appendChild(font);
        await injector.onload.initialSetup();
        const clonedFonts = injector.element.cloneAll({ elementHandleCollection: injector.builtFontElementCollection });
        clonedFonts.forEach(function (f) {
            iframeDoc.head.appendChild(f);
        });
        const fontCount = clonedFonts.length;
        expect(injector.inject.check.areFontsInjected({ iframe, fontCount })).toBe(true);
    });
});
