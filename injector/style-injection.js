/**
 * ------------------------
 * Portal styling injection
 * ------------------------
 * 
 * This script injects a third party link element
 * containing different style to the portals iframes
 * so you don't need to actually rebuild the whole thing.
 * It's basically an overengineered CSS stylesheet
 * injector that you can semi "plug & play" into Ghost.
 * I want a dark mode portal for which i don't have 
 * to keep up with another repo so i did this. :)
 * 
 * This script includes, foreign iframe injection 
 * capabiltiies, waiting for elements, monitoring 
 * iframes, which is basically injection persistence 
 * and timeout sub monitoring that checks for a 
 * couple of seconds if everything is still injected
 * and keeps injecting during that time. This script
 * also has logging capabilities for extended 
 * debugging and monitoring just for extra fun. 
 * 
 * This file should be placed under the theme
 * assets/js folder and built afterwards.
 * 
 */

/**
 * 
 * --------
 * Contents
 * --------
 * 
 * 1. Initialization
 * 2. Logging
 * 3. Version
 * 4. Element
 * 5. Watcher
 * 6. Injection
 * 7. Mutation observer
 * 8. On load
 * 
 */


/* 1. Initialization
/* ------------------------------------------------ */
// #region

/**
 * Log level constants
 */
const LOG_LEVELS = {
    info: 1,
    warning: 2,
    error: 3
};

/**
 * HTML tags constants
 */
const TAGS = {
    iframe: 'IFRAME',
    link: 'LINK',
    script: 'SCRIPT',
    style: 'STYLE'
};

/**
 * Global configuration object
 * 
 * Use this object to configure the injection scripts behavior,
 * you should only change stuff you actually need, such as
 * font elements selector and enabling or desabling certain
 * functions for degugging or functionality purposes.
 * 
 */
