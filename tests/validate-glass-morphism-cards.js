/**
 * Glass Morphism Cards Validation Script
 * Validates the implementation of glass morphism card components
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateGlassMorphismCards() {
    log('\n🔍 Validating Glass Morphism Card Components...', 'blue');
    
    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };
    
    function test(name, condition, errorMessage = '') {
        const passed = condition;
        results.tests.push({ name, passed, errorMessage });
        
        if (passed) {
            results.passed++;
            log(`  ✅ ${name}`, 'green');
        } else {
            results.failed++;
            log(`  ❌ ${name}`, 'red');
            if (errorMessage) {
                log(`     ${errorMessage}`, 'yellow');
            }
        }
    }
    
    function warn(name, message) {
        results.warnings++;
        results.tests.push({ name, passed: false, warning: true, errorMessage: message });
        log(`  ⚠️  ${name}`, 'yellow');
        log(`     ${message}`, 'yellow');
    }
    
    // Test 1: Check if admin-style.css exists
    const cssPath = path.join(__dirname, '..', 'assets', 'css', 'admin-style.css');
    test(
        'CSS file exists',
        fs.existsSync(cssPath),
        'admin-style.css file not found'
    );
    
    if (!fs.existsSync(cssPath)) {
        log('\n❌ Cannot continue validation without CSS file', 'red');
        return results;
    }
    
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Test 2: Check for glass morphism design tokens
    test(
        'Glass morphism design tokens defined',
        cssContent.includes('--las-glass-bg:') && 
        cssContent.includes('--las-glass-border:') && 
        cssContent.includes('--las-glass-blur:'),
        'Missing glass morphism CSS custom properties'
    );
    
    // Test 3: Check for base card component
    test(
        'Base card component (.las-card) defined',
        cssContent.includes('.las-card {') && 
        cssContent.includes('backdrop-filter:') &&
        cssContent.includes('-webkit-backdrop-filter:'),
        'Base card component missing or incomplete'
    );
    
    // Test 4: Check for card variants
    const cardVariants = [
        'las-card--elevated',
        'las-card--flat',
        'las-card--interactive',
        'las-card--feature',
        'las-card--settings',
        'las-card--compact'
    ];
    
    cardVariants.forEach(variant => {
        test(
            `Card variant (.${variant}) defined`,
            cssContent.includes(`.${variant}`),
            `Missing ${variant} card variant`
        );
    });
    
    // Test 5: Check for card structural elements
    const cardElements = [
        'las-card__header',
        'las-card__title',
        'las-card__subtitle',
        'las-card__body',
        'las-card__footer',
        'las-card__actions'
    ];
    
    cardElements.forEach(element => {
        test(
            `Card element (.${element}) defined`,
            cssContent.includes(`.${element}`),
            `Missing ${element} card element`
        );
    });
    
    // Test 6: Check for hover animations
    test(
        'Hover animations implemented',
        cssContent.includes('.las-card:hover') && 
        cssContent.includes('transform:') &&
        cssContent.includes('translateY('),
        'Missing hover animations with transform effects'
    );
    
    // Test 7: Check for performance optimizations
    test(
        'Performance optimizations present',
        cssContent.includes('will-change:') && 
        cssContent.includes('contain:') &&
        cssContent.includes('backface-visibility:'),
        'Missing performance optimization properties'
    );
    
    // Test 8: Check for fallback support
    test(
        'Fallback support for backdrop-filter',
        cssContent.includes('@supports not (backdrop-filter:') &&
        cssContent.includes('background: var(--las-neutral-50)'),
        'Missing fallback support for browsers without backdrop-filter'
    );
    
    // Test 9: Check for dark theme support
    test(
        'Dark theme support implemented',
        cssContent.includes('[data-theme="dark"]') &&
        cssContent.includes('--las-glass-bg: rgba(38, 38, 38, 0.8)'),
        'Missing dark theme support for glass morphism'
    );
    
    // Test 10: Check for reduced motion support
    test(
        'Reduced motion accessibility support',
        cssContent.includes('@media (prefers-reduced-motion: reduce)') &&
        cssContent.includes('transform: none !important'),
        'Missing reduced motion accessibility support'
    );
    
    // Test 11: Check for mobile optimizations
    test(
        'Mobile responsive optimizations',
        cssContent.includes('@media (max-width: 767px)') &&
        cssContent.includes('padding: var(--las-space-md)'),
        'Missing mobile responsive optimizations'
    );
    
    // Test 12: Check for transition properties
    test(
        'Smooth transitions implemented',
        cssContent.includes('transition: all var(--las-transition-base)') ||
        cssContent.includes('transition: all var(--las-transition-fast)'),
        'Missing smooth transition properties'
    );
    
    // Test 13: Check for proper CSS organization
    test(
        'CSS properly organized with comments',
        cssContent.includes('CARD COMPONENTS (Glass Morphism)') &&
        cssContent.includes('Card Variants for Different Content Types'),
        'Missing proper CSS organization and comments'
    );
    
    // Test 14: Check demo file exists
    const demoPath = path.join(__dirname, 'glass-morphism-cards-demo.html');
    test(
        'Demo HTML file exists',
        fs.existsSync(demoPath),
        'Demo HTML file not found'
    );
    
    // Test 15: Check test file exists
    const testPath = path.join(__dirname, 'js', 'test-glass-morphism-cards.js');
    test(
        'Test file exists',
        fs.existsSync(testPath),
        'Test file not found'
    );
    
    // Performance and quality checks
    const cardCount = (cssContent.match(/\.las-card/g) || []).length;
    test(
        'Sufficient card component coverage',
        cardCount >= 20,
        `Only ${cardCount} card-related CSS rules found, expected at least 20`
    );
    
    // Check for CSS custom properties usage
    const customPropsCount = (cssContent.match(/var\(--las-/g) || []).length;
    test(
        'Extensive use of CSS custom properties',
        customPropsCount >= 50,
        `Only ${customPropsCount} CSS custom property usages found`
    );
    
    // Check for animation performance
    test(
        'GPU-accelerated animations',
        (cssContent.includes('transform: translateZ(0)') || cssContent.includes('transform: translate3d(0, 0, 0)')) &&
        cssContent.includes('perspective: 1000px'),
        'Missing GPU acceleration hints for animations'
    );
    
    // Warnings for best practices
    if (!cssContent.includes('contain: layout style paint')) {
        warn('CSS Containment', 'Consider using CSS containment for better performance');
    }
    
    if (!cssContent.includes('translate3d')) {
        warn('3D Transforms', 'Consider using translate3d for better hardware acceleration');
    }
    
    if (cssContent.includes('box-shadow') && !cssContent.includes('will-change')) {
        warn('Will-change Property', 'Consider using will-change for elements with box-shadow animations');
    }
    
    return results;
}

// Run validation
const results = validateGlassMorphismCards();

// Print summary
log('\n📊 Validation Summary:', 'bold');
log(`✅ Passed: ${results.passed}`, 'green');
log(`❌ Failed: ${results.failed}`, 'red');
log(`⚠️  Warnings: ${results.warnings}`, 'yellow');

const totalTests = results.passed + results.failed;
const successRate = totalTests > 0 ? Math.round((results.passed / totalTests) * 100) : 0;

log(`\n📈 Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

if (results.failed > 0) {
    log('\n🔧 Failed Tests:', 'red');
    results.tests
        .filter(test => !test.passed && !test.warning)
        .forEach(test => {
            log(`  • ${test.name}: ${test.errorMessage}`, 'red');
        });
}

if (results.warnings > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    results.tests
        .filter(test => test.warning)
        .forEach(test => {
            log(`  • ${test.name}: ${test.errorMessage}`, 'yellow');
        });
}

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);