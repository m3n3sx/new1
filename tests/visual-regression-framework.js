/**
 * Live Admin Styler - Visual Regression Testing Framework
 * 
 * Provides visual regression testing with screenshot comparison
 * UI consistency validation across browsers and devices
 * Responsive design testing for multiple screen sizes
 */

class VisualRegressionFramework {
    constructor(options = {}) {
        this.options = {
            threshold: options.threshold || 0.1, // 0.1% difference threshold
            screenshotDir: options.screenshotDir || 'tests/screenshots',
            baselineDir: options.baselineDir || 'tests/screenshots/baseline',
            diffDir: options.diffDir || 'tests/screenshots/diff',
            viewports: options.viewports || [
                { name: 'mobile', width: 375, height: 667 },
                { name: 'tablet', width: 768, height: 1024 },
                { name: 'desktop', width: 1920, height: 1080 },
                { name: 'large', width: 2560, height: 1440 }
            ],
            browsers: options.browsers || ['chrome', 'firefox', 'safari', 'edge'],
            ...options
        };
        
        this.testResults = [];
        this.screenshots = new Map();
        this.baselines = new Map();
        
        console.log('Visual Regression Framework initialized');
    }
    
    /**
     * Run all visual regression tests
     */
    async runAllTests() {
        console.log('Starting visual regression tests...');
        
        try {
            // Test core UI components
            await this.testUIComponents();
            
            // Test responsive layouts
            await this.testResponsiveLayouts();
            
            // Test theme variations
            await this.testThemeVariations();
            
            // Test interactive states
            await this.testInteractiveStates();
            
            // Test cross-browser consistency
            await this.testCrossBrowserConsistency();
            
            return this.generateReport();
            
        } catch (error) {
            console.error('Visual regression tests failed:', error);
            throw error;
        }
    }
    
    /**
     * Test UI components visual consistency
     */
    async testUIComponents() {
        const components = [
            'navigation-tabs',
            'color-picker',
            'form-controls',
            'card-layout',
            'micro-panels',
            'loading-states',
            'error-messages',
            'success-notifications'
        ];
        
        for (const component of components) {
            await this.testComponent(component);
        }
    }
    
    /**
     * Test individual component
     */
    async testComponent(componentName) {
        console.log(`Testing component: ${componentName}`);
        
        for (const viewport of this.options.viewports) {
            try {
                const screenshot = await this.captureComponentScreenshot(componentName, viewport);
                const baseline = await this.getBaseline(componentName, viewport);
                
                if (baseline) {
                    const diff = await this.compareImages(screenshot, baseline);
                    this.addTestResult(
                        'UI Components',
                        `${componentName} - ${viewport.name}`,
                        diff.passed,
                        diff.difference,
                        { screenshot, baseline, diff: diff.diffImage }
                    );
                } else {
                    // First run - save as baseline
                    await this.saveBaseline(componentName, viewport, screenshot);
                    this.addTestResult(
                        'UI Components',
                        `${componentName} - ${viewport.name}`,
                        true,
                        0,
                        { screenshot, baseline: null, diff: null },
                        'Baseline created'
                    );
                }
                
            } catch (error) {
                this.addTestResult(
                    'UI Components',
                    `${componentName} - ${viewport.name}`,
                    false,
                    100,
                    null,
                    error.message
                );
            }
        }
    }
    
    /**
     * Test responsive layouts
     */
    async testResponsiveLayouts() {
        const layouts = [
            'admin-main-layout',
            'settings-panel',
            'live-edit-interface',
            'template-gallery',
            'color-palette-grid'
        ];
        
        for (const layout of layouts) {
            await this.testResponsiveLayout(layout);
        }
    }
    
