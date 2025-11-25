/* Miscellaneous edge-case test additions
 * Renamed from: edge_cases_additional.test.js -> edge_cases_extra.test.js
 */
const path = require('path');
const injector = require(path.resolve(__dirname, '..', 'injector', 'style-injection.js'));
const { log, version, element, inject, watcher, config } = injector;

describe('Edge cases extra (renamed)', () => {
    afterEach(() => {
        injector.clearAll();
        jest.restoreAllMocks();
        config.watcher.enabled = true;
        config.watcher.cleanup = true;
        config.observer.enabled = true;
        config.errors.throwOnUndefinedIFrameLinkInjection = false;
        config.errors.throwOnUndefinedIFrameFontInjection = false;
    });

    test('log.getTimestamp returns non-ISO when config.log.date.iso = false', () => {
        const origIso = config.log.date.iso;
        config.log.date.iso = false;
        const ts = log.getTimestamp();
        expect(typeof ts).toBe('string');
        config.log.date.iso = origIso;
    });

    test('sanitizeLogLevelString safely defaults on undefined', () => {
        expect(log.sanitizeLogLevelString({ level: undefined })).toBe('info');
        expect(log.sanitizeLogLevelString({ level: null })).toBe('info');
    });

    test('version.getAllFromHead throws when no versioned files present', async () => {
        const backup = document.head.innerHTML;
        document.head.innerHTML = '';
        expect(() => version.getAllFromHead()).toThrow('Failed to extract file versions from head');
        document.head.innerHTML = backup;
    });

    test('inject.linkElement throws when iframe undefined and flags set', () => {
        config.errors.throwOnUndefinedIFrameLinkInjection = true;
        config.errors.throwOnRegularInjectionFailure = true;
        expect(() => inject.linkElement({ iframe: undefined })).toThrow('Failed to do inject stylesheet routine');
        config.errors.throwOnUndefinedIFrameLinkInjection = false;
        config.errors.throwOnRegularInjectionFailure = false;
    });

    test('inject.fontElementCollection throws when iframe undefined and flags set', () => {
        config.errors.throwOnUndefinedIFrameFontInjection = true;
        config.errors.throwOnRegularInjectionFailure = true;
        expect(() => inject.fontElementCollection({ iframe: undefined })).toThrow();
        config.errors.throwOnUndefinedIFrameFontInjection = false;
        config.errors.throwOnRegularInjectionFailure = false;
    });

    test('element.getAllInsideIframe throws when iframe/document unavailable', () => {
        expect(() => element.getAllInsideIframe({ iframe: undefined, selector: 'a' })).toThrow();
    });

    test('watcher.set does not create interval if already set', () => {
        config.watcher.enabled = true;
        config.watcher.current = setInterval(() => {}, 1000);
        try {
            watcher.set();
            expect(config.watcher.current).not.toBeNull();
        } finally {
            clearInterval(config.watcher.current);
            config.watcher.current = null;
        }
    });

    test('element.countFonts uses selector and returns a number', () => {
        const initial = element.countFonts();
        expect(typeof initial).toBe('number');
    });
});
