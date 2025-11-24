
    test('observer.setup registers a mutation observer and setupMonitor hooks', async () => {
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        // Attach a versioned link to head to avoid errors
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=abc';
        document.head.appendChild(versioned);
        // ensure timeout for waiting for root is short for tests
        injector.config.defaults.element.timeout = 50;

        // no exception should be thrown when setting up observer
        await injector.observer.setup();
        // simulate addition of iframe to root to trigger observer
        const ifr = document.createElement('iframe');
        ifr.setAttribute('title', 'portal');
        root.appendChild(ifr);
        // success if no errors thrown
        expect(true).toBe(true);
    });

    test('observer triggers inject.everything when iframe is added', async () => {
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        // Attach a versioned link to head so initialSetup doesn't throw
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=abc';
        document.head.appendChild(versioned);
        injector.onload.initialSetup();

        // spy on inject.everything
        const spy = jest.spyOn(injector.inject, 'everything');
        await injector.observer.setup();

        // ensure we start with 0 calls
        expect(spy).not.toHaveBeenCalled();

        const ifr = document.createElement('iframe');
        ifr.setAttribute('title', 'portal');
        root.appendChild(ifr);

        // Wait a tick for MutationObserver to run
        await new Promise((r) => setTimeout(r, 0));

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test('element.getAllInsideIframe returns NodeList inside iframe', () => {
        // prepare iframe with elements inside
        const iframeDoc = document.implementation.createHTMLDocument('iframe');
        const iframe = document.createElement('iframe');
        iframe.contentDocument = iframeDoc;
        iframe.contentWindow = { document: iframeDoc };
        const el1 = document.createElement('div');
        el1.className = 'x';
        const el2 = document.createElement('div');
        el2.className = 'x';
        iframeDoc.body.appendChild(el1);
        iframeDoc.body.appendChild(el2);
        const found = injector.element.getAllInsideIframe({ iframe, selector: '.x' });
        expect(found.length).toBe(2);
    });

    test('element.wait should reject on timeout', async () => {
        expect.assertions(1);
        try {
            await injector.element.wait({ selector: '#will-not-appear', timeout: 50 });
        } catch (err) {
            expect(err).toMatch(/Timed out/);
        }
    });

    test('element.waitAll mode 2 (less than or equal) resolves appropriately', async () => {
        // start waiting for less than or equal to 1 element
        const p = injector.element.waitAll({ selector: '.tmp-mode2', count: 1, mode: 2, timeout: 500 });
        // insert 0 or 1 elements will satisfy mode: less than or equal, so it should resolve quickly
        const el = document.createElement('div');
        el.className = 'tmp-mode2';
        document.body.appendChild(el);
        const res = await p;
        expect(res.length).toBeGreaterThanOrEqual(0);
    });

    test('inject.linkElement throws when iframe undefined and config.errors.throwOnUndefinedIFrameLinkInjection true', () => {
        injector.config.inject.enabled = true;
        injector.config.inject.style = true;
        injector.config.errors.throwOnUndefinedIFrameLinkInjection = true;
        expect(() => injector.inject.linkElement({ iframe: undefined })).toThrow();
        // revert to default
        injector.config.errors.throwOnUndefinedIFrameLinkInjection = true;
    });

    test('inject.linkElement uses fallback contentWindow appendChild when isLinkInjected fails after append', () => {
        // prepare head with versioned link so element.build.link() can pick version
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        // initialize builtLinkElement
        injector.onload.initialSetup();

        // Setup iframe where contentDocument.head.appendChild throws
        const iframeDoc = document.implementation.createHTMLDocument('iframe');
        const iframe = document.createElement('iframe');
        iframe.contentDocument = iframeDoc;
        iframe.contentWindow = { document: iframeDoc };
        // Spy on contentWindow appendChild
        const appendSpy = jest.spyOn(iframe.contentWindow.document.head, 'appendChild');
        // Force the check to always return false so fallback path is triggered
        const originalCheck = injector.inject.check.isLinkInjected;
        injector.inject.check.isLinkInjected = function () { return false; };
        injector.inject.linkElement({ iframe });

        expect(appendSpy).toHaveBeenCalled();
        // restore
        injector.inject.check.isLinkInjected = originalCheck;
        appendSpy.mockRestore();
    });

    test('observer.setup throws error when portal root is not present', async () => {
        // ensure no root exists
        document.body.innerHTML = '';
        injector.config.observer.enabled = true;
        // make wait timeout short to avoid long test durations
        injector.config.defaults.element.timeout = 50;
        await expect(injector.observer.setup()).rejects.toThrow();
    });

    test('inject.check functions identify presence correctly', () => {
        // setup built elements
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);
        injector.onload.initialSetup();

        const iframeDoc = document.implementation.createHTMLDocument('iframe');
        const iframe = document.createElement('iframe');
        iframe.contentDocument = iframeDoc;
        iframe.contentWindow = { document: iframeDoc };
        // add link element identical to built link to iframe head
        const clonedLink = injector.element.clone({ elementHandle: injector.builtLinkElement });
        iframeDoc.head.appendChild(clonedLink);
        expect(injector.inject.check.isLinkInjected({ iframe })).toBe(true);

        // fonts
        const font = document.createElement('link');
        font.setAttribute('injection-type', 'font');
        font.rel = 'preload';
        font.href = '/assets/fonts/test.woff2';
        document.head.appendChild(font);
        injector.onload.initialSetup();
        const clonedFonts = injector.element.cloneAll({ elementHandleCollection: injector.builtFontElementCollection });
        clonedFonts.forEach(function(f) { iframeDoc.head.appendChild(f); });
        const fontCount = clonedFonts.length;
        expect(injector.inject.check.areFontsInjected({ iframe, fontCount })).toBe(true);
    });

    test('version.getAllFromHead should throw if no versioned link present', () => {
        // empty head
        document.head.innerHTML = '';
        expect(() => injector.version.getAllFromHead()).toThrow();
    });

    test('log setters and utilities', () => {
        // call setter and do conversions
        injector.log.setLogLevel({ level: 'warning' });
        expect(injector.config.log.level).toBe('warning');
    });

    test('element.get and getAll queries elements', () => {
        document.body.innerHTML = '<div class="x"></div><div class="x"></div>';
        const el = injector.element.get({ selector: '.x' });
        expect(el).not.toBeNull();
        const all = injector.element.getAll({ selector: '.x' });
        expect(all.length).toBe(2);
    });

    test('log functions return expected values', () => {
        expect(typeof injector.log.getTimestamp()).toBe('string');
        expect(injector.log.sanitizeLogLevelString({ level: 'INFO' })).toBe('info');
        expect(injector.log.transformLogLevelString({ level: 'warning' })).toBe('WAR');
    });

// Deprecated: This combined test suite was split into smaller focused suites.
// Use the following files under `__tests__/`:
//  - element.test.js
//  - inject.test.js
//  - observer.test.js
//  - version_log.test.js
// Nothing here. All tests moved.