const config = {
    selector: {
        root: '#ghost-portal-root',             // Portal root element selector, sits at the bottom of the body and contains every portal iframe
        iframes: '#ghost-portal-root iframe',   // Portal child iframe selector, selects every iframe specifically for injection
        iframe: 'iframe',                       // Generic iframe selector, selects every available iframe in the page
        stylesheet: 'link[rel="stylesheet"]',   // Stylesheet link selector, selects every linked stylesheet available in the page
        fonts: '[injection-type="font"]',       // Font elements collection selector, special selector that requires previous setup of font tags in hbs files to correctly acquire them later
    },
    log: {
        enabled: true,      // Enable logging, includes debug logging 
        level: 'warning',   // Log level: 'info', 'warning', 'error', info is equivalent to a verbose output, used for debugging only
        date: {
            iso: true       // Convert log date string to ISO compliant string
        },
        characters: 3       // Log level tag abbreviation character count, e.g. info becomes INF
    },
    inject: {
        enabled: true,      // Injection globally enabled?
        style: true,        // Linked stylesheet injection enabled?
        fonts: true,        // Font elements collection injection enabled?
        fontCount: 18,      // Font elements count base count/override setting
        fontCountAuto: 0,   // Are font elements counted automatically? true: Automatically using font selector, false: Overridden by configuration
        firstTime: {
            enabled: true,      // First time injection on load enabled?
            style: true,        // First time style injection enabled?
            fonts: true,        // First time font elements collection injection enabled?
        },
        setWatcherOnFont: false,    // Set watcher on font elements collection injection?
        clearWatcherOnFont: false   // Clear watcher on font elements if timeout and injection are met?
    },
    observer: {
        enabled: true,          // Mutation observer enabled? (Guarantees that injection reaches all available iframes)
        target: 'childList',    // Target mutation observer type
        initialization: {
            childList: true,    // Watch for added or removed nodes?
            subtree: true       // Watch the entire subtree of #ghost-portal-root element ID?
        }
    },
    watcher: {
        enabled: true,      // Watcher enabled? (Guarantees that injection is kept in place after the first injection)
        cleanup: true,      // Watcher cleanup enabled? (When set to false the watcher won't be turned off, not recommended)
        current: null,      // Current injection watcher variable, will contain the current watcher if is running
        cycleCount: 0,      // Starting number for the watcher cycle counter
        interval: 50,       // Watcher interval in milliseconds (ms), recommended at 50ms
        timer: {
            limit: 3000,    // Watcher time limit in milliseconds (ms), defines the watcher execution time limit
            start: 0,       // Watcher timer start timestamp, will be set later with date
            end: 0          // Watcher timer end timestamp, will be set later with date too
        }
    },
    stylesheet: {
        url: {
            prefix: '/assets/built/portal.css?v=',  // Custom linked stylesheet URL prefix
        }
    },
    version: {
        selector: 'link, script, style',            // Version getter, base selector to the elements that have versions
        pattern: '?v=',                             // Base prefix pattern to obtain version
        extractMin: 0,                              // Version string excerpt starting character
        extractMax: 15,                             // Version string excerpt ending character

    },
    errors: {
        throwOnRegularInjectionFailure: false,          // Throw error when injection fails?
        throwOnFirstTimeInjectionFailure: false,        // Throw error when first time injection fails?
        throwOnUndefinedIFrameLinkInjection: true,      // Throw error when linked stylesheet injection fails due to an undefined iframe?
        throwOnLinkInjectionCheckFailure: false,        // Throw error when checking for the linked stylesheet injection fails?
        throwOnUndefinedIFrameFontInjection: true       // Throw error when font element collection injection fails due to undefined iframe?
    },
    /* Default section, probably shouldn't need changes, only under special circunstances */
    defaults: {
        log: {
            message: '',        // Default log message
            level: 'info',      // Default logging level
            colors: {
                timestamp: 'color: orange',     // Default log timestamp color/style
                message: 'color: white',        // Default log message color/style
                level: {
                    error: 'color: red',        // Default log error level color/style
                    warning: 'color: yellow',   // Default log warning level color/style
                    info: 'color: green'        // Default log informational level color/style
                },
                error: 'color: red; background-color: white'    // Default error style
            }
        },
        element: {
            selector: '',           // Default selector for a single element
            selectorAll: '',        // Default selector for all elements
            selectorAllCount: -1,       // Default all element selection count
            originalHandle: undefined,  // Default original element handle
            handleCollection: [],       // Default element handle collection
            wait: false,        // Proxy wait toggle
            waitAll: false,     // Proxy wait all toggle
            waitAllCount: 0,    // Proxy wait all element count
            waitAllMode: 1,     // Proxy wait all mode (element count mode), 0 - Equal, 1 - More than or equal, 2 - Less than or equal
            timeout: 15000,     // Element wait timeout in ms
            url: ''             // Default element link url
        }
    }
};

/**
 * Other globals
 */
var builtLinkElement = null;
var builtFontElementCollection = null;

// #endregion

/* 2. Logging
/* ------------------------------------------------ */
// #region

class log {

    /* Destructured default values object */
    static default = config.defaults.log;

    /* Log a message */
    constructor({ message = log.default.message, level = log.default.level }) {
        if (!config.log.enabled) return;
        var logLevel = log.getLogLevel({ level });

        // Check if the current log level allows this message
        if (logLevel >= LOG_LEVELS[config.log.level]) {
            let logMessage = log.getLogMessageString({ message, level });
            const colors = config.defaults.log.colors;
            var levelColor = undefined;
            var sanitizedLevel = log.sanitizeLogLevelString({ level });
            sanitizedLevel = sanitizedLevel == undefined ? 'info' : sanitizedLevel;
            levelColor = colors.level[sanitizedLevel];
            console.log(logMessage, colors.timestamp, levelColor, colors.level.message);
        }
    }

    /* Get system timestamp using date */
    static getTimestamp() {
        return (config.log.date.iso) ?
            new Date().toISOString() :
            new Date().toString();
    }

    /* Get log level from constants */
    static getLogLevel({ level }) {
        return LOG_LEVELS[log.sanitizeLogLevelString({ level })];
    }

