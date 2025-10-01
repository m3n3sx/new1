/**
 * Theme Manager Module
 * Handles automatic theme detection, manual theme switching, and theme persistence
 * 
 * @package LiveAdminStyler
 * @since 2.0.0
 */

export default class ThemeManager {
    constructor(core) {
        this.core = core;
        this.currentTheme = 'auto';
        this.systemTheme = 'light';
        this.effectiveTheme = 'light';
        this.mediaQuery = null;
        this.storageKey = 'las_theme_preference';
        this.transitionDuration = 300;
        
        this.init();
    }
    
    /**
     * Initialize theme manager
     */
    init() {
        this.setupMediaQuery();
        this.loadThemePreference();
        this.applyTheme();
        this.bindEvents();
        
        this.core.emit('theme:ready', {
            current: this.currentTheme,
            effective: this.effectiveTheme,
            system: this.systemTheme
        });
    }
    
    /**
     * Set up media query for system theme detection
     */
    setupMediaQuery() {
        if (window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.systemTheme = this.mediaQuery.matches ? 'dark' : 'light';
            
            // Listen for system theme changes
            this.mediaQuery.addEventListener('change', (e) => {
                this.systemTheme = e.matches ? 'dark' : 'light';
                this.core.emit('theme:system-changed', { theme: this.systemTheme });
                
                // If using auto mode, update effective theme
                if (this.currentTheme === 'auto') {
                    this.updateEffectiveTheme();
                }
            });
        }
    }
    
