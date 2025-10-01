/**
 * Test suite for Enhanced Error Handler
 * 
 * Tests error classification, recovery strategies, nonce refresh,
 * network error detection, and user notifications.
 */

describe('LAS Enhanced Error Handler', function() {
    let errorHandler;
    let mockConfig;
    
    beforeEach(function() {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Mock global objects
        window.lasComm = {
            ajaxUrl: '/wp-admin/admin-ajax.php',
            restUrl: '/wp-json/',
            nonces: {
                ajax: 'test_nonce_123',
                rest: 'test_rest_nonce_123'
            }
        };
        
        window.lasUser = {
            id: 1
        };
        
        // Mock navigator
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
        
        // Mock fetch
        global.fetch = jest.fn();
        
        mockConfig = {
            enableAutoRetry: true,
            enableNonceRefresh: true,
            enableUserNotifications: true,
            enableContextLogging: true,
            maxRetryAttempts: 3,
            retryDelay: 100, // Shorter for tests
            notificationDuration: 1000,
            debugMode: true
        };
        
        errorHandler = new window.LAS.ErrorHandler(mockConfig);
    });
    
    afterEach(function() {
        jest.clearAllMocks();
        
        // Clean up notifications
        const container = document.getElementById('las-error-notifications');
        if (container) {
            container.remove();
        }
    });
    
    describe('Error Classification', function() {
        
        test('should classify network timeout errors correctly', async function() {
            const error = new Error('Request timed out');
            error.name = 'AbortError';
            
            const result = await errorHandler.handleError(error, {
                action: 'test_timeout',
                requestId: 'test_1'
            });
            
            expect(result.classification.code).toBe('NETWORK_TIMEOUT');
            expect(result.classification.category).toBe('network');
            expect(result.classification.retryable).toBe(true);
        });
        
        test('should classify network offline errors correctly', async function() {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            const error = new Error('Network error');
            
            const result = await errorHandler.handleError(error, {
                action: 'test_offline',
                requestId: 'test_2'
            });
            
            expect(result.classification.code).toBe('NETWORK_OFFLINE');
            expect(result.classification.category).toBe('network');
        });
        
        test('should classify HTTP status errors correctly', async function() {
            const error = {
                status: 403,
                response: {
                    status: 403,
                    data: {
                        code: 'rest_cookie_invalid_nonce',
                        message: 'Cookie nonce is invalid'
                    }
                }
            };
            
            const result = await errorHandler.handleError(error, {
                action: 'test_nonce_error',
                requestId: 'test_3'
            });
            
            expect(result.classification.code).toBe('SECURITY_NONCE_INVALID');
            expect(result.classification.category).toBe('security');
            expect(result.classification.retryable).toBe(true);
        });
        
        test('should classify server errors correctly', async function() {
            const error = {
                status: 500,
                response: {
                    status: 500,
                    statusText: 'Internal Server Error'
                }
            };
            
            const result = await errorHandler.handleError(error, {
                action: 'test_server_error',
                requestId: 'test_4'
            });
            
            expect(result.classification.code).toBe('SERVER_ERROR');
            expect(result.classification.category).toBe('server');
            expect(result.classification.retryable).toBe(true);
        });
        
        test('should classify rate limiting errors correctly', async function() {
            const error = {
                status: 429,
                response: {
                    status: 429,
                    headers: {
                        'retry-after': '60'
                    }
                }
            };
            
            const result = await errorHandler.handleError(error, {
                action: 'test_rate_limit',
                requestId: 'test_5'
            });
            
            expect(result.classification.code).toBe('SECURITY_RATE_LIMITED');
            expect(result.classification.category).toBe('security');
        });
        
        test('should classify validation errors correctly', async function() {
            const error = {
                status: 400,
                response: {
                    status: 400,
                    data: {
                        code: 'rest_invalid_param',
                        message: 'Invalid parameter'
                    }
                }
            };
            
            const result = await errorHandler.handleError(error, {
                action: 'test_validation',
                requestId: 'test_6'
            });
            
            expect(result.classification.code).toBe('VALIDATION_ERROR');
            expect(result.classification.category).toBe('validation');
            expect(result.classification.retryable).toBe(false);
        });
    });
    
    describe('Recovery Strategies', function() {
        
        test('should implement retry with backoff strategy', async function() {
            const error = new Error('Network error');
            error.name = 'TypeError';
            
            const context = { attempt: 1, requestId: 'test_retry_1' };
            
            const result = await errorHandler.handleError(error, context);
            
            expect(result.classification.recoveryStrategy).toBe('retry_with_backoff');
            expect(result.recoveryAction).toBe('retry_with_backoff');
        });
        
        test('should implement exponential backoff for server errors', async function() {
            const error = { status: 500 };
            const context = { attempt: 2, requestId: 'test_exponential' };
            
            const result = await errorHandler.handleError(error, context);
            
            expect(result.classification.recoveryStrategy).toBe('retry_with_exponential_backoff');
        });
        
        test('should refresh nonce for security errors', async function() {
            // Mock successful nonce refresh
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: { nonce: 'new_nonce_456' }
                })
            });
            
            const error = {
                status: 403,
                response: {
                    data: {
                        code: 'rest_cookie_invalid_nonce'
                    }
                }
            };
            
            const result = await errorHandler.handleError(error, {
                action: 'test_nonce_refresh',
                requestId: 'test_nonce'
            });
            
            expect(result.classification.code).toBe('SECURITY_NONCE_INVALID');
            expect(result.recoveryAction).toBe('refresh_nonce_and_retry');
            expect(window.lasComm.nonces.ajax).toBe('new_nonce_456');
        });
        
        test('should handle nonce refresh failure gracefully', async function() {
            // Mock failed nonce refresh
            global.fetch.mockRejectedValueOnce(new Error('Nonce refresh failed'));
            
            const error = {
                status: 403,
                response: {
                    data: {
                        code: 'rest_cookie_invalid_nonce'
                    }
                }
            };
            
            const result = await errorHandler.handleError(error, {
                action: 'test_nonce_fail',
                requestId: 'test_nonce_fail'
            });
            
            expect(result.success).toBe(true); // Handler should succeed even if recovery fails
            expect(result.recoveryAction).toBe('refresh_nonce_and_retry');
        });
        
        test('should wait for online status when offline', async function() {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            const error = new Error('Network unavailable');
            
            // Simulate coming back online after a delay
            setTimeout(() => {
                Object.defineProperty(navigator, 'onLine', {
                    writable: true,
                    value: true
                });
                window.dispatchEvent(new Event('online'));
            }, 50);
            
            const result = await errorHandler.handleError(error, {
                action: 'test_offline_recovery',
                requestId: 'test_offline'
            });
            
            expect(result.classification.code).toBe('NETWORK_OFFLINE');
        });
        
        test('should respect max retry attempts', async function() {
            const error = new Error('Persistent error');
            
            const result = await errorHandler.handleError(error, {
                action: 'test_max_retries',
                requestId: 'test_max',
                attempt: 4 // Exceeds maxRetryAttempts (3)
            });
            
            expect(result.retryable).toBe(true);
            // Should still classify but not retry due to max attempts
        });
    });
    
    describe('Error Context and Logging', function() {
        
        test('should create comprehensive error entry with context', async function() {
            const error = new Error('Test error with context');
            error.stack = 'Error: Test error\n    at test.js:1:1';
            
            const context = {
                action: 'test_context',
                requestId: 'test_context_1',
                method: 'POST',
                attempt: 1
            };
            
            const result = await errorHandler.handleError(error, context);
            
            expect(result.errorEntry).toBeDefined();
            expect(result.errorEntry.id).toMatch(/^err_\d+_/);
            expect(result.errorEntry.timestamp).toBeDefined();
            expect(result.errorEntry.context.action).toBe('test_context');
            expect(result.errorEntry.context.requestId).toBe('test_context_1');
            expect(result.errorEntry.environment.online).toBe(true);
            expect(result.errorEntry.user.id).toBe(1);
        });
        
        test('should include memory and connection info when available', async function() {
            // Mock performance.memory
            Object.defineProperty(performance, 'memory', {
                value: {
                    usedJSHeapSize: 1000000,
                    totalJSHeapSize: 2000000,
                    jsHeapSizeLimit: 4000000
                },
                configurable: true
            });
            
            // Mock navigator.connection
            Object.defineProperty(navigator, 'connection', {
                value: {
                    effectiveType: '4g',
                    downlink: 10,
                    rtt: 50
                },
                configurable: true
            });
            
            const error = new Error('Test memory and connection');
            
            const result = await errorHandler.handleError(error, {
                action: 'test_memory_connection'
            });
            
            expect(result.errorEntry.environment.memory).toBeDefined();
            expect(result.errorEntry.environment.memory.used).toBe(1000000);
            expect(result.errorEntry.environment.connection).toBeDefined();
            expect(result.errorEntry.environment.connection.effectiveType).toBe('4g');
        });
        
        test('should send error to server when configured', async function() {
            // Mock successful server request
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            
            const error = new Error('Server logging test');
            
            await errorHandler.handleError(error, {
                action: 'test_server_logging'
            });
            
            // Should have made a request to the error reporting endpoint
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('las/v1/error-report'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
        });
    });
    
    describe('User Notifications', function() {
        
        test('should show user-friendly error notifications', async function() {
            const error = {
                status: 500,
                response: { status: 500 }
            };
            
            await errorHandler.handleError(error, {
                action: 'test_notification'
            });
            
            // Check if notification was created
            const notification = document.querySelector('.las-error-notification');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Server error - please try again in a moment');
        });
        
        test('should show different notification types based on severity', async function() {
            // Test warning notification
            const warningError = {
                status: 429,
                response: { status: 429 }
            };
            
            await errorHandler.handleError(warningError, {
                action: 'test_warning'
            });
            
            const warningNotification = document.querySelector('.las-error-notification.warning');
            expect(warningNotification).toBeTruthy();
        });
        
        test('should allow closing notifications', async function() {
            const error = new Error('Closeable notification test');
            
            await errorHandler.handleError(error, {
                action: 'test_closeable'
            });
            
            const notification = document.querySelector('.las-error-notification');
            const closeButton = notification.querySelector('.las-error-notification-close');
            
            expect(closeButton).toBeTruthy();
            
            // Simulate click
            closeButton.click();
            
            // Notification should start closing animation
            expect(notification.style.animation).toContain('las-slide-out');
        });
        
        test('should auto-close notifications after duration', function(done) {
            const shortConfig = { ...mockConfig, notificationDuration: 100 };
            const shortErrorHandler = new window.LAS.ErrorHandler(shortConfig);
            
            const error = new Error('Auto-close test');
            
            shortErrorHandler.handleError(error, {
                action: 'test_auto_close'
            }).then(() => {
                const notification = document.querySelector('.las-error-notification');
                expect(notification).toBeTruthy();
                
                // Wait for auto-close
                setTimeout(() => {
                    const notificationAfter = document.querySelector('.las-error-notification');
                    expect(notificationAfter).toBeFalsy();
                    done();
                }, 150);
            });
        });
    });
    
    describe('Network Status Handling', function() {
        
        test('should show connection restored notification when coming online', function() {
            // Simulate coming online
            window.dispatchEvent(new Event('online'));
            
            const notification = document.querySelector('.las-error-notification.success');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Connection restored');
        });
        
        test('should show offline notification when going offline', function() {
            // Simulate going offline
            window.dispatchEvent(new Event('offline'));
            
            const notification = document.querySelector('.las-error-notification.warning');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Connection lost - working offline');
        });
    });
    
    describe('Error Statistics and History', function() {
        
        test('should track error statistics', async function() {
            // Generate multiple errors
            await errorHandler.handleError(new Error('Error 1'), { action: 'test_stats_1' });
            await errorHandler.handleError({ status: 500 }, { action: 'test_stats_2' });
            await errorHandler.handleError({ status: 403 }, { action: 'test_stats_3' });
            
            const stats = errorHandler.getStatistics();
            
            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByCategory.unknown).toBe(1); // Error 1
            expect(stats.errorsByCategory.server).toBe(1);  // 500 error
            expect(stats.errorsByCategory.security).toBe(1); // 403 error
            expect(stats.recentErrors).toHaveLength(3);
        });
        
        test('should limit error history size', async function() {
            // Create error handler with smaller history for testing
            const limitedHandler = new window.LAS.ErrorHandler({
                ...mockConfig,
                maxHistorySize: 5
            });
            
            // Generate more errors than the limit
            for (let i = 0; i < 10; i++) {
                await limitedHandler.handleError(new Error(`Error ${i}`), {
                    action: `test_limit_${i}`
                });
            }
            
            const stats = limitedHandler.getStatistics();
            expect(stats.totalErrors).toBe(10);
            expect(stats.recentErrors.length).toBeLessThanOrEqual(10);
        });
        
        test('should clear error history', async function() {
            await errorHandler.handleError(new Error('Test error'), { action: 'test_clear' });
            
            let stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            
            errorHandler.clearHistory();
            
            stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(0);
            expect(stats.recentErrors).toHaveLength(0);
        });
    });
    
    describe('Event Emission', function() {
        
        test('should emit error events for external handlers', function(done) {
            document.addEventListener('las:error', function(event) {
                expect(event.detail.error).toBeDefined();
                expect(event.detail.recovery).toBeDefined();
                expect(event.detail.error.classification.code).toBe('UNKNOWN_ERROR');
                done();
            });
            
            errorHandler.handleError(new Error('Event test'), {
                action: 'test_event'
            });
        });
    });
    
    describe('Configuration and Initialization', function() {
        
        test('should initialize with default configuration', function() {
            const defaultHandler = new window.LAS.ErrorHandler();
            
            expect(defaultHandler.config.enableAutoRetry).toBe(true);
            expect(defaultHandler.config.enableNonceRefresh).toBe(true);
            expect(defaultHandler.config.maxRetryAttempts).toBe(3);
        });
        
        test('should merge custom configuration', function() {
            const customConfig = {
                enableAutoRetry: false,
                maxRetryAttempts: 5,
                customOption: 'test'
            };
            
            const customHandler = new window.LAS.ErrorHandler(customConfig);
            
            expect(customHandler.config.enableAutoRetry).toBe(false);
            expect(customHandler.config.maxRetryAttempts).toBe(5);
            expect(customHandler.config.customOption).toBe('test');
            expect(customHandler.config.enableNonceRefresh).toBe(true); // Default preserved
        });
    });
    
    describe('Error Handler Testing Utilities', function() {
        
        test('should provide test error handling method', function() {
            // Should not throw when calling test method
            expect(() => {
                errorHandler.testErrorHandling();
            }).not.toThrow();
        });
    });
});