    /* Build a structured log message string using a message and log level */
    static getLogMessageString({ message = log.default.message, level = log.default.level }) {
        level = log.transformLogLevelString({ level });
        const timestamp = log.getTimestamp();
        return `%c[${timestamp}] %c[${level}]: %c${message}`;
    }

    /* Set this script log level */
    static setLogLevel({ level }) {
        _log({ message: `Setting log level to ${level}` });
        if (LOG_LEVELS[level] !== undefined) {
            config.log.level = level;
        } else {
            console.warn('Invalid log level. Using default: "info".');
            config.log.level = 'info';
        }
    }

    /* Sanitize a log level string */
    static sanitizeLogLevelString({ level }) {
        return level
            .toString()
            .trim()
            .toLowerCase();
    }

    /* Transform log level string into an abbreviated 3 character string */
    static transformLogLevelString({ level }) {
        const charCount = config.log.characters;
        return level
            .toString()
            .trim()
            .toUpperCase()
            .substring(0, charCount);
    }
}

/* Log function proxy, avoid needing to use new keyword when calling the log constructor */
const _log = new Proxy(log, {
    apply(target, thisArg, argumentsList) {
        return new target(...argumentsList);
    }
});

// #endregion

/* 3. Version
/* ------------------------------------------------ */
// #region

class version {

    /* Extract version from the URL (e.g., "?v=0cba9e0c46") */
    static getFromUrl({ url }) {
        try {
            const splitCharacter = '?';
            const splitIndex = 1;
            const parameter = 'v';
            _log({ message: `Getting version from url, ${url}`, level: 'info' });
            const urlParams = new URLSearchParams(url.split(splitCharacter)[splitIndex]);
            return urlParams.get(parameter).toString();
        } catch (error) {
            const message = 'Failed to get version from URL';
            const cause = error;
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            return '';
        }
    }

    /* Search for versioned links, scripts, or styles in the head */
    static getAllFromHead() {
        try {
            _log({ message: 'Extracting file versions from head', level: 'info' });
            const head = document.head;
            const versionedFiles = [];
            const selector = config.version.selector;
            const { extractMin, extractMax } = config.version;

            /* Check <link>, <script>, and <style> tags in the head */
            const elements = [...head.querySelectorAll(selector)];
            const elementCount = elements.length;
            _log({ message: `Found ${elementCount} element(s) using selector: "${selector}"`, level: 'info' });

            _log({ message: 'Going through each element in the head', level: 'info' });
            elements.forEach(function (element) {
                const tagLink = TAGS.link;
                const tagScript = TAGS.script;
                const tagStyle = TAGS.style;
                const urlPattern = config.version.pattern;
                let url = '';

                if (element.tagName === tagLink && element.href) {
                    url = element.href;
                } else if (element.tagName === tagScript && element.src) {
                    url = element.src;
                } else if (element.tagName === tagStyle && element.href) {
                    url = element.href;
                }

                if (url && url.includes(urlPattern)) {
                    const urlVersion = version.getFromUrl({ url });
                    versionedFiles.push({ url, urlVersion });
                }
            });

            const stringExtract = versionedFiles[0].url.toString().substring(extractMin, extractMax);
            const firstFileVersion = versionedFiles[0].urlVersion.toString();

            _log({ message: `Got versioned files from head, example: ${stringExtract}... ${firstFileVersion}`, level: 'info' });

            return versionedFiles;
        } catch (error) {
            const message = 'Failed to extract file versions from head';
            const cause = error;
            console.trace();
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            throw new Error(message, cause)
        }
    }

    /* Get the first version available from the versioned files */
    static getFirst() {
        _log({ message: `Get the first available version from head`, level: 'info' });
        const versionedFiles = version.getAllFromHead();
        const firstVersion = versionedFiles.length > 0 ? versionedFiles[0].urlVersion : null;
        _log({ message: `First version from head is ${firstVersion}`, level: 'info' });
        return firstVersion;
    }
}

