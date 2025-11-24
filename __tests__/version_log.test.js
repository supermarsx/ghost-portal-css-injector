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
