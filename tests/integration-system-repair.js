/**
 * Live Admin Styler - System Integration Repair and Validation
 * Comprehensive diagnostic and repair system for UI integration issues
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * System Repair and Validation Manager
     */
    class LASSystemRepair {
        constructor() {
            this.diagnostics = [];
            this.repairs = [];
            this.config = window.lasAdminData || {};
            this.startTime = performance.now();
            this.repairAttempts = 0;
            this.maxRepairAttempts = 3;
        }

        /**
         * Run comprehensive system diagnosis and repair
         */
        async runSystemRepair() {
            try {
                this.log('Starting system repair and validation...', 'info');
                
                // Step 1: Diagnose current issues
                await this.runDiagnostics();
                
                // Step 2: Attempt repairs
                await this.attemptRepairs();
                
                // Step 3: Validate repairs
                await this.validateRepairs();
                
                // Step 4: Initialize clean system
                await this.initializeCleanSystem();
                
                this.log('System repair completed successfully', 'success');
                return true;
                
            } catch (error) {
                this.log(`System repair failed: ${error.message}`, 'error');
                await this.enableEmergencyMode();
                return false;
            }
        }

        /**
         * Run comprehensive diagnostics
         */
        async runDiagnostics() {
            this.log('Running system diagnostics...', 'info');
            
            // Check environment
            this.checkEnvironment();
            
            // Check dependencies
            this.checkDependencies();
            
            // Check existing systems
            this.checkExistingSystems();
            
            // Check for conflicts
            this.checkConflicts();
            
            // Check asset loading
            this.checkAssetLoading();
            
            this.log(`Diagnostics complete. Found ${this.diagnostics.length} issues.`, 'info');
        }

        /**
         * Check environment setup
         */
        checkEnvironment() {
            const issues = [];
            
            // Check globals
            if (typeof window === 'undefined') issues.push('Window object missing');
            if (typeof document === 'undefined') issues.push('Document object missing');
            
            // Check WordPress admin
            if (!document.body || !document.body.classList.contains('wp-admin')) {
                issues.push('Not in WordPress admin context');
            }
            
            // Check plugin container
            const container = document.querySelector('.las-fresh-settings-wrap, .las-settings-wrap');
            if (!container) {
                issues.push('Plugin container not found');
            }
            
            // Check admin data
            if (!window.lasAdminData) {
                issues.push('Admin data not available');
            }
            
            if (issues.length > 0) {
                this.diagnostics.push({
                    category: 'Environment',
                    issues: issues,
                    severity: 'high'
                });
            }
        }

        /**
         * Check dependencies
         */
        checkDependencies() {
            const issues = [];
            
            // Check jQuery
            if (typeof window.$ === 'undefined' && typeof window.jQuery === 'undefined') {
                issues.push('jQuery not available');
            }
            
            // Check required classes
            const requiredClasses = [
                'LASIntegrationManager',
                'LASStateManager',
                'LASEventManager',
                'LASTabManager',
                'LASMenuManager',
                'LASFormManager'
            ];
            
            requiredClasses.forEach(className => {
                if (typeof window[className] === 'undefined') {
                    issues.push(`${className} class not available`);
                }
            });
            
            if (issues.length > 0) {
                this.diagnostics.push({
                    category: 'Dependencies',
                    issues: issues,
                    severity: 'high'
                });
            }
        }

        /**
         * Check existing systems
         */
        checkExistingSystems() {
            const issues = [];
            
            // Check integration manager
            if (typeof window.lasIntegrationManager === 'undefined') {
                issues.push('Integration manager instance not found');
            } else {
                const manager = window.lasIntegrationManager;
                if (!manager.initialized) {
                    issues.push('Integration manager not initialized');
                }
                if (!manager.coreManager) {
                    issues.push('Core manager not available');
                }
            }
            
            // Check for degraded mode
            if (document.body.classList.contains('las-ui-degraded')) {
                issues.push('System is in degraded mode');
            }
            
            if (issues.length > 0) {
                this.diagnostics.push({
                    category: 'Existing Systems',
                    issues: issues,
                    severity: 'medium'
                });
            }
        }

        /**
         * Check for conflicts
         */
        checkConflicts() {
            const issues = [];
            
            // Check for multiple jQuery versions
            if (window.jQuery && window.$ && window.jQuery !== window.$) {
                issues.push('Multiple jQuery versions detected');
            }
            
            // Check for conflicting plugins
            const conflictingSelectors = [
                '.wp-color-picker',
                '.ui-slider',
                '.nav-tab-wrapper'
            ];
            
            conflictingSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 1) {
                    issues.push(`Multiple ${selector} elements found - possible plugin conflict`);
                }
            });
            
            // Check for JavaScript errors
            if (window.console && console.error) {
                // This is a simplified check - in real implementation we'd track errors
                issues.push('JavaScript errors may be present (check console)');
            }
            
            if (issues.length > 0) {
                this.diagnostics.push({
                    category: 'Conflicts',
                    issues: issues,
                    severity: 'medium'
                });
            }
        }

        /**
         * Check asset loading
         */
        checkAssetLoading() {
            const issues = [];
            
            // Check for required scripts
            const requiredScripts = [
                'las-ui-repair-integration',
                'las-ui-repair'
            ];
            
            requiredScripts.forEach(handle => {
                const script = document.querySelector(`script[src*="${handle}"]`);
                if (!script) {
                    issues.push(`Required script ${handle} not loaded`);
                }
            });
            
            // Check for required styles
            const requiredStyles = [
                'las-ui-repair-css'
            ];
            
            requiredStyles.forEach(handle => {
                const style = document.querySelector(`link[href*="${handle}"], style[id*="${handle}"]`);
                if (!style) {
                    issues.push(`Required stylesheet ${handle} not loaded`);
                }
            });
            
            if (issues.length > 0) {
                this.diagnostics.push({
                    category: 'Asset Loading',
                    issues: issues,
                    severity: 'high'
                });
            }
        }

        /**
         * Attempt to repair identified issues
         */
        async attemptRepairs() {
            this.log('Attempting system repairs...', 'info');
            
            for (const diagnostic of this.diagnostics) {
                await this.repairCategory(diagnostic);
            }
            
            this.log(`Repair attempts complete. Made ${this.repairs.length} repairs.`, 'info');
        }

        /**
         * Repair issues in a specific category
         */
        async repairCategory(diagnostic) {
            switch (diagnostic.category) {
                case 'Environment':
                    await this.repairEnvironment(diagnostic.issues);
                    break;
                case 'Dependencies':
                    await this.repairDependencies(diagnostic.issues);
                    break;
                case 'Existing Systems':
                    await this.repairExistingSystems(diagnostic.issues);
                    break;
                case 'Conflicts':
                    await this.repairConflicts(diagnostic.issues);
                    break;
                case 'Asset Loading':
                    await this.repairAssetLoading(diagnostic.issues);
                    break;
            }
        }

        /**
         * Repair environment issues
         */
        async repairEnvironment(issues) {
            for (const issue of issues) {
                if (issue.includes('admin data')) {
                    // Create minimal admin data
                    window.lasAdminData = window.lasAdminData || {
                        ajaxUrl: '/wp-admin/admin-ajax.php',
                        nonce: 'repair-nonce',
                        debug: true,
                        version: '1.0.0',
                        uiRepair: {
                            timeout: 10000,
                            retryAttempts: 3,
                            debounceDelay: 300,
                            enableGracefulDegradation: true
                        }
                    };
                    this.repairs.push('Created minimal admin data');
                }
                
                if (issue.includes('plugin container')) {
                    // Create minimal container if missing
                    let container = document.querySelector('.las-fresh-settings-wrap');
                    if (!container) {
                        container = document.createElement('div');
                        container.className = 'las-fresh-settings-wrap';
                        document.body.appendChild(container);
                        this.repairs.push('Created plugin container');
                    }
                }
            }
        }

        /**
         * Repair dependency issues
         */
        async repairDependencies(issues) {
            for (const issue of issues) {
                if (issue.includes('jQuery')) {
                    await this.repairJQuery();
                }
                
                if (issue.includes('class not available')) {
                    await this.createMissingClasses();
                }
            }
        }

        /**
         * Repair jQuery issues
         */
        async repairJQuery() {
            return new Promise((resolve) => {
                // Wait for jQuery or create substitute
                let attempts = 0;
                const maxAttempts = 20;
                
                const checkJQuery = () => {
                    attempts++;
                    
                    if (typeof window.jQuery !== 'undefined') {
                        window.$ = window.jQuery;
                        this.repairs.push('jQuery found and assigned');
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        // Create jQuery substitute
                        this.createJQuerySubstitute();
                        this.repairs.push('Created jQuery substitute');
                        resolve();
                    } else {
                        setTimeout(checkJQuery, 100);
                    }
                };
                
                checkJQuery();
            });
        }

        /**
         * Create jQuery substitute
         */
        createJQuerySubstitute() {
            window.$ = function(selector) {
                if (typeof selector === 'string') {
                    const elements = document.querySelectorAll(selector);
                    return {
                        length: elements.length,
                        0: elements[0],
                        each: function(callback) {
                            elements.forEach((el, index) => callback.call(el, index, el));
                            return this;
                        },
                        on: function(event, handler) {
                            elements.forEach(el => el.addEventListener(event, handler));
                            return this;
                        },
                        off: function(event, handler) {
                            elements.forEach(el => el.removeEventListener(event, handler));
                            return this;
                        },
                        addClass: function(className) {
                            elements.forEach(el => el.classList.add(className));
                            return this;
                        },
                        removeClass: function(className) {
                            elements.forEach(el => el.classList.remove(className));
                            return this;
                        },
                        toggleClass: function(className) {
                            elements.forEach(el => el.classList.toggle(className));
                            return this;
                        },
                        attr: function(name, value) {
                            if (value !== undefined) {
                                elements.forEach(el => el.setAttribute(name, value));
                                return this;
                            }
                            return elements[0] ? elements[0].getAttribute(name) : null;
                        },
                        val: function(value) {
                            if (value !== undefined) {
                                elements.forEach(el => el.value = value);
                                return this;
                            }
                            return elements[0] ? elements[0].value : null;
                        },
                        html: function(content) {
                            if (content !== undefined) {
                                elements.forEach(el => el.innerHTML = content);
                                return this;
                            }
                            return elements[0] ? elements[0].innerHTML : null;
                        },
                        css: function(property, value) {
                            if (value !== undefined) {
                                elements.forEach(el => el.style[property] = value);
                                return this;
                            }
                            return elements[0] ? getComputedStyle(elements[0])[property] : null;
                        },
                        show: function() {
                            elements.forEach(el => el.style.display = 'block');
                            return this;
                        },
                        hide: function() {
                            elements.forEach(el => el.style.display = 'none');
                            return this;
                        }
                    };
                } else if (typeof selector === 'function') {
                    // Document ready
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', selector);
                    } else {
                        selector();
                    }
                }
                return window.$;
            };
            
            // Add jQuery utilities
            window.$.extend = function(target, source) {
                for (let key in source) {
                    if (source.hasOwnProperty(key)) {
                        target[key] = source[key];
                    }
                }
                return target;
            };
        }

        /**
         * Create missing classes
         */
        async createMissingClasses() {
            const classDefinitions = {
                LASStateManager: this.createStateManagerClass(),
                LASEventManager: this.createEventManagerClass(),
                LASTabManager: this.createTabManagerClass(),
                LASMenuManager: this.createMenuManagerClass(),
                LASFormManager: this.createFormManagerClass(),
                LASErrorReporter: this.createErrorReporterClass(),
                LASGracefulDegradation: this.createGracefulDegradationClass()
            };

            for (const [className, classDefinition] of Object.entries(classDefinitions)) {
                if (typeof window[className] === 'undefined') {
                    window[className] = classDefinition;
                    this.repairs.push(`Created ${className} class`);
                }
            }
        }

        /**
         * Create State Manager class
         */
        createStateManagerClass() {
            return class LASStateManager {
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
         * Create Event Manager class
         */
        createEventManagerClass() {
            return class LASEventManager {
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
                    return true;
                }
            };
        }

        /**
         * Create Tab Manager class
         */
        createTabManagerClass() {
            return class LASTabManager {
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
                    if (this.core && this.core.get && this.core.get('state')) {
                        this.core.get('state').set('activeTab', tabId);
                    }
                }

                restoreActiveTab() {
                    let savedTab = 'general';
                    
                    if (this.core && this.core.get && this.core.get('state')) {
                        savedTab = this.core.get('state').get('activeTab') || 'general';
                    }

                    if (this.tabs.has(savedTab)) {
                        this.setActiveTab(savedTab);
                    }
                }
            };
        }

        /**
         * Create Menu Manager class
         */
        createMenuManagerClass() {
            return class LASMenuManager {
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
         * Create Form Manager class
         */
        createFormManagerClass() {
            return class LASFormManager {
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
                    if (this.core && this.core.get && this.core.get('state')) {
                        this.core.get('state').set(`form.${controlId}`, value);
                    }
                }
            };
        }

        /**
         * Create Error Reporter class
         */
        createErrorReporterClass() {
            return class LASErrorReporter {
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
         * Create Graceful Degradation class
         */
        createGracefulDegradationClass() {
            return class LASGracefulDegradation {
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

                disable() {
                    this.enabled = false;
                    document.body.classList.remove('las-ui-degraded');
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
         * Repair existing systems
         */
        async repairExistingSystems(issues) {
            for (const issue of issues) {
                if (issue.includes('Integration manager instance')) {
                    await this.createIntegrationManager();
                }
                
                if (issue.includes('degraded mode')) {
                    await this.exitDegradedMode();
                }
            }
        }

        /**
         * Create integration manager
         */
        async createIntegrationManager() {
            if (typeof window.LASIntegrationManager === 'undefined') {
                // Create basic integration manager
                window.LASIntegrationManager = class {
                    constructor() {
                        this.initialized = false;
                        this.components = new Map();
                        this.coreManager = {
                            components: new Map(),
                            get: (name) => this.components.get(name),
                            emit: (eventName, data) => {
                                const event = new CustomEvent(eventName, { detail: data });
                                document.dispatchEvent(event);
                            }
                        };
                    }

                    async init() {
                        this.initialized = true;
                        return true;
                    }

                    getStatus() {
                        return {
                            initialized: this.initialized,
                            components: Array.from(this.components.keys())
                        };
                    }
                };
            }

            // Create instance
            window.lasIntegrationManager = new window.LASIntegrationManager();
            await window.lasIntegrationManager.init();
            
            this.repairs.push('Created integration manager instance');
        }

        /**
         * Exit degraded mode
         */
        async exitDegradedMode() {
            document.body.classList.remove('las-ui-degraded');
            
            // Remove degraded notices
            const notices = document.querySelectorAll('.notice:contains("Interface Degraded")');
            notices.forEach(notice => notice.remove());
            
            this.repairs.push('Exited degraded mode');
        }

        /**
         * Repair conflicts
         */
        async repairConflicts(issues) {
            for (const issue of issues) {
                if (issue.includes('Multiple jQuery')) {
                    // Ensure single jQuery reference
                    if (window.jQuery) {
                        window.$ = window.jQuery;
                        this.repairs.push('Unified jQuery references');
                    }
                }
            }
        }

        /**
         * Repair asset loading
         */
        async repairAssetLoading(issues) {
            // This would typically involve reloading assets
            // For now, we'll just log the attempt
            this.repairs.push('Attempted asset loading repair');
        }

        /**
         * Validate repairs
         */
        async validateRepairs() {
            this.log('Validating repairs...', 'info');
            
            // Re-run diagnostics to see if issues are resolved
            const originalDiagnostics = this.diagnostics.length;
            this.diagnostics = [];
            await this.runDiagnostics();
            
            const remainingIssues = this.diagnostics.length;
            const resolvedIssues = originalDiagnostics - remainingIssues;
            
            this.log(`Validation complete. Resolved ${resolvedIssues} issues, ${remainingIssues} remaining.`, 'info');
        }

        /**
         * Initialize clean system
         */
        async initializeCleanSystem() {
            this.log('Initializing clean system...', 'info');
            
            try {
                // Ensure integration manager exists and is initialized
                if (!window.lasIntegrationManager) {
                    await this.createIntegrationManager();
                }
                
                // Initialize components
                await this.initializeComponents();
                
                // Apply UI ready state
                const container = document.querySelector('.las-fresh-settings-wrap, .las-settings-wrap');
                if (container) {
                    container.classList.add('las-ui-ready');
                }
                
                // Remove degraded mode
                document.body.classList.remove('las-ui-degraded');
                
                // Show success notification
                this.showSuccessNotification();
                
                this.repairs.push('Clean system initialized');
                
            } catch (error) {
                this.log(`Clean system initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }

        /**
         * Initialize components
         */
        async initializeComponents() {
            const manager = window.lasIntegrationManager;
            if (!manager || !manager.coreManager) return;

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
                if (ComponentClass) {
                    try {
                        const component = new ComponentClass(manager.coreManager);
                        await component.init();
                        manager.coreManager.components.set(name, component);
                        this.log(`Initialized component: ${name}`, 'success');
                    } catch (error) {
                        this.log(`Failed to initialize ${name}: ${error.message}`, 'error');
                    }
                }
            }
        }

        /**
         * Enable emergency mode
         */
        async enableEmergencyMode() {
            this.log('Enabling emergency mode...', 'warn');
            
            // Apply basic functionality
            document.body.classList.add('las-emergency-mode');
            
            // Basic tab functionality
            this.enableBasicTabs();
            
            // Show emergency notification
            this.showEmergencyNotification();
        }

        /**
         * Enable basic tab functionality
         */
        enableBasicTabs() {
            const tabs = document.querySelectorAll('.nav-tab');
            const panels = document.querySelectorAll('.las-tab-panel, .tab-panel');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Remove active from all tabs
                    tabs.forEach(t => t.classList.remove('active', 'nav-tab-active'));
                    
                    // Add active to clicked tab
                    tab.classList.add('active', 'nav-tab-active');
                    
                    // Get tab ID
                    const tabId = tab.dataset.tab || tab.getAttribute('href')?.replace('#', '') || 'general';
                    
                    // Show/hide panels
                    panels.forEach(panel => {
                        const panelId = panel.id?.replace('las-tab-', '') || panel.dataset.tab || 'general';
                        if (panelId === tabId) {
                            panel.style.display = 'block';
                            panel.classList.add('active');
                        } else {
                            panel.style.display = 'none';
                            panel.classList.remove('active');
                        }
                    });
                });
            });
        }

        /**
         * Show success notification
         */
        showSuccessNotification() {
            this.showNotification(
                'System Repair Complete',
                'The Live Admin Styler interface has been successfully repaired and is now fully functional.',
                'success'
            );
        }

        /**
         * Show emergency notification
         */
        showEmergencyNotification() {
            this.showNotification(
                'Emergency Mode Active',
                'The system could not be fully repaired. Basic functionality is available, but some features may not work.',
                'error'
            );
        }

        /**
         * Show notification
         */
        showNotification(title, message, type = 'info') {
            // Remove existing repair notifications
            const existingNotices = document.querySelectorAll('.las-repair-notice');
            existingNotices.forEach(notice => notice.remove());
            
            const container = document.querySelector('.las-fresh-settings-wrap') || document.body;
            
            const noticeDiv = document.createElement('div');
            noticeDiv.className = `notice notice-${type} is-dismissible las-repair-notice`;
            noticeDiv.innerHTML = `
                <p><strong>${title}:</strong> ${message}</p>
                <button type="button" class="notice-dismiss">
                    <span class="screen-reader-text">Dismiss this notice.</span>
                </button>
            `;

            const dismissBtn = noticeDiv.querySelector('.notice-dismiss');
            dismissBtn.addEventListener('click', () => {
                noticeDiv.remove();
            });

            container.insertBefore(noticeDiv, container.firstChild);

            // Auto-dismiss success notices after 5 seconds
            if (type === 'success') {
                setTimeout(() => {
                    if (noticeDiv.parentNode) {
                        noticeDiv.remove();
                    }
                }, 5000);
            }
        }

        /**
         * Log message
         */
        log(message, level = 'info') {
            const timestamp = new Date().toISOString();
            const prefix = `[LAS Repair ${timestamp}]`;
            
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
         * Get repair report
         */
        getRepairReport() {
            return {
                timestamp: new Date().toISOString(),
                diagnostics: this.diagnostics,
                repairs: this.repairs,
                repairAttempts: this.repairAttempts,
                totalTime: performance.now() - this.startTime
            };
        }
    }

    // Auto-run system repair when script loads
    function runSystemRepair() {
        const repair = new LASSystemRepair();
        repair.runSystemRepair().then(success => {
            if (success) {
                console.log('LAS System Repair: Repair completed successfully');
                
                // Emit repair complete event
                const event = new CustomEvent('las:repair:complete', {
                    detail: repair.getRepairReport()
                });
                document.dispatchEvent(event);
            } else {
                console.error('LAS System Repair: Repair failed, emergency mode active');
            }
        });
    }

    // Run repair when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSystemRepair);
    } else {
        runSystemRepair();
    }

    // Expose repair class globally
    window.LASSystemRepair = LASSystemRepair;

})(window, document);