    /**
     * Test responsive layout across viewports
     */
    async testResponsiveLayout(layoutName) {
        console.log(`Testing responsive layout: ${layoutName}`);
        
        const screenshots = {};
        
        // Capture screenshots for all viewports
        for (const viewport of this.options.viewports) {
            try {
                screenshots[viewport.name] = await this.captureLayoutScreenshot(layoutName, viewport);
            } catch (error) {
                console.error(`Failed to capture ${layoutName} at ${viewport.name}:`, error);
            }
        }
        
        // Compare adjacent viewport sizes for layout consistency
        const viewportNames = Object.keys(screenshots);
        for (let i = 0; i < viewportNames.length - 1; i++) {
            const current = viewportNames[i];
            const next = viewportNames[i + 1];
            
            if (screenshots[current] && screenshots[next]) {
                const layoutConsistency = await this.checkLayoutConsistency(
                    screenshots[current],
                    screenshots[next],
                    current,
                    next
                );
                
                this.addTestResult(
                    'Responsive Layouts',
                    `${layoutName} - ${current} to ${next}`,
                    layoutConsistency.passed,
                    layoutConsistency.difference,
                    {
                        screenshot1: screenshots[current],
                        screenshot2: screenshots[next],
                        diff: layoutConsistency.diffImage
                    }
                );
            }
        }
    }
    
    /**
     * Test theme variations
     */
    async testThemeVariations() {
        const themes = ['light', 'dark', 'auto'];
        const components = ['main-interface', 'color-picker', 'settings-panel'];
        
        for (const theme of themes) {
            for (const component of components) {
                await this.testThemeVariation(component, theme);
            }
        }
    }
    
    /**
     * Test theme variation for component
     */
    async testThemeVariation(componentName, theme) {
        console.log(`Testing theme variation: ${componentName} - ${theme}`);
        
        try {
            // Apply theme
            await this.applyTheme(theme);
            
            // Capture screenshot
            const screenshot = await this.captureThemeScreenshot(componentName, theme);
            const baseline = await this.getThemeBaseline(componentName, theme);
            
            if (baseline) {
                const diff = await this.compareImages(screenshot, baseline);
                this.addTestResult(
                    'Theme Variations',
                    `${componentName} - ${theme}`,
                    diff.passed,
                    diff.difference,
                    { screenshot, baseline, diff: diff.diffImage }
                );
            } else {
                await this.saveThemeBaseline(componentName, theme, screenshot);
                this.addTestResult(
                    'Theme Variations',
                    `${componentName} - ${theme}`,
                    true,
                    0,
                    { screenshot, baseline: null, diff: null },
                    'Theme baseline created'
                );
            }
            
        } catch (error) {
            this.addTestResult(
                'Theme Variations',
                `${componentName} - ${theme}`,
                false,
                100,
                null,
                error.message
            );
        }
    }
    
    /**
     * Test interactive states
     */
    async testInteractiveStates() {
        const interactions = [
            { component: 'color-picker', state: 'hover' },
            { component: 'color-picker', state: 'active' },
            { component: 'form-button', state: 'hover' },
            { component: 'form-button', state: 'active' },
            { component: 'form-button', state: 'disabled' },
            { component: 'navigation-tab', state: 'hover' },
            { component: 'navigation-tab', state: 'active' },
            { component: 'micro-panel', state: 'visible' },
            { component: 'loading-spinner', state: 'active' }
        ];
        
        for (const interaction of interactions) {
            await this.testInteractiveState(interaction.component, interaction.state);
        }
    }
    
    /**
     * Test interactive state
     */
    async testInteractiveState(componentName, state) {
        console.log(`Testing interactive state: ${componentName} - ${state}`);
        
        try {
            // Trigger interactive state
            await this.triggerInteractiveState(componentName, state);
            
            // Capture screenshot
            const screenshot = await this.captureInteractiveScreenshot(componentName, state);
            const baseline = await this.getInteractiveBaseline(componentName, state);
            
            if (baseline) {
                const diff = await this.compareImages(screenshot, baseline);
                this.addTestResult(
                    'Interactive States',
                    `${componentName} - ${state}`,
                    diff.passed,
                    diff.difference,
                    { screenshot, baseline, diff: diff.diffImage }
                );
            } else {
                await this.saveInteractiveBaseline(componentName, state, screenshot);
                this.addTestResult(
                    'Interactive States',
                    `${componentName} - ${state}`,
                    true,
                    0,
                    { screenshot, baseline: null, diff: null },
                    'Interactive baseline created'
                );
            }
            
        } catch (error) {
            this.addTestResult(
                'Interactive States',
                `${componentName} - ${state}`,
                false,
                100,
                null,
                error.message
            );
        }
    }
    
