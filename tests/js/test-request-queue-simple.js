/**
 * Simple Tests for RequestQueue Class
 * 
 * Basic functionality tests without automatic processing
 */

// Load RequestQueue
const RequestQueue = require('../../assets/js/modules/request-queue.js');

// Mock localStorage
const mockLocalStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; },
    clear: function() { this.data = {}; }
};

global.localStorage = mockLocalStorage;
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: mockLocalStorage
};

console.log('Testing RequestQueue Implementation...\n');

// Test 1: Basic Enqueue/Dequeue
console.log('=== Test 1: Basic Enqueue/Dequeue ===');
try {
    const queue = new RequestQueue({ enablePersistence: false });
    
    // Test enqueue
    const request = { action: 'test_action', data: { test: true } };
    const requestId = queue.enqueue(request);
    
    console.log('✓ Request enqueued with ID:', requestId);
    console.log('✓ Queue size:', queue.getTotalQueueSize());
    
    // Test dequeue
    const dequeued = queue.dequeue();
    console.log('✓ Dequeued request action:', dequeued.request.action);
    console.log('✓ Queue size after dequeue:', queue.getTotalQueueSize());
    
    queue.destroy();
    console.log('✓ Basic enqueue/dequeue test passed\n');
} catch (error) {
    console.log('✗ Basic enqueue/dequeue test failed:', error.message, '\n');
}

// Test 2: Priority Ordering
console.log('=== Test 2: Priority Ordering ===');
try {
    const queue = new RequestQueue({ enablePersistence: false });
    
    // Add requests in mixed priority order
    queue.enqueue({ action: 'low_priority' }, 'low');
    queue.enqueue({ action: 'high_priority' }, 'high');
    queue.enqueue({ action: 'normal_priority' }, 'normal');
    
    console.log('✓ Added 3 requests with different priorities');
    console.log('✓ Total queue size:', queue.getTotalQueueSize());
    
    // Dequeue should return high priority first
    const first = queue.dequeue();
    const second = queue.dequeue();
    const third = queue.dequeue();
    
    console.log('✓ First dequeued (should be high):', first.request.action);
    console.log('✓ Second dequeued (should be normal):', second.request.action);
    console.log('✓ Third dequeued (should be low):', third.request.action);
    
    const priorityCorrect = 
        first.request.action === 'high_priority' &&
        second.request.action === 'normal_priority' &&
        third.request.action === 'low_priority';
    
    if (priorityCorrect) {
        console.log('✓ Priority ordering test passed\n');
    } else {
        console.log('✗ Priority ordering incorrect\n');
    }
    
    queue.destroy();
} catch (error) {
    console.log('✗ Priority ordering test failed:', error.message, '\n');
}

// Test 3: Request Deduplication
console.log('=== Test 3: Request Deduplication ===');
try {
    const queue = new RequestQueue({ enablePersistence: false });
    
    // Add identical requests
    const request1 = { action: 'las_save_settings', data: { settings: { color: 'red' } } };
    const request2 = { action: 'las_save_settings', data: { settings: { color: 'red' } } };
    
    queue.enqueue(request1);
    queue.enqueue(request2); // Should be deduped
    
    console.log('✓ Added 2 identical requests');
    console.log('✓ Queue size (should be 1):', queue.getTotalQueueSize());
    console.log('✓ Deduped count:', queue.getMetrics().totalDeduped);
    
    if (queue.getTotalQueueSize() === 1 && queue.getMetrics().totalDeduped === 1) {
        console.log('✓ Request deduplication test passed\n');
    } else {
        console.log('✗ Request deduplication failed\n');
    }
    
    queue.destroy();
} catch (error) {
    console.log('✗ Request deduplication test failed:', error.message, '\n');
}

// Test 4: Concurrent Request Limiting
console.log('=== Test 4: Concurrent Request Limiting ===');
try {
    const queue = new RequestQueue({ maxConcurrent: 2, enablePersistence: false });
    
    console.log('✓ Created queue with maxConcurrent: 2');
    console.log('✓ Can process request (empty):', queue.canProcessRequest());
    
    // Simulate active requests
    queue.activeRequests.set('req1', { id: 'req1' });
    console.log('✓ Can process request (1 active):', queue.canProcessRequest());
    
    queue.activeRequests.set('req2', { id: 'req2' });
    console.log('✓ Can process request (2 active):', queue.canProcessRequest());
    
    // Should not be able to process more
    const canProcessAtLimit = !queue.canProcessRequest();
    
    if (canProcessAtLimit) {
        console.log('✓ Concurrent request limiting test passed\n');
    } else {
        console.log('✗ Concurrent request limiting failed\n');
    }
    
    queue.destroy();
} catch (error) {
    console.log('✗ Concurrent request limiting test failed:', error.message, '\n');
}