    /**
     * Load theme preference from storage
     */
    loadThemePreference() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored && ['auto', 'light', 'dark'].includes(stored)) {
                this.currentTheme = stored;
            }
        } catch (error) {
            this.core.emit('theme:error', {
                type: 'storage_load',
                message: 'Failed to load theme preference',
                error
            });
        }
        
        this.updateEffectiveTheme();
    }
    
    /**
     * Save theme preference to storage
     */
    saveThemePreference() {
        try {
            localStorage.setItem(this.storageKey, this.currentTheme);
            this.core.emit('theme:preference-saved', { theme: this.currentTheme });
        } catch (error) {
            this.core.emit('theme:error', {
                type: 'storage_save',
                message: 'Failed to save theme preference',
                error
            });
        }
    }
    
    /**
     * Update effective theme based on current theme and system preference
     */
    updateEffectiveTheme() {
        const previousTheme = this.effectiveTheme;
        
        if (this.currentTheme === 'auto') {
            this.effectiveTheme = this.systemTheme;
        } else {
            this.effectiveTheme = this.currentTheme;
        }
        
        if (previousTheme !== this.effectiveTheme) {
            this.applyTheme();
            this.core.emit('theme:changed', {
                from: previousTheme,
                to: this.effectiveTheme,
                mode: this.currentTheme
            });
        }
    }
    
    /**
     * Apply theme to document
     */
    applyTheme() {
        const html = document.documentElement;
        const body = document.body;
        
        // Add transition class for smooth theme switching
        html.classList.add('las-theme-transitioning');
        
        // Remove existing theme classes
        html.classList.remove('las-theme-light', 'las-theme-dark', 'las-theme-auto');
        body.classList.remove('las-theme-light', 'las-theme-dark');
        
        // Remove data-theme attribute
        html.removeAttribute('data-theme');
        
        // Apply new theme
        html.classList.add(`las-theme-${this.currentTheme}`);
        body.classList.add(`las-theme-${this.effectiveTheme}`);
        html.setAttribute('data-theme', this.effectiveTheme);
        
        // Update CSS custom properties for smooth transitions
        this.updateThemeVariables();
        
        // Remove transition class after animation completes
        setTimeout(() => {
            html.classList.remove('las-theme-transitioning');
        }, this.transitionDuration);
        
        this.core.emit('theme:applied', {
            theme: this.effectiveTheme,
            mode: this.currentTheme
        });
    }
    
    /**
     * Update CSS custom properties for theme
     */
    updateThemeVariables() {
        const root = document.documentElement;
        const isDark = this.effectiveTheme === 'dark';
        
        // Define theme-specific color values
        const themeColors = {
            light: {
                '--las-content-background': '#ffffff',
                '--las-content-heading-color': '#23282d',
                '--las-gray-50': '#f9f9f9',
                '--las-gray-100': '#f1f1f1',
                '--las-gray-200': '#e1e1e1',
                '--las-gray-300': '#d1d1d1',
                '--las-gray-400': '#b4b9be',
                '--las-gray-500': '#8c8f94',
                '--las-gray-600': '#646970',
                '--las-gray-700': '#50575e',
                '--las-gray-800': '#3c434a',
                '--las-gray-900': '#1d2327',
                '--las-white': '#ffffff',
                '--las-form-background': '#ffffff',
                '--las-form-border': '#d1d1d1',
                '--las-form-text': '#23282d',
                '--las-button-background': '#ffffff',
                '--las-button-border': '#d1d1d1',
                '--las-button-text': '#50575e',
                '--las-button-hover-background': '#f9f9f9',
                '--las-button-hover-border': '#b4b9be',
                '--las-button-hover-text': '#1d2327'
            },
            dark: {
                '--las-content-background': '#1a1a1a',
                '--las-content-heading-color': '#ffffff',
                '--las-gray-50': '#2a2a2a',
                '--las-gray-100': '#3a3a3a',
                '--las-gray-200': '#4a4a4a',
                '--las-gray-300': '#5a5a5a',
                '--las-gray-400': '#6a6a6a',
                '--las-gray-500': '#7a7a7a',
                '--las-gray-600': '#8a8a8a',
                '--las-gray-700': '#9a9a9a',
                '--las-gray-800': '#aaaaaa',
                '--las-gray-900': '#ffffff',
                '--las-white': '#2a2a2a',
                '--las-form-background': '#2a2a2a',
                '--las-form-border': '#4a4a4a',
                '--las-form-text': '#ffffff',
                '--las-button-background': '#2a2a2a',
                '--las-button-border': '#4a4a4a',
                '--las-button-text': '#9a9a9a',
                '--las-button-hover-background': '#3a3a3a',
                '--las-button-hover-border': '#5a5a5a',
                '--las-button-hover-text': '#ffffff'
            }
        };
        
        const colors = themeColors[this.effectiveTheme];
        
        // Apply theme colors
        Object.entries(colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Listen for theme toggle requests
        this.core.on('theme:toggle', () => {
            this.toggleTheme();
        });
        
        this.core.on('theme:set', (data) => {
            this.setTheme(data.theme);
        });
        
        // Listen for settings changes that might affect theme
        this.core.on('settings:changed', (data) => {
            if (data.key === 'theme_mode') {
                this.setTheme(data.value);
            }
        });
    }
    
    /**
     * Set theme mode
     * @param {string} theme - Theme mode: 'auto', 'light', or 'dark'
     */
    setTheme(theme) {
        if (!['auto', 'light', 'dark'].includes(theme)) {
            this.core.emit('theme:error', {
                type: 'invalid_theme',
                message: `Invalid theme: ${theme}`,
                theme
            });
            return;
        }
        
        const previousTheme = this.currentTheme;
        this.currentTheme = theme;
        
        this.updateEffectiveTheme();
        this.saveThemePreference();
        
        this.core.emit('theme:mode-changed', {
            from: previousTheme,
            to: theme,
            effective: this.effectiveTheme
        });
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        let newTheme;
        
        if (this.currentTheme === 'auto') {
            // If auto, switch to opposite of current system theme
            newTheme = this.systemTheme === 'dark' ? 'light' : 'dark';
        } else if (this.currentTheme === 'light') {
            newTheme = 'dark';
        } else {
            newTheme = 'light';
        }
        
        this.setTheme(newTheme);
    }
    
    /**
     * Get current theme information
     * @returns {Object} Theme information
     */
    getThemeInfo() {
        return {
            current: this.currentTheme,
            effective: this.effectiveTheme,
            system: this.systemTheme,
            supportsSystemDetection: !!this.mediaQuery
        };
    }
    
    /**
     * Check if dark mode is active
     * @returns {boolean} True if dark mode is active
     */
    isDarkMode() {
        return this.effectiveTheme === 'dark';
    }
    
    /**
     * Check if light mode is active
     * @returns {boolean} True if light mode is active
     */
    isLightMode() {
        return this.effectiveTheme === 'light';
    }
    
    /**
     * Check if auto mode is active
     * @returns {boolean} True if auto mode is active
     */
    isAutoMode() {
        return this.currentTheme === 'auto';
    }
    
    /**
     * Get theme-specific color value
     * @param {string} colorName - Color variable name (without --las- prefix)
     * @returns {string} Color value
     */
    getThemeColor(colorName) {
        const root = document.documentElement;
        return getComputedStyle(root).getPropertyValue(`--las-${colorName}`).trim();
    }
    
    /**
     * Set theme-specific color value
     * @param {string} colorName - Color variable name (without --las- prefix)
     * @param {string} value - Color value
     */
    setThemeColor(colorName, value) {
        const root = document.documentElement;
        root.style.setProperty(`--las-${colorName}`, value);
        
        this.core.emit('theme:color-changed', {
            color: colorName,
            value,
            theme: this.effectiveTheme
        });
    }
    
    /**
     * Create theme preview
     * @param {string} theme - Theme to preview
     * @returns {Promise} Preview promise
     */
    async previewTheme(theme) {
        if (!['light', 'dark'].includes(theme)) {
            throw new Error(`Invalid preview theme: ${theme}`);
        }
        
        const originalTheme = this.effectiveTheme;
        
        // Temporarily apply preview theme
        this.effectiveTheme = theme;
        this.applyTheme();
        
        this.core.emit('theme:preview-started', {
            preview: theme,
            original: originalTheme
        });
        
        // Return promise that resolves when preview ends
        return new Promise((resolve) => {
            const endPreview = () => {
                this.effectiveTheme = originalTheme;
                this.applyTheme();
                
                this.core.emit('theme:preview-ended', {
                    preview: theme,
                    restored: originalTheme
                });
                
                resolve();
            };
            
            // Auto-end preview after 5 seconds
            setTimeout(endPreview, 5000);
            
            // Allow manual preview end
            this.core.once('theme:end-preview', endPreview);
        });
    }
    
    /**
     * Export theme configuration
     * @returns {Object} Theme configuration
     */
    exportTheme() {
        const root = document.documentElement;
        const style = getComputedStyle(root);
        const themeConfig = {
            mode: this.currentTheme,
            effective: this.effectiveTheme,
            colors: {}
        };
        
        // Extract all LAS CSS variables
        const allProps = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            })
            .filter(rule => rule.type === CSSRule.STYLE_RULE)
            .flatMap(rule => Array.from(rule.style))
            .filter(prop => prop.startsWith('--las-'))
            .map(prop => prop.replace('--las-', ''));
        
        // Get unique properties
        const uniqueProps = [...new Set(allProps)];
        
        uniqueProps.forEach(prop => {
            const value = style.getPropertyValue(`--las-${prop}`).trim();
            if (value) {
                themeConfig.colors[prop] = value;
            }
        });
        
        return themeConfig;
    }
    
    /**
     * Import theme configuration
     * @param {Object} themeConfig - Theme configuration to import
     */
    importTheme(themeConfig) {
        if (!themeConfig || typeof themeConfig !== 'object') {
            throw new Error('Invalid theme configuration');
        }
        
        // Set theme mode if provided
        if (themeConfig.mode && ['auto', 'light', 'dark'].includes(themeConfig.mode)) {
            this.setTheme(themeConfig.mode);
        }
        
        // Apply colors if provided
        if (themeConfig.colors && typeof themeConfig.colors === 'object') {
            Object.entries(themeConfig.colors).forEach(([colorName, value]) => {
                this.setThemeColor(colorName, value);
            });
        }
        
        this.core.emit('theme:imported', { config: themeConfig });
    }
    
    /**
     * Cleanup theme manager
     */
    destroy() {
        if (this.mediaQuery) {
            this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
        }
        
        // Remove theme classes
        const html = document.documentElement;
        const body = document.body;
        
        html.classList.remove('las-theme-light', 'las-theme-dark', 'las-theme-auto', 'las-theme-transitioning');
        body.classList.remove('las-theme-light', 'las-theme-dark');
        html.removeAttribute('data-theme');
        
        this.core.emit('theme:destroyed');
    }
}