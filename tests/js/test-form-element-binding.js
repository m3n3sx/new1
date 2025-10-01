/**
 * Integration Tests for Form Element Binding System
 * Tests the comprehensive form element binding functionality
 */

// Import the LASFormElementBinder class
const { LASFormElementBinder } = require('../../js/admin-settings.js');

describe('LASFormElementBinder', () => {
    let core, settingsManager, formBinder, mockContainer;
    
    beforeEach(() => {
        // Create mock DOM container
        mockContainer = document.createElement('div');
        mockContainer.innerHTML = `
            <!-- Color Picker Elements -->
            <input type="color" id="test_color" data-setting="test_color" value="#ff0000" />
            <input type="text" class="las-fresh-color-picker" id="test_text_color" data-setting="test_text_color" value="#00ff00" />
            
            <!-- Text Input Elements -->
            <input type="text" id="test_text" data-setting="test_text" value="test value" />
            <input type="url" id="test_url" data-setting="test_url" value="https://example.com" />
            
            <!-- Slider Elements -->
            <input type="range" id="test_slider" data-setting="test_slider" min="0" max="100" value="50" />
            <input type="number" class="las-slider-input" id="test_number" data-setting="test_number" min="0" max="100" value="50" />
            <div id="test_slider-slider" class="las-slider" data-setting="test_slider"></div>
            <span id="test_slider-value" class="las-slider-value">50px</span>
            
            <!-- Toggle Elements -->
            <input type="checkbox" id="test_toggle" data-setting="test_toggle" checked />
            <input type="checkbox" id="test_dependency_trigger" data-setting="test_dependency_trigger" data-dependency-trigger="true" />
            
            <!-- Dropdown Elements -->
            <select id="test_select" data-setting="test_select">
                <option value="option1">Option 1</option>
                <option value="option2" selected>Option 2</option>
                <option value="option3">Option 3</option>
            </select>
            
            <!-- Font Family Select -->
            <select class="las-font-family-select" id="test_font" data-setting="test_font">
                <option value="arial">Arial</option>
                <option value="google">Google Font</option>
            </select>
            <div class="google-font-field-wrapper" style="display:none;">
                <input type="text" class="google-font-input" id="test_google_font" data-setting="test_google_font" />
            </div>
            
            <!-- Textarea Elements -->
            <textarea id="test_textarea" data-setting="test_textarea">Test content</textarea>
            <textarea id="test_css" data-setting="test_css">body { color: red; }</textarea>
            
            <!-- Image Upload Elements -->
            <input type="text" class="las-image-url-field" id="test_image" data-setting="test_image" value="" />
            <button type="button" class="las-upload-image-button">Upload</button>
            <button type="button" class="las-remove-image-button" style="display:none;">Remove</button>
            <div class="las-image-preview">
                <img src="" alt="Preview" style="display:none;" />
            </div>
            
            <!-- Dependency Elements -->
            <div class="field-row" data-dependency-id="test_dependency_trigger" data-dependency-value="true">
                <input type="text" id="dependent_field" data-setting="dependent_field" />
            </div>
        `;
        document.body.appendChild(mockContainer);
        
        // Create mock core and settings manager
        core = {
            get: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn()
        };
        
        settingsManager = {
            set: jest.fn(),
            get: jest.fn()
        };
        
        // Mock error handler
        const errorHandler = {
            showError: jest.fn(),
            showSuccess: jest.fn()
        };
        
        core.get.mockImplementation((module) => {
            if (module === 'error') return errorHandler;
            return null;
        });
        
        // Create form binder instance
        formBinder = new LASFormElementBinder(core, settingsManager);
    });
    
    afterEach(() => {
        if (mockContainer.parentNode) {
            document.body.removeChild(mockContainer);
        }
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with core and settings manager', () => {
            expect(formBinder.core).toBe(core);
            expect(formBinder.settingsManager).toBe(settingsManager);
            expect(formBinder.boundElements).toBeInstanceOf(Map);
            expect(formBinder.debounceTimers).toBeInstanceOf(Map);
            expect(formBinder.validationRules).toBeInstanceOf(Map);
        });
        
        test('should set up validation rules', () => {
            expect(formBinder.validationRules.has('color')).toBe(true);
            expect(formBinder.validationRules.has('url')).toBe(true);
            expect(formBinder.validationRules.has('number')).toBe(true);
            expect(formBinder.validationRules.has('css')).toBe(true);
        });
    });
    
    describe('Color Picker Binding', () => {
        beforeEach(() => {
            formBinder.bindColorPickers();
        });
        
        test('should bind HTML5 color input', () => {
            const colorInput = document.getElementById('test_color');
            expect(formBinder.boundElements.has('test_color')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_color');
            expect(elementInfo.type).toBe('color');
            expect(elementInfo.validator).toBe('color');
        });
        
        test('should bind text-based color picker', () => {
            const textColorInput = document.getElementById('test_text_color');
            expect(formBinder.boundElements.has('test_text_color')).toBe(true);
            
            // Should have color preview added
            const preview = textColorInput.nextSibling;
            expect(preview.className).toBe('las-color-preview');
        });
        
        test('should trigger settings update on color change', () => {
            const colorInput = document.getElementById('test_color');
            
            colorInput.value = '#0000ff';
            colorInput.dispatchEvent(new Event('change'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('test_color', '#0000ff');
        });
        
        test('should trigger real-time preview on color input', () => {
            const colorInput = document.getElementById('test_color');
            
            colorInput.value = '#0000ff';
            colorInput.dispatchEvent(new Event('input'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('test_color', '#0000ff', { skipSave: true });
        });
    });
    
    describe('Text Input Binding', () => {
        beforeEach(() => {
            formBinder.bindTextInputs();
        });
        
        test('should bind text inputs with debouncing', () => {
            const textInput = document.getElementById('test_text');
            expect(formBinder.boundElements.has('test_text')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_text');
            expect(elementInfo.type).toBe('text');
            expect(elementInfo.validator).toBe('text');
        });
        
        test('should bind URL inputs with URL validator', () => {
            const urlInput = document.getElementById('test_url');
            expect(formBinder.boundElements.has('test_url')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_url');
            expect(elementInfo.validator).toBe('url');
        });
        
        test('should debounce text input changes', (done) => {
            const textInput = document.getElementById('test_text');
            
            textInput.value = 'new value';
            textInput.dispatchEvent(new Event('input'));
            
            // Should not be called immediately
            expect(settingsManager.set).not.toHaveBeenCalled();
            
            // Should be called after debounce delay
            setTimeout(() => {
                expect(settingsManager.set).toHaveBeenCalledWith('test_text', 'new value');
                done();
            }, 350);
        });
        
        test('should trigger immediate update on blur', () => {
            const textInput = document.getElementById('test_text');
            
            textInput.value = 'blur value';
            textInput.dispatchEvent(new Event('blur'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('test_text', 'blur value');
        });
    });
    
    describe('Slider Binding', () => {
        beforeEach(() => {
            formBinder.bindSliders();
        });
        
        test('should bind range sliders', () => {
            const slider = document.getElementById('test_slider');
            expect(formBinder.boundElements.has('test_slider')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_slider');
            expect(elementInfo.type).toBe('slider');
            expect(elementInfo.validator).toBe('number');
        });
        
        test('should bind number inputs', () => {
            const numberInput = document.getElementById('test_number');
            expect(formBinder.boundElements.has('test_number')).toBe(true);
        });
        
        test('should trigger real-time update on slider input', () => {
            const slider = document.getElementById('test_slider');
            
            slider.value = '75';
            slider.dispatchEvent(new Event('input'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('test_slider', 75, { skipSave: true });
        });
        
        test('should save on slider change', () => {
            const slider = document.getElementById('test_slider');
            
            slider.value = '75';
            slider.dispatchEvent(new Event('change'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('test_slider', 75);
        });
        
        test('should update slider display value', () => {
            const slider = document.getElementById('test_slider');
            const valueDisplay = document.getElementById('test_slider-value');
            
            slider.value = '75';
            slider.dispatchEvent(new Event('input'));
            
            expect(valueDisplay.textContent).toBe('75px');
        });
    });
    
    describe('Toggle Binding', () => {
        beforeEach(() => {
            formBinder.bindToggles();
        });
        
        test('should bind checkbox toggles', () => {
            const toggle = document.getElementById('test_toggle');
            expect(formBinder.boundElements.has('test_toggle')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_toggle');
            expect(elementInfo.type).toBe('toggle');
            expect(elementInfo.validator).toBe('boolean');
        });
        
        test('should trigger settings update on toggle change', () => {
            const toggle = document.getElementById('test_toggle');
            
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('test_toggle', false);
        });
        
        test('should handle dependency triggers', () => {
            const trigger = document.getElementById('test_dependency_trigger');
            const dependent = document.querySelector('[data-dependency-id="test_dependency_trigger"]');
            
            // Initially hidden (trigger is unchecked)
            expect(dependent.style.display).toBe('none');
            
            // Check trigger
            trigger.checked = true;
            trigger.dispatchEvent(new Event('change'));
            
            // Should show dependent field
            expect(dependent.style.display).toBe('');
        });
    });
    
    describe('Dropdown Binding', () => {
        beforeEach(() => {
            formBinder.bindDropdowns();
        });
        
        test('should bind select dropdowns', () => {
            const select = document.getElementById('test_select');
            expect(formBinder.boundElements.has('test_select')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_select');
            expect(elementInfo.type).toBe('select');
            expect(elementInfo.validator).toBe('select');
        });
        
        test('should trigger settings update on selection change', () => {
            const select = document.getElementById('test_select');
            
            select.value = 'option3';
            select.dispatchEvent(new Event('change'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('test_select', 'option3');
        });
        
        test('should handle font family selection', () => {
            const fontSelect = document.getElementById('test_font');
            const googleFontWrapper = document.querySelector('.google-font-field-wrapper');
            
            // Initially hidden
            expect(googleFontWrapper.style.display).toBe('none');
            
            // Select Google Font
            fontSelect.value = 'google';
            fontSelect.dispatchEvent(new Event('change'));
            
            // Should show Google Font input
            expect(googleFontWrapper.style.display).toBe('');
        });
    });
    
    describe('Textarea Binding', () => {
        beforeEach(() => {
            formBinder.bindTextareas();
        });
        
        test('should bind textarea elements', () => {
            const textarea = document.getElementById('test_textarea');
            expect(formBinder.boundElements.has('test_textarea')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_textarea');
            expect(elementInfo.type).toBe('textarea');
            expect(elementInfo.validator).toBe('text');
        });
        
        test('should use CSS validator for CSS textareas', () => {
            const cssTextarea = document.getElementById('test_css');
            expect(formBinder.boundElements.has('test_css')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_css');
            expect(elementInfo.validator).toBe('css');
        });
        
        test('should debounce textarea input changes', (done) => {
            const textarea = document.getElementById('test_textarea');
            
            textarea.value = 'new content';
            textarea.dispatchEvent(new Event('input'));
            
            // Should not be called immediately
            expect(settingsManager.set).not.toHaveBeenCalled();
            
            // Should be called after debounce delay
            setTimeout(() => {
                expect(settingsManager.set).toHaveBeenCalledWith('test_textarea', 'new content');
                done();
            }, 350);
        });
    });
    
    describe('Image Upload Binding', () => {
        beforeEach(() => {
            formBinder.bindImageUploads();
        });
        
        test('should bind image URL fields', () => {
            const imageField = document.getElementById('test_image');
            expect(formBinder.boundElements.has('test_image')).toBe(true);
            
            const elementInfo = formBinder.boundElements.get('test_image');
            expect(elementInfo.type).toBe('image');
            expect(elementInfo.validator).toBe('url');
        });
        
        test('should update image preview on URL change', () => {
            const imageField = document.getElementById('test_image');
            const preview = document.querySelector('.las-image-preview img');
            const removeButton = document.querySelector('.las-remove-image-button');
            
            imageField.value = 'https://example.com/image.jpg';
            imageField.dispatchEvent(new Event('input'));
            
            expect(preview.src).toBe('https://example.com/image.jpg');
            expect(preview.style.display).toBe('');
            expect(removeButton.style.display).toBe('');
        });
        
        test('should handle remove image button', () => {
            const imageField = document.getElementById('test_image');
            const removeButton = document.querySelector('.las-remove-image-button');
            const preview = document.querySelector('.las-image-preview img');
            
            // Set initial value
            imageField.value = 'https://example.com/image.jpg';
            
            // Click remove button
            removeButton.click();
            
            expect(imageField.value).toBe('');
            expect(preview.style.display).toBe('none');
        });
    });
    
    describe('Validation', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should validate color values', () => {
            const colorInput = document.getElementById('test_color');
            
            // Valid color
            expect(formBinder.validateField(colorInput, '#ff0000')).toBe(true);
            expect(formBinder.validateField(colorInput, 'rgb(255, 0, 0)')).toBe(true);
            expect(formBinder.validateField(colorInput, 'rgba(255, 0, 0, 0.5)')).toBe(true);
            
            // Invalid color
            expect(formBinder.validateField(colorInput, 'invalid-color')).toBe(false);
        });
        
        test('should validate URL values', () => {
            const urlInput = document.getElementById('test_url');
            
            // Valid URLs
            expect(formBinder.validateField(urlInput, 'https://example.com')).toBe(true);
            expect(formBinder.validateField(urlInput, 'http://test.org/path')).toBe(true);
            
            // Invalid URL
            expect(formBinder.validateField(urlInput, 'not-a-url')).toBe(false);
        });
        
        test('should validate number ranges', () => {
            const numberInput = document.getElementById('test_number');
            
            // Valid numbers within range
            expect(formBinder.validateField(numberInput, 50, 0, 100)).toBe(true);
            expect(formBinder.validateField(numberInput, 0, 0, 100)).toBe(true);
            expect(formBinder.validateField(numberInput, 100, 0, 100)).toBe(true);
            
            // Invalid numbers outside range
            expect(formBinder.validateField(numberInput, -1, 0, 100)).toBe(false);
            expect(formBinder.validateField(numberInput, 101, 0, 100)).toBe(false);
        });
        
        test('should validate CSS content', () => {
            const cssTextarea = document.getElementById('test_css');
            
            // Valid CSS
            expect(formBinder.validateField(cssTextarea, 'body { color: red; }')).toBe(true);
            
            // Invalid CSS with dangerous content
            expect(formBinder.validateField(cssTextarea, 'body { background: url(javascript:alert(1)); }')).toBe(false);
            expect(formBinder.validateField(cssTextarea, 'body { behavior: url(evil.htc); }')).toBe(false);
        });
        
        test('should show field errors', () => {
            const colorInput = document.getElementById('test_color');
            
            formBinder.showFieldError(colorInput, 'Invalid color format');
            
            expect(colorInput.classList.contains('las-field-invalid')).toBe(true);
            expect(colorInput.getAttribute('aria-invalid')).toBe('true');
            
            const errorElement = colorInput.nextSibling;
            expect(errorElement.className).toBe('las-field-error');
            expect(errorElement.textContent).toBe('Invalid color format');
        });
        
        test('should clear field errors', () => {
            const colorInput = document.getElementById('test_color');
            
            // Show error first
            formBinder.showFieldError(colorInput, 'Invalid color format');
            
            // Clear error
            formBinder.clearFieldError(colorInput);
            
            expect(colorInput.classList.contains('las-field-invalid')).toBe(false);
            expect(colorInput.getAttribute('aria-invalid')).toBeNull();
        });
    });
    
    describe('Accessibility', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should add ARIA labels to elements without them', () => {
            const textInput = document.getElementById('test_text');
            
            expect(textInput.getAttribute('aria-label')).toBeTruthy();
        });
        
        test('should handle required fields', () => {
            const textInput = document.getElementById('test_text');
            textInput.setAttribute('required', '');
            
            formBinder.setupAccessibilityFeatures();
            
            expect(textInput.getAttribute('aria-required')).toBe('true');
        });
        
        test('should handle keyboard shortcuts', () => {
            const saveAllSpy = jest.spyOn(formBinder, 'saveAllSettings').mockImplementation(() => {});
            
            // Simulate Ctrl+S
            const event = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true
            });
            
            document.dispatchEvent(event);
            
            expect(saveAllSpy).toHaveBeenCalled();
        });
    });
    
    describe('Cleanup', () => {
        test('should clean up resources', () => {
            formBinder.bindAllElements();
            
            // Add some timers and errors
            formBinder.debounceTimers.set('test', setTimeout(() => {}, 1000));
            formBinder.showFieldError(document.getElementById('test_text'), 'Test error');
            
            expect(formBinder.debounceTimers.size).toBeGreaterThan(0);
            expect(formBinder.errorElements.size).toBeGreaterThan(0);
            expect(formBinder.boundElements.size).toBeGreaterThan(0);
            
            formBinder.cleanup();
            
            expect(formBinder.debounceTimers.size).toBe(0);
            expect(formBinder.errorElements.size).toBe(0);
            expect(formBinder.boundElements.size).toBe(0);
        });
    });
    
    describe('Integration', () => {
        test('should bind all element types', () => {
            formBinder.bindAllElements();
            
            // Should have bound multiple elements
            expect(formBinder.boundElements.size).toBeGreaterThan(10);
            
            // Should have different element types
            const elementTypes = Array.from(formBinder.boundElements.values()).map(info => info.type);
            expect(elementTypes).toContain('color');
            expect(elementTypes).toContain('text');
            expect(elementTypes).toContain('slider');
            expect(elementTypes).toContain('toggle');
            expect(elementTypes).toContain('select');
            expect(elementTypes).toContain('textarea');
            expect(elementTypes).toContain('image');
        });
        
        test('should handle complex form interactions', () => {
            formBinder.bindAllElements();
            
            // Test dependency trigger
            const trigger = document.getElementById('test_dependency_trigger');
            const dependent = document.querySelector('[data-dependency-id="test_dependency_trigger"]');
            
            trigger.checked = true;
            trigger.dispatchEvent(new Event('change'));
            
            expect(dependent.style.display).toBe('');
            expect(settingsManager.set).toHaveBeenCalledWith('test_dependency_trigger', true);
        });
    });
});