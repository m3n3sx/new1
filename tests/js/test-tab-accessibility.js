/**
 * Tab Manager Accessibility Tests
 * Tests for keyboard navigation and ARIA compliance
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

// Load the UI repair system
require('../../assets/js/ui-repair.js');

describe('LASTabManager - Accessibility Features', () => {
    let tabManager;
    let mockCore;

    beforeEach(() => {
        // Create test DOM structure
        document.body.innerHTML = `
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
        `;

        // Mock core manager
        mockCore = {
            get: jest.fn(() => null),
            emit: jest.fn(),
            on: jest.fn(),
            log: jest.fn()
        };

        // Create tab manager
        tabManager = new window.LASTabManager(mockCore);
    });

    afterEach(() => {
        if (tabManager && tabManager.initialized) {
            tabManager.destroy();
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('ARIA Attributes', () => {
        test('should set proper ARIA attributes on tab buttons', async () => {
            await tabManager.init();

            const buttons = document.querySelectorAll('.las-tab');
            
            buttons.forEach(button => {
                expect(button.getAttribute('role')).toBe('tab');
                expect(button.hasAttribute('aria-selected')).toBe(true);
                expect(button.hasAttribute('aria-controls')).toBe(true);
                expect(button.hasAttribute('tabindex')).toBe(true);
            });
        });

        test('should set proper ARIA attributes on tab panels', async () => {
            await tabManager.init();

            const panels = document.querySelectorAll('.las-tab-panel');
            
            panels.forEach(panel => {
                expect(panel.getAttribute('role')).toBe('tabpanel');
                expect(panel.hasAttribute('aria-hidden')).toBe(true);
                expect(panel.hasAttribute('aria-labelledby')).toBe(true);
            });
        });

        test('should link tab buttons to their panels via ARIA', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const generalPanel = document.querySelector('#las-tab-general');

            expect(generalButton.getAttribute('aria-controls')).toBe('las-tab-general');
            expect(generalPanel.getAttribute('aria-labelledby')).toBe('tab-general');
        });

        test('should update ARIA attributes when switching tabs', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const menuButton = document.querySelector('[data-tab="menu"]');
            const generalPanel = document.querySelector('#las-tab-general');
            const menuPanel = document.querySelector('#las-tab-menu');

            // Switch to menu tab
            tabManager.setActiveTab('menu', false, false);

            // Check button ARIA states
            expect(generalButton.getAttribute('aria-selected')).toBe('false');
            expect(generalButton.getAttribute('tabindex')).toBe('-1');
            expect(menuButton.getAttribute('aria-selected')).toBe('true');
            expect(menuButton.getAttribute('tabindex')).toBe('0');

            // Check panel ARIA states
            expect(generalPanel.getAttribute('aria-hidden')).toBe('true');
            expect(menuPanel.getAttribute('aria-hidden')).toBe('false');
        });
    });

    describe('Keyboard Navigation', () => {
        test('should activate tab with Enter key', async () => {
            await tabManager.init();

            const menuButton = document.querySelector('[data-tab="menu"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'Enter',
                bubbles: true,
                cancelable: true
            });

            menuButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('menu');
        });

        test('should activate tab with Space key', async () => {
            await tabManager.init();

            const advancedButton = document.querySelector('[data-tab="advanced"]');
            const event = new KeyboardEvent('keydown', { 
                key: ' ',
                bubbles: true,
                cancelable: true
            });

            advancedButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('advanced');
        });

        test('should navigate with ArrowRight key', async () => {
            await tabManager.init();
            tabManager.setActiveTab('general', false, false);

            const generalButton = document.querySelector('[data-tab="general"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'ArrowRight',
                bubbles: true,
                cancelable: true
            });

            generalButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('menu');
        });

        test('should navigate with ArrowLeft key', async () => {
            await tabManager.init();
            tabManager.setActiveTab('menu', false, false);

            const menuButton = document.querySelector('[data-tab="menu"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'ArrowLeft',
                bubbles: true,
                cancelable: true
            });

            menuButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should navigate with ArrowDown key', async () => {
            await tabManager.init();
            tabManager.setActiveTab('general', false, false);

            const generalButton = document.querySelector('[data-tab="general"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'ArrowDown',
                bubbles: true,
                cancelable: true
            });

            generalButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('menu');
        });

        test('should navigate with ArrowUp key', async () => {
            await tabManager.init();
            tabManager.setActiveTab('menu', false, false);

            const menuButton = document.querySelector('[data-tab="menu"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'ArrowUp',
                bubbles: true,
                cancelable: true
            });

            menuButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should wrap around when navigating with arrows', async () => {
            await tabManager.init();
            tabManager.setActiveTab('advanced', false, false);

            const advancedButton = document.querySelector('[data-tab="advanced"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'ArrowRight',
                bubbles: true,
                cancelable: true
            });

            advancedButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should navigate to first tab with Home key', async () => {
            await tabManager.init();
            tabManager.setActiveTab('advanced', false, false);

            const advancedButton = document.querySelector('[data-tab="advanced"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'Home',
                bubbles: true,
                cancelable: true
            });

            advancedButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should navigate to last tab with End key', async () => {
            await tabManager.init();
            tabManager.setActiveTab('general', false, false);

            const generalButton = document.querySelector('[data-tab="general"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'End',
                bubbles: true,
                cancelable: true
            });

            generalButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('advanced');
        });

        test('should prevent default behavior for handled keys', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'Enter',
                bubbles: true,
                cancelable: true
            });

            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            generalButton.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        test('should focus tab when navigating with arrows', async () => {
            await tabManager.init();
            tabManager.setActiveTab('general', false, false);

            const menuButton = document.querySelector('[data-tab="menu"]');
            const focusSpy = jest.spyOn(menuButton, 'focus');

            const generalButton = document.querySelector('[data-tab="general"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'ArrowRight',
                bubbles: true,
                cancelable: true
            });

            generalButton.dispatchEvent(event);

            expect(focusSpy).toHaveBeenCalled();
        });

        test('should allow disabling keyboard navigation', async () => {
            await tabManager.init();
            tabManager.setKeyboardNavigation(false);

            const menuButton = document.querySelector('[data-tab="menu"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'Enter',
                bubbles: true,
                cancelable: true
            });

            menuButton.dispatchEvent(event);

            // Should not change tab when keyboard navigation is disabled
            expect(tabManager.getActiveTab()).toBe('general');
        });

        test('should re-enable keyboard navigation', async () => {
            await tabManager.init();
            
            // Disable then re-enable
            tabManager.setKeyboardNavigation(false);
            tabManager.setKeyboardNavigation(true);

            const menuButton = document.querySelector('[data-tab="menu"]');
            const event = new KeyboardEvent('keydown', { 
                key: 'Enter',
                bubbles: true,
                cancelable: true
            });

            menuButton.dispatchEvent(event);

            expect(tabManager.getActiveTab()).toBe('menu');
        });
    });

    describe('Focus Management', () => {
        test('should emit focus events', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const focusEvent = new FocusEvent('focus', { bubbles: true });

            generalButton.dispatchEvent(focusEvent);

            expect(mockCore.emit).toHaveBeenCalledWith('tab:focused', { tabId: 'general' });
        });

        test('should emit blur events', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const blurEvent = new FocusEvent('blur', { bubbles: true });

            generalButton.dispatchEvent(blurEvent);

            expect(mockCore.emit).toHaveBeenCalledWith('tab:blurred', { tabId: 'general' });
        });

        test('should focus specific tab programmatically', async () => {
            await tabManager.init();

            const menuButton = document.querySelector('[data-tab="menu"]');
            const focusSpy = jest.spyOn(menuButton, 'focus');

            tabManager.focusTab('menu');

            expect(focusSpy).toHaveBeenCalled();
        });

        test('should handle focus on non-existent tab gracefully', async () => {
            await tabManager.init();

            // Should not throw error
            expect(() => {
                tabManager.focusTab('nonexistent');
            }).not.toThrow();
        });
    });

    describe('Tabindex Management', () => {
        test('should set correct tabindex values', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const menuButton = document.querySelector('[data-tab="menu"]');
            const advancedButton = document.querySelector('[data-tab="advanced"]');

            // Active tab should have tabindex="0"
            expect(generalButton.getAttribute('tabindex')).toBe('0');
            
            // Inactive tabs should have tabindex="-1"
            expect(menuButton.getAttribute('tabindex')).toBe('-1');
            expect(advancedButton.getAttribute('tabindex')).toBe('-1');
        });

        test('should update tabindex when switching tabs', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const menuButton = document.querySelector('[data-tab="menu"]');

            // Switch to menu tab
            tabManager.setActiveTab('menu', false, false);

            expect(generalButton.getAttribute('tabindex')).toBe('-1');
            expect(menuButton.getAttribute('tabindex')).toBe('0');
        });
    });

    describe('Screen Reader Support', () => {
        test('should provide proper button IDs for screen readers', async () => {
            await tabManager.init();

            const buttons = document.querySelectorAll('.las-tab');
            
            buttons.forEach(button => {
                expect(button.id).toBeTruthy();
                expect(button.id).toMatch(/^tab-/);
            });
        });

        test('should link panels to buttons for screen readers', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const generalPanel = document.querySelector('#las-tab-general');

            const buttonId = generalButton.id;
            const panelLabelledBy = generalPanel.getAttribute('aria-labelledby');

            expect(panelLabelledBy).toBe(buttonId);
        });

        test('should indicate active state to screen readers', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const menuButton = document.querySelector('[data-tab="menu"]');

            expect(generalButton.getAttribute('aria-selected')).toBe('true');
            expect(menuButton.getAttribute('aria-selected')).toBe('false');

            // Switch tabs
            tabManager.setActiveTab('menu', false, false);

            expect(generalButton.getAttribute('aria-selected')).toBe('false');
            expect(menuButton.getAttribute('aria-selected')).toBe('true');
        });

        test('should hide inactive panels from screen readers', async () => {
            await tabManager.init();

            const generalPanel = document.querySelector('#las-tab-general');
            const menuPanel = document.querySelector('#las-tab-menu');

            expect(generalPanel.getAttribute('aria-hidden')).toBe('false');
            expect(menuPanel.getAttribute('aria-hidden')).toBe('true');

            // Switch tabs
            tabManager.setActiveTab('menu', false, false);

            expect(generalPanel.getAttribute('aria-hidden')).toBe('true');
            expect(menuPanel.getAttribute('aria-hidden')).toBe('false');
        });
    });

    describe('CSS Classes for Accessibility', () => {
        test('should add active class to current tab', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            const menuButton = document.querySelector('[data-tab="menu"]');

            expect(generalButton.classList.contains('active')).toBe(true);
            expect(menuButton.classList.contains('active')).toBe(false);

            // Switch tabs
            tabManager.setActiveTab('menu', false, false);

            expect(generalButton.classList.contains('active')).toBe(false);
            expect(menuButton.classList.contains('active')).toBe(true);
        });

        test('should add WordPress nav-tab-active class', async () => {
            await tabManager.init();

            const generalButton = document.querySelector('[data-tab="general"]');
            
            expect(generalButton.classList.contains('nav-tab-active')).toBe(true);

            // Switch tabs
            tabManager.setActiveTab('menu', false, false);

            expect(generalButton.classList.contains('nav-tab-active')).toBe(false);
            
            const menuButton = document.querySelector('[data-tab="menu"]');
            expect(menuButton.classList.contains('nav-tab-active')).toBe(true);
        });

        test('should add active class to current panel', async () => {
            await tabManager.init();

            const generalPanel = document.querySelector('#las-tab-general');
            const menuPanel = document.querySelector('#las-tab-menu');

            expect(generalPanel.classList.contains('active')).toBe(true);
            expect(menuPanel.classList.contains('active')).toBe(false);

            // Switch tabs
            tabManager.setActiveTab('menu', false, false);

            expect(generalPanel.classList.contains('active')).toBe(false);
            expect(menuPanel.classList.contains('active')).toBe(true);
        });
    });
});