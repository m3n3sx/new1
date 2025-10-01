/**
 * Form Manager Unit Tests
 * Tests for LASFormManager class functionality
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

describe('LASFormManager', () => {
    let formManager;
    let mockCore;
    let mockStateManager;
    let testContainer;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.className = 'las-fresh-settings-wrap';
        document.body.appendChild(testContainer);

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
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await formManager.init();
            
            expect(formManager.initialized).toBe(true);
            expect(mockCore.log).toHaveBeenCalledWith('Form Manager initialized successfully', 'success');
        });

        test('should handle initialization errors gracefully', async () => {
            // Mock an error during initialization
            jest.spyOn(formManager, 'discoverFormControls').mockImplementation(() => {
                throw new Error('Test error');
            });

            await expect(formManager.init()).rejects.toThrow('Test error');
            expect(formManager.initialized).toBe(false);
        });
    });

    describe('Control Discovery', () => {
        test('should discover text input controls', () => {
            // Create test input
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'test-input';
            input.name = 'test_input';
            input.value = 'test value';
            testContainer.appendChild(input);

            formManager.discoverFormControls();

            expect(formManager.controls.size).toBe(1);
            const control = formManager.controls.get('test-input');
            expect(control).toBeDefined();
            expect(control.type).toBe('text');
            expect(control.value).toBe('test value');
            expect(control.name).toBe('test_input');
        });

        test('should discover color picker controls', () => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'test-color';
            colorInput.value = '#ff0000';
            testContainer.appendChild(colorInput);

            formManager.discoverFormControls();

            const control = formManager.controls.get('test-color');
            expect(control).toBeDefined();
            expect(control.type).toBe('color');
            expect(control.value).toBe('#ff0000');
        });

        test('should discover slider controls', () => {
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = 'test-slider';
            slider.min = '0';
            slider.max = '100';
            slider.value = '50';
            testContainer.appendChild(slider);

            formManager.discoverFormControls();

            const control = formManager.controls.get('test-slider');
            expect(control).toBeDefined();
            expect(control.type).toBe('slider');
            expect(control.value).toBe('50');
        });

        test('should discover checkbox controls', () => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'test-checkbox';
            checkbox.checked = true;
            testContainer.appendChild(checkbox);

            formManager.discoverFormControls();

            const control = formManager.controls.get('test-checkbox');
            expect(control).toBeDefined();
            expect(control.type).toBe('checkbox');
            expect(control.value).toBe(true);
        });

        test('should discover select controls', () => {
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

            formManager.discoverFormControls();

            const control = formManager.controls.get('test-select');
            expect(control).toBeDefined();
            expect(control.type).toBe('select');
            expect(control.value).toBe('option2');
        });

        test('should generate unique IDs for controls without ID', () => {
            const input1 = document.createElement('input');
            input1.type = 'text';
            
            const input2 = document.createElement('input');
            input2.type = 'text';
            
            testContainer.appendChild(input1);
            testContainer.appendChild(input2);

            formManager.discoverFormControls();

            expect(formManager.controls.size).toBe(2);
            
            const controlIds = Array.from(formManager.controls.keys());
            expect(controlIds[0]).not.toBe(controlIds[1]);
            expect(controlIds[0]).toMatch(/^las-control-/);
            expect(controlIds[1]).toMatch(/^las-control-/);
        });

        test('should not register the same control twice', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'test-input';
            testContainer.appendChild(input);

            formManager.discoverFormControls();
            const initialSize = formManager.controls.size;
            
            formManager.discoverFormControls();
            
            expect(formManager.controls.size).toBe(initialSize);
        });
    });

    describe('Control Type Detection', () => {
        test('should detect control types correctly', () => {
            const testCases = [
                { element: { type: 'text', classList: { contains: () => false } }, expected: 'text' },
                { element: { type: 'color', classList: { contains: () => false } }, expected: 'color' },
                { element: { type: 'range', classList: { contains: () => false } }, expected: 'slider' },
                { element: { type: 'checkbox', classList: { contains: () => false } }, expected: 'checkbox' },
                { element: { type: 'radio', classList: { contains: () => false } }, expected: 'radio' },
                { element: { type: 'number', classList: { contains: () => false } }, expected: 'number' },
                { element: { type: 'email', classList: { contains: () => false } }, expected: 'email' },
                { element: { type: 'url', classList: { contains: () => false } }, expected: 'url' },
                { element: { tagName: 'SELECT', classList: { contains: () => false } }, expected: 'select' },
                { element: { tagName: 'TEXTAREA', classList: { contains: () => false } }, expected: 'textarea' }
            ];

            testCases.forEach(({ element, expected }) => {
                const result = formManager.getControlType(element);
                expect(result).toBe(expected);
            });
        });

        test('should prioritize class-based detection', () => {
            const element = {
                type: 'text',
                classList: {
                    contains: (className) => className === 'las-color-picker'
                }
            };

            const result = formManager.getControlType(element);
            expect(result).toBe('color');
        });
    });

    describe('Control Value Handling', () => {
        test('should get checkbox values correctly', () => {
            const checkbox = { type: 'checkbox', checked: true };
            const result = formManager.getControlValue(checkbox);
            expect(result).toBe(true);
        });

        test('should get radio values correctly', () => {
            const radio = { type: 'radio', checked: false };
            const result = formManager.getControlValue(radio);
            expect(result).toBe(false);
        });

        test('should get multiple select values correctly', () => {
            const select = {
                tagName: 'SELECT',
                multiple: true,
                selectedOptions: [
                    { value: 'option1' },
                    { value: 'option3' }
                ]
            };

            const result = formManager.getControlValue(select);
            expect(result).toEqual(['option1', 'option3']);
        });

        test('should get regular input values correctly', () => {
            const input = { value: 'test value' };
            const result = formManager.getControlValue(input);
            expect(result).toBe('test value');
        });
    });

    describe('Control Registration', () => {
        test('should register control with all properties', () => {
            const element = document.createElement('input');
            element.type = 'text';
            element.id = 'test-input';
            element.name = 'test_name';
            element.value = 'test value';
            element.required = true;
            element.disabled = true;

            const control = formManager.registerControl(element);

            expect(control).toBeDefined();
            expect(control.id).toBe('test-input');
            expect(control.name).toBe('test_name');
            expect(control.type).toBe('text');
            expect(control.value).toBe('test value');
            expect(control.required).toBe(true);
            expect(control.disabled).toBe(true);
            expect(control.validation.valid).toBe(true);
            expect(control.validation.errors).toEqual([]);
        });

        test('should not register already registered control', () => {
            const element = document.createElement('input');
            element.setAttribute('data-las-registered', 'true');

            const result = formManager.registerControl(element);
            expect(result).toBe(false);
        });

        test('should mark element as registered', () => {
            const element = document.createElement('input');
            element.id = 'test-input';

            formManager.registerControl(element);

            expect(element.getAttribute('data-las-registered')).toBe('true');
            expect(element.getAttribute('data-las-control-id')).toBe('test-input');
        });
    });

    describe('Event Handling', () => {
        test('should handle control change events', () => {
            const controlId = 'test-control';
            const control = {
                id: controlId,
                value: 'old value',
                element: document.createElement('input')
            };
            
            formManager.controls.set(controlId, control);

            formManager.handleControlChange(controlId, 'new value', { source: 'test' });

            expect(control.value).toBe('new value');
            expect(mockCore.emit).toHaveBeenCalledWith('form:control-changed', {
                controlId,
                control,
                value: 'new value',
                oldValue: 'old value',
                options: { source: 'test' }
            });
        });

        test('should save to state manager when not skipped', () => {
            const controlId = 'test-control';
            const control = {
                id: controlId,
                value: 'old value',
                element: document.createElement('input')
            };
            
            formManager.controls.set(controlId, control);

            formManager.handleControlChange(controlId, 'new value');

            expect(mockStateManager.set).toHaveBeenCalledWith('form.test-control', 'new value');
        });

        test('should not save to state when skipSave is true', () => {
            const controlId = 'test-control';
            const control = {
                id: controlId,
                value: 'old value',
                element: document.createElement('input')
            };
            
            formManager.controls.set(controlId, control);

            formManager.handleControlChange(controlId, 'new value', { skipSave: true });

            expect(mockStateManager.set).not.toHaveBeenCalled();
        });

        test('should handle debounced changes', (done) => {
            const controlId = 'test-control';
            const control = {
                id: controlId,
                value: 'old value',
                element: document.createElement('input')
            };
            
            formManager.controls.set(controlId, control);
            formManager.config.debounceDelay = 50;

            formManager.debouncedChange(controlId, 'new value');

            // Should not be called immediately
            expect(mockCore.emit).not.toHaveBeenCalled();

            // Should be called after delay
            setTimeout(() => {
                expect(mockCore.emit).toHaveBeenCalledWith('form:control-changed', expect.any(Object));
                done();
            }, 60);
        });

        test('should clear debounce timer', () => {
            const controlId = 'test-control';
            
            formManager.debouncedChange(controlId, 'value1');
            formManager.debouncedChange(controlId, 'value2');
            
            expect(formManager.debounceTimers.size).toBe(1);
            
            formManager.clearDebounce(controlId);
            
            expect(formManager.debounceTimers.size).toBe(0);
        });
    });

    describe('Validation', () => {
        beforeEach(async () => {
            await formManager.init();
        });

        test('should validate email addresses', async () => {
            const controlId = 'email-control';
            const control = {
                id: controlId,
                type: 'email',
                value: 'invalid-email',
                element: document.createElement('input'),
                validation: { valid: true, errors: [] }
            };
            
            formManager.controls.set(controlId, control);

            const result = await formManager.validateControl(controlId);

            expect(result).toBe(false);
            expect(control.validation.valid).toBe(false);
            expect(control.validation.errors).toContain('Please enter a valid email address');
        });

        test('should validate URLs', async () => {
            const controlId = 'url-control';
            const control = {
                id: controlId,
                type: 'url',
                value: 'not-a-url',
                element: document.createElement('input'),
                validation: { valid: true, errors: [] }
            };
            
            formManager.controls.set(controlId, control);

            const result = await formManager.validateControl(controlId);

            expect(result).toBe(false);
            expect(control.validation.valid).toBe(false);
            expect(control.validation.errors).toContain('Please enter a valid URL');
        });

        test('should validate numbers with min/max constraints', async () => {
            const element = document.createElement('input');
            element.min = '10';
            element.max = '100';
            
            const controlId = 'number-control';
            const control = {
                id: controlId,
                type: 'number',
                value: '5',
                element: element,
                validation: { valid: true, errors: [] }
            };
            
            formManager.controls.set(controlId, control);

            const result = await formManager.validateControl(controlId);

            expect(result).toBe(false);
            expect(control.validation.valid).toBe(false);
            expect(control.validation.errors).toContain('Value must be at least 10');
        });

        test('should pass validation for valid values', async () => {
            const controlId = 'email-control';
            const control = {
                id: controlId,
                type: 'email',
                value: 'test@example.com',
                element: document.createElement('input'),
                validation: { valid: false, errors: ['old error'] }
            };
            
            formManager.controls.set(controlId, control);

            const result = await formManager.validateControl(controlId);

            expect(result).toBe(true);
            expect(control.validation.valid).toBe(true);
            expect(control.validation.errors).toEqual([]);
        });

        test('should validate all controls', async () => {
            const control1 = {
                id: 'control1',
                type: 'email',
                value: 'valid@example.com',
                element: document.createElement('input'),
                validation: { valid: true, errors: [] }
            };
            
            const control2 = {
                id: 'control2',
                type: 'email',
                value: 'invalid-email',
                element: document.createElement('input'),
                validation: { valid: true, errors: [] }
            };
            
            formManager.controls.set('control1', control1);
            formManager.controls.set('control2', control2);

            const results = await formManager.validateAll();

            expect(results.control1).toBe(true);
            expect(results.control2).toBe(false);
        });

        test('should check if all controls are valid', async () => {
            const control1 = {
                validation: { valid: true, errors: [] }
            };
            
            const control2 = {
                validation: { valid: false, errors: ['error'] }
            };
            
            formManager.controls.set('control1', control1);
            formManager.controls.set('control2', control2);

            expect(formManager.isValid()).toBe(false);
            
            control2.validation.valid = true;
            control2.validation.errors = [];
            
            expect(formManager.isValid()).toBe(true);
        });
    });

    describe('Value Management', () => {
        test('should get control value', () => {
            const control = { value: 'test value' };
            formManager.controls.set('test-control', control);

            const result = formManager.getControlValue('test-control');
            expect(result).toBe('test value');
        });

        test('should return null for non-existent control', () => {
            const result = formManager.getControlValue('non-existent');
            expect(result).toBeNull();
        });

        test('should set control value', () => {
            const element = document.createElement('input');
            const control = {
                id: 'test-control',
                type: 'text',
                value: 'old value',
                element: element
            };
            
            formManager.controls.set('test-control', control);

            const result = formManager.setControlValue('test-control', 'new value');

            expect(result).toBe(true);
            expect(control.value).toBe('new value');
            expect(element.value).toBe('new value');
        });

        test('should set checkbox value', () => {
            const element = document.createElement('input');
            element.type = 'checkbox';
            
            const control = {
                id: 'test-checkbox',
                type: 'checkbox',
                value: false,
                element: element
            };
            
            formManager.controls.set('test-checkbox', control);

            formManager.setControlValue('test-checkbox', true);

            expect(control.value).toBe(true);
            expect(element.checked).toBe(true);
        });

        test('should get all form values', () => {
            const control1 = { name: 'field1', value: 'value1' };
            const control2 = { name: 'field2', value: 'value2' };
            
            formManager.controls.set('control1', control1);
            formManager.controls.set('control2', control2);

            const values = formManager.getAllValues();

            expect(values).toEqual({
                field1: 'value1',
                field2: 'value2'
            });
        });

        test('should set all form values', () => {
            const element1 = document.createElement('input');
            const element2 = document.createElement('input');
            
            const control1 = {
                id: 'control1',
                name: 'field1',
                type: 'text',
                value: 'old1',
                element: element1
            };
            
            const control2 = {
                id: 'control2',
                name: 'field2',
                type: 'text',
                value: 'old2',
                element: element2
            };
            
            formManager.controls.set('control1', control1);
            formManager.controls.set('control2', control2);

            const results = formManager.setAllValues({
                field1: 'new1',
                field2: 'new2'
            });

            expect(results.field1).toBe(true);
            expect(results.field2).toBe(true);
            expect(control1.value).toBe('new1');
            expect(control2.value).toBe('new2');
        });
    });

    describe('State Restoration', () => {
        test('should restore form state from storage', async () => {
            const element = document.createElement('input');
            const control = {
                id: 'test-control',
                type: 'text',
                value: 'default',
                element: element
            };
            
            formManager.controls.set('test-control', control);
            
            mockStateManager.get.mockImplementation((key) => {
                if (key === 'form.test-control') {
                    return Promise.resolve('saved value');
                }
                return Promise.resolve(null);
            });

            jest.spyOn(formManager, 'setControlValue');

            await formManager.restoreFormState();

            expect(formManager.setControlValue).toHaveBeenCalledWith(
                'test-control', 
                'saved value', 
                { skipSave: true }
            );
        });

        test('should handle restoration errors gracefully', async () => {
            const control = {
                id: 'test-control',
                type: 'text',
                value: 'default',
                element: document.createElement('input')
            };
            
            formManager.controls.set('test-control', control);
            
            mockStateManager.get.mockRejectedValue(new Error('Storage error'));

            // Should not throw
            await expect(formManager.restoreFormState()).resolves.toBeUndefined();
            expect(mockCore.log).toHaveBeenCalledWith(
                expect.stringContaining('Failed to restore state'),
                'error'
            );
        });
    });

    describe('Form Reset', () => {
        test('should reset all controls to default values', () => {
            const element1 = document.createElement('input');
            element1.defaultValue = 'default1';
            
            const element2 = document.createElement('input');
            element2.type = 'checkbox';
            element2.defaultChecked = true;
            
            const control1 = {
                id: 'control1',
                type: 'text',
                value: 'current1',
                element: element1
            };
            
            const control2 = {
                id: 'control2',
                type: 'checkbox',
                value: false,
                element: element2
            };
            
            formManager.controls.set('control1', control1);
            formManager.controls.set('control2', control2);
            
            jest.spyOn(formManager, 'setControlValue');

            formManager.reset();

            expect(formManager.setControlValue).toHaveBeenCalledWith('control1', 'default1');
            expect(formManager.setControlValue).toHaveBeenCalledWith('control2', true);
            expect(mockCore.emit).toHaveBeenCalledWith('form:reset');
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            // Add some timers and controls
            formManager.debounceTimers.set('timer1', setTimeout(() => {}, 1000));
            formManager.controls.set('control1', { id: 'control1' });
            formManager.validators.set('validator1', () => {});

            formManager.destroy();

            expect(formManager.debounceTimers.size).toBe(0);
            expect(formManager.controls.size).toBe(0);
            expect(formManager.validators.size).toBe(0);
        });
    });
});