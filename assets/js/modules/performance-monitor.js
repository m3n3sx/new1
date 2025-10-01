/**
 * Live Admin Styler - Performance Monitor
 * Handles performance monitoring, timing, and memory usage tracking
 */

class LASPerformanceMonitor {
    constructor(core) {
        this.core = core;
        this.metrics = new Map();
        this.thresholds = {
            ajaxRequest: 5000,      // 5 seconds
            domUpdate: 100,         // 100ms
            memoryUsage: 25 * 1024 * 1024, // 25MB
            cssGeneration: 50,      // 50ms
            settingsUpdate: 300     // 300ms
        };
        this.alerts = [];
        this.isMonitoring = false;
        this.performanceObserver = null;
        this.memoryCheckInterval = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.startTiming = this.startTiming.bind(this);
        this.endTiming = this.endTiming.bind(this);
        this.recordMetric = this.recordMetric.bind(this);
        this.checkMemoryUsage = this.checkMemoryUsage.bind(this);
        this.generateReport = this.generateReport.bind(this);
    }
    
    /**
     * Initialize the performance monitor
     */
    async init() {
        try {
            console.log('LAS: Initializing Performance Monitor...');
            
            this.setupPerformanceObserver();
            this.startMemoryMonitoring();
            this.bindEventListeners();
            this.isMonitoring = true;
            
            // Record initialization time
            this.recordMetric('initialization', {
                timestamp: Date.now(),
                duration: performance.now(),
                type: 'system'
            });
            
            console.log('LAS: Performance Monitor initialized successfully');
            
        } catch (error) {
            console.error('LAS: Failed to initialize Performance Monitor:', error);
            throw error;
        }
    }
    
