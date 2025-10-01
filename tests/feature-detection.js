/**
 * Live Admin Styler - Feature Detection and Progressive Enhancement
 * 
 * Provides feature detection capabilities and progressive enhancement
 * for cross-browser compatibility
 */

class FeatureDetection {
    constructor() {
        this.features = {};
        this.fallbacks = {};
        this.init();
    }
    
    /**
     * Initialize feature detection
     */
    init() {
        this.detectCoreFeatures();
        this.detectCSSFeatures();
        this.detectJSFeatures();
        this.detectPerformanceFeatures();
        this.setupFallbacks();
        
        console.log('Feature Detection initialized:', this.features);
    }
    
    /**
     * Detect core browser features
     */
    detectCoreFeatures() {
        this.features.core = {
            // ES6+ Features
            arrowFunctions: this.testArrowFunctions(),
            templateLiterals: this.testTemplateLiterals(),
            destructuring: this.testDestructuring(),
            promises: this.testPromises(),
            asyncAwait: this.testAsyncAwait(),
            classes: this.testClasses(),
            modules: this.testModules(),
            
            // DOM Features
            querySelector: typeof document.querySelector === 'function',
            classList: 'classList' in document.createElement('div'),
            addEventListener: 'addEventListener' in window,
            customEvents: this.testCustomEvents(),
            
            // Storage Features
            localStorage: this.testLocalStorage(),
            sessionStorage: this.testSessionStorage(),
            indexedDB: 'indexedDB' in window
        };
    }
    
    /**
     * Detect CSS features
     */
    detectCSSFeatures() {
        this.features.css = {
            // CSS Variables
            customProperties: this.testCSSCustomProperties(),
            
            // Layout Features
            flexbox: this.testFlexbox(),
            grid: this.testGrid(),
            
            // Visual Features
            transforms: this.testTransforms(),
            transitions: this.testTransitions(),
            animations: this.testAnimations(),
            backdropFilter: this.testBackdropFilter(),
            
            // Color Features
            hsl: this.testHSLColors(),
            rgba: this.testRGBAColors(),
            
            // Modern Features
            containerQueries: this.testContainerQueries(),
            aspectRatio: this.testAspectRatio()
        };
    }
    
    /**
     * Detect JavaScript API features
     */
    detectJSFeatures() {
        this.features.js = {
            // Network APIs
            fetch: 'fetch' in window,
            xhr: 'XMLHttpRequest' in window,
            
            // Observer APIs
            intersectionObserver: 'IntersectionObserver' in window,
            mutationObserver: 'MutationObserver' in window,
            resizeObserver: 'ResizeObserver' in window,
            
            // Worker APIs
            webWorkers: 'Worker' in window,
            serviceWorkers: 'serviceWorker' in navigator,
            
            // Communication APIs
            broadcastChannel: 'BroadcastChannel' in window,
            messageChannel: 'MessageChannel' in window,
            
            // File APIs
            fileReader: 'FileReader' in window,
            formData: 'FormData' in window,
            
            // URL APIs
            urlSearchParams: 'URLSearchParams' in window,
            url: 'URL' in window
        };
    }
    
    /**
     * Detect performance features
     */
    detectPerformanceFeatures() {
        this.features.performance = {
            performanceNow: 'performance' in window && 'now' in performance,
            performanceObserver: 'PerformanceObserver' in window,
            requestAnimationFrame: 'requestAnimationFrame' in window,
            requestIdleCallback: 'requestIdleCallback' in window,
            navigationTiming: 'performance' in window && 'timing' in performance,
            resourceTiming: 'performance' in window && 'getEntriesByType' in performance
        };
    }
    
