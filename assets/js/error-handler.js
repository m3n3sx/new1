/**
 * ErrorHandler - Client-side error handling and user notifications
 * 
 * Provides global error capture, user-friendly notifications, error reporting,
 * and integration with the server-side error logging system.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

(function($) {
    'use strict';
    
    /**
     * ErrorHandler class
     */
    class ErrorHandler {
        
        constructor(config = {}) {
            this.config = {
                enableGlobalHandling: true,
                enableUserNotifications: true,
                enableErrorReporting: true,
                maxErrorsPerSession: 50,
                reportingEndpoint: lasComm.restUrl + 'error-report',
                notificationDuration: 5000,
                debugMode: false,
                ...config
            };
            
            this.errorCount = 0;
            this.errorHistory = [];
            this.notificationQueue = [];
            this.isInitialized = false;
            
            // Initialize
            this.init();
        }
        
        /**
         * Initialize error handler
         */
        init() {
            if (this.isInitialized) {
                return;
            }
            
            if (this.config.enableGlobalHandling) {
                this.setupGlobalHandlers();
            }
            
            this.setupNotificationSystem();
            this.bindEvents();
            
            this.isInitialized = true;
            
            // Log initialization
            this.log('ErrorHandler initialized', 'info');
        }
        
        /**
         * Set up global error handlers
         */
        setupGlobalHandlers() {
            // Handle JavaScript errors
            window.addEventListener('error', (event) => {
                this.handleError({
                    type: 'javascript',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error,
                    stack: event.error ? event.error.stack : null
                });
            });
            
            // Handle unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.handleError({
                    type: 'promise',
                    message: event.reason ? event.reason.toString() : 'Unhandled promise rejection',
                    promise: event.promise,
                    reason: event.reason,
                    stack: event.reason && event.reason.stack ? event.reason.stack : null
                });
            });
            
            // Handle jQuery AJAX errors
            $(document).ajaxError((event, xhr, settings, error) => {
                // Only handle LAS-related AJAX errors
                if (settings.url && (settings.url.includes('las_') || settings.url.includes('/las/'))) {
                    this.handleAjaxError(xhr, settings, error);
                }
            });
            
            // Override console.error to capture logged errors
            const originalConsoleError = console.error;
            console.error = (...args) => {
                this.handleConsoleError(args);
                originalConsoleError.apply(console, args);
            };
        }
        
        /**
         * Handle JavaScript error
         * 
         * @param {Object} errorInfo Error information
         */
        handleError(errorInfo) {
            // Prevent error loops
            if (this.errorCount >= this.config.maxErrorsPerSession) {
                return;
            }
            
            this.errorCount++;
            
            // Create standardized error object
            const error = this.createErrorObject(errorInfo);
            
            // Add to history
            this.errorHistory.push(error);
            
            // Keep history manageable
            if (this.errorHistory.length > 100) {
                this.errorHistory = this.errorHistory.slice(-50);
            }
            
            // Log error
            this.log('JavaScript error captured', 'error', error);
            
            // Show user notification
            if (this.config.enableUserNotifications) {
                this.showErrorNotification(error);
            }
            
            // Report error to server
            if (this.config.enableErrorReporting) {
                this.reportError(error);
            }
            
            // Emit error event
            this.emit('error', error);
        }
        
        /**
         * Handle AJAX error
         * 
         * @param {Object} xhr XMLHttpRequest object
         * @param {Object} settings AJAX settings
         * @param {string} error Error message
         */
        handleAjaxError(xhr, settings, error) {
            const errorInfo = {
                type: 'ajax',
                message: error || 'AJAX request failed',
                url: settings.url,
                method: settings.type || 'GET',
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                timeout: settings.timeout
            };
            
            // Try to parse JSON error response
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    errorInfo.serverError = response.error;
                    errorInfo.message = response.error.message || errorInfo.message;
                }
            } catch (e) {
                // Not JSON, keep original error
            }
            
            this.handleError(errorInfo);
        }
        
        /**
         * Handle console error
         * 
         * @param {Array} args Console.error arguments
         */
        handleConsoleError(args) {
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return arg.toString();
                    }
                }
                return String(arg);
            }).join(' ');
            
            this.handleError({
                type: 'console',
                message: message,
                args: args
            });
        }
        
        /**
         * Create standardized error object
         * 
         * @param {Object} errorInfo Raw error information
         * @returns {Object} Standardized error object
         */
        createErrorObject(errorInfo) {
            const error = {
                id: this.generateErrorId(),
                timestamp: new Date().toISOString(),
                type: errorInfo.type || 'unknown',
                message: errorInfo.message || 'Unknown error',
                level: this.determineErrorLevel(errorInfo),
                category: this.determineErrorCategory(errorInfo),
                url: window.location.href,
                userAgent: navigator.userAgent,
                userId: window.lasUser ? window.lasUser.id : null,
                sessionId: this.getSessionId()
            };
            
            // Add type-specific information
            switch (errorInfo.type) {
                case 'javascript':
                    error.filename = errorInfo.filename;
                    error.lineno = errorInfo.lineno;
                    error.colno = errorInfo.colno;
                    error.stack = errorInfo.stack;
                    break;
                    
                case 'promise':
                    error.reason = errorInfo.reason;
                    error.stack = errorInfo.stack;
                    break;
                    
                case 'ajax':
                    error.requestUrl = errorInfo.url;
                    error.method = errorInfo.method;
                    error.status = errorInfo.status;
                    error.statusText = errorInfo.statusText;
                    error.responseText = errorInfo.responseText;
                    error.serverError = errorInfo.serverError;
                    break;
                    
                case 'console':
                    error.args = errorInfo.args;
                    break;
            }
            
            return error;
        }
        
        /**
         * Determine error level
         * 
         * @param {Object} errorInfo Error information
         * @returns {string} Error level
         */
        determineErrorLevel(errorInfo) {
            switch (errorInfo.type) {
                case 'javascript':
                    return 'error';
                case 'promise':
                    return 'error';
                case 'ajax':
                    if (errorInfo.status >= 500) {
                        return 'error';
                    } else if (errorInfo.status >= 400) {
                        return 'warning';
                    }
                    return 'error';
                case 'console':
                    return 'warning';
                default:
                    return 'error';
            }
        }
        
        /**
         * Determine error category
         * 
         * @param {Object} errorInfo Error information
         * @returns {string} Error category
         */
        determineErrorCategory(errorInfo) {
            switch (errorInfo.type) {
                case 'ajax':
                    return 'network';
                case 'javascript':
                case 'promise':
                case 'console':
                    return 'system';
                default:
                    return 'system';
            }
        }
        
        /**
         * Show error notification to user
         * 
         * @param {Object} error Error object
         */
        showErrorNotification(error) {
            // Don't show notifications for debug-level errors
            if (error.level === 'debug' || error.level === 'info') {
                return;
            }
            
            // Create user-friendly message
            const userMessage = this.createUserFriendlyMessage(error);
            
            // Create notification
            const notification = this.createNotification(userMessage, error.level);
            
            // Add to queue
            this.notificationQueue.push(notification);
            
            // Process queue
            this.processNotificationQueue();
        }
        
        /**
         * Create user-friendly error message
         * 
         * @param {Object} error Error object
         * @returns {string} User-friendly message
         */
        createUserFriendlyMessage(error) {
            const messages = {
                ajax: {
                    0: 'Network connection error. Please check your internet connection.',
                    400: 'Invalid request. Please refresh the page and try again.',
                    401: 'Authentication error. Please log in again.',
                    403: 'Permission denied. You may not have access to this feature.',
                    404: 'The requested resource was not found.',
                    500: 'Server error. Please try again later.',
                    502: 'Server temporarily unavailable. Please try again later.',
                    503: 'Service temporarily unavailable. Please try again later.'
                },
                javascript: 'A JavaScript error occurred. The page may not function correctly.',
                promise: 'An asynchronous operation failed. Some features may not work properly.',
                console: 'A system error was logged. This may affect functionality.',
                default: 'An unexpected error occurred. Please try refreshing the page.'
            };
            
            if (error.type === 'ajax' && messages.ajax[error.status]) {
                return messages.ajax[error.status];
            }
            
            return messages[error.type] || messages.default;
        }
        
        /**
         * Create notification element
         * 
         * @param {string} message Notification message
         * @param {string} level Error level
         * @returns {Object} Notification object
         */
        createNotification(message, level) {
            const notification = {
                id: 'las-error-notification-' + Date.now(),
                message: message,
                level: level,
                timestamp: Date.now(),
                element: null
            };
            
            // Create DOM element
            const element = $(`
                <div id="${notification.id}" class="las-notification las-notification-${level}" style="display: none;">
                    <div class="las-notification-content">
                        <span class="las-notification-icon"></span>
                        <span class="las-notification-message">${message}</span>
                        <button class="las-notification-close" type="button">&times;</button>
                    </div>
                </div>
            `);
            
            // Add styles
            element.css({
                position: 'fixed',
                top: '32px',
                right: '20px',
                zIndex: '999999',
                maxWidth: '400px',
                padding: '12px 16px',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '14px',
                lineHeight: '1.4'
            });
            
            // Add level-specific styles
            const levelStyles = {
                error: {
                    backgroundColor: '#f8d7da',
                    borderColor: '#f5c6cb',
                    color: '#721c24'
                },
                warning: {
                    backgroundColor: '#fff3cd',
                    borderColor: '#ffeaa7',
                    color: '#856404'
                },
                info: {
                    backgroundColor: '#d1ecf1',
                    borderColor: '#bee5eb',
                    color: '#0c5460'
                }
            };
            
            if (levelStyles[level]) {
                element.css(levelStyles[level]);
            }
            
            // Bind close event
            element.find('.las-notification-close').on('click', () => {
                this.closeNotification(notification);
            });
            
            notification.element = element;
            
            return notification;
        }
        
        /**
         * Setup notification system
         */
        setupNotificationSystem() {
            // Create notification container if it doesn't exist
            if (!$('#las-notification-container').length) {
                $('body').append('<div id="las-notification-container"></div>');
            }
            
            // Add CSS styles
            this.addNotificationStyles();
        }
        
        /**
         * Add notification CSS styles
         */
        addNotificationStyles() {
            if ($('#las-error-handler-styles').length) {
                return;
            }
            
            const styles = `
                <style id="las-error-handler-styles">
                    .las-notification {
                        border: 1px solid;
                        margin-bottom: 10px;
                        animation: las-notification-slide-in 0.3s ease-out;
                    }
                    
                    .las-notification-content {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .las-notification-message {
                        flex: 1;
                    }
                    
                    .las-notification-close {
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        padding: 0;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .las-notification-close:hover {
                        opacity: 0.7;
                    }
                    
                    @keyframes las-notification-slide-in {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes las-notification-slide-out {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                </style>
            `;
            
            $('head').append(styles);
        }
        
        /**
         * Process notification queue
         */
        processNotificationQueue() {
            if (this.notificationQueue.length === 0) {
                return;
            }
            
            const notification = this.notificationQueue.shift();
            this.showNotification(notification);
        }
        
        /**
         * Show notification
         * 
         * @param {Object} notification Notification object
         */
        showNotification(notification) {
            // Add to DOM
            $('#las-notification-container').append(notification.element);
            
            // Show with animation
            notification.element.slideDown(300);
            
            // Auto-hide after duration
            setTimeout(() => {
                this.closeNotification(notification);
            }, this.config.notificationDuration);
        }
        
        /**
         * Close notification
         * 
         * @param {Object} notification Notification object
         */
        closeNotification(notification) {
            if (notification.element) {
                notification.element.css('animation', 'las-notification-slide-out 0.3s ease-in');
                
                setTimeout(() => {
                    notification.element.remove();
                }, 300);
            }
        }
        
        /**
         * Report error to server
         * 
         * @param {Object} error Error object
         */
        reportError(error) {
            // Don't report if we're already at max errors
            if (this.errorCount >= this.config.maxErrorsPerSession) {
                return;
            }
            
            // Prepare error data for server
            const errorData = {
                ...error,
                clientInfo: {
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    screen: {
                        width: screen.width,
                        height: screen.height
                    },
                    memory: performance.memory ? {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit
                    } : null,
                    connection: navigator.connection ? {
                        effectiveType: navigator.connection.effectiveType,
                        downlink: navigator.connection.downlink,
                        rtt: navigator.connection.rtt
                    } : null
                }
            };
            
            // Send to server (don't wait for response to avoid blocking)
            $.ajax({
                url: this.config.reportingEndpoint,
                method: 'POST',
                data: JSON.stringify(errorData),
                contentType: 'application/json',
                headers: {
                    'X-WP-Nonce': lasComm.nonces.rest
                },
                timeout: 5000
            }).fail(() => {
                // Silently fail - we don't want error reporting to cause more errors
                this.log('Failed to report error to server', 'warning');
            });
        }
        
        /**
         * Bind events
         */
        bindEvents() {
            // Handle page visibility changes
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.onPageHidden();
                } else {
                    this.onPageVisible();
                }
            });
            
            // Handle page unload
            window.addEventListener('beforeunload', () => {
                this.onPageUnload();
            });
        }
        
        /**
         * Handle page hidden
         */
        onPageHidden() {
            // Clear notification queue when page is hidden
            this.notificationQueue = [];
        }
        
        /**
         * Handle page visible
         */
        onPageVisible() {
            // Resume normal operation
        }
        
        /**
         * Handle page unload
         */
        onPageUnload() {
            // Send any pending error reports
            if (this.errorHistory.length > 0) {
                // Use sendBeacon for reliable delivery
                if (navigator.sendBeacon) {
                    const data = JSON.stringify({
                        type: 'session_summary',
                        errorCount: this.errorCount,
                        errors: this.errorHistory.slice(-10) // Last 10 errors
                    });
                    
                    navigator.sendBeacon(this.config.reportingEndpoint, data);
                }
            }
        }
        
        /**
         * Utility methods
         */
        
        /**
         * Generate error ID
         * 
         * @returns {string} Error ID
         */
        generateErrorId() {
            return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        /**
         * Get session ID
         * 
         * @returns {string} Session ID
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
         * Log message
         * 
         * @param {string} message Log message
         * @param {string} level Log level
         * @param {*} data Additional data
         */
        log(message, level = 'info', data = null) {
            if (this.config.debugMode || level === 'error') {
                const logMethod = console[level] || console.log;
                
                if (data) {
                    logMethod('[LAS ErrorHandler]', message, data);
                } else {
                    logMethod('[LAS ErrorHandler]', message);
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
            $(document).trigger('las:error:' + event, [data]);
        }
        
        /**
         * Get error statistics
         * 
         * @returns {Object} Error statistics
         */
        getStatistics() {
            return {
                errorCount: this.errorCount,
                errorHistory: this.errorHistory,
                notificationQueue: this.notificationQueue.length,
                sessionId: this.getSessionId(),
                isInitialized: this.isInitialized
            };
        }
        
        /**
         * Clear error history
         */
        clearHistory() {
            this.errorHistory = [];
            this.errorCount = 0;
        }
        
        /**
         * Test error handling
         */
        testErrorHandling() {
            // Test JavaScript error
            setTimeout(() => {
                throw new Error('Test JavaScript error from ErrorHandler');
            }, 100);
            
            // Test promise rejection
            setTimeout(() => {
                Promise.reject(new Error('Test promise rejection from ErrorHandler'));
            }, 200);
            
            // Test AJAX error
            setTimeout(() => {
                $.ajax({
                    url: '/non-existent-endpoint',
                    method: 'POST'
                });
            }, 300);
        }
    }
    
    // Create global instance
    window.LAS = window.LAS || {};
    window.LAS.ErrorHandler = new ErrorHandler(window.lasErrorConfig || {});
    
    // jQuery plugin
    $.fn.lasError = function(message, level = 'error') {
        window.LAS.ErrorHandler.handleError({
            type: 'manual',
            message: message,
            level: level,
            element: this[0]
        });
        
        return this;
    };
    
})(jQuery);