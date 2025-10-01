/**
 * Integration Tests for Core JavaScript Infrastructure
 * Tests the basic functionality of the new core system
 */

describe('Core JavaScript Infrastructure Integration', () => {
    let mockJQuery;
    
    beforeEach(() => {
        // Mock jQuery
        mockJQuery = jest.fn(() => ({
            ready: jest.fn((callback) => {
                // Simulate DOM ready
                setTimeout(callback, 0);
                return mockJQuery;
            })
        }));
        
        // Set up global objects
        global.jQuery = mockJQuery;
        global.$ = mockJQuery;
        global.window = global.window || {};
        global.window.LAS = {};
        global.lasAdminData = {
            ajax_url: '/wp-admin/admin-ajax.php',
            nonce: 'test-nonce-123',
            debug: false
        };
        
        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });
    
    afterEach(() => {
        // Clean up
        delete global.jQuery;
        delete global.$;
        delete global.window.LAS;
        delete global.lasAdminData;
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });
    
    test('should define LAS namespace', () => {
        // Load the main script
        require('../../js/admin-settings.js');
        
        expect(global.window.LAS).toBeDefined();
    });
    
    test('should define core classes', () => {
        // Load the main script
        require('../../js/admin-settings.js');
        
        expect(global.window.LAS.CoreManager).toBeDefined();
        expect(global.window.LAS.ErrorHandler).toBeDefined();
        expect(typeof global.window.LAS.CoreManager).toBe('function');
        expect(typeof global.window.LAS.ErrorHandler).toBe('function');
    });
    
    test('should create core manager instance', () => {
        // Load the main script
        require('../../js/admin-settings.js');
        
        const coreManager = new global.window.LAS.CoreManager();
        
        expect(coreManager).toBeDefined();
        expect(coreManager.modules).toBeInstanceOf(Map);
        expect(coreManager.config).toEqual(global.lasAdminData);
        expect(coreManager.initialized).toBe(false);
    });
    
    test('should create error handler instance', () => {
        // Load the main script
        require('../../js/admin-settings.js');
        
        const mockCore = {
            config: { debug: false },
            emit: jest.fn()
        };
        
        const errorHandler = new global.window.LAS.ErrorHandler(mockCore);
        
        expect(errorHandler).toBeDefined();
        expect(errorHandler.core).toBe(mockCore);
        expect(errorHandler.notifications).toEqual([]);
        expect(errorHandler.maxNotifications).toBe(5);
    });
    
    test('should initialize jQuery ready callback', (done) => {
        // Mock jQuery ready to call callback immediately
        const readyCallback = jest.fn();
        mockJQuery.mockReturnValue({
            ready: jest.fn((callback) => {
                readyCallback();
                callback();
                return mockJQuery;
            })
        });
        
        // Load the main script
        require('../../js/admin-settings.js');
        
        // Verify jQuery ready was called
        setTimeout(() => {
            expect(mockJQuery).toHaveBeenCalled();
            expect(readyCallback).toHaveBeenCalled();
            done();
        }, 10);
    });
    
    test('should handle missing configuration gracefully', () => {
        delete global.lasAdminData;
        
        // Should not throw error
        expect(() => {
            require('../../js/admin-settings.js');
        }).not.toThrow();
    });
    
    test('should provide legacy compatibility', () => {
        // Load the main script
        require('../../js/admin-settings.js');
        
        // Simulate successful initialization
        setTimeout(() => {
            expect(global.window.LAS.legacy).toBeDefined();
        }, 10);
    });
});