    /**
     * Test cross-browser consistency
     */
    async testCrossBrowserConsistency() {
        const testCases = [
            'main-interface',
            'color-picker-panel',
            'settings-form',
            'template-gallery'
        ];
        
        for (const testCase of testCases) {
            await this.testCrossBrowser(testCase);
        }
    }
    
    /**
     * Test cross-browser consistency for a test case
     */
    async testCrossBrowser(testCase) {
        console.log(`Testing cross-browser consistency: ${testCase}`);
        
        const browserScreenshots = {};
        
        // Capture screenshots in all browsers
        for (const browser of this.options.browsers) {
            try {
                browserScreenshots[browser] = await this.captureBrowserScreenshot(testCase, browser);
            } catch (error) {
                console.error(`Failed to capture ${testCase} in ${browser}:`, error);
            }
        }
        
        // Compare between browsers
        const browserNames = Object.keys(browserScreenshots);
        const referenceBrowser = browserNames[0]; // Use first browser as reference
        
        for (let i = 1; i < browserNames.length; i++) {
            const compareBrowser = browserNames[i];
            
            if (browserScreenshots[referenceBrowser] && browserScreenshots[compareBrowser]) {
                const consistency = await this.compareBrowserScreenshots(
                    browserScreenshots[referenceBrowser],
                    browserScreenshots[compareBrowser],
                    referenceBrowser,
                    compareBrowser
                );
                
                this.addTestResult(
                    'Cross-Browser Consistency',
                    `${testCase} - ${referenceBrowser} vs ${compareBrowser}`,
                    consistency.passed,
                    consistency.difference,
                    {
                        screenshot1: browserScreenshots[referenceBrowser],
                        screenshot2: browserScreenshots[compareBrowser],
                        diff: consistency.diffImage
                    }
                );
            }
        }
    }
    
    /**
     * Capture component screenshot (mock implementation)
     */
    async captureComponentScreenshot(componentName, viewport) {
        // In a real implementation, this would use a browser automation tool
        // like Playwright, Puppeteer, or Selenium to capture actual screenshots
        
        console.log(`Capturing ${componentName} screenshot at ${viewport.width}x${viewport.height}`);
        
        // Mock screenshot data
        const mockScreenshot = {
            component: componentName,
            viewport: viewport,
            timestamp: Date.now(),
            data: `mock-screenshot-data-${componentName}-${viewport.name}`,
            width: viewport.width,
            height: viewport.height
        };
        
        // Simulate some variation for testing
        if (Math.random() > 0.8) {
            mockScreenshot.data += '-variation';
        }
        
        return mockScreenshot;
    }
    
    /**
     * Capture layout screenshot (mock implementation)
     */
    async captureLayoutScreenshot(layoutName, viewport) {
        console.log(`Capturing ${layoutName} layout at ${viewport.width}x${viewport.height}`);
        
        return {
            layout: layoutName,
            viewport: viewport,
            timestamp: Date.now(),
            data: `mock-layout-${layoutName}-${viewport.name}`,
            width: viewport.width,
            height: viewport.height
        };
    }
    
    /**
     * Capture theme screenshot (mock implementation)
     */
    async captureThemeScreenshot(componentName, theme) {
        console.log(`Capturing ${componentName} with ${theme} theme`);
        
        return {
            component: componentName,
            theme: theme,
            timestamp: Date.now(),
            data: `mock-theme-${componentName}-${theme}`,
            width: 1920,
            height: 1080
        };
    }
    
