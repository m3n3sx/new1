/**
 * Live Admin Styler - Browser Compatibility Testing Framework
 * 
 * Comprehensive testing framework for cross-browser compatibility
 * Supports Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
 * Mobile testing for iOS 14+ and Android 10+
 */

class BrowserCompatibilityFramework {
    constructor() {
        this.testResults = [];
        this.browserInfo = this.detectBrowser();
        this.featureSupport = {};
        this.performanceMetrics = {};
        
        console.log('Browser Compatibility Framework initialized');
        console.log('Browser:', this.browserInfo);
    }
    
    /**
     * Detect browser type and version
     */
    detectBrowser() {
        const ua = navigator.userAgent;
        const browser = {
            name: 'Unknown',
            version: 'Unknown',
            mobile: /Mobile|Android|iPhone|iPad/.test(ua),
            supported: false
        };
        
        // Chrome detection
        if (ua.includes('Chrome') && !ua.includes('Edg')) {
            const match = ua.match(/Chrome\/(\d+)/);
            browser.name = 'Chrome';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.supported = browser.version >= 90;
        }
        // Firefox detection
        else if (ua.includes('Firefox')) {
            const match = ua.match(/Firefox\/(\d+)/);
            browser.name = 'Firefox';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.supported = browser.version >= 88;
        }
        // Safari detection
        else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            const match = ua.match(/Version\/(\d+)/);
            browser.name = 'Safari';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.supported = browser.version >= 14;
        }
        // Edge detection
        else if (ua.includes('Edg')) {
            const match = ua.match(/Edg\/(\d+)/);
            browser.name = 'Edge';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.supported = browser.version >= 90;
        }
        
