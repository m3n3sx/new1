/**
 * Live Admin Styler - Responsive Breakpoint Management System
 * 
 * Handles responsive breakpoint detection and management
 * Part of the modern UI redesign design system foundation
 */

class ResponsiveManager {
    constructor() {
        this.breakpoints = {
            mobile: '(min-width: 320px) and (max-width: 767px)',
            mobileTiny: '(max-width: 319px)',
            tablet: '(min-width: 768px) and (max-width: 1023px)',
            desktop: '(min-width: 1024px) and (max-width: 1439px)',
            large: '(min-width: 1440px)'
        };
        
        this.currentBreakpoint = this.getCurrentBreakpoint();
        this.mediaQueries = {};
        this.listeners = [];
        
        this.init();
    }
    
    /**
     * Get the current active breakpoint
     * @returns {string} Current breakpoint name
     */
    getCurrentBreakpoint() {
        for (const [name, query] of Object.entries(this.breakpoints)) {
            if (window.matchMedia && window.matchMedia(query).matches) {
                return name;
            }
        }
        return 'desktop'; // Default fallback
    }
    
    /**
     * Initialize the responsive manager
     */
    init() {
        if (!window.matchMedia) {
            console.warn('ResponsiveManager: matchMedia not supported');
            return;
        }
        
        // Create media query objects and add listeners
        Object.entries(this.breakpoints).forEach(([name, query]) => {
            const mq = window.matchMedia(query);
            this.mediaQueries[name] = mq;
            
            // Use the newer addEventListener if available, fallback to addListener
            const handler = (e) => {
                if (e.matches) {
                    this.handleBreakpointChange(name);
                }
            };
            
            if (mq.addEventListener) {
                mq.addEventListener('change', handler);
            } else if (mq.addListener) {
                // Fallback for older browsers
                mq.addListener(handler);
            }
        });
        
        // Set initial breakpoint
        this.handleBreakpointChange(this.currentBreakpoint);
        
        // Add CSS classes to document
        this.updateDocumentClasses();
    }
    
    /**
     * Handle breakpoint change
     * @param {string} newBreakpoint - New active breakpoint
     */
    handleBreakpointChange(newBreakpoint) {
        const previousBreakpoint = this.currentBreakpoint;
        this.currentBreakpoint = newBreakpoint;
        
        // Update document classes
        this.updateDocumentClasses();
        
        // Dispatch custom event
        this.dispatchBreakpointChange(previousBreakpoint, newBreakpoint);
        
        // Call registered listeners
        this.notifyListeners(newBreakpoint, previousBreakpoint);
    }
    
    /**
     * Update CSS classes on document element
     */
    updateDocumentClasses() {
        const docElement = document.documentElement;
        
        // Remove all breakpoint classes
        Object.keys(this.breakpoints).forEach(bp => {
            docElement.classList.remove(`las-bp-${bp}`);
        });
        
        // Add current breakpoint class
        docElement.classList.add(`las-bp-${this.currentBreakpoint}`);
        
        // Add utility classes
        docElement.classList.toggle('las-mobile-tiny', this.isMobileTiny());
        docElement.classList.toggle('las-mobile', this.isMobile());
        docElement.classList.toggle('las-tablet', this.isTablet());
        docElement.classList.toggle('las-desktop', this.isDesktop());
        docElement.classList.toggle('las-large', this.isLarge());
        docElement.classList.toggle('las-touch', this.isTouchDevice());
    }
    
    /**
     * Dispatch breakpoint change event
     * @param {string} previous - Previous breakpoint
     * @param {string} current - Current breakpoint
     */
    dispatchBreakpointChange(previous, current) {
        const event = new CustomEvent('las-breakpoint-change', {
            detail: { 
                breakpoint: current,
                previousBreakpoint: previous,
                isMobileTiny: this.isMobileTiny(),
                isMobile: this.isMobile(),
                isTablet: this.isTablet(),
                isDesktop: this.isDesktop(),
                isLarge: this.isLarge(),
                isTouchDevice: this.isTouchDevice(),
                viewport: this.getViewportSize()
            }
        });
        
        window.dispatchEvent(event);
        
        // Also dispatch on document for broader compatibility
        if (document.dispatchEvent) {
            document.dispatchEvent(event);
        }
    }
    
    /**
     * Notify registered listeners
     * @param {string} current - Current breakpoint
     * @param {string} previous - Previous breakpoint
     */
    notifyListeners(current, previous) {
        this.listeners.forEach(listener => {
            try {
                listener({
                    breakpoint: current,
                    previousBreakpoint: previous,
                    manager: this
                });
            } catch (error) {
                console.error('ResponsiveManager: Error in breakpoint listener:', error);
            }
        });
    }
    
    /**
     * Check if current breakpoint is mobile
     * @returns {boolean}
     */
    isMobile() {
        return this.currentBreakpoint === 'mobile';
    }
    
    /**
     * Check if current breakpoint is mobile tiny (< 320px)
     * @returns {boolean}
     */
    isMobileTiny() {
        return this.currentBreakpoint === 'mobileTiny';
    }
    
