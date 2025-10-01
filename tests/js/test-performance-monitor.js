/**
 * Test Suite for LAS Performance Monitor
 * Tests performance monitoring, timing, and memory usage tracking
 */

// Load the performance monitor class
const fs = require('fs');
const path = require('path');

// Load the performance monitor module
const performanceMonitorPath = path.join(__dirname, '../../assets/js/modules/performance-monitor.js');
const performanceMonitorCode = fs.readFileSync(performanceMonitorPath, 'utf8');
eval(performanceMonitorCode);

describe('LAS Performance Monitor', () => {
    let core, performanceMonitor;
    
    beforeEach(() => {
        // Mock core manager
        core = {
            emit: jest.fn(),
            on: jest.fn(),
            get: jest.fn()
        };
        
        // Mock performance API
        global.performance = {
            now: jest.fn(() => Date.now()),
            mark: jest.fn(),
            measure: jest.fn(),
            memory: {
                usedJSHeapSize: 10 * 1024 * 1024, // 10MB
                totalJSHeapSize: 20 * 1024 * 1024, // 20MB
                jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
            }
        };
        
        // Mock PerformanceObserver
        global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
            observe: jest.fn(),
            disconnect: jest.fn()
        }));
        
        performanceMonitor = new LASPerformanceMonitor(core);
    });
    
    afterEach(() => {
        if (performanceMonitor) {
            performanceMonitor.cleanup();
        }
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await performanceMonitor.init();
            
            expect(performanceMonitor.isMonitoring).toBe(true);
            expect(core.on).toHaveBeenCalledWith('ajax:start', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('ajax:complete', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('preview:update-start', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('preview:update-complete', expect.any(Function));
        });
        
        test('should setup PerformanceObserver when available', async () => {
            await performanceMonitor.init();
            
            expect(global.PerformanceObserver).toHaveBeenCalled();
        });
        
        test('should handle PerformanceObserver not being available', async () => {
            delete global.PerformanceObserver;
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            await performanceMonitor.init();
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('PerformanceObserver not supported')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should record initialization metric', async () => {
            await performanceMonitor.init();
            
            expect(core.emit).toHaveBeenCalledWith('performance:metric', expect.objectContaining({
                name: 'initialization'
            }));
        });
    });
    
    describe('Timing Operations', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should start timing correctly', () => {
            const timingData = performanceMonitor.startTiming('test-operation', 'test');
            
            expect(timingData).toMatchObject({
                name: 'test-operation',
                category: 'test',
                startTime: expect.any(Number),
                startTimestamp: expect.any(Number)
            });
            
            expect(performance.mark).toHaveBeenCalledWith('las-test-operation-start');
        });
        
        test('should end timing correctly', () => {
            performanceMonitor.startTiming('test-operation', 'test');
            
            // Mock performance.now to return a later time
            performance.now.mockReturnValue(Date.now() + 100);
            
            const completedTiming = performanceMonitor.endTiming('test-operation', {
                additionalData: 'test'
            });
            
            expect(completedTiming).toMatchObject({
                name: 'test-operation',
                category: 'test',
                duration: expect.any(Number),
                additionalData: 'test'
            });
            
            expect(performance.mark).toHaveBeenCalledWith('las-test-operation-end');
            expect(performance.measure).toHaveBeenCalledWith(
                'las-test-operation',
                'las-test-operation-start',
                'las-test-operation-end'
            );
        });
        
        test('should handle ending timing without start', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = performanceMonitor.endTiming('nonexistent-operation');
            
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('No start timing found')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should check thresholds and trigger alerts', () => {
            performanceMonitor.startTiming('slow-operation', 'ajax');
            
            // Mock a slow operation (6 seconds, above 5 second threshold)
            performance.now.mockReturnValue(Date.now() + 6000);
            
            performanceMonitor.endTiming('slow-operation');
            
            expect(core.emit).toHaveBeenCalledWith('performance:alert', expect.objectContaining({
                type: 'performance',
                metric: 'slow-operation',
                value: 6000,
                threshold: 5000,
                severity: 'error'
            }));
        });
    });
    
    describe('Memory Monitoring', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should check memory usage', () => {
            const memoryInfo = performanceMonitor.checkMemoryUsage();
            
            expect(memoryInfo).toMatchObject({
                used: 10 * 1024 * 1024,
                total: 20 * 1024 * 1024,
                limit: 100 * 1024 * 1024,
                timestamp: expect.any(Number)
            });
            
            expect(core.emit).toHaveBeenCalledWith('performance:metric', expect.objectContaining({
                name: 'memory-usage'
            }));
        });
        
        test('should trigger memory alert when threshold exceeded', () => {
            // Mock high memory usage
            performance.memory.usedJSHeapSize = 30 * 1024 * 1024; // 30MB (above 25MB threshold)
            
            performanceMonitor.checkMemoryUsage();
            
            expect(core.emit).toHaveBeenCalledWith('performance:alert', expect.objectContaining({
                type: 'memory',
                severity: 'warning'
            }));
        });
        
        test('should handle memory API not being available', () => {
            delete performance.memory;
            
            const result = performanceMonitor.checkMemoryUsage();
            
            expect(result).toBeNull();
        });
    });
    
    describe('Metric Recording', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should record metrics correctly', () => {
            const metric = performanceMonitor.recordMetric('test-metric', {
                value: 100,
                category: 'test'
            });
            
            expect(metric).toMatchObject({
                name: 'test-metric',
                timestamp: expect.any(Number),
                value: 100,
                category: 'test'
            });
            
            expect(core.emit).toHaveBeenCalledWith('performance:metric', {
                name: 'test-metric',
                data: metric
            });
        });
        
        test('should clean up old metrics when limit exceeded', () => {
            // Add many metrics to exceed the limit
            for (let i = 0; i < 1100; i++) {
                performanceMonitor.recordMetric(`metric-${i}`, { value: i });
            }
            
            // Should have cleaned up to keep only 1000 metrics
            const metricsCount = Array.from(performanceMonitor.metrics.keys())
                .filter(key => key.startsWith('metric-')).length;
            
            expect(metricsCount).toBeLessThanOrEqual(1000);
        });
    });
    
    describe('Event Binding', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should bind to AJAX events', () => {
            expect(core.on).toHaveBeenCalledWith('ajax:start', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('ajax:complete', expect.any(Function));
        });
        
        test('should bind to preview events', () => {
            expect(core.on).toHaveBeenCalledWith('preview:update-start', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('preview:update-complete', expect.any(Function));
        });
        
        test('should bind to settings events', () => {
            expect(core.on).toHaveBeenCalledWith('settings:update-start', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('settings:update-complete', expect.any(Function));
        });
        
        test('should bind to CSS generation events', () => {
            expect(core.on).toHaveBeenCalledWith('css:generation-start', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('css:generation-complete', expect.any(Function));
        });
    });
    
    describe('Alert System', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should trigger alerts for performance issues', () => {
            const alert = performanceMonitor.triggerAlert('performance', {
                message: 'Test alert',
                severity: 'warning'
            });
            
            expect(alert).toMatchObject({
                id: expect.any(String),
                type: 'performance',
                message: 'Test alert',
                severity: 'warning',
                timestamp: expect.any(Number)
            });
            
            expect(core.emit).toHaveBeenCalledWith('performance:alert', alert);
        });
        
        test('should show user notification for severe alerts', () => {
            const mockErrorHandler = {
                showWarning: jest.fn()
            };
            core.get.mockReturnValue(mockErrorHandler);
            
            performanceMonitor.triggerAlert('performance', {
                message: 'Critical error',
                severity: 'error'
            });
            
            expect(mockErrorHandler.showWarning).toHaveBeenCalledWith(
                'Performance Issue: Critical error'
            );
        });
        
        test('should limit number of stored alerts', () => {
            // Add many alerts to exceed the limit
            for (let i = 0; i < 150; i++) {
                performanceMonitor.triggerAlert('test', {
                    message: `Alert ${i}`,
                    severity: 'info'
                });
            }
            
            expect(performanceMonitor.alerts.length).toBe(100);
        });
    });
    
    describe('Metrics Retrieval', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
            
            // Add some test metrics
            performanceMonitor.recordMetric('ajax-test', { category: 'ajax', duration: 100 });
            performanceMonitor.recordMetric('dom-test', { category: 'dom', duration: 50 });
            performanceMonitor.recordMetric('css-test', { category: 'css', duration: 25 });
        });
        
        test('should get all metrics', () => {
            const metrics = performanceMonitor.getMetrics();
            
            expect(metrics.length).toBeGreaterThan(0);
            expect(metrics[0]).toMatchObject({
                name: expect.any(String),
                timestamp: expect.any(Number)
            });
        });
        
        test('should filter metrics by category', () => {
            const ajaxMetrics = performanceMonitor.getMetrics('ajax');
            
            expect(ajaxMetrics.length).toBeGreaterThan(0);
            expect(ajaxMetrics.every(m => m.category === 'ajax' || m.name.includes('ajax'))).toBe(true);
        });
        
        test('should limit number of returned metrics', () => {
            const metrics = performanceMonitor.getMetrics(null, 2);
            
            expect(metrics.length).toBeLessThanOrEqual(2);
        });
    });
    
    describe('Alerts Retrieval', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
            
            // Add some test alerts
            performanceMonitor.triggerAlert('performance', { message: 'Perf alert', severity: 'warning' });
            performanceMonitor.triggerAlert('memory', { message: 'Memory alert', severity: 'error' });
        });
        
        test('should get all alerts', () => {
            const alerts = performanceMonitor.getAlerts();
            
            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0]).toMatchObject({
                type: expect.any(String),
                message: expect.any(String),
                timestamp: expect.any(Number)
            });
        });
        
        test('should filter alerts by type', () => {
            const perfAlerts = performanceMonitor.getAlerts('performance');
            
            expect(perfAlerts.length).toBeGreaterThan(0);
            expect(perfAlerts.every(a => a.type === 'performance')).toBe(true);
        });
        
        test('should limit number of returned alerts', () => {
            const alerts = performanceMonitor.getAlerts(null, 1);
            
            expect(alerts.length).toBeLessThanOrEqual(1);
        });
    });
    
    describe('Performance Report', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
            
            // Add test data
            performanceMonitor.recordMetric('ajax-request', { duration: 200, category: 'ajax' });
            performanceMonitor.recordMetric('dom-update', { duration: 50, category: 'dom' });
            performanceMonitor.triggerAlert('performance', { message: 'Test alert', severity: 'warning' });
        });
        
        test('should generate comprehensive report', () => {
            const report = performanceMonitor.generateReport();
            
            expect(report).toMatchObject({
                timestamp: expect.any(Number),
                timePeriod: expect.any(Number),
                summary: {
                    totalMetrics: expect.any(Number),
                    totalAlerts: expect.any(Number),
                    memoryUsage: expect.any(Object),
                    averageResponseTime: expect.any(Number),
                    slowestOperations: expect.any(Array)
                },
                metrics: expect.any(Array),
                alerts: expect.any(Array)
            });
        });
        
        test('should calculate average response time correctly', () => {
            // Add more AJAX metrics
            performanceMonitor.recordMetric('ajax-1', { duration: 100, name: 'ajax-1' });
            performanceMonitor.recordMetric('ajax-2', { duration: 300, name: 'ajax-2' });
            
            const report = performanceMonitor.generateReport();
            
            expect(report.summary.averageResponseTime).toBeGreaterThan(0);
        });
        
        test('should identify slowest operations', () => {
            // Add operations with different durations
            performanceMonitor.recordMetric('fast-op', { duration: 10 });
            performanceMonitor.recordMetric('slow-op', { duration: 1000 });
            performanceMonitor.recordMetric('medium-op', { duration: 100 });
            
            const report = performanceMonitor.generateReport();
            
            expect(report.summary.slowestOperations.length).toBeGreaterThan(0);
            expect(report.summary.slowestOperations[0].duration).toBeGreaterThanOrEqual(
                report.summary.slowestOperations[1]?.duration || 0
            );
        });
        
        test('should respect time period filter', () => {
            const shortPeriod = 1000; // 1 second
            const report = performanceMonitor.generateReport({ timePeriod: shortPeriod });
            
            expect(report.timePeriod).toBe(shortPeriod);
        });
    });
    
    describe('Threshold Management', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should set new thresholds', () => {
            const newThresholds = {
                ajaxRequest: 3000,
                domUpdate: 200
            };
            
            performanceMonitor.setThresholds(newThresholds);
            
            expect(performanceMonitor.thresholds.ajaxRequest).toBe(3000);
            expect(performanceMonitor.thresholds.domUpdate).toBe(200);
            expect(core.emit).toHaveBeenCalledWith('performance:thresholds-updated', performanceMonitor.thresholds);
        });
        
        test('should get current thresholds', () => {
            const thresholds = performanceMonitor.getThresholds();
            
            expect(thresholds).toMatchObject({
                ajaxRequest: expect.any(Number),
                domUpdate: expect.any(Number),
                memoryUsage: expect.any(Number),
                cssGeneration: expect.any(Number),
                settingsUpdate: expect.any(Number)
            });
        });
    });
    
    describe('Cleanup', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should cleanup old metrics and alerts', () => {
            // Add old metrics
            const oldTimestamp = Date.now() - 7200000; // 2 hours ago
            performanceMonitor.recordMetric('old-metric', { timestamp: oldTimestamp });
            performanceMonitor.triggerAlert('performance', { 
                message: 'Old alert', 
                timestamp: oldTimestamp 
            });
            
            const maxAge = 3600000; // 1 hour
            performanceMonitor.cleanup(maxAge);
            
            // Old data should be cleaned up
            const metrics = performanceMonitor.getMetrics();
            const alerts = performanceMonitor.getAlerts();
            
            expect(metrics.every(m => m.timestamp > Date.now() - maxAge)).toBe(true);
            expect(alerts.every(a => a.timestamp > Date.now() - maxAge)).toBe(true);
        });
        
        test('should stop monitoring and cleanup resources', () => {
            performanceMonitor.cleanup();
            
            expect(performanceMonitor.isMonitoring).toBe(false);
            expect(performanceMonitor.metrics.size).toBe(0);
            expect(performanceMonitor.alerts.length).toBe(0);
        });
    });
    
    describe('Error Handling', () => {
        beforeEach(async () => {
            await performanceMonitor.init();
        });
        
        test('should handle Performance API errors gracefully', () => {
            // Mock Performance API to throw errors
            performance.mark.mockImplementation(() => {
                throw new Error('Performance API error');
            });
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            // Should not throw
            expect(() => {
                performanceMonitor.startTiming('test-operation');
            }).not.toThrow();
            
            consoleSpy.mockRestore();
        });
        
        test('should handle PerformanceObserver errors', () => {
            const mockObserver = {
                observe: jest.fn(() => {
                    throw new Error('Observer error');
                }),
                disconnect: jest.fn()
            };
            
            global.PerformanceObserver.mockImplementation(() => mockObserver);
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Should not throw during initialization
            expect(async () => {
                await performanceMonitor.init();
            }).not.toThrow();
            
            consoleSpy.mockRestore();
        });
    });
});