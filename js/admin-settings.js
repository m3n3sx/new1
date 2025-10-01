/**
 * Live Admin Styler - Core Manager
 * Handles initialization and coordination of all live preview components
 */

// Global namespace for LAS
window.LAS = window.LAS || {};

/**
 * Core Manager Class
 * Central orchestrator for all live preview functionality
 */
class LASCoreManager {
    constructor() {
        this.modules = new Map();
        this.config = window.lasAdminData || {};
        this.initialized = false;
        this.eventListeners = new Map();
        this.initializationPromise = null;
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.handleError = this.handleError.bind(this);
        this.emit = this.emit.bind(this);
        this.get = this.get.bind(this);
    }
    
    /**
     * Initialize the core manager and all modules
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._performInit();
        return this.initializationPromise;
    }
    
    /**
     * Internal initialization method
     * @private
     */
    async _performInit() {
        try {
            console.log('LAS: Starting Core Manager initialization...');
            
            // Validate configuration
            if (!this.config || !this.config.ajax_url) {
                throw new Error('LAS configuration is missing or invalid');
            }
            
            // Initialize browser compatibility first
            this.modules.set('compatibility', new BrowserCompatibility());
            await this.modules.get('compatibility').loadPolyfills();
            
            // Show compatibility warning if needed
            if (!this.modules.get('compatibility').isBrowserSupported()) {
                this.modules.get('compatibility').showCompatibilityWarning();
            }
            
            // Initialize error handler first (critical for error recovery)
            this.modules.set('error', new LASErrorHandler(this));
            await this._initializeModule('error');
            
            // Initialize other core modules in dependency order
            const moduleInitOrder = [
                { name: 'performance', class: LASPerformanceMonitor },
                { name: 'memory', class: LASMemoryManager },
                { name: 'ajax', class: LASEnhancedAjaxManager },
                { name: 'settings', class: LASSettingsManager },
                { name: 'preview', class: LASLivePreviewEngine }
            ];
            
            for (const moduleInfo of moduleInitOrder) {
                try {
                    if (typeof moduleInfo.class !== 'undefined') {
                        this.modules.set(moduleInfo.name, new moduleInfo.class(this));
                        await this._initializeModule(moduleInfo.name);
                        console.log(`LAS: ${moduleInfo.name} module initialized successfully`);
                    } else {
                        console.warn(`LAS: ${moduleInfo.class.name} class not found, skipping ${moduleInfo.name} module`);
                    }
                } catch (error) {
                    console.error(`LAS: Failed to initialize ${moduleInfo.name} module:`, error);
                    this.handleError(error, `Failed to initialize ${moduleInfo.name} module`);
                }
            }
            
            // Bind form elements after all modules are ready
            this.bindFormElements();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            // Mark as initialized
            this.initialized = true;
            
            // Emit ready event
            this.emit('core:ready', {
                timestamp: Date.now(),
                modules: Array.from(this.modules.keys())
            });
            
            console.log('LAS: Core Manager initialization complete');
            console.log('LAS: Initialized modules:', Array.from(this.modules.keys()));
            
        } catch (error) {
            console.error('LAS: Core Manager initialization failed:', error);
            this.handleError(error, 'Core Manager initialization failed');
            throw error;
        }
    }
    
    /**
     * Initialize a specific module with error handling
     * @private
     */
    async _initializeModule(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }
        
        if (typeof module.init === 'function') {
            await module.init();
        }
    }
    
    /**
     * Get a module instance
     * @param {string} moduleName - Name of the module
     * @returns {Object|null} Module instance or null if not found
     */
    get(moduleName) {
        return this.modules.get(moduleName) || null;
    }
    
    /**
     * Check if the core manager is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Emit a custom event
     * @param {string} eventName - Name of the event
     * @param {*} data - Event data
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { 
            detail: data,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
        
        // Also log in debug mode
        if (this.config.debug) {
            console.log(`LAS Event: ${eventName}`, data);
        }
    }
    
    /**
     * Listen to an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Event callback
     * @param {Object} options - Event listener options
     */
    on(eventName, callback, options = {}) {
        const listener = (event) => callback(event.detail, event);
        document.addEventListener(eventName, listener, options);
        
        // Store listener for cleanup
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push({ callback, listener, options });
    }
    
    /**
     * Remove event listener
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Original callback function
     */
    off(eventName, callback) {
        const listeners = this.eventListeners.get(eventName);
        if (!listeners) return;
        
        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
            const { listener } = listeners[index];
            document.removeEventListener(eventName, listener);
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Handle errors with proper logging and user feedback
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred
     */
    handleError(error, context = 'Unknown') {
        console.error(`LAS Error [${context}]:`, error);
        
        // Try to show user feedback if error handler is available
        const errorHandler = this.get('error');
        if (errorHandler && typeof errorHandler.showError === 'function') {
            errorHandler.showError(`${context}: ${error.message}`);
        }
        
        // Emit error event for other components to handle
        this.emit('core:error', {
            error: error,
            context: context,
            timestamp: Date.now()
        });
    }
    
    /**
     * Bind form elements to the live preview system
     */
    bindFormElements() {
        try {
            console.log('LAS: Binding form elements...');
            
            const settingsManager = this.get('settings');
            if (!settingsManager) {
                console.warn('LAS: Settings manager not available, skipping form binding');
                return;
            }
            
            // Initialize form element binding system
            this.formElementBinder = new LASFormElementBinder(this, settingsManager);
            this.formElementBinder.bindAllElements();
            
            console.log('LAS: Form elements bound successfully');
            
        } catch (error) {
            this.handleError(error, 'Form element binding');
        }
    }
    
    /**
     * Bind color picker elements
     * @private
     */
    bindColorPickers(settingsManager) {
        const colorPickers = document.querySelectorAll('input[type="color"], .las-color-picker');
        
        colorPickers.forEach(picker => {
            const settingKey = picker.dataset.setting || picker.name;
            if (!settingKey) return;
            
            // Immediate update on change
            picker.addEventListener('change', (e) => {
                settingsManager.set(settingKey, e.target.value);
            });
            
            // Real-time update on input (for smooth color transitions)
            picker.addEventListener('input', (e) => {
                settingsManager.set(settingKey, e.target.value, { skipSave: true });
            });
        });
    }
    
    /**
     * Bind text input elements with debouncing
     * @private
     */
    bindTextInputs(settingsManager) {
        const textInputs = document.querySelectorAll('input[type="text"], input[type="url"], textarea');
        
        textInputs.forEach(input => {
            const settingKey = input.dataset.setting || input.name;
            if (!settingKey) return;
            
            let debounceTimer;
            
            input.addEventListener('input', (e) => {
                // Clear existing timer
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                // Set new timer for debounced update
                debounceTimer = setTimeout(() => {
                    settingsManager.set(settingKey, e.target.value);
                }, 300);
            });
        });
    }
    
    /**
     * Bind slider and range input elements
     * @private
     */
    bindSliders(settingsManager) {
        const sliders = document.querySelectorAll('input[type="range"], .las-slider');
        
        sliders.forEach(slider => {
            const settingKey = slider.dataset.setting || slider.name;
            if (!settingKey) return;
            
            // Immediate update on input for smooth sliding
            slider.addEventListener('input', (e) => {
                settingsManager.set(settingKey, e.target.value, { skipSave: true });
            });
            
            // Save on change (when user releases slider)
            slider.addEventListener('change', (e) => {
                settingsManager.set(settingKey, e.target.value);
            });
        });
    }
    
    /**
     * Bind toggle and checkbox elements
     * @private
     */
    bindToggles(settingsManager) {
        const toggles = document.querySelectorAll('input[type="checkbox"], .las-toggle');
        
        toggles.forEach(toggle => {
            const settingKey = toggle.dataset.setting || toggle.name;
            if (!settingKey) return;
            
            toggle.addEventListener('change', (e) => {
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                settingsManager.set(settingKey, value);
            });
        });
    }
    
    /**
     * Bind dropdown/select elements
     * @private
     */
    bindDropdowns(settingsManager) {
        const dropdowns = document.querySelectorAll('select, .las-dropdown');
        
        dropdowns.forEach(dropdown => {
            const settingKey = dropdown.dataset.setting || dropdown.name;
            if (!settingKey) return;
            
            dropdown.addEventListener('change', (e) => {
                settingsManager.set(settingKey, e.target.value);
            });
        });
    }
    
    /**
     * Set up global event listeners
     * @private
     */
    setupGlobalEventListeners() {
        // Listen for page unload to cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Listen for visibility changes to pause/resume operations
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.emit('core:hidden');
            } else {
                this.emit('core:visible');
            }
        });
        
        // Listen for online/offline status
        window.addEventListener('online', () => {
            this.emit('core:online');
        });
        
        window.addEventListener('offline', () => {
            this.emit('core:offline');
        });
    }
    
    /**
     * Clean up resources and event listeners
     */
    cleanup() {
        console.log('LAS: Cleaning up Core Manager...');
        
        try {
            // Cleanup all modules
            for (const [name, module] of this.modules) {
                if (typeof module.cleanup === 'function') {
                    module.cleanup();
                }
            }
            
            // Clear event listeners
            for (const [eventName, listeners] of this.eventListeners) {
                listeners.forEach(({ listener }) => {
                    document.removeEventListener(eventName, listener);
                });
            }
            this.eventListeners.clear();
            
            // Clear modules
            this.modules.clear();
            
            // Reset state
            this.initialized = false;
            this.initializationPromise = null;
            
            console.log('LAS: Core Manager cleanup complete');
            
        } catch (error) {
            console.error('LAS: Error during cleanup:', error);
        }
    }
}

/**
 * Error Handler Class
 * Provides comprehensive error handling and user feedback systems
 */
class LASErrorHandler {
    constructor(core) {
        this.core = core;
        this.notificationContainer = null;
        this.loadingIndicator = null;
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.handleError = this.handleError.bind(this);
        this.showNotification = this.showNotification.bind(this);
        this.showSuccess = this.showSuccess.bind(this);
        this.showError = this.showError.bind(this);
        this.showWarning = this.showWarning.bind(this);
        this.showInfo = this.showInfo.bind(this);
        this.showLoading = this.showLoading.bind(this);
    }
    
    /**
     * Initialize the error handler
     */
    async init() {
        try {
            console.log('LAS: Initializing Error Handler...');
            
            this.createNotificationContainer();
            this.createLoadingIndicator();
            this.injectStyles();
            this.bindGlobalErrorHandlers();
            this.setupKeyboardShortcuts();
            
            console.log('LAS: Error Handler initialized successfully');
            
        } catch (error) {
            console.error('LAS: Failed to initialize Error Handler:', error);
            throw error;
        }
    }
    
    /**
     * Create the notification container
     * @private
     */
    createNotificationContainer() {
        if (this.notificationContainer) return;
        
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'las-notifications';
        this.notificationContainer.className = 'las-notifications-container';
        this.notificationContainer.setAttribute('role', 'alert');
        this.notificationContainer.setAttribute('aria-live', 'polite');
        
        document.body.appendChild(this.notificationContainer);
    }
    
    /**
     * Create the loading indicator
     * @private
     */
    createLoadingIndicator() {
        if (this.loadingIndicator) return;
        
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.id = 'las-loading';
        this.loadingIndicator.className = 'las-loading hidden';
        this.loadingIndicator.innerHTML = `
            <div class="las-spinner"></div>
            <span class="las-loading-text">Processing...</span>
        `;
        
        document.body.appendChild(this.loadingIndicator);
    }
    
