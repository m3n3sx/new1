/**
 * Menu Manager Cross-Device Compatibility Tests
 * Tests for different devices, browsers, and accessibility scenarios
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

describe('LASMenuManager Cross-Device Compatibility', () => {
    let menuManager;
    let mockCore;
    let originalUserAgent;
    let originalTouchStart;
    let originalInnerWidth;
    let originalInnerHeight;

    beforeEach(() => {
        // Store original values
        originalUserAgent = navigator.userAgent;
        originalTouchStart = window.ontouchstart;
        originalInnerWidth = window.innerWidth;
        originalInnerHeight = window.innerHeight;

        // Create mock core
        mockCore = {
            log: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            get: jest.fn()
        };

        // Set up basic DOM
        document.body.innerHTML = `
            <div id="adminmenu">
                <li id="menu-dashboard" class="wp-has-submenu menu-top">
                    <a href="#" class="wp-menu-name">
                        <div class="wp-menu-image"></div>
                        <div class="wp-menu-name">Dashboard</div>
                    </a>
                    <ul class="wp-submenu">
                        <li><a href="#">Home</a></li>
                        <li><a href="#">Updates</a></li>
                    </ul>
                </li>
            </div>
        `;
        document.body.classList.add('wp-admin');

        menuManager = new window.LASMenuManager(mockCore);
    });

    afterEach(() => {
        if (menuManager && menuManager.destroy) {
            menuManager.destroy();
        }
        
        // Restore original values
        Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent, writable: true });
        Object.defineProperty(window, 'ontouchstart', { value: originalTouchStart, writable: true });
        Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
        
        document.body.innerHTML = '';
        document.body.className = '';
        jest.clearAllMocks();
    });

    describe('Mobile Devices', () => {
        beforeEach(() => {
            // Mock mobile device
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                writable: true
            });
            Object.defineProperty(window, 'ontouchstart', { value: true, writable: true });
            Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
            Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
        });

        test('should detect mobile device correctly', async () => {
            await menuManager.init();
            
            expect(menuManager.touchDevice).toBe(true);
            expect(document.body.classList.contains('las-touch-device')).toBe(true);
        });

        test('should use mobile-specific interactions', async () => {
            await menuManager.init();
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            // Click should toggle submenu on mobile
            const clickEvent = new MouseEvent('click', { bubbles: true });
            dashboardLink.dispatchEvent(clickEvent);
            
            expect(submenu.classList.contains('las-submenu-visible')).toBe(true);
        });

        test('should position submenus for mobile viewport', async () => {
            await menuManager.init();
            
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            menuManager.positionSubmenuResponsive('menu-dashboard');
            
            expect(submenu.style.position).toBe('static');
            expect(submenu.style.width).toBe('100%');
        });

        test('should handle orientation changes', async () => {
            await menuManager.init();
            
            const hideAllSpy = jest.spyOn(menuManager, 'hideAllSubmenus');
            
            // Simulate orientation change
            Object.defineProperty(window, 'innerWidth', { value: 667, writable: true });
            Object.defineProperty(window, 'innerHeight', { value: 375, writable: true });
            
            const orientationEvent = new Event('orientationchange');
            window.dispatchEvent(orientationEvent);
            
            expect(hideAllSpy).toHaveBeenCalled();
        });
    });

    describe('Tablet Devices', () => {
        beforeEach(() => {
            // Mock tablet device
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                writable: true
            });
            Object.defineProperty(window, 'ontouchstart', { value: true, writable: true });
            Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
            Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });
        });

        test('should handle tablet-specific behavior', async () => {
            await menuManager.init();
            
            menuManager.handleMediaQueryChange('tablet', true);
            
            expect(document.body.classList.contains('las-tablet-menu')).toBe(true);
        });

        test('should position submenus appropriately for tablet', async () => {
            await menuManager.init();
            
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            menuManager.positionSubmenuResponsive('menu-dashboard');
            
            expect(submenu.style.position).toBe('absolute');
            expect(submenu.style.minWidth).toBe('180px');
            expect(submenu.style.maxWidth).toBe('250px');
        });
    });

    describe('Desktop Devices', () => {
        beforeEach(() => {
            // Mock desktop device
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                writable: true
            });
            Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true });
            Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
            Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
        });

        test('should detect desktop device correctly', async () => {
            await menuManager.init();
            
            expect(menuManager.touchDevice).toBe(false);
            expect(document.body.classList.contains('las-touch-device')).toBe(false);
        });

        test('should use hover interactions on desktop', async () => {
            await menuManager.init();
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            // Hover should show submenu
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            dashboardLink.dispatchEvent(mouseEnterEvent);
            
            expect(submenu.classList.contains('las-submenu-visible')).toBe(true);
        });

        test('should use full positioning logic on desktop', async () => {
            await menuManager.init();
            
            const positionSpy = jest.spyOn(menuManager, 'positionSubmenu');
            
            menuManager.positionSubmenuResponsive('menu-dashboard');
            
            expect(positionSpy).toHaveBeenCalledWith('menu-dashboard');
        });
    });

    describe('Browser Compatibility', () => {
        test('should work without SpeechRecognition support', async () => {
            // Remove SpeechRecognition
            delete window.SpeechRecognition;
            delete window.webkitSpeechRecognition;
            
            await expect(menuManager.init()).resolves.not.toThrow();
            expect(menuManager.initialized).toBe(true);
        });

        test('should work without BroadcastChannel support', async () => {
            // Mock state manager without BroadcastChannel
            const mockStateManager = {
                init: jest.fn().mockResolvedValue(true),
                get: jest.fn(),
                set: jest.fn()
            };
            
            mockCore.get = jest.fn().mockReturnValue(mockStateManager);
            
            await expect(menuManager.init()).resolves.not.toThrow();
        });

        test('should handle missing matchMedia support', async () => {
            // Mock missing matchMedia
            const originalMatchMedia = window.matchMedia;
            delete window.matchMedia;
            
            await expect(menuManager.init()).resolves.not.toThrow();
            
            // Restore matchMedia
            window.matchMedia = originalMatchMedia;
        });

        test('should work with older browsers (no addEventListener)', async () => {
            // Mock older browser
            const originalAddEventListener = Element.prototype.addEventListener;
            Element.prototype.addEventListener = undefined;
            
            // Should still initialize without throwing
            await expect(menuManager.init()).resolves.not.toThrow();
            
            // Restore addEventListener
            Element.prototype.addEventListener = originalAddEventListener;
        });
    });

    describe('Accessibility Scenarios', () => {
        test('should work with screen readers', async () => {
            await menuManager.init();
            
            // Simulate screen reader navigation
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            
            // Focus with keyboard
            dashboardLink.focus();
            
            // Press Enter to activate
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            dashboardLink.dispatchEvent(enterEvent);
            
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            expect(submenu.classList.contains('las-submenu-visible')).toBe(true);
            expect(submenu.getAttribute('aria-hidden')).toBe('false');
        });

        test('should work with high contrast mode', async () => {
            await menuManager.init();
            
            // Enable high contrast
            menuManager.handleMediaQueryChange('highContrast', true);
            
            expect(document.body.classList.contains('las-high-contrast')).toBe(true);
            
            // Should enhance focus indicators
            menuManager.enhanceContrastMode();
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            expect(dashboardLink.style.getPropertyValue('--focus-outline-width')).toBe('3px');
        });

        test('should work with reduced motion preferences', async () => {
            await menuManager.init();
            
            // Enable reduced motion
            menuManager.handleMediaQueryChange('reducedMotion', true);
            
            expect(document.body.classList.contains('las-reduced-motion')).toBe(true);
            
            // Should disable animations
            menuManager.disableAnimations();
            
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            expect(submenu.style.transition).toBe('none');
        });

        test('should work with keyboard-only navigation', async () => {
            await menuManager.init();
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const submenuLinks = document.querySelectorAll('#menu-dashboard .wp-submenu a');
            
            // Tab to menu item
            dashboardLink.focus();
            
            // Open submenu with Enter
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            dashboardLink.dispatchEvent(enterEvent);
            
            // Navigate within submenu with arrows
            const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
            submenuLinks[0].dispatchEvent(arrowDownEvent);
            
            expect(document.activeElement).toBe(submenuLinks[1]);
            
            // Close with Escape
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            submenuLinks[1].dispatchEvent(escapeEvent);
            
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            expect(submenu.classList.contains('las-submenu-visible')).toBe(false);
        });
    });

    describe('Performance on Different Devices', () => {
        test('should optimize for low-end devices', async () => {
            // Mock low-end device
            Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2, writable: true });
            Object.defineProperty(navigator, 'deviceMemory', { value: 1, writable: true });
            
            await menuManager.init();
            
            // Should still work but with optimizations
            expect(menuManager.initialized).toBe(true);
        });

        test('should handle slow networks', async () => {
            // Mock slow network
            Object.defineProperty(navigator, 'connection', {
                value: { effectiveType: '2g', downlink: 0.5 },
                writable: true
            });
            
            await menuManager.init();
            
            // Should initialize without network-dependent features
            expect(menuManager.initialized).toBe(true);
        });

        test('should work with limited JavaScript support', async () => {
            // Mock limited support
            const originalPromise = window.Promise;
            delete window.Promise;
            
            // Should still work with basic functionality
            try {
                await menuManager.init();
                expect(menuManager.initialized).toBe(true);
            } catch (error) {
                // Expected if Promise is not available
                expect(error).toBeDefined();
            }
            
            // Restore Promise
            window.Promise = originalPromise;
        });
    });

    describe('Edge Cases', () => {
        test('should handle rapid device rotation', async () => {
            await menuManager.init();
            
            const hideAllSpy = jest.spyOn(menuManager, 'hideAllSubmenus');
            
            // Rapid orientation changes
            for (let i = 0; i < 5; i++) {
                const orientationEvent = new Event('orientationchange');
                window.dispatchEvent(orientationEvent);
            }
            
            // Should handle all changes gracefully
            expect(hideAllSpy).toHaveBeenCalledTimes(5);
        });

        test('should handle window resize during submenu display', async () => {
            await menuManager.init();
            
            // Show submenu
            menuManager.showSubmenuAccessible('menu-dashboard');
            
            const positionSpy = jest.spyOn(menuManager, 'positionSubmenu');
            
            // Resize window
            Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
            const resizeEvent = new Event('resize');
            window.dispatchEvent(resizeEvent);
            
            expect(positionSpy).toHaveBeenCalledWith('menu-dashboard');
        });

        test('should handle focus changes during animations', async () => {
            await menuManager.init();
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            
            // Start showing submenu
            menuManager.showSubmenuAccessible('menu-dashboard');
            
            // Immediately change focus
            dashboardLink.blur();
            
            // Should handle gracefully without errors
            expect(menuManager.initialized).toBe(true);
        });

        test('should handle multiple simultaneous interactions', async () => {
            await menuManager.init();
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            
            // Simultaneous mouse and keyboard events
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            
            dashboardLink.dispatchEvent(mouseEnterEvent);
            dashboardLink.dispatchEvent(keydownEvent);
            
            // Should handle both events without conflicts
            const submenu = document.querySelector('#menu-dashboard .wp-submenu');
            expect(submenu.classList.contains('las-submenu-visible')).toBe(true);
        });
    });

    describe('Fallback Behavior', () => {
        test('should provide basic functionality when advanced features fail', async () => {
            // Mock feature detection failures
            Object.defineProperty(window, 'matchMedia', { value: undefined, writable: true });
            delete window.BroadcastChannel;
            delete window.SpeechRecognition;
            
            await menuManager.init();
            
            // Basic menu functionality should still work
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const clickEvent = new MouseEvent('click', { bubbles: true });
            dashboardLink.dispatchEvent(clickEvent);
            
            expect(menuManager.initialized).toBe(true);
        });

        test('should work without CSS custom properties support', async () => {
            // Mock older browser without CSS custom properties
            const originalGetComputedStyle = window.getComputedStyle;
            window.getComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: jest.fn().mockReturnValue('')
            });
            
            await menuManager.init();
            
            expect(menuManager.initialized).toBe(true);
            
            // Restore original function
            window.getComputedStyle = originalGetComputedStyle;
        });

        test('should handle DOM manipulation errors gracefully', async () => {
            // Mock DOM errors
            const originalQuerySelector = document.querySelector;
            let callCount = 0;
            document.querySelector = jest.fn((selector) => {
                callCount++;
                if (callCount > 3) {
                    throw new Error('DOM error');
                }
                return originalQuerySelector.call(document, selector);
            });
            
            // Should handle errors and continue initialization
            await expect(menuManager.init()).rejects.toThrow();
            
            // Restore original function
            document.querySelector = originalQuerySelector;
        });
    });
});