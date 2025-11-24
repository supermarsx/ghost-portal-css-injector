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
    error: 3,
};

/**
 * HTML tags constants
 */
const TAGS = {
    iframe: 'IFRAME',
    link: 'LINK',
    script: 'SCRIPT',
    style: 'STYLE',
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
        root: '#ghost-portal-root', // Portal root element selector, sits at the bottom of the body and contains every portal iframe
        iframes: '#ghost-portal-root iframe', // Portal child iframe selector, selects every iframe specifically for injection
        iframe: 'iframe', // Generic iframe selector, selects every available iframe in the page
        stylesheet: 'link[rel="stylesheet"]', // Stylesheet link selector, selects every linked stylesheet available in the page
        fonts: '[injection-type="font"]', // Font elements collection selector, special selector that requires previous setup of font tags in hbs files to correctly acquire them later
    },
    log: {
        enabled: true, // Enable logging, includes debug logging
        level: 'warning', // Log level: 'info', 'warning', 'error', info is equivalent to a verbose output, used for debugging only
        date: {
            iso: true, // Convert log date string to ISO compliant string
        },
        characters: 3, // Log level tag abbreviation character count, e.g. info becomes INF
    },
    inject: {
        enabled: true, // Injection globally enabled?
        style: true, // Linked stylesheet injection enabled?
        fonts: true, // Font elements collection injection enabled?
        fontCount: 18, // Font elements count base count/override setting
        fontCountAuto: 0, // Are font elements counted automatically? true: Automatically using font selector, false: Overridden by configuration
        firstTime: {
            enabled: true, // First time injection on load enabled?
            style: true, // First time style injection enabled?
            fonts: true, // First time font elements collection injection enabled?
        },
        setWatcherOnFont: false, // Set watcher on font elements collection injection?
        clearWatcherOnFont: false, // Clear watcher on font elements if timeout and injection are met?
    },
    observer: {
        enabled: true, // Mutation observer enabled? (Guarantees that injection reaches all available iframes)
        target: 'childList', // Target mutation observer type
        initialization: {
            childList: true, // Watch for added or removed nodes?
            subtree: true, // Watch the entire subtree of #ghost-portal-root element ID?
        },
    },
    watcher: {
        enabled: true, // Watcher enabled? (Guarantees that injection is kept in place after the first injection)
        cleanup: true, // Watcher cleanup enabled? (When set to false the watcher won't be turned off, not recommended)
        current: null, // Current injection watcher variable, will contain the current watcher if is running
        cycleCount: 0, // Starting number for the watcher cycle counter
        interval: 50, // Watcher interval in milliseconds (ms), recommended at 50ms
        timer: {
            limit: 3000, // Watcher time limit in milliseconds (ms), defines the watcher execution time limit
            start: 0, // Watcher timer start timestamp, will be set later with date
            end: 0, // Watcher timer end timestamp, will be set later with date too
        },
    },
    stylesheet: {
        url: {
            prefix: '/assets/built/portal.css?v=', // Custom linked stylesheet URL prefix
        },
    },
    version: {
        selector: 'link, script, style', // Version getter, base selector to the elements that have versions
        pattern: '?v=', // Base prefix pattern to obtain version
        extractMin: 0, // Version string excerpt starting character
        extractMax: 15, // Version string excerpt ending character
    },
    errors: {
        throwOnRegularInjectionFailure: false, // Throw error when injection fails?
        throwOnFirstTimeInjectionFailure: false, // Throw error when first time injection fails?
        throwOnUndefinedIFrameLinkInjection: true, // Throw error when linked stylesheet injection fails due to an undefined iframe?
        throwOnLinkInjectionCheckFailure: false, // Throw error when checking for the linked stylesheet injection fails?
        throwOnUndefinedIFrameFontInjection: true, // Throw error when font element collection injection fails due to undefined iframe?
    },
    /* Default section, probably shouldn't need changes, only under special circunstances */
    defaults: {
        log: {
            message: '', // Default log message
            level: 'info', // Default logging level
            colors: {
                timestamp: 'color: orange', // Default log timestamp color/style
                message: 'color: white', // Default log message color/style
                level: {
                    error: 'color: red', // Default log error level color/style
                    warning: 'color: yellow', // Default log warning level color/style
                    info: 'color: green', // Default log informational level color/style
                },
                error: 'color: red; background-color: white', // Default error style
            },
        },
        element: {
            selector: '', // Default selector for a single element
            selectorAll: '', // Default selector for all elements
            selectorAllCount: -1, // Default all element selection count
            originalHandle: undefined, // Default original element handle
            handleCollection: [], // Default element handle collection
            wait: false, // Proxy wait toggle
            waitAll: false, // Proxy wait all toggle
            waitAllCount: 0, // Proxy wait all element count
            waitAllMode: 1, // Proxy wait all mode (element count mode), 0 - Equal, 1 - More than or equal, 2 - Less than or equal
            timeout: 15000, // Element wait timeout in ms
            url: '', // Default element link url
        },
    },
};

