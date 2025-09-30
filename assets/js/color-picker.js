/**
 * Live Admin Styler - Accessible Color Picker Component
 * 
 * A modern, accessible color picker with keyboard navigation,
 * contrast validation, and palette management.
 */

class LASColorPicker {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            showPalette: true,
            showContrast: true,
            allowAlpha: false,
            defaultColor: '#2271b1',
            palette: [
                '#2271b1', '#135e96', '#0073aa', '#005177',
                '#72aee6', '#4f94d4', '#3582c4', '#2271b1',
                '#d63638', '#b32d2e', '#8a2424', '#691a1a',
                '#00a32a', '#007017', '#005a1f', '#004515',
                '#dba617', '#b8860b', '#996b0b', '#7a5208'
            ],
            ...options
        };
        
        this.currentColor = this.options.defaultColor;
        this.isOpen = false;
        this.focusedElement = null;
        
        this.init();
    }
    
    init() {
        this.createColorPreview();
        this.createColorPicker();
        this.bindEvents();
        this.updateColor(this.currentColor);
    }
    
    createColorPreview() {
        this.preview = document.createElement('button');
        this.preview.className = 'las-color-preview';
        this.preview.setAttribute('type', 'button');
        this.preview.setAttribute('aria-label', `Current color: ${this.currentColor}`);
        this.preview.setAttribute('aria-expanded', 'false');
        this.preview.setAttribute('aria-haspopup', 'dialog');
        
        // Color display
        this.colorDisplay = document.createElement('div');
        this.colorDisplay.className = 'las-color-display';
        this.colorDisplay.style.backgroundColor = this.currentColor;
        
        // Tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'las-color-tooltip';
        this.tooltip.textContent = this.currentColor;
        this.tooltip.setAttribute('role', 'tooltip');
        this.tooltip.setAttribute('aria-hidden', 'true');
        
        this.preview.appendChild(this.colorDisplay);
        this.preview.appendChild(this.tooltip);
        this.element.appendChild(this.preview);
    }
    
    createColorPicker() {
        this.picker = document.createElement('div');
        this.picker.className = 'las-color-picker-panel';
        this.picker.setAttribute('role', 'dialog');
        this.picker.setAttribute('aria-label', 'Color picker');
        this.picker.setAttribute('aria-hidden', 'true');
        
        // Header with close button
        const header = document.createElement('div');
        header.className = 'las-color-picker-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Choose Color';
        title.className = 'las-color-picker-title';
        
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'las-color-picker-close';
        this.closeButton.setAttribute('type', 'button');
        this.closeButton.setAttribute('aria-label', 'Close color picker');
        this.closeButton.innerHTML = '×';
        
        header.appendChild(title);
        header.appendChild(this.closeButton);
        
        // Color input section
        const inputSection = document.createElement('div');
        inputSection.className = 'las-color-input-section';
        
        this.colorInput = document.createElement('input');
        this.colorInput.type = 'color';
        this.colorInput.className = 'las-color-input';
        this.colorInput.value = this.currentColor;
        this.colorInput.setAttribute('aria-label', 'Color value');
        
        this.hexInput = document.createElement('input');
        this.hexInput.type = 'text';
        this.hexInput.className = 'las-hex-input';
        this.hexInput.value = this.currentColor;
        this.hexInput.setAttribute('aria-label', 'Hex color value');
        this.hexInput.setAttribute('pattern', '^#[0-9A-Fa-f]{6}$');
        
        const hexLabel = document.createElement('label');
        hexLabel.textContent = 'Hex:';
        hexLabel.className = 'las-hex-label';
        
        inputSection.appendChild(this.colorInput);
        inputSection.appendChild(hexLabel);
        inputSection.appendChild(this.hexInput);
        
        // Palette section
        if (this.options.showPalette) {
            this.createPalette(inputSection);
        }
        
        // Contrast validation section
        if (this.options.showContrast) {
            this.createContrastSection(inputSection);
        }
        
        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'las-color-picker-actions';
        
        this.cancelButton = document.createElement('button');
        this.cancelButton.type = 'button';
        this.cancelButton.className = 'las-button las-button-secondary';
        this.cancelButton.textContent = 'Cancel';
        
        this.applyButton = document.createElement('button');
        this.applyButton.type = 'button';
        this.applyButton.className = 'las-button las-button-primary';
        this.applyButton.textContent = 'Apply';
        
        actions.appendChild(this.cancelButton);
        actions.appendChild(this.applyButton);
        
        this.picker.appendChild(header);
        this.picker.appendChild(inputSection);
        this.picker.appendChild(actions);
        
        document.body.appendChild(this.picker);
    }
    
    createPalette(container) {
        const paletteSection = document.createElement('div');
        paletteSection.className = 'las-color-palette-section';
        
        const paletteTitle = document.createElement('h4');
        paletteTitle.textContent = 'Color Palette';
        paletteTitle.className = 'las-palette-title';
        
        this.palette = document.createElement('div');
        this.palette.className = 'las-color-palette';
        this.palette.setAttribute('role', 'grid');
        this.palette.setAttribute('aria-label', 'Color palette');
        
        this.options.palette.forEach((color, index) => {
            const colorButton = document.createElement('button');
            colorButton.type = 'button';
            colorButton.className = 'las-palette-color';
            colorButton.style.backgroundColor = color;
            colorButton.setAttribute('data-color', color);
            colorButton.setAttribute('aria-label', `Select color ${color}`);
            colorButton.setAttribute('role', 'gridcell');
            colorButton.setAttribute('tabindex', index === 0 ? '0' : '-1');
            
            this.palette.appendChild(colorButton);
        });
        
        paletteSection.appendChild(paletteTitle);
        paletteSection.appendChild(this.palette);
        container.appendChild(paletteSection);
    }
    
    createContrastSection(container) {
        this.contrastSection = document.createElement('div');
        this.contrastSection.className = 'las-contrast-section';
        
        const contrastTitle = document.createElement('h4');
        contrastTitle.textContent = 'Contrast Check';
        contrastTitle.className = 'las-contrast-title';
        
        this.contrastInfo = document.createElement('div');
        this.contrastInfo.className = 'las-contrast-info';
        
        this.contrastSection.appendChild(contrastTitle);
        this.contrastSection.appendChild(this.contrastInfo);
        container.appendChild(this.contrastSection);
    }
    
    bindEvents() {
        // Preview button events
        this.preview.addEventListener('click', () => this.toggle());
        this.preview.addEventListener('keydown', (e) => this.handlePreviewKeydown(e));
        
        // Picker events
        this.closeButton.addEventListener('click', () => this.close());
        this.cancelButton.addEventListener('click', () => this.close());
        this.applyButton.addEventListener('click', () => this.apply());
        
        // Color input events
        this.colorInput.addEventListener('input', (e) => this.handleColorInput(e));
        this.hexInput.addEventListener('input', (e) => this.handleHexInput(e));
        this.hexInput.addEventListener('keydown', (e) => this.handleHexKeydown(e));
        
        // Palette events
        if (this.palette) {
            this.palette.addEventListener('click', (e) => this.handlePaletteClick(e));
            this.palette.addEventListener('keydown', (e) => this.handlePaletteKeydown(e));
        }
        
        // Global events
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        
        // Tooltip events
        this.preview.addEventListener('mouseenter', () => this.showTooltip());
        this.preview.addEventListener('mouseleave', () => this.hideTooltip());
        this.preview.addEventListener('focus', () => this.showTooltip());
        this.preview.addEventListener('blur', () => this.hideTooltip());
    }  
  
    handlePreviewKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggle();
        }
    }
    
    handleColorInput(e) {
        const color = e.target.value;
        this.updatePreviewColor(color);
        this.hexInput.value = color;
        this.updateContrastInfo(color);
    }
    
    handleHexInput(e) {
        const hex = e.target.value;
        if (this.isValidHex(hex)) {
            this.colorInput.value = hex;
            this.updatePreviewColor(hex);
            this.updateContrastInfo(hex);
        }
    }
    
    handleHexKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.apply();
        }
    }
    
    handlePaletteClick(e) {
        if (e.target.classList.contains('las-palette-color')) {
            const color = e.target.getAttribute('data-color');
            this.selectPaletteColor(color);
        }
    }
    
    handlePaletteKeydown(e) {
        const colors = Array.from(this.palette.querySelectorAll('.las-palette-color'));
        const currentIndex = colors.findIndex(color => color === e.target);
        
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                newIndex = (currentIndex + 1) % colors.length;
                break;
            case 'ArrowLeft':
                e.preventDefault();
                newIndex = currentIndex === 0 ? colors.length - 1 : currentIndex - 1;
                break;
            case 'ArrowDown':
                e.preventDefault();
                newIndex = Math.min(currentIndex + 4, colors.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newIndex = Math.max(currentIndex - 4, 0);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                const color = e.target.getAttribute('data-color');
                this.selectPaletteColor(color);
                return;
        }
        
        if (newIndex !== currentIndex) {
            colors[currentIndex].setAttribute('tabindex', '-1');
            colors[newIndex].setAttribute('tabindex', '0');
            colors[newIndex].focus();
        }
    }
    
    handleGlobalKeydown(e) {
        if (this.isOpen && e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
        
        if (this.isOpen && e.key === 'Tab') {
            this.handleTabNavigation(e);
        }
    }
    
    handleGlobalClick(e) {
        if (this.isOpen && !this.picker.contains(e.target) && !this.preview.contains(e.target)) {
            this.close();
        }
    }
    
    handleTabNavigation(e) {
        const focusableElements = this.picker.querySelectorAll(
            'button, input, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
    
    selectPaletteColor(color) {
        this.colorInput.value = color;
        this.hexInput.value = color;
        this.updatePreviewColor(color);
        this.updateContrastInfo(color);
        
        // Update palette selection
        this.palette.querySelectorAll('.las-palette-color').forEach(btn => {
            btn.classList.remove('selected');
        });
        this.palette.querySelector(`[data-color="${color}"]`).classList.add('selected');
    }
    
    updatePreviewColor(color) {
        this.colorDisplay.style.backgroundColor = color;
        this.tooltip.textContent = color;
        this.preview.setAttribute('aria-label', `Current color: ${color}`);
    }
    
    updateContrastInfo(color) {
        if (!this.contrastSection) return;
        
        const contrastRatios = this.calculateContrastRatios(color);
        
        this.contrastInfo.innerHTML = `
            <div class="las-contrast-item">
                <span class="las-contrast-label">vs White:</span>
                <span class="las-contrast-ratio ${contrastRatios.white >= 4.5 ? 'pass' : 'fail'}">
                    ${contrastRatios.white.toFixed(2)}:1
                    ${contrastRatios.white >= 7 ? '(AAA)' : contrastRatios.white >= 4.5 ? '(AA)' : '(Fail)'}
                </span>
            </div>
            <div class="las-contrast-item">
                <span class="las-contrast-label">vs Black:</span>
                <span class="las-contrast-ratio ${contrastRatios.black >= 4.5 ? 'pass' : 'fail'}">
                    ${contrastRatios.black.toFixed(2)}:1
                    ${contrastRatios.black >= 7 ? '(AAA)' : contrastRatios.black >= 4.5 ? '(AA)' : '(Fail)'}
                </span>
            </div>
        `;
    }
    
    calculateContrastRatios(color) {
        const rgb = this.hexToRgb(color);
        const luminance = this.getLuminance(rgb);
        
        const whiteLuminance = 1;
        const blackLuminance = 0;
        
        const whiteContrast = (whiteLuminance + 0.05) / (luminance + 0.05);
        const blackContrast = (luminance + 0.05) / (blackLuminance + 0.05);
        
        return {
            white: whiteContrast,
            black: blackContrast
        };
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    getLuminance(rgb) {
        const { r, g, b } = rgb;
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    
    isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex);
    }
    
    showTooltip() {
        this.tooltip.setAttribute('aria-hidden', 'false');
        this.tooltip.classList.add('visible');
    }
    
    hideTooltip() {
        this.tooltip.setAttribute('aria-hidden', 'true');
        this.tooltip.classList.remove('visible');
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.picker.setAttribute('aria-hidden', 'false');
        this.picker.classList.add('open');
        this.preview.setAttribute('aria-expanded', 'true');
        
        // Position the picker
        this.positionPicker();
        
        // Focus management
        this.focusedElement = document.activeElement;
        this.colorInput.focus();
        
        // Update contrast info
        this.updateContrastInfo(this.currentColor);
        
        // Dispatch event
        this.element.dispatchEvent(new CustomEvent('las-color-picker-open', {
            detail: { color: this.currentColor }
        }));
    }
    
    close() {
        this.isOpen = false;
        this.picker.setAttribute('aria-hidden', 'true');
        this.picker.classList.remove('open');
        this.preview.setAttribute('aria-expanded', 'false');
        
        // Restore focus
        if (this.focusedElement) {
            this.focusedElement.focus();
        }
        
        // Dispatch event
        this.element.dispatchEvent(new CustomEvent('las-color-picker-close', {
            detail: { color: this.currentColor }
        }));
    }
    
    apply() {
        const newColor = this.colorInput.value;
        this.updateColor(newColor);
        this.close();
        
        // Dispatch change event
        this.element.dispatchEvent(new CustomEvent('las-color-change', {
            detail: { 
                color: newColor,
                previousColor: this.currentColor
            }
        }));
    }
    
    updateColor(color) {
        this.currentColor = color;
        this.colorInput.value = color;
        this.hexInput.value = color;
        this.updatePreviewColor(color);
        
        // Update hidden input if exists
        const hiddenInput = this.element.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            hiddenInput.value = color;
        }
    }
    
    positionPicker() {
        const rect = this.preview.getBoundingClientRect();
        const pickerRect = this.picker.getBoundingClientRect();
        
        let top = rect.bottom + 8;
        let left = rect.left;
        
        // Adjust if picker would go off screen
        if (left + pickerRect.width > window.innerWidth) {
            left = window.innerWidth - pickerRect.width - 16;
        }
        
        if (top + pickerRect.height > window.innerHeight) {
            top = rect.top - pickerRect.height - 8;
        }
        
        this.picker.style.position = 'fixed';
        this.picker.style.top = `${top}px`;
        this.picker.style.left = `${left}px`;
        this.picker.style.zIndex = '10000';
    }
    
    // Public API methods
    getValue() {
        return this.currentColor;
    }
    
    setValue(color) {
        if (this.isValidHex(color)) {
            this.updateColor(color);
        }
    }
    
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        document.removeEventListener('click', this.handleGlobalClick);
        
        // Remove DOM elements
        if (this.picker && this.picker.parentNode) {
            this.picker.parentNode.removeChild(this.picker);
        }
        
        // Clear references
        this.element = null;
        this.picker = null;
        this.preview = null;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LASColorPicker;
}

// Global registration
window.LASColorPicker = LASColorPicker;