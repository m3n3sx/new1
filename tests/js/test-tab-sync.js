/**
 * Integration Tests for TabSync Module
 * 
 * Tests multi-tab synchronization, BroadcastChannel API, and fallback mechanisms
 * 
 * @since 2.0.0
 */

describe('TabSync', () => {
    let tabSync;
    let mockCore;
    let mockSettingsManager;
    let mockBroadcastChannel;

    beforeEach(() => {
        // Mock BroadcastChannel
        mockBroadcastChannel = {
            addEventListener: jest.fn(),
            postMessage: jest.fn(),
            close: jest.fn()
        };
        
        global.BroadcastChannel = jest.fn(() => mockBroadcastChannel);

        // Create mock settings manager
        mockSettingsManager = {
            get: jest.fn(),
            set: jest.fn(),
            setMultiple: jest.fn(),
            getAll: jest.fn(() => ({ 'test.setting': 'value' }))
        };

        // Create mock core
        mockCore = {
            log: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            getModule: jest.fn((name) => {
                if (name === 'settings-manager') return mockSettingsManager;
                return null;
            })
        };

        // Mock localStorage
        global.localStorage.clear();

        // Mock document.hidden
        Object.defineProperty(document, 'hidden', {
            writable: true,
            value: false
        });

        // Create TabSync instance
        const TabSync = require('../../assets/js/modules/tab-sync.js');
        tabSync = new TabSync(mockCore, {
            heartbeatInterval: 100, // Shorter interval for tests
            tabTimeout: 500,
            channelName: 'test-channel'
        });
    });

    afterEach(() => {
        if (tabSync) {
            tabSync.destroy();
        }
        jest.clearAllTimers();
        global.localStorage.clear();
    });

    describe('Initialization', () => {
        test('should initialize with BroadcastChannel', () => {
            expect(global.BroadcastChannel).toHaveBeenCalledWith('test-channel');
            expect(tabSync.usesBroadcastChannel).toBe(true);
            expect(tabSync.usesStorageEvents).toBe(false);
            expect(tabSync.tabId).toBeTruthy();
            expect(mockCore.log).toHaveBeenCalledWith('TabSync initialized', expect.any(Object));
        });

        test('should fallback to storage events when BroadcastChannel fails', () => {
            // Destroy current instance
            tabSync.destroy();
            
            // Mock BroadcastChannel to throw error
            global.BroadcastChannel = jest.fn(() => {
                throw new Error('BroadcastChannel not supported');
            });
            
            const TabSync = require('../../assets/js/modules/tab-sync.js');
            tabSync = new TabSync(mockCore);
            
            expect(tabSync.usesBroadcastChannel).toBe(false);
            expect(tabSync.usesStorageEvents).toBe(true);
        });

        test('should generate unique tab IDs', () => {
            const TabSync = require('../../assets/js/modules/tab-sync.js');
            const tabSync1 = new TabSync(mockCore);
            const tabSync2 = new TabSync(mockCore);
            
            expect(tabSync1.tabId).not.toBe(tabSync2.tabId);
            expect(tabSync1.tabId).toMatch(/^tab-\d+-[a-z0-9]+$/);
            
            tabSync1.destroy();
            tabSync2.destroy();
        });

        test('should setup event listeners', () => {
            expect(mockCore.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('settings:bulk-changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('auto-save:saved', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('live-edit:activated', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('live-edit:deactivated', expect.any(Function));
        });
    });

    describe('Tab Registration', () => {
        test('should register tab on initialization', () => {
            expect(tabSync.tabRegistry.has(tabSync.tabId)).toBe(true);
            expect(tabSync.activeTabs.has(tabSync.tabId)).toBe(true);
            
            const tabInfo = tabSync.tabRegistry.get(tabSync.tabId);
            expect(tabInfo).toHaveProperty('id', tabSync.tabId);
            expect(tabInfo).toHaveProperty('url');
            expect(tabInfo).toHaveProperty('title');
            expect(tabInfo).toHaveProperty('timestamp');
        });

        test('should broadcast tab registration', () => {
            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'tab-registered',
                    source: tabSync.tabId
                })
            );
        });

        test('should unregister tab', () => {
            tabSync.unregisterTab();
            
            expect(tabSync.tabRegistry.has(tabSync.tabId)).toBe(false);
            expect(tabSync.activeTabs.has(tabSync.tabId)).toBe(false);
            expect(mockCore.emit).toHaveBeenCalledWith('tab-sync:tab-unregistered', { tabId: tabSync.tabId });
        });
    });

    describe('Heartbeat System', () => {
        test('should send heartbeat messages', (done) => {
            jest.useFakeTimers();
            
            // Clear initial messages
            mockBroadcastChannel.postMessage.mockClear();
            
            jest.advanceTimersByTime(100);
            
            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'heartbeat',
                    source: tabSync.tabId,
                    data: expect.objectContaining({
                        tabId: tabSync.tabId,
                        timestamp: expect.any(Number),
                        isActive: expect.any(Boolean)
                    })
                })
            );
            
            jest.useRealTimers();
            done();
        });

        test('should update last heartbeat timestamp', () => {
            const initialHeartbeat = tabSync.lastHeartbeat;
            
            setTimeout(() => {
                tabSync.sendHeartbeat();
                expect(tabSync.lastHeartbeat).toBeGreaterThan(initialHeartbeat);
            }, 10);
        });

        test('should clean up inactive tabs', () => {
            jest.useFakeTimers();
            
            // Add a fake tab
            const fakeTabId = 'fake-tab-123';
            tabSync.activeTabs.set(fakeTabId, Date.now() - 1000); // Old timestamp
            tabSync.tabRegistry.set(fakeTabId, { id: fakeTabId, timestamp: Date.now() - 1000 });
            
            // Advance time beyond timeout
            jest.advanceTimersByTime(600);
            
            expect(tabSync.activeTabs.has(fakeTabId)).toBe(false);
            expect(tabSync.tabRegistry.has(fakeTabId)).toBe(false);
            
            jest.useRealTimers();
        });
    });

    describe('Leader Election', () => {
        test('should elect leader on initialization', () => {
            // First tab should become leader
            expect(tabSync.isLeader).toBe(true);
        });

        test('should elect oldest tab as leader', () => {
            // Add another tab with newer timestamp
            const newerTabId = 'newer-tab';
            const newerTimestamp = Date.now() + 1000;
            
            tabSync.tabRegistry.set(newerTabId, {
                id: newerTabId,
                timestamp: newerTimestamp
            });
            tabSync.activeTabs.set(newerTabId, newerTimestamp);
            
            tabSync.electLeader();
            
            // Original tab should remain leader (older timestamp)
            expect(tabSync.isLeader).toBe(true);
        });

        test('should transfer leadership when leader tab times out', () => {
            jest.useFakeTimers();
            
            // Add another tab
            const otherTabId = 'other-tab';
            tabSync.tabRegistry.set(otherTabId, {
                id: otherTabId,
                timestamp: Date.now() + 100,
                isLeader: false
            });
            tabSync.activeTabs.set(otherTabId, Date.now() + 100);
            
            // Make current tab leader but with old timestamp
            tabSync.isLeader = true;
            tabSync.tabRegistry.get(tabSync.tabId).isLeader = true;
            tabSync.activeTabs.set(tabSync.tabId, Date.now() - 1000);
            
            // Advance time to trigger cleanup
            jest.advanceTimersByTime(600);
            
            // Should re-elect leader
            expect(mockCore.emit).toHaveBeenCalledWith('tab-sync:tab-timeout', expect.any(Object));
            
            jest.useRealTimers();
        });
    });

    describe('Message Broadcasting', () => {
        test('should broadcast messages via BroadcastChannel', () => {
            const testData = { key: 'test', value: 'value' };
            
            tabSync.broadcastMessage('test-message', testData);
            
            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'test-message',
                    data: testData,
                    source: tabSync.tabId,
                    timestamp: expect.any(Number)
                })
            );
        });

        test('should fallback to storage when broadcast fails', () => {
            mockBroadcastChannel.postMessage.mockImplementation(() => {
                throw new Error('Broadcast failed');
            });
            
            const setItemSpy = jest.spyOn(localStorage, 'setItem');
            
            tabSync.broadcastMessage('test-message', { test: 'data' });
            
            expect(setItemSpy).toHaveBeenCalled();
            expect(mockCore.handleError).toHaveBeenCalledWith('Failed to broadcast message', expect.any(Error));
        });

        test('should add messages to queue', () => {
            const initialQueueSize = tabSync.messageQueue.length;
            
            tabSync.broadcastMessage('test-message', { test: 'data' });
            
            expect(tabSync.messageQueue.length).toBe(initialQueueSize + 1);
        });

        test('should limit message queue size', () => {
            // Fill queue beyond max size
            for (let i = 0; i < 150; i++) {
                tabSync.addToMessageQueue({ type: 'test', data: i });
            }
            
            expect(tabSync.messageQueue.length).toBeLessThanOrEqual(tabSync.maxQueueSize);
        });
    });

    describe('Message Processing', () => {
        test('should ignore messages from same tab', () => {
            const message = {
                type: 'test-message',
                source: tabSync.tabId,
                data: {}
            };
            
            tabSync.processMessage(message);
            
            // Should not emit any events for own messages
            expect(mockCore.emit).not.toHaveBeenCalledWith('tab-sync:message-received', message);
        });

        test('should process settings changed messages', () => {
            const message = {
                type: 'settings-changed',
                source: 'other-tab',
                data: {
                    key: 'test.setting',
                    value: 'new-value',
                    oldValue: 'old-value'
                }
            };
            
            tabSync.processMessage(message);
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test.setting', 'new-value', true);
            expect(mockCore.emit).toHaveBeenCalledWith('tab-sync:settings-synced', expect.any(Object));
        });

        test('should process bulk settings changed messages', () => {
            const message = {
                type: 'settings-bulk-changed',
                source: 'other-tab',
                data: {
                    changes: {
                        'key1': { value: 'value1' },
                        'key2': { value: 'value2' }
                    }
                }
            };
            
            tabSync.processMessage(message);
            
            expect(mockSettingsManager.setMultiple).toHaveBeenCalledWith(
                { 'key1': 'value1', 'key2': 'value2' },
                true
            );
            expect(mockCore.emit).toHaveBeenCalledWith('tab-sync:settings-bulk-synced', expect.any(Object));
        });

        test('should process heartbeat messages', () => {
            const otherTabId = 'other-tab';
            const message = {
                type: 'heartbeat',
                source: otherTabId,
                timestamp: Date.now(),
                data: {
                    tabId: otherTabId,
                    timestamp: Date.now(),
                    isActive: true,
                    isLeader: false
                }
            };
            
            tabSync.processMessage(message);
            
            expect(tabSync.activeTabs.has(otherTabId)).toBe(true);
        });

        test('should process tab registration messages', () => {
            const otherTabId = 'other-tab';
            const tabInfo = {
                id: otherTabId,
                url: 'http://example.com',
                title: 'Test Tab',
                timestamp: Date.now()
            };
            
            const message = {
                type: 'tab-registered',
                source: otherTabId,
                timestamp: Date.now(),
                data: tabInfo
            };
            
            tabSync.processMessage(message);
            
            expect(tabSync.tabRegistry.has(otherTabId)).toBe(true);
            expect(tabSync.activeTabs.has(otherTabId)).toBe(true);
            expect(mockCore.emit).toHaveBeenCalledWith('tab-sync:tab-registered', tabInfo);
        });
    });

    describe('Conflict Resolution', () => {
        beforeEach(() => {
            // Enable conflict resolution
            tabSync.options.enableConflictResolution = true;
        });

        test('should detect conflicts', () => {
            mockSettingsManager.get.mockReturnValue('local-value');
            
            const conflict = tabSync.detectConflict('setting', 'test.key', 'remote-value', 'old-value');
            
            expect(conflict).toEqual({
                type: 'setting',
                key: 'test.key',
                localValue: 'local-value',
                remoteValue: 'remote-value',
                remoteOldValue: 'old-value'
            });
        });

        test('should not detect conflicts when values match', () => {
            mockSettingsManager.get.mockReturnValue('same-value');
            
            const conflict = tabSync.detectConflict('setting', 'test.key', 'same-value', 'old-value');
            
            expect(conflict).toBe(null);
        });

        test('should handle conflicts', () => {
            const conflict = {
                type: 'setting',
                key: 'test.key',
                localValue: 'local-value',
                remoteValue: 'remote-value'
            };
            
            const message = {
                source: 'other-tab',
                timestamp: Date.now()
            };
            
            tabSync.handleConflict(conflict, message);
            
            expect(tabSync.pendingConflicts.size).toBe(1);
            expect(mockCore.emit).toHaveBeenCalledWith('tab-sync:conflict-detected', expect.any(Object));
        });

        test('should resolve conflicts with different strategies', () => {
            const conflictId = 'test-conflict';
            const conflict = {
                type: 'setting',
                key: 'test.key',
                localValue: 'local-value',
                remoteValue: 'remote-value'
            };
            
            tabSync.pendingConflicts.set(conflictId, {
                conflict: conflict,
                message: { source: 'other-tab' }
            });
            
            // Test local-wins strategy
            tabSync.resolveConflict(conflictId, 'local-wins');
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test.key', 'local-value', true);
            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'conflict-resolution',
                    data: expect.objectContaining({
                        conflictId: conflictId,
                        strategy: 'local-wins',
                        resolvedValue: 'local-value'
                    })
                })
            );
        });

        test('should auto-resolve conflicts when leader', () => {
            tabSync.isLeader = true;
            
            const conflict = {
                type: 'setting',
                key: 'test.key',
                localValue: 'local-value',
                remoteValue: 'remote-value'
            };
            
            const message = {
                source: 'other-tab',
                timestamp: Date.now()
            };
            
            const resolveConflictSpy = jest.spyOn(tabSync, 'resolveConflict');
            
            tabSync.handleConflict(conflict, message);
            
            expect(resolveConflictSpy).toHaveBeenCalledWith(expect.any(String), 'leader-wins');
        });
    });

    describe('Storage Event Fallback', () => {
        beforeEach(() => {
            // Destroy current instance and create one without BroadcastChannel
            tabSync.destroy();
            
            global.BroadcastChannel = undefined;
            
            const TabSync = require('../../assets/js/modules/tab-sync.js');
            tabSync = new TabSync(mockCore);
        });

        test('should use storage events when BroadcastChannel unavailable', () => {
            expect(tabSync.usesBroadcastChannel).toBe(false);
            expect(tabSync.usesStorageEvents).toBe(true);
        });

        test('should broadcast via localStorage', () => {
            const setItemSpy = jest.spyOn(localStorage, 'setItem');
            const removeItemSpy = jest.spyOn(localStorage, 'removeItem');
            
            tabSync.broadcastMessage('test-message', { test: 'data' });
            
            expect(setItemSpy).toHaveBeenCalled();
            
            // Should clean up after broadcasting
            setTimeout(() => {
                expect(removeItemSpy).toHaveBeenCalled();
            }, 150);
        });

        test('should handle storage events', () => {
            const message = {
                type: 'settings-changed',
                source: 'other-tab',
                data: { key: 'test', value: 'value' }
            };
            
            const event = {
                key: 'las-tab-sync-fallback-123',
                newValue: JSON.stringify(message)
            };
            
            tabSync.handleStorageEvent(event);
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('test', 'value', true);
        });

        test('should ignore irrelevant storage events', () => {
            const event = {
                key: 'other-key',
                newValue: 'some-value'
            };
            
            tabSync.handleStorageEvent(event);
            
            // Should not process the message
            expect(mockSettingsManager.set).not.toHaveBeenCalled();
        });
    });

    describe('Visibility Handling', () => {
        test('should update tab status on visibility change', () => {
            document.hidden = true;
            
            tabSync.handleVisibilityChange();
            
            const tabInfo = tabSync.tabRegistry.get(tabSync.tabId);
            expect(tabInfo.isActive).toBe(false);
        });

        test('should send heartbeat when becoming visible', () => {
            mockBroadcastChannel.postMessage.mockClear();
            document.hidden = false;
            
            tabSync.handleVisibilityChange();
            
            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'heartbeat'
                })
            );
        });
    });

    describe('Utility Methods', () => {
        test('should get active tabs', () => {
            const activeTabs = tabSync.getActiveTabs();
            
            expect(activeTabs).toHaveLength(1);
            expect(activeTabs[0].id).toBe(tabSync.tabId);
        });

        test('should get leader tab', () => {
            const leaderTab = tabSync.getLeaderTab();
            
            expect(leaderTab).toBeTruthy();
            expect(leaderTab.isLeader).toBe(true);
        });

        test('should check if tab is leader', () => {
            expect(tabSync.isTabLeader()).toBe(true);
        });

        test('should get sync status', () => {
            const status = tabSync.getSyncStatus();
            
            expect(status).toHaveProperty('tabId', tabSync.tabId);
            expect(status).toHaveProperty('isLeader', true);
            expect(status).toHaveProperty('activeTabs', 1);
            expect(status).toHaveProperty('usesBroadcastChannel', true);
            expect(status).toHaveProperty('usesStorageEvents', false);
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            const heartbeatTimer = tabSync.heartbeatTimer;
            
            tabSync.destroy();
            
            expect(mockBroadcastChannel.close).toHaveBeenCalled();
            expect(tabSync.activeTabs.size).toBe(0);
            expect(tabSync.tabRegistry.size).toBe(0);
            expect(tabSync.heartbeatTimer).toBe(null);
        });

        test('should unregister tab on destroy', () => {
            tabSync.destroy();
            
            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'tab-unregistered',
                    data: { tabId: tabSync.tabId }
                })
            );
        });
    });
});