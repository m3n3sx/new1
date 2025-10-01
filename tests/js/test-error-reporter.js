/**
 * Test Suite for LAS Error Reporter and Recovery System
 * 
 * Tests error reporting, classification, recovery strategies, and server communication
 * for the comprehensive error handling system.
 *
 * @package LiveAdminStyler
 * @version 1.0.0
 */

describe('LAS Error Reporter and Recovery System', function() {
    let core, errorReporter, mockFetch;
    
    beforeEach(function() {
        // Mock fetch for AJAX requests
        mockFetch = jasmine.createSpy('fetch').and.returnValue(
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            })
        );
        window.fetch = mockFetch;
        
        // Mock WordPress globals
        window.lasComm = {
            ajaxUrl: '/wp-admin/admin-ajax.php',
            nonces: { ajax: 'test-nonce' }
        };
        
        // Create mock core manager
        core = {
            config: { debug: true },
            components: new Map(),
            eventBus: new EventTarget(),
            log: jasmine.createSpy('log'),
            emit: jasmine.createSpy('emit'),
            on: jasmine.createSpy('on'),
            get: jasmine.createSpy('get').and.returnValue(null)
        };
        
        // Initialize error reporter
        errorReporter = new LASErrorReporter(core);
    });
    
    afterEach(function() {
        if (errorReporter) {
            errorReporter.destroy();
        }
        delete window.fetch;
        delete window.lasComm;
    });
    
    describe('Initialization', function() {
        it('should initialize successfully', async function() {
            await errorReporter.init();
            
            expect(errorReporter.initialized).toBe(true);
            expect(core.log).toHaveBeenCalledWith(
                jasmine.stringMatching(/initialized successfully/), 
                'success'
            );
        });
        
        it('should setup error patterns', async function() {
            await errorReporter.init();
            
            expect(errorReporter.errorPatterns.size).toBeGreaterThan(0);
            expect(errorReporter.errorPatterns.has('network')).toBe(true);
            expect(errorReporter.errorPatterns.has('security')).toBe(true);
            expect(errorReporter.errorPatterns.has('component')).toBe(true);
            expect(errorReporter.errorPatterns.has('critical')).toBe(true);
        });
        
        it('should setup recovery strategies', async function() {
            await errorReporter.init();
            
            expect(errorReporter.recoveryStrategies.size).toBeGreaterThan(0);
            expect(errorReporter.recoveryStrategies.has('network_recovery')).toBe(true);
            expect(errorReporter.recoveryStrategies.has('security_recovery')).toBe(true);
            expect(errorReporter.recoveryStrategies.has('component_recovery')).toBe(true);
            expect(errorReporter.recoveryStrategies.has('critical_recovery')).toBe(true);
        });
        
        it('should setup global error handlers', async function() {
            spyOn(window, 'addEventListener');
            
            await errorReporter.init();
            
            expect(window.addEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
            expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', jasmine.any(Function));
        });
    });
    
    describe('Error Classification', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        it('should classify network errors', function() {
            const networkError = {
                message: 'Network request failed',
                stack: 'fetch error'
            };
            
            const classification = errorReporter.classifyError(networkError);
            
            expect(classification.type).toBe('network');
            expect(classification.severity).toBe('medium');
            expect(classification.recoverable).toBe(true);
            expect(classification.strategy).toBe('network_recovery');
        });
        
        it('should classify security errors', function() {
            const securityError = {
                message: 'Invalid nonce token',
                stack: 'security validation failed'
            };
            
            const classification = errorReporter.classifyError(securityError);
            
            expect(classification.type).toBe('security');
            expect(classification.severity).toBe('high');
            expect(classification.recoverable).toBe(true);
            expect(classification.strategy).toBe('security_recovery');
        });
        
        it('should classify component errors', function() {
            const componentError = {
                message: 'Component initialization failed',
                stack: 'undefined component'
            };
            
            const classification = errorReporter.classifyError(componentError);
            
            expect(classification.type).toBe('component');
            expect(classification.severity).toBe('medium');
            expect(classification.recoverable).toBe(true);
            expect(classification.strategy).toBe('component_recovery');
        });
        
        it('should classify critical errors', function() {
            const criticalError = {
                message: 'Out of memory error',
                stack: 'maximum call stack exceeded'
            };
            
            const classification = errorReporter.classifyError(criticalError);
            
            expect(classification.type).toBe('critical');
            expect(classification.severity).toBe('critical');
            expect(classification.recoverable).toBe(false);
            expect(classification.strategy).toBe('critical_recovery');
        });
        
        it('should handle unknown errors', function() {
            const unknownError = {
                message: 'Some random error',
                stack: 'unknown stack trace'
            };
            
            const classification = errorReporter.classifyError(unknownError);
            
            expect(classification.type).toBe('unknown');
            expect(classification.severity).toBe('medium');
            expect(classification.recoverable).toBe(true);
        });
    });
    
    describe('Error Reporting', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        it('should report errors to queue', function() {
            const errorInfo = {
                type: 'test_error',
                message: 'Test error message',
                timestamp: Date.now()
            };
            
            errorReporter.reportError(errorInfo);
            
            expect(errorReporter.errorQueue.length).toBe(1);
            expect(core.emit).toHaveBeenCalledWith('error:reported', jasmine.any(Object));
        });
        
        it('should enhance error info with context', function() {
            const errorInfo = {
                message: 'Test error',
                timestamp: Date.now()
            };
            
            const enhanced = errorReporter.enhanceErrorInfo(errorInfo, { component: 'tabs' });
            
            expect(enhanced.id).toBeDefined();
            expect(enhanced.context).toBeDefined();
            expect(enhanced.context.component).toBe('tabs');
            expect(enhanced.context.url).toBe(window.location.href);
            expect(enhanced.context.viewport).toBeDefined();
        });
        
        it('should prevent queue overflow', function() {
            // Fill queue beyond max size
            for (let i = 0; i < errorReporter.config.maxQueueSize + 10; i++) {
                errorReporter.reportError({
                    message: `Error ${i}`,
                    timestamp: Date.now()
                });
            }
            
            expect(errorReporter.errorQueue.length).toBe(errorReporter.config.maxQueueSize);
        });
        
        it('should disable reporting when configured', function() {
            errorReporter.setReportingEnabled(false);
            
            errorReporter.reportError({
                message: 'Test error',
                timestamp: Date.now()
            });
            
            expect(errorReporter.errorQueue.length).toBe(0);
        });
    });
    
    describe('Error Queue Processing', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        it('should process error queue', async function() {
            // Add errors to queue
            for (let i = 0; i < 5; i++) {
                errorReporter.addToQueue({
                    id: `error_${i}`,
                    message: `Error ${i}`,
                    timestamp: Date.now()
                });
            }
            
            await errorReporter.processErrorQueue();
            
            expect(mockFetch).toHaveBeenCalled();
            expect(errorReporter.errorQueue.length).toBe(0);
        });
        
        it('should handle batch processing', async function() {
            // Add more errors than batch size
            for (let i = 0; i < 15; i++) {
                errorReporter.addToQueue({
                    id: `error_${i}`,
                    message: `Error ${i}`,
                    timestamp: Date.now()
                });
            }
            
            await errorReporter.processErrorQueue();
            
            expect(mockFetch).toHaveBeenCalled();
            expect(errorReporter.errorQueue.length).toBe(5); // Remaining after batch
        });
        
        it('should handle server errors gracefully', async function() {
            mockFetch.and.returnValue(Promise.reject(new Error('Server error')));
            
            errorReporter.addToQueue({
                id: 'test_error',
                message: 'Test error',
                timestamp: Date.now()
            });
            
            await errorReporter.processErrorQueue();
            
            expect(core.log).toHaveBeenCalledWith(
                jasmine.stringMatching(/Failed to process error queue/),
                'error'
            );
        });
    });
    
    describe('Recovery Strategies', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        describe('Network Recovery', function() {
            it('should execute network recovery successfully', async function() {
                spyOn(navigator, 'onLine').and.returnValue(true);
                
                const result = await errorReporter.executeNetworkRecovery({});
                
                expect(result.success).toBe(true);
                expect(result.message).toContain('connectivity restored');
            });
            
            it('should handle offline network recovery', async function() {
                spyOn(navigator, 'onLine').and.returnValue(false);
                
                const result = await errorReporter.executeNetworkRecovery({});
                
                expect(result.success).toBe(false);
                expect(result.message).toContain('Network offline');
            });
        });
        
        describe('Security Recovery', function() {
            it('should execute security recovery with nonce refresh', async function() {
                spyOn(errorReporter, 'refreshNonce').and.returnValue(Promise.resolve('new-nonce'));
                
                const result = await errorReporter.executeSecurityRecovery({});
                
                expect(result.success).toBe(true);
                expect(result.message).toContain('tokens refreshed');
                expect(window.lasComm.nonces.ajax).toBe('new-nonce');
            });
            
            it('should handle failed nonce refresh', async function() {
                spyOn(errorReporter, 'refreshNonce').and.returnValue(Promise.resolve(null));
                
                const result = await errorReporter.executeSecurityRecovery({});
                
                expect(result.success).toBe(false);
                expect(result.message).toContain('Failed to refresh');
            });
        });
        
        describe('Component Recovery', function() {
            it('should execute component recovery', async function() {
                const mockComponent = {
                    init: jasmine.createSpy('init').and.returnValue(Promise.resolve())
                };
                core.get.and.returnValue(mockComponent);
                
                const errorInfo = {
                    message: 'tabs component failed',
                    context: { component: 'tabs' }
                };
                
                const result = await errorReporter.executeComponentRecovery(errorInfo);
                
                expect(result.success).toBe(true);
                expect(mockComponent.init).toHaveBeenCalled();
            });
            
            it('should fallback to graceful degradation', async function() {
                core.get.and.returnValue(null);
                core.enableGracefulDegradation = jasmine.createSpy('enableGracefulDegradation');
                
                const result = await errorReporter.executeComponentRecovery({});
                
                expect(result.success).toBe(true);
                expect(core.enableGracefulDegradation).toHaveBeenCalled();
            });
        });
        
        describe('Critical Recovery', function() {
            it('should execute critical recovery', async function() {
                const mockGracefulDegradation = {
                    enableEmergencyMode: jasmine.createSpy('enableEmergencyMode')
                };
                core.gracefulDegradation = mockGracefulDegradation;
                
                spyOn(window, 'confirm').and.returnValue(false);
                
                const result = await errorReporter.executeCriticalRecovery({});
                
                expect(result.success).toBe(true);
                expect(mockGracefulDegradation.enableEmergencyMode).toHaveBeenCalled();
            });
        });
    });
    
    describe('Recovery Attempts', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        it('should attempt recovery for recoverable errors', async function() {
            const errorInfo = {
                id: 'test_error',
                message: 'network timeout',
                classification: {
                    type: 'network',
                    recoverable: true,
                    strategy: 'network_recovery'
                }
            };
            
            spyOn(errorReporter, 'executeNetworkRecovery').and.returnValue(
                Promise.resolve({ success: true })
            );
            
            await errorReporter.attemptRecovery(errorInfo);
            
            expect(errorReporter.executeNetworkRecovery).toHaveBeenCalled();
            expect(core.emit).toHaveBeenCalledWith('error:recovered', jasmine.any(Object));
        });
        
        it('should respect max recovery attempts', async function() {
            const errorInfo = {
                id: 'test_error',
                classification: {
                    recoverable: true,
                    strategy: 'network_recovery'
                }
            };
            
            const strategy = errorReporter.recoveryStrategies.get('network_recovery');
            
            // Set attempts to max
            errorReporter.recoveryAttempts.set('test_error', strategy.maxAttempts);
            
            spyOn(errorReporter, 'executeNetworkRecovery');
            
            await errorReporter.attemptRecovery(errorInfo);
            
            expect(errorReporter.executeNetworkRecovery).not.toHaveBeenCalled();
            expect(core.log).toHaveBeenCalledWith(
                jasmine.stringMatching(/Max recovery attempts reached/),
                'warn'
            );
        });
        
        it('should handle recovery strategy failures', async function() {
            const errorInfo = {
                id: 'test_error',
                classification: {
                    recoverable: true,
                    strategy: 'network_recovery'
                }
            };
            
            spyOn(errorReporter, 'executeNetworkRecovery').and.throwError('Recovery failed');
            
            await errorReporter.attemptRecovery(errorInfo);
            
            expect(core.log).toHaveBeenCalledWith(
                jasmine.stringMatching(/Recovery strategy failed/),
                'error'
            );
        });
    });
    
    describe('Global Error Handling', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        it('should handle window error events', function() {
            const errorEvent = {
                message: 'Test error',
                filename: 'test.js',
                lineno: 10,
                colno: 5,
                error: new Error('Test error')
            };
            
            errorReporter.handleWindowError(errorEvent);
            
            expect(errorReporter.errorQueue.length).toBe(1);
            
            const reportedError = errorReporter.errorQueue[0];
            expect(reportedError.type).toBe('javascript_error');
            expect(reportedError.message).toBe('Test error');
            expect(reportedError.filename).toBe('test.js');
        });
        
        it('should handle unhandled promise rejections', function() {
            const rejectionEvent = {
                reason: new Error('Promise rejection')
            };
            
            errorReporter.handleUnhandledRejection(rejectionEvent);
            
            expect(errorReporter.errorQueue.length).toBe(1);
            
            const reportedError = errorReporter.errorQueue[0];
            expect(reportedError.type).toBe('promise_rejection');
            expect(reportedError.message).toBe('Promise rejection');
        });
    });
    
    describe('Utility Functions', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        it('should generate unique error IDs', function() {
            const id1 = errorReporter.generateErrorId();
            const id2 = errorReporter.generateErrorId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^err_\d+_[a-z0-9]+$/);
        });
        
        it('should extract component names from errors', function() {
            const errorWithContext = {
                context: { component: 'tabs' }
            };
            
            const errorWithMessage = {
                message: 'Component tabs failed to initialize'
            };
            
            expect(errorReporter.extractComponentName(errorWithContext)).toBe('tabs');
            expect(errorReporter.extractComponentName(errorWithMessage)).toBe('tabs');
            expect(errorReporter.extractComponentName({})).toBe(null);
        });
        
        it('should get error statistics', function() {
            // Add some errors to queue
            errorReporter.addToQueue({ classification: { type: 'network' } });
            errorReporter.addToQueue({ classification: { type: 'security' } });
            errorReporter.addToQueue({ classification: { type: 'network' } });
            
            const stats = errorReporter.getErrorStatistics();
            
            expect(stats.queueSize).toBe(3);
            expect(stats.errorTypes.network).toBe(2);
            expect(stats.errorTypes.security).toBe(1);
            expect(stats.reportingEnabled).toBe(true);
        });
        
        it('should get memory info when available', function() {
            // Mock performance.memory
            window.performance = window.performance || {};
            window.performance.memory = {
                usedJSHeapSize: 1000000,
                totalJSHeapSize: 2000000,
                jsHeapSizeLimit: 4000000
            };
            
            const memInfo = errorReporter.getMemoryInfo();
            
            expect(memInfo).toBeDefined();
            expect(memInfo.used).toBe(1000000);
            expect(memInfo.total).toBe(2000000);
            expect(memInfo.limit).toBe(4000000);
        });
    });
    
    describe('Cleanup and Destruction', function() {
        beforeEach(async function() {
            await errorReporter.init();
        });
        
        it('should cleanup properly on destroy', function() {
            spyOn(window, 'removeEventListener');
            
            errorReporter.destroy();
            
            expect(window.removeEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
            expect(window.removeEventListener).toHaveBeenCalledWith('unhandledrejection', jasmine.any(Function));
            expect(errorReporter.errorQueue.length).toBe(0);
            expect(errorReporter.initialized).toBe(false);
        });
        
        it('should clear intervals on destroy', function() {
            spyOn(window, 'clearInterval');
            
            errorReporter.destroy();
            
            expect(window.clearInterval).toHaveBeenCalled();
        });
    });
});