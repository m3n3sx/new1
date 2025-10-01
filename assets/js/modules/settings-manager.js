/**
 * Settings Manager Module
 * 
 * Handles client-side settings management with debounced operations,
 * localStorage integration, and multi-tab synchronization
 * 
 * @since 2.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * SettingsManager Class
     */
    class SettingsManager {
        constructor(core) {
            this.core = core;
            this.settings = {};
            this.originalSettings = {};
            this.debounceTimers = new Map();
            this.debounceDelay = 300; // 300ms debounce delay
            
            // Multi-tab synchronization
            this.broadcastChannel = null;
            this.storageEventBound = false;
            
            // Change tracking
            this.changeListeners = new Map();
            this.isDirty = false;
            
            this.init();
        }

        /**
         * Initialize the settings manager
         */
        init() {
            this.setupMultiTabSync();
            this.loadSettings();
            this.setupAutoSave();
            
            this.core.log('SettingsManager initialized', {
                settingsCount: Object.keys(this.settings).length,
                hasBroadcastChannel: !!this.broadcastChannel
            });
        }

        /**
         * Setup multi-tab synchronization
         */
        setupMultiTabSync() {
            // Try BroadcastChannel API first (modern browsers)
            if (window.BroadcastChannel) {
                try {
                    this.broadcastChannel = new BroadcastChannel('las-settings');
                    this.broadcastChannel.addEventListener('message', (event) => {
                        this.handleBroadcastMessage(event.data);
                    });
                    this.core.log('BroadcastChannel initialized for multi-tab sync');
                } catch (error) {
                    this.core.handleError('Failed to initialize BroadcastChannel', error);
                    this.setupStorageEventFallback();
                }
            } else {
                // Fallback to storage events for older browsers
                this.setupStorageEventFallback();
            }
        }

        /**
         * Setup storage event fallback for multi-tab sync
         */
        setupStorageEventFallback() {
            if (!this.storageEventBound) {
                window.addEventListener('storage', (event) => {
                    if (event.key === 'las-settings-sync') {
                        try {
                            const data = JSON.parse(event.newValue);
                            this.handleSyncMessage(data);
                        } catch (error) {
                            this.core.handleError('Failed to parse storage sync message', error);
                        }
                    }
                });
                this.storageEventBound = true;
                this.core.log('Storage event fallback initialized for multi-tab sync');
            }
        }

        /**
         * Handle broadcast channel messages
         * @param {Object} data - Message data
         */
        handleBroadcastMessage(data) {
            if (data.type === 'settings-changed' && data.source !== this.getTabId()) {
                this.handleSyncMessage(data);
            }
        }

        /**
         * Handle synchronization messages from other tabs
         * @param {Object} data - Sync data
         */
        handleSyncMessage(data) {
            if (data.settings) {
                const oldSettings = { ...this.settings };
                this.settings = { ...this.settings, ...data.settings };
                
                // Notify listeners of external changes
                Object.keys(data.settings).forEach(key => {
                    if (oldSettings[key] !== data.settings[key]) {
                        this.notifyChangeListeners(key, data.settings[key], oldSettings[key], true);
                    }
                });
                
                this.core.emit('settings:synced', {
                    changes: data.settings,
                    source: data.source
                });
                
                this.core.log('Settings synchronized from another tab', data.settings);
            }
        }

        /**
         * Get unique tab identifier
         * @returns {string}
         */
        getTabId() {
            if (!this.tabId) {
                this.tabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            }
            return this.tabId;
        }

        /**
         * Load settings from localStorage and server
         */
        loadSettings() {
            try {
                // Load from localStorage first (faster)
                const localSettings = this.getFromLocalStorage();
                if (localSettings) {
                    this.settings = { ...localSettings };
                }

                // Load from server (authoritative)
                this.loadFromServer();
                
            } catch (error) {
                this.core.handleError('Failed to load settings', error);
            }
        }

        /**
         * Load settings from localStorage
         * @returns {Object|null}
         */
        getFromLocalStorage() {
            try {
                const stored = localStorage.getItem('las-settings');
                return stored ? JSON.parse(stored) : null;
            } catch (error) {
                this.core.handleError('Failed to load from localStorage', error);
                return null;
            }
        }

        /**
         * Save settings to localStorage
         */
        saveToLocalStorage() {
            try {
                localStorage.setItem('las-settings', JSON.stringify(this.settings));
            } catch (error) {
                this.core.handleError('Failed to save to localStorage', error);
            }
        }

        /**
         * Load settings from server
         */
        async loadFromServer() {
            try {
                const ajaxManager = this.core.getModule('ajax-manager');
                if (!ajaxManager) {
                    this.core.log('AjaxManager not available, skipping server load');
                    return;
                }

                const response = await ajaxManager.request('get_settings', {});
                if (response && response.settings) {
                    const serverSettings = response.settings;
                    
                    // Merge server settings with local settings
                    const mergedSettings = { ...this.settings, ...serverSettings };
                    
                    // Check for conflicts
                    const conflicts = this.detectConflicts(this.settings, serverSettings);
                    if (conflicts.length > 0) {
                        this.core.emit('settings:conflicts', { conflicts, local: this.settings, server: serverSettings });
                    }
                    
                    this.originalSettings = { ...serverSettings };
                    this.settings = mergedSettings;
                    this.saveToLocalStorage();
                    
                    this.core.emit('settings:loaded', { settings: this.settings });
                }
            } catch (error) {
                this.core.handleError('Failed to load settings from server', error);
            }
        }

        /**
         * Detect conflicts between local and server settings
         * @param {Object} local - Local settings
         * @param {Object} server - Server settings
         * @returns {Array} Array of conflicts
         */
        detectConflicts(local, server) {
            const conflicts = [];
            
            Object.keys(local).forEach(key => {
                if (server.hasOwnProperty(key) && local[key] !== server[key]) {
                    conflicts.push({
                        key,
                        local: local[key],
                        server: server[key]
                    });
                }
            });
            
            return conflicts;
        }

        /**
         * Get a setting value
         * @param {string} key - Setting key (supports dot notation)
         * @param {*} defaultValue - Default value if not found
         * @returns {*}
         */
        get(key, defaultValue = null) {
            try {
                if (key.includes('.')) {
                    return this.getNestedValue(this.settings, key, defaultValue);
                }
                
                return this.settings.hasOwnProperty(key) ? this.settings[key] : defaultValue;
            } catch (error) {
                this.core.handleError(`Failed to get setting: ${key}`, error);
                return defaultValue;
            }
        }

        /**
         * Set a setting value with debounced saving
         * @param {string} key - Setting key (supports dot notation)
         * @param {*} value - Setting value
         * @param {boolean} immediate - Skip debouncing if true
         */
        set(key, value, immediate = false) {
            try {
                const oldValue = this.get(key);
                
                if (key.includes('.')) {
                    this.setNestedValue(this.settings, key, value);
                } else {
                    this.settings[key] = value;
                }
                
                this.isDirty = true;
                
                // Save to localStorage immediately for responsiveness
                this.saveToLocalStorage();
                
                // Notify change listeners
                this.notifyChangeListeners(key, value, oldValue, false);
                
                // Emit change event
                this.core.emit('settings:changed', { key, value, oldValue });
                
                // Debounced server save
                if (immediate) {
                    this.saveToServer();
                } else {
                    this.debouncedSave(key);
                }
                
                // Broadcast to other tabs
                this.broadcastChange(key, value);
                
            } catch (error) {
                this.core.handleError(`Failed to set setting: ${key}`, error);
            }
        }

        /**
         * Set multiple settings at once
         * @param {Object} settings - Settings object
         * @param {boolean} immediate - Skip debouncing if true
         */
        setMultiple(settings, immediate = false) {
            const changes = {};
            
            Object.entries(settings).forEach(([key, value]) => {
                const oldValue = this.get(key);
                
                if (key.includes('.')) {
                    this.setNestedValue(this.settings, key, value);
                } else {
                    this.settings[key] = value;
                }
                
                changes[key] = { value, oldValue };
                this.notifyChangeListeners(key, value, oldValue, false);
            });
            
            this.isDirty = true;
            this.saveToLocalStorage();
            
            this.core.emit('settings:bulk-changed', { changes });
            
            if (immediate) {
                this.saveToServer();
            } else {
                this.debouncedSave('bulk');
            }
            
            // Broadcast bulk changes
            this.broadcastBulkChange(settings);
        }

        /**
         * Get nested value using dot notation
         * @param {Object} obj - Object to search
         * @param {string} path - Dot notation path
         * @param {*} defaultValue - Default value
         * @returns {*}
         */
        getNestedValue(obj, path, defaultValue) {
            return path.split('.').reduce((current, key) => {
                return (current && current[key] !== undefined) ? current[key] : defaultValue;
            }, obj);
        }

        /**
         * Set nested value using dot notation
         * @param {Object} obj - Object to modify
         * @param {string} path - Dot notation path
         * @param {*} value - Value to set
         */
        setNestedValue(obj, path, value) {
            const keys = path.split('.');
            const lastKey = keys.pop();
            
            const target = keys.reduce((current, key) => {
                if (!current[key] || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                return current[key];
            }, obj);
            
            target[lastKey] = value;
        }

        /**
         * Debounced save to server
         * @param {string} key - Setting key for timer identification
         */
        debouncedSave(key) {
            // Clear existing timer for this key
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            // Set new timer
            const timer = setTimeout(() => {
                this.saveToServer();
                this.debounceTimers.delete(key);
            }, this.debounceDelay);
            
            this.debounceTimers.set(key, timer);
        }

        /**
         * Save settings to server
         */
        async saveToServer() {
            if (!this.isDirty) {
                return;
            }
            
            try {
                const ajaxManager = this.core.getModule('ajax-manager');
                if (!ajaxManager) {
                    this.core.log('AjaxManager not available, skipping server save');
                    return;
                }

                const response = await ajaxManager.request('save_settings', {
                    settings: this.settings
                });
                
                if (response && response.success) {
                    this.originalSettings = { ...this.settings };
                    this.isDirty = false;
                    this.core.emit('settings:saved', { settings: this.settings });
                    this.core.log('Settings saved to server');
                } else {
                    throw new Error(response?.message || 'Save failed');
                }
                
            } catch (error) {
                this.core.handleError('Failed to save settings to server', error);
                this.core.emit('settings:save-failed', { error });
            }
        }

        /**
         * Setup auto-save functionality
         */
        setupAutoSave() {
            // Save on page unload
            window.addEventListener('beforeunload', () => {
                if (this.isDirty) {
                    // Use sendBeacon for reliable saving on page unload
                    this.saveWithBeacon();
                }
            });
            
            // Periodic auto-save
            setInterval(() => {
                if (this.isDirty) {
                    this.saveToServer();
                }
            }, 30000); // Every 30 seconds
        }

        /**
         * Save using sendBeacon for page unload
         */
        saveWithBeacon() {
            if (navigator.sendBeacon && this.core.config.ajaxUrl) {
                const formData = new FormData();
                formData.append('action', 'las_save_settings');
                formData.append('settings', JSON.stringify(this.settings));
                formData.append('nonce', this.core.config.nonce);
                
                navigator.sendBeacon(this.core.config.ajaxUrl, formData);
            }
        }

        /**
         * Broadcast setting change to other tabs
         * @param {string} key - Setting key
         * @param {*} value - Setting value
         */
        broadcastChange(key, value) {
            const message = {
                type: 'settings-changed',
                source: this.getTabId(),
                settings: { [key]: value },
                timestamp: Date.now()
            };
            
            if (this.broadcastChannel) {
                this.broadcastChannel.postMessage(message);
            } else {
                // Fallback to localStorage
                localStorage.setItem('las-settings-sync', JSON.stringify(message));
                localStorage.removeItem('las-settings-sync'); // Trigger storage event
            }
        }

        /**
         * Broadcast bulk changes to other tabs
         * @param {Object} settings - Settings object
         */
        broadcastBulkChange(settings) {
            const message = {
                type: 'settings-changed',
                source: this.getTabId(),
                settings: settings,
                timestamp: Date.now()
            };
            
            if (this.broadcastChannel) {
                this.broadcastChannel.postMessage(message);
            } else {
                localStorage.setItem('las-settings-sync', JSON.stringify(message));
                localStorage.removeItem('las-settings-sync');
            }
        }

        /**
         * Add change listener for specific setting
         * @param {string} key - Setting key
         * @param {Function} callback - Callback function
         */
        onChange(key, callback) {
            if (!this.changeListeners.has(key)) {
                this.changeListeners.set(key, []);
            }
            this.changeListeners.get(key).push(callback);
        }

        /**
         * Remove change listener
         * @param {string} key - Setting key
         * @param {Function} callback - Callback function
         */
        offChange(key, callback) {
            if (this.changeListeners.has(key)) {
                const listeners = this.changeListeners.get(key);
                const index = listeners.indexOf(callback);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }
        }

        /**
         * Notify change listeners
         * @param {string} key - Setting key
         * @param {*} newValue - New value
         * @param {*} oldValue - Old value
         * @param {boolean} external - Whether change came from another tab
         */
        notifyChangeListeners(key, newValue, oldValue, external = false) {
            if (this.changeListeners.has(key)) {
                this.changeListeners.get(key).forEach(callback => {
                    try {
                        callback(newValue, oldValue, key, external);
                    } catch (error) {
                        this.core.handleError(`Change listener error for ${key}`, error);
                    }
                });
            }
        }

        /**
         * Reset settings to original values
         */
        reset() {
            this.settings = { ...this.originalSettings };
            this.isDirty = false;
            this.saveToLocalStorage();
            this.core.emit('settings:reset', { settings: this.settings });
        }

        /**
         * Check if settings have unsaved changes
         * @returns {boolean}
         */
        hasUnsavedChanges() {
            return this.isDirty;
        }

        /**
         * Get all settings
         * @returns {Object}
         */
        getAll() {
            return { ...this.settings };
        }

        /**
         * Clear all settings
         */
        clear() {
            this.settings = {};
            this.originalSettings = {};
            this.isDirty = true;
            this.saveToLocalStorage();
            this.saveToServer();
            this.core.emit('settings:cleared');
        }

        /**
         * Cleanup resources
         */
        destroy() {
            // Clear debounce timers
            this.debounceTimers.forEach(timer => clearTimeout(timer));
            this.debounceTimers.clear();
            
            // Close broadcast channel
            if (this.broadcastChannel) {
                this.broadcastChannel.close();
            }
            
            // Save any pending changes
            if (this.isDirty) {
                this.saveWithBeacon();
            }
            
            this.core.log('SettingsManager destroyed');
        }
    }

    // Export for ES6 modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SettingsManager;
    }
    
    // Export for AMD
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return SettingsManager;
        });
    }
    
    // Register with LAS core for IE11 compatibility
    if (window.LAS && typeof window.LAS.registerModule === 'function') {
        window.LAS.registerModule('settings-manager', SettingsManager);
    }
    
    // Global export as fallback
    window.LASSettingsManager = SettingsManager;

})(window, document);