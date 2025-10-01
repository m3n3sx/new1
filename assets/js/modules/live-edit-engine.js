/**
 * Live Edit Engine Module
 * 
 * Handles element selection, targeting, and micro-panel positioning
 * for real-time visual editing capabilities
 * 
 * @since 2.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * LiveEditEngine Class
     */
    class LiveEditEngine {
        constructor(core) {
            this.core = core;
            this.isActive = false;
            this.targetedElement = null;
            this.highlightOverlay = null;
            this.microPanel = null;
            
            // Element targeting configuration
            this.targetableSelectors = [
                '#adminmenu',
                '#adminmenu li',
                '#adminmenu a',
                '#wpadminbar',
                '#wpadminbar .ab-item',
                '#wpbody-content',
                '#wpbody-content .wrap',
                '.button',
                '.button-primary',
                '.form-table',
                'input[type="text"]',
                'input[type="email"]',
                'input[type="password"]',
                'textarea',
                'select'
            ];
            
            // Hover detection settings
            this.hoverDelay = 100; // ms
            this.hoverTimer = null;
            
            // Collision detection settings
            this.panelOffset = 10; // px
            this.viewportPadding = 20; // px
            
            // Event handlers (bound to maintain context)
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleMouseLeave = this.handleMouseLeave.bind(this);
            this.handleClick = this.handleClick.bind(this);
            this.handleKeyDown = this.handleKeyDown.bind(this);
            this.handleResize = this.handleResize.bind(this);
            
            this.init();
        }

        /**
         * Initialize the live edit engine
         */
        init() {
            this.createHighlightOverlay();
            this.setupEventListeners();
            
            this.core.log('LiveEditEngine initialized', {
                targetableSelectors: this.targetableSelectors.length
            });
        }

        /**
         * Create highlight overlay element
         */
        createHighlightOverlay() {
            this.highlightOverlay = document.createElement('div');
            this.highlightOverlay.className = 'las-highlight-overlay';
            this.highlightOverlay.style.cssText = `
                position: absolute;
                pointer-events: none;
                z-index: 9998;
                border: 2px solid #0073aa;
                background: rgba(0, 115, 170, 0.1);
                border-radius: 4px;
                transition: all 0.15s ease-out;
                display: none;
            `;
            
            document.body.appendChild(this.highlightOverlay);
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Listen for live edit mode toggle
            this.core.on('live-edit:toggle', (data) => {
                this.toggle(data.active);
            });
            
            // Listen for live edit mode activation
            this.core.on('live-edit:activate', () => {
                this.activate();
            });
            
            // Listen for live edit mode deactivation
            this.core.on('live-edit:deactivate', () => {
                this.deactivate();
            });
            
            // Listen for window resize
            window.addEventListener('resize', this.handleResize);
        }

        /**
         * Toggle live edit mode
         * @param {boolean} active - Whether to activate or deactivate
         */
        toggle(active) {
            if (active) {
                this.activate();
            } else {
                this.deactivate();
            }
        }

        /**
         * Activate live edit mode
         */
        activate() {
            if (this.isActive) {
                return;
            }
            
            this.isActive = true;
            document.body.classList.add('las-live-edit-active');
            
            // Add event listeners
            document.addEventListener('mousemove', this.handleMouseMove, true);
            document.addEventListener('mouseleave', this.handleMouseLeave, true);
            document.addEventListener('click', this.handleClick, true);
            document.addEventListener('keydown', this.handleKeyDown, true);
            
            this.core.emit('live-edit:activated');
            this.core.log('Live edit mode activated');
        }

        /**
         * Deactivate live edit mode
         */
        deactivate() {
            if (!this.isActive) {
                return;
            }
            
            this.isActive = false;
            document.body.classList.remove('las-live-edit-active');
            
            // Remove event listeners
            document.removeEventListener('mousemove', this.handleMouseMove, true);
            document.removeEventListener('mouseleave', this.handleMouseLeave, true);
            document.removeEventListener('click', this.handleClick, true);
            document.removeEventListener('keydown', this.handleKeyDown, true);
            
            // Hide overlay and panel
            this.hideHighlight();
            this.hideMicroPanel();
            
            this.targetedElement = null;
            
            this.core.emit('live-edit:deactivated');
            this.core.log('Live edit mode deactivated');
        }

        /**
         * Handle mouse move events for element targeting
         * @param {MouseEvent} event - Mouse event
         */
        handleMouseMove(event) {
            if (!this.isActive) {
                return;
            }
            
            // Clear existing hover timer
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
            }
            
            // Set new hover timer
            this.hoverTimer = setTimeout(() => {
                this.processHover(event);
            }, this.hoverDelay);
        }

        /**
         * Process hover event with delay
         * @param {MouseEvent} event - Mouse event
         */
        processHover(event) {
            const element = this.findTargetableElement(event.target);
            
            if (element && element !== this.targetedElement) {
                this.targetElement(element);
            } else if (!element && this.targetedElement) {
                this.clearTarget();
            }
        }

        /**
         * Handle mouse leave events
         * @param {MouseEvent} event - Mouse event
         */
        handleMouseLeave(event) {
            if (!this.isActive) {
                return;
            }
            
            // Check if we're leaving the document
            if (!event.relatedTarget) {
                this.clearTarget();
            }
        }

        /**
         * Handle click events for element selection
         * @param {MouseEvent} event - Mouse event
         */
        handleClick(event) {
            if (!this.isActive) {
                return;
            }
            
            event.preventDefault();
            event.stopPropagation();
            
            if (this.targetedElement) {
                this.selectElement(this.targetedElement);
            }
        }

        /**
         * Handle keyboard events
         * @param {KeyboardEvent} event - Keyboard event
         */
        handleKeyDown(event) {
            if (!this.isActive) {
                return;
            }
            
            // Escape key to exit live edit mode
            if (event.key === 'Escape') {
                event.preventDefault();
                this.deactivate();
            }
            
            // Arrow keys for element navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
                this.navigateElements(event.key);
            }
        }

        /**
         * Handle window resize events
         */
        handleResize() {
            if (this.isActive && this.targetedElement) {
                // Reposition highlight (micro panel handles its own positioning)
                this.updateHighlight(this.targetedElement);
                if (this.microPanel) {
                    this.positionMicroPanel(this.targetedElement);
                }
            }
        }

        /**
         * Find the closest targetable element
         * @param {Element} element - Starting element
         * @returns {Element|null} Targetable element or null
         */
        findTargetableElement(element) {
            if (!element || element === document.body || element === document.documentElement) {
                return null;
            }
            
            // Check if current element matches any targetable selector
            for (const selector of this.targetableSelectors) {
                try {
                    if (element.matches(selector)) {
                        return element;
                    }
                } catch (error) {
                    // Invalid selector, skip
                    continue;
                }
            }
            
            // Check parent elements
            return this.findTargetableElement(element.parentElement);
        }

        /**
         * Target an element for editing
         * @param {Element} element - Element to target
         */
        targetElement(element) {
            this.targetedElement = element;
            this.updateHighlight(element);
            this.showMicroPanel(element);
            
            this.core.emit('live-edit:element-targeted', {
                element: element,
                selector: this.getElementSelector(element)
            });
        }

        /**
         * Clear current target
         */
        clearTarget() {
            if (this.targetedElement) {
                this.targetedElement = null;
                this.hideHighlight();
                this.hideMicroPanel();
                
                this.core.emit('live-edit:element-cleared');
            }
        }

        /**
         * Select an element for editing
         * @param {Element} element - Element to select
         */
        selectElement(element) {
            this.core.emit('live-edit:element-selected', {
                element: element,
                selector: this.getElementSelector(element),
                computedStyles: this.getElementStyles(element)
            });
        }

        /**
         * Navigate between elements using keyboard
         * @param {string} direction - Arrow key direction
         */
        navigateElements(direction) {
            if (!this.targetedElement) {
                // Find first targetable element
                const firstElement = document.querySelector(this.targetableSelectors[0]);
                if (firstElement) {
                    this.targetElement(firstElement);
                }
                return;
            }
            
            let nextElement = null;
            
            switch (direction) {
                case 'ArrowUp':
                    nextElement = this.findPreviousElement(this.targetedElement);
                    break;
                case 'ArrowDown':
                    nextElement = this.findNextElement(this.targetedElement);
                    break;
                case 'ArrowLeft':
                    nextElement = this.findParentElement(this.targetedElement);
                    break;
                case 'ArrowRight':
                    nextElement = this.findChildElement(this.targetedElement);
                    break;
            }
            
            if (nextElement) {
                this.targetElement(nextElement);
            }
        }

        /**
         * Find previous targetable element
         * @param {Element} element - Current element
         * @returns {Element|null}
         */
        findPreviousElement(element) {
            const allTargetable = this.getAllTargetableElements();
            const currentIndex = allTargetable.indexOf(element);
            
            if (currentIndex > 0) {
                return allTargetable[currentIndex - 1];
            }
            
            return null;
        }

        /**
         * Find next targetable element
         * @param {Element} element - Current element
         * @returns {Element|null}
         */
        findNextElement(element) {
            const allTargetable = this.getAllTargetableElements();
            const currentIndex = allTargetable.indexOf(element);
            
            if (currentIndex >= 0 && currentIndex < allTargetable.length - 1) {
                return allTargetable[currentIndex + 1];
            }
            
            return null;
        }

        /**
         * Find parent targetable element
         * @param {Element} element - Current element
         * @returns {Element|null}
         */
        findParentElement(element) {
            return this.findTargetableElement(element.parentElement);
        }

        /**
         * Find child targetable element
         * @param {Element} element - Current element
         * @returns {Element|null}
         */
        findChildElement(element) {
            for (const selector of this.targetableSelectors) {
                try {
                    const child = element.querySelector(selector);
                    if (child && child !== element) {
                        return child;
                    }
                } catch (error) {
                    continue;
                }
            }
            return null;
        }

        /**
         * Get all targetable elements in document order
         * @returns {Element[]}
         */
        getAllTargetableElements() {
            const elements = [];
            
            for (const selector of this.targetableSelectors) {
                try {
                    const found = document.querySelectorAll(selector);
                    elements.push(...Array.from(found));
                } catch (error) {
                    continue;
                }
            }
            
            // Remove duplicates and sort by document order
            const unique = [...new Set(elements)];
            return unique.sort((a, b) => {
                const position = a.compareDocumentPosition(b);
                return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
            });
        }

        /**
         * Update highlight overlay position and size
         * @param {Element} element - Element to highlight
         */
        updateHighlight(element) {
            if (!element) {
                this.hideHighlight();
                return;
            }
            
            const rect = element.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            this.highlightOverlay.style.cssText += `
                display: block;
                left: ${rect.left + scrollLeft - 2}px;
                top: ${rect.top + scrollTop - 2}px;
                width: ${rect.width + 4}px;
                height: ${rect.height + 4}px;
            `;
        }

        /**
         * Hide highlight overlay
         */
        hideHighlight() {
            this.highlightOverlay.style.display = 'none';
        }

        /**
         * Show micro panel for element
         * @param {Element} element - Target element
         */
        showMicroPanel(element) {
            // Destroy existing panel if targeting different element
            if (this.microPanel && this.microPanel.targetElement !== element) {
                this.microPanel.destroy();
                this.microPanel = null;
            }
            
            // Create new panel if needed
            if (!this.microPanel) {
                this.createMicroPanel(element);
            }
            
            this.microPanel.show();
        }

        /**
         * Hide micro panel
         */
        hideMicroPanel() {
            if (this.microPanel) {
                this.microPanel.hide();
            }
        }

        /**
         * Create micro panel instance
         * @param {Element} element - Target element
         */
        createMicroPanel(element) {
            // Load MicroPanel module
            const MicroPanel = this.core.getModule('micro-panel') || window.LASMicroPanel;
            
            if (MicroPanel) {
                this.microPanel = new MicroPanel(this.core, element, {
                    showAnimations: true,
                    autoHide: true,
                    hideDelay: 3000,
                    responsive: true
                });
            } else {
                this.core.handleError('MicroPanel module not available');
            }
        }

        // Micro panel positioning is now handled by the MicroPanel class itself



        /**
         * Get element selector string
         * @param {Element} element - Target element
         * @returns {string} CSS selector
         */
        getElementSelector(element) {
            if (element.id) {
                return `#${element.id}`;
            }
            
            if (element.className) {
                const classes = element.className.split(' ').filter(c => c.trim());
                if (classes.length > 0) {
                    return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
                }
            }
            
            return element.tagName.toLowerCase();
        }

        /**
         * Get element display name
         * @param {Element} element - Target element
         * @returns {string} Display name
         */
        getElementDisplayName(element) {
            if (element.id) {
                return `#${element.id}`;
            }
            
            const tagName = element.tagName.toLowerCase();
            const className = element.className ? `.${element.className.split(' ')[0]}` : '';
            
            return `${tagName}${className}`;
        }

        /**
         * Get computed styles for element
         * @param {Element} element - Target element
         * @returns {Object} Relevant computed styles
         */
        getElementStyles(element) {
            const computed = window.getComputedStyle(element);
            
            return {
                backgroundColor: computed.backgroundColor,
                color: computed.color,
                fontSize: computed.fontSize,
                fontFamily: computed.fontFamily,
                padding: computed.padding,
                margin: computed.margin,
                border: computed.border,
                borderRadius: computed.borderRadius,
                width: computed.width,
                height: computed.height,
                display: computed.display,
                position: computed.position
            };
        }



        /**
         * Check if live edit mode is active
         * @returns {boolean}
         */
        isLiveEditActive() {
            return this.isActive;
        }

        /**
         * Get currently targeted element
         * @returns {Element|null}
         */
        getTargetedElement() {
            return this.targetedElement;
        }

        /**
         * Cleanup resources
         */
        destroy() {
            this.deactivate();
            
            // Remove highlight overlay
            if (this.highlightOverlay && this.highlightOverlay.parentNode) {
                this.highlightOverlay.parentNode.removeChild(this.highlightOverlay);
            }
            
            // Destroy micro panel
            if (this.microPanel && typeof this.microPanel.destroy === 'function') {
                this.microPanel.destroy();
            }
            
            // Remove resize listener
            window.removeEventListener('resize', this.handleResize);
            
            // Clear timers
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
            }
            
            this.core.log('LiveEditEngine destroyed');
        }
    }

    // Export for ES6 modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LiveEditEngine;
    }
    
    // Export for AMD
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return LiveEditEngine;
        });
    }
    
    // Register with LAS core for IE11 compatibility
    if (window.LAS && typeof window.LAS.registerModule === 'function') {
        window.LAS.registerModule('live-edit-engine', LiveEditEngine);
    }
    
    // Global export as fallback
    window.LASLiveEditEngine = LiveEditEngine;

})(window, document);