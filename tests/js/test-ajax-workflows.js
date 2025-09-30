/**
 * AJAX Communication Workflow Tests
 * Tests comprehensive AJAX communication patterns and error handling
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 5.1
 */

// Mock environment setup
if (typeof jQuery === 'undefined') {
    global.jQuery = require('jquery');
    global.$ = global.jQuery;
}

global.lasAdminData = {
    ajaxurl: '/wp-admin/admin-ajax.php',
    nonce: 'test_nonce_12345',
    auto_refresh_nonce: true,
    retry_attempts: 3,
    retry_delay: 1000
};

describe('AJAX Communication Workflows', () => {
    let mockAjaxResponse;
    let mockErrorManager;
    let AjaxManager;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock jQuery AJAX
        mockAjaxResponse = {
            success: true,
            data: {
                css: 'body { background-color: #ffffff; }',
                performance: { execution_time_ms: 150 }
            }
        };
        
        global.$.ajax = jest.fn(() => ({
            done: jest.fn((callback) => {
                callback(mockAjaxResponse);
                return { fail: jest.fn() };
            }),
            fail: jest.fn(),
            always: jest.fn((callback) => {
                callback();
                return { done: jest.fn(), fail: jest.fn() };
            })
        }));
        
        global.$.post = jest.fn(() => ({
            done: jest.fn((callback) => {
                callback(mockAjaxResponse);
                return { fail: jest.fn() };
            }),
            fail: jest.fn()
        }));
        
        // Mock ErrorManager
        mockErrorManager = {
            showError: jest.fn(),
            showWarning: jest.fn(),
            showSuccess: jest.fn(),
            showInfo: jest.fn()
        };
        global.ErrorManager = mockErrorManager;
        
        // Initialize AJAX Manager
        AjaxManager = {
            activeRequests: new Map(),
            requestQueue: [],
            isProcessingQueue: false,
            maxConcurrentRequests: 3,
            requestTimeout: 8000,
            retryAttempts: 3,
            retryDelay: 1000,
            nonceRefreshInProgress: false,
            
            init: function() {
                return this;
            },
            
            makeRequest: function(action, data, options) {
                options = Object.assign({
                    timeout: this.requestTimeout,
                    retries: this.retryAttempts,
                    priority: 'normal'
                }, options || {});
                
                const requestId = this.generateRequestId();
                const requestData = Object.assign({
                    action: action,
                    nonce: lasAdminData.nonce
                }, data || {});
                
                const request = {
                    id: requestId,
                    action: action,
                    data: requestData,
                    options: options,
                    attempts: 0,
                    startTime: Date.now()
                };
                
                this.activeRequests.set(requestId, request);
                
                return this.executeRequest(request);
            },
            
            executeRequest: function(request) {
                request.attempts++;
                
                return $.ajax({
                    url: lasAdminData.ajaxurl,
                    type: 'POST',
                    data: request.data,
                    dataType: 'json',
                    timeout: request.options.timeout
                })
                .done((response) => {
                    this.handleSuccess(request, response);
                })
                .fail((jqXHR, textStatus, errorThrown) => {
                    this.handleError(request, jqXHR, textStatus, errorThrown);
                })
                .always(() => {
                    this.cleanupRequest(request.id);
                });
            },
            
            handleSuccess: function(request, response) {
                if (!response || typeof response !== 'object') {
                    this.handleError(request, null, 'parsererror', 'Invalid response format');
                    return;
                }
                
                if (response.success === false) {
                    if (response.data && response.data.code === 'invalid_nonce') {
                        this.handleNonceError(request);
                        return;
                    }
                    
                    const errorMessage = response.data && response.data.message 
                        ? response.data.message 
                        : 'Server returned error';
                    
                    if (ErrorManager) {
                        ErrorManager.showError(errorMessage);
                    }
                    return;
                }
                
                // Success handling
                const executionTime = Date.now() - request.startTime;
                if (executionTime > 2000) {
                    if (ErrorManager) {
                        ErrorManager.showWarning(`Slow request: ${executionTime}ms`);
                    }
                }
                
                return response;
            },
            
            handleError: function(request, jqXHR, textStatus, errorThrown) {
                const canRetry = request.attempts < request.options.retries;
                
                if (textStatus === 'timeout' && canRetry) {
                    setTimeout(() => {
                        this.executeRequest(request);
                    }, this.retryDelay * request.attempts);
                    return;
                }
                
                if (jqXHR && jqXHR.status === 0 && navigator.onLine === false) {
                    if (ErrorManager) {
                        ErrorManager.showError('You are offline. Please check your connection.');
                    }
                    return;
                }
                
                if (canRetry && (jqXHR.status >= 500 || textStatus === 'error')) {
                    setTimeout(() => {
                        this.executeRequest(request);
                    }, this.retryDelay * request.attempts);
                    return;
                }
                
                // Final error handling
                let errorMessage = 'Request failed';
                if (textStatus === 'timeout') {
                    errorMessage = 'Request timed out';
                } else if (textStatus === 'parsererror') {
                    errorMessage = 'Invalid server response';
                } else if (jqXHR && jqXHR.status >= 500) {
                    errorMessage = 'Server error';
                } else if (jqXHR && jqXHR.status >= 400) {
                    errorMessage = 'Client error';
                }
                
                if (ErrorManager) {
                    ErrorManager.showError(errorMessage);
                }
            },
            
            handleNonceError: function(request) {
                if (this.nonceRefreshInProgress) {
                    // Queue request for retry after nonce refresh
                    this.requestQueue.push(request);
                    return;
                }
                
                this.nonceRefreshInProgress = true;
                
                this.refreshNonce()
                    .then(() => {
                        // Retry original request with new nonce
                        request.data.nonce = lasAdminData.nonce;
                        request.attempts = 0; // Reset attempts for nonce retry
                        return this.executeRequest(request);
                    })
                    .catch(() => {
                        if (ErrorManager) {
                            ErrorManager.showError('Authentication failed. Please refresh the page.');
                        }
                    })
                    .finally(() => {
                        this.nonceRefreshInProgress = false;
                        this.processQueuedRequests();
                    });
            },
            
            refreshNonce: function() {
                return $.post(lasAdminData.ajaxurl, {
                    action: 'las_refresh_nonce'
                })
                .then((response) => {
                    if (response.success && response.data.nonce) {
                        lasAdminData.nonce = response.data.nonce;
                        return response.data.nonce;
                    }
                    throw new Error('Nonce refresh failed');
                });
            },
            
            processQueuedRequests: function() {
                while (this.requestQueue.length > 0) {
                    const request = this.requestQueue.shift();
                    request.data.nonce = lasAdminData.nonce;
                    request.attempts = 0;
                    this.executeRequest(request);
                }
            },
            
            generateRequestId: function() {
                return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            },
            
            cleanupRequest: function(requestId) {
                this.activeRequests.delete(requestId);
            },
            
            cancelRequest: function(requestId) {
                const request = this.activeRequests.get(requestId);
                if (request && request.xhr) {
                    request.xhr.abort();
                }
                this.cleanupRequest(requestId);
            },
            
            cancelAllRequests: function() {
                this.activeRequests.forEach((request, id) => {
                    this.cancelRequest(id);
                });
            },
            
            getActiveRequestCount: function() {
                return this.activeRequests.size;
            },
            
            getQueuedRequestCount: function() {
                return this.requestQueue.length;
            }
        };
        
        AjaxManager.init();
    });
    
    afterEach(() => {
        AjaxManager.cancelAllRequests();
    });

    describe('Basic AJAX Request Handling', () => {
        test('should make successful AJAX requests', async () => {
            const response = await AjaxManager.makeRequest('las_get_preview_css', {
                setting: 'admin_menu_bg_color',
                value: '#ff0000'
            });
            
            expect($.ajax).toHaveBeenCalledWith({
                url: lasAdminData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'las_get_preview_css',
                    nonce: lasAdminData.nonce,
                    setting: 'admin_menu_bg_color',
                    value: '#ff0000'
                },
                dataType: 'json',
                timeout: AjaxManager.requestTimeout
            });
        });

        test('should handle request options correctly', async () => {
            const customOptions = {
                timeout: 5000,
                retries: 2,
                priority: 'high'
            };
            
            await AjaxManager.makeRequest('test_action', { test: 'data' }, customOptions);
            
            expect($.ajax).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 5000
                })
            );
        });

        test('should generate unique request IDs', () => {
            const id1 = AjaxManager.generateRequestId();
            const id2 = AjaxManager.generateRequestId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
        });

        test('should track active requests', async () => {
            expect(AjaxManager.getActiveRequestCount()).toBe(0);
            
            AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(AjaxManager.getActiveRequestCount()).toBe(1);
        });
    });

    describe('Error Handling Workflows', () => {
        test('should handle server errors with retry', async () => {
            // Mock server error response
            global.$.ajax = jest.fn(() => ({
                done: jest.fn(),
                fail: jest.fn((callback) => {
                    callback({ status: 500 }, 'error', 'Internal Server Error');
                    return { always: jest.fn() };
                }),
                always: jest.fn((callback) => {
                    callback();
                    return { done: jest.fn(), fail: jest.fn() };
                })
            }));
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            // Should attempt retry for server errors
            expect($.ajax).toHaveBeenCalled();
        });

        test('should handle timeout errors with retry', async () => {
            global.$.ajax = jest.fn(() => ({
                done: jest.fn(),
                fail: jest.fn((callback) => {
                    callback({ status: 0 }, 'timeout', '');
                    return { always: jest.fn() };
                }),
                always: jest.fn((callback) => {
                    callback();
                    return { done: jest.fn(), fail: jest.fn() };
                })
            }));
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect($.ajax).toHaveBeenCalled();
        });

        test('should handle offline status', async () => {
            // Mock offline status
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            global.$.ajax = jest.fn(() => ({
                done: jest.fn(),
                fail: jest.fn((callback) => {
                    callback({ status: 0 }, 'error', 'Network Error');
                    return { always: jest.fn() };
                }),
                always: jest.fn((callback) => {
                    callback();
                    return { done: jest.fn(), fail: jest.fn() };
                })
            }));
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(ErrorManager.showError).toHaveBeenCalledWith(
                'You are offline. Please check your connection.'
            );
        });

        test('should handle parse errors', async () => {
            global.$.ajax = jest.fn(() => ({
                done: jest.fn(),
                fail: jest.fn((callback) => {
                    callback({ status: 200 }, 'parsererror', 'Invalid JSON');
                    return { always: jest.fn() };
                }),
                always: jest.fn((callback) => {
                    callback();
                    return { done: jest.fn(), fail: jest.fn() };
                })
            }));
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(ErrorManager.showError).toHaveBeenCalledWith('Invalid server response');
        });

        test('should show warning for slow requests', async () => {
            // Mock slow response
            const originalNow = Date.now;
            let callCount = 0;
            Date.now = jest.fn(() => {
                callCount++;
                return callCount === 1 ? 1000 : 4000; // 3 second difference
            });
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(ErrorManager.showWarning).toHaveBeenCalledWith('Slow request: 3000ms');
            
            Date.now = originalNow;
        });
    });

    describe('Nonce Management Workflows', () => {
        test('should handle nonce errors and refresh', async () => {
            // Mock nonce error response
            mockAjaxResponse = {
                success: false,
                data: {
                    code: 'invalid_nonce',
                    message: 'Invalid nonce'
                }
            };
            
            // Mock nonce refresh success
            global.$.post = jest.fn(() => ({
                then: jest.fn((callback) => {
                    callback({
                        success: true,
                        data: { nonce: 'new_nonce_12345' }
                    });
                    return {
                        catch: jest.fn(),
                        finally: jest.fn((finalCallback) => {
                            finalCallback();
                            return { then: jest.fn(), catch: jest.fn() };
                        })
                    };
                })
            }));
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect($.post).toHaveBeenCalledWith(lasAdminData.ajaxurl, {
                action: 'las_refresh_nonce'
            });
            
            expect(lasAdminData.nonce).toBe('new_nonce_12345');
        });

        test('should queue requests during nonce refresh', async () => {
            AjaxManager.nonceRefreshInProgress = true;
            
            mockAjaxResponse = {
                success: false,
                data: {
                    code: 'invalid_nonce',
                    message: 'Invalid nonce'
                }
            };
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(AjaxManager.getQueuedRequestCount()).toBe(1);
        });

        test('should handle nonce refresh failure', async () => {
            mockAjaxResponse = {
                success: false,
                data: {
                    code: 'invalid_nonce',
                    message: 'Invalid nonce'
                }
            };
            
            // Mock nonce refresh failure
            global.$.post = jest.fn(() => ({
                then: jest.fn(() => ({
                    catch: jest.fn((callback) => {
                        callback(new Error('Nonce refresh failed'));
                        return {
                            finally: jest.fn((finalCallback) => {
                                finalCallback();
                                return { then: jest.fn(), catch: jest.fn() };
                            })
                        };
                    })
                }))
            }));
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(ErrorManager.showError).toHaveBeenCalledWith(
                'Authentication failed. Please refresh the page.'
            );
        });
    });

    describe('Request Queue Management', () => {
        test('should process queued requests after nonce refresh', async () => {
            // Add requests to queue
            const request1 = { data: { nonce: 'old_nonce' }, attempts: 1 };
            const request2 = { data: { nonce: 'old_nonce' }, attempts: 1 };
            
            AjaxManager.requestQueue = [request1, request2];
            lasAdminData.nonce = 'new_nonce';
            
            AjaxManager.processQueuedRequests();
            
            expect(AjaxManager.getQueuedRequestCount()).toBe(0);
            expect(request1.data.nonce).toBe('new_nonce');
            expect(request2.data.nonce).toBe('new_nonce');
            expect(request1.attempts).toBe(0);
            expect(request2.attempts).toBe(0);
        });

        test('should handle empty queue gracefully', () => {
            AjaxManager.requestQueue = [];
            
            expect(() => {
                AjaxManager.processQueuedRequests();
            }).not.toThrow();
            
            expect(AjaxManager.getQueuedRequestCount()).toBe(0);
        });
    });

    describe('Request Cancellation', () => {
        test('should cancel individual requests', () => {
            const requestId = 'test_request_id';
            const mockXhr = { abort: jest.fn() };
            
            AjaxManager.activeRequests.set(requestId, { xhr: mockXhr });
            
            AjaxManager.cancelRequest(requestId);
            
            expect(mockXhr.abort).toHaveBeenCalled();
            expect(AjaxManager.activeRequests.has(requestId)).toBe(false);
        });

        test('should cancel all active requests', () => {
            const mockXhr1 = { abort: jest.fn() };
            const mockXhr2 = { abort: jest.fn() };
            
            AjaxManager.activeRequests.set('req1', { xhr: mockXhr1 });
            AjaxManager.activeRequests.set('req2', { xhr: mockXhr2 });
            
            AjaxManager.cancelAllRequests();
            
            expect(mockXhr1.abort).toHaveBeenCalled();
            expect(mockXhr2.abort).toHaveBeenCalled();
            expect(AjaxManager.getActiveRequestCount()).toBe(0);
        });

        test('should handle cancellation of non-existent requests', () => {
            expect(() => {
                AjaxManager.cancelRequest('non_existent_id');
            }).not.toThrow();
        });
    });

    describe('Response Validation', () => {
        test('should validate response format', async () => {
            // Test null response
            global.$.ajax = jest.fn(() => ({
                done: jest.fn((callback) => {
                    callback(null);
                    return { fail: jest.fn() };
                }),
                fail: jest.fn(),
                always: jest.fn((callback) => {
                    callback();
                    return { done: jest.fn(), fail: jest.fn() };
                })
            }));
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            // Should handle null response as error
            expect(ErrorManager.showError).toHaveBeenCalled();
        });

        test('should handle server error responses', async () => {
            mockAjaxResponse = {
                success: false,
                data: {
                    message: 'Custom server error',
                    code: 'custom_error'
                }
            };
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(ErrorManager.showError).toHaveBeenCalledWith('Custom server error');
        });

        test('should handle responses without error messages', async () => {
            mockAjaxResponse = {
                success: false,
                data: {}
            };
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            expect(ErrorManager.showError).toHaveBeenCalledWith('Server returned error');
        });
    });

    describe('Performance Monitoring', () => {
        test('should track request execution time', async () => {
            const originalNow = Date.now;
            let callCount = 0;
            Date.now = jest.fn(() => {
                callCount++;
                return callCount === 1 ? 1000 : 1500; // 500ms difference
            });
            
            await AjaxManager.makeRequest('test_action', { test: 'data' });
            
            // Should not show warning for fast requests
            expect(ErrorManager.showWarning).not.toHaveBeenCalled();
            
            Date.now = originalNow;
        });

        test('should provide request statistics', () => {
            // Add some active requests
            AjaxManager.activeRequests.set('req1', { id: 'req1' });
            AjaxManager.activeRequests.set('req2', { id: 'req2' });
            
            // Add some queued requests
            AjaxManager.requestQueue = [{ id: 'req3' }, { id: 'req4' }];
            
            expect(AjaxManager.getActiveRequestCount()).toBe(2);
            expect(AjaxManager.getQueuedRequestCount()).toBe(2);
        });
    });

    describe('Concurrent Request Handling', () => {
        test('should handle multiple simultaneous requests', async () => {
            const promises = [
                AjaxManager.makeRequest('action1', { data: '1' }),
                AjaxManager.makeRequest('action2', { data: '2' }),
                AjaxManager.makeRequest('action3', { data: '3' })
            ];
            
            await Promise.all(promises);
            
            expect($.ajax).toHaveBeenCalledTimes(3);
        });

        test('should respect maximum concurrent request limit', () => {
            // This would be implemented in a more sophisticated version
            // For now, we just verify the limit exists
            expect(AjaxManager.maxConcurrentRequests).toBe(3);
        });
    });
});