    /**
     * Check if current breakpoint is tablet
     * @returns {boolean}
     */
    isTablet() {
        return this.currentBreakpoint === 'tablet';
    }
    
    /**
     * Check if current breakpoint is desktop
     * @returns {boolean}
     */
    isDesktop() {
        return this.currentBreakpoint === 'desktop';
    }
    
    /**
     * Check if current breakpoint is large
     * @returns {boolean}
     */
    isLarge() {
        return this.currentBreakpoint === 'large';
    }
    
    /**
     * Check if device supports touch
     * @returns {boolean}
     */
    isTouchDevice() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    }
    
    /**
     * Check if current viewport is mobile-sized (mobileTiny, mobile, or tablet)
     * @returns {boolean}
     */
    isMobileViewport() {
        return this.isMobileTiny() || this.isMobile() || this.isTablet();
    }
    
    /**
     * Check if current viewport is any mobile size (mobileTiny or mobile)
     * @returns {boolean}
     */
    isAnyMobile() {
        return this.isMobileTiny() || this.isMobile();
    }
    
    /**
     * Check if current viewport is desktop-sized (desktop or large)
     * @returns {boolean}
     */
    isDesktopViewport() {
        return this.isDesktop() || this.isLarge();
    }
    
    /**
     * Get viewport dimensions
     * @returns {Object} Viewport width and height
     */
    getViewportSize() {
        return {
            width: window.innerWidth || document.documentElement.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight
        };
    }
    
    /**
     * Add a breakpoint change listener
     * @param {Function} callback - Function to call when breakpoint changes
     * @returns {Function} Cleanup function to remove the listener
     */
    onBreakpointChange(callback) {
        this.listeners.push(callback);
        
        // Return cleanup function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Check if a specific breakpoint is currently active
     * @param {string} breakpoint - Breakpoint name to check
     * @returns {boolean}
     */
    isBreakpoint(breakpoint) {
        return this.currentBreakpoint === breakpoint;
    }
    
    /**
     * Check if viewport matches a custom media query
     * @param {string} query - CSS media query string
     * @returns {boolean}
     */
    matchesQuery(query) {
        if (!window.matchMedia) {
            return false;
        }
        return window.matchMedia(query).matches;
    }
    
    /**
     * Get breakpoint information
     * @returns {Object} Current breakpoint information
     */
    getBreakpointInfo() {
        return {
            current: this.currentBreakpoint,
            isMobileTiny: this.isMobileTiny(),
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            isDesktop: this.isDesktop(),
            isLarge: this.isLarge(),
            isTouchDevice: this.isTouchDevice(),
            isAnyMobile: this.isAnyMobile(),
            isMobileViewport: this.isMobileViewport(),
            isDesktopViewport: this.isDesktopViewport(),
            viewport: this.getViewportSize(),
            breakpoints: { ...this.breakpoints }
        };
    }
    
    /**
     * Add a custom breakpoint
     * @param {string} name - Breakpoint name
     * @param {string} query - CSS media query
     */
    addBreakpoint(name, query) {
        if (this.breakpoints[name]) {
            console.warn(`ResponsiveManager: Breakpoint '${name}' already exists`);
            return;
        }
        
        this.breakpoints[name] = query;
        
        if (window.matchMedia) {
            const mq = window.matchMedia(query);
            this.mediaQueries[name] = mq;
            
            const handler = (e) => {
                if (e.matches) {
                    this.handleBreakpointChange(name);
                }
            };
            
            if (mq.addEventListener) {
                mq.addEventListener('change', handler);
            } else if (mq.addListener) {
                mq.addListener(handler);
            }
        }
    }
    
    /**
     * Remove a custom breakpoint
     * @param {string} name - Breakpoint name to remove
     */
    removeBreakpoint(name) {
        if (!this.breakpoints[name]) {
            console.warn(`ResponsiveManager: Breakpoint '${name}' does not exist`);
            return;
        }
        
        // Don't allow removing default breakpoints
        const defaultBreakpoints = ['mobile', 'tablet', 'desktop', 'large'];
        if (defaultBreakpoints.includes(name)) {
            console.warn(`ResponsiveManager: Cannot remove default breakpoint '${name}'`);
            return;
        }
        
        delete this.breakpoints[name];
        delete this.mediaQueries[name];
        
        // Update current breakpoint if it was the removed one
        if (this.currentBreakpoint === name) {
            this.currentBreakpoint = this.getCurrentBreakpoint();
            this.updateDocumentClasses();
        }
    }
    
    /**
     * Get responsive manager statistics for debugging
     * @returns {Object} Manager statistics
     */
    getStats() {
        return {
            currentBreakpoint: this.currentBreakpoint,
            viewport: this.getViewportSize(),
            isTouchDevice: this.isTouchDevice(),
            supportsMatchMedia: !!window.matchMedia,
            breakpointCount: Object.keys(this.breakpoints).length,
            listenerCount: this.listeners.length,
            breakpoints: { ...this.breakpoints }
        };
    }
}

// Initialize responsive manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lasResponsiveManager = new ResponsiveManager();
    });
} else {
    // DOM is already ready
    window.lasResponsiveManager = new ResponsiveManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveManager;
}

// AMD support
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return ResponsiveManager;
    });
}