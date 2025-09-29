jQuery(document).ready(function ($) {
    "use strict";

    // Enhanced State Manager with localStorage integration and user preferences
    var StateManager = {
        activeTab: null,
        debounceTimer: null,
        userPreferences: {},
        syncTimer: null,
        isOnline: navigator.onLine,
        pendingSync: false,
        
        init: function() {
            this.initializeTabs();
            this.attachEventListeners();
            this.loadUserPreferences();
            this.restoreTabState();
            this.setupPeriodicSync();
            this.setupOnlineOfflineHandlers();
            console.log('LAS: Enhanced State Manager initialized');
        },
        
        initializeTabs: function() {
            if (typeof $.fn.tabs === "function") {
                $("#las-settings-tabs").tabs({
                    activate: function(event, ui) {
                        var tabId = ui.newPanel.attr('id').replace('las-tab-', '');
                        StateManager.saveTabState(tabId);
                    }
                });
            } else {
                console.error("LAS Admin Settings: jQuery UI Tabs not loaded.");
            }
        },
        
        attachEventListeners: function() {
            var self = this;
            
            // Use namespaced events for proper cleanup
            // Handle direct tab clicks
            $('#las-settings-tabs ul li a').on('click.las-state-manager', function() {
                var href = $(this).attr('href');
                if (href && href.indexOf('#las-tab-') === 0) {
                    var tabId = href.replace('#las-tab-', '');
                    self.saveTabState(tabId);
                }
            });
            
            // Handle browser back/forward navigation
            $(window).on('popstate.las-state-manager', function() {
                self.restoreTabState();
            });
            
            // Handle page visibility changes for sync optimization
            $(document).on('visibilitychange.las-state-manager', function() {
                if (!document.hidden && self.pendingSync) {
                    self.syncToServer();
                }
            });
            
            // Handle beforeunload for final sync
            $(window).on('beforeunload.las-state-manager', function() {
                if (self.pendingSync) {
                    self.syncToServer(true); // Synchronous sync on page unload
                }
            });
        },
        
        cleanup: function() {
            // Clear all timers
            clearTimeout(this.debounceTimer);
            clearTimeout(this.syncTimer);
            
            // Remove namespaced event listeners
            $('#las-settings-tabs ul li a').off('.las-state-manager');
            $(window).off('.las-state-manager');
            $(document).off('.las-state-manager');
            
            // Clear localStorage if needed
            if (this.userPreferences.remember_tab_state === false) {
                localStorage.removeItem('las_active_tab');
                localStorage.removeItem('las_user_preferences');
            }
            
            console.log('LAS StateManager: Cleanup completed');
        },
        
        loadUserPreferences: function() {
            var self = this;
            
            // Load from localStorage first for immediate availability
            var localPrefs = localStorage.getItem('las_user_preferences');
            if (localPrefs) {
                try {
                    this.userPreferences = JSON.parse(localPrefs);
                } catch (e) {
                    console.warn('LAS: Failed to parse local preferences:', e);
                    this.userPreferences = this.getDefaultPreferences();
                }
            } else {
                this.userPreferences = this.getDefaultPreferences();
            }
            
            // Sync with server in background
            if (this.isOnline) {
                $.post(lasFreshData.ajax_url, {
                    action: 'las_get_user_preferences',
                    nonce: lasFreshData.nonce
                })
                .done(function(response) {
                    if (response.success && response.data.preferences) {
                        self.userPreferences = response.data.preferences;
                        localStorage.setItem('las_user_preferences', JSON.stringify(self.userPreferences));
                        self.applyPreferences();
                    }
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    console.warn('LAS: Failed to load server preferences:', textStatus);
                });
            }
        },
        
        getDefaultPreferences: function() {
            return {
                ui_theme: 'modern',
                animation_speed: 'normal',
                submenu_visibility: 'enhanced',
                remember_tab_state: true,
                auto_save_changes: false,
                live_preview_enabled: true,
                live_preview_debounce: 150,
                smart_submenu: true,
                enhanced_tooltips: true,
                keyboard_shortcuts: true,
                notification_duration: 5000,
                search_highlight: true,
                compact_mode: false
            };
        },
        
        applyPreferences: function() {
            var prefs = this.userPreferences;
            
            // Apply UI theme
            $('body').removeClass('las-theme-modern las-theme-classic las-theme-minimal')
                     .addClass('las-theme-' + prefs.ui_theme);
            
            // Apply animation speed
            $('body').removeClass('las-anim-slow las-anim-normal las-anim-fast las-anim-none')
                     .addClass('las-anim-' + prefs.animation_speed);
            
            // Apply compact mode
            if (prefs.compact_mode) {
                $('body').addClass('las-compact-mode');
            } else {
                $('body').removeClass('las-compact-mode');
            }
            
            // Update ErrorManager duration if available
            if (window.ErrorManager) {
                window.ErrorManager.defaultDuration = prefs.notification_duration;
            }
        },
        
        saveTabState: function(tabId) {
            var self = this;
            
            // Update active tab
            this.activeTab = tabId;
            
            // Save to localStorage for immediate persistence
            localStorage.setItem('las_active_tab', tabId);
            
            // Update URL hash without triggering page scroll
            if (history.replaceState) {
                var newUrl = window.location.pathname + window.location.search + '#tab-' + tabId;
                history.replaceState(null, null, newUrl);
            }
            
            // Mark for sync if remember_tab_state is enabled
            if (this.userPreferences.remember_tab_state) {
                this.pendingSync = true;
                
                // Debounce server sync to avoid too many requests
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(function() {
                    self.syncTabStateToServer(tabId);
                }, 500);
            }
        },
        
        syncTabStateToServer: function(tabId) {
            var self = this;
            
            if (!this.isOnline) {
                console.log('LAS: Offline - tab state will sync when online');
                return;
            }
            
            $.post(lasFreshData.ajax_url, {
                action: 'las_save_tab_state',
                tab: tabId,
                nonce: lasFreshData.nonce
            })
            .done(function(response) {
                if (response.success) {
                    console.log('LAS: Tab state synchronized to server:', tabId);
                    self.pendingSync = false;
                } else {
                    console.warn('LAS: Failed to sync tab state:', response.data);
                    
                    // Show warning notification for tab sync failure
                    if (window.ErrorManager) {
                        window.ErrorManager.showWarning('Nie udało się zapisać stanu zakładki. Zostanie przywrócona przy następnym odświeżeniu.', {
                            duration: 4000
                        });
                    }
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('LAS: AJAX error during tab state sync:', textStatus, errorThrown);
                
                // Only show error notification for critical failures
                if (textStatus !== 'abort' && window.ErrorManager) {
                    window.ErrorManager.showWarning('Błąd podczas zapisywania stanu zakładki', {
                        duration: 3000
                    });
                }
            });
        },
        
        restoreTabState: function() {
            var savedTab = null;
            
            // First, check URL hash
            var hash = window.location.hash;
            if (hash && hash.indexOf('#tab-') === 0) {
                savedTab = hash.replace('#tab-', '');
            }
            
            // If no URL hash and remember_tab_state is enabled, check localStorage
            if (!savedTab && this.userPreferences.remember_tab_state) {
                savedTab = localStorage.getItem('las_active_tab');
            }
            
            // If no localStorage, check server-side data attribute
            if (!savedTab) {
                savedTab = $('#las-settings-tabs').data('active-tab');
            }
            
            // Default to 'general' if nothing found
            if (!savedTab) {
                savedTab = 'general';
            }
            
            // Activate the tab
            this.activateTab(savedTab);
        },
        
        activateTab: function(tabId) {
            var tabIndex = this.getTabIndex(tabId);
            if (tabIndex !== -1) {
                $("#las-settings-tabs").tabs("option", "active", tabIndex);
                this.activeTab = tabId;
                if (this.userPreferences.remember_tab_state) {
                    localStorage.setItem('las_active_tab', tabId);
                }
            }
        },
        
        getTabIndex: function(tabId) {
            var tabIds = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
            return tabIds.indexOf(tabId);
        },
        
        getCurrentTab: function() {
            return this.activeTab || 'general';
        },
        
        setUserPreference: function(key, value) {
            this.userPreferences[key] = value;
            localStorage.setItem('las_user_preferences', JSON.stringify(this.userPreferences));
            this.applyPreferences();
            this.pendingSync = true;
            
            // Debounce preference sync
            var self = this;
            clearTimeout(this.syncTimer);
            this.syncTimer = setTimeout(function() {
                self.syncPreferencesToServer();
            }, 1000);
        },
        
        getUserPreference: function(key, defaultValue) {
            return this.userPreferences.hasOwnProperty(key) ? this.userPreferences[key] : defaultValue;
        },
        
        syncPreferencesToServer: function() {
            var self = this;
            
            if (!this.isOnline) {
                console.log('LAS: Offline - preferences will sync when online');
                $(document).trigger('las:offline');
                return;
            }
            
            $(document).trigger('las:sync:start');
            
            $.post(lasFreshData.ajax_url, {
                action: 'las_save_user_preferences',
                preferences: JSON.stringify(this.userPreferences),
                nonce: lasFreshData.nonce
            })
            .done(function(response) {
                if (response.success) {
                    console.log('LAS: User preferences synchronized to server');
                    self.pendingSync = false;
                    $(document).trigger('las:sync:success');
                } else {
                    console.warn('LAS: Failed to sync preferences:', response.data);
                    $(document).trigger('las:sync:error');
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('LAS: AJAX error during preferences sync:', textStatus, errorThrown);
                $(document).trigger('las:sync:error');
            });
        },
        
        syncToServer: function(synchronous) {
            if (this.pendingSync) {
                if (synchronous) {
                    // Synchronous request for page unload
                    navigator.sendBeacon(lasFreshData.ajax_url, new URLSearchParams({
                        action: 'las_sync_user_state',
                        session_data: JSON.stringify({
                            active_tab: this.activeTab,
                            ui_preferences: this.userPreferences
                        }),
                        nonce: lasFreshData.nonce
                    }));
                } else {
                    this.syncPreferencesToServer();
                    if (this.activeTab) {
                        this.syncTabStateToServer(this.activeTab);
                    }
                }
            }
        },
        
        setupPeriodicSync: function() {
            var self = this;
            
            // Sync every 5 minutes if there are pending changes
            setInterval(function() {
                if (self.pendingSync && self.isOnline && !document.hidden) {
                    self.syncToServer();
                }
            }, 300000); // 5 minutes
        },
        
        setupOnlineOfflineHandlers: function() {
            var self = this;
            
            $(window).on('online', function() {
                self.isOnline = true;
                console.log('LAS: Connection restored - syncing pending changes');
                $(document).trigger('las:online');
                if (self.pendingSync) {
                    self.syncToServer();
                }
            });
            
            $(window).on('offline', function() {
                self.isOnline = false;
                console.log('LAS: Connection lost - changes will sync when online');
                $(document).trigger('las:offline');
            });
        },
        
        resetToDefaults: function() {
            var self = this;
            
            if (!confirm('Czy na pewno chcesz zresetować wszystkie preferencje do wartości domyślnych?')) {
                return;
            }
            
            $.post(lasFreshData.ajax_url, {
                action: 'las_reset_user_state',
                nonce: lasFreshData.nonce
            })
            .done(function(response) {
                if (response.success) {
                    self.userPreferences = self.getDefaultPreferences();
                    localStorage.setItem('las_user_preferences', JSON.stringify(self.userPreferences));
                    localStorage.setItem('las_active_tab', 'general');
                    self.applyPreferences();
                    self.activateTab('general');
                    
                    if (window.ErrorManager) {
                        window.ErrorManager.showSuccess('Preferencje zostały zresetowane do wartości domyślnych', {
                            duration: 4000
                        });
                    }
                } else {
                    if (window.ErrorManager) {
                        window.ErrorManager.showError('Nie udało się zresetować preferencji: ' + (response.data.message || 'Nieznany błąd'), {
                            duration: 6000
                        });
                    }
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('LAS: Error resetting preferences:', textStatus, errorThrown);
                if (window.ErrorManager) {
                    window.ErrorManager.showError('Błąd podczas resetowania preferencji', {
                        duration: 6000
                    });
                }
            });
        }
    };

    // Initialize Error Manager
    var ErrorManager = {
        notifications: [],
        container: null,
        maxNotifications: 5,
        defaultDuration: 5000,
        
        init: function() {
            this.createContainer();
            this.bindEvents();
            console.log('LAS: Error Manager initialized');
        },
        
        createContainer: function() {
            if (!this.container) {
                this.container = $('<div id="las-notifications" class="las-notifications-container"></div>');
                $('body').append(this.container);
            }
        },
        
        showError: function(message, options) {
            return this.showNotification(message, 'error', options);
        },
        
        showSuccess: function(message, options) {
            return this.showNotification(message, 'success', options);
        },
        
        showWarning: function(message, options) {
            return this.showNotification(message, 'warning', options);
        },
        
        showInfo: function(message, options) {
            return this.showNotification(message, 'info', options);
        },
        
        showNotification: function(message, type, options) {
            type = type || 'info';
            options = options || {};
            
            var notification = {
                id: Date.now() + Math.random(),
                message: message,
                type: type,
                timestamp: new Date(),
                dismissible: options.dismissible !== false,
                duration: options.duration || this.defaultDuration,
                persistent: options.persistent || false,
                actions: options.actions || []
            };
            
            // Limit number of notifications
            if (this.notifications.length >= this.maxNotifications) {
                this.removeOldestNotification();
            }
            
            this.notifications.push(notification);
            this.displayNotification(notification);
            
            // Log to console for debugging
            this.logNotification(notification);
            
            return notification.id;
        },
        
        displayNotification: function(notification) {
            var self = this;
            var iconClass = this.getIconClass(notification.type);
            var actionsHtml = this.buildActionsHtml(notification.actions);
            
            var $notification = $(`
                <div class="las-notification las-notification-${notification.type}" data-id="${notification.id}">
                    <div class="las-notification-content">
                        <div class="las-notification-icon">
                            <span class="${iconClass}"></span>
                        </div>
                        <div class="las-notification-body">
                            <div class="las-notification-message">${this.escapeHtml(notification.message)}</div>
                            ${actionsHtml}
                        </div>
                        ${notification.dismissible ? '<button class="las-notification-dismiss" aria-label="Zamknij" title="Zamknij powiadomienie">&times;</button>' : ''}
                    </div>
                    <div class="las-notification-progress"></div>
                </div>
            `);
            
            // Add to container with animation
            this.container.append($notification);
            
            // Trigger entrance animation
            setTimeout(function() {
                $notification.addClass('las-notification-visible');
            }, 10);
            
            // Auto-dismiss if not persistent
            if (!notification.persistent && notification.duration > 0) {
                this.scheduleAutoDismiss(notification, $notification);
            }
            
            // Bind dismiss event
            if (notification.dismissible) {
                $notification.find('.las-notification-dismiss').on('click', function() {
                    self.dismissNotification(notification.id);
                });
            }
            
            // Bind action events
            $notification.find('.las-notification-action').on('click', function() {
                var actionIndex = $(this).data('action-index');
                var action = notification.actions[actionIndex];
                if (action && typeof action.callback === 'function') {
                    action.callback(notification);
                    if (action.dismissOnClick !== false) {
                        self.dismissNotification(notification.id);
                    }
                }
            });
        },
        
        scheduleAutoDismiss: function(notification, $notification) {
            var self = this;
            var $progress = $notification.find('.las-notification-progress');
            
            // Animate progress bar
            $progress.css({
                'width': '100%',
                'transition': `width ${notification.duration}ms linear`
            });
            
            setTimeout(function() {
                $progress.css('width', '0%');
            }, 50);
            
            // Schedule dismissal
            setTimeout(function() {
                self.dismissNotification(notification.id);
            }, notification.duration);
        },
        
        dismissNotification: function(notificationId) {
            var self = this;
            var $notification = this.container.find(`[data-id="${notificationId}"]`);
            
            if ($notification.length) {
                $notification.removeClass('las-notification-visible').addClass('las-notification-dismissing');
                
                setTimeout(function() {
                    $notification.remove();
                    self.removeNotificationFromArray(notificationId);
                }, 300);
            }
        },
        
        removeNotificationFromArray: function(notificationId) {
            this.notifications = this.notifications.filter(function(notification) {
                return notification.id !== notificationId;
            });
        },
        
        removeOldestNotification: function() {
            if (this.notifications.length > 0) {
                var oldest = this.notifications[0];
                this.dismissNotification(oldest.id);
            }
        },
        
        clearAllNotifications: function() {
            var self = this;
            this.notifications.forEach(function(notification) {
                self.dismissNotification(notification.id);
            });
        },
        
        getIconClass: function(type) {
            var icons = {
                'success': 'dashicons dashicons-yes-alt',
                'error': 'dashicons dashicons-dismiss',
                'warning': 'dashicons dashicons-warning',
                'info': 'dashicons dashicons-info'
            };
            return icons[type] || icons.info;
        },
        
        buildActionsHtml: function(actions) {
            if (!actions || actions.length === 0) {
                return '';
            }
            
            var actionsHtml = '<div class="las-notification-actions">';
            actions.forEach(function(action, index) {
                var buttonClass = action.primary ? 'las-notification-action-primary' : 'las-notification-action-secondary';
                actionsHtml += `<button class="las-notification-action ${buttonClass}" data-action-index="${index}">${action.label}</button>`;
            });
            actionsHtml += '</div>';
            
            return actionsHtml;
        },
        
        escapeHtml: function(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        logNotification: function(notification) {
            var logMethod = console.log;
            switch (notification.type) {
                case 'error':
                    logMethod = console.error;
                    break;
                case 'warning':
                    logMethod = console.warn;
                    break;
                case 'info':
                    logMethod = console.info;
                    break;
            }
            
            logMethod('LAS Notification [' + notification.type.toUpperCase() + ']:', notification.message);
        },
        
        bindEvents: function() {
            var self = this;
            
            // Handle keyboard shortcuts with namespacing
            $(document).on('keydown.las-error-manager', function(e) {
                // Escape key to dismiss all notifications
                if (e.key === 'Escape' && self.notifications.length > 0) {
                    self.clearAllNotifications();
                }
            });
            
            // Handle window focus to pause auto-dismiss with namespacing
            $(window).on('blur.las-error-manager', function() {
                self.container.addClass('las-notifications-paused');
            }).on('focus.las-error-manager', function() {
                self.container.removeClass('las-notifications-paused');
            });
        },
        
        cleanup: function() {
            // Clear all notifications
            this.clearAllNotifications();
            
            // Remove namespaced event listeners
            $(document).off('.las-error-manager');
            $(window).off('.las-error-manager');
            
            // Remove container
            if (this.container) {
                this.container.remove();
                this.container = null;
            }
            
            console.log('LAS ErrorManager: Cleanup completed');
        },
        
        // Public API methods
        getActiveNotifications: function() {
            return this.notifications.slice();
        },
        
        hasNotifications: function() {
            return this.notifications.length > 0;
        },
        
        getNotificationCount: function() {
            return this.notifications.length;
        }
    };

    // Initialize Security Manager
    var SecurityManager = {
        nonceRefreshInterval: 43200000, // 12 hours in milliseconds
        refreshTimer: null,
        isRefreshing: false,
        
        init: function() {
            this.setupNonceRefresh();
            this.setupSecurityMonitoring();
            console.log('LAS: Security Manager initialized');
        },
        
        setupNonceRefresh: function() {
            var self = this;
            
            // Schedule automatic nonce refresh
            this.refreshTimer = setInterval(function() {
                self.refreshNonce();
            }, this.nonceRefreshInterval);
            
            // Refresh nonce on page focus if it's been a while
            $(window).on('focus.las-security', function() {
                var lastRefresh = localStorage.getItem('las_last_nonce_refresh');
                if (lastRefresh && (Date.now() - parseInt(lastRefresh)) > self.nonceRefreshInterval) {
                    self.refreshNonce();
                }
            });
        },
        
        refreshNonce: function() {
            var self = this;
            
            if (this.isRefreshing) {
                return;
            }
            
            this.isRefreshing = true;
            
            $.post(lasFreshData.ajax_url, {
                action: 'las_refresh_nonce'
            })
            .done(function(response) {
                if (response.success && response.data.nonce) {
                    lasFreshData.nonce = response.data.nonce;
                    localStorage.setItem('las_last_nonce_refresh', Date.now().toString());
                    console.log('LAS: Security nonce refreshed');
                    $(document).trigger('las:nonce:refreshed', response.data.nonce);
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.warn('LAS: Failed to refresh nonce:', textStatus);
                if (window.ErrorManager) {
                    window.ErrorManager.showWarning('Nie udało się odświeżyć tokenu bezpieczeństwa. Odśwież stronę jeśli wystąpią problemy.', {
                        duration: 8000
                    });
                }
            })
            .always(function() {
                self.isRefreshing = false;
            });
        },
        
        setupSecurityMonitoring: function() {
            var self = this;
            
            // Monitor for security-related AJAX errors
            $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
                if (ajaxSettings.url === lasFreshData.ajax_url) {
                    try {
                        var response = JSON.parse(jqXHR.responseText);
                        if (response && response.data && response.data.code === 'invalid_nonce') {
                            console.warn('LAS: Invalid nonce detected, refreshing...');
                            self.refreshNonce();
                        } else if (response && response.data && response.data.code === 'rate_limit_exceeded') {
                            self.handleRateLimit(response.data);
                        }
                    } catch (e) {
                        // Response is not JSON, ignore
                    }
                }
            });
        },
        
        handleRateLimit: function(errorData) {
            var retryAfter = errorData.retry_after || 300;
            var message = 'Przekroczono limit żądań. Spróbuj ponownie za ' + Math.ceil(retryAfter / 60) + ' minut.';
            
            if (window.ErrorManager) {
                window.ErrorManager.showError(message, {
                    duration: 10000,
                    persistent: true,
                    actions: [{
                        label: 'OK',
                        callback: function() {
                            // Disable form interactions temporarily
                            $('form input, form select, form textarea').prop('disabled', true);
                            setTimeout(function() {
                                $('form input, form select, form textarea').prop('disabled', false);
                            }, retryAfter * 1000);
                        }
                    }]
                });
            }
            
            // Log rate limit event
            this.logSecurityEvent('rate_limit_client', {
                retry_after: retryAfter,
                timestamp: Date.now()
            });
        },
        
        logSecurityEvent: function(eventType, data) {
            // Store security events locally for debugging
            var events = JSON.parse(localStorage.getItem('las_security_events') || '[]');
            events.unshift({
                type: eventType,
                data: data,
                timestamp: Date.now(),
                url: window.location.href
            });
            
            // Keep only last 50 events
            if (events.length > 50) {
                events = events.slice(0, 50);
            }
            
            localStorage.setItem('las_security_events', JSON.stringify(events));
        },
        
        getSecurityStatus: function() {
            return $.post(lasFreshData.ajax_url, {
                action: 'las_get_security_status',
                nonce: lasFreshData.nonce
            });
        },
        
        clearSecurityLog: function() {
            return $.post(lasFreshData.ajax_url, {
                action: 'las_clear_security_log',
                nonce: lasFreshData.nonce
            });
        },
        
        cleanup: function() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
            }
            $(window).off('.las-security');
            console.log('LAS SecurityManager: Cleanup completed');
        }
    };

    // Initialize Security Manager
    SecurityManager.init();

    // Initialize State Manager
    StateManager.init();

    // Initialize Error Manager
    ErrorManager.init();
    
    // Resource Manager for performance optimization
    var ResourceManager = {
        cleanupHandlers: [],
        isCleanedUp: false,
        
        init: function() {
            this.setupCleanupHandlers();
            console.log('LAS: ResourceManager initialized');
        },
        
        setupCleanupHandlers: function() {
            var self = this;
            
            // Cleanup on page unload
            $(window).on('beforeunload.las-resource-manager', function() {
                self.cleanup();
            });
            
            // Cleanup on page visibility change (when tab becomes hidden for extended time)
            var hiddenTimer = null;
            $(document).on('visibilitychange.las-resource-manager', function() {
                if (document.hidden) {
                    // Start timer for extended hidden state
                    hiddenTimer = setTimeout(function() {
                        self.partialCleanup();
                    }, 300000); // 5 minutes
                } else {
                    // Cancel timer if page becomes visible again
                    if (hiddenTimer) {
                        clearTimeout(hiddenTimer);
                        hiddenTimer = null;
                    }
                }
            });
        },
        
        registerCleanupHandler: function(handler) {
            if (typeof handler === 'function') {
                this.cleanupHandlers.push(handler);
            }
        },
        
        partialCleanup: function() {
            console.log('LAS ResourceManager: Performing partial cleanup...');
            
            // Clear caches but keep essential functionality
            if (window.LivePreviewManager && typeof window.LivePreviewManager.cleanupExpiredCache === 'function') {
                window.LivePreviewManager.cleanupExpiredCache();
            }
            
            // Clear old notifications
            if (window.ErrorManager && typeof window.ErrorManager.clearAllNotifications === 'function') {
                window.ErrorManager.clearAllNotifications();
            }
        },
        
        cleanup: function() {
            if (this.isCleanedUp) {
                return;
            }
            
            console.log('LAS ResourceManager: Performing full cleanup...');
            
            // Call all registered cleanup handlers
            this.cleanupHandlers.forEach(function(handler) {
                try {
                    handler();
                } catch (error) {
                    console.warn('LAS ResourceManager: Error in cleanup handler:', error);
                }
            });
            
            // Cleanup managers
            if (window.SecurityManager && typeof window.SecurityManager.cleanup === 'function') {
                window.SecurityManager.cleanup();
            }
            
            if (window.StateManager && typeof window.StateManager.cleanup === 'function') {
                window.StateManager.cleanup();
            }
            
            if (window.ErrorManager && typeof window.ErrorManager.cleanup === 'function') {
                window.ErrorManager.cleanup();
            }
            
            if (window.LivePreviewManager && typeof window.LivePreviewManager.cleanup === 'function') {
                window.LivePreviewManager.cleanup();
            }
            
            // Remove all namespaced event listeners
            $(document).off('.las-resource-manager');
            $(window).off('.las-resource-manager');
            
            this.isCleanedUp = true;
            console.log('LAS ResourceManager: Full cleanup completed');
        }
    };

    // Initialize Resource Manager
    ResourceManager.init();

    // Make managers globally available
    window.ErrorManager = ErrorManager;
    window.StateManager = StateManager;
    window.ResourceManager = ResourceManager;
    
    // Initialize Preferences Panel
    initPreferencesPanel();
    
    /**
     * Initialize Lazy Loading System for Advanced Settings Sections
     * Improves initial page load performance by deferring non-critical sections
     */
    function initLazyLoadingSystem() {
        var lazyLoadedSections = new Set();
        var intersectionObserver = null;
        
        // Check if Intersection Observer is supported
        if ('IntersectionObserver' in window) {
            intersectionObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        loadAdvancedSection(entry.target);
                        intersectionObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px', // Load when section is 50px away from viewport
                threshold: 0.1
            });
        }
        
        // Identify advanced settings sections for lazy loading
        var advancedSections = [
            '#las-tab-advanced .field-row[data-setting*="shadow"]',
            '#las-tab-advanced .field-row[data-setting*="gradient"]',
            '#las-tab-advanced .field-row[data-setting*="border_radius"]',
            '#las-tab-logos .field-row',
            '.las-advanced-options'
        ];
        
        advancedSections.forEach(function(selector) {
            $(selector).each(function() {
                var $section = $(this);
                
                // Skip if already processed
                if ($section.hasClass('las-lazy-processed')) {
                    return;
                }
                
                // Mark as processed
                $section.addClass('las-lazy-processed');
                
                // Add lazy loading placeholder
                var $placeholder = $('<div class="las-lazy-placeholder">').html(
                    '<div class="las-lazy-spinner"></div>' +
                    '<span>Ładowanie zaawansowanych opcji...</span>'
                );
                
                // Store original content
                var originalContent = $section.html();
                $section.data('las-original-content', originalContent);
                
                // Replace with placeholder initially
                $section.html($placeholder.html()).addClass('las-lazy-loading');
                
                // Use Intersection Observer if available, otherwise load on tab activation
                if (intersectionObserver) {
                    intersectionObserver.observe($section[0]);
                } else {
                    // Fallback: load when parent tab becomes active
                    var tabId = $section.closest('[id^="las-tab-"]').attr('id');
                    if (tabId) {
                        $(document).on('las:tab:activated', function(e, activeTabId) {
                            if (('#las-tab-' + activeTabId) === ('#' + tabId)) {
                                loadAdvancedSection($section[0]);
                            }
                        });
                    }
                }
            });
        });
        
        function loadAdvancedSection(element) {
            var $element = $(element);
            
            if (lazyLoadedSections.has(element) || !$element.hasClass('las-lazy-loading')) {
                return;
            }
            
            lazyLoadedSections.add(element);
            
            // Simulate loading delay for better UX
            setTimeout(function() {
                var originalContent = $element.data('las-original-content');
                if (originalContent) {
                    $element.html(originalContent);
                    $element.removeClass('las-lazy-loading').addClass('las-lazy-loaded');
                    
                    // Reinitialize any components in the loaded section
                    reinitializeComponents($element);
                    
                    // Trigger custom event
                    $(document).trigger('las:section:loaded', [$element]);
                }
            }, Math.random() * 200 + 100); // Random delay between 100-300ms
        }
        
        function reinitializeComponents($section) {
            // Reinitialize color pickers
            $section.find('.las-color-picker').each(function() {
                if ($.fn.wpColorPicker) {
                    $(this).wpColorPicker();
                }
            });
            
            // Reinitialize sliders
            $section.find('.las-slider').each(function() {
                if ($.fn.slider) {
                    $(this).slider();
                }
            });
            
            // Reinitialize select2 dropdowns
            $section.find('.las-select2').each(function() {
                if ($.fn.select2) {
                    $(this).select2();
                }
            });
            
            // Reinitialize tooltips
            $section.find('[data-tooltip]').each(function() {
                if ($.fn.tooltip) {
                    $(this).tooltip();
                }
            });
            
            // Update field visibility based on dependencies
            if (typeof lasFreshUpdateFieldVisibility === 'function') {
                lasFreshUpdateFieldVisibility();
            }
        }
        
        // Register cleanup handler
        if (window.ResourceManager) {
            window.ResourceManager.registerCleanupHandler(function() {
                if (intersectionObserver) {
                    intersectionObserver.disconnect();
                }
                lazyLoadedSections.clear();
            });
        }
        
        // Emit tab activation events for fallback loading
        $('#las-settings-tabs').on('tabsactivate', function(event, ui) {
            var tabId = ui.newPanel.attr('id').replace('las-tab-', '');
            $(document).trigger('las:tab:activated', [tabId]);
        });
        
        console.log('LAS: Lazy loading system initialized for', advancedSections.length, 'section types');
    }
    
    /**
     * Performance Dashboard for monitoring cache performance and resource usage
     */
    function initPerformanceDashboard() {
        var performanceEnabled = false;
        var $dashboard = null;
        
        // Add performance toggle to admin bar or settings
        function createPerformanceToggle() {
            var $toggle = $('<div class="las-performance-toggle">')
                .html('<button type="button" class="button button-secondary">Performance Stats</button>')
                .css({
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 999998,
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '5px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                });
            
            $toggle.find('button').on('click', function() {
                togglePerformanceDashboard();
            });
            
            $('body').append($toggle);
        }
        
        function togglePerformanceDashboard() {
            if (performanceEnabled) {
                hidePerformanceDashboard();
            } else {
                showPerformanceDashboard();
            }
        }
        
        function showPerformanceDashboard() {
            performanceEnabled = true;
            
            $dashboard = $('<div class="las-performance-dashboard">')
                .css({
                    position: 'fixed',
                    top: '50px',
                    left: '20px',
                    width: '300px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    color: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    zIndex: 999999,
                    fontFamily: 'monospace',
                    maxHeight: '400px',
                    overflowY: 'auto'
                })
                .html('<div class="las-perf-header"><strong>Performance Dashboard</strong> <button class="las-perf-close" style="float: right; background: none; border: none; color: white; cursor: pointer;">&times;</button></div><div class="las-perf-content">Loading...</div>');
            
            $dashboard.find('.las-perf-close').on('click', hidePerformanceDashboard);
            $('body').append($dashboard);
            
            updatePerformanceStats();
            
            // Update stats every 5 seconds
            var updateInterval = setInterval(function() {
                if (performanceEnabled) {
                    updatePerformanceStats();
                } else {
                    clearInterval(updateInterval);
                }
            }, 5000);
        }
        
        function hidePerformanceDashboard() {
            performanceEnabled = false;
            if ($dashboard) {
                $dashboard.remove();
                $dashboard = null;
            }
        }
        
        function updatePerformanceStats() {
            if (!$dashboard) return;
            
            var stats = {
                livePreview: window.LivePreviewManager ? window.LivePreviewManager.getStats() : {},
                stateManager: {
                    activeTab: window.StateManager ? window.StateManager.getCurrentTab() : 'unknown',
                    pendingSync: window.StateManager ? window.StateManager.pendingSync : false
                },
                errorManager: {
                    activeNotifications: window.ErrorManager ? window.ErrorManager.getNotificationCount() : 0
                },
                browser: {
                    userAgent: navigator.userAgent.substring(0, 50) + '...',
                    onLine: navigator.onLine,
                    cookieEnabled: navigator.cookieEnabled,
                    language: navigator.language
                },
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
                } : { message: 'Memory info not available' }
            };
            
            var html = '<div class="las-perf-section">';
            html += '<strong>Live Preview Cache:</strong><br>';
            html += 'Size: ' + (stats.livePreview.cssCacheSize || 0) + ' entries<br>';
            html += 'Hits: ' + (stats.livePreview.cacheHits || 0) + '<br>';
            html += 'Misses: ' + (stats.livePreview.cacheMisses || 0) + '<br>';
            html += 'Hit Ratio: ' + (stats.livePreview.cacheHitRatio || '0%') + '<br>';
            html += 'Queue: ' + (stats.livePreview.queueLength || 0) + ' items<br>';
            html += '</div>';
            
            html += '<div class="las-perf-section">';
            html += '<strong>State Management:</strong><br>';
            html += 'Active Tab: ' + stats.stateManager.activeTab + '<br>';
            html += 'Pending Sync: ' + (stats.stateManager.pendingSync ? 'Yes' : 'No') + '<br>';
            html += 'Notifications: ' + stats.errorManager.activeNotifications + '<br>';
            html += '</div>';
            
            if (stats.memory.used) {
                html += '<div class="las-perf-section">';
                html += '<strong>Memory Usage:</strong><br>';
                html += 'Used: ' + stats.memory.used + '<br>';
                html += 'Total: ' + stats.memory.total + '<br>';
                html += 'Limit: ' + stats.memory.limit + '<br>';
                html += '</div>';
            }
            
            html += '<div class="las-perf-section">';
            html += '<strong>Connection:</strong><br>';
            html += 'Online: ' + (stats.browser.onLine ? 'Yes' : 'No') + '<br>';
            html += 'Cookies: ' + (stats.browser.cookieEnabled ? 'Enabled' : 'Disabled') + '<br>';
            html += '</div>';
            
            $dashboard.find('.las-perf-content').html(html);
        }
        
        // Initialize performance dashboard in development mode
        if (window.location.search.includes('las_debug=1') || localStorage.getItem('las_performance_dashboard') === 'enabled') {
            createPerformanceToggle();
        }
        
        // Register cleanup
        if (window.ResourceManager) {
            window.ResourceManager.registerCleanupHandler(function() {
                hidePerformanceDashboard();
            });
        }
    }
    
    // Initialize performance dashboard
    initPerformanceDashboard();
    
    // Global error handler for uncaught JavaScript errors
    window.addEventListener('error', function(event) {
        if (window.ErrorManager) {
            var errorMessage = 'Wystąpił nieoczekiwany błąd JavaScript';
            
            // Don't show notifications for script loading errors or external scripts
            if (event.filename && (
                event.filename.includes('live-admin-styler') || 
                event.filename.includes('admin-settings') ||
                event.filename.includes('live-preview')
            )) {
                window.ErrorManager.showError(errorMessage, {
                    duration: 6000,
                    actions: [{
                        label: 'Zgłoś problem',
                        callback: function() {
                            // Report error to server
                            if (typeof lasFreshData !== 'undefined' && lasFreshData.ajax_url) {
                                $.post(lasFreshData.ajax_url, {
                                    action: 'las_report_error',
                                    nonce: lasFreshData.nonce,
                                    message: event.message,
                                    type: 'javascript',
                                    source: event.filename,
                                    line: event.lineno,
                                    stack: event.error ? event.error.stack : '',
                                    url: window.location.href
                                });
                            }
                        }
                    }]
                });
            }
        }
        
        // Log to console for debugging
        console.error('LAS Global Error:', event.message, 'at', event.filename + ':' + event.lineno);
    });
    
    // Global handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        if (window.ErrorManager) {
            window.ErrorManager.showError('Wystąpił błąd podczas przetwarzania żądania', {
                duration: 5000
            });
        }
        
        console.error('LAS Unhandled Promise Rejection:', event.reason);
    });

    // Initialize Enhanced Settings Search and Organization
    initSettingsSearchAndOrganization();
    
    // Initialize Enhanced Submenu Visibility System
    initSubmenuVisibilitySystem();
    
    // Initialize Live Preview Integration
    initLivePreviewIntegration();
    
    // Initialize Lazy Loading for Advanced Settings
    initLazyLoadingSystem();

    // Function to update visibility of dependent fields
    function lasFreshUpdateFieldVisibility() {
        // Handle checkbox-controlled dependencies
        $('[data-dependency-trigger="true"][type="checkbox"]').each(function () {
            var $trigger = $(this);
            var triggerId = $trigger.attr('id');
            var isChecked = $trigger.is(':checked');

            $('.field-row[data-dependency-id="' + triggerId + '"]').each(function () {
                var $dependent = $(this);
                var requiredValue = String($dependent.data('dependency-value')); // Ensure string comparison
                var currentTriggerValue = isChecked ? '1' : '0';

                if (currentTriggerValue === requiredValue) {
                    $dependent.slideDown('fast').removeClass('las-hidden');
                } else {
                    $dependent.slideUp('fast').addClass('las-hidden');
                }
            });
        });

        // Handle select-controlled dependencies (like background type, shadow type, border radius type)
        $('select[data-dependency-trigger="true"]').each(function () {
            var $trigger = $(this);
            var triggerId = $trigger.attr('id');
            var selectedValue = $trigger.val();

            // Hide all potentially dependent sections first for this trigger
            $('.field-row[data-dependency-id="' + triggerId + '"]').hide().addClass('las-hidden');
            // Show the one that matches the current selection
            $('.field-row[data-dependency-id="' + triggerId + '"][data-dependency-value="' + selectedValue + '"]').slideDown('fast').removeClass('las-hidden');
        });
        
        // Specific for Google Font input visibility
        $("select.las-font-family-select").each(function () {
            var $select = $(this);
            var $googleFontFieldWrapper = $select.closest(".las-font-selector-container").find(".google-font-field-wrapper");
            if ($select.val() === "google") {
                $googleFontFieldWrapper.slideDown("fast");
            } else {
                $googleFontFieldWrapper.slideUp("fast");
            }
        });
    }

    // Initial visibility check on page load
    lasFreshUpdateFieldVisibility();

    // Attach change listeners to trigger visibility updates
    $('#las-fresh-settings-form').on('change', '[data-dependency-trigger="true"], .las-font-family-select', function() {
        lasFreshUpdateFieldVisibility();
    });


    // Image Uploader
    var mediaUploaderInstance;
    $('body').on('click', '.las-upload-image-button', function (e) {
        e.preventDefault();
        var $button = $(this);
        var $urlField = $button.siblings('.las-image-url-field');
        var $previewContainer = $button.closest('.field-row').next('.las-image-preview');
        var $removeButton = $button.siblings('.las-remove-image-button');

        if (mediaUploaderInstance) {
            mediaUploaderInstance.open();
            return;
        }
        mediaUploaderInstance = wp.media({
            title: 'Wybierz obrazek', // Consider using lasFreshData for translations if needed
            button: { text: 'Użyj tego obrazka' },
            multiple: false,
            library: { type: 'image' }
        });
        mediaUploaderInstance.on('select', function () {
            var attachment = mediaUploaderInstance.state().get('selection').first().toJSON();
            $urlField.val(attachment.url).trigger('change'); 
            var $imgPreview = $previewContainer.find('img');
            if (!$imgPreview.length) {
                $imgPreview = $('<img src="" alt="Podgląd" style="max-width:200px;height:auto;" />');
                $previewContainer.html($imgPreview);
            }
            $imgPreview.attr('src', attachment.url).show();
            $removeButton.show();
        });
        mediaUploaderInstance.open();
    });

    $('body').on('click', '.las-remove-image-button', function (e) {
        e.preventDefault();
        var $button = $(this);
        var $urlField = $button.siblings('.las-image-url-field');
        var $previewContainer = $button.closest('.field-row').next('.las-image-preview');
        $urlField.val('').trigger('change'); 
        $previewContainer.find('img').attr('src', '').hide();
        $button.hide();
    });

    $('.las-fresh-color-picker').wpColorPicker({
         clear: function() {
            $(this).val('').trigger('change');
        }
    });

    $('.las-slider').trigger('init.lasSlider');


    // Template Application AJAX
    $('#las-apply-template-button').on('click', function () {
        var $button = $(this);
        var templateKey = $('#active_template_selector').val();
        var $spinner = $('#las-template-ajax-spinner');
        var $responseEl = $('#las-template-ajax-response');

        $button.prop('disabled', true);
        $spinner.addClass('is-active');
        $responseEl.empty().removeClass('notice-success notice-error');

        $.post(lasFreshData.ajax_url, { // lasFreshData is localized
            action: 'las_fresh_apply_template', 
            template: templateKey,
            nonce: lasFreshData.nonce,
        })
        .done(function (response) {
            if (response.success) {
                $responseEl.css('color','green').text(response.data.message);
                
                // Show success notification
                if (window.ErrorManager) {
                    window.ErrorManager.showSuccess('Szablon został pomyślnie zastosowany!', {
                        duration: 4000
                    });
                }
                var newSettings = response.data.settings;

                for (var optKey in newSettings) {
                    if (newSettings.hasOwnProperty(optKey)) {
                        // Use localized option_name from lasFreshData
                        var fieldName = lasFreshData.option_name + '[' + optKey + ']';
                        var $field = $('[name="' + fieldName + '"]'); 

                        if ($field.length) {
                            var newValue = newSettings[optKey];
                            if ($field.is(':checkbox')) {
                                $field.prop('checked', (newValue === true || newValue === '1' || newValue === 1));
                            } else if ($field.hasClass('las-fresh-color-picker')) {
                                $field.wpColorPicker('color', newValue); 
                            } else if ($field.hasClass('las-slider-input')) {
                                $field.val(newValue);
                                var $sliderDiv = $('#' + $field.attr('id') + '-slider');
                                if ($sliderDiv.length && typeof $sliderDiv.slider === 'function' && $sliderDiv.data('ui-slider')) {
                                    $sliderDiv.slider('value', parseFloat(newValue));
                                     var $valueDisplay = $sliderDiv.closest('.las-slider-container').find('.las-slider-value');
                                     var unitVal = $field.data('unit') || '';
                                     if($valueDisplay.length) {
                                         $valueDisplay.text(parseFloat(newValue) + (unitVal === 'none' ? '' : unitVal));
                                     }
                                }
                                $field.trigger('change'); 
                            } else {
                                $field.val(newValue);
                            }
                            if (!$field.hasClass('las-fresh-color-picker')) { 
                                $field.trigger('change');
                            }
                        }
                    }
                }
                lasFreshUpdateFieldVisibility(); 

                if (typeof window.valueCache !== 'undefined') {
                    window.valueCache = {}; // Clear live preview cache
                }
            } else {
                $responseEl.css('color','red').text(response.data.message || 'Błąd podczas stosowania szablonu.');
                
                // Show error notification
                if (window.ErrorManager) {
                    window.ErrorManager.showError(response.data.message || 'Błąd podczas stosowania szablonu.', {
                        duration: 6000,
                        actions: [{
                            label: 'Spróbuj ponownie',
                            callback: function() {
                                $('#las-apply-template-button').trigger('click');
                            }
                        }]
                    });
                }
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('LAS Admin Settings: AJAX error during template apply.', textStatus, errorThrown, jqXHR.responseText);
            $responseEl.css('color','red').text('Błąd komunikacji AJAX. ' + textStatus + ': ' + errorThrown);
            
            // Show error notification with detailed information
            if (window.ErrorManager) {
                var errorMessage = 'Błąd komunikacji z serwerem podczas stosowania szablonu';
                if (textStatus === 'timeout') {
                    errorMessage = 'Przekroczono limit czasu oczekiwania na odpowiedź serwera';
                } else if (textStatus === 'parsererror') {
                    errorMessage = 'Serwer zwrócił nieprawidłową odpowiedź';
                }
                
                window.ErrorManager.showError(errorMessage, {
                    duration: 8000,
                    actions: [{
                        label: 'Spróbuj ponownie',
                        callback: function() {
                            $('#las-apply-template-button').trigger('click');
                        },
                        primary: true
                    }, {
                        label: 'Szczegóły błędu',
                        callback: function() {
                            alert('Szczegóły błędu:\nStatus: ' + textStatus + '\nBłąd: ' + errorThrown + '\nOdpowiedź: ' + jqXHR.responseText);
                        }
                    }]
                });
            }
        })
        .always(function () {
            $button.prop('disabled', false);
            $spinner.removeClass('is-active');
        });
    });

    $('form#las-fresh-settings-form').on('change keyup', '.las-font-family-select, .google-font-input', function() {
        var $fieldChanged = $(this);
        var $containerDiv = $fieldChanged.closest('.las-font-selector-container');
        var $selectEl = $containerDiv.find('select.las-font-family-select');
        var $googleInputEl = $containerDiv.find('input.google-font-input');
        var selectValueCurrent = $selectEl.val();
        var googleFontNameCurrent = $googleInputEl.val().trim();

        if ($fieldChanged.is('.google-font-input') && googleFontNameCurrent !== '') {
            if (selectValueCurrent !== 'google') {
                $selectEl.val('google').trigger('change'); // Trigger change on select to update visibility and live preview
            }
            var $googleOption = $selectEl.find('option[value="google"]');
            if ($googleOption.length) {
                $googleOption.text(googleFontNameCurrent + ' (Google Font)');
            }
        } else if ($fieldChanged.is('select.las-font-family-select')) {
            if (selectValueCurrent !== 'google') {
                // If a non-Google font is selected, clear the Google Font input
                // if ($googleInputEl.val() !== '') {
                //    $googleInputEl.val('').trigger('change'); 
                // }
            }
        }
        lasFreshUpdateFieldVisibility(); 
    });

    /**
     * Enhanced Settings Search and Organization System
     * Provides search functionality, filtering, and improved organization
     */
    function initSettingsSearchAndOrganization() {
        var SearchManager = {
            searchInput: null,
            searchResults: null,
            searchClear: null,
            filterButtons: null,
            allFields: null,
            allSections: null,
            searchIndex: [],
            currentFilter: 'all',
            searchTimeout: null,
            
            init: function() {
                this.cacheElements();
                this.buildSearchIndex();
                this.attachEventListeners();
                this.enhanceFieldsWithIcons();
                console.log('LAS: Settings search and organization initialized');
            },
            
            cacheElements: function() {
                this.searchInput = $('#las-settings-search');
                this.searchResults = $('#las-search-results');
                this.searchClear = $('#las-search-clear');
                this.filterButtons = $('.las-filter-button');
                this.allFields = $('.form-table tr, .las-enhanced-field-wrapper');
                this.allSections = $('.form-table h2, .form-table h3, .las-enhanced-section-header');
            },
            
            buildSearchIndex: function() {
                var self = this;
                this.searchIndex = [];
                
                // Index form table rows
                $('.form-table tr').each(function() {
                    var $row = $(this);
                    var $th = $row.find('th');
                    var $td = $row.find('td');
                    
                    if ($th.length && $td.length) {
                        var title = $th.text().trim();
                        var description = $td.find('.description').text().trim();
                        var fieldType = self.getFieldType($td);
                        var category = self.categorizeField(title, fieldType);
                        var tabId = $row.closest('[id^="las-tab-"]').attr('id');
                        var tabName = self.getTabName(tabId);
                        
                        if (title) {
                            self.searchIndex.push({
                                element: $row,
                                title: title,
                                description: description,
                                category: category,
                                fieldType: fieldType,
                                tabId: tabId,
                                tabName: tabName,
                                keywords: (title + ' ' + description + ' ' + fieldType + ' ' + category).toLowerCase()
                            });
                        }
                    }
                });
                
                // Index enhanced field wrappers
                $('.las-enhanced-field-wrapper').each(function() {
                    var $wrapper = $(this);
                    var title = $wrapper.find('.las-field-title').text().trim();
                    var description = $wrapper.find('.las-field-description').text().trim();
                    var category = $wrapper.data('category') || 'general';
                    var keywords = $wrapper.data('keywords') || '';
                    var tabId = $wrapper.closest('[id^="las-tab-"]').attr('id');
                    var tabName = self.getTabName(tabId);
                    
                    if (title) {
                        self.searchIndex.push({
                            element: $wrapper,
                            title: title,
                            description: description,
                            category: category,
                            fieldType: 'enhanced',
                            tabId: tabId,
                            tabName: tabName,
                            keywords: (title + ' ' + description + ' ' + keywords).toLowerCase()
                        });
                    }
                });
                
                console.log('LAS: Built search index with', this.searchIndex.length, 'items');
            },
            
            getFieldType: function($td) {
                if ($td.find('.las-fresh-color-picker').length) return 'color';
                if ($td.find('.las-slider').length) return 'slider';
                if ($td.find('select').length) return 'select';
                if ($td.find('input[type="checkbox"]').length) return 'checkbox';
                if ($td.find('input[type="text"]').length) return 'text';
                if ($td.find('textarea').length) return 'textarea';
                if ($td.find('.las-image-url-field').length) return 'image';
                return 'unknown';
            },
            
            categorizeField: function(title, fieldType) {
                var titleLower = title.toLowerCase();
                
                if (titleLower.includes('kolor') || titleLower.includes('color') || fieldType === 'color') {
                    return 'colors';
                }
                if (titleLower.includes('czcionka') || titleLower.includes('font') || titleLower.includes('rozmiar')) {
                    return 'typography';
                }
                if (titleLower.includes('margines') || titleLower.includes('padding') || titleLower.includes('szerokość') || 
                    titleLower.includes('wysokość') || titleLower.includes('układ')) {
                    return 'layout';
                }
                if (titleLower.includes('zaawansowane') || titleLower.includes('advanced') || titleLower.includes('css')) {
                    return 'advanced';
                }
                
                return 'general';
            },
            
            getTabName: function(tabId) {
                var tabNames = {
                    'las-tab-general': 'Układ i Ogólne',
                    'las-tab-menu': 'Menu Boczne',
                    'las-tab-adminbar': 'Górny Pasek',
                    'las-tab-content': 'Obszar Treści',
                    'las-tab-logos': 'Logotypy',
                    'las-tab-advanced': 'Zaawansowane'
                };
                return tabNames[tabId] || 'Nieznane';
            },
            
            attachEventListeners: function() {
                var self = this;
                
                // Search input
                this.searchInput.on('input', function() {
                    clearTimeout(self.searchTimeout);
                    self.searchTimeout = setTimeout(function() {
                        self.performSearch();
                    }, 300);
                });
                
                // Search clear button
                this.searchClear.on('click', function() {
                    self.clearSearch();
                });
                
                // Filter buttons
                this.filterButtons.on('click', function() {
                    var filter = $(this).data('filter');
                    self.applyFilter(filter);
                });
                
                // Search results close
                $(document).on('click', '.las-search-results-close', function() {
                    self.hideSearchResults();
                });
                
                // Search result item click
                $(document).on('click', '.las-search-result-item', function() {
                    var tabId = $(this).data('tab-id');
                    var fieldId = $(this).data('field-id');
                    self.navigateToField(tabId, fieldId);
                    self.hideSearchResults();
                });
                
                // Example toggle
                $(document).on('click', '.las-example-toggle', function() {
                    var $content = $(this).siblings('.las-example-content');
                    $content.toggle();
                });
                
                // Section toggle
                $(document).on('click', '.las-section-toggle', function() {
                    var $section = $(this).closest('.las-enhanced-section-header').next('.las-section-content-wrapper');
                    var isExpanded = $(this).attr('aria-expanded') === 'true';
                    
                    $(this).attr('aria-expanded', !isExpanded);
                    $section.slideToggle();
                });
                
                // Hide search results when clicking outside
                $(document).on('click', function(e) {
                    if (!$(e.target).closest('.las-search-container').length) {
                        self.hideSearchResults();
                    }
                });
            },
            
            performSearch: function() {
                var query = this.searchInput.val().trim().toLowerCase();
                
                if (query.length < 2) {
                    this.hideSearchResults();
                    this.clearHighlights();
                    return;
                }
                
                var results = this.searchIndex.filter(function(item) {
                    return item.keywords.includes(query);
                });
                
                this.displaySearchResults(results, query);
                this.highlightSearchTerms(query);
            },
            
            displaySearchResults: function(results, query) {
                var self = this;
                var $content = this.searchResults.find('.las-search-results-content');
                var $count = this.searchResults.find('.las-search-results-count');
                
                $count.text(results.length + ' wyników dla "' + query + '"');
                $content.empty();
                
                if (results.length === 0) {
                    $content.html('<div class="las-search-no-results">Nie znaleziono wyników</div>');
                } else {
                    results.slice(0, 10).forEach(function(result) {
                        var $item = $('<div class="las-search-result-item">')
                            .data('tab-id', result.tabId)
                            .data('field-id', result.element.attr('id') || result.element.data('field-id'))
                            .html(
                                '<div class="las-search-result-title">' + self.highlightText(result.title, query) + '</div>' +
                                (result.description ? '<div class="las-search-result-description">' + self.highlightText(result.description, query) + '</div>' : '') +
                                '<div class="las-search-result-location">' + result.tabName + '</div>'
                            );
                        $content.append($item);
                    });
                    
                    if (results.length > 10) {
                        $content.append('<div class="las-search-more-results">... i ' + (results.length - 10) + ' więcej</div>');
                    }
                }
                
                this.showSearchResults();
            },
            
            highlightText: function(text, query) {
                if (!query || !text) return text;
                var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                return text.replace(regex, '<span class="las-search-highlight">$1</span>');
            },
            
            highlightSearchTerms: function(query) {
                this.clearHighlights();
                
                if (!query) return;
                
                var self = this;
                this.searchIndex.forEach(function(item) {
                    if (item.keywords.includes(query.toLowerCase())) {
                        item.element.addClass('las-field-highlighted');
                    }
                });
                
                // Remove highlights after 3 seconds
                setTimeout(function() {
                    self.clearHighlights();
                }, 3000);
            },
            
            clearHighlights: function() {
                $('.las-field-highlighted').removeClass('las-field-highlighted');
            },
            
            showSearchResults: function() {
                this.searchResults.show();
                this.searchClear.show();
            },
            
            hideSearchResults: function() {
                this.searchResults.hide();
            },
            
            clearSearch: function() {
                this.searchInput.val('');
                this.hideSearchResults();
                this.clearHighlights();
                this.searchClear.hide();
            },
            
            applyFilter: function(filter) {
                this.currentFilter = filter;
                
                // Update button states
                this.filterButtons.removeClass('active');
                this.filterButtons.filter('[data-filter="' + filter + '"]').addClass('active');
                
                // Filter fields
                if (filter === 'all') {
                    this.allFields.removeClass('las-filtered-out');
                    this.allSections.removeClass('las-filtered-out');
                } else {
                    var self = this;
                    this.searchIndex.forEach(function(item) {
                        if (item.category === filter) {
                            item.element.removeClass('las-filtered-out');
                        } else {
                            item.element.addClass('las-filtered-out');
                        }
                    });
                    
                    // Show/hide sections based on visible fields
                    this.allSections.each(function() {
                        var $section = $(this);
                        var $nextElements = $section.nextUntil('h2, h3, .las-enhanced-section-header');
                        var hasVisibleFields = $nextElements.not('.las-filtered-out').length > 0;
                        
                        if (hasVisibleFields) {
                            $section.removeClass('las-filtered-out');
                        } else {
                            $section.addClass('las-filtered-out');
                        }
                    });
                }
                
                console.log('LAS: Applied filter:', filter);
            },
            
            navigateToField: function(tabId, fieldId) {
                // Switch to the correct tab
                if (tabId) {
                    var tabIndex = StateManager.getTabIndex(tabId.replace('las-tab-', ''));
                    if (tabIndex !== -1) {
                        $("#las-settings-tabs").tabs("option", "active", tabIndex);
                    }
                }
                
                // Scroll to and highlight the field
                if (fieldId) {
                    var $field = $('#' + fieldId + ', [data-field-id="' + fieldId + '"]');
                    if ($field.length) {
                        $('html, body').animate({
                            scrollTop: $field.offset().top - 100
                        }, 500);
                        
                        $field.addClass('las-field-highlighted');
                        setTimeout(function() {
                            $field.removeClass('las-field-highlighted');
                        }, 3000);
                    }
                }
            },
            
            enhanceFieldsWithIcons: function() {
                // Add category-based icons to existing fields
                var self = this;
                this.searchIndex.forEach(function(item) {
                    var iconClass = self.getCategoryIcon(item.category);
                    var $element = item.element;
                    
                    if (!$element.hasClass('las-enhanced-field-wrapper')) {
                        $element.addClass('las-categorized-field');
                        $element.attr('data-category', item.category);
                        
                        // Add icon to the field if it doesn't have one
                        var $th = $element.find('th');
                        if ($th.length && !$th.find('.las-field-category-icon').length) {
                            $th.prepend('<span class="las-field-category-icon dashicons ' + iconClass + '"></span>');
                        }
                    }
                });
            },
            
            getCategoryIcon: function(category) {
                var icons = {
                    'colors': 'dashicons-art',
                    'typography': 'dashicons-editor-textcolor',
                    'layout': 'dashicons-layout',
                    'advanced': 'dashicons-admin-tools',
                    'general': 'dashicons-admin-settings'
                };
                return icons[category] || icons.general;
            }
        };
        
        // Initialize search manager
        SearchManager.init();
        
        // Make it globally available for debugging
        window.LAS_SearchManager = SearchManager;
    }

    /**
     * Enhanced Submenu Visibility System
     * Provides smooth transitions and improved hover effects for admin menu submenus
     */
    function initSubmenuVisibilitySystem() {
        var hoverTimeout = null;
        var activeSubmenu = null;
        
        // Enhanced submenu manager
        var SubmenuManager = {
            init: function() {
                this.attachEventListeners();
                this.enhanceVisibility();
                console.log('LAS: Enhanced submenu visibility system initialized');
            },
            
            attachEventListeners: function() {
                var self = this;
                
                // Handle mouse enter on menu items with submenus
                $(document).on('mouseenter', '#adminmenu .wp-has-submenu', function() {
                    var $menuItem = $(this);
                    var $submenu = $menuItem.find('.wp-submenu');
                    
                    if ($submenu.length) {
                        clearTimeout(hoverTimeout);
                        self.showSubmenu($menuItem, $submenu);
                    }
                });
                
                // Handle mouse leave on menu items with submenus
                $(document).on('mouseleave', '#adminmenu .wp-has-submenu', function() {
                    var $menuItem = $(this);
                    var $submenu = $menuItem.find('.wp-submenu');
                    
                    if ($submenu.length) {
                        self.scheduleHideSubmenu($menuItem, $submenu);
                    }
                });
                
                // Handle mouse enter on submenu to cancel hide
                $(document).on('mouseenter', '#adminmenu .wp-submenu', function() {
                    clearTimeout(hoverTimeout);
                    var $submenu = $(this);
                    var $menuItem = $submenu.closest('.wp-has-submenu');
                    self.showSubmenu($menuItem, $submenu);
                });
                
                // Handle mouse leave on submenu
                $(document).on('mouseleave', '#adminmenu .wp-submenu', function() {
                    var $submenu = $(this);
                    var $menuItem = $submenu.closest('.wp-has-submenu');
                    self.scheduleHideSubmenu($menuItem, $submenu);
                });
            },
            
            showSubmenu: function($menuItem, $submenu) {
                // Hide any currently active submenu
                if (activeSubmenu && activeSubmenu[0] !== $submenu[0]) {
                    this.hideSubmenu(activeSubmenu.closest('.wp-has-submenu'), activeSubmenu);
                }
                
                // Show the new submenu
                $submenu.removeClass('las-submenu-hidden').addClass('las-submenu-visible');
                $menuItem.addClass('opensub');
                activeSubmenu = $submenu;
                
                // Ensure proper positioning
                this.positionSubmenu($menuItem, $submenu);
            },
            
            hideSubmenu: function($menuItem, $submenu) {
                $submenu.removeClass('las-submenu-visible').addClass('las-submenu-hidden');
                $menuItem.removeClass('opensub');
                
                if (activeSubmenu && activeSubmenu[0] === $submenu[0]) {
                    activeSubmenu = null;
                }
            },
            
            scheduleHideSubmenu: function($menuItem, $submenu) {
                var self = this;
                hoverTimeout = setTimeout(function() {
                    self.hideSubmenu($menuItem, $submenu);
                }, 300); // 300ms delay before hiding
            },
            
            positionSubmenu: function($menuItem, $submenu) {
                // Get menu item position and dimensions
                var menuItemOffset = $menuItem.offset();
                var menuItemHeight = $menuItem.outerHeight();
                var submenuHeight = $submenu.outerHeight();
                var windowHeight = $(window).height();
                var adminBarHeight = $('#wpadminbar').outerHeight() || 32;
                
                // Calculate if submenu would go below viewport
                var submenuBottom = menuItemOffset.top + submenuHeight;
                var viewportBottom = windowHeight + $(window).scrollTop();
                
                // Adjust submenu position if it would overflow
                if (submenuBottom > viewportBottom) {
                    var adjustedTop = Math.max(0, menuItemHeight - submenuHeight);
                    $submenu.css('top', adjustedTop + 'px');
                } else {
                    $submenu.css('top', '0px');
                }
                
                // Handle folded menu positioning
                if ($('body').hasClass('folded')) {
                    $submenu.css({
                        'left': '36px',
                        'margin-left': '0'
                    });
                } else {
                    $submenu.css({
                        'left': '100%',
                        'margin-left': '0'
                    });
                }
            },
            
            enhanceVisibility: function() {
                // Apply initial classes to all submenus
                $('#adminmenu .wp-submenu').each(function() {
                    var $submenu = $(this);
                    var $menuItem = $submenu.closest('.wp-has-submenu');
                    
                    // Initially hide all submenus
                    if (!$menuItem.hasClass('wp-has-current-submenu') && !$menuItem.hasClass('current')) {
                        $submenu.addClass('las-submenu-hidden');
                    } else {
                        $submenu.addClass('las-submenu-visible');
                        activeSubmenu = $submenu;
                    }
                });
                
                // Handle window resize for repositioning
                $(window).on('resize', function() {
                    if (activeSubmenu) {
                        var $menuItem = activeSubmenu.closest('.wp-has-submenu');
                        SubmenuManager.positionSubmenu($menuItem, activeSubmenu);
                    }
                });
                
                // Handle admin menu collapse/expand
                $(document).on('click', '#collapse-menu', function() {
                    setTimeout(function() {
                        if (activeSubmenu) {
                            var $menuItem = activeSubmenu.closest('.wp-has-submenu');
                            SubmenuManager.positionSubmenu($menuItem, activeSubmenu);
                        }
                    }, 300); // Wait for collapse animation
                });
            }
        };
        
        // Initialize the submenu manager
        SubmenuManager.init();
    }
});
    /**
     * Live Preview Integration
     * Enhances form controls with debounced live preview functionality
     */
    function initLivePreviewIntegration() {
        var debounceTimers = {};
        var performanceIndicator = null;
        
        // Create performance indicator
        function createPerformanceIndicator() {
            if (!performanceIndicator) {
                performanceIndicator = $('<div class="las-performance-indicator"></div>');
                $('body').append(performanceIndicator);
            }
            return performanceIndicator;
        }
        
        // Show performance metrics
        function showPerformanceMetrics(metrics) {
            var indicator = createPerformanceIndicator();
            indicator.text('Preview: ' + metrics.execution_time_ms + 'ms')
                    .addClass('visible');
            
            setTimeout(function() {
                indicator.removeClass('visible');
            }, 2000);
        }
        
        // Enhanced debounced field change handler
        function handleDebouncedFieldChange($field, delay) {
            var fieldName = $field.attr('name');
            if (!fieldName) return;
            
            // Clear existing timer
            if (debounceTimers[fieldName]) {
                clearTimeout(debounceTimers[fieldName]);
            }
            
            // Add visual feedback
            $field.addClass('las-field-debouncing');
            
            // Set new timer
            debounceTimers[fieldName] = setTimeout(function() {
                $field.removeClass('las-field-debouncing');
                
                // Trigger the change event for live preview
                $field.trigger('change');
                
                // Clean up timer
                delete debounceTimers[fieldName];
            }, delay || 150);
        }
        
        // Attach enhanced event listeners
        $('#las-fresh-settings-form').on('input keyup', 'input[type="text"], input[type="number"], textarea', function() {
            handleDebouncedFieldChange($(this), 300);
        });
        
        // Immediate feedback for color pickers and selects
        $('#las-fresh-settings-form').on('change', 'select, input[type="checkbox"], input[type="radio"]', function() {
            handleDebouncedFieldChange($(this), 50);
        });
        
        // Listen for live preview performance data
        if (window.LivePreviewManager) {
            // Override the handleAjaxSuccess to capture performance data
            var originalHandleSuccess = window.LivePreviewManager.handleAjaxSuccess;
            window.LivePreviewManager.handleAjaxSuccess = function(response, setting) {
                // Call original handler
                originalHandleSuccess.call(this, response, setting);
                
                // Show performance metrics if available
                if (response.success && response.data && response.data.performance) {
                    showPerformanceMetrics(response.data.performance);
                }
            };
        }
        
        console.log('LAS: Live Preview Integration initialized');
    }
