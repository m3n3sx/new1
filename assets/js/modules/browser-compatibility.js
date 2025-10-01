/**
 * Browser Compatibility Module
 * Provides feature detection and polyfills for cross-browser compatibility
 */

class BrowserCompatibility {
    constructor() {
        this.features = {};
        this.polyfillsLoaded = false;
        this.detectFeatures();
    }

    /**
     * Detect browser features and capabilities
     */
    detectFeatures() {
        // Detect browser first
        const browser = this.detectBrowser();
        const version = this.detectBrowserVersion(browser);
        
        this.features = {
            // Modern JavaScript features
            fetch: typeof fetch !== 'undefined',
            promise: typeof Promise !== 'undefined',
            arrow_functions: this.detectArrowFunctions(),
            const_let: this.detectConstLet(),
            template_literals: this.detectTemplateLiterals(),
            
            // DOM APIs
            classList: typeof document !== 'undefined' && 'classList' in document.createElement('div'),
            querySelector: typeof document !== 'undefined' && 'querySelector' in document,
            addEventListener: typeof window !== 'undefined' && 'addEventListener' in window,
            
            // Modern Web APIs
            broadcastChannel: typeof window !== 'undefined' && 'BroadcastChannel' in window,
            localStorage: this.detectLocalStorage(),
            sessionStorage: this.detectSessionStorage(),
            requestAnimationFrame: typeof window !== 'undefined' && 'requestAnimationFrame' in window,
            abortController: typeof window !== 'undefined' && 'AbortController' in window,
            
            // CSS features
            cssVariables: this.detectCSSVariables(),
            flexbox: this.detectFlexbox(),
            grid: this.detectGrid(),
            
            // Browser identification
            browser: browser,
            version: version
        };
    }

