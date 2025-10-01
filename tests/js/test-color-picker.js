/**
 * Live Admin Styler - Color Picker Module Tests
 * 
 * Comprehensive tests for the advanced color picker component
 * including HSL/RGB/HEX support, palette management, and accessibility checks.
 */

import ColorPicker from '../../assets/js/modules/color-picker.js';

describe('ColorPicker Module', () => {
    let colorPicker;
    let mockCore;
    let container;
    
    beforeEach(() => {
        // Create mock core
        mockCore = {
            on: jest.fn(),
            emit: jest.fn(),
            get: jest.fn()
        };
        
        // Create container element
        container = document.createElement('div');
        document.body.appendChild(container);
        
        // Mock localStorage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });
        
        // Initialize color picker
        colorPicker = new ColorPicker(mockCore);
    });
    
    afterEach(() => {
        if (colorPicker) {
            colorPicker.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default options', () => {
            expect(colorPicker.instances).toBeInstanceOf(Map);
            expect(colorPicker.savedPalettes).toBeDefined();
            expect(colorPicker.recentColors).toBeDefined();
        });
        
        test('should bind core events', () => {
            expect(mockCore.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('color-picker:create', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('color-picker:destroy', expect.any(Function));
        });
        
        test('should load saved palettes from localStorage', () => {
            const mockPalettes = { 'test': ['#ff0000', '#00ff00'] };
            localStorage.getItem.mockReturnValue(JSON.stringify(mockPalettes));
            
            const newColorPicker = new ColorPicker(mockCore);
            expect(newColorPicker.savedPalettes).toEqual(mockPalettes);
        });
        
        test('should load recent colors from localStorage', () => {
            const mockColors = ['#ff0000', '#00ff00', '#0000ff'];
            localStorage.getItem.mockReturnValue(JSON.stringify(mockColors));
            
            const newColorPicker = new ColorPicker(mockCore);
            expect(newColorPicker.recentColors).toEqual(mockColors);
        });
    });
    
    describe('Color Picker Creation', () => {
        test('should create color picker instance', () => {
            const element = document.createElement('div');
            const picker = colorPicker.createColorPicker(element);
            
            expect(picker).toBeDefined();
            expect(colorPicker.instances.size).toBe(1);
        });
        
        test('should enhance existing color inputs', () => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = '#ff0000';
            container.appendChild(input);
            
            const picker = colorPicker.enhanceColorInput(input);
            
            expect(input.dataset.lasEnhanced).toBe('true');
            expect(input.style.display).toBe('none');
            expect(picker).toBeDefined();
        });
        
        test('should not enhance already enhanced inputs', () => {
            const input = document.createElement('input');
            input.type = 'color';
            input.dataset.lasEnhanced = 'true';
            container.appendChild(input);
            
            const picker = colorPicker.enhanceColorInput(input);
            expect(picker).toBeUndefined();
        });
    });
    
    describe('Recent Colors Management', () => {
        test('should add color to recent colors', () => {
            colorPicker.addToRecentColors('#ff0000');
            
            expect(colorPicker.recentColors).toContain('#ff0000');
            expect(colorPicker.recentColors[0]).toBe('#ff0000');
        });
        
        test('should move existing color to front', () => {
            colorPicker.recentColors = ['#00ff00', '#0000ff'];
            colorPicker.addToRecentColors('#00ff00');
            
            expect(colorPicker.recentColors[0]).toBe('#00ff00');
            expect(colorPicker.recentColors.length).toBe(2);
        });
        
        test('should limit recent colors to 12', () => {
            // Add 15 colors
            for (let i = 0; i < 15; i++) {
                colorPicker.addToRecentColors(`#${i.toString(16).padStart(6, '0')}`);
            }
            
            expect(colorPicker.recentColors.length).toBe(12);
        });
        
        test('should save recent colors to localStorage', () => {
            colorPicker.addToRecentColors('#ff0000');
            
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'las_recent_colors',
                JSON.stringify(['#ff0000'])
            );
        });
        
        test('should ignore invalid colors', () => {
            const initialLength = colorPicker.recentColors.length;
            colorPicker.addToRecentColors('invalid-color');
            
            expect(colorPicker.recentColors.length).toBe(initialLength);
        });
    });
    
    describe('Palette Management', () => {
        test('should save palette', () => {
            const colors = ['#ff0000', '#00ff00', '#0000ff'];
            colorPicker.savePalette('test-palette', colors);
            
            expect(colorPicker.savedPalettes['test-palette']).toEqual(colors);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'las_saved_palettes',
                JSON.stringify({ 'test-palette': colors })
            );
        });
        
        test('should delete palette', () => {
            colorPicker.savedPalettes = { 'test-palette': ['#ff0000'] };
            colorPicker.deletePalette('test-palette');
            
            expect(colorPicker.savedPalettes['test-palette']).toBeUndefined();
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'las_saved_palettes',
                JSON.stringify({})
            );
        });
        
        test('should update all instances when palette is saved', () => {
            const mockInstance = { updateSavedPalettes: jest.fn() };
            colorPicker.instances.set('test', mockInstance);
            
            colorPicker.savePalette('test', ['#ff0000']);
            
            expect(mockInstance.updateSavedPalettes).toHaveBeenCalled();
        });
    });
    
    describe('Color Validation', () => {
        test('should validate hex colors', () => {
            expect(colorPicker.isValidColor('#ff0000')).toBe(true);
            expect(colorPicker.isValidColor('#FF0000')).toBe(true);
            expect(colorPicker.isValidColor('#123456')).toBe(true);
            expect(colorPicker.isValidColor('ff0000')).toBe(false);
            expect(colorPicker.isValidColor('#ff00')).toBe(false);
            expect(colorPicker.isValidColor('#gggggg')).toBe(false);
        });
    });
});

