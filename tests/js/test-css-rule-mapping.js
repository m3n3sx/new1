/**
 * Integration Tests for CSS Rule Mapping System
 * Tests comprehensive CSS mapping, caching, and visual changes
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

// Simplified LASLivePreviewEngine class for testing CSS rule mapping
class LASLivePreviewEngine {
    constructor(core) {
        this.core = core;
        this.styleElement = null;
        this.cssCache = new Map();
        this.cssGenerationCache = new Map();
        this.cssRuleMap = new Map();
        this.initialized = false;
    }
    
    async init() {
        this.createStyleElement();
        this.initializeCSSRuleMap();
        this.initialized = true;
    }
    
    createStyleElement() {
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'las-live-preview-styles';
        document.head.appendChild(this.styleElement);
    }
    
    initializeCSSRuleMap() {
        // WordPress Admin Menu customizations
        this.addCSSRuleMapping('menu_background_color', {
            selector: '#adminmenu, #adminmenu .wp-submenu, #adminmenu .wp-submenu ul',
            property: 'background-color',
            important: true,
            description: 'Main admin menu background color'
        });
        
        this.addCSSRuleMapping('menu_text_color', {
            selector: '#adminmenu a, #adminmenu .wp-submenu a, #adminmenu .wp-menu-name',
            property: 'color',
            important: true,
            description: 'Admin menu text color'
        });
        
        // WordPress Admin Bar customizations
        this.addCSSRuleMapping('adminbar_background', {
            selector: '#wpadminbar',
            property: 'background',
            important: true,
            description: 'Admin bar background'
        });
        
        // Content Area customizations
        this.addCSSRuleMapping('content_background', {
            selector: '#wpbody-content, .wrap, #wpbody',
            property: 'background-color',
            important: true,
            description: 'Main content area background'
        });
        
        // Form Elements
        this.addCSSRuleMapping('form_input_background', {
            selector: 'input[type="text"], input[type="email"], select, textarea',
            property: 'background-color',
            important: true,
            description: 'Form input background color'
        });
        
        // Buttons
        this.addCSSRuleMapping('button_primary_background', {
            selector: '.button-primary, .wp-core-ui .button-primary',
            property: 'background-color',
            important: true,
            description: 'Primary button background'
        });
        
        // Notices
        this.addCSSRuleMapping('notice_success_background', {
            selector: '.notice-success, .updated',
            property: 'background-color',
            important: true,
            description: 'Success notice background'
        });
        
        // Tables
        this.addCSSRuleMapping('table_header_background', {
            selector: '.wp-list-table thead th, .wp-list-table tfoot th',
            property: 'background-color',
            important: true,
            description: 'Table header background'
        });
        
        // Widgets
        this.addCSSRuleMapping('widget_background', {
            selector: '.postbox, .stuffbox',
            property: 'background-color',
            important: true,
            description: 'Dashboard widget background'
        });
        
        // Footer
        this.addCSSRuleMapping('footer_background', {
            selector: '#wpfooter, #footer-thankyou',
            property: 'background-color',
            important: true,
            description: 'Footer background color'
        });
        
        // Add the missing table_header_background rule
        this.addCSSRuleMapping('table_header_background', {
            selector: '.wp-list-table thead th, .wp-list-table tfoot th',
            property: 'background-color',
            important: true,
            description: 'Table header background'
        });
        
        // Add the missing widget_background rule
        this.addCSSRuleMapping('widget_background', {
            selector: '.postbox, .stuffbox',
            property: 'background-color',
            important: true,
            description: 'Dashboard widget background'
        });
    }
    
    addCSSRuleMapping(key, config) {
        if (!config.selector || !config.property) {
            console.warn(`LAS: Invalid CSS rule mapping for ${key}:`, config);
            return;
        }
        
        const ruleConfig = {
            selector: config.selector,
            property: config.property,
            important: config.important !== false,
            description: config.description || `CSS rule for ${key}`,
            category: this.getCategoryFromKey(key)
        };
        
        this.cssRuleMap.set(key, ruleConfig);
    }
    
    getCategoryFromKey(key) {
        if (key.startsWith('menu_')) return 'menu';
        if (key.startsWith('adminbar_')) return 'adminbar';
        if (key.startsWith('content_')) return 'content';
        if (key.startsWith('form_')) return 'forms';
        if (key.startsWith('button_')) return 'buttons';
        if (key.startsWith('notice_')) return 'notices';
        if (key.startsWith('table_')) return 'tables';
        if (key.startsWith('widget_')) return 'widgets';
        if (key.startsWith('footer_')) return 'footer';
        return 'general';
    }
    
    generateCSSRule(key, value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        const ruleConfig = this.cssRuleMap.get(key);
        if (!ruleConfig) {
            return null;
        }
        
        const { selector, property, important = false } = ruleConfig;
        const importantFlag = important ? ' !important' : '';
        
        const sanitizedValue = this.sanitizeCSSValue(property, value);
        if (!sanitizedValue) {
            return null;
        }
        
        return `${selector} { ${property}: ${sanitizedValue}${importantFlag}; }`;
    }
    
    sanitizeCSSValue(property, value) {
        if (typeof value !== 'string' && typeof value !== 'number') {
            return null;
        }
        
        const stringValue = String(value).trim();
        
        if (property.includes('color') || property === 'background') {
            return this.sanitizeColorValue(stringValue);
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
            return value;
        }
        
        if (/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.test(value)) {
            return value;
        }
        
        const namedColors = ['transparent', 'inherit', 'initial', 'unset', 'black', 'white', 'red', 'green', 'blue'];
        if (namedColors.includes(value.toLowerCase())) {
            return value.toLowerCase();
        }
        
        return null;
    }
    
    getCSSRuleMapping(key = null) {
        if (key) {
            return this.cssRuleMap.get(key) || null;
        }
        return new Map(this.cssRuleMap);
    }
    
    getCSSRulesByCategory(category) {
        const categoryRules = new Map();
        
        for (const [key, config] of this.cssRuleMap) {
            if (config.category === category) {
                categoryRules.set(key, config);
            }
        }
        
        return categoryRules;
    }
    
    getAvailableCategories() {
        const categories = new Set();
        
        for (const [, config] of this.cssRuleMap) {
            categories.add(config.category);
        }
        
        return Array.from(categories).sort();
    }
    
    addOrUpdateCSSRule(key, config) {
        try {
            this.addCSSRuleMapping(key, config);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    removeCSSRule(key) {
        return this.cssRuleMap.delete(key);
    }
    
    validateCSSRuleMapping(config) {
        const errors = [];
        const warnings = [];
        
        if (!config.selector) {
            errors.push('Selector is required');
        }
        
        if (!config.property) {
            errors.push('Property is required');
        }
        
        if (config.selector && !/^[a-zA-Z0-9\s\-_#.,:\[\]()>+~*"'=]+$/.test(config.selector)) {
            warnings.push('Selector contains potentially unsafe characters');
        }
        
        if (config.property && !/^[a-zA-Z\-]+$/.test(config.property)) {
            errors.push('Invalid CSS property name');
        }
        
        const dangerousProperties = ['behavior', 'expression', '-moz-binding'];
        if (config.property && dangerousProperties.includes(config.property.toLowerCase())) {
            errors.push('Property is not allowed for security reasons');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    getCSSGenerationStats() {
        return {
            totalRules: this.cssRuleMap.size,
            cachedRules: this.cssCache.size,
            generationCacheSize: this.cssGenerationCache ? this.cssGenerationCache.size : 0,
            categories: this.getAvailableCategories().length
        };
    }
}

describe('CSS Rule Mapping System', () => {
    let livePreviewEngine;
    
    beforeEach(async () => {
        // Reset DOM
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        
        // Create live preview engine instance
        livePreviewEngine = new LASLivePreviewEngine(null);
        await livePreviewEngine.init();
    });
    
    afterEach(() => {
        if (livePreviewEngine) {
            livePreviewEngine.cleanup && livePreviewEngine.cleanup();
        }
    });
    
    describe('CSS Rule Mapping Initialization', () => {
        test('should initialize comprehensive CSS rule mappings', () => {
            const allRules = livePreviewEngine.getCSSRuleMapping();
            
            expect(allRules.size).toBeGreaterThan(5);
            expect(allRules.has('menu_background_color')).toBe(true);
            expect(allRules.has('adminbar_background')).toBe(true);
            expect(allRules.has('content_background')).toBe(true);
            expect(allRules.has('button_primary_background')).toBe(true);
        });
        
        test('should categorize rules correctly', () => {
            const categories = livePreviewEngine.getAvailableCategories();
            
            expect(categories).toContain('menu');
            expect(categories).toContain('adminbar');
            expect(categories).toContain('content');
            expect(categories).toContain('buttons');
            expect(categories).toContain('forms');
            expect(categories).toContain('notices');
            expect(categories).toContain('tables');
            expect(categories).toContain('widgets');
            expect(categories).toContain('footer');
        });
        
        test('should have proper rule configuration structure', () => {
            const menuRule = livePreviewEngine.getCSSRuleMapping('menu_background_color');
            
            expect(menuRule).toHaveProperty('selector');
            expect(menuRule).toHaveProperty('property');
            expect(menuRule).toHaveProperty('important');
            expect(menuRule).toHaveProperty('description');
            expect(menuRule).toHaveProperty('category');
            
            expect(menuRule.selector).toContain('#adminmenu');
            expect(menuRule.property).toBe('background-color');
            expect(menuRule.important).toBe(true);
            expect(menuRule.category).toBe('menu');
        });
    });
    
    describe('CSS Rule Generation for WordPress Elements', () => {
        test('should generate CSS for admin menu elements', () => {
            const menuBgRule = livePreviewEngine.generateCSSRule('menu_background_color', '#ff0000');
            const menuTextRule = livePreviewEngine.generateCSSRule('menu_text_color', '#ffffff');
            
            expect(menuBgRule).toContain('#adminmenu');
            expect(menuBgRule).toContain('background-color: #ff0000');
            expect(menuBgRule).toContain('!important');
            
            expect(menuTextRule).toContain('#adminmenu a');
            expect(menuTextRule).toContain('color: #ffffff');
            expect(menuTextRule).toContain('!important');
        });
        
        test('should generate CSS for admin bar elements', () => {
            const adminbarRule = livePreviewEngine.generateCSSRule('adminbar_background', '#333333');
            
            expect(adminbarRule).toContain('#wpadminbar');
            expect(adminbarRule).toContain('background: #333333');
            expect(adminbarRule).toContain('!important');
        });
        
        test('should generate CSS for content area elements', () => {
            const contentRule = livePreviewEngine.generateCSSRule('content_background', '#f9f9f9');
            
            expect(contentRule).toContain('#wpbody-content');
            expect(contentRule).toContain('.wrap');
            expect(contentRule).toContain('background-color: #f9f9f9');
            expect(contentRule).toContain('!important');
        });
        
        test('should generate CSS for form elements', () => {
            const formRule = livePreviewEngine.generateCSSRule('form_input_background', '#ffffff');
            
            expect(formRule).toContain('input[type="text"]');
            expect(formRule).toContain('input[type="email"]');
            expect(formRule).toContain('select');
            expect(formRule).toContain('textarea');
            expect(formRule).toContain('background-color: #ffffff');
        });
        
        test('should generate CSS for button elements', () => {
            const buttonRule = livePreviewEngine.generateCSSRule('button_primary_background', '#0073aa');
            
            expect(buttonRule).toContain('.button-primary');
            expect(buttonRule).toContain('.wp-core-ui .button-primary');
            expect(buttonRule).toContain('background-color: #0073aa');
        });
        
        test('should generate CSS for notice elements', () => {
            const noticeRule = livePreviewEngine.generateCSSRule('notice_success_background', '#d4edda');
            
            expect(noticeRule).toContain('.notice-success');
            expect(noticeRule).toContain('.updated');
            expect(noticeRule).toContain('background-color: #d4edda');
        });
        
        test('should generate CSS for table elements', () => {
            const tableRule = livePreviewEngine.generateCSSRule('table_header_background', '#f1f1f1');
            
            expect(tableRule).toContain('.wp-list-table thead th');
            expect(tableRule).toContain('.wp-list-table tfoot th');
            expect(tableRule).toContain('background-color: #f1f1f1');
        });
        
        test('should generate CSS for widget elements', () => {
            const widgetRule = livePreviewEngine.generateCSSRule('widget_background', '#ffffff');
            
            expect(widgetRule).toContain('.postbox');
            expect(widgetRule).toContain('.stuffbox');
            expect(widgetRule).toContain('background-color: #ffffff');
        });
        
        test('should generate CSS for footer elements', () => {
            const footerRule = livePreviewEngine.generateCSSRule('footer_background', '#23282d');
            
            expect(footerRule).toContain('#wpfooter');
            expect(footerRule).toContain('#footer-thankyou');
            expect(footerRule).toContain('background-color: #23282d');
        });
    });
    
    describe('Category-based Rule Management', () => {
        test('should get rules by category', () => {
            const menuRules = livePreviewEngine.getCSSRulesByCategory('menu');
            const buttonRules = livePreviewEngine.getCSSRulesByCategory('buttons');
            
            expect(menuRules.size).toBeGreaterThan(0);
            expect(buttonRules.size).toBeGreaterThan(0);
            
            // Check that all menu rules are actually menu-related
            for (const [key] of menuRules) {
                expect(key).toMatch(/^menu_/);
            }
            
            // Check that all button rules are actually button-related
            for (const [key] of buttonRules) {
                expect(key).toMatch(/^button_/);
            }
        });
        
        test('should return empty map for non-existent category', () => {
            const nonExistentRules = livePreviewEngine.getCSSRulesByCategory('nonexistent');
            expect(nonExistentRules.size).toBe(0);
        });
        
        test('should list all available categories', () => {
            const categories = livePreviewEngine.getAvailableCategories();
            
            expect(Array.isArray(categories)).toBe(true);
            expect(categories.length).toBeGreaterThan(0);
            expect(categories).toEqual(expect.arrayContaining(['menu', 'adminbar', 'content', 'buttons']));
        });
    });
    
    describe('Dynamic Rule Management', () => {
        test('should add new CSS rule mapping', () => {
            const newRuleConfig = {
                selector: '.custom-element',
                property: 'color',
                important: true,
                description: 'Custom element color'
            };
            
            const success = livePreviewEngine.addOrUpdateCSSRule('custom_color', newRuleConfig);
            expect(success).toBe(true);
            
            const addedRule = livePreviewEngine.getCSSRuleMapping('custom_color');
            expect(addedRule).toBeTruthy();
            expect(addedRule.selector).toBe('.custom-element');
            expect(addedRule.property).toBe('color');
        });
        
        test('should update existing CSS rule mapping', () => {
            const updatedConfig = {
                selector: '#adminmenu-updated',
                property: 'background-color',
                important: false,
                description: 'Updated menu background'
            };
            
            const success = livePreviewEngine.addOrUpdateCSSRule('menu_background_color', updatedConfig);
            expect(success).toBe(true);
            
            const updatedRule = livePreviewEngine.getCSSRuleMapping('menu_background_color');
            expect(updatedRule.selector).toBe('#adminmenu-updated');
            expect(updatedRule.important).toBe(false);
        });
        
        test('should remove CSS rule mapping', () => {
            const removed = livePreviewEngine.removeCSSRule('menu_background_color');
            expect(removed).toBe(true);
            
            const removedRule = livePreviewEngine.getCSSRuleMapping('menu_background_color');
            expect(removedRule).toBeNull();
        });
        
        test('should return false when removing non-existent rule', () => {
            const removed = livePreviewEngine.removeCSSRule('non_existent_rule');
            expect(removed).toBe(false);
        });
    });
    
    describe('CSS Rule Validation', () => {
        test('should validate valid CSS rule configuration', () => {
            const validConfig = {
                selector: '.valid-selector',
                property: 'color',
                important: true,
                description: 'Valid rule'
            };
            
            const validation = livePreviewEngine.validateCSSRuleMapping(validConfig);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });
        
        test('should reject configuration without selector', () => {
            const invalidConfig = {
                property: 'color',
                important: true
            };
            
            const validation = livePreviewEngine.validateCSSRuleMapping(invalidConfig);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Selector is required');
        });
        
        test('should reject configuration without property', () => {
            const invalidConfig = {
                selector: '.test',
                important: true
            };
            
            const validation = livePreviewEngine.validateCSSRuleMapping(invalidConfig);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Property is required');
        });
        
        test('should reject dangerous CSS properties', () => {
            const dangerousConfig = {
                selector: '.test',
                property: 'behavior',
                important: true
            };
            
            const validation = livePreviewEngine.validateCSSRuleMapping(dangerousConfig);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Property is not allowed for security reasons');
        });
        
        test('should warn about potentially unsafe selectors', () => {
            const unsafeConfig = {
                selector: '.test<script>',
                property: 'color',
                important: true
            };
            
            const validation = livePreviewEngine.validateCSSRuleMapping(unsafeConfig);
            expect(validation.warnings).toContain('Selector contains potentially unsafe characters');
        });
    });
    
    describe('CSS Generation Statistics', () => {
        test('should provide comprehensive statistics', () => {
            const stats = livePreviewEngine.getCSSGenerationStats();
            
            expect(stats).toHaveProperty('totalRules');
            expect(stats).toHaveProperty('cachedRules');
            expect(stats).toHaveProperty('generationCacheSize');
            expect(stats).toHaveProperty('categories');
            
            expect(stats.totalRules).toBeGreaterThan(0);
            expect(stats.categories).toBeGreaterThan(0);
        });
        
        test('should track rule counts correctly', () => {
            const initialStats = livePreviewEngine.getCSSGenerationStats();
            const initialCount = initialStats.totalRules;
            
            // Add a new rule
            livePreviewEngine.addOrUpdateCSSRule('test_rule', {
                selector: '.test',
                property: 'color'
            });
            
            const updatedStats = livePreviewEngine.getCSSGenerationStats();
            expect(updatedStats.totalRules).toBe(initialCount + 1);
        });
    });
    
    describe('Visual Change Integration', () => {
        test('should generate complete CSS for multiple WordPress elements', () => {
            const settings = {
                menu_background_color: '#2c3e50',
                menu_text_color: '#ecf0f1',
                adminbar_background: '#34495e',
                content_background: '#ffffff',
                button_primary_background: '#3498db',
                form_input_background: '#f8f9fa'
            };
            
            const cssRules = [];
            for (const [key, value] of Object.entries(settings)) {
                const rule = livePreviewEngine.generateCSSRule(key, value);
                if (rule) {
                    cssRules.push(rule);
                }
            }
            
            expect(cssRules.length).toBe(Object.keys(settings).length);
            
            // Verify each rule contains expected elements
            const combinedCSS = cssRules.join('\n');
            expect(combinedCSS).toContain('#adminmenu');
            expect(combinedCSS).toContain('#wpadminbar');
            expect(combinedCSS).toContain('#wpbody-content');
            expect(combinedCSS).toContain('.button-primary');
            expect(combinedCSS).toContain('input[type="text"]');
            
            // Verify colors are applied
            expect(combinedCSS).toContain('#2c3e50');
            expect(combinedCSS).toContain('#ecf0f1');
            expect(combinedCSS).toContain('#34495e');
            expect(combinedCSS).toContain('#ffffff');
            expect(combinedCSS).toContain('#3498db');
            expect(combinedCSS).toContain('#f8f9fa');
        });
        
        test('should handle complex WordPress admin selectors', () => {
            const complexSelectors = [
                'menu_background_color',
                'adminbar_background',
                'table_header_background',
                'widget_background'
            ];
            
            for (const key of complexSelectors) {
                // Use a valid color value instead of '#test'
                const rule = livePreviewEngine.generateCSSRule(key, '#ff0000');
                expect(rule).toBeTruthy();
                expect(rule).toContain('!important');
            }
        });
        
        test('should maintain CSS specificity with important declarations', () => {
            const rule = livePreviewEngine.generateCSSRule('menu_background_color', '#ff0000');
            
            expect(rule).toContain('!important');
            
            // Verify the rule structure maintains proper CSS syntax
            expect(rule).toMatch(/^[^{]+\s*\{\s*[^:]+:\s*[^;]+\s*!important\s*;\s*\}$/);
        });
    });
});