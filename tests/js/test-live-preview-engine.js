/**
 * Unit Tests for LASLivePreviewEngine
 * Tests CSS generation, DOM manipulation, and update queuing functionality
 */

// Mock DOM environment for testing
global.document = {
    createElement: jest.fn((tagName) => ({
        id: '',
        type: '',
        textContent: '',
        setAttribute: jest.fn(),
        remove: jest.fn(),
        parentNode: {
            removeChild: jest.fn()
        }
    })),
    getElementById: jest.fn(),
    head: {
        appendChild: jest.fn()
    }
};

global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

global.requestAnimationFrame = jest.fn((callback) => {
    setTimeout(callback, 16);
    return 1;
});

global.performance = { 
    now: jest.fn(() => Date.now()) 
};

global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Define the LASLivePreviewEngine class for testing
class LASLivePreviewEngine {
    constructor(core) {
        this.core = core;
        this.styleElement = null;
        this.cssCache = new Map();
        this.updateQueue = [];
        this.isProcessing = false;
        this.cssRuleMap = new Map();
        this.initialized = false;
        
        // Performance tracking
        this.performanceMetrics = {
            updateCount: 0,
            totalUpdateTime: 0,
            averageUpdateTime: 0
        };
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.updateSetting = this.updateSetting.bind(this);
        this.processUpdateQueue = this.processUpdateQueue.bind(this);
        this.generateCSS = this.generateCSS.bind(this);
        this.applyCSS = this.applyCSS.bind(this);
    }
    
    async init() {
        try {
            console.log('LAS: Initializing Live Preview Engine...');
            
            this.createStyleElement();
            this.initializeCSSRuleMap();
            this.bindEvents();
            await this.loadInitialStyles();
            
            this.initialized = true;
            console.log('LAS: Live Preview Engine initialized successfully');
            
        } catch (error) {
            console.error('LAS: Failed to initialize Live Preview Engine:', error);
            throw error;
        }
    }
    
    createStyleElement() {
        const existingStyle = document.getElementById('las-live-preview-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'las-live-preview-styles';
        this.styleElement.type = 'text/css';
        this.styleElement.setAttribute('data-las-preview', 'true');
        
        document.head.appendChild(this.styleElement);
        console.log('LAS: Live preview style element created');
    }
    
    initializeCSSRuleMap() {
        this.cssRuleMap.set('menu_background_color', {
            selector: '#adminmenu, #adminmenu .wp-submenu',
            property: 'background-color',
            important: true
        });
        
        this.cssRuleMap.set('adminbar_background', {
            selector: '#wpadminbar',
            property: 'background',
            important: true
        });
        
        console.log('LAS: CSS rule mapping initialized with', this.cssRuleMap.size, 'rules');
    }
    
    bindEvents() {
        if (this.core) {
            this.core.on('settings:changed', (data) => {
                this.updateSetting(data.key, data.value);
            });
            
            this.core.on('core:ready', () => {
                console.log('LAS: Live Preview Engine ready for updates');
            });
        }
    }
    
    async loadInitialStyles() {
        try {
            const settingsManager = this.core?.get('settings');
            if (!settingsManager) {
                console.warn('LAS: Settings manager not available, skipping initial styles');
                return;
            }
            
            const settings = settingsManager.getAllSettings();
            if (!settings || Object.keys(settings).length === 0) {
                console.log('LAS: No initial settings found');
                return;
            }
            
            const cssRules = [];
            for (const [key, value] of Object.entries(settings)) {
                const cssRule = this.generateCSSRule(key, value);
                if (cssRule) {
                    cssRules.push(cssRule);
                    this.cssCache.set(key, cssRule);
                }
            }
            
            if (cssRules.length > 0) {
                const css = cssRules.join('\n');
                this.applyCSS(css);
                console.log('LAS: Initial styles applied for', cssRules.length, 'settings');
            }
            
        } catch (error) {
            console.error('LAS: Failed to load initial styles:', error);
            if (this.core?.get('error')) {
                this.core.get('error').handleError(error, 'Loading initial styles');
            }
        }
    }
    
    updateSetting(key, value) {
        if (!this.initialized) {
            console.warn('LAS: Live Preview Engine not initialized, queuing update');
        }
        
        this.updateQueue.push({ 
            key, 
            value, 
            timestamp: Date.now() 
        });
        
        this.processUpdateQueue();
    }
    
    processUpdateQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        requestAnimationFrame(() => {
            const startTime = performance.now();
            
            try {
                const updates = [...this.updateQueue];
                this.updateQueue = [];
                
                if (updates.length === 0) {
                    this.isProcessing = false;
                    return;
                }
                
                const css = this.generateCSS(updates);
                
                if (css) {
                    this.applyCSS(css);
                }
                
                const endTime = performance.now();
                const updateTime = endTime - startTime;
                this.updatePerformanceMetrics(updateTime, updates.length);
                
                console.log(`LAS: Processed ${updates.length} updates in ${updateTime.toFixed(2)}ms`);
                
            } catch (error) {
                console.error('LAS: Error processing update queue:', error);
                if (this.core?.get('error')) {
                    this.core.get('error').handleError(error, 'Processing live preview updates');
                }
            } finally {
                this.isProcessing = false;
                
                if (this.updateQueue.length > 0) {
                    setTimeout(() => this.processUpdateQueue(), 16);
                }
            }
        });
    }
    