/**

 * Modern UI Enhancements
 * Adds smooth animations and enhanced interactions for the modernized interface
 */
function initModernUIEnhancements() {
    console.log('LAS: Initializing Modern UI Enhancements');
    
    // Enhanced Form Control Interactions
    var FormEnhancer = {
        init: function() {
            this.enhanceFormControls();
            this.addTooltipSupport();
            this.enhanceSliders();
            this.addSuccessAnimations();
            this.initializeLoadingStates();
        },
        
        enhanceFormControls: function() {
            // Add focus/blur animations to form controls
            jQuery('.las-fresh-settings-wrap input, .las-fresh-settings-wrap select, .las-fresh-settings-wrap textarea')
                .on('focus', function() {
                    jQuery(this).closest('.field-row').addClass('field-focused');
                })
                .on('blur', function() {
                    jQuery(this).closest('.field-row').removeClass('field-focused');
                });
            
            // Enhanced checkbox/radio interactions
            jQuery('.las-fresh-settings-wrap input[type="checkbox"], .las-fresh-settings-wrap input[type="radio"]')
                .on('change', function() {
                    var $this = jQuery(this);
                    if ($this.is(':checked')) {
                        $this.addClass('las-success-animation');
                        setTimeout(function() {
                            $this.removeClass('las-success-animation');
                        }, 600);
                    }
                });
        },
        
        addTooltipSupport: function() {
            // Add tooltip functionality to elements with data-tooltip attribute
            jQuery('.las-fresh-settings-wrap [data-tooltip]').each(function() {
                var $element = jQuery(this);
                if (!$element.hasClass('las-tooltip')) {
                    $element.addClass('las-tooltip');
                }
            });
            
            // Add helpful tooltips to complex controls
            jQuery('.las-slider-container').each(function() {
                var $container = jQuery(this);
                var $input = $container.find('.las-slider-input');
                var unit = $input.data('unit') || '';
                var min = $input.data('min') || 0;
                var max = $input.data('max') || 100;
                
                if (!$container.attr('data-tooltip')) {
                    $container.attr('data-tooltip', 'Zakres: ' + min + '-' + max + unit);
                    $container.addClass('las-tooltip');
                }
            });
        },
        
        enhanceSliders: function() {
            // Add enhanced visual feedback to sliders
            jQuery('.las-slider').each(function() {
                var $slider = jQuery(this);
                var $container = $slider.closest('.las-slider-container');
                var $input = $container.find('.las-slider-input');
                var $value = $container.find('.las-slider-value');
                
                // Add hover effects
                $container.on('mouseenter', function() {
                    jQuery(this).addClass('slider-hover');
                }).on('mouseleave', function() {
                    jQuery(this).removeClass('slider-hover');
                });
                
                // Add active state during sliding
                if ($slider.data('ui-slider')) {
                    $slider.on('slidestart', function() {
                        $container.addClass('slider-active');
                    }).on('slidestop', function() {
                        $container.removeClass('slider-active');
                        // Add success animation to value display
                        $value.addClass('las-success-animation');
                        setTimeout(function() {
                            $value.removeClass('las-success-animation');
                        }, 600);
                    });
                }
            });
        },
        
        addSuccessAnimations: function() {
            // Add success animation when settings are saved
            jQuery('#las-fresh-settings-form').on('submit', function() {
                jQuery('.las-fresh-settings-wrap').addClass('las-loading');
            });
            
            // Listen for WordPress admin notices and enhance them
            jQuery(document).on('DOMNodeInserted', '.notice', function() {
                var $notice = jQuery(this);
                if ($notice.hasClass('updated') || $notice.hasClass('notice-success')) {
                    $notice.addClass('las-success-animation');
                    jQuery('.las-fresh-settings-wrap').removeClass('las-loading');
                }
            });
        },
        
        initializeLoadingStates: function() {
            // Add loading states to buttons
            jQuery('.las-fresh-settings-wrap .button').on('click', function() {
                var $button = jQuery(this);
                if (!$button.hasClass('no-loading')) {
                    $button.addClass('las-loading');
                    
                    // Remove loading state after a reasonable time
                    setTimeout(function() {
                        $button.removeClass('las-loading');
                    }, 3000);
                }
            });
            
            // Enhanced AJAX loading states
            jQuery(document).ajaxStart(function() {
                jQuery('.las-fresh-settings-wrap').addClass('ajax-loading');
            }).ajaxStop(function() {
                jQuery('.las-fresh-settings-wrap').removeClass('ajax-loading');
            });
        }
    };
    
    // Tab Animation Enhancer
    var TabAnimator = {
        init: function() {
            this.enhanceTabSwitching();
        },
        
        enhanceTabSwitching: function() {
            // Override the default tab activation to add animations
            if (typeof $.fn.tabs === "function") {
                jQuery('#las-settings-tabs').on('tabsbeforeactivate', function(event, ui) {
                    // Add fade out animation to current panel
                    ui.oldPanel.addClass('tab-fade-out');
                });
                
                jQuery('#las-settings-tabs').on('tabsactivate', function(event, ui) {
                    // Remove fade out from old panel and add fade in to new panel
                    ui.oldPanel.removeClass('tab-fade-out');
                    ui.newPanel.addClass('tab-fade-in');
                    
                    // Remove fade in class after animation
                    setTimeout(function() {
                        ui.newPanel.removeClass('tab-fade-in');
                    }, 400);
                });
            }
        }
    };
    
    // Color Picker Enhancer
    var ColorPickerEnhancer = {
        init: function() {
            this.enhanceColorPickers();
        },
        
        enhanceColorPickers: function() {
            // Wait for color pickers to be initialized
            setTimeout(function() {
                jQuery('.wp-color-picker').each(function() {
                    var $picker = jQuery(this);
                    var $container = $picker.closest('.wp-picker-container');
                    
                    // Add modern styling class
                    $container.addClass('las-modern-color-picker');
                    
                    // Add animation on color change
                    $picker.on('change', function() {
                        $container.addClass('color-changed');
                        setTimeout(function() {
                            $container.removeClass('color-changed');
                        }, 300);
                    });
                });
            }, 500);
        }
    };
    
    // Accessibility Enhancer
    var AccessibilityEnhancer = {
        init: function() {
            this.addKeyboardNavigation();
            this.enhanceScreenReaderSupport();
        },
        
        addKeyboardNavigation: function() {
            // Enhanced keyboard navigation for sliders
            jQuery('.las-slider-input').on('keydown', function(e) {
                var $input = jQuery(this);
                var currentValue = parseFloat($input.val()) || 0;
                var step = parseFloat($input.data('step')) || 1;
                var min = parseFloat($input.data('min')) || 0;
                var max = parseFloat($input.data('max')) || 100;
                var newValue = currentValue;
                
                switch(e.which) {
                    case 38: // Up arrow
                        newValue = Math.min(max, currentValue + step);
                        break;
                    case 40: // Down arrow
                        newValue = Math.max(min, currentValue - step);
                        break;
                    case 33: // Page up
                        newValue = Math.min(max, currentValue + (step * 10));
                        break;
                    case 34: // Page down
                        newValue = Math.max(min, currentValue - (step * 10));
                        break;
                    default:
                        return;
                }
                
                e.preventDefault();
                $input.val(newValue).trigger('change');
                
                // Update slider if present
                var $slider = jQuery('#' + $input.attr('id') + '-slider');
                if ($slider.length && $slider.data('ui-slider')) {
                    $slider.slider('value', newValue);
                }
            });
        },
        
        enhanceScreenReaderSupport: function() {
            // Add ARIA labels to sliders
            jQuery('.las-slider-container').each(function() {
                var $container = jQuery(this);
                var $input = $container.find('.las-slider-input');
                var $slider = $container.find('.las-slider');
                var $label = $container.closest('.field-row').find('label');
                
                if ($label.length && !$input.attr('aria-label')) {
                    $input.attr('aria-label', $label.text());
                }
                
                if ($slider.length && !$slider.attr('role')) {
                    $slider.attr('role', 'slider');
                    $slider.attr('aria-valuemin', $input.data('min') || 0);
                    $slider.attr('aria-valuemax', $input.data('max') || 100);
                    $slider.attr('aria-valuenow', $input.val());
                }
            });
            
            // Add live region for dynamic updates
            if (!jQuery('#las-live-region').length) {
                jQuery('body').append('<div id="las-live-region" aria-live="polite" aria-atomic="true" class="sr-only"></div>');
            }
        }
    };
    
    // Performance Monitor
    var PerformanceMonitor = {
        init: function() {
            this.monitorAnimationPerformance();
        },
        
        monitorAnimationPerformance: function() {
            // Reduce animations on slower devices
            var isSlowDevice = navigator.hardwareConcurrency < 4 || 
                              navigator.deviceMemory < 4 ||
                              /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isSlowDevice) {
                jQuery('body').addClass('las-reduced-animations');
            }
            
            // Monitor frame rate and adjust animations accordingly
            var frameCount = 0;
            var lastTime = performance.now();
            
            function checkFrameRate() {
                frameCount++;
                var currentTime = performance.now();
                
                if (currentTime - lastTime >= 1000) {
                    var fps = frameCount;
                    frameCount = 0;
                    lastTime = currentTime;
                    
                    // If FPS is consistently low, reduce animations
                    if (fps < 30) {
                        jQuery('body').addClass('las-reduced-animations');
                    } else if (fps > 50) {
                        jQuery('body').removeClass('las-reduced-animations');
                    }
                }
                
                requestAnimationFrame(checkFrameRate);
            }
            
            // Start monitoring after a delay
            setTimeout(function() {
                requestAnimationFrame(checkFrameRate);
            }, 2000);
        }
    };
    
    // Initialize all enhancers
    FormEnhancer.init();
    TabAnimator.init();
    ColorPickerEnhancer.init();
    AccessibilityEnhancer.init();
    PerformanceMonitor.init();
    
    console.log('LAS: Modern UI Enhancements initialized successfully');
}

