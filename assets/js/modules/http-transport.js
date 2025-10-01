/**
 * HTTP Transport Layer for Live Admin Styler
 * 
 * Provides modern fetch() API with XMLHttpRequest fallback for legacy browser compatibility.
 * Includes request timeout management, response validation, and comprehensive error detection.
 * 
 * @since 1.0.0
 */

class HTTPTransport {
    constructor(options = {}) {
        this.defaultOptions = {
            timeout: 30000,
            retries: 3,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        
        this.options = { ...this.defaultOptions, ...options };
        this.supportsFetch = this.detectFetchSupport();
        this.supportsAbortController = this.detectAbortControllerSupport();
        
        // Performance tracking
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Detect if fetch API is supported
     * @returns {boolean}
     */
    detectFetchSupport() {
        return typeof fetch !== 'undefined' && 
               typeof Promise !== 'undefined' && 
               typeof Response !== 'undefined';
    }

    /**
     * Detect if AbortController is supported
     * @returns {boolean}
     */
    detectAbortControllerSupport() {
        return typeof AbortController !== 'undefined';
    }

    /**
     * Send HTTP request with automatic fallback
     * @param {Object} config - Request configuration
     * @returns {Promise<Object>} Response object
     */
    async sendRequest(config) {
        const startTime = performance.now();
        this.metrics.totalRequests++;

        try {
            // Validate configuration
            this.validateConfig(config);
            
            // Prepare request configuration
            const requestConfig = this.prepareRequestConfig(config);
            
            let response;
            if (this.supportsFetch) {
                response = await this.fetchRequest(requestConfig);
            } else {
                response = await this.xhrRequest(requestConfig);
            }

            // Process and validate response
            const processedResponse = await this.processResponse(response, requestConfig);
            
            // Update metrics
            const responseTime = performance.now() - startTime;
            this.updateMetrics(true, responseTime);
            
            return processedResponse;
            
        } catch (error) {
            // Update metrics
            const responseTime = performance.now() - startTime;
            this.updateMetrics(false, responseTime);
            
            // Classify and enhance error
            const enhancedError = this.enhanceError(error, config);
            throw enhancedError;
        }
    }

    /**
     * Send request using fetch API
     * @param {Object} config - Request configuration
     * @returns {Promise<Response>}
     */
    async fetchRequest(config) {
        let abortController;
        let timeoutId;

        try {
            // Setup abort controller for timeout management
            if (this.supportsAbortController) {
                abortController = new AbortController();
                config.signal = abortController.signal;
                
                // Set timeout
                if (config.timeout > 0) {
                    timeoutId = setTimeout(() => {
                        abortController.abort();
                    }, config.timeout);
                }
            }

            // Make fetch request
            const response = await fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.body,
                signal: config.signal,
                credentials: 'same-origin'
            });

            // Clear timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            return response;
            
        } catch (error) {
            // Clear timeout on error
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Handle abort/timeout
            if (error.name === 'AbortError') {
                const timeoutError = new Error('Request timeout');
                timeoutError.name = 'TimeoutError';
                timeoutError.code = 'TIMEOUT_ERROR';
                throw timeoutError;
            }
            
            throw error;
        }
    }

    /**
     * Send request using XMLHttpRequest (fallback)
     * @param {Object} config - Request configuration
     * @returns {Promise<Object>}
     */
    async xhrRequest(config) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let timeoutId;

            // Setup timeout
            if (config.timeout > 0) {
                timeoutId = setTimeout(() => {
                    xhr.abort();
                    const timeoutError = new Error('Request timeout');
                    timeoutError.name = 'TimeoutError';
                    timeoutError.code = 'TIMEOUT_ERROR';
                    reject(timeoutError);
                }, config.timeout);
            }

            // Setup event handlers
            xhr.onload = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                // Create fetch-like response object
                const response = {
                    ok: xhr.status >= 200 && xhr.status < 300,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: this.parseXHRHeaders(xhr.getAllResponseHeaders()),
                    text: () => Promise.resolve(xhr.responseText),
                    json: () => {
                        try {
                            return Promise.resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            return Promise.reject(new Error('Invalid JSON response'));
                        }
                    }
                };
                
