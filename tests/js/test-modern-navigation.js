/**
 * Test Suite for Modern Navigation System
 * Tests accessibility, keyboard navigation, responsive behavior, and state management
 */

describe('Modern Navigation System', () => {
    let navigationManager;
    let container;
    
    beforeEach(() => {
        // Create test DOM structure
        document.body.innerHTML = `
            <div id="las-settings-tabs">
                <div class="las-tabs" role="tablist" aria-label="Settings navigation">
                    <button class="las-tab" role="tab" data-panel="general" aria-selected="true" tabindex="0">
                        <span class="las-tab-icon dashicons dashicons-admin-settings"></span>
                        <span class="las-tab-text">General</span>
                    </button>
                    <button class="las-tab" role="tab" data-panel="menu" aria-selected="false" tabindex="-1">
                        <span class="las-tab-icon dashicons dashicons-menu"></span>
                        <span class="las-tab-text">Menu</span>
                    </button>
                    <button class="las-tab" role="tab" data-panel="content" aria-selected="false" tabindex="-1">
                        <span class="las-tab-icon dashicons dashicons-admin-page"></span>
                        <span class="las-tab-text">Content</span>
                    </button>
                </div>
                
                <div id="las-tab-general" class="las-tab-panel" role="tabpanel" aria-hidden="false">
                    <h3>General Settings</h3>
                    <input type="text" id="test-input-1" />
                    <button id="test-button-1">Test Button</button>
                </div>
                
                <div id="las-tab-menu" class="las-tab-panel" role="tabpanel" aria-hidden="true" style="display: none;">
                    <h3>Menu Settings</h3>
                    <input type="text" id="test-input-2" />
                </div>
                
                <div id="las-tab-content" class="las-tab-panel" role="tabpanel" aria-hidden="true" style="display: none;">
                    <h3>Content Settings</h3>
                    <select id="test-select-1">
                        <option value="1">Option 1</option>
                        <option value="2">Option 2</option>
                    </select>
                </div>
            </div>
        `;
        
        container = document.getElementById('las-settings-tabs');
        
        // Mock localStorage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
        };
        global.localStorage = localStorageMock;
        
        // Mock history API
        global.history = {
            replaceState: jest.fn()
        };
        
        // Initialize navigation manager
        navigationManager = new NavigationManager({
            container: '#las-settings-tabs',
            tabSelector: '.las-tab',
            panelSelector: '.las-tab-panel',
            activeClass: 'las-tab-active'
        });
    });
    
    afterEach(() => {
        if (navigationManager) {
            navigationManager.destroy();
        }
        document.body.innerHTML = '';
        localStorage.clear();
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with correct number of tabs and panels', () => {
            expect(navigationManager.tabs.length).toBe(3);
            expect(navigationManager.panels.length).toBe(3);
        });
        
        test('should set up proper ARIA attributes', () => {
            const tabs = document.querySelectorAll('.las-tab');
            const panels = document.querySelectorAll('.las-tab-panel');
            
            tabs.forEach((tab, index) => {
                expect(tab.getAttribute('role')).toBe('tab');
                expect(tab.hasAttribute('aria-selected')).toBe(true);
                expect(tab.hasAttribute('tabindex')).toBe(true);
                expect(tab.hasAttribute('aria-controls')).toBe(true);
            });
            
            panels.forEach((panel, index) => {
                expect(panel.getAttribute('role')).toBe('tabpanel');
                expect(panel.hasAttribute('aria-labelledby')).toBe(true);
                expect(panel.hasAttribute('aria-hidden')).toBe(true);
            });
        });
        
        test('should create live region for screen reader announcements', () => {
            const liveRegion = document.getElementById('las-tab-announcements');
            expect(liveRegion).toBeTruthy();
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
        });
        
        test('should set first tab as active by default', () => {
            expect(navigationManager.getActiveIndex()).toBe(0);
            expect(navigationManager.tabs[0].getAttribute('aria-selected')).toBe('true');
            expect(navigationManager.panels[0].getAttribute('aria-hidden')).toBe('false');
        });
    });
    
    describe('Tab Activation', () => {
        test('should activate tab by index', () => {
            navigationManager.activateTab(1);
            
            expect(navigationManager.getActiveIndex()).toBe(1);
            expect(navigationManager.tabs[1].getAttribute('aria-selected')).toBe('true');
            expect(navigationManager.tabs[0].getAttribute('aria-selected')).toBe('false');
        });
        
        test('should show correct panel when tab is activated', () => {
            navigationManager.activateTab(2);
            
            expect(navigationManager.panels[2].style.display).not.toBe('none');
            expect(navigationManager.panels[2].getAttribute('aria-hidden')).toBe('false');
            expect(navigationManager.panels[0].getAttribute('aria-hidden')).toBe('true');
        });
        
        test('should not activate invalid tab index', () => {
            const initialIndex = navigationManager.getActiveIndex();
            
            navigationManager.activateTab(-1);
            expect(navigationManager.getActiveIndex()).toBe(initialIndex);
            
            navigationManager.activateTab(10);
            expect(navigationManager.getActiveIndex()).toBe(initialIndex);
        });
        
        test('should dispatch custom event on tab change', () => {
            const eventHandler = jest.fn();
            container.addEventListener('las-tab-change', eventHandler);
            
            navigationManager.activateTab(1);
            
            expect(eventHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: expect.objectContaining({
                        activeIndex: 1,
                        previousIndex: 0,
                        tabId: 'menu'
                    })
                })
            );
        });
    });
    
    describe('Keyboard Navigation', () => {
        test('should navigate to next tab with ArrowRight', () => {
            const firstTab = navigationManager.tabs[0];
            firstTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            container.dispatchEvent(event);
            
            expect(document.activeElement).toBe(navigationManager.tabs[1]);
        });
        
        test('should navigate to previous tab with ArrowLeft', () => {
            navigationManager.activateTab(1);
            const secondTab = navigationManager.tabs[1];
            secondTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
            container.dispatchEvent(event);
            
            expect(document.activeElement).toBe(navigationManager.tabs[0]);
        });
        
        test('should wrap around when navigating past last tab', () => {
            const lastTab = navigationManager.tabs[2];
            lastTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            container.dispatchEvent(event);
            
            expect(document.activeElement).toBe(navigationManager.tabs[0]);
        });
        
        test('should wrap around when navigating before first tab', () => {
            const firstTab = navigationManager.tabs[0];
            firstTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
            container.dispatchEvent(event);
            
            expect(document.activeElement).toBe(navigationManager.tabs[2]);
        });
        
        test('should go to first tab with Home key', () => {
            const lastTab = navigationManager.tabs[2];
            lastTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: 'Home' });
            container.dispatchEvent(event);
            
            expect(document.activeElement).toBe(navigationManager.tabs[0]);
        });
        
        test('should go to last tab with End key', () => {
            const firstTab = navigationManager.tabs[0];
            firstTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: 'End' });
            container.dispatchEvent(event);
            
            expect(document.activeElement).toBe(navigationManager.tabs[2]);
        });
        
        test('should activate tab with Enter key', () => {
            const secondTab = navigationManager.tabs[1];
            secondTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            container.dispatchEvent(event);
            
            expect(navigationManager.getActiveIndex()).toBe(1);
        });
        
        test('should activate tab with Space key', () => {
            const thirdTab = navigationManager.tabs[2];
            thirdTab.focus();
            
            const event = new KeyboardEvent('keydown', { key: ' ' });
            container.dispatchEvent(event);
            
            expect(navigationManager.getActiveIndex()).toBe(2);
        });
    });
    
    describe('State Management', () => {
        test('should save active tab to localStorage', () => {
            navigationManager.activateTab(1);
            
            expect(localStorage.setItem).toHaveBeenCalledWith('las_active_tab', 'menu');
        });
        
        test('should update URL hash when tab changes', () => {
            navigationManager.activateTab(2);
            
            expect(history.replaceState).toHaveBeenCalledWith(
                null, 
                null, 
                expect.stringContaining('#tab-content')
            );
        });
        
        test('should restore tab from localStorage', () => {
            localStorage.getItem.mockReturnValue('content');
            
            // Create new instance to test restoration
            const newManager = new NavigationManager({
                container: '#las-settings-tabs',
                tabSelector: '.las-tab',
                panelSelector: '.las-tab-panel'
            });
            
            expect(newManager.getActiveIndex()).toBe(2);
            
            newManager.destroy();
        });
        
        test('should restore tab from URL hash', () => {
            // Mock window.location.hash
            Object.defineProperty(window, 'location', {
                value: { hash: '#tab-menu' },
                writable: true
            });
            
            const newManager = new NavigationManager({
                container: '#las-settings-tabs',
                tabSelector: '.las-tab',
                panelSelector: '.las-tab-panel'
            });
            
            expect(newManager.getActiveIndex()).toBe(1);
            
            newManager.destroy();
        });
    });
    
    describe('Accessibility Features', () => {
        test('should announce tab changes to screen readers', () => {
            navigationManager.activateTab(1);
            
            const liveRegion = document.getElementById('las-tab-announcements');
            expect(liveRegion.textContent).toContain('Menu');
        });
        
        test('should manage tabindex correctly', () => {
            navigationManager.activateTab(1);
            
            expect(navigationManager.tabs[0].getAttribute('tabindex')).toBe('-1');
            expect(navigationManager.tabs[1].getAttribute('tabindex')).toBe('0');
            expect(navigationManager.tabs[2].getAttribute('tabindex')).toBe('-1');
        });
        
        test('should set aria-selected correctly', () => {
            navigationManager.activateTab(2);
            
            expect(navigationManager.tabs[0].getAttribute('aria-selected')).toBe('false');
            expect(navigationManager.tabs[1].getAttribute('aria-selected')).toBe('false');
            expect(navigationManager.tabs[2].getAttribute('aria-selected')).toBe('true');
        });
        
        test('should manage aria-hidden for panels', () => {
            navigationManager.activateTab(1);
            
            expect(navigationManager.panels[0].getAttribute('aria-hidden')).toBe('true');
            expect(navigationManager.panels[1].getAttribute('aria-hidden')).toBe('false');
            expect(navigationManager.panels[2].getAttribute('aria-hidden')).toBe('true');
        });
    });
    
    describe('Touch Support', () => {
        test('should handle swipe gestures', () => {
            const tabContainer = container.querySelector('.las-tabs');
            
            // Mock touch events
            const touchStart = new TouchEvent('touchstart', {
                touches: [{ clientX: 100 }]
            });
            const touchEnd = new TouchEvent('touchend', {
                changedTouches: [{ clientX: 50 }]
            });
            
            tabContainer.dispatchEvent(touchStart);
            tabContainer.dispatchEvent(touchEnd);
            
            // Should swipe right (previous tab)
            expect(navigationManager.getActiveIndex()).toBe(0); // No change as we're at first tab
        });
        
        test('should swipe to next tab with left swipe', () => {
            const tabContainer = container.querySelector('.las-tabs');
            
            const touchStart = new TouchEvent('touchstart', {
                touches: [{ clientX: 50 }]
            });
            const touchEnd = new TouchEvent('touchend', {
                changedTouches: [{ clientX: 100 }]
            });
            
            tabContainer.dispatchEvent(touchStart);
            tabContainer.dispatchEvent(touchEnd);
            
            // Should swipe left (next tab)
            expect(navigationManager.getActiveIndex()).toBe(1);
        });
    });
    
    describe('Public API', () => {
        test('should provide getActiveIndex method', () => {
            expect(navigationManager.getActiveIndex()).toBe(0);
            navigationManager.activateTab(1);
            expect(navigationManager.getActiveIndex()).toBe(1);
        });
        
        test('should provide getActiveTab method', () => {
            const activeTab = navigationManager.getActiveTab();
            expect(activeTab).toBe(navigationManager.tabs[0]);
        });
        
        test('should provide getActivePanel method', () => {
            const activePanel = navigationManager.getActivePanel();
            expect(activePanel).toBe(navigationManager.panels[0]);
        });
        
        test('should provide goToTab method with string identifier', () => {
            navigationManager.goToTab('menu');
            expect(navigationManager.getActiveIndex()).toBe(1);
        });
        
        test('should provide goToTab method with numeric index', () => {
            navigationManager.goToTab(2);
            expect(navigationManager.getActiveIndex()).toBe(2);
        });
    });
    
    describe('Error Handling', () => {
        test('should handle missing container gracefully', () => {
            document.body.innerHTML = '';
            
            expect(() => {
                new NavigationManager({ container: '#nonexistent' });
            }).not.toThrow();
        });
        
        test('should handle invalid tab identifiers', () => {
            const initialIndex = navigationManager.getActiveIndex();
            
            navigationManager.goToTab('nonexistent');
            expect(navigationManager.getActiveIndex()).toBe(initialIndex);
        });
        
        test('should prevent activation during transition', () => {
            navigationManager.isTransitioning = true;
            const initialIndex = navigationManager.getActiveIndex();
            
            navigationManager.activateTab(1);
            expect(navigationManager.getActiveIndex()).toBe(initialIndex);
        });
    });
    
    describe('Cleanup', () => {
        test('should remove event listeners on destroy', () => {
            const removeEventListenerSpy = jest.spyOn(container, 'removeEventListener');
            
            navigationManager.destroy();
            
            expect(removeEventListenerSpy).toHaveBeenCalled();
        });
        
        test('should remove live region on destroy', () => {
            navigationManager.destroy();
            
            const liveRegion = document.getElementById('las-tab-announcements');
            expect(liveRegion).toBeFalsy();
        });
    });
    
    describe('Legacy Support', () => {
        test('should convert jQuery UI tabs structure', () => {
            // Create legacy structure
            document.body.innerHTML = `
                <div id="las-settings-tabs">
                    <ul class="ui-tabs-nav">
                        <li><a href="#las-tab-general">
                            <span class="las-tab-icon dashicons dashicons-admin-settings"></span>
                            General
                        </a></li>
                        <li><a href="#las-tab-menu">
                            <span class="las-tab-icon dashicons dashicons-menu"></span>
                            Menu
                        </a></li>
                    </ul>
                    <div id="las-tab-general">General content</div>
                    <div id="las-tab-menu">Menu content</div>
                </div>
            `;
            
            const manager = new NavigationManager({
                container: '#las-settings-tabs'
            });
            
            // Should convert to modern structure
            const modernTabs = document.querySelector('.las-tabs');
            expect(modernTabs).toBeTruthy();
            expect(modernTabs.getAttribute('role')).toBe('tablist');
            
            const tabs = document.querySelectorAll('.las-tab');
            expect(tabs.length).toBe(2);
            
            manager.destroy();
        });
    });
});

