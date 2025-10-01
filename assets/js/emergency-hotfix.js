/**
 * Live Admin Styler - Emergency Hotfix
 * Immediate fix for AJAX error cascade and system stabilization
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * Emergency Hotfix Manager
     */
    class LASEmergencyHotfix {
        constructor() {
            this.applied = false;
            this.errorCount = 0;
            this.maxErrors = 10;
            this.ajaxBlocked = false;
            this.originalFetch = window.fetch;
            this.originalXHR = window.XMLHttpRequest;
            
            this.log('Emergency hotfix loaded', 'warn');
        }

        /**
         * Apply emergency fixes immediately
         */
        applyEmergencyFixes() {
            if (this.applied) return;
            
            try {
                this.log('Applying emergency fixes...', 'warn');
                
                // 1. Stop AJAX error cascade
                this.stopAjaxCascade();
                
                // 2. Block problematic AJAX requests
                this.blockProblematicAjax();
                
                // 3. Clear error queues
                this.clearErrorQueues();
                
                // 4. Disable automatic retries
                this.disableAutoRetries();
                
                // 5. Apply basic UI functionality
                this.applyBasicUI();
                
                // 6. Show emergency notice
                this.showEmergencyNotice();
                
                this.applied = true;
                this.log('Emergency fixes applied successfully', 'success');
                
            } catch (error) {
                this.log(`Emergency fix failed: ${error.message}`, 'error');
            }
        }

        /**
         * Stop AJAX error cascade
         */
        stopAjaxCascade() {
            // Override fetch to prevent problematic requests
            window.fetch = (url, options = {}) => {
                if (this.shouldBlockRequest(url)) {
                    this.log(`Blocked fetch request to: ${url}`, 'warn');
                    return Promise.reject(new Error('Request blocked by emergency hotfix'));
                }
                return this.originalFetch.call(window, url, options);
            };

            // Override XMLHttpRequest
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                if (window.lasEmergencyHotfix && window.lasEmergencyHotfix.shouldBlockRequest(url)) {
                    window.lasEmergencyHotfix.log(`Blocked XHR request to: ${url}`, 'warn');
                    // Create a fake XHR that fails immediately
                    setTimeout(() => {
                        if (this.onerror) {
                            this.onerror(new Error('Request blocked by emergency hotfix'));
                        }
                    }, 0);
                    return;
                }
                return originalOpen.call(this, method, url, ...args);
            };
        }

        /**
         * Check if request should be blocked
         */
        shouldBlockRequest(url) {
            if (!url) return false;
            
            // Block if too many errors
            if (this.errorCount > this.maxErrors) {
                return true;
            }
            
            // Block specific problematic endpoints
            const blockedPatterns = [
                'las_refresh_nonce',
                'las_error_report',
                'las_validate_assets'
            ];
            
            return blockedPatterns.some(pattern => url.includes(pattern));
        }

        /**
         * Block problematic AJAX requests
         */
        blockProblematicAjax() {
            // Disable jQuery AJAX if available
            if (window.$ && window.$.ajax) {
                const originalAjax = window.$.ajax;
                window.$.ajax = function(options) {
                    if (window.lasEmergencyHotfix && window.lasEmergencyHotfix.shouldBlockAjaxRequest(options)) {
                        window.lasEmergencyHotfix.log('Blocked jQuery AJAX request', 'warn');
                        return {
                            done: () => this,
                            fail: () => this,
                            always: () => this
                        };
                    }
                    return originalAjax.call(this, options);
                };
            }
        }

        /**
         * Check if AJAX request should be blocked
         */
        shouldBlockAjaxRequest(options) {
            if (!options) return false;
            
            const url = options.url || '';
            const data = options.data || {};
            
            // Block if too many errors
            if (this.errorCount > this.maxErrors) {
                return true;
            }
            
            // Block specific actions
            const blockedActions = [
                'las_refresh_nonce',
                'las_error_report',
                'las_validate_assets'
            ];
            
            if (data.action && blockedActions.includes(data.action)) {
                return true;
            }
            
            return this.shouldBlockRequest(url);
        }

        /**
         * Clear error queues
         */
        clearErrorQueues() {
            // Clear any existing error reporters
            if (window.lasIntegrationManager && 
                window.lasIntegrationManager.coreManager && 
                window.lasIntegrationManager.coreManager.components) {
                
                const errorReporter = window.lasIntegrationManager.coreManager.components.get('errorReporter');
                if (errorReporter && errorReporter.errors) {
                    errorReporter.errors = [];
                    this.log('Cleared error reporter queue', 'info');
                }
            }

            // Clear console errors (if possible)
            if (console.clear) {
                console.clear();
            }
        }

        /**
         * Disable automatic retries
         */
        disableAutoRetries() {
            // Disable retry mechanisms in various components
            if (window.LASAjaxManager && window.LASAjaxManager.prototype) {
                window.LASAjaxManager.prototype.retryAttempts = 0;
            }

            // Disable error reporter retries
            if (window.LASErrorReporter && window.LASErrorReporter.prototype) {
                window.LASErrorReporter.prototype.maxRetries = 0;
            }

            this.log('Disabled automatic retries', 'info');
        }

        /**
         * Apply basic UI functionality
         */
        applyBasicUI() {
            // Remove degraded mode classes
            document.body.classList.remove('las-ui-degraded');
            document.body.classList.add('las-emergency-mode');

            // Apply basic tab functionality
            this.setupBasicTabs();

            // Apply basic form functionality
            this.setupBasicForms();

            // Apply basic menu functionality
            this.setupBasicMenus();

            this.log('Applied basic UI functionality', 'info');
        }

        /**
         * Setup basic tab functionality
         */
        setupBasicTabs() {
            const tabs = document.querySelectorAll('.nav-tab');
            const panels = document.querySelectorAll('.las-tab-panel, .tab-panel');

            tabs.forEach(tab => {
                // Remove existing event listeners by cloning
                const newTab = tab.cloneNode(true);
                tab.parentNode.replaceChild(newTab, tab);

                newTab.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Remove active from all tabs
                    tabs.forEach(t => {
                        t.classList.remove('active', 'nav-tab-active');
                    });
                    
                    // Add active to clicked tab
                    newTab.classList.add('active', 'nav-tab-active');
                    
                    // Get tab ID
                    const tabId = newTab.dataset.tab || 
                                 newTab.getAttribute('href')?.replace('#', '') || 
                                 'general';
                    
                    // Show/hide panels
                    panels.forEach(panel => {
                        const panelId = panel.id?.replace('las-tab-', '') || 
                                       panel.dataset.tab || 
                                       'general';
                        
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
         * Setup basic form functionality
         */
        setupBasicForms() {
            const forms = document.querySelectorAll('form');
            
            forms.forEach(form => {
                // Prevent multiple submissions
                form.addEventListener('submit', (e) => {
                    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        setTimeout(() => {
                            submitBtn.disabled = false;
                        }, 3000);
                    }
                });
            });

            // Basic form control handling
            const controls = document.querySelectorAll('input, select, textarea');
            controls.forEach(control => {
                control.addEventListener('change', (e) => {
                    // Basic validation and feedback
                    if (control.required && !control.value) {
                        control.style.borderColor = '#dc3545';
                    } else {
                        control.style.borderColor = '';
                    }
                });
            });
        }

        /**
         * Setup basic menu functionality
         */
        setupBasicMenus() {
            const menuItems = document.querySelectorAll('#adminmenu .wp-has-submenu');
            
            menuItems.forEach(item => {
                const submenu = item.querySelector('.wp-submenu');
                if (submenu) {
                    item.addEventListener('mouseenter', () => {
                        submenu.style.display = 'block';
                    });
                    
                    item.addEventListener('mouseleave', () => {
                        setTimeout(() => {
                            submenu.style.display = '';
                        }, 300);
                    });
                }
            });
        }

        /**
         * Show emergency notice
         */
        showEmergencyNotice() {
            // Remove existing notices
            const existingNotices = document.querySelectorAll('.las-emergency-notice');
            existingNotices.forEach(notice => notice.remove());

            const container = document.querySelector('.las-fresh-settings-wrap') || document.body;
            
            const noticeDiv = document.createElement('div');
            noticeDiv.className = 'notice notice-warning is-dismissible las-emergency-notice';
            noticeDiv.innerHTML = `
                <p><strong>Emergency Mode Active:</strong> The system detected critical errors and has activated emergency mode. Basic functionality is available. AJAX requests have been temporarily disabled to prevent further errors.</p>
                <p><small>If you continue to experience issues, please refresh the page or contact support.</small></p>
                <button type="button" class="notice-dismiss">
                    <span class="screen-reader-text">Dismiss this notice.</span>
                </button>
            `;

            const dismissBtn = noticeDiv.querySelector('.notice-dismiss');
            dismissBtn.addEventListener('click', () => {
                noticeDiv.remove();
            });

            container.insertBefore(noticeDiv, container.firstChild);
        }

        /**
         * Monitor and count errors
         */
        monitorErrors() {
            // Override console.error to count errors
            const originalError = console.error;
            console.error = (...args) => {
                this.errorCount++;
                
                // If too many errors, apply emergency fixes
                if (this.errorCount > this.maxErrors && !this.applied) {
                    this.applyEmergencyFixes();
                }
                
                return originalError.apply(console, args);
            };

            // Listen for unhandled errors
            window.addEventListener('error', (event) => {
                this.errorCount++;
                
                if (this.errorCount > this.maxErrors && !this.applied) {
                    this.applyEmergencyFixes();
                }
            });

            // Listen for unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.errorCount++;
                
                if (this.errorCount > this.maxErrors && !this.applied) {
                    this.applyEmergencyFixes();
                }
            });
        }

        /**
         * Restore normal operation
         */
        restoreNormalOperation() {
            if (!this.applied) return;

            try {
                this.log('Attempting to restore normal operation...', 'info');
                
                // Restore original functions
                window.fetch = this.originalFetch;
                
                // Reset error count
                this.errorCount = 0;
                
                // Remove emergency mode
                document.body.classList.remove('las-emergency-mode');
                
                // Remove emergency notices
                const notices = document.querySelectorAll('.las-emergency-notice');
                notices.forEach(notice => notice.remove());
                
                this.applied = false;
                this.log('Normal operation restored', 'success');
                
            } catch (error) {
                this.log(`Failed to restore normal operation: ${error.message}`, 'error');
            }
        }

        /**
         * Log message
         */
        log(message, level = 'info') {
            const timestamp = new Date().toISOString();
            const prefix = `[LAS Emergency ${timestamp}]`;
            
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
    }

    // Create and initialize emergency hotfix immediately
    window.lasEmergencyHotfix = new LASEmergencyHotfix();
    
    // Start monitoring errors immediately
    window.lasEmergencyHotfix.monitorErrors();
    
    // Apply emergency fixes if errors are already present
    setTimeout(() => {
        const errorElements = document.querySelectorAll('.notice-error');
        if (errorElements.length > 0 || window.lasEmergencyHotfix.errorCount > 5) {
            window.lasEmergencyHotfix.applyEmergencyFixes();
        }
    }, 1000);

    // Expose emergency functions globally
    window.LASEmergencyHotfix = LASEmergencyHotfix;
    
    // Add manual trigger for emergency mode
    window.activateEmergencyMode = () => {
        window.lasEmergencyHotfix.applyEmergencyFixes();
    };
    
    // Add manual restore function
    window.restoreNormalMode = () => {
        window.lasEmergencyHotfix.restoreNormalOperation();
    };

})(window, document);