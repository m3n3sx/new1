/**
 * Event Manager Tests
 * Tests for LASEventManager class functionality
 */

describe('LASEventManager', () => {
    let eventManager;
    let mockCore;
    let testContainer;

    beforeEach(() => {
        // Create mock core
        mockCore = {
            log: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            config: {
                debug: true
            }
        };

        // Create test container
        testContainer = document.createElement('div');
        testContainer.innerHTML = `
            <div class="test-container">
                <button class="test-button" id="test-btn-1">Button 1</button>
                <button class="test-button" id="test-btn-2">Button 2</button>
                <input class="test-input" type="text" id="test-input-1">
                <div class="test-nested">
                    <span class="test-span">Nested span</span>
                </div>
            </div>
        `;
        document.body.appendChild(testContainer);

        // Create event manager instance
        eventManager = new window.LASEventManager(mockCore);
    });

    afterEach(() => {
        if (eventManager) {
            eventManager.destroy();
        }
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
        
        // Clear any remaining timers
        jest.clearAllTimers();
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await eventManager.init();
            
            expect(eventManager.initialized).toBe(true);
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Event Manager initialized successfully'),
                'success'
            );
        });

        test('should setup global event delegation', async () => {
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
            
            await eventManager.init();
            
            // Should add listeners for common event types
            expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.any(Object));
            expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function), expect.any(Object));
            expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function), expect.any(Object));
            
            addEventListenerSpy.mockRestore();
        });

        test('should handle initialization errors gracefully', async () => {
            // Mock an error during setup
            jest.spyOn(eventManager, 'setupGlobalDelegation').mockImplementation(() => {
                throw new Error('Setup failed');
            });

            await expect(eventManager.init()).rejects.toThrow('Setup failed');
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Event Manager initialization failed'),
                'error'
            );
        });
    });

    describe('Event Delegation', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should bind delegated events correctly', () => {
            const callback = jest.fn();
            const handlerId = eventManager.on('.test-button', 'click', callback);
            
            expect(handlerId).toBeTruthy();
            expect(typeof handlerId).toBe('string');
            expect(eventManager.eventStats.bound).toBe(1);
        });

        test('should trigger delegated events when elements are clicked', () => {
            const callback = jest.fn();
            eventManager.on('.test-button', 'click', callback);
            
            const button = testContainer.querySelector('#test-btn-1');
            button.click();
            
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'click',
                target: button
            }));
        });

        test('should not trigger events for non-matching selectors', () => {
            const callback = jest.fn();
            eventManager.on('.non-existent', 'click', callback);
            
            const button = testContainer.querySelector('#test-btn-1');
            button.click();
            
            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle multiple handlers for same event type', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            eventManager.on('.test-button', 'click', callback1);
            eventManager.on('.test-button', 'click', callback2);
            
            const button = testContainer.querySelector('#test-btn-1');
            button.click();
            
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        test('should handle nested element events correctly', () => {
            const callback = jest.fn();
            eventManager.on('.test-nested', 'click', callback);
            
            const span = testContainer.querySelector('.test-span');
            span.click();
            
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('Direct Event Binding', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should bind direct events to elements', () => {
            const callback = jest.fn();
            const button = testContainer.querySelector('#test-btn-1');
            const handlerId = eventManager.on(button, 'click', callback);
            
            expect(handlerId).toBeTruthy();
            expect(eventManager.directEvents.has(handlerId)).toBe(true);
        });

        test('should trigger direct events when element is interacted with', () => {
            const callback = jest.fn();
            const button = testContainer.querySelector('#test-btn-1');
            eventManager.on(button, 'click', callback);
            
            button.click();
            
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should handle once option correctly', () => {
            const callback = jest.fn();
            const button = testContainer.querySelector('#test-btn-1');
            eventManager.on(button, 'click', callback, { once: true });
            
            button.click();
            button.click();
            
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('Debounced Events', () => {
        beforeEach(async () => {
            await eventManager.init();
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should debounce events correctly', () => {
            const callback = jest.fn();
            eventManager.on('.test-input', 'input', callback, { debounce: 300 });
            
            const input = testContainer.querySelector('#test-input-1');
            
            // Trigger multiple events quickly
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Should not be called yet
            expect(callback).not.toHaveBeenCalled();
            
            // Fast-forward time
            jest.advanceTimersByTime(300);
            
            // Should be called once
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should reset debounce timer on new events', () => {
            const callback = jest.fn();
            eventManager.on('.test-input', 'input', callback, { debounce: 300 });
            
            const input = testContainer.querySelector('#test-input-1');
            
            // First event
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Wait 200ms
            jest.advanceTimersByTime(200);
            
            // Second event (should reset timer)
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Wait another 200ms (total 400ms, but timer was reset)
            jest.advanceTimersByTime(200);
            
            // Should not be called yet
            expect(callback).not.toHaveBeenCalled();
            
            // Wait final 100ms
            jest.advanceTimersByTime(100);
            
            // Should be called once
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('Throttled Events', () => {
        beforeEach(async () => {
            await eventManager.init();
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should throttle events correctly', () => {
            const callback = jest.fn();
            eventManager.on('.test-button', 'click', callback, { throttle: 100 });
            
            const button = testContainer.querySelector('#test-btn-1');
            
            // Trigger multiple events quickly
            button.click();
            button.click();
            button.click();
            
            // Should be called once immediately
            expect(callback).toHaveBeenCalledTimes(1);
            
            // Fast-forward time
            jest.advanceTimersByTime(100);
            
            // Trigger more events
            button.click();
            button.click();
            
            // Should be called again
            expect(callback).toHaveBeenCalledTimes(2);
        });
    });

    describe('Event Removal', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should remove direct events by handler ID', () => {
            const callback = jest.fn();
            const button = testContainer.querySelector('#test-btn-1');
            const handlerId = eventManager.on(button, 'click', callback);
            
            // Remove event
            const removed = eventManager.off(handlerId);
            
            expect(removed).toBe(true);
            expect(eventManager.directEvents.has(handlerId)).toBe(false);
            
            // Event should not trigger
            button.click();
            expect(callback).not.toHaveBeenCalled();
        });

        test('should remove delegated events by selector', () => {
            const callback = jest.fn();
            eventManager.on('.test-button', 'click', callback);
            
            // Remove events
            const removed = eventManager.off('.test-button', 'click');
            
            expect(removed).toBe(true);
            
            // Event should not trigger
            const button = testContainer.querySelector('#test-btn-1');
            button.click();
            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle removal of non-existent events gracefully', () => {
            const removed = eventManager.off('non-existent-id');
            expect(removed).toBe(false);
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should track event statistics', () => {
            const callback = jest.fn();
            
            eventManager.on('.test-button', 'click', callback);
            eventManager.on('.test-input', 'input', callback);
            
            expect(eventManager.eventStats.bound).toBe(2);
            
            const button = testContainer.querySelector('#test-btn-1');
            button.click();
            
            expect(eventManager.eventStats.triggered).toBe(1);
        });

        test('should provide performance report', () => {
            const callback = jest.fn();
            eventManager.on('.test-button', 'click', callback);
            
            const button = testContainer.querySelector('#test-btn-1');
            button.click();
            
            const report = eventManager.getPerformanceReport();
            expect(report).toHaveProperty('eventProcessing');
            expect(report).toHaveProperty('lastCleanup');
        });

        test('should provide event statistics', () => {
            const callback = jest.fn();
            eventManager.on('.test-button', 'click', callback);
            
            const stats = eventManager.getStats();
            expect(stats).toHaveProperty('bound');
            expect(stats).toHaveProperty('triggered');
            expect(stats).toHaveProperty('cleaned');
            expect(stats).toHaveProperty('delegatedEvents');
            expect(stats).toHaveProperty('directEvents');
        });
    });

    describe('Cleanup and Memory Management', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should perform automatic cleanup', () => {
            const callback = jest.fn();
            const button = testContainer.querySelector('#test-btn-1');
            const handlerId = eventManager.on(button, 'click', callback);
            
            // Remove button from DOM
            button.remove();
            
            // Perform cleanup
            eventManager.performCleanup();
            
            // Handler should be removed
            expect(eventManager.directEvents.has(handlerId)).toBe(false);
        });

        test('should clear timers during cleanup', () => {
            jest.useFakeTimers();
            
            const callback = jest.fn();
            eventManager.on('.test-input', 'input', callback, { debounce: 300 });
            
            const input = testContainer.querySelector('#test-input-1');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Should have active timer
            expect(eventManager.debounceTimers.size).toBe(1);
            
            // Perform cleanup
            eventManager.performCleanup();
            
            // Timers should be cleared
            expect(eventManager.debounceTimers.size).toBe(0);
            
            jest.useRealTimers();
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should handle errors in event handlers gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Handler error');
            });
            
            eventManager.on('.test-button', 'click', errorCallback);
            
            const button = testContainer.querySelector('#test-btn-1');
            
            // Should not throw
            expect(() => button.click()).not.toThrow();
            
            // Should log error
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Error executing event handler'),
                'error'
            );
        });

        test('should handle invalid selectors gracefully', () => {
            const callback = jest.fn();
            
            // Should not throw with invalid selector
            expect(() => {
                eventManager.on('invalid[selector', 'click', callback);
            }).not.toThrow();
        });

        test('should handle missing elements gracefully', () => {
            const callback = jest.fn();
            const nonExistentElement = document.createElement('div');
            
            // Should not throw
            expect(() => {
                eventManager.on(nonExistentElement, 'click', callback);
            }).not.toThrow();
        });
    });

    describe('Destruction', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should clean up all events on destroy', () => {
            const callback = jest.fn();
            const button = testContainer.querySelector('#test-btn-1');
            
            eventManager.on('.test-button', 'click', callback);
            eventManager.on(button, 'click', callback);
            
            expect(eventManager.delegatedEvents.size).toBeGreaterThan(0);
            expect(eventManager.directEvents.size).toBeGreaterThan(0);
            
            eventManager.destroy();
            
            expect(eventManager.delegatedEvents.size).toBe(0);
            expect(eventManager.directEvents.size).toBe(0);
            expect(eventManager.initialized).toBe(false);
        });

        test('should clear all timers on destroy', () => {
            jest.useFakeTimers();
            
            const callback = jest.fn();
            eventManager.on('.test-input', 'input', callback, { debounce: 300 });
            eventManager.on('.test-button', 'click', callback, { throttle: 100 });
            
            const input = testContainer.querySelector('#test-input-1');
            const button = testContainer.querySelector('#test-btn-1');
            
            input.dispatchEvent(new Event('input', { bubbles: true }));
            button.click();
            
            expect(eventManager.debounceTimers.size).toBeGreaterThan(0);
            expect(eventManager.throttleTimers.size).toBeGreaterThan(0);
            
            eventManager.destroy();
            
            expect(eventManager.debounceTimers.size).toBe(0);
            expect(eventManager.throttleTimers.size).toBe(0);
            
            jest.useRealTimers();
        });
    });
});