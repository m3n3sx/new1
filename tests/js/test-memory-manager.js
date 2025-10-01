/**
 * Test Suite for LAS Memory Manager
 * Tests memory management, leak prevention, and resource cleanup
 */

// Load the memory manager class
const fs = require('fs');
const path = require('path');

// Load the memory manager module
const memoryManagerPath = path.join(__dirname, '../../assets/js/modules/memory-manager.js');
const memoryManagerCode = fs.readFileSync(memoryManagerPath, 'utf8');
eval(memoryManagerCode);

describe('LAS Memory Manager', () => {
    let core, memoryManager;
    let mockElement, mockObserver;
    
    beforeEach(() => {
        // Mock core manager
        core = {
            emit: jest.fn(),
            on: jest.fn(),
            get: jest.fn()
        };
        
        // Mock DOM element
        mockElement = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        
        // Mock observers
        mockObserver = {
            observe: jest.fn(),
            disconnect: jest.fn()
        };
        
        // Mock global objects
        global.MutationObserver = jest.fn(() => mockObserver);
        global.IntersectionObserver = jest.fn(() => mockObserver);
        global.ResizeObserver = jest.fn(() => mockObserver);
        
        // Mock performance API
        global.performance = {
            memory: {
                usedJSHeapSize: 10 * 1024 * 1024, // 10MB
                totalJSHeapSize: 20 * 1024 * 1024, // 20MB
                jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
            }
        };
        
        // Mock document and window
        global.document = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            hidden: false
        };
        
        global.window = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            gc: jest.fn()
        };
        
        // Mock timers
        global.setTimeout = jest.fn((callback, delay) => {
            const id = Math.random().toString(36);
            // Execute callback immediately for testing
            setTimeout(() => callback(), 0);
            return id;
        });
        
        global.clearTimeout = jest.fn();
        global.setInterval = jest.fn(() => Math.random().toString(36));
        global.clearInterval = jest.fn();
        
        memoryManager = new LASMemoryManager(core);
    });
    
    afterEach(() => {
        if (memoryManager) {
            memoryManager.cleanup();
        }
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await memoryManager.init();
            
            expect(memoryManager.isMonitoring).toBe(true);
            expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
            expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
        });
        
        test('should start memory monitoring', async () => {
            await memoryManager.init();
            
            expect(global.setInterval).toHaveBeenCalled();
        });
        
        test('should handle memory API not being available', async () => {
            delete performance.memory;
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            await memoryManager.init();
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Memory API not supported')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should bind to core events', async () => {
            await memoryManager.init();
            
            expect(core.on).toHaveBeenCalledWith('settings:bulk-update', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('preview:reset', expect.any(Function));
        });
    });
    
    describe('Event Listener Management', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should add event listener with tracking', () => {
            const callback = jest.fn();
            const listenerId = memoryManager.addEventListener(mockElement, 'click', callback);
            
            expect(listenerId).toMatch(/^listener-/);
            expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), {});
            expect(memoryManager.eventListeners.has(listenerId)).toBe(true);
        });
        
        test('should remove event listener', () => {
            const callback = jest.fn();
            const listenerId = memoryManager.addEventListener(mockElement, 'click', callback);
            
            const result = memoryManager.removeEventListener(listenerId);
            
            expect(result).toBe(true);
            expect(mockElement.removeEventListener).toHaveBeenCalled();
            expect(memoryManager.eventListeners.has(listenerId)).toBe(false);
        });
        
        test('should handle removing non-existent listener', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = memoryManager.removeEventListener('non-existent');
            
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Event listener non-existent not found')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should warn when too many event listeners', () => {
            // Add listeners beyond threshold
            for (let i = 0; i < 1001; i++) {
                memoryManager.addEventListener(mockElement, 'click', jest.fn());
            }
            
            expect(core.emit).toHaveBeenCalledWith('memory:listener-warning', expect.objectContaining({
                count: expect.any(Number),
                threshold: 1000
            }));
        });
        
        test('should handle event listener errors gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Listener error');
            });
            
            const listenerId = memoryManager.addEventListener(mockElement, 'click', errorCallback);
            
            // Get the wrapped listener and call it
            const listenerInfo = memoryManager.eventListeners.get(listenerId);
            const wrappedListener = listenerInfo.listener;
            
            expect(() => wrappedListener({})).not.toThrow();
            expect(core.emit).toHaveBeenCalledWith('memory:listener-error', expect.objectContaining({
                listenerId,
                error: expect.any(Error)
            }));
        });
    });
    
    describe('DOM Observer Management', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should add mutation observer', () => {
            const callback = jest.fn();
            const result = memoryManager.addDomObserver('mutation', callback);
            
            expect(result).toMatchObject({
                observerId: expect.stringMatching(/^observer-/),
                observer: mockObserver
            });
            expect(global.MutationObserver).toHaveBeenCalledWith(expect.any(Function));
        });
        
        test('should add intersection observer', () => {
            const callback = jest.fn();
            const options = { threshold: 0.5 };
            const result = memoryManager.addDomObserver('intersection', callback, options);
            
            expect(result).toMatchObject({
                observerId: expect.stringMatching(/^observer-/),
                observer: mockObserver
            });
            expect(global.IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), options);
        });
        
        test('should add resize observer', () => {
            const callback = jest.fn();
            const result = memoryManager.addDomObserver('resize', callback);
            
            expect(result).toMatchObject({
                observerId: expect.stringMatching(/^observer-/),
                observer: mockObserver
            });
            expect(global.ResizeObserver).toHaveBeenCalledWith(expect.any(Function));
        });
        
        test('should handle ResizeObserver not being available', () => {
            delete global.ResizeObserver;
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const result = memoryManager.addDomObserver('resize', jest.fn());
            
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('ResizeObserver not supported')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should handle unknown observer type', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const result = memoryManager.addDomObserver('unknown', jest.fn());
            
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Unknown observer type: unknown')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should remove DOM observer', () => {
            const callback = jest.fn();
            const { observerId } = memoryManager.addDomObserver('mutation', callback);
            
            const result = memoryManager.removeDomObserver(observerId);
            
            expect(result).toBe(true);
            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(memoryManager.domObservers.has(observerId)).toBe(false);
        });
        
        test('should warn when too many DOM observers', () => {
            // Add observers beyond threshold
            for (let i = 0; i < 101; i++) {
                memoryManager.addDomObserver('mutation', jest.fn());
            }
            
            expect(core.emit).toHaveBeenCalledWith('memory:observer-warning', expect.objectContaining({
                count: expect.any(Number),
                threshold: 100
            }));
        });
        
        test('should handle DOM observer errors gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Observer error');
            });
            
            const { observerId } = memoryManager.addDomObserver('mutation', errorCallback);
            
            // Get the wrapped callback and call it
            const observerInfo = memoryManager.domObservers.get(observerId);
            const wrappedCallback = observerInfo.callback;
            
            expect(() => wrappedCallback([])).not.toThrow();
            expect(core.emit).toHaveBeenCalledWith('memory:observer-error', expect.objectContaining({
                observerId,
                error: expect.any(Error)
            }));
        });
    });
    
    describe('Cache Management', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should cache data correctly', () => {
            const data = { test: 'value' };
            const cacheEntry = memoryManager.cacheData('test-key', data, 'test-category');
            
            expect(cacheEntry).toMatchObject({
                data,
                category: 'test-category',
                timestamp: expect.any(Number),
                ttl: 300000,
                size: expect.any(Number)
            });
        });
        
        test('should retrieve cached data', () => {
            const data = { test: 'value' };
            memoryManager.cacheData('test-key', data, 'test-category');
            
            const retrieved = memoryManager.getCachedData('test-key', 'test-category');
            
            expect(retrieved).toEqual(data);
        });
        
        test('should return null for non-existent cache key', () => {
            const result = memoryManager.getCachedData('non-existent', 'test');
            
            expect(result).toBeNull();
        });
        
        test('should return null for expired cache entry', () => {
            const data = { test: 'value' };
            memoryManager.cacheData('test-key', data, 'test-category', 100); // 100ms TTL
            
            // Mock time passing
            const originalNow = Date.now;
            Date.now = jest.fn(() => originalNow() + 200); // 200ms later
            
            const result = memoryManager.getCachedData('test-key', 'test-category');
            
            expect(result).toBeNull();
            expect(memoryManager.cacheStorage.has('test-category:test-key')).toBe(false);
            
            Date.now = originalNow;
        });
        
        test('should clear cache by category', () => {
            memoryManager.cacheData('key1', 'data1', 'category1');
            memoryManager.cacheData('key2', 'data2', 'category1');
            memoryManager.cacheData('key3', 'data3', 'category2');
            
            const cleared = memoryManager.clearCache('category1');
            
            expect(cleared).toBe(2);
            expect(memoryManager.getCachedData('key1', 'category1')).toBeNull();
            expect(memoryManager.getCachedData('key2', 'category1')).toBeNull();
            expect(memoryManager.getCachedData('key3', 'category2')).not.toBeNull();
        });
        
        test('should clear specific cache key', () => {
            memoryManager.cacheData('key1', 'data1', 'category1');
            memoryManager.cacheData('key2', 'data2', 'category1');
            
            const cleared = memoryManager.clearCache('category1', 'key1');
            
            expect(cleared).toBe(true);
            expect(memoryManager.getCachedData('key1', 'category1')).toBeNull();
            expect(memoryManager.getCachedData('key2', 'category1')).not.toBeNull();
        });
        
        test('should clear all cache', () => {
            memoryManager.cacheData('key1', 'data1', 'category1');
            memoryManager.cacheData('key2', 'data2', 'category2');
            
            const cleared = memoryManager.clearCache();
            
            expect(cleared).toBe(2);
            expect(memoryManager.cacheStorage.size).toBe(0);
        });
        
        test('should manage cache size automatically', () => {
            // Mock large data to exceed cache size threshold
            const largeData = 'x'.repeat(5 * 1024 * 1024); // 5MB string
            
            memoryManager.cacheData('large1', largeData, 'test');
            memoryManager.cacheData('large2', largeData, 'test');
            memoryManager.cacheData('large3', largeData, 'test'); // This should trigger cleanup
            
            // Should have cleaned up some entries
            expect(memoryManager.cacheStorage.size).toBeLessThan(3);
        });
    });
    
    describe('Timer Management', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should add timeout with tracking', () => {
            const callback = jest.fn();
            const timeoutId = memoryManager.setTimeout(callback, 1000);
            
            expect(timeoutId).toMatch(/^timeout-/);
            expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
            expect(memoryManager.timeouts.has(timeoutId)).toBe(true);
        });
        
        test('should clear tracked timeout', () => {
            const callback = jest.fn();
            const timeoutId = memoryManager.setTimeout(callback, 1000);
            
            const result = memoryManager.clearTimeout(timeoutId);
            
            expect(result).toBe(true);
            expect(global.clearTimeout).toHaveBeenCalled();
            expect(memoryManager.timeouts.has(timeoutId)).toBe(false);
        });
        
        test('should add interval with tracking', () => {
            const callback = jest.fn();
            const intervalId = memoryManager.setInterval(callback, 1000);
            
            expect(intervalId).toMatch(/^interval-/);
            expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
            expect(memoryManager.intervals.has(intervalId)).toBe(true);
        });
        
        test('should clear tracked interval', () => {
            const callback = jest.fn();
            const intervalId = memoryManager.setInterval(callback, 1000);
            
            const result = memoryManager.clearInterval(intervalId);
            
            expect(result).toBe(true);
            expect(global.clearInterval).toHaveBeenCalled();
            expect(memoryManager.intervals.has(intervalId)).toBe(false);
        });
        
        test('should handle timeout callback errors', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Timeout error');
            });
            
            const timeoutId = memoryManager.setTimeout(errorCallback, 100);
            
            // The timeout should be cleaned up even if callback throws
            setTimeout(() => {
                expect(memoryManager.timeouts.has(timeoutId)).toBe(false);
            }, 200);
        });
    });
    
    describe('Cleanup Tasks', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should add cleanup task', () => {
            const task = jest.fn();
            const taskId = memoryManager.addCleanupTask(task, 'Test cleanup');
            
            expect(taskId).toMatch(/^cleanup-/);
            expect(memoryManager.cleanupTasks).toContainEqual(expect.objectContaining({
                id: taskId,
                task,
                description: 'Test cleanup'
            }));
        });
        
        test('should remove cleanup task', () => {
            const task = jest.fn();
            const taskId = memoryManager.addCleanupTask(task, 'Test cleanup');
            
            const result = memoryManager.removeCleanupTask(taskId);
            
            expect(result).toBe(true);
            expect(memoryManager.cleanupTasks.find(t => t.id === taskId)).toBeUndefined();
        });
        
        test('should execute cleanup tasks during cleanup', () => {
            const task1 = jest.fn();
            const task2 = jest.fn();
            
            memoryManager.addCleanupTask(task1, 'Task 1');
            memoryManager.addCleanupTask(task2, 'Task 2');
            
            memoryManager.performCleanup();
            
            expect(task1).toHaveBeenCalled();
            expect(task2).toHaveBeenCalled();
        });
        
        test('should handle cleanup task errors', () => {
            const errorTask = jest.fn(() => {
                throw new Error('Cleanup error');
            });
            const goodTask = jest.fn();
            
            memoryManager.addCleanupTask(errorTask, 'Error task');
            memoryManager.addCleanupTask(goodTask, 'Good task');
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            memoryManager.performCleanup();
            
            expect(errorTask).toHaveBeenCalled();
            expect(goodTask).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Cleanup task failed'),
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Memory Usage Monitoring', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should check memory usage', () => {
            const memoryInfo = memoryManager.checkMemoryUsage();
            
            expect(memoryInfo).toMatchObject({
                used: 10 * 1024 * 1024,
                total: 20 * 1024 * 1024,
                limit: 100 * 1024 * 1024,
                timestamp: expect.any(Number)
            });
            
            expect(core.emit).toHaveBeenCalledWith('memory:status', memoryInfo);
        });
        
        test('should trigger warning for high memory usage', () => {
            // Mock high memory usage
            performance.memory.usedJSHeapSize = 25 * 1024 * 1024; // 25MB (above 20MB threshold)
            
            memoryManager.checkMemoryUsage();
            
            expect(core.emit).toHaveBeenCalledWith('memory:warning', expect.objectContaining({
                memoryInfo: expect.any(Object),
                threshold: 20 * 1024 * 1024
            }));
        });
        
        test('should trigger cleanup for high memory usage', () => {
            const performCleanupSpy = jest.spyOn(memoryManager, 'performCleanup');
            
            // Mock high memory usage
            performance.memory.usedJSHeapSize = 25 * 1024 * 1024; // 25MB
            
            memoryManager.checkMemoryUsage();
            
            expect(performCleanupSpy).toHaveBeenCalled();
        });
    });
    
    describe('Memory Leak Detection', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should detect excessive event listeners', () => {
            // Add many event listeners
            for (let i = 0; i < 850; i++) {
                memoryManager.addEventListener(mockElement, 'click', jest.fn());
            }
            
            const leaks = memoryManager.detectMemoryLeaks();
            
            expect(leaks).toContainEqual(expect.objectContaining({
                type: 'event-listeners',
                count: 850,
                severity: 'warning'
            }));
        });
        
        test('should detect excessive DOM observers', () => {
            // Add many DOM observers
            for (let i = 0; i < 85; i++) {
                memoryManager.addDomObserver('mutation', jest.fn());
            }
            
            const leaks = memoryManager.detectMemoryLeaks();
            
            expect(leaks).toContainEqual(expect.objectContaining({
                type: 'dom-observers',
                count: 85,
                severity: 'warning'
            }));
        });
        
        test('should detect old timeouts', () => {
            // Add old timeouts
            const oldTimestamp = Date.now() - 400000; // 6+ minutes ago
            for (let i = 0; i < 15; i++) {
                const timeoutId = memoryManager.setTimeout(jest.fn(), 1000);
                const timeoutInfo = memoryManager.timeouts.get(timeoutId);
                timeoutInfo.timestamp = oldTimestamp;
            }
            
            const leaks = memoryManager.detectMemoryLeaks();
            
            expect(leaks).toContainEqual(expect.objectContaining({
                type: 'old-timeouts',
                count: 15,
                severity: 'warning'
            }));
        });
        
        test('should detect large cache size', () => {
            // Mock large cache
            const largeData = 'x'.repeat(1024 * 1024); // 1MB
            for (let i = 0; i < 9; i++) {
                memoryManager.cacheData(`key${i}`, largeData, 'test');
            }
            
            const leaks = memoryManager.detectMemoryLeaks();
            
            expect(leaks).toContainEqual(expect.objectContaining({
                type: 'cache-size',
                severity: 'warning'
            }));
        });
        
        test('should emit leak detection results', () => {
            // Add some items to trigger leak detection
            for (let i = 0; i < 850; i++) {
                memoryManager.addEventListener(mockElement, 'click', jest.fn());
            }
            
            memoryManager.detectMemoryLeaks();
            
            expect(core.emit).toHaveBeenCalledWith('memory:leaks-detected', expect.any(Array));
        });
    });
    
    describe('Memory Statistics', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should get memory statistics', () => {
            // Add some items
            memoryManager.addEventListener(mockElement, 'click', jest.fn());
            memoryManager.addDomObserver('mutation', jest.fn());
            memoryManager.setTimeout(jest.fn(), 1000);
            memoryManager.setInterval(jest.fn(), 1000);
            memoryManager.cacheData('test', 'data', 'test');
            memoryManager.addCleanupTask(jest.fn(), 'test');
            
            const stats = memoryManager.getMemoryStats();
            
            expect(stats).toMatchObject({
                eventListeners: 1,
                domObservers: 1,
                intervals: expect.any(Number), // Includes periodic cleanup interval
                timeouts: 1,
                cacheEntries: 1,
                cleanupTasks: 1,
                cacheSize: expect.any(Number),
                jsHeapSize: {
                    used: 10 * 1024 * 1024,
                    total: 20 * 1024 * 1024,
                    limit: 100 * 1024 * 1024
                }
            });
        });
        
        test('should handle memory API not being available in stats', () => {
            delete performance.memory;
            
            const stats = memoryManager.getMemoryStats();
            
            expect(stats.jsHeapSize).toBeUndefined();
        });
    });
    
    describe('Threshold Management', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should set new thresholds', () => {
            const newThresholds = {
                maxCacheSize: 5 * 1024 * 1024,
                maxEventListeners: 500
            };
            
            memoryManager.setThresholds(newThresholds);
            
            expect(memoryManager.thresholds.maxCacheSize).toBe(5 * 1024 * 1024);
            expect(memoryManager.thresholds.maxEventListeners).toBe(500);
            expect(core.emit).toHaveBeenCalledWith('memory:thresholds-updated', memoryManager.thresholds);
        });
        
        test('should get current thresholds', () => {
            const thresholds = memoryManager.getThresholds();
            
            expect(thresholds).toMatchObject({
                maxCacheSize: expect.any(Number),
                maxEventListeners: expect.any(Number),
                maxDomObservers: expect.any(Number),
                cleanupInterval: expect.any(Number),
                memoryWarningThreshold: expect.any(Number)
            });
        });
    });
    
    describe('Complete Cleanup', () => {
        beforeEach(async () => {
            await memoryManager.init();
        });
        
        test('should perform complete cleanup', () => {
            // Add various items
            const listenerId = memoryManager.addEventListener(mockElement, 'click', jest.fn());
            const { observerId } = memoryManager.addDomObserver('mutation', jest.fn());
            const timeoutId = memoryManager.setTimeout(jest.fn(), 1000);
            const intervalId = memoryManager.setInterval(jest.fn(), 1000);
            memoryManager.cacheData('test', 'data', 'test');
            memoryManager.addCleanupTask(jest.fn(), 'test');
            
            memoryManager.cleanup();
            
            expect(memoryManager.isMonitoring).toBe(false);
            expect(memoryManager.eventListeners.size).toBe(0);
            expect(memoryManager.domObservers.size).toBe(0);
            expect(memoryManager.timeouts.size).toBe(0);
            expect(memoryManager.intervals.size).toBe(0);
            expect(memoryManager.cacheStorage.size).toBe(0);
            expect(memoryManager.cleanupTasks.length).toBe(0);
        });
        
        test('should handle cleanup errors gracefully', () => {
            // Mock removeEventListener to throw error
            mockElement.removeEventListener.mockImplementation(() => {
                throw new Error('Cleanup error');
            });
            
            memoryManager.addEventListener(mockElement, 'click', jest.fn());
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            expect(() => memoryManager.cleanup()).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to remove event listener during cleanup'),
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should call garbage collection if available', () => {
            memoryManager.performCleanup();
            
            expect(window.gc).toHaveBeenCalled();
        });
    });
});