/**
 * Jest setup file for Live Admin Styler tests
 * Configures global mocks and test environment
 */

// Mock console methods to reduce noise in tests
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock jQuery if not already mocked
if (typeof global.jQuery === 'undefined') {
    global.jQuery = require('jquery');
    global.$ = global.jQuery;
}

// Mock WordPress AJAX data - using unified variable name
global.lasAdminData = {
    ajax_url: '/wp-admin/admin-ajax.php',
    nonce: 'test_nonce_12345',
    auto_refresh_nonce: true,
    retry_attempts: 3,
    retry_delay: 1000
};

global.lasAdminData = {
    ajaxurl: '/wp-admin/admin-ajax.php',
    nonce: 'test_nonce_12345'
};

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = value.toString();
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
    value: localStorageMock,
    writable: true
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        onLine: true,
        userAgent: 'Mozilla/5.0 (Test Environment)',
        sendBeacon: jest.fn()
    },
    writable: true
});

// Mock document
if (!global.document) {
    Object.defineProperty(global, 'document', {
        value: {
            hidden: false,
            visibilityState: 'visible',
            head: {
                appendChild: jest.fn(),
                removeChild: jest.fn()
            },
            body: {
                appendChild: jest.fn(),
                removeChild: jest.fn(),
                innerHTML: ''
            },
        createElement: jest.fn(() => ({
            id: '',
            type: '',
            innerHTML: '',
            textContent: '',
            style: {},
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn()
            },
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        })),
        getElementById: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    },
    writable: true
});
}

// Mock window
if (!global.window) {
    Object.defineProperty(global, 'window', {
    value: {
        location: {
            href: 'http://test.com/wp-admin/admin.php?page=las-settings',
            pathname: '/wp-admin/admin.php',
            search: '?page=las-settings',
            hash: '',
            origin: 'http://test.com'
        },
        history: {
            replaceState: jest.fn(),
            pushState: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        open: jest.fn(),
        close: jest.fn(),
        alert: jest.fn(),
        confirm: jest.fn(() => true),
        prompt: jest.fn(),
        matchMedia: jest.fn((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn()
        })),
        innerWidth: 1024,
        innerHeight: 768
    },
    writable: true
});
}

// Mock performance API
Object.defineProperty(global, 'performance', {
    value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByType: jest.fn(() => [])
    },
    writable: true
});

// Mock fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    })
);

// Mock XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => ({
    open: jest.fn(),
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 4,
    status: 200,
    responseText: '{"success": true}'
}));

// Mock MutationObserver
global.MutationObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock CSS functions
global.CSS = {
    supports: jest.fn(() => true)
};

