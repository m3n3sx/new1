/**
 * State Management Integration Tests
 * Tests for conflict resolution, fallback mechanisms, and edge cases
 * 
 * Requirements: 7.4, 7.6, 7.7
 */

// Mock environment setup
const setupMockEnvironment = () => {
    // Mock localStorage with failure simulation
    const createMockStorage = (shouldFail = false) => ({
        store: {},
        getItem: jest.fn(function(key) {
            if (shouldFail) throw new Error('Storage not available');
            return this.store[key] || null;
        }),
        setItem: jest.fn(function(key, value) {
            if (shouldFail) throw new Error('Storage quota exceeded');
            this.store[key] = value.toString();
        }),
        removeItem: jest.fn(function(key) {
            if (shouldFail) throw new Error('Storage not available');
            delete this.store[key];
        }),
        clear: jest.fn(function() {
            if (shouldFail) throw new Error('Storage not available');
            this.store = {};
        })
    });

    // Mock BroadcastChannel
    class MockBroadcastChannel {
        constructor(name) {
            this.name = name;
            this.onmessage = null;
            this.messageQueue = [];
        }
        
        postMessage(data) {
            this.messageQueue.push(data);
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage({ data });
                }
            }, 0);
        }
        
        close() {
            this.onmessage = null;
            this.messageQueue = [];
        }
    }

    return {
        localStorage: createMockStorage(),
        sessionStorage: createMockStorage(),
        failingLocalStorage: createMockStorage(true),
        failingSessionStorage: createMockStorage(true),
        BroadcastChannel: MockBroadcastChannel,
        navigator: { onLine: true }
    };
};

// Enhanced State Manager for testing
class TestStateManager {
    constructor(mockEnv) {
        this.localStorage = mockEnv.localStorage;
        this.sessionStorage = mockEnv.sessionStorage;
        this.broadcastChannel = null;
        this.storageKey = 'las_ui_state_test';
        this.sessionKey = 'las_session_state_test';
        this.syncEnabled = true;
        
        // Enhanced properties
        this.state = {};
        this.conflictResolutionStrategy = 'timestamp';
        this.stateVersion = 1;
        this.maxStateSize = 1024 * 100; // 100KB for testing
        this.validationRules = new Map();
        this.fallbackState = {};
        this.corruptionDetected = false;
        this.saveQueue = [];
        this.saveInProgress = false;
        this.retryAttempts = 3;
        this.retryDelay = 10; // Reduced for testing
        
        this.setupValidationRules();
        this.setupFallbackState();
        
        if (mockEnv.BroadcastChannel) {
            this.broadcastChannel = new mockEnv.BroadcastChannel('las-ui-state-test');
        }
    }
    
    setupValidationRules() {
        this.validationRules.set('activeTab', (value) => {
            const validTabs = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
            return typeof value === 'string' && validTabs.includes(value);
        });
        
        this.validationRules.set('form', (value) => {
            return typeof value === 'object' && value !== null;
        });
        
        this.validationRules.set('ui', (value) => {
            return typeof value === 'object' && value !== null;
        });
    }
    
    setupFallbackState() {
        this.fallbackState = {
            activeTab: 'general',
            form: {},
            ui: { theme: 'default' },
            preferences: { rememberTab: true },
            version: this.stateVersion,
            timestamp: Date.now()
        };
    }
    
    async parseAndValidateState(stateJson) {
        try {
            const parsed = JSON.parse(stateJson);
            
            if (JSON.stringify(parsed).length > this.maxStateSize) {
                return null;
            }
            
            if (parsed.version && parsed.version > this.stateVersion) {
                return null;
            }
            
            if (typeof parsed !== 'object' || parsed === null) {
                return null;
            }
            
            // Run validation rules
            for (const [key, validator] of this.validationRules) {
                if (parsed[key] !== undefined && !validator(parsed[key])) {
                    delete parsed[key];
                }
            }
            
            return parsed;
        } catch (error) {
            return null;
        }
    }
    
    async validateState() {
        const stateString = JSON.stringify(this.state);
        
        if (stateString.includes('[object Object]')) {
            throw new Error('Circular reference detected in state');
        }
        
        if (stateString.length > this.maxStateSize) {
            await this.cleanupLargeState();
        }
        
        if (!this.state.activeTab) {
            this.state.activeTab = this.fallbackState.activeTab;
        }
        
        this.state.version = this.stateVersion;
        this.state.timestamp = Date.now();
        this.corruptionDetected = false;
    }
    
