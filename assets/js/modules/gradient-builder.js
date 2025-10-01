/**
 * Live Admin Styler - Gradient Builder Module
 * 
 * Visual gradient creation tools with preset management and CSS generation.
 */

export default class GradientBuilder {
    constructor(core) {
        this.core = core;
        this.instances = new Map();
        this.presets = this.loadPresets();
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initializeExistingBuilders();
    }
    
    bindEvents() {
        this.core.on('gradient-builder:create', this.createGradientBuilder.bind(this));
        this.core.on('gradient-builder:destroy', this.destroyGradientBuilder.bind(this));
    }
    
    initializeExistingBuilders() {
        // Find and enhance existing gradient inputs
        const gradientInputs = document.querySelectorAll('.las-gradient-field');
        gradientInputs.forEach(input => this.enhanceGradientInput(input));
    }
    
    createGradientBuilder(element, options = {}) {
        const id = this.generateId();
        const builder = new AdvancedGradientBuilder(element, {
            ...this.getDefaultOptions(),
            ...options,
            id,
            core: this.core,
            manager: this
        });
        
        this.instances.set(id, builder);
        return builder;
    }
    
    enhanceGradientInput(input) {
        if (input.dataset.lasEnhanced) return;
        
        const wrapper = this.createWrapper(input);
        const builder = this.createGradientBuilder(wrapper, {
            defaultGradient: input.value || 'linear-gradient(90deg, #2271b1 0%, #72aee6 100%)',
            linkedInput: input
        });
        
        input.dataset.lasEnhanced = 'true';
        return builder;
    }
    
    createWrapper(input) {
        const wrapper = document.createElement('div');
        wrapper.className = 'las-gradient-builder-wrapper';
        
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        input.style.display = 'none';
        
        return wrapper;
    }
    
    getDefaultOptions() {
        return {
            showPresets: true,
            allowRadial: true,
            maxStops: 10,
            presets: this.presets
        };
    }
    
    getDefaultPresets() {
        return {
            'Blue Ocean': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'Sunset': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'Forest': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'Purple Rain': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'Fire': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'Ocean Blue': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'Warm Flame': 'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 100%)',
            'Night Fade': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'Spring Warmth': 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
            'Juicy Peach': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'Young Passion': 'linear-gradient(135deg, #ff8177 0%, #ff867a 0.01%, #ff8c7f 52%, #f99185 100%)',
            'Lady Lips': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)'
        };
    }
    
    savePreset(name, gradient) {
        this.presets[name] = gradient;
        this.savePresetsToStorage();
        
        // Update all builder instances
        this.instances.forEach(builder => {
            builder.updatePresets(this.presets);
        });
    }
    
    deletePreset(name) {
        delete this.presets[name];
        this.savePresetsToStorage();
        
        // Update all builder instances
        this.instances.forEach(builder => {
            builder.updatePresets(this.presets);
        });
    }
    
    loadPresets() {
        try {
            const stored = localStorage.getItem('las_gradient_presets');
            const savedPresets = stored ? JSON.parse(stored) : {};
            return { ...this.getDefaultPresets(), ...savedPresets };
        } catch (e) {
            return this.getDefaultPresets();
        }
    }
    
    savePresetsToStorage() {
        try {
            // Only save custom presets (not default ones)
            const defaultPresets = this.getDefaultPresets();
            const customPresets = {};
            
            Object.entries(this.presets).forEach(([name, gradient]) => {
                if (!defaultPresets[name]) {
                    customPresets[name] = gradient;
                }
            });
            
            localStorage.setItem('las_gradient_presets', JSON.stringify(customPresets));
        } catch (e) {
            console.warn('Failed to save gradient presets:', e);
        }
    }
    
    generateId() {
        return 'las-gradient-builder-' + Math.random().toString(36).substr(2, 9);
    }
    
    destroyGradientBuilder(id) {
        const builder = this.instances.get(id);
        if (builder) {
            builder.destroy();
            this.instances.delete(id);
        }
    }
    
    destroy() {
        this.instances.forEach(builder => builder.destroy());
        this.instances.clear();
    }
}

/**
 * Advanced Gradient Builder Component
 */