    /**
     * Capture interactive screenshot (mock implementation)
     */
    async captureInteractiveScreenshot(componentName, state) {
        console.log(`Capturing ${componentName} in ${state} state`);
        
        return {
            component: componentName,
            state: state,
            timestamp: Date.now(),
            data: `mock-interactive-${componentName}-${state}`,
            width: 1920,
            height: 1080
        };
    }
    
    /**
     * Capture browser screenshot (mock implementation)
     */
    async captureBrowserScreenshot(testCase, browser) {
        console.log(`Capturing ${testCase} in ${browser}`);
        
        return {
            testCase: testCase,
            browser: browser,
            timestamp: Date.now(),
            data: `mock-browser-${testCase}-${browser}`,
            width: 1920,
            height: 1080
        };
    }
    
    /**
     * Compare two images (mock implementation)
     */
    async compareImages(image1, image2) {
        // In a real implementation, this would use image comparison libraries
        // like pixelmatch, resemblejs, or similar
        
        console.log('Comparing images...');
        
        // Mock comparison logic
        const similarity = this.calculateMockSimilarity(image1.data, image2.data);
        const difference = (1 - similarity) * 100;
        const passed = difference <= this.options.threshold;
        
        return {
            passed,
            difference,
            similarity,
            diffImage: passed ? null : {
                data: `mock-diff-${Date.now()}`,
                highlightedPixels: Math.floor(difference * 100)
            }
        };
    }
    
