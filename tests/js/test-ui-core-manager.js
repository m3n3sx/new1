/**
 * Unit Tests for LAS UI Core Manager
 * Tests the core UI repair system functionality
 */

describe('LAS UI Core Manager', () => {
    let coreManager;
    let mockConfig;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        document.body.className = 'wp-admin';
        
        // Mock configuration
        mockConfig = {
            debug: true,
            timeout: 5000,
            retryAttempts: 2
        };

        // Mock WordPress globals
        window.lasAdminData = mockConfig;

        // Create fresh instance
        coreManager = new window.LASUICoreManager(mockConfig);
    });

    afterEach(() => {
        if (coreManager) {
            coreManager.destroy();
            coreManager = null;
        }
        
        // Clean up globals
        delete window.lasAdminData;
        delete window.lasUICore;
    });

    describe('Constructor', () => {
        test('should initialize with default configuration', () => {
            const manager = new window.LASUICoreManager();
            
            expect(manager.config.debug).toBe(false);
            expect(manager.config.timeout).toBe(10000);
            expect(manager.config.retryAttempts).toBe(3);
            expect(manager.initialized).toBe(false);
            expect(manager.components).toBeInstanceOf(Map);
            expect(manager.eventBus).toBeInstanceOf(EventTarget);
        });

        test('should merge custom configuration', () => {
            const customConfig = { debug: true, timeout: 5000 };
            const manager = new window.LASUICoreManager(customConfig);
            
            expect(manager.config.debug).toBe(true);
            expect(manager.config.timeout).toBe(5000);
            expect(manager.config.retryAttempts).toBe(3); // default
        });

        test('should bind error handlers', () => {
            const manager = new window.LASUICoreManager();
            
            expect(typeof manager.handleError).toBe('function');
            expect(typeof manager.handleUnload).toBe('function');
        });
    });

    describe('Environment Validation', () => {
        test('should validate WordPress admin environment', () => {
            document.body.classList.add('wp-admin');
            
            const isValid = coreManager.validateEnvironment();
            expect(isValid).toBe(true);
        });

        test('should handle missing WordPress admin context', () => {
            document.body.classList.remove('wp-admin');
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const isValid = coreManager.validateEnvironment();
            
            expect(isValid).toBe(true); // Still valid, just warns
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Not in WordPress admin context')
            );
            
            consoleSpy.mockRestore();
        });

        test('should handle missing plugin container', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const isValid = coreManager.validateEnvironment();
            
            expect(isValid).toBe(true); // Still valid, just warns
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Plugin container not found')
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Component Management', () => {
        test('should initialize components in correct order', async () => {
            const initOrder = [];
            
            // Mock component classes
            class MockStateManager extends window.LASUIComponent {
                async init() {
                    initOrder.push('state');
                    this.initialized = true;
                }
            }
            
            class MockEventManager extends window.LASUIComponent {
                async init() {
                    initOrder.push('events');
                    this.initialized = true;
                }
            }

            // Replace global classes temporarily
            const originalState = window.LASStateManager;
            const originalEvents = window.LASEventManager;
            
            window.LASStateManager = MockStateManager;
            window.LASEventManager = MockEventManager;

            try {
                await coreManager.init();
                
                expect(initOrder[0]).toBe('state');
                expect(initOrder[1]).toBe('events');
                expect(coreManager.has('state')).toBe(true);
                expect(coreManager.has('events')).toBe(true);
                
            } finally {
                // Restore original classes
                window.LASStateManager = originalState;
                window.LASEventManager = originalEvents;
            }
        });

        test('should handle component initialization failure', async () => {
            class FailingComponent extends window.LASUIComponent {
                async init() {
                    throw new Error('Component initialization failed');
                }
            }

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            try {
                await coreManager.initializeComponent('failing', FailingComponent);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Component initialization failed');
            }
            
            consoleSpy.mockRestore();
        });

        test('should handle component initialization timeout', async () => {
            class SlowComponent extends window.LASUIComponent {
                async init() {
                    return new Promise(resolve => {
                        setTimeout(resolve, 10000); // Longer than timeout
                    });
                }
            }

            coreManager.config.timeout = 100; // Short timeout for test
            
            try {
                await coreManager.initializeComponent('slow', SlowComponent);
                fail('Should have thrown a timeout error');
            } catch (error) {
                expect(error.message).toContain('timeout');
            }
        });

        test('should get and check components', async () => {
            class TestComponent extends window.LASUIComponent {
                async init() {
                    this.initialized = true;
                }
            }

            await coreManager.initializeComponent('test', TestComponent);
            
            expect(coreManager.has('test')).toBe(true);
            expect(coreManager.get('test')).toBeInstanceOf(TestComponent);
            expect(coreManager.has('nonexistent')).toBe(false);
            expect(coreManager.get('nonexistent')).toBeUndefined();
        });
    });

    describe('Event System', () => {
        test('should emit and listen for events', () => {
            const callback = jest.fn();
            
            coreManager.on('test:event', callback);
            coreManager.emit('test:event', { data: 'test' });
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { data: 'test' }
                })
            );
        });

        test('should emit events on document', () => {
            const callback = jest.fn();
            
            document.addEventListener('test:event', callback);
            coreManager.emit('test:event', { data: 'test' });
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { data: 'test' }
                })
            );
            
            document.removeEventListener('test:event', callback);
        });

        test('should remove event listeners', () => {
            const callback = jest.fn();
            
            coreManager.on('test:event', callback);
            coreManager.off('test:event', callback);
            coreManager.emit('test:event');
            
            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle invalid event callbacks', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            coreManager.on('test:event', 'not a function');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid callback for event test:event')
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors', () => {
            const error = new Error('Test initialization error');
            
            // Mock showErrorNotification
            const showErrorSpy = jest.spyOn(coreManager, 'showErrorNotification').mockImplementation();
            const gracefulSpy = jest.spyOn(coreManager, 'enableGracefulDegradation').mockImplementation();
            
            coreManager.handleInitializationError(error);
            
            expect(coreManager.errors).toHaveLength(1);
            expect(coreManager.errors[0].type).toBe('initialization');
            expect(coreManager.errors[0].message).toBe('Test initialization error');
            expect(showErrorSpy).toHaveBeenCalled();
            expect(gracefulSpy).toHaveBeenCalled();
            
            showErrorSpy.mockRestore();
            gracefulSpy.mockRestore();
        });

        test('should handle runtime errors', () => {
            const error = new Error('Test runtime error');
            const event = { error };
            
            const emitSpy = jest.spyOn(coreManager, 'emit');
            
            coreManager.handleError(event);
            
            expect(coreManager.errors).toHaveLength(1);
            expect(coreManager.errors[0].type).toBe('runtime');
            expect(emitSpy).toHaveBeenCalledWith('error:occurred', { error, event });
            
            emitSpy.mockRestore();
        });

        test('should show error notifications', () => {
            // Create container
            const container = document.createElement('div');
            container.className = 'las-fresh-settings-wrap';
            document.body.appendChild(container);
            
            coreManager.showErrorNotification('Test Title', 'Test message', 'Test details');
            
            const errorDiv = container.querySelector('.las-ui-error');
            expect(errorDiv).toBeTruthy();
            expect(errorDiv.innerHTML).toContain('Test Title');
            expect(errorDiv.innerHTML).toContain('Test message');
            expect(errorDiv.innerHTML).toContain('Test details');
        });

        test('should enable graceful degradation', () => {
            // Create mock tab elements
            const tabButton = document.createElement('button');
            tabButton.className = 'las-tab';
            tabButton.dataset.tab = 'test';
            document.body.appendChild(tabButton);
            
            const tabPanel = document.createElement('div');
            tabPanel.className = 'las-tab-panel';
            tabPanel.id = 'las-tab-test';
            document.body.appendChild(tabPanel);
            
            coreManager.enableGracefulDegradation();
            
            expect(document.body.classList.contains('las-ui-degraded')).toBe(true);
            
            // Test basic tab functionality
            tabButton.click();
            expect(tabButton.classList.contains('active')).toBe(true);
            expect(tabPanel.classList.contains('active')).toBe(true);
        });
    });

    describe('Logging', () => {
        test('should log messages with different levels', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            coreManager.log('Info message', 'info');
            coreManager.log('Error message', 'error');
            coreManager.log('Warning message', 'warn');
            coreManager.log('Success message', 'success');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Info message')
            );
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('ERROR: Error message')
            );
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('WARN: Warning message')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('SUCCESS: Success message')
            );
            
            consoleSpy.mockRestore();
            errorSpy.mockRestore();
            warnSpy.mockRestore();
        });

        test('should respect debug configuration', () => {
            coreManager.config.debug = false;
            
            const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
            
            coreManager.log('Debug message', 'debug');
            
            expect(debugSpy).not.toHaveBeenCalled();
            
            debugSpy.mockRestore();
        });
    });

    describe('Status and Cleanup', () => {
        test('should return system status', () => {
            const status = coreManager.getStatus();
            
            expect(status).toHaveProperty('initialized');
            expect(status).toHaveProperty('components');
            expect(status).toHaveProperty('errors');
            expect(status).toHaveProperty('config');
            expect(Array.isArray(status.components)).toBe(true);
            expect(Array.isArray(status.errors)).toBe(true);
        });

        test('should destroy components and cleanup', () => {
            const mockComponent = {
                destroy: jest.fn()
            };
            
            coreManager.components.set('test', mockComponent);
            coreManager.initialized = true;
            
            coreManager.destroy();
            
            expect(mockComponent.destroy).toHaveBeenCalled();
            expect(coreManager.components.size).toBe(0);
            expect(coreManager.initialized).toBe(false);
        });

        test('should handle component destruction errors', () => {
            const mockComponent = {
                destroy: jest.fn(() => {
                    throw new Error('Destruction failed');
                })
            };
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            coreManager.components.set('test', mockComponent);
            coreManager.destroy();
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error destroying test component')
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Integration', () => {
        test('should initialize complete system', async () => {
            // Mock all required globals
            document.body.classList.add('wp-admin');
            
            const container = document.createElement('div');
            container.className = 'las-fresh-settings-wrap';
            document.body.appendChild(container);
            
            await coreManager.init();
            
            expect(coreManager.initialized).toBe(true);
            expect(coreManager.has('state')).toBe(true);
            expect(coreManager.has('events')).toBe(true);
            expect(coreManager.has('tabs')).toBe(true);
            expect(coreManager.has('menu')).toBe(true);
            expect(coreManager.has('forms')).toBe(true);
        });

        test('should handle multiple initialization calls', async () => {
            const initSpy = jest.spyOn(coreManager, '_performInit');
            
            const promise1 = coreManager.init();
            const promise2 = coreManager.init();
            
            await Promise.all([promise1, promise2]);
            
            expect(initSpy).toHaveBeenCalledTimes(1);
            
            initSpy.mockRestore();
        });
    });
});

// Test auto-initialization
describe('Auto-initialization', () => {
    beforeEach(() => {
        // Clean up any existing instances
        delete window.lasUICore;
        delete window.lasAdminData;
    });

    test('should auto-initialize when DOM is ready', (done) => {
        // Mock DOM ready state
        Object.defineProperty(document, 'readyState', {
            writable: true,
            value: 'loading'
        });

        // Set up configuration
        window.lasAdminData = { debug: true };

        // Load the script (simulate)
        const script = document.createElement('script');
        script.textContent = `
            // Simulate the auto-initialization code
            function initializeUIRepair() {
                const config = window.lasAdminData || {};
                const coreManager = new LASUICoreManager({
                    debug: config.debug || false,
                    ...config.uiRepair
                });
                window.lasUICore = coreManager;
                return coreManager;
            }
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initializeUIRepair);
            } else {
                setTimeout(initializeUIRepair, 0);
            }
        `;
        document.head.appendChild(script);

        // Trigger DOMContentLoaded
        Object.defineProperty(document, 'readyState', {
            writable: true,
            value: 'interactive'
        });

        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        // Check if initialized
        setTimeout(() => {
            expect(window.lasUICore).toBeInstanceOf(window.LASUICoreManager);
            done();
        }, 10);
    });
});