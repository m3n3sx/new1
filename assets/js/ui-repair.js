/**
 * Live Admin Styler UI Repair System
 * Core UI Manager for restoring critical interface functionality
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

(function(window, document, $) {
    'use strict';

    /**
     * Base class for all UI components
     */
    class LASUIComponent {
        constructor(core) {
            this.core = core;
            this.initialized = false;
            this.name = this.constructor.name;
        }

        async init() {
            throw new Error(`Component ${this.name} must implement init() method`);
        }

        destroy() {
            this.initialized = false;
        }

        log(message, level = 'info') {
            this.core.log(`[${this.name}] ${message}`, level);
        }

        emit(eventName, data = null) {
            this.core.emit(eventName, data);
        }

        on(eventName, callback) {
            this.core.on(eventName, callback);
        }
    }

    /**
     * Core UI Manager - Orchestrates all UI repair functionality
     */
    class LASUICoreManager {
        constructor(config = {}) {
            this.config = {
                debug: false,
                timeout: 10000,
                retryAttempts: 3,
                ...config
            };
            
            this.components = new Map();
            this.initialized = false;
            this.eventBus = new EventTarget();
            this.initializationPromise = null;
            this.errors = [];
            
            // Bind methods to preserve context
            this.handleError = this.handleError.bind(this);
            this.handleUnload = this.handleUnload.bind(this);
            
            // Global error handling
            window.addEventListener('error', this.handleError);
            window.addEventListener('unhandledrejection', this.handleError);
            window.addEventListener('beforeunload', this.handleUnload);
        }

        /**
         * Initialize the UI repair system
         */
        async init() {
            if (this.initializationPromise) {
                return this.initializationPromise;
            }

            this.initializationPromise = this._performInit();
            return this.initializationPromise;
        }

        async _performInit() {
            try {
                this.log('Starting UI Core Manager initialization...', 'info');
                
                // Validate environment
                if (!this.validateEnvironment()) {
                    throw new Error('Environment validation failed');
                }

                // Initialize components in dependency order
                await this.initializeComponents();

                // Bind global event listeners
                this.bindGlobalEvents();

                // Mark as initialized
                this.initialized = true;

                // Emit ready event
                this.emit('ui:ready', { timestamp: Date.now() });

                this.log('Core Manager initialization complete', 'success');
                return true;

            } catch (error) {
                this.log(`Core Manager initialization failed: ${error.message}`, 'error');
                this.handleInitializationError(error);
                throw error;
            }
        }

        /**
         * Validate the environment for UI repair
         */
        validateEnvironment() {
            // Check for required globals
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                this.log('Missing required globals (window/document)', 'error');
                return false;
            }

            // Check for jQuery (optional but preferred)
            if (typeof $ === 'undefined' && typeof jQuery !== 'undefined') {
                window.$ = jQuery;
            }

            // Check for WordPress admin context
            if (!document.body.classList.contains('wp-admin')) {
                this.log('Not in WordPress admin context', 'warn');
            }

            // Check for plugin container
            const container = document.querySelector('.las-fresh-settings-wrap, .las-settings-wrap');
            if (!container) {
                this.log('Plugin container not found', 'warn');
            }

            return true;
        }

        /**
         * Initialize all UI components
         */
        async initializeComponents() {
            const componentClasses = [
                { name: 'state', class: LASStateManager },
                { name: 'events', class: LASEventManager },
                { name: 'errorReporter', class: LASErrorReporter },
                { name: 'gracefulDegradation', class: LASGracefulDegradation },
                { name: 'tabs', class: LASTabManager },
                { name: 'menu', class: LASMenuManager },
                { name: 'forms', class: LASFormManager }
            ];

            for (const { name, class: ComponentClass } of componentClasses) {
                try {
                    await this.initializeComponent(name, ComponentClass);
                } catch (error) {
                    this.log(`Failed to initialize ${name} component: ${error.message}`, 'error');
                    
                    // Continue with other components unless it's critical
                    if (name === 'state' || name === 'events') {
                        throw error;
                    }
                }
            }
        }

        /**
         * Initialize a single component
         */
        async initializeComponent(name, ComponentClass) {
            if (!ComponentClass) {
                this.log(`Component class for ${name} not found`, 'warn');
                return null;
            }

            try {
                this.log(`Initializing ${name} component...`, 'info');
                
                const component = new ComponentClass(this);
                
                // Set timeout for initialization
                const initPromise = component.init();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`${name} initialization timeout`)), this.config.timeout);
                });

                await Promise.race([initPromise, timeoutPromise]);
                
                this.components.set(name, component);
                this.log(`${name} component initialized successfully`, 'success');
                
                return component;

            } catch (error) {
                this.log(`Failed to initialize ${name} component: ${error.message}`, 'error');
                
                // Emit component initialization failure event
                this.emit('component:init-failed', { component: name, error });
                
                throw error;
            }
        }

        /**
         * Get a component by name
         */
        get(componentName) {
            return this.components.get(componentName);
        }

        /**
         * Check if a component is available
         */
        has(componentName) {
            return this.components.has(componentName);
        }

        /**
         * Bind global event listeners
         */
        bindGlobalEvents() {
            // DOM ready state changes
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.emit('dom:ready');
                });
            }

            // Window load
            if (document.readyState !== 'complete') {
                window.addEventListener('load', () => {
                    this.emit('window:loaded');
                });
            }

            // Visibility changes
            document.addEventListener('visibilitychange', () => {
                this.emit('visibility:changed', { hidden: document.hidden });
            });

            // Resize events (debounced)
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.emit('window:resized', {
                        width: window.innerWidth,
                        height: window.innerHeight
                    });
                }, 100);
            });
        }

        /**
         * Emit an event
         */
        emit(eventName, data = null) {
            try {
                const event = new CustomEvent(eventName, { 
                    detail: data,
                    bubbles: true,
                    cancelable: true
                });
                
                // Emit on internal event bus
                this.eventBus.dispatchEvent(event);
                
                // Emit on document for global listeners
                document.dispatchEvent(event);
                
                if (this.config.debug) {
                    this.log(`Event emitted: ${eventName}`, 'debug');
                }

            } catch (error) {
                this.log(`Failed to emit event ${eventName}: ${error.message}`, 'error');
            }
        }

        /**
         * Listen for an event
         */
        on(eventName, callback) {
            if (typeof callback !== 'function') {
                this.log(`Invalid callback for event ${eventName}`, 'error');
                return;
            }

            try {
                this.eventBus.addEventListener(eventName, callback);
                
                if (this.config.debug) {
                    this.log(`Event listener added: ${eventName}`, 'debug');
                }

            } catch (error) {
                this.log(`Failed to add event listener ${eventName}: ${error.message}`, 'error');
            }
        }

        /**
         * Remove event listener
         */
        off(eventName, callback) {
            try {
                this.eventBus.removeEventListener(eventName, callback);
                
                if (this.config.debug) {
                    this.log(`Event listener removed: ${eventName}`, 'debug');
                }

            } catch (error) {
                this.log(`Failed to remove event listener ${eventName}: ${error.message}`, 'error');
            }
        }

        /**
         * Handle initialization errors
         */
        handleInitializationError(error) {
            this.errors.push({
                type: 'initialization',
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });

            // Show user-friendly error message
            this.showErrorNotification(
                'Live Admin Styler UI Error',
                'Failed to initialize interface. Please refresh the page.',
                error.message
            );

            // Attempt graceful degradation
            this.enableGracefulDegradation();
        }

        /**
         * Handle runtime errors
         */
        handleError(event) {
            const error = event.error || event.reason || event;
            
            this.errors.push({
                type: 'runtime',
                message: error.message || 'Unknown error',
                stack: error.stack,
                timestamp: Date.now()
            });

            this.log(`Runtime error: ${error.message}`, 'error');

            // Emit error event for components to handle
            this.emit('error:occurred', { error, event });
        }

        /**
         * Handle page unload
         */
        handleUnload() {
            this.log('Page unloading, cleaning up...', 'info');
            this.destroy();
        }

        /**
         * Show error notification to user
         */
        showErrorNotification(title, message, details = '') {
            const container = document.querySelector('.las-fresh-settings-wrap') || document.body;
            
            // Remove existing error notifications
            const existingErrors = container.querySelectorAll('.las-ui-error');
            existingErrors.forEach(el => el.remove());

            // Create error notification
            const errorDiv = document.createElement('div');
            errorDiv.className = 'las-ui-error notice notice-error is-dismissible';
            errorDiv.innerHTML = `
                <p><strong>${title}:</strong> ${message}</p>
                ${details ? `<p><small>Details: ${details}</small></p>` : ''}
                <button type="button" class="notice-dismiss">
                    <span class="screen-reader-text">Dismiss this notice.</span>
                </button>
            `;

            // Add dismiss functionality
            const dismissBtn = errorDiv.querySelector('.notice-dismiss');
            dismissBtn.addEventListener('click', () => {
                errorDiv.remove();
            });

            // Insert at top of container
            container.insertBefore(errorDiv, container.firstChild);

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 10000);
        }

        /**
         * Enable graceful degradation mode
         */
        enableGracefulDegradation() {
            // Initialize graceful degradation system if not already done
            if (!this.gracefulDegradation) {
                this.gracefulDegradation = new LASGracefulDegradation(this);
            }
            
            this.gracefulDegradation.enable();
            this.log('Graceful degradation mode enabled', 'warn');
        }

        /**
         * Logging utility
         */
        log(message, level = 'info') {
            if (!this.config.debug && level === 'debug') {
                return;
            }

            const timestamp = new Date().toISOString();
            const prefix = `[LAS UI ${timestamp}]`;
            
            switch (level) {
                case 'error':
                    console.error(`${prefix} ERROR: ${message}`);
                    break;
                case 'warn':
                    console.warn(`${prefix} WARN: ${message}`);
                    break;
                case 'success':
                    console.log(`${prefix} SUCCESS: ${message}`);
                    break;
                case 'debug':
                    console.debug(`${prefix} DEBUG: ${message}`);
                    break;
                default:
                    console.log(`${prefix} ${message}`);
            }
        }

        /**
         * Get system status
         */
        getStatus() {
            return {
                initialized: this.initialized,
                components: Array.from(this.components.keys()),
                errors: this.errors,
                config: this.config
            };
        }

        /**
         * Destroy the UI manager and cleanup
         */
        destroy() {
            try {
                // Destroy all components
                this.components.forEach((component, name) => {
                    try {
                        if (typeof component.destroy === 'function') {
                            component.destroy();
                        }
                    } catch (error) {
                        this.log(`Error destroying ${name} component: ${error.message}`, 'error');
                    }
                });

                // Clear components
                this.components.clear();

                // Remove global event listeners
                window.removeEventListener('error', this.handleError);
                window.removeEventListener('unhandledrejection', this.handleError);
                window.removeEventListener('beforeunload', this.handleUnload);

                // Mark as not initialized
                this.initialized = false;

                this.log('UI Core Manager destroyed', 'info');

            } catch (error) {
                this.log(`Error during destruction: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Event Manager - Handles global event delegation and cleanup
     */
    class LASEventManager extends LASUIComponent {
        constructor(core) {
            super(core);
            this.delegatedEvents = new Map();
            this.directEvents = new Map();
            this.debounceTimers = new Map();
            this.throttleTimers = new Map();
            this.eventStats = {
                bound: 0,
                triggered: 0,
                cleaned: 0
            };
            
            // Configuration
            this.config = {
                debounceDelay: 300,
                throttleDelay: 100,
                maxEventListeners: 1000,
                enableEventStats: true,
                enablePerformanceMonitoring: true
            };
            
            // Performance monitoring
            this.performanceMetrics = {
                eventProcessingTimes: [],
                memoryUsage: [],
                lastCleanup: Date.now()
            };
            
            // Bind methods to preserve context
            this.handleDelegatedEvent = this.handleDelegatedEvent.bind(this);
            this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
            this.performCleanup = this.performCleanup.bind(this);
        }

        async init() {
            try {
                this.log('Initializing Event Manager...', 'info');
                
                // Setup global event delegation
                this.setupGlobalDelegation();
                
                // Setup performance monitoring
                this.setupPerformanceMonitoring();
                
                // Setup automatic cleanup
                this.setupAutomaticCleanup();
                
                // Bind system events
                this.bindSystemEvents();
                
                this.initialized = true;
                this.log('Event Manager initialized successfully', 'success');
                
            } catch (error) {
                this.log(`Event Manager initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }

        /**
         * Setup global event delegation on document
         */
        setupGlobalDelegation() {
            // Common interactive events to delegate
            const delegatedEventTypes = [
                'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
                'mouseenter', 'mouseleave', 'focus', 'blur', 'keydown', 'keyup',
                'input', 'change', 'submit', 'touchstart', 'touchend', 'touchmove'
            ];
            
            delegatedEventTypes.forEach(eventType => {
                document.addEventListener(eventType, this.handleDelegatedEvent, {
                    passive: eventType.startsWith('touch'),
                    capture: eventType === 'focus' || eventType === 'blur'
                });
            });
            
            this.log(`Global event delegation setup for ${delegatedEventTypes.length} event types`, 'info');
        }

        /**
         * Handle delegated events
         */
        handleDelegatedEvent(event) {
            const startTime = performance.now();
            
            try {
                // Check all delegated events for this event type
                const eventKey = `${event.type}:*`;
                const handlers = this.delegatedEvents.get(eventKey) || [];
                
                // Process handlers that match the target or its ancestors
                handlers.forEach(handler => {
                    let element = event.target;
                    
                    // Check target and all ancestors up to document
                    while (element && element !== document) {
                        if (this.matchesSelector(element, handler.selector)) {
                            this.executeHandler(handler, event);
                            break; // Only trigger once per handler
                        }
                        element = element.parentElement;
                    }
                });
                
                // Update statistics
                if (this.config.enableEventStats) {
                    this.eventStats.triggered++;
                }
                
            } catch (error) {
                this.log(`Error in delegated event handler: ${error.message}`, 'error');
            } finally {
                // Record performance metrics
                if (this.config.enablePerformanceMonitoring) {
                    const processingTime = performance.now() - startTime;
                    this.recordPerformanceMetric(processingTime);
                }
            }
        }

        /**
         * Execute event handler with error handling
         */
        executeHandler(handler, event) {
            try {
                if (handler.debounce) {
                    this.executeDebounced(handler, event);
                } else if (handler.throttle) {
                    this.executeThrottled(handler, event);
                } else {
                    handler.callback.call(handler.context || event.target, event);
                }
            } catch (error) {
                this.log(`Error executing event handler: ${error.message}`, 'error');
                this.emit('event:handler-error', { handler, event, error });
            }
        }

        /**
         * Execute debounced handler
         */
        executeDebounced(handler, event) {
            const key = `${handler.id}-debounce`;
            
            // Clear existing timer
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            // Create a copy of the event for the timeout callback
            const eventCopy = {
                type: event.type,
                target: event.target,
                currentTarget: event.currentTarget,
                preventDefault: () => {},
                stopPropagation: () => {}
            };
            
            // Set new timer
            const timer = setTimeout(() => {
                try {
                    handler.callback.call(handler.context || event.target, eventCopy);
                } catch (error) {
                    this.log(`Error in debounced handler: ${error.message}`, 'error');
                }
                this.debounceTimers.delete(key);
            }, handler.debounce || this.config.debounceDelay);
            
            this.debounceTimers.set(key, timer);
        }

        /**
         * Execute throttled handler
         */
        executeThrottled(handler, event) {
            const key = `${handler.id}-throttle`;
            
            if (!this.throttleTimers.has(key)) {
                try {
                    handler.callback.call(handler.context || event.target, event);
                } catch (error) {
                    this.log(`Error in throttled handler: ${error.message}`, 'error');
                }
                
                const timer = setTimeout(() => {
                    this.throttleTimers.delete(key);
                }, handler.throttle || this.config.throttleDelay);
                
                this.throttleTimers.set(key, timer);
            }
        }

        /**
         * Check if element matches selector
         */
        matchesSelector(element, selector) {
            if (!element || !selector) return false;
            
            try {
                // Use native matches method
                if (element.matches) {
                    return element.matches(selector);
                }
                
                // Fallback for older browsers
                if (element.msMatchesSelector) {
                    return element.msMatchesSelector(selector);
                }
                
                // Manual check for simple selectors
                if (selector.startsWith('.')) {
                    return element.classList.contains(selector.slice(1));
                }
                
                if (selector.startsWith('#')) {
                    return element.id === selector.slice(1);
                }
                
                return element.tagName.toLowerCase() === selector.toLowerCase();
                
            } catch (error) {
                this.log(`Error matching selector ${selector}: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Bind event with delegation
         */
        on(selector, eventType, callback, options = {}) {
            if (typeof selector === 'string' && typeof eventType === 'string' && typeof callback === 'function') {
                return this.bindDelegatedEvent(selector, eventType, callback, options);
            } else if (typeof selector === 'object' && selector.addEventListener) {
                return this.bindDirectEvent(selector, eventType, callback, options);
            } else {
                this.log('Invalid parameters for event binding', 'error');
                return null;
            }
        }

        /**
         * Bind delegated event
         */
        bindDelegatedEvent(selector, eventType, callback, options = {}) {
            try {
                const handlerId = this.generateHandlerId();
                const eventKey = `${eventType}:*`; // Use wildcard for delegation
                
                const handler = {
                    id: handlerId,
                    selector,
                    eventType,
                    callback,
                    context: options.context,
                    debounce: options.debounce,
                    throttle: options.throttle,
                    once: options.once,
                    passive: options.passive,
                    timestamp: Date.now()
                };
                
                // Store handler
                if (!this.delegatedEvents.has(eventKey)) {
                    this.delegatedEvents.set(eventKey, []);
                }
                this.delegatedEvents.get(eventKey).push(handler);
                
                // Update statistics
                if (this.config.enableEventStats) {
                    this.eventStats.bound++;
                }
                
                this.log(`Delegated event bound: ${eventType} on ${selector}`, 'debug');
                
                return handlerId;
                
            } catch (error) {
                this.log(`Error binding delegated event: ${error.message}`, 'error');
                return null;
            }
        }

        /**
         * Bind direct event to element
         */
        bindDirectEvent(element, eventType, callback, options = {}) {
            try {
                const handlerId = this.generateHandlerId();
                
                // Wrap callback for cleanup tracking
                const wrappedCallback = (event) => {
                    try {
                        if (options.debounce) {
                            this.executeDebounced({ id: handlerId, callback, context: options.context }, event);
                        } else if (options.throttle) {
                            this.executeThrottled({ id: handlerId, callback, context: options.context }, event);
                        } else {
                            callback.call(options.context || element, event);
                        }
                        
                        // Remove if once option is set
                        if (options.once) {
                            this.off(handlerId);
                        }
                        
                    } catch (error) {
                        this.log(`Error in direct event handler: ${error.message}`, 'error');
                    }
                };
                
                // Bind event
                element.addEventListener(eventType, wrappedCallback, {
                    passive: options.passive,
                    capture: options.capture,
                    once: options.once
                });
                
                // Store handler reference
                const handler = {
                    id: handlerId,
                    element,
                    eventType,
                    callback: wrappedCallback,
                    originalCallback: callback,
                    options,
                    timestamp: Date.now()
                };
                
                this.directEvents.set(handlerId, handler);
                
                // Update statistics
                if (this.config.enableEventStats) {
                    this.eventStats.bound++;
                }
                
                this.log(`Direct event bound: ${eventType} on element`, 'debug');
                
                return handlerId;
                
            } catch (error) {
                this.log(`Error binding direct event: ${error.message}`, 'error');
                return null;
            }
        }

        /**
         * Remove event listener
         */
        off(handlerIdOrSelector, eventType = null) {
            try {
                if (typeof handlerIdOrSelector === 'string' && handlerIdOrSelector.startsWith('las-event-')) {
                    // It's a handler ID (they start with 'las-event-')
                    return this.removeDirectEvent(handlerIdOrSelector);
                } else {
                    // It's a selector for delegated events
                    return this.removeDelegatedEvent(handlerIdOrSelector, eventType);
                }
            } catch (error) {
                this.log(`Error removing event listener: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Remove direct event by handler ID
         */
        removeDirectEvent(handlerId) {
            const handler = this.directEvents.get(handlerId);
            if (!handler) {
                return false;
            }
            
            try {
                handler.element.removeEventListener(handler.eventType, handler.callback, handler.options);
                this.directEvents.delete(handlerId);
                
                // Update statistics
                if (this.config.enableEventStats) {
                    this.eventStats.cleaned++;
                }
                
                this.log(`Direct event removed: ${handler.eventType}`, 'debug');
                return true;
                
            } catch (error) {
                this.log(`Error removing direct event: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Remove delegated event by selector and type
         */
        removeDelegatedEvent(selector, eventType) {
            let removed = 0;
            
            this.delegatedEvents.forEach((handlers, eventKey) => {
                // Check if this event key matches the event type (or remove all if no type specified)
                const keyEventType = eventKey.split(':')[0];
                if (!eventType || keyEventType === eventType) {
                    const filteredHandlers = handlers.filter(handler => {
                        const shouldRemove = handler.selector === selector;
                        if (shouldRemove) removed++;
                        return !shouldRemove;
                    });
                    
                    if (filteredHandlers.length === 0) {
                        this.delegatedEvents.delete(eventKey);
                    } else {
                        this.delegatedEvents.set(eventKey, filteredHandlers);
                    }
                }
            });
            
            // Update statistics
            if (this.config.enableEventStats) {
                this.eventStats.cleaned += removed;
            }
            
            this.log(`Removed ${removed} delegated events for selector: ${selector}`, 'debug');
            return removed > 0;
        }

        /**
         * Setup performance monitoring
         */
        setupPerformanceMonitoring() {
            if (!this.config.enablePerformanceMonitoring) return;
            
            // Monitor memory usage periodically
            setInterval(() => {
                if (performance.memory) {
                    this.performanceMetrics.memoryUsage.push({
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        timestamp: Date.now()
                    });
                    
                    // Keep only last 100 measurements
                    if (this.performanceMetrics.memoryUsage.length > 100) {
                        this.performanceMetrics.memoryUsage.shift();
                    }
                }
            }, 5000);
        }

        /**
         * Record performance metric
         */
        recordPerformanceMetric(processingTime) {
            this.performanceMetrics.eventProcessingTimes.push({
                time: processingTime,
                timestamp: Date.now()
            });
            
            // Keep only last 1000 measurements
            if (this.performanceMetrics.eventProcessingTimes.length > 1000) {
                this.performanceMetrics.eventProcessingTimes.shift();
            }
            
            // Warn if processing time is too high
            if (processingTime > 16) { // 60fps threshold
                this.log(`Slow event processing detected: ${processingTime.toFixed(2)}ms`, 'warn');
            }
        }

        /**
         * Setup automatic cleanup
         */
        setupAutomaticCleanup() {
            // Cleanup every 5 minutes
            setInterval(this.performCleanup, 5 * 60 * 1000);
            
            // Cleanup on visibility change
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }

        /**
         * Handle visibility change for cleanup
         */
        handleVisibilityChange() {
            if (document.hidden) {
                // Page is hidden, perform cleanup
                this.performCleanup();
            }
        }

        /**
         * Perform cleanup of stale event handlers
         */
        performCleanup() {
            try {
                const now = Date.now();
                const maxAge = 30 * 60 * 1000; // 30 minutes
                let cleaned = 0;
                
                // Clean up old direct events
                this.directEvents.forEach((handler, handlerId) => {
                    // Check if element still exists in DOM or if handler is too old
                    if (!document.contains(handler.element) || (now - handler.timestamp > maxAge)) {
                        this.removeDirectEvent(handlerId);
                        cleaned++;
                    }
                });
                
                // Clean up old delegated events
                this.delegatedEvents.forEach((handlers, eventKey) => {
                    const filteredHandlers = handlers.filter(handler => {
                        return now - handler.timestamp <= maxAge;
                    });
                    
                    if (filteredHandlers.length !== handlers.length) {
                        cleaned += handlers.length - filteredHandlers.length;
                        
                        if (filteredHandlers.length === 0) {
                            this.delegatedEvents.delete(eventKey);
                        } else {
                            this.delegatedEvents.set(eventKey, filteredHandlers);
                        }
                    }
                });
                
                // Clear old timers
                this.debounceTimers.forEach((timer, key) => {
                    clearTimeout(timer);
                });
                this.debounceTimers.clear();
                
                this.throttleTimers.forEach((timer, key) => {
                    clearTimeout(timer);
                });
                this.throttleTimers.clear();
                
                // Update cleanup timestamp
                this.performanceMetrics.lastCleanup = now;
                
                if (cleaned > 0) {
                    this.log(`Cleanup completed: ${cleaned} stale event handlers removed`, 'info');
                }
                
            } catch (error) {
                this.log(`Error during cleanup: ${error.message}`, 'error');
            }
        }

        /**
         * Bind system events
         */
        bindSystemEvents() {
            // Memory pressure handling
            if ('memory' in performance) {
                setInterval(() => {
                    const memoryInfo = performance.memory;
                    const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
                    
                    if (usageRatio > 0.9) {
                        this.log('High memory usage detected, performing cleanup', 'warn');
                        this.performCleanup();
                    }
                }, 10000);
            }
            
            // Page unload cleanup
            window.addEventListener('beforeunload', () => {
                this.destroy();
            });
            
            // Setup interaction feedback and accessibility
            this.setupInteractionFeedback();
            this.setupAccessibilityFeatures();
            this.setupTouchSupport();
        }

        /**
         * Setup interaction feedback system
         */
        setupInteractionFeedback() {
            // Visual feedback for interactive elements
            this.on('*', 'mousedown', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.addVisualFeedback(element, 'active');
                }
            }, { passive: true });

            this.on('*', 'mouseup', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.removeVisualFeedback(element, 'active');
                }
            }, { passive: true });

            // Focus feedback
            this.on('*', 'focus', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.addVisualFeedback(element, 'focused');
                    this.announceToScreenReader(`Focused on ${this.getElementDescription(element)}`);
                }
            });

            this.on('*', 'blur', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.removeVisualFeedback(element, 'focused');
                }
            });

            // Hover feedback
            this.on('*', 'mouseenter', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.addVisualFeedback(element, 'hovered');
                }
            }, { passive: true });

            this.on('*', 'mouseleave', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.removeVisualFeedback(element, 'hovered');
                }
            }, { passive: true });

            // Click feedback with ripple effect
            this.on('*', 'click', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.createRippleEffect(element, event);
                    this.provideFeedbackSound('click');
                }
            }, { passive: true });
        }

        /**
         * Setup accessibility features
         */
        setupAccessibilityFeatures() {
            // Keyboard navigation support
            this.on('*', 'keydown', (event) => {
                this.handleKeyboardNavigation(event);
            });

            // ARIA live region for announcements
            this.createAriaLiveRegion();

            // Focus management
            this.setupFocusManagement();

            // High contrast mode detection
            this.detectHighContrastMode();

            // Reduced motion preference detection
            this.detectReducedMotionPreference();

            // Screen reader detection
            this.detectScreenReader();
        }

        /**
         * Setup touch device support
         */
        setupTouchSupport() {
            // Touch feedback
            this.on('*', 'touchstart', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.addVisualFeedback(element, 'touched');
                    this.provideHapticFeedback('light');
                }
            }, { passive: true });

            this.on('*', 'touchend', (event) => {
                const element = event.target;
                if (this.isInteractiveElement(element)) {
                    this.removeVisualFeedback(element, 'touched');
                }
            }, { passive: true });

            // Touch gesture support
            this.setupTouchGestures();

            // Responsive interaction handling
            this.setupResponsiveInteractions();
        }

        /**
         * Check if element is interactive
         */
        isInteractiveElement(element) {
            if (!element || !element.tagName) return false;

            const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
            const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'option'];
            const interactiveClasses = ['las-button', 'las-tab', 'las-menu-item', 'las-control'];

            // Check tag name
            if (interactiveTags.includes(element.tagName)) {
                return true;
            }

            // Check ARIA role
            const role = element.getAttribute('role');
            if (role && interactiveRoles.includes(role)) {
                return true;
            }

            // Check classes
            if (interactiveClasses.some(cls => element.classList.contains(cls))) {
                return true;
            }

            // Check if element has click handlers or is focusable
            if (element.tabIndex >= 0 || element.onclick) {
                return true;
            }

            return false;
        }

        /**
         * Add visual feedback to element
         */
        addVisualFeedback(element, type) {
            if (!element) return;

            const feedbackClass = `las-feedback-${type}`;
            element.classList.add(feedbackClass);

            // Auto-remove after delay for certain types
            if (type === 'active' || type === 'touched') {
                setTimeout(() => {
                    element.classList.remove(feedbackClass);
                }, 150);
            }
        }

        /**
         * Remove visual feedback from element
         */
        removeVisualFeedback(element, type) {
            if (!element) return;

            const feedbackClass = `las-feedback-${type}`;
            element.classList.remove(feedbackClass);
        }

        /**
         * Create ripple effect on click
         */
        createRippleEffect(element, event) {
            if (!element || this.reducedMotionPreference) return;

            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;

            const ripple = document.createElement('div');
            ripple.className = 'las-ripple-effect';
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: las-ripple 0.6s ease-out;
                pointer-events: none;
                z-index: 1000;
            `;

            // Ensure element has relative positioning
            const originalPosition = element.style.position;
            if (!originalPosition || originalPosition === 'static') {
                element.style.position = 'relative';
            }

            element.appendChild(ripple);

            // Remove ripple after animation
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
                // Restore original position if we changed it
                if (!originalPosition) {
                    element.style.position = '';
                }
            }, 600);
        }

        /**
         * Handle keyboard navigation
         */
        handleKeyboardNavigation(event) {
            const { key, target, shiftKey, ctrlKey, altKey } = event;

            // Tab navigation
            if (key === 'Tab') {
                this.handleTabNavigation(event);
            }

            // Arrow key navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                this.handleArrowNavigation(event);
            }

            // Enter/Space activation
            if ((key === 'Enter' || key === ' ') && this.isInteractiveElement(target)) {
                this.handleKeyboardActivation(event);
            }

            // Escape key handling
            if (key === 'Escape') {
                this.handleEscapeKey(event);
            }

            // Access key shortcuts
            if (altKey && key.length === 1) {
                this.handleAccessKey(event);
            }
        }

        /**
         * Handle tab navigation
         */
        handleTabNavigation(event) {
            const focusableElements = this.getFocusableElements();
            const currentIndex = focusableElements.indexOf(event.target);

            if (currentIndex === -1) return;

            // Announce navigation context
            const total = focusableElements.length;
            const position = currentIndex + 1;
            this.announceToScreenReader(`Item ${position} of ${total}`);
        }

        /**
         * Handle arrow key navigation
         */
        handleArrowNavigation(event) {
            const { key, target } = event;
            const container = target.closest('[role="tablist"], [role="menu"], [role="listbox"]');

            if (!container) return;

            const items = Array.from(container.querySelectorAll('[role="tab"], [role="menuitem"], [role="option"]'));
            const currentIndex = items.indexOf(target);

            if (currentIndex === -1) return;

            let nextIndex;
            const isHorizontal = container.getAttribute('aria-orientation') !== 'vertical';

            if ((key === 'ArrowRight' && isHorizontal) || (key === 'ArrowDown' && !isHorizontal)) {
                nextIndex = (currentIndex + 1) % items.length;
            } else if ((key === 'ArrowLeft' && isHorizontal) || (key === 'ArrowUp' && !isHorizontal)) {
                nextIndex = (currentIndex - 1 + items.length) % items.length;
            } else {
                return;
            }

            event.preventDefault();
            items[nextIndex].focus();
        }

        /**
         * Handle keyboard activation
         */
        handleKeyboardActivation(event) {
            const { target, key } = event;

            // Prevent default for space key to avoid scrolling
            if (key === ' ') {
                event.preventDefault();
            }

            // Trigger click event
            target.click();

            // Provide feedback
            this.addVisualFeedback(target, 'activated');
            this.provideFeedbackSound('activate');
            this.announceToScreenReader(`Activated ${this.getElementDescription(target)}`);
        }

        /**
         * Handle escape key
         */
        handleEscapeKey(event) {
            // Close any open menus, modals, or dropdowns
            const openElements = document.querySelectorAll('[aria-expanded="true"], .las-menu-open, .las-modal-open');
            
            openElements.forEach(element => {
                if (element.setAttribute) {
                    element.setAttribute('aria-expanded', 'false');
                }
                element.classList.remove('las-menu-open', 'las-modal-open');
            });

            // Return focus to appropriate element
            this.returnFocusToTrigger();
        }

        /**
         * Create ARIA live region for announcements
         */
        createAriaLiveRegion() {
            if (document.getElementById('las-aria-live')) return;

            const liveRegion = document.createElement('div');
            liveRegion.id = 'las-aria-live';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;

            document.body.appendChild(liveRegion);
        }

        /**
         * Announce message to screen readers
         */
        announceToScreenReader(message, priority = 'polite') {
            if (!this.screenReaderDetected) return;

            const liveRegion = document.getElementById('las-aria-live');
            if (!liveRegion) return;

            // Clear previous message
            liveRegion.textContent = '';

            // Set priority
            liveRegion.setAttribute('aria-live', priority);

            // Add new message after a brief delay
            setTimeout(() => {
                liveRegion.textContent = message;
            }, 100);

            // Clear message after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 3000);
        }

        /**
         * Get element description for screen readers
         */
        getElementDescription(element) {
            if (!element) return 'element';

            // Check for aria-label
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel) return ariaLabel;

            // Check for aria-labelledby
            const labelledBy = element.getAttribute('aria-labelledby');
            if (labelledBy) {
                const labelElement = document.getElementById(labelledBy);
                if (labelElement) return labelElement.textContent.trim();
            }

            // Check for associated label
            if (element.id) {
                const label = document.querySelector(`label[for="${element.id}"]`);
                if (label) return label.textContent.trim();
            }

            // Use text content or placeholder
            const text = element.textContent?.trim() || element.placeholder || element.value;
            if (text) return text;

            // Fallback to tag name and type
            const type = element.type || element.tagName.toLowerCase();
            return `${type} element`;
        }

        /**
         * Setup focus management
         */
        setupFocusManagement() {
            this.focusHistory = [];
            this.focusTrap = null;

            // Track focus changes
            this.on('*', 'focus', (event) => {
                this.focusHistory.push(event.target);
                if (this.focusHistory.length > 10) {
                    this.focusHistory.shift();
                }
            });
        }

        /**
         * Get all focusable elements
         */
        getFocusableElements(container = document) {
            const selector = [
                'a[href]',
                'button:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                'textarea:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
                '[role="button"]:not([disabled])',
                '[role="tab"]:not([disabled])',
                '[role="menuitem"]:not([disabled])'
            ].join(', ');

            return Array.from(container.querySelectorAll(selector))
                .filter(element => {
                    return element.offsetWidth > 0 && 
                           element.offsetHeight > 0 && 
                           !element.hidden &&
                           window.getComputedStyle(element).visibility !== 'hidden';
                });
        }

        /**
         * Detect high contrast mode
         */
        detectHighContrastMode() {
            // Create test element to detect high contrast
            const testElement = document.createElement('div');
            testElement.style.cssText = `
                position: absolute;
                left: -9999px;
                background-color: rgb(31, 32, 33);
                color: rgb(255, 255, 255);
            `;
            document.body.appendChild(testElement);

            const computedStyle = window.getComputedStyle(testElement);
            const backgroundColor = computedStyle.backgroundColor;
            const color = computedStyle.color;

            // In high contrast mode, colors are forced to system colors
            this.highContrastMode = backgroundColor === color;

            document.body.removeChild(testElement);

            if (this.highContrastMode) {
                document.body.classList.add('las-high-contrast');
                this.log('High contrast mode detected', 'info');
            }
        }

        /**
         * Detect reduced motion preference
         */
        detectReducedMotionPreference() {
            this.reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (this.reducedMotionPreference) {
                document.body.classList.add('las-reduced-motion');
                this.log('Reduced motion preference detected', 'info');
            }

            // Listen for changes
            window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
                this.reducedMotionPreference = e.matches;
                document.body.classList.toggle('las-reduced-motion', e.matches);
            });
        }

        /**
         * Detect screen reader
         */
        detectScreenReader() {
            // Simple heuristic for screen reader detection
            this.screenReaderDetected = (
                navigator.userAgent.includes('NVDA') ||
                navigator.userAgent.includes('JAWS') ||
                navigator.userAgent.includes('VoiceOver') ||
                window.speechSynthesis ||
                document.querySelector('[aria-live]') !== null
            );

            if (this.screenReaderDetected) {
                document.body.classList.add('las-screen-reader');
                this.log('Screen reader detected', 'info');
            }
        }

        /**
         * Setup touch gestures
         */
        setupTouchGestures() {
            let touchStartX, touchStartY, touchStartTime;

            this.on('*', 'touchstart', (event) => {
                const touch = event.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                touchStartTime = Date.now();
            }, { passive: true });

            this.on('*', 'touchend', (event) => {
                if (!touchStartX || !touchStartY) return;

                const touch = event.changedTouches[0];
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                const deltaTime = Date.now() - touchStartTime;

                // Detect swipe gestures
                const minSwipeDistance = 50;
                const maxSwipeTime = 300;

                if (deltaTime < maxSwipeTime) {
                    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
                        // Horizontal swipe
                        const direction = deltaX > 0 ? 'right' : 'left';
                        this.emit('gesture:swipe', { direction, element: event.target });
                    } else if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaX) < minSwipeDistance) {
                        // Vertical swipe
                        const direction = deltaY > 0 ? 'down' : 'up';
                        this.emit('gesture:swipe', { direction, element: event.target });
                    }
                }

                // Reset
                touchStartX = touchStartY = touchStartTime = null;
            }, { passive: true });
        }

        /**
         * Setup responsive interactions
         */
        setupResponsiveInteractions() {
            // Adjust interaction targets for touch devices
            const adjustTouchTargets = () => {
                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                
                if (isTouchDevice) {
                    document.body.classList.add('las-touch-device');
                    
                    // Ensure minimum touch target size (44px)
                    const interactiveElements = this.getFocusableElements();
                    interactiveElements.forEach(element => {
                        const rect = element.getBoundingClientRect();
                        if (rect.width < 44 || rect.height < 44) {
                            element.classList.add('las-small-touch-target');
                        }
                    });
                }
            };

            adjustTouchTargets();

            // Re-adjust on resize
            window.addEventListener('resize', () => {
                setTimeout(adjustTouchTargets, 100);
            });
        }

        /**
         * Provide haptic feedback (if supported)
         */
        provideHapticFeedback(type = 'light') {
            if (navigator.vibrate && !this.reducedMotionPreference) {
                const patterns = {
                    light: [10],
                    medium: [20],
                    heavy: [30],
                    click: [5],
                    error: [100, 50, 100]
                };

                navigator.vibrate(patterns[type] || patterns.light);
            }
        }

        /**
         * Provide audio feedback (if enabled)
         */
        provideFeedbackSound(type = 'click') {
            // Only provide audio feedback if user hasn't disabled it
            if (this.audioFeedbackDisabled) return;

            const audioContext = window.AudioContext || window.webkitAudioContext;
            if (!audioContext) return;

            try {
                const context = new audioContext();
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(context.destination);

                const frequencies = {
                    click: 800,
                    activate: 1000,
                    error: 400,
                    success: 1200
                };

                oscillator.frequency.setValueAtTime(frequencies[type] || frequencies.click, context.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.1, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);

                oscillator.start(context.currentTime);
                oscillator.stop(context.currentTime + 0.1);

            } catch (error) {
                // Audio feedback failed, continue silently
            }
        }

        /**
         * Return focus to trigger element
         */
        returnFocusToTrigger() {
            if (this.focusHistory.length > 1) {
                const previousElement = this.focusHistory[this.focusHistory.length - 2];
                if (previousElement && document.contains(previousElement)) {
                    previousElement.focus();
                }
            }
        }

        /**
         * Generate unique handler ID
         */
        generateHandlerId() {
            return `las-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Get event statistics
         */
        getStats() {
            return {
                ...this.eventStats,
                delegatedEvents: this.delegatedEvents.size,
                directEvents: this.directEvents.size,
                debounceTimers: this.debounceTimers.size,
                throttleTimers: this.throttleTimers.size,
                performanceMetrics: this.performanceMetrics
            };
        }

        /**
         * Get performance report
         */
        getPerformanceReport() {
            const processingTimes = this.performanceMetrics.eventProcessingTimes;
            const memoryUsage = this.performanceMetrics.memoryUsage;
            
            if (processingTimes.length === 0) {
                return { message: 'No performance data available' };
            }
            
            const times = processingTimes.map(m => m.time);
            const avgProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxProcessingTime = Math.max(...times);
            const minProcessingTime = Math.min(...times);
            
            return {
                eventProcessing: {
                    average: avgProcessingTime.toFixed(2),
                    maximum: maxProcessingTime.toFixed(2),
                    minimum: minProcessingTime.toFixed(2),
                    samples: times.length
                },
                memoryUsage: memoryUsage.length > 0 ? {
                    current: memoryUsage[memoryUsage.length - 1],
                    samples: memoryUsage.length
                } : null,
                lastCleanup: new Date(this.performanceMetrics.lastCleanup).toISOString()
            };
        }

        /**
         * Destroy event manager and cleanup all events
         */
        destroy() {
            try {
                // Remove all direct events
                this.directEvents.forEach((handler, handlerId) => {
                    this.removeDirectEvent(handlerId);
                });
                
                // Clear all delegated events
                this.delegatedEvents.clear();
                
                // Clear all timers
                this.debounceTimers.forEach(timer => clearTimeout(timer));
                this.debounceTimers.clear();
                
                this.throttleTimers.forEach(timer => clearTimeout(timer));
                this.throttleTimers.clear();
                
                // Remove system event listeners
                document.removeEventListener('visibilitychange', this.handleVisibilityChange);
                
                this.log('Event Manager destroyed and cleaned up', 'info');
                
            } catch (error) {
                this.log(`Error during Event Manager destruction: ${error.message}`, 'error');
            }
            
            super.destroy();
        }
    }

    // Placeholder component classes (will be implemented in other tasks)
    /**
     * State Manager - Handles UI state persistence and synchronization
     */
    class LASStateManager extends LASUIComponent {
        constructor(core) {
            super(core);
            this.state = {};
            this.localStorage = window.localStorage;
            this.sessionStorage = window.sessionStorage;
            this.broadcastChannel = null;
            this.storageKey = 'las_ui_state';
            this.sessionKey = 'las_session_state';
            this.syncEnabled = true;
            
            // Conflict resolution and validation
            this.conflictResolutionStrategy = 'timestamp'; // 'timestamp', 'manual', 'merge'
            this.stateVersion = 1;
            this.maxStateSize = 1024 * 1024; // 1MB limit
            this.validationRules = new Map();
            this.fallbackState = {};
            this.corruptionDetected = false;
            
            // Performance and reliability
            this.saveQueue = [];
            this.saveInProgress = false;
            this.retryAttempts = 3;
            this.retryDelay = 1000;
            
            // Bind methods
            this.handleStorageChange = this.handleStorageChange.bind(this);
            this.handleBroadcastMessage = this.handleBroadcastMessage.bind(this);
            this.handleOnlineStatusChange = this.handleOnlineStatusChange.bind(this);
        }

        async init() {
            try {
                this.log('Initializing State Manager...', 'info');
                
                // Setup validation rules
                this.setupValidationRules();
                
                // Setup fallback state
                this.setupFallbackState();
                
                // Initialize broadcast channel for multi-tab sync
                this.initializeBroadcastChannel();
                
                // Load saved state with validation and recovery
                await this.loadStateWithRecovery();
                
                // Bind storage events
                this.bindStorageEvents();
                
                // Bind online/offline events
                this.bindOnlineEvents();
                
                // Start periodic validation
                this.startPeriodicValidation();
                
                this.initialized = true;
                this.log('State Manager initialized successfully', 'success');
                
            } catch (error) {
                this.log(`State Manager initialization failed: ${error.message}`, 'error');
                
                // Attempt to recover with fallback state
                await this.recoverWithFallback();
                
                throw error;
            }
        }

        /**
         * Initialize broadcast channel for multi-tab synchronization
         */
        initializeBroadcastChannel() {
            if ('BroadcastChannel' in window && this.syncEnabled) {
                try {
                    this.broadcastChannel = new BroadcastChannel('las-ui-state');
                    this.broadcastChannel.onmessage = this.handleBroadcastMessage;
                    this.log('BroadcastChannel initialized for multi-tab sync', 'info');
                } catch (error) {
                    this.log(`BroadcastChannel initialization failed: ${error.message}`, 'warn');
                }
            }
        }

        /**
         * Load state from storage
         */
        async loadState() {
            try {
                // Load from localStorage
                if (this.localStorage) {
                    const savedState = this.localStorage.getItem(this.storageKey);
                    if (savedState) {
                        const parsed = JSON.parse(savedState);
                        this.state = { ...this.state, ...parsed };
                    }
                }
                
                // Merge with session state (takes priority)
                if (this.sessionStorage) {
                    const sessionState = this.sessionStorage.getItem(this.sessionKey);
                    if (sessionState) {
                        const parsed = JSON.parse(sessionState);
                        this.state = { ...this.state, ...parsed };
                    }
                }
                
                this.log('State loaded successfully', 'info');
                
            } catch (error) {
                this.log(`Failed to load state: ${error.message}`, 'error');
                this.state = {};
            }
        }

        /**
         * Save state to storage
         */
        async saveState() {
            try {
                const stateJson = JSON.stringify(this.state);
                
                // Save to localStorage
                if (this.localStorage) {
                    this.localStorage.setItem(this.storageKey, stateJson);
                }
                
                // Save to sessionStorage
                if (this.sessionStorage) {
                    this.sessionStorage.setItem(this.sessionKey, stateJson);
                }
                
                // Broadcast to other tabs
                if (this.broadcastChannel && this.syncEnabled) {
                    this.broadcastChannel.postMessage({
                        type: 'state-update',
                        state: this.state,
                        timestamp: Date.now()
                    });
                }
                
            } catch (error) {
                this.log(`Failed to save state: ${error.message}`, 'error');
            }
        }

        /**
         * Bind storage event listeners
         */
        bindStorageEvents() {
            if (window.addEventListener) {
                window.addEventListener('storage', this.handleStorageChange);
            }
        }

        /**
         * Handle storage changes from other tabs
         */
        handleStorageChange(event) {
            if (event.key === this.storageKey && event.newValue) {
                try {
                    const newState = JSON.parse(event.newValue);
                    this.state = { ...this.state, ...newState };
                    
                    this.emit('state:changed', { 
                        source: 'storage',
                        state: this.state 
                    });
                    
                } catch (error) {
                    this.log(`Error handling storage change: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Handle broadcast messages from other tabs
         */
        handleBroadcastMessage(event) {
            const { type, state, timestamp } = event.data;
            
            if (type === 'state-update' && state) {
                this.state = { ...this.state, ...state };
                
                this.emit('state:changed', { 
                    source: 'broadcast',
                    state: this.state,
                    timestamp 
                });
            }
        }

        /**
         * Get a value from state
         */
        async get(key, defaultValue = null) {
            try {
                const keys = key.split('.');
                let value = this.state;
                
                for (const k of keys) {
                    if (value && typeof value === 'object' && k in value) {
                        value = value[k];
                    } else {
                        return defaultValue;
                    }
                }
                
                return value;
                
            } catch (error) {
                this.log(`Error getting state value for key ${key}: ${error.message}`, 'error');
                return defaultValue;
            }
        }

        /**
         * Set a value in state
         */
        async set(key, value) {
            try {
                const keys = key.split('.');
                let current = this.state;
                
                // Navigate to the parent object
                for (let i = 0; i < keys.length - 1; i++) {
                    const k = keys[i];
                    if (!(k in current) || typeof current[k] !== 'object') {
                        current[k] = {};
                    }
                    current = current[k];
                }
                
                // Set the final value
                const finalKey = keys[keys.length - 1];
                current[finalKey] = value;
                
                // Update timestamp
                this.state.timestamp = Date.now();
                
                // Save state with conflict resolution
                await this.saveStateWithConflictResolution();
                
                // Emit change event
                this.emit('state:set', { key, value });
                
                return true;
                
            } catch (error) {
                this.log(`Error setting state value for key ${key}: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Remove a value from state
         */
        async remove(key) {
            try {
                const keys = key.split('.');
                let current = this.state;
                
                // Navigate to the parent object
                for (let i = 0; i < keys.length - 1; i++) {
                    const k = keys[i];
                    if (!(k in current) || typeof current[k] !== 'object') {
                        return false; // Key doesn't exist
                    }
                    current = current[k];
                }
                
                // Remove the final key
                const finalKey = keys[keys.length - 1];
                if (finalKey in current) {
                    delete current[finalKey];
                    
                    // Save state
                    await this.saveState();
                    
                    // Emit change event
                    this.emit('state:removed', { key });
                    
                    return true;
                }
                
                return false;
                
            } catch (error) {
                this.log(`Error removing state value for key ${key}: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Clear all state
         */
        async clear() {
            try {
                this.state = {};
                
                // Clear storage
                if (this.localStorage) {
                    this.localStorage.removeItem(this.storageKey);
                }
                if (this.sessionStorage) {
                    this.sessionStorage.removeItem(this.sessionKey);
                }
                
                // Emit change event
                this.emit('state:cleared');
                
                return true;
                
            } catch (error) {
                this.log(`Error clearing state: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Get all state
         */
        getAll() {
            return { ...this.state };
        }

        /**
         * Check if a key exists
         */
        has(key) {
            try {
                const keys = key.split('.');
                let current = this.state;
                
                for (const k of keys) {
                    if (current && typeof current === 'object' && k in current) {
                        current = current[k];
                    } else {
                        return false;
                    }
                }
                
                return true;
                
            } catch (error) {
                return false;
            }
        }

        /**
         * Enable/disable multi-tab synchronization
         */
        setSyncEnabled(enabled) {
            this.syncEnabled = enabled;
            
            if (!enabled && this.broadcastChannel) {
                this.broadcastChannel.close();
                this.broadcastChannel = null;
            } else if (enabled && !this.broadcastChannel) {
                this.initializeBroadcastChannel();
            }
        }

        /**
         * Setup validation rules for state data
         */
        setupValidationRules() {
            // Add validation rules for different state keys
            this.validationRules.set('activeTab', (value) => {
                const validTabs = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
                return typeof value === 'string' && validTabs.includes(value);
            });
            
            this.validationRules.set('form', (value) => {
                return typeof value === 'object' && value !== null;
            });
            
            this.validationRules.set('ui', (value) => {
                return typeof value === 'object' && value !== null;
            });
            
            this.validationRules.set('preferences', (value) => {
                return typeof value === 'object' && value !== null;
            });
        }

        /**
         * Setup fallback state for recovery
         */
        setupFallbackState() {
            this.fallbackState = {
                activeTab: 'general',
                form: {},
                ui: {
                    theme: 'default',
                    animations: true,
                    notifications: true
                },
                preferences: {
                    rememberTab: true,
                    autoSave: false,
                    syncEnabled: true
                },
                version: this.stateVersion,
                timestamp: Date.now()
            };
        }

        /**
         * Load state with recovery mechanisms
         */
        async loadStateWithRecovery() {
            let loadSuccess = false;
            
            try {
                // Try to load from localStorage first
                if (this.localStorage) {
                    const savedState = this.localStorage.getItem(this.storageKey);
                    if (savedState) {
                        const parsed = await this.parseAndValidateState(savedState);
                        if (parsed) {
                            this.state = { ...this.fallbackState, ...parsed };
                            loadSuccess = true;
                            this.log('State loaded from localStorage', 'info');
                        }
                    }
                }
                
                // Try sessionStorage if localStorage failed
                if (!loadSuccess && this.sessionStorage) {
                    const sessionState = this.sessionStorage.getItem(this.sessionKey);
                    if (sessionState) {
                        const parsed = await this.parseAndValidateState(sessionState);
                        if (parsed) {
                            this.state = { ...this.fallbackState, ...parsed };
                            loadSuccess = true;
                            this.log('State loaded from sessionStorage', 'info');
                        }
                    }
                }
                
                // Use fallback if all else fails
                if (!loadSuccess) {
                    this.state = { ...this.fallbackState };
                    this.log('Using fallback state', 'warn');
                }
                
                // Validate final state
                await this.validateState();
                
            } catch (error) {
                this.log(`Error loading state: ${error.message}`, 'error');
                await this.recoverWithFallback();
            }
        }

        /**
         * Parse and validate state data
         */
        async parseAndValidateState(stateJson) {
            try {
                const parsed = JSON.parse(stateJson);
                
                // Check state size
                if (JSON.stringify(parsed).length > this.maxStateSize) {
                    this.log('State size exceeds maximum limit', 'warn');
                    return null;
                }
                
                // Check version compatibility
                if (parsed.version && parsed.version > this.stateVersion) {
                    this.log('State version is newer than supported', 'warn');
                    return null;
                }
                
                // Validate structure
                if (typeof parsed !== 'object' || parsed === null) {
                    this.log('Invalid state structure', 'warn');
                    return null;
                }
                
                // Run validation rules
                for (const [key, validator] of this.validationRules) {
                    if (parsed[key] !== undefined && !validator(parsed[key])) {
                        this.log(`State validation failed for key: ${key}`, 'warn');
                        delete parsed[key]; // Remove invalid data
                    }
                }
                
                return parsed;
                
            } catch (error) {
                this.log(`Error parsing state: ${error.message}`, 'error');
                return null;
            }
        }

        /**
         * Validate current state integrity
         */
        async validateState() {
            try {
                // Check for corruption indicators
                const stateString = JSON.stringify(this.state);
                
                // Check for circular references
                if (stateString.includes('[object Object]')) {
                    throw new Error('Circular reference detected in state');
                }
                
                // Check state size
                if (stateString.length > this.maxStateSize) {
                    this.log('State size exceeds limit, cleaning up...', 'warn');
                    await this.cleanupLargeState();
                }
                
                // Validate required fields
                if (!this.state.activeTab) {
                    this.state.activeTab = this.fallbackState.activeTab;
                }
                
                // Update version and timestamp
                this.state.version = this.stateVersion;
                this.state.timestamp = Date.now();
                
                this.corruptionDetected = false;
                
            } catch (error) {
                this.log(`State validation failed: ${error.message}`, 'error');
                this.corruptionDetected = true;
                await this.recoverWithFallback();
            }
        }

        /**
         * Clean up large state by removing old or unnecessary data
         */
        async cleanupLargeState() {
            try {
                // Remove old form data (keep only last 10 entries)
                if (this.state.form && typeof this.state.form === 'object') {
                    const formKeys = Object.keys(this.state.form);
                    if (formKeys.length > 10) {
                        const keysToRemove = formKeys.slice(0, formKeys.length - 10);
                        keysToRemove.forEach(key => delete this.state.form[key]);
                    }
                }
                
                // Remove old UI state
                if (this.state.ui && this.state.ui.history) {
                    this.state.ui.history = this.state.ui.history.slice(-5); // Keep last 5 entries
                }
                
                // Remove temporary data
                if (this.state.temp) {
                    delete this.state.temp;
                }
                
                this.log('State cleanup completed', 'info');
                
            } catch (error) {
                this.log(`Error during state cleanup: ${error.message}`, 'error');
            }
        }

        /**
         * Recover with fallback state
         */
        async recoverWithFallback() {
            try {
                this.log('Recovering with fallback state...', 'warn');
                
                // Backup current state if possible
                if (this.state && Object.keys(this.state).length > 0) {
                    try {
                        const backupKey = `${this.storageKey}_backup_${Date.now()}`;
                        this.localStorage.setItem(backupKey, JSON.stringify(this.state));
                        this.log('Current state backed up before recovery', 'info');
                    } catch (error) {
                        this.log('Failed to backup current state', 'warn');
                    }
                }
                
                // Reset to fallback state
                this.state = { ...this.fallbackState };
                
                // Save fallback state
                await this.saveState();
                
                // Emit recovery event
                this.emit('state:recovered', { 
                    reason: 'corruption_detected',
                    fallbackUsed: true 
                });
                
                this.corruptionDetected = false;
                
            } catch (error) {
                this.log(`Error during fallback recovery: ${error.message}`, 'error');
            }
        }

        /**
         * Enhanced save state with conflict resolution
         */
        async saveStateWithConflictResolution() {
            if (this.saveInProgress) {
                // Queue the save operation
                return new Promise((resolve) => {
                    this.saveQueue.push(resolve);
                });
            }
            
            this.saveInProgress = true;
            
            try {
                // Check for conflicts before saving
                const conflicts = await this.detectConflicts();
                
                if (conflicts.length > 0) {
                    await this.resolveConflicts(conflicts);
                }
                
                // Validate state before saving
                await this.validateState();
                
                // Perform the save with retry logic
                await this.saveWithRetry();
                
                // Process queued saves
                this.processQueuedSaves();
                
            } catch (error) {
                this.log(`Error saving state: ${error.message}`, 'error');
                throw error;
            } finally {
                this.saveInProgress = false;
            }
        }

        /**
         * Detect conflicts with stored state
         */
        async detectConflicts() {
            const conflicts = [];
            
            try {
                // Check localStorage for conflicts
                if (this.localStorage) {
                    const storedState = this.localStorage.getItem(this.storageKey);
                    if (storedState) {
                        const parsed = JSON.parse(storedState);
                        
                        // Compare timestamps
                        if (parsed.timestamp && this.state.timestamp && 
                            parsed.timestamp > this.state.timestamp) {
                            conflicts.push({
                                type: 'timestamp',
                                source: 'localStorage',
                                storedState: parsed,
                                currentState: this.state
                            });
                        }
                        
                        // Compare versions
                        if (parsed.version && parsed.version > this.state.version) {
                            conflicts.push({
                                type: 'version',
                                source: 'localStorage',
                                storedVersion: parsed.version,
                                currentVersion: this.state.version
                            });
                        }
                    }
                }
                
            } catch (error) {
                this.log(`Error detecting conflicts: ${error.message}`, 'error');
            }
            
            return conflicts;
        }

        /**
         * Resolve conflicts based on strategy
         */
        async resolveConflicts(conflicts) {
            for (const conflict of conflicts) {
                try {
                    switch (this.conflictResolutionStrategy) {
                        case 'timestamp':
                            await this.resolveByTimestamp(conflict);
                            break;
                        case 'merge':
                            await this.resolveByMerging(conflict);
                            break;
                        case 'manual':
                            await this.resolveManually(conflict);
                            break;
                        default:
                            this.log(`Unknown conflict resolution strategy: ${this.conflictResolutionStrategy}`, 'warn');
                    }
                } catch (error) {
                    this.log(`Error resolving conflict: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Resolve conflict by timestamp (newest wins)
         */
        async resolveByTimestamp(conflict) {
            if (conflict.type === 'timestamp' && conflict.storedState.timestamp > this.state.timestamp) {
                this.log('Resolving conflict: using newer stored state', 'info');
                this.state = { ...this.state, ...conflict.storedState };
                this.state.timestamp = Date.now(); // Update to current time
            }
        }

        /**
         * Resolve conflict by merging states
         */
        async resolveByMerging(conflict) {
            if (conflict.storedState) {
                this.log('Resolving conflict: merging states', 'info');
                
                // Deep merge states, preferring current state for conflicts
                this.state = this.deepMerge(conflict.storedState, this.state);
                this.state.timestamp = Date.now();
            }
        }

        /**
         * Resolve conflict manually (emit event for user decision)
         */
        async resolveManually(conflict) {
            this.log('Manual conflict resolution required', 'warn');
            
            this.emit('state:conflict', {
                conflict,
                resolve: (resolution) => {
                    if (resolution === 'use_stored') {
                        this.state = { ...this.state, ...conflict.storedState };
                    } else if (resolution === 'use_current') {
                        // Keep current state
                    } else if (resolution === 'merge') {
                        this.state = this.deepMerge(conflict.storedState, this.state);
                    }
                    this.state.timestamp = Date.now();
                }
            });
        }

        /**
         * Deep merge two objects
         */
        deepMerge(target, source) {
            const result = { ...target };
            
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (typeof source[key] === 'object' && source[key] !== null && 
                        typeof result[key] === 'object' && result[key] !== null) {
                        result[key] = this.deepMerge(result[key], source[key]);
                    } else {
                        result[key] = source[key];
                    }
                }
            }
            
            return result;
        }

        /**
         * Save with retry logic
         */
        async saveWithRetry() {
            let attempts = 0;
            
            while (attempts < this.retryAttempts) {
                try {
                    await this.saveState();
                    return; // Success
                } catch (error) {
                    attempts++;
                    
                    if (attempts >= this.retryAttempts) {
                        throw error;
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => 
                        setTimeout(resolve, this.retryDelay * attempts)
                    );
                    
                    this.log(`Save attempt ${attempts} failed, retrying...`, 'warn');
                }
            }
        }

        /**
         * Process queued save operations
         */
        processQueuedSaves() {
            const queue = this.saveQueue.splice(0);
            queue.forEach(resolve => resolve());
        }

        /**
         * Bind online/offline events
         */
        bindOnlineEvents() {
            if (window.addEventListener) {
                window.addEventListener('online', this.handleOnlineStatusChange);
                window.addEventListener('offline', this.handleOnlineStatusChange);
            }
        }

        /**
         * Handle online/offline status changes
         */
        handleOnlineStatusChange() {
            const isOnline = navigator.onLine;
            
            this.emit('state:connectivity-changed', { online: isOnline });
            
            if (isOnline) {
                this.log('Connection restored, syncing state...', 'info');
                // Attempt to sync state when back online
                this.saveState().catch(error => {
                    this.log(`Failed to sync state after reconnection: ${error.message}`, 'error');
                });
            } else {
                this.log('Connection lost, state will sync when restored', 'warn');
            }
        }

        /**
         * Start periodic state validation
         */
        startPeriodicValidation() {
            // Validate state every 5 minutes
            setInterval(async () => {
                try {
                    await this.validateState();
                } catch (error) {
                    this.log(`Periodic validation failed: ${error.message}`, 'error');
                }
            }, 5 * 60 * 1000);
        }

        /**
         * Set conflict resolution strategy
         */
        setConflictResolutionStrategy(strategy) {
            const validStrategies = ['timestamp', 'merge', 'manual'];
            if (validStrategies.includes(strategy)) {
                this.conflictResolutionStrategy = strategy;
                this.log(`Conflict resolution strategy set to: ${strategy}`, 'info');
            } else {
                this.log(`Invalid conflict resolution strategy: ${strategy}`, 'error');
            }
        }

        /**
         * Get state health information
         */
        getStateHealth() {
            return {
                initialized: this.initialized,
                corruptionDetected: this.corruptionDetected,
                stateSize: JSON.stringify(this.state).length,
                maxStateSize: this.maxStateSize,
                version: this.state.version || 0,
                timestamp: this.state.timestamp || 0,
                syncEnabled: this.syncEnabled,
                conflictStrategy: this.conflictResolutionStrategy,
                hasValidationRules: this.validationRules.size > 0,
                hasFallbackState: Object.keys(this.fallbackState).length > 0
            };
        }

        /**
         * Destroy the state manager
         */
        destroy() {
            try {
                // Remove event listeners
                if (window.removeEventListener) {
                    window.removeEventListener('storage', this.handleStorageChange);
                    window.removeEventListener('online', this.handleOnlineStatusChange);
                    window.removeEventListener('offline', this.handleOnlineStatusChange);
                }
                
                // Close broadcast channel
                if (this.broadcastChannel) {
                    this.broadcastChannel.close();
                    this.broadcastChannel = null;
                }
                
                // Clear queued operations
                this.saveQueue = [];
                this.saveInProgress = false;
                
                // Clear validation rules
                this.validationRules.clear();
                
                // Clear state
                this.state = {};
                this.fallbackState = {};
                
                super.destroy();
                
            } catch (error) {
                this.log(`Error destroying State Manager: ${error.message}`, 'error');
            }
        }
    }



    /**
     * Tab Manager - Handles tab navigation, state persistence, and accessibility
     */
    class LASTabManager extends LASUIComponent {
        constructor(core) {
            super(core);
            this.activeTab = 'general';
            this.tabButtons = new Map();
            this.tabPanels = new Map();
            this.tabHistory = [];
            this.maxHistoryLength = 10;
            this.transitionDuration = 200;
            this.keyboardNavigation = true;
            
            // Bind methods
            this.handleTabClick = this.handleTabClick.bind(this);
            this.handleTabKeydown = this.handleTabKeydown.bind(this);
            this.handleHashChange = this.handleHashChange.bind(this);
        }

        async init() {
            try {
                this.log('Initializing Tab Manager...', 'info');
                
                // Discover tab elements
                this.discoverTabElements();
                
                // Restore saved tab state
                await this.restoreTabState();
                
                // Bind tab events
                this.bindTabEvents();
                
                // Set initial active tab
                this.setActiveTab(this.activeTab, false, false);
                
                // Bind URL hash changes
                this.bindHashEvents();
                
                this.initialized = true;
                this.log('Tab Manager initialized successfully', 'success');
                
            } catch (error) {
                this.log(`Tab Manager initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }

        /**
         * Discover and register tab elements
         */
        discoverTabElements() {
            // Find tab buttons
            const tabButtons = document.querySelectorAll('.las-tab[data-tab], .nav-tab[data-tab]');
            tabButtons.forEach(button => {
                const tabId = button.dataset.tab;
                if (tabId) {
                    this.tabButtons.set(tabId, button);
                    
                    // Set initial ARIA attributes
                    button.setAttribute('role', 'tab');
                    button.setAttribute('aria-selected', 'false');
                    button.setAttribute('tabindex', '-1');
                    
                    // Ensure button has proper ID
                    if (!button.id) {
                        button.id = `las-tab-button-${tabId}`;
                    }
                }
            });
            
            // Find tab panels
            const tabPanels = document.querySelectorAll('.las-tab-panel[id^="las-tab-"], .tab-panel[data-tab]');
            tabPanels.forEach(panel => {
                let tabId;
                
                if (panel.dataset.tab) {
                    tabId = panel.dataset.tab;
                } else if (panel.id.startsWith('las-tab-')) {
                    tabId = panel.id.replace('las-tab-', '');
                }
                
                if (tabId) {
                    this.tabPanels.set(tabId, panel);
                    
                    // Set ARIA attributes
                    panel.setAttribute('role', 'tabpanel');
                    panel.setAttribute('aria-hidden', 'true');
                    
                    // Link panel to button
                    const button = this.tabButtons.get(tabId);
                    if (button) {
                        panel.setAttribute('aria-labelledby', button.id);
                        button.setAttribute('aria-controls', panel.id);
                    }
                }
            });
            
            this.log(`Discovered ${this.tabButtons.size} tabs and ${this.tabPanels.size} panels`, 'info');
            
            // Validate tab structure
            if (this.tabButtons.size === 0) {
                throw new Error('No tab buttons found');
            }
            
            if (this.tabPanels.size === 0) {
                this.log('No tab panels found - tabs may be navigation only', 'warn');
            }
        }

        /**
         * Restore saved tab state
         */
        async restoreTabState() {
            try {
                // Check URL hash first
                const hash = window.location.hash.replace('#', '');
                if (hash && this.tabButtons.has(hash)) {
                    this.activeTab = hash;
                    this.log(`Tab restored from URL hash: ${hash}`, 'info');
                    return;
                }
                
                // Check state manager
                const stateManager = this.core.get('state');
                if (stateManager) {
                    const savedTab = await stateManager.get('activeTab');
                    if (savedTab && this.tabButtons.has(savedTab)) {
                        this.activeTab = savedTab;
                        this.log(`Tab restored from state: ${savedTab}`, 'info');
                        return;
                    }
                }
                
                // Check localStorage as fallback
                try {
                    const savedTab = localStorage.getItem('las_active_tab');
                    if (savedTab && this.tabButtons.has(savedTab)) {
                        this.activeTab = savedTab;
                        this.log(`Tab restored from localStorage: ${savedTab}`, 'info');
                        return;
                    }
                } catch (e) {
                    this.log('localStorage not available for tab state', 'warn');
                }
                
                // Use first available tab as default
                const firstTab = Array.from(this.tabButtons.keys())[0];
                if (firstTab) {
                    this.activeTab = firstTab;
                    this.log(`Using default tab: ${firstTab}`, 'info');
                }
                
            } catch (error) {
                this.log(`Error restoring tab state: ${error.message}`, 'error');
                // Continue with default tab
            }
        }

        /**
         * Bind tab event listeners
         */
        bindTabEvents() {
            this.tabButtons.forEach((button, tabId) => {
                // Click events
                button.addEventListener('click', this.handleTabClick);
                
                // Keyboard events
                if (this.keyboardNavigation) {
                    button.addEventListener('keydown', this.handleTabKeydown);
                }
                
                // Focus events for accessibility
                button.addEventListener('focus', () => {
                    this.emit('tab:focused', { tabId });
                });
                
                button.addEventListener('blur', () => {
                    this.emit('tab:blurred', { tabId });
                });
            });
        }

        /**
         * Bind URL hash change events
         */
        bindHashEvents() {
            window.addEventListener('hashchange', this.handleHashChange);
        }

        /**
         * Handle tab button clicks
         */
        handleTabClick(event) {
            event.preventDefault();
            
            const button = event.currentTarget;
            const tabId = button.dataset.tab;
            
            if (tabId && this.tabButtons.has(tabId)) {
                this.setActiveTab(tabId);
            }
        }

        /**
         * Handle keyboard navigation
         */
        handleTabKeydown(event) {
            // Check if keyboard navigation is enabled
            if (!this.keyboardNavigation) {
                return;
            }
            
            const button = event.currentTarget;
            const tabId = button.dataset.tab;
            
            switch (event.key) {
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.setActiveTab(tabId);
                    break;
                    
                case 'ArrowLeft':
                case 'ArrowUp':
                    event.preventDefault();
                    this.navigateWithArrows(-1);
                    break;
                    
                case 'ArrowRight':
                case 'ArrowDown':
                    event.preventDefault();
                    this.navigateWithArrows(1);
                    break;
                    
                case 'Home':
                    event.preventDefault();
                    this.navigateToFirst();
                    break;
                    
                case 'End':
                    event.preventDefault();
                    this.navigateToLast();
                    break;
            }
        }

        /**
         * Handle URL hash changes
         */
        handleHashChange() {
            const hash = window.location.hash.replace('#', '');
            if (hash && this.tabButtons.has(hash) && hash !== this.activeTab) {
                this.setActiveTab(hash, false); // Don't update URL since it's already changed
            }
        }

        /**
         * Set the active tab
         */
        setActiveTab(tabId, saveState = true, updateUrl = true) {
            if (!this.tabButtons.has(tabId)) {
                this.log(`Tab ${tabId} not found`, 'warn');
                return false;
            }
            
            const previousTab = this.activeTab;
            
            // Don't do anything if already active
            if (tabId === this.activeTab) {
                return true;
            }
            
            try {
                // Emit before change event
                const beforeChangeEvent = this.emit('tab:before-change', { 
                    tabId, 
                    previousTab,
                    cancelable: true 
                });
                
                if (beforeChangeEvent && beforeChangeEvent.defaultPrevented) {
                    this.log(`Tab change to ${tabId} was cancelled`, 'info');
                    return false;
                }
                
                // Update button states
                this.updateButtonStates(tabId);
                
                // Update panel visibility
                this.updatePanelVisibility(tabId);
                
                // Update container state
                this.updateContainerState(tabId);
                
                // Update URL hash
                if (updateUrl) {
                    this.updateUrlHash(tabId);
                }
                
                // Save state
                if (saveState) {
                    this.saveTabState(tabId);
                }
                
                // Update history
                this.updateTabHistory(previousTab, tabId);
                
                // Update active tab
                this.activeTab = tabId;
                
                // Emit change event
                this.emit('tab:changed', { 
                    tabId, 
                    previousTab,
                    timestamp: Date.now()
                });
                
                this.log(`Switched to tab: ${tabId}`, 'info');
                return true;
                
            } catch (error) {
                this.log(`Error switching to tab ${tabId}: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Update button states
         */
        updateButtonStates(activeTabId) {
            this.tabButtons.forEach((button, tabId) => {
                if (tabId === activeTabId) {
                    button.classList.add('active', 'nav-tab-active');
                    button.setAttribute('aria-selected', 'true');
                    button.setAttribute('tabindex', '0');
                } else {
                    button.classList.remove('active', 'nav-tab-active');
                    button.setAttribute('aria-selected', 'false');
                    button.setAttribute('tabindex', '-1');
                }
            });
        }

        /**
         * Update panel visibility with transitions
         */
        updatePanelVisibility(activeTabId) {
            this.tabPanels.forEach((panel, tabId) => {
                if (tabId === activeTabId) {
                    // Show active panel
                    panel.classList.add('active');
                    panel.setAttribute('aria-hidden', 'false');
                    
                    // Add transition class
                    panel.classList.add('las-tab-transition-in');
                    
                    // Remove transition class after animation
                    setTimeout(() => {
                        panel.classList.remove('las-tab-transition-in');
                    }, this.transitionDuration);
                    
                } else {
                    // Hide inactive panels
                    panel.classList.remove('active');
                    panel.setAttribute('aria-hidden', 'true');
                    panel.classList.remove('las-tab-transition-in');
                }
            });
        }

        /**
         * Update container state
         */
        updateContainerState(activeTabId) {
            const containers = document.querySelectorAll('.las-tabs-container, .nav-tab-wrapper');
            containers.forEach(container => {
                container.setAttribute('data-active-tab', activeTabId);
            });
        }

        /**
         * Update URL hash
         */
        updateUrlHash(tabId) {
            try {
                const newUrl = `${window.location.pathname}${window.location.search}#${tabId}`;
                window.history.replaceState(null, '', newUrl);
            } catch (error) {
                this.log(`Error updating URL hash: ${error.message}`, 'warn');
            }
        }

        /**
         * Save tab state
         */
        async saveTabState(tabId) {
            try {
                // Save to state manager
                const stateManager = this.core.get('state');
                if (stateManager) {
                    await stateManager.set('activeTab', tabId);
                }
                
                // Save to localStorage as fallback
                try {
                    localStorage.setItem('las_active_tab', tabId);
                } catch (e) {
                    this.log('Could not save to localStorage', 'warn');
                }
                
            } catch (error) {
                this.log(`Error saving tab state: ${error.message}`, 'warn');
            }
        }

        /**
         * Update tab history
         */
        updateTabHistory(previousTab, currentTab) {
            if (previousTab && previousTab !== currentTab) {
                this.tabHistory.push({
                    from: previousTab,
                    to: currentTab,
                    timestamp: Date.now()
                });
                
                // Limit history size
                if (this.tabHistory.length > this.maxHistoryLength) {
                    this.tabHistory.shift();
                }
            }
        }

        /**
         * Navigate with arrow keys
         */
        navigateWithArrows(direction) {
            const tabIds = Array.from(this.tabButtons.keys());
            const currentIndex = tabIds.indexOf(this.activeTab);
            
            if (currentIndex === -1) return;
            
            const newIndex = (currentIndex + direction + tabIds.length) % tabIds.length;
            const newTabId = tabIds[newIndex];
            
            this.setActiveTab(newTabId);
            this.focusTab(newTabId);
        }

        /**
         * Navigate to first tab
         */
        navigateToFirst() {
            const firstTab = Array.from(this.tabButtons.keys())[0];
            if (firstTab) {
                this.setActiveTab(firstTab);
                this.focusTab(firstTab);
            }
        }

        /**
         * Navigate to last tab
         */
        navigateToLast() {
            const tabIds = Array.from(this.tabButtons.keys());
            const lastTab = tabIds[tabIds.length - 1];
            if (lastTab) {
                this.setActiveTab(lastTab);
                this.focusTab(lastTab);
            }
        }

        /**
         * Focus a specific tab
         */
        focusTab(tabId) {
            const button = this.tabButtons.get(tabId);
            if (button) {
                button.focus();
            }
        }

        /**
         * Get the currently active tab
         */
        getActiveTab() {
            return this.activeTab;
        }

        /**
         * Get all available tabs
         */
        getAllTabs() {
            return Array.from(this.tabButtons.keys());
        }

        /**
         * Check if a tab exists
         */
        hasTab(tabId) {
            return this.tabButtons.has(tabId);
        }

        /**
         * Get tab history
         */
        getTabHistory() {
            return [...this.tabHistory];
        }

        /**
         * Go to previous tab in history
         */
        goToPreviousTab() {
            if (this.tabHistory.length > 0) {
                const lastEntry = this.tabHistory[this.tabHistory.length - 1];
                if (lastEntry && lastEntry.from !== this.activeTab) {
                    this.setActiveTab(lastEntry.from);
                    return true;
                }
            }
            return false;
        }

        /**
         * Enable/disable keyboard navigation
         */
        setKeyboardNavigation(enabled) {
            this.keyboardNavigation = enabled;
            
            // Remove existing listeners first
            this.tabButtons.forEach(button => {
                button.removeEventListener('keydown', this.handleTabKeydown);
            });
            
            // Add listeners if enabled
            if (enabled) {
                this.tabButtons.forEach(button => {
                    button.addEventListener('keydown', this.handleTabKeydown);
                });
            }
        }

        /**
         * Destroy the tab manager
         */
        destroy() {
            try {
                // Remove event listeners
                this.tabButtons.forEach(button => {
                    button.removeEventListener('click', this.handleTabClick);
                    button.removeEventListener('keydown', this.handleTabKeydown);
                });
                
                window.removeEventListener('hashchange', this.handleHashChange);
                
                // Clear maps
                this.tabButtons.clear();
                this.tabPanels.clear();
                this.tabHistory = [];
                
                super.destroy();
                
            } catch (error) {
                this.log(`Error destroying Tab Manager: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Menu Manager - Handles WordPress admin sidebar menu interactions and submenu functionality
     */
    class LASMenuManager extends LASUIComponent {
        constructor(core) {
            super(core);
            this.menuItems = new Map();
            this.submenus = new Map();
            this.hoverTimeout = null;
            this.hoverDelay = 300; // ms
            this.touchDevice = false;
            this.keyboardNavigation = true;
            this.responsiveBreakpoint = 782; // WordPress mobile breakpoint
            
            // Bind methods to preserve context
            this.handleMenuItemEnter = this.handleMenuItemEnter.bind(this);
            this.handleMenuItemLeave = this.handleMenuItemLeave.bind(this);
            this.handleSubmenuEnter = this.handleSubmenuEnter.bind(this);
            this.handleSubmenuLeave = this.handleSubmenuLeave.bind(this);
            this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
            this.handleMenuItemKeydown = this.handleMenuItemKeydown.bind(this);
            this.handleWindowResize = this.handleWindowResize.bind(this);
            this.handleTouchStart = this.handleTouchStart.bind(this);
        }

        async init() {
            try {
                this.log('Initializing Menu Manager...', 'info');
                
                // Detect touch device
                this.detectTouchDevice();
                
                // Discover menu elements
                this.discoverMenuElements();
                
                // Setup accessibility features
                this.setupAriaLiveRegion();
                
                // Bind menu events
                this.bindMenuEvents();
                
                // Initialize submenu positioning system
                this.initializeSubmenuPositioning();
                
                // Setup touch gestures for mobile
                this.setupTouchGestures();
                
                // Setup voice control (if supported)
                this.setupVoiceControl();
                
                // Bind global events (includes responsive listeners)
                this.bindGlobalEvents();
                
                this.initialized = true;
                this.log('Menu Manager initialized successfully', 'success');
                
            } catch (error) {
                this.log(`Menu Manager initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }

        /**
         * Detect if this is a touch device
         */
        detectTouchDevice() {
            this.touchDevice = 'ontouchstart' in window || 
                              navigator.maxTouchPoints > 0 || 
                              navigator.msMaxTouchPoints > 0;
            
            if (this.touchDevice) {
                document.body.classList.add('las-touch-device');
                this.log('Touch device detected', 'info');
            }
        }

        /**
         * Discover WordPress admin menu elements
         */
        discoverMenuElements() {
            // Find WordPress admin menu items with submenus
            const menuSelectors = [
                '#adminmenu .wp-has-submenu',
                '#adminmenu .menu-top',
                '.folded #adminmenu .wp-has-submenu'
            ];

            let menuCount = 0;
            let submenuCount = 0;

            menuSelectors.forEach(selector => {
                const menuItems = document.querySelectorAll(selector);
                
                menuItems.forEach(item => {
                    const submenu = item.querySelector('.wp-submenu');
                    if (submenu) {
                        const itemId = item.id || `menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Ensure the item has an ID
                        if (!item.id) {
                            item.id = itemId;
                        }
                        
                        this.menuItems.set(itemId, item);
                        this.submenus.set(itemId, submenu);
                        
                        menuCount++;
                        submenuCount++;
                        
                        // Add accessibility attributes
                        this.setupMenuAccessibility(item, submenu, itemId);
                    }
                });
            });

            // Also handle menu items without submenus for consistency
            const allMenuItems = document.querySelectorAll('#adminmenu .menu-top');
            allMenuItems.forEach(item => {
                if (!this.menuItems.has(item.id)) {
                    const itemId = item.id || `menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    if (!item.id) {
                        item.id = itemId;
                    }
                    this.menuItems.set(itemId, item);
                    menuCount++;
                }
            });

            this.log(`Discovered ${menuCount} menu items and ${submenuCount} submenus`, 'info');
        }

        /**
         * Setup accessibility attributes for menu items and submenus
         */
        setupMenuAccessibility(menuItem, submenu, itemId) {
            // Setup menu item attributes
            const menuLink = menuItem.querySelector('.wp-menu-name, .menu-top > a');
            if (menuLink) {
                menuLink.setAttribute('aria-haspopup', 'true');
                menuLink.setAttribute('aria-expanded', 'false');
                menuLink.setAttribute('aria-controls', `submenu-${itemId}`);
            }

            // Setup submenu attributes
            submenu.setAttribute('id', `submenu-${itemId}`);
            submenu.setAttribute('role', 'menu');
            submenu.setAttribute('aria-hidden', 'true');
            submenu.setAttribute('aria-labelledby', itemId);

            // Setup submenu items
            const submenuItems = submenu.querySelectorAll('li > a');
            submenuItems.forEach((link, index) => {
                link.setAttribute('role', 'menuitem');
                link.setAttribute('tabindex', '-1');
            });
        }

        /**
         * Bind menu event listeners
         */
        bindMenuEvents() {
            this.menuItems.forEach((item, itemId) => {
                const submenu = this.submenus.get(itemId);
                const menuLink = item.querySelector('.wp-menu-name, .menu-top > a');

                if (menuLink) {
                    // Mouse events for desktop
                    if (!this.touchDevice) {
                        menuLink.addEventListener('mouseenter', (e) => {
                            this.handleMenuItemEnter(itemId, e);
                        });
                        
                        item.addEventListener('mouseleave', (e) => {
                            this.handleMenuItemLeave(itemId, e);
                        });
                    }

                    // Click events (for mobile and accessibility)
                    menuLink.addEventListener('click', (e) => {
                        this.handleMenuItemClick(itemId, e);
                    });

                    // Keyboard events
                    if (this.keyboardNavigation) {
                        menuLink.addEventListener('keydown', (e) => {
                            this.handleMenuItemKeydown(itemId, e);
                        });
                    }

                    // Touch events for mobile
                    if (this.touchDevice) {
                        menuLink.addEventListener('touchstart', (e) => {
                            this.handleTouchStart(itemId, e);
                        }, { passive: true });
                    }
                }

                // Submenu events
                if (submenu) {
                    if (!this.touchDevice) {
                        submenu.addEventListener('mouseenter', (e) => {
                            this.handleSubmenuEnter(itemId, e);
                        });
                        
                        submenu.addEventListener('mouseleave', (e) => {
                            this.handleSubmenuLeave(itemId, e);
                        });
                    }

                    // Keyboard navigation within submenu
                    if (this.keyboardNavigation) {
                        this.bindSubmenuKeyboardNavigation(itemId, submenu);
                    }
                }
            });
        }

        /**
         * Bind keyboard navigation for submenu items
         */
        bindSubmenuKeyboardNavigation(itemId, submenu) {
            const submenuLinks = submenu.querySelectorAll('li > a');
            
            submenuLinks.forEach((link, index) => {
                link.addEventListener('keydown', (e) => {
                    switch (e.key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            this.focusNextSubmenuItem(submenuLinks, index);
                            break;
                            
                        case 'ArrowUp':
                            e.preventDefault();
                            this.focusPreviousSubmenuItem(submenuLinks, index);
                            break;
                            
                        case 'Escape':
                            e.preventDefault();
                            this.hideSubmenuAccessible(itemId);
                            this.focusMenuItem(itemId);
                            break;
                            
                        case 'Tab':
                            // Allow natural tab navigation but hide submenu
                            this.scheduleHideSubmenu(itemId);
                            break;
                    }
                });
            });
        }

        /**
         * Focus next submenu item
         */
        focusNextSubmenuItem(submenuLinks, currentIndex) {
            const nextIndex = (currentIndex + 1) % submenuLinks.length;
            submenuLinks[nextIndex].focus();
        }

        /**
         * Focus previous submenu item
         */
        focusPreviousSubmenuItem(submenuLinks, currentIndex) {
            const prevIndex = (currentIndex - 1 + submenuLinks.length) % submenuLinks.length;
            submenuLinks[prevIndex].focus();
        }

        /**
         * Focus menu item
         */
        focusMenuItem(itemId) {
            const menuItem = this.menuItems.get(itemId);
            if (menuItem) {
                const menuLink = menuItem.querySelector('.wp-menu-name, .menu-top > a');
                if (menuLink) {
                    menuLink.focus();
                }
            }
        }

        /**
         * Handle menu item mouse enter
         */
        handleMenuItemEnter(itemId, event) {
            if (this.touchDevice) return;
            
            // Cancel any pending hide
            this.cancelHideSubmenu();
            
            // Show submenu if it exists
            if (this.submenus.has(itemId)) {
                this.showSubmenuAccessible(itemId);
            }
        }

        /**
         * Handle menu item mouse leave
         */
        handleMenuItemLeave(itemId, event) {
            if (this.touchDevice) return;
            
            // Schedule hide with delay
            this.scheduleHideSubmenuAccessible(itemId);
        }

        /**
         * Handle submenu mouse enter
         */
        handleSubmenuEnter(itemId, event) {
            if (this.touchDevice) return;
            
            // Cancel any pending hide
            this.cancelHideSubmenu();
        }

        /**
         * Handle submenu mouse leave
         */
        handleSubmenuLeave(itemId, event) {
            if (this.touchDevice) return;
            
            // Schedule hide with delay
            this.scheduleHideSubmenu(itemId);
        }

        /**
         * Handle menu item click
         */
        handleMenuItemClick(itemId, event) {
            const submenu = this.submenus.get(itemId);
            
            // On mobile or when submenu exists, handle click differently
            if (submenu && (this.touchDevice || window.innerWidth <= this.responsiveBreakpoint)) {
                event.preventDefault();
                this.toggleSubmenu(itemId);
            }
        }

        /**
         * Handle menu item keyboard navigation
         */
        handleMenuItemKeydown(itemId, event) {
            const submenu = this.submenus.get(itemId);
            
            switch (event.key) {
                case 'Enter':
                case ' ':
                    if (submenu) {
                        event.preventDefault();
                        this.showSubmenuAccessible(itemId);
                        this.focusFirstSubmenuItem(itemId);
                    }
                    break;
                    
                case 'ArrowRight':
                    if (submenu) {
                        event.preventDefault();
                        this.showSubmenuAccessible(itemId);
                        this.focusFirstSubmenuItem(itemId);
                    }
                    break;
                    
                case 'ArrowDown':
                    if (submenu) {
                        event.preventDefault();
                        this.showSubmenuAccessible(itemId);
                        this.focusFirstSubmenuItem(itemId);
                    } else {
                        // Navigate to next menu item
                        this.focusNextMenuItem(itemId);
                    }
                    break;
                    
                case 'ArrowUp':
                    event.preventDefault();
                    this.focusPreviousMenuItem(itemId);
                    break;
                    
                case 'Escape':
                    if (submenu && this.isSubmenuVisible(itemId)) {
                        event.preventDefault();
                        this.hideSubmenu(itemId);
                    }
                    break;
            }
        }

        /**
         * Handle touch start for mobile devices
         */
        handleTouchStart(itemId, event) {
            const submenu = this.submenus.get(itemId);
            
            if (submenu) {
                // On touch devices, first touch shows submenu, second touch follows link
                if (!this.isSubmenuVisible(itemId)) {
                    event.preventDefault();
                    this.showSubmenu(itemId);
                }
            }
        }

        /**
         * Show submenu
         */
        showSubmenu(itemId) {
            const menuItem = this.menuItems.get(itemId);
            const submenu = this.submenus.get(itemId);
            
            if (!menuItem || !submenu) return;

            // Cancel any pending hide
            this.cancelHideSubmenu();

            // Add visible class
            submenu.classList.add('las-submenu-visible');
            menuItem.classList.add('las-menu-expanded');
            
            // Update accessibility attributes
            const menuLink = menuItem.querySelector('.wp-menu-name, .menu-top > a');
            if (menuLink) {
                menuLink.setAttribute('aria-expanded', 'true');
            }
            submenu.setAttribute('aria-hidden', 'false');
            
            // Enable submenu item tabbing
            const submenuLinks = submenu.querySelectorAll('li > a');
            submenuLinks.forEach(link => {
                link.setAttribute('tabindex', '0');
            });

            // Position submenu
            this.positionSubmenu(itemId);

            // Emit event
            this.emit('menu:submenu-shown', { itemId, menuItem, submenu });
            
            this.log(`Submenu shown for menu item: ${itemId}`, 'debug');
        }

        /**
         * Hide submenu
         */
        hideSubmenu(itemId) {
            const menuItem = this.menuItems.get(itemId);
            const submenu = this.submenus.get(itemId);
            
            if (!menuItem || !submenu) return;

            // Remove visible class
            submenu.classList.remove('las-submenu-visible');
            menuItem.classList.remove('las-menu-expanded');
            
            // Update accessibility attributes
            const menuLink = menuItem.querySelector('.wp-menu-name, .menu-top > a');
            if (menuLink) {
                menuLink.setAttribute('aria-expanded', 'false');
            }
            submenu.setAttribute('aria-hidden', 'true');
            
            // Disable submenu item tabbing
            const submenuLinks = submenu.querySelectorAll('li > a');
            submenuLinks.forEach(link => {
                link.setAttribute('tabindex', '-1');
            });

            // Emit event
            this.emit('menu:submenu-hidden', { itemId, menuItem, submenu });
            
            this.log(`Submenu hidden for menu item: ${itemId}`, 'debug');
        }

        /**
         * Toggle submenu visibility
         */
        toggleSubmenu(itemId) {
            if (this.isSubmenuVisible(itemId)) {
                this.hideSubmenu(itemId);
            } else {
                this.showSubmenu(itemId);
            }
        }

        /**
         * Check if submenu is visible
         */
        isSubmenuVisible(itemId) {
            const submenu = this.submenus.get(itemId);
            return submenu && submenu.classList.contains('las-submenu-visible');
        }

        /**
         * Schedule submenu hide with delay
         */
        scheduleHideSubmenu(itemId) {
            this.cancelHideSubmenu();
            this.hoverTimeout = setTimeout(() => {
                this.hideSubmenu(itemId);
            }, this.hoverDelay);
        }

        /**
         * Schedule submenu hide with delay (accessible version)
         */
        scheduleHideSubmenuAccessible(itemId) {
            this.cancelHideSubmenu();
            this.hoverTimeout = setTimeout(() => {
                this.hideSubmenuAccessible(itemId);
            }, this.hoverDelay);
        }

        /**
         * Cancel scheduled submenu hide
         */
        cancelHideSubmenu() {
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
        }

        /**
         * Focus first submenu item
         */
        focusFirstSubmenuItem(itemId) {
            const submenu = this.submenus.get(itemId);
            if (submenu) {
                const firstLink = submenu.querySelector('li > a');
                if (firstLink) {
                    firstLink.focus();
                }
            }
        }

        /**
         * Focus next menu item
         */
        focusNextMenuItem(itemId) {
            const menuIds = Array.from(this.menuItems.keys());
            const currentIndex = menuIds.indexOf(itemId);
            const nextIndex = (currentIndex + 1) % menuIds.length;
            const nextItemId = menuIds[nextIndex];
            
            this.focusMenuItem(nextItemId);
        }

        /**
         * Focus previous menu item
         */
        focusPreviousMenuItem(itemId) {
            const menuIds = Array.from(this.menuItems.keys());
            const currentIndex = menuIds.indexOf(itemId);
            const prevIndex = (currentIndex - 1 + menuIds.length) % menuIds.length;
            const prevItemId = menuIds[prevIndex];
            
            this.focusMenuItem(prevItemId);
        }

        /**
         * Position submenu optimally
         */
        positionSubmenu(itemId) {
            const menuItem = this.menuItems.get(itemId);
            const submenu = this.submenus.get(itemId);
            
            if (!menuItem || !submenu) return;

            const menuRect = menuItem.getBoundingClientRect();
            const submenuRect = submenu.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Reset positioning
            submenu.style.top = '';
            submenu.style.bottom = '';
            submenu.style.left = '';
            submenu.style.right = '';

            // Calculate optimal position
            const spaceBelow = viewportHeight - menuRect.bottom;
            const spaceAbove = menuRect.top;
            const spaceRight = viewportWidth - menuRect.right;
            const spaceLeft = menuRect.left;

            // Vertical positioning
            if (spaceBelow >= submenuRect.height || spaceBelow >= spaceAbove) {
                submenu.style.top = '0';
            } else {
                submenu.style.bottom = '0';
            }

            // Horizontal positioning (for collapsed menu)
            if (document.body.classList.contains('folded')) {
                if (spaceRight >= submenuRect.width || spaceRight >= spaceLeft) {
                    submenu.style.left = '100%';
                } else {
                    submenu.style.right = '100%';
                }
            }
        }

        /**
         * Initialize submenu positioning system
         */
        initializeSubmenuPositioning() {
            // Add CSS for submenu positioning and transitions
            if (!document.getElementById('las-menu-styles')) {
                const style = document.createElement('style');
                style.id = 'las-menu-styles';
                style.textContent = `
                    /* Menu Manager Styles */
                    .las-submenu-visible {
                        display: block !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                    
                    .wp-submenu {
                        transition: opacity var(--las-ui-transition-normal, 200ms ease), 
                                   visibility var(--las-ui-transition-normal, 200ms ease);
                    }
                    
                    .wp-submenu:not(.las-submenu-visible) {
                        opacity: 0;
                        visibility: hidden;
                    }
                    
                    .las-menu-expanded > .wp-menu-name,
                    .las-menu-expanded > a {
                        background-color: var(--las-ui-primary, #0073aa) !important;
                        color: #ffffff !important;
                    }
                    
                    /* Touch device improvements */
                    .las-touch-device .wp-has-submenu > .wp-menu-name::after,
                    .las-touch-device .wp-has-submenu > a::after {
                        content: "▼";
                        float: right;
                        font-size: 12px;
                        margin-top: 2px;
                        transition: transform var(--las-ui-transition-fast, 150ms ease);
                    }
                    
                    .las-touch-device .las-menu-expanded > .wp-menu-name::after,
                    .las-touch-device .las-menu-expanded > a::after {
                        transform: rotate(180deg);
                    }
                    
                    /* Responsive improvements */
                    @media (max-width: 782px) {
                        .wp-submenu.las-submenu-visible {
                            position: static !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                    }
                    
                    /* High contrast mode */
                    @media (prefers-contrast: high) {
                        .las-menu-expanded > .wp-menu-name,
                        .las-menu-expanded > a {
                            border: 2px solid #000000 !important;
                        }
                    }
                    
                    /* Reduced motion */
                    @media (prefers-reduced-motion: reduce) {
                        .wp-submenu {
                            transition: none !important;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        /**
         * Bind global event listeners
         */
        bindGlobalEvents() {
            // Window resize handler
            window.addEventListener('resize', this.handleWindowResize);
            
            // Click outside to close submenus
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#adminmenu')) {
                    this.hideAllSubmenus();
                }
            });
            
            // Global keyboard navigation
            document.addEventListener('keydown', (e) => {
                this.handleGlobalKeydown(e);
            });
            
            // Orientation change for mobile devices
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.handleOrientationChange();
                }, 100);
            });
            
            // Focus management
            document.addEventListener('focusin', (e) => {
                this.handleFocusIn(e);
            });
            
            document.addEventListener('focusout', (e) => {
                this.handleFocusOut(e);
            });
            
            // Visibility change (tab switching)
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.hideAllSubmenus();
                }
            });
            
            // Media query changes
            this.setupMediaQueryListeners();
        }

        /**
         * Handle global keyboard events
         */
        handleGlobalKeydown(event) {
            switch (event.key) {
                case 'Escape':
                    this.hideAllSubmenus();
                    break;
                    
                case 'Tab':
                    // Handle tab navigation through menu
                    this.handleTabNavigation(event);
                    break;
                    
                case 'F6':
                    // Skip to main content (accessibility)
                    if (event.target.closest('#adminmenu')) {
                        event.preventDefault();
                        this.skipToMainContent();
                    }
                    break;
            }
        }

        /**
         * Handle tab navigation through menu system
         */
        handleTabNavigation(event) {
            const activeElement = document.activeElement;
            const isInMenu = activeElement.closest('#adminmenu');
            
            if (isInMenu) {
                const visibleSubmenus = Array.from(this.submenus.values())
                    .filter(submenu => submenu.classList.contains('las-submenu-visible'));
                
                // If tabbing out of a visible submenu, hide it
                if (visibleSubmenus.length > 0 && !event.shiftKey) {
                    const isInSubmenu = activeElement.closest('.wp-submenu');
                    if (isInSubmenu) {
                        const submenuLinks = isInSubmenu.querySelectorAll('a');
                        const lastLink = submenuLinks[submenuLinks.length - 1];
                        
                        if (activeElement === lastLink) {
                            // Tabbing out of last submenu item
                            setTimeout(() => {
                                if (!document.activeElement.closest('#adminmenu')) {
                                    this.hideAllSubmenus();
                                }
                            }, 0);
                        }
                    }
                }
            }
        }

        /**
         * Skip to main content for accessibility
         */
        skipToMainContent() {
            const mainContent = document.querySelector('#wpcontent, main, [role="main"]');
            if (mainContent) {
                mainContent.focus();
                mainContent.scrollIntoView({ behavior: 'smooth' });
                this.log('Skipped to main content', 'info');
            }
        }

        /**
         * Handle orientation change on mobile devices
         */
        handleOrientationChange() {
            // Hide all submenus on orientation change
            this.hideAllSubmenus();
            
            // Reposition any that might be shown again
            setTimeout(() => {
                this.submenus.forEach((submenu, itemId) => {
                    if (this.isSubmenuVisible(itemId)) {
                        this.positionSubmenu(itemId);
                    }
                });
            }, 200);
            
            this.log('Orientation changed, repositioned submenus', 'info');
        }

        /**
         * Handle focus entering menu system
         */
        handleFocusIn(event) {
            const target = event.target;
            const menuItem = target.closest('#adminmenu .menu-top');
            
            if (menuItem && this.menuItems.has(menuItem.id)) {
                // Add keyboard navigation indicator
                document.body.classList.add('las-keyboard-navigation');
                
                // Emit focus event
                this.emit('menu:focus-in', { 
                    itemId: menuItem.id, 
                    target: target 
                });
            }
        }

        /**
         * Handle focus leaving menu system
         */
        handleFocusOut(event) {
            const target = event.target;
            const relatedTarget = event.relatedTarget;
            
            // Check if focus is moving completely out of menu
            if (target.closest('#adminmenu') && !relatedTarget?.closest('#adminmenu')) {
                // Remove keyboard navigation indicator after a delay
                setTimeout(() => {
                    if (!document.activeElement?.closest('#adminmenu')) {
                        document.body.classList.remove('las-keyboard-navigation');
                        this.hideAllSubmenus();
                    }
                }, 100);
                
                this.emit('menu:focus-out', { 
                    target: target,
                    relatedTarget: relatedTarget 
                });
            }
        }

        /**
         * Setup media query listeners for responsive behavior
         */
        setupMediaQueryListeners() {
            // Mobile breakpoint
            const mobileQuery = window.matchMedia('(max-width: 782px)');
            mobileQuery.addListener((e) => {
                this.handleMediaQueryChange('mobile', e.matches);
            });
            
            // Tablet breakpoint
            const tabletQuery = window.matchMedia('(max-width: 1024px)');
            tabletQuery.addListener((e) => {
                this.handleMediaQueryChange('tablet', e.matches);
            });
            
            // High contrast preference
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            highContrastQuery.addListener((e) => {
                this.handleMediaQueryChange('highContrast', e.matches);
            });
            
            // Reduced motion preference
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            reducedMotionQuery.addListener((e) => {
                this.handleMediaQueryChange('reducedMotion', e.matches);
            });
            
            // Dark mode preference
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addListener((e) => {
                this.handleMediaQueryChange('darkMode', e.matches);
            });
            
            // Initial check
            this.handleMediaQueryChange('mobile', mobileQuery.matches);
            this.handleMediaQueryChange('tablet', tabletQuery.matches);
            this.handleMediaQueryChange('highContrast', highContrastQuery.matches);
            this.handleMediaQueryChange('reducedMotion', reducedMotionQuery.matches);
            this.handleMediaQueryChange('darkMode', darkModeQuery.matches);
        }

        /**
         * Handle media query changes
         */
        handleMediaQueryChange(queryType, matches) {
            switch (queryType) {
                case 'mobile':
                    document.body.classList.toggle('las-mobile-menu', matches);
                    if (matches) {
                        this.hideAllSubmenus();
                        this.hoverDelay = 0; // Immediate response on mobile
                    } else {
                        this.hoverDelay = 300; // Restore hover delay
                    }
                    break;
                    
                case 'tablet':
                    document.body.classList.toggle('las-tablet-menu', matches);
                    break;
                    
                case 'highContrast':
                    document.body.classList.toggle('las-high-contrast', matches);
                    if (matches) {
                        this.enhanceContrastMode();
                    }
                    break;
                    
                case 'reducedMotion':
                    document.body.classList.toggle('las-reduced-motion', matches);
                    if (matches) {
                        this.disableAnimations();
                    }
                    break;
                    
                case 'darkMode':
                    document.body.classList.toggle('las-dark-mode', matches);
                    break;
            }
            
            this.emit('menu:media-query-changed', { queryType, matches });
            this.log(`Media query changed: ${queryType} = ${matches}`, 'info');
        }

        /**
         * Enhance contrast mode for accessibility
         */
        enhanceContrastMode() {
            // Add high contrast enhancements
            this.menuItems.forEach((item, itemId) => {
                const menuLink = item.querySelector('.wp-menu-name, .menu-top > a');
                if (menuLink) {
                    menuLink.style.setProperty('--focus-outline-width', '3px');
                }
            });
            
            this.log('High contrast mode enhancements applied', 'info');
        }

        /**
         * Disable animations for reduced motion preference
         */
        disableAnimations() {
            // Override transition durations
            this.submenus.forEach(submenu => {
                submenu.style.transition = 'none';
            });
            
            this.log('Animations disabled for reduced motion', 'info');
        }

        /**
         * Enhanced responsive positioning for mobile and tablet
         */
        positionSubmenuResponsive(itemId) {
            const menuItem = this.menuItems.get(itemId);
            const submenu = this.submenus.get(itemId);
            
            if (!menuItem || !submenu) return;

            const isMobile = window.innerWidth <= 782;
            const isTablet = window.innerWidth <= 1024;
            const isFolded = document.body.classList.contains('folded');

            if (isMobile) {
                // Mobile: submenu appears below menu item
                submenu.style.position = 'static';
                submenu.style.left = 'auto';
                submenu.style.top = 'auto';
                submenu.style.width = '100%';
                submenu.style.boxShadow = 'none';
                submenu.style.border = 'none';
                submenu.style.marginLeft = '12px';
                
            } else if (isTablet) {
                // Tablet: similar to desktop but with adjustments
                submenu.style.position = 'absolute';
                submenu.style.left = isFolded ? '36px' : '160px';
                submenu.style.top = '0';
                submenu.style.width = 'auto';
                submenu.style.minWidth = '180px';
                submenu.style.maxWidth = '250px';
                
            } else {
                // Desktop: full positioning logic
                this.positionSubmenu(itemId);
            }
        }

        /**
         * Add ARIA live region for screen reader announcements
         */
        setupAriaLiveRegion() {
            if (!document.getElementById('las-menu-announcements')) {
                const liveRegion = document.createElement('div');
                liveRegion.id = 'las-menu-announcements';
                liveRegion.setAttribute('aria-live', 'polite');
                liveRegion.setAttribute('aria-atomic', 'true');
                liveRegion.className = 'las-sr-only';
                document.body.appendChild(liveRegion);
            }
        }

        /**
         * Announce menu changes to screen readers
         */
        announceToScreenReader(message) {
            const liveRegion = document.getElementById('las-menu-announcements');
            if (liveRegion) {
                liveRegion.textContent = message;
                
                // Clear after announcement
                setTimeout(() => {
                    liveRegion.textContent = '';
                }, 1000);
            }
        }

        /**
         * Enhanced show submenu with accessibility announcements
         */
        showSubmenuAccessible(itemId) {
            const menuItem = this.menuItems.get(itemId);
            const submenu = this.submenus.get(itemId);
            
            if (!menuItem || !submenu) return;

            // Show submenu with original logic
            this.showSubmenu(itemId);
            
            // Announce to screen readers
            const menuText = menuItem.querySelector('.wp-menu-name')?.textContent?.trim() || 'Menu';
            const submenuCount = submenu.querySelectorAll('li').length;
            this.announceToScreenReader(`${menuText} submenu expanded, ${submenuCount} items`);
            
            // Enhanced positioning for responsive
            this.positionSubmenuResponsive(itemId);
        }

        /**
         * Enhanced hide submenu with accessibility announcements
         */
        hideSubmenuAccessible(itemId) {
            const menuItem = this.menuItems.get(itemId);
            
            if (!menuItem) return;

            // Hide submenu with original logic
            this.hideSubmenu(itemId);
            
            // Announce to screen readers
            const menuText = menuItem.querySelector('.wp-menu-name')?.textContent?.trim() || 'Menu';
            this.announceToScreenReader(`${menuText} submenu collapsed`);
        }

        /**
         * Add touch gesture support
         */
        setupTouchGestures() {
            if (!this.touchDevice) return;

            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;

            this.menuItems.forEach((item, itemId) => {
                const menuLink = item.querySelector('.wp-menu-name, .menu-top > a');
                if (!menuLink) return;

                menuLink.addEventListener('touchstart', (e) => {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                }, { passive: true });

                menuLink.addEventListener('touchend', (e) => {
                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;
                    const touchEndTime = Date.now();
                    
                    const deltaX = touchEndX - touchStartX;
                    const deltaY = touchEndY - touchStartY;
                    const deltaTime = touchEndTime - touchStartTime;
                    
                    // Detect swipe gestures
                    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30 && deltaTime < 300) {
                        if (deltaX > 0) {
                            // Swipe right - show submenu
                            if (this.submenus.has(itemId)) {
                                this.showSubmenuAccessible(itemId);
                            }
                        } else {
                            // Swipe left - hide submenu
                            this.hideSubmenuAccessible(itemId);
                        }
                    }
                }, { passive: true });
            });
        }

        /**
         * Add voice control support
         */
        setupVoiceControl() {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const command = event.results[0][0].transcript.toLowerCase();
                this.handleVoiceCommand(command);
            };

            // Activate voice control with Ctrl+Shift+V
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                    e.preventDefault();
                    recognition.start();
                    this.announceToScreenReader('Voice control activated. Say a menu name to navigate.');
                }
            });
        }

        /**
         * Handle voice commands
         */
        handleVoiceCommand(command) {
            // Simple command matching
            const menuMappings = {
                'dashboard': 'menu-dashboard',
                'posts': 'menu-posts',
                'media': 'menu-media',
                'pages': 'menu-pages',
                'comments': 'menu-comments',
                'appearance': 'menu-appearance',
                'plugins': 'menu-plugins',
                'users': 'menu-users',
                'tools': 'menu-tools',
                'settings': 'menu-settings'
            };

            for (const [keyword, menuId] of Object.entries(menuMappings)) {
                if (command.includes(keyword)) {
                    const menuItem = this.menuItems.get(menuId);
                    if (menuItem) {
                        const menuLink = menuItem.querySelector('.wp-menu-name, .menu-top > a');
                        if (menuLink) {
                            menuLink.focus();
                            if (this.submenus.has(menuId)) {
                                this.showSubmenuAccessible(menuId);
                            }
                            this.announceToScreenReader(`Navigated to ${keyword} menu`);
                            return;
                        }
                    }
                }
            }

            this.announceToScreenReader('Menu not found. Try saying dashboard, posts, media, pages, comments, appearance, plugins, users, tools, or settings.');
        }

        /**
         * Handle window resize
         */
        handleWindowResize() {
            // Reposition visible submenus
            this.submenus.forEach((submenu, itemId) => {
                if (this.isSubmenuVisible(itemId)) {
                    this.positionSubmenu(itemId);
                }
            });
        }

        /**
         * Hide all visible submenus
         */
        hideAllSubmenus() {
            this.submenus.forEach((submenu, itemId) => {
                if (this.isSubmenuVisible(itemId)) {
                    this.hideSubmenu(itemId);
                }
            });
        }

        /**
         * Get menu manager status
         */
        getStatus() {
            return {
                initialized: this.initialized,
                menuItems: this.menuItems.size,
                submenus: this.submenus.size,
                touchDevice: this.touchDevice,
                keyboardNavigation: this.keyboardNavigation
            };
        }

        /**
         * Destroy the menu manager
         */
        destroy() {
            try {
                // Remove event listeners
                window.removeEventListener('resize', this.handleWindowResize);
                
                // Clear timeouts
                this.cancelHideSubmenu();
                
                // Remove menu event listeners
                this.menuItems.forEach((item, itemId) => {
                    const menuLink = item.querySelector('.wp-menu-name, .menu-top > a');
                    if (menuLink) {
                        menuLink.removeEventListener('mouseenter', this.handleMenuItemEnter);
                        menuLink.removeEventListener('click', this.handleMenuItemClick);
                        menuLink.removeEventListener('keydown', this.handleMenuItemKeydown);
                        menuLink.removeEventListener('touchstart', this.handleTouchStart);
                    }
                    
                    item.removeEventListener('mouseleave', this.handleMenuItemLeave);
                });
                
                // Remove submenu event listeners
                this.submenus.forEach((submenu, itemId) => {
                    submenu.removeEventListener('mouseenter', this.handleSubmenuEnter);
                    submenu.removeEventListener('mouseleave', this.handleSubmenuLeave);
                });
                
                // Hide all submenus
                this.hideAllSubmenus();
                
                // Remove custom styles
                const customStyles = document.getElementById('las-menu-styles');
                if (customStyles) {
                    customStyles.remove();
                }
                
                // Clear maps
                this.menuItems.clear();
                this.submenus.clear();
                
                super.destroy();
                
            } catch (error) {
                this.log(`Error destroying Menu Manager: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Form Manager - Handles form controls, validation, and user interactions
     */
    class LASFormManager extends LASUIComponent {
        constructor(core) {
            super(core);
            this.controls = new Map();
            this.validators = new Map();
            this.debounceTimers = new Map();
            this.changeHandlers = new Map();
            this.validationRules = new Map();
            this.initialized = false;
            
            // Configuration
            this.config = {
                debounceDelay: 300,
                validationDelay: 500,
                colorPickerOptions: {
                    defaultColor: false,
                    change: null,
                    clear: null,
                    hide: true,
                    palettes: true
                },
                sliderOptions: {
                    animate: true,
                    range: false,
                    step: 1
                }
            };
            
            // Bind methods
            this.handleControlChange = this.handleControlChange.bind(this);
            this.handleFormSubmit = this.handleFormSubmit.bind(this);
            this.handleControlFocus = this.handleControlFocus.bind(this);
            this.handleControlBlur = this.handleControlBlur.bind(this);
        }

        async init() {
            try {
                this.log('Initializing Form Manager...', 'info');
                
                // Discover form controls
                this.discoverFormControls();
                
                // Initialize control types
                await this.initializeControlTypes();
                
                // Bind form events
                this.bindFormEvents();
                
                // Setup validation system
                this.setupValidationSystem();
                
                // Restore form state
                await this.restoreFormState();
                
                this.initialized = true;
                this.log('Form Manager initialized successfully', 'success');
                
            } catch (error) {
                this.log(`Form Manager initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }

        /**
         * Discover all form controls in the interface
         */
        discoverFormControls() {
            const selectors = [
                'input[type="color"]',
                'input[type="range"]', 
                'input[type="text"]',
                'input[type="number"]',
                'input[type="email"]',
                'input[type="url"]',
                'input[type="password"]',
                'input[type="checkbox"]',
                'input[type="radio"]',
                'select',
                'textarea',
                '.las-color-picker',
                '.las-slider',
                '.las-toggle',
                '.wp-color-picker',
                '.color-picker'
            ];
            
            const container = document.querySelector('.las-fresh-settings-wrap, .las-settings-wrap') || document;
            
            selectors.forEach(selector => {
                const elements = container.querySelectorAll(selector);
                elements.forEach(element => {
                    this.registerControl(element);
                });
            });
            
            this.log(`Discovered ${this.controls.size} form controls`, 'info');
        }

        /**
         * Register a single form control
         */
        registerControl(element) {
            if (!element || element.hasAttribute('data-las-registered')) {
                return false;
            }
            
            const controlId = this.generateControlId(element);
            const controlType = this.getControlType(element);
            const controlValue = this.getControlValue(element);
            
            const control = {
                id: controlId,
                element: element,
                type: controlType,
                value: controlValue,
                name: element.name || element.id || controlId,
                required: element.hasAttribute('required'),
                disabled: element.disabled,
                readonly: element.readOnly,
                validation: {
                    valid: true,
                    errors: [],
                    lastValidated: null
                }
            };
            
            this.controls.set(controlId, control);
            element.setAttribute('data-las-registered', 'true');
            element.setAttribute('data-las-control-id', controlId);
            
            this.log(`Registered ${controlType} control: ${controlId}`, 'debug');
            return control;
        }

        /**
         * Generate unique control ID
         */
        generateControlId(element) {
            if (element.id) {
                return element.id;
            }
            if (element.name) {
                return element.name;
            }
            return `las-control-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Determine control type from element
         */
        getControlType(element) {
            // Check for specific classes first
            if (element.classList.contains('las-color-picker') || 
                element.classList.contains('wp-color-picker') ||
                element.classList.contains('color-picker')) {
                return 'color';
            }
            
            if (element.classList.contains('las-slider')) {
                return 'slider';
            }
            
            if (element.classList.contains('las-toggle')) {
                return 'toggle';
            }
            
            // Check input types
            if (element.type) {
                switch (element.type) {
                    case 'color':
                        return 'color';
                    case 'range':
                        return 'slider';
                    case 'checkbox':
                        return 'checkbox';
                    case 'radio':
                        return 'radio';
                    case 'number':
                        return 'number';
                    case 'email':
                        return 'email';
                    case 'url':
                        return 'url';
                    case 'password':
                        return 'password';
                    case 'text':
                    default:
                        return 'text';
                }
            }
            
            // Check tag names
            if (element.tagName === 'SELECT') {
                return 'select';
            }
            
            if (element.tagName === 'TEXTAREA') {
                return 'textarea';
            }
            
            return 'text';
        }

        /**
         * Get current control value
         */
        getControlValue(element) {
            if (element.type === 'checkbox' || element.type === 'radio') {
                return element.checked;
            }
            
            if (element.tagName === 'SELECT' && element.multiple) {
                return Array.from(element.selectedOptions).map(option => option.value);
            }
            
            return element.value;
        }

        /**
         * Initialize different control types
         */
        async initializeControlTypes() {
            const initPromises = [];
            
            // Group controls by type for efficient initialization
            const controlsByType = new Map();
            this.controls.forEach(control => {
                if (!controlsByType.has(control.type)) {
                    controlsByType.set(control.type, []);
                }
                controlsByType.get(control.type).push(control);
            });
            
            // Initialize each type
            for (const [type, controls] of controlsByType) {
                switch (type) {
                    case 'color':
                        initPromises.push(this.initializeColorPickers(controls));
                        break;
                    case 'slider':
                        initPromises.push(this.initializeSliders(controls));
                        break;
                    case 'text':
                    case 'number':
                    case 'email':
                    case 'url':
                    case 'password':
                    case 'textarea':
                        initPromises.push(this.initializeTextInputs(controls));
                        break;
                    case 'checkbox':
                    case 'radio':
                    case 'toggle':
                        initPromises.push(this.initializeToggles(controls));
                        break;
                    case 'select':
                        initPromises.push(this.initializeDropdowns(controls));
                        break;
                }
            }
            
            await Promise.all(initPromises);
        }

        /**
         * Initialize color picker controls
         */
        async initializeColorPickers(controls) {
            for (const control of controls) {
                try {
                    await this.initializeColorPicker(control);
                } catch (error) {
                    this.log(`Failed to initialize color picker ${control.id}: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Initialize single color picker
         */
        async initializeColorPicker(control) {
            const element = control.element;
            
            // Add wrapper for enhanced styling
            this.wrapColorPicker(control);
            
            // Check if WordPress color picker is available
            if (window.jQuery && jQuery.fn.wpColorPicker) {
                await this.initializeWPColorPicker(control);
            } else {
                await this.initializeNativeColorPicker(control);
            }
        }

        /**
         * Wrap color picker for enhanced styling
         */
        wrapColorPicker(control) {
            const element = control.element;
            
            if (!element.parentNode.classList.contains('las-color-picker-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'las-color-picker-wrapper';
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
            }
            
            // Add CSS class for styling
            element.classList.add('las-color-picker', 'las-form-control');
        }

        /**
         * Initialize WordPress color picker
         */
        async initializeWPColorPicker(control) {
            const element = control.element;
            
            try {
                const options = {
                    ...this.config.colorPickerOptions,
                    change: (event, ui) => {
                        const color = ui.color.toString();
                        this.handleControlChange(control.id, color, { 
                            source: 'wp-colorpicker',
                            ui: ui 
                        });
                        this.updateColorPreview(control, color);
                    },
                    clear: () => {
                        this.handleControlChange(control.id, '', { 
                            source: 'wp-colorpicker-clear' 
                        });
                        this.updateColorPreview(control, '');
                    },
                    create: () => {
                        this.enhanceWPColorPicker(control);
                    }
                };
                
                jQuery(element).wpColorPicker(options);
                
                // Store reference to jQuery UI widget
                control.wpColorPicker = jQuery(element).wpColorPicker('widget');
                
                this.log(`WordPress color picker initialized for ${control.id}`, 'debug');
                
            } catch (error) {
                this.log(`WordPress color picker failed for ${control.id}, falling back to native`, 'warn');
                await this.initializeNativeColorPicker(control);
            }
        }

        /**
         * Enhance WordPress color picker with additional features
         */
        enhanceWPColorPicker(control) {
            const widget = control.wpColorPicker;
            if (!widget) return;
            
            // Add keyboard support
            const colorResult = widget.find('.wp-color-result');
            colorResult.on('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    colorResult.click();
                }
            });
            
            // Add ARIA attributes
            colorResult.attr({
                'role': 'button',
                'aria-label': `Color picker for ${control.name || control.id}`,
                'aria-expanded': 'false'
            });
            
            // Update ARIA state when picker opens/closes
            widget.on('click', '.wp-color-result', function() {
                const expanded = jQuery(this).attr('aria-expanded') === 'true';
                jQuery(this).attr('aria-expanded', !expanded);
            });
        }

        /**
         * Initialize native color picker fallback
         */
        async initializeNativeColorPicker(control) {
            const element = control.element;
            
            // Ensure it's a color input
            element.type = 'color';
            
            // Add event listeners
            element.addEventListener('change', (e) => {
                this.handleControlChange(control.id, e.target.value, { source: 'native' });
                this.updateColorPreview(control, e.target.value);
            });
            
            element.addEventListener('input', (e) => {
                this.handleControlChange(control.id, e.target.value, { 
                    source: 'native',
                    skipSave: true 
                });
                this.updateColorPreview(control, e.target.value);
            });
            
            // Add keyboard support
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    element.click();
                }
            });
            
            // Create color preview if needed
            this.createColorPreview(control);
            
            this.log(`Native color picker initialized for ${control.id}`, 'debug');
        }

        /**
         * Create color preview element
         */
        createColorPreview(control) {
            const wrapper = control.element.closest('.las-color-picker-wrapper');
            if (!wrapper || wrapper.querySelector('.las-color-preview')) return;
            
            const preview = document.createElement('div');
            preview.className = 'las-color-preview';
            preview.style.cssText = `
                width: 24px;
                height: 24px;
                border: 1px solid var(--las-ui-border);
                border-radius: var(--las-ui-radius-sm);
                margin-left: 8px;
                display: inline-block;
                vertical-align: middle;
                background-color: ${control.value || '#ffffff'};
            `;
            
            wrapper.appendChild(preview);
            control.colorPreview = preview;
        }

        /**
         * Update color preview
         */
        updateColorPreview(control, color) {
            if (control.colorPreview) {
                control.colorPreview.style.backgroundColor = color || 'transparent';
            }
        }

        /**
         * Initialize slider controls
         */
        async initializeSliders(controls) {
            for (const control of controls) {
                try {
                    await this.initializeSlider(control);
                } catch (error) {
                    this.log(`Failed to initialize slider ${control.id}: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Initialize single slider
         */
        async initializeSlider(control) {
            const element = control.element;
            
            // Wrap slider for enhanced styling
            this.wrapSlider(control);
            
            // Check if jQuery UI slider is available
            if (window.jQuery && jQuery.fn.slider) {
                await this.initializeJQueryUISlider(control);
            } else {
                await this.initializeNativeSlider(control);
            }
        }

        /**
         * Wrap slider for enhanced styling
         */
        wrapSlider(control) {
            const element = control.element;
            
            if (!element.parentNode.classList.contains('las-slider-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'las-slider-wrapper';
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
            }
        }

        /**
         * Initialize jQuery UI slider
         */
        async initializeJQueryUISlider(control) {
            const element = control.element;
            
            try {
                const min = parseFloat(element.min) || 0;
                const max = parseFloat(element.max) || 100;
                const step = parseFloat(element.step) || 1;
                const value = parseFloat(element.value) || min;
                
                // Create slider container
                let sliderContainer = element.nextElementSibling;
                if (!sliderContainer || !sliderContainer.classList.contains('las-slider-ui')) {
                    sliderContainer = document.createElement('div');
                    sliderContainer.className = 'las-slider-ui';
                    element.parentNode.insertBefore(sliderContainer, element.nextSibling);
                }
                
                // Initialize jQuery UI slider
                const sliderOptions = {
                    ...this.config.sliderOptions,
                    min: min,
                    max: max,
                    step: step,
                    value: value,
                    slide: (event, ui) => {
                        element.value = ui.value;
                        this.updateSliderDisplay(control, ui.value);
                        this.handleControlChange(control.id, ui.value, { 
                            source: 'jquery-slider',
                            skipSave: true,
                            ui: ui
                        });
                    },
                    change: (event, ui) => {
                        element.value = ui.value;
                        this.updateSliderDisplay(control, ui.value);
                        this.handleControlChange(control.id, ui.value, { 
                            source: 'jquery-slider',
                            ui: ui 
                        });
                    },
                    create: () => {
                        this.enhanceJQueryUISlider(control, sliderContainer);
                    }
                };
                
                jQuery(sliderContainer).slider(sliderOptions);
                
                // Store reference to jQuery UI widget
                control.jquerySlider = jQuery(sliderContainer);
                
                // Hide original input and add value display
                element.style.display = 'none';
                this.createSliderDisplay(control, sliderContainer);
                
                this.log(`jQuery UI slider initialized for ${control.id}`, 'debug');
                
            } catch (error) {
                this.log(`jQuery UI slider failed for ${control.id}, falling back to native`, 'warn');
                await this.initializeNativeSlider(control);
            }
        }

        /**
         * Enhance jQuery UI slider with additional features
         */
        enhanceJQueryUISlider(control, container) {
            const handle = container.querySelector('.ui-slider-handle');
            if (!handle) return;
            
            // Add ARIA attributes
            handle.setAttribute('role', 'slider');
            handle.setAttribute('aria-label', `Slider for ${control.name || control.id}`);
            handle.setAttribute('aria-valuemin', control.element.min || '0');
            handle.setAttribute('aria-valuemax', control.element.max || '100');
            handle.setAttribute('aria-valuenow', control.element.value);
            
            // Add keyboard support
            handle.addEventListener('keydown', (e) => {
                const step = parseFloat(control.element.step) || 1;
                const min = parseFloat(control.element.min) || 0;
                const max = parseFloat(control.element.max) || 100;
                let currentValue = parseFloat(control.element.value);
                let newValue = currentValue;
                
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'ArrowDown':
                        newValue = Math.max(min, currentValue - step);
                        break;
                    case 'ArrowRight':
                    case 'ArrowUp':
                        newValue = Math.min(max, currentValue + step);
                        break;
                    case 'Home':
                        newValue = min;
                        break;
                    case 'End':
                        newValue = max;
                        break;
                    case 'PageDown':
                        newValue = Math.max(min, currentValue - (step * 10));
                        break;
                    case 'PageUp':
                        newValue = Math.min(max, currentValue + (step * 10));
                        break;
                    default:
                        return;
                }
                
                e.preventDefault();
                
                if (newValue !== currentValue) {
                    control.jquerySlider.slider('value', newValue);
                    handle.setAttribute('aria-valuenow', newValue);
                }
            });
            
            // Update ARIA value on change
            container.addEventListener('slide', () => {
                handle.setAttribute('aria-valuenow', control.element.value);
            });
        }

        /**
         * Initialize native range slider fallback
         */
        async initializeNativeSlider(control) {
            const element = control.element;
            
            // Ensure it's a range input
            element.type = 'range';
            element.classList.add('las-slider-fallback', 'las-form-control');
            
            // Add event listeners
            element.addEventListener('input', (e) => {
                this.updateSliderDisplay(control, e.target.value);
                this.handleControlChange(control.id, e.target.value, { 
                    source: 'native-slider',
                    skipSave: true 
                });
            });
            
            element.addEventListener('change', (e) => {
                this.updateSliderDisplay(control, e.target.value);
                this.handleControlChange(control.id, e.target.value, { 
                    source: 'native-slider' 
                });
            });
            
            // Add ARIA attributes
            element.setAttribute('role', 'slider');
            element.setAttribute('aria-label', `Slider for ${control.name || control.id}`);
            
            // Create value display
            this.createSliderDisplay(control, element.parentNode);
            
            this.log(`Native range slider initialized for ${control.id}`, 'debug');
        }

        /**
         * Create slider value display
         */
        createSliderDisplay(control, container) {
            const display = document.createElement('div');
            display.className = 'las-slider-display';
            display.textContent = control.element.value;
            container.appendChild(display);
            
            control.sliderDisplay = display;
        }

        /**
         * Update slider display value
         */
        updateSliderDisplay(control, value) {
            if (control.sliderDisplay) {
                control.sliderDisplay.textContent = value;
            }
        }

        /**
         * Initialize text input controls
         */
        async initializeTextInputs(controls) {
            for (const control of controls) {
                try {
                    await this.initializeTextInput(control);
                } catch (error) {
                    this.log(`Failed to initialize text input ${control.id}: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Initialize single text input
         */
        async initializeTextInput(control) {
            const element = control.element;
            
            // Add CSS classes for styling
            element.classList.add('las-form-control');
            
            // Wrap in form group if not already wrapped
            this.wrapFormControl(control);
            
            // Input event with debouncing
            element.addEventListener('input', (e) => {
                this.clearValidationDisplay(control);
                this.debouncedChange(control.id, e.target.value, { 
                    source: 'input',
                    skipSave: true 
                });
            });
            
            // Change event for immediate save
            element.addEventListener('change', (e) => {
                this.clearDebounce(control.id);
                this.handleControlChange(control.id, e.target.value, { source: 'change' });
            });
            
            // Blur event for validation
            element.addEventListener('blur', (e) => {
                this.clearDebounce(control.id);
                this.handleControlChange(control.id, e.target.value, { source: 'blur' });
                setTimeout(() => this.validateControl(control.id), 100);
            });
            
            // Focus event
            element.addEventListener('focus', (e) => {
                this.handleControlFocus(control.id);
            });
            
            // Paste event
            element.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.handleControlChange(control.id, e.target.value, { source: 'paste' });
                }, 0);
            });
            
            // Add input type specific enhancements
            this.enhanceTextInput(control);
            
            this.log(`Text input initialized for ${control.id}`, 'debug');
        }

        /**
         * Wrap form control in form group
         */
        wrapFormControl(control) {
            const element = control.element;
            
            if (!element.closest('.las-form-group')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'las-form-group';
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
                
                // Move label if it exists
                const label = document.querySelector(`label[for="${element.id}"]`);
                if (label && !wrapper.contains(label)) {
                    wrapper.insertBefore(label, element);
                }
            }
        }

        /**
         * Enhance text input with type-specific features
         */
        enhanceTextInput(control) {
            const element = control.element;
            
            switch (control.type) {
                case 'email':
                    this.enhanceEmailInput(control);
                    break;
                case 'url':
                    this.enhanceUrlInput(control);
                    break;
                case 'number':
                    this.enhanceNumberInput(control);
                    break;
                case 'password':
                    this.enhancePasswordInput(control);
                    break;
            }
        }

        /**
         * Enhance email input
         */
        enhanceEmailInput(control) {
            const element = control.element;
            
            // Add email validation pattern
            if (!element.pattern) {
                element.pattern = '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';
            }
            
            // Add placeholder if not set
            if (!element.placeholder) {
                element.placeholder = 'example@domain.com';
            }
            
            // Add autocomplete
            element.autocomplete = 'email';
        }

        /**
         * Enhance URL input
         */
        enhanceUrlInput(control) {
            const element = control.element;
            
            // Add placeholder if not set
            if (!element.placeholder) {
                element.placeholder = 'https://example.com';
            }
            
            // Add autocomplete
            element.autocomplete = 'url';
        }

        /**
         * Enhance number input
         */
        enhanceNumberInput(control) {
            const element = control.element;
            
            // Prevent non-numeric input
            element.addEventListener('keypress', (e) => {
                const char = String.fromCharCode(e.which);
                const isNumber = /[0-9]/.test(char);
                const isDecimal = char === '.' && element.value.indexOf('.') === -1;
                const isMinus = char === '-' && element.value.length === 0;
                
                if (!isNumber && !isDecimal && !isMinus && e.which !== 8 && e.which !== 0) {
                    e.preventDefault();
                }
            });
            
            // Add step buttons if not present
            this.addNumberStepButtons(control);
        }

        /**
         * Add step buttons to number input
         */
        addNumberStepButtons(control) {
            const element = control.element;
            const wrapper = element.closest('.las-form-group');
            
            if (!wrapper || wrapper.querySelector('.las-number-controls')) return;
            
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'las-number-controls';
            controlsDiv.style.cssText = `
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
            `;
            
            const upButton = document.createElement('button');
            upButton.type = 'button';
            upButton.innerHTML = '▲';
            upButton.style.cssText = `
                border: none;
                background: none;
                font-size: 8px;
                padding: 2px;
                cursor: pointer;
                line-height: 1;
            `;
            
            const downButton = document.createElement('button');
            downButton.type = 'button';
            downButton.innerHTML = '▼';
            downButton.style.cssText = upButton.style.cssText;
            
            upButton.addEventListener('click', () => {
                element.stepUp();
                element.dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            downButton.addEventListener('click', () => {
                element.stepDown();
                element.dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            controlsDiv.appendChild(upButton);
            controlsDiv.appendChild(downButton);
            
            // Make wrapper relative
            wrapper.style.position = 'relative';
            wrapper.appendChild(controlsDiv);
        }

        /**
         * Enhance password input
         */
        enhancePasswordInput(control) {
            const element = control.element;
            
            // Add autocomplete
            element.autocomplete = 'current-password';
            
            // Add show/hide toggle
            this.addPasswordToggle(control);
        }

        /**
         * Add password visibility toggle
         */
        addPasswordToggle(control) {
            const element = control.element;
            const wrapper = element.closest('.las-form-group');
            
            if (!wrapper || wrapper.querySelector('.las-password-toggle')) return;
            
            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'las-password-toggle';
            toggleButton.innerHTML = '👁';
            toggleButton.style.cssText = `
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                border: none;
                background: none;
                cursor: pointer;
                font-size: 14px;
                padding: 4px;
            `;
            
            toggleButton.addEventListener('click', () => {
                if (element.type === 'password') {
                    element.type = 'text';
                    toggleButton.innerHTML = '🙈';
                } else {
                    element.type = 'password';
                    toggleButton.innerHTML = '👁';
                }
            });
            
            // Make wrapper relative
            wrapper.style.position = 'relative';
            wrapper.appendChild(toggleButton);
        }

        /**
         * Clear validation display
         */
        clearValidationDisplay(control) {
            const element = control.element;
            element.classList.remove('las-valid', 'las-invalid');
            
            const errorContainer = element.parentNode.querySelector('.las-validation-error');
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }
        }

        /**
         * Initialize toggle controls (checkboxes, radios)
         */
        async initializeToggles(controls) {
            for (const control of controls) {
                try {
                    await this.initializeToggle(control);
                } catch (error) {
                    this.log(`Failed to initialize toggle ${control.id}: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Initialize single toggle control
         */
        async initializeToggle(control) {
            const element = control.element;
            
            element.addEventListener('change', (e) => {
                const value = element.type === 'checkbox' ? e.target.checked : e.target.value;
                this.handleControlChange(control.id, value, { source: 'toggle' });
            });
            
            element.addEventListener('focus', (e) => {
                this.handleControlFocus(control.id);
            });
            
            element.addEventListener('blur', (e) => {
                this.handleControlBlur(control.id);
            });
            
            this.log(`Toggle control initialized for ${control.id}`, 'debug');
        }

        /**
         * Initialize dropdown controls
         */
        async initializeDropdowns(controls) {
            for (const control of controls) {
                try {
                    await this.initializeDropdown(control);
                } catch (error) {
                    this.log(`Failed to initialize dropdown ${control.id}: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Initialize single dropdown
         */
        async initializeDropdown(control) {
            const element = control.element;
            
            element.addEventListener('change', (e) => {
                const value = element.multiple ? 
                    Array.from(element.selectedOptions).map(option => option.value) :
                    e.target.value;
                    
                this.handleControlChange(control.id, value, { source: 'dropdown' });
            });
            
            element.addEventListener('focus', (e) => {
                this.handleControlFocus(control.id);
            });
            
            element.addEventListener('blur', (e) => {
                this.handleControlBlur(control.id);
            });
            
            this.log(`Dropdown initialized for ${control.id}`, 'debug');
        }

        /**
         * Bind global form events
         */
        bindFormEvents() {
            // Find and bind form submission
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                form.addEventListener('submit', this.handleFormSubmit);
            });
            
            // Bind to specific LAS forms
            const lasForm = document.getElementById('las-fresh-settings-form');
            if (lasForm) {
                lasForm.addEventListener('submit', this.handleFormSubmit);
            }
        }

        /**
         * Setup validation system
         */
        setupValidationSystem() {
            // Default validation rules
            this.addValidationRule('email', (value) => {
                if (!value) return { valid: true };
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return {
                    valid: emailRegex.test(value),
                    message: 'Please enter a valid email address'
                };
            });
            
            this.addValidationRule('url', (value) => {
                if (!value) return { valid: true };
                try {
                    new URL(value);
                    return { valid: true };
                } catch {
                    return {
                        valid: false,
                        message: 'Please enter a valid URL'
                    };
                }
            });
            
            this.addValidationRule('number', (value, control) => {
                if (!value) return { valid: true };
                const num = parseFloat(value);
                if (isNaN(num)) {
                    return {
                        valid: false,
                        message: 'Please enter a valid number'
                    };
                }
                
                const element = control.element;
                if (element.min !== '' && num < parseFloat(element.min)) {
                    return {
                        valid: false,
                        message: `Value must be at least ${element.min}`
                    };
                }
                
                if (element.max !== '' && num > parseFloat(element.max)) {
                    return {
                        valid: false,
                        message: `Value must be at most ${element.max}`
                    };
                }
                
                return { valid: true };
            });
        }

        /**
         * Add validation rule
         */
        addValidationRule(type, validator) {
            this.validationRules.set(type, validator);
        }

        /**
         * Validate a control
         */
        async validateControl(controlId) {
            const control = this.controls.get(controlId);
            if (!control) return false;
            
            const validator = this.validationRules.get(control.type);
            if (!validator) {
                control.validation.valid = true;
                control.validation.errors = [];
                return true;
            }
            
            try {
                const result = await validator(control.value, control);
                control.validation.valid = result.valid;
                control.validation.errors = result.valid ? [] : [result.message];
                control.validation.lastValidated = Date.now();
                
                // Update UI
                this.updateValidationUI(control);
                
                return result.valid;
                
            } catch (error) {
                this.log(`Validation error for ${controlId}: ${error.message}`, 'error');
                control.validation.valid = false;
                control.validation.errors = ['Validation failed'];
                return false;
            }
        }

        /**
         * Update validation UI
         */
        updateValidationUI(control) {
            const element = control.element;
            
            // Remove existing validation classes
            element.classList.remove('las-valid', 'las-invalid');
            
            // Add appropriate class
            if (control.validation.valid) {
                element.classList.add('las-valid');
            } else {
                element.classList.add('las-invalid');
            }
            
            // Update or create error message
            this.updateErrorMessage(control);
        }

        /**
         * Update error message display
         */
        updateErrorMessage(control) {
            const element = control.element;
            let errorContainer = element.parentNode.querySelector('.las-validation-error');
            
            if (control.validation.errors.length > 0) {
                if (!errorContainer) {
                    errorContainer = document.createElement('div');
                    errorContainer.className = 'las-validation-error';
                    element.parentNode.appendChild(errorContainer);
                }
                errorContainer.textContent = control.validation.errors[0];
                errorContainer.style.display = 'block';
            } else if (errorContainer) {
                errorContainer.style.display = 'none';
            }
        }

        /**
         * Restore form state from storage
         */
        async restoreFormState() {
            const stateManager = this.core.get('state');
            if (!stateManager) return;
            
            for (const [controlId, control] of this.controls) {
                try {
                    const savedValue = await stateManager.get(`form.${controlId}`);
                    if (savedValue !== null && savedValue !== undefined) {
                        this.setControlValue(controlId, savedValue, { skipSave: true });
                    }
                } catch (error) {
                    this.log(`Failed to restore state for ${controlId}: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Handle control change with debouncing
         */
        debouncedChange(controlId, value, options = {}) {
            this.clearDebounce(controlId);
            
            const timer = setTimeout(() => {
                this.handleControlChange(controlId, value, options);
            }, this.config.debounceDelay);
            
            this.debounceTimers.set(controlId, timer);
        }

        /**
         * Clear debounce timer
         */
        clearDebounce(controlId) {
            const timer = this.debounceTimers.get(controlId);
            if (timer) {
                clearTimeout(timer);
                this.debounceTimers.delete(controlId);
            }
        }

        /**
         * Handle control value change
         */
        handleControlChange(controlId, value, options = {}) {
            const control = this.controls.get(controlId);
            if (!control) {
                this.log(`Control ${controlId} not found`, 'error');
                return;
            }
            
            // Update control value
            const oldValue = control.value;
            control.value = value;
            
            // Emit change event
            this.emit('form:control-changed', {
                controlId,
                control,
                value,
                oldValue,
                options
            });
            
            // Save to state if not skipped
            if (!options.skipSave) {
                const stateManager = this.core.get('state');
                if (stateManager) {
                    stateManager.set(`form.${controlId}`, value);
                }
            }
            
            // Trigger validation if needed
            if (options.source === 'blur' || options.source === 'change') {
                setTimeout(() => this.validateControl(controlId), this.config.validationDelay);
            }
            
            this.log(`Control ${controlId} changed: ${oldValue} -> ${value}`, 'debug');
        }

        /**
         * Handle control focus
         */
        handleControlFocus(controlId) {
            const control = this.controls.get(controlId);
            if (!control) return;
            
            control.element.classList.add('las-focused');
            
            this.emit('form:control-focused', {
                controlId,
                control
            });
        }

        /**
         * Handle control blur
         */
        handleControlBlur(controlId) {
            const control = this.controls.get(controlId);
            if (!control) return;
            
            control.element.classList.remove('las-focused');
            
            this.emit('form:control-blurred', {
                controlId,
                control
            });
        }

        /**
         * Handle form submission
         */
        handleFormSubmit(event) {
            const form = event.target;
            
            // Add loading state
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                submitButton.classList.add('las-button-loading');
                submitButton.disabled = true;
                
                // Remove loading state after delay
                setTimeout(() => {
                    submitButton.classList.remove('las-button-loading');
                    submitButton.disabled = false;
                }, 2000);
            }
            
            // Emit form submit event
            this.emit('form:submit', { 
                form,
                controls: Array.from(this.controls.values())
            });
            
            this.log('Form submitted', 'info');
        }

        /**
         * Get control by ID
         */
        getControl(controlId) {
            return this.controls.get(controlId);
        }

        /**
         * Get control value
         */
        getControlValue(controlId) {
            const control = this.controls.get(controlId);
            return control ? control.value : null;
        }

        /**
         * Set control value
         */
        setControlValue(controlId, value, options = {}) {
            const control = this.controls.get(controlId);
            if (!control) return false;
            
            const element = control.element;
            
            try {
                if (control.type === 'checkbox' || control.type === 'radio') {
                    element.checked = Boolean(value);
                } else if (control.type === 'select' && element.multiple) {
                    // Handle multiple select
                    Array.from(element.options).forEach(option => {
                        option.selected = Array.isArray(value) && value.includes(option.value);
                    });
                } else {
                    element.value = value;
                }
                
                // Update internal value
                control.value = value;
                
                // Trigger change event if not skipped
                if (!options.skipEvent) {
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                return true;
                
            } catch (error) {
                this.log(`Failed to set value for ${controlId}: ${error.message}`, 'error');
                return false;
            }
        }

        /**
         * Get all form values
         */
        getAllValues() {
            const values = {};
            this.controls.forEach((control, controlId) => {
                values[control.name || controlId] = control.value;
            });
            return values;
        }

        /**
         * Set multiple form values
         */
        setAllValues(values, options = {}) {
            const results = {};
            
            for (const [key, value] of Object.entries(values)) {
                // Try to find control by name or ID
                let control = null;
                for (const [controlId, ctrl] of this.controls) {
                    if (ctrl.name === key || controlId === key) {
                        control = ctrl;
                        break;
                    }
                }
                
                if (control) {
                    results[key] = this.setControlValue(control.id, value, options);
                } else {
                    results[key] = false;
                }
            }
            
            return results;
        }

        /**
         * Validate all controls
         */
        async validateAll() {
            const results = {};
            
            for (const [controlId] of this.controls) {
                results[controlId] = await this.validateControl(controlId);
            }
            
            return results;
        }

        /**
         * Check if all controls are valid
         */
        isValid() {
            for (const [, control] of this.controls) {
                if (!control.validation.valid) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Reset all controls to default values
         */
        reset() {
            this.controls.forEach((control, controlId) => {
                const element = control.element;
                const defaultValue = element.defaultValue || element.getAttribute('data-default') || '';
                
                if (control.type === 'checkbox' || control.type === 'radio') {
                    const defaultChecked = element.defaultChecked || element.hasAttribute('data-default-checked');
                    this.setControlValue(controlId, defaultChecked);
                } else {
                    this.setControlValue(controlId, defaultValue);
                }
            });
            
            this.emit('form:reset');
        }

        /**
         * Destroy the form manager
         */
        destroy() {
            try {
                // Clear all debounce timers
                this.debounceTimers.forEach(timer => clearTimeout(timer));
                this.debounceTimers.clear();
                
                // Remove event listeners from forms
                const forms = document.querySelectorAll('form');
                forms.forEach(form => {
                    form.removeEventListener('submit', this.handleFormSubmit);
                });
                
                // Clear controls
                this.controls.clear();
                this.validators.clear();
                this.changeHandlers.clear();
                this.validationRules.clear();
                
                super.destroy();
                
            } catch (error) {
                this.log(`Error destroying Form Manager: ${error.message}`, 'error');
            }
        }
    }

    // Export classes for global access
    window.LASUICoreManager = LASUICoreManager;
    window.LASUIComponent = LASUIComponent;
    window.LASStateManager = LASStateManager;
    window.LASEventManager = LASEventManager;
    window.LASTabManager = LASTabManager;
    window.LASMenuManager = LASMenuManager;
    window.LASFormManager = LASFormManager;

    // Auto-initialize when DOM is ready
    let coreManager = null;

    function initializeUIRepair() {
        if (coreManager) {
            return coreManager;
        }

        try {
            // Get configuration from WordPress
            const config = window.lasAdminData || {};
            
            // Create and initialize core manager
            coreManager = new LASUICoreManager({
                debug: config.debug || false,
                ...config.uiRepair
            });

            // Initialize asynchronously
            coreManager.init().catch(error => {
                console.error('LAS UI: Failed to initialize UI repair system:', error);
            });

            // Make globally available
            window.lasUICore = coreManager;

            return coreManager;

        } catch (error) {
            console.error('LAS UI: Failed to create UI repair system:', error);
            return null;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUIRepair);
    } else {
        // DOM already ready
        setTimeout(initializeUIRepair, 0);
    }

    /**
     * Error Reporter and Recovery System - Comprehensive error handling and reporting
     */
    class LASErrorReporter extends LASUIComponent {
        constructor(core) {
            super(core);
            this.errorQueue = [];
            this.reportingEnabled = true;
            this.recoveryAttempts = new Map();
            this.errorPatterns = new Map();
            this.recoveryStrategies = new Map();
            this.reportingEndpoint = null;
            
            // Configuration
            this.config = {
                enableErrorReporting: true,
                enableAutoRecovery: true,
                enablePatternDetection: true,
                maxQueueSize: 100,
                maxRecoveryAttempts: 3,
                reportingInterval: 30000, // 30 seconds
                recoveryDelay: 1000,
                batchSize: 10,
                enableUserFeedback: true,
                enableContextCollection: true
            };
            
            // Error classification patterns
            this.initializeErrorPatterns();
            
            // Recovery strategies
            this.initializeRecoveryStrategies();
            
            // Bind methods
            this.processErrorQueue = this.processErrorQueue.bind(this);
            this.handleWindowError = this.handleWindowError.bind(this);
            this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
        }

        async init() {
            try {
                this.log('Initializing Error Reporter and Recovery system...', 'info');
                
                // Setup error reporting endpoint
                this.setupReportingEndpoint();
                
                // Setup global error handlers
                this.setupGlobalErrorHandlers();
                
                // Setup error queue processing
                this.setupQueueProcessing();
                
                // Setup recovery monitoring
                this.setupRecoveryMonitoring();
                
                // Bind to core events
                this.bindCoreEvents();
                
                this.initialized = true;
                this.log('Error Reporter and Recovery system initialized successfully', 'success');
                
            } catch (error) {
                this.log(`Error Reporter initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }

        /**
         * Initialize error patterns for classification
         */
        initializeErrorPatterns() {
            this.errorPatterns.set('network', {
                patterns: [
                    /network/i,
                    /fetch/i,
                    /timeout/i,
                    /connection/i,
                    /offline/i
                ],
                severity: 'medium',
                recoverable: true,
                strategy: 'network_recovery'
            });
            
            this.errorPatterns.set('security', {
                patterns: [
                    /nonce/i,
                    /csrf/i,
                    /unauthorized/i,
                    /forbidden/i,
                    /security/i
                ],
                severity: 'high',
                recoverable: true,
                strategy: 'security_recovery'
            });
            
            this.errorPatterns.set('component', {
                patterns: [
                    /component/i,
                    /initialization/i,
                    /not found/i,
                    /undefined/i
                ],
                severity: 'medium',
                recoverable: true,
                strategy: 'component_recovery'
            });
            
            this.errorPatterns.set('critical', {
                patterns: [
                    /out of memory/i,
                    /stack overflow/i,
                    /maximum call stack/i,
                    /script error/i
                ],
                severity: 'critical',
                recoverable: false,
                strategy: 'critical_recovery'
            });
        }

        /**
         * Initialize recovery strategies
         */
        initializeRecoveryStrategies() {
            this.recoveryStrategies.set('network_recovery', {
                name: 'Network Recovery',
                execute: this.executeNetworkRecovery.bind(this),
                maxAttempts: 3,
                delay: 2000
            });
            
            this.recoveryStrategies.set('security_recovery', {
                name: 'Security Recovery',
                execute: this.executeSecurityRecovery.bind(this),
                maxAttempts: 2,
                delay: 1000
            });
            
            this.recoveryStrategies.set('component_recovery', {
                name: 'Component Recovery',
                execute: this.executeComponentRecovery.bind(this),
                maxAttempts: 3,
                delay: 1500
            });
            
            this.recoveryStrategies.set('critical_recovery', {
                name: 'Critical Recovery',
                execute: this.executeCriticalRecovery.bind(this),
                maxAttempts: 1,
                delay: 0
            });
        }

        /**
         * Setup error reporting endpoint
         */
        setupReportingEndpoint() {
            // Use WordPress AJAX endpoint for error reporting
            this.reportingEndpoint = window.lasComm?.ajaxUrl || '/wp-admin/admin-ajax.php';
        }

        /**
         * Setup global error handlers
         */
        setupGlobalErrorHandlers() {
            // JavaScript errors
            window.addEventListener('error', this.handleWindowError);
            
            // Promise rejections
            window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
            
            // Console error override for capturing logged errors
            this.setupConsoleErrorCapture();
        }

        /**
         * Setup console error capture
         */
        setupConsoleErrorCapture() {
            const originalError = console.error;
            console.error = (...args) => {
                // Call original console.error
                originalError.apply(console, args);
                
                // Capture for reporting
                const errorMessage = args.join(' ');
                this.reportError({
                    type: 'console_error',
                    message: errorMessage,
                    source: 'console',
                    timestamp: Date.now()
                });
            };
        }

        /**
         * Handle window error events
         */
        handleWindowError(event) {
            const errorInfo = {
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            };
            
            this.reportError(errorInfo);
        }

        /**
         * Handle unhandled promise rejections
         */
        handleUnhandledRejection(event) {
            const errorInfo = {
                type: 'promise_rejection',
                message: event.reason?.message || 'Unhandled promise rejection',
                reason: event.reason,
                stack: event.reason?.stack,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            };
            
            this.reportError(errorInfo);
        }

        /**
         * Report an error
         */
        reportError(errorInfo, context = {}) {
            if (!this.reportingEnabled) {
                return;
            }

            try {
                // Enhance error info with context
                const enhancedError = this.enhanceErrorInfo(errorInfo, context);
                
                // Classify error
                const classification = this.classifyError(enhancedError);
                enhancedError.classification = classification;
                
                // Add to queue
                this.addToQueue(enhancedError);
                
                // Attempt recovery if enabled
                if (this.config.enableAutoRecovery && classification.recoverable) {
                    this.attemptRecovery(enhancedError);
                }
                
                // Emit error event
                this.emit('error:reported', { error: enhancedError });
                
                this.log(`Error reported: ${enhancedError.message}`, 'warn');
                
            } catch (reportingError) {
                this.log(`Failed to report error: ${reportingError.message}`, 'error');
            }
        }

        /**
         * Enhance error info with additional context
         */
        enhanceErrorInfo(errorInfo, context) {
            const enhanced = {
                ...errorInfo,
                id: this.generateErrorId(),
                context: {
                    ...context,
                    timestamp: Date.now(),
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    memory: this.getMemoryInfo(),
                    connection: this.getConnectionInfo(),
                    performance: this.getPerformanceInfo()
                }
            };
            
            // Add user context if available
            if (window.lasUser) {
                enhanced.context.user = {
                    id: window.lasUser.id,
                    role: window.lasUser.role
                };
            }
            
            // Add component context
            if (this.core) {
                enhanced.context.components = this.getComponentStatus();
            }
            
            return enhanced;
        }

        /**
         * Classify error based on patterns
         */
        classifyError(errorInfo) {
            const message = errorInfo.message || '';
            const stack = errorInfo.stack || '';
            const searchText = `${message} ${stack}`.toLowerCase();
            
            for (const [type, pattern] of this.errorPatterns) {
                if (pattern.patterns.some(regex => regex.test(searchText))) {
                    return {
                        type,
                        severity: pattern.severity,
                        recoverable: pattern.recoverable,
                        strategy: pattern.strategy
                    };
                }
            }
            
            // Default classification
            return {
                type: 'unknown',
                severity: 'medium',
                recoverable: true,
                strategy: 'component_recovery'
            };
        }

        /**
         * Add error to reporting queue
         */
        addToQueue(errorInfo) {
            // Prevent queue overflow
            if (this.errorQueue.length >= this.config.maxQueueSize) {
                this.errorQueue.shift(); // Remove oldest error
            }
            
            this.errorQueue.push(errorInfo);
        }

        /**
         * Setup queue processing
         */
        setupQueueProcessing() {
            // Process queue periodically
            this.queueProcessor = setInterval(
                this.processErrorQueue,
                this.config.reportingInterval
            );
        }

        /**
         * Process error queue
         */
        async processErrorQueue() {
            if (this.errorQueue.length === 0) {
                return;
            }

            try {
                // Get batch of errors to send
                const batch = this.errorQueue.splice(0, this.config.batchSize);
                
                // Send to server
                await this.sendErrorBatch(batch);
                
                this.log(`Sent ${batch.length} errors to server`, 'info');
                
            } catch (error) {
                this.log(`Failed to process error queue: ${error.message}`, 'error');
                
                // Put errors back in queue if sending failed
                // (but don't retry indefinitely)
            }
        }

        /**
         * Send error batch to server
         */
        async sendErrorBatch(errors) {
            if (!this.reportingEndpoint) {
                throw new Error('No reporting endpoint configured');
            }

            const payload = {
                action: 'las_report_errors',
                errors: errors,
                timestamp: Date.now(),
                session_id: this.getSessionId(),
                _ajax_nonce: window.lasComm?.nonces?.ajax || ''
            };

            const response = await fetch(this.reportingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.data?.message || 'Server error');
            }

            return result.data;
        }

        /**
         * Attempt error recovery
         */
        async attemptRecovery(errorInfo) {
            const classification = errorInfo.classification;
            if (!classification || !classification.recoverable) {
                return;
            }

            const strategy = this.recoveryStrategies.get(classification.strategy);
            if (!strategy) {
                this.log(`No recovery strategy found for: ${classification.strategy}`, 'warn');
                return;
            }

            const errorId = errorInfo.id;
            const attempts = this.recoveryAttempts.get(errorId) || 0;
            
            if (attempts >= strategy.maxAttempts) {
                this.log(`Max recovery attempts reached for error: ${errorId}`, 'warn');
                return;
            }

            try {
                this.log(`Attempting recovery for error: ${errorId} (attempt ${attempts + 1})`, 'info');
                
                // Wait before recovery attempt
                if (strategy.delay > 0) {
                    await this.delay(strategy.delay);
                }
                
                // Execute recovery strategy
                const result = await strategy.execute(errorInfo);
                
                // Update attempt count
                this.recoveryAttempts.set(errorId, attempts + 1);
                
                if (result.success) {
                    this.log(`Recovery successful for error: ${errorId}`, 'success');
                    this.emit('error:recovered', { error: errorInfo, result });
                } else {
                    this.log(`Recovery failed for error: ${errorId} - ${result.message}`, 'warn');
                    
                    // Schedule retry if attempts remaining
                    if (attempts + 1 < strategy.maxAttempts) {
                        setTimeout(() => {
                            this.attemptRecovery(errorInfo);
                        }, strategy.delay * 2); // Exponential backoff
                    }
                }
                
            } catch (recoveryError) {
                this.log(`Recovery strategy failed: ${recoveryError.message}`, 'error');
                this.recoveryAttempts.set(errorId, attempts + 1);
            }
        }

        /**
         * Recovery Strategy Implementations
         */

        /**
         * Execute network recovery
         */
        async executeNetworkRecovery(errorInfo) {
            try {
                // Check network connectivity
                if (!navigator.onLine) {
                    return { success: false, message: 'Network offline' };
                }
                
                // Test connection with a simple request
                const testResponse = await fetch(window.location.origin + '/wp-admin/admin-ajax.php', {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                
                if (testResponse.ok) {
                    // Network is working, refresh any failed requests
                    this.emit('network:recovered');
                    return { success: true, message: 'Network connectivity restored' };
                }
                
                return { success: false, message: 'Network test failed' };
                
            } catch (error) {
                return { success: false, message: `Network recovery failed: ${error.message}` };
            }
        }

        /**
         * Execute security recovery
         */
        async executeSecurityRecovery(errorInfo) {
            try {
                // Attempt to refresh nonce
                const newNonce = await this.refreshNonce();
                
                if (newNonce) {
                    // Update global nonce
                    if (window.lasComm && window.lasComm.nonces) {
                        window.lasComm.nonces.ajax = newNonce;
                        window.lasComm.nonces.rest = newNonce;
                    }
                    
                    this.emit('security:nonce-refreshed', { nonce: newNonce });
                    return { success: true, message: 'Security tokens refreshed' };
                }
                
                return { success: false, message: 'Failed to refresh security tokens' };
                
            } catch (error) {
                return { success: false, message: `Security recovery failed: ${error.message}` };
            }
        }

        /**
         * Execute component recovery
         */
        async executeComponentRecovery(errorInfo) {
            try {
                // Try to reinitialize failed components
                const componentName = this.extractComponentName(errorInfo);
                
                if (componentName && this.core) {
                    const component = this.core.get(componentName);
                    
                    if (component && typeof component.init === 'function') {
                        await component.init();
                        this.emit('component:recovered', { component: componentName });
                        return { success: true, message: `Component ${componentName} recovered` };
                    }
                }
                
                // Fallback: enable graceful degradation
                if (this.core && typeof this.core.enableGracefulDegradation === 'function') {
                    this.core.enableGracefulDegradation();
                    return { success: true, message: 'Graceful degradation enabled' };
                }
                
                return { success: false, message: 'Component recovery not possible' };
                
            } catch (error) {
                return { success: false, message: `Component recovery failed: ${error.message}` };
            }
        }

        /**
         * Execute critical recovery
         */
        async executeCriticalRecovery(errorInfo) {
            try {
                // For critical errors, immediately enable emergency mode
                if (this.core && this.core.gracefulDegradation) {
                    this.core.gracefulDegradation.enableEmergencyMode();
                }
                
                // Show critical error notification
                this.showCriticalErrorNotification(errorInfo);
                
                // Suggest page refresh
                if (confirm('A critical error occurred. Would you like to refresh the page?')) {
                    window.location.reload();
                }
                
                return { success: true, message: 'Critical recovery initiated' };
                
            } catch (error) {
                return { success: false, message: `Critical recovery failed: ${error.message}` };
            }
        }

        /**
         * Setup recovery monitoring
         */
        setupRecoveryMonitoring() {
            // Monitor for successful recoveries
            this.on('error:recovered', (event) => {
                const { error } = event.detail;
                this.log(`Error recovery successful: ${error.id}`, 'success');
                
                // Remove from recovery attempts
                this.recoveryAttempts.delete(error.id);
            });
            
            // Monitor for network recovery
            this.on('network:recovered', () => {
                this.log('Network connectivity recovered', 'success');
                
                // Retry any queued network-related operations
                this.retryNetworkOperations();
            });
        }

        /**
         * Retry network operations after recovery
         */
        retryNetworkOperations() {
            // Emit event for other components to retry their operations
            this.emit('network:retry-operations');
        }

        /**
         * Bind to core events
         */
        bindCoreEvents() {
            // Listen for component errors
            this.on('error:occurred', (event) => {
                const { error } = event.detail;
                this.reportError({
                    type: 'component_error',
                    message: error.message,
                    stack: error.stack,
                    component: event.detail.component
                });
            });
            
            // Listen for component failures
            this.on('component:init-failed', (event) => {
                const { component, error } = event.detail;
                this.reportError({
                    type: 'component_init_failure',
                    message: `Component ${component} failed to initialize: ${error.message}`,
                    stack: error.stack,
                    component: component
                }, { component });
            });
        }

        /**
         * Show critical error notification
         */
        showCriticalErrorNotification(errorInfo) {
            const container = document.querySelector('.las-fresh-settings-wrap') || document.body;
            
            const notification = document.createElement('div');
            notification.className = 'las-error-notification notice notice-error';
            notification.innerHTML = `
                <p><strong>Critical Error Detected:</strong></p>
                <p>${errorInfo.message}</p>
                <p><small>Error ID: ${errorInfo.id}</small></p>
                <button type="button" class="button" onclick="window.location.reload()">Refresh Page</button>
            `;
            
            container.insertBefore(notification, container.firstChild);
        }

        /**
         * Utility Methods
         */

        /**
         * Extract component name from error info
         */
        extractComponentName(errorInfo) {
            const message = errorInfo.message || '';
            const context = errorInfo.context || {};
            
            // Check context first
            if (context.component) {
                return context.component;
            }
            
            // Try to extract from message
            const componentMatch = message.match(/component[:\s]+(\w+)/i);
            if (componentMatch) {
                return componentMatch[1].toLowerCase();
            }
            
            return null;
        }

        /**
         * Refresh WordPress nonce
         */
        async refreshNonce() {
            try {
                const response = await fetch(this.reportingEndpoint, {
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
                    return data.data.nonce;
                }
                
                throw new Error(data.data?.message || 'Nonce refresh failed');
                
            } catch (error) {
                this.log(`Nonce refresh failed: ${error.message}`, 'error');
                return null;
            }
        }

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
                    rtt: navigator.connection.rtt
                };
            }
            return null;
        }

        /**
         * Get performance information
         */
        getPerformanceInfo() {
            if (performance.timing) {
                const timing = performance.timing;
                return {
                    loadTime: timing.loadEventEnd - timing.navigationStart,
                    domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime || null
                };
            }
            return null;
        }

        /**
         * Get component status
         */
        getComponentStatus() {
            if (!this.core || !this.core.components) {
                return null;
            }
            
            const status = {};
            this.core.components.forEach((component, name) => {
                status[name] = {
                    initialized: component.initialized || false,
                    name: component.name || name
                };
            });
            
            return status;
        }

        /**
         * Delay utility
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Enable/disable error reporting
         */
        setReportingEnabled(enabled) {
            this.reportingEnabled = enabled;
            this.log(`Error reporting ${enabled ? 'enabled' : 'disabled'}`, 'info');
        }

        /**
         * Get error statistics
         */
        getErrorStatistics() {
            const stats = {
                queueSize: this.errorQueue.length,
                totalRecoveryAttempts: this.recoveryAttempts.size,
                reportingEnabled: this.reportingEnabled
            };
            
            // Count errors by type
            const errorTypes = {};
            this.errorQueue.forEach(error => {
                const type = error.classification?.type || 'unknown';
                errorTypes[type] = (errorTypes[type] || 0) + 1;
            });
            stats.errorTypes = errorTypes;
            
            return stats;
        }

        /**
         * Destroy error reporter
         */
        destroy() {
            // Remove global error handlers
            window.removeEventListener('error', this.handleWindowError);
            window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
            
            // Clear queue processor
            if (this.queueProcessor) {
                clearInterval(this.queueProcessor);
                this.queueProcessor = null;
            }
            
            // Clear queues and maps
            this.errorQueue.length = 0;
            this.recoveryAttempts.clear();
            this.errorPatterns.clear();
            this.recoveryStrategies.clear();
            
            super.destroy();
        }
    }

    /**
     * Graceful Degradation System - Handles component failures and provides fallbacks
     */
    class LASGracefulDegradation extends LASUIComponent {
        constructor(core) {
            super(core);
            this.enabled = false;
            this.failedComponents = new Set();
            this.fallbackModes = new Map();
            this.userNotifications = new Set();
            this.degradationLevel = 0; // 0 = normal, 1 = partial, 2 = minimal, 3 = emergency
            
            // Configuration
            this.config = {
                enableUserNotifications: true,
                enableFallbackUI: true,
                enableEmergencyMode: true,
                maxDegradationLevel: 3,
                notificationTimeout: 10000,
                fallbackCheckInterval: 5000
            };
            
            // Fallback strategies for different components
            this.fallbackStrategies = {
                tabs: this.createBasicTabFallback.bind(this),
                menu: this.createBasicMenuFallback.bind(this),
                forms: this.createBasicFormFallback.bind(this),
                state: this.createBasicStateFallback.bind(this),
                events: this.createBasicEventFallback.bind(this)
            };
            
            // Bind methods
            this.handleComponentFailure = this.handleComponentFailure.bind(this);
            this.checkComponentHealth = this.checkComponentHealth.bind(this);
        }

        async init() {
            try {
                this.log('Initializing Graceful Degradation system...', 'info');
                
                // Setup component failure monitoring
                this.setupFailureMonitoring();
                
                // Setup health checking
                this.setupHealthChecking();
                
                // Bind to core events
                this.bindCoreEvents();
                
                this.initialized = true;
                this.log('Graceful Degradation system initialized successfully', 'success');
                
            } catch (error) {
                this.log(`Graceful Degradation initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }

        /**
         * Enable graceful degradation mode
         */
        enable() {
            if (this.enabled) {
                return;
            }

            this.enabled = true;
            this.degradationLevel = 1;
            
            // Add degradation class to body
            document.body.classList.add('las-ui-degraded');
            document.body.setAttribute('data-degradation-level', this.degradationLevel);
            
            // Show user notification
            if (this.config.enableUserNotifications) {
                this.showDegradationNotification();
            }
            
            // Enable fallback UI modes
            if (this.config.enableFallbackUI) {
                this.enableFallbackModes();
            }
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            this.log('Graceful degradation enabled', 'warn');
            this.emit('degradation:enabled', { level: this.degradationLevel });
        }

        /**
         * Disable graceful degradation mode
         */
        disable() {
            if (!this.enabled) {
                return;
            }

            this.enabled = false;
            this.degradationLevel = 0;
            
            // Remove degradation classes
            document.body.classList.remove('las-ui-degraded');
            document.body.removeAttribute('data-degradation-level');
            
            // Clear failed components
            this.failedComponents.clear();
            
            // Disable fallback modes
            this.disableFallbackModes();
            
            // Stop health monitoring
            this.stopHealthMonitoring();
            
            // Clear notifications
            this.clearNotifications();
            
            this.log('Graceful degradation disabled', 'info');
            this.emit('degradation:disabled');
        }

        /**
         * Handle component failure
         */
        handleComponentFailure(componentName, error) {
            this.log(`Component failure detected: ${componentName}`, 'error');
            
            // Add to failed components
            this.failedComponents.add(componentName);
            
            // Increase degradation level if needed
            this.increaseDegradationLevel();
            
            // Enable fallback for this component
            this.enableComponentFallback(componentName);
            
            // Show user notification
            if (this.config.enableUserNotifications) {
                this.showComponentFailureNotification(componentName);
            }
            
            // Emit failure event
            this.emit('degradation:component-failed', { 
                component: componentName, 
                error: error,
                level: this.degradationLevel 
            });
        }

        /**
         * Enable fallback for specific component
         */
        enableComponentFallback(componentName) {
            const strategy = this.fallbackStrategies[componentName];
            if (!strategy) {
                this.log(`No fallback strategy for component: ${componentName}`, 'warn');
                return;
            }

            try {
                const fallback = strategy();
                if (fallback) {
                    this.fallbackModes.set(componentName, fallback);
                    this.log(`Fallback enabled for component: ${componentName}`, 'info');
                }
            } catch (error) {
                this.log(`Failed to enable fallback for ${componentName}: ${error.message}`, 'error');
            }
        }

        /**
         * Create basic tab fallback
         */
        createBasicTabFallback() {
            const tabButtons = document.querySelectorAll('.las-tab[data-tab]');
            const tabPanels = document.querySelectorAll('.las-tab-panel');
            
            if (tabButtons.length === 0) {
                return null;
            }

            // Simple click handlers for tabs
            const handlers = [];
            tabButtons.forEach(button => {
                const handler = (e) => {
                    e.preventDefault();
                    const targetTab = button.dataset.tab;
                    
                    // Simple tab switching
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabPanels.forEach(panel => panel.classList.remove('active'));
                    
                    button.classList.add('active');
                    const targetPanel = document.getElementById(`las-tab-${targetTab}`);
                    if (targetPanel) {
                        targetPanel.classList.add('active');
                    }
                };
                
                button.addEventListener('click', handler);
                handlers.push({ element: button, handler });
            });

            return {
                type: 'tabs',
                handlers: handlers,
                cleanup: () => {
                    handlers.forEach(({ element, handler }) => {
                        element.removeEventListener('click', handler);
                    });
                }
            };
        }

        /**
         * Create basic menu fallback
         */
        createBasicMenuFallback() {
            const menuItems = document.querySelectorAll('.las-menu-item, .wp-menu-name');
            
            if (menuItems.length === 0) {
                return null;
            }

            const handlers = [];
            menuItems.forEach(item => {
                const submenu = item.nextElementSibling;
                if (submenu && submenu.classList.contains('wp-submenu')) {
                    const handler = (e) => {
                        e.preventDefault();
                        submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
                    };
                    
                    item.addEventListener('click', handler);
                    handlers.push({ element: item, handler });
                }
            });

            return {
                type: 'menu',
                handlers: handlers,
                cleanup: () => {
                    handlers.forEach(({ element, handler }) => {
                        element.removeEventListener('click', handler);
                    });
                }
            };
        }

        /**
         * Create basic form fallback
         */
        createBasicFormFallback() {
            const forms = document.querySelectorAll('form');
            
            if (forms.length === 0) {
                return null;
            }

            const handlers = [];
            forms.forEach(form => {
                const handler = (e) => {
                    // Basic form validation
                    const requiredFields = form.querySelectorAll('[required]');
                    let isValid = true;
                    
                    requiredFields.forEach(field => {
                        if (!field.value.trim()) {
                            field.style.borderColor = '#dc3232';
                            isValid = false;
                        } else {
                            field.style.borderColor = '';
                        }
                    });
                    
                    if (!isValid) {
                        e.preventDefault();
                        alert('Please fill in all required fields.');
                    }
                };
                
                form.addEventListener('submit', handler);
                handlers.push({ element: form, handler });
            });

            return {
                type: 'forms',
                handlers: handlers,
                cleanup: () => {
                    handlers.forEach(({ element, handler }) => {
                        element.removeEventListener('submit', handler);
                    });
                }
            };
        }

        /**
         * Create basic state fallback
         */
        createBasicStateFallback() {
            // Simple localStorage-based state management
            const state = {};
            
            return {
                type: 'state',
                get: (key) => {
                    try {
                        const stored = localStorage.getItem(`las_fallback_${key}`);
                        return stored ? JSON.parse(stored) : null;
                    } catch (error) {
                        return null;
                    }
                },
                set: (key, value) => {
                    try {
                        localStorage.setItem(`las_fallback_${key}`, JSON.stringify(value));
                        return true;
                    } catch (error) {
                        return false;
                    }
                },
                cleanup: () => {
                    // Remove fallback state items
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('las_fallback_')) {
                            localStorage.removeItem(key);
                        }
                    });
                }
            };
        }

        /**
         * Create basic event fallback
         */
        createBasicEventFallback() {
            const eventMap = new Map();
            
            return {
                type: 'events',
                on: (selector, eventType, callback) => {
                    const elements = document.querySelectorAll(selector);
                    const handlers = [];
                    
                    elements.forEach(element => {
                        element.addEventListener(eventType, callback);
                        handlers.push({ element, eventType, callback });
                    });
                    
                    const id = Date.now() + Math.random();
                    eventMap.set(id, handlers);
                    return id;
                },
                off: (id) => {
                    const handlers = eventMap.get(id);
                    if (handlers) {
                        handlers.forEach(({ element, eventType, callback }) => {
                            element.removeEventListener(eventType, callback);
                        });
                        eventMap.delete(id);
                    }
                },
                cleanup: () => {
                    eventMap.forEach((handlers) => {
                        handlers.forEach(({ element, eventType, callback }) => {
                            element.removeEventListener(eventType, callback);
                        });
                    });
                    eventMap.clear();
                }
            };
        }

        /**
         * Setup failure monitoring
         */
        setupFailureMonitoring() {
            // Listen for component errors
            this.on('error:occurred', (event) => {
                const { error } = event.detail;
                this.handleGlobalError(error);
            });
            
            // Monitor component initialization failures
            this.on('component:init-failed', (event) => {
                const { component, error } = event.detail;
                this.handleComponentFailure(component, error);
            });
        }

        /**
         * Setup health checking
         */
        setupHealthChecking() {
            this.healthCheckInterval = null;
        }

        /**
         * Start health monitoring
         */
        startHealthMonitoring() {
            if (this.healthCheckInterval) {
                return;
            }

            this.healthCheckInterval = setInterval(() => {
                this.checkComponentHealth();
            }, this.config.fallbackCheckInterval);
        }

        /**
         * Stop health monitoring
         */
        stopHealthMonitoring() {
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }
        }

        /**
         * Check component health
         */
        checkComponentHealth() {
            const components = ['tabs', 'menu', 'forms', 'state', 'events'];
            
            components.forEach(componentName => {
                if (this.failedComponents.has(componentName)) {
                    return; // Already failed
                }
                
                const component = this.core.get(componentName);
                if (!component || !component.initialized) {
                    this.handleComponentFailure(componentName, new Error('Component not initialized'));
                }
            });
        }

        /**
         * Handle global errors
         */
        handleGlobalError(error) {
            // Increase degradation level for critical errors
            if (error.name === 'TypeError' || error.name === 'ReferenceError') {
                this.increaseDegradationLevel();
            }
            
            // Enable emergency mode if too many errors
            if (this.degradationLevel >= this.config.maxDegradationLevel) {
                this.enableEmergencyMode();
            }
        }

        /**
         * Increase degradation level
         */
        increaseDegradationLevel() {
            if (this.degradationLevel < this.config.maxDegradationLevel) {
                this.degradationLevel++;
                document.body.setAttribute('data-degradation-level', this.degradationLevel);
                
                this.log(`Degradation level increased to: ${this.degradationLevel}`, 'warn');
                this.emit('degradation:level-increased', { level: this.degradationLevel });
            }
        }

        /**
         * Enable emergency mode
         */
        enableEmergencyMode() {
            if (!this.config.enableEmergencyMode) {
                return;
            }

            document.body.classList.add('las-ui-emergency');
            
            // Show emergency notification
            this.showEmergencyNotification();
            
            // Disable all advanced features
            this.disableAdvancedFeatures();
            
            this.log('Emergency mode enabled', 'error');
            this.emit('degradation:emergency-enabled');
        }

        /**
         * Enable fallback modes
         */
        enableFallbackModes() {
            // Enable fallbacks for failed components
            this.failedComponents.forEach(componentName => {
                this.enableComponentFallback(componentName);
            });
        }

        /**
         * Disable fallback modes
         */
        disableFallbackModes() {
            this.fallbackModes.forEach((fallback, componentName) => {
                if (fallback.cleanup) {
                    try {
                        fallback.cleanup();
                    } catch (error) {
                        this.log(`Error cleaning up fallback for ${componentName}: ${error.message}`, 'error');
                    }
                }
            });
            this.fallbackModes.clear();
        }

        /**
         * Disable advanced features in emergency mode
         */
        disableAdvancedFeatures() {
            // Remove all animations
            const style = document.createElement('style');
            style.textContent = `
                .las-ui-emergency * {
                    animation: none !important;
                    transition: none !important;
                }
            `;
            document.head.appendChild(style);
            
            // Disable complex interactions
            document.querySelectorAll('[data-las-interactive]').forEach(element => {
                element.removeAttribute('data-las-interactive');
            });
        }

        /**
         * Show degradation notification
         */
        showDegradationNotification() {
            const notification = this.createNotification(
                'Interface Degraded',
                'Some features may not work as expected. Basic functionality is still available.',
                'warning',
                { persistent: false, timeout: this.config.notificationTimeout }
            );
            
            this.userNotifications.add(notification);
        }

        /**
         * Show component failure notification
         */
        showComponentFailureNotification(componentName) {
            const messages = {
                tabs: 'Tab navigation may not work properly. You can still access all sections.',
                menu: 'Menu interactions may be limited. All options remain accessible.',
                forms: 'Form features may be simplified. Basic functionality is preserved.',
                state: 'Settings may not be saved automatically. Please save manually.',
                events: 'Some interactive features may not respond. Core functionality remains.'
            };
            
            const message = messages[componentName] || `${componentName} component is not working properly.`;
            
            const notification = this.createNotification(
                'Feature Limited',
                message,
                'info',
                { persistent: false, timeout: this.config.notificationTimeout }
            );
            
            this.userNotifications.add(notification);
        }

        /**
         * Show emergency notification
         */
        showEmergencyNotification() {
            const notification = this.createNotification(
                'Emergency Mode',
                'Multiple errors detected. The interface is running in emergency mode with limited functionality.',
                'error',
                { persistent: true }
            );
            
            this.userNotifications.add(notification);
        }

        /**
         * Create notification element
         */
        createNotification(title, message, type = 'info', options = {}) {
            const container = document.querySelector('.las-fresh-settings-wrap') || document.body;
            
            const notification = document.createElement('div');
            notification.className = `las-degradation-notice notice notice-${type} ${options.persistent ? '' : 'is-dismissible'}`;
            notification.innerHTML = `
                <p><strong>${title}:</strong> ${message}</p>
                ${!options.persistent ? '<button type="button" class="notice-dismiss"><span class="screen-reader-text">Dismiss this notice.</span></button>' : ''}
            `;
            
            // Add dismiss functionality
            if (!options.persistent) {
                const dismissBtn = notification.querySelector('.notice-dismiss');
                dismissBtn.addEventListener('click', () => {
                    notification.remove();
                    this.userNotifications.delete(notification);
                });
                
                // Auto-dismiss
                if (options.timeout) {
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                            this.userNotifications.delete(notification);
                        }
                    }, options.timeout);
                }
            }
            
            container.insertBefore(notification, container.firstChild);
            return notification;
        }

        /**
         * Clear all notifications
         */
        clearNotifications() {
            this.userNotifications.forEach(notification => {
                if (notification.parentNode) {
                    notification.remove();
                }
            });
            this.userNotifications.clear();
        }

        /**
         * Bind core events
         */
        bindCoreEvents() {
            // Listen for component failures
            this.core.components.forEach((component, name) => {
                if (component.on) {
                    component.on('error', (error) => {
                        this.handleComponentFailure(name, error);
                    });
                }
            });
        }

        /**
         * Get degradation status
         */
        getStatus() {
            return {
                enabled: this.enabled,
                level: this.degradationLevel,
                failedComponents: Array.from(this.failedComponents),
                fallbackModes: Array.from(this.fallbackModes.keys()),
                notifications: this.userNotifications.size
            };
        }

        /**
         * Destroy graceful degradation system
         */
        destroy() {
            this.disable();
            this.stopHealthMonitoring();
            this.clearNotifications();
            
            super.destroy();
        }
    }

})(window, document, window.jQuery || window.$);