/**
 * Live Preview Module
 * 
 * Handles real-time CSS injection and style updates for live preview functionality
 * Provides debounced updates and comprehensive error handling
 * 
 * @since 2.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * LivePreview Class
     */
    class LivePreview {
        constructor(core) {
            this.core = core;
            this.styleElements = new Map();
            this.debounceTimers = new Map();
            this.debounceDelay = 300; // 300ms debounce delay
            
            // CSS generation cache
            this.cssCache = new Map();
            this.cacheEnabled = true;
            
            // Performance monitoring
            this.updateCount = 0;
            this.lastUpdateTime = 0;
            
            // Style mapping configuration
            this.styleMap = this.initializeStyleMap();
            
            this.init();
        }

        /**
         * Initialize the live preview system
         */
        init() {
            this.createStyleElements();
            this.setupEventListeners();
            this.loadInitialStyles();
            
            this.core.log('LivePreview initialized', {
                styleElements: this.styleElements.size,
                styleMapKeys: Object.keys(this.styleMap).length
            });
        }

        /**
         * Initialize style mapping configuration
         * Maps setting keys to CSS selectors and properties
         */
        initializeStyleMap() {
            return {
                // Admin Menu Styles
                'menu.background_color': {
                    selector: '#adminmenu, #adminmenu .wp-submenu',
                    property: 'background-color',
                    cssVar: '--las-menu-bg'
                },
                'menu.text_color': {
                    selector: '#adminmenu a',
                    property: 'color',
                    cssVar: '--las-menu-text'
                },
                'menu.hover_color': {
                    selector: '#adminmenu a:hover, #adminmenu li.opensub > a, #adminmenu li > a.wp-has-current-submenu',
                    property: 'color',
                    cssVar: '--las-menu-hover'
                },
                'menu.active_color': {
                    selector: '#adminmenu .wp-has-current-submenu a, #adminmenu .current a',
                    property: 'color',
                    cssVar: '--las-menu-active'
                },
                
                // Admin Bar Styles
                'adminbar.background_color': {
                    selector: '#wpadminbar',
                    property: 'background-color',
                    cssVar: '--las-adminbar-bg'
                },
                'adminbar.text_color': {
                    selector: '#wpadminbar .ab-item, #wpadminbar a.ab-item',
                    property: 'color',
                    cssVar: '--las-adminbar-text'
                },
                'adminbar.height': {
                    selector: '#wpadminbar',
                    property: 'height',
                    cssVar: '--las-adminbar-height'
                },
                
                // Content Area Styles
                'content.background_color': {
                    selector: 'body, #wpbody-content',
                    property: 'background-color',
                    cssVar: '--las-content-bg'
                },
                'content.font_family': {
                    selector: 'body, #wpbody-content',
                    property: 'font-family',
                    cssVar: '--las-content-font'
                },
                'content.font_size': {
                    selector: 'body, #wpbody-content',
                    property: 'font-size',
                    cssVar: '--las-content-font-size'
                },
                
                // Form Styles
                'forms.input_background': {
                    selector: 'input[type="text"], input[type="email"], input[type="password"], textarea, select',
                    property: 'background-color',
                    cssVar: '--las-input-bg'
                },
                'forms.input_border': {
                    selector: 'input[type="text"], input[type="email"], input[type="password"], textarea, select',
                    property: 'border-color',
                    cssVar: '--las-input-border'
                },
                'forms.button_primary': {
                    selector: '.button-primary',
                    property: 'background-color',
                    cssVar: '--las-button-primary'
                },
                
                // Custom CSS
                'advanced.custom_css': {
                    selector: null, // Special handling for custom CSS
                    property: null,
                    cssVar: null
                }
            };
        }

        /**
         * Create style elements for different contexts
         */
        createStyleElements() {
            // Main preview styles
            this.createStyleElement('main', 'las-live-preview-main');
            
            // CSS variables
            this.createStyleElement('variables', 'las-live-preview-vars');
            
            // Custom CSS
            this.createStyleElement('custom', 'las-live-preview-custom');
            
            // Responsive styles
            this.createStyleElement('responsive', 'las-live-preview-responsive');
        }

        /**
         * Create a single style element
         * @param {string} key - Style element key
         * @param {string} id - Element ID
         */
        createStyleElement(key, id) {
            // Remove existing element if present
            const existing = document.getElementById(id);
            if (existing) {
                existing.remove();
            }
            
            const styleElement = document.createElement('style');
            styleElement.id = id;
            styleElement.type = 'text/css';
            
            // Add to head
            document.head.appendChild(styleElement);
            
            // Store reference
            this.styleElements.set(key, styleElement);
            
            this.core.log(`Style element created: ${key}`, { id });
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Listen for settings changes
            this.core.on('settings:changed', (data) => {
                this.handleSettingChange(data.key, data.value, data.oldValue);
            });
            
            // Listen for bulk settings changes
            this.core.on('settings:bulk-changed', (data) => {
                this.handleBulkSettingChange(data.changes);
            });
            
            // Listen for settings sync from other tabs
            this.core.on('settings:synced', (data) => {
                this.handleSyncedChanges(data.changes);
            });
            
            // Listen for theme changes
            this.core.on('theme:changed', (data) => {
                this.handleThemeChange(data.theme);
            });
            
            // Performance monitoring
            this.core.on('core:ready', () => {
                this.startPerformanceMonitoring();
            });
        }

        /**
         * Load initial styles from current settings
         */
        async loadInitialStyles() {
            try {
                const settingsManager = this.core.getModule('settings-manager');
                if (!settingsManager) {
                    this.core.log('SettingsManager not available, skipping initial styles');
                    return;
                }
                
                const settings = settingsManager.getAll();
                this.generateAndApplyStyles(settings);
                
                this.core.emit('preview:initial-load', { settings });
                
            } catch (error) {
                this.core.handleError('Failed to load initial styles', error);
            }
        }

        /**
         * Handle individual setting change
         * @param {string} key - Setting key
         * @param {*} value - New value
         * @param {*} oldValue - Old value
         */
        handleSettingChange(key, value, oldValue) {
            try {
                this.debouncedUpdate(key, () => {
                    this.updateStyleForSetting(key, value);
                    this.core.emit('preview:updated', { key, value, oldValue });
                });
            } catch (error) {
                this.core.handleError(`Failed to handle setting change: ${key}`, error);
            }
        }

        /**
         * Handle bulk setting changes
         * @param {Object} changes - Changes object
         */
        handleBulkSettingChange(changes) {
            try {
                this.debouncedUpdate('bulk', () => {
                    const settings = {};
                    Object.entries(changes).forEach(([key, change]) => {
                        settings[key] = change.value;
                    });
                    
                    this.generateAndApplyStyles(settings);
                    this.core.emit('preview:bulk-updated', { changes });
                });
            } catch (error) {
                this.core.handleError('Failed to handle bulk setting changes', error);
            }
        }

        /**
         * Handle synced changes from other tabs
         * @param {Object} changes - Synced changes
         */
        handleSyncedChanges(changes) {
            try {
                // Apply changes immediately (no debouncing for sync)
                this.generateAndApplyStyles(changes);
                this.core.emit('preview:synced', { changes });
            } catch (error) {
                this.core.handleError('Failed to handle synced changes', error);
            }
        }

        /**
         * Handle theme changes
         * @param {string} theme - Theme name
         */
        handleThemeChange(theme) {
            try {
                this.debouncedUpdate('theme', () => {
                    this.applyThemeStyles(theme);
                    this.core.emit('preview:theme-changed', { theme });
                });
            } catch (error) {
                this.core.handleError(`Failed to handle theme change: ${theme}`, error);
            }
        }

        /**
         * Debounced update mechanism
         * @param {string} key - Update key
         * @param {Function} callback - Update callback
         */
        debouncedUpdate(key, callback) {
            // Clear existing timer
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            // Set new timer
            const timer = setTimeout(() => {
                try {
                    callback();
                    this.debounceTimers.delete(key);
                    this.updatePerformanceMetrics();
                } catch (error) {
                    this.core.handleError(`Debounced update error for ${key}`, error);
                }
            }, this.debounceDelay);
            
            this.debounceTimers.set(key, timer);
        }

        /**
         * Update style for a specific setting
         * @param {string} key - Setting key
         * @param {*} value - Setting value
         */
        updateStyleForSetting(key, value) {
            const styleConfig = this.styleMap[key];
            if (!styleConfig) {
                // Handle custom CSS separately
                if (key === 'advanced.custom_css') {
                    this.updateCustomCSS(value);
                }
                return;
            }
            
            const css = this.generateCSSForSetting(key, value, styleConfig);
            this.applyCSS('main', css, key);
        }

        /**
         * Generate and apply styles for multiple settings
         * @param {Object} settings - Settings object
         */
        generateAndApplyStyles(settings) {
            const startTime = performance.now();
            
            try {
                // Generate CSS variables
                const variablesCSS = this.generateVariablesCSS(settings);
                this.applyCSS('variables', variablesCSS);
                
                // Generate main styles
                const mainCSS = this.generateMainCSS(settings);
                this.applyCSS('main', mainCSS);
                
                // Handle custom CSS
                if (settings['advanced.custom_css']) {
                    this.updateCustomCSS(settings['advanced.custom_css']);
                }
                
                // Generate responsive styles
                const responsiveCSS = this.generateResponsiveCSS(settings);
                this.applyCSS('responsive', responsiveCSS);
                
                const endTime = performance.now();
                this.core.log(`Styles generated and applied in ${endTime - startTime}ms`);
                
            } catch (error) {
                this.core.handleError('Failed to generate and apply styles', error);
            }
        }

        /**
         * Generate CSS variables from settings
         * @param {Object} settings - Settings object
         * @returns {string} CSS variables
         */
        generateVariablesCSS(settings) {
            const cacheKey = 'variables-' + JSON.stringify(settings);
            if (this.cacheEnabled && this.cssCache.has(cacheKey)) {
                return this.cssCache.get(cacheKey);
            }
            
            const variables = [];
            
            Object.entries(settings).forEach(([key, value]) => {
                const styleConfig = this.styleMap[key];
                if (styleConfig && styleConfig.cssVar) {
                    const processedValue = this.processValue(value, styleConfig.property);
                    variables.push(`  ${styleConfig.cssVar}: ${processedValue};`);
                }
            });
            
            const css = variables.length > 0 ? `:root {\n${variables.join('\n')}\n}` : '';
            
            if (this.cacheEnabled) {
                this.cssCache.set(cacheKey, css);
            }
            
            return css;
        }

        /**
         * Generate main CSS from settings
         * @param {Object} settings - Settings object
         * @returns {string} Main CSS
         */
        generateMainCSS(settings) {
            const cacheKey = 'main-' + JSON.stringify(settings);
            if (this.cacheEnabled && this.cssCache.has(cacheKey)) {
                return this.cssCache.get(cacheKey);
            }
            
            const cssRules = [];
            
            Object.entries(settings).forEach(([key, value]) => {
                const css = this.generateCSSForSetting(key, value, this.styleMap[key]);
                if (css) {
                    cssRules.push(css);
                }
            });
            
            const css = cssRules.join('\n\n');
            
            if (this.cacheEnabled) {
                this.cssCache.set(cacheKey, css);
            }
            
            return css;
        }

        /**
         * Generate CSS for a specific setting
         * @param {string} key - Setting key
         * @param {*} value - Setting value
         * @param {Object} styleConfig - Style configuration
         * @returns {string} CSS rule
         */
        generateCSSForSetting(key, value, styleConfig) {
            if (!styleConfig || !styleConfig.selector || !styleConfig.property) {
                return '';
            }
            
            const processedValue = this.processValue(value, styleConfig.property);
            if (!processedValue) {
                return '';
            }
            
            return `${styleConfig.selector} {\n  ${styleConfig.property}: ${processedValue};\n}`;
        }

        /**
         * Generate responsive CSS
         * @param {Object} settings - Settings object
         * @returns {string} Responsive CSS
         */
        generateResponsiveCSS(settings) {
            const responsiveRules = [];
            
            // Mobile styles
            const mobileRules = [];
            if (settings['mobile.menu_collapse']) {
                mobileRules.push('#adminmenu { display: none; }');
            }
            
            if (mobileRules.length > 0) {
                responsiveRules.push(`@media (max-width: 782px) {\n  ${mobileRules.join('\n  ')}\n}`);
            }
            
            // Tablet styles
            const tabletRules = [];
            if (settings['tablet.sidebar_width']) {
                tabletRules.push(`#adminmenuwrap { width: ${settings['tablet.sidebar_width']}; }`);
            }
            
            if (tabletRules.length > 0) {
                responsiveRules.push(`@media (min-width: 783px) and (max-width: 1024px) {\n  ${tabletRules.join('\n  ')}\n}`);
            }
            
            return responsiveRules.join('\n\n');
        }

        /**
         * Process value based on CSS property type
         * @param {*} value - Raw value
         * @param {string} property - CSS property
         * @returns {string} Processed value
         */
        processValue(value, property) {
            if (!value) return '';
            
            // Color properties
            if (property.includes('color') || property.includes('background')) {
                return this.processColorValue(value);
            }
            
            // Size properties
            if (property.includes('width') || property.includes('height') || property.includes('size')) {
                return this.processSizeValue(value);
            }
            
            // Font family
            if (property === 'font-family') {
                return this.processFontFamily(value);
            }
            
            return value;
        }

        /**
         * Process color values
         * @param {string} value - Color value
         * @returns {string} Processed color
         */
        processColorValue(value) {
            // Ensure hex colors have #
            if (/^[0-9A-Fa-f]{6}$/.test(value)) {
                return `#${value}`;
            }
            
            // Validate hex colors
            if (/^#[0-9A-Fa-f]{3,6}$/.test(value)) {
                return value;
            }
            
            // Handle RGB/RGBA
            if (value.startsWith('rgb')) {
                return value;
            }
            
            // Handle HSL/HSLA
            if (value.startsWith('hsl')) {
                return value;
            }
            
            // Handle CSS color names
            const cssColors = ['transparent', 'inherit', 'initial', 'unset', 'currentColor'];
            if (cssColors.includes(value)) {
                return value;
            }
            
            return value;
        }

        /**
         * Process size values
         * @param {string} value - Size value
         * @returns {string} Processed size
         */
        processSizeValue(value) {
            // If already has unit, return as-is
            if (/\d+(px|em|rem|%|vh|vw)$/.test(value)) {
                return value;
            }
            
            // If numeric, add px
            if (/^\d+$/.test(value)) {
                return `${value}px`;
            }
            
            return value;
        }

        /**
         * Process font family values
         * @param {string} value - Font family value
         * @returns {string} Processed font family
         */
        processFontFamily(value) {
            const fontMap = {
                'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                'arial': 'Arial, sans-serif',
                'helvetica': 'Helvetica, Arial, sans-serif',
                'georgia': 'Georgia, serif',
                'times': '"Times New Roman", Times, serif'
            };
            
            return fontMap[value] || value;
        }

        /**
         * Update custom CSS
         * @param {string} css - Custom CSS
         */
        updateCustomCSS(css) {
            try {
                // Sanitize CSS (basic security)
                const sanitizedCSS = this.sanitizeCSS(css);
                this.applyCSS('custom', sanitizedCSS);
            } catch (error) {
                this.core.handleError('Failed to update custom CSS', error);
            }
        }

        /**
         * Basic CSS sanitization
         * @param {string} css - CSS to sanitize
         * @returns {string} Sanitized CSS
         */
        sanitizeCSS(css) {
            // Remove potentially dangerous content
            const dangerous = [
                /javascript:/gi,
                /expression\(/gi,
                /@import/gi,
                /behavior:/gi,
                /-moz-binding/gi
            ];
            
            let sanitized = css;
            dangerous.forEach(pattern => {
                sanitized = sanitized.replace(pattern, '');
            });
            
            return sanitized;
        }

        /**
         * Apply CSS to a style element
         * @param {string} elementKey - Style element key
         * @param {string} css - CSS to apply
         * @param {string} context - Context for logging
         */
        applyCSS(elementKey, css, context = '') {
            const styleElement = this.styleElements.get(elementKey);
            if (!styleElement) {
                this.core.handleError(`Style element not found: ${elementKey}`);
                return;
            }
            
            try {
                styleElement.textContent = css;
                this.core.log(`CSS applied to ${elementKey}`, { 
                    context, 
                    cssLength: css.length 
                });
            } catch (error) {
                this.core.handleError(`Failed to apply CSS to ${elementKey}`, error);
            }
        }

        /**
         * Apply theme styles
         * @param {string} theme - Theme name
         */
        applyThemeStyles(theme) {
            // This would integrate with the theme system
            // For now, just emit an event
            this.core.emit('preview:theme-applied', { theme });
        }

        /**
         * Start performance monitoring
         */
        startPerformanceMonitoring() {
            setInterval(() => {
                this.reportPerformanceMetrics();
            }, 10000); // Every 10 seconds
        }

        /**
         * Update performance metrics
         */
        updatePerformanceMetrics() {
            this.updateCount++;
            this.lastUpdateTime = Date.now();
        }

        /**
         * Report performance metrics
         */
        reportPerformanceMetrics() {
            const metrics = {
                updateCount: this.updateCount,
                lastUpdateTime: this.lastUpdateTime,
                cacheSize: this.cssCache.size,
                activeTimers: this.debounceTimers.size,
                styleElements: this.styleElements.size
            };
            
            this.core.emit('preview:performance', metrics);
            
            if (this.core.config.debug) {
                this.core.log('LivePreview performance metrics', metrics);
            }
        }

        /**
         * Clear CSS cache
         */
        clearCache() {
            this.cssCache.clear();
            this.core.log('CSS cache cleared');
        }

        /**
         * Enable/disable CSS caching
         * @param {boolean} enabled - Whether to enable caching
         */
        setCacheEnabled(enabled) {
            this.cacheEnabled = enabled;
            if (!enabled) {
                this.clearCache();
            }
            this.core.log(`CSS caching ${enabled ? 'enabled' : 'disabled'}`);
        }

        /**
         * Get current performance metrics
         * @returns {Object} Performance metrics
         */
        getPerformanceMetrics() {
            return {
                updateCount: this.updateCount,
                lastUpdateTime: this.lastUpdateTime,
                cacheSize: this.cssCache.size,
                cacheEnabled: this.cacheEnabled,
                activeTimers: this.debounceTimers.size,
                styleElements: this.styleElements.size,
                debounceDelay: this.debounceDelay
            };
        }

        /**
         * Cleanup resources
         */
        destroy() {
            // Clear debounce timers
            this.debounceTimers.forEach(timer => clearTimeout(timer));
            this.debounceTimers.clear();
            
            // Remove style elements
            this.styleElements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            this.styleElements.clear();
            
            // Clear cache
            this.cssCache.clear();
            
            this.core.log('LivePreview destroyed');
        }
    }

    // Export for ES6 modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LivePreview;
    }
    
    // Export for AMD
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return LivePreview;
        });
    }
    
    // Register with LAS core for IE11 compatibility
    if (window.LAS && typeof window.LAS.registerModule === 'function') {
        window.LAS.registerModule('live-preview', LivePreview);
    }
    
    // Global export as fallback
    window.LASLivePreview = LivePreview;

})(window, document);