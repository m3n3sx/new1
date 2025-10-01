/**
 * FormControls Tests
 * Tests for advanced form controls with modern styling
 */

import FormControls from '../../assets/js/modules/form-controls.js';

// Mock core system
const mockCore = {
    events: new Map(),
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    },
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }
};

// Mock DOM environment
const mockDOM = () => {
    global.document = {
        createElement: jest.fn((tag) => ({
            tagName: tag.toUpperCase(),
            className: '',
            innerHTML: '',
            style: {
                setProperty: jest.fn(),
                getProperty: jest.fn()
            },
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                toggle: jest.fn(),
                contains: jest.fn()
            },
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            appendChild: jest.fn(),
            remove: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => []),
            dispatchEvent: jest.fn(),
            focus: jest.fn(),
            blur: jest.fn(),
            value: '',
            checked: false,
            disabled: false
        })),
        querySelector: jest.fn(),
        addEventListener: jest.fn(),
        body: {
            appendChild: jest.fn(),
            classList: {
                toggle: jest.fn()
            }
        }
    };

    global.window = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        matchMedia: jest.fn(() => ({
            matches: false,
            addListener: jest.fn(),
            removeListener: jest.fn()
        })),
        Event: jest.fn()
    };
};

describe('FormControls', () => {
    let formControls;
    let mockContainer;

    beforeEach(() => {
        mockDOM();
        jest.clearAllMocks();
        
        mockContainer = document.createElement('div');
        formControls = new FormControls(mockCore);
    });

    afterEach(() => {
        if (formControls) {
            formControls.destroy();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(formControls.controls.size).toBe(0);
            expect(formControls.validators.size).toBeGreaterThan(0);
            expect(formControls.currentTheme).toBe('auto');
        });

        test('should emit initialization event', () => {
            const initSpy = jest.fn();
            mockCore.on('form-controls:initialized', initSpy);
            
            new FormControls(mockCore);
            
            expect(initSpy).toHaveBeenCalled();
        });

        test('should setup default validators', () => {
            expect(formControls.validators.has('required')).toBe(true);
            expect(formControls.validators.has('email')).toBe(true);
            expect(formControls.validators.has('minLength')).toBe(true);
            expect(formControls.validators.has('maxLength')).toBe(true);
            expect(formControls.validators.has('pattern')).toBe(true);
        });
    });

    describe('Form Creation', () => {
        test('should create form with default configuration', () => {
            const form = formControls.createForm(mockContainer);
            
            expect(form.id).toBeDefined();
            expect(form.layout).toBe('vertical');
            expect(form.validation).toBe(true);
            expect(form.element.className).toContain('las-form');
            expect(form.element.className).toContain('las-form-vertical');
        });

        test('should create form with custom configuration', () => {
            const config = {
                id: 'custom-form',
                layout: 'grid',
                columns: 2,
                gap: '32px',
                validation: false,
                theme: 'dark',
                className: 'custom-class'
            };

            const form = formControls.createForm(mockContainer, config);
            
            expect(form.id).toBe('custom-form');
            expect(form.layout).toBe('grid');
            expect(form.columns).toBe(2);
            expect(form.gap).toBe('32px');
            expect(form.validation).toBe(false);
            expect(form.theme).toBe('dark');
            expect(form.element.className).toContain('custom-class');
        });

        test('should set CSS custom properties for 8px grid', () => {
            const config = {
                gap: '24px',
                columns: 3
            };

            const form = formControls.createForm(mockContainer, config);
            
            expect(form.element.style.setProperty).toHaveBeenCalledWith('--las-form-gap', '24px');
            expect(form.element.style.setProperty).toHaveBeenCalledWith('--las-form-columns', 3);
        });

        test('should emit form creation event', () => {
            const createSpy = jest.fn();
            mockCore.on('form-controls:form-created', createSpy);
            
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            
            expect(createSpy).toHaveBeenCalledWith({ formId: 'test-form' });
        });
    });

    describe('Text Field Creation', () => {
        let formId;

        beforeEach(() => {
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            formId = form.id;
        });

        test('should create text field with basic configuration', () => {
            const config = {
                id: 'test-field',
                label: 'Test Field',
                placeholder: 'Enter text',
                required: true
            };

            const field = formControls.createTextField(formId, config);
            
            expect(field.id).toBe('test-field');
            expect(field.label).toBe('Test Field');
            expect(field.required).toBe(true);
            expect(field.type).toBe('text');
        });

        test('should create text field with all configuration options', () => {
            const config = {
                id: 'full-field',
                label: 'Full Field',
                placeholder: 'Enter email',
                value: 'test@example.com',
                type: 'email',
                required: true,
                variant: 'filled',
                size: 'large',
                helperText: 'Enter your email address',
                maxLength: 100,
                validation: (value) => value.includes('@') ? null : 'Invalid email'
            };

            const field = formControls.createTextField(formId, config);
            
            expect(field.validation).toBeDefined();
            expect(field.element.className).toContain('las-field-filled');
            expect(field.element.className).toContain('las-field-large');
        });

        test('should not create field for non-existent form', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const field = formControls.createTextField('non-existent', { label: 'Test' });
            
            expect(field).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Form with id "non-existent" not found');
            
            consoleSpy.mockRestore();
        });

        test('should emit field creation event', () => {
            const createSpy = jest.fn();
            mockCore.on('form-controls:field-created', createSpy);
            
            formControls.createTextField(formId, { id: 'event-field' });
            
            expect(createSpy).toHaveBeenCalledWith({
                formId: formId,
                fieldId: 'event-field'
            });
        });
    });

    describe('Slider Creation', () => {
        let formId;

        beforeEach(() => {
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            formId = form.id;
        });

        test('should create slider with default configuration', () => {
            const slider = formControls.createSlider(formId, {
                id: 'test-slider',
                label: 'Test Slider'
            });
            
            expect(slider.id).toBe('test-slider');
            expect(slider.type).toBe('slider');
            expect(slider.min).toBe(0);
            expect(slider.max).toBe(100);
        });

        test('should create slider with custom configuration', () => {
            const config = {
                id: 'custom-slider',
                label: 'Custom Slider',
                min: 10,
                max: 200,
                value: 50,
                step: 5,
                unit: 'px',
                variant: 'discrete',
                size: 'large'
            };

            const slider = formControls.createSlider(formId, config);
            
            expect(slider.min).toBe(10);
            expect(slider.max).toBe(200);
            expect(slider.step).toBe(5);
            expect(slider.unit).toBe('px');
            expect(slider.element.className).toContain('las-slider-discrete');
            expect(slider.element.className).toContain('las-slider-large');
        });

        test('should emit slider creation event', () => {
            const createSpy = jest.fn();
            mockCore.on('form-controls:slider-created', createSpy);
            
            formControls.createSlider(formId, { id: 'event-slider' });
            
            expect(createSpy).toHaveBeenCalledWith({
                formId: formId,
                sliderId: 'event-slider'
            });
        });
    });

    describe('Toggle Creation', () => {
        let formId;

        beforeEach(() => {
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            formId = form.id;
        });

        test('should create toggle with default configuration', () => {
            const toggle = formControls.createToggle(formId, {
                id: 'test-toggle',
                label: 'Test Toggle'
            });
            
            expect(toggle.id).toBe('test-toggle');
            expect(toggle.type).toBe('toggle');
            expect(toggle.checked).toBe(false);
        });

        test('should create toggle with custom configuration', () => {
            const config = {
                id: 'custom-toggle',
                label: 'Custom Toggle',
                checked: true,
                size: 'large',
                variant: 'checkbox'
            };

            const toggle = formControls.createToggle(formId, config);
            
            expect(toggle.checked).toBe(true);
            expect(toggle.element.className).toContain('las-toggle-checkbox');
            expect(toggle.element.className).toContain('las-toggle-large');
        });

        test('should emit toggle creation event', () => {
            const createSpy = jest.fn();
            mockCore.on('form-controls:toggle-created', createSpy);
            
            formControls.createToggle(formId, { id: 'event-toggle' });
            
            expect(createSpy).toHaveBeenCalledWith({
                formId: formId,
                toggleId: 'event-toggle'
            });
        });
    });

    describe('Button Creation', () => {
        let formId;

        beforeEach(() => {
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            formId = form.id;
        });

        test('should create button with default configuration', () => {
            const button = formControls.createButton(formId, {
                id: 'test-button',
                label: 'Test Button'
            });
            
            expect(button.id).toBe('test-button');
            expect(button.type).toBe('button');
            expect(button.label).toBe('Test Button');
        });

        test('should create button with custom configuration', () => {
            const onClick = jest.fn();
            const config = {
                id: 'custom-button',
                label: 'Custom Button',
                type: 'submit',
                variant: 'outlined',
                size: 'large',
                icon: '🚀',
                iconPosition: 'right',
                onClick: onClick
            };

            const button = formControls.createButton(formId, config);
            
            expect(button.onClick).toBe(onClick);
            expect(button.element.type).toBe('submit');
            expect(button.element.className).toContain('las-button-outlined');
            expect(button.element.className).toContain('las-button-large');
        });

        test('should emit button creation event', () => {
            const createSpy = jest.fn();
            mockCore.on('form-controls:button-created', createSpy);
            
            formControls.createButton(formId, { id: 'event-button' });
            
            expect(createSpy).toHaveBeenCalledWith({
                formId: formId,
                buttonId: 'event-button'
            });
        });
    });

    describe('Validation', () => {
        let formId, fieldId;

        beforeEach(() => {
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            formId = form.id;
            
            const field = formControls.createTextField(formId, {
                id: 'test-field',
                required: true,
                validation: (value) => value.length < 3 ? 'Too short' : null
            });
            fieldId = field.id;
        });

        test('should validate required field', () => {
            // Mock empty value
            const form = formControls.controls.get(formId);
            const field = form.controls.find(c => c.id === fieldId);
            field.input.value = '';
            
            const isValid = formControls.validateField(fieldId);
            
            expect(isValid).toBe(false);
            expect(form.errors.has(fieldId)).toBe(true);
        });

        test('should validate custom validation function', () => {
            const form = formControls.controls.get(formId);
            const field = form.controls.find(c => c.id === fieldId);
            field.input.value = 'ab'; // Too short
            
            const isValid = formControls.validateField(fieldId);
            
            expect(isValid).toBe(false);
            expect(form.errors.get(fieldId)).toBe('Too short');
        });

        test('should pass validation with valid value', () => {
            const form = formControls.controls.get(formId);
            const field = form.controls.find(c => c.id === fieldId);
            field.input.value = 'valid value';
            
            const isValid = formControls.validateField(fieldId);
            
            expect(isValid).toBe(true);
            expect(form.errors.has(fieldId)).toBe(false);
        });

        test('should validate entire form', () => {
            const form = formControls.controls.get(formId);
            const field = form.controls.find(c => c.id === fieldId);
            field.input.value = 'valid value';
            
            const isValid = formControls.validateForm(formId);
            
            expect(isValid).toBe(true);
        });
    });

    describe('Form Values', () => {
        let formId;

        beforeEach(() => {
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            formId = form.id;
            
            // Create various controls
            formControls.createTextField(formId, { id: 'text-field' });
            formControls.createSlider(formId, { id: 'slider-field' });
            formControls.createToggle(formId, { id: 'toggle-field' });
        });

        test('should get form values', () => {
            const form = formControls.controls.get(formId);
            
            // Mock values
            form.controls.find(c => c.id === 'text-field').input.value = 'test text';
            form.controls.find(c => c.id === 'slider-field').input.value = '75';
            form.controls.find(c => c.id === 'toggle-field').input.checked = true;
            
            const values = formControls.getFormValues(formId);
            
            expect(values['text-field']).toBe('test text');
            expect(values['slider-field']).toBe(75);
            expect(values['toggle-field']).toBe(true);
        });
    });

    describe('Control Updates', () => {
        let formId, fieldId;

        beforeEach(() => {
            const form = formControls.createForm(mockContainer, { id: 'test-form' });
            formId = form.id;
            
            const field = formControls.createTextField(formId, { id: 'update-field' });
            fieldId = field.id;
        });

        test('should update text field value', () => {
            formControls.updateControl(fieldId, 'new value');
            
            const form = formControls.controls.get(formId);
            const field = form.controls.find(c => c.id === fieldId);
            
            expect(field.input.value).toBe('new value');
            expect(field.value).toBe('new value');
        });
    });

    describe('Theme Management', () => {
        test('should setup theme detection', () => {
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        });

        test('should handle reduced motion preference', () => {
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
        });
    });

    describe('Cleanup', () => {
        test('should destroy form controls and clean up resources', () => {
            const form = formControls.createForm(mockContainer, { id: 'cleanup-form' });
            formControls.createTextField(form.id, { id: 'cleanup-field' });
            
            const destroySpy = jest.fn();
            mockCore.on('form-controls:destroyed', destroySpy);

            formControls.destroy();

            expect(formControls.controls.size).toBe(0);
            expect(formControls.validators.size).toBe(0);
            expect(destroySpy).toHaveBeenCalled();
        });
    });

    describe('Default Validators', () => {
        test('should validate required fields', () => {
            const validator = formControls.validators.get('required');
            
            expect(validator('')).toBe('This field is required');
            expect(validator('   ')).toBe('This field is required');
            expect(validator('valid')).toBeNull();
        });

        test('should validate email format', () => {
            const validator = formControls.validators.get('email');
            
            expect(validator('invalid-email')).toBe('Please enter a valid email address');
            expect(validator('test@example.com')).toBeNull();
            expect(validator('')).toBeNull(); // Empty is valid (use required for mandatory)
        });

        test('should validate minimum length', () => {
            const validator = formControls.validators.get('minLength');
            
            expect(validator('ab', 3)).toBe('Minimum 3 characters required');
            expect(validator('abc', 3)).toBeNull();
            expect(validator('', 3)).toBeNull(); // Empty is valid
        });

        test('should validate maximum length', () => {
            const validator = formControls.validators.get('maxLength');
            
            expect(validator('toolong', 5)).toBe('Maximum 5 characters allowed');
            expect(validator('short', 5)).toBeNull();
            expect(validator('', 5)).toBeNull();
        });

        test('should validate pattern', () => {
            const validator = formControls.validators.get('pattern');
            
            expect(validator('123', '^[a-zA-Z]+$')).toBe('Please enter a valid format');
            expect(validator('abc', '^[a-zA-Z]+$')).toBeNull();
            expect(validator('', '^[a-zA-Z]+$')).toBeNull();
        });
    });
});