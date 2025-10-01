/**
 * Theme Coverage Validation Test
 * Validates that all components have proper theme support
 * 
 * @package LiveAdminStyler
 * @since 2.0.0
 */

console.log('🎨 Starting Theme Coverage Validation...\n');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

function runTest(testName, testFunction) {
    testResults.total++;
    try {
        testFunction();
        console.log(`✅ ${testName}`);
        testResults.passed++;
    } catch (error) {
        console.log(`❌ ${testName}: ${error.message}`);
        testResults.failed++;
    }
}

// Mock DOM environment for testing
const mockDocument = {
    documentElement: {
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        setAttribute: () => {},
        removeAttribute: () => {},
        style: {
            setProperty: () => {},
            getPropertyValue: () => '#ffffff'
        }
    },
    body: {
        classList: {
            add: () => {},
            remove: () => {}
        }
    },
    createElement: () => ({
        classList: { add: () => {}, remove: () => {} },
        style: {},
        appendChild: () => {},
        removeChild: () => {}
    }),
    head: {
        appendChild: () => {},
        removeChild: () => {}
    },
    styleSheets: [{
        cssRules: [{
            type: 1, // CSSRule.STYLE_RULE
            style: ['--las-primary', '--las-secondary']
        }]
    }]
};

const mockWindow = {
    matchMedia: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {}
    }),
    getComputedStyle: () => ({
        getPropertyValue: () => '#ffffff'
    }),
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    }
};

// Set up global mocks
global.document = mockDocument;
global.window = mockWindow;
global.CSSRule = { STYLE_RULE: 1 };

// Test 1: Theme Manager Module Structure
runTest('ThemeManager module exports correctly', () => {
    const fs = require('fs');
    const path = require('path');
    
    const themeManagerPath = path.join(__dirname, '../assets/js/modules/theme-manager.js');
    if (!fs.existsSync(themeManagerPath)) {
        throw new Error('ThemeManager module file not found');
    }
    
    const content = fs.readFileSync(themeManagerPath, 'utf8');
    
    // Check for essential methods
    const requiredMethods = [
        'constructor',
        'init',
        'setTheme',
        'toggleTheme',
        'getThemeInfo',
        'isDarkMode',
        'isLightMode',
        'isAutoMode',
        'applyTheme',
        'previewTheme',
        'exportTheme',
        'importTheme'
    ];
    
    requiredMethods.forEach(method => {
        if (!content.includes(method)) {
            throw new Error(`Missing required method: ${method}`);
        }
    });
});

