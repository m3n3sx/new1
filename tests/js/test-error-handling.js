/**
 * Integration tests for error handling workflows
 * 
 * Tests the complete error handling system including JavaScript error capture,
 * user notifications, server reporting, and integration between components.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

describe('Error Handling Integration', function() {
    let errorHandler;
    let mockConfig;
    let originalConsoleError;
    
    beforeEach(function() {
        // Mock configuration
        mockConfig = {
            enableGlobalHandling: true,
            enableUserNotifications: true,
            enableErrorReporting: false, // Disable for testing
            maxErrorsPerSession: 10,
            notificationDuration: 1000, // Shorter for testing
            debugMode: true
        };
        
        // Create fresh error handler instance
        errorHandler = new window.LAS.ErrorHandler(mockConfig);
        
        // Mock console.error
        originalConsoleError = console.error;
        console.error = jest.fn();
        
        // Clear any existing notifications
        $('#las-notification-container').empty();
        
        // Mock jQuery AJAX
        global.$ = {
            ajax: jest.fn().mockResolvedValue({}),
            fn: {},
            ...global.$
        };
    });
    
    afterEach(function() {
        // Restore console.error
        console.error = originalConsoleError;
        
        // Clear notifications
        $('#las-notification-container').empty();
        
        // Clear error history
        if (errorHandler) {
            errorHandler.clearHistory();
        }
    });
    
    describe('Error Capture', function() {
        test('should capture JavaScript errors', function() {
            const errorInfo = {
                type: 'javascript',
                message: 'Test JavaScript error',
                filename: 'test.js',
                lineno: 10,
                colno: 5,
                stack: 'Error stack trace'
            };
            
            errorHandler.handleError(errorInfo);
            
            const stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBe(1);
            expect(stats.errorHistory).toHaveLength(1);
            expect(stats.errorHistory[0].type).toBe('javascript');
            expect(stats.errorHistory[0].message).toBe('Test JavaScript error');
        });
        
        test('should capture promise rejections', function() {
            const errorInfo = {
                type: 'promise',
                message: 'Unhandled promise rejection',
                reason: new Error('Promise error'),
                stack: 'Promise stack trace'
            };
            
            errorHandler.handleError(errorInfo);
            
            const stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBe(1);
            expect(stats.errorHistory[0].type).toBe('promise');
        });
        
        test('should capture AJAX errors', function() {
            const xhr = {
                status: 500,
                statusText: 'Internal Server Error',
                responseText: '{"error": {"message": "Server error"}}'
            };
            
            const settings = {
                url: '/las/test-endpoint',
                type: 'POST',
                timeout: 5000
            };
            
            errorHandler.handleAjaxError(xhr, settings, 'Server error');
            
            const stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBe(1);
            expect(stats.errorHistory[0].type).toBe('ajax');
            expect(stats.errorHistory[0].status).toBe(500);
        });
        
        test('should capture console errors', function() {
            const args = ['Test console error', { data: 'test' }];
            
            errorHandler.handleConsoleError(args);
            
            const stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBe(1);
            expect(stats.errorHistory[0].type).toBe('console');
        });
    });
    
    describe('Error Classification', function() {
        test('should determine correct error levels', function() {
            const testCases = [
                { type: 'javascript', expectedLevel: 'error' },
                { type: 'promise', expectedLevel: 'error' },
                { type: 'ajax', status: 500, expectedLevel: 'error' },
                { type: 'ajax', status: 404, expectedLevel: 'warning' },
                { type: 'console', expectedLevel: 'warning' }
            ];
            
            testCases.forEach(testCase => {
                const errorInfo = {
                    type: testCase.type,
                    message: `Test ${testCase.type} error`,
                    status: testCase.status
                };
                
                errorHandler.handleError(errorInfo);
                
                const stats = errorHandler.getStatistics();
                const lastError = stats.errorHistory[stats.errorHistory.length - 1];
                expect(lastError.level).toBe(testCase.expectedLevel);
            });
        });
        
        test('should determine correct error categories', function() {
            const testCases = [
                { type: 'ajax', expectedCategory: 'network' },
                { type: 'javascript', expectedCategory: 'system' },
                { type: 'promise', expectedCategory: 'system' },
                { type: 'console', expectedCategory: 'system' }
            ];
            
            testCases.forEach(testCase => {
                const errorInfo = {
                    type: testCase.type,
                    message: `Test ${testCase.type} error`
                };
                
                errorHandler.handleError(errorInfo);
                
                const stats = errorHandler.getStatistics();
                const lastError = stats.errorHistory[stats.errorHistory.length - 1];
                expect(lastError.category).toBe(testCase.expectedCategory);
            });
        });
    });
    
    describe('User Notifications', function() {
        test('should create user-friendly messages', function() {
            const testCases = [
                {
                    error: { type: 'ajax', status: 0 },
                    expectedMessage: 'Network connection error. Please check your internet connection.'
                },
                {
                    error: { type: 'ajax', status: 404 },
                    expectedMessage: 'The requested resource was not found.'
                },
                {
                    error: { type: 'ajax', status: 500 },
                    expectedMessage: 'Server error. Please try again later.'
                },
                {
                    error: { type: 'javascript' },
                    expectedMessage: 'A JavaScript error occurred. The page may not function correctly.'
                }
            ];
            
            testCases.forEach(testCase => {
                // Use reflection to access private method
                const message = errorHandler.createUserFriendlyMessage(testCase.error);
                expect(message).toBe(testCase.expectedMessage);
            });
        });
        
        test('should show notifications for errors', function(done) {
            const errorInfo = {
                type: 'javascript',
                message: 'Test error for notification'
            };
            
            errorHandler.handleError(errorInfo);
            
            // Check that notification was created
            setTimeout(() => {
                const notifications = $('#las-notification-container .las-notification');
                expect(notifications.length).toBeGreaterThan(0);
                done();
            }, 100);
        });
        
        test('should not show notifications for debug messages', function() {
            const errorInfo = {
                type: 'debug',
                message: 'Debug message',
                level: 'debug'
            };
            
            errorHandler.handleError(errorInfo);
            
            const notifications = $('#las-notification-container .las-notification');
            expect(notifications.length).toBe(0);
        });
    });
    
    describe('Error Reporting', function() {
        test('should prepare error data for server reporting', function() {
            // Enable error reporting for this test
            errorHandler.config.enableErrorReporting = true;
            
            const errorInfo = {
                type: 'javascript',
                message: 'Test error for reporting',
                filename: 'test.js',
                lineno: 10
            };
            
            errorHandler.handleError(errorInfo);
            
            // Check that AJAX call was made
            expect(global.$.ajax).toHaveBeenCalled();
            
            const ajaxCall = global.$.ajax.mock.calls[0][0];
            expect(ajaxCall.method).toBe('POST');
            expect(ajaxCall.contentType).toBe('application/json');
            
            // Parse the sent data
            const sentData = JSON.parse(ajaxCall.data);
            expect(sentData.type).toBe('javascript');
            expect(sentData.message).toBe('Test error for reporting');
            expect(sentData.clientInfo).toBeDefined();
        });
        
        test('should include client information in error reports', function() {
            errorHandler.config.enableErrorReporting = true;
            
            const errorInfo = {
                type: 'javascript',
                message: 'Test error with client info'
            };
            
            errorHandler.handleError(errorInfo);
            
            const ajaxCall = global.$.ajax.mock.calls[0][0];
            const sentData = JSON.parse(ajaxCall.data);
            
            expect(sentData.clientInfo).toBeDefined();
            expect(sentData.clientInfo.viewport).toBeDefined();
            expect(sentData.clientInfo.screen).toBeDefined();
        });
    });
    
    describe('Rate Limiting', function() {
        test('should respect maximum errors per session', function() {
            // Set low limit for testing
            errorHandler.config.maxErrorsPerSession = 3;
            
            // Generate more errors than the limit
            for (let i = 0; i < 5; i++) {
                errorHandler.handleError({
                    type: 'javascript',
                    message: `Test error ${i}`
                });
            }
            
            const stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBe(3); // Should stop at limit
        });
    });
    
    describe('Session Management', function() {
        test('should generate and maintain session ID', function() {
            const sessionId1 = errorHandler.getSessionId();
            const sessionId2 = errorHandler.getSessionId();
            
            expect(sessionId1).toBeDefined();
            expect(sessionId1).toBe(sessionId2); // Should be consistent
            expect(sessionId1).toMatch(/^sess_/); // Should have correct prefix
        });
        
        test('should clear history when requested', function() {
            // Add some errors
            errorHandler.handleError({
                type: 'javascript',
                message: 'Test error 1'
            });
            errorHandler.handleError({
                type: 'javascript',
                message: 'Test error 2'
            });
            
            let stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBe(2);
            expect(stats.errorHistory).toHaveLength(2);
            
            // Clear history
            errorHandler.clearHistory();
            
            stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBe(0);
            expect(stats.errorHistory).toHaveLength(0);
        });
    });
    
    describe('Global Error Handling', function() {
        test('should set up global error handlers', function() {
            // Check that error event listeners are set up
            expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
            expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        });
        
        test('should handle page visibility changes', function() {
            // Simulate page becoming hidden
            Object.defineProperty(document, 'hidden', {
                writable: true,
                value: true
            });
            
            // Trigger visibility change event
            const event = new Event('visibilitychange');
            document.dispatchEvent(event);
            
            // Should clear notification queue
            const stats = errorHandler.getStatistics();
            expect(stats.notificationQueue).toBe(0);
        });
    });
    
    describe('Testing Utilities', function() {
        test('should provide error testing functionality', function() {
            expect(typeof errorHandler.testErrorHandling).toBe('function');
            
            // Test should not throw errors
            expect(() => {
                errorHandler.testErrorHandling();
            }).not.toThrow();
        });
        
        test('should provide statistics', function() {
            const stats = errorHandler.getStatistics();
            
            expect(stats).toBeDefined();
            expect(typeof stats.errorCount).toBe('number');
            expect(Array.isArray(stats.errorHistory)).toBe(true);
            expect(typeof stats.notificationQueue).toBe('number');
            expect(typeof stats.sessionId).toBe('string');
            expect(typeof stats.isInitialized).toBe('boolean');
        });
    });
    
    describe('jQuery Integration', function() {
        test('should provide jQuery plugin', function() {
            expect(typeof $.fn.lasError).toBe('function');
            
            // Test plugin usage
            const $element = $('<div>');
            const result = $element.lasError('Test jQuery error');
            
            expect(result).toBe($element); // Should return jQuery object for chaining
            
            const stats = errorHandler.getStatistics();
            expect(stats.errorCount).toBeGreaterThan(0);
        });
    });
    
    describe('Configuration', function() {
        test('should respect configuration options', function() {
            const customConfig = {
                enableGlobalHandling: false,
                enableUserNotifications: false,
                enableErrorReporting: false,
                maxErrorsPerSession: 5,
                debugMode: true
            };
            
            const customErrorHandler = new window.LAS.ErrorHandler(customConfig);
            
            expect(customErrorHandler.config.enableGlobalHandling).toBe(false);
            expect(customErrorHandler.config.enableUserNotifications).toBe(false);
            expect(customErrorHandler.config.enableErrorReporting).toBe(false);
            expect(customErrorHandler.config.maxErrorsPerSession).toBe(5);
            expect(customErrorHandler.config.debugMode).toBe(true);
        });
    });
});