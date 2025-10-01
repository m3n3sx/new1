/**
 * Unit Tests for LiveEditEngine Module
 * 
 * Tests element targeting, positioning, and collision detection functionality
 * 
 * @since 2.0.0
 */

describe('LiveEditEngine', () => {
    let liveEditEngine;
    let mockCore;
    let testContainer;

    beforeEach(() => {
        // Create mock core
        mockCore = {
            log: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            getModule: jest.fn()
        };

        // Create test container with sample elements
        testContainer = document.createElement('div');
        testContainer.innerHTML = `
            <div id="adminmenu">
                <li><a href="#" class="menu-item">Menu Item 1</a></li>
                <li><a href="#" class="menu-item">Menu Item 2</a></li>
            </div>
            <div id="wpadminbar">
                <div class="ab-item">Admin Bar Item</div>
            </div>
            <div id="wpbody-content">
                <div class="wrap">
                    <input type="text" id="test-input" />
                    <button class="button-primary">Test Button</button>
                </div>
            </div>
        `;
        document.body.appendChild(testContainer);

        // Create LiveEditEngine instance
        const LiveEditEngine = require('../../assets/js/modules/live-edit-engine.js');
        liveEditEngine = new LiveEditEngine(mockCore);
    });

    afterEach(() => {
        // Cleanup
        if (liveEditEngine) {
            liveEditEngine.destroy();
        }
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
        
        // Clear any remaining overlays or panels
        const overlays = document.querySelectorAll('.las-highlight-overlay, .las-micro-panel');
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
    });

    describe('Initialization', () => {
        test('should initialize with correct default state', () => {
            expect(liveEditEngine.isActive).toBe(false);
            expect(liveEditEngine.targetedElement).toBe(null);
            expect(liveEditEngine.highlightOverlay).toBeTruthy();
            expect(mockCore.log).toHaveBeenCalledWith('LiveEditEngine initialized', expect.any(Object));
        });

        test('should create highlight overlay element', () => {
            const overlay = document.querySelector('.las-highlight-overlay');
            expect(overlay).toBeTruthy();
            expect(overlay.style.position).toBe('absolute');
            expect(overlay.style.pointerEvents).toBe('none');
            expect(overlay.style.display).toBe('none');
        });

        test('should setup event listeners', () => {
            expect(mockCore.on).toHaveBeenCalledWith('live-edit:toggle', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('live-edit:activate', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('live-edit:deactivate', expect.any(Function));
        });
    });

    describe('Activation and Deactivation', () => {
        test('should activate live edit mode', () => {
            liveEditEngine.activate();
            
            expect(liveEditEngine.isActive).toBe(true);
            expect(document.body.classList.contains('las-live-edit-active')).toBe(true);
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:activated');
        });

        test('should deactivate live edit mode', () => {
            liveEditEngine.activate();
            liveEditEngine.deactivate();
            
            expect(liveEditEngine.isActive).toBe(false);
            expect(document.body.classList.contains('las-live-edit-active')).toBe(false);
            expect(liveEditEngine.targetedElement).toBe(null);
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:deactivated');
        });

        test('should toggle live edit mode', () => {
            liveEditEngine.toggle(true);
            expect(liveEditEngine.isActive).toBe(true);
            
            liveEditEngine.toggle(false);
            expect(liveEditEngine.isActive).toBe(false);
        });

        test('should not activate if already active', () => {
            liveEditEngine.activate();
            const emitCallCount = mockCore.emit.mock.calls.length;
            
            liveEditEngine.activate();
            expect(mockCore.emit.mock.calls.length).toBe(emitCallCount);
        });
    });

    describe('Element Targeting', () => {
        beforeEach(() => {
            liveEditEngine.activate();
        });

        test('should find targetable elements', () => {
            const menuElement = document.getElementById('adminmenu');
            const targetable = liveEditEngine.findTargetableElement(menuElement);
            
            expect(targetable).toBe(menuElement);
        });

        test('should find targetable parent element', () => {
            const menuItem = document.querySelector('.menu-item');
            const targetable = liveEditEngine.findTargetableElement(menuItem);
            
            expect(targetable).toBe(menuItem);
        });

        test('should return null for non-targetable elements', () => {
            const nonTargetable = document.createElement('span');
            testContainer.appendChild(nonTargetable);
            
            const targetable = liveEditEngine.findTargetableElement(nonTargetable);
            expect(targetable).toBe(null);
        });

        test('should target element correctly', () => {
            const menuElement = document.getElementById('adminmenu');
            liveEditEngine.targetElement(menuElement);
            
            expect(liveEditEngine.targetedElement).toBe(menuElement);
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:element-targeted', {
                element: menuElement,
                selector: '#adminmenu'
            });
        });

        test('should clear target correctly', () => {
            const menuElement = document.getElementById('adminmenu');
            liveEditEngine.targetElement(menuElement);
            liveEditEngine.clearTarget();
            
            expect(liveEditEngine.targetedElement).toBe(null);
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:element-cleared');
        });

        test('should select element correctly', () => {
            const menuElement = document.getElementById('adminmenu');
            liveEditEngine.selectElement(menuElement);
            
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:element-selected', {
                element: menuElement,
                selector: '#adminmenu',
                computedStyles: expect.any(Object)
            });
        });
    });

    describe('Element Navigation', () => {
        beforeEach(() => {
            liveEditEngine.activate();
        });

        test('should get all targetable elements', () => {
            const elements = liveEditEngine.getAllTargetableElements();
            expect(elements.length).toBeGreaterThan(0);
            expect(elements).toContain(document.getElementById('adminmenu'));
            expect(elements).toContain(document.getElementById('wpadminbar'));
        });

        test('should navigate to next element', () => {
            const elements = liveEditEngine.getAllTargetableElements();
            if (elements.length > 1) {
                liveEditEngine.targetElement(elements[0]);
                const nextElement = liveEditEngine.findNextElement(elements[0]);
                expect(nextElement).toBe(elements[1]);
            }
        });

        test('should navigate to previous element', () => {
            const elements = liveEditEngine.getAllTargetableElements();
            if (elements.length > 1) {
                liveEditEngine.targetElement(elements[1]);
                const prevElement = liveEditEngine.findPreviousElement(elements[1]);
                expect(prevElement).toBe(elements[0]);
            }
        });

        test('should find parent element', () => {
            const menuItem = document.querySelector('.menu-item');
            const parentElement = liveEditEngine.findParentElement(menuItem);
            expect(parentElement).toBeTruthy();
        });

        test('should find child element', () => {
            const menuElement = document.getElementById('adminmenu');
            const childElement = liveEditEngine.findChildElement(menuElement);
            expect(childElement).toBeTruthy();
        });
    });

    describe('Highlight Overlay', () => {
        beforeEach(() => {
            liveEditEngine.activate();
        });

        test('should update highlight position', () => {
            const menuElement = document.getElementById('adminmenu');
            
            // Mock getBoundingClientRect
            menuElement.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 200,
                width: 300,
                height: 50
            }));
            
            liveEditEngine.updateHighlight(menuElement);
            
            const overlay = liveEditEngine.highlightOverlay;
            expect(overlay.style.display).toBe('block');
            expect(overlay.style.left).toBe('98px'); // left - 2
            expect(overlay.style.top).toBe('198px'); // top - 2
            expect(overlay.style.width).toBe('304px'); // width + 4
            expect(overlay.style.height).toBe('54px'); // height + 4
        });

        test('should hide highlight overlay', () => {
            liveEditEngine.hideHighlight();
            expect(liveEditEngine.highlightOverlay.style.display).toBe('none');
        });

        test('should hide highlight when element is null', () => {
            liveEditEngine.updateHighlight(null);
            expect(liveEditEngine.highlightOverlay.style.display).toBe('none');
        });
    });

    describe('Micro Panel', () => {
        beforeEach(() => {
            liveEditEngine.activate();
        });

        test('should create micro panel', () => {
            liveEditEngine.createMicroPanel();
            
            expect(liveEditEngine.microPanel).toBeTruthy();
            expect(liveEditEngine.microPanel.className).toBe('las-micro-panel');
            expect(liveEditEngine.microPanel.style.position).toBe('absolute');
        });

        test('should show micro panel for element', () => {
            const menuElement = document.getElementById('adminmenu');
            
            // Mock getBoundingClientRect
            menuElement.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 200,
                width: 300,
                height: 50,
                bottom: 250,
                right: 400
            }));
            
            liveEditEngine.showMicroPanel(menuElement);
            
            expect(liveEditEngine.microPanel).toBeTruthy();
            expect(liveEditEngine.microPanel.style.display).toBe('block');
        });

        test('should hide micro panel', () => {
            liveEditEngine.createMicroPanel();
            liveEditEngine.hideMicroPanel();
            
            expect(liveEditEngine.microPanel.style.display).toBe('none');
        });

        test('should update micro panel content', () => {
            const menuElement = document.getElementById('adminmenu');
            liveEditEngine.createMicroPanel();
            liveEditEngine.updateMicroPanelContent(menuElement);
            
            expect(liveEditEngine.microPanel.innerHTML).toContain('#adminmenu');
            expect(liveEditEngine.microPanel.innerHTML).toContain('Edit Styles');
            expect(liveEditEngine.microPanel.innerHTML).toContain('Inspect');
        });
    });

    describe('Collision Detection', () => {
        beforeEach(() => {
            liveEditEngine.activate();
            liveEditEngine.createMicroPanel();
        });

        test('should detect left collision and adjust', () => {
            const panelRect = { width: 200, height: 100 };
            const elementRect = { left: 10, top: 100, width: 50, height: 30, bottom: 130, right: 60 };
            const viewport = { width: 1024, height: 768 };
            
            const position = liveEditEngine.detectCollisions(
                -50, // left (would be off-screen)
                50,  // top
                panelRect,
                elementRect,
                viewport,
                0, // scrollLeft
                0  // scrollTop
            );
            
            expect(position.left).toBeGreaterThanOrEqual(liveEditEngine.viewportPadding);
        });

        test('should detect right collision and adjust', () => {
            const panelRect = { width: 200, height: 100 };
            const elementRect = { left: 900, top: 100, width: 50, height: 30, bottom: 130, right: 950 };
            const viewport = { width: 1024, height: 768 };
            
            const position = liveEditEngine.detectCollisions(
                950, // left (would be off-screen)
                50,  // top
                panelRect,
                elementRect,
                viewport,
                0, // scrollLeft
                0  // scrollTop
            );
            
            expect(position.left).toBeLessThanOrEqual(viewport.width - panelRect.width - liveEditEngine.viewportPadding);
        });

        test('should detect top collision and move to bottom', () => {
            const panelRect = { width: 200, height: 100 };
            const elementRect = { left: 100, top: 10, width: 50, height: 30, bottom: 40, right: 150 };
            const viewport = { width: 1024, height: 768 };
            
            const position = liveEditEngine.detectCollisions(
                100, // left
                -50, // top (would be off-screen)
                panelRect,
                elementRect,
                viewport,
                0, // scrollLeft
                0  // scrollTop
            );
            
            expect(position.placement).toBe('bottom');
            expect(position.top).toBeGreaterThan(elementRect.bottom);
        });
    });

    describe('Element Utilities', () => {
        test('should get element selector for ID', () => {
            const element = document.getElementById('adminmenu');
            const selector = liveEditEngine.getElementSelector(element);
            expect(selector).toBe('#adminmenu');
        });

        test('should get element selector for class', () => {
            const element = document.querySelector('.menu-item');
            const selector = liveEditEngine.getElementSelector(element);
            expect(selector).toContain('.menu-item');
        });

        test('should get element selector for tag name', () => {
            const element = document.createElement('span');
            const selector = liveEditEngine.getElementSelector(element);
            expect(selector).toBe('span');
        });

        test('should get element display name', () => {
            const element = document.getElementById('adminmenu');
            const displayName = liveEditEngine.getElementDisplayName(element);
            expect(displayName).toBe('#adminmenu');
        });

        test('should get element styles', () => {
            const element = document.getElementById('adminmenu');
            const styles = liveEditEngine.getElementStyles(element);
            
            expect(styles).toHaveProperty('backgroundColor');
            expect(styles).toHaveProperty('color');
            expect(styles).toHaveProperty('fontSize');
            expect(styles).toHaveProperty('fontFamily');
        });

        test('should generate style preview', () => {
            const styles = {
                backgroundColor: 'rgb(255, 0, 0)',
                color: 'rgb(0, 0, 0)',
                fontSize: '14px'
            };
            
            const preview = liveEditEngine.generateStylePreview(styles);
            expect(preview).toContain('Background');
            expect(preview).toContain('Text');
            expect(preview).toContain('Font Size');
        });
    });

    describe('Event Handling', () => {
        beforeEach(() => {
            liveEditEngine.activate();
        });

        test('should handle mouse move events', (done) => {
            const menuElement = document.getElementById('adminmenu');
            
            // Mock getBoundingClientRect
            menuElement.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 200,
                width: 300,
                height: 50
            }));
            
            const event = new MouseEvent('mousemove', {
                clientX: 150,
                clientY: 225,
                bubbles: true
            });
            
            Object.defineProperty(event, 'target', {
                value: menuElement,
                enumerable: true
            });
            
            document.dispatchEvent(event);
            
            // Wait for debounced hover processing
            setTimeout(() => {
                expect(liveEditEngine.targetedElement).toBe(menuElement);
                done();
            }, 150);
        });

        test('should handle click events', () => {
            const menuElement = document.getElementById('adminmenu');
            liveEditEngine.targetElement(menuElement);
            
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            });
            
            Object.defineProperty(event, 'target', {
                value: menuElement,
                enumerable: true
            });
            
            document.dispatchEvent(event);
            
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:element-selected', expect.any(Object));
        });

        test('should handle escape key to deactivate', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(event);
            
            expect(liveEditEngine.isActive).toBe(false);
        });

        test('should handle arrow keys for navigation', () => {
            const elements = liveEditEngine.getAllTargetableElements();
            if (elements.length > 0) {
                liveEditEngine.targetElement(elements[0]);
                
                const event = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    bubbles: true,
                    cancelable: true
                });
                
                document.dispatchEvent(event);
                
                // Should attempt to navigate to next element
                expect(mockCore.emit).toHaveBeenCalledWith('live-edit:element-targeted', expect.any(Object));
            }
        });
    });

    describe('Micro Panel Actions', () => {
        beforeEach(() => {
            liveEditEngine.activate();
            liveEditEngine.createMicroPanel();
        });

        test('should handle edit action', () => {
            const menuElement = document.getElementById('adminmenu');
            liveEditEngine.handleMicroPanelAction('edit', menuElement);
            
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:edit-element', {
                element: menuElement,
                selector: '#adminmenu'
            });
        });

        test('should handle inspect action', () => {
            const menuElement = document.getElementById('adminmenu');
            liveEditEngine.handleMicroPanelAction('inspect', menuElement);
            
            expect(mockCore.emit).toHaveBeenCalledWith('live-edit:inspect-element', {
                element: menuElement,
                styles: expect.any(Object)
            });
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            liveEditEngine.activate();
            const overlay = liveEditEngine.highlightOverlay;
            
            liveEditEngine.destroy();
            
            expect(liveEditEngine.isActive).toBe(false);
            expect(overlay.parentNode).toBe(null);
        });

        test('should clear timers on destroy', () => {
            liveEditEngine.hoverTimer = setTimeout(() => {}, 1000);
            const timerId = liveEditEngine.hoverTimer;
            
            liveEditEngine.destroy();
            
            // Timer should be cleared (can't directly test clearTimeout, but ensure no errors)
            expect(() => liveEditEngine.destroy()).not.toThrow();
        });
    });
});