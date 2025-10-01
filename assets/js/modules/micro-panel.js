/**
 * MicroPanel Module
 * 
 * Handles dynamic control generation, positioning, and responsive interface
 * for live editing micro-panels
 * 
 * @since 2.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * MicroPanel Class
     */
    class MicroPanel {
        constructor(core, targetElement, options = {}) {
            this.core = core;
            this.targetElement = targetElement;
            this.options = {
                showAnimations: true,
                autoHide: true,
                hideDelay: 3000,
                responsive: true,
                maxWidth: 320,
                minWidth: 200,
                ...options
            };
            
            // Panel state
            this.isVisible = false;
            this.isAnimating = false;
            this.position = { left: 0, top: 0, placement: 'top' };
            
            // DOM elements
            this.panelElement = null;
            this.backdropElement = null;
            
            // Control configurations
            this.controlConfigs = this.initializeControlConfigs();
            
            // Event handlers (bound to maintain context)
            this.handleResize = this.handleResize.bind(this);
            this.handleScroll = this.handleScroll.bind(this);
            this.handleClickOutside = this.handleClickOutside.bind(this);
            this.handleKeyDown = this.handleKeyDown.bind(this);
            
            // Auto-hide timer
            this.autoHideTimer = null;
            
            // Responsive breakpoints
            this.breakpoints = {
                mobile: 768,
                tablet: 1024
            };
            
            this.init();
        }

        /**
         * Initialize the micro panel
         */
        init() {
            this.createPanelElement();
            this.setupEventListeners();
            this.generateControls();
            
            this.core.log('MicroPanel initialized', {
                targetElement: this.targetElement.tagName,
                options: this.options
            });
        }

        /**
         * Initialize control configurations based on element type
         * @returns {Object} Control configurations
         */
        initializeControlConfigs() {
            const elementType = this.getElementType(this.targetElement);
            const baseControls = {
                backgroundColor: {
                    type: 'color',
                    label: 'Background',
                    property: 'background-color',
                    icon: '🎨'
                },
                textColor: {
                    type: 'color',
                    label: 'Text Color',
                    property: 'color',
                    icon: '📝'
                },
                fontSize: {
                    type: 'slider',
                    label: 'Font Size',
                    property: 'font-size',
                    min: 10,
                    max: 32,
                    unit: 'px',
                    icon: '📏'
                },
                padding: {
                    type: 'spacing',
                    label: 'Padding',
                    property: 'padding',
                    icon: '📦'
                },
                borderRadius: {
                    type: 'slider',
                    label: 'Border Radius',
                    property: 'border-radius',
                    min: 0,
                    max: 20,
                    unit: 'px',
                    icon: '⭕'
                }
            };
            
            // Element-specific controls
            const elementSpecificControls = {
                button: {
                    ...baseControls,
                    borderColor: {
                        type: 'color',
                        label: 'Border',
                        property: 'border-color',
                        icon: '🔲'
                    },
                    boxShadow: {
                        type: 'shadow',
                        label: 'Shadow',
                        property: 'box-shadow',
                        icon: '🌫️'
                    }
                },
                input: {
                    ...baseControls,
                    borderColor: {
                        type: 'color',
                        label: 'Border',
                        property: 'border-color',
                        icon: '🔲'
                    },
                    focusColor: {
                        type: 'color',
                        label: 'Focus Color',
                        property: '--focus-color',
                        icon: '🎯'
                    }
                },
                menu: {
                    backgroundColor: baseControls.backgroundColor,
                    textColor: baseControls.textColor,
                    hoverColor: {
                        type: 'color',
                        label: 'Hover Color',
                        property: '--hover-color',
                        icon: '👆'
                    },
                    activeColor: {
                        type: 'color',
                        label: 'Active Color',
                        property: '--active-color',
                        icon: '✅'
                    }
                }
            };
            
            return elementSpecificControls[elementType] || baseControls;
        }

        /**
         * Get element type for control configuration
         * @param {Element} element - Target element
         * @returns {string} Element type
         */
        getElementType(element) {
            if (element.matches('button, .button, .button-primary, .button-secondary')) {
                return 'button';
            }
            if (element.matches('input, textarea, select')) {
                return 'input';
            }
            if (element.matches('#adminmenu, #adminmenu li, #adminmenu a')) {
                return 'menu';
            }
            return 'default';
        }

        /**
         * Create the panel DOM element
         */
        createPanelElement() {
            this.panelElement = document.createElement('div');
            this.panelElement.className = 'las-micro-panel';
            this.panelElement.setAttribute('role', 'dialog');
            this.panelElement.setAttribute('aria-label', 'Style Editor');
            
            // Apply base styles
            this.applyBaseStyles();
            
            // Create backdrop for mobile
            if (this.isMobile()) {
                this.createBackdrop();
            }
            
            document.body.appendChild(this.panelElement);
        }

        /**
         * Apply base CSS styles to the panel
         */
        applyBaseStyles() {
            const isMobile = this.isMobile();
            const isTablet = this.isTablet();
            
            this.panelElement.style.cssText = `
                position: ${isMobile ? 'fixed' : 'absolute'};
                z-index: 9999;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-radius: ${isMobile ? '12px 12px 0 0' : '8px'};
                padding: ${isMobile ? '20px' : '12px'};
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(0, 0, 0, 0.1);
                min-width: ${isMobile ? '100%' : this.options.minWidth + 'px'};
                max-width: ${isMobile ? '100%' : this.options.maxWidth + 'px'};
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: ${isMobile ? '16px' : '13px'};
                line-height: 1.4;
                display: none;
                opacity: 0;
                transform: ${isMobile ? 'translateY(100%)' : 'translateY(-10px)'};
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                ${isMobile ? 'bottom: 0; left: 0; right: 0;' : ''}
                ${isTablet ? 'max-width: 280px;' : ''}
            `;
        }

        /**
         * Create backdrop element for mobile
         */
        createBackdrop() {
            this.backdropElement = document.createElement('div');
            this.backdropElement.className = 'las-micro-panel-backdrop';
            this.backdropElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9998;
                opacity: 0;
                transition: opacity 0.3s ease;
                display: none;
            `;
            
            this.backdropElement.addEventListener('click', this.handleClickOutside);
            document.body.appendChild(this.backdropElement);
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            window.addEventListener('resize', this.handleResize);
            window.addEventListener('scroll', this.handleScroll, { passive: true });
            document.addEventListener('keydown', this.handleKeyDown);
            
            // Panel-specific events
            this.panelElement.addEventListener('mouseenter', () => {
                this.clearAutoHideTimer();
            });
            
            this.panelElement.addEventListener('mouseleave', () => {
                if (this.options.autoHide && !this.isMobile()) {
                    this.startAutoHideTimer();
                }
            });
        }

        /**
         * Generate controls based on element type
         */
        generateControls() {
            const header = this.createHeader();
            const controls = this.createControls();
            const footer = this.createFooter();
            
            this.panelElement.innerHTML = '';
            this.panelElement.appendChild(header);
            this.panelElement.appendChild(controls);
            this.panelElement.appendChild(footer);
        }

        /**
         * Create panel header
         * @returns {HTMLElement} Header element
         */
        createHeader() {
            const header = document.createElement('div');
            header.className = 'las-micro-panel__header';
            header.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            `;
            
            const title = document.createElement('div');
            title.className = 'las-micro-panel__title';
            title.style.cssText = `
                font-weight: 600;
                font-size: ${this.isMobile() ? '18px' : '14px'};
                color: #1d2327;
            `;
            title.textContent = this.getElementDisplayName();
            
            const selector = document.createElement('div');
            selector.className = 'las-micro-panel__selector';
            selector.style.cssText = `
                font-size: ${this.isMobile() ? '14px' : '11px'};
                color: #646970;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                margin-top: 2px;
            `;
            selector.textContent = this.getElementSelector();
            
            const closeButton = this.createCloseButton();
            
            const titleContainer = document.createElement('div');
            titleContainer.appendChild(title);
            titleContainer.appendChild(selector);
            
            header.appendChild(titleContainer);
            header.appendChild(closeButton);
            
            return header;
        }

        /**
         * Create close button
         * @returns {HTMLElement} Close button element
         */
        createCloseButton() {
            const closeButton = document.createElement('button');
            closeButton.className = 'las-micro-panel__close';
            closeButton.setAttribute('aria-label', 'Close panel');
            closeButton.style.cssText = `
                background: none;
                border: none;
                font-size: ${this.isMobile() ? '24px' : '18px'};
                color: #646970;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                width: ${this.isMobile() ? '32px' : '24px'};
                height: ${this.isMobile() ? '32px' : '24px'};
            `;
            closeButton.innerHTML = '×';
            
            closeButton.addEventListener('click', () => {
                this.hide();
            });
            
            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            });
            
            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.backgroundColor = 'transparent';
            });
            
            return closeButton;
        }

        /**
         * Create controls container
         * @returns {HTMLElement} Controls container element
         */
        createControls() {
            const container = document.createElement('div');
            container.className = 'las-micro-panel__controls';
            container.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: ${this.isMobile() ? '16px' : '12px'};
                margin-bottom: 16px;
            `;
            
            Object.entries(this.controlConfigs).forEach(([key, config]) => {
                const control = this.createControl(key, config);
                container.appendChild(control);
            });
            
            return container;
        }

        /**
         * Create individual control element
         * @param {string} key - Control key
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Control element
         */
        createControl(key, config) {
            const control = document.createElement('div');
            control.className = `las-micro-panel__control las-micro-panel__control--${config.type}`;
            control.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 6px;
            `;
            
            const label = this.createControlLabel(config);
            const input = this.createControlInput(key, config);
            
            control.appendChild(label);
            control.appendChild(input);
            
            return control;
        }

        /**
         * Create control label
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Label element
         */
        createControlLabel(config) {
            const label = document.createElement('label');
            label.className = 'las-micro-panel__control-label';
            label.style.cssText = `
                font-size: ${this.isMobile() ? '14px' : '12px'};
                font-weight: 500;
                color: #1d2327;
                display: flex;
                align-items: center;
                gap: 6px;
            `;
            
            if (config.icon) {
                const icon = document.createElement('span');
                icon.textContent = config.icon;
                icon.style.fontSize = this.isMobile() ? '16px' : '14px';
                label.appendChild(icon);
            }
            
            const text = document.createElement('span');
            text.textContent = config.label;
            label.appendChild(text);
            
            return label;
        }

        /**
         * Create control input based on type
         * @param {string} key - Control key
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Input element
         */
        createControlInput(key, config) {
            switch (config.type) {
                case 'color':
                    return this.createColorInput(key, config);
                case 'slider':
                    return this.createSliderInput(key, config);
                case 'spacing':
                    return this.createSpacingInput(key, config);
                case 'shadow':
                    return this.createShadowInput(key, config);
                default:
                    return this.createTextInput(key, config);
            }
        }

        /**
         * Create color input
         * @param {string} key - Control key
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Color input element
         */
        createColorInput(key, config) {
            const container = document.createElement('div');
            container.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'las-micro-panel__color-input';
            colorInput.style.cssText = `
                width: ${this.isMobile() ? '48px' : '32px'};
                height: ${this.isMobile() ? '48px' : '32px'};
                border: none;
                border-radius: 6px;
                cursor: pointer;
                background: none;
            `;
            
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'las-micro-panel__text-input';
            textInput.placeholder = '#000000';
            textInput.style.cssText = `
                flex: 1;
                padding: ${this.isMobile() ? '12px' : '8px'};
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: ${this.isMobile() ? '16px' : '13px'};
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            `;
            
            // Get current value
            const currentValue = this.getCurrentValue(config.property);
            if (currentValue) {
                colorInput.value = currentValue;
                textInput.value = currentValue;
            }
            
            // Event listeners
            colorInput.addEventListener('input', (e) => {
                textInput.value = e.target.value;
                this.applyStyle(config.property, e.target.value);
            });
            
            textInput.addEventListener('input', (e) => {
                if (this.isValidColor(e.target.value)) {
                    colorInput.value = e.target.value;
                    this.applyStyle(config.property, e.target.value);
                }
            });
            
            container.appendChild(colorInput);
            container.appendChild(textInput);
            
            return container;
        }

        /**
         * Create slider input
         * @param {string} key - Control key
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Slider input element
         */
        createSliderInput(key, config) {
            const container = document.createElement('div');
            container.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = config.min || 0;
            slider.max = config.max || 100;
            slider.className = 'las-micro-panel__slider';
            slider.style.cssText = `
                flex: 1;
                height: ${this.isMobile() ? '6px' : '4px'};
                background: #ddd;
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            `;
            
            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'las-micro-panel__value-display';
            valueDisplay.style.cssText = `
                min-width: ${this.isMobile() ? '60px' : '50px'};
                text-align: right;
                font-size: ${this.isMobile() ? '14px' : '12px'};
                color: #646970;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            `;
            
            // Get current value
            const currentValue = this.getCurrentNumericValue(config.property, config.unit);
            if (currentValue !== null) {
                slider.value = currentValue;
                valueDisplay.textContent = `${currentValue}${config.unit || ''}`;
            }
            
            // Event listener
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                const unit = config.unit || '';
                valueDisplay.textContent = `${value}${unit}`;
                this.applyStyle(config.property, `${value}${unit}`);
            });
            
            container.appendChild(slider);
            container.appendChild(valueDisplay);
            
            return container;
        }

        /**
         * Create spacing input (simplified for now)
         * @param {string} key - Control key
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Spacing input element
         */
        createSpacingInput(key, config) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'las-micro-panel__text-input';
            input.placeholder = '10px';
            input.style.cssText = `
                width: 100%;
                padding: ${this.isMobile() ? '12px' : '8px'};
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: ${this.isMobile() ? '16px' : '13px'};
            `;
            
            const currentValue = this.getCurrentValue(config.property);
            if (currentValue) {
                input.value = currentValue;
            }
            
            input.addEventListener('input', (e) => {
                this.applyStyle(config.property, e.target.value);
            });
            
            return input;
        }

        /**
         * Create shadow input (simplified for now)
         * @param {string} key - Control key
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Shadow input element
         */
        createShadowInput(key, config) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'las-micro-panel__text-input';
            input.placeholder = '0 2px 4px rgba(0,0,0,0.1)';
            input.style.cssText = `
                width: 100%;
                padding: ${this.isMobile() ? '12px' : '8px'};
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: ${this.isMobile() ? '16px' : '13px'};
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            `;
            
            const currentValue = this.getCurrentValue(config.property);
            if (currentValue) {
                input.value = currentValue;
            }
            
            input.addEventListener('input', (e) => {
                this.applyStyle(config.property, e.target.value);
            });
            
            return input;
        }

        /**
         * Create text input
         * @param {string} key - Control key
         * @param {Object} config - Control configuration
         * @returns {HTMLElement} Text input element
         */
        createTextInput(key, config) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'las-micro-panel__text-input';
            input.style.cssText = `
                width: 100%;
                padding: ${this.isMobile() ? '12px' : '8px'};
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: ${this.isMobile() ? '16px' : '13px'};
            `;
            
            const currentValue = this.getCurrentValue(config.property);
            if (currentValue) {
                input.value = currentValue;
            }
            
            input.addEventListener('input', (e) => {
                this.applyStyle(config.property, e.target.value);
            });
            
            return input;
        }

        /**
         * Create footer with action buttons
         * @returns {HTMLElement} Footer element
         */
        createFooter() {
            const footer = document.createElement('div');
            footer.className = 'las-micro-panel__footer';
            footer.style.cssText = `
                display: flex;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            `;
            
            const resetButton = this.createButton('Reset', 'secondary', () => {
                this.resetStyles();
            });
            
            const saveButton = this.createButton('Save', 'primary', () => {
                this.saveStyles();
            });
            
            footer.appendChild(resetButton);
            footer.appendChild(saveButton);
            
            return footer;
        }

        /**
         * Create button element
         * @param {string} text - Button text
         * @param {string} type - Button type (primary, secondary)
         * @param {Function} onClick - Click handler
         * @returns {HTMLElement} Button element
         */
        createButton(text, type, onClick) {
            const button = document.createElement('button');
            button.className = `las-micro-panel__button las-micro-panel__button--${type}`;
            button.textContent = text;
            
            const isPrimary = type === 'primary';
            button.style.cssText = `
                flex: 1;
                padding: ${this.isMobile() ? '12px 16px' : '8px 12px'};
                border: 1px solid ${isPrimary ? '#0073aa' : '#ddd'};
                border-radius: 4px;
                background: ${isPrimary ? '#0073aa' : '#fff'};
                color: ${isPrimary ? '#fff' : '#1d2327'};
                font-size: ${this.isMobile() ? '16px' : '13px'};
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            
            button.addEventListener('click', onClick);
            
            button.addEventListener('mouseenter', () => {
                if (isPrimary) {
                    button.style.backgroundColor = '#005a87';
                } else {
                    button.style.backgroundColor = '#f6f7f7';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = isPrimary ? '#0073aa' : '#fff';
            });
            
            return button;
        }

        /**
         * Show the panel with animation
         */
        show() {
            if (this.isVisible || this.isAnimating) {
                return;
            }
            
            this.isAnimating = true;
            this.isVisible = true;
            
            // Position the panel
            this.position();
            
            // Show backdrop on mobile
            if (this.backdropElement) {
                this.backdropElement.style.display = 'block';
                requestAnimationFrame(() => {
                    this.backdropElement.style.opacity = '1';
                });
            }
            
            // Show panel
            this.panelElement.style.display = 'block';
            
            requestAnimationFrame(() => {
                this.panelElement.style.opacity = '1';
                this.panelElement.style.transform = 'translateY(0)';
            });
            
            // Animation complete
            setTimeout(() => {
                this.isAnimating = false;
                if (this.options.autoHide && !this.isMobile()) {
                    this.startAutoHideTimer();
                }
            }, 300);
            
            this.core.emit('micro-panel:shown', {
                targetElement: this.targetElement,
                position: this.position
            });
        }

        /**
         * Hide the panel with animation
         */
        hide() {
            if (!this.isVisible || this.isAnimating) {
                return;
            }
            
            this.isAnimating = true;
            this.clearAutoHideTimer();
            
            // Hide backdrop
            if (this.backdropElement) {
                this.backdropElement.style.opacity = '0';
                setTimeout(() => {
                    this.backdropElement.style.display = 'none';
                }, 300);
            }
            
            // Hide panel
            this.panelElement.style.opacity = '0';
            this.panelElement.style.transform = this.isMobile() ? 'translateY(100%)' : 'translateY(-10px)';
            
            setTimeout(() => {
                this.panelElement.style.display = 'none';
                this.isVisible = false;
                this.isAnimating = false;
            }, 300);
            
            this.core.emit('micro-panel:hidden', {
                targetElement: this.targetElement
            });
        }

        /**
         * Position the panel relative to target element
         */
        position() {
            if (this.isMobile()) {
                // Mobile panels are fixed at bottom
                return;
            }
            
            const targetRect = this.targetElement.getBoundingClientRect();
            const panelRect = this.panelElement.getBoundingClientRect();
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            // Calculate position with collision detection
            const position = this.calculatePosition(targetRect, panelRect, viewport, scrollLeft, scrollTop);
            
            this.panelElement.style.left = `${position.left}px`;
            this.panelElement.style.top = `${position.top}px`;
            this.position = position;
        }

        /**
         * Calculate optimal position with collision detection
         * @param {DOMRect} targetRect - Target element rect
         * @param {DOMRect} panelRect - Panel element rect
         * @param {Object} viewport - Viewport dimensions
         * @param {number} scrollLeft - Horizontal scroll
         * @param {number} scrollTop - Vertical scroll
         * @returns {Object} Position object
         */
        calculatePosition(targetRect, panelRect, viewport, scrollLeft, scrollTop) {
            const offset = 10;
            const padding = 20;
            
            // Preferred position (above target, centered)
            let left = targetRect.left + scrollLeft + (targetRect.width / 2) - (panelRect.width / 2);
            let top = targetRect.top + scrollTop - panelRect.height - offset;
            let placement = 'top';
            
            // Horizontal collision detection
            if (left < scrollLeft + padding) {
                left = scrollLeft + padding;
            } else if (left + panelRect.width > scrollLeft + viewport.width - padding) {
                left = scrollLeft + viewport.width - panelRect.width - padding;
            }
            
            // Vertical collision detection
            if (top < scrollTop + padding) {
                // Try below
                top = targetRect.bottom + scrollTop + offset;
                placement = 'bottom';
                
                if (top + panelRect.height > scrollTop + viewport.height - padding) {
                    // Try sides
                    if (targetRect.left + scrollLeft > panelRect.width + offset + padding) {
                        left = targetRect.left + scrollLeft - panelRect.width - offset;
                        top = targetRect.top + scrollTop + (targetRect.height / 2) - (panelRect.height / 2);
                        placement = 'left';
                    } else if (targetRect.right + scrollLeft + panelRect.width + offset < scrollLeft + viewport.width - padding) {
                        left = targetRect.right + scrollLeft + offset;
                        top = targetRect.top + scrollTop + (targetRect.height / 2) - (panelRect.height / 2);
                        placement = 'right';
                    }
                }
            }
            
            return { left, top, placement };
        }

        /**
         * Handle window resize
         */
        handleResize() {
            if (this.isVisible) {
                // Reapply base styles for responsive changes
                this.applyBaseStyles();
                
                // Regenerate controls if switching between mobile/desktop
                const wasMobile = this.panelElement.classList.contains('las-micro-panel--mobile');
                const isMobile = this.isMobile();
                
                if (wasMobile !== isMobile) {
                    this.generateControls();
                }
                
                // Reposition panel
                this.position();
            }
        }

        /**
         * Handle window scroll
         */
        handleScroll() {
            if (this.isVisible && !this.isMobile()) {
                this.position();
            }
        }

        /**
         * Handle click outside panel
         * @param {Event} event - Click event
         */
        handleClickOutside(event) {
            if (this.isVisible && !this.panelElement.contains(event.target)) {
                this.hide();
            }
        }

        /**
         * Handle keyboard events
         * @param {KeyboardEvent} event - Keyboard event
         */
        handleKeyDown(event) {
            if (!this.isVisible) {
                return;
            }
            
            if (event.key === 'Escape') {
                event.preventDefault();
                this.hide();
            }
        }

        /**
         * Start auto-hide timer
         */
        startAutoHideTimer() {
            this.clearAutoHideTimer();
            this.autoHideTimer = setTimeout(() => {
                this.hide();
            }, this.options.hideDelay);
        }

        /**
         * Clear auto-hide timer
         */
        clearAutoHideTimer() {
            if (this.autoHideTimer) {
                clearTimeout(this.autoHideTimer);
                this.autoHideTimer = null;
            }
        }

        /**
         * Check if current viewport is mobile
         * @returns {boolean}
         */
        isMobile() {
            return window.innerWidth <= this.breakpoints.mobile;
        }

        /**
         * Check if current viewport is tablet
         * @returns {boolean}
         */
        isTablet() {
            return window.innerWidth > this.breakpoints.mobile && window.innerWidth <= this.breakpoints.tablet;
        }

        /**
         * Get element display name
         * @returns {string}
         */
        getElementDisplayName() {
            if (this.targetElement.id) {
                return `#${this.targetElement.id}`;
            }
            
            const tagName = this.targetElement.tagName.toLowerCase();
            const className = this.targetElement.className ? `.${this.targetElement.className.split(' ')[0]}` : '';
            
            return `${tagName}${className}`;
        }

        /**
         * Get element CSS selector
         * @returns {string}
         */
        getElementSelector() {
            if (this.targetElement.id) {
                return `#${this.targetElement.id}`;
            }
            
            if (this.targetElement.className) {
                const classes = this.targetElement.className.split(' ').filter(c => c.trim());
                if (classes.length > 0) {
                    return `${this.targetElement.tagName.toLowerCase()}.${classes.join('.')}`;
                }
            }
            
            return this.targetElement.tagName.toLowerCase();
        }

        /**
         * Get current CSS value for property
         * @param {string} property - CSS property
         * @returns {string|null}
         */
        getCurrentValue(property) {
            const computed = window.getComputedStyle(this.targetElement);
            return computed.getPropertyValue(property) || null;
        }

        /**
         * Get current numeric value for property
         * @param {string} property - CSS property
         * @param {string} unit - Expected unit
         * @returns {number|null}
         */
        getCurrentNumericValue(property, unit) {
            const value = this.getCurrentValue(property);
            if (!value) return null;
            
            const numeric = parseFloat(value);
            return isNaN(numeric) ? null : numeric;
        }

        /**
         * Check if color value is valid
         * @param {string} color - Color value
         * @returns {boolean}
         */
        isValidColor(color) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) ||
                   /^rgb\(/.test(color) ||
                   /^rgba\(/.test(color) ||
                   /^hsl\(/.test(color) ||
                   /^hsla\(/.test(color);
        }

        /**
         * Apply style to target element
         * @param {string} property - CSS property
         * @param {string} value - CSS value
         */
        applyStyle(property, value) {
            this.targetElement.style.setProperty(property, value);
            
            this.core.emit('micro-panel:style-changed', {
                targetElement: this.targetElement,
                property: property,
                value: value
            });
        }

        /**
         * Reset styles to original values
         */
        resetStyles() {
            Object.keys(this.controlConfigs).forEach(key => {
                const config = this.controlConfigs[key];
                this.targetElement.style.removeProperty(config.property);
            });
            
            this.generateControls(); // Refresh controls with original values
            
            this.core.emit('micro-panel:styles-reset', {
                targetElement: this.targetElement
            });
        }

        /**
         * Save current styles
         */
        saveStyles() {
            const styles = {};
            Object.entries(this.controlConfigs).forEach(([key, config]) => {
                const value = this.getCurrentValue(config.property);
                if (value) {
                    styles[config.property] = value;
                }
            });
            
            this.core.emit('micro-panel:styles-saved', {
                targetElement: this.targetElement,
                styles: styles
            });
            
            this.hide();
        }

        /**
         * Cleanup resources
         */
        destroy() {
            this.clearAutoHideTimer();
            
            // Remove event listeners
            window.removeEventListener('resize', this.handleResize);
            window.removeEventListener('scroll', this.handleScroll);
            document.removeEventListener('keydown', this.handleKeyDown);
            
            // Remove DOM elements
            if (this.panelElement && this.panelElement.parentNode) {
                this.panelElement.parentNode.removeChild(this.panelElement);
            }
            
            if (this.backdropElement && this.backdropElement.parentNode) {
                this.backdropElement.parentNode.removeChild(this.backdropElement);
            }
            
            this.core.log('MicroPanel destroyed');
        }
    }

    // Export for ES6 modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MicroPanel;
    }
    
    // Export for AMD
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return MicroPanel;
        });
    }
    
    // Register with LAS core for IE11 compatibility
    if (window.LAS && typeof window.LAS.registerModule === 'function') {
        window.LAS.registerModule('micro-panel', MicroPanel);
    }
    
    // Global export as fallback
    window.LASMicroPanel = MicroPanel;

})(window, document);