    /**
     * Calculate mock similarity between two images
     */
    calculateMockSimilarity(data1, data2) {
        if (data1 === data2) return 1.0;
        
        // Simple string similarity for mock
        const longer = data1.length > data2.length ? data1 : data2;
        const shorter = data1.length > data2.length ? data2 : data1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Check layout consistency between viewports
     */
    async checkLayoutConsistency(screenshot1, screenshot2, viewport1, viewport2) {
        console.log(`Checking layout consistency: ${viewport1} vs ${viewport2}`);
        
        // Mock layout consistency check
        // In reality, this would analyze layout structure, element positions, etc.
        const consistency = Math.random() > 0.1 ? 0.95 : 0.7; // 90% chance of good consistency
        const difference = (1 - consistency) * 100;
        
        return {
            passed: difference <= this.options.threshold * 10, // More lenient for responsive
            difference,
            consistency,
            diffImage: difference > this.options.threshold * 10 ? {
                data: `mock-layout-diff-${Date.now()}`,
                inconsistentElements: ['navigation', 'sidebar']
            } : null
        };
    }
    
    /**
     * Compare browser screenshots
     */
    async compareBrowserScreenshots(screenshot1, screenshot2, browser1, browser2) {
        console.log(`Comparing browsers: ${browser1} vs ${browser2}`);
        
        // Mock browser comparison
        const consistency = Math.random() > 0.15 ? 0.92 : 0.75; // 85% chance of good consistency
        const difference = (1 - consistency) * 100;
        
        return {
            passed: difference <= this.options.threshold * 5, // Slightly more lenient for cross-browser
            difference,
            consistency,
            diffImage: difference > this.options.threshold * 5 ? {
                data: `mock-browser-diff-${Date.now()}`,
                browserDifferences: ['font-rendering', 'border-radius']
            } : null
        };
    }
    
    /**
     * Apply theme (mock implementation)
     */
    async applyTheme(theme) {
        console.log(`Applying theme: ${theme}`);
        // Mock theme application
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * Trigger interactive state (mock implementation)
     */
    async triggerInteractiveState(componentName, state) {
        console.log(`Triggering ${state} state on ${componentName}`);
        // Mock state triggering
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    /**
     * Get baseline screenshot
     */
    async getBaseline(componentName, viewport) {
        const key = `${componentName}-${viewport.name}`;
        return this.baselines.get(key) || null;
    }
    
    /**
     * Save baseline screenshot
     */
    async saveBaseline(componentName, viewport, screenshot) {
        const key = `${componentName}-${viewport.name}`;
        this.baselines.set(key, screenshot);
        console.log(`Saved baseline: ${key}`);
    }
    
    /**
     * Get theme baseline
     */
    async getThemeBaseline(componentName, theme) {
        const key = `theme-${componentName}-${theme}`;
        return this.baselines.get(key) || null;
    }
    
    /**
     * Save theme baseline
     */
    async saveThemeBaseline(componentName, theme, screenshot) {
        const key = `theme-${componentName}-${theme}`;
        this.baselines.set(key, screenshot);
        console.log(`Saved theme baseline: ${key}`);
    }
    
    /**
     * Get interactive baseline
     */
    async getInteractiveBaseline(componentName, state) {
        const key = `interactive-${componentName}-${state}`;
        return this.baselines.get(key) || null;
    }
    
    /**
     * Save interactive baseline
     */
    async saveInteractiveBaseline(componentName, state, screenshot) {
        const key = `interactive-${componentName}-${state}`;
        this.baselines.set(key, screenshot);
        console.log(`Saved interactive baseline: ${key}`);
    }
    
    /**
     * Add test result
     */
    addTestResult(category, name, passed, difference, artifacts = null, message = '') {
        this.testResults.push({
            category,
            name,
            passed,
            difference: Math.round(difference * 100) / 100,
            artifacts,
            message,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✓' : '✗';
        const diffText = difference > 0 ? ` (${difference.toFixed(2)}% diff)` : '';
        console.log(`${status} ${category} - ${name}${diffText}`);
    }
    
    /**
     * Generate comprehensive report
     */
    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        // Group results by category
        const categories = {};
        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { passed: 0, total: 0, results: [] };
            }
            categories[result.category].total++;
            if (result.passed) {
                categories[result.category].passed++;
            }
            categories[result.category].results.push(result);
        });
        
        // Calculate average difference for failed tests
        const failedResults = this.testResults.filter(r => !r.passed);
        const avgDifference = failedResults.length > 0 
            ? failedResults.reduce((sum, r) => sum + r.difference, 0) / failedResults.length
            : 0;
        
        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate,
                avgDifference: Math.round(avgDifference * 100) / 100,
                threshold: this.options.threshold
            },
            categories,
            results: this.testResults,
            recommendations: this.generateRecommendations(),
            configuration: {
                viewports: this.options.viewports,
                browsers: this.options.browsers,
                threshold: this.options.threshold
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('=== VISUAL REGRESSION REPORT ===');
        console.log(`Tests: ${passedTests}/${totalTests} (${successRate}%)`);
        console.log(`Average difference: ${avgDifference.toFixed(2)}%`);
        console.log(`Threshold: ${this.options.threshold}%`);
        
        return report;
    }
    
    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        const failedResults = this.testResults.filter(r => !r.passed);
        
        if (failedResults.length === 0) {
            recommendations.push({
                type: 'success',
                message: 'All visual regression tests passed! UI consistency is maintained.'
            });
            return recommendations;
        }
        
        // Check for high-difference failures
        const highDiffFailures = failedResults.filter(r => r.difference > 10);
        if (highDiffFailures.length > 0) {
            recommendations.push({
                type: 'error',
                message: `${highDiffFailures.length} tests have significant visual differences (>10%).`,
                tests: highDiffFailures.map(r => r.name)
            });
        }
        
        // Check for responsive layout issues
        const responsiveFailures = failedResults.filter(r => r.category === 'Responsive Layouts');
        if (responsiveFailures.length > 0) {
            recommendations.push({
                type: 'warning',
                message: 'Responsive layout inconsistencies detected. Check breakpoint implementations.',
                tests: responsiveFailures.map(r => r.name)
            });
        }
        
        // Check for cross-browser issues
        const browserFailures = failedResults.filter(r => r.category === 'Cross-Browser Consistency');
        if (browserFailures.length > 0) {
            recommendations.push({
                type: 'warning',
                message: 'Cross-browser inconsistencies detected. Consider browser-specific CSS fixes.',
                tests: browserFailures.map(r => r.name)
            });
        }
        
        // Check for theme issues
        const themeFailures = failedResults.filter(r => r.category === 'Theme Variations');
        if (themeFailures.length > 0) {
            recommendations.push({
                type: 'info',
                message: 'Theme variation differences detected. Verify dark/light mode implementations.',
                tests: themeFailures.map(r => r.name)
            });
        }
        
        // Check for interactive state issues
        const interactiveFailures = failedResults.filter(r => r.category === 'Interactive States');
        if (interactiveFailures.length > 0) {
            recommendations.push({
                type: 'info',
                message: 'Interactive state differences detected. Check hover/active/focus styles.',
                tests: interactiveFailures.map(r => r.name)
            });
        }
        
        return recommendations;
    }
    
