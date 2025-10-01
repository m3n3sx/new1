/**
 * Live Admin Styler - Advanced Color Picker Module
 * 
 * Modern color picker with HSL/RGB/HEX support, palette management,
 * and WCAG 2.1 AA accessibility compliance checking.
 */

export default class ColorPicker {
    constructor(core) {
        this.core = core;
        this.instances = new Map();
        this.savedPalettes = this.loadSavedPalettes();
        this.recentColors = this.loadRecentColors();
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initializeExistingPickers();
    }
    
    bindEvents() {
        // Listen for core events
        this.core.on('settings:changed', this.handleSettingsChange.bind(this));
        this.core.on('color-picker:create', this.createColorPicker.bind(this));
        this.core.on('color-picker:destroy', this.destroyColorPicker.bind(this));
    }
    
    initializeExistingPickers() {
        // Find and enhance existing color inputs
        const colorInputs = document.querySelectorAll('input[type="color"], .las-color-field');
        colorInputs.forEach(input => this.enhanceColorInput(input));
    }
    
    createColorPicker(element, options = {}) {
        const id = this.generateId();
        const picker = new AdvancedColorPicker(element, {
            ...this.getDefaultOptions(),
            ...options,
            id,
            core: this.core,
            manager: this
        });
        
        this.instances.set(id, picker);
        return picker;
    }
    
    enhanceColorInput(input) {
        if (input.dataset.lasEnhanced) return;
        
        const wrapper = this.createWrapper(input);
        const picker = this.createColorPicker(wrapper, {
            defaultColor: input.value || '#2271b1',
            linkedInput: input
        });
        
        input.dataset.lasEnhanced = 'true';
        return picker;
    }
    
    createWrapper(input) {
        const wrapper = document.createElement('div');
        wrapper.className = 'las-color-picker-wrapper';
        
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        input.style.display = 'none';
        
        return wrapper;
    }
    
    getDefaultOptions() {
        return {
            showPalette: true,
            showContrast: true,
            showFormats: true,
            allowAlpha: false,
            palette: this.getDefaultPalette(),
            recentColors: this.recentColors,
            savedPalettes: this.savedPalettes
        };
    }
    
    getDefaultPalette() {
        return [
            '#2271b1', '#135e96', '#0073aa', '#005177',
            '#72aee6', '#4f94d4', '#3582c4', '#1e40af',
            '#d63638', '#b32d2e', '#8a2424', '#691a1a',
            '#00a32a', '#007017', '#005a1f', '#004515',
            '#dba617', '#b8860b', '#996b0b', '#7a5208',
            '#6366f1', '#4f46e5', '#4338ca', '#3730a3'
        ];
    }
    
    handleSettingsChange({ key, value }) {
        if (key.includes('color')) {
            this.addToRecentColors(value);
        }
    }
    
    addToRecentColors(color) {
        if (!this.isValidColor(color)) return;
        
        // Remove if already exists
        this.recentColors = this.recentColors.filter(c => c !== color);
        
        // Add to beginning
        this.recentColors.unshift(color);
        
        // Keep only last 12 colors
        this.recentColors = this.recentColors.slice(0, 12);
        
        // Save to localStorage
        this.saveRecentColors();
        
        // Update all picker instances
        this.instances.forEach(picker => {
            picker.updateRecentColors(this.recentColors);
        });
    }
    
    savePalette(name, colors) {
        this.savedPalettes[name] = colors;
        this.savePalettesToStorage();
        
        // Update all picker instances
        this.instances.forEach(picker => {
            picker.updateSavedPalettes(this.savedPalettes);
        });
    }
    
    deletePalette(name) {
        delete this.savedPalettes[name];
        this.savePalettesToStorage();
        
        // Update all picker instances
        this.instances.forEach(picker => {
            picker.updateSavedPalettes(this.savedPalettes);
        });
    }
    
