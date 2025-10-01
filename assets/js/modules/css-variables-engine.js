/**
 * Live Admin Styler - CSS Variables Engine Module
 * 
 * Dynamic CSS variables management with scoping, inheritance,
 * theme switching, and browser compatibility handling.
 */

export default class CSSVariablesEngine {
    constructor(core) {
        this.core = core;
        this.variables = new Map();
        this.scopes = new Map();
        this.themes = new Map();
        this.currentTheme = 'default';
        this.fallbacks = new Map();
        this.observers = new Map();
        
        this.init();
    }
    
    init() {
        this.setupRootScope();
        this.detectBrowserSupport();
        this.bindEvents();
        this.loadThemes();
        this.initializeDefaultVariables();
    }
    
    setupRootScope() {
        this.rootElement = document.documentElement;
        this.scopes.set('root', {
            element: this.rootElement,
            variables: new Map(),
            parent: null,
            children: new Set()
        });
    }
    
    detectBrowserSupport() {
        this.supportsCustomProperties = CSS.supports('color', 'var(--test)');
        this.supportsColorMix = CSS.supports('color', 'color-mix(in srgb, red, blue)');
        
        if (!this.supportsCustomProperties) {
            console.warn('CSS Custom Properties not supported. Using fallback mode.');
            this.enableFallbackMode();
        }
    }
    
    bindEvents() {
        this.core.on('settings:changed', this.handleSettingsChange.bind(this));
        this.core.on('theme:change', this.handleThemeChange.bind(this));
        this.core.on('css-variables:set', this.handleVariableSet.bind(this));
        this.core.on('css-variables:get', this.handleVariableGet.bind(this));
        
        // Listen for system theme changes
        if (window.matchMedia) {
            this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.darkModeQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
        }
    }
    
    loadThemes() {
        // Load default themes
        this.themes.set('default', this.getDefaultTheme());
        this.themes.set('dark', this.getDarkTheme());
        this.themes.set('light', this.getLightTheme());
        
        // Load custom themes from storage
        this.loadCustomThemes();
    }
    
    getDefaultTheme() {
        return {
            name: 'Default',
            variables: {
                // Primary Colors
                '--las-primary-50': '#eff6ff',
                '--las-primary-100': '#dbeafe',
                '--las-primary-200': '#bfdbfe',
                '--las-primary-300': '#93c5fd',
                '--las-primary-400': '#60a5fa',
                '--las-primary-500': '#2271b1',
                '--las-primary-600': '#1e40af',
                '--las-primary-700': '#1d4ed8',
                '--las-primary-800': '#1e3a8a',
                '--las-primary-900': '#1e40af',
                
                // Neutral Colors
                '--las-neutral-50': '#f9fafb',
                '--las-neutral-100': '#f3f4f6',
                '--las-neutral-200': '#e5e7eb',
                '--las-neutral-300': '#d1d5db',
                '--las-neutral-400': '#9ca3af',
                '--las-neutral-500': '#6b7280',
                '--las-neutral-600': '#4b5563',
                '--las-neutral-700': '#374151',
                '--las-neutral-800': '#1f2937',
                '--las-neutral-900': '#111827',
                
                // Semantic Colors
                '--las-success': '#10b981',
                '--las-warning': '#f59e0b',
                '--las-error': '#ef4444',
                '--las-info': '#3b82f6',
                
                // Spacing
                '--las-space-xs': '4px',
                '--las-space-sm': '8px',
                '--las-space-md': '16px',
                '--las-space-lg': '24px',
                '--las-space-xl': '32px',
                '--las-space-2xl': '48px',
                
                // Typography
                '--las-font-size-xs': '12px',
                '--las-font-size-sm': '14px',
                '--las-font-size-base': '16px',
                '--las-font-size-lg': '18px',
                '--las-font-size-xl': '20px',
                '--las-font-size-2xl': '24px',
                '--las-font-size-3xl': '32px',
                
                // Border Radius
                '--las-radius-sm': '4px',
                '--las-radius-md': '8px',
                '--las-radius-lg': '12px',
                '--las-radius-xl': '16px',
                
                // Shadows
                '--las-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                '--las-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                '--las-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                '--las-shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                
                // Transitions
                '--las-transition-base': '0.2s ease-in-out',
                '--las-transition-fast': '0.1s ease-in-out',
                '--las-transition-slow': '0.3s ease-in-out'
            }
        };
    }
    