    /**
     * Set up Performance Observer for detailed metrics
     * @private
     */
    setupPerformanceObserver() {
        if (!('PerformanceObserver' in window)) {
            console.warn('LAS: PerformanceObserver not supported, using fallback timing');
            return;
        }
        
        try {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    this.processPerformanceEntry(entry);
                });
            });
            
            // Observe different types of performance entries
            const observeTypes = ['measure', 'navigation', 'resource'];
            observeTypes.forEach(type => {
                try {
                    this.performanceObserver.observe({ entryTypes: [type] });
                } catch (e) {
                    console.warn(`LAS: Cannot observe ${type} performance entries:`, e);
                }
            });
            
        } catch (error) {
            console.warn('LAS: Failed to setup PerformanceObserver:', error);
        }
    }
    
    /**
     * Process performance entries from PerformanceObserver
     * @private
     */
    processPerformanceEntry(entry) {
        // Filter for LAS-related entries
        if (entry.name && entry.name.includes('las-')) {
            this.recordMetric(entry.name, {
                duration: entry.duration,
                startTime: entry.startTime,
                timestamp: Date.now(),
                type: 'performance-api'
            });
            
            // Check against thresholds
            this.checkThreshold(entry.name, entry.duration);
        }
    }
    
    /**
     * Start memory usage monitoring
     * @private
     */
    startMemoryMonitoring() {
        if (!('memory' in performance)) {
            console.warn('LAS: Memory API not supported');
            return;
        }
        
        // Check memory usage every 30 seconds
        this.memoryCheckInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 30000);
        
        // Initial memory check
        this.checkMemoryUsage();
    }
    
    /**
     * Check current memory usage
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
        
        this.recordMetric('memory-usage', memoryInfo);
        
        // Check memory threshold
        if (memoryInfo.used > this.thresholds.memoryUsage) {
            this.triggerAlert('memory', {
                message: `Memory usage exceeded threshold: ${this.formatBytes(memoryInfo.used)}`,
                current: memoryInfo.used,
                threshold: this.thresholds.memoryUsage,
                severity: 'warning'
            });
        }
        
        return memoryInfo;
    }
    
    /**
     * Bind event listeners for performance tracking
     * @private
     */
    bindEventListeners() {
        // Track AJAX request performance
        this.core.on('ajax:start', (data) => {
            this.startTiming(`ajax-${data.requestId}`, 'ajax');
        });
        
        this.core.on('ajax:complete', (data) => {
            this.endTiming(`ajax-${data.requestId}`, {
                success: data.success,
                responseSize: data.responseSize || 0
            });
        });
        
        // Track DOM update performance
        this.core.on('preview:update-start', (data) => {
            this.startTiming(`dom-update-${data.updateId}`, 'dom');
        });
        
        this.core.on('preview:update-complete', (data) => {
            this.endTiming(`dom-update-${data.updateId}`, {
                elementsUpdated: data.elementsUpdated || 0,
                cssRules: data.cssRules || 0
            });
        });
        
        // Track settings update performance
        this.core.on('settings:update-start', (data) => {
            this.startTiming(`settings-${data.key}`, 'settings');
        });
        
        this.core.on('settings:update-complete', (data) => {
            this.endTiming(`settings-${data.key}`, {
                key: data.key,
                value: data.value
            });
        });
        
        // Track CSS generation performance
        this.core.on('css:generation-start', (data) => {
            this.startTiming(`css-gen-${data.generationId}`, 'css');
        });
        
        this.core.on('css:generation-complete', (data) => {
            this.endTiming(`css-gen-${data.generationId}`, {
                rulesGenerated: data.rulesGenerated || 0,
                cssLength: data.cssLength || 0
            });
        });
    }
    
    /**
     * Start timing a performance metric
     * @param {string} name - Name of the metric
     * @param {string} category - Category of the metric
     * @param {Object} metadata - Additional metadata
     */
    startTiming(name, category = 'general', metadata = {}) {
        const timingData = {
            name,
            category,
            startTime: performance.now(),
            startTimestamp: Date.now(),
            metadata
        };
        
        this.metrics.set(`timing-${name}`, timingData);
        
        // Use Performance API if available
        if ('mark' in performance) {
            try {
                performance.mark(`las-${name}-start`);
            } catch (e) {
                // Silently fail if mark already exists
            }
        }
        
        return timingData;
    }
    
    /**
     * End timing a performance metric
     * @param {string} name - Name of the metric
     * @param {Object} additionalData - Additional data to record
     */
    endTiming(name, additionalData = {}) {
        const timingKey = `timing-${name}`;
        const startData = this.metrics.get(timingKey);
        
        if (!startData) {
            console.warn(`LAS: No start timing found for ${name}`);
            return null;
        }
        
        const endTime = performance.now();
        const duration = endTime - startData.startTime;
        
        const completedTiming = {
            ...startData,
            endTime,
            endTimestamp: Date.now(),
            duration,
            ...additionalData
        };
        
        // Store completed timing
        this.recordMetric(name, completedTiming);
        
        // Use Performance API if available
        if ('mark' in performance && 'measure' in performance) {
            try {
                performance.mark(`las-${name}-end`);
                performance.measure(`las-${name}`, `las-${name}-start`, `las-${name}-end`);
            } catch (e) {
                // Silently fail if marks don't exist
            }
        }
        
        // Check against thresholds
        this.checkThreshold(name, duration, startData.category);
        
        // Clean up timing data
        this.metrics.delete(timingKey);
        
        return completedTiming;
    }
    
    /**
     * Record a performance metric
     * @param {string} name - Name of the metric
     * @param {Object} data - Metric data
     */
    recordMetric(name, data) {
        const metricKey = `metric-${name}-${Date.now()}`;
        
        const metric = {
            name,
            timestamp: Date.now(),
            ...data
        };
        
        this.metrics.set(metricKey, metric);
        
        // Emit metric event for external listeners
        this.core.emit('performance:metric', {
            name,
            data: metric
        });
        
        // Clean up old metrics (keep last 1000)
        if (this.metrics.size > 1000) {
            const oldestKeys = Array.from(this.metrics.keys())
                .filter(key => key.startsWith('metric-'))
                .sort()
                .slice(0, this.metrics.size - 1000);
            
            oldestKeys.forEach(key => this.metrics.delete(key));
        }
        
        return metric;
    }
    
    /**
     * Check if a metric exceeds threshold
     * @private
     */
    checkThreshold(name, value, category = null) {
        let threshold = null;
        
        // Determine threshold based on name or category
        if (name.includes('ajax') || category === 'ajax') {
            threshold = this.thresholds.ajaxRequest;
        } else if (name.includes('dom') || category === 'dom') {
            threshold = this.thresholds.domUpdate;
        } else if (name.includes('css') || category === 'css') {
            threshold = this.thresholds.cssGeneration;
        } else if (name.includes('settings') || category === 'settings') {
            threshold = this.thresholds.settingsUpdate;
        }
        
        if (threshold && value > threshold) {
            this.triggerAlert('performance', {
                message: `${name} exceeded threshold: ${value.toFixed(2)}ms`,
                metric: name,
                value,
                threshold,
                severity: value > threshold * 2 ? 'error' : 'warning'
            });
        }
    }
    
    /**
     * Trigger a performance alert
     * @private
     */
    triggerAlert(type, alertData) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            timestamp: Date.now(),
            ...alertData
        };
        
        this.alerts.push(alert);
        
        // Emit alert event
        this.core.emit('performance:alert', alert);
        
        // Show user notification for severe issues
        if (alert.severity === 'error') {
            const errorHandler = this.core.get('error');
            if (errorHandler) {
                errorHandler.showWarning(`Performance Issue: ${alert.message}`);
            }
        }
        
        // Log to console
        const logLevel = alert.severity === 'error' ? 'error' : 'warn';
        console[logLevel]('LAS Performance Alert:', alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
        
        return alert;
    }
    
    /**
     * Get performance metrics by category
     * @param {string} category - Category to filter by
     * @param {number} limit - Maximum number of metrics to return
     */
    getMetrics(category = null, limit = 100) {
        const allMetrics = Array.from(this.metrics.entries())
            .filter(([key]) => key.startsWith('metric-'))
            .map(([key, value]) => value)
            .sort((a, b) => b.timestamp - a.timestamp);
        
        let filteredMetrics = allMetrics;
        
        if (category) {
            filteredMetrics = allMetrics.filter(metric => 
                metric.category === category || 
                metric.name.includes(category)
            );
        }
        
        return filteredMetrics.slice(0, limit);
    }
    
    /**
     * Get performance alerts
     * @param {string} type - Type of alerts to get
     * @param {number} limit - Maximum number of alerts to return
     */
    getAlerts(type = null, limit = 50) {
        let filteredAlerts = this.alerts;
        
        if (type) {
            filteredAlerts = this.alerts.filter(alert => alert.type === type);
        }
        
        return filteredAlerts
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    
    /**
     * Generate a performance report
     * @param {Object} options - Report options
     */
    generateReport(options = {}) {
        const {
            includeMetrics = true,
            includeAlerts = true,
            includeMemory = true,
            timePeriod = 3600000 // 1 hour in milliseconds
        } = options;
        
        const now = Date.now();
        const cutoffTime = now - timePeriod;
        
        const report = {
            timestamp: now,
            timePeriod,
            summary: {
                totalMetrics: 0,
                totalAlerts: 0,
                memoryUsage: null,
                averageResponseTime: 0,
                slowestOperations: []
            }
        };
        
        if (includeMetrics) {
            const recentMetrics = this.getMetrics(null, 1000)
                .filter(metric => metric.timestamp > cutoffTime);
            
            report.metrics = recentMetrics;
            report.summary.totalMetrics = recentMetrics.length;
            
            // Calculate average response times
            const ajaxMetrics = recentMetrics.filter(m => m.name.includes('ajax') && m.duration);
            if (ajaxMetrics.length > 0) {
                report.summary.averageResponseTime = ajaxMetrics.reduce((sum, m) => sum + m.duration, 0) / ajaxMetrics.length;
            }
            
            // Find slowest operations
            const timedMetrics = recentMetrics.filter(m => m.duration).sort((a, b) => b.duration - a.duration);
            report.summary.slowestOperations = timedMetrics.slice(0, 10);
        }
        
        if (includeAlerts) {
            const recentAlerts = this.getAlerts(null, 100)
                .filter(alert => alert.timestamp > cutoffTime);
            
            report.alerts = recentAlerts;
            report.summary.totalAlerts = recentAlerts.length;
        }
        
        if (includeMemory) {
            report.summary.memoryUsage = this.checkMemoryUsage();
        }
        
        return report;
    }
    
    /**
     * Clear old metrics and alerts
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanup(maxAge = 3600000) { // 1 hour default
        const cutoffTime = Date.now() - maxAge;
        
        // Clean up metrics
        const metricsToDelete = [];
        for (const [key, value] of this.metrics) {
            if (key.startsWith('metric-') && value.timestamp < cutoffTime) {
                metricsToDelete.push(key);
            }
        }
        metricsToDelete.forEach(key => this.metrics.delete(key));
        
        // Clean up alerts
        this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);
        
        console.log(`LAS: Cleaned up ${metricsToDelete.length} old metrics and ${this.alerts.length} alerts`);
    }
    
    /**
     * Format bytes to human readable format
     * @private
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Set performance thresholds
     * @param {Object} newThresholds - New threshold values
     */
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        
        this.core.emit('performance:thresholds-updated', this.thresholds);
    }
    
    /**
     * Get current thresholds
     */
    getThresholds() {
        return { ...this.thresholds };
    }
    
    /**
     * Stop monitoring and cleanup
     */
    cleanup() {
        console.log('LAS: Cleaning up Performance Monitor...');
        
        this.isMonitoring = false;
        
        // Stop memory monitoring
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        
        // Disconnect performance observer
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
        
        // Clear metrics and alerts
        this.metrics.clear();
        this.alerts = [];
        
        console.log('LAS: Performance Monitor cleanup complete');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LASPerformanceMonitor;
} else if (typeof window !== 'undefined') {
    window.LASPerformanceMonitor = LASPerformanceMonitor;
} else {
    // For Node.js testing environment
    global.LASPerformanceMonitor = LASPerformanceMonitor;
}