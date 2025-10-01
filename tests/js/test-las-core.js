/**
 * Unit tests for LASCore module system
 * 
 * @since 2.0.0
 */

describe('LASCore Module System', () => {
    let core;
    let mockConfig;

    beforeEach(() => {
        // Reset global state
        delete window.LAS;
        delete window.LASModules;
        delete window.lasErrors;
        
        // Mock configuration
        mockConfig = {
            debug: true,
            version: '2.0.0',
            assetsUrl: '/test/assets/js'
        };
        
        window.lasConfig = mockConfig;
        
        // Load the core module by executing the IIFE
        const fs = require('fs');
        const path = require('path');
        const coreModulePath = path.join(__dirname, '../../assets/js/las-core.js');
        const coreModuleCode = fs.readFileSync(coreModulePath, 'utf8');
        
        // Execute the module code in the current context
        eval(coreModuleCode);
        core = window.LAS;
    });

    afterEach(() => {
        if (core && typeof core.destroy === 'function') {
            core.destroy();
        }
        
        // Clean up global state
        delete window.LAS;
        delete window.LASModules;
        delete window.lasErrors;
        delete window.lasConfig;
    });

    describe('Initialization', () => {
        test('should create global LAS instance', () => {
            expect(window.LAS).toBeDefined();
            expect(core).toBeInstanceOf(Object);
        });

        test('should initialize with config', () => {
            expect(core.config).toEqual(mockConfig);
        });

        test('should detect modern browser support', () => {
            expect(typeof core.isModernBrowser).toBe('boolean');
        });

        test('should setup error handling', () => {
            const errorSpy = jest.spyOn(core, 'handleError');
            
            // Trigger a global error
            const error = new Error('Test error');
            window.dispatchEvent(new ErrorEvent('error', {
                error: error,
                message: 'Test error',
                filename: 'test.js',
                lineno: 1,
                colno: 1
            }));

            expect(errorSpy).toHaveBeenCalledWith(
                'Global Error',
                error,
                expect.objectContaining({
                    filename: 'test.js',
                    lineno: 1,
                    colno: 1
                })
            );
        });
    });

    describe('Module Management', () => {
        test('should register and retrieve modules', () => {
            const mockModule = { name: 'test-module' };
            core.modules.set('test', mockModule);
            
            expect(core.getModule('test')).toBe(mockModule);
            expect(core.hasModule('test')).toBe(true);
            expect(core.hasModule('nonexistent')).toBe(false);
        });

        test('should register module for IE11 compatibility', () => {
            const MockConstructor = function() { this.name = 'test'; };
            
            core.registerModule('test-module', MockConstructor);
            
            expect(window.LASModules).toBeDefined();
            expect(window.LASModules['test-module']).toBe(MockConstructor);
        });

        test('should handle module loading errors', async () => {
            const errorSpy = jest.spyOn(core, 'handleError');
            
            // Mock failed module load
            jest.spyOn(core, '_loadModuleInternal').mockRejectedValue(new Error('Load failed'));
            
            await expect(core.loadModule('nonexistent')).rejects.toThrow('Load failed');
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to load module: nonexistent',
                expect.any(Error)
            );
        });

        test('should return cached module on subsequent loads', async () => {
            const mockModule = { name: 'cached-module' };
            core.modules.set('cached', mockModule);
            
            const result = await core.loadModule('cached');
            expect(result).toBe(mockModule);
        });

        test('should handle concurrent module loading', async () => {
            const mockModule = { name: 'concurrent-module' };
            
            // Mock the internal loading method
            jest.spyOn(core, '_loadModuleInternal').mockResolvedValue(mockModule);
            
            // Start multiple concurrent loads
            const promises = [
                core.loadModule('concurrent'),
                core.loadModule('concurrent'),
                core.loadModule('concurrent')
            ];
            
            const results = await Promise.all(promises);
            
            // All should return the same instance
            expect(results[0]).toBe(mockModule);
            expect(results[1]).toBe(mockModule);
            expect(results[2]).toBe(mockModule);
            
            // Internal method should only be called once
            expect(core._loadModuleInternal).toHaveBeenCalledTimes(1);
        });
    });

    describe('Event System', () => {
        test('should add and trigger event listeners', () => {
            const callback = jest.fn();
            const testData = { test: 'data' };
            
            core.on('test:event', callback);
            core.emit('test:event', testData);
            
            expect(callback).toHaveBeenCalledWith(testData);
        });

        test('should handle multiple listeners for same event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            const testData = { test: 'data' };
            
            core.on('test:event', callback1);
            core.on('test:event', callback2);
            core.emit('test:event', testData);
            
            expect(callback1).toHaveBeenCalledWith(testData);
            expect(callback2).toHaveBeenCalledWith(testData);
        });

        test('should remove event listeners', () => {
            const callback = jest.fn();
            
            core.on('test:event', callback);
            core.off('test:event', callback);
            core.emit('test:event', { test: 'data' });
            
            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle event listener errors', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Event handler error');
            });
            const errorSpy = jest.spyOn(core, 'handleError');
            
            core.on('test:event', errorCallback);
            core.emit('test:event', { test: 'data' });
            
            expect(errorSpy).toHaveBeenCalledWith(
                'Event handler error for test:event',
                expect.any(Error),
                { data: { test: 'data' } }
            );
        });

        test('should call listeners with context', () => {
            const context = { name: 'test-context' };
            const callback = jest.fn(function() {
                expect(this).toBe(context);
            });
            
            core.on('test:event', callback, context);
            core.emit('test:event');
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle and log errors', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const error = new Error('Test error');
            
            core.handleError('Test message', error, { context: 'test' });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[LAS Error]',
                expect.objectContaining({
                    message: 'Test message',
                    error: 'Test error',
                    context: { context: 'test' }
                })
            );
            
            expect(window.lasErrors).toHaveLength(1);
            expect(window.lasErrors[0]).toMatchObject({
                message: 'Test message',
                error: 'Test error'
            });
            
            consoleSpy.mockRestore();
        });

        test('should emit error events', () => {
            const errorListener = jest.fn();
            core.on('core:error', errorListener);
            
            const error = new Error('Test error');
            core.handleError('Test message', error);
            
            expect(errorListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Test message',
                    error: 'Test error'
                })
            );
        });

        test('should handle string errors', () => {
            core.handleError('Test message', 'String error');
            
            expect(window.lasErrors).toHaveLength(1);
            expect(window.lasErrors[0]).toMatchObject({
                message: 'Test message',
                error: 'String error',
                stack: null
            });
        });
    });

    describe('System Information', () => {
        test('should provide system information', () => {
            const mockModule = { name: 'test-module' };
            core.modules.set('test', mockModule);
            core.on('test:event', () => {});
            
            const info = core.getSystemInfo();
            
            expect(info).toMatchObject({
                version: '2.0.0',
                isInitialized: false,
                isModernBrowser: expect.any(Boolean),
                loadedModules: ['test'],
                eventListeners: ['test:event'],
                config: mockConfig
            });
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            const mockModule = {
                destroy: jest.fn()
            };
            
            core.modules.set('test', mockModule);
            core.on('test:event', () => {});
            
            core.destroy();
            
            expect(mockModule.destroy).toHaveBeenCalled();
            expect(core.modules.size).toBe(0);
            expect(core.eventListeners.size).toBe(0);
            expect(core.isInitialized).toBe(false);
        });

        test('should handle module cleanup errors', () => {
            const mockModule = {
                destroy: jest.fn(() => {
                    throw new Error('Cleanup error');
                })
            };
            const errorSpy = jest.spyOn(core, 'handleError');
            
            core.modules.set('test', mockModule);
            core.destroy();
            
            expect(errorSpy).toHaveBeenCalledWith(
                'Module cleanup error',
                expect.any(Error)
            );
        });
    });

    describe('Logging', () => {
        test('should log messages in debug mode', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            core.log('Test message', { data: 'test' });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[LAS]',
                'Test message',
                { data: 'test' }
            );
            
            consoleSpy.mockRestore();
        });

        test('should not log when debug is disabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            core.config.debug = false;
            
            core.log('Test message');
            
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });
});