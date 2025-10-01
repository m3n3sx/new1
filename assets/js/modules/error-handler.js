/**
 * Enhanced Error Handler - Comprehensive error handling system for AJAX operations
 * 
 * Provides error classification, user-friendly messages, automatic nonce refresh,
 * network error detection, recovery strategies, and detailed logging.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

(function() {
    'use strict';
    
    /**
     * Enhanced Error Handler class
     */
    class LASErrorHandler {
        
        constructor(config = {}) {
            this.config = {
                enableAutoRetry: true,
                enableNonceRefresh: true,
                enableUserNotifications: true,
                enableContextLogging: true,
                maxRetryAttempts: 3,
                retryDelay: 1000,
                notificationDuration: 5000,
                debugMode: false,
                ...config
            };
            
            this.errorClassifications = this.initializeErrorClassifications();
            this.recoveryStrategies = this.initializeRecoveryStrategies();
            this.errorHistory = [];
            this.nonceRefreshPromise = null;
            
            this.init();
        }
        
        /**
         * Initialize error handler
         */
        init() {
            this.setupNotificationSystem();
            this.bindEvents();
            
            if (this.config.debugMode) {
                console.log('[LAS ErrorHandler] Initialized with config:', this.config);
            }
        }
        
        /**
         * Initialize error classifications with user-friendly messages
         */
        initializeErrorClassifications() {
            return {
                // Network errors
                NETWORK_TIMEOUT: {
                    code: 'NETWORK_TIMEOUT',
                    category: 'network',
                    severity: 'warning',
                    retryable: true,
                    userMessage: 'Connection timeout - please check your internet connection and try again.',
                    technicalMessage: 'Request timed out',
                    recoveryStrategy: 'retry_with_backoff'
                },
                
                NETWORK_OFFLINE: {
                    code: 'NETWORK_OFFLINE',
                    category: 'network',
                    severity: 'error',
                    retryable: true,
                    userMessage: 'You appear to be offline. Please check your internet connection.',
                    technicalMessage: 'Network unavailable',
                    recoveryStrategy: 'wait_for_online'
                },
                
                NETWORK_ERROR: {
                    code: 'NETWORK_ERROR',
                    category: 'network',
                    severity: 'warning',
                    retryable: true,
                    userMessage: 'Network error occurred. Retrying automatically...',
                    technicalMessage: 'Network request failed',
                    recoveryStrategy: 'retry_with_backoff'
                },
                
                // Server errors (5xx)
                SERVER_ERROR: {
                    code: 'SERVER_ERROR',
                    category: 'server',
                    severity: 'error',
                    retryable: true,
                    userMessage: 'Server error - please try again in a moment.',
                    technicalMessage: 'Internal server error',
                    recoveryStrategy: 'retry_with_exponential_backoff'
                },
                
                SERVER_UNAVAILABLE: {
                    code: 'SERVER_UNAVAILABLE',
                    category: 'server',
                    severity: 'error',
                    retryable: true,
                    userMessage: 'Server temporarily unavailable. Please try again later.',
                    technicalMessage: 'Service unavailable',
                    recoveryStrategy: 'retry_with_long_delay'
                },
                
                SERVER_GATEWAY_ERROR: {
                    code: 'SERVER_GATEWAY_ERROR',
                    category: 'server',
                    severity: 'error',
                    retryable: true,
                    userMessage: 'Gateway error - the server is temporarily overloaded.',
                    technicalMessage: 'Bad gateway or gateway timeout',
                    recoveryStrategy: 'retry_with_exponential_backoff'
                },
                
                // Client errors (4xx)
                CLIENT_BAD_REQUEST: {
                    code: 'CLIENT_BAD_REQUEST',
                    category: 'client',
                    severity: 'error',
                    retryable: false,
                    userMessage: 'Invalid request. Please refresh the page and try again.',
                    technicalMessage: 'Bad request - invalid data sent',
                    recoveryStrategy: 'refresh_page'
                },
                
                CLIENT_UNAUTHORIZED: {
                    code: 'CLIENT_UNAUTHORIZED',
                    category: 'security',
                    severity: 'error',
                    retryable: false,
                    userMessage: 'Authentication required. Please log in again.',
                    technicalMessage: 'Unauthorized access',
                    recoveryStrategy: 'redirect_to_login'
                },
                
                CLIENT_FORBIDDEN: {
                    code: 'CLIENT_FORBIDDEN',
                    category: 'security',
                    severity: 'error',
                    retryable: false,
                    userMessage: 'Permission denied. You may not have access to this feature.',
                    technicalMessage: 'Forbidden - insufficient permissions',
                    recoveryStrategy: 'show_permission_error'
                },
                
                CLIENT_NOT_FOUND: {
                    code: 'CLIENT_NOT_FOUND',
                    category: 'client',
                    severity: 'warning',
                    retryable: false,
                    userMessage: 'The requested resource was not found.',
                    technicalMessage: 'Resource not found',
                    recoveryStrategy: 'refresh_page'
                },
                
                // Security errors
                SECURITY_NONCE_INVALID: {
                    code: 'SECURITY_NONCE_INVALID',
                    category: 'security',
                    severity: 'warning',
                    retryable: true,
                    userMessage: 'Security token expired. Refreshing automatically...',
                    technicalMessage: 'Invalid or expired nonce',
                    recoveryStrategy: 'refresh_nonce_and_retry'
                },
                
                SECURITY_RATE_LIMITED: {
                    code: 'SECURITY_RATE_LIMITED',
                    category: 'security',
                    severity: 'warning',
                    retryable: true,
                    userMessage: 'Too many requests. Please wait a moment before trying again.',
                    technicalMessage: 'Rate limit exceeded',
                    recoveryStrategy: 'wait_and_retry'
                },
                
                SECURITY_CSRF_ERROR: {
                    code: 'SECURITY_CSRF_ERROR',
                    category: 'security',
                    severity: 'error',
                    retryable: true,
                    userMessage: 'Security validation failed. Refreshing page security...',
                    technicalMessage: 'CSRF token validation failed',
                    recoveryStrategy: 'refresh_nonce_and_retry'
                },
                
                // Application errors
                APPLICATION_ERROR: {
                    code: 'APPLICATION_ERROR',
                    category: 'application',
                    severity: 'error',
                    retryable: false,
                    userMessage: 'An application error occurred. Please contact support if this persists.',
                    technicalMessage: 'Application logic error',
                    recoveryStrategy: 'log_and_notify'
                },
                
                VALIDATION_ERROR: {
                    code: 'VALIDATION_ERROR',
                    category: 'validation',
                    severity: 'warning',
                    retryable: false,
                    userMessage: 'Please check your input and try again.',
                    technicalMessage: 'Data validation failed',
                    recoveryStrategy: 'show_validation_errors'
                },
                
                // Unknown/Generic errors
                UNKNOWN_ERROR: {
                    code: 'UNKNOWN_ERROR',
                    category: 'unknown',
                    severity: 'error',
                    retryable: true,
                    userMessage: 'An unexpected error occurred. Please try again.',
                    technicalMessage: 'Unknown error',
                    recoveryStrategy: 'retry_with_backoff'
                }
            };
        }
        
        /**
         * Initialize recovery strategies
         */
        initializeRecoveryStrategies() {
            return {
                retry_with_backoff: this.retryWithBackoff.bind(this),
                retry_with_exponential_backoff: this.retryWithExponentialBackoff.bind(this),
                retry_with_long_delay: this.retryWithLongDelay.bind(this),
                refresh_nonce_and_retry: this.refreshNonceAndRetry.bind(this),
                wait_and_retry: this.waitAndRetry.bind(this),
                wait_for_online: this.waitForOnline.bind(this),
                refresh_page: this.refreshPage.bind(this),
                redirect_to_login: this.redirectToLogin.bind(this),
                show_permission_error: this.showPermissionError.bind(this),
                show_validation_errors: this.showValidationErrors.bind(this),
                log_and_notify: this.logAndNotify.bind(this)
            };
        }
        
        /**
         * Handle error with comprehensive classification and recovery
         * 
         * @param {Error|Object} error Error object or response
         * @param {Object} context Request context
         * @returns {Promise<Object>} Recovery result
         */
        async handleError(error, context = {}) {
            try {
                // Classify the error
                const classification = this.classifyError(error, context);
                
                // Create comprehensive error entry
                const errorEntry = this.createErrorEntry(error, context, classification);
                
                // Log error with context
                if (this.config.enableContextLogging) {
                    this.logError(errorEntry);
                }
                
                // Add to error history
                this.addToHistory(errorEntry);
                
                // Show user notification
                if (this.config.enableUserNotifications) {
                    this.showUserNotification(errorEntry);
                }
                
                // Execute recovery strategy
                const recoveryResult = await this.executeRecoveryStrategy(errorEntry, context);
                
                // Emit error event for external handlers
                this.emitErrorEvent(errorEntry, recoveryResult);
                
                return {
                    success: recoveryResult.success,
                    classification: classification,
                    recoveryAction: recoveryResult.action,
                    retryable: classification.retryable,
                    errorEntry: errorEntry
                };
                
            } catch (handlingError) {
                console.error('[LAS ErrorHandler] Error in error handling:', handlingError);
                
                // Fallback error handling
                return {
                    success: false,
                    classification: this.errorClassifications.UNKNOWN_ERROR,
                    recoveryAction: 'fallback_error',
                    retryable: false,
                    errorEntry: null
                };
            }
        }
        
        /**
         * Classify error based on type, status, and context
         * 
         * @param {Error|Object} error Error object
         * @param {Object} context Request context
         * @returns {Object} Error classification
         */
        classifyError(error, context) {
            // Network/Connection errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return this.errorClassifications.NETWORK_ERROR;
            }
            
            if (error.name === 'AbortError' || error.code === 'TIMEOUT') {
                return this.errorClassifications.NETWORK_TIMEOUT;
            }
            
            if (!navigator.onLine) {
                return this.errorClassifications.NETWORK_OFFLINE;
            }
            
            // HTTP status-based classification
            if (error.status || error.response?.status) {
                const status = error.status || error.response.status;
                
                switch (true) {
                    case status === 400:
                        return this.errorClassifications.CLIENT_BAD_REQUEST;
                    case status === 401:
                        return this.errorClassifications.CLIENT_UNAUTHORIZED;
                    case status === 403:
                        // Check if it's a nonce error
                        if (this.isNonceError(error, context)) {
                            return this.errorClassifications.SECURITY_NONCE_INVALID;
                        }
                        return this.errorClassifications.CLIENT_FORBIDDEN;
                    case status === 404:
                        return this.errorClassifications.CLIENT_NOT_FOUND;
                    case status === 429:
                        return this.errorClassifications.SECURITY_RATE_LIMITED;
                    case status >= 500 && status < 503:
                        return this.errorClassifications.SERVER_ERROR;
                    case status === 503:
                        return this.errorClassifications.SERVER_UNAVAILABLE;
                    case status === 502 || status === 504:
                        return this.errorClassifications.SERVER_GATEWAY_ERROR;
                }
            }
            
            // WordPress/Application specific errors
            if (error.response?.data) {
                const responseData = error.response.data;
                
                // Check for nonce errors in response
                if (responseData.code === 'rest_cookie_invalid_nonce' || 
                    responseData.message?.includes('nonce') ||
                    responseData.message?.includes('security')) {
                    return this.errorClassifications.SECURITY_NONCE_INVALID;
                }
                
                // Check for validation errors
                if (responseData.code === 'rest_invalid_param' || 
                    responseData.data?.status === 400) {
                    return this.errorClassifications.VALIDATION_ERROR;
                }
                
                // Check for CSRF errors
                if (responseData.code === 'rest_forbidden' && 
                    responseData.message?.includes('csrf')) {
                    return this.errorClassifications.SECURITY_CSRF_ERROR;
                }
            }
            
            // JavaScript/Application errors
            if (error instanceof TypeError || error instanceof ReferenceError) {
                return this.errorClassifications.APPLICATION_ERROR;
            }
            
            // Default to unknown error
            return this.errorClassifications.UNKNOWN_ERROR;
        }
        
        /**
         * Check if error is related to nonce validation
         * 
         * @param {Error|Object} error Error object
         * @param {Object} context Request context
         * @returns {boolean} Whether error is nonce-related
         */
        isNonceError(error, context) {
            const errorMessage = error.message || error.response?.data?.message || '';
            const errorCode = error.code || error.response?.data?.code || '';
            
            const nonceIndicators = [
                'nonce',
                'security',
                'token',
                'csrf',
                'rest_cookie_invalid_nonce',
                'rest_forbidden'
            ];
            
            return nonceIndicators.some(indicator => 
                errorMessage.toLowerCase().includes(indicator) ||
                errorCode.toLowerCase().includes(indicator)
            );
        }
        
        /**
         * Create comprehensive error entry with context
         * 
         * @param {Error|Object} error Original error
         * @param {Object} context Request context
         * @param {Object} classification Error classification
         * @returns {Object} Error entry
         */
        createErrorEntry(error, context, classification) {
            const entry = {
                id: this.generateErrorId(),
                timestamp: new Date().toISOString(),
                classification: classification,
                originalError: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    status: error.status,
                    code: error.code
                },
                context: {
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now(),
                    requestId: context.requestId,
                    action: context.action,
                    method: context.method,
                    attempt: context.attempt || 1,
                    ...context
                },
                environment: {
                    online: navigator.onLine,
                    cookieEnabled: navigator.cookieEnabled,
                    language: navigator.language,
                    platform: navigator.platform,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    memory: this.getMemoryInfo(),
                    connection: this.getConnectionInfo()
                },
                user: {
                    id: window.lasUser?.id || null,
                    sessionId: this.getSessionId()
                }
            };
            
            // Add response data if available
            if (error.response) {
                entry.response = {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    headers: error.response.headers,
                    data: error.response.data
                };
            }
            
            return entry;
        }
        
        /**
         * Execute recovery strategy based on error classification
         * 
         * @param {Object} errorEntry Error entry
         * @param {Object} context Request context
         * @returns {Promise<Object>} Recovery result
         */
        async executeRecoveryStrategy(errorEntry, context) {
            const strategy = errorEntry.classification.recoveryStrategy;
            const strategyFunction = this.recoveryStrategies[strategy];
            
            if (!strategyFunction) {
                console.warn('[LAS ErrorHandler] Unknown recovery strategy:', strategy);
                return { success: false, action: 'no_strategy' };
            }
            
            try {
                const result = await strategyFunction(errorEntry, context);
                return { success: true, action: strategy, ...result };
            } catch (strategyError) {
                console.error('[LAS ErrorHandler] Recovery strategy failed:', strategyError);
                return { success: false, action: strategy, error: strategyError };
            }
        }
        
        /**
         * Recovery Strategies
         */
        
        /**
         * Retry with simple backoff
         */
        async retryWithBackoff(errorEntry, context) {
            if (!this.config.enableAutoRetry || context.attempt >= this.config.maxRetryAttempts) {
                return { retry: false, reason: 'max_attempts_reached' };
            }
            
            const delay = this.config.retryDelay * context.attempt;
            await this.delay(delay);
            
            return { retry: true, delay: delay };
        }
        
        /**
         * Retry with exponential backoff
         */
        async retryWithExponentialBackoff(errorEntry, context) {
            if (!this.config.enableAutoRetry || context.attempt >= this.config.maxRetryAttempts) {
                return { retry: false, reason: 'max_attempts_reached' };
            }
            
            const delay = Math.min(
                this.config.retryDelay * Math.pow(2, context.attempt - 1),
                30000 // Max 30 seconds
            );
            
            await this.delay(delay);
            
            return { retry: true, delay: delay };
        }
        
        /**
         * Retry with long delay for server issues
         */
        async retryWithLongDelay(errorEntry, context) {
            if (!this.config.enableAutoRetry || context.attempt >= 2) {
                return { retry: false, reason: 'max_attempts_reached' };
            }
            
            const delay = 10000; // 10 seconds
            await this.delay(delay);
            
            return { retry: true, delay: delay };
        }
        
        /**
         * Refresh nonce and retry request
         */
        async refreshNonceAndRetry(errorEntry, context) {
            if (!this.config.enableNonceRefresh) {
                return { retry: false, reason: 'nonce_refresh_disabled' };
            }
            
            try {
                // Prevent multiple simultaneous nonce refresh requests
                if (!this.nonceRefreshPromise) {
                    this.nonceRefreshPromise = this.refreshNonce();
                }
                
                const newNonce = await this.nonceRefreshPromise;
                this.nonceRefreshPromise = null;
                
                if (newNonce) {
                    // Update global nonce
                    if (window.lasComm && window.lasComm.nonces) {
                        window.lasComm.nonces.ajax = newNonce;
                        window.lasComm.nonces.rest = newNonce;
                    }
                    
                    return { retry: true, newNonce: newNonce };
                }
                
                return { retry: false, reason: 'nonce_refresh_failed' };
                
            } catch (refreshError) {
                this.nonceRefreshPromise = null;
                console.error('[LAS ErrorHandler] Nonce refresh failed:', refreshError);
                return { retry: false, reason: 'nonce_refresh_error', error: refreshError };
            }
        }
        
        /**
         * Wait and retry for rate limiting
         */
        async waitAndRetry(errorEntry, context) {
            if (context.attempt >= 2) {
                return { retry: false, reason: 'max_attempts_reached' };
            }
            
            // Extract retry-after header if available
            const retryAfter = errorEntry.response?.headers?.['retry-after'];
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
            
            await this.delay(Math.min(delay, 300000)); // Max 5 minutes
            
            return { retry: true, delay: delay };
        }
        
        /**
         * Wait for network to come back online
         */
        async waitForOnline(errorEntry, context) {
            return new Promise((resolve) => {
                if (navigator.onLine) {
                    resolve({ retry: true, delay: 0 });
                    return;
                }
                
                const onlineHandler = () => {
                    window.removeEventListener('online', onlineHandler);
                    resolve({ retry: true, delay: 0 });
                };
                
                window.addEventListener('online', onlineHandler);
                
                // Timeout after 5 minutes
                setTimeout(() => {
                    window.removeEventListener('online', onlineHandler);
                    resolve({ retry: false, reason: 'timeout_waiting_for_online' });
                }, 300000);
            });
        }
        
        /**
         * Refresh page recovery
         */
        async refreshPage(errorEntry, context) {
            if (confirm('An error occurred that requires refreshing the page. Refresh now?')) {
                window.location.reload();
            }
            return { retry: false, action: 'page_refresh_prompted' };
        }
        
        /**
         * Redirect to login
         */
        async redirectToLogin(errorEntry, context) {
            if (window.lasComm?.loginUrl) {
                window.location.href = window.lasComm.loginUrl;
            } else {
                window.location.href = '/wp-login.php';
            }
            return { retry: false, action: 'redirected_to_login' };
        }
        
        /**
         * Show permission error
         */
        async showPermissionError(errorEntry, context) {
            this.showNotification(
                'You do not have permission to perform this action. Please contact an administrator.',
                'error',
                { persistent: true }
            );
            return { retry: false, action: 'permission_error_shown' };
        }
        
        /**
         * Show validation errors
         */
        async showValidationErrors(errorEntry, context) {
            const errors = errorEntry.response?.data?.data?.params || {};
            
            Object.keys(errors).forEach(field => {
                this.showNotification(
                    `${field}: ${errors[field]}`,
                    'warning'
                );
            });
            
            return { retry: false, action: 'validation_errors_shown' };
        }
        
        /**
         * Log and notify fallback
         */
        async logAndNotify(errorEntry, context) {
            console.error('[LAS ErrorHandler] Application error:', errorEntry);
            
            this.showNotification(
                'An unexpected error occurred. Please try again or contact support.',
                'error'
            );
            
            return { retry: false, action: 'logged_and_notified' };
        }
        
        /**
         * Refresh WordPress nonce
         * 
         * @returns {Promise<string|null>} New nonce or null if failed
         */
        async refreshNonce() {
            try {
                const response = await fetch(window.lasComm?.ajaxUrl || '/wp-admin/admin-ajax.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'las_refresh_nonce',
                        _ajax_nonce: window.lasComm?.nonces?.ajax || ''
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.data.nonce) {
                    console.log('[LAS ErrorHandler] Nonce refreshed successfully');
                    return data.data.nonce;
                }
                
                throw new Error(data.data?.message || 'Nonce refresh failed');
                
            } catch (error) {
                console.error('[LAS ErrorHandler] Nonce refresh error:', error);
                return null;
            }
        }
        
        /**
         * Utility Methods
         */
        
        /**
         * Generate unique error ID
         */
        generateErrorId() {
            return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        /**
         * Get session ID
         */
        getSessionId() {
            let sessionId = sessionStorage.getItem('las_session_id');
            if (!sessionId) {
                sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('las_session_id', sessionId);
            }
            return sessionId;
        }
        
        /**
         * Get memory information
         */
        getMemoryInfo() {
            if (performance.memory) {
                return {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        }
        
        /**
         * Get connection information
         */
        getConnectionInfo() {
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
         * Delay utility
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        /**
         * Add error to history
         */
        addToHistory(errorEntry) {
            this.errorHistory.push(errorEntry);
            
            // Keep history manageable
            if (this.errorHistory.length > 100) {
                this.errorHistory = this.errorHistory.slice(-50);
            }
        }
        
        /**
         * Log error with context
         */
        logError(errorEntry) {
            const logLevel = this.getLogLevel(errorEntry.classification.severity);
            
            console[logLevel](
                `[LAS ErrorHandler] ${errorEntry.classification.code}:`,
                errorEntry.classification.technicalMessage,
                {
                    classification: errorEntry.classification,
                    context: errorEntry.context,
                    originalError: errorEntry.originalError
                }
            );
            
            // Send to server if configured
            this.sendErrorToServer(errorEntry);
        }
        
        /**
         * Get console log level from severity
         */
        getLogLevel(severity) {
            const levelMap = {
                'critical': 'error',
                'error': 'error',
                'warning': 'warn',
                'info': 'info',
                'debug': 'debug'
            };
            
            return levelMap[severity] || 'log';
        }
        
        /**
         * Send error to server for logging
         */
        async sendErrorToServer(errorEntry) {
            if (!window.lasComm?.restUrl) {
                return;
            }
            
            try {
                await fetch(window.lasComm.restUrl + 'las/v1/error-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.lasComm.nonces?.rest || ''
                    },
                    body: JSON.stringify({
                        error: errorEntry,
                        client_info: {
                            timestamp: Date.now(),
                            url: window.location.href,
                            referrer: document.referrer
                        }
                    })
                });
            } catch (serverError) {
                // Silently fail - don't want error reporting to cause more errors
                if (this.config.debugMode) {
                    console.warn('[LAS ErrorHandler] Failed to send error to server:', serverError);
                }
            }
        }
        
        /**
         * Notification System
         */
        
        /**
         * Setup notification system
         */
        setupNotificationSystem() {
            if (!document.getElementById('las-error-notifications')) {
                const container = document.createElement('div');
                container.id = 'las-error-notifications';
                container.style.cssText = `
                    position: fixed;
                    top: 32px;
                    right: 20px;
                    z-index: 999999;
                    max-width: 400px;
                    pointer-events: none;
                `;
                document.body.appendChild(container);
            }
            
            this.addNotificationStyles();
        }
        
        /**
         * Add notification styles
         */
        addNotificationStyles() {
            if (document.getElementById('las-error-handler-styles')) {
                return;
            }
            
            const styles = document.createElement('style');
            styles.id = 'las-error-handler-styles';
            styles.textContent = `
                .las-error-notification {
                    background: white;
                    border-left: 4px solid;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 10px;
                    padding: 12px 16px;
                    font-size: 14px;
                    line-height: 1.4;
                    pointer-events: auto;
                    animation: las-slide-in 0.3s ease-out;
                    position: relative;
                    max-width: 100%;
                    word-wrap: break-word;
                }
                
                .las-error-notification.error {
                    border-color: #dc3545;
                    background-color: #f8d7da;
                    color: #721c24;
                }
                
                .las-error-notification.warning {
                    border-color: #ffc107;
                    background-color: #fff3cd;
                    color: #856404;
                }
                
                .las-error-notification.info {
                    border-color: #17a2b8;
                    background-color: #d1ecf1;
                    color: #0c5460;
                }
                
                .las-error-notification.success {
                    border-color: #28a745;
                    background-color: #d4edda;
                    color: #155724;
                }
                
                .las-error-notification-close {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    opacity: 0.5;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .las-error-notification-close:hover {
                    opacity: 1;
                }
                
                .las-error-notification-content {
                    padding-right: 24px;
                }
                
                @keyframes las-slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes las-slide-out {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }
        
        /**
         * Show user notification
         */
        showUserNotification(errorEntry) {
            const message = errorEntry.classification.userMessage;
            const type = this.getSeverityType(errorEntry.classification.severity);
            
            this.showNotification(message, type, {
                errorId: errorEntry.id,
                classification: errorEntry.classification.code
            });
        }
        
        /**
         * Show notification
         */
        showNotification(message, type = 'info', options = {}) {
            const container = document.getElementById('las-error-notifications');
            if (!container) {
                return;
            }
            
            const notification = document.createElement('div');
            notification.className = `las-error-notification ${type}`;
            
            const content = document.createElement('div');
            content.className = 'las-error-notification-content';
            content.textContent = message;
            
            const closeButton = document.createElement('button');
            closeButton.className = 'las-error-notification-close';
            closeButton.innerHTML = '×';
            closeButton.onclick = () => this.closeNotification(notification);
            
            notification.appendChild(content);
            notification.appendChild(closeButton);
            
            container.appendChild(notification);
            
            // Auto-close unless persistent
            if (!options.persistent) {
                setTimeout(() => {
                    this.closeNotification(notification);
                }, this.config.notificationDuration);
            }
            
            return notification;
        }
        
        /**
         * Close notification
         */
        closeNotification(notification) {
            if (notification && notification.parentNode) {
                notification.style.animation = 'las-slide-out 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }
        
        /**
         * Get notification type from severity
         */
        getSeverityType(severity) {
            const typeMap = {
                'critical': 'error',
                'error': 'error',
                'warning': 'warning',
                'info': 'info',
                'debug': 'info'
            };
            
            return typeMap[severity] || 'info';
        }
        
        /**
         * Bind events
         */
        bindEvents() {
            // Listen for online/offline events
            window.addEventListener('online', () => {
                this.showNotification('Connection restored', 'success');
            });
            
            window.addEventListener('offline', () => {
                this.showNotification('Connection lost - working offline', 'warning');
            });
        }
        
        /**
         * Emit error event
         */
        emitErrorEvent(errorEntry, recoveryResult) {
            const event = new CustomEvent('las:error', {
                detail: {
                    error: errorEntry,
                    recovery: recoveryResult
                }
            });
            
            document.dispatchEvent(event);
        }
        
        /**
         * Public API Methods
         */
        
        /**
         * Get error statistics
         */
        getStatistics() {
            const stats = {
                totalErrors: this.errorHistory.length,
                errorsByCategory: {},
                errorsBySeverity: {},
                recentErrors: this.errorHistory.slice(-10)
            };
            
            this.errorHistory.forEach(error => {
                const category = error.classification.category;
                const severity = error.classification.severity;
                
                stats.errorsByCategory[category] = (stats.errorsByCategory[category] || 0) + 1;
                stats.errorsBySeverity[severity] = (stats.errorsBySeverity[severity] || 0) + 1;
            });
            
            return stats;
        }
        
        /**
         * Clear error history
         */
        clearHistory() {
            this.errorHistory = [];
        }
        
        /**
         * Test error handling
         */
        testErrorHandling() {
            console.log('[LAS ErrorHandler] Testing error handling...');
            
            // Test network error
            this.handleError(new Error('Test network error'), {
                action: 'test_network',
                requestId: 'test_1'
            });
            
            // Test nonce error
            this.handleError({
                status: 403,
                response: {
                    data: {
                        code: 'rest_cookie_invalid_nonce',
                        message: 'Cookie nonce is invalid'
                    }
                }
            }, {
                action: 'test_nonce',
                requestId: 'test_2'
            });
        }
    }
    
    // Export for use
    window.LAS = window.LAS || {};
    window.LAS.ErrorHandler = LASErrorHandler;
    
    // Create global instance
    window.LAS.errorHandler = new LASErrorHandler(window.lasErrorConfig || {});
    
})();