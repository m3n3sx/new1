/**
 * Simple Tab Manager Test
 * Basic functionality test for LASTabManager
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

// Load the UI repair system
require('../../assets/js/ui-repair.js');

describe('LASTabManager - Basic Functionality', () => {
    let tabManager;
    let mockCore;

    beforeEach(() => {
        // Create simple test DOM
        document.body.innerHTML = `
            <div class="nav-tab-wrapper">
                <button class="nav-tab las-tab" data-tab="general" id="tab-general">General</button>
                <button class="nav-tab las-tab" data-tab="menu" id="tab-menu">Menu</button>
            </div>
            <div class="las-tab-panels">
                <div class="las-tab-panel" id="las-tab-general" data-tab="general">General content</div>
                <div class="las-tab-panel" id="las-tab-menu" data-tab="menu">Menu content</div>
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

    test('should create tab manager instance', () => {
        expect(tabManager).toBeDefined();
        expect(tabManager.core).toBe(mockCore);
    });

    test('should initialize and discover tabs', async () => {
        await tabManager.init();

        expect(tabManager.initialized).toBe(true);
        expect(tabManager.tabButtons.size).toBe(2);
        expect(tabManager.tabPanels.size).toBe(2);
    });

    test('should set active tab', async () => {
        await tabManager.init();
        
        const result = tabManager.setActiveTab('menu', false, false);
        
        expect(result).toBe(true);
        expect(tabManager.getActiveTab()).toBe('menu');
    });

    test('should handle tab clicks', async () => {
        await tabManager.init();
        
        const menuButton = document.querySelector('[data-tab="menu"]');
        menuButton.click();
        
        expect(tabManager.getActiveTab()).toBe('menu');
    });

    test('should return all available tabs', async () => {
        await tabManager.init();
        
        const allTabs = tabManager.getAllTabs();
        
        expect(allTabs).toEqual(['general', 'menu']);
    });

    test('should check if tab exists', async () => {
        await tabManager.init();
        
        expect(tabManager.hasTab('general')).toBe(true);
        expect(tabManager.hasTab('menu')).toBe(true);
        expect(tabManager.hasTab('nonexistent')).toBe(false);
    });
});