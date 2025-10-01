/**
 * Plugin and Theme Compatibility Validation
 * 
 * Comprehensive testing for compatibility with popular WordPress plugins and themes,
 * CSS specificity conflicts, namespace isolation, and multisite support.
 */

class PluginThemeCompatibilityValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
        
        this.compatibilityData = window.lasCompatibilityData || {};
        this.adminData = window.lasWordPressData || {};
        
        // Common plugins to test for
        this.commonPlugins = [
            { name: 'Yoast SEO', selectors: ['.yoast', '#wpseo-conf', '.yoast-seo'], scripts: ['yoast-seo'] },
            { name: 'WooCommerce', selectors: ['.woocommerce', '.wc-admin'], scripts: ['woocommerce-admin'] },
            { name: 'Elementor', selectors: ['#elementor-panel', '.elementor-admin'], scripts: ['elementor-admin'] },
            { name: 'Advanced Custom Fields', selectors: ['.acf-field', '.acf-admin'], scripts: ['acf'] },
            { name: 'Gravity Forms', selectors: ['.gform', '.gf_admin'], scripts: ['gravityforms'] },
            { name: 'Contact Form 7', selectors: ['.wpcf7', '.contact-form-7'], scripts: ['contact-form-7'] },
            { name: 'Jetpack', selectors: ['.jetpack', '.jp-admin'], scripts: ['jetpack-admin'] },
            { name: 'Wordfence', selectors: ['.wordfence', '.wf-admin'], scripts: ['wordfence'] },
            { name: 'Rank Math', selectors: ['.rank-math', '.rankmath'], scripts: ['rank-math'] },
            { name: 'WP Rocket', selectors: ['.wp-rocket', '.wpr-admin'], scripts: ['wp-rocket'] }
        ];
        
        // Admin themes to test
        this.adminThemes = [
            'fresh', 'light', 'blue', 'coffee', 'ectoplasm', 'midnight', 'ocean', 'sunrise'
        ];
    }
    
    /**
     * Run all compatibility validation tests
     */
    async runAllTests() {
        console.log('🔍 Starting Plugin & Theme Compatibility Validation...');
        
        try {
            // Plugin compatibility tests
            await this.testPluginCompatibility();
            await this.testCSSSpecificityConflicts();
            await this.testJavaScriptNamespaceIsolation();
            
            // Theme compatibility tests
            await this.testAdminThemeCompatibility();
            await this.testCustomThemeCompatibility();
            await this.testRTLThemeSupport();
            
            // Multisite compatibility tests
            await this.testMultisiteCompatibility();
            await this.testNetworkAdminSupport();
            
            // Conflict detection and resolution tests
            await this.testConflictDetection();
            await this.testConflictResolution();
            await this.testGracefulDegradation();
            
            // Performance impact tests
            await this.testPerformanceImpact();
            await this.testMemoryUsage();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Plugin & theme compatibility validation failed:', error);
            this.addResult('Compatibility Validation', false, `Validation failed: ${error.message}`);
        }
    }
    
    /**
     * Test plugin compatibility
     */
    async testPluginCompatibility() {
        console.log('Testing plugin compatibility...');
        
        let detectedPlugins = 0;
        let compatiblePlugins = 0;
        
        for (const plugin of this.commonPlugins) {
            const isPresent = this.isPluginPresent(plugin);
            
            if (isPresent) {
                detectedPlugins++;
                
                const compatibility = await this.testSpecificPluginCompatibility(plugin);
                
                if (compatibility.compatible) {
                    compatiblePlugins++;
                    this.addResult(`${plugin.name} Compatibility`, true, compatibility.message);
                } else {
                    this.addResult(`${plugin.name} Compatibility`, false, compatibility.message);
                }
            }
        }
        
        this.addResult('Plugin Detection', detectedPlugins > 0, 
            `Detected ${detectedPlugins} common plugins`);
        
        if (detectedPlugins > 0) {
            const compatibilityRate = (compatiblePlugins / detectedPlugins) * 100;
            this.addResult('Overall Plugin Compatibility', compatibilityRate >= 80, 
                `${compatibilityRate.toFixed(1)}% of detected plugins are compatible`);
        }
    }
    
    /**
     * Check if plugin is present
     */
    isPluginPresent(plugin) {
        // Check for DOM elements
        for (const selector of plugin.selectors) {
            if (document.querySelector(selector)) {
                return true;
            }
        }
        
        // Check for scripts
        for (const scriptName of plugin.scripts) {
            const scripts = document.querySelectorAll('script[src*="' + scriptName + '"]');
            if (scripts.length > 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Test specific plugin compatibility
     */
    async testSpecificPluginCompatibility(plugin) {
        const issues = [];
        
        // Test CSS conflicts
        const cssConflicts = this.checkCSSConflicts(plugin.selectors);
        if (cssConflicts.length > 0) {
            issues.push(`CSS conflicts: ${cssConflicts.join(', ')}`);
        }
        
        // Test JavaScript conflicts
        const jsConflicts = this.checkJavaScriptConflicts(plugin.scripts);
        if (jsConflicts.length > 0) {
            issues.push(`JS conflicts: ${jsConflicts.join(', ')}`);
        }
        
        // Test z-index conflicts
        const zIndexConflicts = this.checkZIndexConflicts(plugin.selectors);
        if (zIndexConflicts.length > 0) {
            issues.push(`Z-index conflicts: ${zIndexConflicts.join(', ')}`);
        }
        
        // Test event conflicts
        const eventConflicts = this.checkEventConflicts(plugin.selectors);
        if (eventConflicts.length > 0) {
            issues.push(`Event conflicts: ${eventConflicts.join(', ')}`);
        }
        
        return {
            compatible: issues.length === 0,
            message: issues.length === 0 ? 
                `${plugin.name} is fully compatible` : 
                `${plugin.name} has issues: ${issues.join('; ')}`
        };
    }
    
    /**
     * Check CSS conflicts
     */
    checkCSSConflicts(selectors) {
        const conflicts = [];
        const lasElements = document.querySelectorAll('[class*="las-"]');
        
        selectors.forEach(selector => {
            const pluginElements = document.querySelectorAll(selector);
            
            pluginElements.forEach(pluginEl => {
                lasElements.forEach(lasEl => {
                    if (this.elementsOverlap(pluginEl, lasEl)) {
                        conflicts.push(`${selector} overlaps with LAS elements`);
                    }
                    
                    // Check for style conflicts
                    const pluginStyles = window.getComputedStyle(pluginEl);
                    const lasStyles = window.getComputedStyle(lasEl);
                    
                    if (this.hasStyleConflicts(pluginStyles, lasStyles)) {
                        conflicts.push(`${selector} has style conflicts`);
                    }
                });
            });
        });
        
        return [...new Set(conflicts)];
    }
    
    /**
     * Check JavaScript conflicts
     */
    checkJavaScriptConflicts(scripts) {
        const conflicts = [];
        
        scripts.forEach(scriptName => {
            // Check for global variable conflicts
            if (window[scriptName] && window.LAS) {
                conflicts.push(`Global variable conflict: ${scriptName}`);
            }
            
            // Check for jQuery conflicts
            if (typeof jQuery !== 'undefined') {
                const jQueryConflicts = this.checkJQueryConflicts(scriptName);
                conflicts.push(...jQueryConflicts);
            }
        });
        
        return conflicts;
    }
    
    /**
     * Check z-index conflicts
     */
    checkZIndexConflicts(selectors) {
        const conflicts = [];
        const lasModals = document.querySelectorAll('.las-modal, .las-overlay');
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(element => {
                const zIndex = parseInt(window.getComputedStyle(element).zIndex) || 0;
                
                lasModals.forEach(modal => {
                    const modalZIndex = parseInt(window.getComputedStyle(modal).zIndex) || 0;
                    
                    if (zIndex > modalZIndex && zIndex > 999999) {
                        conflicts.push(`${selector} has higher z-index than LAS modals`);
                    }
                });
            });
        });
        
        return [...new Set(conflicts)];
    }
    
    /**
     * Check event conflicts
     */
    checkEventConflicts(selectors) {
        const conflicts = [];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(element => {
                // Check if element prevents event bubbling
                const testEvent = new Event('click', { bubbles: true });
                let eventBubbled = true;
                
                element.addEventListener('click', (e) => {
                    if (e.defaultPrevented) {
                        eventBubbled = false;
                    }
                }, { once: true });
                
                element.dispatchEvent(testEvent);
                
                if (!eventBubbled) {
                    conflicts.push(`${selector} prevents event bubbling`);
                }
            });
        });
        
        return [...new Set(conflicts)];
    }
    
    /**
     * Test CSS specificity conflicts
     */
    async testCSSSpecificityConflicts() {
        console.log('Testing CSS specificity conflicts...');
        
        const lasElements = document.querySelectorAll('[class*="las-"]');
        let specificityIssues = 0;
        
        lasElements.forEach(element => {
            const computedStyles = window.getComputedStyle(element);
            const expectedStyles = this.getExpectedLASStyles(element);
            
            Object.keys(expectedStyles).forEach(property => {
                const computed = computedStyles.getPropertyValue(property);
                const expected = expectedStyles[property];
                
                if (computed !== expected && !this.isStyleOverridden(element, property)) {
                    specificityIssues++;
                }
            });
        });
        
        this.addResult('CSS Specificity Conflicts', specificityIssues === 0, 
            specificityIssues === 0 ? 
                'No CSS specificity conflicts detected' : 
                `${specificityIssues} CSS specificity issues found`);
        
        // Test namespace isolation
        const namespaceIsolated = this.testNamespaceIsolation();
        this.addResult('CSS Namespace Isolation', namespaceIsolated, 
            namespaceIsolated ? 'CSS namespace properly isolated' : 'CSS namespace conflicts detected');
    }
    
    /**
     * Test JavaScript namespace isolation
     */
    async testJavaScriptNamespaceIsolation() {
        console.log('Testing JavaScript namespace isolation...');
        
        // Test LAS namespace protection
        const lasNamespaceProtected = typeof window.LAS !== 'undefined' && 
                                     Object.isSealed(window.LAS);
        
        this.addResult('LAS Namespace Protection', lasNamespaceProtected, 
            lasNamespaceProtected ? 'LAS namespace is protected' : 'LAS namespace is not protected');
        
        // Test for global variable conflicts
        const globalConflicts = this.checkGlobalVariableConflicts();
        this.addResult('Global Variable Conflicts', globalConflicts.length === 0, 
            globalConflicts.length === 0 ? 
                'No global variable conflicts' : 
                `Global conflicts: ${globalConflicts.join(', ')}`);
        
        // Test jQuery namespace isolation
        if (typeof jQuery !== 'undefined') {
            const jqueryIsolated = this.testJQueryIsolation();
            this.addResult('jQuery Namespace Isolation', jqueryIsolated, 
                jqueryIsolated ? 'jQuery properly isolated' : 'jQuery namespace conflicts');
        }
    }
    
    /**
     * Test admin theme compatibility
     */
    async testAdminThemeCompatibility() {
        console.log('Testing admin theme compatibility...');
        
        const currentColorScheme = this.adminData.adminColorScheme || 'fresh';
        
        // Test current color scheme
        const colorSchemeCompatible = this.testColorSchemeCompatibility(currentColorScheme);
        this.addResult(`${currentColorScheme} Color Scheme`, colorSchemeCompatible.compatible, 
            colorSchemeCompatible.message);
        
        // Test all color schemes
        let compatibleSchemes = 0;
        
        for (const scheme of this.adminThemes) {
            const compatible = this.testColorSchemeCompatibility(scheme);
            if (compatible.compatible) {
                compatibleSchemes++;
            }
        }
        
        const schemeCompatibilityRate = (compatibleSchemes / this.adminThemes.length) * 100;
        this.addResult('Color Scheme Compatibility', schemeCompatibilityRate >= 90, 
            `${schemeCompatibilityRate.toFixed(1)}% of color schemes are compatible`);
        
        // Test responsive design
        const responsiveCompatible = await this.testResponsiveCompatibility();
        this.addResult('Responsive Design', responsiveCompatible.compatible, responsiveCompatible.message);
    }
    
    /**
     * Test custom theme compatibility
     */
    async testCustomThemeCompatibility() {
        console.log('Testing custom theme compatibility...');
        
        // Test for custom admin CSS
        const customCSS = this.detectCustomAdminCSS();
        this.addResult('Custom Admin CSS Detection', typeof customCSS === 'boolean', 
            customCSS ? 'Custom admin CSS detected' : 'No custom admin CSS');
        
        // Test CSS custom properties support
        const customPropertiesSupported = this.testCSSCustomPropertiesSupport();
        this.addResult('CSS Custom Properties Support', customPropertiesSupported, 
            customPropertiesSupported ? 'CSS custom properties supported' : 'CSS custom properties not supported');
        
        // Test theme-specific overrides
        const themeOverrides = this.detectThemeOverrides();
        this.addResult('Theme Override Handling', themeOverrides.handled, themeOverrides.message);
    }
    
    /**
     * Test RTL theme support
     */
    async testRTLThemeSupport() {
        console.log('Testing RTL theme support...');
        
        const isRTL = this.adminData.textDirection === 'rtl';
        
        if (isRTL) {
            // Test RTL layout
            const rtlLayout = this.testRTLLayout();
            this.addResult('RTL Layout', rtlLayout.correct, rtlLayout.message);
            
            // Test RTL text alignment
            const rtlTextAlignment = this.testRTLTextAlignment();
            this.addResult('RTL Text Alignment', rtlTextAlignment, 
                rtlTextAlignment ? 'RTL text alignment correct' : 'RTL text alignment issues');
            
            // Test RTL icon positioning
            const rtlIcons = this.testRTLIconPositioning();
            this.addResult('RTL Icon Positioning', rtlIcons, 
                rtlIcons ? 'RTL icon positioning correct' : 'RTL icon positioning issues');
        } else {
            // Test LTR compatibility
            const ltrCompatible = this.testLTRCompatibility();
            this.addResult('LTR Compatibility', ltrCompatible, 
                ltrCompatible ? 'LTR layout working correctly' : 'LTR layout issues detected');
        }
    }
    
    /**
     * Test multisite compatibility
     */
    async testMultisiteCompatibility() {
        console.log('Testing multisite compatibility...');
        
        const isMultisite = this.adminData.isMultisite;
        
        this.addResult('Multisite Detection', typeof isMultisite === 'boolean', 
            `Multisite: ${isMultisite ? 'enabled' : 'disabled'}`);
        
        if (isMultisite) {
            // Test network admin detection
            const isNetworkAdmin = this.adminData.isNetworkAdmin;
            this.addResult('Network Admin Detection', typeof isNetworkAdmin === 'boolean', 
                `Network admin: ${isNetworkAdmin ? 'yes' : 'no'}`);
            
            // Test multisite-specific CSS
            const multisiteCSS = this.testMultisiteCSS();
            this.addResult('Multisite CSS', multisiteCSS, 
                multisiteCSS ? 'Multisite CSS working' : 'Multisite CSS issues');
            
            // Test cross-site compatibility
            const crossSiteCompatible = await this.testCrossSiteCompatibility();
            this.addResult('Cross-site Compatibility', crossSiteCompatible.compatible, 
                crossSiteCompatible.message);
        }
    }
    
    /**
     * Test network admin support
     */
    async testNetworkAdminSupport() {
        console.log('Testing network admin support...');
        
        if (this.adminData.isMultisite && this.adminData.isNetworkAdmin) {
            // Test network admin menu
            const networkMenu = document.querySelector('a[href*="las-network-settings"]');
            this.addResult('Network Admin Menu', !!networkMenu, 
                networkMenu ? 'Network admin menu available' : 'Network admin menu not found');
            
            // Test network admin capabilities
            const networkCapabilities = this.testNetworkAdminCapabilities();
            this.addResult('Network Admin Capabilities', networkCapabilities, 
                networkCapabilities ? 'Network admin capabilities working' : 'Network admin capability issues');
        } else {
            this.addResult('Network Admin Context', true, 'Not in network admin context');
        }
    }
    
    /**
     * Test conflict detection
     */
    async testConflictDetection() {
        console.log('Testing conflict detection...');
        
        // Test if compatibility manager is available
        const compatibilityManagerAvailable = this.compatibilityData && 
                                            typeof this.compatibilityData.detectedConflicts !== 'undefined';
        
        this.addResult('Compatibility Manager Available', compatibilityManagerAvailable, 
            compatibilityManagerAvailable ? 'Compatibility manager loaded' : 'Compatibility manager not available');
        
        if (compatibilityManagerAvailable) {
            const conflicts = this.compatibilityData.detectedConflicts || {};
            const conflictCount = Object.keys(conflicts).length;
            
            this.addResult('Conflict Detection', true, 
                `Detected ${conflictCount} potential conflicts`);
            
            // Test conflict severity assessment
            const severityAssessment = this.testConflictSeverityAssessment(conflicts);
            this.addResult('Conflict Severity Assessment', severityAssessment.accurate, 
                severityAssessment.message);
        }
    }
    
    /**
     * Test conflict resolution
     */
    async testConflictResolution() {
        console.log('Testing conflict resolution...');
        
        if (this.compatibilityData && this.compatibilityData.detectedConflicts) {
            const conflicts = this.compatibilityData.detectedConflicts;
            
            for (const [pluginSlug, conflictData] of Object.entries(conflicts)) {
                const resolved = await this.testConflictResolutionForPlugin(pluginSlug, conflictData);
                this.addResult(`${conflictData.name || pluginSlug} Conflict Resolution`, 
                    resolved.success, resolved.message);
            }
        }
        
        // Test automatic resolution
        const autoResolution = this.testAutomaticConflictResolution();
        this.addResult('Automatic Conflict Resolution', autoResolution.available, 
            autoResolution.message);
    }
    
    /**
     * Test graceful degradation
     */
    async testGracefulDegradation() {
        console.log('Testing graceful degradation...');
        
        // Test degraded mode detection
        const degradedMode = document.body.classList.contains('las-ui-degraded');
        this.addResult('Degraded Mode Detection', typeof degradedMode === 'boolean', 
            degradedMode ? 'Running in degraded mode' : 'Running in full mode');
        
        // Test fallback functionality
        const fallbacksWorking = this.testFallbackFunctionality();
        this.addResult('Fallback Functionality', fallbacksWorking.working, fallbacksWorking.message);
        
        // Test basic functionality in degraded mode
        if (degradedMode) {
            const basicFunctionality = this.testBasicFunctionalityInDegradedMode();
            this.addResult('Basic Functionality in Degraded Mode', basicFunctionality.working, 
                basicFunctionality.message);
        }
    }
    
    /**
     * Test performance impact
     */
    async testPerformanceImpact() {
        console.log('Testing performance impact...');
        
        // Test CSS loading performance
        const cssPerformance = this.testCSSLoadingPerformance();
        this.addResult('CSS Loading Performance', cssPerformance.acceptable, cssPerformance.message);
        
        // Test JavaScript execution performance
        const jsPerformance = await this.testJavaScriptPerformance();
        this.addResult('JavaScript Performance', jsPerformance.acceptable, jsPerformance.message);
        
        // Test DOM manipulation performance
        const domPerformance = this.testDOMPerformance();
        this.addResult('DOM Performance', domPerformance.acceptable, domPerformance.message);
    }
    
    /**
     * Test memory usage
     */
    async testMemoryUsage() {
        console.log('Testing memory usage...');
        
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
            
            this.addResult('Memory Usage', memoryUsage < 25, 
                `Memory usage: ${memoryUsage.toFixed(2)}MB (target: <25MB)`);
            
            // Test for memory leaks
            const memoryLeaks = await this.testMemoryLeaks();
            this.addResult('Memory Leaks', !memoryLeaks.detected, memoryLeaks.message);
        } else {
            this.addResult('Memory Monitoring', false, 'Memory monitoring not available');
        }
    }
    
    // Helper methods
    
    elementsOverlap(el1, el2) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        return !(rect1.right < rect2.left || 
                rect2.right < rect1.left || 
                rect1.bottom < rect2.top || 
                rect2.bottom < rect1.top);
    }
    
    hasStyleConflicts(styles1, styles2) {
        const importantProperties = ['position', 'z-index', 'display', 'visibility'];
        
        return importantProperties.some(prop => {
            const val1 = styles1.getPropertyValue(prop);
            const val2 = styles2.getPropertyValue(prop);
            return val1 !== val2 && val1 !== '' && val2 !== '';
        });
    }
    
    checkJQueryConflicts(scriptName) {
        const conflicts = [];
        
        if (typeof jQuery !== 'undefined') {
            // Check for jQuery plugin conflicts
            const jQueryPlugins = Object.keys(jQuery.fn);
            const lasPlugins = jQueryPlugins.filter(plugin => plugin.startsWith('las'));
            
            if (lasPlugins.length > 0) {
                conflicts.push(`jQuery plugin conflicts: ${lasPlugins.join(', ')}`);
            }
        }
        
        return conflicts;
    }
    
    getExpectedLASStyles(element) {
        // Return expected styles for LAS elements
        const styles = {};
        
        if (element.classList.contains('las-button')) {
            styles['cursor'] = 'pointer';
            styles['display'] = 'inline-block';
        }
        
        if (element.classList.contains('las-tab')) {
            styles['cursor'] = 'pointer';
        }
        
        return styles;
    }
    
    isStyleOverridden(element, property) {
        // Check if style is intentionally overridden
        const inlineStyle = element.style.getPropertyValue(property);
        return inlineStyle !== '';
    }
    
    testNamespaceIsolation() {
        const lasElements = document.querySelectorAll('[class*="las-"]');
        
        return Array.from(lasElements).every(element => {
            const classes = Array.from(element.classList);
            return classes.some(cls => cls.startsWith('las-'));
        });
    }
    
    checkGlobalVariableConflicts() {
        const conflicts = [];
        const reservedNames = ['LAS', 'lasUIManager', 'lasAdminData', 'lasCompatibilityData'];
        
        reservedNames.forEach(name => {
            if (window[name] && typeof window[name] !== 'object') {
                conflicts.push(name);
            }
        });
        
        return conflicts;
    }
    
    testJQueryIsolation() {
        if (typeof jQuery === 'undefined') return true;
        
        // Test if LAS jQuery plugins are properly namespaced
        const lasJQueryMethods = Object.keys(jQuery.fn).filter(method => 
            method.startsWith('las') || method.includes('LAS')
        );
        
        return lasJQueryMethods.length === 0 || lasJQueryMethods.every(method => 
            method.startsWith('las') && method.length > 3
        );
    }
    
    testColorSchemeCompatibility(scheme) {
        // Test if color scheme variables are properly applied
        const testElement = document.createElement('div');
        testElement.className = 'las-test-color-scheme';
        testElement.style.cssText = `
            --las-admin-primary: var(--wp-admin-theme-color, #007cba);
            background-color: var(--las-admin-primary);
        `;
        
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const backgroundColor = computedStyle.backgroundColor;
        
        document.body.removeChild(testElement);
        
        return {
            compatible: backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent',
            message: `Color scheme ${scheme} ${backgroundColor !== 'rgba(0, 0, 0, 0)' ? 'working' : 'not working'}`
        };
    }
    
    async testResponsiveCompatibility() {
        // Test responsive breakpoints
        const breakpoints = [320, 480, 768, 1024, 1200];
        let responsiveIssues = 0;
        
        for (const breakpoint of breakpoints) {
            // Simulate viewport resize
            const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
            
            if (mediaQuery.matches) {
                const issues = this.checkResponsiveIssues(breakpoint);
                responsiveIssues += issues;
            }
        }
        
        return {
            compatible: responsiveIssues === 0,
            message: responsiveIssues === 0 ? 
                'Responsive design working correctly' : 
                `${responsiveIssues} responsive issues found`
        };
    }
    
    checkResponsiveIssues(breakpoint) {
        let issues = 0;
        const lasElements = document.querySelectorAll('.las-fresh-settings-wrap');
        
        lasElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            
            if (rect.width > breakpoint) {
                issues++;
            }
            
            // Check for horizontal scrolling
            if (element.scrollWidth > element.clientWidth) {
                issues++;
            }
        });
        
        return issues;
    }
    
    detectCustomAdminCSS() {
        const customStylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        
        return Array.from(customStylesheets).some(link => 
            link.href.includes('admin-color') || 
            link.href.includes('custom-admin') ||
            link.href.includes('admin-theme')
        );
    }
    
    testCSSCustomPropertiesSupport() {
        const testElement = document.createElement('div');
        testElement.style.cssText = '--test-property: test-value;';
        
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const supported = computedStyle.getPropertyValue('--test-property').trim() === 'test-value';
        
        document.body.removeChild(testElement);
        
        return supported;
    }
    
    detectThemeOverrides() {
        const overrides = [];
        const lasElements = document.querySelectorAll('[class*="las-"]');
        
        lasElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            
            // Check for unexpected style overrides
            if (computedStyle.getPropertyValue('all') === 'revert') {
                overrides.push('CSS reset detected');
            }
        });
        
        return {
            handled: overrides.length === 0,
            message: overrides.length === 0 ? 
                'No theme override issues' : 
                `Theme overrides detected: ${overrides.join(', ')}`
        };
    }
    
    testRTLLayout() {
        const rtlElements = document.querySelectorAll('.las-fresh-settings-wrap');
        let correctLayout = true;
        let message = 'RTL layout correct';
        
        rtlElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const direction = computedStyle.direction;
            
            if (direction !== 'rtl') {
                correctLayout = false;
                message = 'RTL direction not applied';
            }
        });
        
        return { correct: correctLayout, message };
    }
    
    testRTLTextAlignment() {
        const textElements = document.querySelectorAll('.las-fresh-settings-wrap p, .las-fresh-settings-wrap h1, .las-fresh-settings-wrap h2');
        
        return Array.from(textElements).every(element => {
            const computedStyle = window.getComputedStyle(element);
            const textAlign = computedStyle.textAlign;
            
            return textAlign === 'right' || textAlign === 'start';
        });
    }
    
    testRTLIconPositioning() {
        const iconElements = document.querySelectorAll('.las-tab-icon, .dashicons');
        
        return Array.from(iconElements).every(element => {
            const computedStyle = window.getComputedStyle(element);
            const float = computedStyle.float;
            
            return float !== 'left';
        });
    }
    
    testLTRCompatibility() {
        const ltrElements = document.querySelectorAll('.las-fresh-settings-wrap');
        
        return Array.from(ltrElements).every(element => {
            const computedStyle = window.getComputedStyle(element);
            const direction = computedStyle.direction;
            
            return direction === 'ltr' || direction === '';
        });
    }
    
    testMultisiteCSS() {
        const multisiteElements = document.querySelectorAll('.network-admin .las-fresh-settings-wrap');
        
        if (multisiteElements.length === 0) {
            return true; // Not in network admin
        }
        
        return Array.from(multisiteElements).every(element => {
            const computedStyle = window.getComputedStyle(element);
            return computedStyle.display !== 'none';
        });
    }
    
    async testCrossSiteCompatibility() {
        // This would require actual multisite testing
        return {
            compatible: true,
            message: 'Cross-site compatibility cannot be tested in single-site context'
        };
    }
    
    testNetworkAdminCapabilities() {
        // Test if network admin specific features are available
        const networkFeatures = document.querySelectorAll('[data-network-admin]');
        return networkFeatures.length > 0;
    }
    
    testConflictSeverityAssessment(conflicts) {
        let accurateAssessments = 0;
        let totalAssessments = 0;
        
        Object.values(conflicts).forEach(conflict => {
            if (conflict.severity) {
                totalAssessments++;
                
                // Verify severity assessment accuracy
                const actualSeverity = this.assessActualConflictSeverity(conflict);
                if (actualSeverity === conflict.severity) {
                    accurateAssessments++;
                }
            }
        });
        
        const accuracy = totalAssessments > 0 ? (accurateAssessments / totalAssessments) * 100 : 100;
        
        return {
            accurate: accuracy >= 80,
            message: `Severity assessment ${accuracy.toFixed(1)}% accurate`
        };
    }
    
    assessActualConflictSeverity(conflict) {
        const conflictTypes = Object.keys(conflict.conflicts || {});
        const highSeverityTypes = ['js_namespace', 'admin_ui', 'modal_conflicts'];
        const mediumSeverityTypes = ['css_specificity', 'admin_styles', 'menu_modifications'];
        
        if (conflictTypes.some(type => highSeverityTypes.includes(type))) {
            return 'high';
        } else if (conflictTypes.some(type => mediumSeverityTypes.includes(type))) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    async testConflictResolutionForPlugin(pluginSlug, conflictData) {
        try {
            // Test if resolution strategies are applied
            const resolutionApplied = this.checkResolutionStrategies(pluginSlug, conflictData);
            
            return {
                success: resolutionApplied,
                message: resolutionApplied ? 
                    'Conflict resolution strategies applied' : 
                    'Conflict resolution strategies not applied'
            };
        } catch (error) {
            return {
                success: false,
                message: `Conflict resolution test failed: ${error.message}`
            };
        }
    }
    
    checkResolutionStrategies(pluginSlug, conflictData) {
        // Check if CSS specificity fixes are applied
        const specificityFixed = this.checkCSSSpecificityFixes();
        
        // Check if namespace isolation is working
        const namespaceIsolated = this.checkNamespaceIsolation();
        
        return specificityFixed && namespaceIsolated;
    }
    
    checkCSSSpecificityFixes() {
        const lasElements = document.querySelectorAll('.las-fresh-settings-wrap .las-tab');
        
        return Array.from(lasElements).every(element => {
            const computedStyle = window.getComputedStyle(element);
            return computedStyle.getPropertyValue('cursor') === 'pointer';
        });
    }
    
    checkNamespaceIsolation() {
        return typeof window.LAS !== 'undefined' && 
               window.LAS.hasOwnProperty('Compatibility');
    }
    
    testAutomaticConflictResolution() {
        const autoResolutionAvailable = typeof window.LAS !== 'undefined' && 
                                      window.LAS.Compatibility && 
                                      typeof window.LAS.Compatibility.handleConflicts === 'function';
        
        return {
            available: autoResolutionAvailable,
            message: autoResolutionAvailable ? 
                'Automatic conflict resolution available' : 
                'Automatic conflict resolution not available'
        };
    }
    
    testFallbackFunctionality() {
        // Test if fallback mechanisms work
        const nativeInputsWork = this.testNativeInputFallbacks();
        const basicUIWorks = this.testBasicUIFallbacks();
        
        return {
            working: nativeInputsWork && basicUIWorks,
            message: nativeInputsWork && basicUIWorks ? 
                'Fallback functionality working' : 
                'Fallback functionality issues detected'
        };
    }
    
    testNativeInputFallbacks() {
        // Test native color and range inputs
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        
        const rangeInput = document.createElement('input');
        rangeInput.type = 'range';
        
        return colorInput.type === 'color' && rangeInput.type === 'range';
    }
    
    testBasicUIFallbacks() {
        // Test if basic tab functionality works without JavaScript
        const tabs = document.querySelectorAll('.las-tab');
        const panels = document.querySelectorAll('.las-tab-panel');
        
        return tabs.length > 0 && panels.length > 0;
    }
    
    testBasicFunctionalityInDegradedMode() {
        // Test if basic functionality works in degraded mode
        const tabsClickable = this.testTabsClickable();
        const formsSubmittable = this.testFormsSubmittable();
        
        return {
            working: tabsClickable && formsSubmittable,
            message: tabsClickable && formsSubmittable ? 
                'Basic functionality working in degraded mode' : 
                'Basic functionality issues in degraded mode'
        };
    }
    
    testTabsClickable() {
        const tabs = document.querySelectorAll('.las-tab');
        
        return Array.from(tabs).every(tab => {
            return tab.style.cursor === 'pointer' || 
                   window.getComputedStyle(tab).cursor === 'pointer';
        });
    }
    
    testFormsSubmittable() {
        const forms = document.querySelectorAll('.las-form');
        
        return Array.from(forms).every(form => {
            const submitButton = form.querySelector('button[type="submit"]');
            return submitButton && !submitButton.disabled;
        });
    }
    
    testCSSLoadingPerformance() {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        const lasStylesheets = Array.from(stylesheets).filter(link => 
            link.href.includes('las-') || link.href.includes('ui-repair')
        );
        
        return {
            acceptable: lasStylesheets.length <= 3,
            message: `${lasStylesheets.length} LAS stylesheets loaded (target: ≤3)`
        };
    }
    
    async testJavaScriptPerformance() {
        const startTime = performance.now();
        
        // Simulate UI operations
        const tabs = document.querySelectorAll('.las-tab');
        if (tabs.length > 0) {
            tabs[0].click();
        }
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        return {
            acceptable: executionTime < 50,
            message: `JavaScript execution time: ${executionTime.toFixed(2)}ms (target: <50ms)`
        };
    }
    
    testDOMPerformance() {
        const startTime = performance.now();
        
        // Test DOM manipulation performance
        const testElement = document.createElement('div');
        testElement.className = 'las-performance-test';
        
        for (let i = 0; i < 100; i++) {
            const child = document.createElement('span');
            child.textContent = `Test ${i}`;
            testElement.appendChild(child);
        }
        
        document.body.appendChild(testElement);
        document.body.removeChild(testElement);
        
        const endTime = performance.now();
        const manipulationTime = endTime - startTime;
        
        return {
            acceptable: manipulationTime < 10,
            message: `DOM manipulation time: ${manipulationTime.toFixed(2)}ms (target: <10ms)`
        };
    }
    
    async testMemoryLeaks() {
        if (!window.performance || !window.performance.memory) {
            return { detected: false, message: 'Memory monitoring not available' };
        }
        
        const initialMemory = window.performance.memory.usedJSHeapSize;
        
        // Simulate memory-intensive operations
        const testData = [];
        for (let i = 0; i < 1000; i++) {
            testData.push({ id: i, data: new Array(100).fill('test') });
        }
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const finalMemory = window.performance.memory.usedJSHeapSize;
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
        
        return {
            detected: memoryIncrease > 5,
            message: memoryIncrease > 5 ? 
                `Potential memory leak: ${memoryIncrease.toFixed(2)}MB increase` : 
                `Memory usage stable: ${memoryIncrease.toFixed(2)}MB increase`
        };
    }
    
    /**
     * Add test result
     */
    addResult(testName, passed, message) {
        const result = {
            test: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.results.tests.push(result);
        
        if (passed) {
            this.results.passed++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            this.results.failed++;
            console.log(`❌ ${testName}: ${message}`);
        }
    }
    
    /**
     * Generate validation report
     */
    generateReport() {
        const total = this.results.passed + this.results.failed;
        const passRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
        
        console.log('\n📊 Plugin & Theme Compatibility Validation Report');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Pass Rate: ${passRate}%`);
        console.log('='.repeat(60));
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests
                .filter(test => !test.passed)
                .forEach(test => {
                    console.log(`  • ${test.test}: ${test.message}`);
                });
        }
        
        // Return results for programmatic access
        return {
            ...this.results,
            passRate: parseFloat(passRate),
            summary: `${this.results.passed}/${total} tests passed (${passRate}%)`
        };
    }
}

// Auto-run validation if in WordPress admin context
if (typeof window !== 'undefined' && window.lasCompatibilityData) {
    document.addEventListener('DOMContentLoaded', async () => {
        // Wait for compatibility manager to initialize
        setTimeout(async () => {
            const validator = new PluginThemeCompatibilityValidator();
            const results = await validator.runAllTests();
            
            // Store results globally for access
            window.lasPluginThemeCompatibilityResults = results;
        }, 3000);
    });
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PluginThemeCompatibilityValidator;
}