    /**
     * Test arrow functions support
     */
    testArrowFunctions() {
        try {
            eval('(() => {})');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test template literals support
     */
    testTemplateLiterals() {
        try {
            eval('`template`');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test destructuring support
     */
    testDestructuring() {
        try {
            eval('const {a} = {a: 1}');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test promises support
     */
    testPromises() {
        return 'Promise' in window && typeof Promise.resolve === 'function';
    }
    
    /**
     * Test async/await support
     */
    testAsyncAwait() {
        try {
            eval('(async () => {})');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test classes support
     */
    testClasses() {
        try {
            eval('class TestClass {}');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test modules support
     */
    testModules() {
        return 'import' in window || typeof require !== 'undefined';
    }
    
    /**
     * Test custom events support
     */
    testCustomEvents() {
        try {
            const event = new CustomEvent('test');
            return event instanceof CustomEvent;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test localStorage support
     */
    testLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test sessionStorage support
     */
    testSessionStorage() {
        try {
            const test = 'test';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Test CSS custom properties support
     */
    testCSSCustomProperties() {
        const element = document.createElement('div');
        element.style.setProperty('--test', 'value');
        return element.style.getPropertyValue('--test') === 'value';
    }
    
    /**
     * Test flexbox support
     */
    testFlexbox() {
        const element = document.createElement('div');
        element.style.display = 'flex';
        return element.style.display === 'flex';
    }
    
    /**
     * Test CSS Grid support
     */
    testGrid() {
        const element = document.createElement('div');
        element.style.display = 'grid';
        return element.style.display === 'grid';
    }
    
    /**
     * Test CSS transforms support
     */
    testTransforms() {
        const element = document.createElement('div');
        const transforms = ['transform', 'webkitTransform', 'mozTransform', 'msTransform'];
        return transforms.some(prop => prop in element.style);
    }
    
    /**
     * Test CSS transitions support
     */
    testTransitions() {
        const element = document.createElement('div');
        const transitions = ['transition', 'webkitTransition', 'mozTransition', 'msTransition'];
        return transitions.some(prop => prop in element.style);
    }
    
    /**
     * Test CSS animations support
     */
    testAnimations() {
        const element = document.createElement('div');
        const animations = ['animation', 'webkitAnimation', 'mozAnimation', 'msAnimation'];
        return animations.some(prop => prop in element.style);
    }
    
    /**
     * Test backdrop-filter support
     */
    testBackdropFilter() {
        const element = document.createElement('div');
        const backdropFilters = ['backdropFilter', 'webkitBackdropFilter'];
        return backdropFilters.some(prop => prop in element.style);
    }
    
    /**
     * Test HSL color support
     */
    testHSLColors() {
        const element = document.createElement('div');
        element.style.color = 'hsl(0, 100%, 50%)';
        return element.style.color.includes('hsl') || element.style.color.includes('rgb');
    }
    
    /**
     * Test RGBA color support
     */
    testRGBAColors() {
        const element = document.createElement('div');
        element.style.color = 'rgba(255, 0, 0, 0.5)';
        return element.style.color.includes('rgba');
    }
    
    /**
     * Test container queries support
     */
    testContainerQueries() {
        return CSS && CSS.supports && CSS.supports('container-type', 'inline-size');
    }
    
    /**
     * Test aspect-ratio support
     */
    testAspectRatio() {
        return CSS && CSS.supports && CSS.supports('aspect-ratio', '1/1');
    }
    
    /**
     * Setup fallbacks for unsupported features
     */
    setupFallbacks() {
        // CSS Variables fallback
        if (!this.features.css.customProperties) {
            this.fallbacks.cssVariables = this.createCSSVariablesFallback();
        }
        
        // Backdrop filter fallback
        if (!this.features.css.backdropFilter) {
            this.fallbacks.backdropFilter = this.createBackdropFilterFallback();
        }
        
        // Fetch API fallback
        if (!this.features.js.fetch) {
            this.fallbacks.fetch = this.createFetchFallback();
        }
        
        // Custom events fallback
        if (!this.features.core.customEvents) {
            this.fallbacks.customEvents = this.createCustomEventsFallback();
        }
        
        // BroadcastChannel fallback
        if (!this.features.js.broadcastChannel) {
            this.fallbacks.broadcastChannel = this.createBroadcastChannelFallback();
        }
        
        // RequestAnimationFrame fallback
        if (!this.features.performance.requestAnimationFrame) {
            this.fallbacks.requestAnimationFrame = this.createRAFFallback();
        }
    }
    
    /**
     * Create CSS Variables fallback
     */
    createCSSVariablesFallback() {
        return {
            setProperty: function(element, property, value) {
                // Store in data attribute for fallback
                element.setAttribute('data-' + property.replace('--', ''), value);
                
                // Apply direct styles for common properties
                const mappings = {
                    '--las-primary-color': 'color',
                    '--las-background-color': 'backgroundColor',
                    '--las-border-color': 'borderColor'
                };
                
                if (mappings[property]) {
                    element.style[mappings[property]] = value;
                }
            },
            
            getProperty: function(element, property) {
                return element.getAttribute('data-' + property.replace('--', ''));
            }
        };
    }
    
    /**
     * Create backdrop-filter fallback
     */
    createBackdropFilterFallback() {
        return {
            apply: function(element, filterValue) {
                // Create pseudo-element for blur effect
                const style = document.createElement('style');
                const className = 'las-backdrop-fallback-' + Date.now();
                
                element.classList.add(className);
                
                style.textContent = `
                    .${className}::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.1);
                        z-index: -1;
                    }
                `;
                
                document.head.appendChild(style);
            }
        };
    }
    
    /**
     * Create Fetch API fallback using XMLHttpRequest
     */
    createFetchFallback() {
        return function(url, options = {}) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const method = options.method || 'GET';
                
                xhr.open(method, url);
                
                // Set headers
                if (options.headers) {
                    Object.keys(options.headers).forEach(key => {
                        xhr.setRequestHeader(key, options.headers[key]);
                    });
                }
                
                xhr.onload = function() {
                    const response = {
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        text: () => Promise.resolve(xhr.responseText),
                        json: () => Promise.resolve(JSON.parse(xhr.responseText))
                    };
                    resolve(response);
                };
                
                xhr.onerror = function() {
                    reject(new Error('Network error'));
                };
                
                xhr.send(options.body);
            });
        };
    }
    
    /**
     * Create Custom Events fallback
     */
    createCustomEventsFallback() {
        return function(eventName, options = {}) {
            const event = document.createEvent('CustomEvent');
            event.initCustomEvent(eventName, true, true, options.detail);
            return event;
        };
    }
    
    /**
     * Create BroadcastChannel fallback using localStorage
     */
    createBroadcastChannelFallback() {
        return class BroadcastChannelFallback {
            constructor(name) {
                this.name = name;
                this.listeners = [];
                this.storageKey = `las-broadcast-${name}`;
                
                // Listen for storage changes
                window.addEventListener('storage', (e) => {
                    if (e.key === this.storageKey && e.newValue) {
                        const data = JSON.parse(e.newValue);
                        this.listeners.forEach(listener => {
                            listener({ data: data.message });
                        });
                    }
                });
            }
            
            postMessage(message) {
                const data = {
                    message,
                    timestamp: Date.now()
                };
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                // Clear immediately to trigger storage event
                localStorage.removeItem(this.storageKey);
            }
            
            addEventListener(type, listener) {
                if (type === 'message') {
                    this.listeners.push(listener);
                }
            }
            
            removeEventListener(type, listener) {
                if (type === 'message') {
                    const index = this.listeners.indexOf(listener);
                    if (index > -1) {
                        this.listeners.splice(index, 1);
                    }
                }
            }
            
            close() {
                this.listeners = [];
            }
        };
    }
    
    /**
     * Create requestAnimationFrame fallback
     */
    createRAFFallback() {
        let lastTime = 0;
        return function(callback) {
            const currTime = new Date().getTime();
            const timeToCall = Math.max(0, 16 - (currTime - lastTime));
            const id = window.setTimeout(() => {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    
    /**
     * Apply progressive enhancement
     */
    applyProgressiveEnhancement() {
        // Add feature classes to document
        const html = document.documentElement;
        
        Object.keys(this.features).forEach(category => {
            Object.keys(this.features[category]).forEach(feature => {
                const supported = this.features[category][feature];
                const className = `las-${feature.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                
                if (supported) {
                    html.classList.add(className);
                } else {
                    html.classList.add(`no-${className}`);
                }
            });
        });
        
        // Apply fallbacks where needed
        this.applyFallbacks();
        
        console.log('Progressive enhancement applied');
    }
    
    /**
     * Apply fallbacks
     */
    applyFallbacks() {
        // Apply CSS Variables fallback
        if (this.fallbacks.cssVariables) {
            window.LASCSSVariables = this.fallbacks.cssVariables;
        }
        
        // Apply Fetch fallback
        if (this.fallbacks.fetch) {
            window.fetch = this.fallbacks.fetch;
        }
        
        // Apply CustomEvent fallback
        if (this.fallbacks.customEvents) {
            window.CustomEvent = this.fallbacks.customEvents;
        }
        
        // Apply BroadcastChannel fallback
        if (this.fallbacks.broadcastChannel) {
            window.BroadcastChannel = this.fallbacks.broadcastChannel;
        }
        
        // Apply requestAnimationFrame fallback
        if (this.fallbacks.requestAnimationFrame) {
            window.requestAnimationFrame = this.fallbacks.requestAnimationFrame;
            window.cancelAnimationFrame = window.clearTimeout;
        }
    }
    
    /**
     * Check if a feature is supported
     */
    isSupported(category, feature) {
        return this.features[category] && this.features[category][feature];
    }
    
    /**
     * Get all features
     */
    getAllFeatures() {
        return this.features;
    }
    
    /**
     * Get browser compatibility score
     */
    getCompatibilityScore() {
        let totalFeatures = 0;
        let supportedFeatures = 0;
        
        Object.keys(this.features).forEach(category => {
            Object.keys(this.features[category]).forEach(feature => {
                totalFeatures++;
                if (this.features[category][feature]) {
                    supportedFeatures++;
                }
            });
        });
        
        return Math.round((supportedFeatures / totalFeatures) * 100);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeatureDetection;
}

// Global access for browser testing
window.FeatureDetection = FeatureDetection;