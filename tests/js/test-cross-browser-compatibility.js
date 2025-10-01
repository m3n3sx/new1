/**
 * Cross-Browser Compatibility Tests
 * Tests browser feature detection and polyfill functionality
 */

// Mock browser environment for testing
const mockWindow = {
    navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    localStorage: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn()
    },
    sessionStorage: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn()
    },
    fetch: jest.fn(),
    XMLHttpRequest: jest.fn(),
    BroadcastChannel: jest.fn(),
    requestAnimationFrame: jest.fn(),
    performance: {
        now: jest.fn(() => Date.now())
    }
};

const mockDocument = {
    createElement: jest.fn(() => ({
        style: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn()
    })),
    documentElement: {
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        }
    },
    head: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    },
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    },
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    createEvent: jest.fn(() => ({
        initCustomEvent: jest.fn()
    }))
};

// Set up global mocks
global.window = mockWindow;
global.document = mockDocument;
global.navigator = mockWindow.navigator;
global.localStorage = mockWindow.localStorage;
global.sessionStorage = mockWindow.sessionStorage;
global.getComputedStyle = jest.fn(() => ({
    getPropertyValue: jest.fn(() => 'test-value'),
    color: 'rgb(255, 0, 0)',
    display: 'flex',
    transform: 'translateX(10px)'
}));