    getDarkTheme() {
        const defaultTheme = this.getDefaultTheme();
        return {
            name: 'Dark',
            variables: {
                ...defaultTheme.variables,
                
                // Override for dark theme
                '--las-neutral-50': '#1f2937',
                '--las-neutral-100': '#374151',
                '--las-neutral-200': '#4b5563',
                '--las-neutral-300': '#6b7280',
                '--las-neutral-400': '#9ca3af',
                '--las-neutral-500': '#d1d5db',
                '--las-neutral-600': '#e5e7eb',
                '--las-neutral-700': '#f3f4f6',
                '--las-neutral-800': '#f9fafb',
                '--las-neutral-900': '#ffffff',
                
                // Dark theme specific shadows
                '--las-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
                '--las-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
                '--las-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                '--las-shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
            }
        };
    }
    
    getLightTheme() {
        return this.getDefaultTheme(); // Light theme is the same as default
    }
    
    loadCustomThemes() {
        try {
            const stored = localStorage.getItem('las_custom_themes');
            if (stored) {
                const customThemes = JSON.parse(stored);
                Object.entries(customThemes).forEach(([name, theme]) => {
                    this.themes.set(name, theme);
                });
            }
        } catch (e) {
            console.warn('Failed to load custom themes:', e);
        }
    }
    
    saveCustomThemes() {
        try {
            const customThemes = {};
            this.themes.forEach((theme, name) => {
                if (!['default', 'dark', 'light'].includes(name)) {
                    customThemes[name] = theme;
                }
            });
            localStorage.setItem('las_custom_themes', JSON.stringify(customThemes));
        } catch (e) {
            console.warn('Failed to save custom themes:', e);
        }
    }
    
    initializeDefaultVariables() {
        const defaultTheme = this.themes.get('default');
        this.applyTheme('default', false);
    }
    
    // Variable Management
    setVariable(name, value, scope = 'root', options = {}) {
        const normalizedName = this.normalizeVariableName(name);
        const scopeData = this.scopes.get(scope);
        
        if (!scopeData) {
            console.warn(`Scope '${scope}' not found. Using root scope.`);
            return this.setVariable(name, value, 'root', options);
        }
        
        // Validate value
        const validatedValue = this.validateValue(normalizedName, value);
        if (validatedValue === null) {
            console.warn(`Invalid value '${value}' for variable '${normalizedName}'`);
            return false;
        }
        
        // Store variable data
        const variableData = {
            name: normalizedName,
            value: validatedValue,
            scope: scope,
            fallback: options.fallback || this.generateFallback(normalizedName, validatedValue),
            important: options.important || false,
            computed: options.computed || false,
            timestamp: Date.now()
        };
        
        // Update scope variables
        scopeData.variables.set(normalizedName, variableData);
        this.variables.set(normalizedName, variableData);
        
        // Apply to DOM
        this.applyVariableToDOM(scopeData.element, normalizedName, validatedValue, options);
        
        // Set fallback if needed
        if (!this.supportsCustomProperties) {
            this.setFallbackValue(normalizedName, validatedValue, scopeData.element);
        }
        
        // Notify observers
        this.notifyObservers(normalizedName, validatedValue, scope);
        
        // Emit event
        this.core.emit('css-variables:changed', {
            name: normalizedName,
            value: validatedValue,
            scope: scope
        });
        
        return true;
    }
    