        return browser;
    }
    
    /**
     * Run all compatibility tests
     */
    async runAllTests() {
        console.log('Starting comprehensive browser compatibility tests...');
        
        // Core feature tests
        await this.testES6Features();
        await this.testDOMAPIs();
        await this.testCSSFeatures();
        await this.testJavaScriptAPIs();
        await this.testStorageAPIs();
        await this.testNetworkAPIs();
        await this.testPerformanceAPIs();
        await this.testMobileFeatures();
        
        // Live Admin Styler specific tests
        await this.testLivePreviewCompatibility();
        await this.testColorPickerCompatibility();
        await this.testCSSVariablesSupport();
        await this.testAnimationSupport();
        
        return this.generateReport();
    }
    
    /**
     * Test ES6+ features
     */
    async testES6Features() {
        const tests = [
            {
                name: 'Arrow Functions',
                test: () => {
                    const arrow = () => 'test';
                    return arrow() === 'test';
                }
            },
            {
                name: 'Template Literals',
                test: () => {
                    const value = 'world';
                    return `hello ${value}` === 'hello world';
                }
            },
            {
                name: 'Destructuring',
                test: () => {
                    const obj = { a: 1, b: 2 };
                    const { a, b } = obj;
                    return a === 1 && b === 2;
                }
            },
            {
                name: 'Promises',
                test: () => {
                    return new Promise(resolve => resolve(true));
                }
            },
            {
                name: 'Async/Await',
                test: async () => {
                    const result = await Promise.resolve(true);
                    return result === true;
                }
            },
            {
                name: 'Classes',
                test: () => {
                    class TestClass {
                        constructor() { this.value = 'test'; }
                        getValue() { return this.value; }
                    }
                    const instance = new TestClass();
                    return instance.getValue() === 'test';
                }
            },
            {
                name: 'Modules (import/export)',
                test: () => {
                    // Test if module syntax is supported
                    return typeof import !== 'undefined' || typeof require !== 'undefined';
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('ES6 Features', test.name, test.test);
        }
    }
    
    /**
     * Test DOM APIs
     */
    async testDOMAPIs() {
        const tests = [
            {
                name: 'querySelector/querySelectorAll',
                test: () => {
                    const element = document.createElement('div');
                    element.className = 'test-class';
                    document.body.appendChild(element);
                    
                    const found = document.querySelector('.test-class');
                    const foundAll = document.querySelectorAll('.test-class');
                    
                    document.body.removeChild(element);
                    return found && foundAll.length === 1;
                }
            },
            {
                name: 'classList API',
                test: () => {
                    const element = document.createElement('div');
                    element.classList.add('test');
                    element.classList.toggle('toggle');
                    return element.classList.contains('test') && element.classList.contains('toggle');
                }
            },
            {
                name: 'addEventListener',
                test: () => {
                    return new Promise(resolve => {
                        const element = document.createElement('div');
                        let eventFired = false;
                        
                        element.addEventListener('click', () => {
                            eventFired = true;
                            resolve(eventFired);
                        });
                        
                        const event = new Event('click');
                        element.dispatchEvent(event);
                        
                        setTimeout(() => resolve(eventFired), 10);
                    });
                }
            },
            {
                name: 'Custom Events',
                test: () => {
                    return new Promise(resolve => {
                        const element = document.createElement('div');
                        let customEventFired = false;
                        
                        element.addEventListener('customEvent', (e) => {
                            customEventFired = e.detail.test === 'value';
                            resolve(customEventFired);
                        });
                        
                        const customEvent = new CustomEvent('customEvent', {
                            detail: { test: 'value' }
                        });
                        element.dispatchEvent(customEvent);
                        
                        setTimeout(() => resolve(customEventFired), 10);
                    });
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('DOM APIs', test.name, test.test);
        }
    }
    
    /**
     * Test CSS features
     */
    async testCSSFeatures() {
        const tests = [
            {
                name: 'CSS Custom Properties (Variables)',
                test: () => {
                    const element = document.createElement('div');
                    element.style.setProperty('--test-var', 'red');
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const value = computedStyle.getPropertyValue('--test-var').trim();
                    
                    document.body.removeChild(element);
                    return value === 'red';
                }
            },
            {
                name: 'CSS Grid',
                test: () => {
                    const element = document.createElement('div');
                    element.style.display = 'grid';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const display = computedStyle.display;
                    
                    document.body.removeChild(element);
                    return display === 'grid';
                }
            },
            {
                name: 'CSS Flexbox',
                test: () => {
                    const element = document.createElement('div');
                    element.style.display = 'flex';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const display = computedStyle.display;
                    
                    document.body.removeChild(element);
                    return display === 'flex';
                }
            },
            {
                name: 'CSS Transforms',
                test: () => {
                    const element = document.createElement('div');
                    element.style.transform = 'translateX(10px)';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const transform = computedStyle.transform;
                    
                    document.body.removeChild(element);
                    return transform !== 'none';
                }
            },
            {
                name: 'CSS Transitions',
                test: () => {
                    const element = document.createElement('div');
                    element.style.transition = 'opacity 0.3s ease';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const transition = computedStyle.transition;
                    
                    document.body.removeChild(element);
                    return transition.includes('opacity');
                }
            },
            {
                name: 'Backdrop Filter',
                test: () => {
                    const element = document.createElement('div');
                    element.style.backdropFilter = 'blur(10px)';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const backdropFilter = computedStyle.backdropFilter || computedStyle.webkitBackdropFilter;
                    
                    document.body.removeChild(element);
                    return backdropFilter && backdropFilter !== 'none';
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('CSS Features', test.name, test.test);
        }
    }
    
    /**
     * Test JavaScript APIs
     */
    async testJavaScriptAPIs() {
        const tests = [
            {
                name: 'Fetch API',
                test: () => typeof fetch !== 'undefined'
            },
            {
                name: 'XMLHttpRequest',
                test: () => typeof XMLHttpRequest !== 'undefined'
            },
            {
                name: 'Intersection Observer',
                test: () => typeof IntersectionObserver !== 'undefined'
            },
            {
                name: 'Mutation Observer',
                test: () => typeof MutationObserver !== 'undefined'
            },
            {
                name: 'Resize Observer',
                test: () => typeof ResizeObserver !== 'undefined'
            },
            {
                name: 'Web Workers',
                test: () => typeof Worker !== 'undefined'
            },
            {
                name: 'Service Workers',
                test: () => 'serviceWorker' in navigator
            }
        ];
        
        for (const test of tests) {
            await this.runTest('JavaScript APIs', test.name, test.test);
        }
    }
    
    /**
     * Test storage APIs
     */
    async testStorageAPIs() {
        const tests = [
            {
                name: 'localStorage',
                test: () => {
                    try {
                        localStorage.setItem('test', 'value');
                        const value = localStorage.getItem('test');
                        localStorage.removeItem('test');
                        return value === 'value';
                    } catch (e) {
                        return false;
                    }
                }
            },
            {
                name: 'sessionStorage',
                test: () => {
                    try {
                        sessionStorage.setItem('test', 'value');
                        const value = sessionStorage.getItem('test');
                        sessionStorage.removeItem('test');
                        return value === 'value';
                    } catch (e) {
                        return false;
                    }
                }
            },
            {
                name: 'IndexedDB',
                test: () => typeof indexedDB !== 'undefined'
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Storage APIs', test.name, test.test);
        }
    }
    
    /**
     * Test network APIs
     */
    async testNetworkAPIs() {
        const tests = [
            {
                name: 'Fetch with CORS',
                test: async () => {
                    try {
                        // Test with a simple data URL
                        const response = await fetch('data:text/plain,test');
                        const text = await response.text();
                        return text === 'test';
                    } catch (e) {
                        return false;
                    }
                }
            },
            {
                name: 'FormData',
                test: () => {
                    try {
                        const formData = new FormData();
                        formData.append('test', 'value');
                        return formData.get('test') === 'value';
                    } catch (e) {
                        return false;
                    }
                }
            },
            {
                name: 'URLSearchParams',
                test: () => {
                    try {
                        const params = new URLSearchParams('test=value');
                        return params.get('test') === 'value';
                    } catch (e) {
                        return false;
                    }
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Network APIs', test.name, test.test);
        }
    }
    
    /**
     * Test performance APIs
     */
    async testPerformanceAPIs() {
        const tests = [
            {
                name: 'Performance.now()',
                test: () => {
                    return typeof performance !== 'undefined' && 
                           typeof performance.now === 'function' &&
                           typeof performance.now() === 'number';
                }
            },
            {
                name: 'requestAnimationFrame',
                test: () => {
                    return typeof requestAnimationFrame !== 'undefined';
                }
            },
            {
                name: 'Performance Observer',
                test: () => typeof PerformanceObserver !== 'undefined'
            },
            {
                name: 'Navigation Timing',
                test: () => {
                    return typeof performance !== 'undefined' && 
                           performance.timing !== undefined;
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Performance APIs', test.name, test.test);
        }
    }
    
    /**
     * Test mobile-specific features
     */
    async testMobileFeatures() {
        if (!this.browserInfo.mobile) {
            this.addTestResult('Mobile Features', 'Mobile Detection', true, 'Desktop browser detected');
            return;
        }
        
        const tests = [
            {
                name: 'Touch Events',
                test: () => 'ontouchstart' in window
            },
            {
                name: 'Orientation API',
                test: () => 'orientation' in window || 'onorientationchange' in window
            },
            {
                name: 'Device Motion',
                test: () => 'DeviceMotionEvent' in window
            },
            {
                name: 'Viewport Meta',
                test: () => {
                    const viewport = document.querySelector('meta[name="viewport"]');
                    return viewport !== null;
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Mobile Features', test.name, test.test);
        }
    }
    
    /**
     * Test Live Admin Styler specific compatibility
     */
    async testLivePreviewCompatibility() {
        const tests = [
            {
                name: 'Style Element Manipulation',
                test: () => {
                    const style = document.createElement('style');
                    style.textContent = 'body { background: red; }';
                    document.head.appendChild(style);
                    
                    const success = style.sheet && style.sheet.cssRules.length > 0;
                    document.head.removeChild(style);
                    return success;
                }
            },
            {
                name: 'CSS Rule Insertion',
                test: () => {
                    const style = document.createElement('style');
                    document.head.appendChild(style);
                    
                    try {
                        style.sheet.insertRule('body { color: blue; }', 0);
                        const success = style.sheet.cssRules.length > 0;
                        document.head.removeChild(style);
                        return success;
                    } catch (e) {
                        document.head.removeChild(style);
                        return false;
                    }
                }
            },
            {
                name: 'Computed Style Access',
                test: () => {
                    const element = document.createElement('div');
                    element.style.color = 'red';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const color = computedStyle.color;
                    
                    document.body.removeChild(element);
                    return color.includes('255') || color.includes('red');
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Live Preview', test.name, test.test);
        }
    }
    
    /**
     * Test color picker compatibility
     */
    async testColorPickerCompatibility() {
        const tests = [
            {
                name: 'Color Input Support',
                test: () => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    return input.type === 'color';
                }
            },
            {
                name: 'Canvas Color Manipulation',
                test: () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(0, 0, 1, 1);
                        
                        const imageData = ctx.getImageData(0, 0, 1, 1);
                        return imageData.data[0] === 255; // Red channel
                    } catch (e) {
                        return false;
                    }
                }
            },
            {
                name: 'HSL Color Support',
                test: () => {
                    const element = document.createElement('div');
                    element.style.color = 'hsl(0, 100%, 50%)';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const color = computedStyle.color;
                    
                    document.body.removeChild(element);
                    return color.includes('255') || color.includes('hsl') || color.includes('red');
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Color Picker', test.name, test.test);
        }
    }
    
    /**
     * Test CSS Variables support
     */
    async testCSSVariablesSupport() {
        const tests = [
            {
                name: 'CSS Variable Declaration',
                test: () => {
                    const element = document.createElement('div');
                    element.style.setProperty('--test-var', 'test-value');
                    document.body.appendChild(element);
                    
                    const value = getComputedStyle(element).getPropertyValue('--test-var').trim();
                    document.body.removeChild(element);
                    return value === 'test-value';
                }
            },
            {
                name: 'CSS Variable Usage',
                test: () => {
                    const style = document.createElement('style');
                    style.textContent = ':root { --test-color: red; } .test { color: var(--test-color); }';
                    document.head.appendChild(style);
                    
                    const element = document.createElement('div');
                    element.className = 'test';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const color = computedStyle.color;
                    
                    document.head.removeChild(style);
                    document.body.removeChild(element);
                    
                    return color.includes('255') || color.includes('red');
                }
            },
            {
                name: 'CSS Variable Inheritance',
                test: () => {
                    const style = document.createElement('style');
                    style.textContent = '.parent { --inherited-var: blue; } .child { color: var(--inherited-var); }';
                    document.head.appendChild(style);
                    
                    const parent = document.createElement('div');
                    parent.className = 'parent';
                    const child = document.createElement('div');
                    child.className = 'child';
                    parent.appendChild(child);
                    document.body.appendChild(parent);
                    
                    const computedStyle = getComputedStyle(child);
                    const color = computedStyle.color;
                    
                    document.head.removeChild(style);
                    document.body.removeChild(parent);
                    
                    return color.includes('0') || color.includes('blue');
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('CSS Variables', test.name, test.test);
        }
    }
    
    /**
     * Test animation support
     */
    async testAnimationSupport() {
        const tests = [
            {
                name: 'CSS Animations',
                test: () => {
                    const element = document.createElement('div');
                    element.style.animation = 'test-animation 1s ease';
                    document.body.appendChild(element);
                    
                    const computedStyle = getComputedStyle(element);
                    const animation = computedStyle.animation || computedStyle.webkitAnimation;
                    
                    document.body.removeChild(element);
                    return animation && animation.includes('test-animation');
                }
            },
            {
                name: 'CSS Keyframes',
                test: () => {
                    const style = document.createElement('style');
                    style.textContent = '@keyframes test-keyframe { 0% { opacity: 0; } 100% { opacity: 1; } }';
                    document.head.appendChild(style);
                    
                    const success = style.sheet && style.sheet.cssRules.length > 0;
                    document.head.removeChild(style);
                    return success;
                }
            },
            {
                name: 'requestAnimationFrame',
                test: () => {
                    return new Promise(resolve => {
                        if (typeof requestAnimationFrame === 'undefined') {
                            resolve(false);
                            return;
                        }
                        
                        let called = false;
                        requestAnimationFrame(() => {
                            called = true;
                            resolve(true);
                        });
                        
                        setTimeout(() => {
                            if (!called) resolve(false);
                        }, 100);
                    });
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Animation Support', test.name, test.test);
        }
    }
    
    /**
     * Run a single test
     */
    async runTest(category, name, testFunction) {
        try {
            const startTime = performance.now();
            const result = await testFunction();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.addTestResult(category, name, result, '', duration);
            
            if (result) {
                console.log(`✓ ${category} - ${name} (${duration.toFixed(2)}ms)`);
            } else {
                console.warn(`✗ ${category} - ${name} (${duration.toFixed(2)}ms)`);
            }
        } catch (error) {
            this.addTestResult(category, name, false, error.message);
            console.error(`✗ ${category} - ${name}: ${error.message}`);
        }
    }
    
    /**
     * Add test result
     */
    addTestResult(category, name, passed, message = '', duration = 0) {
        this.testResults.push({
            category,
            name,
            passed,
            message,
            duration,
            timestamp: new Date().toISOString()
        });
        
        // Update feature support tracking
        if (!this.featureSupport[category]) {
            this.featureSupport[category] = { passed: 0, total: 0 };
        }
        this.featureSupport[category].total++;
        if (passed) {
            this.featureSupport[category].passed++;
        }
    }
    
    /**
     * Generate comprehensive report
     */
    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        const report = {
            browser: this.browserInfo,
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: totalTests - passedTests,
                successRate: successRate,
                supported: this.browserInfo.supported && successRate >= 90
            },
            categories: this.featureSupport,
            results: this.testResults,
            recommendations: this.generateRecommendations()
        };
        
        console.log('=== BROWSER COMPATIBILITY REPORT ===');
        console.log(`Browser: ${this.browserInfo.name} ${this.browserInfo.version}`);
        console.log(`Mobile: ${this.browserInfo.mobile}`);
        console.log(`Supported: ${this.browserInfo.supported}`);
        console.log(`Tests: ${passedTests}/${totalTests} (${successRate}%)`);
        console.log(`Overall Status: ${report.summary.supported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
        
        return report;
    }
    
    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        const failedTests = this.testResults.filter(r => !r.passed);
        
        if (!this.browserInfo.supported) {
            recommendations.push({
                type: 'warning',
                message: `Browser ${this.browserInfo.name} ${this.browserInfo.version} is below minimum supported version`
            });
        }
        
        // Check for critical failures
        const criticalFeatures = ['CSS Custom Properties (Variables)', 'Fetch API', 'localStorage'];
        const criticalFailures = failedTests.filter(test => 
            criticalFeatures.some(feature => test.name.includes(feature))
        );
        
        if (criticalFailures.length > 0) {
            recommendations.push({
                type: 'error',
                message: 'Critical features are not supported. Live Admin Styler may not function properly.',
                features: criticalFailures.map(f => f.name)
            });
        }
        
        // Check for performance issues
        const slowTests = this.testResults.filter(r => r.duration > 100);
        if (slowTests.length > 0) {
            recommendations.push({
                type: 'warning',
                message: 'Some features are performing slowly. Consider performance optimizations.',
                features: slowTests.map(t => `${t.name} (${t.duration.toFixed(2)}ms)`)
            });
        }
        
        // Progressive enhancement suggestions
        if (failedTests.some(t => t.name.includes('Backdrop Filter'))) {
            recommendations.push({
                type: 'info',
                message: 'Backdrop filter not supported. Consider fallback styles for glassmorphism effects.'
            });
        }
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserCompatibilityFramework;
}

// Global access for browser testing
window.BrowserCompatibilityFramework = BrowserCompatibilityFramework;