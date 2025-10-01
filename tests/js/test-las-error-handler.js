/**
 * Unit Tests for LAS Error Handler
 * Tests the error handling and user feedback functionality
 */

// Import the classes from the main file
require('../../js/admin-settings.js');

describe('LASErrorHandler', () => {
    let errorHandler;
    let mockCore;
    
    beforeEach(() => {
        // Mock the core manager
        mockCore = {
            config: {
                debug: false
            },
            emit: jest.fn()
        };
        
        // Create a fresh instance for each test
        errorHandler = new LASErrorHandler(mockCore);
        
        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });
    
    afterEach(() => {
        // Clean up after each test
        if (errorHandler) {
            errorHandler.cleanup();
        }
        
        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });
    
    describe('Constructor', () => {
        test('should initialize with default values', () => {
            expect(errorHandler.core).toBe(mockCore);
            expect(errorHandler.notificationContainer).toBeNull();
            expect(errorHandler.loadingIndicator).toBeNull();
            expect(errorHandler.notifications).toEqual([]);
            expect(errorHandler.maxNotifications).toBe(5);
            expect(errorHandler.defaultDuration).toBe(5000);
        });
    });
    
    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await errorHandler.init();
            
            expect(errorHandler.notificationContainer).not.toBeNull();
            expect(errorHandler.loadingIndicator).not.toBeNull();
            expect(document.getElementById('las-notifications')).not.toBeNull();
            expect(document.getElementById('las-loading')).not.toBeNull();
            expect(document.getElementById('las-error-handler-styles')).not.toBeNull();
        });
        
        test('should create notification container with correct attributes', async () => {
            await errorHandler.init();
            
            const container = errorHandler.notificationContainer;
            expect(container.id).toBe('las-notifications');
            expect(container.className).toBe('las-notifications-container');
            expect(container.getAttribute('role')).toBe('alert');
            expect(container.getAttribute('aria-live')).toBe('polite');
        });
        
        test('should create loading indicator with correct structure', async () => {
            await errorHandler.init();
            
            const loading = errorHandler.loadingIndicator;
            expect(loading.id).toBe('las-loading');
            expect(loading.className).toBe('las-loading hidden');
            expect(loading.querySelector('.las-spinner')).not.toBeNull();
            expect(loading.querySelector('.las-loading-text')).not.toBeNull();
        });
        
        test('should inject CSS styles', async () => {
            await errorHandler.init();
            
            const styles = document.getElementById('las-error-handler-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.las-notifications-container');
            expect(styles.textContent).toContain('.las-notification');
            expect(styles.textContent).toContain('.las-loading');
        });
    });
    
    describe('Notification System', () => {
        beforeEach(async () => {
            await errorHandler.init();
        });
        
        test('should show basic notification', () => {
            const message = 'Test notification';
            const notification = errorHandler.showNotification(message);
            
            expect(notification).not.toBeNull();
            expect(notification.type).toBe('info');
            expect(errorHandler.notifications).toHaveLength(1);
            
            const element = notification.element;
            expect(element.className).toContain('las-notification--info');
            expect(element.textContent).toContain(message);
        });
        
        test('should show success notification', () => {
            const message = 'Success message';
            const notification = errorHandler.showSuccess(message);
            
            expect(notification.type).toBe('success');
            expect(notification.element.className).toContain('las-notification--success');
        });
        
        test('should show error notification', () => {
            const message = 'Error message';
            const notification = errorHandler.showError(message);
            
            expect(notification.type).toBe('error');
            expect(notification.element.className).toContain('las-notification--error');
        });
        
        test('should show warning notification', () => {
            const message = 'Warning message';
            const notification = errorHandler.showWarning(message);
            
            expect(notification.type).toBe('warning');
            expect(notification.element.className).toContain('las-notification--warning');
        });
        
        test('should show info notification', () => {
            const message = 'Info message';
            const notification = errorHandler.showInfo(message);
            
            expect(notification.type).toBe('info');
            expect(notification.element.className).toContain('las-notification--info');
        });
        
        test('should include details in notification', () => {
            const message = 'Main message';
            const details = 'Additional details';
            const notification = errorHandler.showNotification(message, 'info', { details });
            
            expect(notification.element.textContent).toContain(message);
            expect(notification.element.textContent).toContain(details);
        });
        
        test('should add action buttons', () => {
            const message = 'Test message';
            const actionCallback = jest.fn();
            const actions = [
                { id: 'action1', text: 'Action 1', callback: actionCallback },
                { id: 'action2', text: 'Action 2', callback: jest.fn(), secondary: true }
            ];
            
            const notification = errorHandler.showNotification(message, 'info', { actions });
            
            const actionButtons = notification.element.querySelectorAll('.las-notification__action');
            expect(actionButtons).toHaveLength(2);
            expect(actionButtons[0].textContent).toBe('Action 1');
            expect(actionButtons[1].textContent).toBe('Action 2');
            expect(actionButtons[1].className).toContain('secondary');
            
            // Test action callback
            actionButtons[0].click();
            expect(actionCallback).toHaveBeenCalled();
        });
        
        test('should close notification when close button is clicked', () => {
            const notification = errorHandler.showNotification('Test message');
            const closeButton = notification.element.querySelector('.las-notification__close');
            
            expect(errorHandler.notifications).toHaveLength(1);
            
            closeButton.click();
            
            // Should be removed after animation
            setTimeout(() => {
                expect(errorHandler.notifications).toHaveLength(0);
            }, 350);
        });
        
        test('should auto-remove non-persistent notifications', (done) => {
            const notification = errorHandler.showNotification('Test message', 'info', { duration: 100 });
            
            expect(errorHandler.notifications).toHaveLength(1);
            
            setTimeout(() => {
                expect(errorHandler.notifications).toHaveLength(0);
                done();
            }, 150);
        });
        
        test('should not auto-remove persistent notifications', (done) => {
            const notification = errorHandler.showNotification('Test message', 'info', { 
                persistent: true, 
                duration: 100 
            });
            
            expect(errorHandler.notifications).toHaveLength(1);
            
            setTimeout(() => {
                expect(errorHandler.notifications).toHaveLength(1);
                done();
            }, 150);
        });
        
        test('should limit number of notifications', () => {
            // Show more notifications than the limit
            for (let i = 0; i < 7; i++) {
                errorHandler.showNotification(`Message ${i}`);
            }
            
            expect(errorHandler.notifications).toHaveLength(errorHandler.maxNotifications);
        });
        
        test('should escape HTML in messages', () => {
            const maliciousMessage = '<script>alert("xss")</script>';
            const notification = errorHandler.showNotification(maliciousMessage);
            
            expect(notification.element.innerHTML).not.toContain('<script>');
            expect(notification.element.textContent).toContain(maliciousMessage);
        });
    });
    
    describe('Loading Indicator', () => {
        beforeEach(async () => {
            await errorHandler.init();
        });
        
        test('should show loading indicator', () => {
            errorHandler.showLoading(true);
            
            expect(errorHandler.loadingIndicator.className).not.toContain('hidden');
        });
        
        test('should hide loading indicator', () => {
            errorHandler.showLoading(true);
            errorHandler.showLoading(false);
            
            expect(errorHandler.loadingIndicator.className).toContain('hidden');
        });
        
        test('should update loading message', () => {
            const customMessage = 'Custom loading message';
            errorHandler.showLoading(true, customMessage);
            
            const textElement = errorHandler.loadingIndicator.querySelector('.las-loading-text');
            expect(textElement.textContent).toBe(customMessage);
        });
    });
    
    describe('Error Handling', () => {
        beforeEach(async () => {
            await errorHandler.init();
        });
        
        test('should handle errors with context', () => {
            const error = new Error('Test error');
            const context = 'Test context';
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler.handleError(error, context);
            
            expect(consoleSpy).toHaveBeenCalledWith(`LAS Error [${context}]:`, error);
            expect(mockCore.emit).toHaveBeenCalledWith('error:handled', {
                error: error,
                context: context,
                timestamp: expect.any(Number)
            });
            
            consoleSpy.mockRestore();
        });
        
        test('should handle global JavaScript errors', () => {
            const errorInfo = {
                message: 'Test error',
                source: 'live-admin-styler/test.js',
                line: 10,
                column: 5,
                error: new Error('Test error'),
                type: 'javascript'
            };
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler.handleGlobalError(errorInfo);
            
            expect(consoleSpy).toHaveBeenCalledWith('LAS Global Error:', errorInfo);
            expect(mockCore.emit).toHaveBeenCalledWith('error:global', errorInfo);
            expect(errorHandler.notifications).toHaveLength(1);
            
            consoleSpy.mockRestore();
        });
        
        test('should bind global error handlers', async () => {
            const errorSpy = jest.spyOn(errorHandler, 'handleGlobalError');
            
            await errorHandler.init();
            
            // Simulate a JavaScript error
            const errorEvent = new ErrorEvent('error', {
                message: 'Test error',
                filename: 'live-admin-styler/test.js',
                lineno: 10,
                colno: 5,
                error: new Error('Test error')
            });
            
            window.dispatchEvent(errorEvent);
            
            expect(errorSpy).toHaveBeenCalled();
        });
        
        test('should bind unhandled rejection handler', async () => {
            const errorSpy = jest.spyOn(errorHandler, 'handleGlobalError');
            
            await errorHandler.init();
            
            // Simulate an unhandled promise rejection
            const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
                promise: Promise.reject('Test rejection'),
                reason: 'Test rejection'
            });
            
            window.dispatchEvent(rejectionEvent);
            
            expect(errorSpy).toHaveBeenCalled();
        });
    });
    
    describe('Keyboard Shortcuts', () => {
        beforeEach(async () => {
            await errorHandler.init();
        });
        
        test('should dismiss all notifications on ESC key', () => {
            // Show some notifications
            errorHandler.showNotification('Message 1');
            errorHandler.showNotification('Message 2');
            
            expect(errorHandler.notifications).toHaveLength(2);
            
            // Simulate ESC key press
            const escEvent = new KeyboardEvent('keydown', { keyCode: 27 });
            document.dispatchEvent(escEvent);
            
            // Should start dismissing notifications
            setTimeout(() => {
                expect(errorHandler.notifications).toHaveLength(0);
            }, 350);
        });
    });
    
    describe('Cleanup', () => {
        test('should cleanup all resources', async () => {
            await errorHandler.init();
            
            // Add some notifications
            errorHandler.showNotification('Test 1');
            errorHandler.showNotification('Test 2');
            
            expect(errorHandler.notifications).toHaveLength(2);
            expect(document.getElementById('las-notifications')).not.toBeNull();
            expect(document.getElementById('las-loading')).not.toBeNull();
            expect(document.getElementById('las-error-handler-styles')).not.toBeNull();
            
            errorHandler.cleanup();
            
            expect(errorHandler.notifications).toHaveLength(0);
            expect(errorHandler.notificationContainer).toBeNull();
            expect(errorHandler.loadingIndicator).toBeNull();
        });
    });
    
    describe('Utility Methods', () => {
        test('should escape HTML correctly', () => {
            const htmlString = '<script>alert("xss")</script>';
            const escaped = errorHandler.escapeHtml(htmlString);
            
            expect(escaped).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });
        
        test('should dismiss all notifications', async () => {
            await errorHandler.init();
            
            // Add multiple notifications
            for (let i = 0; i < 3; i++) {
                errorHandler.showNotification(`Message ${i}`);
            }
            
            expect(errorHandler.notifications).toHaveLength(3);
            
            errorHandler.dismissAll();
            
            // Should start dismissing all notifications
            setTimeout(() => {
                expect(errorHandler.notifications).toHaveLength(0);
            }, 350);
        });
    });
});