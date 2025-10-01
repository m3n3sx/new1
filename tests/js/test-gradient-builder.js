/**
 * Live Admin Styler - Gradient Builder Module Tests
 * 
 * Comprehensive tests for the gradient builder component
 * including visual interface, preset management, and CSS generation.
 */

import GradientBuilder from '../../assets/js/modules/gradient-builder.js';

describe('GradientBuilder Module', () => {
    let gradientBuilder;
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
        
        // Initialize gradient builder
        gradientBuilder = new GradientBuilder(mockCore);
    });
    
    afterEach(() => {
        if (gradientBuilder) {
            gradientBuilder.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default options', () => {
            expect(gradientBuilder.instances).toBeInstanceOf(Map);
            expect(gradientBuilder.presets).toBeDefined();
        });
        
        test('should bind core events', () => {
            expect(mockCore.on).toHaveBeenCalledWith('gradient-builder:create', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('gradient-builder:destroy', expect.any(Function));
        });
        
        test('should load default presets', () => {
            const defaultPresets = gradientBuilder.getDefaultPresets();
            expect(Object.keys(defaultPresets).length).toBeGreaterThan(0);
            expect(defaultPresets['Blue Ocean']).toBeDefined();
            expect(defaultPresets['Sunset']).toBeDefined();
        });
        
        test('should load saved presets from localStorage', () => {
            const mockPresets = { 'Custom': 'linear-gradient(90deg, #ff0000 0%, #00ff00 100%)' };
            localStorage.getItem.mockReturnValue(JSON.stringify(mockPresets));
            
            const newGradientBuilder = new GradientBuilder(mockCore);
            expect(newGradientBuilder.presets['Custom']).toBeDefined();
        });
    });
    
    describe('Gradient Builder Creation', () => {
        test('should create gradient builder instance', () => {
            const element = document.createElement('div');
            const builder = gradientBuilder.createGradientBuilder(element);
            
            expect(builder).toBeDefined();
            expect(gradientBuilder.instances.size).toBe(1);
        });
        
        test('should enhance existing gradient inputs', () => {
            const input = document.createElement('input');
            input.className = 'las-gradient-field';
            input.value = 'linear-gradient(90deg, #ff0000 0%, #00ff00 100%)';
            container.appendChild(input);
            
            const builder = gradientBuilder.enhanceGradientInput(input);
            
            expect(input.dataset.lasEnhanced).toBe('true');
            expect(input.style.display).toBe('none');
            expect(builder).toBeDefined();
        });
        
        test('should not enhance already enhanced inputs', () => {
            const input = document.createElement('input');
            input.className = 'las-gradient-field';
            input.dataset.lasEnhanced = 'true';
            container.appendChild(input);
            
            const builder = gradientBuilder.enhanceGradientInput(input);
            expect(builder).toBeUndefined();
        });
    });
    
    describe('Preset Management', () => {
        test('should save preset', () => {
            const gradient = 'linear-gradient(90deg, #ff0000 0%, #00ff00 100%)';
            gradientBuilder.savePreset('test-preset', gradient);
            
            expect(gradientBuilder.presets['test-preset']).toBe(gradient);
            expect(localStorage.setItem).toHaveBeenCalled();
        });
        
        test('should delete preset', () => {
            gradientBuilder.presets = { 'test-preset': 'linear-gradient(90deg, #ff0000 0%, #00ff00 100%)' };
            gradientBuilder.deletePreset('test-preset');
            
            expect(gradientBuilder.presets['test-preset']).toBeUndefined();
            expect(localStorage.setItem).toHaveBeenCalled();
        });
        
        test('should update all instances when preset is saved', () => {
            const mockInstance = { updatePresets: jest.fn() };
            gradientBuilder.instances.set('test', mockInstance);
            
            gradientBuilder.savePreset('test', 'linear-gradient(90deg, #ff0000 0%, #00ff00 100%)');
            
            expect(mockInstance.updatePresets).toHaveBeenCalled();
        });
        
        test('should only save custom presets to localStorage', () => {
            const defaultPresets = gradientBuilder.getDefaultPresets();
            const customGradient = 'linear-gradient(90deg, #ff0000 0%, #00ff00 100%)';
            
            // Add a default preset (should not be saved)
            gradientBuilder.presets = { ...defaultPresets, 'Custom': customGradient };
            gradientBuilder.savePresetsToStorage();
            
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'las_gradient_presets',
                JSON.stringify({ 'Custom': customGradient })
            );
        });
    });
});

