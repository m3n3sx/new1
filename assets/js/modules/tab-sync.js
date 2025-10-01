/**
 * Tab Synchronization Module
 * 
 * Handles multi-tab synchronization using BroadcastChannel API
 * with fallback mechanisms for browsers without support
 * 
 * @since 2.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * TabSync Class
     */
    class TabSync {
        constructor(core, options = {}) {
            this.core = core;
            this.options = {
                channelName: 'las-tab-sync',
                storageKey: 'las-tab-sync-fallback',
                heartbeatInterval: 5000, // 5 seconds
                tabTimeout: 15000, // 15 seconds
                enableConflictResolution: true,
                enableLeaderElection: true,
                ...options
            };
            
            // Tab identification
            this.tabId = this.generateTabId();
            this.isLeader = false;
            this.lastHeartbeat = Date.now();
            
            // Communication channels
            this.broadcastChannel = null;
            this.usesBroadcastChannel = false;
            this.usesStorageEvents = false;
            
            // Active tabs tracking
            this.activeTabs = new Map();
            this.tabRegistry = new Map();
            
            // Message queue for offline tabs
            this.messageQueue = [];
            this.maxQueueSize = 100;
            
            // Conflict resolution
            this.conflictResolver = null;
            this.pendingConflicts = new Map();
            
            // Event handlers (bound to maintain context)
            this.handleBroadcastMessage = this.handleBroadcastMessage.bind(this);
            this.handleStorageEvent = this.handleStorageEvent.bind(this);
            this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
            this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
            
            // Timers
            this.heartbeatTimer = null;
            this.cleanupTimer = null;
            
            this.init();
        }

        /**
         * Initialize tab synchronization
         */
        init() {
            this.setupCommunicationChannel();
            this.setupEventListeners();
            this.startHeartbeat();
            this.registerTab();
            
            if (this.options.enableLeaderElection) {
                this.electLeader();
            }
            
            this.core.log('TabSync initialized', {
                tabId: this.tabId,
                usesBroadcastChannel: this.usesBroadcastChannel,
                usesStorageEvents: this.usesStorageEvents
            });
        }

        /**
         * Setup communication channel (BroadcastChannel or localStorage fallback)
         */
        setupCommunicationChannel() {
            // Try BroadcastChannel first
            if (window.BroadcastChannel) {
                try {
                    this.broadcastChannel = new BroadcastChannel(this.options.channelName);
                    this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage);
                    this.usesBroadcastChannel = true;
                    
                    this.core.log('BroadcastChannel initialized for tab sync');
                    return;
                } catch (error) {
                    this.core.handleError('Failed to initialize BroadcastChannel', error);
                }
            }
            
            // Fallback to localStorage events
            this.setupStorageEventFallback();
        }

        /**
         * Setup localStorage event fallback
         */
        setupStorageEventFallback() {
            window.addEventListener('storage', this.handleStorageEvent);
            this.usesStorageEvents = true;
            
            this.core.log('Storage event fallback initialized for tab sync');
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Listen for settings changes to sync
            this.core.on('settings:changed', (data) => {
                this.broadcastMessage('settings-changed', {
                    key: data.key,
                    value: data.value,
                    oldValue: data.oldValue
                });
            });
            
            // Listen for bulk settings changes
            this.core.on('settings:bulk-changed', (data) => {
                this.broadcastMessage('settings-bulk-changed', {
                    changes: data.changes
                });
            });
            
            // Listen for auto-save events
            this.core.on('auto-save:saved', (data) => {
                this.broadcastMessage('auto-save-completed', {
                    state: data.state,
                    timestamp: data.timestamp
                });
            });
            
            // Listen for live edit events
            this.core.on('live-edit:activated', () => {
                this.broadcastMessage('live-edit-activated', { tabId: this.tabId });
            });
            
            this.core.on('live-edit:deactivated', () => {
                this.broadcastMessage('live-edit-deactivated', { tabId: this.tabId });
            });
            
            // Page visibility and unload events
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            window.addEventListener('beforeunload', this.handleBeforeUnload);
        }

        /**
         * Generate unique tab ID
         * @returns {string} Unique tab ID
         */
        generateTabId() {
            return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Register this tab in the registry
         */
        registerTab() {
            const tabInfo = {
                id: this.tabId,
                url: window.location.href,
                title: document.title,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
                isActive: !document.hidden,
                isLeader: this.isLeader
            };
            
            this.tabRegistry.set(this.tabId, tabInfo);
            this.activeTabs.set(this.tabId, Date.now());
            
            this.broadcastMessage('tab-registered', tabInfo);
            
            this.core.emit('tab-sync:tab-registered', tabInfo);
        }

        /**
         * Unregister this tab
         */
        unregisterTab() {
            this.broadcastMessage('tab-unregistered', { tabId: this.tabId });
            
            this.tabRegistry.delete(this.tabId);
            this.activeTabs.delete(this.tabId);
            
            this.core.emit('tab-sync:tab-unregistered', { tabId: this.tabId });
        }

        /**
         * Start heartbeat to maintain tab presence
         */
        startHeartbeat() {
            this.heartbeatTimer = setInterval(() => {
                this.sendHeartbeat();
                this.cleanupInactiveTabs();
            }, this.options.heartbeatInterval);
        }

        /**
         * Send heartbeat message
         */
        sendHeartbeat() {
            this.lastHeartbeat = Date.now();
            
            this.broadcastMessage('heartbeat', {
                tabId: this.tabId,
                timestamp: this.lastHeartbeat,
                isActive: !document.hidden,
                isLeader: this.isLeader
            });
            
            // Update local registry
            if (this.tabRegistry.has(this.tabId)) {
                const tabInfo = this.tabRegistry.get(this.tabId);
                tabInfo.timestamp = this.lastHeartbeat;
                tabInfo.isActive = !document.hidden;
                tabInfo.isLeader = this.isLeader;
            }
        }

        /**
         * Clean up inactive tabs from registry
         */
        cleanupInactiveTabs() {
            const now = Date.now();
            const timeout = this.options.tabTimeout;
            
            for (const [tabId, lastSeen] of this.activeTabs.entries()) {
                if (now - lastSeen > timeout && tabId !== this.tabId) {
                    this.activeTabs.delete(tabId);
                    this.tabRegistry.delete(tabId);
                    
                    this.core.emit('tab-sync:tab-timeout', { tabId });
                    
                    // Re-elect leader if the leader tab timed out
                    if (this.options.enableLeaderElection) {
                        const timedOutTab = this.tabRegistry.get(tabId);
                        if (timedOutTab && timedOutTab.isLeader) {
                            this.electLeader();
                        }
                    }
                }
            }
        }

        /**
         * Elect leader tab
         */
        electLeader() {
            // Simple leader election: oldest active tab becomes leader
            let oldestTab = null;
            let oldestTimestamp = Infinity;
            
            for (const [tabId, tabInfo] of this.tabRegistry.entries()) {
                if (this.activeTabs.has(tabId) && tabInfo.timestamp < oldestTimestamp) {
                    oldestTab = tabId;
                    oldestTimestamp = tabInfo.timestamp;
                }
            }
            
            const wasLeader = this.isLeader;
            this.isLeader = (oldestTab === this.tabId);
            
            if (this.isLeader && !wasLeader) {
                this.broadcastMessage('leader-elected', { tabId: this.tabId });
                this.core.emit('tab-sync:leader-elected', { tabId: this.tabId });
                this.core.log('Tab elected as leader', { tabId: this.tabId });
            } else if (!this.isLeader && wasLeader) {
                this.core.emit('tab-sync:leader-changed', { newLeader: oldestTab });
                this.core.log('Leadership transferred', { newLeader: oldestTab });
            }
        }

        /**
         * Broadcast message to other tabs
         * @param {string} type - Message type
         * @param {Object} data - Message data
         */
        broadcastMessage(type, data = {}) {
            const message = {
                type: type,
                data: data,
                source: this.tabId,
                timestamp: Date.now()
            };
            
            if (this.usesBroadcastChannel) {
                try {
                    this.broadcastChannel.postMessage(message);
                } catch (error) {
                    this.core.handleError('Failed to broadcast message', error);
                    // Fallback to storage if broadcast fails
                    this.broadcastViaStorage(message);
                }
            } else if (this.usesStorageEvents) {
                this.broadcastViaStorage(message);
            }
            
            // Add to message queue for potential offline tabs
            this.addToMessageQueue(message);
        }

        /**
         * Broadcast message via localStorage
         * @param {Object} message - Message to broadcast
         */
        broadcastViaStorage(message) {
            try {
                const key = `${this.options.storageKey}-${Date.now()}-${Math.random()}`;
                localStorage.setItem(key, JSON.stringify(message));
                
                // Clean up immediately to avoid storage bloat
                setTimeout(() => {
                    localStorage.removeItem(key);
                }, 100);
                
            } catch (error) {
                this.core.handleError('Failed to broadcast via storage', error);
            }
        }

        /**
         * Add message to queue for offline tabs
         * @param {Object} message - Message to queue
         */
        addToMessageQueue(message) {
            this.messageQueue.push(message);
            
            // Limit queue size
            if (this.messageQueue.length > this.maxQueueSize) {
                this.messageQueue = this.messageQueue.slice(-this.maxQueueSize);
            }
        }

        /**
         * Handle BroadcastChannel messages
         * @param {MessageEvent} event - Message event
         */
        handleBroadcastMessage(event) {
            const message = event.data;
            this.processMessage(message);
        }

        /**
         * Handle localStorage events (fallback)
         * @param {StorageEvent} event - Storage event
         */
        handleStorageEvent(event) {
            if (!event.key || !event.key.startsWith(this.options.storageKey)) {
                return;
            }
            
            try {
                const message = JSON.parse(event.newValue);
                this.processMessage(message);
            } catch (error) {
                this.core.handleError('Failed to parse storage sync message', error);
            }
        }

        /**
         * Process incoming message
         * @param {Object} message - Message to process
         */
        processMessage(message) {
            // Ignore messages from this tab
            if (message.source === this.tabId) {
                return;
            }
            
            // Update tab registry
            this.updateTabRegistry(message);
            
            // Handle message based on type
            switch (message.type) {
                case 'settings-changed':
                    this.handleSettingsChanged(message);
                    break;
                case 'settings-bulk-changed':
                    this.handleSettingsBulkChanged(message);
                    break;
                case 'auto-save-completed':
                    this.handleAutoSaveCompleted(message);
                    break;
                case 'live-edit-activated':
                    this.handleLiveEditActivated(message);
                    break;
                case 'live-edit-deactivated':
                    this.handleLiveEditDeactivated(message);
                    break;
                case 'tab-registered':
                    this.handleTabRegistered(message);
                    break;
                case 'tab-unregistered':
                    this.handleTabUnregistered(message);
                    break;
                case 'heartbeat':
                    this.handleHeartbeat(message);
                    break;
                case 'leader-elected':
                    this.handleLeaderElected(message);
                    break;
                case 'conflict-resolution':
                    this.handleConflictResolution(message);
                    break;
                default:
                    this.core.log('Unknown message type received', { type: message.type });
            }
            
            this.core.emit('tab-sync:message-received', message);
        }

        /**
         * Update tab registry from message
         * @param {Object} message - Message containing tab info
         */
        updateTabRegistry(message) {
            const tabId = message.source;
            this.activeTabs.set(tabId, message.timestamp);
            
            if (message.data && message.data.tabId === tabId) {
                // Update or create tab info
                const existingInfo = this.tabRegistry.get(tabId) || {};
                const updatedInfo = {
                    ...existingInfo,
                    id: tabId,
                    timestamp: message.timestamp,
                    ...message.data
                };
                
                this.tabRegistry.set(tabId, updatedInfo);
            }
        }

        /**
         * Handle settings changed message
         * @param {Object} message - Settings changed message
         */
        handleSettingsChanged(message) {
            const { key, value, oldValue } = message.data;
            
            // Check for conflicts
            if (this.options.enableConflictResolution) {
                const conflict = this.detectConflict('setting', key, value, oldValue);
                if (conflict) {
                    this.handleConflict(conflict, message);
                    return;
                }
            }
            
            // Apply change locally
            const settingsManager = this.core.getModule('settings-manager');
            if (settingsManager) {
                // Set without triggering sync to avoid infinite loop
                settingsManager.set(key, value, true);
            }
            
            this.core.emit('tab-sync:settings-synced', {
                key: key,
                value: value,
                source: message.source
            });
        }

        /**
         * Handle bulk settings changed message
         * @param {Object} message - Bulk settings changed message
         */
        handleSettingsBulkChanged(message) {
            const { changes } = message.data;
            
            // Apply changes locally
            const settingsManager = this.core.getModule('settings-manager');
            if (settingsManager) {
                const settings = {};
                Object.entries(changes).forEach(([key, change]) => {
                    settings[key] = change.value || change;
                });
                
                settingsManager.setMultiple(settings, true);
            }
            
            this.core.emit('tab-sync:settings-bulk-synced', {
                changes: changes,
                source: message.source
            });
        }

        /**
         * Handle auto-save completed message
         * @param {Object} message - Auto-save completed message
         */
        handleAutoSaveCompleted(message) {
            const { state, timestamp } = message.data;
            
            this.core.emit('tab-sync:auto-save-synced', {
                state: state,
                timestamp: timestamp,
                source: message.source
            });
        }

        /**
         * Handle live edit activated message
         * @param {Object} message - Live edit activated message
         */
        handleLiveEditActivated(message) {
            this.core.emit('tab-sync:live-edit-activated', {
                tabId: message.data.tabId,
                source: message.source
            });
        }

        /**
         * Handle live edit deactivated message
         * @param {Object} message - Live edit deactivated message
         */
        handleLiveEditDeactivated(message) {
            this.core.emit('tab-sync:live-edit-deactivated', {
                tabId: message.data.tabId,
                source: message.source
            });
        }

        /**
         * Handle tab registered message
         * @param {Object} message - Tab registered message
         */
        handleTabRegistered(message) {
            const tabInfo = message.data;
            this.tabRegistry.set(tabInfo.id, tabInfo);
            this.activeTabs.set(tabInfo.id, message.timestamp);
            
            // Re-elect leader if needed
            if (this.options.enableLeaderElection) {
                this.electLeader();
            }
            
            this.core.emit('tab-sync:tab-registered', tabInfo);
        }

        /**
         * Handle tab unregistered message
         * @param {Object} message - Tab unregistered message
         */
        handleTabUnregistered(message) {
            const { tabId } = message.data;
            
            this.tabRegistry.delete(tabId);
            this.activeTabs.delete(tabId);
            
            // Re-elect leader if the unregistered tab was the leader
            if (this.options.enableLeaderElection) {
                const tabInfo = this.tabRegistry.get(tabId);
                if (tabInfo && tabInfo.isLeader) {
                    this.electLeader();
                }
            }
            
            this.core.emit('tab-sync:tab-unregistered', { tabId });
        }

        /**
         * Handle heartbeat message
         * @param {Object} message - Heartbeat message
         */
        handleHeartbeat(message) {
            const { tabId, timestamp, isActive, isLeader } = message.data;
            
            this.activeTabs.set(tabId, timestamp);
            
            // Update tab info
            if (this.tabRegistry.has(tabId)) {
                const tabInfo = this.tabRegistry.get(tabId);
                tabInfo.timestamp = timestamp;
                tabInfo.isActive = isActive;
                tabInfo.isLeader = isLeader;
            }
        }

        /**
         * Handle leader elected message
         * @param {Object} message - Leader elected message
         */
        handleLeaderElected(message) {
            const { tabId } = message.data;
            
            // Update leader status in registry
            for (const [id, tabInfo] of this.tabRegistry.entries()) {
                tabInfo.isLeader = (id === tabId);
            }
            
            this.core.emit('tab-sync:leader-changed', { newLeader: tabId });
        }

        /**
         * Detect conflicts between tabs
         * @param {string} type - Change type
         * @param {string} key - Change key
         * @param {*} value - New value
         * @param {*} oldValue - Old value
         * @returns {Object|null} Conflict object or null
         */
        detectConflict(type, key, value, oldValue) {
            // Simple conflict detection: check if we have a different value for the same key
            const settingsManager = this.core.getModule('settings-manager');
            if (settingsManager && type === 'setting') {
                const currentValue = settingsManager.get(key);
                if (currentValue !== undefined && currentValue !== value && currentValue !== oldValue) {
                    return {
                        type: type,
                        key: key,
                        localValue: currentValue,
                        remoteValue: value,
                        remoteOldValue: oldValue
                    };
                }
            }
            
            return null;
        }

        /**
         * Handle conflict resolution
         * @param {Object} conflict - Conflict object
         * @param {Object} message - Original message
         */
        handleConflict(conflict, message) {
            const conflictId = `${conflict.type}:${conflict.key}:${Date.now()}`;
            
            this.pendingConflicts.set(conflictId, {
                conflict: conflict,
                message: message,
                timestamp: Date.now()
            });
            
            // Emit conflict event for user resolution
            this.core.emit('tab-sync:conflict-detected', {
                conflictId: conflictId,
                conflict: conflict,
                source: message.source
            });
            
            // Auto-resolve if possible
            if (this.isLeader) {
                this.resolveConflict(conflictId, 'leader-wins');
            }
        }

        /**
         * Resolve conflict
         * @param {string} conflictId - Conflict ID
         * @param {string} strategy - Resolution strategy
         */
        resolveConflict(conflictId, strategy) {
            const conflictData = this.pendingConflicts.get(conflictId);
            if (!conflictData) {
                return;
            }
            
            const { conflict, message } = conflictData;
            let resolvedValue;
            
            switch (strategy) {
                case 'local-wins':
                    resolvedValue = conflict.localValue;
                    break;
                case 'remote-wins':
                    resolvedValue = conflict.remoteValue;
                    break;
                case 'leader-wins':
                    resolvedValue = this.isLeader ? conflict.localValue : conflict.remoteValue;
                    break;
                case 'timestamp-wins':
                    // Use the most recent change
                    resolvedValue = message.timestamp > Date.now() - 1000 ? 
                                   conflict.remoteValue : conflict.localValue;
                    break;
                default:
                    resolvedValue = conflict.remoteValue;
            }
            
            // Apply resolved value
            const settingsManager = this.core.getModule('settings-manager');
            if (settingsManager && conflict.type === 'setting') {
                settingsManager.set(conflict.key, resolvedValue, true);
            }
            
            // Broadcast resolution
            this.broadcastMessage('conflict-resolution', {
                conflictId: conflictId,
                strategy: strategy,
                resolvedValue: resolvedValue
            });
            
            // Clean up
            this.pendingConflicts.delete(conflictId);
            
            this.core.emit('tab-sync:conflict-resolved', {
                conflictId: conflictId,
                strategy: strategy,
                resolvedValue: resolvedValue
            });
        }

        /**
         * Handle conflict resolution message
         * @param {Object} message - Conflict resolution message
         */
        handleConflictResolution(message) {
            const { conflictId, strategy, resolvedValue } = message.data;
            
            // Apply resolution if we have this conflict pending
            if (this.pendingConflicts.has(conflictId)) {
                const conflictData = this.pendingConflicts.get(conflictId);
                const { conflict } = conflictData;
                
                // Apply resolved value
                const settingsManager = this.core.getModule('settings-manager');
                if (settingsManager && conflict.type === 'setting') {
                    settingsManager.set(conflict.key, resolvedValue, true);
                }
                
                this.pendingConflicts.delete(conflictId);
                
                this.core.emit('tab-sync:conflict-resolved', {
                    conflictId: conflictId,
                    strategy: strategy,
                    resolvedValue: resolvedValue,
                    source: message.source
                });
            }
        }

        /**
         * Handle visibility change
         */
        handleVisibilityChange() {
            const isActive = !document.hidden;
            
            // Update tab info
            if (this.tabRegistry.has(this.tabId)) {
                this.tabRegistry.get(this.tabId).isActive = isActive;
            }
            
            // Send immediate heartbeat when becoming active
            if (isActive) {
                this.sendHeartbeat();
            }
        }

        /**
         * Handle page unload
         */
        handleBeforeUnload() {
            this.unregisterTab();
        }

        /**
         * Get active tabs
         * @returns {Array} Array of active tab info
         */
        getActiveTabs() {
            return Array.from(this.tabRegistry.values()).filter(tab => 
                this.activeTabs.has(tab.id)
            );
        }

        /**
         * Get leader tab
         * @returns {Object|null} Leader tab info or null
         */
        getLeaderTab() {
            return Array.from(this.tabRegistry.values()).find(tab => tab.isLeader) || null;
        }

        /**
         * Check if this tab is the leader
         * @returns {boolean}
         */
        isTabLeader() {
            return this.isLeader;
        }

        /**
         * Get sync status
         * @returns {Object} Sync status
         */
        getSyncStatus() {
            return {
                tabId: this.tabId,
                isLeader: this.isLeader,
                activeTabs: this.activeTabs.size,
                usesBroadcastChannel: this.usesBroadcastChannel,
                usesStorageEvents: this.usesStorageEvents,
                pendingConflicts: this.pendingConflicts.size,
                messageQueueSize: this.messageQueue.length,
                lastHeartbeat: this.lastHeartbeat
            };
        }

        /**
         * Cleanup resources
         */
        destroy() {
            // Unregister tab
            this.unregisterTab();
            
            // Clear timers
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
            }
            if (this.cleanupTimer) {
                clearInterval(this.cleanupTimer);
            }
            
            // Close broadcast channel
            if (this.broadcastChannel) {
                this.broadcastChannel.close();
            }
            
            // Remove event listeners
            window.removeEventListener('storage', this.handleStorageEvent);
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
            
            // Clear collections
            this.activeTabs.clear();
            this.tabRegistry.clear();
            this.pendingConflicts.clear();
            this.messageQueue = [];
            
            this.core.log('TabSync destroyed');
        }
    }

    // Export for ES6 modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TabSync;
    }
    
    // Export for AMD
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return TabSync;
        });
    }
    
    // Register with LAS core for IE11 compatibility
    if (window.LAS && typeof window.LAS.registerModule === 'function') {
        window.LAS.registerModule('tab-sync', TabSync);
    }
    
    // Global export as fallback
    window.LASTabSync = TabSync;

})(window, document);