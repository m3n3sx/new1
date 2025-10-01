/**
 * Unit Tests for AutoSave Module
 * 
 * Tests debounced auto-save, undo/redo functionality, and change tracking
 * 
 * @since 2.0.0
 */

describe('AutoSave', () => {
    let autoSave;
    let mockCore;
    let mockSettingsManager;
    let mockAjaxManager;

    beforeEach(() => {
        // Create mock settings manager
        mockSettingsManager = {
            getAll: jest.fn(() => ({ 'test.setting': 'value' })),
            setMultiple: jest.fn()
        };

        // Create mock ajax manager
        mockAjaxManager = {
            request: jest.fn(() => Promise.resolve({ success: true }))
        };

        // Create mock core
        mockCore = {
            log: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            getModule: jest.fn((name) => {
                if (name === 'settings-manager') return mockSettingsManager;
                if (name === 'ajax-manager') return mockAjaxManager;
                return null;
            }),
            config: {
                ajaxUrl: '/wp-admin/admin-ajax.php',
                nonce: 'test_nonce'
            }
        };

        // Mock localStorage
        global.localStorage.clear();

        // Mock navigator.sendBeacon
        global.navigator.sendBeacon = jest.fn(() => true);

        // Create AutoSave instance
        const AutoSave = require('../../assets/js/modules/auto-save.js');
        autoSave = new AutoSave(mockCore, {
            debounceDelay: 100, // Shorter delay for tests
            maxHistorySize: 10,
            autoSaveInterval: 1000
        });
    });

    afterEach(() => {
        if (autoSave) {
            autoSave.destroy();
        }
        jest.clearAllTimers();
        global.localStorage.clear();
    });

    describe('Initialization', () => {
        test('should initialize with correct default state', () => {
            expect(autoSave.isDirty).toBe(false);
            expect(autoSave.isSaving).toBe(false);
            expect(autoSave.history).toEqual([]);
            expect(autoSave.historyIndex).toBe(-1);
            expect(mockCore.log).toHaveBeenCalledWith('AutoSave initialized', expect.any(Object));
        });

        test('should setup event listeners', () => {
            expect(mockCore.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('settings:bulk-changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('micro-panel:style-changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('micro-panel:styles-saved', expect.any(Function));
        });

        test('should load initial state from localStorage', () => {
            const testData = {
                state: { timestamp: Date.now(), settings: { 'test': 'value' } },
                history: [{ timestamp: Date.now() - 1000 }],
                lastSaveTime: new Date().toISOString()
            };
            
            localStorage.setItem('las_autosave_data', JSON.stringify(testData));
            
            // Create new instance to test loading
            const AutoSave = require('../../assets/js/modules/auto-save.js');
            const newAutoSave = new AutoSave(mockCore);
            
            expect(newAutoSave.currentState).toEqual(testData.state);
            expect(newAutoSave.history).toEqual(testData.history);
            expect(newAutoSave.lastSaveTime).toBeTruthy();
            
            newAutoSave.destroy();
        });
    });

    describe('Change Tracking', () => {
        test('should track single changes', () => {
            autoSave.trackChange('setting', 'test.key', 'new_value', 'old_value');
            
            expect(autoSave.isDirty).toBe(true);
            expect(autoSave.trackedChanges.size).toBe(1);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:change-tracked', expect.any(Object));
        });

        test('should track bulk changes', () => {
            const changes = {
                'key1': { value: 'value1', oldValue: 'old1' },
                'key2': { value: 'value2', oldValue: 'old2' }
            };
            
            autoSave.trackBulkChanges('settings', changes);
            
            expect(autoSave.isDirty).toBe(true);
            expect(autoSave.trackedChanges.size).toBe(2);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:bulk-changes-tracked', expect.any(Object));
        });

        test('should generate unique change IDs', () => {
            const element = document.createElement('div');
            element.id = 'test-element';
            
            const id1 = autoSave.generateChangeId('style', 'color', element);
            const id2 = autoSave.generateChangeId('style', 'background', element);
            const id3 = autoSave.generateChangeId('setting', 'color', null);
            
            expect(id1).toBe('style:#test-element:color');
            expect(id2).toBe('style:#test-element:background');
            expect(id3).toBe('setting:global:color');
            expect(id1).not.toBe(id2);
            expect(id1).not.toBe(id3);
        });

        test('should get element selectors correctly', () => {
            const elementWithId = document.createElement('div');
            elementWithId.id = 'test-id';
            
            const elementWithClass = document.createElement('span');
            elementWithClass.className = 'test-class other-class';
            
            const elementPlain = document.createElement('p');
            
            expect(autoSave.getElementSelector(elementWithId)).toBe('#test-id');
            expect(autoSave.getElementSelector(elementWithClass)).toBe('span.test-class');
            expect(autoSave.getElementSelector(elementPlain)).toBe('p');
        });
    });

    describe('Dirty State Management', () => {
        test('should mark state as dirty', () => {
            autoSave.markDirty();
            
            expect(autoSave.isDirty).toBe(true);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:dirty-state-changed', { isDirty: true });
        });

        test('should mark state as clean', () => {
            autoSave.markDirty();
            autoSave.markClean();
            
            expect(autoSave.isDirty).toBe(false);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:dirty-state-changed', { isDirty: false });
        });

        test('should not emit duplicate dirty state events', () => {
            autoSave.markDirty();
            const emitCallCount = mockCore.emit.mock.calls.length;
            
            autoSave.markDirty();
            expect(mockCore.emit.mock.calls.length).toBe(emitCallCount);
        });
    });

    describe('Debounced Save', () => {
        test('should schedule debounced save', () => {
            jest.useFakeTimers();
            
            autoSave.trackChange('setting', 'test', 'value');
            
            expect(autoSave.saveTimer).toBeTruthy();
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:save-scheduled', expect.any(Object));
            
            jest.useRealTimers();
        });

        test('should cancel previous timer when new change occurs', () => {
            jest.useFakeTimers();
            
            autoSave.trackChange('setting', 'test1', 'value1');
            const firstTimer = autoSave.saveTimer;
            
            autoSave.trackChange('setting', 'test2', 'value2');
            const secondTimer = autoSave.saveTimer;
            
            expect(firstTimer).not.toBe(secondTimer);
            
            jest.useRealTimers();
        });

        test('should trigger save after debounce delay', (done) => {
            const saveNowSpy = jest.spyOn(autoSave, 'saveNow').mockResolvedValue(true);
            
            autoSave.trackChange('setting', 'test', 'value');
            
            setTimeout(() => {
                expect(saveNowSpy).toHaveBeenCalled();
                saveNowSpy.mockRestore();
                done();
            }, 150);
        });
    });

    describe('Save Functionality', () => {
        test('should save successfully', async () => {
            autoSave.trackChange('setting', 'test', 'value');
            
            const success = await autoSave.saveNow();
            
            expect(success).toBe(true);
            expect(autoSave.isDirty).toBe(false);
            expect(autoSave.lastSaveTime).toBeTruthy();
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:saved', expect.any(Object));
        });

        test('should not save if already saving', async () => {
            autoSave.isSaving = true;
            
            const success = await autoSave.saveNow();
            
            expect(success).toBe(false);
            expect(mockAjaxManager.request).not.toHaveBeenCalled();
        });

        test('should not save if not dirty', async () => {
            const success = await autoSave.saveNow();
            
            expect(success).toBe(false);
            expect(mockAjaxManager.request).not.toHaveBeenCalled();
        });

        test('should handle save errors gracefully', async () => {
            mockAjaxManager.request.mockRejectedValue(new Error('Network error'));
            autoSave.trackChange('setting', 'test', 'value');
            
            const success = await autoSave.saveNow();
            
            expect(success).toBe(false);
            expect(mockCore.handleError).toHaveBeenCalledWith('Auto-save failed', expect.any(Error));
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:save-failed', expect.any(Object));
        });

        test('should create state snapshot correctly', async () => {
            autoSave.trackChange('setting', 'test', 'value');
            
            const snapshot = await autoSave.createStateSnapshot();
            
            expect(snapshot).toHaveProperty('timestamp');
            expect(snapshot).toHaveProperty('settings');
            expect(snapshot).toHaveProperty('changes');
            expect(snapshot).toHaveProperty('metadata');
            expect(snapshot.changes).toHaveLength(1);
        });

        test('should save to localStorage', () => {
            const state = { timestamp: Date.now(), settings: { test: 'value' } };
            
            autoSave.saveToLocalStorage(state);
            
            const stored = JSON.parse(localStorage.getItem('las_autosave_data'));
            expect(stored.state).toEqual(state);
        });
    });

    describe('History Management', () => {
        test('should add states to history', () => {
            const state = { timestamp: Date.now(), settings: { test: 'value' } };
            
            autoSave.addToHistory(state);
            
            expect(autoSave.history).toHaveLength(1);
            expect(autoSave.historyIndex).toBe(0);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:history-updated', expect.any(Object));
        });

        test('should limit history size', () => {
            // Add more states than max history size
            for (let i = 0; i < 15; i++) {
                autoSave.addToHistory({ timestamp: Date.now() + i });
            }
            
            expect(autoSave.history.length).toBeLessThanOrEqual(autoSave.maxHistorySize);
        });

        test('should truncate future history when adding new state', () => {
            // Add initial states
            autoSave.addToHistory({ timestamp: 1 });
            autoSave.addToHistory({ timestamp: 2 });
            autoSave.addToHistory({ timestamp: 3 });
            
            // Move back in history
            autoSave.historyIndex = 1;
            
            // Add new state (should remove future history)
            autoSave.addToHistory({ timestamp: 4 });
            
            expect(autoSave.history).toHaveLength(3);
            expect(autoSave.history[2].timestamp).toBe(4);
        });
    });

    describe('Undo/Redo Functionality', () => {
        beforeEach(() => {
            // Add some history
            autoSave.addToHistory({ timestamp: 1, settings: { test: 'value1' } });
            autoSave.addToHistory({ timestamp: 2, settings: { test: 'value2' } });
            autoSave.addToHistory({ timestamp: 3, settings: { test: 'value3' } });
        });

        test('should check undo availability correctly', () => {
            expect(autoSave.canUndo()).toBe(true);
            
            autoSave.historyIndex = 0;
            expect(autoSave.canUndo()).toBe(false);
        });

        test('should check redo availability correctly', () => {
            expect(autoSave.canRedo()).toBe(false);
            
            autoSave.historyIndex = 1;
            expect(autoSave.canRedo()).toBe(true);
        });

        test('should perform undo successfully', async () => {
            const success = await autoSave.undo();
            
            expect(success).toBe(true);
            expect(autoSave.historyIndex).toBe(1);
            expect(mockSettingsManager.setMultiple).toHaveBeenCalledWith({ test: 'value2' }, true);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:undo', expect.any(Object));
        });

        test('should perform redo successfully', async () => {
            await autoSave.undo(); // Move back first
            
            const success = await autoSave.redo();
            
            expect(success).toBe(true);
            expect(autoSave.historyIndex).toBe(2);
            expect(mockSettingsManager.setMultiple).toHaveBeenCalledWith({ test: 'value3' }, true);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:redo', expect.any(Object));
        });

        test('should not undo when at beginning of history', async () => {
            autoSave.historyIndex = 0;
            
            const success = await autoSave.undo();
            
            expect(success).toBe(false);
            expect(autoSave.historyIndex).toBe(0);
        });

        test('should not redo when at end of history', async () => {
            const success = await autoSave.redo();
            
            expect(success).toBe(false);
            expect(autoSave.historyIndex).toBe(2);
        });

        test('should handle undo errors gracefully', async () => {
            mockSettingsManager.setMultiple.mockImplementation(() => {
                throw new Error('Settings error');
            });
            
            const success = await autoSave.undo();
            
            expect(success).toBe(false);
            expect(autoSave.historyIndex).toBe(2); // Should revert index change
            expect(mockCore.handleError).toHaveBeenCalledWith('Undo failed', expect.any(Error));
        });
    });

    describe('Keyboard Shortcuts', () => {
        test('should handle save shortcut (Ctrl+S)', () => {
            const saveNowSpy = jest.spyOn(autoSave, 'saveNow').mockResolvedValue(true);
            
            const event = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(event);
            
            expect(saveNowSpy).toHaveBeenCalled();
            saveNowSpy.mockRestore();
        });

        test('should handle undo shortcut (Ctrl+Z)', () => {
            const undoSpy = jest.spyOn(autoSave, 'undo').mockResolvedValue(true);
            
            const event = new KeyboardEvent('keydown', {
                key: 'z',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(event);
            
            expect(undoSpy).toHaveBeenCalled();
            undoSpy.mockRestore();
        });

        test('should handle redo shortcut (Ctrl+Y)', () => {
            const redoSpy = jest.spyOn(autoSave, 'redo').mockResolvedValue(true);
            
            const event = new KeyboardEvent('keydown', {
                key: 'y',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(event);
            
            expect(redoSpy).toHaveBeenCalled();
            redoSpy.mockRestore();
        });

        test('should get keyboard shortcut string correctly', () => {
            const event1 = { ctrlKey: true, key: 's' };
            const event2 = { metaKey: true, shiftKey: true, key: 'z' };
            const event3 = { altKey: true, key: 'f' };
            
            expect(autoSave.getKeyboardShortcut(event1)).toBe('ctrl+s');
            expect(autoSave.getKeyboardShortcut(event2)).toBe('cmd+shift+z');
            expect(autoSave.getKeyboardShortcut(event3)).toBe('alt+f');
        });
    });

    describe('Auto-Save Timer', () => {
        test('should start auto-save timer', () => {
            jest.useFakeTimers();
            
            autoSave.startAutoSaveTimer();
            
            expect(autoSave.autoSaveTimer).toBeTruthy();
            
            jest.useRealTimers();
        });

        test('should stop auto-save timer', () => {
            jest.useFakeTimers();
            
            autoSave.startAutoSaveTimer();
            autoSave.stopAutoSaveTimer();
            
            expect(autoSave.autoSaveTimer).toBe(null);
            
            jest.useRealTimers();
        });

        test('should trigger save on timer interval', () => {
            jest.useFakeTimers();
            const saveNowSpy = jest.spyOn(autoSave, 'saveNow').mockResolvedValue(true);
            
            autoSave.markDirty();
            autoSave.startAutoSaveTimer();
            
            jest.advanceTimersByTime(1000);
            
            expect(saveNowSpy).toHaveBeenCalled();
            
            saveNowSpy.mockRestore();
            jest.useRealTimers();
        });
    });

    describe('Page Unload Handling', () => {
        test('should save with beacon on page unload', () => {
            autoSave.markDirty();
            
            const event = new Event('beforeunload');
            window.dispatchEvent(event);
            
            expect(navigator.sendBeacon).toHaveBeenCalled();
        });

        test('should show confirmation dialog when dirty', () => {
            autoSave.markDirty();
            
            const event = { returnValue: null };
            const result = autoSave.handleBeforeUnload(event);
            
            expect(event.returnValue).toBeTruthy();
            expect(result).toBeTruthy();
        });

        test('should not show confirmation when clean', () => {
            const event = { returnValue: null };
            const result = autoSave.handleBeforeUnload(event);
            
            expect(event.returnValue).toBe(null);
            expect(result).toBeUndefined();
        });
    });

    describe('Change Listeners', () => {
        test('should add and notify change listeners', () => {
            const callback = jest.fn();
            
            autoSave.onChangeTracked('setting', callback);
            autoSave.trackChange('setting', 'test', 'value');
            
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'setting',
                key: 'test',
                newValue: 'value'
            }));
        });

        test('should remove change listeners', () => {
            const callback = jest.fn();
            
            autoSave.onChangeTracked('setting', callback);
            autoSave.offChangeTracked('setting', callback);
            autoSave.trackChange('setting', 'test', 'value');
            
            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle listener errors gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Listener error');
            });
            
            autoSave.onChangeTracked('setting', errorCallback);
            autoSave.trackChange('setting', 'test', 'value');
            
            expect(mockCore.handleError).toHaveBeenCalledWith(
                'Change listener error for setting',
                expect.any(Error)
            );
        });
    });

    describe('Status and Utilities', () => {
        test('should get current status', () => {
            autoSave.markDirty();
            autoSave.addToHistory({ timestamp: Date.now() });
            
            const status = autoSave.getStatus();
            
            expect(status).toHaveProperty('isDirty', true);
            expect(status).toHaveProperty('isSaving', false);
            expect(status).toHaveProperty('changeCount', 0);
            expect(status).toHaveProperty('historySize', 1);
            expect(status).toHaveProperty('canUndo');
            expect(status).toHaveProperty('canRedo');
        });

        test('should clear all data', () => {
            autoSave.trackChange('setting', 'test', 'value');
            autoSave.addToHistory({ timestamp: Date.now() });
            
            autoSave.clear();
            
            expect(autoSave.trackedChanges.size).toBe(0);
            expect(autoSave.history).toHaveLength(0);
            expect(autoSave.isDirty).toBe(false);
            expect(mockCore.emit).toHaveBeenCalledWith('auto-save:cleared');
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            autoSave.markDirty();
            autoSave.startAutoSaveTimer();
            
            autoSave.destroy();
            
            expect(navigator.sendBeacon).toHaveBeenCalled(); // Should save with beacon
            expect(autoSave.autoSaveTimer).toBe(null);
            expect(autoSave.trackedChanges.size).toBe(0);
        });

        test('should clear all timers on destroy', () => {
            jest.useFakeTimers();
            
            autoSave.debouncedSave();
            autoSave.startAutoSaveTimer();
            
            autoSave.destroy();
            
            expect(autoSave.saveTimer).toBe(null);
            expect(autoSave.autoSaveTimer).toBe(null);
            
            jest.useRealTimers();
        });
    });
});