// Mock getComputedStyle
global.getComputedStyle = jest.fn(() => ({
    getPropertyValue: jest.fn(() => ''),
    setProperty: jest.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(clearTimeout);

// Mock btoa and atob
global.btoa = jest.fn(str => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn(str => Buffer.from(str, 'base64').toString('binary'));

// Setup test utilities
global.testUtils = {
    // Helper to create mock jQuery element
    createMockElement: (options = {}) => ({
        addClass: jest.fn(),
        removeClass: jest.fn(),
        toggleClass: jest.fn(),
        hasClass: jest.fn(() => false),
        attr: jest.fn(),
        removeAttr: jest.fn(),
        prop: jest.fn(),
        data: jest.fn(),
        val: jest.fn(),
        text: jest.fn(),
        html: jest.fn(),
        append: jest.fn(),
        prepend: jest.fn(),
        remove: jest.fn(),
        empty: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        fadeIn: jest.fn(),
        fadeOut: jest.fn((callback) => {
            if (callback) callback();
            return this;
        }),
        slideUp: jest.fn(),
        slideDown: jest.fn(),
        animate: jest.fn(),
        css: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        trigger: jest.fn(),
        click: jest.fn(),
        focus: jest.fn(),
        blur: jest.fn(),
        find: jest.fn(() => global.testUtils.createMockElement()),
        closest: jest.fn(() => global.testUtils.createMockElement()),
        parent: jest.fn(() => global.testUtils.createMockElement()),
        children: jest.fn(() => []),
        siblings: jest.fn(() => []),
        next: jest.fn(() => global.testUtils.createMockElement()),
        prev: jest.fn(() => global.testUtils.createMockElement()),
        first: jest.fn(() => global.testUtils.createMockElement()),
        last: jest.fn(() => global.testUtils.createMockElement()),
        eq: jest.fn(() => global.testUtils.createMockElement()),
        get: jest.fn(() => ({})),
        each: jest.fn(),
        map: jest.fn(() => []),
        filter: jest.fn(() => global.testUtils.createMockElement()),
        is: jest.fn(() => false),
        not: jest.fn(() => global.testUtils.createMockElement()),
        length: options.length || 1,
        ...options
    }),
    
    // Helper to wait for async operations
    waitFor: (condition, timeout = 1000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (condition()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(check, 10);
                }
            };
            check();
        });
    },
    
    // Helper to simulate user interactions
    simulateEvent: (element, eventType, eventData = {}) => {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        Object.assign(event, eventData);
        if (element.dispatchEvent) {
            element.dispatchEvent(event);
        }
        return event;
    },
    
    // Helper to create mock AJAX responses
    createMockAjaxResponse: (success = true, data = {}) => ({
        success,
        data: success ? data : { message: 'Test error', code: 'test_error', ...data }
    }),
    
    // Helper to reset all mocks
    resetAllMocks: () => {
        jest.clearAllMocks();
        localStorageMock.clear();
        
        // Reset console mocks if they exist
        if (global.console.log && typeof global.console.log.mockClear === 'function') {
            global.console.log.mockClear();
        }
        if (global.console.warn && typeof global.console.warn.mockClear === 'function') {
            global.console.warn.mockClear();
        }
        if (global.console.error && typeof global.console.error.mockClear === 'function') {
            global.console.error.mockClear();
        }
        if (global.console.info && typeof global.console.info.mockClear === 'function') {
            global.console.info.mockClear();
        }
    }
};

// Setup and teardown hooks
beforeEach(() => {
    // Reset localStorage before each test
    localStorageMock.clear();
    
    // Reset console mocks if they exist
    if (global.console.log && global.console.log.mockClear) {
        global.console.log.mockClear();
    }
    if (global.console.warn && global.console.warn.mockClear) {
        global.console.warn.mockClear();
    }
    if (global.console.error && global.console.error.mockClear) {
        global.console.error.mockClear();
    }
    if (global.console.info && global.console.info.mockClear) {
        global.console.info.mockClear();
    }
});

afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
    
    // Reset mocks
    jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
    // Suppress specific warnings that are expected in tests
    const message = args[0];
    if (typeof message === 'string') {
        if (message.includes('Warning: ReactDOM.render is deprecated') ||
            message.includes('Warning: componentWillMount has been renamed') ||
            message.includes('jsdom does not support')) {
            return;
        }
    }
    originalWarn.apply(console, args);
};

// Load UI Repair System for tests
// Mock the IIFE wrapper environment
global.window = global.window || global;

// Ensure matchMedia is available
if (!global.window.matchMedia) {
    global.window.matchMedia = jest.fn((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    }));
}

// Ensure window dimensions are available
if (!global.window.innerWidth) {
    global.window.innerWidth = 1024;
    global.window.innerHeight = 768;
}

global.document = global.document || {
    readyState: 'complete',
    addEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    createElement: jest.fn(() => ({
        id: '',
        className: '',
        style: {},
        appendChild: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn()
        }
    })),
    head: {
        appendChild: jest.fn()
    },
    body: {
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn()
        },
        appendChild: jest.fn()
    },
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn()
};

// Load the UI repair system
require('../../assets/js/ui-repair.js');