                resolve(response);
            };

            xhr.onerror = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                const networkError = new Error('Network error');
                networkError.name = 'NetworkError';
                networkError.code = 'NETWORK_ERROR';
                reject(networkError);
            };

            xhr.onabort = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                const abortError = new Error('Request aborted');
                abortError.name = 'AbortError';
                abortError.code = 'ABORT_ERROR';
                reject(abortError);
            };

            // Open and send request
            xhr.open(config.method, config.url, true);
            
            // Set headers
            Object.entries(config.headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });
            
            xhr.send(config.body);
        });
    }

    /**
     * Process and validate response
     * @param {Response|Object} response - Response object
     * @param {Object} config - Request configuration
     * @returns {Promise<Object>}
     */
    async processResponse(response, config) {
        // Check if response is ok
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.name = 'HTTPError';
            error.status = response.status;
            error.statusText = response.statusText;
            error.code = this.classifyHTTPError(response.status);
            throw error;
        }

        // Parse response based on content type
        const contentType = response.headers.get ? 
            response.headers.get('content-type') : 
            response.headers['content-type'];
            
        let data;
        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        } catch (parseError) {
            const error = new Error('Failed to parse response');
            error.name = 'ParseError';
            error.code = 'PARSE_ERROR';
            error.originalError = parseError;
            throw error;
        }

        // Validate response structure for WordPress AJAX
        if (config.validateWordPressResponse !== false) {
            this.validateWordPressResponse(data);
        }

        return {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            ok: response.ok
        };
    }

    /**
     * Validate WordPress AJAX response structure
     * @param {*} data - Response data
     */
    validateWordPressResponse(data) {
        // WordPress AJAX responses should be objects with success property
        if (typeof data === 'object' && data !== null) {
            if (typeof data.success !== 'boolean') {
                console.warn('WordPress AJAX response missing success property');
            }
            
            // Check for WordPress error structure
            if (data.success === false && !data.data) {
                console.warn('WordPress AJAX error response missing error data');
            }
        }
    }

    /**
     * Classify HTTP error by status code
     * @param {number} status - HTTP status code
     * @returns {string} Error code
     */
    classifyHTTPError(status) {
        if (status >= 400 && status < 500) {
            return 'CLIENT_ERROR';
        } else if (status >= 500) {
            return 'SERVER_ERROR';
        } else if (status === 0) {
            return 'NETWORK_ERROR';
        }
        return 'HTTP_ERROR';
    }

    /**
     * Enhance error with additional context
     * @param {Error} error - Original error
     * @param {Object} config - Request configuration
     * @returns {Error} Enhanced error
     */
    enhanceError(error, config) {
        // Add request context to error
        error.requestConfig = {
            url: config.url,
            method: config.method,
            timestamp: new Date().toISOString()
        };

        // Add user-friendly messages
        error.userMessage = this.getUserFriendlyMessage(error);
        
        // Determine if error is retryable
        error.retryable = this.isRetryableError(error);
        
        return error;
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly message
     */
    getUserFriendlyMessage(error) {
        switch (error.code) {
            case 'TIMEOUT_ERROR':
                return 'Request timed out. Please check your connection and try again.';
            case 'NETWORK_ERROR':
                return 'Network connection problem. Please check your internet connection.';
            case 'SERVER_ERROR':
                return 'Server error occurred. Please try again in a moment.';
            case 'CLIENT_ERROR':
                return 'Invalid request. Please refresh the page and try again.';
            case 'PARSE_ERROR':
                return 'Invalid response from server. Please try again.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Determine if error is retryable
     * @param {Error} error - Error object
     * @returns {boolean}
     */
    isRetryableError(error) {
        const retryableCodes = [
            'TIMEOUT_ERROR',
            'NETWORK_ERROR', 
            'SERVER_ERROR'
        ];
        
        return retryableCodes.includes(error.code) || 
               (error.status >= 500 && error.status < 600);
    }

    /**
     * Validate request configuration
     * @param {Object} config - Request configuration
     */
    validateConfig(config) {
        if (!config.url) {
            throw new Error('Request URL is required');
        }
        
        if (!config.method) {
            config.method = 'POST';
        }
        
        if (typeof config.timeout !== 'number' || config.timeout < 0) {
            config.timeout = this.options.timeout;
        }
    }

    /**
     * Prepare request configuration
     * @param {Object} config - Raw configuration
     * @returns {Object} Prepared configuration
     */
    prepareRequestConfig(config) {
        const prepared = {
            url: config.url,
            method: config.method.toUpperCase(),
            timeout: config.timeout || this.options.timeout,
            headers: { ...this.options.headers, ...config.headers },
            validateWordPressResponse: config.validateWordPressResponse
        };

        // Prepare body based on method and data
        if (prepared.method !== 'GET' && config.data) {
            if (config.data instanceof FormData) {
                prepared.body = config.data;
                // Remove content-type header for FormData (browser sets it)
                delete prepared.headers['Content-Type'];
            } else if (typeof config.data === 'object') {
                // Convert object to URL-encoded string for WordPress compatibility
                prepared.body = this.objectToFormData(config.data);
            } else {
                prepared.body = config.data;
            }
        }

        return prepared;
    }

    /**
     * Convert object to URL-encoded form data
     * @param {Object} obj - Object to convert
     * @returns {string} URL-encoded string
     */
    objectToFormData(obj) {
        const params = new URLSearchParams();
        
        Object.entries(obj).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                if (typeof value === 'object') {
                    params.append(key, JSON.stringify(value));
                } else {
                    params.append(key, value);
                }
            }
        });
        
        return params.toString();
    }

    /**
     * Parse XHR response headers into object
     * @param {string} headerStr - Raw header string
     * @returns {Object} Headers object
     */
    parseXHRHeaders(headerStr) {
        const headers = {};
        
        if (!headerStr) {
            return headers;
        }
        
        headerStr.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
                headers[parts[0].toLowerCase()] = parts[1];
            }
        });
        
        return headers;
    }

    /**
     * Update performance metrics
     * @param {boolean} success - Whether request was successful
     * @param {number} responseTime - Response time in milliseconds
     */
    updateMetrics(success, responseTime) {
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = 
            this.metrics.totalResponseTime / this.metrics.totalRequests;
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalRequests > 0 ? 
                (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 0,
            failureRate: this.metrics.totalRequests > 0 ? 
                (this.metrics.failedRequests / this.metrics.totalRequests) * 100 : 0
        };
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Configure transport options
     * @param {Object} options - Configuration options
     */
    configure(options) {
        this.options = { ...this.options, ...options };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HTTPTransport;
} else if (typeof window !== 'undefined') {
    window.LAS = window.LAS || {};
    window.LAS.HTTPTransport = HTTPTransport;
}