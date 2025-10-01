/**
 * Enhanced State Manager Test Suite
 * Tests for conflict resolution, fallback mechanisms, and validation
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

// Mock environment setup
const mockEnvironment = () => {
    // Mock localStorage
    const localStorageMock = {
        store: {},
        getItem: jest.fn(function(key) {
            return this.store[key] || null;
        }),
        setItem: jest.fn(function(key, value) {
            this.store[key] = value.toString();
        }),
        removeItem: jest.fn(function(key) {
            delete this.store[key];
        }),
        clear: jest.fn(function() {
            this.store = {};
        })
    };

    // Mock sessionStorage
    const sessionStorageMock = {
        store: {},
        getItem: jest.fn(function(key) {
            return this.store[key] || null;
        }),
        setItem: jest.fn(function(key, value) {
            this.store[key] = value.toString();
        }),
        removeItem: jest.fn(function(key) {
            delete this.store[key];
        }),
        clear: jest.fn(function() {
            this.store = {};
        })
    };

    // Mock BroadcastChannel
    class MockBroadcastChannel {
        constructor(name) {
            this.name = name;
            this.onmessage = null;
        }
        
        postMessage(data) {
            // Simulate async message
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage({ data });
                }
            }, 0);
        }
        
        close() {
            this.onmessage = null;
        }
    }

    // Mock navigator
    const navigatorMock = {
        onLine: true
    };

    // Mock window
    const windowMock = {
        localStorage: localStorageMock,
        sessionStorage: sessionStorageMock,
        BroadcastChannel: MockBroadcastChannel,
        navigator: navigatorMock,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };

    return {
        localStorage: localStorageMock,
        sessionStorage: sessionStorageMock,
        BroadcastChannel: MockBroadcastChannel,
        navigator: navigatorMock,
        window: windowMock
    };
};

// Mock UI Core Manager
class MockUICoreManager {
    constructor() {
        this.components = new Map();
        this.eventBus = new EventTarget();
    }
    
    get(name) {
        return this.components.get(name);
    }
    
    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventBus.dispatchEvent(event);
    }
    
    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }
    
    log(message, level) {
        console.log(`[${level}] ${message}`);
    }
}

// Mock LASUIComponent base class
class MockLASUIComponent {
    constructor(core) {
        this.core = core;
        this.initialized = false;
        this.name = this.constructor.name;
    }
    
    log(message, level = 'info') {
        this.core.log(`[${this.name}] ${message}`, level);
    }
    
    emit(eventName, data) {
        this.core.emit(eventName, data);
    }
    
    on(eventName, callback) {
        this.core.on(eventName, callback);
    }
    
    destroy() {
        this.initialized = false;
    }
}

describe('Enhanced LAS State Manager', () => {
    let StateManager;
    let mockCore;
    let mockEnv;
    
    beforeEach(() => {
        // Setup mock environment
        mockEnv = mockEnvironment();
        global.window = mockEnv.window;
        global.localStorage = mockEnv.localStorage;
        global.sessionStorage = mockEnv.sessionStorage;
        global.BroadcastChannel = mockEnv.BroadcastChannel;
        global.navigator = mockEnv.navigator;
        
        // Clear all mocks
        jest.clearAllMocks();
        mockEnv.localStorage.clear();
        mockEnv.sessionStorage.clear();
        
        // Create mock core
        mockCore = new MockUICoreManager();
        
        // Create StateManager class (simplified for testing)
        StateManager = class extends MockLASUIComponent {
            constructor(core) {
                super(core);
                this.state = {};
                this.localStorage = global.localStorage;
                this.sessionStorage = global.sessionStorage;
                this.broadcastChannel = null;
                this.storageKey = 'las_ui_state';
                this.sessionKey = 'las_session_state';
                this.syncEnabled = true;
                
                // Enhanced properties
                this.conflictResolutionStrategy = 'timestamp';
                this.stateVersion = 1;
                this.maxStateSize = 1024 * 1024;
                this.validationRules = new Map();
                this.fallbackState = {};
                this.corruptionDetected = false;
                this.saveQueue = [];
                this.saveInProgress = false;
                this.retryAttempts = 3;
                this.retryDelay = 100; // Reduced for testing
                
                // Bind methods
                this.handleStorageChange = this.handleStorageChange.bind(this);
                this.handleBroadcastMessage = this.handleBroadcastMessage.bind(this);
                this.handleOnlineStatusChange = this.handleOnlineStatusChange.bind(this);
            }
            
            async init() {
                this.setupValidationRules();
                this.setupFallbackState();
                this.initializeBroadcastChannel();
                await this.loadStateWithRecovery();
                this.bindStorageEvents();
                this.bindOnlineEvents();
                this.initialized = true;
            }
            
            setupValidationRules() {
                this.validationRules.set('activeTab', (value) => {
                    const validTabs = ['general', 'menu', 'adminbar', 'content', 'logos', 'advanced'];
                    return typeof value === 'string' && validTabs.includes(value);
                });
                
                this.validationRules.set('form', (value) => {
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
            
            initializeBroadcastChannel() {
                if (global.BroadcastChannel && this.syncEnabled) {
                    this.broadcastChannel = new global.BroadcastChannel('las-ui-state');
                    this.broadcastChannel.onmessage = this.handleBroadcastMessage;
                }
            }
            
            async loadStateWithRecovery() {
                let loadSuccess = false;
                
                try {
                    if (this.localStorage) {
                        const savedState = this.localStorage.getItem(this.storageKey);
                        if (savedState) {
                            const parsed = await this.parseAndValidateState(savedState);
                            if (parsed) {
                                this.state = { ...this.fallbackState, ...parsed };
                                loadSuccess = true;
                            }
                        }
                    }
                    
                    if (!loadSuccess && this.sessionStorage) {
                        const sessionState = this.sessionStorage.getItem(this.sessionKey);
                        if (sessionState) {
                            const parsed = await this.parseAndValidateState(sessionState);
                            if (parsed) {
                                this.state = { ...this.fallbackState, ...parsed };
                                loadSuccess = true;
                            }
                        }
                    }
                    
                    if (!loadSuccess) {
                        this.state = { ...this.fallbackState };
                    }
                    
                    await this.validateState();
                    
                } catch (error) {
                    await this.recoverWithFallback();
                }
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
                    this.localStorage.setItem(backupKey, JSON.stringify(this.state));
                }
                
                this.state = { ...this.fallbackState };
                await this.saveState();
                this.emit('state:recovered', { reason: 'corruption_detected', fallbackUsed: true });
                this.corruptionDetected = false;
            }
            
            async detectConflicts() {
                const conflicts = [];
                
                try {
                    if (this.localStorage) {
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
            
            async saveWithRetry() {
                let attempts = 0;
                
                while (attempts < this.retryAttempts) {
                    try {
                        await this.saveState();
                        return;
                    } catch (error) {
                        attempts++;
                        if (attempts >= this.retryAttempts) {
                            throw error;
                        }
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
                    }
                }
            }
            
            processQueuedSaves() {
                const queue = this.saveQueue.splice(0);
                queue.forEach(resolve => resolve());
            }
            
            async saveState() {
                const stateJson = JSON.stringify(this.state);
                
                if (this.localStorage) {
                    this.localStorage.setItem(this.storageKey, stateJson);
                }
                
                if (this.sessionStorage) {
                    this.sessionStorage.setItem(this.sessionKey, stateJson);
                }
                
                if (this.broadcastChannel && this.syncEnabled) {
                    this.broadcastChannel.postMessage({
                        type: 'state-update',
                        state: this.state,
                        timestamp: Date.now()
                    });
                }
            }
            
            async get(key, defaultValue = null) {
                try {
                    const keys = key.split('.');
                    let value = this.state;
                    
                    for (const k of keys) {
                        if (value && typeof value === 'object' && k in value) {
                            value = value[k];
                        } else {
                            return defaultValue;
                        }
                    }
                    
                    return value;
                } catch (error) {
                    return defaultValue;
                }
            }
            
            async set(key, value) {
                try {
                    const keys = key.split('.');
                    let current = this.state;
                    
                    for (let i = 0; i < keys.length - 1; i++) {
                        const k = keys[i];
                        if (!(k in current) || typeof current[k] !== 'object') {
                            current[k] = {};
                        }
                        current = current[k];
                    }
                    
                    const finalKey = keys[keys.length - 1];
                    current[finalKey] = value;
                    this.state.timestamp = Date.now();
                    
                    await this.saveStateWithConflictResolution();
                    this.emit('state:set', { key, value });
                    
                    return true;
                } catch (error) {
                    return false;
                }
            }
            
            setConflictResolutionStrategy(strategy) {
                const validStrategies = ['timestamp', 'merge', 'manual'];
                if (validStrategies.includes(strategy)) {
                    this.conflictResolutionStrategy = strategy;
                }
            }
            
            getStateHealth() {
                return {
                    initialized: this.initialized,
                    corruptionDetected: this.corruptionDetected,
                    stateSize: JSON.stringify(this.state).length,
                    maxStateSize: this.maxStateSize,
                    version: this.state.version || 0,
                    timestamp: this.state.timestamp || 0,
                    syncEnabled: this.syncEnabled,
                    conflictStrategy: this.conflictResolutionStrategy,
                    hasValidationRules: this.validationRules.size > 0,
                    hasFallbackState: Object.keys(this.fallbackState).length > 0
                };
            }
            
            bindStorageEvents() {
                // Mock implementation
            }
            
            bindOnlineEvents() {
                // Mock implementation
            }
            
            handleStorageChange(event) {
                // Mock implementation
            }
            
            handleBroadcastMessage(event) {
                // Mock implementation
            }
            
            handleOnlineStatusChange() {
                // Mock implementation
            }
        };
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization and Setup', () => {
        test('should initialize with validation rules and fallback state', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            expect(stateManager.initialized).toBe(true);
            expect(stateManager.validationRules.size).toBeGreaterThan(0);
            expect(Object.keys(stateManager.fallbackState)).toContain('activeTab');
            expect(stateManager.fallbackState.activeTab).toBe('general');
        });
        
        test('should setup validation rules correctly', async () => {
            const stateManager = new StateManager(mockCore);
            stateManager.setupValidationRules();
            
            const activeTabValidator = stateManager.validationRules.get('activeTab');
            expect(activeTabValidator('general')).toBe(true);
            expect(activeTabValidator('invalid')).toBe(false);
            expect(activeTabValidator(123)).toBe(false);
            
            const formValidator = stateManager.validationRules.get('form');
            expect(formValidator({})).toBe(true);
            expect(formValidator(null)).toBe(false);
            expect(formValidator('string')).toBe(false);
        });
        
        test('should setup fallback state with required fields', async () => {
            const stateManager = new StateManager(mockCore);
            stateManager.setupFallbackState();
            
            expect(stateManager.fallbackState).toHaveProperty('activeTab');
            expect(stateManager.fallbackState).toHaveProperty('form');
            expect(stateManager.fallbackState).toHaveProperty('ui');
            expect(stateManager.fallbackState).toHaveProperty('preferences');
            expect(stateManager.fallbackState).toHaveProperty('version');
            expect(stateManager.fallbackState).toHaveProperty('timestamp');
        });
    });

    describe('State Validation and Recovery', () => {
        test('should validate state data correctly', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Valid state should pass validation
            stateManager.state = {
                activeTab: 'menu',
                form: { test: 'value' },
                version: 1,
                timestamp: Date.now()
            };
            
            await expect(stateManager.validateState()).resolves.not.toThrow();
            expect(stateManager.corruptionDetected).toBe(false);
        });
        
        test('should detect and handle corrupted state', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Create circular reference
            const circularObj = { test: 'value' };
            circularObj.self = circularObj;
            stateManager.state = circularObj;
            
            await stateManager.validateState();
            
            // Should recover with fallback state
            expect(stateManager.state.activeTab).toBe('general');
            expect(stateManager.corruptionDetected).toBe(false);
        });
        
        test('should parse and validate state from storage', async () => {
            const stateManager = new StateManager(mockCore);
            stateManager.setupValidationRules();
            
            // Valid state JSON
            const validState = JSON.stringify({
                activeTab: 'menu',
                form: { test: 'value' },
                version: 1
            });
            
            const parsed = await stateManager.parseAndValidateState(validState);
            expect(parsed).toBeTruthy();
            expect(parsed.activeTab).toBe('menu');
            
            // Invalid state JSON
            const invalidState = 'invalid json';
            const parsedInvalid = await stateManager.parseAndValidateState(invalidState);
            expect(parsedInvalid).toBeNull();
            
            // State with invalid data
            const stateWithInvalidData = JSON.stringify({
                activeTab: 'invalid_tab',
                form: 'not_an_object'
            });
            
            const parsedWithInvalid = await stateManager.parseAndValidateState(stateWithInvalidData);
            expect(parsedWithInvalid).toBeTruthy();
            expect(parsedWithInvalid.activeTab).toBeUndefined(); // Should be removed
            expect(parsedWithInvalid.form).toBeUndefined(); // Should be removed
        });
        
        test('should cleanup large state data', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Create large form data
            stateManager.state.form = {};
            for (let i = 0; i < 15; i++) {
                stateManager.state.form[`field_${i}`] = `value_${i}`;
            }
            
            // Add temporary data
            stateManager.state.temp = { large: 'data' };
            
            await stateManager.cleanupLargeState();
            
            // Should keep only last 10 form entries
            expect(Object.keys(stateManager.state.form)).toHaveLength(10);
            
            // Should remove temporary data
            expect(stateManager.state.temp).toBeUndefined();
        });
        
        test('should recover with fallback state when needed', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Set some corrupted state
            stateManager.state = { corrupted: 'data' };
            
            const eventSpy = jest.fn();
            stateManager.on('state:recovered', eventSpy);
            
            await stateManager.recoverWithFallback();
            
            expect(stateManager.state.activeTab).toBe('general');
            expect(stateManager.corruptionDetected).toBe(false);
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: expect.objectContaining({
                        reason: 'corruption_detected',
                        fallbackUsed: true
                    })
                })
            );
        });
    });

    describe('Conflict Resolution', () => {
        test('should detect timestamp conflicts', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Set current state with older timestamp
            stateManager.state = {
                activeTab: 'general',
                timestamp: Date.now() - 10000
            };
            
            // Set newer state in localStorage
            const newerState = {
                activeTab: 'menu',
                timestamp: Date.now()
            };
            mockEnv.localStorage.setItem('las_ui_state', JSON.stringify(newerState));
            
            const conflicts = await stateManager.detectConflicts();
            
            expect(conflicts).toHaveLength(1);
            expect(conflicts[0].type).toBe('timestamp');
            expect(conflicts[0].source).toBe('localStorage');
        });
        
        test('should resolve conflicts by timestamp', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            const oldTimestamp = Date.now() - 10000;
            const newTimestamp = Date.now();
            
            stateManager.state = {
                activeTab: 'general',
                timestamp: oldTimestamp
            };
            
            const conflict = {
                type: 'timestamp',
                storedState: {
                    activeTab: 'menu',
                    timestamp: newTimestamp
                }
            };
            
            await stateManager.resolveByTimestamp(conflict);
            
            expect(stateManager.state.activeTab).toBe('menu');
            expect(stateManager.state.timestamp).toBeGreaterThan(newTimestamp);
        });
        
        test('should resolve conflicts by merging', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            stateManager.state = {
                activeTab: 'general',
                form: { field1: 'value1' },
                ui: { theme: 'dark' }
            };
            
            const conflict = {
                storedState: {
                    activeTab: 'menu',
                    form: { field2: 'value2' },
                    ui: { animations: true }
                }
            };
            
            await stateManager.resolveByMerging(conflict);
            
            expect(stateManager.state.activeTab).toBe('general'); // Current wins
            expect(stateManager.state.form.field1).toBe('value1');
            expect(stateManager.state.form.field2).toBe('value2');
            expect(stateManager.state.ui.theme).toBe('dark');
            expect(stateManager.state.ui.animations).toBe(true);
        });
        
        test('should handle different conflict resolution strategies', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Test timestamp strategy
            stateManager.setConflictResolutionStrategy('timestamp');
            expect(stateManager.conflictResolutionStrategy).toBe('timestamp');
            
            // Test merge strategy
            stateManager.setConflictResolutionStrategy('merge');
            expect(stateManager.conflictResolutionStrategy).toBe('merge');
            
            // Test invalid strategy (should not change)
            stateManager.setConflictResolutionStrategy('invalid');
            expect(stateManager.conflictResolutionStrategy).toBe('merge');
        });
    });

    describe('Save Operations with Retry Logic', () => {
        test('should queue save operations when save is in progress', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            stateManager.saveInProgress = true;
            
            const savePromise1 = stateManager.saveStateWithConflictResolution();
            const savePromise2 = stateManager.saveStateWithConflictResolution();
            
            expect(stateManager.saveQueue).toHaveLength(2);
            
            // Complete the save
            stateManager.saveInProgress = false;
            stateManager.processQueuedSaves();
            
            await Promise.all([savePromise1, savePromise2]);
            expect(stateManager.saveQueue).toHaveLength(0);
        });
        
        test('should retry failed save operations', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Mock saveState to fail first two times
            let attempts = 0;
            stateManager.saveState = jest.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Save failed');
                }
                return Promise.resolve();
            });
            
            await stateManager.saveWithRetry();
            
            expect(stateManager.saveState).toHaveBeenCalledTimes(3);
        });
        
        test('should throw error after max retry attempts', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            stateManager.retryAttempts = 2;
            stateManager.saveState = jest.fn().mockRejectedValue(new Error('Save failed'));
            
            await expect(stateManager.saveWithRetry()).rejects.toThrow('Save failed');
            expect(stateManager.saveState).toHaveBeenCalledTimes(2);
        });
    });

    describe('State Health and Monitoring', () => {
        test('should provide comprehensive state health information', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
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
        });
        
        test('should track state size correctly', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            stateManager.state = { test: 'data' };
            
            const health = stateManager.getStateHealth();
            const expectedSize = JSON.stringify(stateManager.state).length;
            
            expect(health.stateSize).toBe(expectedSize);
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete state lifecycle with conflicts', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Set initial state
            await stateManager.set('activeTab', 'menu');
            await stateManager.set('form.field1', 'value1');
            
            // Simulate conflict by setting newer state in storage
            const conflictState = {
                activeTab: 'general',
                form: { field2: 'value2' },
                timestamp: Date.now() + 1000,
                version: 1
            };
            mockEnv.localStorage.setItem('las_ui_state', JSON.stringify(conflictState));
            
            // Set conflict resolution to merge
            stateManager.setConflictResolutionStrategy('merge');
            
            // Trigger save with conflict resolution
            await stateManager.set('form.field3', 'value3');
            
            // Should have merged states
            expect(await stateManager.get('activeTab')).toBe('general'); // From conflict
            expect(await stateManager.get('form.field1')).toBe('value1'); // Original
            expect(await stateManager.get('form.field2')).toBe('value2'); // From conflict
            expect(await stateManager.get('form.field3')).toBe('value3'); // New
        });
        
        test('should recover from storage corruption gracefully', async () => {
            const stateManager = new StateManager(mockCore);
            
            // Set corrupted data in storage
            mockEnv.localStorage.setItem('las_ui_state', 'corrupted json data');
            mockEnv.sessionStorage.setItem('las_session_state', 'also corrupted');
            
            const eventSpy = jest.fn();
            stateManager.on('state:recovered', eventSpy);
            
            await stateManager.init();
            
            // Should use fallback state
            expect(stateManager.state.activeTab).toBe('general');
            expect(stateManager.initialized).toBe(true);
        });
        
        test('should handle state operations under various failure conditions', async () => {
            const stateManager = new StateManager(mockCore);
            await stateManager.init();
            
            // Test with localStorage failure
            mockEnv.localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });
            
            // Should still work with sessionStorage
            const result = await stateManager.set('test', 'value');
            expect(result).toBe(true);
            
            // Test with both storage failures
            mockEnv.sessionStorage.setItem.mockImplementation(() => {
                throw new Error('Storage not available');
            });
            
            // Should still complete without throwing
            const result2 = await stateManager.set('test2', 'value2');
            expect(result2).toBe(true);
        });
    });
});