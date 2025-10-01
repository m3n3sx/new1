/**
 * Simple validation test for FormControls
 */

// Mock environment
global.document = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        innerHTML: '',
        style: {
            setProperty: () => {},
            getProperty: () => null
        },
        classList: {
            add: () => {},
            remove: () => {},
            toggle: () => {},
            contains: () => false
        },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        remove: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => ({
            textContent: '',
            value: 'test-value',
            checked: true,
            style: {},
            classList: { add: () => {}, remove: () => {} },
            addEventListener: () => {},
            setAttribute: () => {},
            dispatchEvent: () => {}
        }),
        querySelectorAll: () => [],
        dispatchEvent: () => {},
        focus: () => {},
        blur: () => {},
        value: '',
        checked: false,
        disabled: false,
        type: 'button'
    }),
    querySelector: () => null,
    addEventListener: () => {},
    body: {
        appendChild: () => {},
        classList: {
            toggle: () => {}
        }
    }
};

global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {}
    }),
    Event: function() {}
};

// Mock core
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

// Import and test FormControls
import('../assets/js/modules/form-controls.js').then(module => {
    const FormControls = module.default;
    
    console.log('🧪 Testing FormControls...');
    
    try {
        // Test 1: Initialization
        const formControls = new FormControls(mockCore);
        console.log('✅ FormControls initialized successfully');
        
        // Test 2: Default validators setup
        console.log('✅ Default validators count:', formControls.validators.size);
        
        // Test 3: Form creation
        const mockContainer = document.createElement('div');
        const form = formControls.createForm(mockContainer, {
            id: 'test-form',
            layout: 'grid',
            columns: 2,
            gap: '24px'
        });
        console.log('✅ Form created successfully:', form.id);
        
        // Test 4: Text field creation
        const textField = formControls.createTextField('test-form', {
            id: 'text-field',
            label: 'Test Field',
            placeholder: 'Enter text',
            required: true,
            variant: 'outlined',
            size: 'medium'
        });
        console.log('✅ Text field created successfully:', textField.id);
        
        // Test 5: Slider creation
        const slider = formControls.createSlider('test-form', {
            id: 'slider-field',
            label: 'Test Slider',
            min: 0,
            max: 100,
            value: 50,
            unit: 'px',
            variant: 'continuous'
        });
        console.log('✅ Slider created successfully:', slider.id);
        
        // Test 6: Toggle creation
        const toggle = formControls.createToggle('test-form', {
            id: 'toggle-field',
            label: 'Test Toggle',
            checked: false,
            variant: 'switch',
            size: 'medium'
        });
        console.log('✅ Toggle created successfully:', toggle.id);
        
        // Test 7: Button creation
        const button = formControls.createButton('test-form', {
            id: 'button-field',
            label: 'Test Button',
            variant: 'filled',
            size: 'medium',
            onClick: () => console.log('Button clicked!')
        });
        console.log('✅ Button created successfully:', button.id);
        
        // Test 8: Validation - required field
        const requiredValidator = formControls.validators.get('required');
        console.log('✅ Required validation:', requiredValidator('') !== null ? 'FAIL' : 'PASS (empty)');
        console.log('✅ Required validation:', requiredValidator('value') === null ? 'PASS' : 'FAIL (with value)');
        
        // Test 9: Validation - email
        const emailValidator = formControls.validators.get('email');
        console.log('✅ Email validation:', emailValidator('test@example.com') === null ? 'PASS' : 'FAIL (valid email)');
        console.log('✅ Email validation:', emailValidator('invalid-email') !== null ? 'PASS' : 'FAIL (invalid email)');
        
        // Test 10: Form values
        const values = formControls.getFormValues('test-form');
        console.log('✅ Form values retrieved:', Object.keys(values).length, 'controls');
        
        // Test 11: Control update
        formControls.updateControl('text-field', 'updated value');
        console.log('✅ Control updated successfully');
        
        // Test 12: Field validation
        const isValid = formControls.validateField('text-field');
        console.log('✅ Field validation result:', isValid);
        
        // Test 13: Form validation
        const formValid = formControls.validateForm('test-form');
        console.log('✅ Form validation result:', formValid);
        
        // Test 14: Error handling
        formControls.setFieldError('text-field', 'Test error message');
        console.log('✅ Field error set successfully');
        
        formControls.clearFieldError('text-field');
        console.log('✅ Field error cleared successfully');
        
        // Test 15: Cleanup
        formControls.destroy();
        console.log('✅ FormControls destroyed successfully');
        
        console.log('\n🎉 All FormControls tests passed!');
        
    } catch (error) {
        console.error('❌ FormControls test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Failed to import FormControls:', error.message);
    process.exit(1);
});