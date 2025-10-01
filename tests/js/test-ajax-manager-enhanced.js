/**
 * Enhanced AJAX Manager Tests
 * 
 * Tests for the enhanced AJAX manager with advanced features:
 * - Queue integration
 * - Batch request processing
 * - Performance metrics collection
 * - Request history tracking with debugging information
 */

describe('Enhanced AJAX Manager', () => {
    let ajaxManager;
    let mockCore;
    let mockRequestQueue;
    let mockRetryEngine;
    let mockHttpTransport;

    beforeEach(() => {
        // Mock core system
        mockCore = {
            log: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn(),
            config: {
                debug: true,
                nonce: 'test-nonce',
                ajaxUrl: '/wp-admin/admin-ajax.php'
            }
        };

        // Mock RequestQueue
        mockRequestQueue = {
            enqueue: jest.fn().mockReturnValue('req-123'),
            canProcessRequest: jest.fn().mockReturnValue(true),
            getMetrics: jest.fn().mockReturnValue({
                currentQueueSize: 0,
                activeRequests: 0,
                totalQueued: 5,
                totalProcessed: 3
            }),
            getStatus: jest.fn().mockReturnValue({
                isProcessing: false,
                totalQueued: 0,
                activeRequests: 0
            }),
            setExecutionCallback: jest.fn(),
            destroy: jest.fn()
        };

        // Mock RetryEngine
        mockRetryEngine = {
            shouldRetry: jest.fn().mockReturnValue(true),
            calculateDelay: jest.fn().mockReturnValue(1000),
            classifyError: jest.fn().mockReturnValue({
                code: 'NETWORK_ERROR',
                retryable: true
            }),
            updateCircuitBreaker: jest.fn(),
            isCircuitOpen: jest.fn().mockReturnValue(false),
            getCircuitBreakerStatus: jest.fn().mockReturnValue({
                state: 'CLOSED',
                failures: 0
            }),
            getAllCircuitBreakerStatuses: jest.fn().mockReturnValue({}),
            getRetryStatistics: jest.fn().mockReturnValue({
                circuitBreakers: {},
                errorTypes: {}
            })
        };

        // Mock HTTPTransport
        mockHttpTransport = {
            sendRequest: jest.fn().mockResolvedValue({
                data: { success: true, data: 'test-response' },
                status: 200
            }),
            getMetrics: jest.fn().mockReturnValue({
                totalRequests: 10,
                successfulRequests: 8
            }),
            configure: jest.fn()
        };

        // Set up global mocks
        window.RequestQueue = jest.fn().mockImplementation(() => mockRequestQueue);
        window.RetryEngine = jest.fn().mockImplementation(() => mockRetryEngine);
        window.HTTPTransport = jest.fn().mockImplementation(() => mockHttpTransport);

        // Mock performance API
        global.performance = {
            memory: {
                usedJSHeapSize: 1000000,
                totalJSHeapSize: 2000000,
                jsHeapSizeLimit: 4000000
            }
        };

        // Mock navigator
        global.navigator = {
            userAgent: 'Test Browser',
            platform: 'Test Platform',
            language: 'en-US',
            cookieEnabled: true,
            onLine: true,
            connection: {
                effectiveType: '4g',
                downlink: 10,
                rtt: 50,
                saveData: false
            }
        };

        // Create AJAX manager instance
        const AjaxManagerClass = require('../../assets/js/modules/ajax-manager.js');
        ajaxManager = new AjaxManagerClass(mockCore);
    });

    afterEach(() => {
        if (ajaxManager) {
            ajaxManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with advanced queue system', () => {
            expect(window.RequestQueue).toHaveBeenCalled();
            expect(mockRequestQueue.setExecutionCallback).toHaveBeenCalled();
        });

        test('should initialize retry engine', () => {
            expect(window.RetryEngine).toHaveBeenCalled();
        });

        test('should initialize HTTP transport', () => {
            expect(window.HTTPTransport).toHaveBeenCalled();
        });

        test('should enable debug mode when configured', () => {
            expect(ajaxManager.debugMode).toBe(true);
            expect(ajaxManager.debugLogs).toBeInstanceOf(Array);
        });
    });

    describe('Enhanced Request Processing', () => {
        test('should make request with enhanced metadata', async () => {
            const response = await ajaxManager.request('test_action', { test: 'data' });
            
            expect(mockHttpTransport.sendRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/wp-admin/admin-ajax.php',
                    method: 'POST',
                    data: expect.objectContaining({
                        action: 'las_test_action',
                        nonce: 'test-nonce',
                        test: 'data'
                    })
                })
            );
            
            expect(response).toBe('test-response');
        });

        test('should track request metrics by action', async () => {
            await ajaxManager.request('test_action', { test: 'data' });
            
            const metrics = ajaxManager.getMetrics();
            expect(metrics.requestsByAction.test_action).toEqual(
                expect.objectContaining({
                    total: 1,
                    success: 1
                })
            );
        });

        test('should add requests to history with debug information', async () => {
            await ajaxManager.request('test_action', { test: 'data' });
            
            const history = ajaxManager.getHistory({ includeDebugInfo: true });
            expect(history).toHaveLength(1);
            expect(history[0]).toEqual(
                expect.objectContaining({
                    action: 'test_action',
                    status: 'success',
                    debugInfo: expect.objectContaining({
                        requestSize: expect.any(Number),
                        responseSize: expect.any(Number),
                        memoryUsage: expect.any(Object),
                        networkInfo: expect.any(Object)
                    })
                })
            );
        });
    });

    describe('Batch Request Processing', () => {
        test('should process batch requests', async () => {
            const requests = [
                { action: 'test_action_1', data: { test: 'data1' } },
                { action: 'test_action_2', data: { test: 'data2' } }
            ];

            const result = await ajaxManager.batchRequest(requests);
            
            expect(result).toEqual(
                expect.objectContaining({
                    results: expect.any(Array),
                    errors: expect.any(Array),
                    hasErrors: false,
                    successCount: 2,
                    errorCount: 0
                })
            );
            
            expect(ajaxManager.metrics.batchRequests).toBe(1);
        });

        test('should handle batch request failures', async () => {
            mockHttpTransport.sendRequest
                .mockResolvedValueOnce({ data: { success: true, data: 'success1' } })
                .mockRejectedValueOnce(new Error('Request failed'));

            const requests = [
                { action: 'test_action_1', data: { test: 'data1' } },
                { action: 'test_action_2', data: { test: 'data2' } }
            ];

            const result = await ajaxManager.batchRequest(requests, { failFast: false });
            
            expect(result.hasErrors).toBe(true);
            expect(result.successCount).toBe(1);
            expect(result.errorCount).toBe(1);
        });

        test('should support fail-fast mode in batch requests', async () => {
            mockHttpTransport.sendRequest
                .mockRejectedValueOnce(new Error('Request failed'));

            const requests = [
                { action: 'test_action_1', data: { test: 'data1' } },
                { action: 'test_action_2', data: { test: 'data2' } }
            ];

            await expect(
                ajaxManager.batchRequest(requests, { failFast: true })
            ).rejects.toThrow();
        });

        test('should add batch requests to history', async () => {
            const requests = [
                { action: 'test_action_1', data: { test: 'data1' } },
                { action: 'test_action_2', data: { test: 'data2' } }
            ];

            await ajaxManager.batchRequest(requests);
            
            const history = ajaxManager.getHistory();
            const batchEntry = history.find(entry => entry.action === 'batch_request');
            
            expect(batchEntry).toBeDefined();
            expect(batchEntry.debugInfo.batchSize).toBe(2);
        });
    });

    describe('Performance Metrics Collection', () => {
        test('should collect comprehensive performance metrics', () => {
            const metrics = ajaxManager.getMetrics();
            
            expect(metrics).toEqual(
                expect.objectContaining({
                    totalRequests: expect.any(Number),
                    successfulRequests: expect.any(Number),
                    failedRequests: expect.any(Number),
                    batchRequests: expect.any(Number),
                    successRate: expect.any(String),
                    retryRate: expect.any(String),
                    batchRate: expect.any(String),
                    performance: expect.objectContaining({
                        averageResponseTime: expect.any(Number),
                        slowestRequest: expect.any(Number),
                        fastestRequest: expect.any(Number),
                        requestsPerSecond: expect.any(Number),
                        memoryUsage: expect.any(Object),
                        uptime: expect.any(Number)
                    }),
                    errorBreakdown: expect.any(Object),
                    requestsByAction: expect.any(Object)
                })
            );
        });

        test('should track response time metrics', async () => {
            // Mock a slow request
            mockHttpTransport.sendRequest.mockImplementation(() => 
                new Promise(resolve => 
                    setTimeout(() => resolve({ 
                        data: { success: true, data: 'test' } 
                    }), 100)
                )
            );

            await ajaxManager.request('test_action', { test: 'data' });
            
            const metrics = ajaxManager.getMetrics();
            expect(metrics.performance.averageResponseTime).toBeGreaterThan(0);
            expect(metrics.performance.slowestRequest).toBeGreaterThan(0);
        });

        test('should include queue metrics when available', () => {
            const metrics = ajaxManager.getMetrics();
            expect(metrics.queue).toEqual(mockRequestQueue.getMetrics());
        });

        test('should include retry engine statistics', () => {
            const metrics = ajaxManager.getMetrics();
            expect(metrics.retryEngine).toEqual(mockRetryEngine.getRetryStatistics());
        });

        test('should reset metrics when requested', () => {
            ajaxManager.metrics.totalRequests = 10;
            ajaxManager.resetMetrics();
            
            expect(ajaxManager.metrics.totalRequests).toBe(0);
            expect(ajaxManager.metrics.lastResetTime).toBeCloseTo(Date.now(), -2);
        });
    });

    describe('Enhanced Request History', () => {
        beforeEach(async () => {
            // Add some test requests to history
            await ajaxManager.request('action1', { test: 'data1' });
            
            mockHttpTransport.sendRequest.mockRejectedValueOnce(new Error('Test error'));
            try {
                await ajaxManager.request('action2', { test: 'data2' });
            } catch (error) {
                // Expected to fail
            }
        });

        test('should filter history by action', () => {
            const history = ajaxManager.getHistory({ action: 'action1' });
            expect(history).toHaveLength(1);
            expect(history[0].action).toBe('action1');
        });

        test('should filter history by status', () => {
            const successHistory = ajaxManager.getHistory({ status: 'success' });
            const failedHistory = ajaxManager.getHistory({ status: 'failed' });
            
            expect(successHistory).toHaveLength(1);
            expect(failedHistory).toHaveLength(1);
        });

        test('should limit history results', () => {
            const history = ajaxManager.getHistory({ limit: 1 });
            expect(history).toHaveLength(1);
        });

        test('should include or exclude debug information', () => {
            const historyWithDebug = ajaxManager.getHistory({ includeDebugInfo: true });
            const historyWithoutDebug = ajaxManager.getHistory({ includeDebugInfo: false });
            
            expect(historyWithDebug[0].debugInfo).toBeDefined();
            expect(historyWithoutDebug[0].debugInfo).toBeUndefined();
        });

        test('should maintain history size limit', async () => {
            ajaxManager.maxHistorySize = 5;
            
            // Add more requests than the limit
            for (let i = 0; i < 10; i++) {
                await ajaxManager.request(`action${i}`, { test: `data${i}` });
            }
            
            expect(ajaxManager.requestHistory.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Debug Information', () => {
        test('should collect comprehensive debug information', () => {
            const debugInfo = ajaxManager.getDebugInfo();
            
            expect(debugInfo).toEqual(
                expect.objectContaining({
                    system: expect.objectContaining({
                        userAgent: expect.any(String),
                        platform: expect.any(String),
                        language: expect.any(String)
                    }),
                    performance: expect.any(Object),
                    queueStatus: expect.any(Object),
                    circuitBreakers: expect.any(Object),
                    recentErrors: expect.any(Array),
                    configuration: expect.objectContaining({
                        maxRetries: expect.any(Number),
                        timeout: expect.any(Number),
                        debugMode: expect.any(Boolean)
                    }),
                    debugLogs: expect.any(Array)
                })
            );
        });

        test('should log debug messages when debug mode is enabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            ajaxManager.debugLog('Test debug message', { test: 'data' });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[AjaxManager Debug] Test debug message',
                { test: 'data' }
            );
            
            expect(ajaxManager.debugLogs).toContainEqual(
                expect.objectContaining({
                    message: 'Test debug message',
                    data: { test: 'data' }
                })
            );
            
            consoleSpy.mockRestore();
        });

        test('should not log debug messages when debug mode is disabled', () => {
            ajaxManager.debugMode = false;
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            ajaxManager.debugLog('Test debug message');
            
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Enhanced Configuration', () => {
        test('should configure batch processing options', () => {
            ajaxManager.configure({
                batchConfig: {
                    maxBatchSize: 20,
                    batchTimeout: 2000,
                    enableBatching: false
                }
            });
            
            expect(ajaxManager.batchConfig.maxBatchSize).toBe(20);
            expect(ajaxManager.batchConfig.batchTimeout).toBe(2000);
            expect(ajaxManager.batchConfig.enableBatching).toBe(false);
        });

        test('should configure debug mode', () => {
            ajaxManager.configure({ debugMode: false });
            expect(ajaxManager.debugMode).toBe(false);
        });

        test('should configure history size', () => {
            ajaxManager.configure({ maxHistorySize: 500 });
            expect(ajaxManager.maxHistorySize).toBe(500);
        });

        test('should configure retry engine when available', () => {
            ajaxManager.configure({
                retryEngine: {
                    maxRetries: 5,
                    baseDelay: 2000
                }
            });
            
            expect(mockRetryEngine.configure).toHaveBeenCalledWith({
                maxRetries: 5,
                baseDelay: 2000
            });
        });
    });

    describe('Enhanced Cleanup', () => {
        test('should perform comprehensive cleanup on destroy', () => {
            ajaxManager.destroy();
            
            expect(mockRequestQueue.destroy).toHaveBeenCalled();
            expect(ajaxManager.requestHistory).toHaveLength(0);
            expect(ajaxManager.debugLogs).toHaveLength(0);
        });

        test('should clear pending batches on destroy', () => {
            // Add a pending batch
            ajaxManager.pendingBatches.set('test_action', {
                requests: [],
                promises: [{ reject: jest.fn() }],
                timeout: setTimeout(() => {}, 1000)
            });
            
            ajaxManager.destroy();
            
            expect(ajaxManager.pendingBatches.size).toBe(0);
        });
    });

    describe('Utility Methods', () => {
        test('should calculate request and response sizes', () => {
            const requestSize = ajaxManager.calculateRequestSize({ test: 'data' });
            const responseSize = ajaxManager.calculateResponseSize({ result: 'success' });
            
            expect(requestSize).toBeGreaterThan(0);
            expect(responseSize).toBeGreaterThan(0);
        });

        test('should get memory usage information', () => {
            const memoryUsage = ajaxManager.getMemoryUsage();
            
            expect(memoryUsage).toEqual({
                used: 1000000,
                total: 2000000,
                limit: 4000000
            });
        });

        test('should get network information', () => {
            const networkInfo = ajaxManager.getNetworkInfo();
            
            expect(networkInfo).toEqual({
                effectiveType: '4g',
                downlink: 10,
                rtt: 50,
                saveData: false
            });
        });

        test('should chunk arrays correctly', () => {
            const array = [1, 2, 3, 4, 5, 6, 7];
            const chunks = ajaxManager.chunkArray(array, 3);
            
            expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
        });
    });
});