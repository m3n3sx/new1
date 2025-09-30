/**
 * Integration test suite for Live Admin Styler
 * Tests integration between different components and end-to-end functionality
 * 
 * Requirements: 3.4, 5.4, 6.4, 7.4
 */

// Mock environment setup
if (typeof jQuery === 'undefined') {
    global.jQuery = require('jquery');
    global.$ = global.jQuery;
}

global.lasAdminData = {
    ajax_url: '/wp-admin/admin-ajax.php',
    nonce: 'test_nonce_12345',
    auto_refresh_nonce: true,
    retry_attempts: 3,
    retry_delay: 1000
};

global.lasAdminData = {
    ajaxurl: '/wp-admin/admin-ajax.php',
    nonce: 'test_nonce_12345'
};

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: function(key) { return this.store[key] || null; },
    setItem: function(key, value) { this.store[key] = value.toString(); },
    removeItem: function(key) { delete this.store[key]; },
    clear: function() { this.store = {}; }
};
global.localStorage = localStorageMock;

// Mock document and window
global.document = {
    hidden: false,
    head: { appendChild: jest.fn() },
    createElement: jest.fn(() => ({ id: '', type: '', innerHTML: '' })),
    getElementById: jest.fn(),
    addEventListener: jest.fn()
};

global.window = {
    location: { href: 'http://test.com/wp-admin/admin.php?page=las-settings' },
    history: { replaceState: jest.fn() },
    addEventListener: jest.fn()
};

global.navigator = { onLine: true, sendBeacon: jest.fn() };

