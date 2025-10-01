/**
 * NavigationManager Tests
 * Tests for modern navigation system with tab management
 */

import NavigationManager from '../../assets/js/modules/navigation-manager.js';

// Mock core system
const mockCore = {
    events: new Map(),
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    },
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }
};

// Mock DOM environment
const mockDOM = () => {
    global.document = {
        createElement: jest.fn((tag) => ({
            tagName: tag.toUpperCase(),
            className: '',
            innerHTML: '',
            style: {},
            attributes: new Map(),
            children: [],
            parentElement: null,
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                toggle: jest.fn(),
                contains: jest.fn()
            },
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            appendChild: jest.fn(),
            remove: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn()
        })),
        querySelector: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };

    global.window = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };

    global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
    };

    global.ResizeObserver = jest.fn(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn()
    }));
};

describe('NavigationManager', () => {
    let navigationManager;
    let mockContainer;

    beforeEach(() => {
        mockDOM();
        jest.clearAllMocks();
        
        mockContainer = document.createElement('div');
        navigationManager = new NavigationManager(mockCore);
    });

    afterEach(() => {
        if (navigationManager) {
            navigationManager.destroy();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(navigationManager.tabs.size).toBe(0);
            expect(navigationManager.activeTab).toBeNull();
            expect(navigationManager.state.activeTabId).toBeNull();
            expect(navigationManager.state.tabOrder).toEqual([]);
        });

        test('should emit initialization event', () => {
            const initSpy = jest.fn();
            mockCore.on('navigation:initialized', initSpy);
            
            new NavigationManager(mockCore);
            
            expect(initSpy).toHaveBeenCalled();
        });

        test('should load state from localStorage', () => {
            const savedState = {
                activeTabId: 'tab1',
                tabOrder: ['tab1', 'tab2'],
                collapsedTabs: []
            };
            localStorage.getItem.mockReturnValue(JSON.stringify(savedState));
            
            const nav = new NavigationManager(mockCore);
            
            expect(nav.state.activeTabId).toBe('tab1');
            expect(nav.state.tabOrder).toEqual(['tab1', 'tab2']);
        });
    });

    describe('Container Creation', () => {
        test('should create navigation container with proper attributes', () => {
            const container = navigationManager.createContainer(mockContainer);
            
            expect(container.className).toBe('las-navigation');
            expect(container.setAttribute).toHaveBeenCalledWith('role', 'tablist');
            expect(container.setAttribute).toHaveBeenCalledWith('aria-label', 'Main navigation');
        });

        test('should wrap container in responsive wrapper', () => {
            navigationManager.createContainer(mockContainer);
            
            expect(mockContainer.appendChild).toHaveBeenCalled();
        });
    });

    describe('Tab Management', () => {
        beforeEach(() => {
            navigationManager.createContainer(mockContainer);
        });

        test('should add tab with basic configuration', () => {
            const config = {
                id: 'test-tab',
                label: 'Test Tab',
                content: '<div>Test Content</div>'
            };

            const tab = navigationManager.addTab(config);

            expect(tab.id).toBe('test-tab');
            expect(tab.label).toBe('Test Tab');
            expect(navigationManager.tabs.has('test-tab')).toBe(true);
            expect(navigationManager.state.tabOrder).toContain('test-tab');
        });

        test('should add tab with all configuration options', () => {
            const config = {
                id: 'full-tab',
                label: 'Full Tab',
                icon: '🏠',
                content: '<div>Content</div>',
                disabled: false,
                closable: true,
                badge: '5'
            };

            const tab = navigationManager.addTab(config);

            expect(tab.icon).toBe('🏠');
            expect(tab.closable).toBe(true);
            expect(tab.badge).toBe('5');
        });

        test('should not add duplicate tabs', () => {
            const config = { id: 'duplicate', label: 'Duplicate' };
            
            navigationManager.addTab(config);
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            navigationManager.addTab(config);

            expect(consoleSpy).toHaveBeenCalledWith('Tab with id "duplicate" already exists');
            expect(navigationManager.tabs.size).toBe(1);
            
            consoleSpy.mockRestore();
        });

        test('should remove tab and clean up', () => {
            const config = { id: 'removable', label: 'Removable' };
            navigationManager.addTab(config);
            
            const emitSpy = jest.fn();
            mockCore.on('navigation:tab-removed', emitSpy);

            navigationManager.removeTab('removable');

            expect(navigationManager.tabs.has('removable')).toBe(false);
            expect(navigationManager.state.tabOrder).not.toContain('removable');
            expect(emitSpy).toHaveBeenCalledWith({ tabId: 'removable' });
        });

        test('should activate next tab when removing active tab', () => {
            navigationManager.addTab({ id: 'tab1', label: 'Tab 1' });
            navigationManager.addTab({ id: 'tab2', label: 'Tab 2' });
            
            navigationManager.activateTab('tab1');
            navigationManager.removeTab('tab1');

            expect(navigationManager.activeTab).toBe('tab2');
        });
    });

    describe('Tab Activation', () => {
        beforeEach(() => {
            navigationManager.createContainer(mockContainer);
            navigationManager.addTab({ id: 'tab1', label: 'Tab 1' });
            navigationManager.addTab({ id: 'tab2', label: 'Tab 2' });
        });

        test('should activate tab and update state', () => {
            const emitSpy = jest.fn();
            mockCore.on('navigation:tab-activated', emitSpy);

            navigationManager.activateTab('tab1');

            expect(navigationManager.activeTab).toBe('tab1');
            expect(navigationManager.state.activeTabId).toBe('tab1');
            expect(emitSpy).toHaveBeenCalledWith({
                tabId: 'tab1',
                tab: navigationManager.tabs.get('tab1')
            });
        });

        test('should not activate disabled tab', () => {
            navigationManager.addTab({ id: 'disabled', label: 'Disabled', disabled: true });
            
            navigationManager.activateTab('disabled');

            expect(navigationManager.activeTab).not.toBe('disabled');
        });

        test('should deactivate previous tab when activating new one', () => {
            navigationManager.activateTab('tab1');
            const tab1 = navigationManager.tabs.get('tab1');
            
            navigationManager.activateTab('tab2');

            expect(tab1.active).toBe(false);
            expect(navigationManager.tabs.get('tab2').active).toBe(true);
        });
    });

    describe('Badge Management', () => {
        beforeEach(() => {
            navigationManager.createContainer(mockContainer);
            navigationManager.addTab({ id: 'badged', label: 'Badged Tab' });
        });

        test('should update tab badge', () => {
            navigationManager.updateBadge('badged', '10');
            
            const tab = navigationManager.tabs.get('badged');
            expect(tab.badge).toBe('10');
        });

        test('should remove badge when set to null', () => {
            navigationManager.updateBadge('badged', '5');
            navigationManager.updateBadge('badged', null);
            
            const tab = navigationManager.tabs.get('badged');
            expect(tab.badge).toBeNull();
        });
    });

    describe('Tab State Management', () => {
        beforeEach(() => {
            navigationManager.createContainer(mockContainer);
            navigationManager.addTab({ id: 'stateful', label: 'Stateful Tab' });
        });

        test('should enable/disable tab', () => {
            navigationManager.setTabDisabled('stateful', true);
            
            const tab = navigationManager.tabs.get('stateful');
            expect(tab.disabled).toBe(true);
        });

        test('should activate another tab when disabling active tab', () => {
            navigationManager.addTab({ id: 'backup', label: 'Backup Tab' });
            navigationManager.activateTab('stateful');
            
            navigationManager.setTabDisabled('stateful', true);

            expect(navigationManager.activeTab).toBe('backup');
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            navigationManager.createContainer(mockContainer);
            navigationManager.addTab({ id: 'tab1', label: 'Tab 1' });
            navigationManager.addTab({ id: 'tab2', label: 'Tab 2' });
            navigationManager.addTab({ id: 'tab3', label: 'Tab 3' });
        });

        test('should handle arrow key navigation', () => {
            navigationManager.activateTab('tab1');
            
            const event = { key: 'ArrowRight', preventDefault: jest.fn() };
            navigationManager.handleKeyNavigation(event, 'tab1');

            expect(event.preventDefault).toHaveBeenCalled();
            expect(navigationManager.activeTab).toBe('tab2');
        });

        test('should wrap around with arrow keys', () => {
            navigationManager.activateTab('tab3');
            
            const event = { key: 'ArrowRight', preventDefault: jest.fn() };
            navigationManager.handleKeyNavigation(event, 'tab3');

            expect(navigationManager.activeTab).toBe('tab1');
        });

        test('should handle Home and End keys', () => {
            navigationManager.activateTab('tab2');
            
            let event = { key: 'Home', preventDefault: jest.fn() };
            navigationManager.handleKeyNavigation(event, 'tab2');
            expect(navigationManager.activeTab).toBe('tab1');

            event = { key: 'End', preventDefault: jest.fn() };
            navigationManager.handleKeyNavigation(event, 'tab1');
            expect(navigationManager.activeTab).toBe('tab3');
        });

        test('should handle Delete key for closable tabs', () => {
            navigationManager.addTab({ id: 'closable', label: 'Closable', closable: true });
            
            const event = { key: 'Delete', preventDefault: jest.fn() };
            navigationManager.handleKeyNavigation(event, 'closable');

            expect(event.preventDefault).toHaveBeenCalled();
            expect(navigationManager.tabs.has('closable')).toBe(false);
        });
    });

    describe('Responsive Behavior', () => {
        beforeEach(() => {
            navigationManager.createContainer(mockContainer);
        });

        test('should handle mobile layout', () => {
            navigationManager.handleResponsiveLayout(600);

            expect(navigationManager.container.classList.toggle).toHaveBeenCalledWith('las-navigation-mobile', true);
        });

        test('should handle tablet layout', () => {
            navigationManager.handleResponsiveLayout(800);

            expect(navigationManager.container.classList.toggle).toHaveBeenCalledWith('las-navigation-tablet', true);
        });

        test('should handle desktop layout', () => {
            navigationManager.handleResponsiveLayout(1200);

            expect(navigationManager.container.classList.toggle).toHaveBeenCalledWith('las-navigation-desktop', true);
        });
    });

    describe('State Persistence', () => {
        test('should save state to localStorage', () => {
            navigationManager.addTab({ id: 'persistent', label: 'Persistent' });
            navigationManager.activateTab('persistent');

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'las-navigation-state',
                expect.stringContaining('persistent')
            );
        });

        test('should handle localStorage errors gracefully', () => {
            localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            navigationManager.saveState();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to save navigation state:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('Cleanup', () => {
        test('should destroy navigation and clean up resources', () => {
            navigationManager.createContainer(mockContainer);
            navigationManager.addTab({ id: 'cleanup', label: 'Cleanup' });
            
            const emitSpy = jest.fn();
            mockCore.on('navigation:destroyed', emitSpy);

            navigationManager.destroy();

            expect(navigationManager.tabs.size).toBe(0);
            expect(navigationManager.activeTab).toBeNull();
            expect(navigationManager.container).toBeNull();
            expect(emitSpy).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        beforeEach(() => {
            navigationManager.createContainer(mockContainer);
        });

        test('should set proper ARIA attributes on tabs', () => {
            navigationManager.addTab({ id: 'accessible', label: 'Accessible Tab' });
            
            const tab = navigationManager.tabs.get('accessible');
            expect(tab.element.setAttribute).toHaveBeenCalledWith('role', 'tab');
            expect(tab.element.setAttribute).toHaveBeenCalledWith('aria-controls', 'las-panel-accessible');
        });

        test('should update aria-selected when activating tabs', () => {
            navigationManager.addTab({ id: 'aria-tab', label: 'ARIA Tab' });
            navigationManager.activateTab('aria-tab');
            
            const tab = navigationManager.tabs.get('aria-tab');
            expect(tab.element.setAttribute).toHaveBeenCalledWith('aria-selected', 'true');
            expect(tab.element.setAttribute).toHaveBeenCalledWith('tabindex', '0');
        });

        test('should set aria-disabled for disabled tabs', () => {
            navigationManager.addTab({ id: 'disabled-aria', label: 'Disabled', disabled: true });
            
            const tab = navigationManager.tabs.get('disabled-aria');
            expect(tab.element.setAttribute).toHaveBeenCalledWith('aria-disabled', 'true');
        });
    });
});