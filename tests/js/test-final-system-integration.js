/**
 * Final System Integration Tests - JavaScript
 * 
 * Comprehensive integration testing for all JavaScript modules
 * Tests complete system functionality and module interactions
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

describe('Final System Integration Tests', () => {
    let mockCore;
    let testResults = {};
    
    beforeAll(async () => {
        // Mock WordPress admin environment
        global.wp = {
            ajax: { url: '/wp-admin/admin-ajax.php' },
            nonce: 'test-nonce-12345'
        };
        
        global.lasConfig = {
            ajaxUrl: '/wp-admin/admin-ajax.php',
            nonce: 'test-nonce-12345',
            version: '2.0.0',
            debug: true
        };
        
        // Initialize test results tracking
        testResults = {
            coreInitialized: false,
            modulesLoaded: false,
            settingsWorking: false,
            livePreviewActive: false,
            ajaxFunctional: false,
            performanceAcceptable: false,
            errorHandlingActive: false,
            memoryManaged: false
        };
    });
    
    describe('Core System Initialization', () => {
        test('should initialize LAS Core with all modules', async () => {
            const startTime = performance.now();
            const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Mock LAS Core
            const LASCore = require('../../assets/js/las-core.js');
            mockCore = new LASCore();
            
            // Initialize core system
            await mockCore.init();
            
            expect(mockCore.isInitialized()).toBe(true);
            testResults.coreInitialized = true;
            
            // Performance validation
            const endTime = performance.now();
            const initTime = endTime - startTime;
            
            expect(initTime).toBeLessThan(1000); // Should initialize under 1 second
            testResults.performanceAcceptable = true;
        });
        
        test('should load all required modules', async () => {
            const requiredModules = [
                'settings-manager',
                'live-preview', 
                'ajax-manager',
                'css-variables-engine',
                'color-picker',
                'theme-manager',
                'performance-monitor'
            ];
            
            for (const moduleName of requiredModules) {
                const module = await mockCore.loadModule(moduleName);
                expect(module).toBeDefined();
                expect(typeof module.init).toBe('function');
            }
            
            testResults.modulesLoaded = true;
        });
    });
    
    describe('Settings Management Integration', () => {
        let settingsManager;
        
        beforeEach(async () => {
            settingsManager = await mockCore.loadModule('settings-manager');
        });
        
        test('should handle complete settings workflow', async () => {
            // Test setting values
            settingsManager.set('menu.background_color', '#ff0000');
            settingsManager.set('adminbar.height', '40px');
            settingsManager.set('theme.mode', 'dark');
            
            // Test getting values
            expect(settingsManager.get('menu.background_color')).toBe('#ff0000');
            expect(settingsManager.get('adminbar.height')).toBe('40px');
            expect(settingsManager.get('theme.mode')).toBe('dark');
            
            // Test batch operations
            const batchSettings = {
                'content.background_color': '#ffffff',
                'content.font_size': '14px',
                'general.animation_speed': 'normal'
            };
            
            settingsManager.setBatch(batchSettings);
            
            Object.entries(batchSettings).forEach(([key, value]) => {
                expect(settingsManager.get(key)).toBe(value);
            });
            
            testResults.settingsWorking = true;
        });
        
        test('should handle settings persistence and synchronization', async () => {
            // Test auto-save functionality
            settingsManager.set('test.auto_save', 'test_value');
            
            // Wait for debounced save
            await new Promise(resolve => setTimeout(resolve, 350));
            
            // Verify persistence
            expect(settingsManager.isPersisted('test.auto_save')).toBe(true);
            
            // Test multi-tab synchronization
            const syncEvent = new CustomEvent('storage', {
                detail: {
                    key: 'las_settings',
                    newValue: JSON.stringify({ 'sync.test': 'sync_value' })
                }
            });
            
            window.dispatchEvent(syncEvent);
            
            // Wait for sync processing
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(settingsManager.get('sync.test')).toBe('sync_value');
        });
    });
    
    describe('Live Preview Integration', () => {
        let livePreview;
        let cssVariablesEngine;
        
        beforeEach(async () => {
            livePreview = await mockCore.loadModule('live-preview');
            cssVariablesEngine = await mockCore.loadModule('css-variables-engine');
        });
        
        test('should update preview in real-time', async () => {
            // Mock DOM elements
            document.body.innerHTML = `
                <div id="adminmenu" style="background-color: #23282d;"></div>
                <div id="wpadminbar" style="height: 32px;"></div>
            `;
            
            // Test live preview updates
            livePreview.updateSetting('menu.background_color', '#ff0000');
            
            // Wait for debounced update
            await new Promise(resolve => setTimeout(resolve, 350));
            
            const adminMenu = document.getElementById('adminmenu');
            const computedStyle = window.getComputedStyle(adminMenu);
            
            expect(computedStyle.getPropertyValue('--las-menu-background-color')).toBe('#ff0000');
            
            testResults.livePreviewActive = true;
        });
        
        test('should handle CSS variables engine integration', () => {
            // Test variable setting
            cssVariablesEngine.set('primary-color', '#0073aa');
            cssVariablesEngine.set('secondary-color', '#23282d');
            
            // Test variable retrieval
            expect(cssVariablesEngine.get('primary-color')).toBe('#0073aa');
            expect(cssVariablesEngine.get('secondary-color')).toBe('#23282d');
            
            // Test theme generation
            const themeSettings = {
                'primary-color': '#0073aa',
                'secondary-color': '#23282d',
                'success-color': '#46b450'
            };
            
            const generatedTheme = cssVariablesEngine.generateTheme(themeSettings);
            
            expect(generatedTheme['--las-primary-color']).toBe('#0073aa');
            expect(generatedTheme['--las-secondary-color']).toBe('#23282d');
            expect(generatedTheme['--las-success-color']).toBe('#46b450');
        });
    });
    
    describe('AJAX Communication Integration', () => {
        let ajaxManager;
        
        beforeEach(async () => {
            ajaxManager = await mockCore.loadModule('ajax-manager');
            
            // Mock fetch for AJAX requests
            global.fetch = jest.fn();
        });
        
        test('should handle AJAX requests with retry logic', async () => {
            // Mock successful response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: 'test_response' })
            });
            
            const response = await ajaxManager.request('save_settings', {
                settings: { 'test.key': 'test_value' }
            });
            
            expect(response.success).toBe(true);
            expect(response.data).toBe('test_response');
            
            testResults.ajaxFunctional = true;
        });
        
        test('should handle request failures with retry logic', async () => {
            // Mock failed responses followed by success
            fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, data: 'retry_success' })
                });
            
            const response = await ajaxManager.request('test_action', { test: 'data' });
            
            expect(response.success).toBe(true);
            expect(response.data).toBe('retry_success');
            expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });
    
    describe('Error Handling Integration', () => {
        let errorHandler;
        
        beforeEach(async () => {
            errorHandler = await mockCore.loadModule('error-handler');
        });
        
        test('should capture and handle JavaScript errors', () => {
            const mockError = new Error('Test error');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            // Trigger error handler
            errorHandler.handleError(mockError);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[LAS Error]'),
                expect.objectContaining({
                    message: 'Test error'
                })
            );
            
            consoleSpy.mockRestore();
            testResults.errorHandlingActive = true;
        });
        
        test('should show user-friendly error notifications', () => {
            document.body.innerHTML = '<div id="las-notifications"></div>';
            
            const testError = new Error('Test user error');
            errorHandler.showUserNotification(testError);
            
            const notification = document.querySelector('.las-notification');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Something went wrong');
        });
    });
    
    describe('Performance and Memory Management', () => {
        let performanceMonitor;
        let memoryManager;
        
        beforeEach(async () => {
            performanceMonitor = await mockCore.loadModule('performance-monitor');
            memoryManager = await mockCore.loadModule('memory-manager');
        });
        
        test('should monitor performance metrics', () => {
            // Start performance monitoring
            performanceMonitor.startMeasurement('test-operation');
            
            // Simulate some work
            for (let i = 0; i < 1000; i++) {
                Math.random();
            }
            
            // End measurement
            const metrics = performanceMonitor.endMeasurement('test-operation');
            
            expect(metrics.duration).toBeGreaterThan(0);
            expect(metrics.duration).toBeLessThan(100); // Should be fast
        });
        
        test('should manage memory usage', () => {
            // Test memory monitoring
            const initialMemory = memoryManager.getCurrentUsage();
            
            // Create some objects to increase memory usage
            const testObjects = [];
            for (let i = 0; i < 1000; i++) {
                testObjects.push({ id: i, data: new Array(100).fill('test') });
            }
            
            const peakMemory = memoryManager.getCurrentUsage();
            expect(peakMemory).toBeGreaterThan(initialMemory);
            
            // Test cleanup
            memoryManager.cleanup();
            testObjects.length = 0; // Clear references
            
            testResults.memoryManaged = true;
        });
    });
    
    describe('End-to-End Workflow Integration', () => {
        test('should complete full user workflow', async () => {
            // 1. Initialize system
            expect(mockCore.isInitialized()).toBe(true);
            
            // 2. Load settings
            const settingsManager = await mockCore.loadModule('settings-manager');
            const defaultSettings = settingsManager.getDefaults();
            expect(defaultSettings).toBeDefined();
            
            // 3. Modify settings with live preview
            const livePreview = await mockCore.loadModule('live-preview');
            
            settingsManager.set('menu.background_color', '#ff0000');
            livePreview.updateSetting('menu.background_color', '#ff0000');
            
            // Wait for updates
            await new Promise(resolve => setTimeout(resolve, 350));
            
            // 4. Apply template
            const templateManager = await mockCore.loadModule('template-manager');
            const templateApplied = await templateManager.applyTemplate('minimal');
            expect(templateApplied).toBe(true);
            
            // 5. Save settings via AJAX
            const ajaxManager = await mockCore.loadModule('ajax-manager');
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });
            
            const saveResult = await ajaxManager.request('save_settings', {
                settings: settingsManager.getAllSettings()
            });
            
            expect(saveResult.success).toBe(true);
        });
    });
    
    afterAll(() => {
        // Log final integration results
        const overallStatus = Object.values(testResults).every(result => result === true);
        
        console.log('Final System Integration Results:', {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            testResults,
            overallStatus: overallStatus ? 'PASS' : 'FAIL'
        });
        
        // Clean up
        if (mockCore) {
            mockCore.destroy();
        }
    });
});