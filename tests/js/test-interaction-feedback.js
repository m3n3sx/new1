/**
 * Interaction Feedback and Accessibility Tests
 * Tests for LASEventManager interaction feedback and accessibility features
 */

describe('LASEventManager - Interaction Feedback and Accessibility', () => {
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
                <button class="test-button" id="test-btn-2" aria-label="Custom Button">Button 2</button>
                <input class="test-input" type="text" id="test-input-1" placeholder="Test input">
                <div class="test-menu" role="menu">
                    <div class="test-menuitem" role="menuitem" tabindex="0">Menu Item 1</div>
                    <div class="test-menuitem" role="menuitem" tabindex="-1">Menu Item 2</div>
                </div>
                <div class="test-tabs" role="tablist" aria-orientation="horizontal">
                    <div class="test-tab" role="tab" tabindex="0">Tab 1</div>
                    <div class="test-tab" role="tab" tabindex="-1">Tab 2</div>
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
        
        // Clean up any created elements
        const ariaLive = document.getElementById('las-aria-live');
        if (ariaLive) {
            ariaLive.remove();
        }
        
        // Remove classes from body
        document.body.classList.remove('las-high-contrast', 'las-reduced-motion', 'las-screen-reader', 'las-touch-device');
    });

    describe('Interactive Element Detection', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should identify interactive elements correctly', () => {
            const button = testContainer.querySelector('#test-btn-1');
            const input = testContainer.querySelector('#test-input-1');
            const menuitem = testContainer.querySelector('[role="menuitem"]');
            const div = testContainer.querySelector('.test-container');

            expect(eventManager.isInteractiveElement(button)).toBe(true);
            expect(eventManager.isInteractiveElement(input)).toBe(true);
            expect(eventManager.isInteractiveElement(menuitem)).toBe(true);
            expect(eventManager.isInteractiveElement(div)).toBe(false);
        });

        test('should handle null and undefined elements', () => {
            expect(eventManager.isInteractiveElement(null)).toBe(false);
            expect(eventManager.isInteractiveElement(undefined)).toBe(false);
        });
    });

    describe('Visual Feedback', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should add visual feedback classes', () => {
            const button = testContainer.querySelector('#test-btn-1');
            
            eventManager.addVisualFeedback(button, 'focused');
            expect(button.classList.contains('las-feedback-focused')).toBe(true);
            
            eventManager.addVisualFeedback(button, 'hovered');
            expect(button.classList.contains('las-feedback-hovered')).toBe(true);
        });

        test('should remove visual feedback classes', () => {
            const button = testContainer.querySelector('#test-btn-1');
            
            button.classList.add('las-feedback-focused');
            eventManager.removeVisualFeedback(button, 'focused');
            expect(button.classList.contains('las-feedback-focused')).toBe(false);
        });

        test('should auto-remove active feedback after delay', (done) => {
            const button = testContainer.querySelector('#test-btn-1');
            
            eventManager.addVisualFeedback(button, 'active');
            expect(button.classList.contains('las-feedback-active')).toBe(true);
            
            setTimeout(() => {
                expect(button.classList.contains('las-feedback-active')).toBe(false);
                done();
            }, 200);
        });

        test('should handle null elements gracefully', () => {
            expect(() => {
                eventManager.addVisualFeedback(null, 'focused');
                eventManager.removeVisualFeedback(null, 'focused');
            }).not.toThrow();
        });
    });

    describe('Ripple Effect', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should create ripple effect on click', () => {
            const button = testContainer.querySelector('#test-btn-1');
            const mockEvent = {
                clientX: 100,
                clientY: 100,
                target: button
            };
            
            // Mock getBoundingClientRect
            button.getBoundingClientRect = jest.fn(() => ({
                left: 50,
                top: 50,
                width: 100,
                height: 40
            }));
            
            eventManager.createRippleEffect(button, mockEvent);
            
            const ripple = button.querySelector('.las-ripple-effect');
            expect(ripple).toBeTruthy();
            expect(button.style.position).toBe('relative');
        });

        test('should not create ripple effect when reduced motion is preferred', () => {
            eventManager.reducedMotionPreference = true;
            
            const button = testContainer.querySelector('#test-btn-1');
            const mockEvent = {
                clientX: 100,
                clientY: 100,
                target: button
            };
            
            eventManager.createRippleEffect(button, mockEvent);
            
            const ripple = button.querySelector('.las-ripple-effect');
            expect(ripple).toBeFalsy();
        });

        test('should clean up ripple effect after animation', (done) => {
            const button = testContainer.querySelector('#test-btn-1');
            const mockEvent = {
                clientX: 100,
                clientY: 100,
                target: button
            };
            
            button.getBoundingClientRect = jest.fn(() => ({
                left: 50,
                top: 50,
                width: 100,
                height: 40
            }));
            
            eventManager.createRippleEffect(button, mockEvent);
            
            setTimeout(() => {
                const ripple = button.querySelector('.las-ripple-effect');
                expect(ripple).toBeFalsy();
                done();
            }, 700);
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should handle tab navigation', () => {
            const button = testContainer.querySelector('#test-btn-1');
            const mockEvent = {
                key: 'Tab',
                target: button,
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };
            
            // Mock getFocusableElements
            eventManager.getFocusableElements = jest.fn(() => [button]);
            
            eventManager.handleKeyboardNavigation(mockEvent);
            
            // Should announce navigation context
            expect(mockCore.log).toHaveBeenCalled();
        });

        test('should handle arrow key navigation in menus', () => {
            const menuItems = testContainer.querySelectorAll('[role="menuitem"]');
            const firstItem = menuItems[0];
            const secondItem = menuItems[1];
            
            secondItem.focus = jest.fn();
            
            const mockEvent = {
                key: 'ArrowDown',
                target: firstItem,
                preventDefault: jest.fn()
            };
            
            eventManager.handleKeyboardNavigation(mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(secondItem.focus).toHaveBeenCalled();
        });

        test('should handle arrow key navigation in tabs', () => {
            const tabs = testContainer.querySelectorAll('[role="tab"]');
            const firstTab = tabs[0];
            const secondTab = tabs[1];
            
            secondTab.focus = jest.fn();
            
            const mockEvent = {
                key: 'ArrowRight',
                target: firstTab,
                preventDefault: jest.fn()
            };
            
            eventManager.handleKeyboardNavigation(mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(secondTab.focus).toHaveBeenCalled();
        });

        test('should handle Enter and Space key activation', () => {
            const button = testContainer.querySelector('#test-btn-1');
            button.click = jest.fn();
            
            const mockEvent = {
                key: 'Enter',
                target: button,
                preventDefault: jest.fn()
            };
            
            eventManager.handleKeyboardNavigation(mockEvent);
            
            expect(button.click).toHaveBeenCalled();
        });

        test('should handle Escape key', () => {
            // Create an element with aria-expanded
            const menu = document.createElement('div');
            menu.setAttribute('aria-expanded', 'true');
            menu.classList.add('las-menu-open');
            testContainer.appendChild(menu);
            
            const mockEvent = {
                key: 'Escape',
                target: testContainer,
                preventDefault: jest.fn()
            };
            
            eventManager.handleKeyboardNavigation(mockEvent);
            
            expect(menu.getAttribute('aria-expanded')).toBe('false');
            expect(menu.classList.contains('las-menu-open')).toBe(false);
        });
    });

    describe('ARIA Live Region', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should create ARIA live region', () => {
            const liveRegion = document.getElementById('las-aria-live');
            expect(liveRegion).toBeTruthy();
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
        });

        test('should not create duplicate live regions', () => {
            eventManager.createAriaLiveRegion();
            eventManager.createAriaLiveRegion();
            
            const liveRegions = document.querySelectorAll('#las-aria-live');
            expect(liveRegions.length).toBe(1);
        });

        test('should announce messages to screen readers', (done) => {
            eventManager.screenReaderDetected = true;
            
            eventManager.announceToScreenReader('Test message');
            
            setTimeout(() => {
                const liveRegion = document.getElementById('las-aria-live');
                expect(liveRegion.textContent).toBe('Test message');
                done();
            }, 150);
        });

        test('should clear messages after announcement', (done) => {
            eventManager.screenReaderDetected = true;
            
            eventManager.announceToScreenReader('Test message');
            
            setTimeout(() => {
                const liveRegion = document.getElementById('las-aria-live');
                expect(liveRegion.textContent).toBe('');
                done();
            }, 3100);
        });

        test('should not announce when screen reader not detected', () => {
            eventManager.screenReaderDetected = false;
            
            eventManager.announceToScreenReader('Test message');
            
            const liveRegion = document.getElementById('las-aria-live');
            expect(liveRegion.textContent).toBe('');
        });
    });

    describe('Element Description', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should get description from aria-label', () => {
            const button = testContainer.querySelector('#test-btn-2');
            const description = eventManager.getElementDescription(button);
            expect(description).toBe('Custom Button');
        });

        test('should get description from text content', () => {
            const button = testContainer.querySelector('#test-btn-1');
            const description = eventManager.getElementDescription(button);
            expect(description).toBe('Button 1');
        });

        test('should get description from placeholder', () => {
            const input = testContainer.querySelector('#test-input-1');
            const description = eventManager.getElementDescription(input);
            expect(description).toBe('Test input');
        });

        test('should handle null elements', () => {
            const description = eventManager.getElementDescription(null);
            expect(description).toBe('element');
        });

        test('should fallback to tag name and type', () => {
            const div = document.createElement('div');
            const description = eventManager.getElementDescription(div);
            expect(description).toBe('div element');
        });
    });

    describe('Focus Management', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should track focus history', () => {
            const button1 = testContainer.querySelector('#test-btn-1');
            const button2 = testContainer.querySelector('#test-btn-2');
            
            // Simulate focus events
            button1.dispatchEvent(new Event('focus'));
            button2.dispatchEvent(new Event('focus'));
            
            expect(eventManager.focusHistory).toContain(button1);
            expect(eventManager.focusHistory).toContain(button2);
        });

        test('should get focusable elements', () => {
            const focusableElements = eventManager.getFocusableElements(testContainer);
            
            expect(focusableElements.length).toBeGreaterThan(0);
            expect(focusableElements).toContain(testContainer.querySelector('#test-btn-1'));
            expect(focusableElements).toContain(testContainer.querySelector('#test-input-1'));
        });

        test('should filter out hidden elements', () => {
            const hiddenButton = testContainer.querySelector('#test-btn-2');
            hiddenButton.style.display = 'none';
            
            const focusableElements = eventManager.getFocusableElements(testContainer);
            
            expect(focusableElements).not.toContain(hiddenButton);
        });
    });

    describe('Accessibility Detection', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should detect high contrast mode', () => {
            eventManager.detectHighContrastMode();
            
            // The test environment may not support high contrast detection
            expect(typeof eventManager.highContrastMode).toBe('boolean');
        });

        test('should detect reduced motion preference', () => {
            // Mock matchMedia
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            eventManager.detectReducedMotionPreference();
            
            expect(typeof eventManager.reducedMotionPreference).toBe('boolean');
        });

        test('should detect screen reader', () => {
            eventManager.detectScreenReader();
            
            expect(typeof eventManager.screenReaderDetected).toBe('boolean');
        });
    });

    describe('Touch Support', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should handle touch gestures', () => {
            const button = testContainer.querySelector('#test-btn-1');
            
            // Mock touch events
            const touchStart = new TouchEvent('touchstart', {
                touches: [{ clientX: 100, clientY: 100 }]
            });
            
            const touchEnd = new TouchEvent('touchend', {
                changedTouches: [{ clientX: 200, clientY: 100 }]
            });
            
            button.dispatchEvent(touchStart);
            
            setTimeout(() => {
                button.dispatchEvent(touchEnd);
                
                // Should emit swipe gesture event
                expect(mockCore.emit).toHaveBeenCalledWith('gesture:swipe', expect.any(Object));
            }, 100);
        });

        test('should provide haptic feedback', () => {
            // Mock navigator.vibrate
            navigator.vibrate = jest.fn();
            
            eventManager.provideHapticFeedback('light');
            
            expect(navigator.vibrate).toHaveBeenCalledWith([10]);
        });

        test('should not provide haptic feedback when reduced motion is preferred', () => {
            navigator.vibrate = jest.fn();
            eventManager.reducedMotionPreference = true;
            
            eventManager.provideHapticFeedback('light');
            
            expect(navigator.vibrate).not.toHaveBeenCalled();
        });
    });

    describe('Audio Feedback', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should provide audio feedback when supported', () => {
            // Mock AudioContext
            const mockOscillator = {
                connect: jest.fn(),
                frequency: { setValueAtTime: jest.fn() },
                start: jest.fn(),
                stop: jest.fn(),
                type: 'sine'
            };
            
            const mockGainNode = {
                connect: jest.fn(),
                gain: {
                    setValueAtTime: jest.fn(),
                    exponentialRampToValueAtTime: jest.fn()
                }
            };
            
            const mockAudioContext = {
                createOscillator: jest.fn(() => mockOscillator),
                createGain: jest.fn(() => mockGainNode),
                destination: {},
                currentTime: 0
            };
            
            window.AudioContext = jest.fn(() => mockAudioContext);
            
            eventManager.provideFeedbackSound('click');
            
            expect(mockAudioContext.createOscillator).toHaveBeenCalled();
            expect(mockOscillator.start).toHaveBeenCalled();
        });

        test('should handle audio context errors gracefully', () => {
            window.AudioContext = jest.fn(() => {
                throw new Error('Audio not supported');
            });
            
            expect(() => {
                eventManager.provideFeedbackSound('click');
            }).not.toThrow();
        });
    });

    describe('Responsive Interactions', () => {
        beforeEach(async () => {
            await eventManager.init();
        });

        test('should adjust touch targets for touch devices', () => {
            // Mock touch device detection
            Object.defineProperty(window, 'ontouchstart', {
                value: true,
                writable: true
            });
            
            eventManager.setupResponsiveInteractions();
            
            expect(document.body.classList.contains('las-touch-device')).toBe(true);
        });

        test('should identify small touch targets', () => {
            const smallButton = document.createElement('button');
            smallButton.style.width = '20px';
            smallButton.style.height = '20px';
            testContainer.appendChild(smallButton);
            
            // Mock getBoundingClientRect for small size
            smallButton.getBoundingClientRect = jest.fn(() => ({
                width: 20,
                height: 20
            }));
            
            Object.defineProperty(window, 'ontouchstart', {
                value: true,
                writable: true
            });
            
            eventManager.setupResponsiveInteractions();
            
            expect(smallButton.classList.contains('las-small-touch-target')).toBe(true);
        });
    });
});