class AdvancedGradientBuilder {
    constructor(element, options = {}) {
        this.element = element;
        this.options = options;
        this.id = options.id;
        this.core = options.core;
        this.manager = options.manager;
        
        this.currentGradient = this.parseGradient(options.defaultGradient || 'linear-gradient(90deg, #2271b1 0%, #72aee6 100%)');
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
        this.preview.className = 'las-gradient-preview';
        this.preview.type = 'button';
        this.preview.setAttribute('aria-label', 'Current gradient');
        this.preview.setAttribute('aria-expanded', 'false');
        this.preview.setAttribute('aria-haspopup', 'dialog');
        
        this.gradientDisplay = document.createElement('div');
        this.gradientDisplay.className = 'las-gradient-display';
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'las-gradient-tooltip';
        this.tooltip.setAttribute('role', 'tooltip');
        this.tooltip.setAttribute('aria-hidden', 'true');
        
        this.preview.appendChild(this.gradientDisplay);
        this.preview.appendChild(this.tooltip);
        this.element.appendChild(this.preview);
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'las-gradient-builder-panel';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-label', 'Gradient builder');
        this.panel.setAttribute('aria-hidden', 'true');
        
        this.panel.innerHTML = this.getPanelHTML();
        document.body.appendChild(this.panel);
        
        this.cacheElements();
        this.initializeControls();
    }
    
    getPanelHTML() {
        return `
            <div class="las-gradient-builder-header">
                <h3 class="las-gradient-builder-title">Gradient Builder</h3>
                <button type="button" class="las-gradient-builder-close" aria-label="Close gradient builder">×</button>
            </div>
            
            <div class="las-gradient-builder-content">
                <!-- Gradient Preview -->
                <div class="las-gradient-preview-section">
                    <div class="las-gradient-preview-large"></div>
                    <div class="las-gradient-css-output">
                        <label class="las-css-label">CSS Output:</label>
                        <textarea class="las-css-textarea" readonly></textarea>
                        <button type="button" class="las-copy-css-btn">Copy CSS</button>
                    </div>
                </div>
                
                <!-- Gradient Type -->
                <div class="las-gradient-type-section">
                    <label class="las-section-label">Gradient Type:</label>
                    <div class="las-gradient-type-controls">
                        <label class="las-radio-label">
                            <input type="radio" name="gradient-type" value="linear" checked>
                            <span>Linear</span>
                        </label>
                        <label class="las-radio-label">
                            <input type="radio" name="gradient-type" value="radial">
                            <span>Radial</span>
                        </label>
                    </div>
                </div>
                
                <!-- Direction/Position Controls -->
                <div class="las-gradient-direction-section">
                    <label class="las-section-label">Direction:</label>
                    <div class="las-direction-controls">
                        <input type="range" class="las-direction-slider" min="0" max="360" value="90">
                        <input type="number" class="las-direction-input" min="0" max="360" value="90">
                        <span class="las-direction-unit">deg</span>
                    </div>
                    <div class="las-direction-presets">
                        <button type="button" class="las-direction-preset" data-angle="0">↑</button>
                        <button type="button" class="las-direction-preset" data-angle="45">↗</button>
                        <button type="button" class="las-direction-preset" data-angle="90">→</button>
                        <button type="button" class="las-direction-preset" data-angle="135">↘</button>
                        <button type="button" class="las-direction-preset" data-angle="180">↓</button>
                        <button type="button" class="las-direction-preset" data-angle="225">↙</button>
                        <button type="button" class="las-direction-preset" data-angle="270">←</button>
                        <button type="button" class="las-direction-preset" data-angle="315">↖</button>
                    </div>
                </div>
                
                <!-- Color Stops -->
                <div class="las-color-stops-section">
                    <div class="las-color-stops-header">
                        <label class="las-section-label">Color Stops:</label>
                        <button type="button" class="las-add-stop-btn">+ Add Stop</button>
                    </div>
                    <div class="las-color-stops-container">
                        <div class="las-gradient-bar"></div>
                        <div class="las-color-stops"></div>
                    </div>
                    <div class="las-color-stops-list"></div>
                </div>
                
                <!-- Presets -->
                <div class="las-gradient-presets-section">
                    <div class="las-presets-header">
                        <label class="las-section-label">Presets:</label>
                        <button type="button" class="las-save-preset-btn">Save Current</button>
                    </div>
                    <div class="las-gradient-presets"></div>
                </div>
            </div>
            
            <div class="las-gradient-builder-actions">
                <button type="button" class="las-button las-button-secondary las-cancel-btn">Cancel</button>
                <button type="button" class="las-button las-button-primary las-apply-btn">Apply</button>
            </div>
        `;
    }
    