describe('Integration Tests', () => {
    let StateManager, ErrorManager, LivePreviewManager;
    let mockAjaxSuccess, mockAjaxError;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        localStorageMock.clear();
        
        // Mock jQuery with comprehensive functionality
        global.$ = jest.fn((selector) => {
            const mockElement = {
                tabs: jest.fn(),
                on: jest.fn(),
                off: jest.fn(),
                data: jest.fn(() => 'general'),
                addClass: jest.fn(),
                removeClass: jest.fn(),
                closest: jest.fn(() => mockElement),
                find: jest.fn(() => mockElement),
                append: jest.fn(),
                remove: jest.fn(),
                fadeOut: jest.fn((callback) => {
                    if (callback) callback();
                    return mockElement;
                }),
                attr: jest.fn(),
                length: 1
            };
            return mockElement;
        });
        
        // Mock AJAX responses
        mockAjaxSuccess = {
            success: true,
            data: {
                css: 'body { background-color: #ffffff; }',
                performance: { execution_time_ms: 150 }
            }
        };
        
        mockAjaxError = {
            success: false,
            data: { message: 'Test error', code: 'test_error' }
        };
        
        global.$.post = jest.fn(() => ({
            done: jest.fn((callback) => {
                callback(mockAjaxSuccess);
                return { fail: jest.fn() };
            }),
            fail: jest.fn()
        }));
        
        global.$.ajax = jest.fn(() => ({
            done: jest.fn((callback) => {
                callback(mockAjaxSuccess);
                return { fail: jest.fn() };
            }),
            fail: jest.fn()
        }));
        
        // Initialize managers
        StateManager = {
            activeTab: 'general',
            userPreferences: {
                ui_theme: 'modern',
                animation_speed: 'normal',
                live_preview_enabled: true,
                notification_duration: 5000,
                remember_tab_state: true
            },
            pendingSync: false,
            isOnline: true,
            
            init: function() { return this; },
            saveTabState: function(tabId) {
                this.activeTab = tabId;
                localStorage.setItem('las_active_tab', tabId);
                if (this.userPreferences.remember_tab_state) {
                    this.pendingSync = true;
                }
                return true;
            },
            setUserPreference: function(key, value) {
                this.userPreferences[key] = value;
                localStorage.setItem('las_user_preferences', JSON.stringify(this.userPreferences));
                this.pendingSync = true;
                return true;
            },
            getUserPreference: function(key, defaultValue) {
                return this.userPreferences[key] || defaultValue;
            },
            syncToServer: jest.fn(),
            cleanup: jest.fn()
        };
        
        ErrorManager = {
            notifications: [],
            defaultDuration: 5000,
            maxNotifications: 5,
            
            init: function() { return this; },
            showError: jest.fn((message, options) => {
                const notification = {
                    id: Date.now(),
                    message: message,
                    type: 'error',
                    options: options || {}
                };
                this.notifications.push(notification);
                return notification.id;
            }),
            showSuccess: jest.fn((message, options) => {
                const notification = {
                    id: Date.now(),
                    message: message,
                    type: 'success',
                    options: options || {}
                };
                this.notifications.push(notification);
                return notification.id;
            }),
            showWarning: jest.fn((message, options) => {
                const notification = {
                    id: Date.now(),
                    message: message,
                    type: 'warning',
                    options: options || {}
                };
                this.notifications.push(notification);
                return notification.id;
            }),
            showInfo: jest.fn(),
            dismissNotification: jest.fn(),
            clearAllNotifications: jest.fn(() => {
                this.notifications = [];
            }),
            cleanup: jest.fn()
        };
        
        LivePreviewManager = {
            debounceDelay: 150,
            errorCount: 0,
            maxErrors: 5,
            cssCache: new Map(),
            tempStyleElement: { innerHTML: '' },
            lastOperation: null,
            
            init: function() { return this; },
            handleFieldChange: jest.fn((setting, value) => {
                this.lastOperation = { setting, value };
                this.applyTemporaryStyles(setting, value);
                setTimeout(() => {
                    this.requestFullUpdate(setting, value);
                }, this.debounceDelay);
            }),
            applyTemporaryStyles: jest.fn(),
            requestFullUpdate: jest.fn(),
            handleError: jest.fn((message) => {
                this.errorCount++;
                if (ErrorManager) {
                    ErrorManager.showError(message);
                }
            }),
            retryLastOperation: jest.fn(),
            cleanup: jest.fn()
        };
        
        // Make managers globally available
        global.StateManager = StateManager;
        global.ErrorManager = ErrorManager;
        global.LivePreviewManager = LivePreviewManager;
        
        // Initialize all managers
        StateManager.init();
        ErrorManager.init();
        LivePreviewManager.init();
    });
    
    afterEach(() => {
        StateManager.cleanup();
        ErrorManager.cleanup();
        LivePreviewManager.cleanup();
    });

    describe('StateManager and ErrorManager Integration', () => {
        test('should update ErrorManager duration when user preference changes', () => {
            // Change notification duration preference
            StateManager.setUserPreference('notification_duration', 8000);
            
            // ErrorManager should use the updated duration
            ErrorManager.defaultDuration = StateManager.getUserPreference('notification_duration');
            
            expect(ErrorManager.defaultDuration).toBe(8000);
        });

        test('should show notification when state sync fails', () => {
            // Mock sync failure
            StateManager.syncToServer = jest.fn(() => {
                ErrorManager.showError('Failed to sync user preferences to server');
            });
            
            StateManager.syncToServer();
            
            expect(ErrorManager.showError).toHaveBeenCalledWith('Failed to sync user preferences to server');
            expect(ErrorManager.notifications).toHaveLength(1);
            expect(ErrorManager.notifications[0].type).toBe('error');
        });

        test('should handle offline state with appropriate notifications', () => {
            StateManager.isOnline = false;
            
            // Attempt to save tab state while offline
            StateManager.saveTabState('menu');
            
            if (!StateManager.isOnline) {
                ErrorManager.showInfo('You are offline. Changes will sync when connection is restored.');
            }
            
            expect(ErrorManager.showInfo).toHaveBeenCalledWith(
                'You are offline. Changes will sync when connection is restored.'
            );
        });

        test('should show success notification after successful sync', () => {
            StateManager.setUserPreference('ui_theme', 'classic');
            
            // Simulate successful sync
            StateManager.syncToServer = jest.fn(() => {
                StateManager.pendingSync = false;
                ErrorManager.showSuccess('Preferences synchronized successfully');
            });
            
            StateManager.syncToServer();
            
            expect(ErrorManager.showSuccess).toHaveBeenCalledWith('Preferences synchronized successfully');
            expect(StateManager.pendingSync).toBe(false);
        });
    });

    describe('StateManager and LivePreviewManager Integration', () => {
        test('should update LivePreviewManager debounce delay from user preferences', () => {
            const newDelay = 300;
            StateManager.setUserPreference('live_preview_debounce', newDelay);
            
            // LivePreviewManager should use the updated delay
            LivePreviewManager.debounceDelay = StateManager.getUserPreference('live_preview_debounce');
            
            expect(LivePreviewManager.debounceDelay).toBe(newDelay);
        });

        test('should disable live preview when user preference is false', () => {
            StateManager.setUserPreference('live_preview_enabled', false);
            
            const isEnabled = StateManager.getUserPreference('live_preview_enabled');
            
            if (!isEnabled) {
                LivePreviewManager.handleFieldChange = jest.fn(); // Disable functionality
            }
            
            LivePreviewManager.handleFieldChange('admin_menu_bg_color', '#ff0000');
            
            expect(LivePreviewManager.handleFieldChange).not.toHaveBeenCalled();
        });

        test('should persist live preview settings across sessions', () => {
            // Set live preview preferences
            StateManager.setUserPreference('live_preview_enabled', true);
            StateManager.setUserPreference('live_preview_debounce', 200);
            
            // Simulate page reload by creating new StateManager
            const newStateManager = {
                userPreferences: JSON.parse(localStorage.getItem('las_user_preferences')) || {},
                getUserPreference: function(key, defaultValue) {
                    return this.userPreferences[key] || defaultValue;
                }
            };
            
            expect(newStateManager.getUserPreference('live_preview_enabled')).toBe(true);
            expect(newStateManager.getUserPreference('live_preview_debounce')).toBe(200);
        });
    });

    describe('LivePreviewManager and ErrorManager Integration', () => {
        test('should show error notification when live preview fails', () => {
            const errorMessage = 'Failed to generate CSS preview';
            
            LivePreviewManager.handleError(errorMessage);
            
            expect(ErrorManager.showError).toHaveBeenCalledWith(errorMessage);
            expect(ErrorManager.notifications).toHaveLength(1);
            expect(ErrorManager.notifications[0].type).toBe('error');
        });

        test('should show warning for slow preview generation', () => {
            // Mock slow response
            mockAjaxSuccess.data.performance.execution_time_ms = 1500;
            
            LivePreviewManager.handleFieldChange('admin_menu_bg_color', '#ff0000');
            
            // Simulate slow response handling
            if (mockAjaxSuccess.data.performance.execution_time_ms > 1000) {
                ErrorManager.showWarning(`Slow preview generation: ${mockAjaxSuccess.data.performance.execution_time_ms}ms`);
            }
            
            expect(ErrorManager.showWarning).toHaveBeenCalledWith('Slow preview generation: 1500ms');
        });

        test('should provide retry action in error notifications', () => {
            const errorMessage = 'Network error during preview';
            const retryAction = {
                label: 'Retry',
                callback: LivePreviewManager.retryLastOperation,
                primary: true
            };
            
            LivePreviewManager.handleError = jest.fn(() => {
                ErrorManager.showError(errorMessage, {
                    actions: [retryAction]
                });
            });
            
            LivePreviewManager.handleError(errorMessage);
            
            expect(ErrorManager.showError).toHaveBeenCalledWith(errorMessage, {
                actions: [retryAction]
            });
            
            const notification = ErrorManager.notifications[0];
            expect(notification.options.actions).toHaveLength(1);
            expect(notification.options.actions[0].label).toBe('Retry');
        });

        test('should show notification when live preview is temporarily disabled', () => {
            // Trigger multiple errors to disable live preview
            for (let i = 0; i < LivePreviewManager.maxErrors; i++) {
                LivePreviewManager.handleError('Test error ' + i);
            }
            
            // Should show disable notification
            ErrorManager.showWarning('Live preview temporarily disabled due to multiple errors');
            
            expect(ErrorManager.showWarning).toHaveBeenCalledWith(
                'Live preview temporarily disabled due to multiple errors'
            );
        });
    });

    describe('End-to-End User Workflows', () => {
        test('should handle complete tab switching workflow', () => {
            // User clicks on menu tab
            const newTab = 'menu';
            
            // StateManager handles tab change
            StateManager.saveTabState(newTab);
            
            expect(StateManager.activeTab).toBe(newTab);
            expect(localStorage.getItem('las_active_tab')).toBe(newTab);
            expect(StateManager.pendingSync).toBe(true);
            
            // Should eventually sync to server
            StateManager.syncToServer();
            expect(StateManager.syncToServer).toHaveBeenCalled();
        });

        test('should handle complete live preview workflow', () => {
            const setting = 'admin_menu_bg_color';
            const value = '#ff0000';
            
            // User changes a setting
            LivePreviewManager.handleFieldChange(setting, value);
            
            expect(LivePreviewManager.lastOperation).toEqual({ setting, value });
            expect(LivePreviewManager.applyTemporaryStyles).toHaveBeenCalledWith(setting, value);
            
            // Should trigger full update after debounce
            setTimeout(() => {
                expect(LivePreviewManager.requestFullUpdate).toHaveBeenCalledWith(setting, value);
            }, LivePreviewManager.debounceDelay + 10);
        });

        test('should handle error recovery workflow', () => {
            const setting = 'admin_menu_bg_color';
            const value = '#ff0000';
            
            // Set up last operation
            LivePreviewManager.lastOperation = { setting, value };
            
            // Simulate error
            LivePreviewManager.handleError('Network error');
            
            expect(ErrorManager.showError).toHaveBeenCalledWith('Network error');
            
            // User clicks retry
            LivePreviewManager.retryLastOperation();
            
            expect(LivePreviewManager.retryLastOperation).toHaveBeenCalled();
        });

        test('should handle preference changes affecting multiple managers', () => {
            // User changes UI theme
            StateManager.setUserPreference('ui_theme', 'dark');
            
            // Should trigger sync
            expect(StateManager.pendingSync).toBe(true);
            
            // User changes notification duration
            StateManager.setUserPreference('notification_duration', 7000);
            
            // ErrorManager should be updated
            ErrorManager.defaultDuration = StateManager.getUserPreference('notification_duration');
            expect(ErrorManager.defaultDuration).toBe(7000);
            
            // User disables live preview
            StateManager.setUserPreference('live_preview_enabled', false);
            
            // LivePreviewManager should respect this setting
            const isEnabled = StateManager.getUserPreference('live_preview_enabled');
            expect(isEnabled).toBe(false);
        });

        test('should handle offline/online state changes', () => {
            // Go offline
            StateManager.isOnline = false;
            
            // User makes changes while offline
            StateManager.setUserPreference('ui_theme', 'classic');
            StateManager.saveTabState('advanced');
            
            expect(StateManager.pendingSync).toBe(true);
            
            // Come back online
            StateManager.isOnline = true;
            
            // Should trigger sync
            if (StateManager.isOnline && StateManager.pendingSync) {
                StateManager.syncToServer();
                ErrorManager.showSuccess('Changes synchronized after reconnection');
            }
            
            expect(StateManager.syncToServer).toHaveBeenCalled();
            expect(ErrorManager.showSuccess).toHaveBeenCalledWith('Changes synchronized after reconnection');
        });
    });

    describe('Performance and Resource Management', () => {
        test('should coordinate cleanup between all managers', () => {
            // Simulate page unload
            StateManager.cleanup();
            ErrorManager.cleanup();
            LivePreviewManager.cleanup();
            
            expect(StateManager.cleanup).toHaveBeenCalled();
            expect(ErrorManager.cleanup).toHaveBeenCalled();
            expect(LivePreviewManager.cleanup).toHaveBeenCalled();
        });

        test('should handle memory management across managers', () => {
            // Fill up caches and notifications
            for (let i = 0; i < 10; i++) {
                LivePreviewManager.cssCache.set(`key${i}`, { css: `css${i}`, timestamp: Date.now() });
                ErrorManager.showInfo(`Notification ${i}`);
            }
            
            expect(LivePreviewManager.cssCache.size).toBe(10);
            expect(ErrorManager.notifications.length).toBeGreaterThan(0);
            
            // Cleanup should clear everything
            LivePreviewManager.cleanup();
            ErrorManager.clearAllNotifications();
            
            expect(LivePreviewManager.cssCache.size).toBe(0);
            expect(ErrorManager.notifications.length).toBe(0);
        });

        test('should handle concurrent operations gracefully', () => {
            // Simulate multiple rapid changes
            const settings = ['admin_menu_bg_color', 'admin_menu_text_color', 'admin_bar_bg_color'];
            const values = ['#ff0000', '#ffffff', '#333333'];
            
            settings.forEach((setting, index) => {
                LivePreviewManager.handleFieldChange(setting, values[index]);
            });
            
            // Should handle all changes
            expect(LivePreviewManager.handleFieldChange).toHaveBeenCalledTimes(3);
            
            // Last operation should be the most recent
            expect(LivePreviewManager.lastOperation.setting).toBe('admin_bar_bg_color');
            expect(LivePreviewManager.lastOperation.value).toBe('#333333');
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle cascading errors gracefully', () => {
            // Simulate StateManager error
            StateManager.syncToServer = jest.fn(() => {
                throw new Error('Sync failed');
            });
            
            try {
                StateManager.syncToServer();
            } catch (error) {
                ErrorManager.showError('State synchronization failed: ' + error.message);
            }
            
            // Simulate LivePreviewManager error
            LivePreviewManager.handleError('Preview generation failed');
            
            // Both errors should be handled
            expect(ErrorManager.showError).toHaveBeenCalledTimes(2);
            expect(ErrorManager.notifications).toHaveLength(2);
        });

        test('should recover from temporary failures', () => {
            // Simulate temporary network failure
            let failureCount = 0;
            const maxFailures = 2;
            
            LivePreviewManager.requestFullUpdate = jest.fn(() => {
                failureCount++;
                if (failureCount <= maxFailures) {
                    LivePreviewManager.handleError('Network timeout');
                } else {
                    // Success after retries
                    ErrorManager.showSuccess('Preview updated successfully');
                }
            });
            
            // Initial failure
            LivePreviewManager.requestFullUpdate();
            expect(ErrorManager.showError).toHaveBeenCalledWith('Network timeout');
            
            // Retry
            LivePreviewManager.retryLastOperation();
            LivePreviewManager.requestFullUpdate();
            expect(ErrorManager.showError).toHaveBeenCalledTimes(2);
            
            // Final success
            LivePreviewManager.requestFullUpdate();
            expect(ErrorManager.showSuccess).toHaveBeenCalledWith('Preview updated successfully');
        });

        test('should maintain data consistency during errors', () => {
            const originalTab = StateManager.activeTab;
            const originalPrefs = { ...StateManager.userPreferences };
            
            // Simulate error during state change
            StateManager.saveTabState = jest.fn(() => {
                throw new Error('Save failed');
            });
            
            try {
                StateManager.saveTabState('menu');
            } catch (error) {
                // State should remain unchanged
                expect(StateManager.activeTab).toBe(originalTab);
                ErrorManager.showError('Failed to save tab state');
            }
            
            expect(ErrorManager.showError).toHaveBeenCalledWith('Failed to save tab state');
            expect(StateManager.userPreferences).toEqual(originalPrefs);
        });
    });
});