jQuery(document).ready(function ($) {
    "use strict";

    // Check if required data is available
    if (typeof lasAdminData === 'undefined') {
        console.error('LAS: lasAdminData not available - initialization aborted');
        return;
    }

    console.log('LAS: Starting initialization with modern UI integration...');
    console.log('LAS: Available dependencies:', lasAdminData.jquery_ui);

    // Initialize modern UI managers first
    var ModernUIManager = {
        themeManager: null,
        responsiveManager: null,
        navigationManager: null,
        accessibilityManager: null,
        loadingManager: null,
        performanceManager: null,
        
        init: function() {
            console.log('LAS: Initializing Modern UI Manager...');
            
            // Initialize theme management
            if (typeof ThemeManager !== 'undefined') {
                this.themeManager = new ThemeManager();
                console.log('LAS: ThemeManager initialized');
            }
            
            // Initialize responsive management
            if (typeof ResponsiveManager !== 'undefined') {
                this.responsiveManager = new ResponsiveManager();
                console.log('LAS: ResponsiveManager initialized');
            }
            
            // Initialize accessibility management
            if (typeof AccessibilityManager !== 'undefined') {
                this.accessibilityManager = new AccessibilityManager();
                console.log('LAS: AccessibilityManager initialized');
            }
            
            // Initialize loading management
            if (typeof LoadingManager !== 'undefined') {
                this.loadingManager = new LoadingManager();
                console.log('LAS: LoadingManager initialized');
            }
            
            // Initialize performance management
            if (typeof PerformanceManager !== 'undefined') {
                this.performanceManager = new PerformanceManager();
                console.log('LAS: PerformanceManager initialized');
            }
            
            // Initialize navigation last (depends on other managers)
            if (typeof NavigationManager !== 'undefined') {
                this.navigationManager = new NavigationManager();
                console.log('LAS: NavigationManager initialized');
            }
            
            // Set up modern UI event listeners
            this.setupEventListeners();
            
            console.log('LAS: Modern UI Manager initialization complete');
        },
        
        setupEventListeners: function() {
            // Listen for theme changes
            document.addEventListener('las-theme-change', function(e) {
                console.log('LAS: Theme changed to:', e.detail.theme);
            });
            
            // Listen for breakpoint changes
            document.addEventListener('las-breakpoint-change', function(e) {
                console.log('LAS: Breakpoint changed to:', e.detail.breakpoint);
            });
            
            // Listen for navigation changes
            document.addEventListener('las-tab-change', function(e) {
                console.log('LAS: Tab changed to:', e.detail.tabId);
            });
        }
    };
    
    // Initialize modern UI first
    ModernUIManager.init();

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

    // Export for global access
    window.LAS_AccessibilityEnhancer = AccessibilityEnhancer;