// Integration tests
describe('Navigation Integration', () => {
    test('should work with theme manager', () => {
        // Mock theme manager integration
        const themeChangeEvent = new CustomEvent('las-theme-change', {
            detail: { theme: 'dark' }
        });
        
        window.dispatchEvent(themeChangeEvent);
        
        // Navigation should continue to work after theme change
        expect(document.querySelector('.las-tabs')).toBeTruthy();
    });
    
    test('should work with responsive manager', () => {
        // Mock responsive manager integration
        const breakpointChangeEvent = new CustomEvent('las-breakpoint-change', {
            detail: { breakpoint: 'mobile' }
        });
        
        window.dispatchEvent(breakpointChangeEvent);
        
        // Navigation should adapt to mobile breakpoint
        expect(document.querySelector('.las-tabs')).toBeTruthy();
    });
});

// Performance tests
describe('Navigation Performance', () => {
    test('should handle rapid tab switching', () => {
        const startTime = performance.now();
        
        // Rapidly switch tabs
        for (let i = 0; i < 100; i++) {
            navigationManager.activateTab(i % 3);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Should complete within reasonable time (less than 100ms)
        expect(duration).toBeLessThan(100);
    });
    
    test('should not cause memory leaks', () => {
        const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        // Create and destroy multiple instances
        for (let i = 0; i < 10; i++) {
            const manager = new NavigationManager({
                container: '#las-settings-tabs'
            });
            manager.destroy();
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        // Memory usage should not increase significantly
        if (performance.memory) {
            expect(finalMemory - initialMemory).toBeLessThan(1000000); // Less than 1MB
        }
    });
});