    loadRecentColors() {
        try {
            const stored = localStorage.getItem('las_recent_colors');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveRecentColors() {
        try {
            localStorage.setItem('las_recent_colors', JSON.stringify(this.recentColors));
        } catch (e) {
            console.warn('Failed to save recent colors:', e);
        }
    }
    
    loadSavedPalettes() {
        try {
            const stored = localStorage.getItem('las_saved_palettes');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    }
    
    savePalettesToStorage() {
        try {
            localStorage.setItem('las_saved_palettes', JSON.stringify(this.savedPalettes));
        } catch (e) {
            console.warn('Failed to save palettes:', e);
        }
    }
    
    isValidColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    }
    
    generateId() {
        return 'las-color-picker-' + Math.random().toString(36).substr(2, 9);
    }
    
    destroyColorPicker(id) {
        const picker = this.instances.get(id);
        if (picker) {
            picker.destroy();
            this.instances.delete(id);
        }
    }
    
    destroy() {
        this.instances.forEach(picker => picker.destroy());
        this.instances.clear();
    }
}

/**
 * Advanced Color Picker Component
 */
class AdvancedColorPicker {
    constructor(element, options = {}) {
        this.element = element;
        this.options = options;
        this.id = options.id;
        this.core = options.core;
        this.manager = options.manager;
        
        this.currentColor = this.parseColor(options.defaultColor || '#2271b1');
        this.isOpen = false;
        this.focusedElement = null;
        
        this.init();
    }
    
    init() {
        this.createPreview();
        this.createPanel();
        this.bindEvents();
        this.updateDisplay();
    }
    
    createPreview() {
        this.preview = document.createElement('button');
        this.preview.className = 'las-color-preview';
        this.preview.type = 'button';
        this.preview.setAttribute('aria-label', `Current color: ${this.currentColor.hex}`);
        this.preview.setAttribute('aria-expanded', 'false');
        this.preview.setAttribute('aria-haspopup', 'dialog');
        
        this.colorDisplay = document.createElement('div');
        this.colorDisplay.className = 'las-color-display';
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'las-color-tooltip';
        this.tooltip.setAttribute('role', 'tooltip');
        this.tooltip.setAttribute('aria-hidden', 'true');
        
        this.preview.appendChild(this.colorDisplay);
        this.preview.appendChild(this.tooltip);
        this.element.appendChild(this.preview);
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'las-color-picker-panel';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-label', 'Advanced color picker');
        this.panel.setAttribute('aria-hidden', 'true');
        
        this.panel.innerHTML = this.getPanelHTML();
        document.body.appendChild(this.panel);
        
        this.cacheElements();
        this.initializeFormatInputs();
    }
    
    getPanelHTML() {
        return `
            <div class="las-color-picker-header">
                <h3 class="las-color-picker-title">Choose Color</h3>
                <button type="button" class="las-color-picker-close" aria-label="Close color picker">×</button>
            </div>
            
            <div class="las-color-picker-content">
                <!-- Color Input -->
                <div class="las-color-input-section">
                    <input type="color" class="las-color-input" aria-label="Color value">
                </div>
                
                <!-- Format Inputs -->
                <div class="las-format-inputs">
                    <div class="las-format-group">
                        <label class="las-format-label">HEX</label>
                        <input type="text" class="las-hex-input" pattern="^#[0-9A-Fa-f]{6}$" maxlength="7">
                    </div>
                    <div class="las-format-group">
                        <label class="las-format-label">RGB</label>
                        <div class="las-rgb-inputs">
                            <input type="number" class="las-rgb-r" min="0" max="255" aria-label="Red">
                            <input type="number" class="las-rgb-g" min="0" max="255" aria-label="Green">
                            <input type="number" class="las-rgb-b" min="0" max="255" aria-label="Blue">
                        </div>
                    </div>
                    <div class="las-format-group">
                        <label class="las-format-label">HSL</label>
                        <div class="las-hsl-inputs">
                            <input type="number" class="las-hsl-h" min="0" max="360" aria-label="Hue">
                            <input type="number" class="las-hsl-s" min="0" max="100" aria-label="Saturation">
                            <input type="number" class="las-hsl-l" min="0" max="100" aria-label="Lightness">
                        </div>
                    </div>
                </div>
                
                <!-- Recent Colors -->
                <div class="las-recent-colors-section">
                    <h4 class="las-section-title">Recent Colors</h4>
                    <div class="las-recent-colors"></div>
                </div>
                
                <!-- Default Palette -->
                <div class="las-palette-section">
                    <h4 class="las-section-title">Color Palette</h4>
                    <div class="las-color-palette"></div>
                </div>
                
                <!-- Saved Palettes -->
                <div class="las-saved-palettes-section">
                    <div class="las-saved-palettes-header">
                        <h4 class="las-section-title">Saved Palettes</h4>
                        <button type="button" class="las-save-palette-btn">Save Current</button>
                    </div>
                    <div class="las-saved-palettes"></div>
                </div>
                
                <!-- Accessibility Check -->
                <div class="las-accessibility-section">
                    <h4 class="las-section-title">Accessibility Check</h4>
                    <div class="las-contrast-checks"></div>
                </div>
            </div>
            
            <div class="las-color-picker-actions">
                <button type="button" class="las-button las-button-secondary las-cancel-btn">Cancel</button>
                <button type="button" class="las-button las-button-primary las-apply-btn">Apply</button>
            </div>
        `;
    }
    
    cacheElements() {
        this.elements = {
            close: this.panel.querySelector('.las-color-picker-close'),
            colorInput: this.panel.querySelector('.las-color-input'),
            hexInput: this.panel.querySelector('.las-hex-input'),
            rgbR: this.panel.querySelector('.las-rgb-r'),
            rgbG: this.panel.querySelector('.las-rgb-g'),
            rgbB: this.panel.querySelector('.las-rgb-b'),
            hslH: this.panel.querySelector('.las-hsl-h'),
            hslS: this.panel.querySelector('.las-hsl-s'),
            hslL: this.panel.querySelector('.las-hsl-l'),
            recentColors: this.panel.querySelector('.las-recent-colors'),
            palette: this.panel.querySelector('.las-color-palette'),
            savedPalettes: this.panel.querySelector('.las-saved-palettes'),
            savePaletteBtn: this.panel.querySelector('.las-save-palette-btn'),
            contrastChecks: this.panel.querySelector('.las-contrast-checks'),
            cancelBtn: this.panel.querySelector('.las-cancel-btn'),
            applyBtn: this.panel.querySelector('.las-apply-btn')
        };
    }
    
    initializeFormatInputs() {
        this.updateFormatInputs();
        this.updateRecentColors(this.options.recentColors || []);
        this.updatePalette(this.options.palette || []);
        this.updateSavedPalettes(this.options.savedPalettes || {});
        this.updateAccessibilityCheck();
    }
    
    bindEvents() {
        // Preview events
        this.preview.addEventListener('click', () => this.toggle());
        this.preview.addEventListener('keydown', this.handlePreviewKeydown.bind(this));
        this.preview.addEventListener('mouseenter', () => this.showTooltip());
        this.preview.addEventListener('mouseleave', () => this.hideTooltip());
        
        // Panel events
        this.elements.close.addEventListener('click', () => this.close());
        this.elements.cancelBtn.addEventListener('click', () => this.close());
        this.elements.applyBtn.addEventListener('click', () => this.apply());
        
        // Color input events
        this.elements.colorInput.addEventListener('input', this.handleColorInput.bind(this));
        this.elements.hexInput.addEventListener('input', this.handleHexInput.bind(this));
        
        // RGB input events
        this.elements.rgbR.addEventListener('input', this.handleRgbInput.bind(this));
        this.elements.rgbG.addEventListener('input', this.handleRgbInput.bind(this));
        this.elements.rgbB.addEventListener('input', this.handleRgbInput.bind(this));
        
        // HSL input events
        this.elements.hslH.addEventListener('input', this.handleHslInput.bind(this));
        this.elements.hslS.addEventListener('input', this.handleHslInput.bind(this));
        this.elements.hslL.addEventListener('input', this.handleHslInput.bind(this));
        
        // Palette events
        this.elements.palette.addEventListener('click', this.handlePaletteClick.bind(this));
        this.elements.recentColors.addEventListener('click', this.handlePaletteClick.bind(this));
        
        // Save palette event
        this.elements.savePaletteBtn.addEventListener('click', this.handleSavePalette.bind(this));
        
        // Global events
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    }
    
    handlePreviewKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggle();
        }
    }
    