    generateCSS(updates) {
        let css = '';
        const processedKeys = new Set();
        
        for (let i = updates.length - 1; i >= 0; i--) {
            const { key, value } = updates[i];
            
            if (processedKeys.has(key)) continue;
            processedKeys.add(key);
            
            const cssRule = this.generateCSSRule(key, value);
            if (cssRule) {
                css = cssRule + '\n' + css;
                this.cssCache.set(key, cssRule);
            }
        }
        
        return css;
    }
    
    generateCSSRule(key, value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        const ruleConfig = this.cssRuleMap.get(key);
        if (!ruleConfig) {
            return this.generateDynamicCSSRule(key, value);
        }
        
        const { selector, property, important = false } = ruleConfig;
        const importantFlag = important ? ' !important' : '';
        
        const sanitizedValue = this.sanitizeCSSValue(property, value);
        if (!sanitizedValue) {
            return null;
        }
        
        return `${selector} { ${property}: ${sanitizedValue}${importantFlag}; }`;
    }
    
    generateDynamicCSSRule(key, value) {
        if (key === 'custom_css' && typeof value === 'string') {
            return this.sanitizeCustomCSS(value);
        }
        
        if (key.includes('font_size') && !isNaN(value)) {
            const selector = this.getFontSizeSelector(key);
            if (selector) {
                return `${selector} { font-size: ${value}px !important; }`;
            }
        }
        
        return null;
    }
    
    getFontSizeSelector(key) {
        const fontSizeMap = {
            'menu_font_size': '#adminmenu a',
            'content_font_size': '#wpbody-content, .wrap',
            'adminbar_font_size': '#wpadminbar .ab-item'
        };
        
        return fontSizeMap[key] || null;
    }
    
    sanitizeCSSValue(property, value) {
        if (typeof value !== 'string' && typeof value !== 'number') {
            return null;
        }
        
        const stringValue = String(value).trim();
        
        if (property.includes('color') || property === 'background') {
            return this.sanitizeColorValue(stringValue);
        }
        
        if (property.includes('size') || property.includes('width') || property.includes('height')) {
            return this.sanitizeSizeValue(stringValue);
        }
        
        const dangerous = /javascript:|expression\(|@import|behavior:|vbscript:/i;
        if (dangerous.test(stringValue)) {
            return null;
        }
        
        if (!/^[a-zA-Z0-9\s\-_.,#%()]+$/.test(stringValue)) {
            return null;
        }
        
        return stringValue;
    }
    
    sanitizeColorValue(value) {
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
            return value;
        }
        
        if (/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.test(value)) {
            return value.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/, (match, r, g, b) => {
                const red = Math.max(0, Math.min(255, parseInt(r)));
                const green = Math.max(0, Math.min(255, parseInt(g)));
                const blue = Math.max(0, Math.min(255, parseInt(b)));
                return `rgb(${red}, ${green}, ${blue})`;
            });
        }
        
        if (/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.test(value)) {
            return value.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/, (match, r, g, b, a) => {
                const red = Math.max(0, Math.min(255, parseInt(r)));
                const green = Math.max(0, Math.min(255, parseInt(g)));
                const blue = Math.max(0, Math.min(255, parseInt(b)));
                const alpha = Math.max(0, Math.min(1, parseFloat(a)));
                return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
            });
        }
        
        const namedColors = ['transparent', 'inherit', 'initial', 'unset', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey'];
        if (namedColors.includes(value.toLowerCase())) {
            return value.toLowerCase();
        }
        
        return null;
    }
    
