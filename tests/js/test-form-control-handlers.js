/**
 * Form Control Handlers Integration Tests
 * Tests for specialized form control initialization and handling
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

describe('Form Control Handlers', () => {
    let formManager;
    let mockCore;
    let mockStateManager;
    let testContainer;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.className = 'las-fresh-settings-wrap';
        document.body.appendChild(testContainer);

        // Mock jQuery and jQuery UI for testing
        global.jQuery = jest.fn(() => ({
            wpColorPicker: jest.fn(),
            slider: jest.fn()
        }));
        global.$ = global.jQuery;
        
        // Mock jQuery UI methods
        global.jQuery.fn = {
            wpColorPicker: jest.fn().mockReturnThis(),
            slider: jest.fn().mockReturnThis()
        };

        // Mock core manager
        mockCore = {
            log: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            get: jest.fn()
        };

        // Mock state manager
        mockStateManager = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true)
        };

        mockCore.get.mockImplementation((name) => {
            if (name === 'state') return mockStateManager;
            return null;
        });

        // Create form manager instance
        formManager = new LASFormManager(mockCore);
    });

    afterEach(() => {
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
        
        if (formManager) {
            formManager.destroy();
        }
        
        jest.clearAllMocks();
        delete global.jQuery;
        delete global.$;
    });

    describe('Color Picker Handlers', () => {
        test('should initialize WordPress color picker when available', async () => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'test-color';
            colorInput.value = '#ff0000';
            testContainer.appendChild(colorInput);

            await formManager.init();

            const control = formManager.controls.get('test-color');
            expect(control).toBeDefined();
            expect(global.jQuery.fn.wpColorPicker).toHaveBeenCalled();
        });

        test('should wrap color picker with styling wrapper', async () => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'test-color';
            testContainer.appendChild(colorInput);

            await formManager.init();

            const wrapper = colorInput.closest('.las-color-picker-wrapper');
            expect(wrapper).toBeTruthy();
            expect(colorInput.classList.contains('las-color-picker')).toBe(true);
            expect(colorInput.classList.contains('las-form-control')).toBe(true);
        });

        test('should fall back to native color picker when WordPress picker unavailable', async () => {
            // Remove jQuery to simulate unavailable WordPress color picker
            delete global.jQuery;
            delete global.$;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'test-color';
            testContainer.appendChild(colorInput);

            await formManager.init();

            expect(colorInput.type).toBe('color');
            expect(colorInput.classList.contains('las-color-picker')).toBe(true);
        });

        test('should create color preview for native color picker', async () => {
            delete global.jQuery;
            delete global.$;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'test-color';
            colorInput.value = '#ff0000';
            testContainer.appendChild(colorInput);

            await formManager.init();

            const wrapper = colorInput.closest('.las-color-picker-wrapper');
            const preview = wrapper.querySelector('.las-color-preview');
            expect(preview).toBeTruthy();
            expect(preview.style.backgroundColor).toBe('rgb(255, 0, 0)');
        });

        test('should handle color change events', async () => {
            delete global.jQuery;
            delete global.$;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'test-color';
            testContainer.appendChild(colorInput);

            await formManager.init();

            // Simulate color change
            colorInput.value = '#00ff00';
            colorInput.dispatchEvent(new Event('change', { bubbles: true }));

            expect(mockCore.emit).toHaveBeenCalledWith('form:control-changed', 
                expect.objectContaining({
                    controlId: 'test-color',
                    value: '#00ff00'
                })
            );
        });
    });

    describe('Slider Handlers', () => {
        test('should initialize jQuery UI slider when available', async () => {
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = 'test-slider';
            slider.min = '0';
            slider.max = '100';
            slider.value = '50';
            testContainer.appendChild(slider);

            await formManager.init();

            const control = formManager.controls.get('test-slider');
            expect(control).toBeDefined();
            expect(global.jQuery.fn.slider).toHaveBeenCalled();
        });

        test('should wrap slider with styling wrapper', async () => {
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = 'test-slider';
            testContainer.appendChild(slider);

            await formManager.init();

            const wrapper = slider.closest('.las-slider-wrapper');
            expect(wrapper).toBeTruthy();
        });

        test('should create slider display element', async () => {
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = 'test-slider';
            slider.value = '75';
            testContainer.appendChild(slider);

            await formManager.init();

            const display = testContainer.querySelector('.las-slider-display');
            expect(display).toBeTruthy();
            expect(display.textContent).toBe('75');
        });

        test('should fall back to native range input when jQuery UI unavailable', async () => {
            delete global.jQuery;
            delete global.$;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = 'test-slider';
            testContainer.appendChild(slider);

            await formManager.init();

            expect(slider.type).toBe('range');
            expect(slider.classList.contains('las-slider-fallback')).toBe(true);
            expect(slider.classList.contains('las-form-control')).toBe(true);
        });

        test('should handle slider value changes', async () => {
            delete global.jQuery;
            delete global.$;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = 'test-slider';
            testContainer.appendChild(slider);

            await formManager.init();

            // Simulate slider change
            slider.value = '75';
            slider.dispatchEvent(new Event('input', { bubbles: true }));

            expect(mockCore.emit).toHaveBeenCalledWith('form:control-changed', 
                expect.objectContaining({
                    controlId: 'test-slider',
                    value: '75'
                })
            );
        });
    });

    describe('Text Input Handlers', () => {
        test('should wrap text input in form group', async () => {
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'test-text';
            testContainer.appendChild(textInput);

            await formManager.init();

            const wrapper = textInput.closest('.las-form-group');
            expect(wrapper).toBeTruthy();
            expect(textInput.classList.contains('las-form-control')).toBe(true);
        });

        test('should enhance email input with validation pattern', async () => {
            const emailInput = document.createElement('input');
            emailInput.type = 'email';
            emailInput.id = 'test-email';
            testContainer.appendChild(emailInput);

            await formManager.init();

            expect(emailInput.pattern).toBeTruthy();
            expect(emailInput.placeholder).toBe('example@domain.com');
            expect(emailInput.autocomplete).toBe('email');
        });

        test('should enhance URL input with placeholder', async () => {
            const urlInput = document.createElement('input');
            urlInput.type = 'url';
            urlInput.id = 'test-url';
            testContainer.appendChild(urlInput);

            await formManager.init();

            expect(urlInput.placeholder).toBe('https://example.com');
            expect(urlInput.autocomplete).toBe('url');
        });

        test('should enhance number input with step controls', async () => {
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.id = 'test-number';
            numberInput.min = '0';
            numberInput.max = '100';
            numberInput.step = '1';
            numberInput.value = '50';
            testContainer.appendChild(numberInput);

            await formManager.init();

            const wrapper = numberInput.closest('.las-form-group');
            const controls = wrapper.querySelector('.las-number-controls');
            expect(controls).toBeTruthy();
            
            const upButton = controls.querySelector('button:first-child');
            const downButton = controls.querySelector('button:last-child');
            expect(upButton).toBeTruthy();
            expect(downButton).toBeTruthy();
        });

        test('should enhance password input with visibility toggle', async () => {
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'test-password';
            testContainer.appendChild(passwordInput);

            await formManager.init();

            const wrapper = passwordInput.closest('.las-form-group');
            const toggle = wrapper.querySelector('.las-password-toggle');
            expect(toggle).toBeTruthy();
            expect(passwordInput.autocomplete).toBe('current-password');
        });

        test('should handle debounced input changes', (done) => {
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'test-text';
            testContainer.appendChild(textInput);

            formManager.init().then(() => {
                formManager.config.debounceDelay = 50;

                // Simulate rapid typing
                textInput.value = 'test';
                textInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                textInput.value = 'test value';
                textInput.dispatchEvent(new Event('input', { bubbles: true }));

                // Should only emit once after debounce delay
                setTimeout(() => {
                    expect(mockCore.emit).toHaveBeenCalledWith('form:control-changed', 
                        expect.objectContaining({
                            controlId: 'test-text',
                            value: 'test value'
                        })
                    );
                    done();
                }, 60);
            });
        });

        test('should clear validation display on input', async () => {
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'test-text';
            textInput.classList.add('las-invalid');
            testContainer.appendChild(textInput);

            await formManager.init();

            // Simulate input
            textInput.dispatchEvent(new Event('input', { bubbles: true }));

            expect(textInput.classList.contains('las-invalid')).toBe(false);
        });
    });

    describe('Toggle Handlers', () => {
        test('should initialize checkbox controls', async () => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'test-checkbox';
            checkbox.checked = true;
            testContainer.appendChild(checkbox);

            await formManager.init();

            const control = formManager.controls.get('test-checkbox');
            expect(control).toBeDefined();
            expect(control.type).toBe('checkbox');
            expect(control.value).toBe(true);
        });

        test('should initialize radio controls', async () => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = 'test-radio';
            radio.name = 'test-group';
            radio.value = 'option1';
            testContainer.appendChild(radio);

            await formManager.init();

            const control = formManager.controls.get('test-radio');
            expect(control).toBeDefined();
            expect(control.type).toBe('radio');
        });

        test('should handle toggle change events', async () => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'test-checkbox';
            testContainer.appendChild(checkbox);

            await formManager.init();

            // Simulate checkbox change
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));

            expect(mockCore.emit).toHaveBeenCalledWith('form:control-changed', 
                expect.objectContaining({
                    controlId: 'test-checkbox',
                    value: true
                })
            );
        });
    });

    describe('Dropdown Handlers', () => {
        test('should initialize select controls', async () => {
            const select = document.createElement('select');
            select.id = 'test-select';
            
            const option1 = document.createElement('option');
            option1.value = 'option1';
            option1.textContent = 'Option 1';
            
            const option2 = document.createElement('option');
            option2.value = 'option2';
            option2.textContent = 'Option 2';
            option2.selected = true;
            
            select.appendChild(option1);
            select.appendChild(option2);
            testContainer.appendChild(select);

            await formManager.init();

            const control = formManager.controls.get('test-select');
            expect(control).toBeDefined();
            expect(control.type).toBe('select');
            expect(control.value).toBe('option2');
        });

        test('should handle multiple select controls', async () => {
            const select = document.createElement('select');
            select.id = 'test-multi-select';
            select.multiple = true;
            
            const option1 = document.createElement('option');
            option1.value = 'option1';
            option1.selected = true;
            
            const option2 = document.createElement('option');
            option2.value = 'option2';
            option2.selected = true;
            
            select.appendChild(option1);
            select.appendChild(option2);
            testContainer.appendChild(select);

            await formManager.init();

            const control = formManager.controls.get('test-multi-select');
            expect(control).toBeDefined();
            expect(Array.isArray(control.value)).toBe(true);
            expect(control.value).toEqual(['option1', 'option2']);
        });

        test('should handle select change events', async () => {
            const select = document.createElement('select');
            select.id = 'test-select';
            
            const option = document.createElement('option');
            option.value = 'new-option';
            select.appendChild(option);
            testContainer.appendChild(select);

            await formManager.init();

            // Simulate select change
            select.value = 'new-option';
            select.dispatchEvent(new Event('change', { bubbles: true }));

            expect(mockCore.emit).toHaveBeenCalledWith('form:control-changed', 
                expect.objectContaining({
                    controlId: 'test-select',
                    value: 'new-option'
                })
            );
        });
    });

    describe('Validation Integration', () => {
        beforeEach(async () => {
            await formManager.init();
        });

        test('should validate email input on blur', async () => {
            const emailInput = document.createElement('input');
            emailInput.type = 'email';
            emailInput.id = 'test-email';
            emailInput.value = 'invalid-email';
            testContainer.appendChild(emailInput);

            const control = formManager.registerControl(emailInput);
            await formManager.initializeTextInput(control);

            // Simulate blur event
            emailInput.dispatchEvent(new Event('blur', { bubbles: true }));

            // Wait for validation
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(control.validation.valid).toBe(false);
            expect(emailInput.classList.contains('las-invalid')).toBe(true);
        });

        test('should show validation error message', async () => {
            const emailInput = document.createElement('input');
            emailInput.type = 'email';
            emailInput.id = 'test-email';
            emailInput.value = 'invalid-email';
            testContainer.appendChild(emailInput);

            const control = formManager.registerControl(emailInput);
            await formManager.initializeTextInput(control);

            // Trigger validation
            await formManager.validateControl(control.id);

            const wrapper = emailInput.closest('.las-form-group');
            const errorMessage = wrapper.querySelector('.las-validation-error');
            expect(errorMessage).toBeTruthy();
            expect(errorMessage.textContent).toContain('Please enter a valid email address');
        });

        test('should clear validation error on valid input', async () => {
            const emailInput = document.createElement('input');
            emailInput.type = 'email';
            emailInput.id = 'test-email';
            emailInput.value = 'valid@example.com';
            testContainer.appendChild(emailInput);

            const control = formManager.registerControl(emailInput);
            await formManager.initializeTextInput(control);

            // Set initial invalid state
            control.validation.valid = false;
            control.validation.errors = ['Invalid email'];
            emailInput.classList.add('las-invalid');

            // Trigger validation
            await formManager.validateControl(control.id);

            expect(control.validation.valid).toBe(true);
            expect(control.validation.errors).toEqual([]);
            expect(emailInput.classList.contains('las-valid')).toBe(true);
        });
    });

    describe('Accessibility Features', () => {
        test('should add ARIA attributes to form controls', async () => {
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'test-text';
            testContainer.appendChild(textInput);

            await formManager.init();

            // Check for proper ARIA attributes
            expect(textInput.getAttribute('aria-describedby')).toBeTruthy();
        });

        test('should support keyboard navigation for custom controls', async () => {
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'test-password';
            testContainer.appendChild(passwordInput);

            await formManager.init();

            const wrapper = passwordInput.closest('.las-form-group');
            const toggle = wrapper.querySelector('.las-password-toggle');
            
            // Simulate Enter key on toggle
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            toggle.dispatchEvent(enterEvent);

            // Should toggle password visibility
            expect(passwordInput.type).toBe('text');
        });
    });
});