    handleColorInput(e) {
        const color = this.parseColor(e.target.value);
        this.updateColor(color);
    }
    
    handleHexInput(e) {
        const hex = e.target.value;
        if (this.isValidHex(hex)) {
            const color = this.parseColor(hex);
            this.updateColor(color, 'hex');
        }
    }
    
    handleRgbInput() {
        const r = parseInt(this.elements.rgbR.value) || 0;
        const g = parseInt(this.elements.rgbG.value) || 0;
        const b = parseInt(this.elements.rgbB.value) || 0;
        
        const color = this.rgbToColor(r, g, b);
        this.updateColor(color, 'rgb');
    }
    
    handleHslInput() {
        const h = parseInt(this.elements.hslH.value) || 0;
        const s = parseInt(this.elements.hslS.value) || 0;
        const l = parseInt(this.elements.hslL.value) || 0;
        
        const color = this.hslToColor(h, s, l);
        this.updateColor(color, 'hsl');
    }
    
    handlePaletteClick(e) {
        if (e.target.classList.contains('las-palette-color')) {
            const colorValue = e.target.dataset.color;
            const color = this.parseColor(colorValue);
            this.updateColor(color);
        }
    }
    
    handleSavePalette() {
        const name = prompt('Enter palette name:');
        if (name && name.trim()) {
            const colors = Array.from(this.elements.palette.querySelectorAll('.las-palette-color'))
                .map(btn => btn.dataset.color);
            this.manager.savePalette(name.trim(), colors);
        }
    }
    
