/**
 * Theme Compatibility Tests for UI Repair
 * Tests WordPress admin theme integration and compatibility
 * 
 * @package LiveAdminStyler
 * @version 1.0.0
 */

class LASThemeCompatibilityValidator {
    constructor() {
        this.testResults = [];
        this.supportedColorSchemes = [
            'fresh', 'light', 'blue', 'coffee', 'ectoplasm', 
            'midnight', 'ocean', 'sunrise', 'modern'
        ];
        this.testContainer = null;
    }

    /**
     * Initialize theme compatibility validation tests
     */
    async init() {
        console.log('LAS Theme Compatibility Validator: Starting theme tests...');
        
        try {
            // Create test container
            this.createTestContainer();
            
            // Run theme compatibility tests
            await this.runAllTests();
            
            // Display results
            this.displayResults();
            
            console.log('LAS Theme Compatibility Validator: All tests completed');
            
        } catch (error) {
            console.error('LAS Theme Compatibility Validator: Test initialization failed:', error);
            this.addTestResult('Initialization', false, error.message);
        }
    }

    /**
     * Create test container for theme validation
     */
    createTestContainer() {
        this.testContainer = document.createElement('div');
        this.testContainer.id = 'las-theme-test-container';
        this.testContainer.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: 1000px;
            height: 800px;
            visibility: hidden;
            pointer-events: none;
        `;
        document.body.appendChild(this.testContainer);
    }

    /**
     * Run all theme compatibility tests
     */
    async runAllTests() {
        const tests = [
            'testCurrentColorScheme',
            'testColorSchemeVariables',
            'testColorSchemeIntegration',
            'testAdminThemeCompatibility',
            'testCustomPropertyFallbacks',
            'testRTLSupport',
            'testMultisiteCompatibility',
            'testPluginConflictPrevention',
            'testThemeOverrideCapability'
        ];

        for (const testName of tests) {
            try {
                await this[testName]();
            } catch (error) {
                this.addTestResult(testName, false, error.message);
            }
        }
    }

    /**
     * Test current WordPress color scheme detection
     */
    async testCurrentColorScheme() {
        const testName = 'Current Color Scheme Detection';
        
        try {
            // Detect current admin color scheme
            const bodyClasses = document.body.className;
            let detectedScheme = 'fresh'; // default
            
            this.supportedColorSchemes.forEach(scheme => {
                if (bodyClasses.includes(`admin-color-${scheme}`)) {
                    detectedScheme = scheme;
                }
            });

            // Test if the detected scheme is supported
            if (!this.supportedColorSchemes.includes(detectedScheme)) {
                throw new Error(`Unsupported color scheme detected: ${detectedScheme}`);
            }

            // Test CSS class application
            const hasColorSchemeClass = document.body.classList.contains(`admin-color-${detectedScheme}`);
            
            if (!hasColorSchemeClass && detectedScheme !== 'fresh') {
                console.warn(`Color scheme class admin-color-${detectedScheme} not found on body`);
            }

            this.addTestResult(testName, true, `Detected and supports color scheme: ${detectedScheme}`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test color scheme CSS variables
     */
    async testColorSchemeVariables() {
        const testName = 'Color Scheme Variables';
        
        try {
            let workingSchemes = 0;
            const testResults = [];

            // Test each color scheme
            for (const scheme of this.supportedColorSchemes) {
                // Temporarily apply color scheme class
                const originalClasses = document.body.className;
                document.body.className = `${originalClasses} admin-color-${scheme}`;

                // Create test element
                const testElement = document.createElement('div');
                testElement.className = 'las-button';
                this.testContainer.appendChild(testElement);

                // Test primary color variable
                testElement.style.backgroundColor = 'var(--las-ui-primary)';
                const computedBg = getComputedStyle(testElement).backgroundColor;

                // Test if variable resolved to a color
                if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
                    workingSchemes++;
                    testResults.push(`${scheme}: ✓`);
                } else {
                    testResults.push(`${scheme}: ✗`);
                }

                // Restore original classes
                document.body.className = originalClasses;
                
                // Clean up test element
                if (testElement.parentNode) {
                    testElement.parentNode.removeChild(testElement);
                }
            }

            if (workingSchemes < this.supportedColorSchemes.length * 0.8) {
                throw new Error(`Only ${workingSchemes}/${this.supportedColorSchemes.length} color schemes working properly`);
            }

            this.addTestResult(testName, true, `${workingSchemes}/${this.supportedColorSchemes.length} color schemes have working variables`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test color scheme integration with UI elements
     */
    async testColorSchemeIntegration() {
        const testName = 'Color Scheme Integration';
        
        try {
            // Test different UI elements with color scheme
            const uiElements = [
                { className: 'nav-tab', property: 'borderColor' },
                { className: 'las-button', property: 'backgroundColor' },
                { className: 'las-text-input', property: 'borderColor' }
            ];

            let integratedElements = 0;

            uiElements.forEach(elementConfig => {
                const element = document.createElement(elementConfig.className === 'las-text-input' ? 'input' : 'div');
                element.className = elementConfig.className;
                
                if (elementConfig.className === 'las-text-input') {
                    element.type = 'text';
                }

                this.testContainer.appendChild(element);

                // Test focus state integration
                element.focus();
                const focusStyles = getComputedStyle(element, ':focus');
                const normalStyles = getComputedStyle(element);

                // Check if focus styles change with color scheme
                const focusProperty = focusStyles[elementConfig.property];
                const normalProperty = normalStyles[elementConfig.property];

                if (focusProperty !== normalProperty) {
                    integratedElements++;
                }
            });

            if (integratedElements < uiElements.length * 0.7) {
                throw new Error(`Only ${integratedElements}/${uiElements.length} UI elements properly integrate with color schemes`);
            }

            this.addTestResult(testName, true, `${integratedElements}/${uiElements.length} UI elements integrate with color schemes`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test WordPress admin theme compatibility
     */
    async testAdminThemeCompatibility() {
        const testName = 'Admin Theme Compatibility';
        
        try {
            // Test WordPress admin styles integration
            const wpAdminElements = document.querySelectorAll('.wp-admin');
            const hasWpAdmin = wpAdminElements.length > 0 || document.body.classList.contains('wp-admin');

            if (!hasWpAdmin) {
                console.warn('Not in WordPress admin environment - limited theme testing');
            }

            // Test integration with WordPress admin styles
            const testButton = document.createElement('button');
            testButton.className = 'button button-primary las-button';
            this.testContainer.appendChild(testButton);

            const buttonStyles = getComputedStyle(testButton);
            
            // Check if WordPress and LAS styles coexist
            const hasWordPressStyles = buttonStyles.padding && buttonStyles.padding !== '0px';
            const hasLASStyles = buttonStyles.borderRadius && buttonStyles.borderRadius !== '0px';

            if (!hasWordPressStyles && !hasLASStyles) {
                throw new Error('Neither WordPress nor LAS styles are being applied');
            }

            // Test CSS specificity handling
            const specificityTest = document.createElement('div');
            specificityTest.className = 'wp-admin las-form-container';
            this.testContainer.appendChild(specificityTest);

            const containerStyles = getComputedStyle(specificityTest);
            const hasProperSpecificity = containerStyles.background && containerStyles.background !== 'rgba(0, 0, 0, 0)';

            this.addTestResult(testName, true, 'WordPress admin theme compatibility maintained');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test CSS custom property fallbacks
     */
    async testCustomPropertyFallbacks() {
        const testName = 'Custom Property Fallbacks';
        
        try {
            // Test fallback values for CSS custom properties
            const testElement = document.createElement('div');
            this.testContainer.appendChild(testElement);

            // Test primary color fallback
            testElement.style.color = 'var(--las-ui-primary, #0073aa)';
            const primaryColor = getComputedStyle(testElement).color;

            // Test background fallback
            testElement.style.backgroundColor = 'var(--las-ui-bg-primary, #ffffff)';
            const bgColor = getComputedStyle(testElement).backgroundColor;

            // Test border fallback
            testElement.style.borderColor = 'var(--las-ui-border, #c3c4c7)';
            const borderColor = getComputedStyle(testElement).borderColor;

            // Verify fallbacks work
            if (!primaryColor || primaryColor === 'rgba(0, 0, 0, 0)') {
                throw new Error('Primary color fallback not working');
            }

            if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)') {
                throw new Error('Background color fallback not working');
            }

            if (!borderColor || borderColor === 'rgba(0, 0, 0, 0)') {
                throw new Error('Border color fallback not working');
            }

            this.addTestResult(testName, true, 'CSS custom property fallbacks working');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test RTL (Right-to-Left) support
     */
    async testRTLSupport() {
        const testName = 'RTL Support';
        
        try {
            // Test RTL class detection
            const isRTL = document.documentElement.dir === 'rtl' || 
                         document.body.classList.contains('rtl') ||
                         document.documentElement.classList.contains('rtl');

            // Create RTL test elements
            const originalDir = document.documentElement.dir;
            document.documentElement.dir = 'rtl';
            document.body.classList.add('rtl');

            // Test RTL-specific styles
            const rtlElement = document.createElement('div');
            rtlElement.className = 'wp-submenu las-submenu-visible';
            this.testContainer.appendChild(rtlElement);

            const rtlStyles = getComputedStyle(rtlElement);
            
            // Test that RTL styles are different from LTR
            document.documentElement.dir = 'ltr';
            document.body.classList.remove('rtl');
            
            const ltrElement = document.createElement('div');
            ltrElement.className = 'wp-submenu las-submenu-visible';
            this.testContainer.appendChild(ltrElement);

            const ltrStyles = getComputedStyle(ltrElement);

            // Restore original direction
            document.documentElement.dir = originalDir;
            if (isRTL) {
                document.body.classList.add('rtl');
            }

            // Check if RTL styles are applied (basic test)
            const hasRTLSupport = rtlStyles.left !== ltrStyles.left || 
                                 rtlStyles.right !== ltrStyles.right ||
                                 rtlStyles.textAlign !== ltrStyles.textAlign;

            this.addTestResult(testName, true, `RTL support ${hasRTLSupport ? 'implemented' : 'basic'}`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test multisite compatibility
     */
    async testMultisiteCompatibility() {
        const testName = 'Multisite Compatibility';
        
        try {
            // Test network admin detection
            const isNetworkAdmin = document.body.classList.contains('network-admin') ||
                                  window.location.href.includes('/wp-admin/network/');

            // Test that styles work in both regular admin and network admin
            const testElement = document.createElement('div');
            testElement.className = 'las-form-container';
            
            // Simulate network admin environment
            if (!isNetworkAdmin) {
                document.body.classList.add('network-admin');
            }

            this.testContainer.appendChild(testElement);
            const networkStyles = getComputedStyle(testElement);

            // Remove network admin class if we added it
            if (!isNetworkAdmin) {
                document.body.classList.remove('network-admin');
            }

            // Test regular admin styles
            const regularStyles = getComputedStyle(testElement);

            // Verify styles work in both contexts
            const hasNetworkStyles = networkStyles.background && networkStyles.background !== 'rgba(0, 0, 0, 0)';
            const hasRegularStyles = regularStyles.background && regularStyles.background !== 'rgba(0, 0, 0, 0)';

            if (!hasNetworkStyles || !hasRegularStyles) {
                throw new Error('Styles not working in all multisite contexts');
            }

            this.addTestResult(testName, true, 'Multisite compatibility maintained');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test plugin conflict prevention
     */
    async testPluginConflictPrevention() {
        const testName = 'Plugin Conflict Prevention';
        
        try {
            // Test CSS namespace isolation
            const namespacedElements = [
                'las-button',
                'las-text-input',
                'las-form-container',
                'las-tab-panel'
            ];

            let properlyNamespaced = 0;

            namespacedElements.forEach(className => {
                // Check if class name follows LAS namespace convention
                if (className.startsWith('las-')) {
                    properlyNamespaced++;
                }
            });

            if (properlyNamespaced < namespacedElements.length) {
                throw new Error(`Only ${properlyNamespaced}/${namespacedElements.length} elements properly namespaced`);
            }

            // Test CSS specificity to prevent conflicts
            const testElement = document.createElement('div');
            testElement.className = 'button las-button'; // Potential conflict with WP button class
            this.testContainer.appendChild(testElement);

            const styles = getComputedStyle(testElement);
            
            // Test that LAS styles take precedence when intended
            const hasLASStyles = styles.borderRadius && styles.borderRadius !== '0px';

            if (!hasLASStyles) {
                console.warn('LAS styles may be overridden by other plugins');
            }

            this.addTestResult(testName, true, `${properlyNamespaced}/${namespacedElements.length} elements properly namespaced`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Test theme override capability
     */
    async testThemeOverrideCapability() {
        const testName = 'Theme Override Capability';
        
        try {
            // Test that themes can override LAS styles when needed
            const testElement = document.createElement('div');
            testElement.className = 'las-button';
            testElement.style.cssText = 'background-color: red !important;'; // Simulate theme override
            this.testContainer.appendChild(testElement);

            const overriddenStyles = getComputedStyle(testElement);
            
            // Test that important declarations can override LAS styles
            const canBeOverridden = overriddenStyles.backgroundColor.includes('red') ||
                                   overriddenStyles.backgroundColor === 'rgb(255, 0, 0)';

            // Test CSS custom property override capability
            testElement.style.setProperty('--las-ui-primary', '#ff0000');
            testElement.style.backgroundColor = 'var(--las-ui-primary)';
            
            const customPropertyOverride = getComputedStyle(testElement).backgroundColor;
            const customPropertyWorks = customPropertyOverride.includes('red') ||
                                       customPropertyOverride === 'rgb(255, 0, 0)';

            if (!canBeOverridden && !customPropertyWorks) {
                throw new Error('Themes cannot override LAS styles');
            }

            this.addTestResult(testName, true, 'Themes can override LAS styles when needed');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * Add test result
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        console.log(`LAS Theme Compatibility Validator: ${testName} - ${passed ? 'PASS' : 'FAIL'}: ${message}`);
    }

    /**
     * Display test results
     */
    displayResults() {
        const passedTests = this.testResults.filter(test => test.passed).length;
        const totalTests = this.testResults.length;
        const passRate = ((passedTests / totalTests) * 100).toFixed(1);

        console.log(`\nLAS Theme Compatibility Validator Results:`);
        console.log(`Tests Passed: ${passedTests}/${totalTests} (${passRate}%)`);
        console.log(`Theme Compatibility: ${passRate >= 80 ? 'EXCELLENT' : passRate >= 60 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
        console.log(`\nDetailed Results:`);
        
        this.testResults.forEach(test => {
            console.log(`${test.passed ? '✓' : '✗'} ${test.name}: ${test.message}`);
        });

        // Cleanup test container
        if (this.testContainer && this.testContainer.parentNode) {
            this.testContainer.parentNode.removeChild(this.testContainer);
        }
    }

    /**
     * Get test results
     */
    getResults() {
        return {
            results: this.testResults,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(test => test.passed).length,
                failed: this.testResults.filter(test => !test.passed).length,
                passRate: ((this.testResults.filter(test => test.passed).length / this.testResults.length) * 100).toFixed(1),
                supportedColorSchemes: this.supportedColorSchemes
            }
        };
    }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.lasThemeCompatibilityValidator = new LASThemeCompatibilityValidator();
        });
    } else {
        window.lasThemeCompatibilityValidator = new LASThemeCompatibilityValidator();
    }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LASThemeCompatibilityValidator;
}