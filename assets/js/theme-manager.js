/**
 * Live Admin Styler - Theme Management System
 * 
 * Handles dark/light mode detection, switching, and persistence
 * Part of the modern UI redesign design system foundation
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.detectTheme();
        this.storageKey = 'las-theme-preference';
        this.init();
    }
    
    /**
     * Detect the appropriate theme based on stored preference or system preference
     * @returns {string} 'dark' or 'light'
     */
    detectTheme() {
        // Check localStorage first for user preference
        const stored = localStorage.getItem(this.storageKey);
        if (stored && (stored === 'dark' || stored === 'light')) {
            return stored;
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    /**
     * Set the theme and persist the preference
     * @param {string} theme - 'dark' or 'light'
     */
    setTheme(theme) {
        if (theme !== 'dark' && theme !== 'light') {
            console.warn('ThemeManager: Invalid theme value. Use "dark" or "light".');
            return;
        }
        
        this.currentTheme = theme;
        
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        
        // Store preference
        localStorage.setItem(this.storageKey, theme);
        
        // Dispatch custom event for other components to listen to
        this.dispatchThemeChange();
        
        // Update any theme toggle buttons
        this.updateThemeToggles();
    }
    
    /**
     * Toggle between dark and light themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
    
    /**
     * Get the current theme
     * @returns {string} Current theme ('dark' or 'light')
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    /**
     * Check if current theme is dark
     * @returns {boolean}
     */
    isDark() {
        return this.currentTheme === 'dark';
    }
    
    /**
     * Check if current theme is light
     * @returns {boolean}
     */
    isLight() {
        return this.currentTheme === 'light';
    }
    
    /**
     * Initialize the theme manager
     */
    init() {
        // Set initial theme
        this.setTheme(this.currentTheme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Use the newer addEventListener if available, fallback to addListener
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', (e) => {
                    // Only auto-switch if user hasn't set a manual preference
                    if (!localStorage.getItem(this.storageKey)) {
                        this.setTheme(e.matches ? 'dark' : 'light');
                    }
                });
            } else if (mediaQuery.addListener) {
                // Fallback for older browsers
                mediaQuery.addListener((e) => {
                    if (!localStorage.getItem(this.storageKey)) {
                        this.setTheme(e.matches ? 'dark' : 'light');
                    }
                });
            }
        }
        
        // Initialize theme toggle buttons
        this.initializeThemeToggles();
        
        // Prevent flash of unstyled content
        this.preventFOUC();
    }
    
    /**
     * Dispatch theme change event
     */
    dispatchThemeChange() {
        const event = new CustomEvent('las-theme-change', {
            detail: { 
                theme: this.currentTheme,
                isDark: this.isDark(),
                isLight: this.isLight()
            }
        });
        
        window.dispatchEvent(event);
        
        // Also dispatch on document for broader compatibility
        if (document.dispatchEvent) {
            document.dispatchEvent(event);
        }
    }
    
    /**
     * Initialize theme toggle buttons
     */
    initializeThemeToggles() {
        // Look for theme toggle buttons and add event listeners
        const toggleButtons = document.querySelectorAll('[data-las-theme-toggle]');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
            
            // Set initial state
            this.updateThemeToggleButton(button);
        });
    }
    
    /**
     * Update all theme toggle buttons
     */
    updateThemeToggles() {
        const toggleButtons = document.querySelectorAll('[data-las-theme-toggle]');
        toggleButtons.forEach(button => {
            this.updateThemeToggleButton(button);
        });
    }
    
    /**
     * Update a single theme toggle button
     * @param {HTMLElement} button
     */
    updateThemeToggleButton(button) {
        const isDark = this.isDark();
        
        // Update button text if it has data attributes
        const lightText = button.getAttribute('data-light-text') || '☀️ Light';
        const darkText = button.getAttribute('data-dark-text') || '🌙 Dark';
        
        if (button.textContent !== undefined) {
            button.textContent = isDark ? lightText : darkText;
        }
        
        // Update aria-label for accessibility
        button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
        
        // Update data attribute for CSS styling
        button.setAttribute('data-current-theme', this.currentTheme);
        
        // Add/remove active class
        button.classList.toggle('las-theme-toggle--dark', isDark);
        button.classList.toggle('las-theme-toggle--light', !isDark);
    }
    
    /**
     * Prevent flash of unstyled content by ensuring theme is applied early
     */
    preventFOUC() {
        // Remove any existing theme classes
        document.documentElement.classList.remove('las-theme-loading');
        
        // Add loaded class for CSS transitions
        document.documentElement.classList.add('las-theme-loaded');
        
        // Ensure settings wrap is visible after theme is applied
        setTimeout(() => {
            const settingsWrap = document.querySelector('.las-fresh-settings-wrap');
            if (settingsWrap) {
                settingsWrap.style.opacity = '1';
            }
        }, 100);
    }
    
    /**
     * Add a theme change listener
     * @param {Function} callback - Function to call when theme changes
     * @returns {Function} Cleanup function to remove the listener
     */
    onThemeChange(callback) {
        const handler = (event) => {
            callback(event.detail);
        };
        
        window.addEventListener('las-theme-change', handler);
        
        // Return cleanup function
        return () => {
            window.removeEventListener('las-theme-change', handler);
        };
    }
    
    /**
     * Reset theme preference (will use system preference)
     */
    resetTheme() {
        localStorage.removeItem(this.storageKey);
        const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.setTheme(systemTheme);
    }
    
    /**
     * Get theme statistics for debugging
     * @returns {Object} Theme statistics
     */
    getThemeStats() {
        return {
            currentTheme: this.currentTheme,
            hasStoredPreference: !!localStorage.getItem(this.storageKey),
            systemPreference: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            supportsColorScheme: !!window.matchMedia,
            toggleButtons: document.querySelectorAll('[data-las-theme-toggle]').length
        };
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lasThemeManager = new ThemeManager();
    });
} else {
    // DOM is already ready
    window.lasThemeManager = new ThemeManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}

// AMD support
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return ThemeManager;
    });
}