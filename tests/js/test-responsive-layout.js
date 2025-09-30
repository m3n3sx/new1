/**
 * Test suite for responsive layout system
 * Tests the CSS Grid layout and ResponsiveManager functionality
 */

describe('Responsive Layout System', () => {
    let responsiveManager;
    let mockMatchMedia;
    
    beforeEach(() => {
        // Mock matchMedia
        mockMatchMedia = jest.fn();
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: mockMatchMedia
        });
        
        // Mock DOM elements
        document.documentElement.classList = {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn()
        };
        
        // Reset ResponsiveManager
        if (window.lasResponsiveManager) {
            delete window.lasResponsiveManager;
        }
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('ResponsiveManager', () => {
        test('should initialize with correct breakpoints', () => {
            // Mock matchMedia to return mobile
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('320px') && query.includes('767px'),
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            expect(responsiveManager.breakpoints).toHaveProperty('mobileTiny');
            expect(responsiveManager.breakpoints).toHaveProperty('mobile');
            expect(responsiveManager.breakpoints).toHaveProperty('tablet');
            expect(responsiveManager.breakpoints).toHaveProperty('desktop');
            expect(responsiveManager.breakpoints).toHaveProperty('large');
        });
        
        test('should detect mobile breakpoint correctly', () => {
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('320px') && query.includes('767px'),
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            expect(responsiveManager.isMobile()).toBe(true);
            expect(responsiveManager.isTablet()).toBe(false);
            expect(responsiveManager.isDesktop()).toBe(false);
            expect(responsiveManager.isLarge()).toBe(false);
        });
        
        test('should detect mobile tiny breakpoint correctly', () => {
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('max-width: 319px'),
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            expect(responsiveManager.isMobileTiny()).toBe(true);
            expect(responsiveManager.isAnyMobile()).toBe(true);
            expect(responsiveManager.isMobileViewport()).toBe(true);
        });
        
        test('should detect tablet breakpoint correctly', () => {
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('768px') && query.includes('1023px'),
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            expect(responsiveManager.isTablet()).toBe(true);
            expect(responsiveManager.isMobileViewport()).toBe(true);
            expect(responsiveManager.isDesktopViewport()).toBe(false);
        });
        
        test('should detect desktop breakpoint correctly', () => {
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('1024px') && query.includes('1439px'),
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            expect(responsiveManager.isDesktop()).toBe(true);
            expect(responsiveManager.isDesktopViewport()).toBe(true);
            expect(responsiveManager.isMobileViewport()).toBe(false);
        });
        
        test('should detect large breakpoint correctly', () => {
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('min-width: 1440px'),
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            expect(responsiveManager.isLarge()).toBe(true);
            expect(responsiveManager.isDesktopViewport()).toBe(true);
        });
        
        test('should handle breakpoint changes', () => {
            let changeHandler;
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('320px') && query.includes('767px'),
                addEventListener: (event, handler) => {
                    if (event === 'change') {
                        changeHandler = handler;
                    }
                },
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            const listener = jest.fn();
            responsiveManager.onBreakpointChange(listener);
            
            // Simulate breakpoint change
            if (changeHandler) {
                changeHandler({ matches: true });
            }
            
            expect(listener).toHaveBeenCalled();
        });
        
        test('should provide viewport size information', () => {
            // Mock window dimensions
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 1024
            });
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                value: 768
            });
            
            mockMatchMedia.mockImplementation(() => ({
                matches: false,
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            const viewport = responsiveManager.getViewportSize();
            expect(viewport.width).toBe(1024);
            expect(viewport.height).toBe(768);
        });
        
        test('should detect touch devices', () => {
            // Mock touch support
            Object.defineProperty(window, 'ontouchstart', {
                writable: true,
                value: true
            });
            
            mockMatchMedia.mockImplementation(() => ({
                matches: false,
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            expect(responsiveManager.isTouchDevice()).toBe(true);
        });
        
        test('should provide comprehensive breakpoint info', () => {
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('768px') && query.includes('1023px'),
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            const info = responsiveManager.getBreakpointInfo();
            
            expect(info).toHaveProperty('current');
            expect(info).toHaveProperty('isMobileTiny');
            expect(info).toHaveProperty('isMobile');
            expect(info).toHaveProperty('isTablet');
            expect(info).toHaveProperty('isDesktop');
            expect(info).toHaveProperty('isLarge');
            expect(info).toHaveProperty('isTouchDevice');
            expect(info).toHaveProperty('isAnyMobile');
            expect(info).toHaveProperty('isMobileViewport');
            expect(info).toHaveProperty('isDesktopViewport');
            expect(info).toHaveProperty('viewport');
            expect(info).toHaveProperty('breakpoints');
        });
        
        test('should handle custom breakpoints', () => {
            mockMatchMedia.mockImplementation(() => ({
                matches: false,
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            responsiveManager.addBreakpoint('custom', '(min-width: 1600px)');
            expect(responsiveManager.breakpoints).toHaveProperty('custom');
            
            responsiveManager.removeBreakpoint('custom');
            expect(responsiveManager.breakpoints).not.toHaveProperty('custom');
        });
        
        test('should not allow removing default breakpoints', () => {
            mockMatchMedia.mockImplementation(() => ({
                matches: false,
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            responsiveManager = new ResponsiveManager();
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            responsiveManager.removeBreakpoint('mobile');
            expect(responsiveManager.breakpoints).toHaveProperty('mobile');
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('CSS Grid Layout', () => {
        test('should have proper CSS custom properties defined', () => {
            // This would typically be tested in a browser environment
            // For now, we'll test that the CSS file contains the expected properties
            const fs = require('fs');
            const path = require('path');
            
            const cssPath = path.join(__dirname, '../../assets/css/admin-style.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            
            expect(cssContent).toContain('--las-space-xs: 4px');
            expect(cssContent).toContain('--las-space-sm: 8px');
            expect(cssContent).toContain('--las-space-md: 16px');
            expect(cssContent).toContain('--las-space-lg: 24px');
            expect(cssContent).toContain('--las-space-xl: 32px');
        });
        
        test('should have responsive breakpoints in CSS', () => {
            const fs = require('fs');
            const path = require('path');
            
            const cssPath = path.join(__dirname, '../../assets/css/admin-style.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            
            expect(cssContent).toContain('@media (min-width: 320px)');
            expect(cssContent).toContain('@media (min-width: 768px)');
            expect(cssContent).toContain('@media (min-width: 1024px)');
            expect(cssContent).toContain('@media (min-width: 1440px)');
        });
        
        test('should have container queries with fallbacks', () => {
            const fs = require('fs');
            const path = require('path');
            
            const cssPath = path.join(__dirname, '../../assets/css/admin-style.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            
            expect(cssContent).toContain('@supports (container-type: inline-size)');
            expect(cssContent).toContain('@supports not (container-type: inline-size)');
            expect(cssContent).toContain('container-type: inline-size');
            expect(cssContent).toContain('@container');
        });
        
        test('should have responsive utility classes', () => {
            const fs = require('fs');
            const path = require('path');
            
            const cssPath = path.join(__dirname, '../../assets/css/admin-style.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            
            expect(cssContent).toContain('.las-hide-mobile');
            expect(cssContent).toContain('.las-show-mobile-only');
            expect(cssContent).toContain('.las-grid-responsive');
            expect(cssContent).toContain('.las-flex-responsive');
            expect(cssContent).toContain('.las-touch-target');
        });
    });
    
    describe('Integration', () => {
        test('should work without matchMedia support', () => {
            // Remove matchMedia support
            delete window.matchMedia;
            
            const ResponsiveManager = require('../../assets/js/responsive-manager.js');
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            responsiveManager = new ResponsiveManager();
            
            expect(consoleSpy).toHaveBeenCalledWith('ResponsiveManager: matchMedia not supported');
            expect(responsiveManager.currentBreakpoint).toBe('desktop'); // Default fallback
            
            consoleSpy.mockRestore();
        });
        
        test('should handle DOM ready states', () => {
            // Test when DOM is already ready
            Object.defineProperty(document, 'readyState', {
                writable: true,
                value: 'complete'
            });
            
            mockMatchMedia.mockImplementation(() => ({
                matches: false,
                addEventListener: jest.fn(),
                addListener: jest.fn()
            }));
            
            // This should not throw an error
            expect(() => {
                require('../../assets/js/responsive-manager.js');
            }).not.toThrow();
        });
    });
});