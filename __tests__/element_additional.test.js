const injector = require('../injector/style-injection.js');

describe('Element utilities - additional tests', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = false; // quiet for tests
        injector.config.defaults.element.timeout = 50;
        // clear watcher
        try {
            injector.watcher.clear();
        } catch (err) {
            /* ignore */
        }
        injector.config.watcher.cycleCount = 0;
    });

    test('element.waitAll mode 0 (equal) should resolve when exact count reached', async () => {
        const p = injector.element.waitAll({ selector: '.w0', count: 2, mode: 0, timeout: 500 });
        const el1 = document.createElement('div');
        el1.className = 'w0';
        document.body.appendChild(el1);
        // not yet resolved
        await new Promise((r) => setTimeout(r, 10));
        const el2 = document.createElement('div');
        el2.className = 'w0';
        document.body.appendChild(el2);
        const res = await p;
        expect(res.length).toBe(2);
    });

    test('element.waitAll mode 1 (>=) should resolve when count reached or exceeded', async () => {
        const p = injector.element.waitAll({ selector: '.w1', count: 2, mode: 1, timeout: 500 });
        const el1 = document.createElement('div');
        el1.className = 'w1';
        document.body.appendChild(el1);
        const el2 = document.createElement('div');
        el2.className = 'w1';
        document.body.appendChild(el2);
        const res = await p; // should resolve immediately since >=2 is met
        expect(res.length).toBeGreaterThanOrEqual(2);
    });

    test('element.waitAll mode 2 (<=) should resolve when count is less or equal', async () => {
        // start with 2 elements and wait for <= 1 (remove one later)
        const el1 = document.createElement('div');
        el1.className = 'w2';
        const el2 = document.createElement('div');
        el2.className = 'w2';
        document.body.appendChild(el1);
        document.body.appendChild(el2);
        const p = injector.element.waitAll({ selector: '.w2', count: 1, mode: 2, timeout: 500 });

        // remove one element to reach <= 1
        setTimeout(() => {
            el2.remove();
        }, 20);

        const res = await p;
        expect(res.length).toBeLessThanOrEqual(1);
    });

    test('element.clone throws when provided invalid element handle', () => {
        expect(() => injector.element.clone({ elementHandle: undefined })).toThrow();
        expect(() => injector.element.clone({ elementHandle: {} })).toThrow();
    });

    test('element.cloneAll throws when provided invalid handleCollection', () => {
        // Passing null (non-iterable) should throw
        expect(() => injector.element.cloneAll({ elementHandleCollection: null })).toThrow();
    });

    test('element.create.link produces valid attributes and uses version from head', async () => {
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=ver123';
        document.head.appendChild(versioned);
        await injector.onload.initialSetup();
        const link = injector.element.create.link({ url: '/assets/built/portal.css?v=ver123' });
        expect(link.tagName).toBe('LINK');
        expect(link.getAttribute('rel')).toBe('stylesheet');
        expect(link.getAttribute('type')).toBe('text/css');
        expect(link.href).toContain('/assets/built/portal.css?v=ver123');
    });

    test('element.getAllInsideIframe doc fallback and param works', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const el = document.createElement('div');
        el.className = 'inside';
        doc.body.appendChild(el);
        // Using doc param
        const foundWithDoc = injector.element.getAllInsideIframe({ iframe, selector: '.inside', doc });
        expect(foundWithDoc.length).toBe(1);
        // Using iframe fallback (no doc param)
        const foundWithFallback = injector.element.getAllInsideIframe({ iframe, selector: '.inside' });
        expect(foundWithFallback.length).toBe(1);
    });

    test('version.getFromUrl handles missing v param and malformed urls gracefully', () => {
        expect(injector.version.getFromUrl({ url: 'https://example.com/style.css' })).toBe('');
        expect(injector.version.getFromUrl({ url: 'not a url' })).toBe('');
    });

    test('watcher increments cycle count and can be cleared', () => {
        jest.useFakeTimers();
        // ensure a root and iframe exist for watcher
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/built/portal.css?v=test';
        document.head.appendChild(link);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'portal');
        root.appendChild(iframe);
        // reset
        injector.config.watcher.cycleCount = 0;
        injector.config.watcher.interval = 10;
        injector.config.watcher.timer.limit = 50;
        injector.watcher.set();
        expect(injector.config.watcher.current).not.toBeNull();
        jest.advanceTimersByTime(40);
        expect(injector.config.watcher.cycleCount).toBeGreaterThanOrEqual(1);
        injector.watcher.clear();
        expect(injector.config.watcher.current).toBeNull();
        jest.useRealTimers();
    });
});