/**
 * Other globals
 */
let builtLinkElement = null;
let builtFontElementCollection = null;

// #endregion

/* 2. Logging
/* ------------------------------------------------ */
// #region

/**
 * Lightweight logging helper for the injector.
 *
 * This class provides configurable logging behavior (info/warning/error) and
 * formats messages with timestamps and level tags. Use `_log({ message, level })`
 * as a proxy to create logs without `new`.
 */
class log {
    /* Destructured default values object */
    static default = config.defaults.log;

    /**
     * Create and output a log message (if logging is enabled).
     * @param {Object} options - Options object
     * @param {string} options.message - The message to log
     * @param {string} options.level - The log level string (info|warning|error)
     * @returns {void}
     */
    constructor({ message = log.default.message, level = log.default.level }) {
        if (!config.log.enabled) return;
        const logLevel = log.getLogLevel({ level });

        // Check if the current log level allows this message
        if (logLevel >= LOG_LEVELS[config.log.level]) {
            const logMessage = log.getLogMessageString({ message, level });
            const colors = config.defaults.log.colors;
            let levelColor = undefined;
            let sanitizedLevel = log.sanitizeLogLevelString({ level });
            sanitizedLevel = sanitizedLevel === undefined ? 'info' : sanitizedLevel;
            levelColor = colors.level[sanitizedLevel];
            console.log(logMessage, colors.timestamp, levelColor, colors.level.message);
        }
    }

    /**
     * Get formatted timestamp string for logs.
     * @returns {string} ISO or local timestamp depending on config
     */
    static getTimestamp() {
        return config.log.date.iso ? new Date().toISOString() : new Date().toString();
    }

    /**
     * Convert a log level string into its numeric constant.
     * @param {Object} options - Options object
     * @param {string} options.level - Log level string (info|warning|error)
     * @returns {number} Numeric log level constant
     */
    static getLogLevel({ level }) {
        return LOG_LEVELS[log.sanitizeLogLevelString({ level })];
    }

    /**
     * Build a formatted console message string with timestamp and level tags.
     * @param {Object} options - Options object
     * @param {string} options.message - The message to include
     * @param {string} options.level - The log level to use
     * @returns {string} A formatted message string suitable to pass to console.log
     */
    static getLogMessageString({ message = log.default.message, level = log.default.level }) {
        level = log.transformLogLevelString({ level });
        const timestamp = log.getTimestamp();
        return `%c[${timestamp}] %c[${level}]: %c${message}`;
    }

    /**
     * Programmatically change the global log level.
     * @param {Object} options - Options object
     * @param {string} options.level - Log level string (info|warning|error)
     * @returns {void}
     */
    static setLogLevel({ level }) {
        _log({ message: `Setting log level to ${level}` });
        if (LOG_LEVELS[level] !== undefined) {
            config.log.level = level;
        } else {
            console.warn('Invalid log level. Using default: "info".');
            config.log.level = 'info';
        }
    }

    /**
     * Normalize a log level string into a lowercase word.
     * @param {Object} options - Options object
     * @param {string} options.level - Log level string
     * @returns {string} Lowercase sanitized level string
     */
    static sanitizeLogLevelString({ level }) {
        return level.toString().trim().toLowerCase();
    }