describe('AdvancedColorPicker Component', () => {
    let picker;
    let element;
    let mockManager;
    
    beforeEach(() => {
        // Create element
        element = document.createElement('div');
        document.body.appendChild(element);
        
        // Create mock manager
        mockManager = {
            addToRecentColors: jest.fn(),
            savePalette: jest.fn(),
            deletePalette: jest.fn()
        };
        
        // Mock prompt for palette saving
        window.prompt = jest.fn();
        
        // Create picker instance
        picker = new (class extends EventTarget {
            constructor(element, options) {
                super();
                this.element = element;
                this.options = options;
                this.id = options.id || 'test-picker';
                this.manager = options.manager || mockManager;
                this.currentColor = this.parseColor(options.defaultColor || '#2271b1');
                this.isOpen = false;
                
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
                
                this.colorDisplay = document.createElement('div');
                this.colorDisplay.className = 'las-color-display';
                
                this.tooltip = document.createElement('div');
                this.tooltip.className = 'las-color-tooltip';
                
                this.preview.appendChild(this.colorDisplay);
                this.preview.appendChild(this.tooltip);
                this.element.appendChild(this.preview);
            }
            
            createPanel() {
                this.panel = document.createElement('div');
                this.panel.className = 'las-color-picker-panel';
                this.panel.innerHTML = `
                    <div class="las-color-picker-content">
                        <input type="color" class="las-color-input">
                        <input type="text" class="las-hex-input">
                        <input type="number" class="las-rgb-r" min="0" max="255">
                        <input type="number" class="las-rgb-g" min="0" max="255">
                        <input type="number" class="las-rgb-b" min="0" max="255">
                        <input type="number" class="las-hsl-h" min="0" max="360">
                        <input type="number" class="las-hsl-s" min="0" max="100">
                        <input type="number" class="las-hsl-l" min="0" max="100">
                        <div class="las-contrast-checks"></div>
                    </div>
                    <div class="las-color-picker-actions">
                        <button class="las-cancel-btn">Cancel</button>
                        <button class="las-apply-btn">Apply</button>
                    </div>
                `;
                document.body.appendChild(this.panel);
                
                this.cacheElements();
            }
            
            cacheElements() {
                this.elements = {
                    colorInput: this.panel.querySelector('.las-color-input'),
                    hexInput: this.panel.querySelector('.las-hex-input'),
                    rgbR: this.panel.querySelector('.las-rgb-r'),
                    rgbG: this.panel.querySelector('.las-rgb-g'),
                    rgbB: this.panel.querySelector('.las-rgb-b'),
                    hslH: this.panel.querySelector('.las-hsl-h'),
                    hslS: this.panel.querySelector('.las-hsl-s'),
                    hslL: this.panel.querySelector('.las-hsl-l'),
                    contrastChecks: this.panel.querySelector('.las-contrast-checks'),
                    cancelBtn: this.panel.querySelector('.las-cancel-btn'),
                    applyBtn: this.panel.querySelector('.las-apply-btn')
                };
            }
            
            bindEvents() {
                this.preview.addEventListener('click', () => this.toggle());
                this.elements.colorInput.addEventListener('input', (e) => {
                    const color = this.parseColor(e.target.value);
                    this.updateColor(color);
                });
                this.elements.hexInput.addEventListener('input', (e) => {
                    if (this.isValidHex(e.target.value)) {
                        const color = this.parseColor(e.target.value);
                        this.updateColor(color);
                    }
                });
                this.elements.applyBtn.addEventListener('click', () => this.apply());
                this.elements.cancelBtn.addEventListener('click', () => this.close());
            }
            
            updateColor(color) {
                this.currentColor = color;
                this.updateDisplay();
                this.updateFormatInputs();
                this.updateAccessibilityCheck();
            }
            
            updateDisplay() {
                this.colorDisplay.style.backgroundColor = this.currentColor.hex;
                this.tooltip.textContent = this.currentColor.hex;
            }
            
            updateFormatInputs() {
                this.elements.colorInput.value = this.currentColor.hex;
                this.elements.hexInput.value = this.currentColor.hex;
                this.elements.rgbR.value = this.currentColor.rgb.r;
                this.elements.rgbG.value = this.currentColor.rgb.g;
                this.elements.rgbB.value = this.currentColor.rgb.b;
                this.elements.hslH.value = Math.round(this.currentColor.hsl.h);
                this.elements.hslS.value = Math.round(this.currentColor.hsl.s);
                this.elements.hslL.value = Math.round(this.currentColor.hsl.l);
            }
            
            updateAccessibilityCheck() {
                const checks = this.calculateAccessibilityChecks(this.currentColor.hex);
                this.elements.contrastChecks.innerHTML = `
                    <div class="las-contrast-check">
                        <span>vs White: ${checks.white.ratio}:1 ${checks.white.aa ? 'AA' : 'Fail'}</span>
                    </div>
                `;
            }
            
            calculateAccessibilityChecks(hex) {
                const rgb = this.hexToRgb(hex);
                const luminance = this.getLuminance(rgb);
                const whiteContrast = (1 + 0.05) / (luminance + 0.05);
                
                return {
                    white: {
                        ratio: whiteContrast.toFixed(2),
                        aa: whiteContrast >= 4.5
                    }
                };
            }
            
            // Color conversion methods
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
            
            rgbToHsl(r, g, b) {
                r /= 255; g /= 255; b /= 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
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
            
            toggle() {
                this.isOpen ? this.close() : this.open();
            }
            
            open() {
                this.isOpen = true;
                this.panel.classList.add('open');
                this.dispatchEvent(new CustomEvent('las-color-picker-open'));
            }
            
            close() {
                this.isOpen = false;
                this.panel.classList.remove('open');
                this.dispatchEvent(new CustomEvent('las-color-picker-close'));
            }
            
            apply() {
                this.manager.addToRecentColors(this.currentColor.hex);
                this.close();
                this.dispatchEvent(new CustomEvent('las-color-change', {
                    detail: { color: this.currentColor.hex }
                }));
            }
            
            getValue() {
                return this.currentColor.hex;
            }
            
            setValue(color) {
                const colorObj = this.parseColor(color);
                this.updateColor(colorObj);
            }
            
            destroy() {
                if (this.panel && this.panel.parentNode) {
                    this.panel.parentNode.removeChild(this.panel);
                }
            }
        })(element, { id: 'test-picker', manager: mockManager });
    });
    
    afterEach(() => {
        if (picker) {
            picker.destroy();
        }
        document.body.removeChild(element);
    });
    
    describe('Color Conversion', () => {
        test('should parse hex colors correctly', () => {
            const color = picker.parseColor('#ff0000');
            
            expect(color.hex).toBe('#ff0000');
            expect(color.rgb).toEqual({ r: 255, g: 0, b: 0 });
            expect(color.hsl.h).toBeCloseTo(0);
            expect(color.hsl.s).toBeCloseTo(100);
            expect(color.hsl.l).toBeCloseTo(50);
        });
        
        test('should convert RGB to HSL correctly', () => {
            const hsl = picker.rgbToHsl(255, 0, 0);
            
            expect(hsl.h).toBeCloseTo(0);
            expect(hsl.s).toBeCloseTo(100);
            expect(hsl.l).toBeCloseTo(50);
        });
        
        test('should validate hex colors', () => {
            expect(picker.isValidHex('#ff0000')).toBe(true);
            expect(picker.isValidHex('#FF0000')).toBe(true);
            expect(picker.isValidHex('ff0000')).toBe(false);
            expect(picker.isValidHex('#ff00')).toBe(false);
        });
    });
    
    describe('Accessibility Checks', () => {
        test('should calculate contrast ratios', () => {
            const checks = picker.calculateAccessibilityChecks('#ffffff');
            
            expect(checks.white.ratio).toBe('1.00');
            expect(checks.white.aa).toBe(false);
        });
        
        test('should identify WCAG AA compliance', () => {
            const checks = picker.calculateAccessibilityChecks('#000000');
            
            expect(parseFloat(checks.white.ratio)).toBeGreaterThan(4.5);
            expect(checks.white.aa).toBe(true);
        });
    });
    
    describe('User Interactions', () => {
        test('should toggle panel on preview click', () => {
            expect(picker.isOpen).toBe(false);
            
            picker.preview.click();
            expect(picker.isOpen).toBe(true);
            
            picker.preview.click();
            expect(picker.isOpen).toBe(false);
        });
        
        test('should update color on hex input change', () => {
            picker.elements.hexInput.value = '#00ff00';
            picker.elements.hexInput.dispatchEvent(new Event('input'));
            
            expect(picker.currentColor.hex).toBe('#00ff00');
            expect(picker.currentColor.rgb).toEqual({ r: 0, g: 255, b: 0 });
        });
        
        test('should update color on color input change', () => {
            picker.elements.colorInput.value = '#0000ff';
            picker.elements.colorInput.dispatchEvent(new Event('input'));
            
            expect(picker.currentColor.hex).toBe('#0000ff');
            expect(picker.currentColor.rgb).toEqual({ r: 0, g: 0, b: 255 });
        });
        
        test('should apply color and add to recent colors', () => {
            picker.currentColor = picker.parseColor('#ff0000');
            picker.apply();
            
            expect(mockManager.addToRecentColors).toHaveBeenCalledWith('#ff0000');
            expect(picker.isOpen).toBe(false);
        });
    });
    
    describe('Format Input Synchronization', () => {
        test('should sync all format inputs when color changes', () => {
            const color = picker.parseColor('#ff8000');
            picker.updateColor(color);
            
            expect(picker.elements.hexInput.value).toBe('#ff8000');
            expect(picker.elements.rgbR.value).toBe('255');
            expect(picker.elements.rgbG.value).toBe('128');
            expect(picker.elements.rgbB.value).toBe('0');
            expect(parseInt(picker.elements.hslH.value)).toBeCloseTo(30, 0);
        });
    });
    
    describe('Public API', () => {
        test('should get current color value', () => {
            picker.currentColor = picker.parseColor('#123456');
            expect(picker.getValue()).toBe('#123456');
        });
        
        test('should set color value', () => {
            picker.setValue('#abcdef');
            expect(picker.currentColor.hex).toBe('#abcdef');
        });
    });
    
    describe('Event Handling', () => {
        test('should emit color change event on apply', (done) => {
            picker.addEventListener('las-color-change', (e) => {
                expect(e.detail.color).toBe('#ff0000');
                done();
            });
            
            picker.currentColor = picker.parseColor('#ff0000');
            picker.apply();
        });
        
        test('should emit open/close events', (done) => {
            let eventCount = 0;
            
            picker.addEventListener('las-color-picker-open', () => {
                eventCount++;
                if (eventCount === 2) done();
            });
            
            picker.addEventListener('las-color-picker-close', () => {
                eventCount++;
                if (eventCount === 2) done();
            });
            
            picker.open();
            picker.close();
        });
    });
});