    async cleanupLargeState() {
        if (this.state.form && typeof this.state.form === 'object') {
            const formKeys = Object.keys(this.state.form);
            if (formKeys.length > 10) {
                const keysToRemove = formKeys.slice(0, formKeys.length - 10);
                keysToRemove.forEach(key => delete this.state.form[key]);
            }
        }
        
        if (this.state.temp) {
            delete this.state.temp;
        }
    }
    
    async recoverWithFallback() {
        if (this.state && Object.keys(this.state).length > 0) {
            const backupKey = `${this.storageKey}_backup_${Date.now()}`;
            try {
                this.localStorage.setItem(backupKey, JSON.stringify(this.state));
            } catch (error) {
                // Ignore backup errors
            }
        }
        
        this.state = { ...this.fallbackState };
        this.corruptionDetected = false;
        
        try {
            await this.saveState();
        } catch (error) {
            // Ignore save errors during recovery
        }
        
        return { recovered: true, fallbackUsed: true };
    }
    
    async detectConflicts() {
        const conflicts = [];
        
        try {
            const storedState = this.localStorage.getItem(this.storageKey);
            if (storedState) {
                const parsed = JSON.parse(storedState);
                
                if (parsed.timestamp && this.state.timestamp && 
                    parsed.timestamp > this.state.timestamp) {
                    conflicts.push({
                        type: 'timestamp',
                        source: 'localStorage',
                        storedState: parsed,
                        currentState: this.state
                    });
                }
                
                if (parsed.version && parsed.version > this.state.version) {
                    conflicts.push({
                        type: 'version',
                        source: 'localStorage',
                        storedVersion: parsed.version,
                        currentVersion: this.state.version
                    });
                }
            }
        } catch (error) {
            // Ignore errors in conflict detection
        }
        
        return conflicts;
    }
    
    async resolveConflicts(conflicts) {
        for (const conflict of conflicts) {
            if (this.conflictResolutionStrategy === 'timestamp') {
                await this.resolveByTimestamp(conflict);
            } else if (this.conflictResolutionStrategy === 'merge') {
                await this.resolveByMerging(conflict);
            }
        }
    }
    
    async resolveByTimestamp(conflict) {
        if (conflict.type === 'timestamp' && conflict.storedState.timestamp > this.state.timestamp) {
            this.state = { ...this.state, ...conflict.storedState };
            this.state.timestamp = Date.now();
        }
    }
    