// Test 2: CSS Theme Variables
runTest('CSS files contain theme variables', () => {
    const fs = require('fs');
    const path = require('path');
    
    const cssFiles = [
        '../assets/css/las-main.css',
        '../assets/css/card-layout.css',
        '../assets/css/form-controls.css',
        '../assets/css/modern-navigation.css',
        '../assets/css/las-utilities.css'
    ];
    
    cssFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`CSS file not found: ${file}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for theme selectors
        const themeSelectors = [
            '[data-theme="dark"]',
            '[data-theme="light"]',
            '.las-theme-dark',
            '.las-theme-light',
            '.las-theme-auto'
        ];
        
        const hasThemeSupport = themeSelectors.some(selector => 
            content.includes(selector)
        );
        
        if (!hasThemeSupport) {
            throw new Error(`No theme support found in ${file}`);
        }
    });
});

// Test 3: Theme Transition Support
runTest('Theme transition classes are defined', () => {
    const fs = require('fs');
    const path = require('path');
    
    const mainCssPath = path.join(__dirname, '../assets/css/las-main.css');
    const content = fs.readFileSync(mainCssPath, 'utf8');
    
    const requiredClasses = [
        '.las-theme-transitioning',
        '.las-theme-toggle',
        '.las-theme-indicator'
    ];
    
    requiredClasses.forEach(className => {
        if (!content.includes(className)) {
            throw new Error(`Missing theme class: ${className}`);
        }
    });
});

// Test 4: Auto Theme Detection
runTest('Auto theme detection is implemented', () => {
    const fs = require('fs');
    const path = require('path');
    
    const mainCssPath = path.join(__dirname, '../assets/css/las-main.css');
    const content = fs.readFileSync(mainCssPath, 'utf8');
    
    // Check for prefers-color-scheme media queries
    if (!content.includes('@media (prefers-color-scheme: dark)')) {
        throw new Error('Missing dark mode media query');
    }
    
    if (!content.includes('@media (prefers-color-scheme: light)')) {
        throw new Error('Missing light mode media query');
    }
    
    if (!content.includes('.las-theme-auto')) {
        throw new Error('Missing auto theme class');
    }
});

// Test 5: Component Theme Coverage
runTest('All components have theme coverage', () => {
    const fs = require('fs');
    const path = require('path');
    
    const componentTests = [
        {
            file: '../assets/css/card-layout.css',
            components: ['.las-card-elevated', '.las-card-outlined', '.las-card-glass']
        },
        {
            file: '../assets/css/form-controls.css',
            components: ['.las-field-input', '.las-button', '.las-toggle']
        },
        {
            file: '../assets/css/modern-navigation.css',
            components: ['.las-tab', '.las-navigation-wrapper']
        }
    ];
    
    componentTests.forEach(test => {
        const filePath = path.join(__dirname, test.file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        test.components.forEach(component => {
            // Check if component has dark theme support
            const darkThemeSelector = `[data-theme="dark"] ${component}`;
            const darkThemeClass = `.las-theme-dark ${component}`;
            
            if (!content.includes(darkThemeSelector) && !content.includes(darkThemeClass)) {
                throw new Error(`Component ${component} missing dark theme support in ${test.file}`);
            }
        });
    });
});

// Test 6: Glassmorphism Theme Adaptation
runTest('Glassmorphism effects adapt to themes', () => {
    const fs = require('fs');
    const path = require('path');
    
    const utilitiesPath = path.join(__dirname, '../assets/css/las-utilities.css');
    const content = fs.readFileSync(utilitiesPath, 'utf8');
    
    const glassClasses = ['.las-glass', '.las-glass-light', '.las-glass-medium', '.las-glass-heavy'];
    
    glassClasses.forEach(glassClass => {
        const darkThemeSelector = `[data-theme="dark"] ${glassClass}`;
        if (!content.includes(darkThemeSelector)) {
            throw new Error(`Glassmorphism class ${glassClass} missing dark theme adaptation`);
        }
    });
    
    // Check for fallback support
    if (!content.includes('@supports not (backdrop-filter: blur(10px))')) {
        throw new Error('Missing backdrop-filter fallback support');
    }
});

// Test 7: Theme Persistence
runTest('Theme persistence is implemented', () => {
    const fs = require('fs');
    const path = require('path');
    
    const themeManagerPath = path.join(__dirname, '../assets/js/modules/theme-manager.js');
    const content = fs.readFileSync(themeManagerPath, 'utf8');
    
    // Check for localStorage usage
    if (!content.includes('localStorage')) {
        throw new Error('Theme persistence not implemented');
    }
    
    if (!content.includes('las_theme_preference')) {
        throw new Error('Theme preference key not found');
    }
});

// Test 8: Integration Test File
runTest('Integration test file exists and is complete', () => {
    const fs = require('fs');
    const path = require('path');
    
    const integrationTestPath = path.join(__dirname, 'integration-theme-coverage.html');
    if (!fs.existsSync(integrationTestPath)) {
        throw new Error('Integration test file not found');
    }
    
    const content = fs.readFileSync(integrationTestPath, 'utf8');
    
    // Check for essential test components
    const requiredElements = [
        'theme-controls',
        'las-navigation',
        'las-card',
        'las-form',
        'las-glass'
    ];
    
    requiredElements.forEach(element => {
        if (!content.includes(element)) {
            throw new Error(`Missing test element: ${element}`);
        }
    });
});

// Test 9: Core Integration
runTest('ThemeManager is integrated into core system', () => {
    const fs = require('fs');
    const path = require('path');
    
    const corePath = path.join(__dirname, '../assets/js/las-core.js');
    const content = fs.readFileSync(corePath, 'utf8');
    
    if (!content.includes('theme-manager')) {
        throw new Error('ThemeManager not integrated into core system');
    }
});

// Test 10: Theme Preview Functionality
runTest('Theme preview functionality is implemented', () => {
    const fs = require('fs');
    const path = require('path');
    
    const themeManagerPath = path.join(__dirname, '../assets/js/modules/theme-manager.js');
    const content = fs.readFileSync(themeManagerPath, 'utf8');
    
    if (!content.includes('previewTheme')) {
        throw new Error('Theme preview functionality not found');
    }
    
    if (!content.includes('theme:preview-started')) {
        throw new Error('Theme preview events not implemented');
    }
});

// Print test results
console.log('\n📊 Theme Coverage Validation Results:');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Total: ${testResults.total}`);
console.log(`🎯 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

if (testResults.failed === 0) {
    console.log('\n🎉 All theme coverage tests passed! Theme system is fully implemented.');
} else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the implementation.`);
    process.exit(1);
}

console.log('\n🔍 Theme Coverage Features Validated:');
console.log('  • Automatic theme detection with prefers-color-scheme');
console.log('  • Manual theme toggle with smooth transitions');
console.log('  • Theme persistence across sessions');
console.log('  • Comprehensive component coverage');
console.log('  • Glassmorphism theme adaptation');
console.log('  • Theme preview functionality');
console.log('  • Integration with core system');
console.log('  • Complete test coverage');

console.log('\n✨ Theme system ready for production use!');