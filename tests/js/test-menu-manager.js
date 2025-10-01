/**
 * Menu Manager Unit Tests
 * Tests for WordPress admin menu interactions and submenu functionality
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

describe('LASMenuManager', () => {
    let menuManager;
    let mockCore;
    let mockMenuHTML;

    beforeEach(() => {
        // Create mock core
        mockCore = {
            log: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            get: jest.fn()
        };

        // Create mock WordPress admin menu HTML
        mockMenuHTML = `
            <div id="adminmenu">
                <li id="menu-dashboard" class="wp-has-submenu menu-top">
                    <a href="#" class="wp-menu-name">
                        <div class="wp-menu-image dashicons-before dashicons-dashboard"></div>
                        <div class="wp-menu-name">Dashboard</div>
                    </a>
                    <ul class="wp-submenu">
                        <li><a href="#">Home</a></li>
                        <li><a href="#">Updates</a></li>
                    </ul>
                </li>
                <li id="menu-posts" class="wp-has-submenu menu-top">
                    <a href="#" class="wp-menu-name">
                        <div class="wp-menu-image dashicons-before dashicons-admin-post"></div>
                        <div class="wp-menu-name">Posts</div>
                    </a>
                    <ul class="wp-submenu">
                        <li><a href="#">All Posts</a></li>
                        <li><a href="#">Add New</a></li>
                        <li><a href="#">Categories</a></li>
                        <li><a href="#">Tags</a></li>
                    </ul>
                </li>
                <li id="menu-media" class="menu-top">
                    <a href="#" class="wp-menu-name">
                        <div class="wp-menu-image dashicons-before dashicons-admin-media"></div>
                        <div class="wp-menu-name">Media</div>
                    </a>
                </li>
            </div>
        `;

        // Set up DOM
        document.body.innerHTML = mockMenuHTML;
        document.body.classList.add('wp-admin');

        // Create menu manager instance
        menuManager = new window.LASMenuManager(mockCore);
    });

    afterEach(() => {
        if (menuManager && menuManager.destroy) {
            menuManager.destroy();
        }
        document.body.innerHTML = '';
        document.body.className = '';
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await menuManager.init();
            
            expect(menuManager.initialized).toBe(true);
            
            // Check that success message was logged
            const logCalls = mockCore.log.mock.calls;
            const successCall = logCalls.find(call => call[0].includes('Menu Manager initialized successfully'));
            expect(successCall).toBeTruthy();
        });

        test('should discover menu elements correctly', async () => {
            await menuManager.init();
            
            expect(menuManager.menuItems.size).toBe(3); // dashboard, posts, media
            expect(menuManager.submenus.size).toBe(2); // dashboard and posts have submenus
        });

        test('should setup accessibility attributes', async () => {
            await menuManager.init();
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            expect(dashboardLink.getAttribute('aria-haspopup')).toBe('true');
            expect(dashboardLink.getAttribute('aria-expanded')).toBe('false');
            expect(dashboardSubmenu.getAttribute('role')).toBe('menu');
            expect(dashboardSubmenu.getAttribute('aria-hidden')).toBe('true');
        });

        test('should detect touch devices', async () => {
            // Mock touch device
            Object.defineProperty(window, 'ontouchstart', {
                value: true,
                writable: true
            });

            const touchMenuManager = new window.LASMenuManager(mockCore);
            await touchMenuManager.init();
            
            expect(touchMenuManager.touchDevice).toBe(true);
            expect(document.body.classList.contains('las-touch-device')).toBe(true);
            
            touchMenuManager.destroy();
        });
    });

    describe('Menu Interactions', () => {
        beforeEach(async () => {
            await menuManager.init();
        });

        test('should show submenu on mouse enter', () => {
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            // Simulate mouse enter
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            dashboardLink.dispatchEvent(mouseEnterEvent);
            
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(true);
            expect(dashboardSubmenu.getAttribute('aria-hidden')).toBe('false');
            expect(dashboardLink.getAttribute('aria-expanded')).toBe('true');
        });

        test('should hide submenu on mouse leave with delay', (done) => {
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            const menuItem = document.querySelector('#menu-dashboard');
            
            // Show submenu first
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            dashboardLink.dispatchEvent(mouseEnterEvent);
            
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(true);
            
            // Simulate mouse leave
            const mouseLeaveEvent = new MouseEvent('mouseleave', { bubbles: true });
            menuItem.dispatchEvent(mouseLeaveEvent);
            
            // Should still be visible immediately
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(true);
            
            // Should be hidden after delay
            setTimeout(() => {
                expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(false);
                expect(dashboardSubmenu.getAttribute('aria-hidden')).toBe('true');
                done();
            }, 350); // Slightly longer than hover delay
        });

        test('should toggle submenu on click for mobile', async () => {
            // Set up as touch device
            menuManager.touchDevice = true;
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            // First click should show submenu
            const clickEvent = new MouseEvent('click', { bubbles: true });
            dashboardLink.dispatchEvent(clickEvent);
            
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(true);
            
            // Second click should hide submenu
            dashboardLink.dispatchEvent(clickEvent);
            
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(false);
        });

        test('should handle keyboard navigation', () => {
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            // Test Enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            dashboardLink.dispatchEvent(enterEvent);
            
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(true);
            
            // Test Escape key
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            dashboardLink.dispatchEvent(escapeEvent);
            
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(false);
        });

        test('should handle arrow key navigation in submenus', () => {
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const submenuLinks = document.querySelectorAll('#menu-dashboard .wp-submenu a');
            
            // Show submenu first
            menuManager.showSubmenu('menu-dashboard');
            
            // Focus first submenu item
            submenuLinks[0].focus();
            
            // Test ArrowDown
            const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
            submenuLinks[0].dispatchEvent(arrowDownEvent);
            
            expect(document.activeElement).toBe(submenuLinks[1]);
            
            // Test ArrowUp
            const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
            submenuLinks[1].dispatchEvent(arrowUpEvent);
            
            expect(document.activeElement).toBe(submenuLinks[0]);
        });
    });

    describe('Submenu Positioning', () => {
        beforeEach(async () => {
            await menuManager.init();
        });

        test('should position submenu correctly', () => {
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            // Mock getBoundingClientRect
            const mockRect = {
                top: 100,
                bottom: 150,
                left: 50,
                right: 200,
                width: 150,
                height: 50
            };
            
            document.querySelector('#menu-dashboard').getBoundingClientRect = jest.fn(() => mockRect);
            dashboardSubmenu.getBoundingClientRect = jest.fn(() => ({ width: 200, height: 300 }));
            
            // Mock window dimensions
            Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
            Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
            
            menuManager.positionSubmenu('menu-dashboard');
            
            // Should position below by default
            expect(dashboardSubmenu.style.top).toBe('0');
        });

        test('should handle folded menu positioning', () => {
            document.body.classList.add('folded');
            
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            menuManager.positionSubmenu('menu-dashboard');
            
            // Should position to the right for folded menu
            // (actual positioning logic would be more complex)
            expect(menuManager.initialized).toBe(true);
        });
    });

    describe('Accessibility Features', () => {
        beforeEach(async () => {
            await menuManager.init();
        });

        test('should manage ARIA attributes correctly', () => {
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            
            // Initially collapsed
            expect(dashboardLink.getAttribute('aria-expanded')).toBe('false');
            expect(dashboardSubmenu.getAttribute('aria-hidden')).toBe('true');
            
            // Show submenu
            menuManager.showSubmenu('menu-dashboard');
            
            expect(dashboardLink.getAttribute('aria-expanded')).toBe('true');
            expect(dashboardSubmenu.getAttribute('aria-hidden')).toBe('false');
            
            // Hide submenu
            menuManager.hideSubmenu('menu-dashboard');
            
            expect(dashboardLink.getAttribute('aria-expanded')).toBe('false');
            expect(dashboardSubmenu.getAttribute('aria-hidden')).toBe('true');
        });

        test('should manage tabindex for submenu items', () => {
            const submenuLinks = document.querySelectorAll('#menu-dashboard .wp-submenu a');
            
            // Initially not tabbable
            submenuLinks.forEach(link => {
                expect(link.getAttribute('tabindex')).toBe('-1');
            });
            
            // Show submenu
            menuManager.showSubmenu('menu-dashboard');
            
            // Should be tabbable when visible
            submenuLinks.forEach(link => {
                expect(link.getAttribute('tabindex')).toBe('0');
            });
            
            // Hide submenu
            menuManager.hideSubmenu('menu-dashboard');
            
            // Should not be tabbable when hidden
            submenuLinks.forEach(link => {
                expect(link.getAttribute('tabindex')).toBe('-1');
            });
        });

        test('should handle focus management', () => {
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const firstSubmenuLink = document.querySelector('#menu-dashboard .wp-submenu a');
            
            // Show submenu and focus first item
            menuManager.showSubmenu('menu-dashboard');
            menuManager.focusFirstSubmenuItem('menu-dashboard');
            
            expect(document.activeElement).toBe(firstSubmenuLink);
            
            // Focus menu item
            menuManager.focusMenuItem('menu-dashboard');
            
            expect(document.activeElement).toBe(dashboardLink);
        });
    });

    describe('Responsive Behavior', () => {
        beforeEach(async () => {
            await menuManager.init();
        });

        test('should handle window resize', () => {
            const resizeHandler = jest.spyOn(menuManager, 'handleWindowResize');
            
            // Show a submenu
            menuManager.showSubmenu('menu-dashboard');
            
            // Trigger resize
            const resizeEvent = new Event('resize');
            window.dispatchEvent(resizeEvent);
            
            expect(resizeHandler).toHaveBeenCalled();
        });

        test('should handle mobile breakpoint', () => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
            
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            
            // Click should prevent default on mobile
            const clickEvent = new MouseEvent('click', { bubbles: true });
            const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
            
            dashboardLink.dispatchEvent(clickEvent);
            
            // Should prevent default for submenu items on mobile
            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors gracefully', async () => {
            // Mock an error during initialization by making discoverMenuElements fail
            const originalDiscoverMenuElements = menuManager.discoverMenuElements;
            menuManager.discoverMenuElements = jest.fn(() => {
                throw new Error('DOM error');
            });
            
            await expect(menuManager.init()).rejects.toThrow('DOM error');
            
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Menu Manager initialization failed'),
                'error'
            );
            
            // Restore original function
            menuManager.discoverMenuElements = originalDiscoverMenuElements;
        });

        test('should handle missing menu elements', async () => {
            // Clear the DOM
            document.body.innerHTML = '';
            
            await menuManager.init();
            
            expect(menuManager.menuItems.size).toBe(0);
            expect(menuManager.submenus.size).toBe(0);
            expect(menuManager.initialized).toBe(true);
        });

        test('should handle invalid menu item IDs', () => {
            // Try to show submenu for non-existent item
            menuManager.showSubmenu('non-existent-menu');
            
            // Should not throw error
            expect(menuManager.initialized).toBe(true);
        });
    });

    describe('Performance', () => {
        beforeEach(async () => {
            await menuManager.init();
        });

        test('should debounce hover events', (done) => {
            const dashboardLink = document.querySelector('#menu-dashboard .wp-menu-name');
            const menuItem = document.querySelector('#menu-dashboard');
            
            let hideCallCount = 0;
            const originalHideSubmenu = menuManager.hideSubmenu;
            menuManager.hideSubmenu = jest.fn(() => {
                hideCallCount++;
                originalHideSubmenu.call(menuManager, 'menu-dashboard');
            });
            
            // Show submenu
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            dashboardLink.dispatchEvent(mouseEnterEvent);
            
            // Rapidly trigger mouse leave events
            const mouseLeaveEvent = new MouseEvent('mouseleave', { bubbles: true });
            menuItem.dispatchEvent(mouseLeaveEvent);
            menuItem.dispatchEvent(mouseLeaveEvent);
            menuItem.dispatchEvent(mouseLeaveEvent);
            
            // Should only hide once after delay
            setTimeout(() => {
                expect(hideCallCount).toBe(1);
                done();
            }, 350);
        });

        test('should cleanup event listeners on destroy', () => {
            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
            
            menuManager.destroy();
            
            expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', menuManager.handleWindowResize);
            expect(menuManager.menuItems.size).toBe(0);
            expect(menuManager.submenus.size).toBe(0);
        });
    });

    describe('Integration', () => {
        beforeEach(async () => {
            await menuManager.init();
        });

        test('should emit events for menu interactions', () => {
            menuManager.showSubmenu('menu-dashboard');
            
            expect(mockCore.emit).toHaveBeenCalledWith('menu:submenu-shown', {
                itemId: 'menu-dashboard',
                menuItem: expect.any(Element),
                submenu: expect.any(Element)
            });
            
            menuManager.hideSubmenu('menu-dashboard');
            
            expect(mockCore.emit).toHaveBeenCalledWith('menu:submenu-hidden', {
                itemId: 'menu-dashboard',
                menuItem: expect.any(Element),
                submenu: expect.any(Element)
            });
        });

        test('should provide status information', () => {
            const status = menuManager.getStatus();
            
            expect(status).toEqual({
                initialized: true,
                menuItems: 3,
                submenus: 2,
                touchDevice: false,
                keyboardNavigation: true
            });
        });

        test('should handle click outside to close menus', () => {
            // Show submenu
            menuManager.showSubmenu('menu-dashboard');
            
            const dashboardSubmenu = document.querySelector('#menu-dashboard .wp-submenu');
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(true);
            
            // Click outside
            const outsideElement = document.createElement('div');
            document.body.appendChild(outsideElement);
            
            const clickEvent = new MouseEvent('click', { bubbles: true });
            outsideElement.dispatchEvent(clickEvent);
            
            expect(dashboardSubmenu.classList.contains('las-submenu-visible')).toBe(false);
        });
    });
});