    handleGlobalKeydown(e) {
        if (this.isOpen && e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
    }
    
    handleGlobalClick(e) {
        if (this.isOpen && !this.panel.contains(e.target) && !this.preview.contains(e.target)) {
            this.close();
        }
    }
    
    updateColor(color, skipInput = null) {
        this.currentColor = color;
        this.updateDisplay();
        this.updateFormatInputs(skipInput);
        this.updateAccessibilityCheck();
    }
    
    updateDisplay() {
        this.colorDisplay.style.backgroundColor = this.currentColor.hex;
        this.tooltip.textContent = this.currentColor.hex;
        this.preview.setAttribute('aria-label', `Current color: ${this.currentColor.hex}`);
    }
    
    updateFormatInputs(skipInput = null) {
        if (skipInput !== 'color') {
            this.elements.colorInput.value = this.currentColor.hex;
        }
        if (skipInput !== 'hex') {
            this.elements.hexInput.value = this.currentColor.hex;
        }
        if (skipInput !== 'rgb') {
            this.elements.rgbR.value = this.currentColor.rgb.r;
            this.elements.rgbG.value = this.currentColor.rgb.g;
            this.elements.rgbB.value = this.currentColor.rgb.b;
        }
        if (skipInput !== 'hsl') {
            this.elements.hslH.value = Math.round(this.currentColor.hsl.h);
            this.elements.hslS.value = Math.round(this.currentColor.hsl.s);
            this.elements.hslL.value = Math.round(this.currentColor.hsl.l);
        }
    }
    
    updateRecentColors(colors) {
        this.elements.recentColors.innerHTML = '';
        colors.forEach(color => {
            const btn = this.createPaletteButton(color);
            this.elements.recentColors.appendChild(btn);
        });
    }
    
    updatePalette(colors) {
        this.elements.palette.innerHTML = '';
        colors.forEach(color => {
            const btn = this.createPaletteButton(color);
            this.elements.palette.appendChild(btn);
        });
    }
    
    updateSavedPalettes(palettes) {
        this.elements.savedPalettes.innerHTML = '';
        Object.entries(palettes).forEach(([name, colors]) => {
            const paletteDiv = this.createSavedPalette(name, colors);
            this.elements.savedPalettes.appendChild(paletteDiv);
        });
    }
    
    createPaletteButton(color) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'las-palette-color';
        btn.style.backgroundColor = color;
        btn.dataset.color = color;
        btn.setAttribute('aria-label', `Select color ${color}`);
        btn.title = color;
        return btn;
    }
    
    createSavedPalette(name, colors) {
        const div = document.createElement('div');
        div.className = 'las-saved-palette';
        
        const header = document.createElement('div');
        header.className = 'las-saved-palette-header';
        
        const title = document.createElement('span');
        title.textContent = name;
        title.className = 'las-saved-palette-name';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'las-delete-palette-btn';
        deleteBtn.textContent = '×';
        deleteBtn.setAttribute('aria-label', `Delete palette ${name}`);
        deleteBtn.addEventListener('click', () => {
            this.manager.deletePalette(name);
        });
        
        header.appendChild(title);
        header.appendChild(deleteBtn);
        
        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'las-saved-palette-colors';
        
        colors.forEach(color => {
            const btn = this.createPaletteButton(color);
            colorsDiv.appendChild(btn);
        });
        
        div.appendChild(header);
        div.appendChild(colorsDiv);
        
        return div;
    }
    
    updateAccessibilityCheck() {
        const checks = this.calculateAccessibilityChecks(this.currentColor.hex);
        
        this.elements.contrastChecks.innerHTML = `
            <div class="las-contrast-check">
                <span class="las-contrast-label">vs White:</span>
                <span class="las-contrast-ratio ${checks.white.aa ? 'pass' : 'fail'}">
                    ${checks.white.ratio}:1 ${checks.white.aaa ? '(AAA)' : checks.white.aa ? '(AA)' : '(Fail)'}
                </span>
            </div>
            <div class="las-contrast-check">
                <span class="las-contrast-label">vs Black:</span>
                <span class="las-contrast-ratio ${checks.black.aa ? 'pass' : 'fail'}">
                    ${checks.black.ratio}:1 ${checks.black.aaa ? '(AAA)' : checks.black.aa ? '(AA)' : '(Fail)'}
                </span>
            </div>
            <div class="las-contrast-check">
                <span class="las-contrast-label">Large Text:</span>
                <span class="las-contrast-ratio ${checks.largeText ? 'pass' : 'fail'}">
                    ${checks.largeText ? 'WCAG AA' : 'Fail'}
                </span>
            </div>
        `;
    }
    
