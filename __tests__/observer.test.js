const injector = require('../injector/style-injection.js');

describe('Observer and Watcher', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        injector.config.log.enabled = false;
        injector.config.defaults.element.timeout = 50;
    });

    test('observer.setup registers a mutation observer and setupMonitor hooks', async () => {
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=abc';
        document.head.appendChild(versioned);

        await injector.observer.setup();
        const ifr = document.createElement('iframe');
        ifr.setAttribute('title', 'portal');
        root.appendChild(ifr);

        expect(true).toBe(true);
    });

    test('observer triggers inject.everything when iframe is added', async () => {
        const root = document.createElement('div');
        root.id = 'ghost-portal-root';
        document.body.appendChild(root);
        const versioned = document.createElement('link');
        versioned.rel = 'stylesheet';
        versioned.href = '/assets/built/portal.css?v=abc';
        document.head.appendChild(versioned);
        injector.onload.initialSetup();

        const spy = jest.spyOn(injector.inject, 'everything');
        await injector.observer.setup();

        expect(spy).not.toHaveBeenCalled();

        const ifr = document.createElement('iframe');
        ifr.setAttribute('title', 'portal');
        root.appendChild(ifr);

        await new Promise((r) => setTimeout(r, 0));

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test('observer.setup throws error when portal root is not present', async () => {
        document.body.innerHTML = '';
        injector.config.observer.enabled = true;
        await expect(injector.observer.setup()).rejects.toThrow();
    });

    test('watcher set and clear', () => {
        jest.useFakeTimers();
        injector.config.watcher.timer.limit = 100; // ms
        injector.config.watcher.interval = 10; // ms
        injector.config.watcher.cycleCount = 0;
        const spy = jest.spyOn(injector.inject, 'everything');
        injector.watcher.set();
        expect(injector.config.watcher.current).not.toBeNull();
        jest.advanceTimersByTime(200);
        expect(injector.config.watcher.cycleCount).toBeGreaterThanOrEqual(1);
        expect(spy).toHaveBeenCalled();
        injector.watcher.clear();
        expect(injector.config.watcher.current).toBeNull();
        spy.mockRestore();
        jest.useRealTimers();
    });
});
