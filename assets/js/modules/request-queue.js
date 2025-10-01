/**
 * Request Queue Management System
 * 
 * Provides FIFO queue with priority support, request deduplication,
 * concurrent request limiting, and queue persistence.
 * 
 * @class RequestQueue
 * @version 1.0.0
 */

class RequestQueue {
    constructor(options = {}) {
        this.options = {
            maxConcurrent: 5,
            maxQueueSize: 100,
            persistenceKey: 'las_request_queue',
            enablePersistence: true,
            deduplicationWindow: 5000, // 5 seconds
            ...options
        };

        // Queue storage - separate queues by priority
        this.queues = {
            high: [],
            normal: [],
            low: []
        };

        // Active requests tracking
        this.activeRequests = new Map();
        this.requestHistory = new Map();
        
        // Performance metrics
        this.metrics = {
            totalQueued: 0,
            totalProcessed: 0,
            totalDeduped: 0,
            maxQueueLength: 0,
            averageWaitTime: 0
        };

        // Initialize queue from persistence if enabled
        if (this.options.enablePersistence) {
            this.restoreQueue();
        }

        // Bind methods to maintain context
        this.processQueue = this.processQueue.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);

        // Set up persistence on page unload
        if (this.options.enablePersistence) {
            window.addEventListener('beforeunload', this.handleBeforeUnload);
        }