// #endregion

/* 4. Element
/* ------------------------------------------------ */
// #region

class element {

    /* Destructured default values object */
    static default = config.defaults.element;

    /* Get an element handle based on selector */
    static get({ selector = element.default.selector, wait = element.default.wait }) {
        try {
            let elementHandle;
            if (selector.length === 0) {
                const message = `Selector parameter is empty.`;
                throw new Error(message);
            }
            if (wait) return element.wait({ selector });
            elementHandle = document.querySelector(selector);
            return elementHandle;
        } catch (error) {
            const message = 'Failed to get element from selector.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Get all elements matching a given selector */
    static getAll({ selector = element.default.selectorAll, wait = element.default.waitAll, count = element.default.selectorAllCount }) {
        try {
            let elementCollectionHandle;
            if (selector.length === 0) {
                const message = 'Selector parameter is empty.';
                throw new Error(message);
            }
            if (wait) return element.waitAll({ selector, count });
            elementCollectionHandle = document.querySelectorAll(selector);
            return elementCollectionHandle;
        } catch (error) {
            const message = 'Failed to get all elements from selector.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Get all elements matching a given selector inside an iframe */
    static getAllInsideIframe({iframe, selector}) {

    }

    /* Get all portal iframes */
    static getAllIframes() {
        try {
            const selectorIframe = config.selector.iframes;
            const iframes = element.getAll({ selector: selectorIframe });
            const iframeCount = iframes.length;
            _log({ message: `Found ${iframeCount} iframe(s).`, level: 'info' });
            return iframes;
        } catch (error) {
            const message = 'Failed to get all portal iframes.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Get all font elements */
    static getAllFonts() {
        try {
            const selectorFonts = config.selector.fonts;
            const fonts = element.getAll({ selector: selectorFonts });
            const fontsLength = fonts.length;
            _log({ message: `Found ${fontsLength} font element(s).`, level: 'info' });
            return fonts;
        } catch (error) {
            const message = 'Failed to get all portal iframes.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Get name of a specific iframe */
    static getIframeName({ iframe }) {
        if (iframe == undefined) return '';
        return iframe.getAttribute('title').toString();
    }

    /* Get element count from selector */
    static count({ selector = element.default.selector }) {
        try {
            let elementCollectionHandle;
            elementCollectionHandle = element.getAll({ selector });
            return elementCollectionHandle.length;
        } catch (error) {
            const message = 'Failed to get element count from selector.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Get portal iframe count */
    static countIframes() { 
        try {
            let elementCollectionHandle;
            const iframeSelector = config.selector.iframes;
            elementCollectionHandle = element.count({ selector: iframeSelector });
            return elementCollectionHandle.length;
        } catch (error) {
            const message = 'Failed to get iframe element count from selector.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Get font elements count */
    static countFonts() {
        try {
            let elementCollectionHandle;
            const fontsSelector = config.selector.fonts;
            elementCollectionHandle = element.count({ selector: fontsSelector });
            return elementCollectionHandle.length;
        } catch (error) {
            const message = 'Failed to get font element count from selector.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Clones a given element using its handle */
    static clone({ elementHandle = element.default.elementHandle }) {
        try {
            if (elementHandle === undefined) throw new Error('Element handle is empty/undefined');
            if (!(elementHandle instanceof Element)) throw new Error('Provided an element handle that is not an instance of an Element object');
            let elementClone = elementHandle.cloneNode();
            return elementClone;
        } catch (error) {
            const message = 'Failed to clone element using an element handle.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Clone all element handles */
    static cloneAll({ elementHandleCollection = element.default.handleCollection }) {
        try {
            if (elementHandleCollection === undefined) throw new Error('Element handle collection is empty/undefined');
            var elementCloneCollection = new Array();
            elementHandleCollection.forEach(function (elementHandle) {
                if (elementHandle instanceof Element) {
                    var clonedElement = elementHandle.cloneNode();
                    elementCloneCollection.push(clonedElement);
                }
            });
            return elementCloneCollection;
        } catch (error) {
            const message = 'Failed to clone all elements from a handle collection';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Wait for an element until it's ready */
    static wait({ selector = element.default.selector, timeout = element.default.timeout }) {
        _log({ message: `Waiting for element selector: ${selector} with timeout of ${timeout}` });
        return new Promise(function (resolve, reject) {
            const elementObject = element.get({ selector });
            if (elementObject instanceof Element) resolve(elementObject);
            const observer = new MutationObserver(function () {
                const elementObject = element.get({ selector });
                if (elementObject instanceof Element) {
                    observer.disconnect();
                    clearTimeout(timeoutChecker);
                    resolve(elementObject);
                }
            });
            const options = {
                childList: true,
                subtree: true
            };
            const target = document.body;
            observer.observe(target, options);
            const timeoutChecker = setTimeout(function () {
                observer.disconnect();
                const message = `Timed out waiting for element.`;
                _log({ message: `${message}`, level: 'warning' });
                reject(message);
            }, timeout);
        });
    }

    /* Wait for quantity of elements until they're available */
    static waitAll({ selector = element.default.selectorAll, timeout = element.default.timeout, count = element.default.waitAllCount, mode = element.default.waitAllMode }) {
        _log({ message: `Waiting for all elements with selector: ${selector} with timeout of ${timeout} using count of ${count} and mode ${mode}` });
        return new Promise(function (resolve, reject) {
            try {
                const elementCollectionObject = element.getAll({ selector });
                if (count < 1) throw new Error('Invalid object count target.');
                if (elementCollectionObject instanceof NodeList && elementCollectionObject.length >= count)
                    resolve(elementCollectionObject);
                const observer = new MutationObserver(function () {
                    const elementCollectionObject = element.getAll({ selector });
                    switch (mode) {
                        case 1: // More than or equal
                            if (elementCollectionObject instanceof NodeList && elementCollectionObject.length >= count) resolve(elementCollectionObject);
                            break;
                        case 2: // Less than or equal
                            if (elementCollectionObject instanceof NodeList && elementCollectionObject.length < count) resolve(elementCollectionObject);
                            break;
                        default: // Equal, 0 or other values
                            if (elementCollectionObject instanceof NodeList && elementCollectionObject.length == count) resolve(elementCollectionObject);
                            break;
                    }
                });
                const options = {
                    childList: true,
                    subtree: true
                };
                const target = document.body;
                observer.observe(target, options);
                const timeoutChecker = setTimeout(function () {
                    observer.disconnect();
                    const message = 'Timed out waiting for all the elements';
                    _log({ message: `${message}`, level: 'warning' });
                    reject(message);
                }, timeout);
            } catch (error) {
                const message = 'Failed to wait for all elements.';
                const cause = { cause: error };
                throw new Error(message, cause);
            }
        });
    }

    static create = class {

        /* Create a new link element */
        static link({ url = element.default.url }) {
            try {
                _log({ message: 'Creating link element', level: 'info' });

                const elementType = 'link';
                const linkType = 'text/css';
                const typeRel = 'stylesheet';

                const linkElement = document.createElement(elementType);
                linkElement.link = linkType;
                linkElement.rel = typeRel;
                linkElement.href = url;

                _log({ message: `Created link element with href ${linkElement.href}`, level: 'info' });

                return linkElement;
            } catch (error) {
                const message = 'Failed to create link element';
                const cause = error;
                _log({ message: `${message} due to ${cause}`, level: 'error' });
                throw new Error(message, cause);
            }
        }
    }

    static build = class {

        /* Build link element with file version and url */
        static link() {
            _log({ message: 'Building stylesheet element', level: 'info' });
            const firstVersion = version.getFirst();
            const urlPrefix = config.stylesheet.url.prefix;
            const url = `${urlPrefix}${firstVersion}`;
            const elementResult = element.create.link({ url });
            return elementResult;
        }

        /* Build font collection by cloning all */
        static fontCollection() {
            _log({ message: 'Building font collection', level: 'info' });
            var fontElementHandleCollection = element.getAllFonts();
            var fontElementCloneCollection = element.cloneAll({
                elementHandleCollection: fontElementHandleCollection
            });
            return fontElementCloneCollection;
        }
    }
}

// #endregion

/* 5. Watcher
/* ------------------------------------------------ */
// #region

class watcher {

    /* Set watcher to keep injection in place */
    static set() {
        if (!config.watcher.enabled) return;
        if (config.watcher.current != null) return;
        config.watcher.timer.start = Date.now();
        config.watcher.timer.end = Date.now() + config.watcher.timer.limit;
        config.watcher.current = setInterval(function () {
            config.watcher.cycleCount++;
            _log({ message: `Watcher cycle count: ${config.watcher.cycleCount}`, level: 'info' });
            const iframes = element.getAllIframes();
            iframes.forEach(function (iframe) { inject.everything({ iframe }); });
        }, config.watcher.interval);
    }

    /* Clear watcher after the configured timeout */
    static clear() {
        if (!config.watcher.enabled) return;
        if (!config.watcher.cleanup) return;
        clearInterval(config.watcher.current);
        config.watcher.current = null;
    }
}

// #endregion

/* 6. Injection
/* ------------------------------------------------ */
// #region

class inject {

    /* Inject linked stylesheet (link element) in a specific iframe */
    static linkElement({ iframe }) {
        try {
            if (!config.inject.enabled) return;
            if (!config.inject.style) return;
            if (iframe == undefined && config.errors.throwOnUndefinedIFrameLinkInjection) throw new Error('Iframe is undefined');
            const iframeName = element.getIframeName({ iframe });
            if (iframe.contentDocument && !inject.check.isLinkInjected({ iframe })) {
                if (iframe.contentDocument.head == null) return;
                _log({ message: `Injecting stylesheet using link element in iframe ${iframeName}`, level: 'info' });
                const link = element.clone({ elementHandle: builtLinkElement });
                iframe.contentDocument.head.appendChild(link);
                if (!inject.check.isLinkInjected({ iframe })) {
                    _log({ message: 'Failed to inject using the main method, falling back to an alternative', level: 'info' });
                    iframe.contentWindow.document.head.appendChild(link);
                }
                _log({ message: `Injected stylesheet using link element in iframe ${iframeName}`, level: 'info' });
                watcher.set();
            }

            const currentDate = Date.now();

            if (inject.check.isLinkInjected({ iframe }) && currentDate > config.watcher.timer.end) {
                _log({ message: 'Link element is injected and timeout reached, clearing watcher', level: 'info' });
                watcher.clear();
            }
        } catch (error) {
            const message = 'Failed to do inject stylesheet routine, watcher auxiliary function';
            const cause = error;
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            if (config.errors.throwOnRegularInjectionFailure) throw new Error(message, cause);
        }
    }

    /* Inject font element collection in an iframe using cloned font collection elements */
    static fontElementCollection({ iframe }) {
        try {
            if (!config.inject.enabled) return;
            if (!config.inject.fonts) return;
            if (iframe == undefined && config.errors.throwOnUndefinedIFrameFontInjection) throw new Error('Iframe is undefined');
            const iframeName = element.getIframeName({ iframe });
            const fontCount = config.inject.fontCountAuto ? element.countFonts() : config.inject.fontCount;
            if (iframe.contentDocument && !inject.check.areFontsInjected({ iframe, fontCount: fontCount })) {
                if (iframe.contentDocument.head == null) return;
                _log({ message: `Injecting font element collection in iframe ${iframeName}`, level: 'info' });
                const fontCollection = element.cloneAll({ elementHandleCollection: builtFontElementCollection });
                fontCollection.forEach(function (fontElement) {
                    iframe.contentDocument.head.appendChild(fontElement);
                });
                _log({ message: 'Injected font element collection', level: 'info' });
                if (config.inject.setWatcherOnFont) watcher.set();
            }

            if (config.inject.setWatcherOnFont && config.inject.clearWatcherOnFont) {
                const currentDate = Date.now();

                if (inject.check.areFontsInjected({ iframe, fontCount: config.selector.fontCount }) && currentDate > config.watcher.timer.end) {
                    _log({ message: 'Font element collection is injected and timeout reached, clearing watcher', level: 'info' });
                    watcher.clear();
                }
            }
        } catch (error) {
            const message = 'Failed to do inject font collection routine, watcher auxiliary function';
            const cause = error;
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            if (config.errors.throwOnRegularInjectionFailure) throw new Error(message, cause);
        }
    }

    /* Inject both stylesheet link and font elements collection into all the available iframes */
    static everything({ iframe }) {
        inject.linkElement({ iframe });
        inject.fontElementCollection({ iframe });
    }

    static iframeCollection = class {

        /* Inject linked stylesheet element in a collection of iframes */
        static linkElement({ iframes }) {
            iframes.forEach(function (iframe) { inject.linkElement({ iframe }) });
        }

        /* Inject font element collection in an iframe collection using cloned font collection elements */
        static fontElementCollection({ iframes }) {
            iframes.forEach(function (iframe) { inject.fontElementCollection({ iframe }) });
        }
    }

    static firstTime = class {

        /* Inject custom stylesheet for the first time */
        static linkElement() {
            if (!config.inject.enabled) return;
            if (!config.inject.firstTime.enabled) return;
            if (!config.inject.firstTime.style) return;
            try {
                _log({ message: 'Doing a first time stylesheet injection routine', level: 'info' });
                const iframes = element.getAllIframes();
                inject.iframeCollection.linkElement({ iframes });
                _log({ message: 'Done doing a first time stylesheet injection', level: 'info' });
            } catch (error) {
                const message = 'Failed to do a first time stylesheet injection routine';
                const cause = error;
                _log({ message: `${message} due to ${cause}`, level: 'error' });
                if (config.errors.throwOnFirstTimeInjectionFailure) throw new Error(message, cause);
            }
        }

        /* Inject font collection elements for the first time */
        static fontElementCollection() {
            if (!config.inject.enabled) return;
            if (!config.inject.firstTime.enabled) return;
            if (!config.inject.firstTime.fonts) return;
            try {
                _log({ message: 'Doing a first time font collection injection routine', level: 'info' });
                const iframes = element.getAllIframes();
                inject.iframeCollection.fontElementCollection({ iframes });
                _log({ message: 'Done doing a first time font collection injection', level: 'info' });
            } catch (error) {
                const message = 'Failed to do a first time font collection injection routine';
                const cause = error;
                _log({ message: `${message} due to ${cause}`, level: 'error' });
                if (config.errors.throwOnFirstTimeInjectionFailure) throw new Error(message, cause);
            }
        }

        /* Inject both stylesheet and font collection for the first time */
        static everything() {
            inject.firstTime.linkElement();
            inject.firstTime.fontElementCollection();
        }
    }

    static check = class {

        /* Check if link to stylesheet element is injected in a given iframe */
        static isLinkInjected({ iframe }) {
            try {
                const iframeName = element.getIframeName({ iframe });
                _log({ message: `Checking if link element is already injected in iframe ${iframeName}`, level: 'info' });
                const linkSelector = config.selector.stylesheet;
                const links = iframe.contentDocument.querySelectorAll(linkSelector);
                const linkUrl = builtLinkElement.href;
                const isLinkElementPresent = Array.from(links).some(function (link) { return link.href === linkUrl });
                _log({ message: `Link element is${isLinkElementPresent ? '' : ' NOT'} present in iframe ${iframeName}.`, level: 'info' });
                return isLinkElementPresent;
            } catch (error) {
                const message = 'Failed to check if link element is already injected into iframe';
                const cause = error;
                _log({ message: `${message} due to ${cause}`, level: 'warning' });
                if (config.errors.throwOnLinkInjectionCheckFailure) throw new Error(message, cause);
                return false;
            }
        }

        /* Check if our font elements collection are injected in an iframe */
        static areFontsInjected({ iframe, fontCount }) {
            try {
                const iframeName = element.getIframeName({ iframe });
                _log({ message: `Checking if font element collection is already injected in iframe ${iframeName}`, level: 'info' });
                const fontCollectionSelector = config.selector.fonts;
                const fontCollection = iframe.contentDocument.querySelectorAll(fontCollectionSelector);
                const areFontsPresent = (fontCollection.length == fontCount);
                _log({ message: `Font element collection is${areFontsPresent ? '' : ' NOT'} present in iframe ${iframeName}`, level: 'info' });
                return areFontsPresent;
            } catch (error) {
                const message = 'Failed to check if font element collection is already injected into iframe';
                const cause = error;
                _log({ message: `${message} due to ${cause}`, level: 'warning' });
                if (config.errors.throwOnLinkInjectionCheckFailure) throw new Error(message, cause);
                return false;
            }
        }
    }
}

// #endregion

/* 7. Mutation observer
/* ------------------------------------------------ */
// #region

class observer {

    /* Setup mutation observer */
    static async setup() {
        try {
            if (!config.observer.enabled) return;
            _log({ message: 'Setting up mutation observer', level: 'info' });
            const selectorRootElement = config.selector.root;
            let rootElement = await element.wait({ selector: selectorRootElement });

            if (!rootElement) {
                _log({ message: `Failed to get root element ${selectorRootElement}`, level: 'error' });
                throw new Error(message);
            }

            const mutationObserver = new MutationObserver(function (mutationsList) {
                /* Iterate over all mutations */
                for (const mutation of mutationsList) {
                    const targetMutationType = config.observer.mutation;
                    if (mutation.type === targetMutationType) {
                        /* Check if new iframe is added */
                        mutation.addedNodes.forEach(function (node) {
                            if (node.tagName === TAGS.iframe) {
                                inject.everything({ iframe: node });
                            }
                        });

                        /* Check if an iframe is removed */
                        mutation.removedNodes.forEach(function (node) {
                            if (node.tagName === TAGS.iframe) _log({ message: 'Iframe removed', level: 'info' });
                        });
                    }
                    const iframes = element.getAllIframes();
                    iframes.forEach(function (iframe) {
                        inject.everything({ iframe });
                    });
                }
            });

            _log({ message: 'Configuring observer', level: 'info' });

            /* Configure the observer to watch for changes within #ghost-portal-root */
            mutationObserver.observe(rootElement, config.observer.initialization);

            _log({ message: `Mutation observer was setup to watch for iframes in ${rootElement}`, level: 'info' });
        } catch (error) {
            const message = 'Failed to setup mutation observer';
            const cause = error;
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            throw new Error(message, cause);
        }
    }
}

// #endregion

/* 8. On load
/* ------------------------------------------------ */
// #region

class onload {

    /* Setup initial vars */
    static async initialSetup() {
        _log({ message: 'Doing injector initial setup', level: 'info' });
        builtLinkElement = element.build.link();
        builtFontElementCollection = element.build.fontCollection();
    }

    /* Setup the window onload event */
    static setupEvent() {
        try {
            _log({ message: 'Setting window onload event', level: 'info' });
            window.onload = this.setupMonitor();
        } catch (error) {
            const message = 'Failed to set window onload event';
            const cause = error;
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            throw new Error(message, cause);
        }
    }

    /* On load event do a first time injection and setup a mutation observer */
    static setupMonitor() {
        _log({ message: 'Doing onload setup routine', level: 'info' });
        observer.setup();
        inject.firstTime.everything();
        _log({ message: 'Done setting up onload monitor', level: 'info' });
    }
}

/* Self executing anonymous function that injects portal styles on window load event, makes the magic happen */
(function () {
    onload.initialSetup();
    onload.setupEvent();
})();

// #endregion

