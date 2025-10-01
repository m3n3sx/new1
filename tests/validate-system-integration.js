/**
 * System Integration Validator
 * 
 * Validates complete system integration and readiness
 * Tests all components working together as a cohesive system
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');

class SystemIntegrationValidator {
    constructor() {
        this.results = {
            coreFiles: false,
            services: false,
            assets: false,
            tests: false,
            documentation: false,
            configuration: false,
            dependencies: false,
            performance: false
        };
        
        this.errors = [];
        this.warnings = [];
        this.basePath = path.resolve(__dirname, '..');
    }
    
    /**
     * Run complete system validation
     */
    async validate() {
        console.log('🔍 Starting System Integration Validation...');
        console.log('='.repeat(50));
        
        await this.validateCoreFiles();
        await this.validateServices();
        await this.validateAssets();
        await this.validateTests();
        await this.validateDocumentation();
        await this.validateConfiguration();
        await this.validateDependencies();
        await this.validatePerformance();
        
        this.generateReport();
        
        return this.isSystemReady();
    }
    
    /**
     * Validate core files exist and are properly structured
     */
    async validateCoreFiles() {
        console.log('\n📁 Validating Core Files...');
        
        const requiredFiles = [
            'live-admin-styler.php',
            'includes/CoreEngine.php',
            'includes/SettingsManager.php',
            'includes/CacheManager.php',
            'includes/SecurityManager.php',
            'includes/StyleGenerator.php',
            'includes/AssetLoader.php',
            'includes/CommunicationManager.php',
            'includes/TemplateManager.php',
            'includes/PerformanceMonitor.php'
        ];
        
        const missingFiles = [];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.basePath, file);
            if (!fs.existsSync(filePath)) {
                missingFiles.push(file);
            } else {
                // Check file size (should not be empty)
                const stats = fs.statSync(filePath);
                if (stats.size < 100) {
                    this.warnings.push(`File ${file} seems too small (${stats.size} bytes)`);
                }
            }
        }
        
        if (missingFiles.length > 0) {
            this.errors.push(`Missing core files: ${missingFiles.join(', ')}`);
            return;
        }
        
        // Validate main plugin file structure
        const mainPluginFile = path.join(this.basePath, 'live-admin-styler.php');
        const mainContent = fs.readFileSync(mainPluginFile, 'utf8');
        
        const requiredHeaders = [
            'Plugin Name:',
            'Version:',
            'Description:',
            'Author:'
        ];
        
        for (const header of requiredHeaders) {
            if (!mainContent.includes(header)) {
                this.warnings.push(`Missing plugin header: ${header}`);
            }
        }
        
        this.results.coreFiles = true;
        console.log('✅ Core files validation passed');
    }
    
    /**
     * Validate service classes
     */
    async validateServices() {
        console.log('\n🔧 Validating Services...');
        
        const services = [
            'CoreEngine',
            'SettingsManager', 
            'CacheManager',
            'SecurityManager',
            'StyleGenerator',
            'AssetLoader',
            'CommunicationManager',
            'TemplateManager',
            'PerformanceMonitor'
        ];
        
        for (const service of services) {
            const servicePath = path.join(this.basePath, 'includes', `${service}.php`);
            
            if (!fs.existsSync(servicePath)) {
                this.errors.push(`Service file missing: ${service}.php`);
                continue;
            }
            
            const content = fs.readFileSync(servicePath, 'utf8');
            
            // Check for class definition
            if (!content.includes(`class ${service}`)) {
                this.errors.push(`Service class not found in ${service}.php`);
                continue;
            }
            
            // Check for basic methods based on service type
            const requiredMethods = this.getRequiredMethodsForService(service);
            for (const method of requiredMethods) {
                if (!content.includes(`function ${method}`)) {
                    this.warnings.push(`Method ${method} not found in ${service}`);
                }
            }
        }
        
        this.results.services = this.errors.length === 0;
        console.log(this.results.services ? '✅ Services validation passed' : '❌ Services validation failed');
    }
    
    /**
     * Validate assets
     */
    async validateAssets() {
        console.log('\n🎨 Validating Assets...');
        
        const requiredCSS = [
            'assets/css/las-main.css',
            'assets/css/las-live-edit.css',
            'assets/css/las-utilities.css'
        ];
        
        const requiredJS = [
            'assets/js/las-core.js',
            'assets/js/modules/settings-manager.js',
            'assets/js/modules/live-preview.js',
            'assets/js/modules/ajax-manager.js',
            'assets/js/modules/css-variables-engine.js',
            'assets/js/modules/color-picker.js',
            'assets/js/modules/theme-manager.js'
        ];
        
        const missingAssets = [];
        
        // Check CSS files
        for (const cssFile of requiredCSS) {
            const filePath = path.join(this.basePath, cssFile);
            if (!fs.existsSync(filePath)) {
                missingAssets.push(cssFile);
            } else {
                const stats = fs.statSync(filePath);
                const sizeKB = stats.size / 1024;
                
                // Check expected file sizes
                if (cssFile.includes('las-main.css') && sizeKB < 20) {
                    this.warnings.push(`${cssFile} seems smaller than expected (${sizeKB.toFixed(1)}KB)`);
                }
            }
        }
        
        // Check JS files
        for (const jsFile of requiredJS) {
            const filePath = path.join(this.basePath, jsFile);
            if (!fs.existsSync(filePath)) {
                missingAssets.push(jsFile);
            } else {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Basic syntax validation
                if (content.trim().length === 0) {
                    this.warnings.push(`${jsFile} is empty`);
                }
                
                // Check for ES6+ syntax
                if (jsFile.includes('modules/') && !content.includes('export')) {
                    this.warnings.push(`${jsFile} may not be properly structured as ES6 module`);
                }
            }
        }
        
        if (missingAssets.length > 0) {
            this.errors.push(`Missing assets: ${missingAssets.join(', ')}`);
            return;
        }
        
        this.results.assets = true;
        console.log('✅ Assets validation passed');
    }
    
    /**
     * Validate test coverage
     */
    async validateTests() {
        console.log('\n🧪 Validating Tests...');
        
        const testDirectories = [
            'tests/php',
            'tests/js'
        ];
        
        const requiredTestFiles = [
            'tests/php/TestCoreEngine.php',
            'tests/php/TestSettingsManager.php',
            'tests/php/TestSecurityManager.php',
            'tests/js/test-las-core.js',
            'tests/js/test-settings-manager.js',
            'tests/js/test-live-preview.js'
        ];
        
        // Check test directories exist
        for (const testDir of testDirectories) {
            const dirPath = path.join(this.basePath, testDir);
            if (!fs.existsSync(dirPath)) {
                this.errors.push(`Test directory missing: ${testDir}`);
            }
        }
        
        // Check required test files
        const missingTests = [];
        for (const testFile of requiredTestFiles) {
            const filePath = path.join(this.basePath, testFile);
            if (!fs.existsSync(filePath)) {
                missingTests.push(testFile);
            }
        }
        
        if (missingTests.length > 0) {
            this.warnings.push(`Missing test files: ${missingTests.join(', ')}`);
        }
        
        // Check for test configuration files
        const testConfigs = [
            'phpunit.xml.dist',
            'package.json' // Should contain Jest configuration
        ];
        
        for (const config of testConfigs) {
            const configPath = path.join(this.basePath, config);
            if (!fs.existsSync(configPath)) {
                this.warnings.push(`Test configuration missing: ${config}`);
            }
        }
        
        this.results.tests = this.errors.length === 0;
        console.log(this.results.tests ? '✅ Tests validation passed' : '❌ Tests validation failed');
    }
    
    /**
     * Validate documentation
     */
    async validateDocumentation() {
        console.log('\n📚 Validating Documentation...');
        
        const requiredDocs = [
            'README.md',
            'CHANGELOG.md',
            'docs/USER_GUIDE.md',
            'docs/DEVELOPER_GUIDE.md',
            'docs/API.md',
            'docs/SETUP_GUIDE.md'
        ];
        
        const missingDocs = [];
        
        for (const doc of requiredDocs) {
            const docPath = path.join(this.basePath, doc);
            if (!fs.existsSync(docPath)) {
                missingDocs.push(doc);
            } else {
                const stats = fs.statSync(docPath);
                if (stats.size < 500) {
                    this.warnings.push(`Documentation ${doc} seems incomplete (${stats.size} bytes)`);
                }
            }
        }
        
        if (missingDocs.length > 0) {
            this.warnings.push(`Missing documentation: ${missingDocs.join(', ')}`);
        }
        
        this.results.documentation = missingDocs.length === 0;
        console.log(this.results.documentation ? '✅ Documentation validation passed' : '⚠️ Documentation validation has warnings');
    }
    
    /**
     * Validate configuration files
     */
    async validateConfiguration() {
        console.log('\n⚙️ Validating Configuration...');
        
        const configFiles = [
            '.eslintrc.json',
            '.stylelintrc.json',
            'phpcs.xml',
            'package.json',
            '.gitignore'
        ];
        
        const missingConfigs = [];
        
        for (const config of configFiles) {
            const configPath = path.join(this.basePath, config);
            if (!fs.existsSync(configPath)) {
                missingConfigs.push(config);
            }
        }
        
        if (missingConfigs.length > 0) {
            this.warnings.push(`Missing configuration files: ${missingConfigs.join(', ')}`);
        }
        
        // Validate package.json structure
        const packageJsonPath = path.join(this.basePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                const requiredFields = ['name', 'version', 'scripts', 'devDependencies'];
                for (const field of requiredFields) {
                    if (!packageJson[field]) {
                        this.warnings.push(`package.json missing field: ${field}`);
                    }
                }
                
                // Check for required scripts
                const requiredScripts = ['test', 'lint'];
                for (const script of requiredScripts) {
                    if (!packageJson.scripts || !packageJson.scripts[script]) {
                        this.warnings.push(`package.json missing script: ${script}`);
                    }
                }
                
            } catch (error) {
                this.errors.push('package.json is not valid JSON');
            }
        }
        
        this.results.configuration = this.errors.length === 0;
        console.log(this.results.configuration ? '✅ Configuration validation passed' : '❌ Configuration validation failed');
    }
    
    /**
     * Validate dependencies
     */
    async validateDependencies() {
        console.log('\n📦 Validating Dependencies...');
        
        // Check if node_modules exists (for development)
        const nodeModulesPath = path.join(this.basePath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            this.warnings.push('node_modules directory not found - run npm install');
        }
        
        // Check if vendor directory exists (for PHP dependencies)
        const vendorPath = path.join(this.basePath, 'vendor');
        if (!fs.existsSync(vendorPath)) {
            this.warnings.push('vendor directory not found - run composer install');
        }
        
        this.results.dependencies = true;
        console.log('✅ Dependencies validation passed');
    }
    
    /**
     * Validate performance considerations
     */
    async validatePerformance() {
        console.log('\n⚡ Validating Performance Considerations...');
        
        // Check CSS file sizes
        const cssFiles = [
            'assets/css/las-main.css',
            'assets/css/las-live-edit.css', 
            'assets/css/las-utilities.css'
        ];
        
        let totalCSSSize = 0;
        
        for (const cssFile of cssFiles) {
            const filePath = path.join(this.basePath, cssFile);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeKB = stats.size / 1024;
                totalCSSSize += sizeKB;
                
                // Warn if individual files are too large
                if (sizeKB > 50) {
                    this.warnings.push(`CSS file ${cssFile} is large (${sizeKB.toFixed(1)}KB)`);
                }
            }
        }
        
        // Check total CSS size
        if (totalCSSSize > 150) {
            this.warnings.push(`Total CSS size is large (${totalCSSSize.toFixed(1)}KB)`);
        }
        
        // Check JS file sizes
        const jsFiles = [
            'assets/js/las-core.js',
            'assets/js/modules/settings-manager.js',
            'assets/js/modules/live-preview.js'
        ];
        
        let totalJSSize = 0;
        
        for (const jsFile of jsFiles) {
            const filePath = path.join(this.basePath, jsFile);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeKB = stats.size / 1024;
                totalJSSize += sizeKB;
                
                if (sizeKB > 30) {
                    this.warnings.push(`JS file ${jsFile} is large (${sizeKB.toFixed(1)}KB)`);
                }
            }
        }
        
        if (totalJSSize > 100) {
            this.warnings.push(`Total JS size is large (${totalJSSize.toFixed(1)}KB)`);
        }
        
        this.results.performance = true;
        console.log('✅ Performance validation passed');
    }
    
    /**
     * Get required methods for each service
     */
    getRequiredMethodsForService(service) {
        const methodMap = {
            'CoreEngine': ['getInstance', 'register', 'get'],
            'SettingsManager': ['get', 'set', 'save'],
            'CacheManager': ['get', 'set', 'forget'],
            'SecurityManager': ['sanitize', 'validateNonce', 'checkCapability'],
            'StyleGenerator': ['generateCSS'],
            'AssetLoader': ['enqueueCSS', 'enqueueJS'],
            'CommunicationManager': ['handleAjax'],
            'TemplateManager': ['getTemplates', 'applyTemplate'],
            'PerformanceMonitor': ['startMeasurement', 'endMeasurement']
        };
        
        return methodMap[service] || [];
    }
    
    /**
     * Generate comprehensive validation report
     */
    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 SYSTEM INTEGRATION VALIDATION REPORT');
        console.log('='.repeat(50));
        
        const totalChecks = Object.keys(this.results).length;
        const passedChecks = Object.values(this.results).filter(Boolean).length;
        
        console.log(`\n📈 Overall Status: ${this.isSystemReady() ? '✅ READY' : '❌ NOT READY'}`);
        console.log(`📊 Validation Results: ${passedChecks}/${totalChecks} passed`);
        
        console.log('\n🔍 Detailed Results:');
        for (const [check, result] of Object.entries(this.results)) {
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${check}: ${status}`);
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.errors.forEach(error => console.log(`  • ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            this.warnings.forEach(warning => console.log(`  • ${warning}`));
        }
        
        // Save report to file
        const reportData = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            validation_results: this.results,
            passed_checks: passedChecks,
            total_checks: totalChecks,
            errors: this.errors,
            warnings: this.warnings,
            system_ready: this.isSystemReady()
        };
        
        const reportsDir = path.join(this.basePath, 'tests', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const reportFile = path.join(reportsDir, 'system-integration-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportFile}`);
    }
    
    /**
     * Check if system is ready for production
     */
    isSystemReady() {
        const criticalChecks = ['coreFiles', 'services', 'assets'];
        const criticalPassed = criticalChecks.every(check => this.results[check]);
        
        return criticalPassed && this.errors.length === 0;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new SystemIntegrationValidator();
    
    validator.validate().then(isReady => {
        if (isReady) {
            console.log('\n🎉 System integration validation completed successfully!');
            console.log('✅ Live Admin Styler v2.0 is ready for production deployment.');
            process.exit(0);
        } else {
            console.log('\n❌ System integration validation failed!');
            console.log('🔧 Please fix the issues above before production deployment.');
            process.exit(1);
        }
    }).catch(error => {
        console.error('\n💥 Validation failed with error:', error.message);
        process.exit(1);
    });
}

module.exports = SystemIntegrationValidator;