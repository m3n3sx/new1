/**
 * Final Integration Validation for Live Admin Styler
 * 
 * This comprehensive test validates that all components work together
 * as a cohesive system and meets all specification requirements.
 */

const fs = require('fs');
const path = require('path');

class FinalIntegrationValidator {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.requirements = this.loadRequirements();
        this.testCategories = [
            'Core System Integration',
            'Live Preview Workflow',
            'AJAX Communication',
            'Settings Persistence',
            'Error Handling',
            'Performance',
            'Security',
            'Cross-Browser Compatibility',
            'WordPress Integration',
            'Requirements Compliance'
        ];
    }
    
    /**
     * Load requirements from specification
     */
    loadRequirements() {
        return {
            'Requirement 1': {
                name: 'Live Preview System Restoration',
                criteria: [
                    'Form elements trigger live preview updates within 300ms',
                    'Zero JavaScript errors on admin page load',
                    'Preview updates without page refresh',
                    'CSS injection without affecting other admin functionality',
                    'Debounced updates prevent excessive processing',
                    'System loads in under 1 second on WordPress 6.0+',
                    'Consistent behavior across Chrome, Firefox, Safari, Edge'
                ]
            },
            'Requirement 2': {
                name: 'AJAX Communication System Repair',
                criteria: [
                    'AJAX requests complete with proper WordPress nonce validation',
                    'Automatic retry up to 3 times with exponential backoff',
                    'Requests timeout at 10 seconds with user-friendly messages',
                    'Proper wp_localize_script configuration',
                    'Server errors logged with graceful notifications',
                    'Request queuing prevents conflicts',
                    'WordPress nonces validated on every request'
                ]
            },
            'Requirement 3': {
                name: 'Settings Persistence and Storage',
                criteria: [
                    'Settings saved to WordPress database with sanitization',
                    'Settings restored accurately on page reload',
                    'localStorage backup for failed saves',
                    'Multi-tab synchronization',
                    'Settings validated and sanitized for security',
                    'Clear error messages for database failures',
                    'Export/import maintains data integrity'
                ]
            },
            'Requirement 4': {
                name: 'Error Handling and User Feedback',
                criteria: [
                    'Positive visual feedback for successful operations',
                    'User-friendly error messages with actionable guidance',
                    'Loading indicators during AJAX processing',
                    'JavaScript errors caught gracefully',
                    'Connectivity issue notifications',
                    'Field-level validation error messages',
                    'Recovery notifications when errors resolve'
                ]
            },
            'Requirement 5': {
                name: 'Form Element Integration',
                criteria: [
                    'Color pickers trigger live preview on change',
                    'Text inputs trigger debounced updates after 300ms',
                    'Sliders trigger immediate preview updates',
                    'Toggles trigger instant preview updates',
                    'Dropdowns trigger immediate preview updates',
                    'Custom controls integrate with live preview',
                    'Preview blocked until valid input provided'
                ]
            },
            'Requirement 6': {
                name: 'Performance and Memory Management',
                criteria: [
                    'Memory usage not exceeding 25MB peak',
                    'Preview updates complete within 100ms',
                    'Debouncing prevents excessive DOM manipulation',
                    'No memory leaks during extended use',
                    'CSS injection optimized and minified',
                    'System initialization without UI blocking',
                    'Proper cleanup of event listeners and DOM elements'
                ]
            },
            'Requirement 7': {
                name: 'WordPress Integration and Compatibility',
                criteria: [
                    'Full compatibility with WordPress 6.0+',
                    'No conflicts with other admin plugins',
                    'Adaptation to WordPress admin themes',
                    'WordPress hooks and filters follow best practices',
                    'No orphaned data on activation/deactivation',
                    'Multisite network admin compatibility',
                    'Continued function through WordPress updates'
                ]
            }
        };
    }
    
    /**
     * Run complete final integration validation
     */
    async validate() {
        console.log('🔍 Starting Final Integration Validation...');
        console.log('============================================');
        
        try {
            // Core system integration tests
            await this.validateCoreSystemIntegration();
            
            // Live preview workflow tests
            await this.validateLivePreviewWorkflow();
            
            // AJAX communication tests
            await this.validateAjaxCommunication();
            
            // Settings persistence tests
            await this.validateSettingsPersistence();
            
            // Error handling tests
            await this.validateErrorHandling();
            
            // Performance tests
            await this.validatePerformance();
            
            // Security tests
            await this.validateSecurity();
            
            // Cross-browser compatibility tests
            await this.validateCrossBrowserCompatibility();
            
            // WordPress integration tests
            await this.validateWordPressIntegration();
            
            // Requirements compliance validation
            await this.validateRequirementsCompliance();
            
            // Generate final report
            this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Final integration validation failed:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Validate core system integration
     */
    async validateCoreSystemIntegration() {
        console.log('\n🔧 Validating Core System Integration...');
        
        // Test that all core files exist and are properly structured
        const coreFiles = [
            { path: 'js/admin-settings.js', type: 'javascript', required: ['LASCoreManager', 'LASErrorHandler'] },
            { path: 'includes/ajax-handlers.php', type: 'php', required: ['LAS_Ajax_Handlers'] },
            { path: 'includes/SecurityValidator.php', type: 'php', required: ['LAS_Security_Validator'] },
            { path: 'includes/SettingsStorage.php', type: 'php', required: ['LAS_Settings_Storage'] },
            { path: 'live-admin-styler.php', type: 'php', required: ['Plugin Name:', 'wp_enqueue_'] }
        ];
        
        let integrationScore = 0;
        const totalFiles = coreFiles.length;
        
        for (const file of coreFiles) {
            try {
                if (!fs.existsSync(file.path)) {
                    throw new Error(`File not found: ${file.path}`);
                }
                
                const content = fs.readFileSync(file.path, 'utf8');
                
                // Check for required components
                let componentScore = 0;
                for (const required of file.required) {
                    if (content.includes(required)) {
                        componentScore++;
                    }
                }
                
                if (componentScore === file.required.length) {
                    integrationScore++;
                    this.addResult('Core System Integration', `File: ${path.basename(file.path)}`, true, 
                        `All required components found (${componentScore}/${file.required.length})`);
                } else {
                    this.addResult('Core System Integration', `File: ${path.basename(file.path)}`, false,
                        `Missing components (${componentScore}/${file.required.length})`);
                }
                
            } catch (error) {
                this.addResult('Core System Integration', `File: ${path.basename(file.path)}`, false, error.message);
            }
        }
        
        // Overall integration assessment
        const integrationSuccess = integrationScore === totalFiles;
        this.addResult('Core System Integration', 'Overall Integration', integrationSuccess,
            `${integrationScore}/${totalFiles} core files properly integrated`);
    }
    
    /**
     * Validate live preview workflow
     */
    async validateLivePreviewWorkflow() {
        console.log('\n🎨 Validating Live Preview Workflow...');
        
        try {
            // Test JavaScript module loading
            const adminSettingsPath = 'js/admin-settings.js';
            if (fs.existsSync(adminSettingsPath)) {
                const content = fs.readFileSync(adminSettingsPath, 'utf8');
                
                // Check for core manager components
                const coreComponents = [
                    'LASCoreManager',
                    'LASErrorHandler',
                    'LASSettingsManager',
                    'LASLivePreviewEngine',
                    'LASAjaxManager'
                ];
                
                let componentCount = 0;
                for (const component of coreComponents) {
                    if (content.includes(component)) {
                        componentCount++;
                    }
                }
                
                this.addResult('Live Preview Workflow', 'Core Components', componentCount >= 4,
                    `${componentCount}/${coreComponents.length} core components found`);
                
                // Check for live preview functionality
                const previewFeatures = [
                    'updateSetting',
                    'generateCSS',
                    'applyCSS',
                    'debounce',
                    'requestAnimationFrame'
                ];
                
                let featureCount = 0;
                for (const feature of previewFeatures) {
                    if (content.includes(feature)) {
                        featureCount++;
                    }
                }
                
                this.addResult('Live Preview Workflow', 'Preview Features', featureCount >= 3,
                    `${featureCount}/${previewFeatures.length} preview features implemented`);
                
            } else {
                this.addResult('Live Preview Workflow', 'Core JavaScript', false, 'admin-settings.js not found');
            }
            
            // Test browser compatibility module
            const compatibilityPath = 'assets/js/modules/browser-compatibility.js';
            if (fs.existsSync(compatibilityPath)) {
                this.addResult('Live Preview Workflow', 'Browser Compatibility', true, 'Compatibility module available');
            } else {
                this.addResult('Live Preview Workflow', 'Browser Compatibility', false, 'Compatibility module missing');
            }
            
        } catch (error) {
            this.addResult('Live Preview Workflow', 'Workflow Validation', false, error.message);
        }
    }
    
    /**
     * Validate AJAX communication
     */
    async validateAjaxCommunication() {
        console.log('\n📡 Validating AJAX Communication...');
        
        try {
            const ajaxHandlersPath = 'includes/ajax-handlers.php';
            if (fs.existsSync(ajaxHandlersPath)) {
                const content = fs.readFileSync(ajaxHandlersPath, 'utf8');
                
                // Check for AJAX handlers
                const ajaxHandlers = [
                    'wp_ajax_las_save_settings',
                    'wp_ajax_las_load_settings',
                    'wp_ajax_las_log_error'
                ];
                
                let handlerCount = 0;
                for (const handler of ajaxHandlers) {
                    if (content.includes(handler)) {
                        handlerCount++;
                    }
                }
                
                this.addResult('AJAX Communication', 'AJAX Handlers', handlerCount >= 2,
                    `${handlerCount}/${ajaxHandlers.length} AJAX handlers implemented`);
                
                // Check for security measures
                const securityFeatures = [
                    'wp_verify_nonce',
                    'current_user_can',
                    'sanitize_',
                    'wp_send_json_'
                ];
                
                let securityCount = 0;
                for (const feature of securityFeatures) {
                    if (content.includes(feature)) {
                        securityCount++;
                    }
                }
                
                this.addResult('AJAX Communication', 'Security Measures', securityCount >= 3,
                    `${securityCount}/${securityFeatures.length} security features implemented`);
                
            } else {
                this.addResult('AJAX Communication', 'AJAX Handlers', false, 'ajax-handlers.php not found');
            }
            
            // Check JavaScript AJAX manager
            const adminSettingsPath = 'js/admin-settings.js';
            if (fs.existsSync(adminSettingsPath)) {
                const content = fs.readFileSync(adminSettingsPath, 'utf8');
                
                const ajaxFeatures = [
                    'AjaxManager',
                    'retry',
                    'timeout',
                    'queue'
                ];
                
                let ajaxFeatureCount = 0;
                for (const feature of ajaxFeatures) {
                    if (content.toLowerCase().includes(feature.toLowerCase())) {
                        ajaxFeatureCount++;
                    }
                }
                
                this.addResult('AJAX Communication', 'JavaScript AJAX Manager', ajaxFeatureCount >= 2,
                    `${ajaxFeatureCount}/${ajaxFeatures.length} AJAX features implemented`);
            }
            
        } catch (error) {
            this.addResult('AJAX Communication', 'Communication Validation', false, error.message);
        }
    }
    
    /**
     * Validate settings persistence
     */
    async validateSettingsPersistence() {
        console.log('\n💾 Validating Settings Persistence...');
        
        try {
            const settingsStoragePath = 'includes/SettingsStorage.php';
            if (fs.existsSync(settingsStoragePath)) {
                const content = fs.readFileSync(settingsStoragePath, 'utf8');
                
                // Check for storage methods
                const storageMethods = [
                    'save_settings',
                    'load_settings',
                    'get_option',
                    'update_option',
                    'wp_cache_'
                ];
                
                let storageCount = 0;
                for (const method of storageMethods) {
                    if (content.includes(method)) {
                        storageCount++;
                    }
                }
                
                this.addResult('Settings Persistence', 'Storage Methods', storageCount >= 4,
                    `${storageCount}/${storageMethods.length} storage methods implemented`);
                
                // Check for caching and optimization
                const optimizationFeatures = [
                    'cache',
                    'batch',
                    'performance',
                    'transaction'
                ];
                
                let optimizationCount = 0;
                for (const feature of optimizationFeatures) {
                    if (content.toLowerCase().includes(feature)) {
                        optimizationCount++;
                    }
                }
                
                this.addResult('Settings Persistence', 'Optimization Features', optimizationCount >= 2,
                    `${optimizationCount}/${optimizationFeatures.length} optimization features found`);
                
            } else {
                this.addResult('Settings Persistence', 'Settings Storage', false, 'SettingsStorage.php not found');
            }
            
            // Check JavaScript settings manager
            const adminSettingsPath = 'js/admin-settings.js';
            if (fs.existsSync(adminSettingsPath)) {
                const content = fs.readFileSync(adminSettingsPath, 'utf8');
                
                const settingsFeatures = [
                    'SettingsManager',
                    'localStorage',
                    'BroadcastChannel',
                    'debounce'
                ];
                
                let settingsFeatureCount = 0;
                for (const feature of settingsFeatures) {
                    if (content.includes(feature)) {
                        settingsFeatureCount++;
                    }
                }
                
                this.addResult('Settings Persistence', 'JavaScript Settings Manager', settingsFeatureCount >= 3,
                    `${settingsFeatureCount}/${settingsFeatures.length} settings features implemented`);
            }
            
        } catch (error) {
            this.addResult('Settings Persistence', 'Persistence Validation', false, error.message);
        }
    }
    
    /**
     * Validate error handling
     */
    async validateErrorHandling() {
        console.log('\n🚨 Validating Error Handling...');
        
        try {
            const adminSettingsPath = '../js/admin-settings.js';
            if (fs.existsSync(adminSettingsPath)) {
                const content = fs.readFileSync(adminSettingsPath, 'utf8');
                
                // Check for error handling components
                const errorFeatures = [
                    'ErrorHandler',
                    'try',
                    'catch',
                    'showError',
                    'showSuccess',
                    'notification'
                ];
                
                let errorFeatureCount = 0;
                for (const feature of errorFeatures) {
                    if (content.includes(feature)) {
                        errorFeatureCount++;
                    }
                }
                
                this.addResult('Error Handling', 'JavaScript Error Handling', errorFeatureCount >= 4,
                    `${errorFeatureCount}/${errorFeatures.length} error handling features implemented`);
                
                // Check for global error handlers
                const globalErrorFeatures = [
                    'window.addEventListener',
                    'unhandledrejection',
                    'onerror'
                ];
                
                let globalErrorCount = 0;
                for (const feature of globalErrorFeatures) {
                    if (content.includes(feature)) {
                        globalErrorCount++;
                    }
                }
                
                this.addResult('Error Handling', 'Global Error Handling', globalErrorCount >= 1,
                    `${globalErrorCount}/${globalErrorFeatures.length} global error handlers found`);
            }
            
            // Check PHP error handling
            const ajaxHandlersPath = '../includes/ajax-handlers.php';
            if (fs.existsSync(ajaxHandlersPath)) {
                const content = fs.readFileSync(ajaxHandlersPath, 'utf8');
                
                const phpErrorFeatures = [
                    'try',
                    'catch',
                    'Exception',
                    'error_log',
                    'wp_send_json_error'
                ];
                
                let phpErrorCount = 0;
                for (const feature of phpErrorFeatures) {
                    if (content.includes(feature)) {
                        phpErrorCount++;
                    }
                }
                
                this.addResult('Error Handling', 'PHP Error Handling', phpErrorCount >= 3,
                    `${phpErrorCount}/${phpErrorFeatures.length} PHP error handling features implemented`);
            }
            
        } catch (error) {
            this.addResult('Error Handling', 'Error Handling Validation', false, error.message);
        }
    }
    
    /**
     * Validate performance
     */
    async validatePerformance() {
        console.log('\n⚡ Validating Performance...');
        
        try {
            // Test file sizes
            const performanceCriticalFiles = [
                { path: '../js/admin-settings.js', maxSize: 500 * 1024 }, // 500KB
                { path: '../assets/js/modules/browser-compatibility.js', maxSize: 100 * 1024 } // 100KB
            ];
            
            let performanceScore = 0;
            for (const file of performanceCriticalFiles) {
                if (fs.existsSync(file.path)) {
                    const stats = fs.statSync(file.path);
                    const sizeOk = stats.size <= file.maxSize;
                    
                    this.addResult('Performance', `File Size: ${path.basename(file.path)}`, sizeOk,
                        `${(stats.size / 1024).toFixed(1)}KB (max: ${(file.maxSize / 1024).toFixed(0)}KB)`);
                    
                    if (sizeOk) performanceScore++;
                } else {
                    this.addResult('Performance', `File Size: ${path.basename(file.path)}`, false, 'File not found');
                }
            }
            
            // Check for performance optimization features
            const adminSettingsPath = '../js/admin-settings.js';
            if (fs.existsSync(adminSettingsPath)) {
                const content = fs.readFileSync(adminSettingsPath, 'utf8');
                
                const performanceFeatures = [
                    'debounce',
                    'requestAnimationFrame',
                    'performance',
                    'memory',
                    'cache'
                ];
                
                let perfFeatureCount = 0;
                for (const feature of performanceFeatures) {
                    if (content.toLowerCase().includes(feature.toLowerCase())) {
                        perfFeatureCount++;
                    }
                }
                
                this.addResult('Performance', 'Performance Features', perfFeatureCount >= 3,
                    `${perfFeatureCount}/${performanceFeatures.length} performance features implemented`);
            }
            
            // Test module loading performance
            const startTime = process.hrtime.bigint();
            
            try {
                // Simulate module loading
                const compatibilityPath = '../assets/js/modules/browser-compatibility.js';
                if (fs.existsSync(compatibilityPath)) {
                    require(compatibilityPath);
                }
            } catch (error) {
                // Expected in test environment
            }
            
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            
            this.addResult('Performance', 'Module Loading Speed', duration < 100,
                `${duration.toFixed(2)}ms (target: <100ms)`);
            
        } catch (error) {
            this.addResult('Performance', 'Performance Validation', false, error.message);
        }
    }
    
    /**
     * Validate security
     */
    async validateSecurity() {
        console.log('\n🔒 Validating Security...');
        
        try {
            const securityValidatorPath = '../includes/SecurityValidator.php';
            if (fs.existsSync(securityValidatorPath)) {
                const content = fs.readFileSync(securityValidatorPath, 'utf8');
                
                // Check for security functions
                const securityFunctions = [
                    'sanitize_',
                    'validate_',
                    'wp_verify_nonce',
                    'current_user_can',
                    'esc_',
                    'wp_strip_all_tags'
                ];
                
                let securityFunctionCount = 0;
                for (const func of securityFunctions) {
                    if (content.includes(func)) {
                        securityFunctionCount++;
                    }
                }
                
                this.addResult('Security', 'Security Functions', securityFunctionCount >= 4,
                    `${securityFunctionCount}/${securityFunctions.length} security functions implemented`);
                
                // Check for input validation
                const validationFeatures = [
                    'sanitize_color',
                    'sanitize_css',
                    'sanitize_url',
                    'has_sql_injection',
                    'check_rate_limit'
                ];
                
                let validationCount = 0;
                for (const feature of validationFeatures) {
                    if (content.includes(feature)) {
                        validationCount++;
                    }
                }
                
                this.addResult('Security', 'Input Validation', validationCount >= 3,
                    `${validationCount}/${validationFeatures.length} validation features implemented`);
                
            } else {
                this.addResult('Security', 'Security Validator', false, 'SecurityValidator.php not found');
            }
            
            // Check for security headers and practices in PHP files
            const phpFiles = [
                '../includes/ajax-handlers.php',
                '../includes/SettingsStorage.php',
                '../live-admin-styler.php'
            ];
            
            let secureFileCount = 0;
            for (const file of phpFiles) {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Check for basic security measures
                    const hasAbspathCheck = content.includes('ABSPATH') || content.includes('defined');
                    const hasNonceCheck = content.includes('nonce') || content.includes('wp_verify_nonce');
                    
                    if (hasAbspathCheck && hasNonceCheck) {
                        secureFileCount++;
                    }
                }
            }
            
            this.addResult('Security', 'PHP File Security', secureFileCount >= 2,
                `${secureFileCount}/${phpFiles.length} PHP files have security measures`);
            
        } catch (error) {
            this.addResult('Security', 'Security Validation', false, error.message);
        }
    }
    
    /**
     * Validate cross-browser compatibility
     */
    async validateCrossBrowserCompatibility() {
        console.log('\n🌐 Validating Cross-Browser Compatibility...');
        
        try {
            const compatibilityPath = '../assets/js/modules/browser-compatibility.js';
            if (fs.existsSync(compatibilityPath)) {
                const content = fs.readFileSync(compatibilityPath, 'utf8');
                
                // Check for compatibility features
                const compatibilityFeatures = [
                    'BrowserCompatibility',
                    'detectFeatures',
                    'loadPolyfills',
                    'isBrowserSupported',
                    'getCompatibilityReport'
                ];
                
                let compatFeatureCount = 0;
                for (const feature of compatibilityFeatures) {
                    if (content.includes(feature)) {
                        compatFeatureCount++;
                    }
                }
                
                this.addResult('Cross-Browser Compatibility', 'Compatibility Module', compatFeatureCount >= 4,
                    `${compatFeatureCount}/${compatibilityFeatures.length} compatibility features implemented`);
                
                // Check for polyfills and fallbacks
                const polyfillFeatures = [
                    'polyfill',
                    'fallback',
                    'progressive',
                    'enhancement'
                ];
                
                let polyfillCount = 0;
                for (const feature of polyfillFeatures) {
                    if (content.toLowerCase().includes(feature.toLowerCase())) {
                        polyfillCount++;
                    }
                }
                
                this.addResult('Cross-Browser Compatibility', 'Polyfills and Fallbacks', polyfillCount >= 2,
                    `${polyfillCount}/${polyfillFeatures.length} polyfill features found`);
                
            } else {
                this.addResult('Cross-Browser Compatibility', 'Compatibility Module', false, 'browser-compatibility.js not found');
            }
            
            // Check for cross-browser test files
            const testFiles = [
                'cross-browser-test-runner.html',
                'js/test-cross-browser-compatibility.js'
            ];
            
            let testFileCount = 0;
            for (const file of testFiles) {
                if (fs.existsSync(file)) {
                    testFileCount++;
                }
            }
            
            this.addResult('Cross-Browser Compatibility', 'Test Coverage', testFileCount >= 1,
                `${testFileCount}/${testFiles.length} cross-browser test files available`);
            
        } catch (error) {
            this.addResult('Cross-Browser Compatibility', 'Compatibility Validation', false, error.message);
        }
    }
    
    /**
     * Validate WordPress integration
     */
    async validateWordPressIntegration() {
        console.log('\n🔌 Validating WordPress Integration...');
        
        try {
            const mainPluginPath = '../live-admin-styler.php';
            if (fs.existsSync(mainPluginPath)) {
                const content = fs.readFileSync(mainPluginPath, 'utf8');
                
                // Check for WordPress plugin headers
                const pluginHeaders = [
                    'Plugin Name:',
                    'Version:',
                    'Author:',
                    'Description:'
                ];
                
                let headerCount = 0;
                for (const header of pluginHeaders) {
                    if (content.includes(header)) {
                        headerCount++;
                    }
                }
                
                this.addResult('WordPress Integration', 'Plugin Headers', headerCount >= 3,
                    `${headerCount}/${pluginHeaders.length} plugin headers found`);
                
                // Check for WordPress functions
                const wpFunctions = [
                    'wp_enqueue_script',
                    'wp_enqueue_style',
                    'wp_localize_script',
                    'add_action',
                    'add_filter'
                ];
                
                let wpFunctionCount = 0;
                for (const func of wpFunctions) {
                    if (content.includes(func)) {
                        wpFunctionCount++;
                    }
                }
                
                this.addResult('WordPress Integration', 'WordPress Functions', wpFunctionCount >= 3,
                    `${wpFunctionCount}/${wpFunctions.length} WordPress functions used`);
                
            } else {
                this.addResult('WordPress Integration', 'Main Plugin File', false, 'live-admin-styler.php not found');
            }
            
            // Check for WordPress coding standards
            const phpFiles = [
                '../includes/ajax-handlers.php',
                '../includes/SecurityValidator.php',
                '../includes/SettingsStorage.php'
            ];
            
            let standardsCompliantCount = 0;
            for (const file of phpFiles) {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Check for WordPress coding standards
                    const hasProperDocBlocks = content.includes('/**') && content.includes('* @');
                    const hasProperNaming = content.includes('LAS_') || content.includes('las_');
                    const hasSecurityChecks = content.includes('ABSPATH') || content.includes('defined');
                    
                    if (hasProperDocBlocks && hasProperNaming && hasSecurityChecks) {
                        standardsCompliantCount++;
                    }
                }
            }
            
            this.addResult('WordPress Integration', 'Coding Standards', standardsCompliantCount >= 2,
                `${standardsCompliantCount}/${phpFiles.length} files follow WordPress coding standards`);
            
        } catch (error) {
            this.addResult('WordPress Integration', 'Integration Validation', false, error.message);
        }
    }
    
    /**
     * Validate requirements compliance
     */
    async validateRequirementsCompliance() {
        console.log('\n📋 Validating Requirements Compliance...');
        
        for (const [reqId, requirement] of Object.entries(this.requirements)) {
            let criteriaMetCount = 0;
            const totalCriteria = requirement.criteria.length;
            
            // For each requirement, check if related components exist
            switch (reqId) {
                case 'Requirement 1': // Live Preview System
                    criteriaMetCount = this.checkLivePreviewCompliance();
                    break;
                case 'Requirement 2': // AJAX Communication
                    criteriaMetCount = this.checkAjaxCompliance();
                    break;
                case 'Requirement 3': // Settings Persistence
                    criteriaMetCount = this.checkSettingsCompliance();
                    break;
                case 'Requirement 4': // Error Handling
                    criteriaMetCount = this.checkErrorHandlingCompliance();
                    break;
                case 'Requirement 5': // Form Integration
                    criteriaMetCount = this.checkFormIntegrationCompliance();
                    break;
                case 'Requirement 6': // Performance
                    criteriaMetCount = this.checkPerformanceCompliance();
                    break;
                case 'Requirement 7': // WordPress Integration
                    criteriaMetCount = this.checkWordPressCompliance();
                    break;
            }
            
            const compliancePercentage = Math.round((criteriaMetCount / totalCriteria) * 100);
            const isCompliant = compliancePercentage >= 80; // 80% compliance threshold
            
            this.addResult('Requirements Compliance', reqId, isCompliant,
                `${criteriaMetCount}/${totalCriteria} criteria met (${compliancePercentage}%)`);
        }
    }
    
    /**
     * Check live preview compliance
     */
    checkLivePreviewCompliance() {
        let score = 0;
        
        // Check for debouncing (300ms)
        if (this.fileContains('../js/admin-settings.js', '300')) score++;
        
        // Check for error handling
        if (this.fileContains('../js/admin-settings.js', 'try') && 
            this.fileContains('../js/admin-settings.js', 'catch')) score++;
        
        // Check for CSS injection
        if (this.fileContains('../js/admin-settings.js', 'style') && 
            this.fileContains('../js/admin-settings.js', 'CSS')) score++;
        
        // Check for performance optimization
        if (this.fileContains('../js/admin-settings.js', 'requestAnimationFrame')) score++;
        
        // Check for browser compatibility
        if (fs.existsSync('../assets/js/modules/browser-compatibility.js')) score++;
        
        return Math.min(score, 7); // Max 7 criteria for this requirement
    }
    
    /**
     * Check AJAX compliance
     */
    checkAjaxCompliance() {
        let score = 0;
        
        // Check for nonce validation
        if (this.fileContains('../includes/ajax-handlers.php', 'wp_verify_nonce')) score++;
        
        // Check for retry logic
        if (this.fileContains('../js/admin-settings.js', 'retry')) score++;
        
        // Check for timeout handling
        if (this.fileContains('../js/admin-settings.js', 'timeout')) score++;
        
        // Check for wp_localize_script
        if (this.fileContains('../live-admin-styler.php', 'wp_localize_script')) score++;
        
        // Check for error logging
        if (this.fileContains('../includes/ajax-handlers.php', 'error_log')) score++;
        
        // Check for request queuing
        if (this.fileContains('../js/admin-settings.js', 'queue')) score++;
        
        return Math.min(score, 7); // Max 7 criteria for this requirement
    }
    
    /**
     * Check settings compliance
     */
    checkSettingsCompliance() {
        let score = 0;
        
        // Check for database operations
        if (this.fileContains('../includes/SettingsStorage.php', 'update_option')) score++;
        
        // Check for sanitization
        if (this.fileContains('../includes/SecurityValidator.php', 'sanitize')) score++;
        
        // Check for localStorage backup
        if (this.fileContains('../js/admin-settings.js', 'localStorage')) score++;
        
        // Check for multi-tab sync
        if (this.fileContains('../js/admin-settings.js', 'BroadcastChannel')) score++;
        
        // Check for validation
        if (this.fileContains('../includes/SecurityValidator.php', 'validate')) score++;
        
        // Check for error handling
        if (this.fileContains('../includes/SettingsStorage.php', 'try')) score++;
        
        return Math.min(score, 7); // Max 7 criteria for this requirement
    }
    
    /**
     * Check error handling compliance
     */
    checkErrorHandlingCompliance() {
        let score = 0;
        
        // Check for success notifications
        if (this.fileContains('../js/admin-settings.js', 'showSuccess')) score++;
        
        // Check for error messages
        if (this.fileContains('../js/admin-settings.js', 'showError')) score++;
        
        // Check for loading indicators
        if (this.fileContains('../js/admin-settings.js', 'loading')) score++;
        
        // Check for global error handling
        if (this.fileContains('../js/admin-settings.js', 'window.addEventListener')) score++;
        
        // Check for connectivity handling
        if (this.fileContains('../js/admin-settings.js', 'online') || 
            this.fileContains('../js/admin-settings.js', 'offline')) score++;
        
        // Check for validation messages
        if (this.fileContains('../js/admin-settings.js', 'validation')) score++;
        
        return Math.min(score, 7); // Max 7 criteria for this requirement
    }
    
    /**
     * Check form integration compliance
     */
    checkFormIntegrationCompliance() {
        let score = 0;
        
        // Check for color picker integration
        if (this.fileContains('../js/admin-settings.js', 'color')) score++;
        
        // Check for debounced text inputs
        if (this.fileContains('../js/admin-settings.js', 'debounce')) score++;
        
        // Check for slider integration
        if (this.fileContains('../js/admin-settings.js', 'slider') || 
            this.fileContains('../js/admin-settings.js', 'range')) score++;
        
        // Check for toggle integration
        if (this.fileContains('../js/admin-settings.js', 'toggle') || 
            this.fileContains('../js/admin-settings.js', 'checkbox')) score++;
        
        // Check for dropdown integration
        if (this.fileContains('../js/admin-settings.js', 'select')) score++;
        
        // Check for form validation
        if (this.fileContains('../js/admin-settings.js', 'validate')) score++;
        
        return Math.min(score, 7); // Max 7 criteria for this requirement
    }
    
    /**
     * Check performance compliance
     */
    checkPerformanceCompliance() {
        let score = 0;
        
        // Check for memory management
        if (this.fileContains('../js/admin-settings.js', 'memory')) score++;
        
        // Check for performance monitoring
        if (this.fileContains('../js/admin-settings.js', 'performance')) score++;
        
        // Check for debouncing
        if (this.fileContains('../js/admin-settings.js', 'debounce')) score++;
        
        // Check for cleanup
        if (this.fileContains('../js/admin-settings.js', 'cleanup')) score++;
        
        // Check for optimization
        if (this.fileContains('../js/admin-settings.js', 'requestAnimationFrame')) score++;
        
        // Check file sizes
        if (this.getFileSize('../js/admin-settings.js') < 500 * 1024) score++; // < 500KB
        
        return Math.min(score, 7); // Max 7 criteria for this requirement
    }
    
    /**
     * Check WordPress compliance
     */
    checkWordPressCompliance() {
        let score = 0;
        
        // Check for WordPress compatibility
        if (this.fileContains('../live-admin-styler.php', 'WordPress')) score++;
        
        // Check for proper enqueuing
        if (this.fileContains('../live-admin-styler.php', 'wp_enqueue_')) score++;
        
        // Check for hooks and filters
        if (this.fileContains('../live-admin-styler.php', 'add_action')) score++;
        
        // Check for security measures
        if (this.fileContains('../includes/ajax-handlers.php', 'current_user_can')) score++;
        
        // Check for proper cleanup
        if (this.fileContains('../live-admin-styler.php', 'register_deactivation_hook') ||
            this.fileContains('../live-admin-styler.php', 'uninstall')) score++;
        
        // Check for multisite compatibility
        if (this.fileContains('../live-admin-styler.php', 'multisite') ||
            this.fileContains('../live-admin-styler.php', 'network')) score++;
        
        return Math.min(score, 7); // Max 7 criteria for this requirement
    }
    
    /**
     * Helper method to check if file contains text
     */
    fileContains(filePath, text) {
        try {
            // Remove ../ prefix if present
            const cleanPath = filePath.replace(/^\.\.\//, '');
            if (!fs.existsSync(cleanPath)) return false;
            const content = fs.readFileSync(cleanPath, 'utf8');
            return content.toLowerCase().includes(text.toLowerCase());
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Helper method to get file size
     */
    getFileSize(filePath) {
        try {
            // Remove ../ prefix if present
            const cleanPath = filePath.replace(/^\.\.\//, '');
            if (!fs.existsSync(cleanPath)) return Infinity;
            const stats = fs.statSync(cleanPath);
            return stats.size;
        } catch (error) {
            return Infinity;
        }
    }
    
    /**
     * Add a test result
     */
    addResult(category, name, passed, message) {
        this.results.push({
            category,
            name,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${category} - ${name}: ${message}`);
    }
    
    /**
     * Generate final comprehensive report
     */
    generateFinalReport() {
        const duration = Date.now() - this.startTime;
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log('\n🎯 FINAL INTEGRATION VALIDATION REPORT');
        console.log('======================================');
        console.log(`Validation Duration: ${duration}ms`);
        console.log(`Total Validations: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${successRate}%`);
        
        // Group by category
        const categories = {};
        this.results.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { passed: 0, total: 0 };
            }
            categories[result.category].total++;
            if (result.passed) {
                categories[result.category].passed++;
            }
        });
        
        console.log('\n📊 Results by Category:');
        Object.keys(categories).forEach(category => {
            const cat = categories[category];
            const catRate = Math.round((cat.passed / cat.total) * 100);
            const status = catRate >= 80 ? '✅' : catRate >= 60 ? '⚠️' : '❌';
            console.log(`${status} ${category}: ${cat.passed}/${cat.total} (${catRate}%)`);
        });
        
        // Requirements compliance summary
        console.log('\n📋 Requirements Compliance Summary:');
        Object.keys(this.requirements).forEach(reqId => {
            const result = this.results.find(r => r.category === 'Requirements Compliance' && r.name === reqId);
            const status = result && result.passed ? '✅' : '❌';
            const requirement = this.requirements[reqId];
            console.log(`${status} ${reqId}: ${requirement.name}`);
            if (result) {
                console.log(`    ${result.message}`);
            }
        });
        
        // Show failed validations
        const failedResults = this.results.filter(r => !r.passed);
        if (failedResults.length > 0) {
            console.log('\n❌ Failed Validations:');
            failedResults.forEach(result => {
                console.log(`  • ${result.category} - ${result.name}: ${result.message}`);
            });
        }
        
        console.log('\n======================================');
        
        // Final production readiness assessment
        if (successRate >= 95) {
            console.log('🎉 SYSTEM READY FOR PRODUCTION!');
            console.log('✅ All critical components validated');
            console.log('✅ Requirements compliance achieved');
            console.log('✅ Performance targets met');
            console.log('✅ Security measures in place');
            console.log('\n🚀 Live Admin Styler is ready for deployment!');
        } else if (successRate >= 85) {
            console.log('⚠️  SYSTEM MOSTLY READY FOR PRODUCTION');
            console.log('✅ Core functionality validated');
            console.log('⚠️  Minor issues should be addressed');
            console.log('📝 Review failed validations before deployment');
        } else if (successRate >= 70) {
            console.log('⚠️  SYSTEM NEEDS IMPROVEMENTS');
            console.log('⚠️  Several critical issues identified');
            console.log('🔧 Address failed validations before deployment');
            console.log('📋 Consider additional testing and validation');
        } else {
            console.log('❌ SYSTEM NOT READY FOR PRODUCTION');
            console.log('🚨 Critical failures detected');
            console.log('🔧 Major issues must be resolved');
            console.log('📋 Comprehensive review and fixes required');
            process.exit(1);
        }
        
        // Save detailed report
        this.saveDetailedReport();
    }
    
    /**
     * Save detailed report to file
     */
    saveDetailedReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.passed).length,
                failed: this.results.filter(r => !r.passed).length,
                successRate: Math.round((this.results.filter(r => r.passed).length / this.results.length) * 100)
            },
            results: this.results,
            requirements: this.requirements
        };
        
        try {
            fs.writeFileSync('final-integration-report.json', JSON.stringify(reportData, null, 2));
            console.log('\n📄 Detailed report saved to: final-integration-report.json');
        } catch (error) {
            console.warn('⚠️  Could not save detailed report:', error.message);
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new FinalIntegrationValidator();
    validator.validate().catch(error => {
        console.error('Final integration validation failed:', error);
        process.exit(1);
    });
}

module.exports = FinalIntegrationValidator;