    cacheElements() {
        this.elements = {
            close: this.panel.querySelector('.las-gradient-builder-close'),
            previewLarge: this.panel.querySelector('.las-gradient-preview-large'),
            cssTextarea: this.panel.querySelector('.las-css-textarea'),
            copyCssBtn: this.panel.querySelector('.las-copy-css-btn'),
            typeRadios: this.panel.querySelectorAll('input[name="gradient-type"]'),
            directionSlider: this.panel.querySelector('.las-direction-slider'),
            directionInput: this.panel.querySelector('.las-direction-input'),
            directionPresets: this.panel.querySelectorAll('.las-direction-preset'),
            addStopBtn: this.panel.querySelector('.las-add-stop-btn'),
            gradientBar: this.panel.querySelector('.las-gradient-bar'),
            colorStops: this.panel.querySelector('.las-color-stops'),
            colorStopsList: this.panel.querySelector('.las-color-stops-list'),
            savePresetBtn: this.panel.querySelector('.las-save-preset-btn'),
            presets: this.panel.querySelector('.las-gradient-presets'),
            cancelBtn: this.panel.querySelector('.las-cancel-btn'),
            applyBtn: this.panel.querySelector('.las-apply-btn')
        };
    }
    
    initializeControls() {
        this.updatePreview();
        this.updateColorStops();
        this.updatePresets(this.options.presets || {});
        this.updateCSSOutput();
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
        
        // Type change
        this.elements.typeRadios.forEach(radio => {
            radio.addEventListener('change', this.handleTypeChange.bind(this));
        });
        
        // Direction controls
        this.elements.directionSlider.addEventListener('input', this.handleDirectionChange.bind(this));
        this.elements.directionInput.addEventListener('input', this.handleDirectionInputChange.bind(this));
        
        // Direction presets
        this.elements.directionPresets.forEach(btn => {
            btn.addEventListener('click', this.handleDirectionPreset.bind(this));
        });
        
        // Color stops
        this.elements.addStopBtn.addEventListener('click', () => this.addColorStop());
        this.elements.colorStops.addEventListener('click', this.handleColorStopClick.bind(this));
        this.elements.colorStops.addEventListener('mousedown', this.handleColorStopDrag.bind(this));
        
        // CSS copy
        this.elements.copyCssBtn.addEventListener('click', this.copyCSSToClipboard.bind(this));
        
        // Presets
        this.elements.presets.addEventListener('click', this.handlePresetClick.bind(this));
        this.elements.savePresetBtn.addEventListener('click', this.handleSavePreset.bind(this));
        
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
    
    handleDirectionPreset(e) {
        const angle = parseInt(e.target.dataset.angle);
        this.elements.directionSlider.value = angle;
        this.elements.directionInput.value = angle;
        this.currentGradient.angle = angle;
        this.updateGradient();
    }
    
    handleColorStopClick(e) {
        if (e.target.classList.contains('las-color-stop')) {
            this.selectColorStop(e.target);
        }
    }
    
    handleColorStopDrag(e) {
        if (e.target.classList.contains('las-color-stop')) {
            this.startDragColorStop(e.target, e);
        }
    }
    
    handlePresetClick(e) {
        if (e.target.classList.contains('las-gradient-preset')) {
            const gradient = e.target.dataset.gradient;
            this.loadGradient(gradient);
        } else if (e.target.classList.contains('las-delete-preset-btn')) {
            const name = e.target.dataset.name;
            this.manager.deletePreset(name);
        }
    }
    
    handleSavePreset() {
        const name = prompt('Enter preset name:');
        if (name && name.trim()) {
            const css = this.generateCSS();
            this.manager.savePreset(name.trim(), css);
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
    
    parseGradient(gradientString) {
        // Simple gradient parser - can be enhanced for more complex gradients
        const isRadial = gradientString.includes('radial-gradient');
        const type = isRadial ? 'radial' : 'linear';
        
        // Extract angle (for linear gradients)
        let angle = 90;
        const angleMatch = gradientString.match(/(\d+)deg/);
        if (angleMatch) {
            angle = parseInt(angleMatch[1]);
        }
        
        // Extract color stops
        const colorStops = [];
        const stopRegex = /#[0-9a-f]{6}\s+(\d+)%/gi;
        let match;
        
        while ((match = stopRegex.exec(gradientString)) !== null) {
            colorStops.push({
                color: match[0].split(' ')[0],
                position: parseInt(match[1])
            });
        }
        
        // Default stops if none found
        if (colorStops.length === 0) {
            colorStops.push(
                { color: '#2271b1', position: 0 },
                { color: '#72aee6', position: 100 }
            );
        }
        
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
        this.updateColorStops();
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
    
    updateColorStops() {
        // Update visual color stops
        this.elements.colorStops.innerHTML = '';
        this.elements.colorStopsList.innerHTML = '';
        
        this.currentGradient.stops.forEach((stop, index) => {
            this.createColorStopElement(stop, index);
            this.createColorStopListItem(stop, index);
        });
        
        // Update gradient bar
        const css = this.generateCSS();
        this.elements.gradientBar.style.background = css;
    }
    
    createColorStopElement(stop, index) {
        const stopElement = document.createElement('div');
        stopElement.className = 'las-color-stop';
        stopElement.style.left = `${stop.position}%`;
        stopElement.style.backgroundColor = stop.color;
        stopElement.dataset.index = index;
        stopElement.setAttribute('aria-label', `Color stop ${index + 1}: ${stop.color} at ${stop.position}%`);
        stopElement.setAttribute('tabindex', '0');
        
        this.elements.colorStops.appendChild(stopElement);
    }
    
    createColorStopListItem(stop, index) {
        const listItem = document.createElement('div');
        listItem.className = 'las-color-stop-item';
        
        listItem.innerHTML = `
            <div class="las-color-stop-preview" style="background-color: ${stop.color}"></div>
            <input type="color" class="las-color-stop-color" value="${stop.color}" data-index="${index}">
            <input type="number" class="las-color-stop-position" value="${stop.position}" min="0" max="100" data-index="${index}">
            <span class="las-position-unit">%</span>
            <button type="button" class="las-remove-stop-btn" data-index="${index}" ${this.currentGradient.stops.length <= 2 ? 'disabled' : ''}>×</button>
        `;
        
        // Bind events for this stop
        const colorInput = listItem.querySelector('.las-color-stop-color');
        const positionInput = listItem.querySelector('.las-color-stop-position');
        const removeBtn = listItem.querySelector('.las-remove-stop-btn');
        
        colorInput.addEventListener('input', (e) => {
            this.updateColorStop(index, 'color', e.target.value);
        });
        
        positionInput.addEventListener('input', (e) => {
            this.updateColorStop(index, 'position', parseInt(e.target.value));
        });
        
        removeBtn.addEventListener('click', () => {
            this.removeColorStop(index);
        });
        
        this.elements.colorStopsList.appendChild(listItem);
    }
    
    updateColorStop(index, property, value) {
        if (this.currentGradient.stops[index]) {
            this.currentGradient.stops[index][property] = value;
            this.updateGradient();
        }
    }
    
    addColorStop() {
        if (this.currentGradient.stops.length >= this.options.maxStops) {
            return;
        }
        
        // Find a good position for the new stop
        const positions = this.currentGradient.stops.map(s => s.position).sort((a, b) => a - b);
        let newPosition = 50;
        
        // Find the largest gap
        let largestGap = 0;
        let gapPosition = 50;
        
        for (let i = 0; i < positions.length - 1; i++) {
            const gap = positions[i + 1] - positions[i];
            if (gap > largestGap) {
                largestGap = gap;
                gapPosition = positions[i] + gap / 2;
            }
        }
        
        if (largestGap > 10) {
            newPosition = Math.round(gapPosition);
        }
        
        // Interpolate color at this position
        const color = this.interpolateColorAtPosition(newPosition);
        
        this.currentGradient.stops.push({
            color: color,
            position: newPosition
        });
        
        this.updateGradient();
    }
    
    removeColorStop(index) {
        if (this.currentGradient.stops.length > 2) {
            this.currentGradient.stops.splice(index, 1);
            this.updateGradient();
        }
    }
    
    interpolateColorAtPosition(position) {
        const stops = this.currentGradient.stops.sort((a, b) => a.position - b.position);
        
        // Find surrounding stops
        let beforeStop = stops[0];
        let afterStop = stops[stops.length - 1];
        
        for (let i = 0; i < stops.length - 1; i++) {
            if (stops[i].position <= position && stops[i + 1].position >= position) {
                beforeStop = stops[i];
                afterStop = stops[i + 1];
                break;
            }
        }
        
        // Simple color interpolation (can be enhanced)
        const ratio = (position - beforeStop.position) / (afterStop.position - beforeStop.position);
        
        const beforeRgb = this.hexToRgb(beforeStop.color);
        const afterRgb = this.hexToRgb(afterStop.color);
        
        const r = Math.round(beforeRgb.r + (afterRgb.r - beforeRgb.r) * ratio);
        const g = Math.round(beforeRgb.g + (afterRgb.g - beforeRgb.g) * ratio);
        const b = Math.round(beforeRgb.b + (afterRgb.b - beforeRgb.b) * ratio);
        
        return this.rgbToHex(r, g, b);
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
    
    updatePresets(presets) {
        this.elements.presets.innerHTML = '';
        
        Object.entries(presets).forEach(([name, gradient]) => {
            const presetElement = document.createElement('div');
            presetElement.className = 'las-gradient-preset-item';
            
            const isCustom = !this.manager.getDefaultPresets()[name];
            
            presetElement.innerHTML = `
                <div class="las-gradient-preset" 
                     style="background: ${gradient}" 
                     data-gradient="${gradient}"
                     title="${name}">
                </div>
                <span class="las-preset-name">${name}</span>
                ${isCustom ? `<button type="button" class="las-delete-preset-btn" data-name="${name}">×</button>` : ''}
            `;
            
            this.elements.presets.appendChild(presetElement);
        });
    }
    
    loadGradient(gradientString) {
        this.currentGradient = this.parseGradient(gradientString);
        
        // Update UI controls
        this.elements.typeRadios.forEach(radio => {
            radio.checked = radio.value === this.currentGradient.type;
        });
        
        this.elements.directionSlider.value = this.currentGradient.angle;
        this.elements.directionInput.value = this.currentGradient.angle;
        
        this.updateGradient();
    }
    
    startDragColorStop(stopElement, e) {
        e.preventDefault();
        
        const index = parseInt(stopElement.dataset.index);
        const containerRect = this.elements.colorStops.getBoundingClientRect();
        
        const handleMouseMove = (e) => {
            const x = e.clientX - containerRect.left;
            const percentage = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
            
            this.updateColorStop(index, 'position', Math.round(percentage));
        };
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    copyCSSToClipboard() {
        const css = this.elements.cssTextarea.value;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(css).then(() => {
                this.showCopyFeedback();
            });
        } else {
            // Fallback for older browsers
            this.elements.cssTextarea.select();
            document.execCommand('copy');
            this.showCopyFeedback();
        }
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
        this.elements.directionInput.focus();
        
        this.element.dispatchEvent(new CustomEvent('las-gradient-builder-open', {
            detail: { gradient: this.generateCSS() }
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
        
        this.element.dispatchEvent(new CustomEvent('las-gradient-builder-close', {
            detail: { gradient: this.generateCSS() }
        }));
    }
    
    apply() {
        const gradient = this.generateCSS();
        
        // Update linked input if exists
        if (this.options.linkedInput) {
            this.options.linkedInput.value = gradient;
            this.options.linkedInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        this.close();
        
        this.element.dispatchEvent(new CustomEvent('las-gradient-change', {
            detail: { 
                gradient: gradient,
                gradientObject: this.currentGradient
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
        return this.generateCSS();
    }
    
    getGradientObject() {
        return this.currentGradient;
    }
    
    setValue(gradient) {
        this.loadGradient(gradient);
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