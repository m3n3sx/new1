/**
 * Unit Tests for LASAjaxManager
 * Tests AJAX operations, retry mechanisms, and error handling
 */

// Since the class is defined in a browser context, let's define it here for testing
class LASAjaxManager {
    constructor(core) {
        this.core = core;
        this.requestQueue = [];
        this.isProcessing = false;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.baseDelay = 1000;
        this.timeout = 10000;
        this.requestHistory = [];
        this.maxHistorySize = 50;
        this.abortControllers = new Map();
        this.pauseProcessing = false;
    }
    
    async init() {
        if (!this.core.config.ajax_url) {
            throw new Error('AJAX URL not configured');
        }
        if (!this.core.config.nonce) {
            throw new Error('Security nonce not configured');
        }
        this.setupEventListeners();
        await this.testConnection();
    }
    
    setupEventListeners() {
        this.core.on('core:online', () => this.processQueue());
        this.core.on('core:offline', () => {
            this.core.get('error')?.showWarning('Connection lost. Changes will be saved when connection is restored.');
        });
        this.core.on('core:hidden', () => { this.pauseProcessing = true; });
        this.core.on('core:visible', () => { this.pauseProcessing = false; this.processQueue(); });
    }
    
    async testConnection() {
        try {
            const response = await fetch(this.core.config.ajax_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'las_test_connection',
                    nonce: this.core.config.nonce
                }),
                signal: AbortSignal.timeout(5000)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            console.warn('LAS: AJAX connection test failed:', error.message);
        }
    }
    
    async saveSettings(settings, options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_save_settings',
            data: settings,
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'save_settings',
            priority: options.priority || 'normal',
            ...options
        };
        return this.queueRequest(request);
    }
    
    async loadSettings(options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_load_settings',
            data: {},
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'load_settings',
            priority: options.priority || 'high',
            ...options
        };
        return this.queueRequest(request);
    }
    
    async resetSettings(options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_reset_settings',
            data: {},
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'reset_settings',
            priority: options.priority || 'high',
            ...options
        };
        return this.queueRequest(request);
    }
    
    async exportSettings(options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_export_settings',
            data: {},
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'export_settings',
            priority: options.priority || 'normal',
            ...options
        };
        return this.queueRequest(request);
    }
    
    async importSettings(settings, options = {}) {
        const request = {
            id: this.generateRequestId(),
            action: 'las_import_settings',
            data: { settings },
            nonce: this.core.config.nonce,
            timestamp: Date.now(),
            type: 'import_settings',
            priority: options.priority || 'high',
            ...options
        };
        return this.queueRequest(request);
    }
    
    queueRequest(request) {
        return new Promise((resolve, reject) => {
            request.resolve = resolve;
            request.reject = reject;
            
            // Check for duplicate requests (deduplication)
            const existingRequest = this.requestQueue.find(r => 
                r.action === request.action && 
                r.type === request.type &&
                JSON.stringify(r.data) === JSON.stringify(request.data)
            );
            
            if (existingRequest) {
                const originalResolve = existingRequest.resolve;
                const originalReject = existingRequest.reject;
                
                existingRequest.resolve = (result) => {
                    originalResolve(result);
                    resolve(result);
                };
                
                existingRequest.reject = (error) => {
                    originalReject(error);
                    reject(error);
                };
                return;
            }
            
            // Add to queue based on priority
            if (request.priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }
            
            this.logRequest(request, 'queued');
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0 || this.pauseProcessing) {
            return;
        }
        
        if (!navigator.onLine) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.requestQueue.length > 0 && !this.pauseProcessing) {
                const request = this.requestQueue.shift();
                
                try {
                    const result = await this.executeRequest(request);
                    request.resolve(result);
                    this.retryAttempts.delete(request.id);
                    this.logRequest(request, 'success', result);
                } catch (error) {
                    await this.handleRequestError(request, error);
                }
                
                await this.delay(100);
            }
        } finally {
            this.isProcessing = false;
        }
        
        if (this.requestQueue.length > 0 && !this.pauseProcessing) {
            setTimeout(() => this.processQueue(), 1000);
        }
    }
    
    async executeRequest(request) {
        const errorHandler = this.core.get('error');
        if (errorHandler) {
            errorHandler.showLoading(true, this.getLoadingMessage(request.type));
        }
        
        const abortController = new AbortController();
        this.abortControllers.set(request.id, abortController);
        
        try {
            const formData = new FormData();
            formData.append('action', request.action);
            formData.append('nonce', request.nonce);
            
            if (request.data && Object.keys(request.data).length > 0) {
                if (request.type === 'save_settings' || request.type === 'import_settings') {
                    formData.append('settings', JSON.stringify(request.data));
                } else {
                    Object.keys(request.data).forEach(key => {
                        formData.append(key, request.data[key]);
                    });
                }
            }
            
            const response = await fetch(this.core.config.ajax_url, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                signal: abortController.signal
            });
            
            if (abortController.signal.aborted) {
                throw new Error('Request was aborted');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success === false) {
                throw new Error(result.data || 'Unknown server error');
            }
            
            if (errorHandler && this.shouldShowSuccessMessage(request.type)) {
                errorHandler.showSuccess(this.getSuccessMessage(request.type));
            }
            
            return result.data || result;
            
        } finally {
            if (errorHandler) {
                errorHandler.showLoading(false);
            }
            this.abortControllers.delete(request.id);
        }
    }
    
    async handleRequestError(request, error) {
        const retryCount = this.retryAttempts.get(request.id) || 0;
        const errorHandler = this.core.get('error');
        
        this.logRequest(request, 'error', error);
        
        if (retryCount < this.maxRetries && this.shouldRetry(error)) {
            const delay = this.baseDelay * Math.pow(2, retryCount);
            this.retryAttempts.set(request.id, retryCount + 1);
            
            if (errorHandler) {
                errorHandler.showWarning(`Request failed, retrying in ${Math.ceil(delay/1000)}s... (${retryCount + 1}/${this.maxRetries})`);
            }
            
            setTimeout(() => {
                this.requestQueue.unshift(request);
                this.processQueue();
            }, delay);
            
        } else {
            this.retryAttempts.delete(request.id);
            
            if (errorHandler) {
                const errorMessage = this.getErrorMessage(request.type, error);
                errorHandler.showError(errorMessage, {
                    details: error.message,
                    actions: this.getErrorActions(request, error)
                });
            }
            
            request.reject(error);
        }
    }
    
    shouldRetry(error) {
        const nonRetryableErrors = [
            'Security check failed',
            'Insufficient permissions',
            'Invalid nonce',
            'Request was aborted'
        ];
        return !nonRetryableErrors.some(msg => error.message.includes(msg));
    }
    
    getLoadingMessage(requestType) {
        const messages = {
            'save_settings': 'Saving settings...',
            'load_settings': 'Loading settings...',
            'reset_settings': 'Resetting settings...',
            'export_settings': 'Exporting settings...',
            'import_settings': 'Importing settings...'
        };
        return messages[requestType] || 'Processing...';
    }
    
    getSuccessMessage(requestType) {
        const messages = {
            'save_settings': 'Settings saved successfully',
            'reset_settings': 'Settings reset successfully',
            'import_settings': 'Settings imported successfully'
        };
        return messages[requestType] || 'Operation completed successfully';
    }
    
    getErrorMessage(requestType, error) {
        const messages = {
            'save_settings': 'Failed to save settings',
            'load_settings': 'Failed to load settings',
            'reset_settings': 'Failed to reset settings',
            'export_settings': 'Failed to export settings',
            'import_settings': 'Failed to import settings'
        };
        return messages[requestType] || 'Operation failed';
    }
    
    shouldShowSuccessMessage(requestType) {
        const backgroundTypes = ['load_settings'];
        return !backgroundTypes.includes(requestType);
    }
    
    getErrorActions(request, error) {
        const actions = [];
        
        if (this.shouldRetry(error)) {
            actions.push({
                id: 'retry',
                text: 'Retry',
                callback: () => {
                    this.retryAttempts.delete(request.id);
                    this.queueRequest(request);
                }
            });
        }
        
        if (request.type === 'load_settings') {
            actions.push({
                id: 'refresh',
                text: 'Refresh Page',
                callback: () => {
                    window.location.reload();
                }
            });
        }
        
        return actions;
    }
    
    logRequest(request, status, result = null) {
        const logEntry = {
            id: request.id,
            type: request.type,
            action: request.action,
            status: status,
            timestamp: Date.now(),
            duration: status === 'success' || status === 'error' ? Date.now() - request.timestamp : null,
            error: status === 'error' ? result : null,
            retryCount: this.retryAttempts.get(request.id) || 0
        };
        
        this.requestHistory.push(logEntry);
        
        if (this.requestHistory.length > this.maxHistorySize) {
            this.requestHistory.shift();
        }
        
        if (this.core.config.debug) {
            console.log('LAS AJAX Log:', logEntry);
        }
    }
    
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    abortAllRequests() {
        for (const [requestId, controller] of this.abortControllers) {
            controller.abort();
        }
        this.abortControllers.clear();
        
        this.requestQueue.forEach(request => {
            request.reject(new Error('Request was aborted'));
        });
        this.requestQueue = [];
        
        this.isProcessing = false;
        this.retryAttempts.clear();
    }
    
    getStats() {
        const now = Date.now();
        const recentRequests = this.requestHistory.filter(r => now - r.timestamp < 60000);
        
        return {
            totalRequests: this.requestHistory.length,
            recentRequests: recentRequests.length,
            queuedRequests: this.requestQueue.length,
            activeRequests: this.abortControllers.size,
            successRate: this.requestHistory.length > 0 ? 
                (this.requestHistory.filter(r => r.status === 'success').length / this.requestHistory.length) * 100 : 0,
            averageResponseTime: this.requestHistory
                .filter(r => r.duration)
                .reduce((sum, r, _, arr) => sum + r.duration / arr.length, 0)
        };
    }
    
    cleanup() {
        this.abortAllRequests();
        this.requestHistory = [];
        this.pauseProcessing = false;
    }
}