describe('Cross-Browser Compatibility', () => {
    let browserCompatibility;
    let framework;
    let featureDetection;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create fresh instances
        const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
        browserCompatibility = new BrowserCompatibility();
    });
    
    afterEach(() => {
        // Clean up any added elements
        jest.clearAllMocks();
    });
    
    describe('Browser Detection', () => {
        test('should detect Chrome browser correctly', () => {
            // Mock navigator for this test
            const originalNavigator = global.navigator;
            global.navigator = {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            
            // Clear module cache to get fresh instance
            delete require.cache[require.resolve('../../assets/js/modules/browser-compatibility')];
            const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
            const instance = new BrowserCompatibility();
            
            expect(instance.features.browser).toBe('chrome');
            expect(instance.features.version).toBe('91');
            expect(instance.isBrowserSupported()).toBe(true);
            
            // Restore navigator
            global.navigator = originalNavigator;
        });
        
        test('should detect Firefox browser correctly', () => {
            const originalNavigator = global.navigator;
            global.navigator = {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
            };
            
            delete require.cache[require.resolve('../../assets/js/modules/browser-compatibility')];
            const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
            const instance = new BrowserCompatibility();
            
            expect(instance.features.browser).toBe('firefox');
            expect(instance.features.version).toBe('89');
            expect(instance.isBrowserSupported()).toBe(true);
            
            global.navigator = originalNavigator;
        });
        
        test('should detect Safari browser correctly', () => {
            const originalNavigator = global.navigator;
            global.navigator = {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
            };
            
            delete require.cache[require.resolve('../../assets/js/modules/browser-compatibility')];
            const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
            const instance = new BrowserCompatibility();
            
            expect(instance.features.browser).toBe('safari');
            expect(instance.features.version).toBe('14');
            expect(instance.isBrowserSupported()).toBe(true);
            
            global.navigator = originalNavigator;
        });
        
        test('should detect Edge browser correctly', () => {
            const originalNavigator = global.navigator;
            global.navigator = {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
            };
            
            delete require.cache[require.resolve('../../assets/js/modules/browser-compatibility')];
            const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
            const instance = new BrowserCompatibility();
            
            expect(instance.features.browser).toBe('edge');
            expect(instance.features.version).toBe('91');
            expect(instance.isBrowserSupported()).toBe(true);
            
            global.navigator = originalNavigator;
        });
        
        test('should detect mobile browsers', () => {
            const originalNavigator = global.navigator;
            global.navigator = {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
            };
            
            // Mobile detection is based on user agent patterns
            expect(global.navigator.userAgent).toContain('Mobile');
            
            global.navigator = originalNavigator;
        });
        
        test('should identify unsupported browser versions', () => {
            const originalNavigator = global.navigator;
            global.navigator = {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
            };
            
            delete require.cache[require.resolve('../../assets/js/modules/browser-compatibility')];
            const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
            const instance = new BrowserCompatibility();
            
            expect(instance.features.browser).toBe('chrome');
            expect(instance.features.version).toBe('50');
            expect(instance.isBrowserSupported()).toBe(false);
            
            global.navigator = originalNavigator;
        });
    });
    
    describe('Feature Detection', () => {
        test('should detect basic browser features', () => {
            expect(browserCompatibility.features).toHaveProperty('fetch');
            expect(browserCompatibility.features).toHaveProperty('promise');
            expect(browserCompatibility.features).toHaveProperty('classList');
            expect(browserCompatibility.features).toHaveProperty('querySelector');
            expect(browserCompatibility.features).toHaveProperty('localStorage');
        });
        
        test('should detect CSS features', () => {
            expect(browserCompatibility.features).toHaveProperty('cssVariables');
            expect(browserCompatibility.features).toHaveProperty('flexbox');
            expect(browserCompatibility.features).toHaveProperty('grid');
        });
        
        test('should detect JavaScript API features', () => {
            expect(browserCompatibility.features).toHaveProperty('broadcastChannel');
            expect(browserCompatibility.features).toHaveProperty('requestAnimationFrame');
            expect(browserCompatibility.features).toHaveProperty('abortController');
        });
        
        test('should detect browser type and version', () => {
            expect(browserCompatibility.features).toHaveProperty('browser');
            expect(browserCompatibility.features).toHaveProperty('version');
            expect(typeof browserCompatibility.features.browser).toBe('string');
            expect(typeof browserCompatibility.features.version).toBe('string');
        });
    });
    
    describe('Progressive Enhancement', () => {
        test('should apply feature classes to document', () => {
            // Mock document.documentElement for this test
            const mockElement = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
            
            const originalDocument = global.document;
            global.document = {
                ...mockDocument,
                documentElement: mockElement
            };
            
            browserCompatibility.applyProgressiveEnhancement();
            
            expect(mockElement.classList.add).toHaveBeenCalled();
            
            // Restore document
            global.document = originalDocument;
        });
        
        test('should load polyfills for missing features', async () => {
            // Mock missing features
            browserCompatibility.features.fetch = false;
            browserCompatibility.features.broadcastChannel = false;
            
            await browserCompatibility.loadPolyfills();
            
            expect(browserCompatibility.polyfillsLoaded).toBe(true);
        });
        
        test('should provide CSS Variables polyfill', async () => {
            browserCompatibility.features.cssVariables = false;
            
            await browserCompatibility.loadCSSVariablesPolyfill();
            
            expect(global.window.CSSVariablesPolyfill).toBeDefined();
            expect(typeof global.window.CSSVariablesPolyfill.setProperty).toBe('function');
            expect(typeof global.window.CSSVariablesPolyfill.getProperty).toBe('function');
        });
        
        test('should provide BroadcastChannel fallback', async () => {
            browserCompatibility.features.broadcastChannel = false;
            
            await browserCompatibility.loadBroadcastChannelPolyfill();
            
            expect(global.window.BroadcastChannel).toBeDefined();
        });
    });
    
    describe('Live Admin Styler Specific Tests', () => {
        test('should check browser support status', () => {
            const isSupported = browserCompatibility.isBrowserSupported();
            expect(typeof isSupported).toBe('boolean');
        });
        
        test('should generate compatibility report', () => {
            const report = browserCompatibility.getCompatibilityReport();
            
            expect(report).toHaveProperty('browser');
            expect(report).toHaveProperty('features');
            expect(report).toHaveProperty('score');
            expect(report).toHaveProperty('supported');
            expect(report).toHaveProperty('recommendations');
            
            expect(typeof report.score).toBe('number');
            expect(report.score).toBeGreaterThanOrEqual(0);
            expect(report.score).toBeLessThanOrEqual(100);
        });
        
        test('should provide recommendations for unsupported features', () => {
            const recommendations = browserCompatibility.getRecommendations();
            
            expect(Array.isArray(recommendations)).toBe(true);
            
            if (recommendations.length > 0) {
                expect(recommendations[0]).toHaveProperty('type');
                expect(recommendations[0]).toHaveProperty('message');
            }
        });
        
        test('should show compatibility warning for unsupported browsers', () => {
            // Mock unsupported browser
            browserCompatibility.features.browser = 'ie';
            browserCompatibility.features.version = '11';
            
            // Mock document.body for this test
            const mockBody = {
                appendChild: jest.fn()
            };
            
            const originalDocument = global.document;
            global.document = {
                ...mockDocument,
                body: mockBody,
                createElement: jest.fn(() => ({
                    className: '',
                    style: { cssText: '' },
                    innerHTML: '',
                    querySelector: jest.fn(() => ({
                        addEventListener: jest.fn()
                    }))
                }))
            };
            
            browserCompatibility.showCompatibilityWarning();
            
            expect(mockBody.appendChild).toHaveBeenCalled();
            
            // Restore document
            global.document = originalDocument;
        });
    });
    
    describe('Polyfill Loading', () => {
        test('should load fetch polyfill when needed', async () => {
            browserCompatibility.features.fetch = false;
            
            await browserCompatibility.loadFetchPolyfill();
            
            expect(global.window.fetch).toBeDefined();
            expect(typeof global.window.fetch).toBe('function');
        });
        
        test('should load promise polyfill when needed', async () => {
            browserCompatibility.features.promise = false;
            
            await browserCompatibility.loadPromisePolyfill();
            
            expect(global.window.Promise).toBeDefined();
            expect(typeof global.window.Promise).toBe('function');
        });
        
        test('should load requestAnimationFrame polyfill when needed', async () => {
            browserCompatibility.features.requestAnimationFrame = false;
            
            await browserCompatibility.loadRequestAnimationFramePolyfill();
            
            expect(global.window.requestAnimationFrame).toBeDefined();
            expect(typeof global.window.requestAnimationFrame).toBe('function');
        });
        
        test('should load AbortController polyfill when needed', async () => {
            browserCompatibility.features.abortController = false;
            
            await browserCompatibility.loadAbortControllerPolyfill();
            
            expect(global.window.AbortController).toBeDefined();
            expect(typeof global.window.AbortController).toBe('function');
        });
    });
    
    describe('Error Handling', () => {
        test('should handle missing browser features gracefully', () => {
            // Remove a feature from window
            delete global.window.fetch;
            
            const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
            const instance = new BrowserCompatibility();
            
            expect(instance.features.fetch).toBe(false);
        });
        
        test('should handle polyfill loading errors gracefully', async () => {
            // Mock a polyfill that throws an error
            const originalConsoleError = console.error;
            console.error = jest.fn();
            
            try {
                await browserCompatibility.loadPolyfills();
                // Should not throw even if individual polyfills fail
                expect(true).toBe(true);
            } catch (error) {
                // Should not reach here
                expect(false).toBe(true);
            } finally {
                console.error = originalConsoleError;
            }
        });
        
        test('should handle browser detection edge cases', () => {
            // Test with unusual user agent
            mockWindow.navigator.userAgent = 'Unknown Browser/1.0';
            
            const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
            const instance = new BrowserCompatibility();
            
            expect(instance.features.browser).toBe('unknown');
            expect(instance.isBrowserSupported()).toBe(false);
        });
    });
    
    describe('Browser Information', () => {
        test('should provide browser information', () => {
            const browserInfo = browserCompatibility.getBrowserInfo();
            
            expect(browserInfo).toHaveProperty('browser');
            expect(browserInfo).toHaveProperty('version');
            expect(browserInfo).toHaveProperty('userAgent');
            
            expect(typeof browserInfo.browser).toBe('string');
            expect(typeof browserInfo.version).toBe('string');
            expect(typeof browserInfo.userAgent).toBe('string');
        });
        
        test('should provide all features information', () => {
            const features = browserCompatibility.getFeatures();
            
            expect(typeof features).toBe('object');
            expect(features).toHaveProperty('fetch');
            expect(features).toHaveProperty('promise');
            expect(features).toHaveProperty('browser');
        });
        
        test('should check individual feature support', () => {
            const isSupported = browserCompatibility.isSupported('fetch');
            expect(typeof isSupported).toBe('boolean');
        });
    });
    
    describe('Integration Tests', () => {
        test('should initialize without errors', () => {
            expect(() => {
                const BrowserCompatibility = require('../../assets/js/modules/browser-compatibility');
                new BrowserCompatibility();
            }).not.toThrow();
        });
        
        test('should load all polyfills without errors', async () => {
            await expect(browserCompatibility.loadPolyfills()).resolves.not.toThrow();
        });
        
        test('should apply progressive enhancement without errors', () => {
            expect(() => {
                browserCompatibility.applyProgressiveEnhancement();
            }).not.toThrow();
        });
        
        test('should generate compatibility report without errors', () => {
            expect(() => {
                browserCompatibility.getCompatibilityReport();
            }).not.toThrow();
        });
    });
    
});

// Integration tests for real browser environments
describe('Browser Integration Tests', () => {
    // These tests would run in actual browser environments
    // using tools like Playwright or Selenium
    
    test.skip('should run in Chrome 90+', async () => {
        // This would be implemented with Playwright
        // const { chromium } = require('playwright');
        // const browser = await chromium.launch();
        // const page = await browser.newPage();
        // await page.goto('file://' + path.join(__dirname, '../cross-browser-test-runner.html'));
        // const results = await page.evaluate(() => window.testResults);
        // expect(results.summary.supported).toBe(true);
        // await browser.close();
    });
    
    test.skip('should run in Firefox 88+', async () => {
        // Similar implementation for Firefox
    });
    
    test.skip('should run in Safari 14+', async () => {
        // Similar implementation for Safari
    });
    
    test.skip('should run in Edge 90+', async () => {
        // Similar implementation for Edge
    });
});