/**
 * JavaScript test suite for live preview functionality
 * Tests LivePreviewManager and related functionality
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

// Mock jQuery and WordPress AJAX data for testing
if (typeof jQuery === 'undefined') {
    global.jQuery = require('jquery');
    global.$ = global.jQuery;
}

// Mock WordPress AJAX data
global.lasAdminData = {
    ajaxurl: '/wp-admin/admin-ajax.php',
    nonce: 'test_nonce_12345'
};

// Mock document for DOM testing
global.document = {
    head: {
        appendChild: jest.fn()
    },
    createElement: jest.fn(() => ({
        id: '',
        type: 'text/css',
        innerHTML: ''
    })),
    getElementById: jest.fn(),
    hidden: false,
    addEventListener: jest.fn()
};

// Mock window
global.window = {
    location: {
        href: 'http://test.com/wp-admin/admin.php?page=las-settings'
    },
    addEventListener: jest.fn()
};

// Mock console methods
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
};

describe('LivePreviewManager', () => {
    let LivePreviewManager;
    let mockAjaxResponse;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock jQuery
        global.$ = jest.fn((selector) => {
            const mockElement = {
                addClass: jest.fn(),
                removeClass: jest.fn(),
                closest: jest.fn(() => ({
                    addClass: jest.fn(),
                    removeClass: jest.fn(),
                    find: jest.fn(() => ({
                        remove: jest.fn()
                    })),
                    append: jest.fn()
                })),
                find: jest.fn(() => ({
                    remove: jest.fn()
                })),
                fadeOut: jest.fn((callback) => {
                    if (callback) callback();
                    return { remove: jest.fn() };
                }),
                length: 1
            };
            return mockElement;
        });
        
        // Mock AJAX
        mockAjaxResponse = {
            success: true,
            data: {
                css: 'body { background-color: #ffffff; }',
                performance: {
                    execution_time_ms: 150,
                    memory_usage: 1024000,
                    cache_recommended: false
                }
            }
        };
        
        global.$.ajax = jest.fn(() => ({
            done: jest.fn((callback) => {
                callback(mockAjaxResponse);
                return { fail: jest.fn() };
            }),
            fail: jest.fn()
        }));
        
        // Mock ErrorManager
        global.ErrorManager = {
            showError: jest.fn(),
            showWarning: jest.fn(),
            showSuccess: jest.fn(),
            showInfo: jest.fn()
        };
        
        // Initialize LivePreviewManager (simplified version for testing)
        LivePreviewManager = {
            debounceTimer: null,
            debounceDelay: 150,
            ajaxQueue: [],
            isProcessingQueue: false,
            tempStyleElement: null,
            errorCount: 0,
            maxErrors: 5,
            lastOperation: null,
            retryCount: 0,
            maxRetries: 3,
            cssCache: new Map(),
            cacheMaxSize: 50,
            cacheExpiryTime: 300000,
            cacheHits: 0,
            cacheMisses: 0,
            
            init: function() {
                this.createTempStyleElement();
                this.cssCache = new Map();
                return this;
            },
            
            createTempStyleElement: function() {
                this.tempStyleElement = document.createElement('style');
                this.tempStyleElement.id = 'las-temp-preview-style';
                this.tempStyleElement.type = 'text/css';
                document.head.appendChild(this.tempStyleElement);
            },
            
            handleFieldChange: function(setting, value) {
                if (typeof setting !== 'string' || setting.trim() === '') {
                    console.warn('Invalid setting parameter:', setting);
                    return;
                }
                
                this.lastOperation = { setting: setting, value: value };
                this.retryCount = 0;
                
                this.applyTemporaryStyles(setting, value);
                this.showLoadingState(setting);
                
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.requestFullUpdate(setting, value);
                }, this.debounceDelay);
            },
            
            hasValueChanged: function(previousValue, newValue) {
                if (typeof newValue === 'object' && newValue !== null && previousValue !== undefined) {
                    try {
                        return JSON.stringify(previousValue) !== JSON.stringify(newValue);
                    } catch (jsonError) {
                        return true;
                    }
                }
                return previousValue !== newValue;
            },
            
            applyTemporaryStyles: function(setting, value) {
                const tempCSS = this.generateTemporaryCSS(setting, value);
                if (tempCSS && this.tempStyleElement) {
                    this.tempStyleElement.innerHTML = tempCSS;
                }
            },
            
            generateTemporaryCSS: function(setting, value) {
                let css = '';
                
                switch (setting) {
                    case 'admin_menu_bg_color':
                        css = '#adminmenu { background-color: ' + value + ' !important; }';
                        break;
                    case 'admin_menu_text_color':
                        css = '#adminmenu a { color: ' + value + ' !important; }';
                        break;
                    case 'admin_bar_bg_color':
                        css = '#wpadminbar { background-color: ' + value + ' !important; }';
                        break;
                    case 'admin_bar_text_color':
                        css = '#wpadminbar .ab-item { color: ' + value + ' !important; }';
                        break;
                    case 'admin_menu_width':
                        css = '#adminmenu { width: ' + value + 'px !important; }';
                        css += '#wpcontent, #wpfooter { margin-left: ' + value + 'px !important; }';
                        break;
                    case 'admin_bar_height':
                        css = '#wpadminbar { height: ' + value + 'px !important; }';
                        break;
                    default:
                        return '';
                }
                
                return css;
            },
            
            requestFullUpdate: function(setting, value) {
                const cacheKey = this.generateCacheKey(setting, value);
                const cachedResult = this.getCachedCSS(cacheKey);
                
                if (cachedResult) {
                    this.cacheHits++;
                    this.applyFullStyles(cachedResult.css);
                    this.clearTemporaryStyles();
                    this.showSuccessState(setting);
                    this.hideLoadingState(setting);
                    return;
                }
                
                this.cacheMisses++;
                this.ajaxQueue.push({ setting: setting, value: value, cacheKey: cacheKey });
                
                if (!this.isProcessingQueue) {
                    this.processAjaxQueue();
                }
            },
            
            generateCacheKey: function(setting, value) {
                const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return setting + ':' + btoa(valueStr).substring(0, 20);
            },
            
            getCachedCSS: function(cacheKey) {
                const cached = this.cssCache.get(cacheKey);
                if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryTime) {
                    return cached;
                }
                
                if (cached) {
                    this.cssCache.delete(cacheKey);
                }
                
                return null;
            },
            
            setCachedCSS: function(cacheKey, css) {
                if (this.cssCache.size >= this.cacheMaxSize) {
                    const firstKey = this.cssCache.keys().next().value;
                    this.cssCache.delete(firstKey);
                }
                
                this.cssCache.set(cacheKey, {
                    css: css,
                    timestamp: Date.now()
                });
            },
            
            cleanupExpiredCache: function() {
                const now = Date.now();
                const expiredKeys = [];
                
                this.cssCache.forEach((value, key) => {
                    if ((now - value.timestamp) > this.cacheExpiryTime) {
                        expiredKeys.push(key);
                    }
                });
                
                expiredKeys.forEach(key => {
                    this.cssCache.delete(key);
                });
                
                return expiredKeys.length;
            },
            
            processAjaxQueue: function() {
                if (this.ajaxQueue.length === 0) {
                    this.isProcessingQueue = false;
                    return;
                }
                
                this.isProcessingQueue = true;
                
                const queueItem = this.ajaxQueue.pop();
                this.ajaxQueue = [];
                
                this.performAjaxRequest(queueItem.setting, queueItem.value, queueItem.cacheKey)
                    .always(() => {
                        setTimeout(() => {
                            this.processAjaxQueue();
                        }, 50);
                    });
            },
            
            performAjaxRequest: function(setting, value, cacheKey) {
                if (!this.validateAjaxData()) {
                    return $.Deferred().reject('Invalid AJAX data').promise();
                }
                
                return $.ajax({
                    url: lasAdminData.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'las_get_preview_css',
                        nonce: lasAdminData.nonce,
                        setting: setting,
                        value: value
                    },
                    dataType: 'json',
                    timeout: 8000
                })
                .done((response) => {
                    this.handleAjaxSuccess(response, setting, cacheKey);
                })
                .fail((jqXHR, textStatus, errorThrown) => {
                    this.handleAjaxError(jqXHR, textStatus, errorThrown, setting);
                });
            },
            
            validateAjaxData: function() {
                if (typeof lasAdminData === 'undefined' || !lasAdminData || typeof lasAdminData !== 'object') {
                    this.handleError('lasAdminData is not defined or not an object');
                    return false;
                }
                
                if (!lasAdminData.ajaxurl || typeof lasAdminData.ajaxurl !== 'string') {
                    this.handleError('lasAdminData.ajaxurl is missing or invalid');
                    return false;
                }
                
                if (!lasAdminData.nonce || typeof lasAdminData.nonce !== 'string') {
                    this.handleError('lasAdminData.nonce is missing or invalid');
                    return false;
                }
                
                return true;
            },
            
            handleAjaxSuccess: function(response, setting, cacheKey) {
                this.hideLoadingState(setting);
                
                if (!response || typeof response !== 'object') {
                    this.handleError('Invalid response format - not an object', response);
                    return;
                }
                
                if (typeof response.success === 'undefined') {
                    this.handleError('Response missing success property', response);
                    return;
                }
                
                if (response.success && typeof response.data !== 'undefined') {
                    let cssData = response.data;
                    if (typeof response.data === 'object' && response.data.css) {
                        cssData = response.data.css;
                        
                        if (response.data.performance) {
                            console.log('Performance metrics:', response.data.performance);
                            
                            if (response.data.performance.execution_time_ms > 1000) {
                                if (window.ErrorManager) {
                                    window.ErrorManager.showWarning('Slow preview generation: ' + response.data.performance.execution_time_ms + 'ms');
                                }
                            }
                        }
                    }
                    
                    if (cacheKey && cssData) {
                        this.setCachedCSS(cacheKey, cssData);
                    }
                    
                    this.applyFullStyles(cssData);
                    this.clearTemporaryStyles();
                    this.showSuccessState(setting);
                    
                    this.errorCount = 0;
                    this.retryCount = 0;
                    
                } else if (response.data && response.data.message) {
                    const errorMsg = 'Server returned error: ' + response.data.message;
                    if (response.data.code) {
                        errorMsg += ' (Code: ' + response.data.code + ')';
                    }
                    this.handleError(errorMsg);
                } else {
                    this.handleError('Server responded with success:false', response);
                }
            },
            
            handleAjaxError: function(jqXHR, textStatus, errorThrown, setting) {
                this.hideLoadingState(setting);
                this.showErrorState(setting);
                
                this.errorCount++;
                
                let errorMessage = 'AJAX error for setting "' + setting + '". Status: ' + textStatus + ', Error: ' + errorThrown;
                
                if (textStatus === 'timeout') {
                    errorMessage += ' (Request timed out - server may be overloaded)';
                } else if (textStatus === 'parsererror') {
                    errorMessage += ' (Received non-JSON response)';
                } else if (jqXHR.status === 0) {
                    errorMessage += ' (Network error or CORS issue)';
                } else if (jqXHR.status >= 500) {
                    errorMessage += ' (Server error 5xx)';
                } else if (jqXHR.status >= 400) {
                    errorMessage += ' (Client error 4xx)';
                }
                
                this.handleError(errorMessage);
                
                if (this.errorCount >= this.maxErrors) {
                    console.warn('Too many errors, temporarily disabling live preview');
                    this.temporarilyDisable();
                }
            },
            
            applyFullStyles: function(cssData) {
                const existingStaticStyle = document.getElementById('las-fresh-dynamic-admin-styles');
                if (existingStaticStyle && existingStaticStyle.parentNode) {
                    existingStaticStyle.parentNode.removeChild(existingStaticStyle);
                }
                
                const styleId = 'las-live-preview-style';
                let styleEl = document.getElementById(styleId);
                
                if (!styleEl) {
                    if (!document.head) {
                        throw new Error('document.head is not available');
                    }
                    
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    styleEl.type = 'text/css';
                    document.head.appendChild(styleEl);
                }
                
                styleEl.innerHTML = typeof cssData === 'string' ? cssData : String(cssData || '');
            },
            
            clearTemporaryStyles: function() {
                if (this.tempStyleElement) {
                    this.tempStyleElement.innerHTML = '';
                }
            },
            
            handleError: function(message, error) {
                console.error('LivePreviewManager: ' + message, error || '');
                
                if (window.ErrorManager && typeof window.ErrorManager.showError === 'function') {
                    const userMessage = this.getUserFriendlyErrorMessage(message);
                    window.ErrorManager.showError(userMessage);
                }
            },
            
            getUserFriendlyErrorMessage: function(technicalMessage) {
                const friendlyMessages = {
                    'Invalid response format': 'Received invalid response from server',
                    'Response missing success property': 'Server returned incomplete response',
                    'Server returned error': 'Server reported an error during processing',
                    'AJAX error': 'Communication error with server',
                    'timeout': 'Request timed out',
                    'parsererror': 'Error processing server response',
                    'Network error': 'Network connection error'
                };
                
                for (const key in friendlyMessages) {
                    if (technicalMessage.toLowerCase().includes(key.toLowerCase())) {
                        return friendlyMessages[key];
                    }
                }
                
                return 'An unexpected error occurred during live preview';
            },
            
            temporarilyDisable: function() {
                clearTimeout(this.debounceTimer);
                
                setTimeout(() => {
                    this.errorCount = 0;
                    console.log('Live preview re-enabled after temporary disable');
                }, 30000);
            },
            
            showLoadingState: function(setting) {
                const fieldSelector = '[name*="[' + setting + ']"]';
                const $field = $(fieldSelector);
                
                if ($field.length) {
                    $field.addClass('las-field-loading');
                    $field.closest('.field-row').addClass('las-loading');
                }
            },
            
            hideLoadingState: function(setting) {
                const fieldSelector = '[name*="[' + setting + ']"]';
                const $field = $(fieldSelector);
                
                if ($field.length) {
                    $field.removeClass('las-field-loading');
                    $field.closest('.field-row').removeClass('las-loading');
                }
            },
            
            showSuccessState: function(setting) {
                const fieldSelector = '[name*="[' + setting + ']"]';
                const $field = $(fieldSelector);
                const $fieldRow = $field.closest('.field-row');
                
                if ($fieldRow.length) {
                    $fieldRow.removeClass('las-field-error las-field-loading');
                    $fieldRow.addClass('las-field-success');
                    
                    setTimeout(() => {
                        $fieldRow.removeClass('las-field-success');
                    }, 2000);
                    
                    $fieldRow.find('.las-inline-error').remove();
                }
            },
            
            showErrorState: function(setting, errorMessage) {
                const fieldSelector = '[name*="[' + setting + ']"]';
                const $field = $(fieldSelector);
                const $fieldRow = $field.closest('.field-row');
                
                if ($fieldRow.length) {
                    $fieldRow.removeClass('las-field-success las-field-loading');
                    $fieldRow.addClass('las-field-error');
                    
                    if (errorMessage) {
                        $fieldRow.find('.las-inline-error').remove();
                        const $errorMsg = $('<div class="las-inline-error">' + errorMessage + '</div>');
                        $fieldRow.append($errorMsg);
                        
                        setTimeout(() => {
                            $errorMsg.fadeOut(() => {
                                $errorMsg.remove();
                                $fieldRow.removeClass('las-field-error');
                            });
                        }, 10000);
                    }
                }
            },
            
            retryLastOperation: function() {
                if (this.lastOperation && this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log('Retrying operation (attempt ' + this.retryCount + '):', this.lastOperation);
                    this.handleFieldChange(this.lastOperation.setting, this.lastOperation.value);
                    return true;
                }
                return false;
            },
            
            updateDebounceDelay: function(delay) {
                this.debounceDelay = Math.max(50, Math.min(1000, delay));
                console.log('Debounce delay updated to:', this.debounceDelay + 'ms');
            },
            
            clearCache: function() {
                this.cssCache.clear();
                this.cacheHits = 0;
                this.cacheMisses = 0;
                console.log('CSS cache cleared');
            },
            
            getCacheStats: function() {
                return {
                    size: this.cssCache.size,
                    hits: this.cacheHits,
                    misses: this.cacheMisses,
                    hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
                };
            },
            
            cleanup: function() {
                clearTimeout(this.debounceTimer);
                this.clearCache();
                if (this.tempStyleElement && this.tempStyleElement.parentNode) {
                    this.tempStyleElement.parentNode.removeChild(this.tempStyleElement);
                }
            }
        };
        
        LivePreviewManager.init();
    });
    
    afterEach(() => {
        if (LivePreviewManager && LivePreviewManager.cleanup) {
            LivePreviewManager.cleanup();
        }
    });

    test('should initialize with correct default values', () => {
        expect(LivePreviewManager.debounceDelay).toBe(150);
        expect(LivePreviewManager.maxErrors).toBe(5);
        expect(LivePreviewManager.maxRetries).toBe(3);
        expect(LivePreviewManager.cacheMaxSize).toBe(50);
        expect(LivePreviewManager.cssCache).toBeInstanceOf(Map);
        expect(LivePreviewManager.tempStyleElement).toBeDefined();
    });

    test('should validate AJAX data correctly', () => {
        expect(LivePreviewManager.validateAjaxData()).toBe(true);
        
        // Test with missing ajaxurl
        const originalAjaxUrl = lasAdminData.ajaxurl;
        delete lasAdminData.ajaxurl;
        expect(LivePreviewManager.validateAjaxData()).toBe(false);
        lasAdminData.ajaxurl = originalAjaxUrl;
        
        // Test with missing nonce
        const originalNonce = lasAdminData.nonce;
        delete lasAdminData.nonce;
        expect(LivePreviewManager.validateAjaxData()).toBe(false);
        lasAdminData.nonce = originalNonce;
    });

    test('should handle field changes with debouncing', (done) => {
        const setting = 'admin_menu_bg_color';
        const value = '#ff0000';
        
        LivePreviewManager.handleFieldChange(setting, value);
        
        expect(LivePreviewManager.lastOperation).toEqual({ setting, value });
        expect(LivePreviewManager.retryCount).toBe(0);
        
        // Should apply temporary styles immediately
        expect(LivePreviewManager.tempStyleElement.innerHTML).toContain('#adminmenu');
        expect(LivePreviewManager.tempStyleElement.innerHTML).toContain('#ff0000');
        
        // Should debounce AJAX request
        expect(LivePreviewManager.debounceTimer).toBeDefined();
        
        setTimeout(() => {
            expect($.ajax).toHaveBeenCalled();
            done();
        }, 200);
    });

    test('should generate temporary CSS for common settings', () => {
        const testCases = [
            {
                setting: 'admin_menu_bg_color',
                value: '#ff0000',
                expected: '#adminmenu { background-color: #ff0000 !important; }'
            },
            {
                setting: 'admin_menu_text_color',
                value: '#ffffff',
                expected: '#adminmenu a { color: #ffffff !important; }'
            },
            {
                setting: 'admin_bar_bg_color',
                value: '#333333',
                expected: '#wpadminbar { background-color: #333333 !important; }'
            },
            {
                setting: 'admin_menu_width',
                value: '250',
                expected: '#adminmenu { width: 250px !important; }#wpcontent, #wpfooter { margin-left: 250px !important; }'
            }
        ];
        
        testCases.forEach(testCase => {
            const result = LivePreviewManager.generateTemporaryCSS(testCase.setting, testCase.value);
            expect(result).toBe(testCase.expected);
        });
        
        // Test unknown setting
        const unknownResult = LivePreviewManager.generateTemporaryCSS('unknown_setting', 'value');
        expect(unknownResult).toBe('');
    });

    test('should detect value changes correctly', () => {
        // Test primitive values
        expect(LivePreviewManager.hasValueChanged('old', 'new')).toBe(true);
        expect(LivePreviewManager.hasValueChanged('same', 'same')).toBe(false);
        expect(LivePreviewManager.hasValueChanged(undefined, 'new')).toBe(true);
        
        // Test object values
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        const obj3 = { a: 1, b: 3 };
        
        expect(LivePreviewManager.hasValueChanged(obj1, obj2)).toBe(false);
        expect(LivePreviewManager.hasValueChanged(obj1, obj3)).toBe(true);
    });

    test('should manage CSS cache correctly', () => {
        const cacheKey = 'test_key';
        const cssData = 'body { color: red; }';
        
        // Test cache miss
        expect(LivePreviewManager.getCachedCSS(cacheKey)).toBeNull();
        
        // Test cache set and hit
        LivePreviewManager.setCachedCSS(cacheKey, cssData);
        const cached = LivePreviewManager.getCachedCSS(cacheKey);
        expect(cached).toBeDefined();
        expect(cached.css).toBe(cssData);
        expect(cached.timestamp).toBeDefined();
        
        // Test cache expiry
        const expiredKey = 'expired_key';
        LivePreviewManager.setCachedCSS(expiredKey, cssData);
        
        // Manually set old timestamp
        const cachedItem = LivePreviewManager.cssCache.get(expiredKey);
        cachedItem.timestamp = Date.now() - LivePreviewManager.cacheExpiryTime - 1000;
        LivePreviewManager.cssCache.set(expiredKey, cachedItem);
        
        expect(LivePreviewManager.getCachedCSS(expiredKey)).toBeNull();
    });

    test('should clean up expired cache entries', () => {
        // Add some cache entries
        LivePreviewManager.setCachedCSS('key1', 'css1');
        LivePreviewManager.setCachedCSS('key2', 'css2');
        LivePreviewManager.setCachedCSS('key3', 'css3');
        
        expect(LivePreviewManager.cssCache.size).toBe(3);
        
        // Make some entries expired
        const expiredKeys = ['key1', 'key2'];
        expiredKeys.forEach(key => {
            const cachedItem = LivePreviewManager.cssCache.get(key);
            cachedItem.timestamp = Date.now() - LivePreviewManager.cacheExpiryTime - 1000;
            LivePreviewManager.cssCache.set(key, cachedItem);
        });
        
        const cleanedCount = LivePreviewManager.cleanupExpiredCache();
        expect(cleanedCount).toBe(2);
        expect(LivePreviewManager.cssCache.size).toBe(1);
        expect(LivePreviewManager.cssCache.has('key3')).toBe(true);
    });

    test('should enforce cache size limit', () => {
        const originalMaxSize = LivePreviewManager.cacheMaxSize;
        LivePreviewManager.cacheMaxSize = 3;
        
        // Add entries up to the limit
        for (let i = 1; i <= 5; i++) {
            LivePreviewManager.setCachedCSS(`key${i}`, `css${i}`);
        }
        
        // Should not exceed max size
        expect(LivePreviewManager.cssCache.size).toBeLessThanOrEqual(3);
        
        // Restore original max size
        LivePreviewManager.cacheMaxSize = originalMaxSize;
    });

    test('should generate cache keys correctly', () => {
        const key1 = LivePreviewManager.generateCacheKey('setting1', 'value1');
        const key2 = LivePreviewManager.generateCacheKey('setting1', 'value2');
        const key3 = LivePreviewManager.generateCacheKey('setting2', 'value1');
        
        expect(key1).toBeDefined();
        expect(key1).not.toBe(key2);
        expect(key1).not.toBe(key3);
        expect(key2).not.toBe(key3);
        
        // Test with object values
        const objKey1 = LivePreviewManager.generateCacheKey('setting', { a: 1, b: 2 });
        const objKey2 = LivePreviewManager.generateCacheKey('setting', { a: 1, b: 3 });
        expect(objKey1).not.toBe(objKey2);
    });

    test('should handle AJAX success responses correctly', () => {
        const setting = 'admin_menu_bg_color';
        const cacheKey = 'test_cache_key';
        
        // Test successful response with CSS data
        const successResponse = {
            success: true,
            data: {
                css: 'body { background: red; }',
                performance: { execution_time_ms: 100 }
            }
        };
        
        LivePreviewManager.handleAjaxSuccess(successResponse, setting, cacheKey);
        
        expect(LivePreviewManager.setCachedCSS).toHaveBeenCalledWith(cacheKey, 'body { background: red; }');
        expect(LivePreviewManager.errorCount).toBe(0);
        expect(LivePreviewManager.retryCount).toBe(0);
    });

    test('should handle AJAX error responses correctly', () => {
        const setting = 'admin_menu_bg_color';
        
        LivePreviewManager.handleAjaxError({ status: 500 }, 'error', 'Internal Server Error', setting);
        
        expect(LivePreviewManager.errorCount).toBe(1);
        expect(LivePreviewManager.handleError).toHaveBeenCalled();
    });

    test('should retry operations correctly', () => {
        const setting = 'admin_menu_bg_color';
        const value = '#ff0000';
        
        LivePreviewManager.lastOperation = { setting, value };
        LivePreviewManager.retryCount = 0;
        
        const result = LivePreviewManager.retryLastOperation();
        
        expect(result).toBe(true);
        expect(LivePreviewManager.retryCount).toBe(1);
        expect(LivePreviewManager.handleFieldChange).toHaveBeenCalledWith(setting, value);
    });

    test('should not retry beyond maximum attempts', () => {
        const setting = 'admin_menu_bg_color';
        const value = '#ff0000';
        
        LivePreviewManager.lastOperation = { setting, value };
        LivePreviewManager.retryCount = LivePreviewManager.maxRetries;
        
        const result = LivePreviewManager.retryLastOperation();
        
        expect(result).toBe(false);
    });

    test('should update debounce delay within valid range', () => {
        LivePreviewManager.updateDebounceDelay(200);
        expect(LivePreviewManager.debounceDelay).toBe(200);
        
        // Test minimum boundary
        LivePreviewManager.updateDebounceDelay(10);
        expect(LivePreviewManager.debounceDelay).toBe(50);
        
        // Test maximum boundary
        LivePreviewManager.updateDebounceDelay(2000);
        expect(LivePreviewManager.debounceDelay).toBe(1000);
    });

    test('should provide cache statistics', () => {
        LivePreviewManager.cacheHits = 10;
        LivePreviewManager.cacheMisses = 5;
        
        const stats = LivePreviewManager.getCacheStats();
        
        expect(stats.hits).toBe(10);
        expect(stats.misses).toBe(5);
        expect(stats.hitRate).toBeCloseTo(0.667, 3);
        expect(stats.size).toBeDefined();
    });

    test('should handle network errors gracefully', () => {
        const setting = 'admin_menu_bg_color';
        
        // Test timeout error
        LivePreviewManager.handleAjaxError({ status: 0 }, 'timeout', '', setting);
        expect(LivePreviewManager.handleError).toHaveBeenCalledWith(
            expect.stringContaining('timeout')
        );
        
        // Test network error
        LivePreviewManager.handleAjaxError({ status: 0 }, 'error', 'Network Error', setting);
        expect(LivePreviewManager.handleError).toHaveBeenCalledWith(
            expect.stringContaining('Network error')
        );
    });

    test('should temporarily disable after too many errors', () => {
        const setting = 'admin_menu_bg_color';
        
        // Trigger maximum errors
        for (let i = 0; i < LivePreviewManager.maxErrors; i++) {
            LivePreviewManager.handleAjaxError({ status: 500 }, 'error', 'Server Error', setting);
        }
        
        expect(LivePreviewManager.errorCount).toBe(LivePreviewManager.maxErrors);
        expect(LivePreviewManager.temporarilyDisable).toHaveBeenCalled();
    });

    test('should apply full styles correctly', () => {
        const cssData = 'body { background: blue; }';
        
        // Mock existing style element
        const existingStyle = { parentNode: { removeChild: jest.fn() } };
        document.getElementById.mockReturnValueOnce(existingStyle);
        
        // Mock new style element creation
        const newStyle = { id: '', type: '', innerHTML: '' };
        document.createElement.mockReturnValueOnce(newStyle);
        document.getElementById.mockReturnValueOnce(null); // For new element check
        
        LivePreviewManager.applyFullStyles(cssData);
        
        expect(existingStyle.parentNode.removeChild).toHaveBeenCalledWith(existingStyle);
        expect(document.createElement).toHaveBeenCalledWith('style');
        expect(newStyle.innerHTML).toBe(cssData);
    });

    test('should show and hide loading states correctly', () => {
        const setting = 'admin_menu_bg_color';
        const mockField = global.testUtils.createMockElement();
        const mockFieldRow = global.testUtils.createMockElement();
        
        global.$.mockReturnValue(mockField);
        mockField.closest.mockReturnValue(mockFieldRow);
        
        LivePreviewManager.showLoadingState(setting);
        
        expect(mockField.addClass).toHaveBeenCalledWith('las-field-loading');
        expect(mockFieldRow.addClass).toHaveBeenCalledWith('las-loading');
        
        LivePreviewManager.hideLoadingState(setting);
        
        expect(mockField.removeClass).toHaveBeenCalledWith('las-field-loading');
        expect(mockFieldRow.removeClass).toHaveBeenCalledWith('las-loading');
    });

    test('should show success and error states correctly', () => {
        const setting = 'admin_menu_bg_color';
        const mockField = global.testUtils.createMockElement();
        const mockFieldRow = global.testUtils.createMockElement();
        
        global.$.mockReturnValue(mockField);
        mockField.closest.mockReturnValue(mockFieldRow);
        
        LivePreviewManager.showSuccessState(setting);
        
        expect(mockFieldRow.removeClass).toHaveBeenCalledWith('las-field-error las-field-loading');
        expect(mockFieldRow.addClass).toHaveBeenCalledWith('las-field-success');
        
        const errorMessage = 'Test error';
        LivePreviewManager.showErrorState(setting, errorMessage);
        
        expect(mockFieldRow.removeClass).toHaveBeenCalledWith('las-field-success las-field-loading');
        expect(mockFieldRow.addClass).toHaveBeenCalledWith('las-field-error');
    });

    test('should process AJAX queue correctly', () => {
        const queueItem = {
            setting: 'admin_menu_bg_color',
            value: '#ff0000',
            cacheKey: 'test_key'
        };
        
        LivePreviewManager.ajaxQueue = [queueItem];
        LivePreviewManager.isProcessingQueue = false;
        
        LivePreviewManager.processAjaxQueue();
        
        expect(LivePreviewManager.isProcessingQueue).toBe(true);
        expect(LivePreviewManager.performAjaxRequest).toHaveBeenCalledWith(
            queueItem.setting,
            queueItem.value,
            queueItem.cacheKey
        );
    });

    test('should handle empty AJAX queue', () => {
        LivePreviewManager.ajaxQueue = [];
        LivePreviewManager.isProcessingQueue = true;
        
        LivePreviewManager.processAjaxQueue();
        
        expect(LivePreviewManager.isProcessingQueue).toBe(false);
    });

    test('should validate AJAX data before requests', () => {
        // Test with valid data
        expect(LivePreviewManager.validateAjaxData()).toBe(true);
        
        // Test with invalid ajaxurl
        const originalAjaxUrl = lasAdminData.ajaxurl;
        lasAdminData.ajaxurl = null;
        expect(LivePreviewManager.validateAjaxData()).toBe(false);
        lasAdminData.ajaxurl = originalAjaxUrl;
        
        // Test with invalid nonce
        const originalNonce = lasAdminData.nonce;
        lasAdminData.nonce = '';
        expect(LivePreviewManager.validateAjaxData()).toBe(false);
        lasAdminData.nonce = originalNonce;
    });

    test('should handle malformed responses gracefully', () => {
        const setting = 'admin_menu_bg_color';
        const cacheKey = 'test_key';
        
        // Test null response
        LivePreviewManager.handleAjaxSuccess(null, setting, cacheKey);
        expect(LivePreviewManager.handleError).toHaveBeenCalledWith(
            'Invalid response format - not an object',
            null
        );
        
        // Test response without success property
        LivePreviewManager.handleAjaxSuccess({}, setting, cacheKey);
        expect(LivePreviewManager.handleError).toHaveBeenCalledWith(
            'Response missing success property',
            {}
        );
    });

    test('should generate user-friendly error messages', () => {
        const testCases = [
            { input: 'Invalid response format', expected: 'Received invalid response from server' },
            { input: 'AJAX error occurred', expected: 'Communication error with server' },
            { input: 'timeout error', expected: 'Request timed out' },
            { input: 'parsererror occurred', expected: 'Error processing server response' },
            { input: 'Unknown technical error', expected: 'An unexpected error occurred during live preview' }
        ];
        
        testCases.forEach(testCase => {
            const result = LivePreviewManager.getUserFriendlyErrorMessage(testCase.input);
            expect(result).toBe(testCase.expected);
        });
    });

    test('should cleanup resources properly', () => {
        LivePreviewManager.debounceTimer = setTimeout(() => {}, 1000);
        LivePreviewManager.cssCache.set('test', 'data');
        LivePreviewManager.tempStyleElement = { parentNode: { removeChild: jest.fn() } };
        
        LivePreviewManager.cleanup();
        
        expect(LivePreviewManager.cssCache.size).toBe(0);
        expect(LivePreviewManager.tempStyleElement.parentNode.removeChild).toHaveBeenCalled();
    });

    test('should handle concurrent field changes', () => {
        const settings = ['admin_menu_bg_color', 'admin_menu_text_color'];
        const values = ['#ff0000', '#ffffff'];
        
        settings.forEach((setting, index) => {
            LivePreviewManager.handleFieldChange(setting, values[index]);
        });
        
        // Should handle all changes
        expect(LivePreviewManager.handleFieldChange).toHaveBeenCalledTimes(2);
        
        // Last operation should be the most recent
        expect(LivePreviewManager.lastOperation.setting).toBe('admin_menu_text_color');
        expect(LivePreviewManager.lastOperation.value).toBe('#ffffff');
    });

    test('should handle performance metrics correctly', () => {
        const setting = 'admin_menu_bg_color';
        const cacheKey = 'test_key';
        const response = {
            success: true,
            data: {
                css: 'body { background: red; }',
                performance: {
                    execution_time_ms: 1500,
                    memory_usage: 2048000,
                    cache_recommended: true
                }
            }
        };
        
        LivePreviewManager.handleAjaxSuccess(response, setting, cacheKey);
        
        // Should show warning for slow generation
        expect(global.ErrorManager.showWarning).toHaveBeenCalledWith(
            'Slow preview generation: 1500ms'
        );
    });
});toBe(key2);
        expect(key1).not.toBe(key3);
        expect(key2).not.toBe(key3);
        
        // Test with object value
        const objKey = LivePreviewManager.generateCacheKey('setting', { a: 1, b: 2 });
        expect(objKey).toBeDefined();
        expect(objKey).toContain('setting:');
    });

    test('should handle AJAX success responses', () => {
        const setting = 'admin_menu_bg_color';
        const cacheKey = 'test_cache_key';
        
        // Test successful response with CSS data
        const successResponse = {
            success: true,
            data: {
                css: 'body { background: red; }',
                performance: {
                    execution_time_ms: 100
                }
            }
        };
        
        LivePreviewManager.handleAjaxSuccess(successResponse, setting, cacheKey);
        
        expect(LivePreviewManager.errorCount).toBe(0);
        expect(LivePreviewManager.retryCount).toBe(0);
        
        // Test response with error
        const errorResponse = {
            success: false,
            data: {
                message: 'Test error message',
                code: 'test_error'
            }
        };
        
        LivePreviewManager.handleAjaxSuccess(errorResponse, setting, cacheKey);
        expect(console.error).toHaveBeenCalled();
    });

    test('should handle AJAX errors correctly', () => {
        const setting = 'admin_menu_bg_color';
        const jqXHR = { status: 500 };
        const textStatus = 'error';
        const errorThrown = 'Internal Server Error';
        
        LivePreviewManager.handleAjaxError(jqXHR, textStatus, errorThrown, setting);
        
        expect(LivePreviewManager.errorCount).toBe(1);
        expect(console.error).toHaveBeenCalled();
        
        // Test different error types
        const timeoutError = { status: 0 };
        LivePreviewManager.handleAjaxError(timeoutError, 'timeout', '', setting);
        expect(LivePreviewManager.errorCount).toBe(2);
    });

    test('should temporarily disable after too many errors', () => {
        // Trigger multiple errors
        for (let i = 0; i < LivePreviewManager.maxErrors; i++) {
            LivePreviewManager.handleAjaxError({ status: 500 }, 'error', 'Server Error', 'test_setting');
        }
        
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Too many errors, temporarily disabling live preview')
        );
    });

    test('should apply full styles correctly', () => {
        const cssData = 'body { background: blue; }';
        
        // Mock document.getElementById to return null first (no existing element)
        document.getElementById = jest.fn()
            .mockReturnValueOnce(null) // For existing static style
            .mockReturnValueOnce(null) // For live preview style
            .mockReturnValue({ innerHTML: '' }); // For subsequent calls
        
        LivePreviewManager.applyFullStyles(cssData);
        
        expect(document.createElement).toHaveBeenCalledWith('style');
        expect(document.head.appendChild).toHaveBeenCalled();
    });

    test('should show and hide loading states', () => {
        const setting = 'admin_menu_bg_color';
        
        LivePreviewManager.showLoadingState(setting);
        expect($).toHaveBeenCalledWith('[name*="[' + setting + ']"]');
        
        LivePreviewManager.hideLoadingState(setting);
        expect($).toHaveBeenCalledWith('[name*="[' + setting + ']"]');
    });

    test('should show success and error states', () => {
        const setting = 'admin_menu_bg_color';
        
        LivePreviewManager.showSuccessState(setting);
        expect($).toHaveBeenCalledWith('[name*="[' + setting + ']"]');
        
        LivePreviewManager.showErrorState(setting, 'Test error message');
        expect($).toHaveBeenCalledWith('[name*="[' + setting + ']"]');
    });

    test('should retry last operation', () => {
        const setting = 'admin_menu_bg_color';
        const value = '#ff0000';
        
        // Set last operation
        LivePreviewManager.lastOperation = { setting, value };
        LivePreviewManager.retryCount = 0;
        
        // Mock handleFieldChange
        LivePreviewManager.handleFieldChange = jest.fn();
        
        const result = LivePreviewManager.retryLastOperation();
        expect(result).toBe(true);
        expect(LivePreviewManager.retryCount).toBe(1);
        expect(LivePreviewManager.handleFieldChange).toHaveBeenCalledWith(setting, value);
        
        // Test max retries
        LivePreviewManager.retryCount = LivePreviewManager.maxRetries;
        const failResult = LivePreviewManager.retryLastOperation();
        expect(failResult).toBe(false);
    });

    test('should update debounce delay within limits', () => {
        LivePreviewManager.updateDebounceDelay(200);
        expect(LivePreviewManager.debounceDelay).toBe(200);
        
        // Test minimum limit
        LivePreviewManager.updateDebounceDelay(25);
        expect(LivePreviewManager.debounceDelay).toBe(50);
        
        // Test maximum limit
        LivePreviewManager.updateDebounceDelay(2000);
        expect(LivePreviewManager.debounceDelay).toBe(1000);
    });

    test('should provide cache statistics', () => {
        LivePreviewManager.cacheHits = 10;
        LivePreviewManager.cacheMisses = 5;
        
        const stats = LivePreviewManager.getCacheStats();
        
        expect(stats.hits).toBe(10);
        expect(stats.misses).toBe(5);
        expect(stats.hitRate).toBeCloseTo(0.667, 3);
        expect(stats.size).toBe(LivePreviewManager.cssCache.size);
    });

    test('should clear cache completely', () => {
        // Add some cache entries
        LivePreviewManager.setCachedCSS('key1', 'css1');
        LivePreviewManager.setCachedCSS('key2', 'css2');
        LivePreviewManager.cacheHits = 5;
        LivePreviewManager.cacheMisses = 3;
        
        LivePreviewManager.clearCache();
        
        expect(LivePreviewManager.cssCache.size).toBe(0);
        expect(LivePreviewManager.cacheHits).toBe(0);
        expect(LivePreviewManager.cacheMisses).toBe(0);
    });

    test('should get user-friendly error messages', () => {
        const testCases = [
            {
                technical: 'Invalid response format - not an object',
                expected: 'Received invalid response from server'
            },
            {
                technical: 'AJAX error for setting "test". Status: timeout',
                expected: 'Request timed out'
            },
            {
                technical: 'Server returned error: Something went wrong',
                expected: 'Server reported an error during processing'
            },
            {
                technical: 'Unknown technical error',
                expected: 'An unexpected error occurred during live preview'
            }
        ];
        
        testCases.forEach(testCase => {
            const result = LivePreviewManager.getUserFriendlyErrorMessage(testCase.technical);
            expect(result).toBe(testCase.expected);
        });
    });

    test('should process AJAX queue correctly', () => {
        // Add items to queue
        LivePreviewManager.ajaxQueue = [
            { setting: 'setting1', value: 'value1', cacheKey: 'key1' },
            { setting: 'setting2', value: 'value2', cacheKey: 'key2' }
        ];
        
        // Mock performAjaxRequest
        LivePreviewManager.performAjaxRequest = jest.fn(() => ({
            always: jest.fn((callback) => {
                callback();
                return { always: jest.fn() };
            })
        }));
        
        LivePreviewManager.processAjaxQueue();
        
        expect(LivePreviewManager.isProcessingQueue).toBe(true);
        expect(LivePreviewManager.performAjaxRequest).toHaveBeenCalled();
        expect(LivePreviewManager.ajaxQueue).toHaveLength(0); // Queue should be cleared
    });

    test('should cleanup properly', () => {
        // Set up some state
        LivePreviewManager.debounceTimer = setTimeout(() => {}, 1000);
        LivePreviewManager.setCachedCSS('test', 'css');
        
        // Mock tempStyleElement with parentNode
        LivePreviewManager.tempStyleElement = {
            parentNode: {
                removeChild: jest.fn()
            }
        };
        
        LivePreviewManager.cleanup();
        
        expect(LivePreviewManager.cssCache.size).toBe(0);
        expect(LivePreviewManager.tempStyleElement.parentNode.removeChild).toHaveBeenCalled();
    });
});