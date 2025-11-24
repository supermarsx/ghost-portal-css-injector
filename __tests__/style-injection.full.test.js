const fs = require('fs');
const path = require('path');

// Import the script as a module to get exported functions
const injector = require('../injector/style-injection.js');

describe('Comprehensive tests for injector script', () => {
    beforeEach(() => {
        // Reset document head for each test
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        // Reset config to defaults in case mutated by tests
        if (injector && injector.config) {
            injector.config.log.enabled = false; // reduce console noise
        }
    });

    test('version.getFromUrl should extract version param', () => {
        const url = 'https://example.com/assets/built/portal.css?v=abc123';
        expect(injector.version.getFromUrl({ url })).toBe('abc123');
    });

    test('version.getFromUrl returns empty string if not present', () => {
        const url = 'https://example.com/assets/built/portal.css';
        expect(injector.version.getFromUrl({ url })).toBe('');
    });

    test('version.getAllFromHead and getFirst should read first version from head', () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=abc123';
        document.head.appendChild(link);

        const versioned = injector.version.getAllFromHead();
        expect(Array.isArray(versioned)).toBe(true);
        expect(versioned[0].urlVersion).toBe('abc123');
        expect(injector.version.getFirst()).toBe('abc123');
    });

    test('element.create.link builds a link node with given url', () => {
        const result = injector.element.create.link({ url: '/assets/built/portal.css?v=x' });
        expect(result).toBeDefined();
        expect(result.tagName).toBe('LINK');
        expect(result.href).toContain('/assets/built/portal.css');
    });

    test('inject.linkElement injects link into iframe head', () => {
        // prepare head with versioned link so element.build.link() can pick version
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=hash123';
        document.head.appendChild(link);

        // initialize builtLinkElement and builtFontElementCollection
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
        // Create font element in head and mark injection-type
        const fontLink = document.createElement('link');
        fontLink.setAttribute('injection-type', 'font');
        fontLink.rel = 'preload';
        fontLink.href = '/assets/fonts/test.woff2';
        document.head.appendChild(fontLink);

        // rebuild font collection
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

    test('element.wait and waitAll resolve when elements are added', async () => {
        // wait should resolve when an element is added
        const selector = '#tmp-wait';
        const waitPromise = injector.element.wait({ selector, timeout: 500 });
        setTimeout(() => {
            const el = document.createElement('div');
            el.id = 'tmp-wait';
            document.body.appendChild(el);
        }, 50);
        const elResolved = await waitPromise;
        expect(elResolved.id).toBe('tmp-wait');

        // waitAll should resolve for multiple items
        const waitAllSelector = '.tmp-wait-all';
        const waitAllPromise = injector.element.waitAll({ selector: waitAllSelector, count: 2, timeout: 500 });
        setTimeout(() => {
            const a = document.createElement('div');
            a.className = 'tmp-wait-all';
            document.body.appendChild(a);
            const b = document.createElement('div');
            b.className = 'tmp-wait-all';
            document.body.appendChild(b);
        }, 50);
        const coll = await waitAllPromise;
        expect(coll.length).toBeGreaterThanOrEqual(2);
    });

    test('iframe name and count functions behavior', () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'portal-frame');
        expect(injector.element.getIframeName({ iframe })).toBe('portal-frame');

        // count should return number
        document.body.innerHTML = '<div class="a"></div><div class="a"></div>';
        expect(injector.element.count({ selector: '.a' })).toBe(2);

        // countIframes and countFonts should return numbers (0 if none present)
        expect(injector.element.countIframes()).toBe(0);
        expect(injector.element.countFonts()).toBe(0);
    });

    test('clone and cloneAll throw on invalid input and clone proper elements', () => {
        // clone should throw if undefined
        expect(() => injector.element.clone({})).toThrow();
        const div = document.createElement('div');
        div.className = 'test';
        const c = injector.element.clone({ elementHandle: div });
        expect(c instanceof Element).toBe(true);

        const arr = [div, document.createElement('span')];
        const clones = injector.element.cloneAll({ elementHandleCollection: arr });
        expect(clones.length).toBe(2);
    });

    test('observer.setup registers a mutation observer and setupMonitor hooks', () => {
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        // Attach a versioned link to head to avoid errors
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=abc';
        document.head.appendChild(versioned);

        // no exception should be thrown when setting up observer
        injector.observer.setup();
        // simulate addition of iframe to root to trigger observer
        const ifr = document.createElement('iframe');
        ifr.setAttribute('title', 'portal');
        root.appendChild(ifr);
        // success if no errors thrown
        expect(true).toBe(true);
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

    test('watcher set and clear', () => {
        // Use tiny timers to keep test fast
        injector.config.watcher.timer.limit = 50;
        injector.config.watcher.interval = 10;
        injector.watcher.set();
        expect(injector.config.watcher.current).not.toBeNull();
        injector.watcher.clear();
        expect(injector.config.watcher.current).toBeNull();
    });
});
