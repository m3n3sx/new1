/**
 * Live Admin Styler - Memory Manager
 * Handles memory management, leak prevention, and resource cleanup
 */

class LASMemoryManager {
    constructor(core) {
        this.core = core;
        this.eventListeners = new Map();
        this.domObservers = new Map();
        this.intervals = new Map();
        this.timeouts = new Map();
        this.cacheStorage = new Map();
        this.weakRefs = new Set();
        this.cleanupTasks = [];
        this.memoryCheckInterval = null;
        this.isMonitoring = false;
        
        // Memory thresholds
        this.thresholds = {
            maxCacheSize: 10 * 1024 * 1024, // 10MB
            maxEventListeners: 1000,
            maxDomObservers: 100,
            cleanupInterval: 300000, // 5 minutes
            memoryWarningThreshold: 20 * 1024 * 1024 // 20MB
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.addEventListener = this.addEventListener.bind(this);
        this.removeEventListener = this.removeEventListener.bind(this);
        this.addDomObserver = this.addDomObserver.bind(this);
        this.removeDomObserver = this.removeDomObserver.bind(this);
        this.cacheData = this.cacheData.bind(this);
        this.getCachedData = this.getCachedData.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.performCleanup = this.performCleanup.bind(this);
        this.detectMemoryLeaks = this.detectMemoryLeaks.bind(this);
    }
    
    /**
     * Initialize the memory manager
     */
    async init() {
        try {
            console.log('LAS: Initializing Memory Manager...');
            
            this.startMemoryMonitoring();
            this.setupPeriodicCleanup();
            this.bindCoreEvents();
            this.isMonitoring = true;
            
            console.log('LAS: Memory Manager initialized successfully');
            
        } catch (error) {
            console.error('LAS: Failed to initialize Memory Manager:', error);
            throw error;
        }
    }
    
    /**
     * Start memory usage monitoring
     * @private
     */
    startMemoryMonitoring() {
        if (!('memory' in performance)) {
            console.warn('LAS: Memory API not supported, using fallback monitoring');
            return;
        }
        
        // Check memory usage every 2 minutes
        this.memoryCheckInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 120000);
        
        // Initial memory check
        this.checkMemoryUsage();
    }
    
    /**
     * Check current memory usage and trigger cleanup if needed
     * @private
     */
    checkMemoryUsage() {
        if (!('memory' in performance)) return null;
        
        const memory = performance.memory;
        const memoryInfo = {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            timestamp: Date.now()
        };
        
        // Trigger cleanup if memory usage is high
        if (memoryInfo.used > this.thresholds.memoryWarningThreshold) {
            console.warn('LAS: High memory usage detected, triggering cleanup');
            this.performCleanup();
            
            // Emit warning event
            this.core.emit('memory:warning', {
                memoryInfo,
                threshold: this.thresholds.memoryWarningThreshold
            });
        }
        
        // Emit memory status event
        this.core.emit('memory:status', memoryInfo);
        
        return memoryInfo;
    }
    
    /**
     * Set up periodic cleanup
     * @private
     */
    setupPeriodicCleanup() {
        const cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.thresholds.cleanupInterval);
        
