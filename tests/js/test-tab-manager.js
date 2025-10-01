/**
 * Tab Manager Unit Tests
 * Tests for LASTabManager functionality including state persistence and accessibility
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

// Load the UI repair system
require('../../assets/js/ui-repair.js');

describe('LASTabManager', () => {
    let tabManager;
    let mockCore;
    let mockStateManager;
    let container;

    beforeEach(() => {
        // Create test DOM structure
        document.body.innerHTML = `
            <div class="las-fresh-settings-wrap">
                <div class="nav-tab-wrapper">
                    <button class="nav-tab las-tab" data-tab="general" id="tab-general">General</button>
                    <button class="nav-tab las-tab" data-tab="menu" id="tab-menu">Menu</button>
                    <button class="nav-tab las-tab" data-tab="advanced" id="tab-advanced">Advanced</button>
                </div>
                <div class="las-tab-panels">
                    <div class="las-tab-panel" id="las-tab-general" data-tab="general">
                        <h3>General Settings</h3>
                        <p>General content</p>
                    </div>
                    <div class="las-tab-panel" id="las-tab-menu" data-tab="menu">
                        <h3>Menu Settings</h3>
                        <p>Menu content</p>
                    </div>
                    <div class="las-tab-panel" id="las-tab-advanced" data-tab="advanced">
                        <h3>Advanced Settings</h3>
                        <p>Advanced content</p>
                    </div>
                </div>
            </div>
        `;

        // Mock state manager
        mockStateManager = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true),
            remove: jest.fn().mockResolvedValue(true)
        };

        // Mock core manager
        mockCore = {
            get: jest.fn((name) => {
                if (name === 'state') return mockStateManager;
                return null;
            }),
            emit: jest.fn(),
            on: jest.fn(),
            log: jest.fn()
        };

        // Create tab manager instance
        tabManager = new window.LASTabManager(mockCore);

        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn()
            },
            writable: true
        });

        // Mock location and history
        delete window.location;
        window.location = {
            hash: '',
            pathname: '/wp-admin/admin.php',
            search: '?page=las-settings'
        };

        delete window.history;
        window.history = {
            replaceState: jest.fn()
        };
    });

    afterEach(() => {
        if (tabManager && tabManager.initialized) {
            tabManager.destroy();
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize successfully with valid DOM structure', async () => {
            await tabManager.init();

            expect(tabManager.initialized).toBe(true);
            expect(tabManager.tabButtons.size).toBe(3);
            expect(tabManager.tabPanels.size).toBe(3);
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Tab Manager initialized successfully'),
                'success'
            );
        });

        test('should discover tab buttons and panels correctly', async () => {
            await tabManager.init();

            expect(tabManager.hasTab('general')).toBe(true);
            expect(tabManager.hasTab('menu')).toBe(true);
            expect(tabManager.hasTab('advanced')).toBe(true);
            expect(tabManager.hasTab('nonexistent')).toBe(false);
        });

        test('should set proper ARIA attributes on initialization', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const generalPanel = document.querySelector('#las-tab-general');

            expect(generalButton.getAttribute('role')).toBe('tab');
            expect(generalButton.getAttribute('aria-selected')).toBe('true'); // Should be active
            expect(generalButton.getAttribute('aria-controls')).toBe('las-tab-general');
            
            expect(generalPanel.getAttribute('role')).toBe('tabpanel');
            expect(generalPanel.getAttribute('aria-labelledby')).toBe('tab-general');
        });

        test('should throw error when no tab buttons found', async () => {
            document.body.innerHTML = '<div>No tabs here</div>';
            
            await expect(tabManager.init()).rejects.toThrow('No tab buttons found');
        });

        test('should handle missing tab panels gracefully', async () => {
            document.body.innerHTML = `
                <div class="nav-tab-wrapper">
                    <button class="nav-tab las-tab" data-tab="general">General</button>
                </div>
            `;

            tabManager = new window.LASTabManager(mockCore);
            await tabManager.init();

            expect(tabManager.initialized).toBe(true);
            expect(tabManager.tabButtons.size).toBe(1);
            expect(tabManager.tabPanels.size).toBe(0);
        });
    });

    describe('Tab State Management', () => {
        beforeEach(async () => {
            await tabManager.init();
        });

        test('should set active tab correctly', () => {
            const result = tabManager.setActiveTab('menu');

            expect(result).toBe(true);
            expect(tabManager.getActiveTab()).toBe('menu');
            
            const menuButton = document.querySelector('[data-tab="menu"]');
            const menuPanel = document.querySelector('#las-tab-menu');
            
            expect(menuButton.classList.contains('active')).toBe(true);
            expect(menuButton.getAttribute('aria-selected')).toBe('true');
            expect(menuPanel.classList.contains('active')).toBe(true);
            expect(menuPanel.getAttribute('aria-hidden')).toBe('false');
        });

        test('should deactivate previous tab when switching', () => {
            tabManager.setActiveTab('general');
            tabManager.setActiveTab('menu');

            const generalButton = document.querySelector('[data-tab="general"]');
            const generalPanel = document.querySelector('#las-tab-general');
            
            expect(generalButton.classList.contains('active')).toBe(false);
            expect(generalButton.getAttribute('aria-selected')).toBe('false');
            expect(generalPanel.classList.contains('active')).toBe(false);
            expect(generalPanel.getAttribute('aria-hidden')).toBe('true');
        });

        test('should return false for invalid tab ID', () => {
            const result = tabManager.setActiveTab('nonexistent');
            expect(result).toBe(false);
        });

        test('should not change tab if already active', () => {
            tabManager.setActiveTab('general');
            const emitSpy = jest.spyOn(tabManager, 'emit');
            
            const result = tabManager.setActiveTab('general');
            
            expect(result).toBe(true);
            expect(emitSpy).not.toHaveBeenCalledWith('tab:changed', expect.any(Object));
        });

        test('should emit events when changing tabs', () => {
            tabManager.setActiveTab('general');
            
            tabManager.setActiveTab('menu');

            expect(mockCore.emit).toHaveBeenCalledWith('tab:before-change', {
                tabId: 'menu',
                previousTab: 'general',
                cancelable: true
            });

            expect(mockCore.emit).toHaveBeenCalledWith('tab:changed', {
                tabId: 'menu',
                previousTab: 'general',
                timestamp: expect.any(Number)
            });
        });
    });

    describe('State Persistence', () => {
        beforeEach(async () => {
            await tabManager.init();
        });

        test('should save tab state to state manager', async () => {
            tabManager.setActiveTab('menu');

            expect(mockStateManager.set).toHaveBeenCalledWith('activeTab', 'menu');
        });

        test('should save tab state to localStorage as fallback', () => {
            tabManager.setActiveTab('advanced');

            expect(localStorage.setItem).toHaveBeenCalledWith('las_active_tab', 'advanced');
        });

        test('should restore tab state from URL hash', async () => {
            window.location.hash = '#menu';
            
            const newTabManager = new window.LASTabManager(mockCore);
            await newTabManager.init();

            expect(newTabManager.getActiveTab()).toBe('menu');
            
            newTabManager.destroy();
        });

        test('should restore tab state from state manager', async () => {
            mockStateManager.get.mockResolvedValue('advanced');
            
            const newTabManager = new window.LASTabManager(mockCore);
            await newTabManager.init();

            expect(newTabManager.getActiveTab()).toBe('advanced');
            
            newTabManager.destroy();
        });

        test('should restore tab state from localStorage', async () => {
            localStorage.getItem.mockReturnValue('menu');
            
            const newTabManager = new window.LASTabManager(mockCore);
            await newTabManager.init();

            expect(newTabManager.getActiveTab()).toBe('menu');
            
            newTabManager.destroy();
        });

        test('should use first tab as default when no saved state', async () => {
            const newTabManager = new window.LASTabManager(mockCore);
            await newTabManager.init();

            expect(newTabManager.getActiveTab()).toBe('general');
            
            newTabManager.destroy();
        });
    });

    describe('URL Hash Management', () => {
        beforeEach(async () => {
            await tabManager.init();
        });

        test('should update URL hash when changing tabs', () => {
            tabManager.setActiveTab('menu');

            expect(window.history.replaceState).toHaveBeenCalledWith(
                null,
                '',
                '/wp-admin/admin.php?page=las-settings#menu'
            );
        });

        test('should not update URL when updateUrl is false', () => {
            tabManager.setActiveTab('menu', true, false);

            expect(window.history.replaceState).not.toHaveBeenCalled();
        });

        test('should handle hash change events', () => {
            window.location.hash = '#advanced';
            
            const event = new Event('hashchange');
            window.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('advanced');
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(async () => {
            await tabManager.init();
        });

        test('should handle Enter key to activate tab', () => {
            const menuButton = document.querySelector('[data-tab="menu"]');
            
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            menuButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('menu');
        });

        test('should handle Space key to activate tab', () => {
            const advancedButton = document.querySelector('[data-tab="advanced"]');
            
            const event = new KeyboardEvent('keydown', { key: ' ' });
            advancedButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('advanced');
        });

        test('should navigate with arrow keys', () => {
            tabManager.setActiveTab('general');
            
            const generalButton = document.querySelector('[data-tab="general"]');
            const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            generalButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('menu');
        });

        test('should wrap around when navigating with arrows', () => {
            tabManager.setActiveTab('advanced');
            
            const advancedButton = document.querySelector('[data-tab="advanced"]');
            const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            advancedButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should navigate to first tab with Home key', () => {
            tabManager.setActiveTab('advanced');
            
            const advancedButton = document.querySelector('[data-tab="advanced"]');
            const event = new KeyboardEvent('keydown', { key: 'Home' });
            advancedButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should navigate to last tab with End key', () => {
            tabManager.setActiveTab('general');
            
            const generalButton = document.querySelector('[data-tab="general"]');
            const event = new KeyboardEvent('keydown', { key: 'End' });
            generalButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('advanced');
        });

        test('should disable keyboard navigation when requested', () => {
            tabManager.setKeyboardNavigation(false);
            
            const menuButton = document.querySelector('[data-tab="menu"]');
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            menuButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('general'); // Should not change
        });
    });

    describe('Tab History', () => {
        beforeEach(async () => {
            await tabManager.init();
        });

        test('should track tab history', () => {
            tabManager.setActiveTab('general');
            tabManager.setActiveTab('menu');
            tabManager.setActiveTab('advanced');

            const history = tabManager.getTabHistory();
            expect(history).toHaveLength(2);
            expect(history[0].from).toBe('general');
            expect(history[0].to).toBe('menu');
            expect(history[1].from).toBe('menu');
            expect(history[1].to).toBe('advanced');
        });

        test('should go to previous tab in history', () => {
            tabManager.setActiveTab('general');
            tabManager.setActiveTab('menu');
            
            const result = tabManager.goToPreviousTab();
            
            expect(result).toBe(true);
            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should return false when no previous tab available', () => {
            const result = tabManager.goToPreviousTab();
            expect(result).toBe(false);
        });

        test('should limit history length', () => {
            tabManager.maxHistoryLength = 2;
            
            // Create more history entries than the limit
            for (let i = 0; i < 5; i++) {
                tabManager.setActiveTab('general');
                tabManager.setActiveTab('menu');
            }

            const history = tabManager.getTabHistory();
            expect(history.length).toBeLessThanOrEqual(2);
        });
    });

    describe('Click Events', () => {
        beforeEach(async () => {
            await tabManager.init();
        });

        test('should handle tab button clicks', () => {
            const menuButton = document.querySelector('[data-tab="menu"]');
            
            menuButton.click();

            expect(tabManager.getActiveTab()).toBe('menu');
        });

        test('should prevent default on tab button clicks', () => {
            const menuButton = document.querySelector('[data-tab="menu"]');
            
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            
            menuButton.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });

    describe('Utility Methods', () => {
        beforeEach(async () => {
            await tabManager.init();
        });

        test('should return all available tabs', () => {
            const allTabs = tabManager.getAllTabs();
            
            expect(allTabs).toEqual(['general', 'menu', 'advanced']);
        });

        test('should check if tab exists', () => {
            expect(tabManager.hasTab('general')).toBe(true);
            expect(tabManager.hasTab('nonexistent')).toBe(false);
        });

        test('should focus specific tab', () => {
            const menuButton = document.querySelector('[data-tab="menu"]');
            const focusSpy = jest.spyOn(menuButton, 'focus');
            
            tabManager.focusTab('menu');

            expect(focusSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle errors during tab switching gracefully', async () => {
            await tabManager.init();
            
            // Mock an error in updateButtonStates
            const originalUpdateButtonStates = tabManager.updateButtonStates;
            tabManager.updateButtonStates = jest.fn(() => {
                throw new Error('Test error');
            });

            const result = tabManager.setActiveTab('menu');

            expect(result).toBe(false);
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Error switching to tab menu'),
                'error'
            );

            // Restore original method
            tabManager.updateButtonStates = originalUpdateButtonStates;
        });

        test('should handle localStorage errors gracefully', async () => {
            localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            await tabManager.init();
            tabManager.setActiveTab('menu');

            // Should not throw error, just log warning
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Could not save to localStorage'),
                'warn'
            );
        });
    });

    describe('Cleanup and Destruction', () => {
        test('should clean up properly on destroy', async () => {
            await tabManager.init();
            
            const menuButton = document.querySelector('[data-tab="menu"]');
            const clickSpy = jest.spyOn(menuButton, 'removeEventListener');
            
            tabManager.destroy();

            expect(clickSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(tabManager.tabButtons.size).toBe(0);
            expect(tabManager.tabPanels.size).toBe(0);
            expect(tabManager.tabHistory).toEqual([]);
        });

        test('should handle errors during destruction gracefully', async () => {
            await tabManager.init();
            
            // Mock an error during cleanup
            tabManager.tabButtons.clear = jest.fn(() => {
                throw new Error('Cleanup error');
            });

            expect(() => tabManager.destroy()).not.toThrow();
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Error destroying Tab Manager'),
                'error'
            );
        });
    });
});