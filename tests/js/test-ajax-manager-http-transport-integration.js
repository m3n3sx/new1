/**
 * Integration Tests for AJAX Manager with HTTP Transport Layer
 * 
 * Tests the integration between the enhanced AJAX Manager and the new HTTP Transport layer
 */

describe('AJAX Manager HTTP Transport Integration', () => {
    let ajaxManager;
    let mockCore;
    let originalHTTPTransport;

    beforeEach(() => {
        // Mock core object
        mockCore = {
            log: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn(),
            config: {
                nonce: 'test_nonce_12345',
                ajaxUrl: '/wp-admin/admin-ajax.php',
                debug: true
            }
        };

        // Store original HTTPTransport
        originalHTTPTransport = global.HTTPTransport;

        // Mock HTTPTransport class
        global.HTTPTransport = jest.fn().mockImplementation(() => ({
            supportsFetch: true,
            supportsAbortController: true,
            sendRequest: jest.fn(),
            getMetrics: jest.fn().mockReturnValue({
                totalRequests: 5,
                successfulRequests: 4,
                failedRequests: 1,
                averageResponseTime: 150,
                successRate: 80,
                failureRate: 20
            }),
            configure: jest.fn()
        }));

        // Make HTTPTransport available globally
        global.window = global.window || {};
        global.window.LAS = { HTTPTransport: global.HTTPTransport };

        // Create AJAX manager instance
        const AjaxManager = require('../../assets/js/modules/ajax-manager.js');
        ajaxManager = new AjaxManager(mockCore);
    });

    afterEach(() => {
        // Restore original HTTPTransport
        global.HTTPTransport = originalHTTPTransport;
        if (global.window && global.window.LAS) {
            delete global.window.LAS.HTTPTransport;
        }
        jest.clearAllMocks();
    });

    describe('HTTP Transport Initialization', () => {
        test('should initialize HTTP transport when available', () => {
            expect(ajaxManager.httpTransport).toBeDefined();
            expect(global.HTTPTransport).toHaveBeenCalledWith({
                timeout: 30000,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        });

        test('should handle missing HTTP transport gracefully', () => {
            // Remove HTTPTransport
            delete global.window.LAS.HTTPTransport;
            delete global.HTTPTransport;

            const AjaxManager = require('../../assets/js/modules/ajax-manager.js');
            const manager = new AjaxManager(mockCore);

            expect(manager.httpTransport).toBeNull();
            expect(mockCore.log).toHaveBeenCalledWith(
                'HTTPTransport not available, using legacy HTTP methods',
                'warning'
            );
        });
    });

    describe('Request Execution with HTTP Transport', () => {
        test('should use HTTP transport for requests', async () => {
            const mockResponse = {
                data: { success: true, data: { message: 'Settings saved' } },
                status: 200,
                ok: true
            };

            ajaxManager.httpTransport.sendRequest.mockResolvedValue(mockResponse);

            const result = await ajaxManager.request('save_settings', {
                theme: 'dark',
                color: 'blue'
            });

            expect(ajaxManager.httpTransport.sendRequest).toHaveBeenCalledWith({
                url: '/wp-admin/admin-ajax.php',
                method: 'POST',
                data: {
                    action: 'las_save_settings',
                    nonce: 'test_nonce_12345',
                    theme: 'dark',
                    color: 'blue'
                },
                timeout: 30000,
                validateWordPressResponse: true
            });

            expect(result).toEqual({ message: 'Settings saved' });
        });

        test('should handle HTTP transport errors with enhanced error info', async () => {
            const transportError = new Error('Network timeout');
            transportError.code = 'TIMEOUT_ERROR';
            transportError.userMessage = 'Request timed out. Please check your connection.';
            transportError.retryable = true;

            ajaxManager.httpTransport.sendRequest.mockRejectedValue(transportError);

            try {
                await ajaxManager.request('save_settings', { test: 'data' });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.code).toBe('TIMEOUT_ERROR');
                expect(error.retryable).toBe(true);
                expect(ajaxManager.showUserNotification).toBeDefined();
            }
        });

        test('should process WordPress AJAX response format correctly', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        updated_settings: { theme: 'light' },
                        message: 'Success'
                    }
                },
                status: 200,
                ok: true
            };

            ajaxManager.httpTransport.sendRequest.mockResolvedValue(mockResponse);

            const result = await ajaxManager.request('load_settings');

            expect(result).toEqual({
                updated_settings: { theme: 'light' },
                message: 'Success'
            });
        });

        test('should handle WordPress AJAX error responses', async () => {
            const mockResponse = {
                data: {
                    success: false,
                    data: {
                        message: 'Invalid nonce'
                    }
                },
                status: 200,
                ok: true
            };

            ajaxManager.httpTransport.sendRequest.mockResolvedValue(mockResponse);

            await expect(ajaxManager.request('save_settings', { test: 'data' }))
                .rejects.toThrow('Invalid nonce');
        });
    });

    describe('Retry Logic with HTTP Transport', () => {
        test('should use HTTP transport error classification for retries', async () => {
            const retryableError = new Error('Server error');
            retryableError.code = 'SERVER_ERROR';
            retryableError.retryable = true;

            const nonRetryableError = new Error('Client error');
            nonRetryableError.code = 'CLIENT_ERROR';
            nonRetryableError.retryable = false;

            expect(ajaxManager.shouldRetry(retryableError)).toBe(true);
            expect(ajaxManager.shouldRetry(nonRetryableError)).toBe(false);
        });

        test('should retry requests based on HTTP transport error codes', async () => {
            const timeoutError = new Error('Timeout');
            timeoutError.code = 'TIMEOUT_ERROR';

            const networkError = new Error('Network');
            networkError.code = 'NETWORK_ERROR';

            const serverError = new Error('Server');
            serverError.code = 'SERVER_ERROR';

            expect(ajaxManager.shouldRetry(timeoutError)).toBe(true);
            expect(ajaxManager.shouldRetry(networkError)).toBe(true);
            expect(ajaxManager.shouldRetry(serverError)).toBe(true);
        });

        test('should fallback to legacy retry logic when no error code', async () => {
            const legacyServerError = new Error('HTTP 500: Internal Server Error');
            const legacyClientError = new Error('HTTP 400: Bad Request');
            const legacyNetworkError = new Error('Network error');

            expect(ajaxManager.shouldRetry(legacyServerError)).toBe(true);
            expect(ajaxManager.shouldRetry(legacyClientError)).toBe(false);
            expect(ajaxManager.shouldRetry(legacyNetworkError)).toBe(true);
        });
    });

    describe('Configuration Integration', () => {
        test('should configure HTTP transport when timeout changes', () => {
            ajaxManager.configure({ timeout: 60000 });

            expect(ajaxManager.timeout).toBe(60000);
            expect(ajaxManager.httpTransport.configure).toHaveBeenCalledWith({
                timeout: 60000
            });
        });

        test('should pass HTTP transport specific configuration', () => {
            const httpTransportConfig = {
                headers: { 'Custom-Header': 'value' },
                retries: 5
            };

            ajaxManager.configure({
                timeout: 45000,
                httpTransport: httpTransportConfig
            });

            expect(ajaxManager.httpTransport.configure).toHaveBeenCalledWith(httpTransportConfig);
        });
    });

    describe('Metrics Integration', () => {
        test('should include HTTP transport metrics', () => {
            const metrics = ajaxManager.getMetrics();

            expect(metrics.transport).toBeDefined();
            expect(metrics.transport.totalRequests).toBe(5);
            expect(metrics.transport.successfulRequests).toBe(4);
            expect(metrics.transport.failedRequests).toBe(1);
            expect(metrics.transport.transportType).toBe('fetch');
        });

        test('should handle missing HTTP transport metrics gracefully', () => {
            ajaxManager.httpTransport = null;

            const metrics = ajaxManager.getMetrics();

            expect(metrics.transport).toBeUndefined();
            expect(metrics.totalRequests).toBeDefined();
        });
    });

    describe('Fallback to Legacy Methods', () => {
        beforeEach(() => {
            // Remove HTTP transport to test fallback
            ajaxManager.httpTransport = null;
        });

        test('should use legacy fetch when HTTP transport unavailable', async () => {
            // Mock fetch
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{"success": true, "data": "test"}')
            });

            // Mock AbortController
            global.AbortController = jest.fn().mockImplementation(() => ({
                signal: {},
                abort: jest.fn()
            }));

            const result = await ajaxManager.request('test_action', { test: 'data' });

            expect(global.fetch).toHaveBeenCalled();
            expect(result).toBe('test');
        });

        test('should use legacy XHR when fetch unavailable', async () => {
            // Remove fetch
            delete global.fetch;

            // Mock XMLHttpRequest
            const mockXHR = {
                open: jest.fn(),
                setRequestHeader: jest.fn(),
                send: jest.fn(),
                status: 200,
                statusText: 'OK',
                responseText: '{"success": true, "data": "xhr_test"}',
                onload: null,
                onerror: null,
                ontimeout: null
            };

            global.XMLHttpRequest = jest.fn(() => mockXHR);

            const requestPromise = ajaxManager.request('test_action', { test: 'data' });

            // Simulate successful response
            setTimeout(() => {
                mockXHR.onload();
            }, 10);

            const result = await requestPromise;

            expect(mockXHR.open).toHaveBeenCalledWith('POST', '/wp-admin/admin-ajax.php', true);
            expect(result).toBe('xhr_test');
        });
    });

    describe('Error Handling Integration', () => {
        test('should show user notifications for HTTP transport errors', async () => {
            const transportError = new Error('Connection failed');
            transportError.code = 'NETWORK_ERROR';
            transportError.userMessage = 'Network connection problem. Please check your internet connection.';

            ajaxManager.httpTransport.sendRequest.mockRejectedValue(transportError);

            // Mock showUserNotification
            ajaxManager.showUserNotification = jest.fn();

            try {
                await ajaxManager.request('test_action', { test: 'data' });
            } catch (error) {
                // Error is expected
            }

            expect(ajaxManager.showUserNotification).toHaveBeenCalledWith(
                'error',
                'Network connection problem. Please check your internet connection.'
            );
        });

        test('should handle errors without user messages', async () => {
            const basicError = new Error('Basic error');
            ajaxManager.httpTransport.sendRequest.mockRejectedValue(basicError);

            await expect(ajaxManager.request('test_action', { test: 'data' }))
                .rejects.toThrow('Basic error');
        });
    });

    describe('Performance Integration', () => {
        test('should track performance across both layers', async () => {
            const mockResponse = {
                data: { success: true, data: 'test' },
                status: 200,
                ok: true
            };

            ajaxManager.httpTransport.sendRequest.mockResolvedValue(mockResponse);

            await ajaxManager.request('test_action', { test: 'data' });

            const metrics = ajaxManager.getMetrics();

            // AJAX manager metrics
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.successfulRequests).toBe(1);

            // HTTP transport metrics
            expect(metrics.transport.totalRequests).toBe(5); // From mock
            expect(metrics.transport.successRate).toBe(80);
        });
    });
});