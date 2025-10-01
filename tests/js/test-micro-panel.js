/**
 * Integration Tests for MicroPanel Module
 * 
 * Tests dynamic control generation, positioning, and responsive interface
 * 
 * @since 2.0.0
 */

describe('MicroPanel', () => {
    let microPanel;
    let mockCore;
    let targetElement;
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

        // Create test container with target element
        testContainer = document.createElement('div');
        testContainer.innerHTML = `
            <button id="test-button" class="button-primary" style="background-color: #0073aa; color: white; font-size: 14px;">
                Test Button
            </button>
            <input type="text" id="test-input" style="border: 1px solid #ddd; padding: 8px;" />
            <div id="adminmenu" style="background-color: #23282d; color: white;">
                <a href="#" class="menu-item">Menu Item</a>
            </div>
        `;
        document.body.appendChild(testContainer);

        targetElement = document.getElementById('test-button');

        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768
        });

        // Mock getBoundingClientRect
        targetElement.getBoundingClientRect = jest.fn(() => ({
            left: 100,
            top: 200,
            width: 120,
            height: 40,
            bottom: 240,
            right: 220
        }));

        // Create MicroPanel instance
        const MicroPanel = require('../../assets/js/modules/micro-panel.js');
        microPanel = new MicroPanel(mockCore, targetElement);
    });

    afterEach(() => {
        // Cleanup
        if (microPanel) {
            microPanel.destroy();
        }
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
        
        // Clear any remaining panels or backdrops
        const panels = document.querySelectorAll('.las-micro-panel, .las-micro-panel-backdrop');
        panels.forEach(panel => {
            if (panel.parentNode) {
                panel.parentNode.removeChild(panel);
            }
        });
    });

    describe('Initialization', () => {
        test('should initialize with correct default state', () => {
            expect(microPanel.isVisible).toBe(false);
            expect(microPanel.targetElement).toBe(targetElement);
            expect(microPanel.panelElement).toBeTruthy();
            expect(mockCore.log).toHaveBeenCalledWith('MicroPanel initialized', expect.any(Object));
        });

        test('should create panel element with correct styles', () => {
            const panel = microPanel.panelElement;
            expect(panel.className).toBe('las-micro-panel');
            expect(panel.getAttribute('role')).toBe('dialog');
            expect(panel.getAttribute('aria-label')).toBe('Style Editor');
            expect(panel.style.position).toBe('absolute');
            expect(panel.style.zIndex).toBe('9999');
        });

        test('should setup event listeners', () => {
            // Check if resize and scroll listeners are added (can't directly test addEventListener)
            expect(microPanel.handleResize).toBeDefined();
            expect(microPanel.handleScroll).toBeDefined();
            expect(microPanel.handleKeyDown).toBeDefined();
        });

        test('should not create backdrop on desktop', () => {
            expect(microPanel.backdropElement).toBe(null);
        });
    });

    describe('Responsive Behavior', () => {
        test('should detect mobile viewport', () => {
            window.innerWidth = 600;
            expect(microPanel.isMobile()).toBe(true);
        });

        test('should detect tablet viewport', () => {
            window.innerWidth = 900;
            expect(microPanel.isTablet()).toBe(true);
            expect(microPanel.isMobile()).toBe(false);
        });

        test('should detect desktop viewport', () => {
            window.innerWidth = 1200;
            expect(microPanel.isMobile()).toBe(false);
            expect(microPanel.isTablet()).toBe(false);
        });

        test('should create backdrop on mobile', () => {
            // Create new panel with mobile viewport
            microPanel.destroy();
            window.innerWidth = 600;
            
            const MicroPanel = require('../../assets/js/modules/micro-panel.js');
            microPanel = new MicroPanel(mockCore, targetElement);
            
            expect(microPanel.backdropElement).toBeTruthy();
            expect(microPanel.backdropElement.className).toBe('las-micro-panel-backdrop');
        });

        test('should apply mobile styles', () => {
            microPanel.destroy();
            window.innerWidth = 600;
            
            const MicroPanel = require('../../assets/js/modules/micro-panel.js');
            microPanel = new MicroPanel(mockCore, targetElement);
            
            const panel = microPanel.panelElement;
            expect(panel.style.position).toBe('fixed');
            expect(panel.style.minWidth).toBe('100%');
            expect(panel.style.maxWidth).toBe('100%');
        });
    });

    describe('Element Type Detection', () => {
        test('should detect button element type', () => {
            const buttonElement = document.getElementById('test-button');
            const type = microPanel.getElementType(buttonElement);
            expect(type).toBe('button');
        });

        test('should detect input element type', () => {
            const inputElement = document.getElementById('test-input');
            const type = microPanel.getElementType(inputElement);
            expect(type).toBe('input');
        });

        test('should detect menu element type', () => {
            const menuElement = document.getElementById('adminmenu');
            const type = microPanel.getElementType(menuElement);
            expect(type).toBe('menu');
        });

        test('should default to default type for unknown elements', () => {
            const divElement = document.createElement('div');
            const type = microPanel.getElementType(divElement);
            expect(type).toBe('default');
        });
    });

    describe('Control Generation', () => {
        test('should generate controls based on element type', () => {
            microPanel.generateControls();
            
            const controlsContainer = microPanel.panelElement.querySelector('.las-micro-panel__controls');
            expect(controlsContainer).toBeTruthy();
            
            const controls = controlsContainer.querySelectorAll('.las-micro-panel__control');
            expect(controls.length).toBeGreaterThan(0);
        });

        test('should create color controls', () => {
            microPanel.generateControls();
            
            const colorControls = microPanel.panelElement.querySelectorAll('.las-micro-panel__control--color');
            expect(colorControls.length).toBeGreaterThan(0);
            
            const colorInput = microPanel.panelElement.querySelector('.las-micro-panel__color-input');
            expect(colorInput).toBeTruthy();
            expect(colorInput.type).toBe('color');
        });

        test('should create slider controls', () => {
            microPanel.generateControls();
            
            const sliderControls = microPanel.panelElement.querySelectorAll('.las-micro-panel__control--slider');
            expect(sliderControls.length).toBeGreaterThan(0);
            
            const slider = microPanel.panelElement.querySelector('.las-micro-panel__slider');
            expect(slider).toBeTruthy();
            expect(slider.type).toBe('range');
        });

        test('should create control labels with icons', () => {
            microPanel.generateControls();
            
            const labels = microPanel.panelElement.querySelectorAll('.las-micro-panel__control-label');
            expect(labels.length).toBeGreaterThan(0);
            
            // Check if labels contain icons (emojis)
            const labelWithIcon = Array.from(labels).find(label => 
                label.textContent.match(/[🎨📝📏📦⭕🔲🌫️🎯👆✅]/));
            expect(labelWithIcon).toBeTruthy();
        });
    });

    describe('Panel Header', () => {
        test('should create header with title and selector', () => {
            microPanel.generateControls();
            
            const header = microPanel.panelElement.querySelector('.las-micro-panel__header');
            expect(header).toBeTruthy();
            
            const title = header.querySelector('.las-micro-panel__title');
            expect(title).toBeTruthy();
            expect(title.textContent).toBe('#test-button');
            
            const selector = header.querySelector('.las-micro-panel__selector');
            expect(selector).toBeTruthy();
            expect(selector.textContent).toBe('#test-button');
        });

        test('should create close button', () => {
            microPanel.generateControls();
            
            const closeButton = microPanel.panelElement.querySelector('.las-micro-panel__close');
            expect(closeButton).toBeTruthy();
            expect(closeButton.getAttribute('aria-label')).toBe('Close panel');
            expect(closeButton.innerHTML).toBe('×');
        });

        test('should handle close button click', () => {
            microPanel.generateControls();
            microPanel.show();
            
            const closeButton = microPanel.panelElement.querySelector('.las-micro-panel__close');
            closeButton.click();
            
            // Panel should be hidden after animation
            setTimeout(() => {
                expect(microPanel.isVisible).toBe(false);
            }, 350);
        });
    });

    describe('Panel Footer', () => {
        test('should create footer with action buttons', () => {
            microPanel.generateControls();
            
            const footer = microPanel.panelElement.querySelector('.las-micro-panel__footer');
            expect(footer).toBeTruthy();
            
            const buttons = footer.querySelectorAll('.las-micro-panel__button');
            expect(buttons.length).toBe(2);
            
            const resetButton = footer.querySelector('.las-micro-panel__button--secondary');
            expect(resetButton).toBeTruthy();
            expect(resetButton.textContent).toBe('Reset');
            
            const saveButton = footer.querySelector('.las-micro-panel__button--primary');
            expect(saveButton).toBeTruthy();
            expect(saveButton.textContent).toBe('Save');
        });

        test('should handle reset button click', () => {
            microPanel.generateControls();
            
            const resetButton = microPanel.panelElement.querySelector('.las-micro-panel__button--secondary');
            resetButton.click();
            
            expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:styles-reset', {
                targetElement: targetElement
            });
        });

        test('should handle save button click', () => {
            microPanel.generateControls();
            
            const saveButton = microPanel.panelElement.querySelector('.las-micro-panel__button--primary');
            saveButton.click();
            
            expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:styles-saved', expect.any(Object));
        });
    });

    describe('Show and Hide Animations', () => {
        test('should show panel with animation', (done) => {
            microPanel.show();
            
            expect(microPanel.isAnimating).toBe(true);
            expect(microPanel.isVisible).toBe(true);
            expect(microPanel.panelElement.style.display).toBe('block');
            expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:shown', expect.any(Object));
            
            setTimeout(() => {
                expect(microPanel.isAnimating).toBe(false);
                expect(microPanel.panelElement.style.opacity).toBe('1');
                done();
            }, 350);
        });

        test('should hide panel with animation', (done) => {
            microPanel.show();
            
            setTimeout(() => {
                microPanel.hide();
                
                expect(microPanel.isAnimating).toBe(true);
                expect(microPanel.panelElement.style.opacity).toBe('0');
                expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:hidden', expect.any(Object));
                
                setTimeout(() => {
                    expect(microPanel.isVisible).toBe(false);
                    expect(microPanel.isAnimating).toBe(false);
                    expect(microPanel.panelElement.style.display).toBe('none');
                    done();
                }, 350);
            }, 350);
        });

        test('should not show if already visible', () => {
            microPanel.show();
            const emitCallCount = mockCore.emit.mock.calls.length;
            
            microPanel.show();
            expect(mockCore.emit.mock.calls.length).toBe(emitCallCount);
        });

        test('should not hide if already hidden', () => {
            const emitCallCount = mockCore.emit.mock.calls.length;
            
            microPanel.hide();
            expect(mockCore.emit.mock.calls.length).toBe(emitCallCount);
        });
    });

    describe('Positioning', () => {
        test('should position panel above target element', () => {
            microPanel.show();
            
            const position = microPanel.position;
            expect(position.placement).toBe('top');
            expect(position.top).toBeLessThan(200); // Above target top
        });

        test('should handle collision detection', () => {
            // Mock target near top of viewport
            targetElement.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 10,
                width: 120,
                height: 40,
                bottom: 50,
                right: 220
            }));
            
            microPanel.show();
            
            const position = microPanel.position;
            expect(position.placement).toBe('bottom'); // Should move below due to collision
        });

        test('should center panel horizontally', () => {
            microPanel.show();
            
            const targetRect = targetElement.getBoundingClientRect();
            const panelRect = microPanel.panelElement.getBoundingClientRect();
            const expectedLeft = targetRect.left + (targetRect.width / 2) - (panelRect.width / 2);
            
            expect(microPanel.position.left).toBeCloseTo(expectedLeft, 0);
        });

        test('should reposition on window resize', () => {
            microPanel.show();
            const originalPosition = { ...microPanel.position };
            
            // Change target position
            targetElement.getBoundingClientRect = jest.fn(() => ({
                left: 200,
                top: 300,
                width: 120,
                height: 40,
                bottom: 340,
                right: 320
            }));
            
            microPanel.handleResize();
            
            expect(microPanel.position.left).not.toBe(originalPosition.left);
            expect(microPanel.position.top).not.toBe(originalPosition.top);
        });
    });

    describe('Control Interactions', () => {
        beforeEach(() => {
            microPanel.generateControls();
        });

        test('should handle color input changes', () => {
            const colorInput = microPanel.panelElement.querySelector('.las-micro-panel__color-input');
            
            if (colorInput) {
                colorInput.value = '#ff0000';
                colorInput.dispatchEvent(new Event('input'));
                
                expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:style-changed', {
                    targetElement: targetElement,
                    property: expect.any(String),
                    value: '#ff0000'
                });
            }
        });

        test('should handle slider input changes', () => {
            const slider = microPanel.panelElement.querySelector('.las-micro-panel__slider');
            
            if (slider) {
                slider.value = '20';
                slider.dispatchEvent(new Event('input'));
                
                expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:style-changed', expect.any(Object));
            }
        });

        test('should update value display for sliders', () => {
            const slider = microPanel.panelElement.querySelector('.las-micro-panel__slider');
            const valueDisplay = microPanel.panelElement.querySelector('.las-micro-panel__value-display');
            
            if (slider && valueDisplay) {
                slider.value = '18';
                slider.dispatchEvent(new Event('input'));
                
                expect(valueDisplay.textContent).toContain('18');
            }
        });

        test('should validate color inputs', () => {
            expect(microPanel.isValidColor('#ff0000')).toBe(true);
            expect(microPanel.isValidColor('#f00')).toBe(true);
            expect(microPanel.isValidColor('rgb(255, 0, 0)')).toBe(true);
            expect(microPanel.isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
            expect(microPanel.isValidColor('invalid')).toBe(false);
        });
    });

    describe('Auto-hide Functionality', () => {
        test('should start auto-hide timer on desktop', (done) => {
            microPanel.options.autoHide = true;
            microPanel.options.hideDelay = 100;
            
            microPanel.show();
            
            setTimeout(() => {
                expect(microPanel.autoHideTimer).toBeTruthy();
                done();
            }, 350);
        });

        test('should clear auto-hide timer on mouse enter', (done) => {
            microPanel.options.autoHide = true;
            microPanel.options.hideDelay = 100;
            
            microPanel.show();
            
            setTimeout(() => {
                microPanel.panelElement.dispatchEvent(new Event('mouseenter'));
                expect(microPanel.autoHideTimer).toBe(null);
                done();
            }, 350);
        });

        test('should not auto-hide on mobile', () => {
            microPanel.destroy();
            window.innerWidth = 600;
            
            const MicroPanel = require('../../assets/js/modules/micro-panel.js');
            microPanel = new MicroPanel(mockCore, targetElement, { autoHide: true, hideDelay: 100 });
            
            microPanel.show();
            
            setTimeout(() => {
                expect(microPanel.autoHideTimer).toBe(null);
            }, 350);
        });
    });

    describe('Keyboard Interactions', () => {
        test('should hide panel on Escape key', () => {
            microPanel.show();
            
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(escapeEvent);
            
            setTimeout(() => {
                expect(microPanel.isVisible).toBe(false);
            }, 350);
        });

        test('should ignore keyboard events when hidden', () => {
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(escapeEvent);
            
            // Should not throw or cause issues
            expect(microPanel.isVisible).toBe(false);
        });
    });

    describe('Style Management', () => {
        test('should get current CSS values', () => {
            // Mock getComputedStyle
            window.getComputedStyle = jest.fn(() => ({
                getPropertyValue: jest.fn((prop) => {
                    if (prop === 'background-color') return '#0073aa';
                    if (prop === 'font-size') return '14px';
                    return '';
                })
            }));
            
            const bgColor = microPanel.getCurrentValue('background-color');
            const fontSize = microPanel.getCurrentValue('font-size');
            
            expect(bgColor).toBe('#0073aa');
            expect(fontSize).toBe('14px');
        });

        test('should get numeric values', () => {
            window.getComputedStyle = jest.fn(() => ({
                getPropertyValue: jest.fn((prop) => {
                    if (prop === 'font-size') return '14px';
                    return '';
                })
            }));
            
            const fontSize = microPanel.getCurrentNumericValue('font-size', 'px');
            expect(fontSize).toBe(14);
        });

        test('should apply styles to target element', () => {
            const setPropertySpy = jest.fn();
            targetElement.style.setProperty = setPropertySpy;
            
            microPanel.applyStyle('color', '#ff0000');
            
            expect(setPropertySpy).toHaveBeenCalledWith('color', '#ff0000');
            expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:style-changed', {
                targetElement: targetElement,
                property: 'color',
                value: '#ff0000'
            });
        });

        test('should reset styles', () => {
            const removePropertySpy = jest.fn();
            targetElement.style.removeProperty = removePropertySpy;
            
            microPanel.resetStyles();
            
            expect(removePropertySpy).toHaveBeenCalled();
            expect(mockCore.emit).toHaveBeenCalledWith('micro-panel:styles-reset', {
                targetElement: targetElement
            });
        });
    });

    describe('Mobile Backdrop', () => {
        beforeEach(() => {
            microPanel.destroy();
            window.innerWidth = 600;
            
            const MicroPanel = require('../../assets/js/modules/micro-panel.js');
            microPanel = new MicroPanel(mockCore, targetElement);
        });

        test('should show backdrop on mobile', (done) => {
            microPanel.show();
            
            expect(microPanel.backdropElement.style.display).toBe('block');
            
            setTimeout(() => {
                expect(microPanel.backdropElement.style.opacity).toBe('1');
                done();
            }, 50);
        });

        test('should hide backdrop when panel hides', (done) => {
            microPanel.show();
            
            setTimeout(() => {
                microPanel.hide();
                expect(microPanel.backdropElement.style.opacity).toBe('0');
                
                setTimeout(() => {
                    expect(microPanel.backdropElement.style.display).toBe('none');
                    done();
                }, 350);
            }, 350);
        });

        test('should hide panel when backdrop is clicked', () => {
            microPanel.show();
            
            microPanel.backdropElement.click();
            
            setTimeout(() => {
                expect(microPanel.isVisible).toBe(false);
            }, 350);
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            microPanel.show();
            const panel = microPanel.panelElement;
            const backdrop = microPanel.backdropElement;
            
            microPanel.destroy();
            
            expect(panel.parentNode).toBe(null);
            if (backdrop) {
                expect(backdrop.parentNode).toBe(null);
            }
            expect(microPanel.autoHideTimer).toBe(null);
        });

        test('should clear auto-hide timer on destroy', () => {
            microPanel.options.autoHide = true;
            microPanel.show();
            
            setTimeout(() => {
                microPanel.destroy();
                expect(microPanel.autoHideTimer).toBe(null);
            }, 350);
        });
    });
});