    /**
     * Check if arrow functions are supported
     */
    detectArrowFunctions() {
        try {
            eval('(() => {})');
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if const/let are supported
     */
    detectConstLet() {
        try {
            eval('const test = 1; let test2 = 2;');
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if template literals are supported
     */
    detectTemplateLiterals() {
        try {
            eval('`template literal`');
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check localStorage availability
     */
    detectLocalStorage() {
        try {
            if (typeof localStorage === 'undefined') return false;
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check sessionStorage availability
     */
    detectSessionStorage() {
        try {
            if (typeof sessionStorage === 'undefined') return false;
            const test = 'test';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check CSS Variables support
     */
    detectCSSVariables() {
        try {
            return typeof window !== 'undefined' && window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');
        } catch (e) {
            return false;
        }
    }

    /**
     * Check Flexbox support
     */
    detectFlexbox() {
        try {
            if (typeof document === 'undefined') return false;
            const element = document.createElement('div');
            element.style.display = 'flex';
            return element.style.display === 'flex';
        } catch (e) {
            return false;
        }
    }

    /**
     * Check CSS Grid support
     */
    detectGrid() {
        try {
            if (typeof document === 'undefined') return false;
            const element = document.createElement('div');
            element.style.display = 'grid';
            return element.style.display === 'grid';
        } catch (e) {
            return false;
        }
    }

    /**
     * Detect browser type
     */
    detectBrowser() {
        const userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
        
        if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
            return 'chrome';
        } else if (userAgent.indexOf('Firefox') > -1) {
            return 'firefox';
        } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
            return 'safari';
        } else if (userAgent.indexOf('Edg') > -1) {
            return 'edge';
        } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
            return 'ie';
        }
        
        return 'unknown';
    }

    /**
     * Detect browser version
     */
    detectBrowserVersion(browser) {
        const userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
        let version = 'unknown';
        
        try {
            if (browser === 'chrome') {
                const match = userAgent.match(/Chrome\/(\d+)/);
                version = match ? match[1] : 'unknown';
            } else if (browser === 'firefox') {
                const match = userAgent.match(/Firefox\/(\d+)/);
                version = match ? match[1] : 'unknown';
            } else if (browser === 'safari') {
                const match = userAgent.match(/Version\/(\d+)/);
                version = match ? match[1] : 'unknown';
            } else if (browser === 'edge') {
                const match = userAgent.match(/Edg\/(\d+)/);
                version = match ? match[1] : 'unknown';
            }
        } catch (e) {
            // Keep default 'unknown'
        }
        
        return version;
    }

    /**
     * Load polyfills for missing features
     */
    async loadPolyfills() {
        if (this.polyfillsLoaded) return;
        
        const polyfills = [];
        
        // Fetch polyfill
        if (!this.features.fetch) {
            polyfills.push(this.loadFetchPolyfill());
        }
        
        // Promise polyfill
        if (!this.features.promise) {
            polyfills.push(this.loadPromisePolyfill());
        }
        
        // BroadcastChannel polyfill
        if (!this.features.broadcastChannel) {
            polyfills.push(this.loadBroadcastChannelPolyfill());
        }
        
        // RequestAnimationFrame polyfill
        if (!this.features.requestAnimationFrame) {
            polyfills.push(this.loadRequestAnimationFramePolyfill());
        }
        
        // AbortController polyfill
        if (!this.features.abortController) {
            polyfills.push(this.loadAbortControllerPolyfill());
        }
        
        // CSS Variables polyfill
        if (!this.features.cssVariables) {
            polyfills.push(this.loadCSSVariablesPolyfill());
        }
        
        // Custom Events polyfill
        if (!this.detectCustomEvents()) {
            polyfills.push(this.loadCustomEventsPolyfill());
        }
        
        await Promise.all(polyfills);
        this.polyfillsLoaded = true;
        
        // Apply progressive enhancement
        this.applyProgressiveEnhancement();
    }

    /**
     * Fetch API polyfill
     */
    loadFetchPolyfill() {
        return new Promise((resolve) => {
            if (typeof fetch !== 'undefined') {
                resolve();
                return;
            }
            
            // Simple fetch polyfill using XMLHttpRequest
            window.fetch = function(url, options = {}) {
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
                    
                    // Handle timeout
                    if (options.signal && options.signal.aborted) {
                        reject(new Error('Request aborted'));
                        return;
                    }
                    
                    xhr.onload = function() {
                        const response = {
                            ok: xhr.status >= 200 && xhr.status < 300,
                            status: xhr.status,
                            statusText: xhr.statusText,
                            json: function() {
                                return Promise.resolve(JSON.parse(xhr.responseText));
                            },
                            text: function() {
                                return Promise.resolve(xhr.responseText);
                            }
                        };
                        resolve(response);
                    };
                    
                    xhr.onerror = function() {
                        reject(new Error('Network error'));
                    };
                    
                    xhr.send(options.body);
                });
            };
            
            resolve();
        });
    }

    /**
     * Promise polyfill
     */
    loadPromisePolyfill() {
        return new Promise((resolve) => {
            if (typeof Promise !== 'undefined') {
                resolve();
                return;
            }
            
            // Simple Promise polyfill
            window.Promise = function(executor) {
                const self = this;
                self.state = 'pending';
                self.value = undefined;
                self.handlers = [];
                
                function resolve(result) {
                    if (self.state === 'pending') {
                        self.state = 'fulfilled';
                        self.value = result;
                        self.handlers.forEach(handle);
                        self.handlers = null;
                    }
                }
                
                function reject(error) {
                    if (self.state === 'pending') {
                        self.state = 'rejected';
                        self.value = error;
                        self.handlers.forEach(handle);
                        self.handlers = null;
                    }
                }
                
                function handle(handler) {
                    if (self.state === 'pending') {
                        self.handlers.push(handler);
                    } else {
                        if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
                            handler.onFulfilled(self.value);
                        }
                        if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
                            handler.onRejected(self.value);
                        }
                    }
                }
                
                this.then = function(onFulfilled, onRejected) {
                    return new Promise(function(resolve, reject) {
                        handle({
                            onFulfilled: function(result) {
                                try {
                                    resolve(onFulfilled ? onFulfilled(result) : result);
                                } catch (ex) {
                                    reject(ex);
                                }
                            },
                            onRejected: function(error) {
                                try {
                                    resolve(onRejected ? onRejected(error) : error);
                                } catch (ex) {
                                    reject(ex);
                                }
                            }
                        });
                    });
                };
                
                executor(resolve, reject);
            };
            
            resolve();
        });
    }

    /**
     * BroadcastChannel polyfill using localStorage
     */
    loadBroadcastChannelPolyfill() {
        return new Promise((resolve) => {
            if ('BroadcastChannel' in window) {
                resolve();
                return;
            }
            
            window.BroadcastChannel = function(name) {
                this.name = name;
                this.onmessage = null;
                
                const self = this;
                const storageKey = 'bc_' + name;
                
                // Listen for storage events
                window.addEventListener('storage', function(event) {
                    if (event.key === storageKey && self.onmessage) {
                        try {
                            const data = JSON.parse(event.newValue);
                            self.onmessage({ data: data.data });
                        } catch (e) {
                            // Ignore invalid JSON
                        }
                    }
                });
                
                this.postMessage = function(data) {
                    const message = {
                        data: data,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(storageKey, JSON.stringify(message));
                    // Remove immediately to trigger storage event
                    localStorage.removeItem(storageKey);
                };
                
                this.close = function() {
                    // No-op for polyfill
                };
            };
            
            resolve();
        });
    }

    /**
     * RequestAnimationFrame polyfill
     */
    loadRequestAnimationFramePolyfill() {
        return new Promise((resolve) => {
            if ('requestAnimationFrame' in window) {
                resolve();
                return;
            }
            
            let lastTime = 0;
            window.requestAnimationFrame = function(callback) {
                const currTime = new Date().getTime();
                const timeToCall = Math.max(0, 16 - (currTime - lastTime));
                const id = window.setTimeout(function() {
                    callback(currTime + timeToCall);
                }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
            
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
            
            resolve();
        });
    }

    /**
     * AbortController polyfill
     */
    loadAbortControllerPolyfill() {
        return new Promise((resolve) => {
            if ('AbortController' in window) {
                resolve();
                return;
            }
            
            window.AbortController = function() {
                this.signal = {
                    aborted: false,
                    addEventListener: function() {},
                    removeEventListener: function() {}
                };
                
                this.abort = function() {
                    this.signal.aborted = true;
                };
            };
            
            // Add timeout support to AbortSignal
            if (!window.AbortSignal) {
                window.AbortSignal = {
                    timeout: function(delay) {
                        const controller = new AbortController();
                        setTimeout(() => controller.abort(), delay);
                        return controller.signal;
                    }
                };
            }
            
            resolve();
        });
    }

    /**
     * Get feature support status
     */
    isSupported(feature) {
        return this.features[feature] === true;
    }

    /**
     * Get all feature support information
     */
    getFeatures() {
        return { ...this.features };
    }

    /**
     * Get browser information
     */
    getBrowserInfo() {
        return {
            browser: this.features.browser,
            version: this.features.version,
            userAgent: navigator.userAgent
        };
    }

    /**
     * Check if browser is supported
     */
    isBrowserSupported() {
        const browser = this.features.browser;
        const version = parseInt(this.features.version);
        
        // Minimum supported versions
        const minVersions = {
            chrome: 60,
            firefox: 55,
            safari: 12,
            edge: 79
        };
        
        if (browser === 'ie') {
            return false; // IE not supported
        }
        
        return minVersions[browser] ? version >= minVersions[browser] : false;
    }

    /**
     * Detect custom events support
     */
    detectCustomEvents() {
        try {
            const event = new CustomEvent('test');
            return event instanceof CustomEvent;
        } catch (e) {
            return false;
        }
    }

    /**
     * CSS Variables polyfill
     */
    loadCSSVariablesPolyfill() {
        return new Promise((resolve) => {
            if (this.features.cssVariables) {
                resolve();
                return;
            }
            
            // Simple CSS Variables polyfill
            window.CSSVariablesPolyfill = {
                variables: {},
                
                setProperty: function(element, property, value) {
                    this.variables[property] = value;
                    element.setAttribute('data-css-var-' + property.replace('--', ''), value);
                    
                    // Apply common mappings
                    const mappings = {
                        '--las-primary-color': 'color',
                        '--las-background-color': 'backgroundColor',
                        '--las-border-color': 'borderColor',
                        '--las-text-color': 'color'
                    };
                    
                    if (mappings[property]) {
                        element.style[mappings[property]] = value;
                    }
                },
                
                getProperty: function(element, property) {
                    return this.variables[property] || 
                           element.getAttribute('data-css-var-' + property.replace('--', ''));
                }
            };
            
            resolve();
        });
    }

    /**
     * Custom Events polyfill
     */
    loadCustomEventsPolyfill() {
        return new Promise((resolve) => {
            if (this.detectCustomEvents()) {
                resolve();
                return;
            }
            
            // CustomEvent polyfill for IE
            function CustomEvent(event, params) {
                params = params || { bubbles: false, cancelable: false, detail: undefined };
                const evt = document.createEvent('CustomEvent');
                evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
                return evt;
            }
            
            CustomEvent.prototype = window.Event.prototype;
            window.CustomEvent = CustomEvent;
            
            resolve();
        });
    }

    /**
     * Apply progressive enhancement
     */
    applyProgressiveEnhancement() {
        try {
            if (typeof document === 'undefined' || !document.documentElement) return;
            
            const html = document.documentElement;
            
            // Add feature classes
            Object.keys(this.features).forEach(feature => {
                const supported = this.features[feature];
                const className = `las-${feature.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                
                if (supported) {
                    html.classList.add(className);
                } else {
                    html.classList.add(`no-${className}`);
                }
            });
            
            // Add browser-specific classes
            html.classList.add(`las-browser-${this.features.browser}`);
            html.classList.add(`las-browser-version-${this.features.version}`);
            
            if (this.isBrowserSupported()) {
                html.classList.add('las-browser-supported');
            } else {
                html.classList.add('las-browser-unsupported');
            }
            
            console.log('Progressive enhancement applied');
        } catch (e) {
            console.warn('Failed to apply progressive enhancement:', e.message);
        }
    }

    /**
     * Show browser compatibility warning
     */
    showCompatibilityWarning() {
        try {
            if (this.isBrowserSupported()) return;
            if (typeof document === 'undefined' || !document.body) return;
            
            const warning = document.createElement('div');
            warning.className = 'las-browser-warning';
            warning.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 999999;
                background: #fff3cd;
                border-bottom: 3px solid #ffc107;
                padding: 15px;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            `;
            
            warning.innerHTML = `
                <div class="las-browser-warning__content">
                    <h3 style="margin: 0 0 10px 0; color: #856404;">Browser Compatibility Notice</h3>
                    <p style="margin: 0 0 10px 0; color: #856404;">Your browser (${this.features.browser} ${this.features.version}) may not fully support all features of Live Admin Styler.</p>
                    <p style="margin: 0 0 15px 0; color: #856404;">For the best experience, please update to a modern browser:</p>
                    <div style="display: inline-block; margin: 0 0 15px 0;">
                        <span style="margin: 0 15px; color: #856404;">Chrome 60+</span>
                        <span style="margin: 0 15px; color: #856404;">Firefox 55+</span>
                        <span style="margin: 0 15px; color: #856404;">Safari 12+</span>
                        <span style="margin: 0 15px; color: #856404;">Edge 79+</span>
                    </div><br>
                    <button class="las-browser-warning__close" style="
                        background: #ffc107;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        color: #856404;
                        font-weight: bold;
                    ">Continue Anyway</button>
                </div>
            `;
            
            const closeButton = warning.querySelector('.las-browser-warning__close');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    warning.remove();
                });
            }
            
            document.body.appendChild(warning);
        } catch (e) {
            console.warn('Failed to show compatibility warning:', e.message);
        }
    }

    /**
     * Get compatibility report
     */
    getCompatibilityReport() {
        const totalFeatures = Object.keys(this.features).length;
        const supportedFeatures = Object.values(this.features).filter(Boolean).length;
        const compatibilityScore = Math.round((supportedFeatures / totalFeatures) * 100);
        
        return {
            browser: this.getBrowserInfo(),
            features: this.getFeatures(),
            score: compatibilityScore,
            supported: this.isBrowserSupported(),
            polyfillsLoaded: this.polyfillsLoaded,
            recommendations: this.getRecommendations()
        };
    }

    /**
     * Get recommendations for unsupported features
     */
    getRecommendations() {
        const recommendations = [];
        
        if (!this.isBrowserSupported()) {
            recommendations.push({
                type: 'warning',
                message: `Consider upgrading ${this.features.browser} to a newer version for better compatibility.`
            });
        }
        
        if (!this.features.fetch) {
            recommendations.push({
                type: 'info',
                message: 'Fetch API polyfill has been loaded for network requests.'
            });
        }
        
        if (!this.features.broadcastChannel) {
            recommendations.push({
                type: 'info',
                message: 'BroadcastChannel polyfill using localStorage has been loaded for multi-tab sync.'
            });
        }
        
        if (!this.features.cssVariables) {
            recommendations.push({
                type: 'warning',
                message: 'CSS Variables are not supported. Some styling features may be limited.'
            });
        }
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserCompatibility;
} else {
    window.BrowserCompatibility = BrowserCompatibility;
}