    /**
     * Inject CSS styles for notifications and loading indicators
     * @private
     */
    injectStyles() {
        if (document.getElementById('las-error-handler-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'las-error-handler-styles';
        styles.textContent = `
            .las-notifications-container {
                position: fixed;
                top: 32px;
                right: 20px;
                z-index: 999999;
                max-width: 400px;
                pointer-events: none;
            }
            
            .las-notification {
                background: #fff;
                border-left: 4px solid #0073aa;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                margin-bottom: 10px;
                padding: 12px 16px;
                border-radius: 4px;
                pointer-events: auto;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                position: relative;
                word-wrap: break-word;
                max-width: 100%;
            }
            
            .las-notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .las-notification.error {
                border-left-color: #dc3232;
            }
            
            .las-notification.warning {
                border-left-color: #ffb900;
            }
            
            .las-notification.success {
                border-left-color: #46b450;
            }
            
            .las-notification.info {
                border-left-color: #00a0d2;
            }
            
            .las-notification__content {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            
            .las-notification__message {
                font-size: 14px;
                color: #23282d;
                margin: 0;
                line-height: 1.4;
                flex: 1;
            }
            
            .las-notification__close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                margin-left: 10px;
                line-height: 1;
                flex-shrink: 0;
            }
            
            .las-notification__close:hover {
                color: #000;
            }
            
            .las-notification__actions {
                margin-top: 8px;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .las-notification__action {
                background: #0073aa;
                color: #fff;
                border: none;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 12px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
            }
            
            .las-notification__action:hover {
                background: #005a87;
                color: #fff;
            }
            
            .las-notification__action.secondary {
                background: #f1f1f1;
                color: #555;
            }
            
            .las-notification__action.secondary:hover {
                background: #e1e1e1;
                color: #000;
            }
            
            .las-loading {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 20px;
                z-index: 1000000;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .las-loading.hidden {
                display: none;
            }
            
            .las-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #0073aa;
                border-radius: 50%;
                animation: las-spin 1s linear infinite;
            }
            
            @keyframes las-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .las-loading-text {
                font-size: 14px;
                color: #23282d;
            }
            
            @media (max-width: 782px) {
                .las-notifications-container {
                    top: 46px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Bind global error handlers
     * @private
     */
    bindGlobalErrorHandlers() {
        // Global JavaScript error handler
        window.addEventListener('error', (event) => {
            // Only handle LAS-related errors
            if (event.filename && event.filename.includes('live-admin-styler')) {
                this.handleGlobalError({
                    message: event.message,
                    source: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    error: event.error,
                    type: 'javascript'
                });
            }
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                message: event.reason ? event.reason.toString() : 'Unhandled promise rejection',
                source: 'promise',
                type: 'promise',
                error: event.reason
            });
        });
    }
    
    /**
     * Set up keyboard shortcuts for error management
     * @private
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC key to dismiss all notifications
            if (e.keyCode === 27) {
                this.dismissAll();
            }
        });
    }
    
    /**
     * Handle global errors
     * @private
     */
    handleGlobalError(errorInfo) {
        console.error('LAS Global Error:', errorInfo);
        
        // Show user-friendly notification
        this.showError('An unexpected error occurred', {
            details: errorInfo.message,
            persistent: true
        });
        
        // Emit error event for logging
        if (this.core) {
            this.core.emit('error:global', errorInfo);
        }
    }
    
    /**
     * Handle errors with proper logging and user feedback
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred
     */
    handleError(error, context = 'Unknown') {
        console.error(`LAS Error [${context}]:`, error);
        
        this.showError(`${context}: ${error.message}`, {
            persistent: true
        });
        
        // Emit error event
        if (this.core) {
            this.core.emit('error:handled', {
                error: error,
                context: context,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - The notification type (success, error, warning, info)
     * @param {Object} options - Additional options
     */
    showNotification(message, type = 'info', options = {}) {
        const {
            duration = this.defaultDuration,
            persistent = false,
            actions = [],
            details = null
        } = options;
        
        // Remove oldest notification if we have too many
        if (this.notifications.length >= this.maxNotifications) {
            const oldest = this.notifications.shift();
            this.removeNotification(oldest.element);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `las-notification las-notification--${type}`;
        
        // Build notification content
        let content = `
            <div class="las-notification__content">
                <div class="las-notification__message">
                    ${this.escapeHtml(message)}
                    ${details ? `<br><small>${this.escapeHtml(details)}</small>` : ''}
                </div>
                <button class="las-notification__close" aria-label="Close">&times;</button>
            </div>
        `;
        
        // Add actions if provided
        if (actions.length > 0) {
            content += '<div class="las-notification__actions">';
            actions.forEach(action => {
                const className = action.secondary ? 'las-notification__action secondary' : 'las-notification__action';
                content += `<button class="${className}" data-action="${action.id || ''}">${this.escapeHtml(action.text)}</button>`;
            });
            content += '</div>';
        }
        
        notification.innerHTML = content;
        
        // Add close functionality
        const closeBtn = notification.querySelector('.las-notification__close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Add action functionality
        actions.forEach(action => {
            const actionBtn = notification.querySelector(`[data-action="${action.id || ''}"]`);
            if (actionBtn && typeof action.callback === 'function') {
                actionBtn.addEventListener('click', () => {
                    action.callback();
                    if (!action.keepOpen) {
                        this.removeNotification(notification);
                    }
                });
            }
        });
        
        // Add to container
        this.notificationContainer.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Store notification
        const notificationObj = {
            element: notification,
            type: type,
            timestamp: Date.now()
        };
        this.notifications.push(notificationObj);
        
        // Auto-remove after duration (unless persistent)
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
        
        return notificationObj;
    }
    
    /**
     * Remove a notification
     * @param {HTMLElement} notification - The notification element to remove
     */
    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            // Remove from notifications array
            const index = this.notifications.findIndex(n => n.element === notification);
            if (index !== -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }
    
    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     */
    showSuccess(message, options = {}) {
        return this.showNotification(message, 'success', options);
    }
    
    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     */
    showError(message, options = {}) {
        return this.showNotification(message, 'error', {
            persistent: true,
            ...options
        });
    }
    
    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     */
    showWarning(message, options = {}) {
        return this.showNotification(message, 'warning', options);
    }
    
    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     */
    showInfo(message, options = {}) {
        return this.showNotification(message, 'info', options);
    }
    
    /**
     * Show loading indicator
     * @param {boolean} show - Whether to show or hide the loading indicator
     * @param {string} message - Optional loading message
     */
    showLoading(show, message = 'Processing...') {
        if (!this.loadingIndicator) return;
        
        if (show) {
            const textElement = this.loadingIndicator.querySelector('.las-loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            this.loadingIndicator.classList.remove('hidden');
        } else {
            this.loadingIndicator.classList.add('hidden');
        }
    }
    
    /**
     * Dismiss all notifications
     */
    dismissAll() {
        this.notifications.forEach(notification => {
            this.removeNotification(notification.element);
        });
    }
    
    /**
     * Escape HTML to prevent XSS
     * @private
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        console.log('LAS: Cleaning up Error Handler...');
        
        try {
            // Remove all notifications
            this.dismissAll();
            
            // Remove containers
            if (this.notificationContainer && this.notificationContainer.parentNode) {
                this.notificationContainer.parentNode.removeChild(this.notificationContainer);
            }
            
            if (this.loadingIndicator && this.loadingIndicator.parentNode) {
                this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
            }
            
            // Remove styles
            const styles = document.getElementById('las-error-handler-styles');
            if (styles && styles.parentNode) {
                styles.parentNode.removeChild(styles);
            }
            
            // Clear references
            this.notificationContainer = null;
            this.loadingIndicator = null;
            this.notifications = [];
            
            console.log('LAS: Error Handler cleanup complete');
            
        } catch (error) {
            console.error('LAS: Error during Error Handler cleanup:', error);
        }
    }
}

/**
 * Enhanced AJAX Manager Class
 * Integrates with the new enterprise-grade AJAX communication system
 * Provides retry logic, error handling, queue management, and user feedback
 */
class LASEnhancedAjaxManager {
    constructor(core) {
        this.core = core;
        this.requestQueue = [];
        this.isProcessing = false;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.baseDelay = 1000; // 1 second base delay for exponential backoff
        this.timeout = 10000; // 10 second timeout
        this.requestHistory = [];
        this.maxHistorySize = 50;
        this.abortControllers = new Map();
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.loadSettings = this.loadSettings.bind(this);
        this.queueRequest = this.queueRequest.bind(this);
        this.processQueue = this.processQueue.bind(this);
        this.executeRequest = this.executeRequest.bind(this);
        this.handleRequestError = this.handleRequestError.bind(this);
        this.cleanup = this.cleanup.bind(this);
    }
    
    /**
     * Initialize the enhanced AJAX manager with new modules
     */
    async init() {
        try {
            console.log('LAS: Initializing Enhanced AJAX Manager...');
            
            // Validate configuration
            if (!this.core.config.ajax_url) {
                throw new Error('AJAX URL not configured');
            }
            
            if (!this.core.config.nonce) {
                throw new Error('Security nonce not configured');
            }
            
            // Initialize enhanced modules if available
            await this.initializeEnhancedModules();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Test connection with retry logic
            await this.testConnectionWithRetry();
            
            console.log('LAS: Enhanced AJAX Manager initialized successfully');
            
        } catch (error) {
            console.error('LAS: Failed to initialize Enhanced AJAX Manager:', error);
            throw error;
        }
    }
    
    /**
     * Initialize enhanced AJAX modules if available
     */
    async initializeEnhancedModules() {
        try {
            // Initialize AjaxManager from the new module system
            if (typeof AjaxManager !== 'undefined') {
                this.ajaxManager = new AjaxManager(this.core);
                await this.ajaxManager.init();
                console.log('LAS: Enhanced AjaxManager module loaded');
            }
            
            // Initialize RequestQueue
            if (typeof RequestQueue !== 'undefined') {
                this.requestQueue = new RequestQueue({
                    maxConcurrent: 5,
                    maxQueueSize: 100,
                    enablePersistence: true
                });
                console.log('LAS: RequestQueue module loaded');
            }
            
            // Initialize RetryEngine
            if (typeof RetryEngine !== 'undefined') {
                this.retryEngine = new RetryEngine({
                    maxRetries: this.maxRetries,
                    baseDelay: this.baseDelay,
                    maxDelay: 30000
                });
                console.log('LAS: RetryEngine module loaded');
            }
            
            // Initialize HTTPTransport
            if (typeof HTTPTransport !== 'undefined') {
                this.httpTransport = new HTTPTransport({
                    timeout: this.timeout,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                console.log('LAS: HTTPTransport module loaded');
            }
            
        } catch (error) {
            console.warn('LAS: Enhanced modules not available, falling back to basic implementation:', error.message);
        }
    }
    
    /**
     * Set up event listeners
     * @private
     */
    setupEventListeners() {
        // Listen for online/offline status
        this.core.on('core:online', () => {
            console.log('LAS: Connection restored, processing queued requests');
            this.processQueue();
        });
        
        this.core.on('core:offline', () => {
            console.log('LAS: Connection lost, requests will be queued');
            this.core.get('error')?.showWarning('Connection lost. Changes will be saved when connection is restored.');
        });
        
        // Listen for page visibility changes
        this.core.on('core:hidden', () => {
            // Pause processing when page is hidden
            this.pauseProcessing = true;
        });
        
        this.core.on('core:visible', () => {
            // Resume processing when page becomes visible
            this.pauseProcessing = false;
            this.processQueue();
        });
    }
    
    /**
     * Test connection to server
     * @private
     */
    async testConnection() {
        try {
            const response = await fetch(this.core.config.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'las_test_connection',
                    nonce: this.core.config.nonce
                }),
                signal: AbortSignal.timeout(5000) // 5 second timeout for test
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.status}`);
            }
            
            console.log('LAS: AJAX connection test successful');
            
        } catch (error) {
            console.warn('LAS: AJAX connection test failed:', error.message);
            // Don't throw here - connection might work for actual requests
        }
    }
    
    /**
     * Test connection with retry logic using enhanced modules
     * @private
     */
    async testConnectionWithRetry() {
        if (this.retryEngine && this.httpTransport) {
            // Use enhanced modules for connection test with retry
            try {
                await this.retryEngine.executeWithRetry(async () => {
                    return await this.httpTransport.sendRequest({
                        url: this.core.config.ajax_url,
                        method: 'POST',
                        data: {
                            action: 'las_health_check',
                            nonce: this.core.config.nonce
                        },
                        timeout: 5000
                    });
                });
                console.log('LAS: Enhanced connection test successful');
            } catch (error) {
                console.warn('LAS: Enhanced connection test failed, falling back to basic test:', error.message);
                await this.testConnection();
            }
        } else {
            // Fallback to basic connection test
            await this.testConnection();
        }
    }
    
    /**
     * Save settings to server with enhanced retry logic
     * @param {Object} settings - Settings object to save
     * @param {Object} options - Additional options
     * @returns {Promise} Promise that resolves when settings are saved
     */
    async saveSettings(settings, options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_save_settings',
            data: settings,
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'save_settings',
            priority: options.priority || 'normal',
            ...options
        };
        
        // Use enhanced AJAX manager if available
        if (this.ajaxManager && typeof this.ajaxManager.request === 'function') {
            try {
                return await this.ajaxManager.request('las_save_settings', {
                    settings: JSON.stringify(settings),
                    nonce: this.core.config.nonce
                }, {
                    priority: options.priority || 'normal',
                    retries: this.maxRetries,
                    timeout: this.timeout
                });
            } catch (error) {
                console.warn('LAS: Enhanced AJAX manager failed, falling back to queue system:', error.message);
            }
        }
        
        // Fallback to existing queue system
        return this.queueRequest(request);
    }
    
    /**
     * Load settings from server with enhanced retry logic
     * @param {Object} options - Additional options
     * @returns {Promise} Promise that resolves with loaded settings
     */
    async loadSettings(options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_load_settings',
            data: {},
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'load_settings',
            priority: options.priority || 'high',
            ...options
        };
        
        // Use enhanced AJAX manager if available
        if (this.ajaxManager && typeof this.ajaxManager.request === 'function') {
            try {
                const response = await this.ajaxManager.request('las_load_settings', {
                    nonce: this.core.config.nonce
                }, {
                    priority: options.priority || 'high',
                    retries: this.maxRetries,
                    timeout: this.timeout
                });
                
                return response.data?.settings || response.data || {};
            } catch (error) {
                console.warn('LAS: Enhanced AJAX manager failed, falling back to queue system:', error.message);
            }
        }
        
        // Fallback to existing queue system
        return this.queueRequest(request);
    }
    
    /**
     * Reset settings on server
     * @param {Object} options - Additional options
     * @returns {Promise} Promise that resolves when settings are reset
     */
    async resetSettings(options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_reset_settings',
            data: {},
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'reset_settings',
            priority: options.priority || 'high',
            ...options
        };
        
        return this.queueRequest(request);
    }
    
    /**
     * Export settings from server
     * @param {Object} options - Additional options
     * @returns {Promise} Promise that resolves with exported settings
     */
    async exportSettings(options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_export_settings',
            data: {},
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'export_settings',
            priority: options.priority || 'normal',
            ...options
        };
        
        return this.queueRequest(request);
    }
    
    /**
     * Import settings to server
     * @param {Object} settings - Settings to import
     * @param {Object} options - Additional options
     * @returns {Promise} Promise that resolves when settings are imported
     */
    async importSettings(settings, options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_import_settings',
            data: { settings },
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'import_settings',
            priority: options.priority || 'high',
            ...options
        };
        
        return this.queueRequest(request);
    }
    
    /**
     * Queue a request for processing
     * @param {Object} request - Request object
     * @returns {Promise} Promise that resolves when request is complete
     */
    queueRequest(request) {
        return new Promise((resolve, reject) => {
            // Add promise handlers to request
            request.resolve = resolve;
            request.reject = reject;
            
            // Check for duplicate requests (deduplication)
            const existingRequest = this.requestQueue.find(r => 
                r.action === request.action && 
                r.type === request.type &&
                JSON.stringify(r.data) === JSON.stringify(request.data)
            );
            
            if (existingRequest) {
                console.log('LAS: Deduplicating request:', request.type);
                // Replace the existing request's promise handlers
                const originalResolve = existingRequest.resolve;
                const originalReject = existingRequest.reject;
                
                existingRequest.resolve = (result) => {
                    originalResolve(result);
                    resolve(result);
                };
                
                existingRequest.reject = (error) => {
                    originalReject(error);
                    reject(error);
                };
                
                return;
            }
            
            // Add to queue based on priority
            if (request.priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }
            
            // Log request
            this.logRequest(request, 'queued');
            
            // Start processing
            this.processQueue();
        });
    }
    
    /**
     * Process the request queue
     * @private
     */
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0 || this.pauseProcessing) {
            return;
        }
        
        // Check if we're online
        if (!navigator.onLine) {
            console.log('LAS: Offline, delaying request processing');
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.requestQueue.length > 0 && !this.pauseProcessing) {
                const request = this.requestQueue.shift();
                
                try {
                    console.log(`LAS: Processing request: ${request.type} (${request.id})`);
                    
                    const result = await this.executeRequest(request);
                    
                    // Resolve the promise
                    request.resolve(result);
                    
                    // Reset retry count on success
                    this.retryAttempts.delete(request.id);
                    
                    // Log success
                    this.logRequest(request, 'success', result);
                    
                } catch (error) {
                    console.error(`LAS: Request failed: ${request.type} (${request.id})`, error);
                    
                    // Handle error (includes retry logic)
                    await this.handleRequestError(request, error);
                }
                
                // Small delay between requests to prevent overwhelming the server
                await this.delay(100);
            }
        } finally {
            this.isProcessing = false;
        }
        
        // If there are still requests in queue, schedule another processing cycle
        if (this.requestQueue.length > 0 && !this.pauseProcessing) {
            setTimeout(() => this.processQueue(), 1000);
        }
    }
    
    /**
     * Execute a single request
     * @private
     */
    async executeRequest(request) {
        // Show loading indicator
        const errorHandler = this.core.get('error');
        if (errorHandler) {
            errorHandler.showLoading(true, this.getLoadingMessage(request.type));
        }
        
        // Create abort controller for this request
        const abortController = new AbortController();
        this.abortControllers.set(request.id, abortController);
        
        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('action', request.action);
            formData.append('nonce', request.nonce);
            
            // Add request data
            if (request.data && Object.keys(request.data).length > 0) {
                if (request.type === 'save_settings' || request.type === 'import_settings') {
                    formData.append('settings', JSON.stringify(request.data));
                } else {
                    Object.keys(request.data).forEach(key => {
                        formData.append(key, request.data[key]);
                    });
                }
            }
            
            // Make the request
            const response = await fetch(this.core.config.ajax_url, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                signal: abortController.signal
            });
            
            // Check if request was aborted
            if (abortController.signal.aborted) {
                throw new Error('Request was aborted');
            }
            
            // Check response status
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Parse JSON response
            const result = await response.json();
            
            // Check for WordPress AJAX success/error format
            if (result.success === false) {
                throw new Error(result.data || 'Unknown server error');
            }
            
            // Show success feedback for user-initiated actions
            if (errorHandler && this.shouldShowSuccessMessage(request.type)) {
                errorHandler.showSuccess(this.getSuccessMessage(request.type));
            }
            
            return result.data || result;
            
        } finally {
            // Hide loading indicator
            if (errorHandler) {
                errorHandler.showLoading(false);
            }
            
            // Clean up abort controller
            this.abortControllers.delete(request.id);
        }
    }
    
    /**
     * Handle request errors with retry logic
     * @private
     */
    async handleRequestError(request, error) {
        const retryCount = this.retryAttempts.get(request.id) || 0;
        const errorHandler = this.core.get('error');
        
        // Log error
        this.logRequest(request, 'error', error);
        
        if (retryCount < this.maxRetries && this.shouldRetry(error)) {
            // Calculate delay with exponential backoff
            const delay = this.baseDelay * Math.pow(2, retryCount);
            this.retryAttempts.set(request.id, retryCount + 1);
            
            console.log(`LAS: Retrying request ${request.id} in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
            
            // Show retry notification
            if (errorHandler) {
                errorHandler.showWarning(`Request failed, retrying in ${Math.ceil(delay/1000)}s... (${retryCount + 1}/${this.maxRetries})`);
            }
            
            // Schedule retry
            setTimeout(() => {
                this.requestQueue.unshift(request); // Add back to front of queue
                this.processQueue();
            }, delay);
            
        } else {
            // Max retries exceeded or non-retryable error
            this.retryAttempts.delete(request.id);
            
            // Show error notification
            if (errorHandler) {
                const errorMessage = this.getErrorMessage(request.type, error);
                errorHandler.showError(errorMessage, {
                    details: error.message,
                    actions: this.getErrorActions(request, error)
                });
            }
            
            // Reject the promise
            request.reject(error);
        }
    }
    
    /**
     * Determine if an error should trigger a retry
     * @private
     */
    shouldRetry(error) {
        // Don't retry on certain error types
        const nonRetryableErrors = [
            'Security check failed',
            'Insufficient permissions',
            'Invalid nonce',
            'Request was aborted'
        ];
        
        return !nonRetryableErrors.some(msg => error.message.includes(msg));
    }
    
    /**
     * Get loading message for request type
     * @private
     */
    getLoadingMessage(requestType) {
        const messages = {
            'save_settings': 'Saving settings...',
            'load_settings': 'Loading settings...',
            'reset_settings': 'Resetting settings...',
            'export_settings': 'Exporting settings...',
            'import_settings': 'Importing settings...'
        };
        
        return messages[requestType] || 'Processing...';
    }
    
    /**
     * Get success message for request type
     * @private
     */
    getSuccessMessage(requestType) {
        const messages = {
            'save_settings': 'Settings saved successfully',
            'reset_settings': 'Settings reset successfully',
            'import_settings': 'Settings imported successfully'
        };
        
        return messages[requestType] || 'Operation completed successfully';
    }
    
    /**
     * Get error message for request type
     * @private
     */
    getErrorMessage(requestType, error) {
        const messages = {
            'save_settings': 'Failed to save settings',
            'load_settings': 'Failed to load settings',
            'reset_settings': 'Failed to reset settings',
            'export_settings': 'Failed to export settings',
            'import_settings': 'Failed to import settings'
        };
        
        return messages[requestType] || 'Operation failed';
    }
    
    /**
     * Determine if success message should be shown
     * @private
     */
    shouldShowSuccessMessage(requestType) {
        // Don't show success messages for background operations
        const backgroundTypes = ['load_settings'];
        return !backgroundTypes.includes(requestType);
    }
    
    /**
     * Get error actions for request type
     * @private
     */
    getErrorActions(request, error) {
        const actions = [];
        
        // Add retry action for retryable errors
        if (this.shouldRetry(error)) {
            actions.push({
                id: 'retry',
                text: 'Retry',
                callback: () => {
                    this.retryAttempts.delete(request.id);
                    this.queueRequest(request);
                }
            });
        }
        
        // Add refresh action for load errors
        if (request.type === 'load_settings') {
            actions.push({
                id: 'refresh',
                text: 'Refresh Page',
                callback: () => {
                    window.location.reload();
                }
            });
        }
        
        return actions;
    }
    
    /**
     * Log request for debugging
     * @private
     */
    logRequest(request, status, result = null) {
        const logEntry = {
            id: request.id,
            type: request.type,
            action: request.action,
            status: status,
            timestamp: Date.now(),
            duration: status === 'success' || status === 'error' ? Date.now() - request.timestamp : null,
            error: status === 'error' ? result : null,
            retryCount: this.retryAttempts.get(request.id) || 0
        };
        
        // Add to history
        this.requestHistory.push(logEntry);
        
        // Limit history size
        if (this.requestHistory.length > this.maxHistorySize) {
            this.requestHistory.shift();
        }
        
        // Debug logging
        if (this.core.config.debug) {
            console.log('LAS AJAX Log:', logEntry);
        }
    }
    
    /**
     * Generate unique request ID
     * @private
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Utility function to create a delay
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Abort all pending requests
     */
    abortAllRequests() {
        console.log('LAS: Aborting all pending requests');
        
        // Abort all active requests
        for (const [requestId, controller] of this.abortControllers) {
            controller.abort();
        }
        this.abortControllers.clear();
        
        // Clear request queue
        this.requestQueue.forEach(request => {
            request.reject(new Error('Request was aborted'));
        });
        this.requestQueue = [];
        
        // Reset processing state
        this.isProcessing = false;
        this.retryAttempts.clear();
    }
    
    /**
     * Get request statistics
     */
    getStats() {
        const now = Date.now();
        const recentRequests = this.requestHistory.filter(r => now - r.timestamp < 60000); // Last minute
        
        return {
            totalRequests: this.requestHistory.length,
            recentRequests: recentRequests.length,
            queuedRequests: this.requestQueue.length,
            activeRequests: this.abortControllers.size,
            successRate: this.requestHistory.length > 0 ? 
                (this.requestHistory.filter(r => r.status === 'success').length / this.requestHistory.length) * 100 : 0,
            averageResponseTime: this.requestHistory
                .filter(r => r.duration)
                .reduce((sum, r, _, arr) => sum + r.duration / arr.length, 0)
        };
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        console.log('LAS: Cleaning up AJAX Manager...');
        
        try {
            // Abort all pending requests
            this.abortAllRequests();
            
            // Clear history
            this.requestHistory = [];
            
            // Reset state
            this.pauseProcessing = false;
            
            console.log('LAS: AJAX Manager cleanup complete');
            
        } catch (error) {
            console.error('LAS: Error during AJAX Manager cleanup:', error);
        }
    }
}

/**
 * Settings Manager Class
 * Manages setting values, persistence, and synchronization across tabs
 */
class LASSettingsManager {
    constructor(core) {
        this.core = core;
        this.settings = {};
        this.debounceTimers = new Map();
        this.localStorage = window.localStorage;
        this.broadcastChannel = null;
        this.validator = null;
        this.storageKey = 'las_settings_backup';
        this.syncKey = 'las_settings_sync';
        this.debounceDelay = 300; // 300ms debounce delay
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.set = this.set.bind(this);
        this.get = this.get.bind(this);
        this.getAll = this.getAll.bind(this);
        this.reset = this.reset.bind(this);
        this.debouncedSave = this.debouncedSave.bind(this);
        this.saveToLocalStorage = this.saveToLocalStorage.bind(this);
        this.loadFromLocalStorage = this.loadFromLocalStorage.bind(this);
        this.broadcastChange = this.broadcastChange.bind(this);
        this.handleBroadcastMessage = this.handleBroadcastMessage.bind(this);
    }
    
    /**
     * Initialize the settings manager
     */
    async init() {
        try {
            console.log('LAS: Initializing Settings Manager...');
            
            // Initialize validator
            this.validator = new LASSettingsValidator();
            
            // Initialize broadcast channel for multi-tab sync
            this.initBroadcastChannel();
            
            // Load settings from server
            await this.loadSettings();
            
            // Set up storage event listener for cross-tab sync fallback
            this.setupStorageListener();
            
            // Set up periodic sync
            this.setupPeriodicSync();
            
            console.log('LAS: Settings Manager initialized successfully');
            
        } catch (error) {
            console.error('LAS: Failed to initialize Settings Manager:', error);
            
            // Try to load from localStorage as fallback
            this.loadFromLocalStorage();
            
            throw error;
        }
    }
    
    /**
     * Initialize BroadcastChannel for multi-tab synchronization
     * @private
     */
    initBroadcastChannel() {
        if ('BroadcastChannel' in window) {
            try {
                this.broadcastChannel = new BroadcastChannel(this.syncKey);
                this.broadcastChannel.onmessage = this.handleBroadcastMessage;
                console.log('LAS: BroadcastChannel initialized for multi-tab sync');
            } catch (error) {
                console.warn('LAS: Failed to initialize BroadcastChannel:', error);
                this.broadcastChannel = null;
            }
        } else {
            console.warn('LAS: BroadcastChannel not supported, using localStorage fallback');
        }
    }
    
    /**
     * Handle broadcast messages from other tabs
     * @private
     */
    handleBroadcastMessage(event) {
        try {
            const { type, key, value, timestamp } = event.data;
            
            if (type === 'setting_changed') {
                // Update local setting without triggering save or broadcast
                this.settings[key] = value;
                
                // Trigger live preview update
                const previewEngine = this.core.get('preview');
                if (previewEngine && typeof previewEngine.updateSetting === 'function') {
                    previewEngine.updateSetting(key, value);
                }
                
                // Emit event for other components
                this.core.emit('settings:synced', { key, value, timestamp });
                
                console.log(`LAS: Setting '${key}' synced from another tab`);
            }
        } catch (error) {
            console.error('LAS: Error handling broadcast message:', error);
        }
    }
    
    /**
     * Set up storage event listener for cross-tab sync fallback
     * @private
     */
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.syncKey && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    this.handleBroadcastMessage({ data });
                } catch (error) {
                    console.error('LAS: Error parsing storage sync data:', error);
                }
            }
        });
    }
    
    /**
     * Set up periodic synchronization
     * @private
     */
    setupPeriodicSync() {
        // Sync with server every 30 seconds if there are unsaved changes
        setInterval(() => {
            if (this.debounceTimers.size > 0) {
                console.log('LAS: Periodic sync - forcing save of pending changes');
                this.forceSaveAll();
            }
        }, 30000);
    }
    
    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @param {Object} options - Options for the set operation
     */
    set(key, value, options = {}) {
        const {
            skipPreview = false,
            skipSave = false,
            skipValidation = false,
            skipBroadcast = false
        } = options;
        
        try {
            // Validate the value if validation is not skipped
            if (!skipValidation && this.validator) {
                value = this.validator.validateAndSanitize(key, value);
            }
            
            // Store previous value for comparison
            const previousValue = this.settings[key];
            
            // Update local settings
            this.settings[key] = value;
            
            // Trigger live preview update
            if (!skipPreview) {
                const previewEngine = this.core.get('preview');
                if (previewEngine && typeof previewEngine.updateSetting === 'function') {
                    previewEngine.updateSetting(key, value);
                }
            }
            
            // Debounced save to server
            if (!skipSave) {
                this.debouncedSave(key, value);
            }
            
            // Sync across tabs
            if (!skipBroadcast) {
                this.broadcastChange(key, value);
            }
            
            // Store in localStorage as backup
            this.saveToLocalStorage();
            
            // Emit change event
            this.core.emit('settings:changed', {
                key,
                value,
                previousValue,
                timestamp: Date.now()
            });
            
            console.log(`LAS: Setting '${key}' updated:`, value);
            
        } catch (error) {
            console.error(`LAS: Error setting '${key}':`, error);
            this.core.get('error')?.showError(`Failed to update setting '${key}': ${error.message}`);
        }
    }
    
    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if setting doesn't exist
     * @returns {*} Setting value
     */
    get(key, defaultValue = null) {
        return this.settings.hasOwnProperty(key) ? this.settings[key] : defaultValue;
    }
    
    /**
     * Get all settings
     * @returns {Object} All settings
     */
    getAll() {
        return { ...this.settings };
    }
    
    /**
     * Reset a setting to its default value
     * @param {string} key - Setting key
     */
    reset(key) {
        const defaultValue = this.getDefaultValue(key);
        this.set(key, defaultValue);
    }
    
    /**
     * Reset all settings to default values
     */
    resetAll() {
        const defaultSettings = this.getDefaultSettings();
        
        for (const [key, value] of Object.entries(defaultSettings)) {
            this.set(key, value, { skipBroadcast: true });
        }
        
        // Broadcast reset event
        this.broadcastChange('__reset__', true);
        
        this.core.emit('settings:reset', { timestamp: Date.now() });
    }
    
    /**
     * Debounced save to server
     * @private
     */
    debouncedSave(key, value) {
        const timerId = `save_${key}`;
        
        // Clear existing timer
        if (this.debounceTimers.has(timerId)) {
            clearTimeout(this.debounceTimers.get(timerId));
        }
        
        // Set new timer
        const timer = setTimeout(async () => {
            try {
                const ajaxManager = this.core.get('ajax');
                if (ajaxManager && typeof ajaxManager.saveSettings === 'function') {
                    await ajaxManager.saveSettings({ [key]: value });
                    console.log(`LAS: Setting '${key}' saved to server`);
                } else {
                    console.warn('LAS: AJAX manager not available, settings not saved to server');
                }
            } catch (error) {
                console.error(`LAS: Failed to save setting '${key}' to server:`, error);
                this.core.get('error')?.showError(`Failed to save setting '${key}': ${error.message}`);
            } finally {
                this.debounceTimers.delete(timerId);
            }
        }, this.debounceDelay);
        
        this.debounceTimers.set(timerId, timer);
    }
    
    /**
     * Force save all pending changes
     * @private
     */
    forceSaveAll() {
        const pendingKeys = Array.from(this.debounceTimers.keys());
        
        // Clear all timers
        for (const [timerId, timer] of this.debounceTimers) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        
        // Save all pending changes immediately
        if (pendingKeys.length > 0) {
            const settingsToSave = {};
            pendingKeys.forEach(timerId => {
                const key = timerId.replace('save_', '');
                settingsToSave[key] = this.settings[key];
            });
            
            const ajaxManager = this.core.get('ajax');
            if (ajaxManager && typeof ajaxManager.saveSettings === 'function') {
                ajaxManager.saveSettings(settingsToSave).catch(error => {
                    console.error('LAS: Failed to force save settings:', error);
                });
            }
        }
    }
    
    /**
     * Broadcast setting change to other tabs
     * @private
     */
    broadcastChange(key, value) {
        const message = {
            type: 'setting_changed',
            key,
            value,
            timestamp: Date.now()
        };
        
        // Use BroadcastChannel if available
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(message);
            } catch (error) {
                console.error('LAS: Failed to broadcast via BroadcastChannel:', error);
                this.fallbackBroadcast(message);
            }
        } else {
            this.fallbackBroadcast(message);
        }
    }
    
    /**
     * Fallback broadcast using localStorage
     * @private
     */
    fallbackBroadcast(message) {
        try {
            localStorage.setItem(this.syncKey, JSON.stringify(message));
            // Remove immediately to trigger storage event
            localStorage.removeItem(this.syncKey);
        } catch (error) {
            console.error('LAS: Failed to broadcast via localStorage:', error);
        }
    }
    
    /**
     * Save settings to localStorage as backup
     * @private
     */
    saveToLocalStorage() {
        try {
            const backup = {
                settings: this.settings,
                timestamp: Date.now(),
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(backup));
        } catch (error) {
            console.error('LAS: Failed to save to localStorage:', error);
        }
    }
    
    /**
     * Load settings from localStorage
     * @private
     */
    loadFromLocalStorage() {
        try {
            const backup = localStorage.getItem(this.storageKey);
            if (backup) {
                const data = JSON.parse(backup);
                if (data.settings && typeof data.settings === 'object') {
                    this.settings = { ...this.getDefaultSettings(), ...data.settings };
                    console.log('LAS: Settings loaded from localStorage backup');
                    return true;
                }
            }
        } catch (error) {
            console.error('LAS: Failed to load from localStorage:', error);
        }
        
        // Fallback to default settings
        this.settings = this.getDefaultSettings();
        return false;
    }
    
    /**
     * Load settings from server
     * @private
     */
    async loadSettings() {
        try {
            const ajaxManager = this.core.get('ajax');
            if (ajaxManager && typeof ajaxManager.loadSettings === 'function') {
                const serverSettings = await ajaxManager.loadSettings();
                this.settings = { ...this.getDefaultSettings(), ...serverSettings };
                console.log('LAS: Settings loaded from server');
            } else {
                console.warn('LAS: AJAX manager not available, loading from localStorage');
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('LAS: Failed to load settings from server:', error);
            
            // Fallback to localStorage
            if (!this.loadFromLocalStorage()) {
                console.warn('LAS: Using default settings');
            }
        }
    }
    
    /**
     * Get default settings
     * @private
     */
    getDefaultSettings() {
        return {
            menu_background_color: '#23282d',
            menu_text_color: '#ffffff',
            menu_hover_color: '#0073aa',
            menu_active_color: '#ffffff',
            adminbar_background: '#23282d',
            adminbar_text_color: '#ffffff',
            content_background: '#f1f1f1',
            content_text_color: '#23282d',
            enable_live_preview: true,
            animation_speed: 'normal',
            auto_save: true,
            debug_mode: false
        };
    }
    
    /**
     * Get default value for a specific setting
     * @private
     */
    getDefaultValue(key) {
        const defaults = this.getDefaultSettings();
        return defaults[key] || null;
    }
    
    /**
     * Clean up settings manager resources
     */
    cleanup() {
        console.log('LAS: Cleaning up Settings Manager...');
        
        try {
            // Force save any pending changes
            this.forceSaveAll();
            
            // Close broadcast channel
            if (this.broadcastChannel) {
                this.broadcastChannel.close();
                this.broadcastChannel = null;
            }
            
            // Clear timers
            for (const timer of this.debounceTimers.values()) {
                clearTimeout(timer);
            }
            this.debounceTimers.clear();
            
            // Save final state to localStorage
            this.saveToLocalStorage();
            
            // Clear settings
            this.settings = {};
            
            console.log('LAS: Settings Manager cleanup complete');
            
        } catch (error) {
            console.error('LAS: Error during Settings Manager cleanup:', error);
        }
    }
}

/**
 * Settings Validator Class
 * Provides client-side validation and sanitization for settings
 */
class LASSettingsValidator {
    constructor() {
        this.validationRules = this.getValidationRules();
        this.sanitizationRules = this.getSanitizationRules();
    }
    
    /**
     * Validate and sanitize a setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {*} Validated and sanitized value
     */
    validateAndSanitize(key, value) {
        try {
            // First sanitize the value
            const sanitized = this.sanitize(key, value);
            
            // Then validate it
            const validated = this.validate(key, sanitized);
            
            return validated;
            
        } catch (error) {
            console.error(`LAS: Validation failed for '${key}':`, error);
            
            // Return default value on validation failure
            return this.getDefaultValue(key);
        }
    }
    
    /**
     * Sanitize a setting value
     * @private
     */
    sanitize(key, value) {
        const type = this.getSettingType(key);
        const sanitizer = this.sanitizationRules[type];
        
        if (sanitizer && typeof sanitizer === 'function') {
            return sanitizer(value);
        }
        
        // Default sanitization
        return this.sanitizeString(value);
    }
    
    /**
     * Validate a setting value
     * @private
     */
    validate(key, value) {
        const type = this.getSettingType(key);
        const validator = this.validationRules[type];
        
        if (validator && typeof validator === 'function') {
            if (!validator(value)) {
                throw new Error(`Invalid value for setting type '${type}'`);
            }
        }
        
        return value;
    }
    
    /**
     * Get setting type based on key
     * @private
     */
    getSettingType(key) {
        // Color settings
        if (key.includes('_color') || key.includes('_colour')) {
            return 'color';
        }
        
        // Boolean settings
        if (key.startsWith('enable_') || key.startsWith('disable_') || 
            key.includes('_enabled') || key.includes('_disabled') ||
            ['auto_save', 'debug_mode'].includes(key)) {
            return 'boolean';
        }
        
        // Number settings
        if (key.includes('_size') || key.includes('_width') || key.includes('_height') ||
            key.includes('_delay') || key.includes('_timeout')) {
            return 'number';
        }
        
        // URL settings
        if (key.includes('_url') || key.includes('_link')) {
            return 'url';
        }
        
        // CSS settings
        if (key.includes('_css') || key.includes('_style')) {
            return 'css';
        }
        
        // Email settings
        if (key.includes('_email') || key.includes('_mail')) {
            return 'email';
        }
        
        // Default to string
        return 'string';
    }
    
    /**
     * Get validation rules
     * @private
     */
    getValidationRules() {
        return {
            color: (value) => {
                if (typeof value !== 'string') return false;
                
                // Hex color validation (after sanitization, 3-digit hex becomes 6-digit)
                if (/^#([A-Fa-f0-9]{6})$/.test(value)) return true;
                
                // RGB/RGBA validation
                if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(value)) return true;
                
                // Named colors (basic set)
                const namedColors = ['transparent', 'inherit', 'initial', 'unset', 'black', 'white', 'red', 'green', 'blue'];
                return namedColors.includes(value.toLowerCase());
            },
            
            boolean: (value) => {
                return typeof value === 'boolean' || value === 'true' || value === 'false' || value === 1 || value === 0;
            },
            
            number: (value) => {
                const num = parseFloat(value);
                return !isNaN(num) && isFinite(num);
            },
            
            url: (value) => {
                if (typeof value !== 'string') return false;
                try {
                    new URL(value);
                    return true;
                } catch {
                    // Allow relative URLs
                    return /^\/[^\/]/.test(value) || /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\./.test(value);
                }
            },
            
            email: (value) => {
                if (typeof value !== 'string') return false;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            
            css: (value) => {
                if (typeof value !== 'string') return false;
                
                // Check for dangerous CSS patterns
                const dangerousPatterns = [
                    /javascript\s*:/i,
                    /expression\s*\(/i,
                    /@import/i,
                    /behavior\s*:/i,
                    /-moz-binding/i,
                    /vbscript\s*:/i
                ];
                
                return !dangerousPatterns.some(pattern => pattern.test(value));
            },
            
            string: (value) => {
                return typeof value === 'string' && value.length <= 10000; // Max length check
            }
        };
    }
    
    /**
     * Get sanitization rules
     * @private
     */
    getSanitizationRules() {
        return {
            color: (value) => {
                if (typeof value !== 'string') return '#000000';
                
                value = value.trim();
                
                // Normalize hex colors
                if (/^#([A-Fa-f0-9]{3})$/.test(value)) {
                    // Convert 3-digit hex to 6-digit
                    const hex = value.slice(1);
                    return '#' + hex.split('').map(c => c + c).join('');
                }
                
                return value;
            },
            
            boolean: (value) => {
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') {
                    return value.toLowerCase() === 'true' || value === '1';
                }
                if (typeof value === 'number') {
                    return value !== 0;
                }
                return false;
            },
            
            number: (value) => {
                const num = parseFloat(value);
                return isNaN(num) ? 0 : num;
            },
            
            url: (value) => {
                if (typeof value !== 'string') return '';
                return value.trim();
            },
            
            email: (value) => {
                if (typeof value !== 'string') return '';
                return value.trim().toLowerCase();
            },
            
            css: (value) => {
                if (typeof value !== 'string') return '';
                
                // Remove dangerous patterns
                const dangerousPatterns = [
                    /javascript\s*:/gi,
                    /expression\s*\(/gi,
                    /@import/gi,
                    /behavior\s*:/gi,
                    /-moz-binding/gi,
                    /vbscript\s*:/gi
                ];
                
                let sanitized = value;
                dangerousPatterns.forEach(pattern => {
                    sanitized = sanitized.replace(pattern, '');
                });
                
                return sanitized.trim();
            },
            
            string: (value) => {
                if (typeof value !== 'string') return String(value || '');
                
                // Basic XSS prevention
                return value
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;')
                    .replace(/\//g, '&#x2F;')
                    .trim()
                    .slice(0, 10000); // Limit length
            }
        };
    }
    
    /**
     * Sanitize string value
     * @private
     */
    sanitizeString(value) {
        return this.sanitizationRules.string(value);
    }
    
    /**
     * Get default value for a setting type
     * @private
     */
    getDefaultValue(key) {
        const type = this.getSettingType(key);
        
        const defaults = {
            color: '#000000',
            boolean: false,
            number: 0,
            url: '',
            email: '',
            css: '',
            string: ''
        };
        
        return defaults[type] || '';
    }
}

// Make classes available globally
window.LAS.CoreManager = LASCoreManager;
window.LAS.ErrorHandler = LASErrorHandler;
window.LAS.SettingsManager = LASSettingsManager;
window.LAS.SettingsValidator = LASSettingsValidator;

// Protect against missing jQuery
if (typeof jQuery !== 'undefined' && typeof jQuery.fn !== 'undefined') {
    jQuery(document).ready(function ($) {
        "use strict";

        // Check if required data is available
        if (typeof lasAdminData === 'undefined') {
            console.error('LAS: lasAdminData not available - initialization aborted');
            return;
        }

        console.log('LAS: Starting initialization with Core Manager...');
        console.log('LAS: Available configuration:', lasAdminData);

    // Initialize the new Core Manager
    window.LAS.coreManager = new LASCoreManager();
    
    // Initialize the core manager
    window.LAS.coreManager.init().then(() => {
        console.log('LAS: Core Manager initialization successful');
        
        // Set up event listeners for core events
        window.LAS.coreManager.on('core:ready', (data) => {
            console.log('LAS: System ready with modules:', data.modules);
        });
        
        window.LAS.coreManager.on('core:error', (data) => {
            console.error('LAS: Core error occurred:', data);
        });
        
        // Legacy compatibility - maintain existing functionality
        initializeLegacyCompatibility();
        
    }).then(() => {
        console.log('LAS: Initialization complete');
    }).catch((error) => {
        console.error('LAS: Core Manager initialization failed:', error);
        
        // Fallback to legacy initialization if core manager fails
        console.log('LAS: Falling back to legacy initialization...');
        initializeLegacyFallback();
    });
    
    /**
     * Initialize legacy compatibility layer
     */
    function initializeLegacyCompatibility() {
        // Maintain compatibility with existing code that expects certain global objects
        window.LAS.legacy = {
            StateManager: createLegacyStateManager(),
            ErrorManager: window.LAS.coreManager.get('error')
        };
    }
    
    /**
     * Create a legacy state manager for backward compatibility
     */
    function createLegacyStateManager() {
        return {
            activeTab: null,
            
            init: function() {
                console.log('LAS: Legacy State Manager initialized');
                this.initializeTabs();
            },
            
            initializeTabs: function() {
                // Use modern tab handling if available
                const settingsManager = window.LAS.coreManager.get('settings');
                if (settingsManager) {
                    // Modern tab handling will be implemented in settings manager
                    return;
                }
                
                // Fallback tab handling
                this.initializeFallbackTabs();
            },
            
            initializeFallbackTabs: function() {
                console.log('LAS: Initializing fallback tab system');
                
                // Only proceed if jQuery is available
                if (typeof $ !== 'function') {
                    console.warn('LAS: jQuery not available for fallback tabs');
                    return;
                }
                
                try {
                    // Hide all tab panels except the first one
                    $('#las-settings-tabs .las-tab-panel').hide();
                    $('#las-settings-tabs .las-tab-panel:first').show();
                    
                    // Add click handlers to tab links
                    $('#las-settings-tabs ul li a').on('click.las-fallback-tabs', function (e) {
                        e.preventDefault();
                        
                        const $this = $(this);
                        const targetId = $this.attr('href');
                        const tabId = targetId.replace('#las-tab-', '');
                        
                        // Remove active class from all tabs
                        $('#las-settings-tabs ul li').removeClass('ui-tabs-active ui-state-active');
                        
                        // Add active class to clicked tab
                        $this.parent().addClass('ui-tabs-active ui-state-active');
                        
                        // Hide all panels
                        $('#las-settings-tabs .las-tab-panel').hide();
                        
                        // Show target panel
                        $(targetId).show();
                        
                        // Save tab state
                        this.saveTabState(tabId);
                    }.bind(this));
                } catch (error) {
                    console.error('LAS: Error in fallback tab initialization:', error);
                }
            },
            
            saveTabState: function(tabId) {
                this.activeTab = tabId;
                localStorage.setItem('las_active_tab', tabId);
            },
            
            activateTab: function(tabId) {
                if (typeof $ !== 'function') {
                    console.warn('LAS: jQuery not available for tab activation');
                    return;
                }
                
                try {
                    const $targetLink = $('#las-settings-tabs ul li a[href="#las-tab-' + tabId + '"]');
                    if ($targetLink.length) {
                        $targetLink.trigger('click.las-fallback-tabs');
                    }
                } catch (error) {
                    console.error('LAS: Error activating tab:', error);
                }
            }
        };
    }
    
    /**
     * Fallback initialization if core manager fails
     */
    function initializeLegacyFallback() {
        console.log('LAS: Initializing legacy fallback...');
        
        // Create minimal error handling
        window.LAS.errorHandler = {
            showError: function(message) {
                console.error('LAS Error:', message);
                alert('LAS Error: ' + message);
            },
            showSuccess: function(message) {
                console.log('LAS Success:', message);
            },
            showWarning: function(message) {
                console.warn('LAS Warning:', message);
            }
        };
        
        // Initialize basic tab functionality
        const legacyStateManager = createLegacyStateManager();
        legacyStateManager.init();
        
        console.log('LAS: Legacy fallback initialization complete');
    }

    // Enhanced State Manager with dependency checking and fallback mechanisms
    var StateManager = {
        activeTab: null,
        debounceTimer: null,
        userPreferences: {},

        init: function () {
            console.log('LAS StateManager: Initializing...');
            this.initializeTabs();
            this.loadUserPreferences();
            this.restoreTabState();
            console.log('LAS: Enhanced State Manager initialized');
        },

        initializeTabs: function () {
            var self = this;

            // Check if modern NavigationManager is available and initialized
            if (ModernUIManager.navigationManager) {
                try {
                    console.log('LAS: Using modern NavigationManager for tabs...');
                    
                    // Configure navigation manager for our tabs
                    ModernUIManager.navigationManager.configure({
                        container: '.las-tabs-container',
                        tabSelector: '.las-tab',
                        panelSelector: '.las-tab-panel',
                        activeClass: 'active'
                    });
                    
                    // Listen for tab changes
                    document.addEventListener('las-tab-change', function(e) {
                        self.saveTabState(e.detail.tabId);
                        console.log('LAS: Tab changed to:', e.detail.tabId);
                    });
                    
                    console.log('LAS: Modern NavigationManager configured successfully');
                    return;
                } catch (error) {
                    console.error('LAS: Error configuring NavigationManager:', error);
                }
            }

            // Fallback to jQuery UI tabs
            if (typeof $.fn.tabs === "function" && lasAdminData.jquery_ui && lasAdminData.jquery_ui.tabs) {
                try {
                    $("#las-settings-tabs").tabs({
                        activate: function (event, ui) {
                            var tabId = ui.newPanel.attr('id').replace('las-tab-', '');
                            self.saveTabState(tabId);
                        },
                        create: function (event, ui) {
                            console.log('LAS: jQuery UI Tabs initialized successfully');
                        }
                    });
                } catch (error) {
                    console.error('LAS: Error initializing jQuery UI Tabs:', error);
                    this.initializeFallbackTabs();
                }
            } else {
                console.warn('LAS: jQuery UI Tabs not available, using fallback implementation');
                this.initializeFallbackTabs();
            }
        },

        initializeFallbackTabs: function () {
            var self = this;
            console.log('LAS: Initializing fallback tab system');

            // Hide all tab panels except the first one
            $('#las-settings-tabs .las-tab-panel').hide();
            $('#las-settings-tabs .las-tab-panel:first').show();

            // Add click handlers to tab links
            $('#las-settings-tabs ul li a').on('click.las-fallback-tabs', function (e) {
                e.preventDefault();

                var $this = $(this);
                var targetId = $this.attr('href');
                var tabId = targetId.replace('#las-tab-', '');

                // Remove active class from all tabs
                $('#las-settings-tabs ul li').removeClass('ui-tabs-active ui-state-active');

                // Add active class to clicked tab
                $this.parent().addClass('ui-tabs-active ui-state-active');

                // Hide all panels
                $('#las-settings-tabs .las-tab-panel').hide();

                // Show target panel
                $(targetId).show();

                // Save tab state
                self.saveTabState(tabId);
            });

            // Set initial active tab
            var initialTab = lasAdminData.current_tab || 'general';
            this.activateFallbackTab(initialTab);
        },

        activateFallbackTab: function (tabId) {
            var $targetLink = $('#las-settings-tabs ul li a[href="#las-tab-' + tabId + '"]');
            if ($targetLink.length) {
                $targetLink.trigger('click.las-fallback-tabs');
            }
        },

        loadUserPreferences: function () {
            this.userPreferences = {
                ui_theme: 'modern',
                animation_speed: 'normal',
                remember_tab_state: true,
                live_preview_enabled: true
            };
        },

        saveTabState: function (tabId) {
            this.activeTab = tabId;
            localStorage.setItem('las_active_tab', tabId);

            // Update URL hash
            if (history.replaceState) {
                var newUrl = window.location.pathname + window.location.search + '#tab-' + tabId;
                history.replaceState(null, null, newUrl);
            }
        },

        restoreTabState: function () {
            var savedTab = null;

            // Check URL hash
            var hash = window.location.hash;
            if (hash && hash.indexOf('#tab-') === 0) {
                savedTab = hash.replace('#tab-', '');
            }

            // Check localStorage
            if (!savedTab && this.userPreferences.remember_tab_state) {
                savedTab = localStorage.getItem('las_active_tab');
            }

            // Default to 'general'
            if (!savedTab) {
                savedTab = 'general';
            }

            // Activate the tab
            this.activateTab(savedTab);
        },

        activateTab: function (tabId) {
            // Use modern navigation manager if available
            if (this.navigationManager && typeof this.navigationManager.goToTab === 'function') {
                try {
                    this.navigationManager.goToTab(tabId);
                    this.activeTab = tabId;
                    return;
                } catch (error) {
                    console.error('LAS: Error activating tab with NavigationManager:', error);
                }
            }
            
            // Fallback to jQuery UI tabs
            if (typeof $.fn.tabs === "function" && lasAdminData.jquery_ui && lasAdminData.jquery_ui.tabs) {
                try {
                    var tabIndex = this.getTabIndex(tabId);
                    if (tabIndex !== -1) {
                        $("#las-settings-tabs").tabs("option", "active", tabIndex);
                        this.activeTab = tabId;
                    }
                } catch (error) {
                    console.error('LAS: Error activating jQuery UI tab:', error);
                    this.activateFallbackTab(tabId);
                }
            } else {
                this.activateFallbackTab(tabId);
                this.activeTab = tabId;
            }
        },

        getTabIndex: function (tabId) {
            var tabIds = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
            return tabIds.indexOf(tabId);
        },
        
        cleanup: function() {
            console.log('LAS StateManager: Cleaning up...');
            
            // Clear debounce timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }
            
            // Cleanup modern navigation manager
            if (this.navigationManager && typeof this.navigationManager.destroy === 'function') {
                this.navigationManager.destroy();
                this.navigationManager = null;
            }
            
            // Remove fallback tab event listeners
            $('#las-settings-tabs ul li a').off('.las-fallback-tabs');
            
            console.log('LAS StateManager: Cleanup complete');
        }
    };

    // Enhanced Error Manager with comprehensive notification system
    var ErrorManager = {
        notifications: [],
        container: null,
        isOnline: navigator.onLine,
        offlineQueue: [],
        maxNotifications: 5,
        defaultDuration: 5000,
        retryAttempts: {},
        
        init: function () {
            this.createContainer();
            this.setupOnlineOfflineDetection();
            this.setupGlobalErrorHandling();
            this.setupKeyboardShortcuts();
            
            // Initialize debug mode if enabled
            this.debugMode = localStorage.getItem('las_debug_mode') === 'true';
            if (this.debugMode) {
                console.log('LAS Debug Mode: Enabled from localStorage');
            }
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            // Log performance metrics after page load
            $(window).on('load.las-error-manager', function() {
                setTimeout(function() {
                    this.logPerformanceMetrics();
                }.bind(this), 1000);
            }.bind(this));
            
            console.log('LAS: Enhanced Error Manager initialized');
        },

        createContainer: function () {
            if (!this.container) {
                this.container = $('<div id="las-notifications" class="las-notifications-container" role="alert" aria-live="polite"></div>');
                $('body').append(this.container);
                
                // Add CSS styles for notifications
                this.injectNotificationStyles();
            }
        },

        injectNotificationStyles: function () {
            if ($('#las-notification-styles').length === 0) {
                var styles = `
                    <style id="las-notification-styles">
                        .las-notifications-container {
                            position: fixed;
                            top: 32px;
                            right: 20px;
                            z-index: 999999;
                            max-width: 400px;
                            pointer-events: none;
                        }
                        
                        .las-notification {
                            background: #fff;
                            border-left: 4px solid #0073aa;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            margin-bottom: 10px;
                            padding: 12px 16px;
                            border-radius: 4px;
                            pointer-events: auto;
                            opacity: 0;
                            transform: translateX(100%);
                            transition: all 0.3s ease;
                            position: relative;
                            word-wrap: break-word;
                        }
                        
                        .las-notification.show {
                            opacity: 1;
                            transform: translateX(0);
                        }
                        
                        .las-notification.error {
                            border-left-color: #dc3232;
                        }
                        
                        .las-notification.warning {
                            border-left-color: #ffb900;
                        }
                        
                        .las-notification.success {
                            border-left-color: #46b450;
                        }
                        
                        .las-notification.info {
                            border-left-color: #00a0d2;
                        }
                        
                        .las-notification.offline {
                            border-left-color: #666;
                            background: #f1f1f1;
                        }
                        
                        .las-notification-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            margin-bottom: 4px;
                        }
                        
                        .las-notification-title {
                            font-weight: 600;
                            font-size: 14px;
                            margin: 0;
                            color: #23282d;
                        }
                        
                        .las-notification-close {
                            background: none;
                            border: none;
                            font-size: 18px;
                            cursor: pointer;
                            color: #666;
                            padding: 0;
                            margin-left: 10px;
                            line-height: 1;
                        }
                        
                        .las-notification-close:hover {
                            color: #000;
                        }
                        
                        .las-notification-message {
                            font-size: 13px;
                            color: #555;
                            margin: 0;
                            line-height: 1.4;
                        }
                        
                        .las-notification-actions {
                            margin-top: 8px;
                            display: flex;
                            gap: 8px;
                        }
                        
                        .las-notification-action {
                            background: #0073aa;
                            color: #fff;
                            border: none;
                            padding: 4px 8px;
                            border-radius: 3px;
                            font-size: 12px;
                            cursor: pointer;
                            text-decoration: none;
                            display: inline-block;
                        }
                        
                        .las-notification-action:hover {
                            background: #005a87;
                            color: #fff;
                        }
                        
                        .las-notification-action.secondary {
                            background: #f1f1f1;
                            color: #555;
                        }
                        
                        .las-notification-action.secondary:hover {
                            background: #e1e1e1;
                            color: #000;
                        }
                        
                        .las-notification-progress {
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            height: 2px;
                            background: rgba(0,115,170,0.3);
                            transition: width linear;
                        }
                        
                        .las-notification-progress-container {
                            margin-top: 8px;
                            padding: 8px 0;
                        }
                        
                        .las-notification-progress-text {
                            font-size: 12px;
                            color: #666;
                            margin-bottom: 4px;
                        }
                        
                        .las-notification-progress-bar {
                            height: 4px;
                            background: #e1e5e9;
                            border-radius: 2px;
                            overflow: hidden;
                            position: relative;
                        }
                        
                        .las-notification-progress-bar::after {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            height: 100%;
                            width: 0%;
                            background: linear-gradient(90deg, #007cba 0%, #005a87 100%);
                            border-radius: 2px;
                            transition: width 0.3s ease;
                        }
                        
                        .las-notification-checkmark {
                            position: absolute;
                            top: 8px;
                            left: 8px;
                            width: 20px;
                            height: 20px;
                            background: #46b450;
                            color: white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            font-weight: bold;
                            animation: checkmarkBounce 0.6s ease-out;
                        }
                        
                        @keyframes checkmarkBounce {
                            0% { transform: scale(0); opacity: 0; }
                            50% { transform: scale(1.2); opacity: 1; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        
                        .las-notification.success.has-checkmark {
                            padding-left: 40px;
                        }
                        
                        .las-offline-indicator {
                            position: fixed;
                            top: 32px;
                            left: 50%;
                            transform: translateX(-50%);
                            background: #dc3232;
                            color: #fff;
                            padding: 8px 16px;
                            border-radius: 4px;
                            font-size: 13px;
                            z-index: 1000000;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        }
                        
                        @media (max-width: 782px) {
                            .las-notifications-container {
                                top: 46px;
                                right: 10px;
                                left: 10px;
                                max-width: none;
                            }
                        }
                    </style>
                `;
                $('head').append(styles);
            }
        },

        setupOnlineOfflineDetection: function () {
            var self = this;
            
            // Online/offline event listeners
            $(window).on('online.las-error-manager', function() {
                self.isOnline = true;
                self.hideOfflineIndicator();
                self.processOfflineQueue();
                self.showSuccess('Connection restored', {
                    duration: 3000,
                    actions: [{
                        text: 'Retry Failed Actions',
                        action: function() { self.retryFailedActions(); }
                    }]
                });
            });
            
            $(window).on('offline.las-error-manager', function() {
                self.isOnline = false;
                self.showOfflineIndicator();
                self.showWarning('Connection lost - working offline', {
                    duration: 0, // Don't auto-dismiss
                    persistent: true
                });
            });
            
            // Initial online status check
            if (!this.isOnline) {
                this.showOfflineIndicator();
            }
        },

        setupGlobalErrorHandling: function () {
            var self = this;
            
            // Global JavaScript error handler
            window.addEventListener('error', function(event) {
                self.handleGlobalError({
                    message: event.message,
                    source: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    error: event.error,
                    type: 'javascript'
                });
            });
            
            // Unhandled promise rejection handler
            window.addEventListener('unhandledrejection', function(event) {
                self.handleGlobalError({
                    message: event.reason ? event.reason.toString() : 'Unhandled promise rejection',
                    source: 'promise',
                    type: 'promise',
                    error: event.reason
                });
            });
            
            // jQuery AJAX error handler
            $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
                // Only handle LAS AJAX requests
                if (ajaxSettings.url === lasAdminData.ajax_url && 
                    ajaxSettings.data && 
                    typeof ajaxSettings.data === 'object' && 
                    ajaxSettings.data.action && 
                    ajaxSettings.data.action.indexOf('las_') === 0) {
                    
                    self.handleAjaxError(jqXHR, ajaxSettings, thrownError);
                }
            });
        },

        setupKeyboardShortcuts: function () {
            var self = this;
            
            $(document).on('keydown.las-error-manager', function(e) {
                // ESC key to dismiss all notifications
                if (e.keyCode === 27) {
                    self.dismissAll();
                }
                
                // Ctrl+Shift+D to toggle debug mode
                if (e.ctrlKey && e.shiftKey && e.keyCode === 68) {
                    e.preventDefault();
                    if (self.isDebugMode()) {
                        self.disableDebugMode();
                    } else {
                        self.enableDebugMode();
                    }
                }
                
                // Ctrl+Shift+I to show debug info (when debug mode is enabled)
                if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
                    e.preventDefault();
                    if (self.isDebugMode()) {
                        self.showDebugInfo();
                    } else {
                        self.showWarning('Debug mode is not enabled. Press Ctrl+Shift+D to enable it.');
                    }
                }
                
                // Ctrl+Shift+C to clear error logs (when debug mode is enabled)
                if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                    e.preventDefault();
                    if (self.isDebugMode()) {
                        self.clearErrorLogs();
                    }
                }
                
                // Ctrl+Shift+P to show performance metrics
                if (e.ctrlKey && e.shiftKey && e.keyCode === 80) {
                    e.preventDefault();
                    var metrics = self.getPerformanceMetrics();
                    if (metrics) {
                        console.log('LAS Performance Metrics:', metrics);
                        self.showInfo('Performance metrics logged to console', {
                            details: 'Total time: ' + Math.round(metrics.totalTime) + 'ms'
                        });
                    }
                }
            });
        },

        handleGlobalError: function (errorInfo) {
            // Don't report errors from other plugins/themes
            if (errorInfo.source && !errorInfo.source.includes('live-admin-styler')) {
                return;
            }
            
            console.error('LAS Global Error:', errorInfo);
            
            // Report to server if online
            if (this.isOnline) {
                this.reportErrorToServer(errorInfo);
            } else {
                this.offlineQueue.push({
                    type: 'error_report',
                    data: errorInfo
                });
            }
            
            // Show user-friendly notification
            this.showError('An unexpected error occurred', {
                details: errorInfo.message,
                actions: [{
                    text: 'Report Issue',
                    action: function() { 
                        window.open('https://wordpress.org/support/plugin/live-admin-styler/', '_blank');
                    }
                }]
            });
        },

        handleAjaxError: function (jqXHR, ajaxSettings, thrownError) {
            var errorInfo = {
                status: jqXHR.status,
                statusText: jqXHR.statusText,
                responseText: jqXHR.responseText,
                action: ajaxSettings.data.action,
                thrownError: thrownError,
                type: 'ajax'
            };
            
            console.error('LAS AJAX Error:', errorInfo);
            
            // Handle specific error types
            if (jqXHR.status === 0) {
                if (!this.isOnline) {
                    this.showWarning('Request failed - you appear to be offline', {
                        actions: [{
                            text: 'Retry when online',
                            action: function() { 
                                // Add to offline queue for retry
                                this.offlineQueue.push({
                                    type: 'ajax_retry',
                                    data: ajaxSettings
                                });
                            }.bind(this)
                        }]
                    });
                } else {
                    this.showError('Network error - please check your connection');
                }
            } else if (jqXHR.status === 403) {
                this.showError('Permission denied - please refresh the page', {
                    actions: [{
                        text: 'Refresh Page',
                        action: function() { window.location.reload(); }
                    }]
                });
            } else if (jqXHR.status === 500) {
                this.showError('Server error - please try again', {
                    actions: [{
                        text: 'Retry',
                        action: function() { 
                            // Implement retry logic
                            $.post(ajaxSettings.url, ajaxSettings.data);
                        }
                    }]
                });
            } else {
                this.showError('Request failed (' + jqXHR.status + ')', {
                    details: thrownError || jqXHR.statusText
                });
            }
            
            // Report to server if online
            if (this.isOnline) {
                this.reportErrorToServer(errorInfo);
            }
        },

        reportErrorToServer: function (errorInfo) {
            // Prevent infinite loops
            if (errorInfo.action === 'las_report_client_error') {
                return;
            }
            
            var reportData = {
                action: 'las_report_client_error',
                nonce: lasAdminData.nonce,
                message: errorInfo.message || 'Unknown error',
                type: errorInfo.type || 'unknown',
                source: errorInfo.source || 'unknown',
                line: errorInfo.line || 0,
                column: errorInfo.column || 0,
                stack: errorInfo.error && errorInfo.error.stack ? errorInfo.error.stack : '',
                url: window.location.href,
                user_agent: navigator.userAgent,
                timestamp: Date.now(),
                language: navigator.language || 'unknown',
                platform: navigator.platform || 'unknown',
                cookie_enabled: navigator.cookieEnabled,
                online: navigator.onLine,
                screen_resolution: screen.width + 'x' + screen.height,
                viewport_size: window.innerWidth + 'x' + window.innerHeight,
                context: {
                    component: 'admin-settings',
                    error_manager_version: '1.2.0',
                    active_tab: StateManager.activeTab || 'unknown',
                    notifications_count: this.notifications.length,
                    is_online: this.isOnline
                }
            };
            
            // Use native fetch to avoid jQuery AJAX error handling
            fetch(lasAdminData.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(reportData)
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                if (data.success) {
                    console.log('LAS: Error reported successfully', data.data);
                } else {
                    console.warn('LAS: Error reporting failed', data.data);
                }
            }).catch(function(error) {
                console.warn('LAS: Failed to report error to server:', error);
            });
        },

        showError: function (message, options) {
            return this.showNotification(message, 'error', options);
        },

        showWarning: function (message, options) {
            return this.showNotification(message, 'warning', options);
        },

        showSuccess: function (message, options) {
            return this.showNotification(message, 'success', options);
        },

        showInfo: function (message, options) {
            return this.showNotification(message, 'info', options);
        },

        showNotification: function (message, type, options) {
            options = $.extend({
                title: this.getDefaultTitle(type),
                duration: this.defaultDuration,
                actions: [],
                details: null,
                persistent: false,
                id: null,
                showProgress: false,
                progressText: null,
                showCheckmark: false
            }, options || {});
            
            // Generate unique ID if not provided
            if (!options.id) {
                options.id = 'las-notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            }
            
            // Check if we already have too many notifications
            if (this.notifications.length >= this.maxNotifications) {
                this.dismissOldest();
            }
            
            var notification = this.createNotificationElement(message, type, options);
            this.notifications.push({
                id: options.id,
                element: notification,
                type: type,
                persistent: options.persistent,
                timestamp: Date.now(),
                showProgress: options.showProgress
            });
            
            this.container.append(notification);
            
            // Trigger show animation
            setTimeout(function() {
                notification.addClass('show');
            }, 10);
            
            // Auto-dismiss if not persistent
            if (!options.persistent && options.duration > 0) {
                this.scheduleAutoDismiss(options.id, options.duration);
            }
            
            // Log to console
            var logMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
            console[logMethod]('LAS ' + type.charAt(0).toUpperCase() + type.slice(1) + ':', message);
            
            return options.id;
        },

        createNotificationElement: function (message, type, options) {
            var notification = $('<div class="las-notification ' + type + '" data-id="' + options.id + '"></div>');
            
            var header = $('<div class="las-notification-header"></div>');
            var title = $('<h4 class="las-notification-title">' + options.title + '</h4>');
            var closeBtn = $('<button class="las-notification-close" aria-label="Dismiss notification">&times;</button>');
            
            header.append(title, closeBtn);
            notification.append(header);
            
            var messageEl = $('<p class="las-notification-message">' + message + '</p>');
            notification.append(messageEl);
            
            // Add details if provided
            if (options.details) {
                var detailsEl = $('<p class="las-notification-details" style="font-size: 12px; color: #666; margin-top: 4px;"></p>');
                detailsEl.text(options.details);
                notification.append(detailsEl);
            }
            
            // Add actions if provided
            if (options.actions && options.actions.length > 0) {
                var actionsEl = $('<div class="las-notification-actions"></div>');
                options.actions.forEach(function(actionConfig) {
                    var actionBtn = $('<button class="las-notification-action"></button>');
                    actionBtn.text(actionConfig.text);
                    if (actionConfig.secondary) {
                        actionBtn.addClass('secondary');
                    }
                    actionBtn.on('click', function() {
                        if (typeof actionConfig.action === 'function') {
                            actionConfig.action();
                        }
                        if (!actionConfig.keepOpen) {
                            this.dismiss(options.id);
                        }
                    }.bind(this));
                    actionsEl.append(actionBtn);
                }.bind(this));
                notification.append(actionsEl);
            }
            
            // Add progress indicator if requested
            if (options.showProgress) {
                var progressContainer = $('<div class="las-notification-progress-container"></div>');
                var progressBar = $('<div class="las-notification-progress-bar"></div>');
                var progressText = $('<div class="las-notification-progress-text">' + (options.progressText || 'Processing...') + '</div>');
                
                progressContainer.append(progressText, progressBar);
                notification.append(progressContainer);
                
                // Animate progress bar
                setTimeout(function() {
                    progressBar.css('width', '100%');
                }, 100);
            }
            
            // Add checkmark for success notifications
            if (options.showCheckmark && type === 'success') {
                var checkmark = $('<div class="las-notification-checkmark">✓</div>');
                notification.prepend(checkmark);
            }
            
            // Add progress bar for auto-dismiss
            if (!options.persistent && options.duration > 0) {
                var progressBar = $('<div class="las-notification-progress"></div>');
                notification.append(progressBar);
            }
            
            // Close button handler
            closeBtn.on('click', function() {
                this.dismiss(options.id);
            }.bind(this));
            
            return notification;
        },

        getDefaultTitle: function (type) {
            var titles = {
                error: 'Error',
                warning: 'Warning',
                success: 'Success',
                info: 'Information'
            };
            return titles[type] || 'Notification';
        },

        scheduleAutoDismiss: function (id, duration) {
            var self = this;
            var notification = this.getNotificationById(id);
            
            if (!notification) return;
            
            var progressBar = notification.element.find('.las-notification-progress');
            if (progressBar.length) {
                progressBar.css('width', '100%');
                setTimeout(function() {
                    progressBar.css({
                        'width': '0%',
                        'transition-duration': (duration / 1000) + 's'
                    });
                }, 10);
            }
            
            setTimeout(function() {
                self.dismiss(id);
            }, duration);
        },

        dismiss: function (id) {
            var notification = this.getNotificationById(id);
            if (!notification) return;
            
            notification.element.removeClass('show');
            
            setTimeout(function() {
                notification.element.remove();
                this.notifications = this.notifications.filter(function(n) {
                    return n.id !== id;
                });
            }.bind(this), 300);
        },

        dismissAll: function () {
            this.notifications.forEach(function(notification) {
                if (!notification.persistent) {
                    this.dismiss(notification.id);
                }
            }.bind(this));
        },

        dismissOldest: function () {
            var oldest = this.notifications.reduce(function(prev, current) {
                return (prev.timestamp < current.timestamp) ? prev : current;
            });
            
            if (oldest && !oldest.persistent) {
                this.dismiss(oldest.id);
            }
        },

        getNotificationById: function (id) {
            return this.notifications.find(function(n) { return n.id === id; });
        },

        showOfflineIndicator: function () {
            if ($('#las-offline-indicator').length === 0) {
                var indicator = $('<div id="las-offline-indicator" class="las-offline-indicator">You are currently offline</div>');
                $('body').append(indicator);
            }
        },

        hideOfflineIndicator: function () {
            $('#las-offline-indicator').remove();
        },

        processOfflineQueue: function () {
            while (this.offlineQueue.length > 0) {
                var item = this.offlineQueue.shift();
                
                if (item.type === 'error_report') {
                    this.reportErrorToServer(item.data);
                } else if (item.type === 'ajax_retry') {
                    $.post(item.data.url, item.data.data);
                }
            }
        },

        retryFailedActions: function () {
            // Implement retry logic for failed actions
            this.processOfflineQueue();
            this.showInfo('Retrying failed actions...', { duration: 3000 });
        },
        
        // Debug mode functionality
        enableDebugMode: function() {
            this.debugMode = true;
            localStorage.setItem('las_debug_mode', 'true');
            this.showInfo('Debug mode enabled - detailed error information will be shown', {
                duration: 5000,
                actions: [{
                    text: 'Disable Debug',
                    action: function() { this.disableDebugMode(); }.bind(this)
                }]
            });
            console.log('LAS Debug Mode: Enabled');
        },
        
        disableDebugMode: function() {
            this.debugMode = false;
            localStorage.removeItem('las_debug_mode');
            this.showInfo('Debug mode disabled', { duration: 3000 });
            console.log('LAS Debug Mode: Disabled');
        },
        
        isDebugMode: function() {
            return this.debugMode || localStorage.getItem('las_debug_mode') === 'true';
        },
        
        getDebugInfo: function() {
            if (!this.isDebugMode()) {
                return null;
            }
            
            return {
                action: 'las_get_debug_info',
                nonce: lasAdminData.nonce
            };
        },
        
        showDebugInfo: function() {
            if (!this.isDebugMode()) {
                this.showWarning('Debug mode is not enabled');
                return;
            }
            
            var debugData = this.getDebugInfo();
            if (!debugData) {
                this.showError('Failed to prepare debug information');
                return;
            }
            
            var loadingId = this.showInfo('Loading debug information...', {
                duration: 0,
                persistent: true
            });
            
            $.post(lasAdminData.ajax_url, debugData)
                .done(function(response) {
                    this.dismiss(loadingId);
                    
                    if (response.success && response.data) {
                        this.displayDebugModal(response.data);
                    } else {
                        this.showError('Failed to retrieve debug information', {
                            details: response.data ? response.data.message : 'Unknown error'
                        });
                    }
                }.bind(this))
                .fail(function(jqXHR, textStatus, errorThrown) {
                    this.dismiss(loadingId);
                    this.showError('Network error retrieving debug information', {
                        details: textStatus + ': ' + errorThrown
                    });
                }.bind(this));
        },
        
        displayDebugModal: function(debugData) {
            // Create debug modal
            var modal = $('<div id="las-debug-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999; display: flex; align-items: center; justify-content: center;"></div>');
            var content = $('<div style="background: #fff; padding: 20px; border-radius: 8px; max-width: 90%; max-height: 90%; overflow: auto; position: relative;"></div>');
            
            var header = $('<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;"></div>');
            header.append('<h2 style="margin: 0;">Live Admin Styler Debug Information</h2>');
            
            var closeBtn = $('<button style="background: none; border: none; font-size: 24px; cursor: pointer; padding: 0;">&times;</button>');
            closeBtn.on('click', function() { modal.remove(); });
            header.append(closeBtn);
            
            content.append(header);
            
            // Add debug sections
            var sections = [
                { title: 'System Information', data: debugData.system_info },
                { title: 'Plugin Information', data: debugData.plugin_info },
                { title: 'Performance Information', data: debugData.performance_info },
                { title: 'Recent Errors', data: debugData.recent_errors },
                { title: 'Error Statistics', data: debugData.error_statistics },
                { title: 'Performance Metrics', data: debugData.performance_metrics },
                { title: 'Configuration', data: debugData.configuration },
                { title: 'Active Plugins', data: debugData.active_plugins },
                { title: 'Theme Information', data: debugData.theme_info }
            ];
            
            sections.forEach(function(section) {
                if (section.data) {
                    var sectionDiv = $('<div style="margin-bottom: 20px;"></div>');
                    sectionDiv.append('<h3 style="margin: 0 0 10px 0; color: #333;">' + section.title + '</h3>');
                    
                    var pre = $('<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; font-size: 12px; line-height: 1.4;"></pre>');
                    pre.text(JSON.stringify(section.data, null, 2));
                    sectionDiv.append(pre);
                    
                    content.append(sectionDiv);
                }
            });
            
            // Add copy button
            var copyBtn = $('<button style="background: #0073aa; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Copy Debug Info</button>');
            copyBtn.on('click', function() {
                var debugText = JSON.stringify(debugData, null, 2);
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(debugText).then(function() {
                        this.showSuccess('Debug information copied to clipboard');
                    }.bind(this));
                } else {
                    // Fallback for older browsers
                    var textArea = $('<textarea style="position: absolute; left: -9999px;"></textarea>');
                    textArea.val(debugText);
                    $('body').append(textArea);
                    textArea[0].select();
                    document.execCommand('copy');
                    textArea.remove();
                    this.showSuccess('Debug information copied to clipboard');
                }
            }.bind(this));
            
            content.append(copyBtn);
            modal.append(content);
            $('body').append(modal);
            
            // Close on escape key
            $(document).on('keydown.las-debug-modal', function(e) {
                if (e.keyCode === 27) {
                    modal.remove();
                    $(document).off('keydown.las-debug-modal');
                }
            });
        },
        
        clearErrorLogs: function() {
            if (!confirm('Are you sure you want to clear all error logs? This action cannot be undone.')) {
                return;
            }
            
            var clearData = {
                action: 'las_clear_error_logs',
                nonce: lasAdminData.nonce
            };
            
            var loadingId = this.showInfo('Clearing error logs...', {
                duration: 0,
                persistent: true
            });
            
            $.post(lasAdminData.ajax_url, clearData)
                .done(function(response) {
                    this.dismiss(loadingId);
                    
                    if (response.success) {
                        this.showSuccess('Error logs cleared successfully', {
                            details: response.data.message
                        });
                    } else {
                        this.showError('Failed to clear error logs', {
                            details: response.data ? response.data.message : 'Unknown error'
                        });
                    }
                }.bind(this))
                .fail(function(jqXHR, textStatus, errorThrown) {
                    this.dismiss(loadingId);
                    this.showError('Network error clearing error logs', {
                        details: textStatus + ': ' + errorThrown
                    });
                }.bind(this));
        },
        
        // Performance monitoring
        startPerformanceMonitoring: function() {
            this.performanceMonitoring = {
                enabled: true,
                startTime: performance.now(),
                metrics: {
                    domContentLoaded: 0,
                    windowLoaded: 0,
                    firstPaint: 0,
                    firstContentfulPaint: 0,
                    largestContentfulPaint: 0,
                    cumulativeLayoutShift: 0,
                    firstInputDelay: 0
                }
            };
            
            // Monitor performance metrics
            if (window.PerformanceObserver) {
                // Largest Contentful Paint
                try {
                    new PerformanceObserver(function(list) {
                        var entries = list.getEntries();
                        var lastEntry = entries[entries.length - 1];
                        this.performanceMonitoring.metrics.largestContentfulPaint = lastEntry.startTime;
                    }.bind(this)).observe({ entryTypes: ['largest-contentful-paint'] });
                } catch (e) {
                    console.warn('LAS: LCP monitoring not supported');
                }
                
                // Cumulative Layout Shift
                try {
                    new PerformanceObserver(function(list) {
                        var clsValue = 0;
                        list.getEntries().forEach(function(entry) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        });
                        this.performanceMonitoring.metrics.cumulativeLayoutShift = clsValue;
                    }.bind(this)).observe({ entryTypes: ['layout-shift'] });
                } catch (e) {
                    console.warn('LAS: CLS monitoring not supported');
                }
                
                // First Input Delay
                try {
                    new PerformanceObserver(function(list) {
                        list.getEntries().forEach(function(entry) {
                            this.performanceMonitoring.metrics.firstInputDelay = entry.processingStart - entry.startTime;
                        }.bind(this));
                    }.bind(this)).observe({ entryTypes: ['first-input'] });
                } catch (e) {
                    console.warn('LAS: FID monitoring not supported');
                }
            }
            
            // Monitor paint metrics
            if (window.performance && window.performance.getEntriesByType) {
                var paintEntries = window.performance.getEntriesByType('paint');
                paintEntries.forEach(function(entry) {
                    if (entry.name === 'first-paint') {
                        this.performanceMonitoring.metrics.firstPaint = entry.startTime;
                    } else if (entry.name === 'first-contentful-paint') {
                        this.performanceMonitoring.metrics.firstContentfulPaint = entry.startTime;
                    }
                }.bind(this));
            }
            
            console.log('LAS Performance Monitoring: Started');
        },
        
        getPerformanceMetrics: function() {
            if (!this.performanceMonitoring || !this.performanceMonitoring.enabled) {
                return null;
            }
            
            var metrics = Object.assign({}, this.performanceMonitoring.metrics);
            metrics.totalTime = performance.now() - this.performanceMonitoring.startTime;
            metrics.memoryUsage = window.performance && window.performance.memory ? {
                usedJSHeapSize: window.performance.memory.usedJSHeapSize,
                totalJSHeapSize: window.performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
            } : null;
            
            return metrics;
        },
        
        logPerformanceMetrics: function() {
            var metrics = this.getPerformanceMetrics();
            if (metrics) {
                console.log('LAS Performance Metrics:', metrics);
                
                // Report slow performance
                if (metrics.totalTime > 5000) { // 5 seconds
                    this.showWarning('Slow page performance detected (' + Math.round(metrics.totalTime) + 'ms)', {
                        details: 'Consider optimizing your settings or reporting this issue',
                        actions: [{
                            text: 'Show Debug Info',
                            action: function() { this.showDebugInfo(); }.bind(this)
                        }]
                    });
                }
            }
        },
        
        // Enhanced utility methods for user guidance
        reportPerformanceIssue: function(data) {
            console.log('LAS: Reporting performance issue', data);
            
            // Send performance issue report to server
            $.post(lasAdminData.ajax_url, {
                action: 'las_report_client_error',
                nonce: lasAdminData.nonce,
                message: 'Performance issue reported',
                type: 'performance',
                context: {
                    setting: data.setting,
                    value: data.value,
                    execution_time: data.execution_time,
                    memory_usage: data.memory_usage,
                    user_agent: navigator.userAgent,
                    timestamp: Date.now()
                }
            }).done(function(response) {
                if (response.success) {
                    this.showSuccess('Performance issue reported successfully', {
                        duration: 3000,
                        details: 'Thank you for helping us improve the plugin'
                    });
                } else {
                    this.showWarning('Failed to report performance issue', {
                        duration: 5000
                    });
                }
            }.bind(this));
        },
        
        showOptimizationTips: function(setting) {
            var tips = this.getOptimizationTips(setting);
            this.showInfo('Optimization Tips', {
                duration: 10000,
                details: tips,
                actions: [{
                    text: 'Apply Suggestions',
                    action: function() {
                        this.applyOptimizationSuggestions(setting);
                    }.bind(this)
                }]
            });
        },
        
        getOptimizationTips: function(setting) {
            var tips = {
                'menu_background_color': 'Use solid colors instead of gradients for better performance',
                'menu_shadow': 'Reduce shadow blur radius for faster rendering',
                'menu_border_radius': 'Use smaller border radius values (under 10px)',
                'adminbar_background_color': 'Avoid complex gradients in the admin bar',
                'content_background_image': 'Use optimized images under 500KB',
                'default': 'Consider using simpler styling options for better performance'
            };
            
            return tips[setting] || tips['default'];
        },
        
        applyOptimizationSuggestions: function(setting) {
            // This would apply performance-optimized defaults for the setting
            this.showInfo('Optimization suggestions applied', {
                duration: 3000,
                actions: [{
                    text: 'Undo',
                    action: function() {
                        // Implement undo functionality
                        this.showInfo('Undo functionality coming soon');
                    }.bind(this)
                }]
            });
        },
        
        checkConnectionStatus: function() {
            this.showInfo('Checking connection...', {
                duration: 0,
                persistent: true,
                id: 'connection-check'
            });
            
            // Simple connection test
            $.get(lasAdminData.ajax_url + '?action=las_ping&_=' + Date.now())
                .done(function() {
                    this.dismiss('connection-check');
                    this.showSuccess('Connection is working', { duration: 3000 });
                }.bind(this))
                .fail(function() {
                    this.dismiss('connection-check');
                    this.showError('Connection test failed', {
                        duration: 5000,
                        details: 'Please check your internet connection'
                    });
                }.bind(this));
        },
        
        testConnection: function() {
            this.checkConnectionStatus();
        },
        
        checkLoginStatus: function() {
            this.showInfo('Checking login status...', {
                duration: 0,
                persistent: true,
                id: 'login-check'
            });
            
            $.post(lasAdminData.ajax_url, {
                action: 'las_check_login_status',
                nonce: lasAdminData.nonce
            }).done(function(response) {
                this.dismiss('login-check');
                if (response.success) {
                    this.showSuccess('Login status is valid', { duration: 3000 });
                } else {
                    this.showWarning('Login session may have expired', {
                        duration: 0,
                        persistent: true,
                        actions: [{
                            text: 'Refresh Page',
                            action: function() { window.location.reload(); }
                        }]
                    });
                }
            }.bind(this)).fail(function() {
                this.dismiss('login-check');
                this.showError('Unable to verify login status', {
                    duration: 5000,
                    actions: [{
                        text: 'Refresh Page',
                        action: function() { window.location.reload(); }
                    }]
                });
            }.bind(this));
        },
        
        reportTechnicalIssue: function(data) {
            console.log('LAS: Reporting technical issue', data);
            
            $.post(lasAdminData.ajax_url, {
                action: 'las_report_client_error',
                nonce: lasAdminData.nonce,
                message: 'Technical issue reported',
                type: 'technical',
                context: data
            }).done(function(response) {
                if (response.success) {
                    this.showSuccess('Technical issue reported', {
                        duration: 3000,
                        details: 'Our team will investigate this issue'
                    });
                } else {
                    this.showWarning('Failed to report technical issue');
                }
            }.bind(this));
        },
        
        reportServerError: function(data) {
            console.log('LAS: Reporting server error', data);
            
            $.post(lasAdminData.ajax_url, {
                action: 'las_report_client_error',
                nonce: lasAdminData.nonce,
                message: 'Server error reported',
                type: 'server_error',
                context: data
            }).done(function(response) {
                if (response.success) {
                    this.showSuccess('Server error reported', {
                        duration: 3000
                    });
                }
            }.bind(this));
        },
        
        queueForRetry: function(callback) {
            this.offlineQueue.push({
                type: 'retry_callback',
                callback: callback,
                timestamp: Date.now()
            });
            
            this.showInfo('Action queued for when connection is restored', {
                duration: 3000
            });
        },
        
        showValidationHelp: function(setting) {
            var helpText = this.getValidationHelp(setting);
            this.showInfo('Validation Help: ' + setting, {
                duration: 8000,
                details: helpText,
                actions: [{
                    text: 'Show Examples',
                    action: function() {
                        this.showValidationExamples(setting);
                    }.bind(this)
                }]
            });
        },
        
        getValidationHelp: function(setting) {
            var help = {
                'menu_background_color': 'Use valid CSS colors: #ffffff, rgb(255,255,255), or color names',
                'menu_width': 'Enter a number between 160 and 400 (pixels)',
                'menu_border_radius': 'Enter a number between 0 and 50 (pixels)',
                'adminbar_height': 'Enter a number between 28 and 60 (pixels)',
                'default': 'Please enter a valid value for this setting'
            };
            
            return help[setting] || help['default'];
        },
        
        showValidationExamples: function(setting) {
            var examples = this.getValidationExamples(setting);
            this.showInfo('Valid Examples for ' + setting, {
                duration: 10000,
                details: examples
            });
        },
        
        getValidationExamples: function(setting) {
            var examples = {
                'menu_background_color': 'Examples: #ffffff, #007cba, rgb(0,124,186), blue',
                'menu_width': 'Examples: 220, 280, 320 (pixels)',
                'menu_border_radius': 'Examples: 0, 5, 10, 15 (pixels)',
                'adminbar_height': 'Examples: 32, 40, 48 (pixels)',
                'default': 'Please refer to the field description for valid values'
            };
            
            return examples[setting] || examples['default'];
        },
        
        cleanup: function() {
            console.log('LAS ErrorManager: Cleaning up...');
            
            // Remove event listeners
            $(window).off('.las-error-manager');
            $(document).off('.las-error-manager');
            
            // Clear notifications
            this.dismissAll();
            
            // Remove container
            if (this.container) {
                this.container.remove();
                this.container = null;
            }
            
            // Remove styles
            $('#las-notification-styles').remove();
            
            // Clear performance monitoring
            if (this.performanceMonitoring) {
                this.performanceMonitoring.enabled = false;
            }
            
            console.log('LAS ErrorManager: Cleanup complete');
        },

        getStatus: function () {
            return {
                isOnline: this.isOnline,
                notificationCount: this.notifications.length,
                offlineQueueLength: this.offlineQueue.length,
                notifications: this.notifications.map(function(n) {
                    return {
                        id: n.id,
                        type: n.type,
                        persistent: n.persistent,
                        timestamp: n.timestamp
                    };
                })
            };
        },

        // Cleanup method
        destroy: function () {
            $(window).off('.las-error-manager');
            $(document).off('.las-error-manager');
            this.dismissAll();
            if (this.container) {
                this.container.remove();
            }
            $('#las-notification-styles').remove();
            $('#las-offline-indicator').remove();
        }
    };

    // Enhanced Security Manager with unified nonce management
    var SecurityManager = {
        nonceRefreshInProgress: false,
        retryQueue: [],
        lastRefreshTime: 0,
        refreshThreshold: 2 * 60 * 60 * 1000, // 2 hours in milliseconds

        init: function () {
            this.setupNonceValidation();
            this.schedulePeriodicRefresh();
            console.log('LAS: Enhanced Security Manager initialized');
        },

        setupNonceValidation: function () {
            var self = this;
            
            // Override jQuery.post to add automatic nonce validation
            var originalPost = $.post;
            $.post = function(url, data, success, dataType) {
                // Only intercept our AJAX calls
                if (url === lasAdminData.ajax_url && data && typeof data === 'object') {
                    // Add nonce if not present
                    if (!data.nonce && data.action && data.action.indexOf('las_') === 0) {
                        data.nonce = lasAdminData.nonce;
                    }
                    
                    // Wrap success callback to handle nonce errors
                    var wrappedSuccess = function(response, textStatus, jqXHR) {
                        if (response && !response.success && response.data && response.data.refresh_nonce) {
                            console.log('LAS: Nonce validation failed, attempting refresh...');
                            self.handleNonceError(url, data, success, dataType);
                            return;
                        }
                        
                        if (typeof success === 'function') {
                            success(response, textStatus, jqXHR);
                        }
                    };
                    
                    return originalPost.call(this, url, data, wrappedSuccess, dataType);
                }
                
                return originalPost.apply(this, arguments);
            };
        },

        handleNonceError: function (url, originalData, originalSuccess, dataType) {
            var self = this;
            
            // Add to retry queue
            this.retryQueue.push({
                url: url,
                data: originalData,
                success: originalSuccess,
                dataType: dataType,
                attempts: 0
            });
            
            // Refresh nonce if not already in progress
            if (!this.nonceRefreshInProgress) {
                this.refreshNonce().then(function() {
                    self.processRetryQueue();
                }).catch(function(error) {
                    console.error('LAS: Failed to refresh nonce:', error);
                    self.processRetryQueue(); // Process queue anyway with old nonce
                });
            }
        },

        processRetryQueue: function () {
            var self = this;
            
            while (this.retryQueue.length > 0) {
                var request = this.retryQueue.shift();
                request.attempts++;
                
                if (request.attempts > (lasAdminData.retry_attempts || 3)) {
                    console.error('LAS: Max retry attempts reached for request:', request.data.action);
                    if (typeof request.success === 'function') {
                        request.success({
                            success: false,
                            data: {
                                message: 'Maximum retry attempts exceeded',
                                code: 'max_retries_exceeded'
                            }
                        });
                    }
                    continue;
                }
                
                // Update nonce in request data
                request.data.nonce = lasAdminData.nonce;
                
                // Retry the request
                setTimeout(function() {
                    $.post(request.url, request.data, request.success, request.dataType);
                }, (lasAdminData.retry_delay || 1000) * request.attempts);
            }
        },

        refreshNonce: function () {
            var self = this;
            
            if (this.nonceRefreshInProgress) {
                return Promise.resolve(lasAdminData.nonce);
            }
            
            this.nonceRefreshInProgress = true;
            
            return new Promise(function(resolve, reject) {
                // Use original jQuery.post to avoid interception
                jQuery.post(lasAdminData.ajax_url, {
                    action: 'las_refresh_nonce'
                })
                .done(function (response) {
                    if (response.success && response.data.nonce) {
                        var oldNonce = lasAdminData.nonce;
                        lasAdminData.nonce = response.data.nonce;
                        self.lastRefreshTime = Date.now();
                        
                        console.log('LAS: Security nonce refreshed successfully');
                        
                        // Trigger event for other components
                        $(document).trigger('las:nonce:refreshed', [response.data.nonce, oldNonce]);
                        
                        resolve(response.data.nonce);
                    } else {
                        reject(new Error('Invalid nonce refresh response'));
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    console.error('LAS: Failed to refresh nonce:', textStatus, errorThrown);
                    reject(new Error('Nonce refresh failed: ' + textStatus));
                })
                .always(function() {
                    self.nonceRefreshInProgress = false;
                });
            });
        },

        schedulePeriodicRefresh: function () {
            var self = this;
            
            if (!lasAdminData.auto_refresh_nonce) {
                return;
            }
            
            // Check if nonce needs refresh every 5 minutes
            setInterval(function() {
                var timeSinceRefresh = Date.now() - self.lastRefreshTime;
                var threshold = lasAdminData.refresh_threshold || self.refreshThreshold;
                
                if (timeSinceRefresh > threshold) {
                    console.log('LAS: Periodic nonce refresh triggered');
                    self.refreshNonce().catch(function(error) {
                        console.warn('LAS: Periodic nonce refresh failed:', error);
                    });
                }
            }, 5 * 60 * 1000); // 5 minutes
        },

        validateNonce: function (nonce) {
            return nonce && nonce === lasAdminData.nonce;
        },

        getCurrentNonce: function () {
            return lasAdminData.nonce;
        },

        isNonceExpired: function () {
            var timeSinceRefresh = Date.now() - this.lastRefreshTime;
            var lifetime = lasAdminData.nonce_lifetime || (12 * 60 * 60 * 1000); // 12 hours
            return timeSinceRefresh > lifetime;
        },

        getSecurityStatus: function () {
            return {
                nonce: lasAdminData.nonce,
                lastRefresh: this.lastRefreshTime,
                refreshInProgress: this.nonceRefreshInProgress,
                queueLength: this.retryQueue.length,
                isExpired: this.isNonceExpired()
            };
        },
        
        cleanup: function() {
            console.log('LAS SecurityManager: Cleaning up...');
            
            // Clear retry queue
            this.retryQueue = [];
            
            // Reset flags
            this.nonceRefreshInProgress = false;
            this.lastRefreshTime = 0;
            
            console.log('LAS SecurityManager: Cleanup complete');
        }
    };

    // Modern UI Integration Manager
    var ModernUIIntegration = {
        init: function() {
            console.log('LAS: Initializing Modern UI Integration...');
            
            this.setupFormEnhancements();
            this.setupNotificationSystem();
            this.setupAccessibilityFeatures();
            this.setupLoadingStates();
            this.setupThemeToggle();
            this.setupSearchAndFilters();
            
            console.log('LAS: Modern UI Integration complete');
        },
        
        setupFormEnhancements: function() {
            // Enhance form inputs with modern styling
            $('.las-form input, .las-form select, .las-form textarea').each(function() {
                var $input = $(this);
                
                // Add focus/blur handlers for modern input styling
                $input.on('focus', function() {
                    $(this).closest('.las-input-group').addClass('focused');
                }).on('blur', function() {
                    $(this).closest('.las-input-group').removeClass('focused');
                });
                
                // Add change handlers for validation
                $input.on('change', function() {
                    if (ModernUIManager.loadingManager) {
                        ModernUIManager.loadingManager.showFieldLoading(this);
                    }
                });
            });
            
            // Enhance submit button with loading states
            $('.las-button-primary[type="submit"]').on('click', function(e) {
                var $button = $(this);
                var $text = $button.find('.las-button-text');
                var $loading = $button.find('.las-button-loading');
                
                if ($loading.length) {
                    $text.hide();
                    $loading.show();
                    $button.prop('disabled', true);
                    
                    // Re-enable after form submission
                    setTimeout(function() {
                        $text.show();
                        $loading.hide();
                        $button.prop('disabled', false);
                    }, 2000);
                }
            });
        },
        
        setupNotificationSystem: function() {
            // Enhance existing notifications with modern styling
            $('.notice, .error, .updated').each(function() {
                var $notice = $(this);
                var type = 'info';
                
                if ($notice.hasClass('error')) type = 'error';
                else if ($notice.hasClass('updated')) type = 'success';
                
                // Convert to modern notification
                $notice.addClass('las-notification las-notification-' + type);
            });
            
            // Auto-dismiss notifications after 5 seconds
            $('.las-notification').each(function() {
                var $notification = $(this);
                setTimeout(function() {
                    $notification.fadeOut();
                }, 5000);
            });
        },
        
        setupAccessibilityFeatures: function() {
            // Enhance keyboard navigation
            $('.las-tab').on('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    $(this).click();
                }
            });
            
            // Add ARIA live regions for dynamic content
            if (!$('#las-aria-live').length) {
                $('body').append('<div id="las-aria-live" aria-live="polite" aria-atomic="true" class="screen-reader-text"></div>');
            }
            
            // Announce tab changes to screen readers
            $(document).on('las-tab-change', function(e) {
                $('#las-aria-live').text('Switched to ' + e.detail.tabId + ' tab');
            });
        },
        
        setupLoadingStates: function() {
            // Add skeleton loaders for form sections
            $('.las-card').each(function() {
                var $card = $(this);
                if (!$card.find('.las-skeleton').length) {
                    // Add loading skeleton that can be shown during AJAX operations
                    $card.prepend('<div class="las-skeleton-container" style="display: none;"><div class="las-skeleton las-skeleton-text"></div><div class="las-skeleton las-skeleton-text"></div><div class="las-skeleton las-skeleton-button"></div></div>');
                }
            });
        },
        
        setupThemeToggle: function() {
            // Enhanced theme toggle functionality
            $('.las-theme-toggle').on('click', function() {
                if (ModernUIManager.themeManager) {
                    ModernUIManager.themeManager.toggleTheme();
                    
                    // Update button text
                    var $button = $(this);
                    var $icon = $button.find('.las-theme-toggle-icon');
                    var $text = $button.find('.las-theme-toggle-text');
                    
                    var currentTheme = ModernUIManager.themeManager.getCurrentTheme();
                    if (currentTheme === 'dark') {
                        $icon.text('☀️');
                        $text.text('Light Mode');
                    } else {
                        $icon.text('🌙');
                        $text.text('Dark Mode');
                    }
                }
            });
        },
        
        setupSearchAndFilters: function() {
            // Enhanced search functionality
            var $searchInput = $('#las-settings-search');
            var $searchResults = $('#las-search-results');
            var searchTimeout;
            
            $searchInput.on('input', function() {
                var query = $(this).val().toLowerCase();
                
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function() {
                    if (query.length > 2) {
                        ModernUIIntegration.performSearch(query);
                        $searchResults.show();
                    } else {
                        $searchResults.hide();
                    }
                }, 300);
            });
            
            // Filter buttons
            $('.las-filter-button').on('click', function() {
                var $button = $(this);
                var filter = $button.data('filter');
                
                // Update active state
                $('.las-filter-button').removeClass('active');
                $button.addClass('active');
                
                // Apply filter
                ModernUIIntegration.applyFilter(filter);
            });
        },
        
        performSearch: function(query) {
            var results = [];
            var $resultsContent = $('#las-search-results .las-search-results-content');
            
            // Search through form labels and descriptions
            $('.las-form label, .las-form .description').each(function() {
                var $element = $(this);
                var text = $element.text().toLowerCase();
                
                if (text.includes(query)) {
                    var $section = $element.closest('.las-tab-panel');
                    var sectionId = $section.attr('id');
                    var sectionTitle = $('.las-tab[aria-controls="' + sectionId + '"] .las-tab-text').text();
                    
                    results.push({
                        title: $element.text().trim(),
                        section: sectionTitle,
                        sectionId: sectionId.replace('las-tab-', '')
                    });
                }
            });
            
            // Display results
            $resultsContent.empty();
            if (results.length > 0) {
                results.forEach(function(result) {
                    var $result = $('<div class="las-search-result" role="option">')
                        .html('<strong>' + result.title + '</strong><br><small>' + result.section + '</small>')
                        .on('click', function() {
                            StateManager.activateTab(result.sectionId);
                            $('#las-search-results').hide();
                            $searchInput.val('');
                        });
                    $resultsContent.append($result);
                });
                
                $('.las-search-results-count').text(results.length + ' results found');
            } else {
                $resultsContent.html('<div class="las-search-no-results">No results found</div>');
                $('.las-search-results-count').text('No results');
            }
        },
        
        applyFilter: function(filter) {
            if (filter === 'all') {
                $('.las-tab-panel').show();
                return;
            }
            
            // Hide all panels first
            $('.las-tab-panel').hide();
            
            // Show panels matching the filter
            $('.las-tab-panel').each(function() {
                var $panel = $(this);
                var panelId = $panel.attr('id');
                
                // Simple filter mapping - can be enhanced
                var showPanel = false;
                switch (filter) {
                    case 'layout':
                        showPanel = panelId.includes('general') || panelId.includes('menu') || panelId.includes('adminbar');
                        break;
                    case 'colors':
                        showPanel = $panel.find('[type="color"], .wp-color-picker').length > 0;
                        break;
                    case 'typography':
                        showPanel = $panel.find('select[name*="font"], input[name*="font"]').length > 0;
                        break;
                    case 'advanced':
                        showPanel = panelId.includes('advanced') || panelId.includes('logos');
                        break;
                }
                
                if (showPanel) {
                    $panel.show();
                }
            });
        }
    };

    // Initialize all managers
    try {
        SecurityManager.init();
        StateManager.init();
        ErrorManager.init();

        // Initialize modern UI components integration
        ModernUIIntegration.init();

        console.log('LAS: All managers initialized successfully');

    } catch (error) {
        console.error('LAS: Initialization error:', error);
    }

    // Enhanced AJAX wrapper with automatic nonce management
    window.lasAjax = function(action, data, options) {
        options = options || {};
        data = data || {};
        
        // Ensure action is provided
        if (!action) {
            console.error('LAS AJAX: Action is required');
            return Promise.reject(new Error('Action is required'));
        }
        
        // Prepare request data
        var requestData = $.extend({}, data, {
            action: action.indexOf('las_') === 0 ? action : 'las_' + action,
            nonce: SecurityManager.getCurrentNonce()
        });
        
        // Return promise for consistent handling
        return new Promise(function(resolve, reject) {
            $.post(lasAdminData.ajax_url, requestData)
                .done(function(response) {
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.data.message || 'Request failed'));
                    }
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    reject(new Error('Network error: ' + textStatus));
                });
        });
    };

    // Cleanup function for memory management
    function cleanup() {
        console.log('LAS: Cleaning up admin settings resources...');
        
        // Cleanup managers
        if (StateManager && typeof StateManager.cleanup === 'function') {
            StateManager.cleanup();
        }
        if (ErrorManager && typeof ErrorManager.cleanup === 'function') {
            ErrorManager.cleanup();
        }
        if (SecurityManager && typeof SecurityManager.cleanup === 'function') {
            SecurityManager.cleanup();
        }
        
        // Remove all namespaced event listeners
        $(document).off('.las-error-manager');
        $(document).off('.las-fallback-tabs');
        $(window).off('.las-error-manager');
        
        console.log('LAS: Admin settings cleanup complete');
    }
    
    // Global cleanup function
    window.LASAdminSettings = {
        cleanup: cleanup,
        StateManager: StateManager,
        ErrorManager: ErrorManager,
        SecurityManager: SecurityManager
    };
    
    // Cleanup on page unload
    $(window).on('beforeunload.las-admin-settings', cleanup);
    
    // Make managers globally available (backward compatibility)
    window.StateManager = StateManager;
    window.ErrorManager = ErrorManager;
    window.SecurityManager = SecurityManager;

    }); // End of main jQuery document ready

} else {
    console.warn('LAS: jQuery not available - skipping initialization');
}

// Accessibility Enhancement Module
var AccessibilityEnhancer = {
        accessibilityManager: null,
        
        init: function() {
            console.log('LAS: Initializing Accessibility Enhancements...');
            
            // Initialize accessibility manager if available
            if (typeof AccessibilityManager !== 'undefined') {
                this.accessibilityManager = new AccessibilityManager();
                console.log('✅ Accessibility Manager initialized');
            }

            this.addSkipLinks();
            this.enhanceAriaLabels();
            this.setupKeyboardNavigation();
            this.setupFocusManagement();
            this.setupFormValidation();
            this.setupColorContrastValidation();
            
            console.log('LAS: Accessibility Enhancements initialized');
        },

        /**
         * Add skip links for keyboard navigation
         */
        addSkipLinks: function() {
            if ($('.las-skip-link').length === 0) {
                var skipLinks = `
                    <a href="#las-main-content" class="las-skip-link las-sr-only-focusable">Skip to main content</a>
                    <a href="#las-navigation" class="las-skip-link las-sr-only-focusable">Skip to navigation</a>
                `;
                $('body').prepend(skipLinks);
            }
        },

        /**
         * Enhance existing elements with proper ARIA labels
         */
        enhanceAriaLabels: function() {
            // Add main content landmark
            if (!$('#las-main-content').length) {
                $('.wrap').attr('id', 'las-main-content').attr('role', 'main');
            }

            // Add navigation landmark to tabs
            $('.nav-tab-wrapper').attr('id', 'las-navigation').attr('role', 'navigation').attr('aria-label', 'Settings navigation');

            // Enhance tabs with proper ARIA attributes
            $('.nav-tab').each(function(index) {
                var $tab = $(this);
                var href = $tab.attr('href') || '';
                var tabId = href.replace('#', '') + '-tab';
                var panelId = href.replace('#', '');
                
                $tab.attr({
                    'role': 'tab',
                    'id': tabId,
                    'aria-controls': panelId,
                    'aria-selected': $tab.hasClass('nav-tab-active') ? 'true' : 'false',
                    'tabindex': $tab.hasClass('nav-tab-active') ? '0' : '-1'
                });
            });

            // Enhance tab panels
            $('.las-tab-content, .ui-tabs-panel').each(function() {
                var $panel = $(this);
                var panelId = $panel.attr('id');
                var tabId = panelId + '-tab';
                
                $panel.attr({
                    'role': 'tabpanel',
                    'aria-labelledby': tabId,
                    'tabindex': '0'
                });
            });

            // Enhance form elements
            $('input, select, textarea').each(function() {
                var $input = $(this);
                var $label = $('label[for="' + $input.attr('id') + '"]');
                
                if (!$label.length && !$input.attr('aria-label')) {
                    var placeholder = $input.attr('placeholder');
                    if (placeholder) {
                        $input.attr('aria-label', placeholder);
                    }
                }

                // Add required indicator
                if ($input.prop('required')) {
                    $label.attr('aria-required', 'true');
                }

                // Ensure minimum touch target
                if (!$input.hasClass('las-input')) {
                    $input.css('min-height', '44px');
                }
            });

            // Enhance buttons
            $('button, input[type="button"], input[type="submit"]').each(function() {
                var $button = $(this);
                
                // Ensure minimum touch target
                if (!$button.hasClass('las-button')) {
                    $button.css('min-height', '44px');
                }

                // Add accessible name if missing
                if (!$button.attr('aria-label') && !$button.text().trim()) {
                    var title = $button.attr('title');
                    if (title) {
                        $button.attr('aria-label', title);
                    }
                }
            });

            // Enhance color pickers
            $('.color-picker, .wp-color-picker').each(function() {
                var $picker = $(this);
                if (!$picker.attr('aria-label')) {
                    $picker.attr('aria-label', 'Color picker');
                }
                $picker.attr('role', 'button').attr('aria-haspopup', 'dialog');
            });

            // Enhance WordPress color picker buttons
            $('.wp-picker-open').each(function() {
                var $button = $(this);
                if (!$button.attr('aria-label')) {
                    $button.attr('aria-label', 'Open color picker');
                }
                $button.attr('aria-haspopup', 'dialog');
            });
        },

        /**
         * Setup comprehensive keyboard navigation
         */
        setupKeyboardNavigation: function() {
            var self = this;

            // Tab navigation with arrow keys
            $('.nav-tab').on('keydown', function(e) {
                var $tabs = $('.nav-tab');
                var currentIndex = $tabs.index(this);
                var targetIndex = currentIndex;

                switch(e.key) {
                    case 'ArrowRight':
                        targetIndex = (currentIndex + 1) % $tabs.length;
                        break;
                    case 'ArrowLeft':
                        targetIndex = currentIndex === 0 ? $tabs.length - 1 : currentIndex - 1;
                        break;
                    case 'Home':
                        targetIndex = 0;
                        break;
                    case 'End':
                        targetIndex = $tabs.length - 1;
                        break;
                    default:
                        return;
                }

                e.preventDefault();
                var $targetTab = $tabs.eq(targetIndex);
                $targetTab.trigger('click').focus();
                
                // Announce tab change
                self.announceToScreenReader('Switched to ' + $targetTab.text().trim() + ' tab');
            });

            // Global keyboard shortcuts
            $(document).on('keydown', function(e) {
                // Alt + M: Skip to main content
                if (e.altKey && e.key === 'm') {
                    e.preventDefault();
                    $('#las-main-content').focus();
                    self.announceToScreenReader('Skipped to main content');
                }

                // Alt + S: Toggle screen reader mode
                if (e.altKey && e.key === 's') {
                    e.preventDefault();
                    if (self.accessibilityManager) {
                        self.accessibilityManager.toggleScreenReaderMode();
                    }
                }

                // Alt + /: Focus search (if available)
                if (e.altKey && e.key === '/') {
                    e.preventDefault();
                    var $search = $('input[type="search"], #las-search');
                    if ($search.length) {
                        $search.first().focus();
                        self.announceToScreenReader('Search focused');
                    }
                }

                // Escape: Close any open modals or dropdowns
                if (e.key === 'Escape') {
                    $('.wp-picker-active').find('.wp-picker-close').trigger('click');
                    if (self.accessibilityManager) {
                        self.accessibilityManager.releaseFocusTrap();
                    }
                }
            });
        },

        /**
         * Setup focus management
         */
        setupFocusManagement: function() {
            // Track focus for better UX
            $(document).on('focusin', function(e) {
                $(e.target).addClass('las-focused');
                
                // Announce focused element to screen readers if needed
                var $element = $(e.target);
                if ($element.hasClass('las-announce-focus') && $element.attr('aria-label')) {
                    this.announceToScreenReader('Focused: ' + $element.attr('aria-label'));
                }
            }.bind(this)).on('focusout', function(e) {
                $(e.target).removeClass('las-focused');
            });

            // Keyboard vs mouse focus indication
            $(document).on('keydown', function() {
                $('body').addClass('las-keyboard-navigation');
            }).on('mousedown', function() {
                $('body').removeClass('las-keyboard-navigation');
            });

            // Ensure focused elements are visible
            $(document).on('focusin', function(e) {
                var $element = $(e.target);
                if ($element.length) {
                    // Scroll into view if needed
                    var elementTop = $element.offset().top;
                    var elementBottom = elementTop + $element.outerHeight();
                    var viewportTop = $(window).scrollTop();
                    var viewportBottom = viewportTop + $(window).height();

                    if (elementTop < viewportTop || elementBottom > viewportBottom) {
                        $element[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }
                }
            });

            // Focus trap for WordPress color picker
            $(document).on('wp-picker-open', function(e) {
                var $picker = $(e.target);
                var $container = $picker.closest('.wp-picker-container');
                
                if (this.accessibilityManager) {
                    this.accessibilityManager.createFocusTrap($container[0]);
                }
            }.bind(this));

            $(document).on('wp-picker-close', function(e) {
                if (this.accessibilityManager) {
                    this.accessibilityManager.releaseFocusTrap();
                }
            }.bind(this));
        },

        /**
         * Setup form validation with accessibility
         */
        setupFormValidation: function() {
            var self = this;

            // Enhanced form validation with ARIA
            $('form').on('submit', function(e) {
                var $form = $(this);
                var hasErrors = false;
                var errorMessages = [];

                // Validate required fields
                $form.find('[required]').each(function() {
                    var $field = $(this);
                    var value = $field.val().trim();
                    
                    if (!value) {
                        hasErrors = true;
                        $field.attr('aria-invalid', 'true');
                        
                        var label = $field.attr('aria-label') || 
                                   $('label[for="' + $field.attr('id') + '"]').text() || 
                                   'Field';
                        errorMessages.push(label + ' is required');
                        
                        // Add error styling
                        $field.addClass('las-error');
                    } else {
                        $field.attr('aria-invalid', 'false');
                        $field.removeClass('las-error');
                    }
                });

                // Validate email fields
                $form.find('input[type="email"]').each(function() {
                    var $field = $(this);
                    var value = $field.val().trim();
                    
                    if (value && !self.isValidEmail(value)) {
                        hasErrors = true;
                        $field.attr('aria-invalid', 'true');
                        $field.addClass('las-error');
                        errorMessages.push('Please enter a valid email address');
                    }
                });

                if (hasErrors) {
                    e.preventDefault();
                    
                    // Announce errors to screen readers
                    var errorMessage = 'Form has ' + errorMessages.length + ' error' + 
                                     (errorMessages.length > 1 ? 's' : '') + ': ' + 
                                     errorMessages.join(', ');
                    
                    self.announceToScreenReader(errorMessage, true);
                    
                    // Focus first error field
                    $form.find('[aria-invalid="true"]').first().focus();
                    
                    // Dispatch form error event
                    window.dispatchEvent(new CustomEvent('las-form-change', {
                        detail: { hasErrors: true, errors: errorMessages }
                    }));
                }
            });

            // Real-time validation feedback
            $('input, select, textarea').on('blur', function() {
                var $field = $(this);
                var value = $field.val().trim();
                
                // Required field validation
                if ($field.prop('required') && !value) {
                    $field.attr('aria-invalid', 'true');
                    $field.addClass('las-error');
                } else if ($field.attr('type') === 'email' && value && !self.isValidEmail(value)) {
                    $field.attr('aria-invalid', 'true');
                    $field.addClass('las-error');
                } else {
                    $field.attr('aria-invalid', 'false');
                    $field.removeClass('las-error');
                }
            });
        },

        /**
         * Setup color contrast validation
         */
        setupColorContrastValidation: function() {
            var self = this;

            // Monitor color changes for contrast validation
            $(document).on('change', '.color-picker, .wp-color-picker', function() {
                var $picker = $(this);
                var color = $picker.val();
                
                // Validate contrast if we have a background color context
                var contrastRatio = self.calculateContrastRatio(color, '#ffffff');
                
                if (contrastRatio < 4.5) {
                    self.announceToScreenReader('Warning: Low contrast ratio detected', true);
                    
                    // Dispatch validation error event
                    window.dispatchEvent(new CustomEvent('las-validation-error', {
                        detail: { 
                            message: 'Color contrast may not meet accessibility standards',
                            field: $picker.attr('id') || 'color picker',
                            ratio: contrastRatio
                        }
                    }));
                }
            });
        },

        /**
         * Announce message to screen readers
         */
        announceToScreenReader: function(message, assertive) {
            if (this.accessibilityManager) {
                this.accessibilityManager.announceToScreenReader(message, assertive);
            } else {
                // Fallback implementation
                var liveRegionId = assertive ? 'las-live-region-assertive' : 'las-live-region';
                var $liveRegion = $('#' + liveRegionId);
                
                if (!$liveRegion.length) {
                    $liveRegion = $('<div>')
                        .attr('id', liveRegionId)
                        .attr('aria-live', assertive ? 'assertive' : 'polite')
                        .attr('aria-atomic', 'true')
                        .addClass('las-sr-only')
                        .appendTo('body');
                }
                
                $liveRegion.text('');
                setTimeout(function() {
                    $liveRegion.text(message);
                }, 100);
                
                setTimeout(function() {
                    $liveRegion.text('');
                }, 3000);
            }
        },

        /**
         * Validate email format
         */
        isValidEmail: function(email) {
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        /**
         * Calculate contrast ratio between two colors
         */
        calculateContrastRatio: function(color1, color2) {
            // Simplified contrast calculation
            // In a real implementation, you'd convert colors to RGB and calculate actual contrast
            return 4.5; // Assume compliant for now
        },

        /**
         * Create focus trap for modals
         */
        createFocusTrap: function(container) {
            if (this.accessibilityManager) {
                return this.accessibilityManager.createFocusTrap(container);
            }
            
            // Fallback focus trap implementation
            var focusableElements = $(container).find('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
            
            if (focusableElements.length > 0) {
                focusableElements.first().focus();
                
                $(container).on('keydown.focus-trap', function(e) {
                    if (e.key === 'Tab') {
                        var firstElement = focusableElements.first()[0];
                        var lastElement = focusableElements.last()[0];
                        
                        if (e.shiftKey) {
                            if (document.activeElement === firstElement) {
                                e.preventDefault();
                                lastElement.focus();
                            }
                        } else {
                            if (document.activeElement === lastElement) {
                                e.preventDefault();
                                firstElement.focus();
                            }
                        }
                    }
                });
            }
        },

        /**
         * Release focus trap
         */
        releaseFocusTrap: function(container) {
            if (this.accessibilityManager) {
                return this.accessibilityManager.releaseFocusTrap();
            }
            
            // Fallback implementation
            if (container) {
                $(container).off('.focus-trap');
            } else {
                $('[data-focus-trap]').off('.focus-trap');
            }
        },

        /**
         * Get accessibility report
         */
        getAccessibilityReport: function() {
            if (this.accessibilityManager) {
                return this.accessibilityManager.getAccessibilityReport();
            }
            
            return {
                focusableElements: $('button, input, select, textarea, a[href]').length,
                ariaLabels: $('[aria-label]').length,
                skipLinks: $('.las-skip-link').length,
                liveRegions: $('[aria-live]').length
            };
        },

        /**
         * Cleanup accessibility enhancements
         */
        cleanup: function() {
            console.log('LAS AccessibilityEnhancer: Cleaning up...');
            
            if (this.accessibilityManager) {
                this.accessibilityManager.destroy();
                this.accessibilityManager = null;
            }
            
            // Remove event listeners
            $(document).off('.las-accessibility');
            $('.nav-tab').off('keydown');
            
            // Remove focus trap listeners
            $('[data-focus-trap]').off('.focus-trap');
            
            console.log('LAS AccessibilityEnhancer: Cleanup complete');
        }
    };

    // Initialize accessibility enhancements when document is ready
    if (typeof jQuery !== 'undefined' && typeof jQuery.fn !== 'undefined') {
        jQuery(document).ready(function($) {
            // Initialize accessibility after other components
            setTimeout(function() {
                AccessibilityEnhancer.init();
            }, 100);
        });

        // Cleanup on page unload
        jQuery(window).on('beforeunload', function() {
            if (typeof AccessibilityEnhancer !== 'undefined') {
                AccessibilityEnhancer.cleanup();
            }
        });
    }

    // Export for global access
    window.LAS_AccessibilityEnhancer = AccessibilityEnhancer;

/**
 * Live Preview Engine Class
 * Handles real-time CSS injection and DOM updates for live preview functionality
 */
class LASLivePreviewEngine {
    constructor(core) {
        this.core = core;
        this.styleElement = null;
        this.cssCache = new Map();
        this.updateQueue = [];
        this.isProcessing = false;
        this.cssRuleMap = new Map();
        this.initialized = false;
        
        // Performance tracking
        this.performanceMetrics = {
            updateCount: 0,
            totalUpdateTime: 0,
            averageUpdateTime: 0
        };
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.updateSetting = this.updateSetting.bind(this);
        this.processUpdateQueue = this.processUpdateQueue.bind(this);
        this.generateCSS = this.generateCSS.bind(this);
        this.applyCSS = this.applyCSS.bind(this);
    }
    
    /**
     * Initialize the live preview engine
     */
    async init() {
        try {
            console.log('LAS: Initializing Live Preview Engine...');
            
            this.createStyleElement();
            this.initializeCSSRuleMap();
            this.bindEvents();
            await this.loadInitialStyles();
            
            this.initialized = true;
            console.log('LAS: Live Preview Engine initialized successfully');
            
        } catch (error) {
            console.error('LAS: Failed to initialize Live Preview Engine:', error);
            throw error;
        }
    }
    
    /**
     * Create the style element for CSS injection
     * @private
     */
    createStyleElement() {
        // Remove existing style element if it exists
        const existingStyle = document.getElementById('las-live-preview-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'las-live-preview-styles';
        this.styleElement.type = 'text/css';
        this.styleElement.setAttribute('data-las-preview', 'true');
        
        // Add to head
        document.head.appendChild(this.styleElement);
        
        console.log('LAS: Live preview style element created');
    }
    
    /**
     * Initialize comprehensive CSS rule mapping system
     * @private
     */
    initializeCSSRuleMap() {
        // WordPress Admin Menu customizations
        this.addCSSRuleMapping('menu_background_color', {
            selector: '#adminmenu, #adminmenu .wp-submenu, #adminmenu .wp-submenu ul',
            property: 'background-color',
            important: true,
            description: 'Main admin menu background color'
        });
        
        this.addCSSRuleMapping('menu_text_color', {
            selector: '#adminmenu a, #adminmenu .wp-submenu a, #adminmenu .wp-menu-name',
            property: 'color',
            important: true,
            description: 'Admin menu text color'
        });
        
        this.addCSSRuleMapping('menu_hover_color', {
            selector: '#adminmenu a:hover, #adminmenu .wp-submenu a:hover, #adminmenu li:hover a',
            property: 'color',
            important: true,
            description: 'Admin menu hover text color'
        });
        
        this.addCSSRuleMapping('menu_hover_background', {
            selector: '#adminmenu a:hover, #adminmenu .wp-submenu a:hover, #adminmenu li:hover',
            property: 'background-color',
            important: true,
            description: 'Admin menu hover background color'
        });
        
        this.addCSSRuleMapping('menu_active_color', {
            selector: '#adminmenu .wp-has-current-submenu .wp-submenu .wp-submenu-head, #adminmenu .wp-menu-arrow, #adminmenu .wp-menu-arrow div, #adminmenu li.current a.menu-top, #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu, #adminmenu .current a.menu-top',
            property: 'color',
            important: true,
            description: 'Active menu item text color'
        });
        
        this.addCSSRuleMapping('menu_active_background', {
            selector: '#adminmenu li.current a.menu-top, #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu, #adminmenu .current',
            property: 'background-color',
            important: true,
            description: 'Active menu item background color'
        });
        
        this.addCSSRuleMapping('menu_separator_color', {
            selector: '#adminmenu li.wp-menu-separator',
            property: 'border-color',
            important: true,
            description: 'Menu separator color'
        });
        
        this.addCSSRuleMapping('menu_icon_color', {
            selector: '#adminmenu .wp-menu-image:before, #adminmenu .wp-menu-image img',
            property: 'color',
            important: true,
            description: 'Menu icon color'
        });
        
        // WordPress Admin Bar customizations
        this.addCSSRuleMapping('adminbar_background', {
            selector: '#wpadminbar',
            property: 'background',
            important: true,
            description: 'Admin bar background'
        });
        
        this.addCSSRuleMapping('adminbar_text_color', {
            selector: '#wpadminbar .ab-item, #wpadminbar a.ab-item, #wpadminbar > #wp-toolbar span.ab-label, #wpadminbar > #wp-toolbar span.noticon, #wpadminbar .ab-top-menu > li > .ab-item',
            property: 'color',
            important: true,
            description: 'Admin bar text color'
        });
        
        this.addCSSRuleMapping('adminbar_hover_color', {
            selector: '#wpadminbar .ab-top-menu > li:hover > .ab-item, #wpadminbar .ab-top-menu > li.hover > .ab-item, #wpadminbar .ab-top-menu > li > .ab-item:focus, #wpadminbar .ab-submenu .ab-item:hover',
            property: 'color',
            important: true,
            description: 'Admin bar hover text color'
        });
        
        this.addCSSRuleMapping('adminbar_hover_background', {
            selector: '#wpadminbar .ab-top-menu > li:hover > .ab-item, #wpadminbar .ab-top-menu > li.hover > .ab-item, #wpadminbar .ab-top-menu > li > .ab-item:focus, #wpadminbar .ab-submenu .ab-item:hover',
            property: 'background-color',
            important: true,
            description: 'Admin bar hover background color'
        });
        
        this.addCSSRuleMapping('adminbar_submenu_background', {
            selector: '#wpadminbar .ab-submenu, #wpadminbar .quicklinks .menupop ul li',
            property: 'background-color',
            important: true,
            description: 'Admin bar submenu background'
        });
        
        // Content Area customizations
        this.addCSSRuleMapping('content_background', {
            selector: '#wpbody-content, .wrap, #wpbody',
            property: 'background-color',
            important: true,
            description: 'Main content area background'
        });
        
        this.addCSSRuleMapping('content_text_color', {
            selector: '#wpbody-content, .wrap, #wpbody-content h1, #wpbody-content h2, #wpbody-content h3, #wpbody-content h4, #wpbody-content p',
            property: 'color',
            important: true,
            description: 'Content area text color'
        });
        
        this.addCSSRuleMapping('content_link_color', {
            selector: '#wpbody-content a, .wrap a',
            property: 'color',
            important: true,
            description: 'Content area link color'
        });
        
        this.addCSSRuleMapping('content_link_hover_color', {
            selector: '#wpbody-content a:hover, .wrap a:hover',
            property: 'color',
            important: true,
            description: 'Content area link hover color'
        });
        
        // Form Elements customizations
        this.addCSSRuleMapping('form_background', {
            selector: '.form-table, .form-table th, .form-table td, .form-wrap',
            property: 'background-color',
            important: true,
            description: 'Form table background'
        });
        
        this.addCSSRuleMapping('form_border_color', {
            selector: '.form-table, .form-table th, .form-table td, input[type="text"], input[type="email"], input[type="url"], input[type="password"], input[type="search"], input[type="number"], input[type="tel"], input[type="range"], input[type="date"], input[type="month"], input[type="week"], input[type="time"], input[type="datetime"], input[type="datetime-local"], input[type="color"], select, textarea',
            property: 'border-color',
            important: true,
            description: 'Form element border color'
        });
        
        this.addCSSRuleMapping('form_input_background', {
            selector: 'input[type="text"], input[type="email"], input[type="url"], input[type="password"], input[type="search"], input[type="number"], input[type="tel"], input[type="date"], input[type="month"], input[type="week"], input[type="time"], input[type="datetime"], input[type="datetime-local"], select, textarea',
            property: 'background-color',
            important: true,
            description: 'Form input background color'
        });
        
        this.addCSSRuleMapping('form_input_text_color', {
            selector: 'input[type="text"], input[type="email"], input[type="url"], input[type="password"], input[type="search"], input[type="number"], input[type="tel"], input[type="date"], input[type="month"], input[type="week"], input[type="time"], input[type="datetime"], input[type="datetime-local"], select, textarea',
            property: 'color',
            important: true,
            description: 'Form input text color'
        });
        
        this.addCSSRuleMapping('form_label_color', {
            selector: '.form-table th, .form-table label, .form-wrap label',
            property: 'color',
            important: true,
            description: 'Form label color'
        });
        
        // Button customizations
        this.addCSSRuleMapping('button_primary_background', {
            selector: '.button-primary, .wp-core-ui .button-primary',
            property: 'background-color',
            important: true,
            description: 'Primary button background'
        });
        
        this.addCSSRuleMapping('button_primary_text_color', {
            selector: '.button-primary, .wp-core-ui .button-primary',
            property: 'color',
            important: true,
            description: 'Primary button text color'
        });
        
        this.addCSSRuleMapping('button_primary_border_color', {
            selector: '.button-primary, .wp-core-ui .button-primary',
            property: 'border-color',
            important: true,
            description: 'Primary button border color'
        });
        
        this.addCSSRuleMapping('button_primary_hover_background', {
            selector: '.button-primary:hover, .wp-core-ui .button-primary:hover',
            property: 'background-color',
            important: true,
            description: 'Primary button hover background'
        });
        
        this.addCSSRuleMapping('button_secondary_background', {
            selector: '.button, .button-secondary, .wp-core-ui .button-secondary',
            property: 'background-color',
            important: true,
            description: 'Secondary button background'
        });
        
        this.addCSSRuleMapping('button_secondary_text_color', {
            selector: '.button, .button-secondary, .wp-core-ui .button-secondary',
            property: 'color',
            important: true,
            description: 'Secondary button text color'
        });
        
        this.addCSSRuleMapping('button_secondary_border_color', {
            selector: '.button, .button-secondary, .wp-core-ui .button-secondary',
            property: 'border-color',
            important: true,
            description: 'Secondary button border color'
        });
        
        // Notice/Alert customizations
        this.addCSSRuleMapping('notice_success_background', {
            selector: '.notice-success, .updated',
            property: 'background-color',
            important: true,
            description: 'Success notice background'
        });
        
        this.addCSSRuleMapping('notice_error_background', {
            selector: '.notice-error, .error',
            property: 'background-color',
            important: true,
            description: 'Error notice background'
        });
        
        this.addCSSRuleMapping('notice_warning_background', {
            selector: '.notice-warning',
            property: 'background-color',
            important: true,
            description: 'Warning notice background'
        });
        
        this.addCSSRuleMapping('notice_info_background', {
            selector: '.notice-info',
            property: 'background-color',
            important: true,
            description: 'Info notice background'
        });
        
        // Table customizations
        this.addCSSRuleMapping('table_header_background', {
            selector: '.wp-list-table thead th, .wp-list-table tfoot th',
            property: 'background-color',
            important: true,
            description: 'Table header background'
        });
        
        this.addCSSRuleMapping('table_row_background', {
            selector: '.wp-list-table tbody tr, .striped > tbody > :nth-child(odd)',
            property: 'background-color',
            important: true,
            description: 'Table row background'
        });
        
        this.addCSSRuleMapping('table_row_hover_background', {
            selector: '.wp-list-table tbody tr:hover',
            property: 'background-color',
            important: true,
            description: 'Table row hover background'
        });
        
        // Dashboard Widget customizations
        this.addCSSRuleMapping('widget_background', {
            selector: '.postbox, .stuffbox',
            property: 'background-color',
            important: true,
            description: 'Dashboard widget background'
        });
        
        this.addCSSRuleMapping('widget_header_background', {
            selector: '.postbox .hndle, .stuffbox .hndle',
            property: 'background-color',
            important: true,
            description: 'Widget header background'
        });
        
        this.addCSSRuleMapping('widget_header_text_color', {
            selector: '.postbox .hndle, .stuffbox .hndle',
            property: 'color',
            important: true,
            description: 'Widget header text color'
        });
        
        // Footer customizations
        this.addCSSRuleMapping('footer_background', {
            selector: '#wpfooter, #footer-thankyou',
            property: 'background-color',
            important: true,
            description: 'Footer background color'
        });
        
        this.addCSSRuleMapping('footer_text_color', {
            selector: '#wpfooter, #footer-thankyou, #wpfooter p',
            property: 'color',
            important: true,
            description: 'Footer text color'
        });
        
        console.log('LAS: Comprehensive CSS rule mapping initialized with', this.cssRuleMap.size, 'rules');
    }
    
    /**
     * Add a CSS rule mapping with validation
     * @param {string} key - Setting key
     * @param {Object} config - Rule configuration
     * @private
     */
    addCSSRuleMapping(key, config) {
        // Validate configuration
        if (!config.selector || !config.property) {
            console.warn(`LAS: Invalid CSS rule mapping for ${key}:`, config);
            return;
        }
        
        // Set defaults
        const ruleConfig = {
            selector: config.selector,
            property: config.property,
            important: config.important !== false, // Default to true
            description: config.description || `CSS rule for ${key}`,
            category: this.getCategoryFromKey(key)
        };
        
        this.cssRuleMap.set(key, ruleConfig);
    }
    
    /**
     * Get category from setting key for organization
     * @param {string} key - Setting key
     * @returns {string} Category name
     * @private
     */
    getCategoryFromKey(key) {
        if (key.startsWith('menu_')) return 'menu';
        if (key.startsWith('adminbar_')) return 'adminbar';
        if (key.startsWith('content_')) return 'content';
        if (key.startsWith('form_')) return 'forms';
        if (key.startsWith('button_')) return 'buttons';
        if (key.startsWith('notice_')) return 'notices';
        if (key.startsWith('table_')) return 'tables';
        if (key.startsWith('widget_')) return 'widgets';
        if (key.startsWith('footer_')) return 'footer';
        return 'general';
    }
    
    /**
     * Bind events for live preview functionality
     * @private
     */
    bindEvents() {
        // Listen for settings changes
        if (this.core) {
            this.core.on('settings:changed', (data) => {
                this.updateSetting(data.key, data.value);
            });
            
            // Listen for core events
            this.core.on('core:ready', () => {
                console.log('LAS: Live Preview Engine ready for updates');
            });
        }
        
        // Listen for window resize to recalculate styles if needed
        window.addEventListener('resize', this.debounce(() => {
            this.refreshAllStyles();
        }, 250));
    }
    
    /**
     * Load initial styles from settings
     * @private
     */
    async loadInitialStyles() {
        try {
            const settingsManager = this.core?.get('settings');
            if (!settingsManager) {
                console.warn('LAS: Settings manager not available, skipping initial styles');
                return;
            }
            
            // Get all current settings
            const settings = settingsManager.getAllSettings();
            if (!settings || Object.keys(settings).length === 0) {
                console.log('LAS: No initial settings found');
                return;
            }
            
            // Generate CSS for all settings
            const cssRules = [];
            for (const [key, value] of Object.entries(settings)) {
                const cssRule = this.generateCSSRule(key, value);
                if (cssRule) {
                    cssRules.push(cssRule);
                    this.cssCache.set(key, cssRule);
                }
            }
            
            // Apply all CSS at once
            if (cssRules.length > 0) {
                const css = cssRules.join('\n');
                this.applyCSS(css);
                console.log('LAS: Initial styles applied for', cssRules.length, 'settings');
            }
            
        } catch (error) {
            console.error('LAS: Failed to load initial styles:', error);
            if (this.core?.get('error')) {
                this.core.get('error').handleError(error, 'Loading initial styles');
            }
        }
    }
    
    /**
     * Update a setting and trigger live preview
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    updateSetting(key, value) {
        if (!this.initialized) {
            console.warn('LAS: Live Preview Engine not initialized, queuing update');
        }
        
        // Add to update queue with timestamp
        this.updateQueue.push({ 
            key, 
            value, 
            timestamp: Date.now() 
        });
        
        // Process queue with debouncing
        this.processUpdateQueue();
    }
    
    /**
     * Process the update queue with requestAnimationFrame for smooth updates
     * @private
     */
    processUpdateQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            const startTime = performance.now();
            
            try {
                // Get all queued updates
                const updates = [...this.updateQueue];
                this.updateQueue = [];
                
                if (updates.length === 0) {
                    this.isProcessing = false;
                    return;
                }
                
                // Generate CSS for all updates
                const css = this.generateCSS(updates);
                
                // Apply CSS if there are changes
                if (css) {
                    this.applyCSS(css);
                }
                
                // Update performance metrics
                const endTime = performance.now();
                const updateTime = endTime - startTime;
                this.updatePerformanceMetrics(updateTime, updates.length);
                
                console.log(`LAS: Processed ${updates.length} updates in ${updateTime.toFixed(2)}ms`);
                
            } catch (error) {
                console.error('LAS: Error processing update queue:', error);
                if (this.core?.get('error')) {
                    this.core.get('error').handleError(error, 'Processing live preview updates');
                }
            } finally {
                this.isProcessing = false;
                
                // Process any queued updates that came in during processing
                if (this.updateQueue.length > 0) {
                    // Use a small delay to prevent excessive recursion
                    setTimeout(() => this.processUpdateQueue(), 16);
                }
            }
        });
    }
    
    /**
     * Generate CSS for multiple updates with caching
     * @param {Array} updates - Array of update objects
     * @returns {string} Generated CSS
     * @private
     */
    generateCSS(updates) {
        let css = '';
        const processedKeys = new Set();
        const newRules = [];
        
        // Process updates in reverse order to handle duplicates (latest wins)
        for (let i = updates.length - 1; i >= 0; i--) {
            const { key, value } = updates[i];
            
            // Skip if we've already processed this key
            if (processedKeys.has(key)) continue;
            processedKeys.add(key);
            
            // Check if we have a cached rule for this exact key-value pair
            const cacheKey = `${key}:${value}`;
            if (this.cssGenerationCache && this.cssGenerationCache.has(cacheKey)) {
                const cachedRule = this.cssGenerationCache.get(cacheKey);
                css = cachedRule + '\n' + css;
                this.cssCache.set(key, cachedRule);
                continue;
            }
            
            const cssRule = this.generateCSSRule(key, value);
            if (cssRule) {
                css = cssRule + '\n' + css;
                this.cssCache.set(key, cssRule);
                newRules.push({ key, value, rule: cssRule });
                
                // Cache the generated rule
                if (!this.cssGenerationCache) {
                    this.cssGenerationCache = new Map();
                }
                this.cssGenerationCache.set(cacheKey, cssRule);
            }
        }
        
        // Log performance metrics
        if (newRules.length > 0) {
            console.log(`LAS: Generated ${newRules.length} new CSS rules, used cache for ${updates.length - newRules.length} rules`);
        }
        
        return css;
    }
    
    /**
     * Generate CSS rule for a specific setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {string|null} CSS rule or null if not applicable
     * @private
     */
    generateCSSRule(key, value) {
        // Skip empty or null values
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        // Get CSS rule configuration
        const ruleConfig = this.cssRuleMap.get(key);
        if (!ruleConfig) {
            // Check for dynamic rules (custom CSS, etc.)
            return this.generateDynamicCSSRule(key, value);
        }
        
        const { selector, property, important = false } = ruleConfig;
        const importantFlag = important ? ' !important' : '';
        
        // Validate and sanitize value
        const sanitizedValue = this.sanitizeCSSValue(property, value);
        if (!sanitizedValue) {
            return null;
        }
        
        return `${selector} { ${property}: ${sanitizedValue}${importantFlag}; }`;
    }
    
    /**
     * Generate dynamic CSS rules for custom settings
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {string|null} CSS rule or null
     * @private
     */
    generateDynamicCSSRule(key, value) {
        // Handle custom CSS
        if (key === 'custom_css' && typeof value === 'string') {
            return this.sanitizeCustomCSS(value);
        }
        
        // Handle font size settings
        if (key.includes('font_size') && !isNaN(value)) {
            const selector = this.getFontSizeSelector(key);
            if (selector) {
                return `${selector} { font-size: ${value}px !important; }`;
            }
        }
        
        // Handle opacity settings
        if (key.includes('opacity') && !isNaN(value)) {
            const selector = this.getOpacitySelector(key);
            if (selector) {
                const opacity = Math.max(0, Math.min(1, parseFloat(value)));
                return `${selector} { opacity: ${opacity} !important; }`;
            }
        }
        
        return null;
    }
    
    /**
     * Get font size selector for dynamic font size rules
     * @param {string} key - Setting key
     * @returns {string|null} CSS selector
     * @private
     */
    getFontSizeSelector(key) {
        const fontSizeMap = {
            'menu_font_size': '#adminmenu a',
            'content_font_size': '#wpbody-content, .wrap',
            'adminbar_font_size': '#wpadminbar .ab-item'
        };
        
        return fontSizeMap[key] || null;
    }
    
    /**
     * Get opacity selector for dynamic opacity rules
     * @param {string} key - Setting key
     * @returns {string|null} CSS selector
     * @private
     */
    getOpacitySelector(key) {
        const opacityMap = {
            'menu_opacity': '#adminmenu',
            'adminbar_opacity': '#wpadminbar',
            'content_opacity': '#wpbody-content'
        };
        
        return opacityMap[key] || null;
    }
    
    /**
     * Sanitize CSS values to prevent injection attacks
     * @param {string} property - CSS property name
     * @param {*} value - CSS value
     * @returns {string|null} Sanitized value or null if invalid
     * @private
     */
    sanitizeCSSValue(property, value) {
        if (typeof value !== 'string' && typeof value !== 'number') {
            return null;
        }
        
        const stringValue = String(value).trim();
        
        // Color properties
        if (property.includes('color') || property === 'background') {
            return this.sanitizeColorValue(stringValue);
        }
        
        // Size properties
        if (property.includes('size') || property.includes('width') || property.includes('height')) {
            return this.sanitizeSizeValue(stringValue);
        }
        
        // Generic sanitization - remove dangerous content
        const dangerous = /javascript:|expression\(|@import|behavior:|vbscript:/i;
        if (dangerous.test(stringValue)) {
            return null;
        }
        
        // Basic CSS value validation
        if (!/^[a-zA-Z0-9\s\-_.,#%()]+$/.test(stringValue)) {
            return null;
        }
        
        return stringValue;
    }
    
    /**
     * Sanitize color values
     * @param {string} value - Color value
     * @returns {string|null} Sanitized color or null
     * @private
     */
    sanitizeColorValue(value) {
        // Hex colors
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
            return value;
        }
        
        // RGB colors
        if (/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.test(value)) {
            return value.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/, (match, r, g, b) => {
                const red = Math.max(0, Math.min(255, parseInt(r)));
                const green = Math.max(0, Math.min(255, parseInt(g)));
                const blue = Math.max(0, Math.min(255, parseInt(b)));
                return `rgb(${red}, ${green}, ${blue})`;
            });
        }
        
        // RGBA colors
        if (/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.test(value)) {
            return value.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/, (match, r, g, b, a) => {
                const red = Math.max(0, Math.min(255, parseInt(r)));
                const green = Math.max(0, Math.min(255, parseInt(g)));
                const blue = Math.max(0, Math.min(255, parseInt(b)));
                const alpha = Math.max(0, Math.min(1, parseFloat(a)));
                return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
            });
        }
        
        // Named colors (basic validation)
        const namedColors = ['transparent', 'inherit', 'initial', 'unset', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey'];
        if (namedColors.includes(value.toLowerCase())) {
            return value.toLowerCase();
        }
        
        return null;
    }
    
    /**
     * Sanitize size values
     * @param {string} value - Size value
     * @returns {string|null} Sanitized size or null
     * @private
     */
    sanitizeSizeValue(value) {
        // Numeric values with units
        if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch)$/.test(value)) {
            return value;
        }
        
        // Pure numbers (assume pixels)
        if (/^\d+(\.\d+)?$/.test(value)) {
            return value + 'px';
        }
        
        // Keywords
        const sizeKeywords = ['auto', 'inherit', 'initial', 'unset', 'normal', 'bold', 'lighter', 'bolder'];
        if (sizeKeywords.includes(value.toLowerCase())) {
            return value.toLowerCase();
        }
        
        return null;
    }
    
    /**
     * Sanitize custom CSS
     * @param {string} css - Custom CSS
     * @returns {string} Sanitized CSS
     * @private
     */
    sanitizeCustomCSS(css) {
        // Remove dangerous content
        const dangerous = [
            /javascript\s*:/gi,
            /expression\s*\(/gi,
            /@import/gi,
            /behavior\s*:/gi,
            /-moz-binding/gi,
            /vbscript\s*:/gi,
            /<script/gi,
            /<\/script>/gi
        ];
        
        let sanitized = css;
        dangerous.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        return sanitized;
    }
    
    /**
     * Apply CSS to the style element
     * @param {string} css - CSS to apply
     * @private
     */
    applyCSS(css) {
        if (!this.styleElement) {
            console.error('LAS: Style element not available');
            return;
        }
        
        try {
            // Get existing CSS from cache
            const cachedCSS = Array.from(this.cssCache.values()).join('\n');
            
            // Combine with new CSS
            const finalCSS = cachedCSS + '\n' + css;
            
            // Apply to style element
            this.styleElement.textContent = finalCSS;
            
            // Emit event for other components
            if (this.core) {
                this.core.emit('preview:updated', {
                    cssLength: finalCSS.length,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('LAS: Failed to apply CSS:', error);
            if (this.core?.get('error')) {
                this.core.get('error').handleError(error, 'Applying live preview CSS');
            }
        }
    }
    
    /**
     * Refresh all styles (useful after major changes)
     */
    refreshAllStyles() {
        try {
            console.log('LAS: Refreshing all live preview styles...');
            
            const settingsManager = this.core?.get('settings');
            if (!settingsManager) {
                console.warn('LAS: Settings manager not available for refresh');
                return;
            }
            
            // Clear cache
            this.cssCache.clear();
            
            // Reload all styles
            this.loadInitialStyles();
            
        } catch (error) {
            console.error('LAS: Failed to refresh styles:', error);
            if (this.core?.get('error')) {
                this.core.get('error').handleError(error, 'Refreshing live preview styles');
            }
        }
    }
    
    /**
     * Update performance metrics
     * @param {number} updateTime - Time taken for update
     * @param {number} updateCount - Number of updates processed
     * @private
     */
    updatePerformanceMetrics(updateTime, updateCount) {
        this.performanceMetrics.updateCount += updateCount;
        this.performanceMetrics.totalUpdateTime += updateTime;
        this.performanceMetrics.averageUpdateTime = 
            this.performanceMetrics.totalUpdateTime / this.performanceMetrics.updateCount;
    }
    
    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    /**
     * Debounce utility function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     * @private
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Check if live preview is initialized
     * @returns {boolean} Initialization status
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Get current CSS cache
     * @returns {Map} CSS cache
     */
    getCSSCache() {
        return new Map(this.cssCache);
    }
    
    /**
     * Clear CSS cache
     */
    clearCache() {
        this.cssCache.clear();
        if (this.cssGenerationCache) {
            this.cssGenerationCache.clear();
        }
        if (this.styleElement) {
            this.styleElement.textContent = '';
        }
        console.log('LAS: Live preview cache cleared');
    }
    
    /**
     * Get CSS rule mapping information
     * @param {string} key - Setting key (optional)
     * @returns {Object|Map} Rule mapping info
     */
    getCSSRuleMapping(key = null) {
        if (key) {
            return this.cssRuleMap.get(key) || null;
        }
        return new Map(this.cssRuleMap);
    }
    
    /**
     * Get CSS rules by category
     * @param {string} category - Category name
     * @returns {Map} Rules in the category
     */
    getCSSRulesByCategory(category) {
        const categoryRules = new Map();
        
        for (const [key, config] of this.cssRuleMap) {
            if (config.category === category) {
                categoryRules.set(key, config);
            }
        }
        
        return categoryRules;
    }
    
    /**
     * Get all available categories
     * @returns {Array} Array of category names
     */
    getAvailableCategories() {
        const categories = new Set();
        
        for (const [, config] of this.cssRuleMap) {
            categories.add(config.category);
        }
        
        return Array.from(categories).sort();
    }
    
    /**
     * Add or update a CSS rule mapping dynamically
     * @param {string} key - Setting key
     * @param {Object} config - Rule configuration
     * @returns {boolean} Success status
     */
    addOrUpdateCSSRule(key, config) {
        try {
            this.addCSSRuleMapping(key, config);
            
            // Clear any cached CSS for this key
            if (this.cssGenerationCache) {
                for (const cacheKey of this.cssGenerationCache.keys()) {
                    if (cacheKey.startsWith(`${key}:`)) {
                        this.cssGenerationCache.delete(cacheKey);
                    }
                }
            }
            
            console.log(`LAS: CSS rule mapping updated for ${key}`);
            return true;
            
        } catch (error) {
            console.error(`LAS: Failed to update CSS rule mapping for ${key}:`, error);
            return false;
        }
    }
    
    /**
     * Remove a CSS rule mapping
     * @param {string} key - Setting key
     * @returns {boolean} Success status
     */
    removeCSSRule(key) {
        try {
            const removed = this.cssRuleMap.delete(key);
            
            if (removed) {
                // Clear cached CSS for this key
                this.cssCache.delete(key);
                
                if (this.cssGenerationCache) {
                    for (const cacheKey of this.cssGenerationCache.keys()) {
                        if (cacheKey.startsWith(`${key}:`)) {
                            this.cssGenerationCache.delete(cacheKey);
                        }
                    }
                }
                
                console.log(`LAS: CSS rule mapping removed for ${key}`);
            }
            
            return removed;
            
        } catch (error) {
            console.error(`LAS: Failed to remove CSS rule mapping for ${key}:`, error);
            return false;
        }
    }
    
    /**
     * Validate CSS rule mapping
     * @param {Object} config - Rule configuration
     * @returns {Object} Validation result
     */
    validateCSSRuleMapping(config) {
        const errors = [];
        const warnings = [];
        
        // Required fields
        if (!config.selector) {
            errors.push('Selector is required');
        }
        
        if (!config.property) {
            errors.push('Property is required');
        }
        
        // Validate selector syntax (basic check)
        if (config.selector && !/^[a-zA-Z0-9\s\-_#.,:\[\]()>+~*"'=]+$/.test(config.selector)) {
            warnings.push('Selector contains potentially unsafe characters');
        }
        
        // Validate property name
        if (config.property && !/^[a-zA-Z\-]+$/.test(config.property)) {
            errors.push('Invalid CSS property name');
        }
        
        // Check for dangerous properties
        const dangerousProperties = ['behavior', 'expression', '-moz-binding'];
        if (config.property && dangerousProperties.includes(config.property.toLowerCase())) {
            errors.push('Property is not allowed for security reasons');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Get CSS generation statistics
     * @returns {Object} Statistics object
     */
    getCSSGenerationStats() {
        return {
            totalRules: this.cssRuleMap.size,
            cachedRules: this.cssCache.size,
            generationCacheSize: this.cssGenerationCache ? this.cssGenerationCache.size : 0,
            categories: this.getAvailableCategories().length,
            performanceMetrics: this.getPerformanceMetrics()
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('LAS: Cleaning up Live Preview Engine...');
        
        try {
            // Clear update queue
            this.updateQueue = [];
            this.isProcessing = false;
            
            // Clear cache
            this.cssCache.clear();
            
            // Remove style element
            if (this.styleElement && this.styleElement.parentNode) {
                this.styleElement.parentNode.removeChild(this.styleElement);
                this.styleElement = null;
            }
            
            // Clear rule map
            this.cssRuleMap.clear();
            
            // Reset state
            this.initialized = false;
            
            console.log('LAS: Live Preview Engine cleanup complete');
            
        } catch (error) {
            console.error('LAS: Error during Live Preview Engine cleanup:', error);
        }
    }
}
/**
 
* Form Element Binder Class
 * Handles binding of all form elements to the live preview system
 */
class LASFormElementBinder {
    constructor(core, settingsManager) {
        this.core = core;
        this.settingsManager = settingsManager;
        this.boundElements = new Map();
        this.debounceTimers = new Map();
        this.validationRules = new Map();
        this.errorElements = new Map();
        
        // Bind methods to maintain context
        this.bindAllElements = this.bindAllElements.bind(this);
        this.bindColorPickers = this.bindColorPickers.bind(this);
        this.bindTextInputs = this.bindTextInputs.bind(this);
        this.bindSliders = this.bindSliders.bind(this);
        this.bindToggles = this.bindToggles.bind(this);
        this.bindDropdowns = this.bindDropdowns.bind(this);
        this.bindTextareas = this.bindTextareas.bind(this);
        this.bindImageUploads = this.bindImageUploads.bind(this);
        this.validateField = this.validateField.bind(this);
        this.showFieldError = this.showFieldError.bind(this);
        this.clearFieldError = this.clearFieldError.bind(this);
        
        this.setupValidationRules();
    }
    
    /**
     * Set up validation rules for different field types
     * @private
     */
    setupValidationRules() {
        // Color validation
        this.validationRules.set('color', {
            pattern: /^(#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\))$/,
            message: 'Please enter a valid color (hex, rgb, or rgba format)'
        });
        
        // URL validation
        this.validationRules.set('url', {
            pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            message: 'Please enter a valid URL'
        });
        
        // Number validation
        this.validationRules.set('number', {
            validate: (value, min, max) => {
                const num = parseFloat(value);
                if (isNaN(num)) return false;
                if (min !== undefined && num < min) return false;
                if (max !== undefined && num > max) return false;
                return true;
            },
            message: 'Please enter a valid number within the allowed range'
        });
        
        // CSS validation (basic)
        this.validationRules.set('css', {
            validate: (value) => {
                // Basic CSS validation - check for dangerous patterns
                const dangerousPatterns = [
                    /javascript\s*:/i,
                    /expression\s*\(/i,
                    /@import/i,
                    /behavior\s*:/i,
                    /-moz-binding/i,
                    /vbscript\s*:/i
                ];
                return !dangerousPatterns.some(pattern => pattern.test(value));
            },
            message: 'CSS contains potentially dangerous content'
        });
    }
    
    /**
     * Bind all form elements to the live preview system
     */
    bindAllElements() {
        try {
            console.log('LAS: Starting comprehensive form element binding...');
            
            // Bind different types of form elements
            this.bindColorPickers();
            this.bindTextInputs();
            this.bindSliders();
            this.bindToggles();
            this.bindDropdowns();
            this.bindTextareas();
            this.bindImageUploads();
            
            // Set up form validation
            this.setupFormValidation();
            
            // Set up accessibility features
            this.setupAccessibilityFeatures();
            
            console.log(`LAS: Form element binding complete. Bound ${this.boundElements.size} elements.`);
            
        } catch (error) {
            this.core.handleError(error, 'Form element binding');
        }
    }
    
    /**
     * Bind color picker elements
     */
    bindColorPickers() {
        const colorPickers = document.querySelectorAll('.las-fresh-color-picker, input[type="color"]');
        
        colorPickers.forEach(picker => {
            const settingKey = this.getSettingKey(picker);
            if (!settingKey) return;
            
            // Store element reference
            this.boundElements.set(settingKey, {
                element: picker,
                type: 'color',
                validator: 'color'
            });
            
            // Immediate update on change (when color picker closes)
            picker.addEventListener('change', (e) => {
                if (this.validateField(picker, e.target.value)) {
                    this.settingsManager.set(settingKey, e.target.value);
                    this.clearFieldError(picker);
                }
            });
            
            // Real-time update on input (for smooth color transitions)
            picker.addEventListener('input', (e) => {
                if (this.validateField(picker, e.target.value)) {
                    this.settingsManager.set(settingKey, e.target.value, { skipSave: true });
                    this.clearFieldError(picker);
                }
            });
            
            // Add color picker enhancement for text inputs with color picker class
            if (picker.type === 'text' && picker.classList.contains('las-fresh-color-picker')) {
                this.enhanceColorPicker(picker);
            }
        });
        
        console.log(`LAS: Bound ${colorPickers.length} color picker elements`);
    }
    
    /**
     * Enhance text-based color pickers with additional functionality
     * @private
     */
    enhanceColorPicker(picker) {
        // Add color preview
        const preview = document.createElement('div');
        preview.className = 'las-color-preview';
        preview.style.cssText = `
            width: 30px;
            height: 30px;
            border: 2px solid #ddd;
            border-radius: 4px;
            display: inline-block;
            margin-left: 8px;
            vertical-align: middle;
            cursor: pointer;
            background-color: ${picker.value || '#ffffff'};
        `;
        
        picker.parentNode.insertBefore(preview, picker.nextSibling);
        
        // Update preview on value change
        picker.addEventListener('input', () => {
            if (this.validateField(picker, picker.value)) {
                preview.style.backgroundColor = picker.value;
            }
        });
        
        // Click preview to open native color picker
        preview.addEventListener('click', () => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = picker.value || '#ffffff';
            colorInput.style.opacity = '0';
            colorInput.style.position = 'absolute';
            colorInput.style.pointerEvents = 'none';
            
            document.body.appendChild(colorInput);
            colorInput.click();
            
            colorInput.addEventListener('change', () => {
                picker.value = colorInput.value;
                picker.dispatchEvent(new Event('input', { bubbles: true }));
                picker.dispatchEvent(new Event('change', { bubbles: true }));
                document.body.removeChild(colorInput);
            });
        });
    }
    
    /**
     * Bind text input elements with debouncing
     */
    bindTextInputs() {
        const textInputs = document.querySelectorAll('input[type="text"]:not(.las-fresh-color-picker), input[type="url"], input[type="email"], input[type="number"]');
        
        textInputs.forEach(input => {
            const settingKey = this.getSettingKey(input);
            if (!settingKey) return;
            
            // Determine validator based on input type or setting key
            let validator = 'text';
            if (input.type === 'url' || settingKey.includes('url')) {
                validator = 'url';
            } else if (input.type === 'number' || settingKey.includes('size') || settingKey.includes('width') || settingKey.includes('height')) {
                validator = 'number';
            } else if (settingKey.includes('css')) {
                validator = 'css';
            }
            
            // Store element reference
            this.boundElements.set(settingKey, {
                element: input,
                type: input.type === 'number' ? 'number' : 'text',
                validator: validator
            });
            
            // Debounced input handling
            input.addEventListener('input', (e) => {
                this.debouncedUpdate(settingKey, e.target.value, input);
            });
            
            // Immediate validation on blur
            input.addEventListener('blur', (e) => {
                if (this.validateField(input, e.target.value)) {
                    this.settingsManager.set(settingKey, e.target.value);
                    this.clearFieldError(input);
                }
            });
        });
        
        console.log(`LAS: Bound ${textInputs.length} text input elements`);
    }
    
    /**
     * Bind slider and range input elements
     */
    bindSliders() {
        // Note: jQuery UI slider initialization is handled by live-preview.js to avoid conflicts
        
        // Bind both HTML5 range inputs and custom LAS sliders
        const sliders = document.querySelectorAll('input[type="range"], .las-slider');
        const numberInputs = document.querySelectorAll('.las-slider-input');
        
        // Bind HTML5 range inputs
        sliders.forEach(slider => {
            const settingKey = this.getSettingKey(slider);
            if (!settingKey) return;
            
            this.boundElements.set(settingKey, {
                element: slider,
                type: 'slider',
                validator: 'number'
            });
            
            // Real-time update on input for smooth sliding
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.validateField(slider, value)) {
                    this.settingsManager.set(settingKey, value, { skipSave: true });
                    this.updateSliderDisplay(slider, value);
                    this.clearFieldError(slider);
                }
            });
            
            // Save on change (when user releases slider)
            slider.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (this.validateField(slider, value)) {
                    this.settingsManager.set(settingKey, value);
                    this.clearFieldError(slider);
                }
            });
        });
        
        // Bind number inputs associated with sliders
        numberInputs.forEach(input => {
            const settingKey = this.getSettingKey(input);
            if (!settingKey) return;
            
            input.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                
                if (this.validateField(input, value, min, max)) {
                    this.settingsManager.set(settingKey, value);
                    this.updateAssociatedSlider(settingKey, value);
                    this.clearFieldError(input);
                }
            });
        });
        
        console.log(`LAS: Bound ${sliders.length} slider elements and ${numberInputs.length} number inputs`);
    }
    

    
    /**
     * Update slider display value
     * @private
     */
    updateSliderDisplay(slider, value) {
        const settingKey = this.getSettingKey(slider);
        const valueDisplay = document.getElementById(`${settingKey}-value`);
        const unit = slider.dataset.unit || '';
        
        if (valueDisplay) {
            valueDisplay.textContent = value + (unit === 'none' ? '' : unit);
        }
        
        // Update associated number input
        const numberInput = document.getElementById(settingKey);
        if (numberInput && numberInput.classList.contains('las-slider-input')) {
            numberInput.value = value;
        }
    }
    
    /**
     * Update associated slider when number input changes
     * @private
     */
    updateAssociatedSlider(settingKey, value) {
        const slider = document.getElementById(`${settingKey}-slider`);
        if (slider) {
            slider.value = value;
            this.updateSliderDisplay(slider, value);
        }
    }
    
    /**
     * Bind toggle and checkbox elements
     */
    bindToggles() {
        const toggles = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
        
        toggles.forEach(toggle => {
            const settingKey = this.getSettingKey(toggle);
            if (!settingKey) return;
            
            this.boundElements.set(settingKey, {
                element: toggle,
                type: toggle.type === 'radio' ? 'radio' : 'toggle',
                validator: 'boolean'
            });
            
            toggle.addEventListener('change', (e) => {
                let value;
                if (e.target.type === 'radio') {
                    value = e.target.value;
                } else {
                    value = e.target.checked;
                }
                
                this.settingsManager.set(settingKey, value);
                this.clearFieldError(toggle);
                
                // Handle dependency triggers
                if (toggle.hasAttribute('data-dependency-trigger')) {
                    this.handleDependencyTrigger(toggle, value);
                }
            });
        });
        
        console.log(`LAS: Bound ${toggles.length} toggle elements`);
    }
    
    /**
     * Bind dropdown/select elements
     */
    bindDropdowns() {
        const dropdowns = document.querySelectorAll('select');
        
        dropdowns.forEach(dropdown => {
            const settingKey = this.getSettingKey(dropdown);
            if (!settingKey) return;
            
            this.boundElements.set(settingKey, {
                element: dropdown,
                type: 'select',
                validator: 'select'
            });
            
            dropdown.addEventListener('change', (e) => {
                this.settingsManager.set(settingKey, e.target.value);
                this.clearFieldError(dropdown);
                
                // Handle dependency triggers
                if (dropdown.hasAttribute('data-dependency-trigger')) {
                    this.handleDependencyTrigger(dropdown, e.target.value);
                }
                
                // Handle special cases like Google Font selection
                if (dropdown.classList.contains('las-font-family-select')) {
                    this.handleFontFamilyChange(dropdown, e.target.value);
                }
            });
        });
        
        console.log(`LAS: Bound ${dropdowns.length} dropdown elements`);
    }
    
    /**
     * Bind textarea elements
     */
    bindTextareas() {
        const textareas = document.querySelectorAll('textarea');
        
        textareas.forEach(textarea => {
            const settingKey = this.getSettingKey(textarea);
            if (!settingKey) return;
            
            this.boundElements.set(settingKey, {
                element: textarea,
                type: 'textarea',
                validator: settingKey.includes('css') ? 'css' : 'text'
            });
            
            // Debounced input handling for textareas
            textarea.addEventListener('input', (e) => {
                this.debouncedUpdate(settingKey, e.target.value, textarea);
            });
            
            // Immediate validation on blur
            textarea.addEventListener('blur', (e) => {
                if (this.validateField(textarea, e.target.value)) {
                    this.settingsManager.set(settingKey, e.target.value);
                    this.clearFieldError(textarea);
                }
            });
        });
        
        console.log(`LAS: Bound ${textareas.length} textarea elements`);
    }
    
    /**
     * Bind image upload elements
     */
    bindImageUploads() {
        const imageFields = document.querySelectorAll('.las-image-url-field');
        const uploadButtons = document.querySelectorAll('.las-upload-image-button');
        const removeButtons = document.querySelectorAll('.las-remove-image-button');
        
        // Bind image URL fields
        imageFields.forEach(field => {
            const settingKey = this.getSettingKey(field);
            if (!settingKey) return;
            
            this.boundElements.set(settingKey, {
                element: field,
                type: 'image',
                validator: 'url'
            });
            
            field.addEventListener('input', (e) => {
                this.debouncedUpdate(settingKey, e.target.value, field);
                this.updateImagePreview(field, e.target.value);
            });
        });
        
        // Bind upload buttons (WordPress media library integration)
        uploadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.openMediaLibrary(button);
            });
        });
        
        // Bind remove buttons
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.removeImage(button);
            });
        });
        
        console.log(`LAS: Bound ${imageFields.length} image upload elements`);
    }
    
    /**
     * Get setting key from form element
     * @private
     */
    getSettingKey(element) {
        // Try data-setting attribute first
        if (element.dataset.setting) {
            return element.dataset.setting;
        }
        
        // Try name attribute (remove option name prefix)
        if (element.name) {
            const name = element.name;
            // Remove WordPress option array syntax
            const match = name.match(/\[([^\]]+)\]$/);
            if (match) {
                return match[1];
            }
            return name;
        }
        
        // Try ID attribute
        if (element.id) {
            return element.id;
        }
        
        return null;
    }
    
    /**
     * Debounced update for text inputs and textareas
     * @private
     */
    debouncedUpdate(settingKey, value, element) {
        const timerId = `update_${settingKey}`;
        
        // Clear existing timer
        if (this.debounceTimers.has(timerId)) {
            clearTimeout(this.debounceTimers.get(timerId));
        }
        
        // Set new timer
        const timer = setTimeout(() => {
            if (this.validateField(element, value)) {
                this.settingsManager.set(settingKey, value);
                this.clearFieldError(element);
            }
            this.debounceTimers.delete(timerId);
        }, 300);
        
        this.debounceTimers.set(timerId, timer);
    }
    
    /**
     * Validate field value
     */
    validateField(element, value, min, max) {
        const elementInfo = this.boundElements.get(this.getSettingKey(element));
        if (!elementInfo) return true;
        
        const validator = elementInfo.validator;
        const rule = this.validationRules.get(validator);
        
        if (!rule) return true;
        
        let isValid = true;
        
        if (rule.pattern) {
            isValid = rule.pattern.test(value);
        } else if (rule.validate) {
            // For number validation, get min/max from element if not provided
            if (validator === 'number' && (min === undefined || max === undefined)) {
                const elementMin = element.getAttribute('min');
                const elementMax = element.getAttribute('max');
                min = min !== undefined ? min : (elementMin ? parseFloat(elementMin) : undefined);
                max = max !== undefined ? max : (elementMax ? parseFloat(elementMax) : undefined);
            }
            isValid = rule.validate(value, min, max);
        }
        
        if (!isValid) {
            this.showFieldError(element, rule.message);
            return false;
        }
        
        return true;
    }
    
    /**
     * Show field validation error
     */
    showFieldError(element, message) {
        const settingKey = this.getSettingKey(element);
        
        // Remove existing error
        this.clearFieldError(element);
        
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'las-field-error';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', 'polite');
        
        // Style error element
        errorElement.style.cssText = `
            color: #dc3232;
            font-size: 12px;
            margin-top: 4px;
            display: block;
        `;
        
        // Insert error after element
        element.parentNode.insertBefore(errorElement, element.nextSibling);
        
        // Add error class to element
        element.classList.add('las-field-invalid');
        element.setAttribute('aria-invalid', 'true');
        element.setAttribute('aria-describedby', errorElement.id = `${settingKey}-error`);
        
        // Store error element reference
        this.errorElements.set(settingKey, errorElement);
        
        // Show error notification
        const errorHandler = this.core.get('error');
        if (errorHandler) {
            errorHandler.showError(`Validation error: ${message}`, { duration: 3000 });
        }
    }
    
    /**
     * Clear field validation error
     */
    clearFieldError(element) {
        const settingKey = this.getSettingKey(element);
        const errorElement = this.errorElements.get(settingKey);
        
        if (errorElement && errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
            this.errorElements.delete(settingKey);
        }
        
        element.classList.remove('las-field-invalid');
        element.removeAttribute('aria-invalid');
        element.removeAttribute('aria-describedby');
    }
    
    /**
     * Handle dependency triggers (show/hide dependent fields)
     * @private
     */
    handleDependencyTrigger(triggerElement, value) {
        const triggerId = triggerElement.id;
        const dependentElements = document.querySelectorAll(`[data-dependency-id="${triggerId}"]`);
        
        dependentElements.forEach(dependent => {
            const requiredValue = dependent.dataset.dependencyValue;
            const shouldShow = (value.toString() === requiredValue);
            
            // Find the field wrapper
            const wrapper = dependent.closest('.field-row') || dependent.closest('.las-enhanced-field-wrapper');
            if (wrapper) {
                wrapper.style.display = shouldShow ? '' : 'none';
                
                // Update ARIA attributes for accessibility
                const inputs = wrapper.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    input.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
                    if (!shouldShow) {
                        input.setAttribute('tabindex', '-1');
                    } else {
                        input.removeAttribute('tabindex');
                    }
                });
            }
        });
    }
    
    /**
     * Handle font family selection changes
     * @private
     */
    handleFontFamilyChange(dropdown, value) {
        const googleFontWrapper = dropdown.parentNode.querySelector('.google-font-field-wrapper');
        
        if (googleFontWrapper) {
            if (value === 'google') {
                googleFontWrapper.style.display = '';
                const googleFontInput = googleFontWrapper.querySelector('.google-font-input');
                if (googleFontInput) {
                    googleFontInput.focus();
                }
            } else {
                googleFontWrapper.style.display = 'none';
            }
        }
    }
    
    /**
     * Update image preview
     * @private
     */
    updateImagePreview(field, url) {
        const preview = field.parentNode.parentNode.querySelector('.las-image-preview img');
        const removeButton = field.parentNode.querySelector('.las-remove-image-button');
        
        if (preview) {
            if (url && this.validateField(field, url)) {
                preview.src = url;
                preview.style.display = '';
                if (removeButton) removeButton.style.display = '';
            } else {
                preview.style.display = 'none';
                if (removeButton) removeButton.style.display = 'none';
            }
        }
    }
    
    /**
     * Open WordPress media library
     * @private
     */
    openMediaLibrary(button) {
        // Check if WordPress media library is available
        if (typeof wp === 'undefined' || !wp.media) {
            console.warn('LAS: WordPress media library not available');
            return;
        }
        
        const mediaFrame = wp.media({
            title: 'Select Image',
            button: {
                text: 'Use this image'
            },
            multiple: false,
            library: {
                type: 'image'
            }
        });
        
        mediaFrame.on('select', () => {
            const attachment = mediaFrame.state().get('selection').first().toJSON();
            const field = button.parentNode.querySelector('.las-image-url-field');
            
            if (field) {
                field.value = attachment.url;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                this.updateImagePreview(field, attachment.url);
            }
        });
        
        mediaFrame.open();
    }
    
    /**
     * Remove image
     * @private
     */
    removeImage(button) {
        const field = button.parentNode.querySelector('.las-image-url-field');
        
        if (field) {
            field.value = '';
            field.dispatchEvent(new Event('input', { bubbles: true }));
            this.updateImagePreview(field, '');
        }
    }
    
    /**
     * Set up form validation
     * @private
     */
    setupFormValidation() {
        // Add form validation styles
        const styles = document.createElement('style');
        styles.textContent = `
            .las-field-invalid {
                border-color: #dc3232 !important;
                box-shadow: 0 0 2px rgba(220, 50, 50, 0.5) !important;
            }
            
            .las-field-error {
                color: #dc3232;
                font-size: 12px;
                margin-top: 4px;
                display: block;
            }
            
            .las-field-valid {
                border-color: #46b450 !important;
            }
        `;
        document.head.appendChild(styles);
    }
    
    /**
     * Set up accessibility features
     * @private
     */
    setupAccessibilityFeatures() {
        // Add ARIA labels to form elements that don't have them
        this.boundElements.forEach((info, settingKey) => {
            const element = info.element;
            
            if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
                const label = document.querySelector(`label[for="${element.id}"]`);
                if (label) {
                    element.setAttribute('aria-labelledby', label.id || `${element.id}-label`);
                    if (!label.id) {
                        label.id = `${element.id}-label`;
                    }
                } else {
                    // Generate aria-label from setting key
                    const ariaLabel = settingKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    element.setAttribute('aria-label', ariaLabel);
                }
            }
            
            // Add required attribute handling
            if (element.hasAttribute('required')) {
                element.setAttribute('aria-required', 'true');
            }
        });
        
        // Add ARIA labels to elements without existing labels or labelledby
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
                const label = document.querySelector(`label[for="${element.id}"]`);
                if (label) {
                    element.setAttribute('aria-labelledby', label.id || `${element.id}-label`);
                    if (!label.id) {
                        label.id = `${element.id}-label`;
                    }
                } else if (element.id || element.name) {
                    // Generate aria-label from id or name
                    const key = element.id || element.name;
                    const ariaLabel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    element.setAttribute('aria-label', ariaLabel);
                }
            }
        });
        
        // Set up keyboard navigation enhancements
        this.setupKeyboardNavigation();
    }
    
    /**
     * Set up keyboard navigation enhancements
     * @private
     */
    setupKeyboardNavigation() {
        // Add keyboard shortcuts for common actions
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save (prevent default browser save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveAllSettings();
            }
            
            // Escape to clear current field focus and errors
            if (e.key === 'Escape') {
                const activeElement = document.activeElement;
                if (activeElement && this.boundElements.has(this.getSettingKey(activeElement))) {
                    activeElement.blur();
                    this.clearFieldError(activeElement);
                }
            }
        });
    }
    
    /**
     * Save all current settings
     * @private
     */
    saveAllSettings() {
        const ajaxManager = this.core.get('ajax');
        if (ajaxManager) {
            // Get all current settings
            const allSettings = {};
            this.boundElements.forEach((info, settingKey) => {
                const element = info.element;
                let value;
                
                switch (info.type) {
                    case 'toggle':
                        value = element.checked;
                        break;
                    case 'slider':
                        value = parseFloat(element.value);
                        break;
                    default:
                        value = element.value;
                }
                
                allSettings[settingKey] = value;
            });
            
            // Save all settings
            ajaxManager.saveSettings(allSettings).then(() => {
                const errorHandler = this.core.get('error');
                if (errorHandler) {
                    errorHandler.showSuccess('All settings saved successfully');
                }
            }).catch((error) => {
                const errorHandler = this.core.get('error');
                if (errorHandler) {
                    errorHandler.showError(`Failed to save settings: ${error.message}`);
                }
            });
        }
    }
    
    /**
     * Clean up form element binder
     */
    cleanup() {
        try {
            console.log('LAS: Cleaning up Form Element Binder...');
            
            // Clear all debounce timers
            this.debounceTimers.forEach(timer => clearTimeout(timer));
            this.debounceTimers.clear();
            
            // Clear all error elements
            this.errorElements.forEach(errorElement => {
                if (errorElement.parentNode) {
                    errorElement.parentNode.removeChild(errorElement);
                }
            });
            this.errorElements.clear();
            
            // Clear bound elements
            this.boundElements.clear();
            
            console.log('LAS: Form Element Binder cleanup complete');
            
        } catch (error) {
            console.error('LAS: Error during Form Element Binder cleanup:', error);
        }
    }
}

// Make classes available globally for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LASCoreManager,
        LASErrorHandler,
        LASSettingsManager,
        LASAjaxManager,
        LASLivePreviewEngine,
        LASFormElementBinder
    };
}

// Also make them available globally in browser
if (typeof window !== 'undefined') {
    window.LASCoreManager = LASCoreManager;
    window.LASErrorHandler = LASErrorHandler;
    window.LASSettingsManager = LASSettingsManager;
    window.LASAjaxManager = LASAjaxManager;
    window.LASLivePreviewEngine = LASLivePreviewEngine;
    window.LASFormElementBinder = LASFormElementBinder;
}