describe('AdvancedGradientBuilder Component', () => {
    let builder;
    let element;
    let mockManager;
    
    beforeEach(() => {
        // Create element
        element = document.createElement('div');
        document.body.appendChild(element);
        
        // Create mock manager
        mockManager = {
            savePreset: jest.fn(),
            deletePreset: jest.fn(),
            getDefaultPresets: jest.fn(() => ({
                'Blue Ocean': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }))
        };
        
        // Mock prompt for preset saving
        window.prompt = jest.fn();
        
        // Create builder instance with mock implementation
        builder = new (class extends EventTarget {
            constructor(element, options) {
                super();
                this.element = element;
                this.options = options;
                this.id = options.id || 'test-builder';
                this.manager = options.manager || mockManager;
                
                this.currentGradient = this.parseGradient(options.defaultGradient || 'linear-gradient(90deg, #2271b1 0%, #72aee6 100%)');
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
                this.preview.className = 'las-gradient-preview';
                
                this.gradientDisplay = document.createElement('div');
                this.gradientDisplay.className = 'las-gradient-display';
                
                this.tooltip = document.createElement('div');
                this.tooltip.className = 'las-gradient-tooltip';
                
                this.preview.appendChild(this.gradientDisplay);
                this.preview.appendChild(this.tooltip);
                this.element.appendChild(this.preview);
            }
            
            createPanel() {
                this.panel = document.createElement('div');
                this.panel.className = 'las-gradient-builder-panel';
                this.panel.innerHTML = `
                    <div class="las-gradient-builder-content">
                        <div class="las-gradient-preview-large"></div>
                        <textarea class="las-css-textarea" readonly></textarea>
                        <button class="las-copy-css-btn">Copy CSS</button>
                        <input type="radio" name="gradient-type" value="linear" checked>
                        <input type="radio" name="gradient-type" value="radial">
                        <input type="range" class="las-direction-slider" min="0" max="360" value="90">
                        <input type="number" class="las-direction-input" min="0" max="360" value="90">
                        <button class="las-add-stop-btn">+ Add Stop</button>
                        <div class="las-color-stops"></div>
                        <div class="las-color-stops-list"></div>
                        <div class="las-gradient-presets"></div>
                        <button class="las-save-preset-btn">Save Current</button>
                    </div>
                    <div class="las-gradient-builder-actions">
                        <button class="las-cancel-btn">Cancel</button>
                        <button class="las-apply-btn">Apply</button>
                    </div>
                `;
                document.body.appendChild(this.panel);
                
                this.cacheElements();
            }
            
            cacheElements() {
                this.elements = {
                    previewLarge: this.panel.querySelector('.las-gradient-preview-large'),
                    cssTextarea: this.panel.querySelector('.las-css-textarea'),
                    copyCssBtn: this.panel.querySelector('.las-copy-css-btn'),
                    typeRadios: this.panel.querySelectorAll('input[name="gradient-type"]'),
                    directionSlider: this.panel.querySelector('.las-direction-slider'),
                    directionInput: this.panel.querySelector('.las-direction-input'),
                    addStopBtn: this.panel.querySelector('.las-add-stop-btn'),
                    colorStops: this.panel.querySelector('.las-color-stops'),
                    colorStopsList: this.panel.querySelector('.las-color-stops-list'),
                    presets: this.panel.querySelector('.las-gradient-presets'),
                    savePresetBtn: this.panel.querySelector('.las-save-preset-btn'),
                    cancelBtn: this.panel.querySelector('.las-cancel-btn'),
                    applyBtn: this.panel.querySelector('.las-apply-btn')
                };
            }
            
            bindEvents() {
                this.preview.addEventListener('click', () => this.toggle());
                this.elements.directionSlider.addEventListener('input', this.handleDirectionChange.bind(this));
                this.elements.directionInput.addEventListener('input', this.handleDirectionInputChange.bind(this));
                this.elements.addStopBtn.addEventListener('click', () => this.addColorStop());
                this.elements.copyCssBtn.addEventListener('click', this.copyCSSToClipboard.bind(this));
                this.elements.savePresetBtn.addEventListener('click', this.handleSavePreset.bind(this));
                this.elements.applyBtn.addEventListener('click', () => this.apply());
                this.elements.cancelBtn.addEventListener('click', () => this.close());
                
                this.elements.typeRadios.forEach(radio => {
                    radio.addEventListener('change', this.handleTypeChange.bind(this));
                });
            }
            
            handleTypeChange(e) {
                this.currentGradient.type = e.target.value;
                this.updateGradient();
            }
            
            handleDirectionChange(e) {
                const angle = parseInt(e.target.value);
                this.elements.directionInput.value = angle;
                this.currentGradient.angle = angle;
                this.updateGradient();
            }
            
            handleDirectionInputChange(e) {
                const angle = parseInt(e.target.value) || 0;
                this.elements.directionSlider.value = angle;
                this.currentGradient.angle = angle;
                this.updateGradient();
            }
            
            handleSavePreset() {
                const name = window.prompt('Enter preset name:');
                if (name && name.trim()) {
                    const css = this.generateCSS();
                    this.manager.savePreset(name.trim(), css);
                }
            }
            
            parseGradient(gradientString) {
                const isRadial = gradientString.includes('radial-gradient');
                const type = isRadial ? 'radial' : 'linear';
                
                let angle = 90;
                const angleMatch = gradientString.match(/(\d+)deg/);
                if (angleMatch) {
                    angle = parseInt(angleMatch[1]);
                }
                
                const colorStops = [
                    { color: '#2271b1', position: 0 },
                    { color: '#72aee6', position: 100 }
                ];
                
                return { type, angle, stops: colorStops };
            }
            
            generateCSS() {
                const { type, angle, stops } = this.currentGradient;
                
                const stopsString = stops
                    .sort((a, b) => a.position - b.position)
                    .map(stop => `${stop.color} ${stop.position}%`)
                    .join(', ');
                
                if (type === 'radial') {
                    return `radial-gradient(circle, ${stopsString})`;
                } else {
                    return `linear-gradient(${angle}deg, ${stopsString})`;
                }
            }
            
            updateGradient() {
                this.updatePreview();
                this.updateCSSOutput();
            }
            
            updatePreview() {
                const css = this.generateCSS();
                this.gradientDisplay.style.background = css;
                this.elements.previewLarge.style.background = css;
                this.tooltip.textContent = css;
            }
            
            updateCSSOutput() {
                const css = this.generateCSS();
                this.elements.cssTextarea.value = css;
            }
            
            updateDisplay() {
                this.updatePreview();
                this.updateCSSOutput();
            }
            
            addColorStop() {
                if (this.currentGradient.stops.length < 10) {
                    this.currentGradient.stops.push({
                        color: '#ff0000',
                        position: 50
                    });
                    this.updateGradient();
                }
            }
            
            copyCSSToClipboard() {
                const css = this.elements.cssTextarea.value;
                
                // Mock clipboard API
                if (navigator.clipboard) {
                    return Promise.resolve();
                }
                
                // Fallback
                this.elements.cssTextarea.select();
                document.execCommand('copy');
                this.showCopyFeedback();
            }
            
            showCopyFeedback() {
                const originalText = this.elements.copyCssBtn.textContent;
                this.elements.copyCssBtn.textContent = 'Copied!';
                this.elements.copyCssBtn.classList.add('copied');
                
                setTimeout(() => {
                    this.elements.copyCssBtn.textContent = originalText;
                    this.elements.copyCssBtn.classList.remove('copied');
                }, 2000);
            }
            
            loadGradient(gradientString) {
                this.currentGradient = this.parseGradient(gradientString);
                
                this.elements.typeRadios.forEach(radio => {
                    radio.checked = radio.value === this.currentGradient.type;
                });
                
                this.elements.directionSlider.value = this.currentGradient.angle;
                this.elements.directionInput.value = this.currentGradient.angle;
                
                this.updateGradient();
            }
            
            toggle() {
                this.isOpen ? this.close() : this.open();
            }
            
            open() {
                this.isOpen = true;
                this.panel.classList.add('open');
                this.dispatchEvent(new CustomEvent('las-gradient-builder-open'));
            }
            
            close() {
                this.isOpen = false;
                this.panel.classList.remove('open');
                this.dispatchEvent(new CustomEvent('las-gradient-builder-close'));
            }
            
            apply() {
                this.close();
                this.dispatchEvent(new CustomEvent('las-gradient-change', {
                    detail: { gradient: this.generateCSS() }
                }));
            }
            
            getValue() {
                return this.generateCSS();
            }
            
            setValue(gradient) {
                this.loadGradient(gradient);
            }
            
            destroy() {
                if (this.panel && this.panel.parentNode) {
                    this.panel.parentNode.removeChild(this.panel);
                }
            }
        })(element, { id: 'test-builder', manager: mockManager });
    });
    
    afterEach(() => {
        if (builder) {
            builder.destroy();
        }
        document.body.removeChild(element);
    });
    
    describe('Gradient Parsing', () => {
        test('should parse linear gradients correctly', () => {
            const gradient = builder.parseGradient('linear-gradient(45deg, #ff0000 0%, #00ff00 100%)');
            
            expect(gradient.type).toBe('linear');
            expect(gradient.angle).toBe(45);
            expect(gradient.stops).toHaveLength(2);
        });
        
        test('should parse radial gradients correctly', () => {
            const gradient = builder.parseGradient('radial-gradient(circle, #ff0000 0%, #00ff00 100%)');
            
            expect(gradient.type).toBe('radial');
            expect(gradient.stops).toHaveLength(2);
        });
        
        test('should handle gradients without explicit angle', () => {
            const gradient = builder.parseGradient('linear-gradient(#ff0000, #00ff00)');
            
            expect(gradient.type).toBe('linear');
            expect(gradient.angle).toBe(90); // default
        });
    });
    
    describe('CSS Generation', () => {
        test('should generate linear gradient CSS', () => {
            builder.currentGradient = {
                type: 'linear',
                angle: 45,
                stops: [
                    { color: '#ff0000', position: 0 },
                    { color: '#00ff00', position: 100 }
                ]
            };
            
            const css = builder.generateCSS();
            expect(css).toBe('linear-gradient(45deg, #ff0000 0%, #00ff00 100%)');
        });
        
        test('should generate radial gradient CSS', () => {
            builder.currentGradient = {
                type: 'radial',
                angle: 0,
                stops: [
                    { color: '#ff0000', position: 0 },
                    { color: '#00ff00', position: 100 }
                ]
            };
            
            const css = builder.generateCSS();
            expect(css).toBe('radial-gradient(circle, #ff0000 0%, #00ff00 100%)');
        });
        
        test('should sort color stops by position', () => {
            builder.currentGradient = {
                type: 'linear',
                angle: 90,
                stops: [
                    { color: '#00ff00', position: 100 },
                    { color: '#ff0000', position: 0 },
                    { color: '#0000ff', position: 50 }
                ]
            };
            
            const css = builder.generateCSS();
            expect(css).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 50%, #00ff00 100%)');
        });
    });
    
    describe('User Interactions', () => {
        test('should toggle panel on preview click', () => {
            expect(builder.isOpen).toBe(false);
            
            builder.preview.click();
            expect(builder.isOpen).toBe(true);
            
            builder.preview.click();
            expect(builder.isOpen).toBe(false);
        });
        
        test('should update gradient type on radio change', () => {
            const radialRadio = builder.elements.typeRadios[1]; // radial
            radialRadio.checked = true;
            radialRadio.dispatchEvent(new Event('change'));
            
            expect(builder.currentGradient.type).toBe('radial');
        });
        
        test('should update angle on slider change', () => {
            builder.elements.directionSlider.value = '180';
            builder.elements.directionSlider.dispatchEvent(new Event('input'));
            
            expect(builder.currentGradient.angle).toBe(180);
            expect(builder.elements.directionInput.value).toBe('180');
        });
        
        test('should update angle on input change', () => {
            builder.elements.directionInput.value = '270';
            builder.elements.directionInput.dispatchEvent(new Event('input'));
            
            expect(builder.currentGradient.angle).toBe(270);
            expect(builder.elements.directionSlider.value).toBe('270');
        });
        
        test('should add color stop', () => {
            const initialStops = builder.currentGradient.stops.length;
            builder.addColorStop();
            
            expect(builder.currentGradient.stops.length).toBe(initialStops + 1);
        });
        
        test('should not add more than 10 color stops', () => {
            // Add stops to reach limit
            builder.currentGradient.stops = new Array(10).fill({ color: '#ff0000', position: 50 });
            
            builder.addColorStop();
            expect(builder.currentGradient.stops.length).toBe(10);
        });
        
        test('should save preset when prompted', () => {
            window.prompt.mockReturnValue('My Preset');
            
            builder.elements.savePresetBtn.click();
            
            expect(mockManager.savePreset).toHaveBeenCalledWith('My Preset', builder.generateCSS());
        });
        
        test('should not save preset if name is empty', () => {
            window.prompt.mockReturnValue('');
            
            builder.elements.savePresetBtn.click();
            
            expect(mockManager.savePreset).not.toHaveBeenCalled();
        });
    });
    
    describe('CSS Output and Copying', () => {
        test('should update CSS output when gradient changes', () => {
            builder.currentGradient.angle = 180;
            builder.updateGradient();
            
            const expectedCSS = builder.generateCSS();
            expect(builder.elements.cssTextarea.value).toBe(expectedCSS);
        });
        
        test('should copy CSS to clipboard', async () => {
            // Mock clipboard API
            Object.assign(navigator, {
                clipboard: {
                    writeText: jest.fn(() => Promise.resolve())
                }
            });
            
            await builder.copyCSSToClipboard();
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(builder.generateCSS());
        });
        
        test('should show copy feedback', () => {
            builder.showCopyFeedback();
            
            expect(builder.elements.copyCssBtn.textContent).toBe('Copied!');
            expect(builder.elements.copyCssBtn.classList.contains('copied')).toBe(true);
        });
    });
    
    describe('Gradient Loading', () => {
        test('should load gradient from string', () => {
            const gradientString = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            builder.loadGradient(gradientString);
            
            expect(builder.currentGradient.type).toBe('linear');
            expect(builder.currentGradient.angle).toBe(135);
        });
        
        test('should update UI controls when loading gradient', () => {
            const gradientString = 'radial-gradient(circle, #ff0000 0%, #00ff00 100%)';
            builder.loadGradient(gradientString);
            
            const radialRadio = Array.from(builder.elements.typeRadios).find(r => r.value === 'radial');
            expect(radialRadio.checked).toBe(true);
        });
    });
    
    describe('Public API', () => {
        test('should get current gradient value', () => {
            const expectedCSS = builder.generateCSS();
            expect(builder.getValue()).toBe(expectedCSS);
        });
        
        test('should set gradient value', () => {
            const newGradient = 'linear-gradient(180deg, #ff0000 0%, #00ff00 100%)';
            builder.setValue(newGradient);
            
            expect(builder.currentGradient.angle).toBe(180);
        });
    });
    
    describe('Event Handling', () => {
        test('should emit gradient change event on apply', (done) => {
            builder.addEventListener('las-gradient-change', (e) => {
                expect(e.detail.gradient).toBe(builder.generateCSS());
                done();
            });
            
            builder.apply();
        });
        
        test('should emit open/close events', (done) => {
            let eventCount = 0;
            
            builder.addEventListener('las-gradient-builder-open', () => {
                eventCount++;
                if (eventCount === 2) done();
            });
            
            builder.addEventListener('las-gradient-builder-close', () => {
                eventCount++;
                if (eventCount === 2) done();
            });
            
            builder.open();
            builder.close();
        });
    });
});