    /**
     * Transform a log level string into an abbreviated uppercase format.
     * Example: 'info' -> 'INF'
     * @param {Object} options - Options object
     * @param {string} options.level - Log level string
     * @returns {string} Abbreviated upper-case level string
     */
    static transformLogLevelString({ level }) {
        const charCount = config.log.characters;
        return level.toString().trim().toUpperCase().substring(0, charCount);
    }
}

/* Log function proxy, avoid needing to use new keyword when calling the log constructor */
const _log = new Proxy(log, {
    apply(target, thisArg, argumentsList) {
        return new target(...argumentsList);
    },
});

// #endregion

/* 3. Version
/* ------------------------------------------------ */
// #region

class version {
    /**
     * Extract the `v` query parameter from a URL string.
     * Example: url='.../?v=abc' -> returns 'abc'
     * @param {Object} options - Options object
     * @param {string} options.url - The URL to extract the version from
     * @returns {string} The extracted version string or empty string on failure
     */
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

    /**
     * Search the document head for versioned elements (link/script/style) that
     * include a `?v=` query parameter. Returns an array of objects with url
     * and urlVersion properties.
     * @returns {Array<{url: string, urlVersion: string}>} List of versioned resources
     * @throws Will throw an error if there was a problem extracting versions
     */
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

            _log({
                message: `Got versioned files from head, example: ${stringExtract}... ${firstFileVersion}`,
                level: 'info',
            });