    calculateAccessibilityChecks(hex) {
        const rgb = this.hexToRgb(hex);
        const luminance = this.getLuminance(rgb);
        
        const whiteLuminance = 1;
        const blackLuminance = 0;
        
        const whiteContrast = (whiteLuminance + 0.05) / (luminance + 0.05);
        const blackContrast = (luminance + 0.05) / (blackLuminance + 0.05);
        
        return {
            white: {
                ratio: whiteContrast.toFixed(2),
                aa: whiteContrast >= 4.5,
                aaa: whiteContrast >= 7
            },
            black: {
                ratio: blackContrast.toFixed(2),
                aa: blackContrast >= 4.5,
                aaa: blackContrast >= 7
            },
            largeText: Math.max(whiteContrast, blackContrast) >= 3
        };
    }
    
    // Color conversion utilities
    parseColor(input) {
        if (typeof input === 'string' && input.startsWith('#')) {
            const rgb = this.hexToRgb(input);
            const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            return { hex: input, rgb, hsl };
        }
        return { hex: '#000000', rgb: { r: 0, g: 0, b: 0 }, hsl: { h: 0, s: 0, l: 0 } };
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
    
    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    rgbToColor(r, g, b) {
        const hex = this.rgbToHex(r, g, b);
        const hsl = this.rgbToHsl(r, g, b);
        return { hex, rgb: { r, g, b }, hsl };
    }
    
    hslToColor(h, s, l) {
        const rgb = this.hslToRgb(h, s, l);
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
        return { hex, rgb, hsl: { h, s, l } };
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
    
    // Panel management
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    open() {
        this.isOpen = true;
        this.panel.setAttribute('aria-hidden', 'false');
        this.panel.classList.add('open');
        this.preview.setAttribute('aria-expanded', 'true');
        
        this.positionPanel();
        this.focusedElement = document.activeElement;
        this.elements.hexInput.focus();
        
        this.element.dispatchEvent(new CustomEvent('las-color-picker-open', {
            detail: { color: this.currentColor.hex }
        }));
    }
    
    close() {
        this.isOpen = false;
        this.panel.setAttribute('aria-hidden', 'true');
        this.panel.classList.remove('open');
        this.preview.setAttribute('aria-expanded', 'false');
        
        if (this.focusedElement) {
            this.focusedElement.focus();
        }
        
        this.element.dispatchEvent(new CustomEvent('las-color-picker-close', {
            detail: { color: this.currentColor.hex }
        }));
    }
    
    apply() {
        const color = this.currentColor.hex;
        
        // Update linked input if exists
        if (this.options.linkedInput) {
            this.options.linkedInput.value = color;
            this.options.linkedInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Add to recent colors
        this.manager.addToRecentColors(color);
        
        this.close();
        
        this.element.dispatchEvent(new CustomEvent('las-color-change', {
            detail: { 
                color: color,
                colorObject: this.currentColor
            }
        }));
    }
    
    positionPanel() {
        const rect = this.preview.getBoundingClientRect();
        const panelRect = this.panel.getBoundingClientRect();
        
        let top = rect.bottom + 8;
        let left = rect.left;
        
        if (left + panelRect.width > window.innerWidth) {
            left = window.innerWidth - panelRect.width - 16;
        }
        
        if (top + panelRect.height > window.innerHeight) {
            top = rect.top - panelRect.height - 8;
        }
        
        this.panel.style.position = 'fixed';
        this.panel.style.top = `${Math.max(8, top)}px`;
        this.panel.style.left = `${Math.max(8, left)}px`;
        this.panel.style.zIndex = '10000';
    }
    
    showTooltip() {
        this.tooltip.setAttribute('aria-hidden', 'false');
        this.tooltip.classList.add('visible');
    }
    
    hideTooltip() {
        this.tooltip.setAttribute('aria-hidden', 'true');
        this.tooltip.classList.remove('visible');
    }
    
    // Public API
    getValue() {
        return this.currentColor.hex;
    }
    
    getColorObject() {
        return this.currentColor;
    }
    
    setValue(color) {
        const colorObj = this.parseColor(color);
        this.updateColor(colorObj);
    }
    
    destroy() {
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        
        this.element = null;
        this.panel = null;
        this.preview = null;
    }
}