        this.intervals.set('periodic-cleanup', cleanupInterval);
    }
    
    /**
     * Bind to core events for automatic cleanup
     * @private
     */
    bindCoreEvents() {
        // Clean up when page becomes hidden
        this.addEventListener(document, 'visibilitychange', () => {
            if (document.hidden) {
                this.performCleanup();
            }
        });
        
        // Clean up before page unload
        this.addEventListener(window, 'beforeunload', () => {
            this.cleanup();
        });
        
        // Listen for core events that might create memory pressure
        this.core.on('settings:bulk-update', () => {
            // Clear cache after bulk updates
            this.clearCache('settings');
        });
        
        this.core.on('preview:reset', () => {
            // Clear preview-related cache
            this.clearCache('preview');
        });
    }
    
    /**
     * Add an event listener with automatic tracking
     * @param {EventTarget} target - Event target
     * @param {string} type - Event type
     * @param {Function} listener - Event listener function
     * @param {Object} options - Event listener options
     */
    addEventListener(target, type, listener, options = {}) {
        const listenerId = this.generateId('listener');
        
        // Create wrapper for cleanup tracking
        const wrappedListener = (event) => {
            try {
                listener(event);
            } catch (error) {
                console.error('LAS: Event listener error:', error);
                this.core.emit('memory:listener-error', { listenerId, error });
            }
        };
        
        // Add the actual event listener
        target.addEventListener(type, wrappedListener, options);
        
        // Track the listener for cleanup
        this.eventListeners.set(listenerId, {
            target,
            type,
            listener: wrappedListener,
            originalListener: listener,
            options,
            timestamp: Date.now()
        });
        
        // Check if we have too many listeners
        if (this.eventListeners.size > this.thresholds.maxEventListeners) {
            console.warn('LAS: High number of event listeners detected, consider cleanup');
            this.core.emit('memory:listener-warning', {
                count: this.eventListeners.size,
                threshold: this.thresholds.maxEventListeners
            });
        }
        
        return listenerId;
    }
    
    /**
     * Remove an event listener
     * @param {string} listenerId - Listener ID returned by addEventListener
     */
    removeEventListener(listenerId) {
        const listenerInfo = this.eventListeners.get(listenerId);
        if (!listenerInfo) {
            console.warn(`LAS: Event listener ${listenerId} not found`);
            return false;
        }
        
        const { target, type, listener, options } = listenerInfo;
        
        try {
            target.removeEventListener(type, listener, options);
            this.eventListeners.delete(listenerId);
            return true;
        } catch (error) {
            console.error('LAS: Failed to remove event listener:', error);
            return false;
        }
    }
    
    /**
     * Add a DOM observer with automatic tracking
     * @param {string} type - Observer type (mutation, intersection, resize)
     * @param {Function} callback - Observer callback
     * @param {Object} options - Observer options
     */
    addDomObserver(type, callback, options = {}) {
        const observerId = this.generateId('observer');
        let observer = null;
        
        // Create wrapper callback for error handling
        const wrappedCallback = (...args) => {
            try {
                callback(...args);
            } catch (error) {
                console.error('LAS: DOM observer error:', error);
                this.core.emit('memory:observer-error', { observerId, error });
            }
        };
        
        // Create appropriate observer
        switch (type) {
            case 'mutation':
                observer = new MutationObserver(wrappedCallback);
                break;
            case 'intersection':
                observer = new IntersectionObserver(wrappedCallback, options);
                break;
            case 'resize':
                if ('ResizeObserver' in window) {
                    observer = new ResizeObserver(wrappedCallback);
                } else {
                    console.warn('LAS: ResizeObserver not supported');
                    return null;
                }
                break;
            default:
                console.error(`LAS: Unknown observer type: ${type}`);
                return null;
        }
        
        if (!observer) return null;
        
        // Track the observer
        this.domObservers.set(observerId, {
            type,
            observer,
            callback: wrappedCallback,
            originalCallback: callback,
            options,
            timestamp: Date.now()
        });
        
        // Check observer count
        if (this.domObservers.size > this.thresholds.maxDomObservers) {
            console.warn('LAS: High number of DOM observers detected');
            this.core.emit('memory:observer-warning', {
                count: this.domObservers.size,
                threshold: this.thresholds.maxDomObservers
            });
        }
        
        return { observerId, observer };
    }
    
    /**
     * Remove a DOM observer
     * @param {string} observerId - Observer ID
     */
    removeDomObserver(observerId) {
        const observerInfo = this.domObservers.get(observerId);
        if (!observerInfo) {
            console.warn(`LAS: DOM observer ${observerId} not found`);
            return false;
        }
        
        try {
            observerInfo.observer.disconnect();
            this.domObservers.delete(observerId);
            return true;
        } catch (error) {
            console.error('LAS: Failed to remove DOM observer:', error);
            return false;
        }
    }
    
    /**
     * Cache data with automatic size management
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {string} category - Cache category
     * @param {number} ttl - Time to live in milliseconds
     */
    cacheData(key, data, category = 'default', ttl = 300000) { // 5 minutes default TTL
        const cacheKey = `${category}:${key}`;
        const cacheEntry = {
            data,
            category,
            timestamp: Date.now(),
            ttl,
            size: this.estimateSize(data)
        };
        
        this.cacheStorage.set(cacheKey, cacheEntry);
        
        // Check cache size and cleanup if needed
        this.manageCacheSize();
        
        return cacheEntry;
    }
    
    /**
     * Get cached data
     * @param {string} key - Cache key
     * @param {string} category - Cache category
     */
    getCachedData(key, category = 'default') {
        const cacheKey = `${category}:${key}`;
        const cacheEntry = this.cacheStorage.get(cacheKey);
        
        if (!cacheEntry) return null;
        
        // Check if expired
        if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
            this.cacheStorage.delete(cacheKey);
            return null;
        }
        
        return cacheEntry.data;
    }
    
    /**
     * Clear cache by category or key
     * @param {string} category - Category to clear (optional)
     * @param {string} key - Specific key to clear (optional)
     */
    clearCache(category = null, key = null) {
        if (key && category) {
            // Clear specific key
            const cacheKey = `${category}:${key}`;
            return this.cacheStorage.delete(cacheKey);
        } else if (category) {
            // Clear entire category
            let cleared = 0;
            for (const [cacheKey, entry] of this.cacheStorage) {
                if (entry.category === category) {
                    this.cacheStorage.delete(cacheKey);
                    cleared++;
                }
            }
            return cleared;
        } else {
            // Clear all cache
            const size = this.cacheStorage.size;
            this.cacheStorage.clear();
            return size;
        }
    }
    
    /**
     * Manage cache size to prevent memory bloat
     * @private
     */
    manageCacheSize() {
        let totalSize = 0;
        const entries = Array.from(this.cacheStorage.entries());
        
        // Calculate total cache size
        for (const [key, entry] of entries) {
            totalSize += entry.size || 0;
        }
        
        // If over threshold, remove oldest entries
        if (totalSize > this.thresholds.maxCacheSize) {
            const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            while (totalSize > this.thresholds.maxCacheSize * 0.8 && sortedEntries.length > 0) {
                const [key, entry] = sortedEntries.shift();
                this.cacheStorage.delete(key);
                totalSize -= entry.size || 0;
            }
            
            console.log(`LAS: Cache cleanup completed, removed ${entries.length - sortedEntries.length} entries`);
        }
    }
    
    /**
     * Estimate the memory size of an object
     * @private
     */
    estimateSize(obj) {
        try {
            const jsonString = JSON.stringify(obj);
            return jsonString.length * 2; // Rough estimate (UTF-16)
        } catch (error) {
            // Fallback for non-serializable objects
            return 1024; // 1KB default estimate
        }
    }
    
    /**
     * Add a timeout with tracking
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     */
    setTimeout(callback, delay) {
        const timeoutId = this.generateId('timeout');
        
        const wrappedCallback = () => {
            try {
                callback();
            } catch (error) {
                console.error('LAS: Timeout callback error:', error);
            } finally {
                this.timeouts.delete(timeoutId);
            }
        };
        
        const nativeTimeoutId = setTimeout(wrappedCallback, delay);
        
        this.timeouts.set(timeoutId, {
            nativeId: nativeTimeoutId,
            callback: wrappedCallback,
            originalCallback: callback,
            delay,
            timestamp: Date.now()
        });
        
        return timeoutId;
    }
    
    /**
     * Clear a tracked timeout
     * @param {string} timeoutId - Timeout ID
     */
    clearTimeout(timeoutId) {
        const timeoutInfo = this.timeouts.get(timeoutId);
        if (!timeoutInfo) return false;
        
        clearTimeout(timeoutInfo.nativeId);
        this.timeouts.delete(timeoutId);
        return true;
    }
    
    /**
     * Add an interval with tracking
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     */
    setInterval(callback, delay) {
        const intervalId = this.generateId('interval');
        
        const wrappedCallback = () => {
            try {
                callback();
            } catch (error) {
                console.error('LAS: Interval callback error:', error);
                // Don't remove interval on error, let it continue
            }
        };
        
        const nativeIntervalId = setInterval(wrappedCallback, delay);
        
        this.intervals.set(intervalId, {
            nativeId: nativeIntervalId,
            callback: wrappedCallback,
            originalCallback: callback,
            delay,
            timestamp: Date.now()
        });
        
        return intervalId;
    }
    
    /**
     * Clear a tracked interval
     * @param {string} intervalId - Interval ID
     */
    clearInterval(intervalId) {
        const intervalInfo = this.intervals.get(intervalId);
        if (!intervalInfo) return false;
        
        clearInterval(intervalInfo.nativeId);
        this.intervals.delete(intervalId);
        return true;
    }
    
    /**
     * Add a cleanup task to be run during cleanup
     * @param {Function} task - Cleanup task function
     * @param {string} description - Task description
     */
    addCleanupTask(task, description = 'Unknown task') {
        const taskId = this.generateId('cleanup');
        
        this.cleanupTasks.push({
            id: taskId,
            task,
            description,
            timestamp: Date.now()
        });
        
        return taskId;
    }
    
    /**
     * Remove a cleanup task
     * @param {string} taskId - Task ID
     */
    removeCleanupTask(taskId) {
        const index = this.cleanupTasks.findIndex(task => task.id === taskId);
        if (index !== -1) {
            this.cleanupTasks.splice(index, 1);
            return true;
        }
        return false;
    }
    
    /**
     * Perform comprehensive cleanup
     */
    performCleanup() {
        console.log('LAS: Performing memory cleanup...');
        
        const startTime = performance.now();
        let cleanedItems = 0;
        
        try {
            // Clean expired cache entries
            const expiredCache = [];
            const now = Date.now();
            
            for (const [key, entry] of this.cacheStorage) {
                if (now - entry.timestamp > entry.ttl) {
                    expiredCache.push(key);
                }
            }
            
            expiredCache.forEach(key => {
                this.cacheStorage.delete(key);
                cleanedItems++;
            });
            
            // Clean old event listeners (older than 1 hour)
            const oldListeners = [];
            for (const [id, listener] of this.eventListeners) {
                if (now - listener.timestamp > 3600000) { // 1 hour
                    oldListeners.push(id);
                }
            }
            
            oldListeners.forEach(id => {
                this.removeEventListener(id);
                cleanedItems++;
            });
            
            // Clean old DOM observers
            const oldObservers = [];
            for (const [id, observer] of this.domObservers) {
                if (now - observer.timestamp > 3600000) { // 1 hour
                    oldObservers.push(id);
                }
            }
            
            oldObservers.forEach(id => {
                this.removeDomObserver(id);
                cleanedItems++;
            });
            
            // Run custom cleanup tasks
            this.cleanupTasks.forEach(({ task, description }) => {
                try {
                    task();
                    cleanedItems++;
                } catch (error) {
                    console.error(`LAS: Cleanup task failed (${description}):`, error);
                }
            });
            
            // Force garbage collection if available
            if (window.gc && typeof window.gc === 'function') {
                window.gc();
            }
            
            const duration = performance.now() - startTime;
            
            console.log(`LAS: Memory cleanup completed in ${duration.toFixed(2)}ms, cleaned ${cleanedItems} items`);
            
            // Emit cleanup event
            this.core.emit('memory:cleanup', {
                duration,
                cleanedItems,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('LAS: Memory cleanup failed:', error);
            this.core.emit('memory:cleanup-error', error);
        }
    }
    
    /**
     * Detect potential memory leaks
     */
    detectMemoryLeaks() {
        const leaks = [];
        const now = Date.now();
        
        // Check for excessive event listeners
        if (this.eventListeners.size > this.thresholds.maxEventListeners * 0.8) {
            leaks.push({
                type: 'event-listeners',
                count: this.eventListeners.size,
                threshold: this.thresholds.maxEventListeners,
                severity: 'warning'
            });
        }
        
        // Check for excessive DOM observers
        if (this.domObservers.size > this.thresholds.maxDomObservers * 0.8) {
            leaks.push({
                type: 'dom-observers',
                count: this.domObservers.size,
                threshold: this.thresholds.maxDomObservers,
                severity: 'warning'
            });
        }
        
        // Check for old timeouts/intervals
        const oldTimeouts = Array.from(this.timeouts.values())
            .filter(timeout => now - timeout.timestamp > 300000); // 5 minutes
        
        if (oldTimeouts.length > 10) {
            leaks.push({
                type: 'old-timeouts',
                count: oldTimeouts.length,
                severity: 'warning'
            });
        }
        
        // Check cache size
        let totalCacheSize = 0;
        for (const entry of this.cacheStorage.values()) {
            totalCacheSize += entry.size || 0;
        }
        
        if (totalCacheSize > this.thresholds.maxCacheSize * 0.8) {
            leaks.push({
                type: 'cache-size',
                size: totalCacheSize,
                threshold: this.thresholds.maxCacheSize,
                severity: 'warning'
            });
        }
        
        // Emit leak detection results
        if (leaks.length > 0) {
            this.core.emit('memory:leaks-detected', leaks);
            console.warn('LAS: Potential memory leaks detected:', leaks);
        }
        
        return leaks;
    }
    
    /**
     * Generate a unique ID
     * @private
     */
    generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
        const stats = {
            eventListeners: this.eventListeners.size,
            domObservers: this.domObservers.size,
            intervals: this.intervals.size,
            timeouts: this.timeouts.size,
            cacheEntries: this.cacheStorage.size,
            cleanupTasks: this.cleanupTasks.length
        };
        
        // Add cache size
        let totalCacheSize = 0;
        for (const entry of this.cacheStorage.values()) {
            totalCacheSize += entry.size || 0;
        }
        stats.cacheSize = totalCacheSize;
        
        // Add memory info if available
        if ('memory' in performance) {
            const memory = performance.memory;
            stats.jsHeapSize = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit
            };
        }
        
        return stats;
    }
    
    /**
     * Set memory thresholds
     * @param {Object} newThresholds - New threshold values
     */
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        this.core.emit('memory:thresholds-updated', this.thresholds);
    }
    
    /**
     * Get current thresholds
     */
    getThresholds() {
        return { ...this.thresholds };
    }
    
    /**
     * Complete cleanup and shutdown
     */
    cleanup() {
        console.log('LAS: Cleaning up Memory Manager...');
        
        this.isMonitoring = false;
        
        // Stop memory monitoring
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        
        // Clear all tracked timeouts
        for (const [id, timeoutInfo] of this.timeouts) {
            clearTimeout(timeoutInfo.nativeId);
        }
        this.timeouts.clear();
        
        // Clear all tracked intervals
        for (const [id, intervalInfo] of this.intervals) {
            clearInterval(intervalInfo.nativeId);
        }
        this.intervals.clear();
        
        // Remove all event listeners
        for (const [id, listenerInfo] of this.eventListeners) {
            const { target, type, listener, options } = listenerInfo;
            try {
                target.removeEventListener(type, listener, options);
            } catch (error) {
                console.warn('LAS: Failed to remove event listener during cleanup:', error);
            }
        }
        this.eventListeners.clear();
        
        // Disconnect all DOM observers
        for (const [id, observerInfo] of this.domObservers) {
            try {
                observerInfo.observer.disconnect();
            } catch (error) {
                console.warn('LAS: Failed to disconnect DOM observer during cleanup:', error);
            }
        }
        this.domObservers.clear();
        
        // Clear cache
        this.cacheStorage.clear();
        
        // Clear cleanup tasks
        this.cleanupTasks = [];
        
        // Clear weak references
        this.weakRefs.clear();
        
        console.log('LAS: Memory Manager cleanup complete');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LASMemoryManager;
} else if (typeof window !== 'undefined') {
    window.LASMemoryManager = LASMemoryManager;
} else {
    // For Node.js testing environment
    global.LASMemoryManager = LASMemoryManager;
}