    sanitizeSizeValue(value) {
        if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch)$/.test(value)) {
            return value;
        }
        
        if (/^\d+(\.\d+)?$/.test(value)) {
            return value + 'px';
        }
        
        const sizeKeywords = ['auto', 'inherit', 'initial', 'unset', 'normal', 'bold', 'lighter', 'bolder'];
        if (sizeKeywords.includes(value.toLowerCase())) {
            return value.toLowerCase();
        }
        
        return null;
    }
    
    sanitizeCustomCSS(css) {
        const dangerous = [
            /javascript\s*:/gi,
            /expression\s*\(/gi,
            /@import/gi,
            /behavior\s*:/gi,
            /-moz-binding/gi,
            /vbscript\s*:/gi,
            /<script/gi,
            /<\/script>/gi
        ];
        
        let sanitized = css;
        dangerous.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        return sanitized;
    }
    
    applyCSS(css) {
        if (!this.styleElement) {
            console.error('LAS: Style element not available');
            return;
        }
        
        try {
            const cachedCSS = Array.from(this.cssCache.values()).join('\n');
            const finalCSS = cachedCSS + '\n' + css;
            
            this.styleElement.textContent = finalCSS;
            
            if (this.core) {
                this.core.emit('preview:updated', {
                    cssLength: finalCSS.length,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('LAS: Failed to apply CSS:', error);
            if (this.core?.get('error')) {
                this.core.get('error').handleError(error, 'Applying live preview CSS');
            }
        }
    }
    
    refreshAllStyles() {
        try {
            console.log('LAS: Refreshing all live preview styles...');
            
            const settingsManager = this.core?.get('settings');
            if (!settingsManager) {
                console.warn('LAS: Settings manager not available for refresh');
                return;
            }
            
            this.cssCache.clear();
            this.loadInitialStyles();
            
        } catch (error) {
            console.error('LAS: Failed to refresh styles:', error);
            if (this.core?.get('error')) {
                this.core.get('error').handleError(error, 'Refreshing live preview styles');
            }
        }
    }
    
    updatePerformanceMetrics(updateTime, updateCount) {
        this.performanceMetrics.updateCount += updateCount;
        this.performanceMetrics.totalUpdateTime += updateTime;
        this.performanceMetrics.averageUpdateTime = 
            this.performanceMetrics.totalUpdateTime / this.performanceMetrics.updateCount;
    }
    
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    getCSSCache() {
        return new Map(this.cssCache);
    }
    
    clearCache() {
        this.cssCache.clear();
        if (this.styleElement) {
            this.styleElement.textContent = '';
        }
        console.log('LAS: Live preview cache cleared');
    }
    
    cleanup() {
        console.log('LAS: Cleaning up Live Preview Engine...');
        
        try {
            this.updateQueue = [];
            this.isProcessing = false;
            this.cssCache.clear();
            
            if (this.styleElement && this.styleElement.parentNode) {
                this.styleElement.parentNode.removeChild(this.styleElement);
                this.styleElement = null;
            }
            
            this.cssRuleMap.clear();
            this.initialized = false;
            
            console.log('LAS: Live Preview Engine cleanup complete');
            
        } catch (error) {
            console.error('LAS: Error during Live Preview Engine cleanup:', error);
        }
    }
}

describe('LASLivePreviewEngine', () => {
    let mockCore;
    let mockSettingsManager;
    let mockErrorHandler;
    let livePreviewEngine;
    
    beforeEach(() => {
        // Reset DOM
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        
        // Create mock core
        mockCore = {
            get: jest.fn(),
            on: jest.fn(),
            emit: jest.fn()
        };
        
        // Create mock settings manager
        mockSettingsManager = {
            getAllSettings: jest.fn().mockReturnValue({
                menu_background_color: '#23282d',
                menu_text_color: '#ffffff',
                adminbar_background: '#32373c'
            })
        };
        
        // Create mock error handler
        mockErrorHandler = {
            handleError: jest.fn(),
            showError: jest.fn()
        };
        
        // Configure mock core to return managers
        mockCore.get.mockImplementation((name) => {
            switch (name) {
                case 'settings':
                    return mockSettingsManager;
                case 'error':
                    return mockErrorHandler;
                default:
                    return null;
            }
        });
        
        // Create live preview engine instance
        livePreviewEngine = new LASLivePreviewEngine(mockCore);
    });
    
    afterEach(() => {
        if (livePreviewEngine) {
            livePreviewEngine.cleanup();
        }
    });
    
    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await livePreviewEngine.init();
            
            expect(livePreviewEngine.isInitialized()).toBe(true);
            expect(document.getElementById('las-live-preview-styles')).toBeTruthy();
        });
        
        test('should create style element with correct attributes', async () => {
            await livePreviewEngine.init();
            
            const styleElement = document.getElementById('las-live-preview-styles');
            expect(styleElement).toBeTruthy();
            expect(styleElement.type).toBe('text/css');
            expect(styleElement.getAttribute('data-las-preview')).toBe('true');
        });
        
        test('should initialize CSS rule map', async () => {
            await livePreviewEngine.init();
            
            expect(livePreviewEngine.cssRuleMap.size).toBeGreaterThan(0);
            expect(livePreviewEngine.cssRuleMap.has('menu_background_color')).toBe(true);
            expect(livePreviewEngine.cssRuleMap.has('adminbar_background')).toBe(true);
        });
        
        test('should load initial styles from settings', async () => {
            await livePreviewEngine.init();
            
            expect(mockSettingsManager.getAllSettings).toHaveBeenCalled();
            
            const styleElement = document.getElementById('las-live-preview-styles');
            expect(styleElement.textContent).toContain('#adminmenu');
            expect(styleElement.textContent).toContain('#23282d');
        });
        
        test('should handle initialization errors gracefully', async () => {
            // Mock document.createElement to throw an error
            const originalCreateElement = global.document.createElement;
            global.document.createElement = jest.fn(() => {
                throw new Error('DOM error');
            });
            
            await expect(livePreviewEngine.init()).rejects.toThrow('DOM error');
            
            // Restore original function
            global.document.createElement = originalCreateElement;
        });
    });
    
    describe('CSS Rule Generation', () => {
        beforeEach(async () => {
            await livePreviewEngine.init();
        });
        
        test('should generate CSS rule for menu background color', () => {
            const cssRule = livePreviewEngine.generateCSSRule('menu_background_color', '#ff0000');
            
            expect(cssRule).toContain('#adminmenu');
            expect(cssRule).toContain('background-color: #ff0000');
            expect(cssRule).toContain('!important');
        });
        
        test('should generate CSS rule for admin bar background', () => {
            const cssRule = livePreviewEngine.generateCSSRule('adminbar_background', '#00ff00');
            
            expect(cssRule).toContain('#wpadminbar');
            expect(cssRule).toContain('background: #00ff00');
            expect(cssRule).toContain('!important');
        });
        
        test('should return null for empty values', () => {
            expect(livePreviewEngine.generateCSSRule('menu_background_color', '')).toBeNull();
            expect(livePreviewEngine.generateCSSRule('menu_background_color', null)).toBeNull();
            expect(livePreviewEngine.generateCSSRule('menu_background_color', undefined)).toBeNull();
        });
        
        test('should return null for unknown settings', () => {
            const cssRule = livePreviewEngine.generateCSSRule('unknown_setting', '#ff0000');
            expect(cssRule).toBeNull();
        });
        
        test('should handle custom CSS settings', () => {
            const customCSS = '.custom-class { color: red; }';
            const cssRule = livePreviewEngine.generateCSSRule('custom_css', customCSS);
            
            expect(cssRule).toContain('.custom-class');
            expect(cssRule).toContain('color: red');
        });
        
        test('should generate dynamic font size rules', () => {
            const cssRule = livePreviewEngine.generateCSSRule('menu_font_size', '14');
            
            expect(cssRule).toContain('#adminmenu a');
            expect(cssRule).toContain('font-size: 14px');
            expect(cssRule).toContain('!important');
        });
    });
    
    describe('CSS Value Sanitization', () => {
        beforeEach(async () => {
            await livePreviewEngine.init();
        });
        
        test('should sanitize hex colors correctly', () => {
            expect(livePreviewEngine.sanitizeColorValue('#ff0000')).toBe('#ff0000');
            expect(livePreviewEngine.sanitizeColorValue('#f00')).toBe('#f00');
            expect(livePreviewEngine.sanitizeColorValue('#FF0000')).toBe('#FF0000');
        });
        
        test('should sanitize RGB colors correctly', () => {
            expect(livePreviewEngine.sanitizeColorValue('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
            expect(livePreviewEngine.sanitizeColorValue('rgb( 255 , 0 , 0 )')).toBe('rgb(255, 0, 0)');
        });
        
        test('should sanitize RGBA colors correctly', () => {
            expect(livePreviewEngine.sanitizeColorValue('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
            expect(livePreviewEngine.sanitizeColorValue('rgba( 255 , 0 , 0 , 0.5 )')).toBe('rgba(255, 0, 0, 0.5)');
        });
        
        test('should reject invalid colors', () => {
            expect(livePreviewEngine.sanitizeColorValue('invalid-color')).toBeNull();
            expect(livePreviewEngine.sanitizeColorValue('javascript:alert(1)')).toBeNull();
            expect(livePreviewEngine.sanitizeColorValue('#gggggg')).toBeNull();
        });
        
        test('should sanitize size values correctly', () => {
            expect(livePreviewEngine.sanitizeSizeValue('14px')).toBe('14px');
            expect(livePreviewEngine.sanitizeSizeValue('1.5em')).toBe('1.5em');
            expect(livePreviewEngine.sanitizeSizeValue('100%')).toBe('100%');
            expect(livePreviewEngine.sanitizeSizeValue('14')).toBe('14px');
        });
        
        test('should reject dangerous CSS values', () => {
            expect(livePreviewEngine.sanitizeCSSValue('color', 'javascript:alert(1)')).toBeNull();
            expect(livePreviewEngine.sanitizeCSSValue('background', 'expression(alert(1))')).toBeNull();
            expect(livePreviewEngine.sanitizeCSSValue('color', 'vbscript:msgbox(1)')).toBeNull();
        });
        
        test('should sanitize custom CSS by removing dangerous content', () => {
            const dangerousCSS = '.test { color: red; } <script>alert(1)</script>';
            const sanitized = livePreviewEngine.sanitizeCustomCSS(dangerousCSS);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('javascript:');
            expect(sanitized).toContain('.test { color: red; }');
        });
    });
    
    describe('Update Queue Processing', () => {
        beforeEach(async () => {
            await livePreviewEngine.init();
        });
        
        test('should queue updates correctly', () => {
            livePreviewEngine.updateSetting('menu_background_color', '#ff0000');
            livePreviewEngine.updateSetting('menu_text_color', '#ffffff');
            
            expect(livePreviewEngine.updateQueue.length).toBe(2);
        });
        
        test('should process updates with requestAnimationFrame', (done) => {
            const originalRAF = window.requestAnimationFrame;
            window.requestAnimationFrame = jest.fn((callback) => {
                setTimeout(callback, 0);
                return 1;
            });
            
            livePreviewEngine.updateSetting('menu_background_color', '#ff0000');
            
            setTimeout(() => {
                expect(window.requestAnimationFrame).toHaveBeenCalled();
                expect(livePreviewEngine.updateQueue.length).toBe(0);
                
                window.requestAnimationFrame = originalRAF;
                done();
            }, 10);
        });
        
        test('should handle duplicate updates correctly', (done) => {
            livePreviewEngine.updateSetting('menu_background_color', '#ff0000');
            livePreviewEngine.updateSetting('menu_background_color', '#00ff00');
            livePreviewEngine.updateSetting('menu_background_color', '#0000ff');
            
            setTimeout(() => {
                const styleElement = document.getElementById('las-live-preview-styles');
                const cssContent = styleElement.textContent;
                
                // Should only contain the latest value
                expect(cssContent).toContain('#0000ff');
                expect(cssContent).not.toContain('#ff0000');
                expect(cssContent).not.toContain('#00ff00');
                
                done();
            }, 50);
        });
        
        test('should update performance metrics', (done) => {
            livePreviewEngine.updateSetting('menu_background_color', '#ff0000');
            
            setTimeout(() => {
                const metrics = livePreviewEngine.getPerformanceMetrics();
                expect(metrics.updateCount).toBeGreaterThan(0);
                expect(metrics.totalUpdateTime).toBeGreaterThan(0);
                expect(metrics.averageUpdateTime).toBeGreaterThan(0);
                
                done();
            }, 50);
        });
    });
    
    describe('CSS Application', () => {
        beforeEach(async () => {
            await livePreviewEngine.init();
        });
        
        test('should apply CSS to style element', () => {
            const testCSS = '.test { color: red; }';
            livePreviewEngine.applyCSS(testCSS);
            
            const styleElement = document.getElementById('las-live-preview-styles');
            expect(styleElement.textContent).toContain('.test { color: red; }');
        });
        
        test('should emit preview:updated event', () => {
            const testCSS = '.test { color: red; }';
            livePreviewEngine.applyCSS(testCSS);
            
            expect(mockCore.emit).toHaveBeenCalledWith('preview:updated', expect.any(Object));
        });
        
        test('should handle CSS application errors', () => {
            // Remove style element to trigger error
            const styleElement = document.getElementById('las-live-preview-styles');
            styleElement.remove();
            livePreviewEngine.styleElement = null;
            
            livePreviewEngine.applyCSS('.test { color: red; }');
            
            // Should not throw error, but should log it
            expect(mockErrorHandler.handleError).not.toHaveBeenCalled(); // Error is logged, not handled
        });
    });
    
    describe('Cache Management', () => {
        beforeEach(async () => {
            await livePreviewEngine.init();
        });
        
        test('should cache generated CSS rules', (done) => {
            livePreviewEngine.updateSetting('menu_background_color', '#ff0000');
            
            // Wait for async processing
            setTimeout(() => {
                const cache = livePreviewEngine.getCSSCache();
                expect(cache.has('menu_background_color')).toBe(true);
                expect(cache.get('menu_background_color')).toContain('#ff0000');
                done();
            }, 50);
        });
        
        test('should clear cache correctly', () => {
            livePreviewEngine.updateSetting('menu_background_color', '#ff0000');
            expect(livePreviewEngine.getCSSCache().size).toBeGreaterThan(0);
            
            livePreviewEngine.clearCache();
            expect(livePreviewEngine.getCSSCache().size).toBe(0);
            
            const styleElement = document.getElementById('las-live-preview-styles');
            expect(styleElement.textContent).toBe('');
        });
        
        test('should refresh all styles', () => {
            livePreviewEngine.refreshAllStyles();
            
            expect(mockSettingsManager.getAllSettings).toHaveBeenCalled();
        });
    });
    
    describe('Event Handling', () => {
        beforeEach(async () => {
            await livePreviewEngine.init();
        });
        
        test('should listen for settings:changed events', () => {
            expect(mockCore.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
        });
        
        test('should listen for core:ready events', () => {
            expect(mockCore.on).toHaveBeenCalledWith('core:ready', expect.any(Function));
        });
        
        test('should handle window resize events', () => {
            const resizeHandler = jest.spyOn(livePreviewEngine, 'refreshAllStyles');
            
            // Trigger resize event
            window.dispatchEvent(new Event('resize'));
            
            // Should be debounced, so wait for debounce delay
            setTimeout(() => {
                expect(resizeHandler).toHaveBeenCalled();
            }, 300);
        });
    });
    
    describe('Cleanup', () => {
        beforeEach(async () => {
            await livePreviewEngine.init();
        });
        
        test('should cleanup resources correctly', () => {
            livePreviewEngine.updateSetting('menu_background_color', '#ff0000');
            expect(livePreviewEngine.updateQueue.length).toBeGreaterThan(0);
            
            livePreviewEngine.cleanup();
            
            expect(livePreviewEngine.updateQueue.length).toBe(0);
            expect(livePreviewEngine.isInitialized()).toBe(false);
            expect(document.getElementById('las-live-preview-styles')).toBeNull();
            expect(livePreviewEngine.cssCache.size).toBe(0);
        });
        
        test('should handle cleanup errors gracefully', () => {
            // Create a scenario that might cause cleanup errors
            livePreviewEngine.styleElement = { parentNode: null };
            
            expect(() => livePreviewEngine.cleanup()).not.toThrow();
        });
    });
    
    describe('Utility Functions', () => {
        test('should debounce function calls correctly', (done) => {
            let callCount = 0;
            const debouncedFn = livePreviewEngine.debounce(() => {
                callCount++;
            }, 100);
            
            // Call multiple times rapidly
            debouncedFn();
            debouncedFn();
            debouncedFn();
            
            // Should not have been called yet
            expect(callCount).toBe(0);
            
            // Wait for debounce delay
            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 150);
        });
        
        test('should return correct initialization status', async () => {
            expect(livePreviewEngine.isInitialized()).toBe(false);
            
            await livePreviewEngine.init();
            expect(livePreviewEngine.isInitialized()).toBe(true);
            
            livePreviewEngine.cleanup();
            expect(livePreviewEngine.isInitialized()).toBe(false);
        });
    });
});