// Initialize modern UI enhancements after DOM is ready
jQuery(document).ready(function($) {
    // Wait a bit for other initializations to complete
    setTimeout(function() {
        initModernUIEnhancements();
    }, 100);
});

// Loading Overlay Manager
window.LoadingManager = {
    overlay: null,
    
    show: function(message) {
        this.hide(); // Remove any existing overlay
        
        message = message || 'Ładowanie...';
        
        this.overlay = $(`
            <div class="las-loading-overlay">
                <div class="las-loading-content">
                    <div class="las-loading-spinner"></div>
                    <div class="las-loading-message">${message}</div>
                </div>
            </div>
        `);
        
        $('body').append(this.overlay);
        
        // Fade in
        setTimeout(function() {
            if (window.LoadingManager.overlay) {
                window.LoadingManager.overlay.addClass('visible');
            }
        }, 10);
    },
    
    hide: function() {
        if (this.overlay) {
            this.overlay.removeClass('visible');
            
            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.remove();
                    this.overlay = null;
                }
            }, 300);
        }
    },
    
    updateMessage: function(message) {
        if (this.overlay) {
            this.overlay.find('.las-loading-message').text(message);
        }
    }
};

// Progress Bar Manager
window.ProgressManager = {
    create: function(container, options) {
        options = options || {};
        
        var $container = $(container);
        var $progressBar = $(`
            <div class="las-progress-bar">
                <div class="las-progress-bar-fill" style="width: 0%"></div>
            </div>
        `);
        
        $container.append($progressBar);
        
        return {
            setProgress: function(percentage) {
                percentage = Math.max(0, Math.min(100, percentage));
                $progressBar.find('.las-progress-bar-fill').css('width', percentage + '%');
            },
            
            complete: function() {
                this.setProgress(100);
                
                setTimeout(function() {
                    $progressBar.fadeOut(function() {
                        $progressBar.remove();
                    });
                }, options.hideDelay || 1000);
            },
            
            remove: function() {
                $progressBar.remove();
            }
        };
    }
};    /**

     * Initialize the User Preferences Panel
     */
    function initPreferencesPanel() {
        var PreferencesManager = {
            init: function() {
                this.loadPreferences();
                this.attachEventListeners();
                this.addSyncStatusIndicator();
                console.log('LAS: Preferences Panel initialized');
            },
            
            loadPreferences: function() {
                var prefs = StateManager.userPreferences;
                
                // Set checkbox states
                $('#las-pref-remember-tab').prop('checked', prefs.remember_tab_state);
                $('#las-pref-live-preview').prop('checked', prefs.live_preview_enabled);
                $('#las-pref-smart-submenu').prop('checked', prefs.smart_submenu);
                $('#las-pref-compact-mode').prop('checked', prefs.compact_mode);
                
                // Set select values
                $('#las-pref-ui-theme').val(prefs.ui_theme);
                $('#las-pref-animation-speed').val(prefs.animation_speed);
            },
            
            attachEventListeners: function() {
                var self = this;
                
                // Handle preference changes
                $('#las-pref-remember-tab').on('change', function() {
                    StateManager.setUserPreference('remember_tab_state', $(this).is(':checked'));
                });
                
                $('#las-pref-live-preview').on('change', function() {
                    StateManager.setUserPreference('live_preview_enabled', $(this).is(':checked'));
                    self.toggleLivePreview($(this).is(':checked'));
                });
                
                $('#las-pref-smart-submenu').on('change', function() {
                    StateManager.setUserPreference('smart_submenu', $(this).is(':checked'));
                    self.toggleSmartSubmenu($(this).is(':checked'));
                });
                
                $('#las-pref-compact-mode').on('change', function() {
                    StateManager.setUserPreference('compact_mode', $(this).is(':checked'));
                });
                
                $('#las-pref-ui-theme').on('change', function() {
                    StateManager.setUserPreference('ui_theme', $(this).val());
                });
                
                $('#las-pref-animation-speed').on('change', function() {
                    StateManager.setUserPreference('animation_speed', $(this).val());
                });
                
                // Handle save and reset buttons
                $('#las-save-preferences').on('click', function() {
                    self.savePreferences();
                });
                
                $('#las-reset-preferences').on('click', function() {
                    StateManager.resetToDefaults();
                });
            },
            
            toggleLivePreview: function(enabled) {
                if (enabled) {
                    // Re-enable live preview functionality
                    if (window.LivePreviewManager) {
                        window.LivePreviewManager.enabled = true;
                    }
                    
                    if (window.ErrorManager) {
                        window.ErrorManager.showSuccess('Podgląd na żywo został włączony', {
                            duration: 3000
                        });
                    }
                } else {
                    // Disable live preview functionality
                    if (window.LivePreviewManager) {
                        window.LivePreviewManager.enabled = false;
                    }
                    
                    if (window.ErrorManager) {
                        window.ErrorManager.showInfo('Podgląd na żywo został wyłączony', {
                            duration: 3000
                        });
                    }
                }
            },
            
            toggleSmartSubmenu: function(enabled) {
                if (enabled) {
                    $('body').addClass('las-smart-submenu-enabled');
                    
                    if (window.ErrorManager) {
                        window.ErrorManager.showSuccess('Inteligentne submenu zostało włączone', {
                            duration: 3000
                        });
                    }
                } else {
                    $('body').removeClass('las-smart-submenu-enabled');
                    
                    if (window.ErrorManager) {
                        window.ErrorManager.showInfo('Inteligentne submenu zostało wyłączone', {
                            duration: 3000
                        });
                    }
                }
            },
            
            savePreferences: function() {
                var self = this;
                var $button = $('#las-save-preferences');
                
                $button.prop('disabled', true).text('Zapisywanie...');
                
                // Force sync to server
                StateManager.syncPreferencesToServer();
                
                // Show success message after a short delay
                setTimeout(function() {
                    $button.prop('disabled', false).text('Zapisz preferencje');
                    
                    if (window.ErrorManager) {
                        window.ErrorManager.showSuccess('Preferencje zostały zapisane pomyślnie', {
                            duration: 4000,
                            actions: [{
                                label: 'Odśwież stronę',
                                callback: function() {
                                    location.reload();
                                }
                            }]
                        });
                    }
                }, 1000);
            },
            
            addSyncStatusIndicator: function() {
                var $indicator = $('<div class="las-sync-status" id="las-sync-status">' +
                    '<span class="dashicons dashicons-update"></span>' +
                    '<span class="status-text">Synchronizacja...</span>' +
                '</div>');
                
                $('.las-preferences-panel h3').append($indicator);
                
                this.updateSyncStatus('synced');
            },
            
            updateSyncStatus: function(status) {
                var $indicator = $('#las-sync-status');
                var $icon = $indicator.find('.dashicons');
                var $text = $indicator.find('.status-text');
                
                $indicator.removeClass('syncing synced offline error');
                
                switch (status) {
                    case 'syncing':
                        $indicator.addClass('syncing');
                        $icon.removeClass().addClass('dashicons dashicons-update');
                        $text.text('Synchronizacja...');
                        break;
                    case 'synced':
                        $indicator.addClass('synced');
                        $icon.removeClass().addClass('dashicons dashicons-yes-alt');
                        $text.text('Zsynchronizowane');
                        break;
                    case 'offline':
                        $indicator.addClass('offline');
                        $icon.removeClass().addClass('dashicons dashicons-cloud');
                        $text.text('Offline');
                        break;
                    case 'error':
                        $indicator.addClass('error');
                        $icon.removeClass().addClass('dashicons dashicons-warning');
                        $text.text('Błąd synchronizacji');
                        break;
                }
            }
        };
        
        // Initialize preferences manager
        PreferencesManager.init();
        
        // Update sync status based on StateManager events
        $(document).on('las:sync:start', function() {
            PreferencesManager.updateSyncStatus('syncing');
        });
        
        $(document).on('las:sync:success', function() {
            PreferencesManager.updateSyncStatus('synced');
        });
        
        $(document).on('las:sync:error', function() {
            PreferencesManager.updateSyncStatus('error');
        });
        
        $(document).on('las:offline', function() {
            PreferencesManager.updateSyncStatus('offline');
        });
        
        $(document).on('las:online', function() {
            PreferencesManager.updateSyncStatus('synced');
        });
        
        // Make PreferencesManager globally available
        window.PreferencesManager = PreferencesManager;
    }
});
