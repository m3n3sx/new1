/**
 * Unit Tests for HTTP Transport Layer
 * 
 * Tests modern fetch() API implementation, XMLHttpRequest fallback,
 * timeout management, response validation, and error detection.
 */

describe('HTTPTransport', () => {
    let transport;
    let originalFetch;
    let originalAbortController;

    beforeEach(() => {
        // Store original globals
        originalFetch = global.fetch;
        originalAbortController = global.AbortController;
        
        // Mock performance.now
        global.performance = global.performance || {};
        global.performance.now = jest.fn(() => Date.now());
        
        // Create fresh transport instance
        transport = new (require('../../assets/js/modules/http-transport.js'))();
    });

    afterEach(() => {
        // Restore original globals
        global.fetch = originalFetch;
        global.AbortController = originalAbortController;
        jest.clearAllMocks();
    });

    describe('Feature Detection', () => {
        test('should detect fetch support correctly', () => {
            global.fetch = jest.fn();
            global.Promise = Promise;
            global.Response = Response;
            
            const transport = new (require('../../assets/js/modules/http-transport.js'))();
            expect(transport.supportsFetch).toBe(true);
        });

        test('should detect missing fetch support', () => {
            delete global.fetch;
            
            const transport = new (require('../../assets/js/modules/http-transport.js'))();
            expect(transport.supportsFetch).toBe(false);
        });

        test('should detect AbortController support', () => {
            global.AbortController = class AbortController {
                constructor() {
                    this.signal = { aborted: false };
                }
                abort() {
                    this.signal.aborted = true;
                }
            };
            
            const transport = new (require('../../assets/js/modules/http-transport.js'))();
            expect(transport.supportsAbortController).toBe(true);
        });
    });

    describe('Request Configuration', () => {
        test('should validate required configuration', async () => {
            await expect(transport.sendRequest({})).rejects.toThrow('Request URL is required');
        });

        test('should set default method to POST', async () => {
            const config = { url: 'http://example.com' };
            transport.validateConfig(config);
            expect(config.method).toBe('POST');
        });

        test('should set default timeout', async () => {
            const config = { url: 'http://example.com' };
            transport.validateConfig(config);
            expect(config.timeout).toBe(30000);
        });

        test('should prepare request configuration correctly', () => {
            const config = {
                url: 'http://example.com',
                method: 'post',
                data: { key: 'value' },
                headers: { 'Custom-Header': 'test' }
            };

            const prepared = transport.prepareRequestConfig(config);
            
            expect(prepared.method).toBe('POST');
            expect(prepared.headers['Custom-Header']).toBe('test');
            expect(prepared.headers['Content-Type']).toContain('application/x-www-form-urlencoded');
            expect(prepared.body).toBe('key=value');
        });

        test('should handle FormData correctly', () => {
            const formData = new FormData();
            formData.append('key', 'value');
            
            const config = {
                url: 'http://example.com',
                method: 'POST',
                data: formData
            };

            const prepared = transport.prepareRequestConfig(config);
            
            expect(prepared.body).toBe(formData);
            expect(prepared.headers['Content-Type']).toBeUndefined();
        });
    });

    describe('Fetch API Implementation', () => {
        test('should make successful fetch request', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ success: true, data: 'test' })
            };

            global.fetch = jest.fn().mockResolvedValue(mockResponse);
            global.AbortController = class {
                constructor() {
                    this.signal = {};
                }
                abort() {}
            };

            const config = {
                url: 'http://example.com',
                method: 'POST',
                timeout: 5000,
                headers: {},
                body: 'test=data'
            };

            const response = await transport.fetchRequest(config);
            
            expect(global.fetch).toHaveBeenCalledWith('http://example.com', {
                method: 'POST',
                headers: {},
                body: 'test=data',
                signal: expect.any(Object),
                credentials: 'same-origin'
            });
            expect(response).toBe(mockResponse);
        });

        test('should handle fetch timeout with AbortController', async () => {
            let abortController;
            global.AbortController = class {
                constructor() {
                    this.signal = {};
                    abortController = this;
                }
                abort() {
                    const error = new Error('The operation was aborted');
                    error.name = 'AbortError';
                    throw error;
                }
            };

            global.fetch = jest.fn().mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        const error = new Error('The operation was aborted');
                        error.name = 'AbortError';
                        reject(error);
                    }, 100);
                });
            });

            const config = {
                url: 'http://example.com',
                method: 'POST',
                timeout: 50,
                headers: {},
                body: 'test=data'
            };

            await expect(transport.fetchRequest(config)).rejects.toMatchObject({
                name: 'TimeoutError',
                code: 'TIMEOUT_ERROR'
            });
        });

        test('should handle network errors', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
            
            const config = {
                url: 'http://example.com',
                method: 'POST',
                headers: {},
                body: 'test=data'
            };

            await expect(transport.fetchRequest(config)).rejects.toThrow('Network error');
        });
    });

    describe('XMLHttpRequest Fallback', () => {
        let mockXHR;

        beforeEach(() => {
            mockXHR = {
                open: jest.fn(),
                send: jest.fn(),
                setRequestHeader: jest.fn(),
                abort: jest.fn(),
                getAllResponseHeaders: jest.fn().mockReturnValue('content-type: application/json\r\n'),
                status: 200,
                statusText: 'OK',
                responseText: '{"success": true, "data": "test"}',
                onload: null,
                onerror: null,
                onabort: null
            };

            global.XMLHttpRequest = jest.fn(() => mockXHR);
        });

        test('should make successful XHR request', async () => {
            const config = {
                url: 'http://example.com',
                method: 'POST',
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' },
                body: '{"test": "data"}'
            };

            const responsePromise = transport.xhrRequest(config);
            
            // Simulate successful response
            setTimeout(() => {
                mockXHR.onload();
            }, 10);

            const response = await responsePromise;
            
            expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://example.com', true);
            expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(mockXHR.send).toHaveBeenCalledWith('{"test": "data"}');
            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);
        });

        test('should handle XHR timeout', async () => {
            const config = {
                url: 'http://example.com',
                method: 'POST',
                timeout: 100,
                headers: {},
                body: 'test=data'
            };

            const responsePromise = transport.xhrRequest(config);
            
            // Don't trigger onload - let timeout occur
            await expect(responsePromise).rejects.toMatchObject({
                name: 'TimeoutError',
                code: 'TIMEOUT_ERROR'
            });
        });

        test('should handle XHR network error', async () => {
            const config = {
                url: 'http://example.com',
                method: 'POST',
                headers: {},
                body: 'test=data'
            };

            const responsePromise = transport.xhrRequest(config);
            
            // Simulate network error
            setTimeout(() => {
                mockXHR.onerror();
            }, 10);

            await expect(responsePromise).rejects.toMatchObject({
                name: 'NetworkError',
                code: 'NETWORK_ERROR'
            });
        });

        test('should handle XHR abort', async () => {
            const config = {
                url: 'http://example.com',
                method: 'POST',
                headers: {},
                body: 'test=data'
            };

            const responsePromise = transport.xhrRequest(config);
            
            // Simulate abort
            setTimeout(() => {
                mockXHR.onabort();
            }, 10);

            await expect(responsePromise).rejects.toMatchObject({
                name: 'AbortError',
                code: 'ABORT_ERROR'
            });
        });

        test('should parse XHR headers correctly', () => {
            const headerStr = 'content-type: application/json\r\ncache-control: no-cache\r\n';
            const headers = transport.parseXHRHeaders(headerStr);
            
            expect(headers['content-type']).toBe('application/json');
            expect(headers['cache-control']).toBe('no-cache');
        });

        test('should create fetch-like response from XHR', async () => {
            mockXHR.responseText = '{"success": true}';
            
            const config = {
                url: 'http://example.com',
                method: 'POST',
                headers: {},
                body: 'test=data'
            };

            const responsePromise = transport.xhrRequest(config);
            
            setTimeout(() => {
                mockXHR.onload();
            }, 10);

            const response = await responsePromise;
            
            expect(typeof response.text).toBe('function');
            expect(typeof response.json).toBe('function');
            
            const text = await response.text();
            expect(text).toBe('{"success": true}');
            
            const json = await response.json();
            expect(json).toEqual({ success: true });
        });
    });

    describe('Response Processing', () => {
        test('should process successful JSON response', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: {
                    get: jest.fn().mockReturnValue('application/json')
                },
                json: jest.fn().mockResolvedValue({ success: true, data: 'test' })
            };

            const config = { validateWordPressResponse: true };
            const result = await transport.processResponse(mockResponse, config);
            
            expect(result.data).toEqual({ success: true, data: 'test' });
            expect(result.status).toBe(200);
            expect(result.ok).toBe(true);
        });

        test('should process text response', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: {
                    get: jest.fn().mockReturnValue('text/plain')
                },
                text: jest.fn().mockResolvedValue('plain text response')
            };

            const config = {};
            const result = await transport.processResponse(mockResponse, config);
            
            expect(result.data).toBe('plain text response');
        });

        test('should handle HTTP error responses', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: { get: jest.fn() }
            };

            const config = {};
            
            await expect(transport.processResponse(mockResponse, config)).rejects.toMatchObject({
                name: 'HTTPError',
                status: 404,
                code: 'CLIENT_ERROR'
            });
        });

        test('should handle JSON parse errors', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: {
                    get: jest.fn().mockReturnValue('application/json')
                },
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };

            const config = {};
            
            await expect(transport.processResponse(mockResponse, config)).rejects.toMatchObject({
                name: 'ParseError',
                code: 'PARSE_ERROR'
            });
        });

        test('should validate WordPress response structure', () => {
            // Should not throw for valid WordPress response
            expect(() => {
                transport.validateWordPressResponse({ success: true, data: 'test' });
            }).not.toThrow();

            // Should warn for invalid structure
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            transport.validateWordPressResponse({ data: 'test' });
            expect(consoleSpy).toHaveBeenCalledWith('WordPress AJAX response missing success property');
            
            transport.validateWordPressResponse({ success: false });
            expect(consoleSpy).toHaveBeenCalledWith('WordPress AJAX error response missing error data');
            
            consoleSpy.mockRestore();
        });
    });

    describe('Error Classification', () => {
        test('should classify HTTP errors correctly', () => {
            expect(transport.classifyHTTPError(400)).toBe('CLIENT_ERROR');
            expect(transport.classifyHTTPError(404)).toBe('CLIENT_ERROR');
            expect(transport.classifyHTTPError(500)).toBe('SERVER_ERROR');
            expect(transport.classifyHTTPError(502)).toBe('SERVER_ERROR');
            expect(transport.classifyHTTPError(0)).toBe('NETWORK_ERROR');
            expect(transport.classifyHTTPError(300)).toBe('HTTP_ERROR');
        });

        test('should enhance errors with context', () => {
            const originalError = new Error('Test error');
            originalError.code = 'TIMEOUT_ERROR';
            
            const config = {
                url: 'http://example.com',
                method: 'POST'
            };

            const enhanced = transport.enhanceError(originalError, config);
            
            expect(enhanced.requestConfig.url).toBe('http://example.com');
            expect(enhanced.requestConfig.method).toBe('POST');
            expect(enhanced.userMessage).toContain('Request timed out');
            expect(enhanced.retryable).toBe(true);
        });

        test('should provide user-friendly error messages', () => {
            const timeoutError = { code: 'TIMEOUT_ERROR' };
            const networkError = { code: 'NETWORK_ERROR' };
            const serverError = { code: 'SERVER_ERROR' };
            const clientError = { code: 'CLIENT_ERROR' };
            const parseError = { code: 'PARSE_ERROR' };
            const unknownError = { code: 'UNKNOWN_ERROR' };

            expect(transport.getUserFriendlyMessage(timeoutError)).toContain('timed out');
            expect(transport.getUserFriendlyMessage(networkError)).toContain('connection problem');
            expect(transport.getUserFriendlyMessage(serverError)).toContain('Server error');
            expect(transport.getUserFriendlyMessage(clientError)).toContain('Invalid request');
            expect(transport.getUserFriendlyMessage(parseError)).toContain('Invalid response');
            expect(transport.getUserFriendlyMessage(unknownError)).toContain('unexpected error');
        });

        test('should determine retryable errors correctly', () => {
            expect(transport.isRetryableError({ code: 'TIMEOUT_ERROR' })).toBe(true);
            expect(transport.isRetryableError({ code: 'NETWORK_ERROR' })).toBe(true);
            expect(transport.isRetryableError({ code: 'SERVER_ERROR' })).toBe(true);
            expect(transport.isRetryableError({ code: 'CLIENT_ERROR' })).toBe(false);
            expect(transport.isRetryableError({ status: 500 })).toBe(true);
            expect(transport.isRetryableError({ status: 400 })).toBe(false);
        });
    });

    describe('Utility Functions', () => {
        test('should convert object to form data', () => {
            const obj = {
                string: 'value',
                number: 123,
                boolean: true,
                object: { nested: 'value' },
                null: null,
                undefined: undefined
            };

            const formData = transport.objectToFormData(obj);
            
            expect(formData).toContain('string=value');
            expect(formData).toContain('number=123');
            expect(formData).toContain('boolean=true');
            expect(formData).toContain('object=%7B%22nested%22%3A%22value%22%7D'); // JSON encoded
            expect(formData).not.toContain('null=');
            expect(formData).not.toContain('undefined=');
        });
    });

    describe('Performance Metrics', () => {
        test('should track performance metrics', () => {
            transport.updateMetrics(true, 100);
            transport.updateMetrics(false, 200);
            transport.updateMetrics(true, 150);

            const metrics = transport.getMetrics();
            
            expect(metrics.totalRequests).toBe(3);
            expect(metrics.successfulRequests).toBe(2);
            expect(metrics.failedRequests).toBe(1);
            expect(metrics.averageResponseTime).toBe(150); // (100 + 200 + 150) / 3
            expect(metrics.successRate).toBe(66.66666666666666);
            expect(metrics.failureRate).toBe(33.33333333333333);
        });

        test('should reset metrics', () => {
            transport.updateMetrics(true, 100);
            transport.resetMetrics();

            const metrics = transport.getMetrics();
            
            expect(metrics.totalRequests).toBe(0);
            expect(metrics.successfulRequests).toBe(0);
            expect(metrics.failedRequests).toBe(0);
            expect(metrics.averageResponseTime).toBe(0);
        });
    });

    describe('Configuration', () => {
        test('should configure transport options', () => {
            const newOptions = {
                timeout: 60000,
                headers: { 'Custom-Header': 'value' }
            };

            transport.configure(newOptions);
            
            expect(transport.options.timeout).toBe(60000);
            expect(transport.options.headers['Custom-Header']).toBe('value');
            expect(transport.options.headers['Content-Type']).toBeDefined(); // Should preserve defaults
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete request lifecycle with fetch', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: {
                    get: jest.fn().mockReturnValue('application/json')
                },
                json: jest.fn().mockResolvedValue({ success: true, data: 'test' })
            };

            global.fetch = jest.fn().mockResolvedValue(mockResponse);
            global.AbortController = class {
                constructor() {
                    this.signal = {};
                }
                abort() {}
            };

            const config = {
                url: 'http://example.com/wp-admin/admin-ajax.php',
                method: 'POST',
                data: { action: 'test_action', nonce: 'test_nonce' },
                timeout: 5000
            };

            const result = await transport.sendRequest(config);
            
            expect(result.data).toEqual({ success: true, data: 'test' });
            expect(result.ok).toBe(true);
            expect(transport.getMetrics().successfulRequests).toBe(1);
        });

        test('should fallback to XHR when fetch fails', async () => {
            // Simulate fetch not being available
            transport.supportsFetch = false;

            const mockXHR = {
                open: jest.fn(),
                send: jest.fn(),
                setRequestHeader: jest.fn(),
                abort: jest.fn(),
                getAllResponseHeaders: jest.fn().mockReturnValue('content-type: application/json\r\n'),
                status: 200,
                statusText: 'OK',
                responseText: '{"success": true, "data": "test"}',
                onload: null,
                onerror: null,
                onabort: null
            };

            global.XMLHttpRequest = jest.fn(() => mockXHR);

            const config = {
                url: 'http://example.com',
                data: { test: 'data' }
            };

            const responsePromise = transport.sendRequest(config);
            
            // Simulate successful XHR response
            setTimeout(() => {
                mockXHR.onload();
            }, 10);

            const result = await responsePromise;
            
            expect(result.data).toEqual({ success: true, data: 'test' });
            expect(mockXHR.open).toHaveBeenCalled();
        });
    });
});