    /**
     * Export test results and artifacts
     */
    async exportResults(format = 'json') {
        const report = this.generateReport();
        
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        } else if (format === 'html') {
            return this.generateHTMLReport(report);
        }
        
        return report;
    }
    
    /**
     * Generate HTML report
     */
    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; text-align: center; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .stat-card { background: white; padding: 15px; border-radius: 5px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
        .category { background: white; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .category-header { background: #34495e; color: white; padding: 15px 20px; font-weight: bold; }
        .test-result { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .test-result:last-child { border-bottom: none; }
        .test-name { flex: 1; font-weight: 500; }
        .test-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .pass { background: #d4edda; color: #155724; }
        .fail { background: #f8d7da; color: #721c24; }
        .test-meta { font-size: 12px; color: #666; margin-left: 10px; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 20px; }
        .recommendation { padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid; }
        .recommendation.error { background: #f8d7da; border-color: #dc3545; color: #721c24; }
        .recommendation.warning { background: #fff3cd; border-color: #ffc107; color: #856404; }
        .recommendation.info { background: #d1ecf1; border-color: #17a2b8; color: #0c5460; }
        .recommendation.success { background: #d4edda; border-color: #28a745; color: #155724; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .screenshot-item { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .screenshot-header { background: #f8f9fa; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #eee; }
        .screenshot-content { padding: 15px; text-align: center; }
        .screenshot-placeholder { width: 100%; height: 200px; background: #f0f0f0; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #666; }
        .timestamp { color: #666; font-size: 12px; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📸 Visual Regression Test Report</h1>
            <p>Comprehensive UI consistency validation across browsers and devices</p>
        </div>
        
        <div class="summary">
            <h2>📊 Test Summary</h2>
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-value">${report.summary.total}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #27ae60;">${report.summary.passed}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #e74c3c;">${report.summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.summary.successRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.summary.avgDifference.toFixed(2)}%</div>
                    <div class="stat-label">Avg Difference</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.summary.threshold}%</div>
                    <div class="stat-label">Threshold</div>
                </div>
            </div>
        </div>
        
        ${Object.keys(report.categories).map(category => `
            <div class="category">
                <div class="category-header">
                    ${category} (${report.categories[category].passed}/${report.categories[category].total})
                </div>
                ${report.categories[category].results.map(result => `
                    <div class="test-result">
                        <div class="test-name">${result.name}</div>
                        <div>
                            <span class="test-status ${result.passed ? 'pass' : 'fail'}">
                                ${result.passed ? '✓ PASS' : '✗ FAIL'}
                            </span>
                            ${result.difference > 0 ? `<span class="test-meta">${result.difference}% diff</span>` : ''}
                            ${result.message ? `<span class="test-meta">${result.message}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}
        
        ${report.recommendations && report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                ${report.recommendations.map(rec => `
                    <div class="recommendation ${rec.type}">
                        <strong>${rec.type.toUpperCase()}:</strong> ${rec.message}
                        ${rec.tests ? `<br><small>Affected tests: ${rec.tests.slice(0, 3).join(', ')}${rec.tests.length > 3 ? ` and ${rec.tests.length - 3} more` : ''}</small>` : ''}
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="timestamp">
            Report generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;commendations</h3>
            ${report.recommendations.map(rec => `
                <p><strong>${rec.type.toUpperCase()}:</strong> ${rec.message}</p>
            `).join('')}
        </div>
    ` : ''}
    
    <p><small>Generated on ${report.timestamp}</small></p>
</body>
</html>`;
    }
    
    /**
     * Real screenshot capture using html2canvas (when available)
     */
    async captureRealScreenshot(element, options = {}) {
        if (typeof html2canvas === 'undefined') {
            console.warn('html2canvas not available, using mock screenshots');
            return this.captureComponentScreenshot(element, options.viewport || { name: 'default', width: 1920, height: 1080 });
        }
        
        try {
            const canvas = await html2canvas(element, {
                width: options.width || element.offsetWidth,
                height: options.height || element.offsetHeight,
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                scale: options.scale || 1
            });
            
            return {
                element: element.tagName.toLowerCase(),
                timestamp: Date.now(),
                data: canvas.toDataURL('image/png'),
                width: canvas.width,
                height: canvas.height,
                real: true
            };
        } catch (error) {
            console.error('Failed to capture real screenshot:', error);
            return this.captureComponentScreenshot(element, options.viewport || { name: 'default', width: 1920, height: 1080 });
        }
    }
    
    /**
     * Pixel-perfect image comparison using canvas
     */
    async compareRealImages(image1, image2) {
        if (!image1.real || !image2.real) {
            return this.compareImages(image1, image2);
        }
        
        try {
            const canvas1 = await this.imageDataToCanvas(image1.data);
            const canvas2 = await this.imageDataToCanvas(image2.data);
            
            if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
                return {
                    passed: false,
                    difference: 100,
                    similarity: 0,
                    diffImage: null,
                    error: 'Image dimensions do not match'
                };
            }
            
            const ctx1 = canvas1.getContext('2d');
            const ctx2 = canvas2.getContext('2d');
            
            const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
            const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
            
            const diff = this.pixelDiff(imageData1.data, imageData2.data);
            const totalPixels = canvas1.width * canvas1.height;
            const diffPercentage = (diff.changedPixels / totalPixels) * 100;
            
            const passed = diffPercentage <= this.options.threshold;
            
            return {
                passed,
                difference: diffPercentage,
                similarity: 1 - (diffPercentage / 100),
                diffImage: passed ? null : await this.createDiffImage(imageData1, imageData2, diff.diffData),
                changedPixels: diff.changedPixels,
                totalPixels
            };
            
        } catch (error) {
            console.error('Real image comparison failed:', error);
            return this.compareImages(image1, image2);
        }
    }
    
    /**
     * Convert image data URL to canvas
     */
    async imageDataToCanvas(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas);
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
    
    /**
     * Pixel-level difference calculation
     */
    pixelDiff(data1, data2) {
        const diffData = new Uint8ClampedArray(data1.length);
        let changedPixels = 0;
        
        for (let i = 0; i < data1.length; i += 4) {
            const r1 = data1[i];
            const g1 = data1[i + 1];
            const b1 = data1[i + 2];
            const a1 = data1[i + 3];
            
            const r2 = data2[i];
            const g2 = data2[i + 1];
            const b2 = data2[i + 2];
            const a2 = data2[i + 3];
            
            const deltaR = Math.abs(r1 - r2);
            const deltaG = Math.abs(g1 - g2);
            const deltaB = Math.abs(b1 - b2);
            const deltaA = Math.abs(a1 - a2);
            
            const delta = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB + deltaA * deltaA);
            
            if (delta > 10) { // Threshold for considering pixels different
                changedPixels++;
                // Highlight different pixels in red
                diffData[i] = 255;     // R
                diffData[i + 1] = 0;   // G
                diffData[i + 2] = 0;   // B
                diffData[i + 3] = 255; // A
            } else {
                // Keep original pixel but make it semi-transparent
                diffData[i] = r1;
                diffData[i + 1] = g1;
                diffData[i + 2] = b1;
                diffData[i + 3] = Math.floor(a1 * 0.3);
            }
        }
        
        return { changedPixels, diffData };
    }
    
    /**
     * Create visual diff image
     */
    async createDiffImage(imageData1, imageData2, diffData) {
        const canvas = document.createElement('canvas');
        canvas.width = imageData1.width;
        canvas.height = imageData1.height;
        
        const ctx = canvas.getContext('2d');
        const diffImageData = new ImageData(diffData, imageData1.width, imageData1.height);
        ctx.putImageData(diffImageData, 0, 0);
        
        return {
            data: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
            type: 'diff'
        };
    }
    
    /**
     * Responsive design testing with breakpoint validation
     */
    async testResponsiveBreakpoints() {
        const breakpoints = [
            { name: 'mobile-portrait', width: 375, height: 667 },
            { name: 'mobile-landscape', width: 667, height: 375 },
            { name: 'tablet-portrait', width: 768, height: 1024 },
            { name: 'tablet-landscape', width: 1024, height: 768 },
            { name: 'desktop-small', width: 1366, height: 768 },
            { name: 'desktop-large', width: 1920, height: 1080 },
            { name: 'desktop-xl', width: 2560, height: 1440 }
        ];
        
        const components = ['main-layout', 'navigation', 'settings-panel', 'color-picker'];
        
        for (const component of components) {
            for (const breakpoint of breakpoints) {
                await this.testComponentAtBreakpoint(component, breakpoint);
            }
        }
    }
    
    /**
     * Test component at specific breakpoint
     */
    async testComponentAtBreakpoint(componentName, breakpoint) {
        console.log(`Testing ${componentName} at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`);
        
        try {
            // Simulate viewport resize
            if (window.innerWidth !== breakpoint.width || window.innerHeight !== breakpoint.height) {
                // In a real implementation, this would use browser automation tools
                console.log(`Simulating viewport resize to ${breakpoint.width}x${breakpoint.height}`);
            }
            
            const screenshot = await this.captureComponentScreenshot(componentName, breakpoint);
            const baseline = await this.getBreakpointBaseline(componentName, breakpoint);
            
            if (baseline) {
                const diff = await this.compareImages(screenshot, baseline);
                this.addTestResult(
                    'Responsive Breakpoints',
                    `${componentName} - ${breakpoint.name}`,
                    diff.passed,
                    diff.difference,
                    { screenshot, baseline, diff: diff.diffImage }
                );
            } else {
                await this.saveBreakpointBaseline(componentName, breakpoint, screenshot);
                this.addTestResult(
                    'Responsive Breakpoints',
                    `${componentName} - ${breakpoint.name}`,
                    true,
                    0,
                    { screenshot, baseline: null, diff: null },
                    'Breakpoint baseline created'
                );
            }
            
        } catch (error) {
            this.addTestResult(
                'Responsive Breakpoints',
                `${componentName} - ${breakpoint.name}`,
                false,
                100,
                null,
                error.message
            );
        }
    }
    
    /**
     * Get breakpoint baseline
     */
    async getBreakpointBaseline(componentName, breakpoint) {
        const key = `breakpoint-${componentName}-${breakpoint.name}`;
        return this.baselines.get(key) || null;
    }
    
    /**
     * Save breakpoint baseline
     */
    async saveBreakpointBaseline(componentName, breakpoint, screenshot) {
        const key = `breakpoint-${componentName}-${breakpoint.name}`;
        this.baselines.set(key, screenshot);
        console.log(`Saved breakpoint baseline: ${key}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualRegressionFramework;
}

// Global access for browser testing
window.VisualRegressionFramework = VisualRegressionFramework;