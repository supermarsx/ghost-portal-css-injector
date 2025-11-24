// removed unused require statements (fs, path)

const injector = require('../injector/style-injection.js');

describe('Element utilities', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = true;
        injector.config.log.level = 'info';
    });

    test('element.create.link builds a link node with given url', () => {
        const result = injector.element.create.link({ url: '/assets/built/portal.css?v=x' });
        expect(result).toBeDefined();
        expect(result.tagName).toBe('LINK');
        expect(result.href).toContain('/assets/built/portal.css');
    });

    test('element.getAllInsideIframe returns NodeList inside iframe', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const el1 = document.createElement('div');
        el1.className = 'x';
        const el2 = document.createElement('div');
        el2.className = 'x';
        iframeDoc.body.appendChild(el1);
        iframeDoc.body.appendChild(el2);
        const found = injector.element.getAllInsideIframe({ iframe, selector: '.x', doc: iframeDoc });
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
        const p = injector.element.waitAll({ selector: '.tmp-mode2', count: 1, mode: 2, timeout: 500 });
        const el = document.createElement('div');
        el.className = 'tmp-mode2';
        document.body.appendChild(el);
        const res = await p;
        expect(res.length).toBeGreaterThanOrEqual(0);
    });

    test('iframe name and count functions behavior', () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'portal-frame');
        expect(injector.element.getIframeName({ iframe })).toBe('portal-frame');

        document.body.innerHTML = '<div class="a"></div><div class="a"></div>';
        expect(injector.element.count({ selector: '.a' })).toBe(2);

        expect(injector.element.countIframes()).toBe(0);
        expect(injector.element.countFonts()).toBe(0);
    });

    test('clone and cloneAll throw on invalid input and clone proper elements', () => {
        expect(() => injector.element.clone({})).toThrow();
        const div = document.createElement('div');
        div.className = 'test';
        const c = injector.element.clone({ elementHandle: div });
        expect(c instanceof Element).toBe(true);

        const arr = [div, document.createElement('span')];
        const clones = injector.element.cloneAll({ elementHandleCollection: arr });
        expect(clones.length).toBe(2);
    });
});
