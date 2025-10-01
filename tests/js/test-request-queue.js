/**
 * Unit Tests for RequestQueue Class
 * 
 * Tests FIFO queue with priority support, request deduplication,
 * concurrent request limiting, and queue persistence.
 */

// Mock localStorage for testing
const mockLocalStorage = {
    data: {},
    getItem: function(key) {
        return this.data[key] || null;
    },
    setItem: function(key, value) {
        this.data[key] = value;
    },
    removeItem: function(key) {
        delete this.data[key];
    },
    clear: function() {
        this.data = {};
    }
};

// Set up test environment
if (typeof window === 'undefined') {
    global.window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        localStorage: mockLocalStorage
    };
    global.localStorage = mockLocalStorage;
    
    // Load the RequestQueue class
    const RequestQueue = require('../../assets/js/modules/request-queue.js');
    global.RequestQueue = RequestQueue;
}

describe('RequestQueue', () => {
    let queue;
    
    beforeEach(() => {
        // Clear localStorage mock
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
        mockLocalStorage.clear();
        
        // Create fresh queue instance
        queue = new RequestQueue({
            enablePersistence: false // Disable for most tests
        });
    });
    
    afterEach(() => {
        if (queue) {
            queue.destroy();
        }
    });

    describe('Basic Queue Operations', () => {
        test('should enqueue requests with default normal priority', () => {
            const request = { action: 'test_action', data: { test: true } };
            const requestId = queue.enqueue(request);
            
            expect(requestId).toBeDefined();
            expect(queue.getTotalQueueSize()).toBe(1);
            expect(queue.getMetrics().totalQueued).toBe(1);
        });

        test('should enqueue requests with different priorities', () => {
            const request1 = { action: 'test_action_1' };
            const request2 = { action: 'test_action_2' };
            const request3 = { action: 'test_action_3' };
            
            queue.enqueue(request1, 'low');
            queue.enqueue(request2, 'high');
            queue.enqueue(request3, 'normal');
            
            expect(queue.getTotalQueueSize()).toBe(3);
            expect(queue.getMetrics().queueSizes.high).toBe(1);
            expect(queue.getMetrics().queueSizes.normal).toBe(1);
            expect(queue.getMetrics().queueSizes.low).toBe(1);
        });

        test('should dequeue requests in priority order (FIFO within priority)', () => {
            // Add requests in mixed order
            queue.enqueue({ action: 'low_1' }, 'low');
            queue.enqueue({ action: 'high_1' }, 'high');
            queue.enqueue({ action: 'normal_1' }, 'normal');
            queue.enqueue({ action: 'high_2' }, 'high');
            queue.enqueue({ action: 'low_2' }, 'low');
            
            // Should dequeue high priority first (FIFO within priority)
            const item1 = queue.dequeue();
            expect(item1.request.action).toBe('high_1');
            
            const item2 = queue.dequeue();
            expect(item2.request.action).toBe('high_2');
            
            // Then normal priority
            const item3 = queue.dequeue();
            expect(item3.request.action).toBe('normal_1');
            
            // Finally low priority (FIFO within priority)
            const item4 = queue.dequeue();
            expect(item4.request.action).toBe('low_1');
            
            const item5 = queue.dequeue();
            expect(item5.request.action).toBe('low_2');
            
            // Queue should be empty
            expect(queue.dequeue()).toBeNull();
        });

        test('should return null when dequeuing from empty queue', () => {
            expect(queue.dequeue()).toBeNull();
        });

        test('should clear all queues', () => {
            queue.enqueue({ action: 'test_1' }, 'high');
            queue.enqueue({ action: 'test_2' }, 'normal');
            queue.enqueue({ action: 'test_3' }, 'low');
            
            expect(queue.getTotalQueueSize()).toBe(3);
            
            queue.clearQueue();
            
            expect(queue.getTotalQueueSize()).toBe(0);
            expect(queue.getMetrics().queueSizes.high).toBe(0);
            expect(queue.getMetrics().queueSizes.normal).toBe(0);
            expect(queue.getMetrics().queueSizes.low).toBe(0);
        });
    });

    describe('Request Deduplication', () => {
        test('should detect duplicate requests by action', () => {
            const request1 = { action: 'las_save_settings', data: { settings: { color: 'red' } } };
            const request2 = { action: 'las_save_settings', data: { settings: { color: 'red' } } };
            
            const id1 = queue.enqueue(request1);
            const id2 = queue.enqueue(request2);
            
            expect(queue.getTotalQueueSize()).toBe(1); // Second should be deduped
            expect(queue.getMetrics().totalDeduped).toBe(1);
        });

        test('should not dedupe different settings', () => {
            const request1 = { action: 'las_save_settings', data: { settings: { color: 'red' } } };
            const request2 = { action: 'las_save_settings', data: { settings: { color: 'blue' } } };
            
            queue.enqueue(request1);
            queue.enqueue(request2);
            
            expect(queue.getTotalQueueSize()).toBe(2); // Different settings, should not dedupe
            expect(queue.getMetrics().totalDeduped).toBe(0);
        });

        test('should dedupe based on setting_key for individual settings', () => {
            const request1 = { action: 'las_update_setting', data: { setting_key: 'primary_color', value: 'red' } };
            const request2 = { action: 'las_update_setting', data: { setting_key: 'primary_color', value: 'blue' } };
            
            queue.enqueue(request1);
            queue.enqueue(request2);
            
            expect(queue.getTotalQueueSize()).toBe(1); // Same setting key, should dedupe
            expect(queue.getMetrics().totalDeduped).toBe(1);
        });

        test('should not dedupe different actions', () => {
            const request1 = { action: 'las_save_settings', data: { settings: { color: 'red' } } };
            const request2 = { action: 'las_load_settings', data: { settings: { color: 'red' } } };
            
            queue.enqueue(request1);
            queue.enqueue(request2);
            
            expect(queue.getTotalQueueSize()).toBe(2); // Different actions, should not dedupe
            expect(queue.getMetrics().totalDeduped).toBe(0);
        });
    });

    describe('Concurrent Request Limiting', () => {
        test('should respect maxConcurrent limit', () => {
            const limitedQueue = new RequestQueue({ maxConcurrent: 2 });
            
            expect(limitedQueue.canProcessRequest()).toBe(true);
            
            // Simulate 2 active requests
            limitedQueue.activeRequests.set('req1', { id: 'req1' });
            limitedQueue.activeRequests.set('req2', { id: 'req2' });
            
            expect(limitedQueue.canProcessRequest()).toBe(false);
            
            // Remove one active request
            limitedQueue.activeRequests.delete('req1');
            
            expect(limitedQueue.canProcessRequest()).toBe(true);
            
            limitedQueue.destroy();
        });

        test('should track active requests correctly', () => {
            expect(queue.getActiveRequests()).toHaveLength(0);
            
            // Simulate active requests
            queue.activeRequests.set('req1', { id: 'req1', request: { action: 'test' } });
            queue.activeRequests.set('req2', { id: 'req2', request: { action: 'test2' } });
            
            const activeRequests = queue.getActiveRequests();
            expect(activeRequests).toHaveLength(2);
            expect(activeRequests[0].id).toBe('req1');
            expect(activeRequests[1].id).toBe('req2');
        });
    });

    describe('Queue Persistence', () => {
        test('should persist queue state to localStorage', () => {
            const persistentQueue = new RequestQueue({ 
                enablePersistence: true,
                persistenceKey: 'test_queue'
            });
            
            persistentQueue.enqueue({ action: 'test_action' }, 'high');
            persistentQueue.enqueue({ action: 'test_action_2' }, 'normal');
            
            persistentQueue.persistQueue();
            
            const stored = localStorage.getItem('test_queue');
            expect(stored).toBeDefined();
            
            const state = JSON.parse(stored);
            expect(state.queues.high).toHaveLength(1);
            expect(state.queues.normal).toHaveLength(1);
            expect(state.timestamp).toBeDefined();
            
            persistentQueue.destroy();
        });

        test('should restore queue state from localStorage', () => {
            // Set up stored state
            const state = {
                queues: {
                    high: [{ id: 'req1', request: { action: 'test_high' }, priority: 'high', timestamp: Date.now() }],
                    normal: [{ id: 'req2', request: { action: 'test_normal' }, priority: 'normal', timestamp: Date.now() }],
                    low: []
                },
                timestamp: Date.now(),
                version: '1.0.0'
            };
            
            localStorage.setItem('test_restore_queue', JSON.stringify(state));
            
            const restoredQueue = new RequestQueue({
                enablePersistence: true,
                persistenceKey: 'test_restore_queue'
            });
            
            expect(restoredQueue.getTotalQueueSize()).toBe(2);
            expect(restoredQueue.getMetrics().queueSizes.high).toBe(1);
            expect(restoredQueue.getMetrics().queueSizes.normal).toBe(1);
            
            restoredQueue.destroy();
        });

        test('should ignore old stored state', () => {
            // Set up old state (2 hours ago)
            const oldState = {
                queues: {
                    high: [{ id: 'req1', request: { action: 'test_old' }, priority: 'high', timestamp: Date.now() }],
                    normal: [],
                    low: []
                },
                timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
                version: '1.0.0'
            };
            
            localStorage.setItem('test_old_queue', JSON.stringify(oldState));
            
            const restoredQueue = new RequestQueue({
                enablePersistence: true,
                persistenceKey: 'test_old_queue'
            });
            
            expect(restoredQueue.getTotalQueueSize()).toBe(0);
            expect(localStorage.getItem('test_old_queue')).toBeNull(); // Should be removed
            
            restoredQueue.destroy();
        });
    });

    describe('Queue Metrics and Status', () => {
        test('should track queue metrics correctly', () => {
            const metrics = queue.getMetrics();
            
            expect(metrics.totalQueued).toBe(0);
            expect(metrics.totalProcessed).toBe(0);
            expect(metrics.totalDeduped).toBe(0);
            expect(metrics.maxQueueLength).toBe(0);
            expect(metrics.currentQueueSize).toBe(0);
            expect(metrics.activeRequests).toBe(0);
        });

        test('should update maxQueueLength metric', () => {
            queue.enqueue({ action: 'test_1' });
            queue.enqueue({ action: 'test_2' });
            queue.enqueue({ action: 'test_3' });
            
            expect(queue.getMetrics().maxQueueLength).toBe(3);
            
            queue.dequeue();
            queue.enqueue({ action: 'test_4' });
            
            // Max should still be 3
            expect(queue.getMetrics().maxQueueLength).toBe(3);
        });

        test('should provide comprehensive status information', () => {
            queue.enqueue({ action: 'test_1' }, 'high');
            queue.enqueue({ action: 'test_2' }, 'normal');
            
            const status = queue.getStatus();
            
            expect(status.totalQueued).toBe(2);
            expect(status.activeRequests).toBe(0);
            expect(status.canProcessMore).toBe(true);
            expect(status.metrics).toBeDefined();
            expect(status.isProcessing).toBeDefined();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should throw error for invalid request object', () => {
            expect(() => queue.enqueue(null)).toThrow('Invalid request object');
            expect(() => queue.enqueue('invalid')).toThrow('Invalid request object');
        });

        test('should handle invalid priority gracefully', () => {
            const request = { action: 'test_action' };
            queue.enqueue(request, 'invalid_priority');
            
            // Should default to normal priority
            expect(queue.getMetrics().queueSizes.normal).toBe(1);
        });

        test('should enforce queue size limits', () => {
            const limitedQueue = new RequestQueue({ maxQueueSize: 2 });
            
            limitedQueue.enqueue({ action: 'test_1' });
            limitedQueue.enqueue({ action: 'test_2' });
            
            expect(() => limitedQueue.enqueue({ action: 'test_3' })).toThrow('Queue size limit exceeded');
            
            limitedQueue.destroy();
        });

        test('should handle localStorage errors gracefully', () => {
            // Mock localStorage to throw error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = () => { throw new Error('Storage full'); };
            
            const persistentQueue = new RequestQueue({ enablePersistence: true });
            
            // Should not throw error
            expect(() => persistentQueue.persistQueue()).not.toThrow();
            
            // Restore original method
            localStorage.setItem = originalSetItem;
            
            persistentQueue.destroy();
        });
    });

    describe('Request ID Generation', () => {
        test('should generate unique request IDs', () => {
            const id1 = queue.generateRequestId();
            const id2 = queue.generateRequestId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
        });

        test('should use provided request ID if available', () => {
            const customId = 'custom_request_id';
            const request = { id: customId, action: 'test_action' };
            
            const returnedId = queue.enqueue(request);
            expect(returnedId).toBe(customId);
        });
    });

    describe('Hash Function', () => {
        test('should generate consistent hashes for same objects', () => {
            const obj1 = { color: 'red', size: 'large', enabled: true };
            const obj2 = { color: 'red', size: 'large', enabled: true };
            
            const hash1 = queue.hashObject(obj1);
            const hash2 = queue.hashObject(obj2);
            
            expect(hash1).toBe(hash2);
        });

        test('should generate different hashes for different objects', () => {
            const obj1 = { color: 'red', size: 'large' };
            const obj2 = { color: 'blue', size: 'large' };
            
            const hash1 = queue.hashObject(obj1);
            const hash2 = queue.hashObject(obj2);
            
            expect(hash1).not.toBe(hash2);
        });

        test('should handle property order consistently', () => {
            const obj1 = { a: 1, b: 2, c: 3 };
            const obj2 = { c: 3, a: 1, b: 2 };
            
            const hash1 = queue.hashObject(obj1);
            const hash2 = queue.hashObject(obj2);
            
            expect(hash1).toBe(hash2);
        });
    });
});

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    console.log('RequestQueue tests loaded');
}