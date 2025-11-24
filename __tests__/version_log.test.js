const injector = require('../injector/style-injection.js');

describe('Version and Log utilities', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = true;
        injector.config.log.level = 'info';
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

    test('version.getAllFromHead should read script src version', () => {
        const script = document.createElement('script');
        script.src = '/assets/built/portal.js?v=def456';
        document.head.appendChild(script);
        const versioned = injector.version.getAllFromHead();
        expect(Array.isArray(versioned)).toBe(true);
        expect(versioned[0].urlVersion).toBe('def456');
        expect(injector.version.getFirst()).toBe('def456');
    });

    test('version.getAllFromHead should read style href version', () => {
        const style = document.createElement('style');
        style.href = '/assets/built/portal-style.css?v=ghi789';
        // JSDOM doesn't normally expose href on style, but we can set directly for testing
        Object.defineProperty(style, 'href', { value: '/assets/built/portal-style.css?v=ghi789', writable: true });
        document.head.appendChild(style);
        const versioned = injector.version.getAllFromHead();
        expect(Array.isArray(versioned)).toBe(true);
        expect(versioned[0].urlVersion).toBe('ghi789');
        expect(injector.version.getFirst()).toBe('ghi789');
    });

    test('version.getAllFromHead should throw if no versioned link present', () => {
        document.head.innerHTML = '';
        expect(() => injector.version.getAllFromHead()).toThrow();
    });

    test('log setters and utilities', () => {
        injector.log.setLogLevel({ level: 'warning' });
        expect(injector.config.log.level).toBe('warning');
    });

    test('log functions return expected values', () => {
        expect(typeof injector.log.getTimestamp()).toBe('string');
        expect(injector.log.sanitizeLogLevelString({ level: 'INFO' })).toBe('info');
        expect(injector.log.transformLogLevelString({ level: 'warning' })).toBe('WAR');
    });

    test('log.getLogMessageString and getTimestamp formatting', () => {
        injector.config.log.date.iso = true;
        const ts = injector.log.getTimestamp();
        expect(ts).toMatch(/^[0-9\-T:.Z]+$/);
        const msg = injector.log.getLogMessageString({ message: 'hello', level: 'info' });
        expect(msg).toContain('%c[');
        expect(msg).toContain(']:');
    });
});
