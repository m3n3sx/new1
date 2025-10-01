/**
 * CommunicationManager - Client-side communication with retry logic
 * 
 * Handles AJAX and REST API communication with automatic retry logic,
 * exponential backoff, request queuing, and error handling.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

(function($) {
    'use strict';
    
    /**
     * CommunicationManager class
     */
    class CommunicationManager {
        
        constructor(config = {}) {
            this.config = {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 30000,
                timeout: 30000,
                ...config
            };
            
            this.requestQueue = new Map();
            this.activeRequests = new Map();
            this.eventListeners = new Map();
            
            // Initialize
            this.init();
        }
        
        /**
         * Initialize communication manager
         */
        init() {
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up periodic queue processing
            this.setupQueueProcessor();
            
            // Set up network status monitoring
            this.setupNetworkMonitoring();
            
            // Bind to window events
            this.bindEvents();
        }
        
        /**
         * Make AJAX request with retry logic
         * 
         * @param {string} action AJAX action
         * @param {Object} data Request data
         * @param {Object} options Request options
         * @returns {Promise} Request promise
         */
        ajax(action, data = {}, options = {}) {
            const requestId = this.generateRequestId();
            
            const defaultOptions = {
                method: 'POST',
                timeout: this.config.timeout,
                retries: this.config.maxRetries,
                nonce: lasComm.nonces.ajax,
                onProgress: null,
                onRetry: null
            };
            
            options = { ...defaultOptions, ...options };
            
            // Add standard data
            const requestData = {
                action: action,
                nonce: options.nonce,
                ...data
            };
            
            return this.makeRequest('ajax', requestId, {
                url: lasComm.ajaxUrl,
                method: options.method,
                data: requestData,
                timeout: options.timeout
            }, options);
        }
        
        /**
         * Make REST API request with retry logic
         * 
         * @param {string} endpoint REST endpoint
         * @param {Object} data Request data
         * @param {Object} options Request options
         * @returns {Promise} Request promise
         */
        rest(endpoint, data = {}, options = {}) {
            const requestId = this.generateRequestId();
            
            const defaultOptions = {
                method: 'GET',
                timeout: this.config.timeout,
                retries: this.config.maxRetries,
                headers: {
                    'X-WP-Nonce': lasComm.nonces.rest,
                    'Content-Type': 'application/json'
                },
                onProgress: null,
                onRetry: null
            };
            
            options = { ...defaultOptions, ...options };
            
            // Build URL
            const url = lasComm.restUrl + endpoint.replace(/^\//, '');
            
            // Prepare request config
            const requestConfig = {
                url: url,
                method: options.method,
                headers: options.headers,
                timeout: options.timeout
            };
            
            if (options.method === 'GET') {
                requestConfig.data = data;
            } else {
                requestConfig.data = JSON.stringify(data);
            }
            
            return this.makeRequest('rest', requestId, requestConfig, options);
        }
        
        /**
         * Make request with retry logic
         * 
         * @param {string} type Request type (ajax/rest)
         * @param {string} requestId Request ID
         * @param {Object} config Request configuration
         * @param {Object} options Request options
         * @returns {Promise} Request promise
         */
        makeRequest(type, requestId, config, options) {
            return new Promise((resolve, reject) => {
                const requestInfo = {
                    id: requestId,
                    type: type,
                    config: config,
                    options: options,
                    attempts: 0,
                    resolve: resolve,
                    reject: reject,
                    startTime: Date.now()
                };
                
                this.activeRequests.set(requestId, requestInfo);
                this.attemptRequest(requestInfo);
            });
        }
        
        /**
         * Attempt to make a request
         * 
         * @param {Object} requestInfo Request information
         */
        attemptRequest(requestInfo) {
            requestInfo.attempts++;
            
            const ajaxConfig = {
                url: requestInfo.config.url,
                method: requestInfo.config.method,
                data: requestInfo.config.data,
                timeout: requestInfo.config.timeout,
                headers: requestInfo.config.headers || {},
                success: (response) => {
                    this.handleSuccess(requestInfo, response);
                },
                error: (xhr, status, error) => {
                    this.handleError(requestInfo, xhr, status, error);
                }
            };
            
            // Add progress callback if available
            if (requestInfo.options.onProgress) {
                ajaxConfig.xhr = () => {
                    const xhr = new XMLHttpRequest();
                    xhr.upload.addEventListener('progress', requestInfo.options.onProgress);
                    return xhr;
                };
            }
            
            // Make the request
            $.ajax(ajaxConfig);
        }
        
        /**
         * Handle successful request
         * 
         * @param {Object} requestInfo Request information
         * @param {*} response Response data
         */
        handleSuccess(requestInfo, response) {
            const duration = Date.now() - requestInfo.startTime;
            
            // Remove from active requests
            this.activeRequests.delete(requestInfo.id);
            
            // Log success
            this.logRequest(requestInfo, 'success', duration);
            
            // Emit success event
            this.emit('request:success', {
                requestId: requestInfo.id,
                type: requestInfo.type,
                duration: duration,
                response: response
            });
            
            // Resolve promise
            requestInfo.resolve(response);
        }
        
        /**
         * Handle request error
         * 
         * @param {Object} requestInfo Request information
         * @param {Object} xhr XMLHttpRequest object
         * @param {string} status Error status
         * @param {string} error Error message
         */
        handleError(requestInfo, xhr, status, error) {
            const duration = Date.now() - requestInfo.startTime;
            
            // Determine if we should retry
            const shouldRetry = this.shouldRetry(requestInfo, xhr, status, error);
            
            if (shouldRetry && requestInfo.attempts < requestInfo.options.retries) {
                // Queue for retry
                this.queueForRetry(requestInfo);
                return;
            }
            
            // Remove from active requests
            this.activeRequests.delete(requestInfo.id);
            
            // Log error
            this.logRequest(requestInfo, 'error', duration, error);
            
            // Create error object
            const errorObj = this.createErrorObject(xhr, status, error);
            
            // Emit error event
            this.emit('request:error', {
                requestId: requestInfo.id,
                type: requestInfo.type,
                duration: duration,
                error: errorObj,
                attempts: requestInfo.attempts
            });
            
            // Reject promise
            requestInfo.reject(errorObj);
        }
        
        /**
         * Determine if request should be retried
         * 
         * @param {Object} requestInfo Request information
         * @param {Object} xhr XMLHttpRequest object
         * @param {string} status Error status
         * @param {string} error Error message
         * @returns {boolean} Whether to retry
         */
        shouldRetry(requestInfo, xhr, status, error) {
            // Don't retry if max attempts reached
            if (requestInfo.attempts >= requestInfo.options.retries) {
                return false;
            }
            
            // Don't retry client errors (4xx)
            if (xhr.status >= 400 && xhr.status < 500) {
                return false;
            }
            
            // Retry on network errors, timeouts, and server errors
            return status === 'timeout' || 
                   status === 'error' || 
                   xhr.status === 0 || 
                   xhr.status >= 500;
        }
        
        /**
         * Queue request for retry
         * 
         * @param {Object} requestInfo Request information
         */
        queueForRetry(requestInfo) {
            // Calculate delay with exponential backoff
            const delay = Math.min(
                this.config.baseDelay * Math.pow(2, requestInfo.attempts - 1),
                this.config.maxDelay
            );
            
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 0.1 * delay;
            const finalDelay = delay + jitter;
            
            // Queue for retry
            const retryTime = Date.now() + finalDelay;
            requestInfo.retryTime = retryTime;
            
            this.requestQueue.set(requestInfo.id, requestInfo);
            
            // Call retry callback if provided
            if (requestInfo.options.onRetry) {
                requestInfo.options.onRetry(requestInfo.attempts, finalDelay);
            }
            
            // Emit retry event
            this.emit('request:retry', {
                requestId: requestInfo.id,
                attempt: requestInfo.attempts,
                delay: finalDelay,
                retryTime: retryTime
            });
            
            // Show user notification
            this.showRetryNotification(requestInfo, finalDelay);
        }
        
        /**
         * Process retry queue
         */
        processRetryQueue() {
            const currentTime = Date.now();
            const toRetry = [];
            
            // Find requests ready for retry
            for (const [requestId, requestInfo] of this.requestQueue) {
                if (requestInfo.retryTime <= currentTime) {
                    toRetry.push(requestInfo);
                    this.requestQueue.delete(requestId);
                }
            }
            
            // Attempt retries
            toRetry.forEach(requestInfo => {
                this.activeRequests.set(requestInfo.id, requestInfo);
                this.attemptRequest(requestInfo);
            });
        }
        
        /**
         * Setup queue processor
         */
        setupQueueProcessor() {
            // Process queue every second
            setInterval(() => {
                this.processRetryQueue();
            }, 1000);
        }
        
        /**
         * Setup error handling
         */
        setupErrorHandling() {
            // Handle global AJAX errors
            $(document).ajaxError((event, xhr, settings, error) => {
                if (settings.url && settings.url.includes('las_')) {
                    console.warn('LAS AJAX Error:', error, xhr);
                }
            });
        }
        
        /**
         * Setup network monitoring
         */
        setupNetworkMonitoring() {
            if ('navigator' in window && 'onLine' in navigator) {
                window.addEventListener('online', () => {
                    this.emit('network:online');
                    // Process queue when back online
                    this.processRetryQueue();
                });
                
                window.addEventListener('offline', () => {
                    this.emit('network:offline');
                });
            }
        }
        
        /**
         * Bind window events
         */
        bindEvents() {
            // Process queue before page unload
            window.addEventListener('beforeunload', () => {
                this.processRetryQueue();
            });
        }
        
        /**
         * Show retry notification to user
         * 
         * @param {Object} requestInfo Request information
         * @param {number} delay Retry delay in milliseconds
         */
        showRetryNotification(requestInfo, delay) {
            const message = lasComm.strings.retryFailed || 'Request failed. Retrying...';
            
            // Create or update notification
            let notification = document.getElementById('las-retry-notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'las-retry-notification';
                notification.className = 'las-notification las-notification-warning';
                notification.style.cssText = `
                    position: fixed;
                    top: 32px;
                    right: 20px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 12px 16px;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 999999;
                    font-size: 14px;
                    max-width: 300px;
                `;
                document.body.appendChild(notification);
            }
            
            notification.textContent = `${message} (Attempt ${requestInfo.attempts}/${requestInfo.options.retries})`;
            
            // Auto-hide after delay
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, Math.min(delay, 5000));
        }
        
        /**
         * Create error object from XHR response
         * 
         * @param {Object} xhr XMLHttpRequest object
         * @param {string} status Error status
         * @param {string} error Error message
         * @returns {Object} Error object
         */
        createErrorObject(xhr, status, error) {
            let errorObj = {
                status: xhr.status,
                statusText: xhr.statusText,
                type: status,
                message: error
            };
            
            // Try to parse JSON error response
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    errorObj = { ...errorObj, ...response.error };
                }
            } catch (e) {
                // Not JSON, use raw response
                errorObj.responseText = xhr.responseText;
            }
            
            return errorObj;
        }
        
        /**
         * Generate unique request ID
         * 
         * @returns {string} Request ID
         */
        generateRequestId() {
            return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        /**
         * Log request
         * 
         * @param {Object} requestInfo Request information
         * @param {string} status Request status
         * @param {number} duration Request duration
         * @param {string} error Optional error message
         */
        logRequest(requestInfo, status, duration, error = '') {
            if (window.console && console.log) {
                const logData = {
                    id: requestInfo.id,
                    type: requestInfo.type,
                    status: status,
                    duration: duration + 'ms',
                    attempts: requestInfo.attempts
                };
                
                if (error) {
                    logData.error = error;
                }
                
                console.log('[LAS Communication]', logData);
            }
        }
        
        /**
         * Event system
         */
        
        /**
         * Add event listener
         * 
         * @param {string} event Event name
         * @param {Function} callback Event callback
         */
        on(event, callback) {
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(callback);
        }
        
        /**
         * Remove event listener
         * 
         * @param {string} event Event name
         * @param {Function} callback Event callback
         */
        off(event, callback) {
            if (this.eventListeners.has(event)) {
                const listeners = this.eventListeners.get(event);
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        }
        
        /**
         * Emit event
         * 
         * @param {string} event Event name
         * @param {*} data Event data
         */
        emit(event, data) {
            if (this.eventListeners.has(event)) {
                this.eventListeners.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error('Event listener error:', e);
                    }
                });
            }
        }
        
        /**
         * Utility methods
         */
        
        /**
         * Get active requests count
         * 
         * @returns {number} Active requests count
         */
        getActiveRequestsCount() {
            return this.activeRequests.size;
        }
        
        /**
         * Get queued requests count
         * 
         * @returns {number} Queued requests count
         */
        getQueuedRequestsCount() {
            return this.requestQueue.size;
        }
        
        /**
         * Cancel request
         * 
         * @param {string} requestId Request ID
         * @returns {boolean} Success status
         */
        cancelRequest(requestId) {
            // Remove from active requests
            if (this.activeRequests.has(requestId)) {
                this.activeRequests.delete(requestId);
                return true;
            }
            
            // Remove from queue
            if (this.requestQueue.has(requestId)) {
                this.requestQueue.delete(requestId);
                return true;
            }
            
            return false;
        }
        
        /**
         * Clear all queued requests
         */
        clearQueue() {
            this.requestQueue.clear();
        }
        
        /**
         * Get statistics
         * 
         * @returns {Object} Statistics
         */
        getStatistics() {
            return {
                activeRequests: this.activeRequests.size,
                queuedRequests: this.requestQueue.size,
                config: this.config
            };
        }
    }
    
    // Create global instance
    window.LAS = window.LAS || {};
    window.LAS.Communication = new CommunicationManager(lasComm.config);
    
    // jQuery plugin for backward compatibility
    $.fn.lasAjax = function(action, data, options) {
        return window.LAS.Communication.ajax(action, data, options);
    };
    
    $.fn.lasRest = function(endpoint, data, options) {
        return window.LAS.Communication.rest(endpoint, data, options);
    };
    
})(jQuery);