            return versionedFiles;
        } catch (error) {
            const message = 'Failed to extract file versions from head';
            const cause = error;
            console.trace();
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            throw new Error(message, cause);
        }
    }

    /**
     * Return the first available URL version string found in the document head.
     * @returns {string|null} The first version string or null if none found
     */
    static getFirst() {
        _log({ message: 'Get the first available version from head', level: 'info' });
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

/**
 * DOM element helper utilities.
 *
 * Provides utility methods to query and manipulate elements both in the
 * main document and inside portal iframes: searching, cloning, counting,
 * and creating elements necessary for injection.
 */
class element {
    /* Destructured default values object */
    static default = config.defaults.element;

    /**
     * Get a single DOM element from the document using a selector.
     * @param {Object} options - Options object
     * @param {string} options.selector - CSS selector to query for
     * @param {boolean} options.wait - Whether to wait for the element until present
     * @returns {Element} The found Element or throws an Error if not found
     * @throws {Error} If the passed selector is empty or element retrieval fails
     */
    static get({ selector = element.default.selector, wait = element.default.wait }) {
        try {
            let elementHandle = document.querySelector(selector);
            if (selector.length === 0) {
                const message = 'Selector parameter is empty.';
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

    /**
     * Get all elements matching a selector.
     * @param {Object} options - Options object
     * @param {string} options.selector - CSS selector to query for
     * @param {boolean} options.wait - Whether to wait for elements until present
     * @param {number} options.count - Expected number if using waitAll semantics
     * @returns {NodeList} NodeList of elements matching the selector
     */
    static getAll({
        selector = element.default.selectorAll,
        wait = element.default.waitAll,
        count = element.default.selectorAllCount,
    }) {
        try {
            let elementCollectionHandle = document.querySelectorAll(selector);
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

    /**
     * Query a selector inside an iframe's document context and return the
     * NodeList of matches.
     * @param {Object} options - Options object
     * @param {HTMLIFrameElement} options.iframe - The iframe to query
     * @param {string} options.selector - The selector to query inside the iframe
     * @returns {NodeList} NodeList of elements matching inside the iframe
     * @throws {Error} If iframe or its contentDocument is not available
     */
    static getAllInsideIframe({ iframe, selector, doc } = {}) {
        try {
            // Accept an explicit doc param (for tests) or pull from iframe
            const documentContext =
                doc || (iframe && (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document)));
            if (!iframe || !documentContext) throw new Error('Iframe or iframe document is not available');
            return documentContext.querySelectorAll(selector);
        } catch (error) {
            const message = 'Failed to get elements inside iframe.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /**
     * Get all portal iframes present on the page using configured selector.
     * @returns {NodeList} NodeList of iframe elements
     */
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

    /**
     * Get all font elements that have been marked for injection using the
     * `injection-type="font"` attribute selector configured in `config.selector.fonts`.
     * @returns {NodeList} NodeList of elements matching the font selector
     */
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

    /**
     * Get the name (title attribute) for an iframe element.
     * @param {Object} options - Options object
     * @param {HTMLIFrameElement} options.iframe - The iframe to query
     * @returns {string} The iframe title attribute value or empty string if missing
     */
    static getIframeName({ iframe }) {
        if (iframe === undefined || iframe === null) return '';
        const title = iframe.getAttribute('title');
        return title ? title.toString() : '';
    }

    /**
     * Count elements matching a selector.
     * @param {Object} options - Options object
     * @param {string} options.selector - Selector to count
     * @returns {number} Number of matching elements
     */
    static count({ selector = element.default.selector }) {
        try {
            const elementCollectionHandle = element.getAll({ selector });
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
            const iframeSelector = config.selector.iframes;
            // element.count returns a number; return it directly
            const iframeCount = element.count({ selector: iframeSelector });
            return iframeCount;
        } catch (error) {
            const message = 'Failed to get iframe element count from selector.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /* Get font elements count */
    static countFonts() {
        try {
            const fontsSelector = config.selector.fonts;
            // element.count returns a number; return it directly
            const fontCount = element.count({ selector: fontsSelector });
            return fontCount;
        } catch (error) {
            const message = 'Failed to get font element count from selector.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /**
     * Clone a single element node (shallow clone, no child nodes cloned).
     * @param {Object} options - Options object
     * @param {Element} options.elementHandle - The element to clone
     * @returns {Element} A cloned element node
     * @throws {Error} If `elementHandle` is not provided or not a DOM element
     */
    static clone({ elementHandle = element.default.elementHandle }) {
        try {
            if (elementHandle === undefined) throw new Error('Element handle is empty/undefined');
            if (
                !(elementHandle instanceof Element) &&
                !(typeof Element !== 'undefined' && elementHandle.nodeType === Node.ELEMENT_NODE)
            ) {
                throw new Error('Provided an element handle that is not an instance of an Element object');
            }
            const elementClone = elementHandle.cloneNode();
            return elementClone;
        } catch (error) {
            const message = 'Failed to clone element using an element handle.';
            const cause = { cause: error };
            throw new Error(message, cause);
        }
    }

    /**
     * Clone a collection of nodes and return an array of cloned nodes.
     * @param {Object} options - Options object
     * @param {NodeList|Array<Element>} options.elementHandleCollection - Collection of elements to clone
     * @returns {Array<Element>} Array with cloned elements
     */
    static cloneAll({ elementHandleCollection = element.default.handleCollection }) {
        try {
            if (elementHandleCollection === undefined) throw new Error('Element handle collection is empty/undefined');
            const elementCloneCollection = [];
            elementHandleCollection.forEach(function (elementHandle) {
                if (elementHandle instanceof Element) {
                    const clonedElement = elementHandle.cloneNode();
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

    /**
     * Wait for an element to appear in the DOM and resolve with the element.
     * @param {Object} options - Options object
     * @param {string} options.selector - CSS selector to watch for
     * @param {number} options.timeout - Milliseconds to wait until timing out
     * @returns {Promise<Element>} Promise that resolves with the element or rejects on timeout
     */
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
                subtree: true,
            };
            const target = document.body;
            observer.observe(target, options);
            const timeoutChecker = setTimeout(function () {
                observer.disconnect();
                const message = 'Timed out waiting for element.';
                _log({ message: `${message}`, level: 'warning' });
                reject(message);
            }, timeout);
        });
    }

    /**
     * Wait for a specific number of elements to exist in the DOM.
     * @param {Object} options - Options object
     * @param {string} options.selector - Selector to query for
     * @param {number} options.timeout - ms timeout
     * @param {number} options.count - Target count
     * @param {number} options.mode - Mode: 0 equal, 1 >=, 2 <=
     * @returns {Promise<NodeList>} Promise resolving with the NodeList once condition is met
     */
    static waitAll({
        selector = element.default.selectorAll,
        timeout = element.default.timeout,
        count = element.default.waitAllCount,
        mode = element.default.waitAllMode,
    }) {
        _log({
            message: `Waiting for all elements with selector: ${selector} with timeout of ${timeout} using count of ${count} and mode ${mode}`,
        });
        return new Promise(function (resolve, reject) {
            try {
                const elementCollectionObject = element.getAll({ selector });
                if (count < 1) throw new Error('Invalid object count target.');
                // If count already satisfies the mode condition, resolve immediately
                if (elementCollectionObject instanceof NodeList) {
                    if (
                        (mode === 1 && elementCollectionObject.length >= count) ||
                        (mode === 2 && elementCollectionObject.length <= count) ||
                        (mode !== 1 && mode !== 2 && elementCollectionObject.length === count)
                    ) {
                        resolve(elementCollectionObject);
                    }
                }
                let timeoutChecker = null;
                const observer = new MutationObserver(function () {
                    const elementCollectionObject = element.getAll({ selector });
                    switch (mode) {
                        case 1: // More than or equal
                            if (
                                elementCollectionObject instanceof NodeList &&
                                elementCollectionObject.length >= count
                            ) {
                                clearTimeout(timeoutChecker);
                                resolve(elementCollectionObject);
                            }
                            break;
                        case 2: // Less than or equal
                            if (
                                elementCollectionObject instanceof NodeList &&
                                elementCollectionObject.length <= count
                            ) {
                                clearTimeout(timeoutChecker);
                                resolve(elementCollectionObject);
                            }
                            break;
                        default: // Equal, 0 or other values
                            if (
                                elementCollectionObject instanceof NodeList &&
                                elementCollectionObject.length === count
                            ) {
                                clearTimeout(timeoutChecker);
                                resolve(elementCollectionObject);
                            }
                            break;
                    }
                });
                const options = {
                    childList: true,
                    subtree: true,
                };
                const target = document.body;
                observer.observe(target, options);
                timeoutChecker = setTimeout(function () {
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

    /**
     * Element factory helpers (create basic DOM nodes used by injector).
     */
    static create = class {
        /**
         * Create a link element pointing to a stylesheet.
         * @param {Object} options - Options object
         * @param {string} options.url - URL to use in the `href` attribute
         * @returns {HTMLLinkElement} A link node configured as a stylesheet
         */
        static link({ url = element.default.url }) {
            try {
                _log({ message: 'Creating link element', level: 'info' });

                const elementType = 'link';
                const linkType = 'text/css';
                const typeRel = 'stylesheet';

                const linkElement = document.createElement(elementType);
                linkElement.type = linkType;
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
    };

    /**
     * Element builders: use available resources in the head to build link nodes
     * with correct versions and clone font resources for injection into iframes.
     */
    static build = class {
        /**
         * Build a link element for injecting the portal stylesheet into iframes.
         * It uses `version.getFirst()` to construct the properly versioned URL.
         * @returns {HTMLLinkElement} A prepared stylesheet link element
         */
        static link() {
            _log({ message: 'Building stylesheet element', level: 'info' });
            const firstVersion = version.getFirst();
            const urlPrefix = config.stylesheet.url.prefix;
            const url = `${urlPrefix}${firstVersion}`;
            const elementResult = element.create.link({ url });
            return elementResult;
        }

        /**
         * Build a collection of cloned font elements found in the head that match
         * the `injection-type="font"` selector.
         * @returns {Array<Element>} Array with cloned font elements
         */
        static fontCollection() {
            _log({ message: 'Building font collection', level: 'info' });
            const fontElementHandleCollection = element.getAllFonts();
            const fontElementCloneCollection = element.cloneAll({
                elementHandleCollection: fontElementHandleCollection,
            });
            return fontElementCloneCollection;
        }
    };
}

// #endregion

/* 5. Watcher
/* ------------------------------------------------ */
// #region

/**
 * Watcher utility that continuously ensures injected CSS/Fonts remain in place
 * by re-injecting on a short interval. The watcher is cleared after a configured
 * timeout.
 */
class watcher {
    /**
     * Start the watcher interval if not already running. The watcher will call
     * `inject.everything` to ensure all iframes have the injections.
     * @returns {void}
     */
    static set() {
        if (!config.watcher.enabled) return;
        if (config.watcher.current !== null && config.watcher.current !== undefined) return;
        config.watcher.timer.start = Date.now();
        config.watcher.timer.end = Date.now() + config.watcher.timer.limit;
        config.watcher.current = setInterval(function () {
            config.watcher.cycleCount++;
            _log({ message: `Watcher cycle count: ${config.watcher.cycleCount}`, level: 'info' });
            const iframes = element.getAllIframes();
            iframes.forEach(function (iframe) {
                inject.everything({ iframe });
            });
        }, config.watcher.interval);
    }

    /**
     * Stop the watcher interval (if enabled and running).
     * @returns {void}
     */
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

/**
 * Injection routines to add the portal stylesheet and cloned font elements
 * into each portal iframe's `head`.
 */
class inject {
    /**
     * Inject a prepared stylesheet link element into a specific iframe's head.
     * This method uses `builtLinkElement` as a template to clone and append.
     * @param {Object} options - Options object
     * @param {HTMLIFrameElement} options.iframe - Target iframe element
     * @returns {void}
     */
    static linkElement({ iframe }) {
        try {
            if (!config.inject.enabled) return;
            if (!config.inject.style) return;
            if ((iframe === undefined || iframe === null) && config.errors.throwOnUndefinedIFrameLinkInjection) {
                throw new Error('Iframe is undefined');
            }
            const iframeName = element.getIframeName({ iframe });
            if (iframe.contentDocument && !inject.check.isLinkInjected({ iframe })) {
                if (iframe.contentDocument.head === null || iframe.contentDocument.head === undefined) return;
                _log({ message: `Injecting stylesheet using link element in iframe ${iframeName}`, level: 'info' });
                // Ensure a built link element exists; build on demand in tests
                if (!builtLinkElement) builtLinkElement = element.build.link();
                const link = element.clone({ elementHandle: builtLinkElement });
                iframe.contentDocument.head.appendChild(link);
                if (!inject.check.isLinkInjected({ iframe })) {
                    _log({
                        message: 'Failed to inject using the main method, falling back to an alternative',
                        level: 'info',
                    });
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

    /**
     * Inject cloned font collection elements into the given iframe's head.
     * @param {Object} options - Options object
     * @param {HTMLIFrameElement} options.iframe - Target iframe
     * @returns {void}
     */
    static fontElementCollection({ iframe }) {
        try {
            if (!config.inject.enabled) return;
            if (!config.inject.fonts) return;
            if ((iframe === undefined || iframe === null) && config.errors.throwOnUndefinedIFrameFontInjection) {
                throw new Error('Iframe is undefined');
            }
            const iframeName = element.getIframeName({ iframe });
            const fontCount = config.inject.fontCountAuto ? element.countFonts() : config.inject.fontCount;
            if (iframe.contentDocument && !inject.check.areFontsInjected({ iframe, fontCount: fontCount })) {
                if (iframe.contentDocument.head === null || iframe.contentDocument.head === undefined) return;
                _log({ message: `Injecting font element collection in iframe ${iframeName}`, level: 'info' });
                // Ensure we have built font collection and build it on demand if not set
                if (!builtFontElementCollection || builtFontElementCollection.length === 0) {
                    builtFontElementCollection = element.build.fontCollection();
                }
                const fontCollection = element.cloneAll({ elementHandleCollection: builtFontElementCollection });
                fontCollection.forEach(function (fontElement) {
                    iframe.contentDocument.head.appendChild(fontElement);
                });
                _log({ message: 'Injected font element collection', level: 'info' });
                if (config.inject.setWatcherOnFont) watcher.set();
            }

            if (config.inject.setWatcherOnFont && config.inject.clearWatcherOnFont) {
                const currentDate = Date.now();

                if (
                    inject.check.areFontsInjected({ iframe, fontCount: config.selector.fontCount }) &&
                    currentDate > config.watcher.timer.end
                ) {
                    _log({
                        message: 'Font element collection is injected and timeout reached, clearing watcher',
                        level: 'info',
                    });
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

    /**
     * Helper that runs both link and font collection injection for a given iframe.
     * @param {Object} options - Options object
     * @param {HTMLIFrameElement} options.iframe - Target iframe
     * @returns {void}
     */
    static everything({ iframe }) {
        inject.linkElement({ iframe });
        inject.fontElementCollection({ iframe });
    }

    /**
     * Helper class to run injection over multiple iframes collections.
     */
    static iframeCollection = class {
        /**
         * Inject linked stylesheet into a collection of iframes.
         * @param {Object} options - Options object
         * @param {NodeList} options.iframes - Collection of iframe elements to inject into
         * @returns {void}
         */
        static linkElement({ iframes }) {
            iframes.forEach(function (iframe) {
                inject.linkElement({ iframe });
            });
        }

        /**
         * Inject a font elements collection into a list of iframes by delegating
         * to `inject.fontElementCollection` for each iframe.
         * @param {Object} options - Options object
         * @param {NodeList} options.iframes - Collection of iframe elements
         * @returns {void}
         */
        static fontElementCollection({ iframes }) {
            iframes.forEach(function (iframe) {
                inject.fontElementCollection({ iframe });
            });
        }
    };

    static firstTime = class {
        /**
         * Perform first-time stylesheet injection into all available portal iframes.
         * This is guarded by the `config.inject.firstTime` settings.
         * @returns {void}
         */
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

        /**
         * Perform a first-time font elements collection injection into all portal iframes.
         * This is guarded by the `config.inject.firstTime` settings.
         * @returns {void}
         */
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

        /**
         * Convenience method that executes first-time stylesheet and font injection.
         * @returns {void}
         */
        static everything() {
            inject.firstTime.linkElement();
            inject.firstTime.fontElementCollection();
        }
    };

    /**
     * Health-check utilities that determine if expected injected elements
     * are present inside an iframe's document (stylesheet link, fonts).
     */
    static check = class {
        /**
         * Determine whether the built stylesheet link has been injected into
         * the iframe head by checking for a matching `href`.
         * @param {Object} options - Options object
         * @param {HTMLIFrameElement} options.iframe - Target iframe
         * @returns {boolean} True if the link is injected; false otherwise
         */
        static isLinkInjected({ iframe }) {
            try {
                const iframeName = element.getIframeName({ iframe });
                _log({
                    message: `Checking if link element is already injected in iframe ${iframeName}`,
                    level: 'info',
                });
                const linkSelector = config.selector.stylesheet;
                const links = iframe.contentDocument.querySelectorAll(linkSelector);
                const linkUrl = builtLinkElement.href;
                const isLinkElementPresent = Array.from(links).some(function (link) {
                    return link.href === linkUrl;
                });
                _log({
                    message: `Link element is${isLinkElementPresent ? '' : ' NOT'} present in iframe ${iframeName}.`,
                    level: 'info',
                });
                return isLinkElementPresent;
            } catch (error) {
                const message = 'Failed to check if link element is already injected into iframe';
                const cause = error;
                _log({ message: `${message} due to ${cause}`, level: 'warning' });
                if (config.errors.throwOnLinkInjectionCheckFailure) throw new Error(message, cause);
                return false;
            }
        }

        /**
         * Determine whether the requisite number of font elements have been
         * injected into the iframe head.
         * @param {Object} options - Options object
         * @param {HTMLIFrameElement} options.iframe - Target iframe
         * @param {number} options.fontCount - Expected number of font elements
         * @returns {boolean} True if the number of fonts injected equals `fontCount`
         */
        static areFontsInjected({ iframe, fontCount }) {
            try {
                const iframeName = element.getIframeName({ iframe });
                _log({
                    message: `Checking if font element collection is already injected in iframe ${iframeName}`,
                    level: 'info',
                });
                const fontCollectionSelector = config.selector.fonts;
                const fontCollection = iframe.contentDocument.querySelectorAll(fontCollectionSelector);
                const areFontsPresent = fontCollection.length === fontCount;
                _log({
                    message: `Font element collection is${areFontsPresent ? '' : ' NOT'} present in iframe ${iframeName}`,
                    level: 'info',
                });
                return areFontsPresent;
            } catch (error) {
                const message = 'Failed to check if font element collection is already injected into iframe';
                const cause = error;
                _log({ message: `${message} due to ${cause}`, level: 'warning' });
                if (config.errors.throwOnLinkInjectionCheckFailure) throw new Error(message, cause);
                return false;
            }
        }
    };
}

// #endregion

/* 7. Mutation observer
/* ------------------------------------------------ */
// #region

class observer {
    /**
     * Initialize and configure a MutationObserver that watches the portal
     * root element and re-injects resources into any newly added portal iframes.
     * This method waits for the `#ghost-portal-root` element and registers a
     * `MutationObserver` to detect child additions/removals.
     * @returns {Promise<void>} Promise resolving when the observer has been configured
     */
    static async setup() {
        try {
            if (!config.observer.enabled) return;
            _log({ message: 'Setting up mutation observer', level: 'info' });
            const selectorRootElement = config.selector.root;
            const rootElement = await element.wait({ selector: selectorRootElement });

            if (!rootElement) {
                const message = `Failed to get root element ${selectorRootElement}`;
                _log({ message, level: 'error' });
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
    /**
     * Initialize internal objects used by the injector before any DOM events
     * occur (e.g. building the link and font element collections).
     * @returns {Promise<void>} Promise that resolves once initial setup runs
     */
    static async initialSetup() {
        _log({ message: 'Doing injector initial setup', level: 'info' });
        try {
            _log({ message: 'DEBUG initialSetup: about to build link and fonts', level: 'info' });
            builtLinkElement = element.build.link();
            _log({
                message: `DEBUG initialSetup: builtLinkElement set to ${builtLinkElement ? builtLinkElement.href || builtLinkElement.toString() : builtLinkElement}`,
                level: 'info',
            });
            builtFontElementCollection = element.build.fontCollection();
            _log({
                message: `DEBUG initialSetup: builtFontElementCollection set length ${(builtFontElementCollection || []).length}`,
                level: 'info',
            });
        } catch (err) {
            _log({ message: `DEBUG initialSetup failed: ${err && err.message ? err.message : err}`, level: 'error' });
            throw err;
        }
    }

    /**
     * Register the `window.onload` event that will trigger the monitor setup.
     * This should only run in a browser environment.
     * @returns {void}
     */
    static setupEvent() {
        try {
            _log({ message: 'Setting window onload event', level: 'info' });
            // Use addEventListener to avoid overriding existing onload handlers
            window.addEventListener('load', () => this.setupMonitor());
        } catch (error) {
            const message = 'Failed to set window onload event';
            const cause = error;
            _log({ message: `${message} due to ${cause}`, level: 'error' });
            throw new Error(message, cause);
        }
    }

    /**
     * Setup routine executed on window load: triggers `observer.setup` and
     * performs a first-time injection of styles and fonts into iframe.
     * @returns {void}
     */
    static setupMonitor() {
        _log({ message: 'Doing onload setup routine', level: 'info' });
        observer.setup();
        inject.firstTime.everything();
        _log({ message: 'Done setting up onload monitor', level: 'info' });
    }
}

/* Self executing anonymous function that injects portal styles on window load event, makes the magic happen */
/* Only auto-run when in a real browser environment (window/document available and not running as a CommonJS module) */
if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    !(typeof module !== 'undefined' && module.exports)
) {
    onload.initialSetup();
    onload.setupEvent();
}

/* Export classes and config for testing when required in Node */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        onload,
        inject,
        observer,
        element,
        version,
        log,
        config,
        get builtLinkElement() {
            return builtLinkElement;
        },
        get builtFontElementCollection() {
            return builtFontElementCollection;
        },
        watcher,
    };
}

// #endregion