    getVariable(name, scope = 'root') {
        const normalizedName = this.normalizeVariableName(name);
        
        // Try to get from specific scope first
        if (scope !== 'root') {
            const scopeData = this.scopes.get(scope);
            if (scopeData && scopeData.variables.has(normalizedName)) {
                return scopeData.variables.get(normalizedName).value;
            }
        }
        
        // Try to get from variable registry
        if (this.variables.has(normalizedName)) {
            return this.variables.get(normalizedName).value;
        }
        
        // Try to get computed value from DOM
        if (this.supportsCustomProperties) {
            const computedValue = getComputedStyle(this.rootElement)
                .getPropertyValue(normalizedName).trim();
            if (computedValue) {
                return computedValue;
            }
        }
        
        // Return fallback
        return this.fallbacks.get(normalizedName) || null;
    }
    
    removeVariable(name, scope = 'root') {
        const normalizedName = this.normalizeVariableName(name);
        const scopeData = this.scopes.get(scope);
        
        if (scopeData) {
            scopeData.variables.delete(normalizedName);
            scopeData.element.style.removeProperty(normalizedName);
        }
        
        if (scope === 'root') {
            this.variables.delete(normalizedName);
            this.fallbacks.delete(normalizedName);
        }
        
        this.core.emit('css-variables:removed', {
            name: normalizedName,
            scope: scope
        });
    }
    
    // Scope Management
    createScope(name, element, parentScope = 'root') {
        if (this.scopes.has(name)) {
            console.warn(`Scope '${name}' already exists`);
            return false;
        }
        
        const parent = this.scopes.get(parentScope);
        if (!parent) {
            console.warn(`Parent scope '${parentScope}' not found`);
            return false;
        }
        
        const scope = {
            element: element,
            variables: new Map(),
            parent: parent,
            children: new Set()
        };
        
        parent.children.add(scope);
        this.scopes.set(name, scope);
        
        return true;
    }
    
    removeScope(name) {
        if (name === 'root') {
            console.warn('Cannot remove root scope');
            return false;
        }
        
        const scope = this.scopes.get(name);
        if (!scope) {
            return false;
        }
        
        // Remove from parent
        if (scope.parent) {
            scope.parent.children.delete(scope);
        }
        
        // Remove all variables in this scope
        scope.variables.forEach((_, variableName) => {
            this.removeVariable(variableName, name);
        });
        
        this.scopes.delete(name);
        return true;
    }
    
    // Theme Management
    applyTheme(themeName, animate = true) {
        const theme = this.themes.get(themeName);
        if (!theme) {
            console.warn(`Theme '${themeName}' not found`);
            return false;
        }
        
        const previousTheme = this.currentTheme;
        this.currentTheme = themeName;
        
        // Apply theme variables
        if (animate && this.supportsCustomProperties) {
            this.animateThemeTransition(theme, previousTheme);
        } else {
            this.applyThemeVariables(theme);
        }
        
        // Update theme attribute
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Emit event
        this.core.emit('theme:applied', {
            theme: themeName,
            previousTheme: previousTheme
        });
        
        return true;
    }
    
    applyThemeVariables(theme) {
        Object.entries(theme.variables).forEach(([name, value]) => {
            this.setVariable(name, value, 'root', { skipValidation: true });
        });
    }
    
    animateThemeTransition(newTheme, previousTheme) {
        // Create transition element
        const transitionElement = document.createElement('style');
        transitionElement.textContent = `
            :root {
                transition: all var(--las-transition-base);
            }
        `;
        document.head.appendChild(transitionElement);
        
        // Apply new theme
        this.applyThemeVariables(newTheme);
        
        // Remove transition after animation
        setTimeout(() => {
            if (transitionElement.parentNode) {
                transitionElement.parentNode.removeChild(transitionElement);
            }
        }, 300);
    }
    
