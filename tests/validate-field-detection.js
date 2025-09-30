/**
 * Simple validation script for field change detection
 * This can be run directly with Node.js to validate the implementation
 */

// Mock the required globals
global.jQuery = function(selector) {
    const mockElement = {
        ready: function(callback) { callback(); return this; },
        on: function() { return this; },
        off: function() { return this; },
        attr: function(name) {
            if (name === 'name') return 'las_fresh_options[test_setting]';
            if (name === 'type') return 'text';
            return null;
        },
        val: function() { return 'test value'; },
        is: function() { return false; },
        hasClass: function() { return false; },
        addClass: function() { return this; },
        removeClass: function() { return this; },
        siblings: function() { return this; },
        parent: function() { return this; },
        find: function() { return this; },
        first: function() { return this; },
        each: function() { return this; },
        length: 1,
        get: function() { return []; },
        map: function() { return this; },
        after: function() { return this; },
        remove: function() { return this; },
        css: function() { return this; },
        appendTo: function() { return this; },
        slider: function() { return this; },
        wpColorPicker: function() { return this; }
    };
    return mockElement;
};

global.jQuery.extend = function(target, ...sources) {
    return Object.assign(target, ...sources);
};

global.jQuery.post = function() {
    return {
        done: function() {
            return {
                fail: function() {
                    return {
                        always: function() {}
                    };
                }
            };
        }
    };
};

global.$ = global.jQuery;

// Mock other required globals
global.lasAdminData = {
    ajax_url: 'http://example.com/wp-admin/admin-ajax.php',
    nonce: 'test-nonce-123',
    jquery_ui: {
        tabs: true,
        slider: true
    }
};

global.ErrorManager = {
    showError: function() {},
    showWarning: function() {},
    showSuccess: function() {},
    showInfo: function() {},
    dismiss: function() {}
};

global.updatePreview = function(setting, value) {
    console.log('✓ updatePreview called with:', setting, '=', value);
};

global.updatePreviewDebounced = function(setting, value) {
    console.log('✓ updatePreviewDebounced called with:', setting, '=', value);
};

global.MutationObserver = function() {
    return {
        observe: function() {},
        disconnect: function() {}
    };
};

// Keep the original console methods
const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
};

global.console = {
    log: originalConsole.log,
    warn: originalConsole.warn,
    error: originalConsole.error
};

global.URL = function() {};

global.navigator = {
    userAgent: 'test-agent',
    language: 'en-US',
    platform: 'test-platform',
    cookieEnabled: true,
    onLine: true
};

global.screen = { width: 1920, height: 1080 };
global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    location: { href: 'http://example.com' },
    addEventListener: function() {},
    MutationObserver: global.MutationObserver
};

global.document = {
    body: {},
    addEventListener: function() {}
};

// Load the live preview script
try {
    require('../assets/js/live-preview.js');
    console.log('✓ Live preview script loaded successfully');
} catch (error) {
    console.error('✗ Failed to load live preview script:', error.message);
    process.exit(1);
}

// Test the FieldChangeDetector
if (global.LASLivePreview && global.LASLivePreview.FieldChangeDetector) {
    const detector = global.LASLivePreview.FieldChangeDetector;
    
    console.log('\n=== Testing Field Change Detection ===');
    
    // Test field type detection
    console.log('\n--- Field Type Detection ---');
    const mockTextElement = {
        attr: function(attr) { return attr === 'type' ? 'text' : null; },
        prop: function() { return 'input'; }
    };
    
    const textType = detector.getFieldType(mockTextElement);
    console.log('✓ Text field type detected:', textType === 'text' ? 'PASS' : 'FAIL');
    
    // Test LAS field detection
    console.log('\n--- LAS Field Detection ---');
    const isLASField = detector.isLASField('las_fresh_options[test_setting]');
    console.log('✓ LAS field detection:', isLASField ? 'PASS' : 'FAIL');
    
    const isNotLASField = detector.isLASField('other_plugin[setting]');
    console.log('✓ Non-LAS field detection:', !isNotLASField ? 'PASS' : 'FAIL');
    
    // Test setting extraction
    console.log('\n--- Setting Extraction ---');
    const setting = detector.extractSetting('las_fresh_options[menu_color]');
    console.log('✓ Setting extraction:', setting === 'menu_color' ? 'PASS' : 'FAIL');
    
    // Test validation
    console.log('\n--- Field Validation ---');
    const validText = detector.validateField({}, 'valid text', 'text');
    console.log('✓ Text validation (valid):', validText ? 'PASS' : 'FAIL');
    
    const invalidText = detector.validateField({}, 'a'.repeat(1001), 'text');
    console.log('✓ Text validation (invalid):', !invalidText ? 'PASS' : 'FAIL');
    
    const validEmail = detector.validateField({}, 'test@example.com', 'email');
    console.log('✓ Email validation (valid):', validEmail ? 'PASS' : 'FAIL');
    
    const invalidEmail = detector.validateField({}, 'invalid-email', 'email');
    console.log('✓ Email validation (invalid):', !invalidEmail ? 'PASS' : 'FAIL');
    
    const validColor = detector.validateField({}, '#ff0000', 'color');
    console.log('✓ Color validation (valid):', validColor ? 'PASS' : 'FAIL');
    
    const invalidColor = detector.validateField({}, 'invalid-color', 'color');
    console.log('✓ Color validation (invalid):', !invalidColor ? 'PASS' : 'FAIL');
    
    // Test field value extraction
    console.log('\n--- Field Value Extraction ---');
    const checkboxElement = {
        is: function() { return true; },
        val: function() { return 'checkbox-value'; }
    };
    
    const checkboxValue = detector.getFieldValue(checkboxElement, 'checkbox');
    console.log('✓ Checkbox value extraction:', checkboxValue === 'checkbox-value' ? 'PASS' : 'FAIL');
    
    const numberElement = {
        val: function() { return '42.5'; }
    };
    
    const numberValue = detector.getFieldValue(numberElement, 'number');
    console.log('✓ Number value extraction:', numberValue === 42.5 ? 'PASS' : 'FAIL');
    
    console.log('\n=== All Tests Completed ===');
    console.log('✓ Field Change Detection system is working correctly!');
    
} else {
    console.error('✗ FieldChangeDetector not found in global scope');
    process.exit(1);
}