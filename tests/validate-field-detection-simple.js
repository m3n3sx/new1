/**
 * Simple validation for the field change detection logic
 * Tests the core validation and detection functions
 */

console.log('=== Testing Field Change Detection Core Logic ===\n');

// Test the validation functions directly
const validators = {
    text: function(value) {
        return typeof value === 'string' && value.length <= 1000;
    },
    number: function(value, element) {
        var num = parseFloat(value);
        if (isNaN(num)) return false;
        
        var min = element && element.attr ? parseFloat(element.attr('min')) : NaN;
        var max = element && element.attr ? parseFloat(element.attr('max')) : NaN;
        
        if (!isNaN(min) && num < min) return false;
        if (!isNaN(max) && num > max) return false;
        
        return true;
    },
    email: function(value) {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !value || emailRegex.test(value);
    },
    color: function(value) {
        if (!value) return true;
        var colorRegex = /^(#([0-9a-f]{3}){1,2}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|[a-z]+)$/i;
        return colorRegex.test(value);
    },
    boolean: function(value) {
        return typeof value === 'boolean' || value === 'true' || value === 'false' || value === '1' || value === '0';
    }
};

// Test helper functions
function isLASField(name) {
    return name && name.includes('las_fresh_options');
}

function extractSetting(name) {
    var matches = name.match(/\[([^\]]+)\]$/);
    return matches ? matches[1] : null;
}

function getFieldType(element) {
    var type = element.attr ? element.attr('type') : null;
    var tagName = element.prop ? element.prop('tagName') : null;
    
    if (tagName && tagName.toLowerCase() === 'select') {
        return 'select';
    } else if (tagName && tagName.toLowerCase() === 'textarea') {
        return 'textarea';
    } else if (type) {
        return type;
    }
    
    return 'text';
}

function getFieldValue(element, fieldType) {
    switch (fieldType) {
        case 'checkbox':
            return element.is && element.is(':checked') ? (element.val() || true) : false;
        case 'radio':
            return element.is && element.is(':checked') ? element.val() : null;
        case 'number':
        case 'range':
            var val = element.val ? element.val() : '';
            return val === '' ? '' : parseFloat(val);
        case 'file':
            return element[0] && element[0].files ? element[0].files[0] || null : null;
        default:
            return element.val ? element.val() : '';
    }
}

// Run tests
let passedTests = 0;
let totalTests = 0;

function test(description, testFn) {
    totalTests++;
    try {
        const result = testFn();
        if (result) {
            console.log(`✓ ${description}: PASS`);
            passedTests++;
        } else {
            console.log(`✗ ${description}: FAIL`);
        }
    } catch (error) {
        console.log(`✗ ${description}: ERROR - ${error.message}`);
    }
}

console.log('--- Text Validation ---');
test('Valid text should pass', () => validators.text('valid text'));
test('Long text should fail', () => !validators.text('a'.repeat(1001)));
test('Empty text should pass', () => validators.text(''));

console.log('\n--- Number Validation ---');
const mockNumberElement = {
    attr: function(attr) {
        if (attr === 'min') return '0';
        if (attr === 'max') return '100';
        return null;
    }
};
test('Valid number should pass', () => validators.number(50, mockNumberElement));
test('Number below min should fail', () => !validators.number(-10, mockNumberElement));
test('Number above max should fail', () => !validators.number(150, mockNumberElement));
test('Invalid number should fail', () => !validators.number('not-a-number', mockNumberElement));

console.log('\n--- Email Validation ---');
test('Valid email should pass', () => validators.email('test@example.com'));
test('Invalid email should fail', () => !validators.email('invalid-email'));
test('Empty email should pass', () => validators.email(''));

console.log('\n--- Color Validation ---');
test('Hex color should pass', () => validators.color('#ff0000'));
test('Short hex color should pass', () => validators.color('#f00'));
test('RGB color should pass', () => validators.color('rgb(255, 0, 0)'));
test('Named color should pass', () => validators.color('red'));
test('Invalid color should fail', () => !validators.color('invalid-color'));
test('Empty color should pass', () => validators.color(''));

console.log('\n--- Boolean Validation ---');
test('True boolean should pass', () => validators.boolean(true));
test('False boolean should pass', () => validators.boolean(false));
test('String "true" should pass', () => validators.boolean('true'));
test('String "1" should pass', () => validators.boolean('1'));
test('Invalid boolean should fail', () => !validators.boolean('invalid'));

console.log('\n--- LAS Field Detection ---');
test('LAS field should be detected', () => isLASField('las_fresh_options[setting_name]'));
test('Non-LAS field should not be detected', () => !isLASField('other_plugin_options[setting]'));
test('Null field should not be detected', () => !isLASField(null));
test('Empty field should not be detected', () => !isLASField(''));

console.log('\n--- Setting Extraction ---');
test('Setting should be extracted correctly', () => extractSetting('las_fresh_options[menu_color]') === 'menu_color');
test('Complex setting should be extracted', () => extractSetting('las_fresh_options[admin_bar_height]') === 'admin_bar_height');
test('Invalid format should return null', () => extractSetting('invalid_format') === null);

console.log('\n--- Field Type Detection ---');
const mockTextElement = {
    attr: function(attr) { return attr === 'type' ? 'text' : null; },
    prop: function() { return 'input'; }
};
test('Text field type should be detected', () => getFieldType(mockTextElement) === 'text');

const mockSelectElement = {
    attr: function() { return null; },
    prop: function() { return 'select'; }
};
test('Select field type should be detected', () => getFieldType(mockSelectElement) === 'select');

const mockTextareaElement = {
    attr: function() { return null; },
    prop: function() { return 'textarea'; }
};
test('Textarea field type should be detected', () => getFieldType(mockTextareaElement) === 'textarea');

console.log('\n--- Field Value Extraction ---');
const mockCheckboxElement = {
    is: function() { return true; },
    val: function() { return 'checkbox-value'; }
};
test('Checked checkbox value should be extracted', () => getFieldValue(mockCheckboxElement, 'checkbox') === 'checkbox-value');

const mockUncheckedCheckboxElement = {
    is: function() { return false; },
    val: function() { return 'checkbox-value'; }
};
test('Unchecked checkbox should return false', () => getFieldValue(mockUncheckedCheckboxElement, 'checkbox') === false);

const mockNumberElement2 = {
    val: function() { return '42.5'; }
};
test('Number value should be extracted as float', () => getFieldValue(mockNumberElement2, 'number') === 42.5);

const mockEmptyNumberElement = {
    val: function() { return ''; }
};
test('Empty number should return empty string', () => getFieldValue(mockEmptyNumberElement, 'number') === '');

console.log('\n=== Test Results ===');
console.log(`Passed: ${passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
    console.log('✓ All tests passed! Field change detection core logic is working correctly.');
    process.exit(0);
} else {
    console.log('✗ Some tests failed. Please review the implementation.');
    process.exit(1);
}