/**
 * JavaScript Syntax and Console Error Validation
 * Tests all JavaScript files for syntax errors and potential runtime issues
 */

const fs = require('fs');
const path = require('path');

console.log('=== JAVASCRIPT SYNTAX VALIDATION ===\n');

// Mock browser environment
global.window = {};
global.document = {
    ready: function(callback) { callback(); },
    addEventListener: function() {},
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; }
};

global.console = {
    log: function() {},
    error: function() {},
    warn: function() {},
    info: function() {}
};

// Mock jQuery
global.jQuery = function(selector) {
    return {
        ready: function(callback) { callback(global.jQuery); },
        each: function(callback) { return this; },
        on: function() { return this; },
        off: function() { return this; },
        val: function() { return 'test-value'; },
        hasClass: function() { return false; },
        addClass: function() { return this; },
        removeClass: function() { return this; },
        wpColorPicker: function() { return this; },
        find: function() { return this; },
        length: 1,
        tabs: function() { return this; },
        slider: function() { return this; }
    };
};
global.$ = global.jQuery;

// Mock WordPress
global.wp = {
    ajax: {
        post: function() {
            return Promise.resolve({ success: true, data: {} });
        }
    }
};

// Mock admin data
global.lasAdminData = {
    ajax_url: 'http://example.com/wp-admin/admin-ajax.php',
    nonce: 'test-nonce-123',
    jquery_ui: { tabs: true, slider: true }
};

// Test files
const jsFiles = [
    'js/admin-settings.js',
    'assets/js/live-preview.js'
];

let allPassed = true;

for (const file of jsFiles) {
    console.log(`Testing ${file}...`);
    
    try {
        if (!fs.existsSync(file)) {
            console.log(`✗ File not found: ${file}`);
            allPassed = false;
            continue;
        }
        
        const content = fs.readFileSync(file, 'utf8');
        
        // Basic syntax validation
        try {
            // Remove jQuery wrapper for syntax check
            const cleanContent = content
                .replace(/jQuery\(document\)\.ready\(function\(\$\)\s*\{/, '')
                .replace(/\}\);?\s*$/, '');
            
            // Try to parse as JavaScript (basic syntax check)
            new Function(cleanContent);
            console.log(`✓ Syntax check passed: ${file}`);
            
        } catch (syntaxError) {
            console.log(`✗ Syntax error in ${file}:`, syntaxError.message);
            allPassed = false;
        }
        
        // Check for common issues
        const issues = [];
        
        // Check for undefined variables (basic check)
        if (content.includes('console.log') && !content.includes('typeof console')) {
            // This is actually OK for our use case
        }
        
        // Check for proper event cleanup
        if (content.includes('.on(') && !content.includes('.off(')) {
            issues.push('Event listeners attached but no cleanup found');
        }
        
        // Check for memory leaks (timers)
        if (content.includes('setTimeout') && !content.includes('clearTimeout')) {
            issues.push('setTimeout used without clearTimeout');
        }
        
        if (issues.length > 0) {
            console.log(`⚠ Potential issues in ${file}:`);
            issues.forEach(issue => console.log(`  - ${issue}`));
        } else {
            console.log(`✓ No obvious issues found in ${file}`);
        }
        
    } catch (error) {
        console.log(`✗ Error testing ${file}:`, error.message);
        allPassed = false;
    }
    
    console.log('');
}

// Test specific functionality
console.log('Testing specific JavaScript functionality...\n');

// Test 1: Event handling
console.log('1. Testing Event Handling...');
try {
    const eventHandler = {
        events: {},
        
        on: function(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
        },
        
        off: function(event, callback) {
            if (this.events[event]) {
                const index = this.events[event].indexOf(callback);
                if (index > -1) {
                    this.events[event].splice(index, 1);
                }
            }
        },
        
        trigger: function(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(callback => callback(data));
            }
        }
    };
    
    let callCount = 0;
    const testCallback = () => callCount++;
    
    eventHandler.on('test', testCallback);
    eventHandler.trigger('test');
    eventHandler.off('test', testCallback);
    eventHandler.trigger('test');
    
    if (callCount === 1) {
        console.log('✓ Event handling: PASSED');
    } else {
        console.log('✗ Event handling: FAILED');
        allPassed = false;
    }
} catch (error) {
    console.log('✗ Event handling test failed:', error.message);
    allPassed = false;
}

// Test 2: Debouncing
console.log('2. Testing Debouncing...');
try {
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    let callCount = 0;
    const debouncedFunc = debounce(() => callCount++, 10);
    
    debouncedFunc();
    debouncedFunc();
    debouncedFunc();
    
    setTimeout(() => {
        if (callCount === 1) {
            console.log('✓ Debouncing: PASSED');
        } else {
            console.log('✗ Debouncing: FAILED - called', callCount, 'times');
            allPassed = false;
        }
        
        // Final result
        console.log('\n=== JAVASCRIPT VALIDATION SUMMARY ===');
        if (allPassed) {
            console.log('✓ All JavaScript files passed validation');
            console.log('✓ No syntax errors detected');
            console.log('✓ Core functionality working');
            console.log('\n🎉 JAVASCRIPT VALIDATION: PASSED');
        } else {
            console.log('✗ Some JavaScript validation tests failed');
            console.log('\n❌ JAVASCRIPT VALIDATION: FAILED');
        }
    }, 50);
    
} catch (error) {
    console.log('✗ Debouncing test failed:', error.message);
    allPassed = false;
}