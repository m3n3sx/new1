/**
 * Live Admin Styler UI Repair Integration System
 * Final integration layer that ensures all components work together
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * Integration Manager - Orchestrates the complete UI repair system
     */
    class LASIntegrationManager {
        constructor() {
            this.initialized = false;
            this.components = new Map();
            this.dependencies = new Map();
            this.errors = [];
            this.config = window.lasAdminData || {};
            this.startTime = performance.now();
            
            // Bind methods
            this.handleError = this.handleError.bind(this);
            this.handleDOMReady = this.handleDOMReady.bind(this);
            
            // Global error handling
            window.addEventListener('error', this.handleError);
            window.addEventListener('unhandledrejection', this.handleError);
        }

        /**
         * Initialize the complete UI repair system
         */
        async init() {
            try {
                this.log('Starting UI Repair Integration...', 'info');
                
                // Validate environment first
                if (!this.validateEnvironment()) {
                    throw new Error('Environment validation failed');
                }

                // Ensure jQuery is available
                await this.ensureJQuery();

                // Load missing dependencies
                await this.loadMissingDependencies();

                // Initialize core UI repair system
                await this.initializeCoreSystem();

                // Initialize additional components
                await this.initializeComponents();

                // Bind global events
                this.bindGlobalEvents();

                // Mark as initialized
                this.initialized = true;

                // Emit ready event
                this.emit('las:integration:ready');

                const initTime = performance.now() - this.startTime;
                this.log(`UI Repair Integration complete in ${initTime.toFixed(2)}ms`, 'success');

                return true;

            } catch (error) {
                this.log(`Integration failed: ${error.message}`, 'error');
                this.handleInitializationError(error);
                return false;
            }
        }

        /**
         * Validate environment for UI repair
         */
        validateEnvironment() {
            // Check for required globals
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                this.log('Missing required globals', 'error');
                return false;
            }

            // Check for WordPress admin context
            if (!document.body || !document.body.classList.contains('wp-admin')) {
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
         * Ensure jQuery is available
         */
        async ensureJQuery() {
            return new Promise((resolve) => {
                if (typeof window.jQuery !== 'undefined') {
                    window.$ = window.jQuery;
                    this.log('jQuery already available', 'info');
                    resolve();
                    return;
                }

                // Wait for jQuery to load
                let attempts = 0;
                const maxAttempts = 50;
                const checkInterval = 100;

                const checkJQuery = () => {
                    attempts++;
                    
                    if (typeof window.jQuery !== 'undefined') {
                        window.$ = window.jQuery;
                        this.log('jQuery loaded successfully', 'success');
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        this.log('jQuery not available after waiting', 'error');
                        // Create minimal jQuery substitute
                        this.createJQuerySubstitute();
                        resolve();
                    } else {
                        setTimeout(checkJQuery, checkInterval);
                    }
                };

                checkJQuery();
            });
        }

        /**
         * Create minimal jQuery substitute for basic functionality
         */
        createJQuerySubstitute() {
            window.$ = function(selector) {
                if (typeof selector === 'string') {
                    return {
                        length: 0,
                        each: function() { return this; },
                        on: function() { return this; },
                        off: function() { return this; },
                        addClass: function() { return this; },
                        removeClass: function() { return this; },
                        toggleClass: function() { return this; },
                        attr: function() { return this; },
                        prop: function() { return this; },
                        val: function() { return this; },
                        html: function() { return this; },
                        text: function() { return this; },
                        css: function() { return this; },
                        show: function() { return this; },
                        hide: function() { return this; },
                        fadeIn: function() { return this; },
                        fadeOut: function() { return this; },
                        slideUp: function() { return this; },
                        slideDown: function() { return this; }
                    };
                } else if (typeof selector === 'function') {
                    // Document ready substitute
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', selector);
                    } else {
                        selector();
                    }
                }
                return window.$;
            };

            // Add basic utilities
            window.$.fn = window.$.prototype = {};
            window.$.extend = function(target, source) {
                for (let key in source) {
                    if (source.hasOwnProperty(key)) {
                        target[key] = source[key];
                    }
                }
                return target;
            };

            this.log('Created jQuery substitute', 'warn');
        }

        /**
         * Load missing dependencies
         */
        async loadMissingDependencies() {
            const requiredClasses = [
                'LASAjaxManager',
                'BrowserCompatibility', 
                'ModernUIManager',
                'LASStateManager',
                'LASEventManager',
                'LASTabManager',
                'LASMenuManager',
                'LASFormManager',
                'LASErrorReporter',
                'LASGracefulDegradation'
            ];

            for (const className of requiredClasses) {
                if (typeof window[className] === 'undefined') {
                    this.createMissingClass(className);
                }
            }
        }

        /**
         * Create missing class implementations
         */
        createMissingClass(className) {
            switch (className) {
                case 'LASAjaxManager':
                    this.createAjaxManager();
                    break;
                case 'BrowserCompatibility':
                    this.createBrowserCompatibility();
                    break;
                case 'ModernUIManager':
                    this.createModernUIManager();
                    break;
                case 'LASStateManager':
                    this.createStateManager();
                    break;
                case 'LASEventManager':
                    this.createEventManager();
                    break;
                case 'LASTabManager':
                    this.createTabManager();
                    break;
                case 'LASMenuManager':
                    this.createMenuManager();
                    break;
                case 'LASFormManager':
                    this.createFormManager();
                    break;
                case 'LASErrorReporter':
                    this.createErrorReporter();
                    break;
                case 'LASGracefulDegradation':
                    this.createGracefulDegradation();
                    break;
            }
            
            this.log(`Created missing class: ${className}`, 'info');
        }

        /**
         * Create AJAX Manager
         */
        createAjaxManager() {
            window.LASAjaxManager = class {
                constructor() {
                    this.config = window.lasAdminData || {};
                }

                async request(action, data = {}) {
                    const formData = new FormData();
                    formData.append('action', action);
                    formData.append('nonce', this.config.nonce || '');
                    
                    for (const [key, value] of Object.entries(data)) {
                        formData.append(key, value);
                    }

                    try {
                        const response = await fetch(this.config.ajaxUrl || '/wp-admin/admin-ajax.php', {
                            method: 'POST',
                            body: formData
                        });

                        const result = await response.json();
                        return result;
                    } catch (error) {
                        throw new Error(`AJAX request failed: ${error.message}`);
                    }
                }
            };
        }

        /**
         * Create Browser Compatibility
         */
        createBrowserCompatibility() {
            window.BrowserCompatibility = class {
                constructor() {
                    this.features = this.detectFeatures();
                }

                detectFeatures() {
                    return {
                        flexbox: this.supportsFlexbox(),
                        grid: this.supportsGrid(),
                        customProperties: this.supportsCustomProperties(),
                        es6: this.supportsES6()
                    };
                }

                supportsFlexbox() {
                    const element = document.createElement('div');
                    element.style.display = 'flex';
                    return element.style.display === 'flex';
                }

                supportsGrid() {
                    const element = document.createElement('div');
                    element.style.display = 'grid';
                    return element.style.display === 'grid';
                }

                supportsCustomProperties() {
                    return window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');
                }

                supportsES6() {
                    try {
                        new Function('(a = 0) => a');
                        return true;
                    } catch (e) {
                        return false;
                    }
                }

                addFallbacks() {
                    if (!this.features.flexbox) {
                        document.body.classList.add('no-flexbox');
                    }
                    if (!this.features.grid) {
                        document.body.classList.add('no-grid');
                    }
                    if (!this.features.customProperties) {
                        document.body.classList.add('no-custom-properties');
                    }
                }
            };
        }

        /**
         * Create Modern UI Manager
         */
        createModernUIManager() {
            window.ModernUIManager = class {
                constructor() {
                    this.initialized = false;
                }

                init() {
                    this.initialized = true;
                    return Promise.resolve();
                }

                applyModernStyles() {
                    document.body.classList.add('las-modern-ui');
                }

                enableAnimations() {
                    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        document.body.classList.add('las-animations-enabled');
                    }
                }
            };
        }

        /**
         * Create State Manager
         */
        createStateManager() {
            window.LASStateManager = class {
                constructor(core) {
                    this.core = core;
                    this.state = {};
                    this.storage = window.localStorage;
                    this.storageKey = 'las_ui_state';
                }

                async init() {
                    this.loadState();
                    return Promise.resolve();
                }

                get(key) {
                    return this.state[key];
                }

                set(key, value) {
                    this.state[key] = value;
                    this.saveState();
                }

                loadState() {
                    try {
                        const saved = this.storage.getItem(this.storageKey);
                        if (saved) {
                            this.state = JSON.parse(saved);
                        }
                    } catch (error) {
                        console.warn('Failed to load state:', error);
                    }
                }

                saveState() {
                    try {
                        this.storage.setItem(this.storageKey, JSON.stringify(this.state));
                    } catch (error) {
                        console.warn('Failed to save state:', error);
                    }
                }
            };
        }

        /**
         * Create Event Manager
         */
        createEventManager() {
            window.LASEventManager = class {
                constructor(core) {
                    this.core = core;
                    this.events = new Map();
                }

                async init() {
                    return Promise.resolve();
                }

                on(selector, eventType, callback, options = {}) {
                    if (typeof selector === 'string' && typeof eventType === 'string' && typeof callback === 'function') {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(element => {
                            element.addEventListener(eventType, callback, options);
                        });
                        return `event-${Date.now()}`;
                    }
                    return null;
                }

                off(handlerId) {
                    // Basic implementation
                    return true;
                }
            };
        }

        /**
         * Create Tab Manager
         */
        createTabManager() {
            window.LASTabManager = class {
                constructor(core) {
                    this.core = core;
                    this.activeTab = 'general';
                    this.tabs = new Map();
                    this.panels = new Map();
                }

                async init() {
                    this.discoverTabs();
                    this.bindEvents();
                    this.restoreActiveTab();
                    return Promise.resolve();
                }

                discoverTabs() {
                    const tabButtons = document.querySelectorAll('.nav-tab, .las-tab');
                    const tabPanels = document.querySelectorAll('.las-tab-panel, .tab-panel');

                    tabButtons.forEach(tab => {
                        const tabId = tab.dataset.tab || tab.getAttribute('href')?.replace('#', '') || 'general';
                        this.tabs.set(tabId, tab);
                    });

                    tabPanels.forEach(panel => {
                        const panelId = panel.id?.replace('las-tab-', '') || panel.dataset.tab || 'general';
                        this.panels.set(panelId, panel);
                    });
                }

                bindEvents() {
                    this.tabs.forEach((tab, tabId) => {
                        tab.addEventListener('click', (e) => {
                            e.preventDefault();
                            this.setActiveTab(tabId);
                        });
                    });
                }

                setActiveTab(tabId) {
                    // Update tab buttons
                    this.tabs.forEach((tab, id) => {
                        if (id === tabId) {
                            tab.classList.add('active', 'nav-tab-active');
                        } else {
                            tab.classList.remove('active', 'nav-tab-active');
                        }
                    });

                    // Update panels
                    this.panels.forEach((panel, id) => {
                        if (id === tabId) {
                            panel.classList.add('active');
                            panel.style.display = 'block';
                        } else {
                            panel.classList.remove('active');
                            panel.style.display = 'none';
                        }
                    });

                    this.activeTab = tabId;
                    
                    // Save state
                    if (this.core && this.core.get('state')) {
                        this.core.get('state').set('activeTab', tabId);
                    }
                }

                restoreActiveTab() {
                    let savedTab = 'general';
                    
                    if (this.core && this.core.get('state')) {
                        savedTab = this.core.get('state').get('activeTab') || 'general';
                    }

                    if (this.tabs.has(savedTab)) {
                        this.setActiveTab(savedTab);
                    }
                }
            };
        }

        /**
         * Create Menu Manager
         */
        createMenuManager() {
            window.LASMenuManager = class {
                constructor(core) {
                    this.core = core;
                    this.menus = new Map();
                }

                async init() {
                    this.discoverMenus();
                    this.bindEvents();
                    return Promise.resolve();
                }

                discoverMenus() {
                    const menuItems = document.querySelectorAll('#adminmenu .wp-has-submenu');
                    menuItems.forEach(item => {
                        const submenu = item.querySelector('.wp-submenu');
                        if (submenu) {
                            const itemId = item.id || `menu-${Date.now()}`;
                            this.menus.set(itemId, { item, submenu });
                        }
                    });
                }

                bindEvents() {
                    this.menus.forEach(({ item, submenu }, itemId) => {
                        item.addEventListener('mouseenter', () => {
                            submenu.classList.add('las-submenu-visible');
                        });

                        item.addEventListener('mouseleave', () => {
                            setTimeout(() => {
                                submenu.classList.remove('las-submenu-visible');
                            }, 300);
                        });
                    });
                }
            };
        }

        /**
         * Create Form Manager
         */
        createFormManager() {
            window.LASFormManager = class {
                constructor(core) {
                    this.core = core;
                    this.controls = new Map();
                }

                async init() {
                    this.discoverControls();
                    this.bindEvents();
                    return Promise.resolve();
                }

                discoverControls() {
                    const selectors = [
                        'input[type="text"]',
                        'input[type="color"]',
                        'input[type="range"]',
                        'input[type="checkbox"]',
                        'select',
                        'textarea'
                    ];

                    selectors.forEach(selector => {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(element => {
                            const controlId = element.id || element.name || `control-${Date.now()}`;
                            this.controls.set(controlId, element);
                        });
                    });
                }

                bindEvents() {
                    this.controls.forEach((control, controlId) => {
                        control.addEventListener('change', (e) => {
                            this.handleControlChange(controlId, e.target.value);
                        });
                    });
                }

                handleControlChange(controlId, value) {
                    if (this.core && this.core.get('state')) {
                        this.core.get('state').set(`form.${controlId}`, value);
                    }
                }
            };
        }

        /**
         * Create Error Reporter
         */
        createErrorReporter() {
            window.LASErrorReporter = class {
                constructor(core) {
                    this.core = core;
                    this.errors = [];
                }

                async init() {
                    return Promise.resolve();
                }

                reportError(error) {
                    this.errors.push({
                        message: error.message,
                        stack: error.stack,
                        timestamp: Date.now()
                    });
                    console.error('LAS Error:', error);
                }

                getErrors() {
                    return this.errors;
                }
            };
        }

        /**
         * Create Graceful Degradation
         */
        createGracefulDegradation() {
            window.LASGracefulDegradation = class {
                constructor(core) {
                    this.core = core;
                    this.enabled = false;
                }

                async init() {
                    return Promise.resolve();
                }

                enable() {
                    this.enabled = true;
                    document.body.classList.add('las-ui-degraded');
                    this.applyFallbacks();
                }

                applyFallbacks() {
                    // Show all tab panels
                    const panels = document.querySelectorAll('.las-tab-panel, .tab-panel');
                    panels.forEach(panel => {
                        panel.style.display = 'block';
                    });

                    // Make tabs clickable
                    const tabs = document.querySelectorAll('.nav-tab, .las-tab');
                    tabs.forEach(tab => {
                        tab.style.cursor = 'pointer';
                    });
                }
            };
        }

        /**
         * Initialize core UI repair system
         */
        async initializeCoreSystem() {
            // Check if LASUICoreManager exists
            if (typeof window.LASUICoreManager !== 'undefined') {
                this.coreManager = new window.LASUICoreManager(this.config);
                await this.coreManager.init();
                this.log('Core UI Manager initialized', 'success');
            } else {
                // Create basic core manager
                this.createBasicCoreManager();
                this.log('Created basic core manager', 'warn');
            }
        }

        /**
         * Create basic core manager
         */
        createBasicCoreManager() {
            this.coreManager = {
                components: new Map(),
                initialized: true,
                
                get(name) {
                    return this.components.get(name);
                },
                
                emit(eventName, data) {
                    const event = new CustomEvent(eventName, { detail: data });
                    document.dispatchEvent(event);
                },
                
                on(eventName, callback) {
                    document.addEventListener(eventName, callback);
                }
            };
        }

        /**
         * Initialize additional components
         */
        async initializeComponents() {
            const componentClasses = [
                { name: 'state', class: window.LASStateManager },
                { name: 'events', class: window.LASEventManager },
                { name: 'tabs', class: window.LASTabManager },
                { name: 'menu', class: window.LASMenuManager },
                { name: 'forms', class: window.LASFormManager },
                { name: 'errorReporter', class: window.LASErrorReporter },
                { name: 'gracefulDegradation', class: window.LASGracefulDegradation }
            ];

            for (const { name, class: ComponentClass } of componentClasses) {
                try {
                    const component = new ComponentClass(this.coreManager);
                    await component.init();
                    this.coreManager.components.set(name, component);
                    this.log(`Initialized component: ${name}`, 'success');
                } catch (error) {
                    this.log(`Failed to initialize ${name}: ${error.message}`, 'error');
                }
            }
        }

        /**
         * Bind global events
         */
        bindGlobalEvents() {
            // DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', this.handleDOMReady);
            } else {
                this.handleDOMReady();
            }

            // Window load
            window.addEventListener('load', () => {
                this.emit('las:window:loaded');
            });

            // Visibility change
            document.addEventListener('visibilitychange', () => {
                this.emit('las:visibility:changed', { hidden: document.hidden });
            });
        }

        /**
         * Handle DOM ready
         */
        handleDOMReady() {
            this.emit('las:dom:ready');
            
            // Apply UI ready class
            const container = document.querySelector('.las-fresh-settings-wrap, .las-settings-wrap');
            if (container) {
                container.classList.add('las-ui-ready');
            }
        }

        /**
         * Handle initialization errors
         */
        handleInitializationError(error) {
            this.errors.push(error);
            
            // Show user notification
            this.showErrorNotification(
                'Live Admin Styler UI Error',
                'Failed to initialize interface. Some features may not work properly.',
                error.message
            );

            // Enable graceful degradation
            if (this.coreManager && this.coreManager.components.has('gracefulDegradation')) {
                this.coreManager.components.get('gracefulDegradation').enable();
            } else {
                document.body.classList.add('las-ui-degraded');
            }
        }

        /**
         * Handle runtime errors
         */
        handleError(event) {
            const error = event.error || event.reason || event;
            this.errors.push(error);
            this.log(`Runtime error: ${error.message}`, 'error');
        }

        /**
         * Show error notification
         */
        showErrorNotification(title, message, details = '') {
            const container = document.querySelector('.las-fresh-settings-wrap') || document.body;
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'notice notice-error is-dismissible las-ui-error';
            errorDiv.innerHTML = `
                <p><strong>${title}:</strong> ${message}</p>
                ${details ? `<p><small>Details: ${details}</small></p>` : ''}
                <button type="button" class="notice-dismiss">
                    <span class="screen-reader-text">Dismiss this notice.</span>
                </button>
            `;

            const dismissBtn = errorDiv.querySelector('.notice-dismiss');
            dismissBtn.addEventListener('click', () => {
                errorDiv.remove();
            });

            container.insertBefore(errorDiv, container.firstChild);

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 10000);
        }

        /**
         * Emit event
         */
        emit(eventName, data = null) {
            const event = new CustomEvent(eventName, { detail: data });
            document.dispatchEvent(event);
        }

        /**
         * Log message
         */
        log(message, level = 'info') {
            const timestamp = new Date().toISOString();
            const prefix = `[LAS Integration ${timestamp}]`;
            
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
                components: this.coreManager ? Array.from(this.coreManager.components.keys()) : [],
                errors: this.errors,
                config: this.config
            };
        }
    }

    // Initialize integration when DOM is ready
    function initializeIntegration() {
        window.lasIntegrationManager = new LASIntegrationManager();
        window.lasIntegrationManager.init().then(success => {
            if (success) {
                console.log('LAS UI Repair Integration: System ready');
            } else {
                console.error('LAS UI Repair Integration: System failed to initialize');
            }
        });
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeIntegration);
    } else {
        initializeIntegration();
    }

    // Expose integration manager globally
    window.LASIntegrationManager = LASIntegrationManager;

})(window, document);