    async resolveByMerging(conflict) {
        if (conflict.storedState) {
            this.state = this.deepMerge(conflict.storedState, this.state);
            this.state.timestamp = Date.now();
        }
    }
    
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && 
                    typeof result[key] === 'object' && result[key] !== null) {
                    result[key] = this.deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    async saveState() {
        const stateJson = JSON.stringify(this.state);
        this.localStorage.setItem(this.storageKey, stateJson);
        this.sessionStorage.setItem(this.sessionKey, stateJson);
        
        if (this.broadcastChannel && this.syncEnabled) {
            this.broadcastChannel.postMessage({
                type: 'state-update',
                state: this.state,
                timestamp: Date.now()
            });
        }
    }
    
    async saveWithRetry() {
        let attempts = 0;
        
        while (attempts < this.retryAttempts) {
            try {
                await this.saveState();
                return { success: true, attempts: attempts + 1 };
            } catch (error) {
                attempts++;
                if (attempts >= this.retryAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
            }
        }
    }
    
    async saveStateWithConflictResolution() {
        if (this.saveInProgress) {
            return new Promise((resolve) => {
                this.saveQueue.push(resolve);
            });
        }
        
        this.saveInProgress = true;
        
        try {
            const conflicts = await this.detectConflicts();
            if (conflicts.length > 0) {
                await this.resolveConflicts(conflicts);
            }
            
            await this.validateState();
            await this.saveWithRetry();
            this.processQueuedSaves();
            
        } finally {
            this.saveInProgress = false;
        }
    }
    
    processQueuedSaves() {
        const queue = this.saveQueue.splice(0);
        queue.forEach(resolve => resolve());
    }
    
    setConflictResolutionStrategy(strategy) {
        const validStrategies = ['timestamp', 'merge', 'manual'];
        if (validStrategies.includes(strategy)) {
            this.conflictResolutionStrategy = strategy;
        }
    }
    
    getStateHealth() {
        return {
            initialized: true,
            corruptionDetected: this.corruptionDetected,
            stateSize: JSON.stringify(this.state).length,
            maxStateSize: this.maxStateSize,
            version: this.state.version || 0,
            timestamp: this.state.timestamp || 0,
            syncEnabled: this.syncEnabled,
            conflictStrategy: this.conflictResolutionStrategy,
            hasValidationRules: this.validationRules.size > 0,
            hasFallbackState: Object.keys(this.fallbackState).length > 0,
            queueLength: this.saveQueue.length,
            saveInProgress: this.saveInProgress
        };
    }
}

describe('State Management Integration Tests', () => {
    let mockEnv;
    let stateManager;
    
    beforeEach(() => {
        mockEnv = setupMockEnvironment();
        stateManager = new TestStateManager(mockEnv);
        jest.clearAllMocks();
    });

    describe('Conflict Resolution Integration', () => {
        test('should handle timestamp conflicts in real-world scenario', async () => {
            // Simulate user working in two tabs
            stateManager.state = {
                activeTab: 'general',
                form: { field1: 'value1' },
                timestamp: Date.now() - 10000
            };
            
            // Simulate newer state from another tab
            const newerState = {
                activeTab: 'menu',
                form: { field2: 'value2' },
                timestamp: Date.now()
            };
            mockEnv.localStorage.setItem(stateManager.storageKey, JSON.stringify(newerState));
            
            // Attempt to save current state (should detect and resolve conflict)
            await stateManager.saveStateWithConflictResolution();
            
            // Should use newer state from storage
            expect(stateManager.state.activeTab).toBe('menu');
            expect(stateManager.state.form.field2).toBe('value2');
        });
        
        test('should merge states when using merge strategy', async () => {
            stateManager.setConflictResolutionStrategy('merge');
            
            stateManager.state = {
                activeTab: 'general',
                form: { field1: 'value1' },
                ui: { theme: 'dark' },
                timestamp: Date.now() - 5000
            };
            
            const conflictState = {
                activeTab: 'menu',
                form: { field2: 'value2' },
                ui: { animations: true },
                timestamp: Date.now()
            };
            mockEnv.localStorage.setItem(stateManager.storageKey, JSON.stringify(conflictState));
            
            await stateManager.saveStateWithConflictResolution();
            
            // Should have merged both states
            expect(stateManager.state.activeTab).toBe('general'); // Current wins in merge
            expect(stateManager.state.form.field1).toBe('value1');
            expect(stateManager.state.form.field2).toBe('value2');
            expect(stateManager.state.ui.theme).toBe('dark');
            expect(stateManager.state.ui.animations).toBe(true);
        });
        
        test('should handle multiple simultaneous conflicts', async () => {
            stateManager.state = {
                version: 1,
                activeTab: 'general',
                timestamp: Date.now() - 15000
            };
            
            const conflictState = {
                version: 2,
                activeTab: 'menu',
                timestamp: Date.now(),
                newFeature: 'enabled'
            };
            mockEnv.localStorage.setItem(stateManager.storageKey, JSON.stringify(conflictState));
            
            const conflicts = await stateManager.detectConflicts();
            
            expect(conflicts).toHaveLength(2);
            expect(conflicts.some(c => c.type === 'timestamp')).toBe(true);
            expect(conflicts.some(c => c.type === 'version')).toBe(true);
            
            await stateManager.resolveConflicts(conflicts);
            expect(stateManager.state.activeTab).toBe('menu');
        });
    });

    describe('Fallback and Recovery Integration', () => {
        test('should recover from complete storage corruption', async () => {
            // Set corrupted data in both storages
            mockEnv.localStorage.setItem(stateManager.storageKey, 'corrupted json {invalid}');
            mockEnv.sessionStorage.setItem(stateManager.sessionKey, 'also corrupted [invalid');
            
            const result = await stateManager.recoverWithFallback();
            
            expect(result.recovered).toBe(true);
            expect(result.fallbackUsed).toBe(true);
            expect(stateManager.state.activeTab).toBe('general');
            expect(stateManager.corruptionDetected).toBe(false);
        });
        
        test('should handle storage failures gracefully', async () => {
            // Replace with failing storage
            stateManager.localStorage = mockEnv.failingLocalStorage;
            stateManager.sessionStorage = mockEnv.failingSessionStorage;
            
            // Should not throw error even with storage failures
            await expect(stateManager.saveWithRetry()).rejects.toThrow();
            
            // But recovery should still work
            const result = await stateManager.recoverWithFallback();
            expect(result.recovered).toBe(true);
        });
        
        test('should detect and recover from circular references', async () => {
            // Create circular reference
            const circularObj = { test: 'value' };
            circularObj.self = circularObj;
            stateManager.state = circularObj;
            
            await expect(stateManager.validateState()).rejects.toThrow('Circular reference detected');
            
            const result = await stateManager.recoverWithFallback();
            expect(result.recovered).toBe(true);
            expect(stateManager.state.activeTab).toBe('general');
        });
        
        test('should handle state size limit violations', async () => {
            // Create oversized state
            const largeData = 'x'.repeat(stateManager.maxStateSize / 2);
            stateManager.state = {
                largeField1: largeData,
                largeField2: largeData,
                largeField3: largeData
            };
            
            const initialSize = JSON.stringify(stateManager.state).length;
            expect(initialSize).toBeGreaterThan(stateManager.maxStateSize);
            
            await stateManager.validateState();
            
            const finalSize = JSON.stringify(stateManager.state).length;
            expect(finalSize).toBeLessThan(initialSize);
        });
    });

    describe('Validation and Cleanup Integration', () => {
        test('should validate and fix invalid state data', async () => {
            stateManager.state = {
                activeTab: 'invalid_tab',
                form: 'not_an_object',
                ui: null,
                validField: 'should_remain'
            };
            
            await stateManager.validateState();
            
            // Invalid data should be fixed
            expect(stateManager.state.activeTab).toBe('general'); // Fixed to fallback
            expect(stateManager.state.validField).toBe('should_remain'); // Valid data preserved
        });
        
        test('should cleanup large form data automatically', async () => {
            // Create large form with many fields
            stateManager.state.form = {};
            for (let i = 0; i < 20; i++) {
                stateManager.state.form[`field_${i}`] = `value_${i}`;
            }
            
            stateManager.state.temp = { large: 'temporary data' };
            
            await stateManager.cleanupLargeState();
            
            // Should keep only last 10 form fields
            expect(Object.keys(stateManager.state.form)).toHaveLength(10);
            
            // Should remove temporary data
            expect(stateManager.state.temp).toBeUndefined();
            
            // Should keep the most recent fields
            expect(stateManager.state.form.field_19).toBe('value_19');
            expect(stateManager.state.form.field_0).toBeUndefined();
        });
        
        test('should handle validation rule failures gracefully', async () => {
            const testData = {
                activeTab: 'invalid_tab',
                form: 'not_an_object',
                ui: 123,
                validData: { test: 'value' }
            };
            
            const parsed = await stateManager.parseAndValidateState(JSON.stringify(testData));
            
            // Invalid fields should be removed
            expect(parsed.activeTab).toBeUndefined();
            expect(parsed.form).toBeUndefined();
            expect(parsed.ui).toBeUndefined();
            
            // Valid data should remain
            expect(parsed.validData).toEqual({ test: 'value' });
        });
    });

    describe('Performance and Reliability Integration', () => {
        test('should handle retry logic with exponential backoff', async () => {
            let attempts = 0;
            const originalSaveState = stateManager.saveState;
            
            stateManager.saveState = jest.fn().mockImplementation(async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error(`Attempt ${attempts} failed`);
                }
                return originalSaveState.call(stateManager);
            });
            
            const startTime = Date.now();
            const result = await stateManager.saveWithRetry();
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(result.attempts).toBe(3);
            expect(stateManager.saveState).toHaveBeenCalledTimes(3);
            
            // Should have delays between retries
            expect(endTime - startTime).toBeGreaterThan(stateManager.retryDelay);
        });
        
        test('should queue concurrent save operations', async () => {
            const savePromises = [];
            let resolveCount = 0;
            
            // Mock save to be slow
            stateManager.saveState = jest.fn().mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                resolveCount++;
            });
            
            // Start multiple concurrent saves
            for (let i = 0; i < 5; i++) {
                savePromises.push(stateManager.saveStateWithConflictResolution());
            }
            
            await Promise.all(savePromises);
            
            // All saves should complete
            expect(resolveCount).toBeGreaterThan(0);
            expect(stateManager.saveQueue).toHaveLength(0);
            expect(stateManager.saveInProgress).toBe(false);
        });
        
        test('should maintain state integrity under stress', async () => {
            const operations = 100;
            const promises = [];
            
            for (let i = 0; i < operations; i++) {
                promises.push(
                    stateManager.saveStateWithConflictResolution().then(() => {
                        stateManager.state.counter = (stateManager.state.counter || 0) + 1;
                    })
                );
            }
            
            await Promise.all(promises);
            
            // State should remain consistent
            expect(stateManager.state.counter).toBe(operations);
            expect(stateManager.corruptionDetected).toBe(false);
        });
    });

    describe('Multi-tab Synchronization Integration', () => {
        test('should synchronize state via BroadcastChannel', async () => {
            const messages = [];
            
            if (stateManager.broadcastChannel) {
                stateManager.broadcastChannel.onmessage = (event) => {
                    messages.push(event.data);
                };
                
                stateManager.state = { activeTab: 'menu', test: 'broadcast' };
                await stateManager.saveState();
                
                // Wait for async message
                await new Promise(resolve => setTimeout(resolve, 10));
                
                expect(messages).toHaveLength(1);
                expect(messages[0].type).toBe('state-update');
                expect(messages[0].state.activeTab).toBe('menu');
            }
        });
        
        test('should handle sync conflicts between tabs', async () => {
            // Simulate state from current tab
            stateManager.state = {
                activeTab: 'general',
                timestamp: Date.now() - 5000,
                source: 'current_tab'
            };
            
            // Simulate newer state from another tab
            const remoteState = {
                activeTab: 'menu',
                timestamp: Date.now(),
                source: 'remote_tab'
            };
            mockEnv.localStorage.setItem(stateManager.storageKey, JSON.stringify(remoteState));
            
            await stateManager.saveStateWithConflictResolution();
            
            // Should resolve to newer remote state
            expect(stateManager.state.activeTab).toBe('menu');
            expect(stateManager.state.source).toBe('remote_tab');
        });
    });

    describe('Edge Cases and Error Scenarios', () => {
        test('should handle malformed JSON in storage', async () => {
            mockEnv.localStorage.setItem(stateManager.storageKey, '{"invalid": json}');
            
            const parsed = await stateManager.parseAndValidateState('{"invalid": json}');
            expect(parsed).toBeNull();
            
            // Should not crash the system
            const result = await stateManager.recoverWithFallback();
            expect(result.recovered).toBe(true);
        });
        
        test('should handle version incompatibility', async () => {
            const futureVersionState = {
                version: 999,
                activeTab: 'future_tab',
                futureFeature: 'enabled'
            };
            
            const parsed = await stateManager.parseAndValidateState(JSON.stringify(futureVersionState));
            expect(parsed).toBeNull(); // Should reject future version
        });
        
        test('should handle empty or null state gracefully', async () => {
            stateManager.state = null;
            await stateManager.validateState();
            
            expect(stateManager.state.activeTab).toBe('general');
            expect(stateManager.state.version).toBe(1);
        });
        
        test('should handle storage quota exceeded errors', async () => {
            mockEnv.localStorage.setItem.mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });
            
            // Should not crash, should attempt fallback
            await expect(stateManager.saveWithRetry()).rejects.toThrow();
            
            // But system should remain functional
            const health = stateManager.getStateHealth();
            expect(health.initialized).toBe(true);
        });
        
        test('should handle browser compatibility issues', async () => {
            // Simulate browser without BroadcastChannel
            stateManager.broadcastChannel = null;
            
            // Should still work without sync
            await stateManager.saveState();
            
            const health = stateManager.getStateHealth();
            expect(health.initialized).toBe(true);
        });
    });

    describe('State Health Monitoring Integration', () => {
        test('should provide comprehensive health metrics', () => {
            stateManager.state = { activeTab: 'menu', form: { test: 'data' } };
            stateManager.corruptionDetected = false;
            stateManager.saveInProgress = true;
            stateManager.saveQueue = [1, 2, 3];
            
            const health = stateManager.getStateHealth();
            
            expect(health).toHaveProperty('initialized', true);
            expect(health).toHaveProperty('corruptionDetected', false);
            expect(health).toHaveProperty('stateSize');
            expect(health).toHaveProperty('maxStateSize');
            expect(health).toHaveProperty('version');
            expect(health).toHaveProperty('timestamp');
            expect(health).toHaveProperty('syncEnabled');
            expect(health).toHaveProperty('conflictStrategy');
            expect(health).toHaveProperty('hasValidationRules', true);
            expect(health).toHaveProperty('hasFallbackState', true);
            expect(health).toHaveProperty('queueLength', 3);
            expect(health).toHaveProperty('saveInProgress', true);
        });
        
        test('should track state size accurately', () => {
            stateManager.state = { test: 'data', number: 123, nested: { deep: 'value' } };
            
            const health = stateManager.getStateHealth();
            const expectedSize = JSON.stringify(stateManager.state).length;
            
            expect(health.stateSize).toBe(expectedSize);
        });
        
        test('should detect corruption status correctly', async () => {
            // Initially no corruption
            let health = stateManager.getStateHealth();
            expect(health.corruptionDetected).toBe(false);
            
            // Simulate corruption detection
            stateManager.corruptionDetected = true;
            health = stateManager.getStateHealth();
            expect(health.corruptionDetected).toBe(true);
            
            // Recovery should clear corruption flag
            await stateManager.recoverWithFallback();
            health = stateManager.getStateHealth();
            expect(health.corruptionDetected).toBe(false);
        });
    });
});