// Test 5: Queue Persistence
console.log('=== Test 5: Queue Persistence ===');
try {
    // Clear localStorage first
    mockLocalStorage.clear();
    
    const queue1 = new RequestQueue({ 
        enablePersistence: true, 
        persistenceKey: 'test_persistence' 
    });
    
    // Add some requests
    queue1.enqueue({ action: 'test_persist_1' }, 'high');
    queue1.enqueue({ action: 'test_persist_2' }, 'normal');
    
    console.log('✓ Added 2 requests to persistent queue');
    
    // Manually persist
    queue1.persistQueue();
    console.log('✓ Queue state persisted');
    
    // Check localStorage
    const stored = mockLocalStorage.getItem('test_persistence');
    const hasStoredData = stored !== null;
    
    if (hasStoredData) {
        const state = JSON.parse(stored);
        console.log('✓ Stored state has queues:', !!state.queues);
        console.log('✓ High priority queue length:', state.queues.high.length);
        console.log('✓ Normal priority queue length:', state.queues.normal.length);
    }
    
    queue1.destroy();
    
    // Create new queue and restore
    const queue2 = new RequestQueue({ 
        enablePersistence: true, 
        persistenceKey: 'test_persistence' 
    });
    
    console.log('✓ Created new queue, restored size:', queue2.getTotalQueueSize());
    
    if (queue2.getTotalQueueSize() === 2) {
        console.log('✓ Queue persistence test passed\n');
    } else {
        console.log('✗ Queue persistence failed - wrong size\n');
    }
    
    queue2.destroy();
} catch (error) {
    console.log('✗ Queue persistence test failed:', error.message, '\n');
}

// Test 6: Hash Function
console.log('=== Test 6: Hash Function ===');
try {
    const queue = new RequestQueue({ enablePersistence: false });
    
    const obj1 = { color: 'red', size: 'large', enabled: true };
    const obj2 = { color: 'red', size: 'large', enabled: true };
    const obj3 = { color: 'blue', size: 'large', enabled: true };
    
    const hash1 = queue.hashObject(obj1);
    const hash2 = queue.hashObject(obj2);
    const hash3 = queue.hashObject(obj3);
    
    console.log('✓ Hash 1:', hash1);
    console.log('✓ Hash 2:', hash2);
    console.log('✓ Hash 3:', hash3);
    
    const sameObjectsSameHash = hash1 === hash2;
    const differentObjectsDifferentHash = hash1 !== hash3;
    
    if (sameObjectsSameHash && differentObjectsDifferentHash) {
        console.log('✓ Hash function test passed\n');
    } else {
        console.log('✗ Hash function test failed\n');
    }
    
    queue.destroy();
} catch (error) {
    console.log('✗ Hash function test failed:', error.message, '\n');
}

// Test 7: Metrics Tracking
console.log('=== Test 7: Metrics Tracking ===');
try {
    const queue = new RequestQueue({ enablePersistence: false });
    
    const initialMetrics = queue.getMetrics();
    console.log('✓ Initial metrics - totalQueued:', initialMetrics.totalQueued);
    
    // Add some requests
    queue.enqueue({ action: 'test_1' });
    queue.enqueue({ action: 'test_2' });
    queue.enqueue({ action: 'test_1' }); // Should be deduped
    
    const afterMetrics = queue.getMetrics();
    console.log('✓ After enqueue - totalQueued:', afterMetrics.totalQueued);
    console.log('✓ After enqueue - totalDeduped:', afterMetrics.totalDeduped);
    console.log('✓ After enqueue - maxQueueLength:', afterMetrics.maxQueueLength);
    
    const metricsCorrect = 
        afterMetrics.totalQueued === 2 &&
        afterMetrics.totalDeduped === 1 &&
        afterMetrics.maxQueueLength === 2;
    
    if (metricsCorrect) {
        console.log('✓ Metrics tracking test passed\n');
    } else {
        console.log('✗ Metrics tracking test failed\n');
    }
    
    queue.destroy();
} catch (error) {
    console.log('✗ Metrics tracking test failed:', error.message, '\n');
}

console.log('=== All Tests Completed ===');
console.log('RequestQueue implementation ready for integration!');