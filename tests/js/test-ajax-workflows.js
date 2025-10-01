/**
 * Integration Tests for AJAX Request Queuing and Conflict Prevention
 * Tests complete workflows and request management scenarios
 */

// Import the class from the main file
require('../../js/admin-settings.js');

describe('AJAX Request Queuing and Conflict Prevention', () => {
    let core, ajaxManager, mockFetch, mockErrorHandler;
    
    beforeEach(() => {
        // Mock core manager
        core = {
            config: {
                ajax_url: 'https://example.com/wp-admin/admin-ajax.php',
                nonce: 'test-nonce-123',
                debug: true
            },
            get: jest.fn(),
            on: jest.fn(),
            emit: jest.fn()
        };
        
        // Mock error handler
        mockErrorHandler = {
            showLoading: jest.fn(),
            showSuccess: jest.fn(),
            showError: jest.fn(),
            showWarning: jest.fn()
        };
        
        core.get.mockImplementation((module) => {
            if (module === 'error') return mockErrorHandler;
            return null;
        });
        
        // Mock fetch with realistic delays
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        
        // Mock AbortSignal and AbortController
        global.AbortSignal = {
            timeout: jest.fn(() => ({ aborted: false }))
        };
        
        global.AbortController = jest.fn(() => ({
            abort: jest.fn(),
            signal: { aborted: false }
        }));
        
        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
        
        // Create AJAX manager instance
        ajaxManager = new LASAjaxManager(core);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });
    
    describe('Request Queue Management', () => {
        beforeEach(async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            await ajaxManager.init();
        });
        
        test('should process requests sequentially', async () => {
            const responses = [];
            
            // Mock fetch to track call order
            mockFetch.mockImplementation(() => {
                const callIndex = mockFetch.mock.calls.length;
                responses.push(callIndex);
                
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ 
                        success: true, 
                        data: { callIndex } 
                    })
                });
            });
            
            // Queue multiple requests
            const promise1 = ajaxManager.saveSettings({ setting1: 'value1' });
            const promise2 = ajaxManager.saveSettings({ setting2: 'value2' });
            const promise3 = ajaxManager.saveSettings({ setting3: 'value3' });
            
            // Wait for all to complete
            const results = await Promise.all([promise1, promise2, promise3]);
            
            // Verify sequential processing
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(results[0].callIndex).toBe(1);
            expect(results[1].callIndex).toBe(2);
            expect(results[2].callIndex).toBe(3);
        });
        
        test('should respect request priorities', async () => {
            const callOrder = [];
            
            mockFetch.mockImplementation((url, options) => {
                const formData = options.body;
                const settings = formData.get('settings');
                const parsedSettings = settings ? JSON.parse(settings) : {};
                callOrder.push(parsedSettings.priority || 'normal');
                
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, data: {} })
                });
            });
            
            // Queue requests with different priorities
            ajaxManager.saveSettings({ priority: 'normal' }, { priority: 'normal' });
            ajaxManager.saveSettings({ priority: 'high' }, { priority: 'high' });
            ajaxManager.saveSettings({ priority: 'normal2' }, { priority: 'normal' });
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // High priority should be processed first
            expect(callOrder[0]).toBe('high');
        });
        
        test('should prevent concurrent save operations', async () => {
            let activeRequests = 0;
            let maxConcurrentRequests = 0;
            
            mockFetch.mockImplementation(() => {
                activeRequests++;
                maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        activeRequests--;
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: true, data: {} })
                        });
                    }, 50);
                });
            });
            
            // Queue multiple requests simultaneously
            const promises = [
                ajaxManager.saveSettings({ setting1: 'value1' }),
                ajaxManager.saveSettings({ setting2: 'value2' }),
                ajaxManager.saveSettings({ setting3: 'value3' }),
                ajaxManager.saveSettings({ setting4: 'value4' })
            ];
            
            await Promise.all(promises);
            
            // Should never have more than 1 concurrent request
            expect(maxConcurrentRequests).toBe(1);
        });
        
        test('should handle queue overflow gracefully', async () => {
            mockFetch.mockImplementation(() => 
                new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: true, data: {} })
                        });
                    }, 10);
                })
            );
            
            // Queue many requests
            const promises = [];
            for (let i = 0; i < 20; i++) {
                promises.push(ajaxManager.saveSettings({ setting: `value${i}` }));
            }
            
            // All should complete successfully
            const results = await Promise.all(promises);
            expect(results).toHaveLength(20);
            expect(results.every(r => r !== undefined)).toBe(true);
        });
    });
    
    describe('Request Deduplication', () => {
        beforeEach(async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            await ajaxManager.init();
        });
        
        test('should deduplicate identical save requests', async () => {
            const settings = { color: 'red', size: 'large' };
            
            // Make identical requests
            const promise1 = ajaxManager.saveSettings(settings);
            const promise2 = ajaxManager.saveSettings(settings);
            const promise3 = ajaxManager.saveSettings(settings);
            
            await Promise.all([promise1, promise2, promise3]);
            
            // Should only make one actual request
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
        
        test('should not deduplicate different save requests', async () => {
            const promise1 = ajaxManager.saveSettings({ color: 'red' });
            const promise2 = ajaxManager.saveSettings({ color: 'blue' });
            const promise3 = ajaxManager.saveSettings({ size: 'large' });
            
            await Promise.all([promise1, promise2, promise3]);
            
            // Should make three separate requests
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });
        
        test('should not deduplicate different request types', async () => {
            const settings = { color: 'red' };
            
            const promise1 = ajaxManager.saveSettings(settings);
            const promise2 = ajaxManager.loadSettings();
            const promise3 = ajaxManager.resetSettings();
            
            await Promise.all([promise1, promise2, promise3]);
            
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });
        
        test('should handle deduplication with promise resolution', async () => {
            const settings = { color: 'red' };
            const expectedResult = { message: 'Settings saved' };
            
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, data: expectedResult })
            });
            
            // Make identical requests
            const promise1 = ajaxManager.saveSettings(settings);
            const promise2 = ajaxManager.saveSettings(settings);
            
            const [result1, result2] = await Promise.all([promise1, promise2]);
            
            // Both should get the same result
            expect(result1).toEqual(expectedResult);
            expect(result2).toEqual(expectedResult);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
        
        test('should handle deduplication with promise rejection', async () => {
            const settings = { color: 'red' };
            const error = new Error('Save failed');
            
            mockFetch.mockRejectedValueOnce(error);
            
            // Make identical requests
            const promise1 = ajaxManager.saveSettings(settings);
            const promise2 = ajaxManager.saveSettings(settings);
            
            // Both should reject with the same error
            await expect(promise1).rejects.toThrow('Save failed');
            await expect(promise2).rejects.toThrow('Save failed');
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('Request Logging and Debugging', () => {
        beforeEach(async () => {
            core.config.debug = true;
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            await ajaxManager.init();
        });
        
        test('should log request lifecycle', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            await ajaxManager.saveSettings({ color: 'red' });
            
            // Should log request processing
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('LAS: Processing request: save_settings')
            );
            
            // Should log AJAX details in debug mode
            expect(consoleSpy).toHaveBeenCalledWith(
                'LAS AJAX Log:',
                expect.objectContaining({
                    type: 'save_settings',
                    status: 'success'
                })
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should maintain request history', async () => {
            await ajaxManager.saveSettings({ color: 'red' });
            await ajaxManager.loadSettings();
            
            const history = ajaxManager.requestHistory;
            
            expect(history).toHaveLength(2);
            expect(history[0]).toMatchObject({
                type: 'save_settings',
                status: 'success'
            });
            expect(history[1]).toMatchObject({
                type: 'load_settings',
                status: 'success'
            });
        });
        
        test('should limit history size', async () => {
            // Set a small history limit for testing
            ajaxManager.maxHistorySize = 3;
            
            // Make more requests than the limit
            for (let i = 0; i < 5; i++) {
                await ajaxManager.saveSettings({ setting: `value${i}` });
            }
            
            // History should be limited
            expect(ajaxManager.requestHistory).toHaveLength(3);
            
            // Should keep the most recent entries
            const lastEntry = ajaxManager.requestHistory[ajaxManager.requestHistory.length - 1];
            expect(lastEntry.type).toBe('save_settings');
        });
        
        test('should track request timing', async () => {
            const delay = 100;
            mockFetch.mockImplementation(() => 
                new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: true, data: {} })
                        });
                    }, delay);
                })
            );
            
            await ajaxManager.saveSettings({ color: 'red' });
            
            const lastEntry = ajaxManager.requestHistory[ajaxManager.requestHistory.length - 1];
            expect(lastEntry.duration).toBeGreaterThanOrEqual(delay);
        });
    });
    
    describe('Error Recovery and Conflict Resolution', () => {
        beforeEach(async () => {
            await ajaxManager.init();
            jest.useFakeTimers();
        });
        
        afterEach(() => {
            jest.useRealTimers();
        });
        
        test('should handle partial queue failures', async () => {
            // First request fails, second succeeds
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true, data: {} })
                });
            
            const promise1 = ajaxManager.saveSettings({ setting1: 'value1' });
            const promise2 = ajaxManager.saveSettings({ setting2: 'value2' });
            
            // Process first request failure and retry
            await jest.runOnlyPendingTimersAsync();
            jest.advanceTimersByTime(1000);
            
            // Second request should still succeed
            const result2 = await promise2;
            expect(result2).toBeDefined();
            
            // First request should eventually succeed after retry
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            
            await jest.runOnlyPendingTimersAsync();
            const result1 = await promise1;
            expect(result1).toBeDefined();
        });
        
        test('should handle queue corruption gracefully', async () => {
            // Simulate queue corruption
            ajaxManager.requestQueue.push(null);
            ajaxManager.requestQueue.push(undefined);
            ajaxManager.requestQueue.push({ invalid: 'request' });
            
            // Add valid request
            const validPromise = ajaxManager.saveSettings({ color: 'red' });
            
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            
            // Should handle corruption and process valid request
            const result = await validPromise;
            expect(result).toBeDefined();
        });
        
        test('should recover from processing state corruption', async () => {
            // Simulate stuck processing state
            ajaxManager.isProcessing = true;
            
            // Queue a request
            const promise = ajaxManager.saveSettings({ color: 'red' });
            
            // Manually reset processing state
            ajaxManager.isProcessing = false;
            
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            
            // Trigger processing
            ajaxManager.processQueue();
            
            const result = await promise;
            expect(result).toBeDefined();
        });
    });
    
    describe('Performance and Resource Management', () => {
        beforeEach(async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            await ajaxManager.init();
        });
        
        test('should provide accurate statistics', async () => {
            // Make some requests
            await ajaxManager.saveSettings({ setting1: 'value1' });
            await ajaxManager.loadSettings();
            
            // Simulate one failure
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            try {
                await ajaxManager.saveSettings({ setting2: 'value2' });
            } catch (error) {
                // Expected failure
            }
            
            const stats = ajaxManager.getStats();
            
            expect(stats.totalRequests).toBeGreaterThan(0);
            expect(stats.successRate).toBeGreaterThan(0);
            expect(stats.successRate).toBeLessThan(100);
            expect(stats.averageResponseTime).toBeGreaterThan(0);
        });
        
        test('should handle memory cleanup properly', async () => {
            // Fill up history and queue
            for (let i = 0; i < 10; i++) {
                await ajaxManager.saveSettings({ setting: `value${i}` });
            }
            
            // Add some pending requests
            ajaxManager.saveSettings({ pending1: 'value1' });
            ajaxManager.saveSettings({ pending2: 'value2' });
            
            const initialHistoryLength = ajaxManager.requestHistory.length;
            const initialQueueLength = ajaxManager.requestQueue.length;
            
            expect(initialHistoryLength).toBeGreaterThan(0);
            expect(initialQueueLength).toBeGreaterThan(0);
            
            // Cleanup
            ajaxManager.cleanup();
            
            expect(ajaxManager.requestHistory.length).toBe(0);
            expect(ajaxManager.requestQueue.length).toBe(0);
            expect(ajaxManager.isProcessing).toBe(false);
        });
        
        test('should handle high-frequency requests efficiently', async () => {
            const startTime = Date.now();
            const promises = [];
            
            // Queue many requests rapidly
            for (let i = 0; i < 50; i++) {
                promises.push(ajaxManager.saveSettings({ setting: `value${i}` }));
            }
            
            await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Should complete within reasonable time (allowing for sequential processing)
            expect(totalTime).toBeLessThan(10000); // 10 seconds max
            
            // All requests should succeed
            expect(promises).toHaveLength(50);
        });
    });
});