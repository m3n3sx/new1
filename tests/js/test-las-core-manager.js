/**
 * Unit Tests for LAS Core Manager
 * Tests the core functionality of the LASCoreManager class
 */

// Import the classes from the main file
require('../../js/admin-settings.js');

describe('LASCoreManager', () => {
    let coreManager;
    let mockConfig;
    
    beforeEach(() => {
        // Mock the global configuration
        mockConfig = {
            ajax_url: '/wp-admin/admin-ajax.php',
            nonce: 'test-nonce-123',
            debug: false
        };
        
        // Set up global objects
        window.lasAdminData = mockConfig;
        window.LAS = window.LAS || {};
        
        // Create a fresh instance for each test
        coreManager = new LASCoreManager();
        
        // Mock DOM elements
        document.body.innerHTML = '';
    });
    
    afterEach(() => {
        // Clean up after each test
        if (coreManager) {
            coreManager.cleanup();
        }
        
        // Clear DOM
        document.body.innerHTML = '';
        
        // Clear global objects
        delete window.lasAdminData;
        delete window.LAS;
    });
    
    describe('Constructor', () => {
        test('should initialize with default values', () => {
            expect(coreManager.modules).toBeInstanceOf(Map);
            expect(coreManager.config).toEqual(mockConfig);
            expect(coreManager.initialized).toBe(false);
            expect(coreManager.eventListeners).toBeInstanceOf(Map);
            expect(coreManager.initializationPromise).toBeNull();
        });
        
        test('should handle missing configuration gracefully', () => {
            delete window.lasAdminData;
            const manager = new LASCoreManager();
            expect(manager.config).toEqual({});
        });
    });
    
    describe('Module Management', () => {
        test('should register modules correctly', () => {
            const mockModule = { init: jest.fn() };
            coreManager.modules.set('test', mockModule);
            
            expect(coreManager.get('test')).toBe(mockModule);
        });
        
        test('should return null for non-existent modules', () => {
            expect(coreManager.get('nonexistent')).toBeNull();
        });
    });
    
    describe('Event System', () => {
        test('should emit events correctly', () => {
            const eventData = { test: 'data' };
            let receivedEvent = null;
            
            // Listen for the event
            document.addEventListener('test:event', (e) => {
                receivedEvent = e;
            });
            
            // Emit the event
            coreManager.emit('test:event', eventData);
            
            expect(receivedEvent).not.toBeNull();
            expect(receivedEvent.detail).toEqual(eventData);
            expect(receivedEvent.bubbles).toBe(true);
            expect(receivedEvent.cancelable).toBe(true);
        });
        
        test('should handle event listeners with on/off methods', () => {
            let callCount = 0;
            const callback = () => callCount++;
            
            // Add listener
            coreManager.on('test:event', callback);
            
            // Emit event
            coreManager.emit('test:event');
            expect(callCount).toBe(1);
            
            // Remove listener
            coreManager.off('test:event', callback);
            
            // Emit event again
            coreManager.emit('test:event');
            expect(callCount).toBe(1); // Should not increase
        });
    });
    
    describe('Error Handling', () => {
        test('should handle errors with context', () => {
            const mockError = new Error('Test error');
            const context = 'Test context';
            
            // Mock the error handler
            const mockErrorHandler = {
                showError: jest.fn()
            };
            coreManager.modules.set('error', mockErrorHandler);
            
            // Spy on console.error
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            // Handle error
            coreManager.handleError(mockError, context);
            
            expect(consoleSpy).toHaveBeenCalledWith(`LAS Error [${context}]:`, mockError);
            expect(mockErrorHandler.showError).toHaveBeenCalledWith(`${context}: ${mockError.message}`);
            
            consoleSpy.mockRestore();
        });
        
        test('should emit error events', () => {
            const mockError = new Error('Test error');
            const context = 'Test context';
            let emittedEvent = null;
            
            // Listen for error event
            document.addEventListener('core:error', (e) => {
                emittedEvent = e.detail;
            });
            
            // Handle error
            coreManager.handleError(mockError, context);
            
            expect(emittedEvent).not.toBeNull();
            expect(emittedEvent.error).toBe(mockError);
            expect(emittedEvent.context).toBe(context);
            expect(emittedEvent.timestamp).toBeGreaterThan(0);
        });
    });
    
    describe('Initialization', () => {
        test('should fail initialization with invalid config', async () => {
            // Remove required config
            coreManager.config = {};
            
            await expect(coreManager.init()).rejects.toThrow('LAS configuration is missing or invalid');
        });
        
        test('should return same promise on multiple init calls', () => {
            const firstCall = coreManager.init();
            const secondCall = coreManager.init();
            
            expect(firstCall).toBe(secondCall);
        });
        
        test('should mark as initialized after successful init', async () => {
            // Mock the error handler class
            window.LASErrorHandler = class MockErrorHandler {
                constructor(core) {
                    this.core = core;
                }
                async init() {
                    return Promise.resolve();
                }
            };
            
            await coreManager.init();
            
            expect(coreManager.isInitialized()).toBe(true);
        });
    });
    
    describe('Form Element Binding', () => {
        let mockSettingsManager;
        
        beforeEach(() => {
            mockSettingsManager = {
                set: jest.fn()
            };
            coreManager.modules.set('settings', mockSettingsManager);
        });
        
        test('should bind color picker elements', () => {
            // Create a color picker element
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.dataset.setting = 'test_color';
            colorPicker.value = '#ff0000';
            document.body.appendChild(colorPicker);
            
            // Bind form elements
            coreManager.bindFormElements();
            
            // Simulate color change
            colorPicker.value = '#00ff00';
            colorPicker.dispatchEvent(new Event('change'));
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test_color', '#00ff00');
        });
        
        test('should bind text inputs with debouncing', (done) => {
            // Create a text input element
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.dataset.setting = 'test_text';
            textInput.value = 'initial';
            document.body.appendChild(textInput);
            
            // Bind form elements
            coreManager.bindFormElements();
            
            // Simulate text input
            textInput.value = 'updated';
            textInput.dispatchEvent(new Event('input'));
            
            // Should not be called immediately (debounced)
            expect(mockSettingsManager.set).not.toHaveBeenCalled();
            
            // Should be called after debounce delay
            setTimeout(() => {
                expect(mockSettingsManager.set).toHaveBeenCalledWith('test_text', 'updated');
                done();
            }, 350);
        });
        
        test('should bind checkbox elements', () => {
            // Create a checkbox element
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.setting = 'test_checkbox';
            checkbox.checked = false;
            document.body.appendChild(checkbox);
            
            // Bind form elements
            coreManager.bindFormElements();
            
            // Simulate checkbox change
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test_checkbox', true);
        });
        
        test('should bind range/slider elements', () => {
            // Create a range input element
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.dataset.setting = 'test_slider';
            slider.min = '0';
            slider.max = '100';
            slider.value = '50';
            document.body.appendChild(slider);
            
            // Bind form elements
            coreManager.bindFormElements();
            
            // Simulate slider input (should skip save)
            slider.value = '75';
            slider.dispatchEvent(new Event('input'));
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test_slider', '75', { skipSave: true });
            
            // Simulate slider change (should save)
            slider.dispatchEvent(new Event('change'));
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test_slider', '75');
        });
        
        test('should bind select/dropdown elements', () => {
            // Create a select element
            const select = document.createElement('select');
            select.dataset.setting = 'test_select';
            
            const option1 = document.createElement('option');
            option1.value = 'option1';
            option1.textContent = 'Option 1';
            
            const option2 = document.createElement('option');
            option2.value = 'option2';
            option2.textContent = 'Option 2';
            option2.selected = true;
            
            select.appendChild(option1);
            select.appendChild(option2);
            document.body.appendChild(select);
            
            // Bind form elements
            coreManager.bindFormElements();
            
            // Simulate select change
            select.value = 'option1';
            select.dispatchEvent(new Event('change'));
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test_select', 'option1');
        });
        
        test('should handle missing settings manager gracefully', () => {
            coreManager.modules.delete('settings');
            
            // Should not throw error
            expect(() => {
                coreManager.bindFormElements();
            }).not.toThrow();
        });
    });
    
    describe('Cleanup', () => {
        test('should cleanup all modules', () => {
            const mockModule1 = { cleanup: jest.fn() };
            const mockModule2 = { cleanup: jest.fn() };
            
            coreManager.modules.set('module1', mockModule1);
            coreManager.modules.set('module2', mockModule2);
            
            coreManager.cleanup();
            
            expect(mockModule1.cleanup).toHaveBeenCalled();
            expect(mockModule2.cleanup).toHaveBeenCalled();
        });
        
        test('should clear all event listeners', () => {
            const callback = jest.fn();
            coreManager.on('test:event', callback);
            
            expect(coreManager.eventListeners.size).toBeGreaterThan(0);
            
            coreManager.cleanup();
            
            expect(coreManager.eventListeners.size).toBe(0);
        });
        
        test('should reset initialization state', () => {
            coreManager.initialized = true;
            coreManager.initializationPromise = Promise.resolve();
            
            coreManager.cleanup();
            
            expect(coreManager.initialized).toBe(false);
            expect(coreManager.initializationPromise).toBeNull();
        });
    });
});