        // Start queue processing
        this.isProcessing = false;
        this.processingInterval = null;
    }

    /**
     * Add request to queue with priority support
     * @param {Object} request - Request configuration
     * @param {string} priority - Priority level (high, normal, low)
     * @returns {string} Request ID
     */
    enqueue(request, priority = 'normal') {
        if (!request || typeof request !== 'object') {
            throw new Error('Invalid request object');
        }

        if (!['high', 'normal', 'low'].includes(priority)) {
            priority = 'normal';
        }

        // Generate unique request ID if not provided
        const requestId = request.id || this.generateRequestId();
        
        // Create queue item with metadata
        const queueItem = {
            id: requestId,
            request: { ...request, id: requestId },
            priority,
            timestamp: Date.now(),
            attempts: 0,
            maxAttempts: request.maxAttempts || 3
        };

        // Check for duplicates
        if (this.isDuplicate(queueItem)) {
            this.metrics.totalDeduped++;
            console.log(`[RequestQueue] Duplicate request detected and ignored: ${requestId}`);
            return requestId;
        }

        // Check queue size limits
        const totalQueueSize = this.getTotalQueueSize();
        if (totalQueueSize >= this.options.maxQueueSize) {
            throw new Error(`Queue size limit exceeded (${this.options.maxQueueSize})`);
        }

        // Add to appropriate priority queue
        this.queues[priority].push(queueItem);
        this.metrics.totalQueued++;

        // Update max queue length metric
        const currentSize = this.getTotalQueueSize();
        if (currentSize > this.metrics.maxQueueLength) {
            this.metrics.maxQueueLength = currentSize;
        }

        console.log(`[RequestQueue] Enqueued request ${requestId} with priority ${priority}`);

        // Start processing if not already running and we have an execution callback
        if (!this.isProcessing && this.onRequestExecute) {
            this.startProcessing();
        }

        // Persist queue state
        if (this.options.enablePersistence) {
            this.persistQueue();
        }

        return requestId;
    }

    /**
     * Remove and return next request from queue (FIFO with priority)
     * @returns {Object|null} Next request or null if queue is empty
     */
    dequeue() {
        // Process in priority order: high -> normal -> low
        for (const priority of ['high', 'normal', 'low']) {
            if (this.queues[priority].length > 0) {
                const item = this.queues[priority].shift();
                console.log(`[RequestQueue] Dequeued request ${item.id} from ${priority} priority`);
                return item;
            }
        }
        return null;
    }

    /**
     * Check if request is duplicate within deduplication window
     * @param {Object} queueItem - Queue item to check
     * @returns {boolean} True if duplicate
     */
    isDuplicate(queueItem) {
        const { request } = queueItem;
        const now = Date.now();
        
        // Create deduplication key based on action and critical data
        const dedupKey = this.createDeduplicationKey(request);
        
        // Check active requests
        for (const [activeId, activeRequest] of this.activeRequests) {
            const activeKey = this.createDeduplicationKey(activeRequest.request);
            if (activeKey === dedupKey) {
                return true;
            }
        }

        // Check recent history within deduplication window
        for (const [historyId, historyItem] of this.requestHistory) {
            if (now - historyItem.timestamp > this.options.deduplicationWindow) {
                // Remove old entries
                this.requestHistory.delete(historyId);
                continue;
            }
            
            const historyKey = this.createDeduplicationKey(historyItem.request);
            if (historyKey === dedupKey) {
                return true;
            }
        }

        // Check queued requests
        for (const priority of ['high', 'normal', 'low']) {
            for (const item of this.queues[priority]) {
                const queuedKey = this.createDeduplicationKey(item.request);
                if (queuedKey === dedupKey) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Create deduplication key from request
     * @param {Object} request - Request object
     * @returns {string} Deduplication key
     */
    createDeduplicationKey(request) {
        // Create key based on action and critical data fields
        const keyParts = [request.action];
        
        // Add data hash for settings operations
        if (request.data) {
            if (request.action === 'las_save_settings' && request.data.settings) {
                // For settings, use a hash of the settings object
                keyParts.push(this.hashObject(request.data.settings));
            } else if (request.data.setting_key) {
                // For individual setting operations
                keyParts.push(request.data.setting_key);
            }
        }
        
        return keyParts.join('|');
    }

    /**
     * Simple hash function for objects
     * @param {Object} obj - Object to hash
     * @returns {string} Hash string
     */
    hashObject(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Get all pending requests across all priority queues
     * @returns {Array} Array of pending requests
     */
    getPendingRequests() {
        const pending = [];
        for (const priority of ['high', 'normal', 'low']) {
            pending.push(...this.queues[priority]);
        }
        return pending;
    }

    /**
     * Get active (currently processing) requests
     * @returns {Array} Array of active requests
     */
    getActiveRequests() {
        return Array.from(this.activeRequests.values());
    }

    /**
     * Clear all queues
     */
    clearQueue() {
        this.queues.high = [];
        this.queues.normal = [];
        this.queues.low = [];
        
        console.log('[RequestQueue] All queues cleared');
        
        if (this.options.enablePersistence) {
            this.persistQueue();
        }
    }

    /**
     * Get total number of items in all queues
     * @returns {number} Total queue size
     */
    getTotalQueueSize() {
        return this.queues.high.length + this.queues.normal.length + this.queues.low.length;
    }

    /**
     * Check if concurrent request limit allows new request
     * @returns {boolean} True if can process new request
     */
    canProcessRequest() {
        return this.activeRequests.size < this.options.maxConcurrent;
    }

    /**
     * Start queue processing
     */
    startProcessing() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        console.log('[RequestQueue] Started queue processing');
        
        // Process immediately and then set up interval
        this.processQueue();
        this.processingInterval = setInterval(this.processQueue, 100); // Check every 100ms
    }

    /**
     * Stop queue processing
     */
    stopProcessing() {
        this.isProcessing = false;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        console.log('[RequestQueue] Stopped queue processing');
    }

    /**
     * Process queue - dequeue and execute requests within concurrent limits
     */
    processQueue() {
        // Don't process if no execution callback is set
        if (!this.onRequestExecute) {
            return;
        }

        // Process requests while we have capacity and pending items
        while (this.canProcessRequest() && this.getTotalQueueSize() > 0) {
            const queueItem = this.dequeue();
            if (!queueItem) {
                break;
            }

            // Mark as active
            this.activeRequests.set(queueItem.id, {
                ...queueItem,
                startTime: Date.now()
            });

            // Execute request asynchronously
            this.executeRequest(queueItem).catch(error => {
                console.error(`[RequestQueue] Error executing request ${queueItem.id}:`, error);
            });
        }

        // Stop processing if no more work
        if (this.getTotalQueueSize() === 0 && this.activeRequests.size === 0) {
            this.stopProcessing();
        }
    }

    /**
     * Execute a single request
     * @param {Object} queueItem - Queue item to execute
     */
    async executeRequest(queueItem) {
        const startTime = Date.now();
        
        try {
            console.log(`[RequestQueue] Executing request ${queueItem.id}`);
            
            // This will be called by the AJAX manager
            if (this.onRequestExecute) {
                await this.onRequestExecute(queueItem.request);
            }
            
            // Mark as completed
            this.completeRequest(queueItem.id, true, startTime);
            
        } catch (error) {
            console.error(`[RequestQueue] Request ${queueItem.id} failed:`, error);
            
            // Handle retry logic
            queueItem.attempts++;
            if (queueItem.attempts < queueItem.maxAttempts) {
                console.log(`[RequestQueue] Retrying request ${queueItem.id} (attempt ${queueItem.attempts + 1}/${queueItem.maxAttempts})`);
                
                // Re-queue with exponential backoff delay
                const delay = Math.min(1000 * Math.pow(2, queueItem.attempts), 30000);
                setTimeout(() => {
                    this.enqueue(queueItem.request, queueItem.priority);
                }, delay);
            }
            
            // Mark as completed (failed)
            this.completeRequest(queueItem.id, false, startTime);
        }
    }

    /**
     * Mark request as completed and update metrics
     * @param {string} requestId - Request ID
     * @param {boolean} success - Whether request succeeded
     * @param {number} startTime - Request start time
     */
    completeRequest(requestId, success, startTime) {
        const activeRequest = this.activeRequests.get(requestId);
        if (!activeRequest) {
            return;
        }

        // Remove from active requests
        this.activeRequests.delete(requestId);
        
        // Add to history for deduplication
        this.requestHistory.set(requestId, {
            request: activeRequest.request,
            timestamp: Date.now(),
            success,
            duration: Date.now() - startTime
        });

        // Update metrics
        this.metrics.totalProcessed++;
        
        // Calculate average wait time
        const waitTime = startTime - activeRequest.timestamp;
        this.metrics.averageWaitTime = 
            (this.metrics.averageWaitTime * (this.metrics.totalProcessed - 1) + waitTime) / 
            this.metrics.totalProcessed;

        console.log(`[RequestQueue] Completed request ${requestId} (success: ${success})`);
    }

    /**
     * Set request execution callback
     * @param {Function} callback - Function to call when executing requests
     */
    setExecutionCallback(callback) {
        this.onRequestExecute = callback;
    }

    /**
     * Persist queue state to localStorage
     */
    persistQueue() {
        if (!this.options.enablePersistence) {
            return;
        }

        try {
            const state = {
                queues: this.queues,
                timestamp: Date.now(),
                version: '1.0.0'
            };
            
            localStorage.setItem(this.options.persistenceKey, JSON.stringify(state));
            console.log('[RequestQueue] Queue state persisted');
        } catch (error) {
            console.warn('[RequestQueue] Failed to persist queue state:', error);
        }
    }

    /**
     * Restore queue state from localStorage
     */
    restoreQueue() {
        if (!this.options.enablePersistence) {
            return;
        }

        try {
            const stored = localStorage.getItem(this.options.persistenceKey);
            if (!stored) {
                return;
            }

            const state = JSON.parse(stored);
            
            // Check if state is recent (within 1 hour)
            const maxAge = 60 * 60 * 1000; // 1 hour
            if (Date.now() - state.timestamp > maxAge) {
                console.log('[RequestQueue] Stored queue state too old, ignoring');
                localStorage.removeItem(this.options.persistenceKey);
                return;
            }

            // Restore queues
            if (state.queues) {
                this.queues = {
                    high: state.queues.high || [],
                    normal: state.queues.normal || [],
                    low: state.queues.low || []
                };
                
                console.log(`[RequestQueue] Restored ${this.getTotalQueueSize()} requests from storage`);
                
                // Start processing if we have items
                if (this.getTotalQueueSize() > 0) {
                    this.startProcessing();
                }
            }
        } catch (error) {
            console.warn('[RequestQueue] Failed to restore queue state:', error);
            localStorage.removeItem(this.options.persistenceKey);
        }
    }

    /**
     * Handle page unload - persist queue state
     */
    handleBeforeUnload() {
        this.persistQueue();
    }

    /**
     * Generate unique request ID
     * @returns {string} Unique ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get queue metrics and statistics
     * @returns {Object} Queue metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            currentQueueSize: this.getTotalQueueSize(),
            activeRequests: this.activeRequests.size,
            queueSizes: {
                high: this.queues.high.length,
                normal: this.queues.normal.length,
                low: this.queues.low.length
            }
        };
    }

    /**
     * Get queue status for debugging
     * @returns {Object} Queue status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            totalQueued: this.getTotalQueueSize(),
            activeRequests: this.activeRequests.size,
            canProcessMore: this.canProcessRequest(),
            metrics: this.getMetrics()
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopProcessing();
        
        if (this.options.enablePersistence) {
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
            // Clear persisted state on destroy
            this.clearQueue();
        } else {
            this.clearQueue();
        }
        
        this.activeRequests.clear();
        this.requestHistory.clear();
        
        console.log('[RequestQueue] Destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequestQueue;
} else if (typeof window !== 'undefined') {
    window.RequestQueue = RequestQueue;
}