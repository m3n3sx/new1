/**
 * AJAX Manager Module
 * 
 * Handles AJAX requests with retry logic, error handling, CSRF protection,
 * request queuing, and performance monitoring
 * 
 * @since 2.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * AjaxManager Class
     */
    class AjaxManager {
        constructor(core) {
            this.core = core;
            this.maxRetries = 3;
            this.baseDelay = 1000; // Base delay for exponential backoff
            this.timeout = 30000; // 30 seconds timeout
            this.maxConcurrentRequests = 5;
            
            // Initialize advanced queue system
            this.requestQueue = this.initializeRequestQueue();
            
            // Initialize retry engine
            this.retryEngine = this.initializeRetryEngine();
            
            // Initialize HTTP transport layer
            this.httpTransport = this.initializeHttpTransport();
            
            // Enhanced performance monitoring
            this.metrics = {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                retriedRequests: 0,
                batchRequests: 0,
                averageResponseTime: 0,
                totalResponseTime: 0,
                slowestRequest: 0,
                fastestRequest: Infinity,
                requestsPerSecond: 0,
                memoryUsage: 0,
                errorsByType: {},
                requestsByAction: {},
                lastResetTime: Date.now()
            };
            
            // Enhanced request history with debugging information
            this.requestHistory = [];
            this.maxHistorySize = 200;
            this.debugMode = false;
            
            // Batch processing configuration
            this.batchConfig = {
                maxBatchSize: 10,
                batchTimeout: 1000, // 1 second
                enableBatching: true
            };
            
            // Pending batch requests
            this.pendingBatches = new Map();
            
            // User feedback system
            this.notificationCallbacks = new Set();
            
            // Performance monitoring intervals
            this.performanceInterval = null;
            this.metricsReportInterval = null;
            
            this.init();
        }

        /**
         * Initialize advanced request queue system
         * @returns {Object} RequestQueue instance
         */
        initializeRequestQueue() {
            const RequestQueueClass = window.LAS?.RequestQueue || window.RequestQueue;
            
            if (RequestQueueClass) {
                const queue = new RequestQueueClass({
                    maxConcurrent: this.maxConcurrentRequests,
                    maxQueueSize: 200,
                    enablePersistence: true,
                    deduplicationWindow: 5000
                });
                
                // Set execution callback to handle requests
                queue.setExecutionCallback(async (request) => {
                    return this.executeDirectRequest(request);
                });
                
                this.core.log('Advanced RequestQueue initialized');
                return queue;
            }
            
            // Fallback to simple array-based queue
            this.core.log('RequestQueue not available, using simple queue', 'warning');
            return {
                enqueue: (request, priority) => {
                    this.legacyRequestQueue = this.legacyRequestQueue || [];
                    this.legacyRequestQueue.push({ request, priority });
                    return request.id;
                },
                canProcessRequest: () => true,
                getMetrics: () => ({ currentQueueSize: 0 }),
                destroy: () => {}
            };
        }

        /**
         * Initialize retry engine
         * @returns {Object} RetryEngine instance
         */
        initializeRetryEngine() {
            const RetryEngineClass = window.LAS?.RetryEngine || window.RetryEngine;
            
            if (RetryEngineClass) {
                const engine = new RetryEngineClass({
                    maxRetries: this.maxRetries,
                    baseDelay: this.baseDelay,
                    maxDelay: 30000,
                    jitterPercent: 0.1,
                    circuitBreakerThreshold: 0.5,
                    circuitBreakerTimeout: 60000
                });
                
                this.core.log('RetryEngine initialized');
                return engine;
            }
            
            // Fallback to simple retry logic
            this.core.log('RetryEngine not available, using simple retry logic', 'warning');
            return {
                shouldRetry: (error, attempt) => attempt < this.maxRetries,
                calculateDelay: (attempt) => this.baseDelay * Math.pow(2, attempt),
                classifyError: (error) => ({ retryable: true }),
                updateCircuitBreaker: () => {},
                isCircuitOpen: () => false
            };
        }

        /**
         * Initialize HTTP transport layer
         * @returns {Object} HTTP transport instance
         */
        initializeHttpTransport() {
            // Try to use the new HTTPTransport class if available
            const HTTPTransportClass = window.LAS?.HTTPTransport || window.HTTPTransport;
            
            if (HTTPTransportClass) {
                return new HTTPTransportClass({
                    timeout: this.timeout,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
            }
            
            // Fallback to null - will use legacy methods
            this.core.log('HTTPTransport not available, using legacy HTTP methods', 'warning');
            return null;
        }

        /**
         * Initialize the AJAX manager
         */
        init() {
            this.setupRequestInterceptors();
            this.setupPerformanceMonitoring();
            this.setupBatchProcessing();
            this.enableDebugMode();
            
            this.core.log('Enhanced AjaxManager initialized', {
                maxRetries: this.maxRetries,
                timeout: this.timeout,
                maxConcurrentRequests: this.maxConcurrentRequests,
                batchingEnabled: this.batchConfig.enableBatching,
                queueType: this.requestQueue.constructor.name || 'Legacy',
                retryEngineAvailable: !!this.retryEngine.classifyError,
                httpTransportAvailable: !!this.httpTransport
            });
        }

        /**
         * Setup request interceptors for global error handling
         */
        setupRequestInterceptors() {
            // Monitor fetch requests if available
            if (window.fetch) {
                const originalFetch = window.fetch;
                window.fetch = (...args) => {
                    return originalFetch.apply(this, args).catch(error => {
                        this.handleGlobalError('fetch', error);
                        throw error;
                    });
                };
            }
        }

        /**
         * Start the request queue processor
         */
        startQueueProcessor() {
            setInterval(() => {
                this.processQueue();
            }, 100); // Process queue every 100ms
        }

        /**
         * Setup enhanced performance monitoring
         */
        setupPerformanceMonitoring() {
            // Performance data collection
            this.performanceInterval = setInterval(() => {
                this.collectPerformanceData();
            }, 5000); // Collect every 5 seconds
            
            // Metrics reporting
            this.metricsReportInterval = setInterval(() => {
                this.reportMetrics();
            }, 30000); // Report metrics every 30 seconds
        }

        /**
         * Setup batch processing system
         */
        setupBatchProcessing() {
            if (!this.batchConfig.enableBatching) {
                return;
            }
            
            // Process pending batches periodically
            setInterval(() => {
                this.processPendingBatches();
            }, this.batchConfig.batchTimeout);
        }

        /**
         * Enable debug mode for detailed logging
         */
        enableDebugMode() {
            this.debugMode = this.core.config?.debug || false;
            
            if (this.debugMode) {
                this.core.log('Debug mode enabled for AjaxManager');
                
                // Enhanced logging for debug mode
                this.originalConsoleLog = console.log;
                this.debugLogs = [];
            }
        }

        /**
         * Make an AJAX request with retry logic
         * @param {string} action - WordPress AJAX action
         * @param {Object} data - Request data
         * @param {Object} options - Request options
         * @returns {Promise}
         */
        async request(action, data = {}, options = {}) {
            const requestId = this.generateRequestId();
            const requestConfig = {
                id: requestId,
                action,
                data,
                options: {
                    method: 'POST',
                    timeout: this.timeout,
                    retries: this.maxRetries,
                    priority: 'normal',
                    enableBatching: this.batchConfig.enableBatching,
                    ...options
                },
                attempt: 0,
                startTime: Date.now(),
                metadata: {
                    userAgent: navigator.userAgent,
                    timestamp: Date.now(),
                    sessionId: this.getSessionId(),
                    debugInfo: this.debugMode ? this.collectDebugInfo() : null
                }
            };

            try {
                this.debugLog(`AJAX request initiated: ${action}`, { requestId, data, options });
                
                // Update request metrics
                this.updateRequestMetrics(action, 'initiated');
                
                // Check if request should be batched
                if (options.enableBatching && this.canBatchRequest(action)) {
                    return this.addToBatch(requestConfig);
                }
                
                // Use advanced queue system
                if (this.requestQueue.canProcessRequest && this.requestQueue.canProcessRequest()) {
                    return this.executeDirectRequest(requestConfig);
                } else {
                    return this.queueRequest(requestConfig);
                }
                
            } catch (error) {
                this.core.handleError(`AJAX request failed: ${action}`, error);
                this.updateRequestMetrics(action, 'failed');
                throw error;
            }
        }

        /**
         * Process multiple requests as a batch
         * @param {Array} requests - Array of request configurations
         * @param {Object} options - Batch options
         * @returns {Promise<Array>} Array of results
         */
        async batchRequest(requests, options = {}) {
            if (!Array.isArray(requests) || requests.length === 0) {
                throw new Error('Invalid batch requests array');
            }

            const batchId = this.generateRequestId();
            const batchConfig = {
                id: batchId,
                requests: requests.map(req => ({
                    ...req,
                    id: req.id || this.generateRequestId(),
                    batchId
                })),
                options: {
                    maxConcurrent: options.maxConcurrent || 3,
                    failFast: options.failFast || false,
                    timeout: options.timeout || this.timeout * 2,
                    ...options
                },
                startTime: Date.now()
            };

            try {
                this.debugLog(`Batch request initiated: ${batchId}`, { 
                    requestCount: requests.length, 
                    options 
                });
                
                this.metrics.batchRequests++;
                
                return await this.executeBatchRequest(batchConfig);
                
            } catch (error) {
                this.core.handleError(`Batch request failed: ${batchId}`, error);
                throw error;
            }
        }

        /**
         * Queue a request for later execution using advanced queue system
         * @param {Object} requestConfig - Request configuration
         * @returns {Promise}
         */
        queueRequest(requestConfig) {
            return new Promise((resolve, reject) => {
                requestConfig.resolve = resolve;
                requestConfig.reject = reject;
                
                try {
                    // Use advanced queue system if available
                    if (this.requestQueue.enqueue) {
                        const priority = requestConfig.options.priority || 'normal';
                        this.requestQueue.enqueue(requestConfig, priority);
                        
                        this.debugLog(`Request queued with advanced system: ${requestConfig.action}`, {
                            priority,
                            queueMetrics: this.requestQueue.getMetrics()
                        });
                    } else {
                        // Fallback to legacy queue
                        const priority = requestConfig.options.priority;
                        const insertIndex = this.findInsertIndex(priority);
                        this.legacyRequestQueue.splice(insertIndex, 0, requestConfig);
                        
                        this.debugLog(`Request queued with legacy system: ${requestConfig.action}`, {
                            queueLength: this.legacyRequestQueue.length,
                            priority
                        });
                    }
                } catch (error) {
                    this.core.handleError('Failed to queue request', error);
                    reject(error);
                }
            });
        }

        /**
         * Find insertion index based on priority
         * @param {string} priority - Request priority
         * @returns {number}
         */
        findInsertIndex(priority) {
            const priorities = { high: 0, normal: 1, low: 2 };
            const requestPriority = priorities[priority] || 1;
            
            for (let i = 0; i < this.requestQueue.length; i++) {
                const queuedPriority = priorities[this.requestQueue[i].options.priority] || 1;
                if (requestPriority < queuedPriority) {
                    return i;
                }
            }
            
            return this.requestQueue.length;
        }

        /**
         * Process the request queue
         */
        processQueue() {
            while (this.requestQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
                const requestConfig = this.requestQueue.shift();
                this.executeRequest(requestConfig)
                    .then(requestConfig.resolve)
                    .catch(requestConfig.reject);
            }
        }

        /**
         * Execute a request directly (used by queue system)
         * @param {Object} requestConfig - Request configuration
         * @returns {Promise}
         */
        async executeDirectRequest(requestConfig) {
            const { id, action, data, options } = requestConfig;
            
            this.metrics.totalRequests++;
            this.updateRequestMetrics(action, 'started');
            
            try {
                const response = await this.performRequest(requestConfig);
                
                // Success
                this.metrics.successfulRequests++;
                this.updateResponseTime(requestConfig);
                this.addToHistory(requestConfig, response, 'success');
                this.updateRequestMetrics(action, 'success');
                
                // Update retry engine circuit breaker
                if (this.retryEngine.updateCircuitBreaker) {
                    this.retryEngine.updateCircuitBreaker(action, true);
                }
                
                this.core.emit('ajax:success', { action, response, requestId: id });
                return response;
                
            } catch (error) {
                // Use retry engine for retry decision
                const shouldRetry = this.retryEngine.shouldRetry(error, requestConfig.attempt, {
                    action,
                    maxRetries: options.retries
                });
                
                if (shouldRetry) {
                    return this.retryRequest(requestConfig, error);
                } else {
                    // Final failure
                    this.metrics.failedRequests++;
                    this.addToHistory(requestConfig, error, 'failed');
                    this.updateRequestMetrics(action, 'failed');
                    
                    // Update retry engine circuit breaker
                    if (this.retryEngine.updateCircuitBreaker) {
                        this.retryEngine.updateCircuitBreaker(action, false);
                    }
                    
                    this.core.emit('ajax:error', { action, error, requestId: id });
                    this.showUserNotification('error', `Request failed: ${action}`);
                    
                    throw error;
                }
            }
        }

        /**
         * Legacy execute request method for backward compatibility
         * @param {Object} requestConfig - Request configuration
         * @returns {Promise}
         */
        async executeRequest(requestConfig) {
            return this.executeDirectRequest(requestConfig);
        }

        /**
         * Perform the actual HTTP request
         * @param {Object} requestConfig - Request configuration
         * @returns {Promise}
         */
        async performRequest(requestConfig) {
            const { action, data, options } = requestConfig;
            
            // Prepare request data
            const requestData = this.prepareRequestData(action, data);
            
            try {
                let response;
                
                if (this.httpTransport) {
                    // Use new HTTP transport layer
                    response = await this.httpTransport.sendRequest({
                        url: this.getAjaxUrl(),
                        method: 'POST',
                        data: requestData,
                        timeout: options.timeout || this.timeout,
                        validateWordPressResponse: true
                    });
                    
                    // Extract data from transport response
                    return this.processTransportResponse(response, requestConfig);
                    
                } else {
                    // Fallback to legacy methods
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), options.timeout);
                    
                    try {
                        if (window.fetch && options.useFetch !== false) {
                            response = await this.fetchRequest(requestData, controller.signal);
                        } else {
                            response = await this.xhrRequest(requestData, controller.signal);
                        }
                        
                        clearTimeout(timeoutId);
                        return this.processResponse(response, requestConfig);
                        
                    } catch (error) {
                        clearTimeout(timeoutId);
                        
                        if (error.name === 'AbortError') {
                            throw new Error(`Request timeout: ${action}`);
                        }
                        
                        throw error;
                    }
                }
                
            } catch (error) {
                // Handle transport layer errors
                if (error.code && error.userMessage) {
                    // Enhanced error from HTTP transport
                    this.showUserNotification('error', error.userMessage);
                }
                
                throw error;
            }
        }

        /**
         * Process response from HTTP transport layer
         * @param {Object} transportResponse - Response from HTTP transport
         * @param {Object} requestConfig - Request configuration
         * @returns {*} Processed response data
         */
        processTransportResponse(transportResponse, requestConfig) {
            try {
                const responseData = transportResponse.data;
                
                // Handle WordPress AJAX response format
                if (typeof responseData === 'object' && responseData !== null) {
                    if (responseData.success === false) {
                        const errorMessage = responseData.data?.message || 
                                           responseData.data || 
                                           'Request failed';
                        throw new Error(errorMessage);
                    }
                    
                    return responseData.data || responseData;
                }
                
                return responseData;
                
            } catch (error) {
                this.core.handleError('Failed to process transport response', error, {
                    action: requestConfig.action,
                    status: transportResponse.status
                });
                throw error;
            }
        }

        /**
         * Prepare request data with CSRF protection
         * @param {string} action - WordPress action
         * @param {Object} data - Request data
         * @returns {Object}
         */
        prepareRequestData(action, data) {
            const requestData = {
                action: `las_${action}`,
                nonce: this.getNonce(),
                ...data
            };
            
            // Validate nonce
            if (!requestData.nonce) {
                throw new Error('CSRF token (nonce) is missing');
            }
            
            return requestData;
        }

        /**
         * Get CSRF nonce
         * @returns {string}
         */
        getNonce() {
            // Try multiple sources for nonce
            return this.core.config.nonce || 
                   window.lasAjax?.nonce || 
                   document.querySelector('#las-nonce')?.value ||
                   document.querySelector('meta[name="las-nonce"]')?.content;
        }

        /**
         * Make request using fetch API
         * @param {Object} data - Request data
         * @param {AbortSignal} signal - Abort signal
         * @returns {Promise}
         */
        async fetchRequest(data, signal) {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
                }
            });
            
            const response = await fetch(this.getAjaxUrl(), {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        }

        /**
         * Make request using XMLHttpRequest
         * @param {Object} data - Request data
         * @param {AbortSignal} signal - Abort signal
         * @returns {Promise}
         */
        xhrRequest(data, signal) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                // Setup abort handling
                if (signal) {
                    signal.addEventListener('abort', () => {
                        xhr.abort();
                        reject(new Error('Request aborted'));
                    });
                }
                
                xhr.open('POST', this.getAjaxUrl(), true);
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve({
                            ok: true,
                            status: xhr.status,
                            statusText: xhr.statusText,
                            text: () => Promise.resolve(xhr.responseText),
                            json: () => Promise.resolve(JSON.parse(xhr.responseText))
                        });
                    } else {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                };
                
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.ontimeout = () => reject(new Error('Request timeout'));
                
                // Prepare form data
                const formData = new FormData();
                Object.entries(data).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
                    }
                });
                
                xhr.send(formData);
            });
        }

        /**
         * Process response data
         * @param {Response} response - Fetch response or XHR response
         * @param {Object} requestConfig - Request configuration
         * @returns {Promise}
         */
        async processResponse(response, requestConfig) {
            let responseData;
            
            try {
                const text = await response.text();
                
                // Try to parse as JSON
                try {
                    responseData = JSON.parse(text);
                } catch (parseError) {
                    // If not JSON, return as text
                    responseData = { data: text, success: true };
                }
                
                // Handle WordPress AJAX response format
                if (responseData.success === false) {
                    throw new Error(responseData.data?.message || 'Request failed');
                }
                
                return responseData.data || responseData;
                
            } catch (error) {
                this.core.handleError('Failed to process response', error, {
                    action: requestConfig.action,
                    status: response.status
                });
                throw error;
            }
        }

        /**
         * Retry a failed request with enhanced retry logic
         * @param {Object} requestConfig - Request configuration
         * @param {Error} error - Previous error
         * @returns {Promise}
         */
        async retryRequest(requestConfig, error) {
            requestConfig.attempt++;
            this.metrics.retriedRequests++;
            this.updateRequestMetrics(requestConfig.action, 'retried');
            
            // Use retry engine for delay calculation
            const errorType = this.retryEngine.classifyError ? 
                this.retryEngine.classifyError(error) : { retryable: true };
            
            const delay = this.retryEngine.calculateDelay ? 
                this.retryEngine.calculateDelay(requestConfig.attempt, this.baseDelay, errorType) :
                this.calculateBackoffDelay(requestConfig.attempt);
            
            this.debugLog(`Retrying request: ${requestConfig.action}`, {
                attempt: requestConfig.attempt,
                maxAttempts: requestConfig.options.retries,
                delay,
                errorType: errorType.code,
                error: error.message
            });
            
            this.showUserNotification('warning', 
                `Retrying request... (${requestConfig.attempt}/${requestConfig.options.retries})`);
            
            // Add retry information to request metadata
            requestConfig.metadata = requestConfig.metadata || {};
            requestConfig.metadata.retryHistory = requestConfig.metadata.retryHistory || [];
            requestConfig.metadata.retryHistory.push({
                attempt: requestConfig.attempt,
                error: error.message,
                errorType: errorType.code,
                delay,
                timestamp: Date.now()
            });
            
            // Wait for backoff delay
            await this.delay(delay);
            
            // Retry the request
            return this.executeDirectRequest(requestConfig);
        }

        /**
         * Calculate exponential backoff delay (legacy method)
         * @param {number} attempt - Attempt number
         * @returns {number} Delay in milliseconds
         */
        calculateBackoffDelay(attempt) {
            const jitter = Math.random() * 0.1; // Add 10% jitter
            return Math.min(this.baseDelay * Math.pow(2, attempt - 1) * (1 + jitter), 30000);
        }

        /**
         * Process legacy queue (fallback when advanced queue is not available)
         */
        processLegacyQueue() {
            if (!this.legacyRequestQueue || this.legacyRequestQueue.length === 0) {
                return;
            }
            
            while (this.legacyRequestQueue.length > 0 && 
                   this.activeRequests.size < this.maxConcurrentRequests) {
                const queueItem = this.legacyRequestQueue.shift();
                this.executeDirectRequest(queueItem.request)
                    .then(queueItem.request.resolve)
                    .catch(queueItem.request.reject);
            }
        }

        /**
         * Execute batch request with concurrent processing
         * @param {Object} batchConfig - Batch configuration
         * @returns {Promise<Array>} Array of results
         */
        async executeBatchRequest(batchConfig) {
            const { requests, options } = batchConfig;
            const results = [];
            const errors = [];
            
            // Process requests in chunks based on maxConcurrent
            const chunks = this.chunkArray(requests, options.maxConcurrent);
            
            for (const chunk of chunks) {
                const chunkPromises = chunk.map(async (request, index) => {
                    try {
                        const result = await this.executeDirectRequest(request);
                        return { index: request.originalIndex || index, result, success: true };
                    } catch (error) {
                        const errorResult = { 
                            index: request.originalIndex || index, 
                            error, 
                            success: false 
                        };
                        
                        if (options.failFast) {
                            throw errorResult;
                        }
                        
                        return errorResult;
                    }
                });
                
                try {
                    const chunkResults = await Promise.all(chunkPromises);
                    
                    // Process chunk results
                    chunkResults.forEach(result => {
                        if (result.success) {
                            results[result.index] = result.result;
                        } else {
                            errors[result.index] = result.error;
                            results[result.index] = null;
                        }
                    });
                    
                } catch (error) {
                    // Fail fast mode - stop processing
                    if (options.failFast) {
                        throw error;
                    }
                }
            }
            
            // Add batch completion to history
            this.addBatchToHistory(batchConfig, results, errors);
            
            // Return results with error information
            return {
                results,
                errors,
                hasErrors: errors.some(e => e !== undefined),
                successCount: results.filter(r => r !== null).length,
                errorCount: errors.filter(e => e !== undefined).length
            };
        }

        /**
         * Check if request can be batched
         * @param {string} action - Request action
         * @returns {boolean}
         */
        canBatchRequest(action) {
            const batchableActions = [
                'save_settings',
                'load_settings',
                'get_preview_css'
            ];
            
            return batchableActions.includes(action);
        }

        /**
         * Add request to pending batch
         * @param {Object} requestConfig - Request configuration
         * @returns {Promise}
         */
        addToBatch(requestConfig) {
            const { action } = requestConfig;
            
            if (!this.pendingBatches.has(action)) {
                this.pendingBatches.set(action, {
                    requests: [],
                    promises: [],
                    timeout: null
                });
            }
            
            const batch = this.pendingBatches.get(action);
            
            return new Promise((resolve, reject) => {
                batch.requests.push(requestConfig);
                batch.promises.push({ resolve, reject });
                
                // Set timeout for batch processing
                if (batch.timeout) {
                    clearTimeout(batch.timeout);
                }
                
                batch.timeout = setTimeout(() => {
                    this.processBatch(action);
                }, this.batchConfig.batchTimeout);
                
                // Process immediately if batch is full
                if (batch.requests.length >= this.batchConfig.maxBatchSize) {
                    clearTimeout(batch.timeout);
                    this.processBatch(action);
                }
            });
        }

        /**
         * Process a specific batch
         * @param {string} action - Action to process
         */
        async processBatch(action) {
            const batch = this.pendingBatches.get(action);
            if (!batch || batch.requests.length === 0) {
                return;
            }
            
            this.pendingBatches.delete(action);
            
            try {
                const batchResult = await this.executeBatchRequest({
                    id: this.generateRequestId(),
                    requests: batch.requests,
                    options: { maxConcurrent: 3, failFast: false }
                });
                
                // Resolve individual promises
                batch.promises.forEach((promise, index) => {
                    if (batchResult.results[index] !== null) {
                        promise.resolve(batchResult.results[index]);
                    } else {
                        promise.reject(batchResult.errors[index] || new Error('Batch processing failed'));
                    }
                });
                
            } catch (error) {
                // Reject all promises
                batch.promises.forEach(promise => {
                    promise.reject(error);
                });
            }
        }

        /**
         * Process all pending batches
         */
        processPendingBatches() {
            const actions = Array.from(this.pendingBatches.keys());
            actions.forEach(action => {
                const batch = this.pendingBatches.get(action);
                if (batch && batch.requests.length > 0) {
                    // Process if batch has been waiting for more than timeout
                    const oldestRequest = Math.min(...batch.requests.map(r => r.startTime));
                    if (Date.now() - oldestRequest > this.batchConfig.batchTimeout) {
                        this.processBatch(action);
                    }
                }
            });
        }

        /**
         * Determine if request should be retried (legacy method for compatibility)
         * @param {Error} error - Error object
         * @returns {boolean}
         */
        shouldRetry(error) {
            // Use retry engine if available
            if (this.retryEngine.classifyError) {
                const errorType = this.retryEngine.classifyError(error);
                return errorType.retryable;
            }
            
            // Fallback to legacy logic
            if (error.retryable !== undefined) {
                return error.retryable;
            }
            
            if (error.code) {
                const retryableCodes = [
                    'TIMEOUT_ERROR',
                    'NETWORK_ERROR',
                    'SERVER_ERROR'
                ];
                return retryableCodes.includes(error.code);
            }
            
            // Don't retry client errors (4xx) except for specific cases
            if (error.message.includes('HTTP 4')) {
                const retryable4xx = ['408', '429'];
                return retryable4xx.some(code => error.message.includes(code));
            }
            
            // Retry server errors (5xx) and network errors
            if (error.message.includes('HTTP 5') || 
                error.message.includes('Network error') ||
                error.message.includes('timeout')) {
                return true;
            }
            
            // Don't retry CSRF errors
            if (error.message.includes('nonce') || error.message.includes('CSRF')) {
                return false;
            }
            
            return true;
        }

        /**
         * Get WordPress AJAX URL
         * @returns {string}
         */
        getAjaxUrl() {
            return this.core.config.ajaxUrl || 
                   window.ajaxurl || 
                   '/wp-admin/admin-ajax.php';
        }

        /**
         * Generate unique request ID
         * @returns {string}
         */
        generateRequestId() {
            return 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }

        /**
         * Add request to enhanced history with debugging information
         * @param {Object} requestConfig - Request configuration
         * @param {*} result - Response or error
         * @param {string} status - Request status
         */
        addToHistory(requestConfig, result, status) {
            const duration = Date.now() - requestConfig.startTime;
            
            const historyEntry = {
                id: requestConfig.id,
                action: requestConfig.action,
                status,
                duration,
                attempts: requestConfig.attempt + 1,
                timestamp: new Date().toISOString(),
                result: status === 'success' ? 'Success' : (result.message || 'Unknown error'),
                
                // Enhanced debugging information
                debugInfo: {
                    requestSize: this.calculateRequestSize(requestConfig.data),
                    responseSize: status === 'success' ? this.calculateResponseSize(result) : 0,
                    userAgent: requestConfig.metadata?.userAgent,
                    sessionId: requestConfig.metadata?.sessionId,
                    retryAttempts: requestConfig.attempt,
                    errorType: status === 'failed' && this.retryEngine.classifyError ? 
                        this.retryEngine.classifyError(result).code : null,
                    circuitBreakerState: this.retryEngine.getCircuitBreakerStatus ? 
                        this.retryEngine.getCircuitBreakerStatus(requestConfig.action).state : null,
                    queueWaitTime: requestConfig.queueStartTime ? 
                        requestConfig.startTime - requestConfig.queueStartTime : 0,
                    memoryUsage: this.getMemoryUsage(),
                    networkInfo: this.getNetworkInfo()
                },
                
                // Performance metrics
                performance: {
                    duration,
                    isSlowRequest: duration > 5000,
                    isFastRequest: duration < 500,
                    throughput: this.calculateThroughput()
                }
            };
            
            this.requestHistory.unshift(historyEntry);
            
            // Keep only last maxHistorySize requests
            if (this.requestHistory.length > this.maxHistorySize) {
                this.requestHistory = this.requestHistory.slice(0, this.maxHistorySize);
            }
            
            // Log detailed information in debug mode
            if (this.debugMode) {
                this.debugLog(`Request completed: ${requestConfig.action}`, historyEntry);
            }
        }

        /**
         * Add batch request to history
         * @param {Object} batchConfig - Batch configuration
         * @param {Array} results - Batch results
         * @param {Array} errors - Batch errors
         */
        addBatchToHistory(batchConfig, results, errors) {
            const duration = Date.now() - batchConfig.startTime;
            const successCount = results.filter(r => r !== null).length;
            const errorCount = errors.filter(e => e !== undefined).length;
            
            const historyEntry = {
                id: batchConfig.id,
                action: 'batch_request',
                status: errorCount === 0 ? 'success' : 'partial_success',
                duration,
                attempts: 1,
                timestamp: new Date().toISOString(),
                result: `Batch: ${successCount} success, ${errorCount} errors`,
                
                debugInfo: {
                    batchSize: batchConfig.requests.length,
                    successCount,
                    errorCount,
                    requestActions: batchConfig.requests.map(r => r.action),
                    memoryUsage: this.getMemoryUsage()
                },
                
                performance: {
                    duration,
                    averageRequestTime: duration / batchConfig.requests.length,
                    throughput: batchConfig.requests.length / (duration / 1000)
                }
            };
            
            this.requestHistory.unshift(historyEntry);
            
            if (this.requestHistory.length > this.maxHistorySize) {
                this.requestHistory = this.requestHistory.slice(0, this.maxHistorySize);
            }
        }

        /**
         * Update enhanced response time metrics
         * @param {Object} requestConfig - Request configuration
         */
        updateResponseTime(requestConfig) {
            const responseTime = Date.now() - requestConfig.startTime;
            
            this.metrics.totalResponseTime += responseTime;
            this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.successfulRequests;
            
            // Track fastest and slowest requests
            if (responseTime > this.metrics.slowestRequest) {
                this.metrics.slowestRequest = responseTime;
            }
            
            if (responseTime < this.metrics.fastestRequest) {
                this.metrics.fastestRequest = responseTime;
            }
            
            // Calculate requests per second
            const timeWindow = Date.now() - this.metrics.lastResetTime;
            if (timeWindow > 0) {
                this.metrics.requestsPerSecond = (this.metrics.totalRequests / timeWindow) * 1000;
            }
        }

        /**
         * Update request metrics by action and status
         * @param {string} action - Request action
         * @param {string} status - Request status
         */
        updateRequestMetrics(action, status) {
            // Track requests by action
            if (!this.metrics.requestsByAction[action]) {
                this.metrics.requestsByAction[action] = {
                    total: 0,
                    success: 0,
                    failed: 0,
                    retried: 0
                };
            }
            
            const actionMetrics = this.metrics.requestsByAction[action];
            
            switch (status) {
                case 'initiated':
                case 'started':
                    actionMetrics.total++;
                    break;
                case 'success':
                    actionMetrics.success++;
                    break;
                case 'failed':
                    actionMetrics.failed++;
                    break;
                case 'retried':
                    actionMetrics.retried++;
                    break;
            }
        }

        /**
         * Collect performance data
         */
        collectPerformanceData() {
            // Update memory usage
            this.metrics.memoryUsage = this.getMemoryUsage();
            
            // Collect queue metrics if available
            if (this.requestQueue.getMetrics) {
                const queueMetrics = this.requestQueue.getMetrics();
                this.metrics.queueMetrics = queueMetrics;
            }
            
            // Collect retry engine metrics if available
            if (this.retryEngine.getRetryStatistics) {
                const retryStats = this.retryEngine.getRetryStatistics();
                this.metrics.retryEngineStats = retryStats;
            }
            
            // Collect HTTP transport metrics if available
            if (this.httpTransport && this.httpTransport.getMetrics) {
                const transportMetrics = this.httpTransport.getMetrics();
                this.metrics.transportMetrics = transportMetrics;
            }
        }

        /**
         * Show user notification
         * @param {string} type - Notification type (success, error, warning, info)
         * @param {string} message - Notification message
         */
        showUserNotification(type, message) {
            const notification = {
                type,
                message,
                timestamp: Date.now()
            };
            
            // Emit event for UI components to handle
            this.core.emit('ajax:notification', notification);
            
            // Call registered notification callbacks
            this.notificationCallbacks.forEach(callback => {
                try {
                    callback(notification);
                } catch (error) {
                    this.core.handleError('Notification callback error', error);
                }
            });
        }

        /**
         * Register notification callback
         * @param {Function} callback - Notification callback
         */
        onNotification(callback) {
            this.notificationCallbacks.add(callback);
        }

        /**
         * Unregister notification callback
         * @param {Function} callback - Notification callback
         */
        offNotification(callback) {
            this.notificationCallbacks.delete(callback);
        }

        /**
         * Handle global errors
         * @param {string} source - Error source
         * @param {Error} error - Error object
         */
        handleGlobalError(source, error) {
            this.core.handleError(`Global ${source} error`, error);
            this.showUserNotification('error', 'A network error occurred. Please try again.');
        }

        /**
         * Utility delay function
         * @param {number} ms - Milliseconds to delay
         * @returns {Promise}
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Report performance metrics
         */
        reportMetrics() {
            const metrics = this.getMetrics();
            this.core.emit('ajax:metrics', metrics);
            
            if (this.core.config.debug) {
                this.core.log('AJAX performance metrics', metrics);
            }
        }

        /**
         * Get enhanced metrics with detailed performance data
         * @returns {Object}
         */
        getMetrics() {
            const activeRequestsCount = this.requestQueue.getMetrics ? 
                this.requestQueue.getMetrics().activeRequests : 0;
            const queuedRequestsCount = this.requestQueue.getMetrics ? 
                this.requestQueue.getMetrics().currentQueueSize : 0;
                
            const baseMetrics = {
                ...this.metrics,
                activeRequests: activeRequestsCount,
                queuedRequests: queuedRequestsCount,
                successRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
                retryRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.retriedRequests / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
                batchRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.batchRequests / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
                
                // Performance indicators
                performance: {
                    averageResponseTime: this.metrics.averageResponseTime,
                    slowestRequest: this.metrics.slowestRequest,
                    fastestRequest: this.metrics.fastestRequest === Infinity ? 0 : this.metrics.fastestRequest,
                    requestsPerSecond: this.metrics.requestsPerSecond,
                    memoryUsage: this.metrics.memoryUsage,
                    uptime: Date.now() - this.metrics.lastResetTime
                },
                
                // Error breakdown
                errorBreakdown: this.getErrorBreakdown(),
                
                // Request breakdown by action
                requestsByAction: { ...this.metrics.requestsByAction }
            };
            
            // Include queue metrics if available
            if (this.metrics.queueMetrics) {
                baseMetrics.queue = this.metrics.queueMetrics;
            }
            
            // Include retry engine metrics if available
            if (this.metrics.retryEngineStats) {
                baseMetrics.retryEngine = this.metrics.retryEngineStats;
            }
            
            // Include HTTP transport metrics if available
            if (this.httpTransport && typeof this.httpTransport.getMetrics === 'function') {
                const transportMetrics = this.httpTransport.getMetrics();
                baseMetrics.transport = {
                    ...transportMetrics,
                    transportType: this.httpTransport.supportsFetch ? 'fetch' : 'xhr'
                };
            } else if (this.metrics.transportMetrics) {
                baseMetrics.transport = this.metrics.transportMetrics;
            }
            
            return baseMetrics;
        }

        /**
         * Get error breakdown by type
         * @returns {Object}
         */
        getErrorBreakdown() {
            const breakdown = {};
            
            this.requestHistory.forEach(entry => {
                if (entry.status === 'failed' && entry.debugInfo?.errorType) {
                    const errorType = entry.debugInfo.errorType;
                    breakdown[errorType] = (breakdown[errorType] || 0) + 1;
                }
            });
            
            return breakdown;
        }

        /**
         * Get enhanced request history with filtering and debugging info
         * @param {Object} options - History options
         * @returns {Array}
         */
        getHistory(options = {}) {
            const {
                limit = 50,
                action = null,
                status = null,
                includeDebugInfo = false,
                startTime = null,
                endTime = null
            } = options;
            
            let history = [...this.requestHistory];
            
            // Apply filters
            if (action) {
                history = history.filter(entry => entry.action === action);
            }
            
            if (status) {
                history = history.filter(entry => entry.status === status);
            }
            
            if (startTime) {
                history = history.filter(entry => new Date(entry.timestamp) >= new Date(startTime));
            }
            
            if (endTime) {
                history = history.filter(entry => new Date(entry.timestamp) <= new Date(endTime));
            }
            
            // Limit results
            history = history.slice(0, limit);
            
            // Include or exclude debug info
            if (!includeDebugInfo) {
                history = history.map(entry => {
                    const { debugInfo, ...entryWithoutDebug } = entry;
                    return entryWithoutDebug;
                });
            }
            
            return history;
        }

        /**
         * Get detailed debugging information
         * @returns {Object}
         */
        getDebugInfo() {
            return {
                // System information
                system: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    cookieEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine
                },
                
                // Performance information
                performance: this.getMetrics().performance,
                
                // Queue status
                queueStatus: this.requestQueue.getStatus ? this.requestQueue.getStatus() : null,
                
                // Circuit breaker status
                circuitBreakers: this.retryEngine.getAllCircuitBreakerStatuses ? 
                    this.retryEngine.getAllCircuitBreakerStatuses() : null,
                
                // Recent errors
                recentErrors: this.getHistory({ 
                    limit: 10, 
                    status: 'failed', 
                    includeDebugInfo: true 
                }),
                
                // Configuration
                configuration: {
                    maxRetries: this.maxRetries,
                    timeout: this.timeout,
                    maxConcurrentRequests: this.maxConcurrentRequests,
                    batchConfig: this.batchConfig,
                    debugMode: this.debugMode
                },
                
                // Debug logs (if available)
                debugLogs: this.debugLogs ? this.debugLogs.slice(-50) : null
            };
        }

        /**
         * Clear request history
         */
        clearHistory() {
            this.requestHistory = [];
            this.core.log('Request history cleared');
        }

        /**
         * Cancel all pending requests
         */
        cancelAllRequests() {
            // Clear queue
            this.requestQueue.forEach(request => {
                if (request.reject) {
                    request.reject(new Error('Request cancelled'));
                }
            });
            this.requestQueue = [];
            
            // Cancel active requests would require storing abort controllers
            // This is a simplified implementation
            this.activeRequests.clear();
            
            this.core.log('All requests cancelled');
        }

        /**
         * Set enhanced configuration options
         * @param {Object} config - Configuration options
         */
        configure(config) {
            if (config.maxRetries !== undefined) {
                this.maxRetries = Math.max(0, Math.min(10, config.maxRetries));
            }
            
            if (config.timeout !== undefined) {
                this.timeout = Math.max(1000, Math.min(120000, config.timeout));
                
                // Update HTTP transport timeout if available
                if (this.httpTransport && this.httpTransport.configure) {
                    this.httpTransport.configure({ timeout: this.timeout });
                }
            }
            
            if (config.maxConcurrentRequests !== undefined) {
                this.maxConcurrentRequests = Math.max(1, Math.min(20, config.maxConcurrentRequests));
                
                // Update queue configuration if available
                if (this.requestQueue.configure) {
                    this.requestQueue.configure({ maxConcurrent: this.maxConcurrentRequests });
                }
            }
            
            if (config.baseDelay !== undefined) {
                this.baseDelay = Math.max(100, Math.min(10000, config.baseDelay));
            }
            
            // Configure batch processing
            if (config.batchConfig) {
                this.batchConfig = { ...this.batchConfig, ...config.batchConfig };
            }
            
            // Configure debug mode
            if (config.debugMode !== undefined) {
                this.debugMode = config.debugMode;
                if (this.debugMode && !this.debugLogs) {
                    this.debugLogs = [];
                }
            }
            
            // Configure history size
            if (config.maxHistorySize !== undefined) {
                this.maxHistorySize = Math.max(50, Math.min(1000, config.maxHistorySize));
            }
            
            // Configure retry engine if available
            if (this.retryEngine.configure && config.retryEngine) {
                this.retryEngine.configure(config.retryEngine);
            }
            
            // Configure HTTP transport if available
            if (this.httpTransport && config.httpTransport) {
                this.httpTransport.configure(config.httpTransport);
            }
            
            // Configure request queue if available
            if (this.requestQueue.configure && config.requestQueue) {
                this.requestQueue.configure(config.requestQueue);
            }
            
            this.debugLog('Enhanced AjaxManager configuration updated', {
                maxRetries: this.maxRetries,
                timeout: this.timeout,
                maxConcurrentRequests: this.maxConcurrentRequests,
                baseDelay: this.baseDelay,
                batchConfig: this.batchConfig,
                debugMode: this.debugMode,
                maxHistorySize: this.maxHistorySize,
                httpTransportAvailable: !!this.httpTransport,
                retryEngineAvailable: !!this.retryEngine.classifyError,
                queueSystemAvailable: !!this.requestQueue.enqueue
            });
        }

        /**
         * Utility methods for debugging and performance monitoring
         */
        
        /**
         * Debug logging method
         * @param {string} message - Log message
         * @param {*} data - Additional data
         */
        debugLog(message, data = null) {
            if (!this.debugMode) {
                return;
            }
            
            const logEntry = {
                timestamp: new Date().toISOString(),
                message,
                data
            };
            
            if (this.debugLogs) {
                this.debugLogs.push(logEntry);
                
                // Keep only last 1000 debug logs
                if (this.debugLogs.length > 1000) {
                    this.debugLogs = this.debugLogs.slice(-1000);
                }
            }
            
            console.log(`[AjaxManager Debug] ${message}`, data);
        }

        /**
         * Calculate request size in bytes
         * @param {*} data - Request data
         * @returns {number}
         */
        calculateRequestSize(data) {
            try {
                return new Blob([JSON.stringify(data)]).size;
            } catch (error) {
                return 0;
            }
        }

        /**
         * Calculate response size in bytes
         * @param {*} response - Response data
         * @returns {number}
         */
        calculateResponseSize(response) {
            try {
                return new Blob([JSON.stringify(response)]).size;
            } catch (error) {
                return 0;
            }
        }

        /**
         * Get memory usage information
         * @returns {Object}
         */
        getMemoryUsage() {
            if (performance.memory) {
                return {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }
            return { used: 0, total: 0, limit: 0 };
        }

        /**
         * Get network information
         * @returns {Object}
         */
        getNetworkInfo() {
            if (navigator.connection) {
                return {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt,
                    saveData: navigator.connection.saveData
                };
            }
            return null;
        }

        /**
         * Calculate current throughput
         * @returns {number}
         */
        calculateThroughput() {
            const timeWindow = Date.now() - this.metrics.lastResetTime;
            return timeWindow > 0 ? (this.metrics.totalRequests / timeWindow) * 1000 : 0;
        }

        /**
         * Get session ID for tracking
         * @returns {string}
         */
        getSessionId() {
            if (!this.sessionId) {
                this.sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            }
            return this.sessionId;
        }

        /**
         * Collect debug information for requests
         * @returns {Object}
         */
        collectDebugInfo() {
            return {
                memoryUsage: this.getMemoryUsage(),
                networkInfo: this.getNetworkInfo(),
                queueStatus: this.requestQueue.getStatus ? this.requestQueue.getStatus() : null,
                activeRequests: this.requestQueue.getMetrics ? 
                    this.requestQueue.getMetrics().activeRequests : 0
            };
        }

        /**
         * Chunk array into smaller arrays
         * @param {Array} array - Array to chunk
         * @param {number} size - Chunk size
         * @returns {Array}
         */
        chunkArray(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }

        /**
         * Reset performance metrics
         */
        resetMetrics() {
            this.metrics = {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                retriedRequests: 0,
                batchRequests: 0,
                averageResponseTime: 0,
                totalResponseTime: 0,
                slowestRequest: 0,
                fastestRequest: Infinity,
                requestsPerSecond: 0,
                memoryUsage: 0,
                errorsByType: {},
                requestsByAction: {},
                lastResetTime: Date.now()
            };
            
            this.debugLog('Performance metrics reset');
        }

        /**
         * Enhanced cleanup with proper resource management
         */
        destroy() {
            // Stop performance monitoring
            if (this.performanceInterval) {
                clearInterval(this.performanceInterval);
                this.performanceInterval = null;
            }
            
            if (this.metricsReportInterval) {
                clearInterval(this.metricsReportInterval);
                this.metricsReportInterval = null;
            }
            
            // Cancel all pending requests
            this.cancelAllRequests();
            
            // Clear pending batches
            this.pendingBatches.forEach(batch => {
                if (batch.timeout) {
                    clearTimeout(batch.timeout);
                }
                batch.promises.forEach(promise => {
                    promise.reject(new Error('AjaxManager destroyed'));
                });
            });
            this.pendingBatches.clear();
            
            // Destroy queue system
            if (this.requestQueue.destroy) {
                this.requestQueue.destroy();
            }
            
            // Clear callbacks
            this.notificationCallbacks.clear();
            
            // Clear history
            this.clearHistory();
            
            // Clear debug logs
            if (this.debugLogs) {
                this.debugLogs = [];
            }
            
            this.debugLog('AjaxManager destroyed with enhanced cleanup');
        }
    }

    // Export for ES6 modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AjaxManager;
    }
    
    // Export for AMD
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return AjaxManager;
        });
    }
    
    // Register with LAS core for IE11 compatibility
    if (window.LAS && typeof window.LAS.registerModule === 'function') {
        window.LAS.registerModule('ajax-manager', AjaxManager);
    }
    
    // Global export as fallback
    window.LASAjaxManager = AjaxManager;

})(window, document);