    createTheme(name, variables, baseTheme = 'default') {
        const base = this.themes.get(baseTheme);
        if (!base) {
            console.warn(`Base theme '${baseTheme}' not found`);
            return false;
        }
        
        const theme = {
            name: name,
            variables: {
                ...base.variables,
                ...variables
            }
        };
        
        this.themes.set(name, theme);
        this.saveCustomThemes();
        
        this.core.emit('theme:created', { name, theme });
        return true;
    }
    
    deleteTheme(name) {
        if (['default', 'dark', 'light'].includes(name)) {
            console.warn('Cannot delete built-in themes');
            return false;
        }
        
        if (this.currentTheme === name) {
            this.applyTheme('default');
        }
        
        this.themes.delete(name);
        this.saveCustomThemes();
        
        this.core.emit('theme:deleted', { name });
        return true;
    }
    
    getThemes() {
        const themes = {};
        this.themes.forEach((theme, name) => {
            themes[name] = { ...theme };
        });
        return themes;
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    // Auto Theme Detection
    enableAutoTheme() {
        if (this.darkModeQuery) {
            this.handleSystemThemeChange(this.darkModeQuery);
        }
    }
    
    disableAutoTheme() {
        // Auto theme is handled by event listeners, no need to disable
    }
    
    handleSystemThemeChange(e) {
        const prefersDark = e.matches;
        const autoTheme = prefersDark ? 'dark' : 'light';
        
        if (this.themes.has(autoTheme)) {
            this.applyTheme(autoTheme);
        }
    }
    
    // Utility Methods
    normalizeVariableName(name) {
        if (!name.startsWith('--')) {
            return `--las-${name}`;
        }
        return name;
    }
    
    validateValue(name, value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        // Basic validation - can be enhanced
        if (value.trim() === '') {
            return null;
        }
        
        // Color validation
        if (name.includes('color') || name.includes('bg') || name.includes('border')) {
            if (this.isValidColor(value)) {
                return value;
            }
        }
        
        // Size validation
        if (name.includes('size') || name.includes('space') || name.includes('width') || name.includes('height')) {
            if (this.isValidSize(value)) {
                return value;
            }
        }
        
        return value; // Allow other values
    }
    
    isValidColor(value) {
        // Simple color validation
        const colorRegex = /^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|var\(|color-mix\()/i;
        return colorRegex.test(value) || CSS.supports('color', value);
    }
    
    isValidSize(value) {
        const sizeRegex = /^(\d+(\.\d+)?(px|em|rem|%|vh|vw|vmin|vmax)|0|auto|inherit|initial|unset|var\()/i;
        return sizeRegex.test(value);
    }
    
    generateFallback(name, value) {
        // Generate appropriate fallbacks for older browsers
        if (name.includes('color')) {
            return this.generateColorFallback(value);
        }
        
        if (name.includes('shadow')) {
            return 'none';
        }
        
        if (name.includes('radius')) {
            return '0';
        }
        
        return value;
    }
    
    generateColorFallback(value) {
        // Convert modern color functions to fallbacks
        if (value.includes('color-mix')) {
            return '#2271b1'; // Default blue
        }
        
        if (value.startsWith('var(')) {
            return '#2271b1'; // Default blue
        }
        
        return value;
    }
    
    applyVariableToDOM(element, name, value, options = {}) {
        if (this.supportsCustomProperties) {
            const priority = options.important ? 'important' : '';
            element.style.setProperty(name, value, priority);
        }
    }
    
    setFallbackValue(name, value, element) {
        // Apply fallback styles for browsers without CSS custom properties support
        const fallbackValue = this.fallbacks.get(name) || value;
        
        // This would need to be expanded based on specific use cases
        if (name.includes('color')) {
            element.style.color = fallbackValue;
        } else if (name.includes('background')) {
            element.style.backgroundColor = fallbackValue;
        }
    }
    
    enableFallbackMode() {
        // Enable comprehensive fallback mode for older browsers
        this.fallbackMode = true;
        
        // Create fallback stylesheet
        this.createFallbackStylesheet();
    }
    
    createFallbackStylesheet() {
        this.fallbackStylesheet = document.createElement('style');
        this.fallbackStylesheet.id = 'las-css-variables-fallback';
        document.head.appendChild(this.fallbackStylesheet);
    }
    
    updateFallbackStylesheet() {
        if (!this.fallbackStylesheet) return;
        
        let css = '';
        this.variables.forEach((variable, name) => {
            const fallback = this.fallbacks.get(name) || variable.value;
            // Generate CSS rules based on variable usage
            css += this.generateFallbackCSS(name, fallback);
        });
        
        this.fallbackStylesheet.textContent = css;
    }
    
    generateFallbackCSS(name, value) {
        // Generate fallback CSS rules - this is a simplified version
        const selector = name.replace('--las-', '');
        return `
            .las-${selector} {
                /* Fallback for ${name} */
            }
        `;
    }
    
    // Observer Pattern
    observe(variableName, callback) {
        const normalizedName = this.normalizeVariableName(variableName);
        
        if (!this.observers.has(normalizedName)) {
            this.observers.set(normalizedName, new Set());
        }
        
        this.observers.get(normalizedName).add(callback);
        
        return () => {
            this.observers.get(normalizedName).delete(callback);
        };
    }
    
    notifyObservers(variableName, value, scope) {
        const observers = this.observers.get(variableName);
        if (observers) {
            observers.forEach(callback => {
                try {
                    callback(value, variableName, scope);
                } catch (e) {
                    console.error('Error in CSS variable observer:', e);
                }
            });
        }
    }
    
    // Event Handlers
    handleSettingsChange({ key, value }) {
        if (key.startsWith('color_') || key.startsWith('bg_') || key.startsWith('text_')) {
            const variableName = key.replace(/_/g, '-');
            this.setVariable(variableName, value);
        }
    }
    
    handleThemeChange({ theme }) {
        this.applyTheme(theme);
    }
    
    handleVariableSet({ name, value, scope, options }) {
        this.setVariable(name, value, scope, options);
    }
    
    handleVariableGet({ name, scope, callback }) {
        const value = this.getVariable(name, scope);
        if (callback) {
            callback(value);
        }
    }
    
    // Public API
    getVariables(scope = 'root') {
        const scopeData = this.scopes.get(scope);
        if (!scopeData) {
            return {};
        }
        
        const variables = {};
        scopeData.variables.forEach((data, name) => {
            variables[name] = data.value;
        });
        
        return variables;
    }
    
    exportTheme(themeName) {
        const theme = this.themes.get(themeName);
        if (!theme) {
            return null;
        }
        
        return {
            name: theme.name,
            variables: { ...theme.variables },
            exported: new Date().toISOString()
        };
    }
    
    importTheme(themeData) {
        if (!themeData.name || !themeData.variables) {
            console.warn('Invalid theme data');
            return false;
        }
        
        return this.createTheme(themeData.name, themeData.variables);
    }
    
    reset() {
        // Reset to default theme
        this.applyTheme('default');
        
        // Clear custom variables
        this.variables.clear();
        this.scopes.forEach((scope, name) => {
            if (name !== 'root') {
                this.removeScope(name);
            }
        });
        
        // Clear root scope variables except theme variables
        const rootScope = this.scopes.get('root');
        rootScope.variables.clear();
        
        // Reapply default theme
        this.initializeDefaultVariables();
    }
    
    destroy() {
        // Remove event listeners
        if (this.darkModeQuery) {
            this.darkModeQuery.removeEventListener('change', this.handleSystemThemeChange);
        }
        
        // Clear all data
        this.variables.clear();
        this.scopes.clear();
        this.themes.clear();
        this.fallbacks.clear();
        this.observers.clear();
        
        // Remove fallback stylesheet
        if (this.fallbackStylesheet && this.fallbackStylesheet.parentNode) {
            this.fallbackStylesheet.parentNode.removeChild(this.fallbackStylesheet);
        }
    }
}