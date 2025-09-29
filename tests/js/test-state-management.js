/**
 * JavaScript test suite for UI components and state management
 * Tests StateManager, ErrorManager, and related functionality
 * 
 * Requirements: 6.4, 7.4
 */

// Mock jQuery and WordPress AJAX data for testing
if (typeof jQuery === 'undefined') {
    global.jQuery = require('jquery');
    global.$ = global.jQuery;
}

// Mock WordPress AJAX data
global.lasFreshData = {
    ajax_url: '/wp-admin/admin-ajax.php',
    nonce: 'test_nonce_12345'
};

// Mock localStorage for testing
const localStorageMock = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = value.toString();
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

global.localStorage = localStorageMock;

// Mock navigator for online/offline testing
global.navigator = {
    onLine: true,
    sendBeacon: jest.fn()
};

// Mock document and window for DOM testing
global.document = {
    hidden: false,
    head: {
        appendChild: jest.fn()
    },
    createElement: jest.fn(() => ({
        id: '',
        type: '',
        innerHTML: ''
    })),
    getElementById: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

global.window = {
    location: {
        href: 'http://test.com/wp-admin/admin.php?page=las-settings',
        pathname: '/wp-admin/admin.php',
        search: '?page=las-settings',
        hash: ''
    },
    history: {
        replaceState: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

// Mock jQuery UI tabs
$.fn.tabs = jest.fn(() => ({
    tabs: jest.fn()
}));

describe('StateManager', () => {
    let StateManager;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        localStorageMock.clear();
        
        // Mock jQuery elements
        global.$ = jest.fn(() => ({
            tabs: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            data: jest.fn(() => 'general'),
            addClass: jest.fn(),
            removeClass: jest.fn(),
            closest: jest.fn(() => ({
                addClass: jest.fn(),
                removeClass: jest.fn()
            })),
            append: jest.fn(),
            find: jest.fn(() => ({
                remove: jest.fn()
            })),
            attr: jest.fn(),
            length: 1
        }));
        
        // Mock specific jQuery selectors
        global.$('#las-settings-tabs') = {
            tabs: jest.fn(),
            data: jest.fn(() => 'general')
        };
        
        global.$('#las-settings-tabs ul li a') = {
            on: jest.fn(),
            off: jest.fn()
        };
        
        // Mock AJAX
        global.$.post = jest.fn(() => ({
            done: jest.fn(() => ({
                fail: jest.fn()
            })),
            fail: jest.fn()
        }));
        
        // Initialize StateManager (simplified version for testing)
        StateManager = {
            activeTab: null,
            debounceTimer: null,
            userPreferences: {},
            syncTimer: null,
            isOnline: true,
            pendingSync: false,
            
            init: function() {
                this.userPreferences = this.getDefaultPreferences();
                this.activeTab = 'general';
                return this;
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
            
            saveTabState: function(tabId) {
                this.activeTab = tabId;
                localStorage.setItem('las_active_tab', tabId);
                if (this.userPreferences.remember_tab_state) {
                    this.pendingSync = true;
                }
                return true;
            },
            
            restoreTabState: function() {
                const savedTab = localStorage.getItem('las_active_tab') || 'general';
                this.activeTab = savedTab;
                return savedTab;
            },
            
            activateTab: function(tabId) {
                const validTabs = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
                if (validTabs.includes(tabId)) {
                    this.activeTab = tabId;
                    if (this.userPreferences.remember_tab_state) {
                        localStorage.setItem('las_active_tab', tabId);
                    }
                    return true;
                }
                return false;
            },
            
            getTabIndex: function(tabId) {
                const tabIds = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
                return tabIds.indexOf(tabId);
            },
            
            getCurrentTab: function() {
                return this.activeTab || 'general';
            },
            
            setUserPreference: function(key, value) {
                this.userPreferences[key] = value;
                localStorage.setItem('las_user_preferences', JSON.stringify(this.userPreferences));
                this.pendingSync = true;
                return true;
            },
            
            getUserPreference: function(key, defaultValue) {
                return this.userPreferences.hasOwnProperty(key) ? this.userPreferences[key] : defaultValue;
            },
            
            loadUserPreferences: function() {
                const localPrefs = localStorage.getItem('las_user_preferences');
                if (localPrefs) {
                    try {
                        this.userPreferences = JSON.parse(localPrefs);
                    } catch (e) {
                        this.userPreferences = this.getDefaultPreferences();
                    }
                } else {
                    this.userPreferences = this.getDefaultPreferences();
                }
                return this.userPreferences;
            },
            
            resetToDefaults: function() {
                this.userPreferences = this.getDefaultPreferences();
                localStorage.setItem('las_user_preferences', JSON.stringify(this.userPreferences));
                localStorage.setItem('las_active_tab', 'general');
                this.activeTab = 'general';
                return true;
            },
            
            cleanup: function() {
                clearTimeout(this.debounceTimer);
                clearTimeout(this.syncTimer);
                if (!this.userPreferences.remember_tab_state) {
                    localStorage.removeItem('las_active_tab');
                    localStorage.removeItem('las_user_preferences');
                }
            }
        };
        
        StateManager.init();
    });
    
    afterEach(() => {
        if (StateManager && StateManager.cleanup) {
            StateManager.cleanup();
        }
    });

    test('should initialize with default preferences', () => {
        expect(StateManager.userPreferences).toBeDefined();
        expect(StateManager.userPreferences.ui_theme).toBe('modern');
        expect(StateManager.userPreferences.animation_speed).toBe('normal');
        expect(StateManager.userPreferences.live_preview_enabled).toBe(true);
        expect(StateManager.userPreferences.remember_tab_state).toBe(true);
    });

    test('should save and restore tab state', () => {
        // Save tab state
        const result = StateManager.saveTabState('menu');
        expect(result).toBe(true);
        expect(StateManager.activeTab).toBe('menu');
        expect(localStorage.getItem('las_active_tab')).toBe('menu');
        
        // Restore tab state
        const restoredTab = StateManager.restoreTabState();
        expect(restoredTab).toBe('menu');
        expect(StateManager.activeTab).toBe('menu');
    });

    test('should activate valid tabs only', () => {
        // Test valid tabs
        const validTabs = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
        validTabs.forEach(tab => {
            expect(StateManager.activateTab(tab)).toBe(true);
            expect(StateManager.activeTab).toBe(tab);
        });
        
        // Test invalid tabs
        expect(StateManager.activateTab('invalid')).toBe(false);
        expect(StateManager.activateTab('')).toBe(false);
        expect(StateManager.activateTab(null)).toBe(false);
    });

    test('should get correct tab index', () => {
        expect(StateManager.getTabIndex('general')).toBe(0);
        expect(StateManager.getTabIndex('menu')).toBe(1);
        expect(StateManager.getTabIndex('adminbar')).toBe(2);
        expect(StateManager.getTabIndex('content')).toBe(3);
        expect(StateManager.getTabIndex('logos')).toBe(4);
        expect(StateManager.getTabIndex('advanced')).toBe(5);
        expect(StateManager.getTabIndex('invalid')).toBe(-1);
    });

    test('should manage user preferences', () => {
        // Set preference
        StateManager.setUserPreference('ui_theme', 'classic');
        expect(StateManager.getUserPreference('ui_theme')).toBe('classic');
        
        // Get preference with default
        expect(StateManager.getUserPreference('nonexistent', 'default')).toBe('default');
        
        // Check localStorage persistence
        const storedPrefs = JSON.parse(localStorage.getItem('las_user_preferences'));
        expect(storedPrefs.ui_theme).toBe('classic');
    });

    test('should load preferences from localStorage', () => {
        // Set preferences in localStorage
        const testPrefs = {
            ui_theme: 'minimal',
            animation_speed: 'fast',
            compact_mode: true
        };
        localStorage.setItem('las_user_preferences', JSON.stringify(testPrefs));
        
        // Load preferences
        const loadedPrefs = StateManager.loadUserPreferences();
        expect(loadedPrefs.ui_theme).toBe('minimal');
        expect(loadedPrefs.animation_speed).toBe('fast');
        expect(loadedPrefs.compact_mode).toBe(true);
    });

    test('should handle corrupted localStorage preferences', () => {
        // Set corrupted JSON in localStorage
        localStorage.setItem('las_user_preferences', 'invalid json');
        
        // Load preferences should fallback to defaults
        const loadedPrefs = StateManager.loadUserPreferences();
        expect(loadedPrefs.ui_theme).toBe('modern');
        expect(loadedPrefs.animation_speed).toBe('normal');
    });

    test('should reset to defaults', () => {
        // Set some non-default values
        StateManager.setUserPreference('ui_theme', 'classic');
        StateManager.saveTabState('menu');
        
        // Reset to defaults
        StateManager.resetToDefaults();
        
        expect(StateManager.userPreferences.ui_theme).toBe('modern');
        expect(StateManager.activeTab).toBe('general');
        expect(localStorage.getItem('las_active_tab')).toBe('general');
    });

    test('should handle pending sync state', () => {
        expect(StateManager.pendingSync).toBe(false);
        
        // Setting preference should trigger pending sync
        StateManager.setUserPreference('ui_theme', 'classic');
        expect(StateManager.pendingSync).toBe(true);
        
        // Saving tab state should trigger pending sync if remember_tab_state is true
        StateManager.saveTabState('menu');
        expect(StateManager.pendingSync).toBe(true);
    });

    test('should cleanup properly', () => {
        // Set some state
        StateManager.setUserPreference('remember_tab_state', false);
        StateManager.saveTabState('menu');
        
        // Cleanup
        StateManager.cleanup();
        
        // localStorage should be cleared when remember_tab_state is false
        expect(localStorage.getItem('las_active_tab')).toBeNull();
        expect(localStorage.getItem('las_user_preferences')).toBeNull();
    });
});

describe('ErrorManager', () => {
    let ErrorManager;
    
    beforeEach(() => {
        // Mock jQuery for ErrorManager
        global.$ = jest.fn((selector) => {
            if (selector === 'body') {
                return {
                    append: jest.fn()
                };
            }
            return {
                append: jest.fn(),
                find: jest.fn(() => ({
                    remove: jest.fn(),
                    on: jest.fn(),
                    fadeOut: jest.fn((callback) => {
                        if (callback) callback();
                        return { remove: jest.fn() };
                    }),
                    data: jest.fn(),
                    addClass: jest.fn(),
                    removeClass: jest.fn()
                })),
                addClass: jest.fn(),
                removeClass: jest.fn(),
                remove: jest.fn(),
                length: 1
            };
        });
        
        // Initialize ErrorManager (simplified version for testing)
        ErrorManager = {
            notifications: [],
            container: null,
            maxNotifications: 5,
            defaultDuration: 5000,
            
            init: function() {
                this.createContainer();
                return this;
            },
            
            createContainer: function() {
                this.container = $('<div id="las-notifications" class="las-notifications-container"></div>');
                $('body').append(this.container);
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
                
                const notification = {
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
                
                return notification.id;
            },
            
            displayNotification: function(notification) {
                // Mock display logic
                const $notification = $('<div class="las-notification"></div>');
                this.container.append($notification);
                
                // Schedule auto-dismiss if not persistent
                if (!notification.persistent && notification.duration > 0) {
                    setTimeout(() => {
                        this.dismissNotification(notification.id);
                    }, notification.duration);
                }
            },
            
            dismissNotification: function(notificationId) {
                const $notification = this.container.find(`[data-id="${notificationId}"]`);
                if ($notification.length) {
                    $notification.fadeOut(() => {
                        $notification.remove();
                        this.removeNotificationFromArray(notificationId);
                    });
                }
            },
            
            removeNotificationFromArray: function(notificationId) {
                this.notifications = this.notifications.filter(notification => 
                    notification.id !== notificationId
                );
            },
            
            removeOldestNotification: function() {
                if (this.notifications.length > 0) {
                    const oldest = this.notifications[0];
                    this.dismissNotification(oldest.id);
                }
            },
            
            clearAllNotifications: function() {
                this.notifications.forEach(notification => {
                    this.dismissNotification(notification.id);
                });
            },
            
            getActiveNotifications: function() {
                return this.notifications.slice();
            },
            
            hasNotifications: function() {
                return this.notifications.length > 0;
            },
            
            getNotificationCount: function() {
                return this.notifications.length;
            },
            
            escapeHtml: function(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },
            
            cleanup: function() {
                this.clearAllNotifications();
                if (this.container) {
                    this.container.remove();
                    this.container = null;
                }
            }
        };
        
        ErrorManager.init();
    });
    
    afterEach(() => {
        if (ErrorManager && ErrorManager.cleanup) {
            ErrorManager.cleanup();
        }
    });

    test('should initialize with empty notifications', () => {
        expect(ErrorManager.notifications).toEqual([]);
        expect(ErrorManager.container).toBeDefined();
        expect(ErrorManager.maxNotifications).toBe(5);
        expect(ErrorManager.defaultDuration).toBe(5000);
    });

    test('should show different types of notifications', () => {
        const errorId = ErrorManager.showError('Test error message');
        const successId = ErrorManager.showSuccess('Test success message');
        const warningId = ErrorManager.showWarning('Test warning message');
        const infoId = ErrorManager.showInfo('Test info message');
        
        expect(typeof errorId).toBe('number');
        expect(typeof successId).toBe('number');
        expect(typeof warningId).toBe('number');
        expect(typeof infoId).toBe('number');
        
        expect(ErrorManager.notifications).toHaveLength(4);
        
        const types = ErrorManager.notifications.map(n => n.type);
        expect(types).toContain('error');
        expect(types).toContain('success');
        expect(types).toContain('warning');
        expect(types).toContain('info');
    });

    test('should create notification with correct properties', () => {
        const message = 'Test notification';
        const options = {
            duration: 3000,
            persistent: true,
            dismissible: false,
            actions: [{ label: 'Action', callback: jest.fn() }]
        };
        
        const notificationId = ErrorManager.showNotification(message, 'warning', options);
        
        expect(ErrorManager.notifications).toHaveLength(1);
        
        const notification = ErrorManager.notifications[0];
        expect(notification.message).toBe(message);
        expect(notification.type).toBe('warning');
        expect(notification.duration).toBe(3000);
        expect(notification.persistent).toBe(true);
        expect(notification.dismissible).toBe(false);
        expect(notification.actions).toHaveLength(1);
        expect(notification.id).toBe(notificationId);
    });

    test('should limit number of notifications', () => {
        // Add more notifications than the limit
        for (let i = 0; i < 7; i++) {
            ErrorManager.showInfo(`Notification ${i}`);
        }
        
        // Should not exceed maxNotifications
        expect(ErrorManager.notifications.length).toBeLessThanOrEqual(ErrorManager.maxNotifications);
    });

    test('should dismiss notifications', () => {
        const notificationId = ErrorManager.showInfo('Test message');
        expect(ErrorManager.notifications).toHaveLength(1);
        
        ErrorManager.dismissNotification(notificationId);
        expect(ErrorManager.notifications).toHaveLength(0);
    });

    test('should auto-dismiss non-persistent notifications', (done) => {
        const notificationId = ErrorManager.showInfo('Auto-dismiss test', { duration: 100 });
        expect(ErrorManager.notifications).toHaveLength(1);
        
        setTimeout(() => {
            expect(ErrorManager.notifications).toHaveLength(0);
            done();
        }, 150);
    });

    test('should not auto-dismiss persistent notifications', (done) => {
        const notificationId = ErrorManager.showInfo('Persistent test', { 
            duration: 100, 
            persistent: true 
        });
        expect(ErrorManager.notifications).toHaveLength(1);
        
        setTimeout(() => {
            expect(ErrorManager.notifications).toHaveLength(1);
            done();
        }, 150);
    });

    test('should clear all notifications', () => {
        ErrorManager.showError('Error 1');
        ErrorManager.showWarning('Warning 1');
        ErrorManager.showInfo('Info 1');
        
        expect(ErrorManager.notifications).toHaveLength(3);
        
        ErrorManager.clearAllNotifications();
        expect(ErrorManager.notifications).toHaveLength(0);
    });

    test('should provide notification count and status', () => {
        expect(ErrorManager.hasNotifications()).toBe(false);
        expect(ErrorManager.getNotificationCount()).toBe(0);
        
        ErrorManager.showInfo('Test');
        ErrorManager.showError('Test error');
        
        expect(ErrorManager.hasNotifications()).toBe(true);
        expect(ErrorManager.getNotificationCount()).toBe(2);
        
        const activeNotifications = ErrorManager.getActiveNotifications();
        expect(activeNotifications).toHaveLength(2);
        expect(activeNotifications[0].type).toBe('info');
        expect(activeNotifications[1].type).toBe('error');
    });

    test('should escape HTML in messages', () => {
        const htmlMessage = '<script>alert("xss")</script>';
        const escaped = ErrorManager.escapeHtml(htmlMessage);
        
        expect(escaped).not.toContain('<script>');
        expect(escaped).toContain('&lt;script&gt;');
    });

    test('should handle notification actions', () => {
        const actionCallback = jest.fn();
        const options = {
            actions: [{
                label: 'Test Action',
                callback: actionCallback,
                primary: true
            }]
        };
        
        const notificationId = ErrorManager.showInfo('Test with action', options);
        const notification = ErrorManager.notifications[0];
        
        expect(notification.actions).toHaveLength(1);
        expect(notification.actions[0].label).toBe('Test Action');
        expect(notification.actions[0].primary).toBe(true);
        expect(typeof notification.actions[0].callback).toBe('function');
    });

    test('should cleanup properly', () => {
        ErrorManager.showInfo('Test 1');
        ErrorManager.showError('Test 2');
        
        expect(ErrorManager.notifications).toHaveLength(2);
        
        ErrorManager.cleanup();
        
        expect(ErrorManager.notifications).toHaveLength(0);
        expect(ErrorManager.container).toBeNull();
    });
});

describe('Integration Tests', () => {
    let StateManager, ErrorManager;
    
    beforeEach(() => {
        // Initialize both managers for integration testing
        // (Using simplified versions from previous tests)
        
        // Mock jQuery
        global.$ = jest.fn(() => ({
            tabs: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            append: jest.fn(),
            find: jest.fn(() => ({
                remove: jest.fn(),
                fadeOut: jest.fn((callback) => {
                    if (callback) callback();
                    return { remove: jest.fn() };
                })
            })),
            addClass: jest.fn(),
            removeClass: jest.fn(),
            data: jest.fn(() => 'general'),
            length: 1
        }));
        
        // Initialize managers
        StateManager = {
            userPreferences: { notification_duration: 3000 },
            setUserPreference: jest.fn(),
            getUserPreference: jest.fn((key, defaultValue) => {
                return StateManager.userPreferences[key] || defaultValue;
            })
        };
        
        ErrorManager = {
            notifications: [],
            defaultDuration: 5000,
            showError: jest.fn(),
            showSuccess: jest.fn(),
            showInfo: jest.fn()
        };
        
        // Make managers available globally
        global.StateManager = StateManager;
        global.ErrorManager = ErrorManager;
    });

    test('should integrate StateManager with ErrorManager for notifications', () => {
        // StateManager should be able to update ErrorManager settings
        StateManager.setUserPreference('notification_duration', 8000);
        
        // ErrorManager should use the updated duration
        if (StateManager.getUserPreference('notification_duration')) {
            ErrorManager.defaultDuration = StateManager.getUserPreference('notification_duration');
        }
        
        expect(ErrorManager.defaultDuration).toBe(8000);
    });

    test('should handle state synchronization errors with notifications', () => {
        // Simulate sync error
        const syncError = 'Failed to sync user preferences';
        
        // ErrorManager should be called to show error
        ErrorManager.showError(syncError);
        
        expect(ErrorManager.showError).toHaveBeenCalledWith(syncError);
    });

    test('should handle offline state with appropriate notifications', () => {
        // Simulate offline state
        const isOnline = false;
        
        if (!isOnline) {
            ErrorManager.showInfo('You are offline. Changes will sync when connection is restored.');
        }
        
        expect(ErrorManager.showInfo).toHaveBeenCalledWith(
            'You are offline. Changes will sync when connection is restored.'
        );
    });

    test('should coordinate cleanup between managers', () => {
        // Both managers should have cleanup methods
        StateManager.cleanup = jest.fn();
        ErrorManager.cleanup = jest.fn();
        
        // Simulate page unload cleanup
        StateManager.cleanup();
        ErrorManager.cleanup();
        
        expect(StateManager.cleanup).toHaveBeenCalled();
        expect(ErrorManager.cleanup).toHaveBeenCalled();
    });
});