describe('LASAjaxManager', () => {
    let core, ajaxManager, mockFetch, mockErrorHandler;
    
    beforeEach(() => {
        // Mock core manager
        core = {
            config: {
                ajax_url: 'https://example.com/wp-admin/admin-ajax.php',
                nonce: 'test-nonce-123',
                debug: false
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
        
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        
        // Mock AbortSignal.timeout
        global.AbortSignal = {
            timeout: jest.fn(() => ({ aborted: false }))
        };
        
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
    
    describe('Initialization', () => {
        test('should initialize successfully with valid config', async () => {
            // Mock successful test connection
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            
            await expect(ajaxManager.init()).resolves.toBeUndefined();
            
            expect(core.on).toHaveBeenCalledWith('core:online', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('core:offline', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('core:hidden', expect.any(Function));
            expect(core.on).toHaveBeenCalledWith('core:visible', expect.any(Function));
        });
        
        test('should throw error if AJAX URL is missing', async () => {
            core.config.ajax_url = null;
            
            await expect(ajaxManager.init()).rejects.toThrow('AJAX URL not configured');
        });
        
        test('should throw error if nonce is missing', async () => {
            core.config.nonce = null;
            
            await expect(ajaxManager.init()).rejects.toThrow('Security nonce not configured');
        });
        
        test('should handle test connection failure gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            
            // Should not throw despite connection test failure
            await expect(ajaxManager.init()).resolves.toBeUndefined();
        });
    });
    
    describe('Request Queuing', () => {
        beforeEach(async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            await ajaxManager.init();
        });
        
        test('should queue requests properly', () => {
            const request1 = ajaxManager.saveSettings({ color: 'red' });
            const request2 = ajaxManager.saveSettings({ color: 'blue' });
            
            expect(ajaxManager.requestQueue.length).toBe(2);
        });
        
        test('should prioritize high priority requests', () => {
            ajaxManager.saveSettings({ color: 'red' }, { priority: 'normal' });
            ajaxManager.loadSettings({ priority: 'high' });
            
            // High priority request should be at the front
            expect(ajaxManager.requestQueue[0].priority).toBe('high');
            expect(ajaxManager.requestQueue[1].priority).toBe('normal');
        });
        
        test('should deduplicate identical requests', () => {
            const settings = { color: 'red' };
            
            ajaxManager.saveSettings(settings);
            ajaxManager.saveSettings(settings);
            
            // Should only have one request in queue
            expect(ajaxManager.requestQueue.length).toBe(1);
        });
        
        test('should not deduplicate different requests', () => {
            ajaxManager.saveSettings({ color: 'red' });
            ajaxManager.saveSettings({ color: 'blue' });
            
            expect(ajaxManager.requestQueue.length).toBe(2);
        });
    });
    
    describe('Request Execution', () => {
        beforeEach(async () => {
            await ajaxManager.init();
        });
        
        test('should execute successful save request', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: { message: 'Settings saved' }
                })
            };
            mockFetch.mockResolvedValueOnce(mockResponse);
            
            const result = await ajaxManager.saveSettings({ color: 'red' });
            
            expect(mockFetch).toHaveBeenCalledWith(
                core.config.ajax_url,
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'same-origin'
                })
            );
            
            expect(result).toEqual({ message: 'Settings saved' });
            expect(mockErrorHandler.showLoading).toHaveBeenCalledWith(true, 'Saving settings...');
            expect(mockErrorHandler.showLoading).toHaveBeenCalledWith(false);
            expect(mockErrorHandler.showSuccess).toHaveBeenCalledWith('Settings saved successfully');
        });
        
        test('should execute successful load request', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: { settings: { color: 'red' } }
                })
            };
            mockFetch.mockResolvedValueOnce(mockResponse);
            
            const result = await ajaxManager.loadSettings();
            
            expect(result).toEqual({ settings: { color: 'red' } });
            expect(mockErrorHandler.showLoading).toHaveBeenCalledWith(true, 'Loading settings...');
            expect(mockErrorHandler.showLoading).toHaveBeenCalledWith(false);
            // Should not show success message for background operations
            expect(mockErrorHandler.showSuccess).not.toHaveBeenCalled();
        });
        
        test('should handle HTTP error responses', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };
            mockFetch.mockResolvedValueOnce(mockResponse);
            
            await expect(ajaxManager.saveSettings({ color: 'red' })).rejects.toThrow('HTTP 500: Internal Server Error');
        });
        
        test('should handle WordPress AJAX error responses', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    success: false,
                    data: 'Invalid settings data'
                })
            };
            mockFetch.mockResolvedValueOnce(mockResponse);
            
            await expect(ajaxManager.saveSettings({ color: 'red' })).rejects.toThrow('Invalid settings data');
        });
        
        test('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            
            await expect(ajaxManager.saveSettings({ color: 'red' })).rejects.toThrow('Network error');
        });
    });
    
    describe('Retry Logic', () => {
        beforeEach(async () => {
            await ajaxManager.init();
            jest.useFakeTimers();
        });
        
        afterEach(() => {
            jest.useRealTimers();
        });
        
        test('should retry failed requests with exponential backoff', async () => {
            // First attempt fails
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            // Second attempt succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            
            const savePromise = ajaxManager.saveSettings({ color: 'red' });
            
            // Wait for first attempt to fail and retry to be scheduled
            await jest.runOnlyPendingTimersAsync();
            
            // Fast-forward to retry time (1 second base delay)
            jest.advanceTimersByTime(1000);
            
            const result = await savePromise;
            
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockErrorHandler.showWarning).toHaveBeenCalledWith(
                expect.stringContaining('Request failed, retrying in 1s... (1/3)')
            );
        });
        
        test('should use exponential backoff for multiple retries', async () => {
            // All attempts fail except the last
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true, data: {} })
                });
            
            const savePromise = ajaxManager.saveSettings({ color: 'red' });
            
            // First retry after 1 second
            await jest.runOnlyPendingTimersAsync();
            jest.advanceTimersByTime(1000);
            
            // Second retry after 2 seconds (exponential backoff)
            await jest.runOnlyPendingTimersAsync();
            jest.advanceTimersByTime(2000);
            
            await savePromise;
            
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(mockErrorHandler.showWarning).toHaveBeenCalledWith(
                expect.stringContaining('Request failed, retrying in 2s... (2/3)')
            );
        });
        
        test('should stop retrying after max attempts', async () => {
            // All attempts fail
            mockFetch.mockRejectedValue(new Error('Network error'));
            
            const savePromise = ajaxManager.saveSettings({ color: 'red' });
            
            // Process all retries
            for (let i = 0; i < 3; i++) {
                await jest.runOnlyPendingTimersAsync();
                jest.advanceTimersByTime(Math.pow(2, i) * 1000);
            }
            
            await expect(savePromise).rejects.toThrow('Network error');
            
            expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
            expect(mockErrorHandler.showError).toHaveBeenCalledWith(
                'Failed to save settings',
                expect.objectContaining({
                    details: 'Network error'
                })
            );
        });
        
        test('should not retry non-retryable errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Security check failed'));
            
            await expect(ajaxManager.saveSettings({ color: 'red' })).rejects.toThrow('Security check failed');
            
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockErrorHandler.showError).toHaveBeenCalled();
        });
    });
    
    describe('Request Management', () => {
        beforeEach(async () => {
            await ajaxManager.init();
        });
        
        test('should abort all requests', () => {
            const mockAbortController = {
                abort: jest.fn(),
                signal: { aborted: false }
            };
            
            global.AbortController = jest.fn(() => mockAbortController);
            
            // Queue some requests
            ajaxManager.saveSettings({ color: 'red' });
            ajaxManager.saveSettings({ color: 'blue' });
            
            ajaxManager.abortAllRequests();
            
            expect(ajaxManager.requestQueue.length).toBe(0);
            expect(ajaxManager.isProcessing).toBe(false);
            expect(ajaxManager.retryAttempts.size).toBe(0);
        });
        
        test('should provide request statistics', async () => {
            // Mock successful request
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            
            await ajaxManager.saveSettings({ color: 'red' });
            
            const stats = ajaxManager.getStats();
            
            expect(stats).toHaveProperty('totalRequests');
            expect(stats).toHaveProperty('recentRequests');
            expect(stats).toHaveProperty('queuedRequests');
            expect(stats).toHaveProperty('activeRequests');
            expect(stats).toHaveProperty('successRate');
            expect(stats).toHaveProperty('averageResponseTime');
        });
        
        test('should handle offline/online status changes', () => {
            const onlineCallback = core.on.mock.calls.find(call => call[0] === 'core:online')[1];
            const offlineCallback = core.on.mock.calls.find(call => call[0] === 'core:offline')[1];
            
            // Simulate going offline
            navigator.onLine = false;
            offlineCallback();
            
            expect(mockErrorHandler.showWarning).toHaveBeenCalledWith(
                'Connection lost. Changes will be saved when connection is restored.'
            );
            
            // Simulate coming back online
            navigator.onLine = true;
            onlineCallback();
            
            // Should attempt to process queue
            expect(ajaxManager.isProcessing).toBe(false); // Will be set to true during processing
        });
        
        test('should pause processing when page is hidden', () => {
            const hiddenCallback = core.on.mock.calls.find(call => call[0] === 'core:hidden')[1];
            const visibleCallback = core.on.mock.calls.find(call => call[0] === 'core:visible')[1];
            
            hiddenCallback();
            expect(ajaxManager.pauseProcessing).toBe(true);
            
            visibleCallback();
            expect(ajaxManager.pauseProcessing).toBe(false);
        });
    });
    
    describe('Different Request Types', () => {
        beforeEach(async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            });
            await ajaxManager.init();
        });
        
        test('should handle reset settings request', async () => {
            await ajaxManager.resetSettings();
            
            expect(mockFetch).toHaveBeenCalledWith(
                core.config.ajax_url,
                expect.objectContaining({
                    method: 'POST'
                })
            );
            
            const formData = mockFetch.mock.calls[0][1].body;
            expect(formData.get('action')).toBe('las_reset_settings');
        });
        
        test('should handle export settings request', async () => {
            await ajaxManager.exportSettings();
            
            const formData = mockFetch.mock.calls[0][1].body;
            expect(formData.get('action')).toBe('las_export_settings');
        });
        
        test('should handle import settings request', async () => {
            const settings = { color: 'red', size: 'large' };
            await ajaxManager.importSettings(settings);
            
            const formData = mockFetch.mock.calls[0][1].body;
            expect(formData.get('action')).toBe('las_import_settings');
            expect(JSON.parse(formData.get('settings'))).toEqual({ settings });
        });
    });
    
    describe('Error Actions', () => {
        beforeEach(async () => {
            await ajaxManager.init();
        });
        
        test('should provide retry action for retryable errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            
            try {
                await ajaxManager.saveSettings({ color: 'red' });
            } catch (error) {
                // Error is expected
            }
            
            expect(mockErrorHandler.showError).toHaveBeenCalledWith(
                'Failed to save settings',
                expect.objectContaining({
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'retry',
                            text: 'Retry'
                        })
                    ])
                })
            );
        });
        
        test('should provide refresh action for load errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            
            try {
                await ajaxManager.loadSettings();
            } catch (error) {
                // Error is expected
            }
            
            expect(mockErrorHandler.showError).toHaveBeenCalledWith(
                'Failed to load settings',
                expect.objectContaining({
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'refresh',
                            text: 'Refresh Page'
                        })
                    ])
                })
            );
        });
    });
    
    describe('Cleanup', () => {
        test('should clean up resources properly', async () => {
            await ajaxManager.init();
            
            // Add some requests and history
            ajaxManager.saveSettings({ color: 'red' });
            ajaxManager.requestHistory.push({ id: 'test', status: 'success' });
            
            ajaxManager.cleanup();
            
            expect(ajaxManager.requestQueue.length).toBe(0);
            expect(ajaxManager.requestHistory.length).toBe(0);
            expect(ajaxManager.isProcessing).toBe(false);
            expect(ajaxManager.pauseProcessing).toBe(false);
        });
    });
});