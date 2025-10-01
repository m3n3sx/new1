/**
 * Deployment Validation Script for Live Admin Styler
 * 
 * This script validates that the production build is ready for deployment
 * and meets all quality and security standards.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DeploymentValidator {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.buildDir = 'build';
        this.distDir = 'dist';
        
        console.log('🔍 Starting Deployment Validation...');
        console.log('====================================');
    }
    
    /**
     * Run complete deployment validation
     */
    async validate() {
        try {
            // Validate build exists
            await this.validateBuildExists();
            
            // Validate file structure
            await this.validateFileStructure();
            
            // Validate file integrity
            await this.validateFileIntegrity();
            
            // Validate security measures
            await this.validateSecurity();
            
            // Validate performance requirements
            await this.validatePerformance();
            
            // Validate WordPress compatibility
            await this.validateWordPressCompatibility();
            
            // Validate version consistency
            await this.validateVersionConsistency();
            
            // Validate documentation
            await this.validateDocumentation();
            
            // Generate deployment report
            this.generateDeploymentReport();
            
        } catch (error) {
            console.error('❌ Deployment validation failed:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Validate that build directory exists and is populated
     */
    async validateBuildExists() {
        console.log('\n📁 Validating Build Existence...');
        
        // Check build directory
        if (!fs.existsSync(this.buildDir)) {
            throw new Error('Build directory does not exist. Run build script first.');
        }
        
        this.addResult('Build Existence', 'Build Directory', true, 'Build directory exists');
        
        // Check dist directory
        if (!fs.existsSync(this.distDir)) {
            throw new Error('Distribution directory does not exist. Run build script first.');
        }
        
        this.addResult('Build Existence', 'Distribution Directory', true, 'Distribution directory exists');
        
        // Check for deployment packages
        const distFiles = fs.readdirSync(this.distDir);
        const hasZip = distFiles.some(file => file.endsWith('.zip'));
        const hasTarGz = distFiles.some(file => file.endsWith('.tar.gz'));
        
        this.addResult('Build Existence', 'Deployment Packages', hasZip || hasTarGz,
            hasZip && hasTarGz ? 'Both ZIP and TAR.GZ packages available' :
            hasZip ? 'ZIP package available' :
            hasTarGz ? 'TAR.GZ package available' : 'No deployment packages found');
    }
    
    /**
     * Validate file structure is correct
     */
    async validateFileStructure() {
        console.log('\n🏗️  Validating File Structure...');
        
        const requiredFiles = [
            'live-admin-styler.php',
            'README.md',
            'js/admin-settings.js',
            'includes/ajax-handlers.php',
            'includes/SecurityValidator.php',
            'includes/SettingsStorage.php',
            'version.json'
        ];
        
        const requiredDirectories = [
            'assets',
            'assets/js',
            'assets/css',
            'includes',
            'js'
        ];
        
        // Check required files
        let missingFiles = 0;
        for (const file of requiredFiles) {
            const filePath = path.join(this.buildDir, file);
            if (fs.existsSync(filePath)) {
                this.addResult('File Structure', `File: ${file}`, true, 'File exists');
            } else {
                this.addResult('File Structure', `File: ${file}`, false, 'File missing');
                missingFiles++;
            }
        }
        
        // Check required directories
        let missingDirs = 0;
        for (const dir of requiredDirectories) {
            const dirPath = path.join(this.buildDir, dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                this.addResult('File Structure', `Directory: ${dir}`, true, 'Directory exists');
            } else {
                this.addResult('File Structure', `Directory: ${dir}`, false, 'Directory missing');
                missingDirs++;
            }
        }
        
        // Overall structure validation
        const structureValid = missingFiles === 0 && missingDirs === 0;
        this.addResult('File Structure', 'Overall Structure', structureValid,
            `${requiredFiles.length - missingFiles}/${requiredFiles.length} files, ${requiredDirectories.length - missingDirs}/${requiredDirectories.length} directories`);
    }
    
    /**
     * Validate file integrity using checksums
     */
    async validateFileIntegrity() {
        console.log('\n🔐 Validating File Integrity...');
        
        const checksumFile = path.join(this.distDir, 'checksums.json');
        
        if (!fs.existsSync(checksumFile)) {
            this.addResult('File Integrity', 'Checksum File', false, 'checksums.json not found');
            return;
        }
        
        try {
            const checksums = JSON.parse(fs.readFileSync(checksumFile, 'utf8'));
            let validFiles = 0;
            let totalFiles = 0;
            
            for (const [relativePath, expectedHash] of Object.entries(checksums)) {
                totalFiles++;
                const filePath = path.join(this.buildDir, relativePath);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath);
                    const actualHash = crypto.createHash('sha256').update(content).digest('hex');
                    
                    if (actualHash === expectedHash) {
                        validFiles++;
                    } else {
                        this.addResult('File Integrity', `File: ${relativePath}`, false, 'Checksum mismatch');
                    }
                } else {
                    this.addResult('File Integrity', `File: ${relativePath}`, false, 'File missing');
                }
            }
            
            const integrityValid = validFiles === totalFiles;
            this.addResult('File Integrity', 'Overall Integrity', integrityValid,
                `${validFiles}/${totalFiles} files have valid checksums`);
            
        } catch (error) {
            this.addResult('File Integrity', 'Checksum Validation', false, `Error reading checksums: ${error.message}`);
        }
    }
    
    /**
     * Validate security measures are in place
     */
    async validateSecurity() {
        console.log('\n🔒 Validating Security Measures...');
        
        // Check for security headers in PHP files
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let secureFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for ABSPATH protection
            const hasAbspathCheck = content.includes('ABSPATH') || content.includes('defined');
            
            // Check for nonce usage
            const hasNonceUsage = content.includes('wp_verify_nonce') || content.includes('nonce');
            
            // Check for capability checks
            const hasCapabilityCheck = content.includes('current_user_can');
            
            // Check for input sanitization
            const hasSanitization = content.includes('sanitize_') || content.includes('esc_');
            
            const securityScore = [hasAbspathCheck, hasNonceUsage, hasCapabilityCheck, hasSanitization]
                .filter(Boolean).length;
            
            if (securityScore >= 2) {
                secureFiles++;
            }
            
            const fileName = path.basename(file);
            this.addResult('Security', `PHP Security: ${fileName}`, securityScore >= 2,
                `${securityScore}/4 security measures found`);
        }
        
        // Overall security assessment
        const securityValid = secureFiles >= Math.ceil(phpFiles.length * 0.8); // 80% of files should be secure
        this.addResult('Security', 'Overall Security', securityValid,
            `${secureFiles}/${phpFiles.length} PHP files have adequate security measures`);
        
        // Check for sensitive information exposure
        this.validateNoSensitiveInfo();
    }
    
    /**
     * Validate no sensitive information is exposed
     */
    validateNoSensitiveInfo() {
        const allFiles = this.findFiles(this.buildDir, '');
        const sensitivePatterns = [
            /password\s*=\s*['"]\w+['"]/i,
            /api[_-]?key\s*=\s*['"]\w+['"]/i,
            /secret\s*=\s*['"]\w+['"]/i,
            /token\s*=\s*['"]\w+['"]/i,
            /localhost/i,
            /127\.0\.0\.1/,
            /\.local/i
        ];
        
        let exposedFiles = 0;
        
        for (const file of allFiles) {
            if (fs.statSync(file).isFile()) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    for (const pattern of sensitivePatterns) {
                        if (pattern.test(content)) {
                            exposedFiles++;
                            const fileName = path.relative(this.buildDir, file);
                            this.addResult('Security', `Sensitive Info: ${fileName}`, false,
                                'Potentially sensitive information found');
                            break;
                        }
                    }
                } catch (error) {
                    // Skip binary files
                }
            }
        }
        
        this.addResult('Security', 'Sensitive Information', exposedFiles === 0,
            exposedFiles === 0 ? 'No sensitive information exposed' : `${exposedFiles} files may contain sensitive info`);
    }
    
    /**
     * Validate performance requirements
     */
    async validatePerformance() {
        console.log('\n⚡ Validating Performance Requirements...');
        
        // Check file sizes
        const fileSizeChecks = [
            { path: 'js/admin-settings.js', maxSize: 500 * 1024, name: 'Main JavaScript' },
            { path: 'assets/js/modules/browser-compatibility.js', maxSize: 100 * 1024, name: 'Browser Compatibility' }
        ];
        
        for (const check of fileSizeChecks) {
            const filePath = path.join(this.buildDir, check.path);
            
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeOk = stats.size <= check.maxSize;
                const sizeKB = Math.round(stats.size / 1024);
                const maxKB = Math.round(check.maxSize / 1024);
                
                this.addResult('Performance', `File Size: ${check.name}`, sizeOk,
                    `${sizeKB}KB (max: ${maxKB}KB)`);
            } else {
                this.addResult('Performance', `File Size: ${check.name}`, false, 'File not found');
            }
        }
        
        // Check total package size
        const totalSize = this.calculateTotalSize();
        const totalSizeOk = totalSize <= 5 * 1024 * 1024; // 5MB limit
        
        this.addResult('Performance', 'Total Package Size', totalSizeOk,
            `${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB (max: 5MB)`);
        
        // Check for optimization indicators
        this.validateOptimization();
    }
    
    /**
     * Validate optimization has been applied
     */
    validateOptimization() {
        // Check JavaScript minification
        const jsFiles = this.findFiles(this.buildDir, '.js');
        let minifiedJs = 0;
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Simple check for minification (no multi-line comments, reduced whitespace)
            const hasMultiLineComments = /\/\*[\s\S]*?\*\//.test(content);
            const hasExcessiveWhitespace = /\n\s*\n\s*\n/.test(content);
            
            if (!hasMultiLineComments && !hasExcessiveWhitespace) {
                minifiedJs++;
            }
        }
        
        this.addResult('Performance', 'JavaScript Optimization', minifiedJs >= jsFiles.length * 0.8,
            `${minifiedJs}/${jsFiles.length} JavaScript files appear optimized`);
        
        // Check CSS minification
        const cssFiles = this.findFiles(this.buildDir, '.css');
        let minifiedCss = 0;
        
        for (const file of cssFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Simple check for CSS minification
            const hasComments = /\/\*[\s\S]*?\*\//.test(content);
            const hasExcessiveWhitespace = /\n\s*\n/.test(content);
            
            if (!hasComments && !hasExcessiveWhitespace) {
                minifiedCss++;
            }
        }
        
        if (cssFiles.length > 0) {
            this.addResult('Performance', 'CSS Optimization', minifiedCss >= cssFiles.length * 0.8,
                `${minifiedCss}/${cssFiles.length} CSS files appear optimized`);
        }
    }
    
    /**
     * Calculate total package size
     */
    calculateTotalSize() {
        const files = this.findFiles(this.buildDir, '');
        let totalSize = 0;
        
        for (const file of files) {
            if (fs.statSync(file).isFile()) {
                totalSize += fs.statSync(file).size;
            }
        }
        
        return totalSize;
    }
    
    /**
     * Validate WordPress compatibility
     */
    async validateWordPressCompatibility() {
        console.log('\n🔌 Validating WordPress Compatibility...');
        
        // Check main plugin file
        const mainPluginFile = path.join(this.buildDir, 'live-admin-styler.php');
        
        if (fs.existsSync(mainPluginFile)) {
            const content = fs.readFileSync(mainPluginFile, 'utf8');
            
            // Check plugin headers
            const hasPluginName = /Plugin Name:/i.test(content);
            const hasVersion = /Version:/i.test(content);
            const hasDescription = /Description:/i.test(content);
            const hasAuthor = /Author:/i.test(content);
            
            this.addResult('WordPress Compatibility', 'Plugin Headers', 
                hasPluginName && hasVersion && hasDescription,
                `Headers present: Name(${hasPluginName}), Version(${hasVersion}), Description(${hasDescription}), Author(${hasAuthor})`);
            
            // Check WordPress functions usage
            const wpFunctions = [
                'wp_enqueue_script',
                'wp_enqueue_style',
                'add_action',
                'wp_localize_script'
            ];
            
            let wpFunctionCount = 0;
            for (const func of wpFunctions) {
                if (content.includes(func)) {
                    wpFunctionCount++;
                }
            }
            
            this.addResult('WordPress Compatibility', 'WordPress Functions', wpFunctionCount >= 3,
                `${wpFunctionCount}/${wpFunctions.length} essential WordPress functions used`);
            
        } else {
            this.addResult('WordPress Compatibility', 'Main Plugin File', false, 'live-admin-styler.php not found');
        }
        
        // Check for WordPress coding standards
        this.validateWordPressCodingStandards();
    }
    
    /**
     * Validate WordPress coding standards
     */
    validateWordPressCodingStandards() {
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let standardsCompliant = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for proper PHP opening tags
            const hasProperPhpTag = content.startsWith('<?php');
            
            // Check for security measures
            const hasSecurityCheck = content.includes('ABSPATH') || content.includes('defined');
            
            // Check for proper class naming (if applicable)
            const classMatches = content.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/g);
            let hasProperNaming = true;
            if (classMatches) {
                hasProperNaming = classMatches.every(match => {
                    const className = match.replace('class ', '');
                    return className.startsWith('LAS_') || className.includes('LAS');
                });
            }
            
            if (hasProperPhpTag && hasSecurityCheck && hasProperNaming) {
                standardsCompliant++;
            }
        }
        
        this.addResult('WordPress Compatibility', 'Coding Standards', 
            standardsCompliant >= phpFiles.length * 0.8,
            `${standardsCompliant}/${phpFiles.length} PHP files follow WordPress coding standards`);
    }
    
    /**
     * Validate version consistency across files
     */
    async validateVersionConsistency() {
        console.log('\n📋 Validating Version Consistency...');
        
        const versions = {};
        
        // Check version.json
        const versionFile = path.join(this.buildDir, 'version.json');
        if (fs.existsSync(versionFile)) {
            try {
                const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
                versions.versionJson = versionData.version;
            } catch (error) {
                this.addResult('Version Consistency', 'version.json', false, 'Invalid JSON format');
            }
        }
        
        // Check main plugin file
        const mainFile = path.join(this.buildDir, 'live-admin-styler.php');
        if (fs.existsSync(mainFile)) {
            const content = fs.readFileSync(mainFile, 'utf8');
            const versionMatch = content.match(/Version:\s*([^\n\r]+)/);
            if (versionMatch) {
                versions.pluginFile = versionMatch[1].trim();
            }
        }
        
        // Check package.json if exists
        const packageFile = 'package.json';
        if (fs.existsSync(packageFile)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
                versions.packageJson = pkg.version;
            } catch (error) {
                // Ignore if package.json is invalid
            }
        }
        
        // Validate consistency
        const versionValues = Object.values(versions);
        const isConsistent = versionValues.length > 0 && versionValues.every(v => v === versionValues[0]);
        
        this.addResult('Version Consistency', 'Version Consistency', isConsistent,
            isConsistent ? `All versions match: ${versionValues[0]}` : 
            `Version mismatch: ${JSON.stringify(versions)}`);
    }
    
    /**
     * Validate documentation is complete
     */
    async validateDocumentation() {
        console.log('\n📚 Validating Documentation...');
        
        const requiredDocs = [
            { file: `${this.distDir}/DEPLOYMENT.md`, name: 'Deployment Guide' },
            { file: `${this.distDir}/INSTALLATION.md`, name: 'Installation Guide' },
            { file: `${this.distDir}/UPGRADE.md`, name: 'Upgrade Guide' },
            { file: `${this.buildDir}/README.md`, name: 'README' }
        ];
        
        let docsPresent = 0;
        
        for (const doc of requiredDocs) {
            if (fs.existsSync(doc.file)) {
                const stats = fs.statSync(doc.file);
                const hasContent = stats.size > 100; // At least 100 bytes
                
                this.addResult('Documentation', doc.name, hasContent,
                    hasContent ? `Present (${stats.size} bytes)` : 'File too small');
                
                if (hasContent) docsPresent++;
            } else {
                this.addResult('Documentation', doc.name, false, 'File missing');
            }
        }
        
        this.addResult('Documentation', 'Overall Documentation', docsPresent >= 3,
            `${docsPresent}/${requiredDocs.length} documentation files present`);
    }
    
    /**
     * Find files with specific extension
     */
    findFiles(dir, extension) {
        const files = [];
        
        if (!fs.existsSync(dir)) {
            return files;
        }
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                files.push(...this.findFiles(fullPath, extension));
            } else if (!extension || entry.name.endsWith(extension)) {
                files.push(fullPath);
            }
        }
        
        return files;
    }
    
    /**
     * Add a validation result
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
     * Generate deployment report
     */
    generateDeploymentReport() {
        const duration = Date.now() - this.startTime;
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log('\n🎯 DEPLOYMENT VALIDATION REPORT');
        console.log('===============================');
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
            const status = catRate >= 90 ? '✅' : catRate >= 70 ? '⚠️' : '❌';
            console.log(`${status} ${category}: ${cat.passed}/${cat.total} (${catRate}%)`);
        });
        
        // Show failed validations
        const failedResults = this.results.filter(r => !r.passed);
        if (failedResults.length > 0) {
            console.log('\n❌ Failed Validations:');
            failedResults.forEach(result => {
                console.log(`  • ${result.category} - ${result.name}: ${result.message}`);
            });
        }
        
        console.log('\n===============================');
        
        // Final deployment readiness assessment
        if (successRate >= 95) {
            console.log('🎉 READY FOR DEPLOYMENT!');
            console.log('✅ All critical validations passed');
            console.log('✅ Security measures verified');
            console.log('✅ Performance requirements met');
            console.log('✅ WordPress compatibility confirmed');
            console.log('\n🚀 Package is ready for production deployment!');
        } else if (successRate >= 85) {
            console.log('⚠️  MOSTLY READY FOR DEPLOYMENT');
            console.log('✅ Core validations passed');
            console.log('⚠️  Minor issues should be addressed');
            console.log('📝 Review failed validations before deployment');
        } else if (successRate >= 70) {
            console.log('⚠️  DEPLOYMENT NEEDS ATTENTION');
            console.log('⚠️  Several issues identified');
            console.log('🔧 Address failed validations before deployment');
            console.log('📋 Consider additional testing');
        } else {
            console.log('❌ NOT READY FOR DEPLOYMENT');
            console.log('🚨 Critical issues detected');
            console.log('🔧 Major problems must be resolved');
            console.log('📋 Comprehensive review required');
            process.exit(1);
        }
        
        // Save detailed report
        this.saveDetailedReport(successRate);
    }
    
    /**
     * Save detailed deployment report
     */
    saveDetailedReport(successRate) {
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            deploymentReady: successRate >= 85,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.passed).length,
                failed: this.results.filter(r => !r.passed).length,
                successRate: successRate
            },
            results: this.results,
            recommendations: this.generateRecommendations()
        };
        
        try {
            fs.writeFileSync(`${this.distDir}/deployment-validation-report.json`, 
                JSON.stringify(reportData, null, 2));
            console.log('\n📄 Detailed report saved to: dist/deployment-validation-report.json');
        } catch (error) {
            console.warn('⚠️  Could not save detailed report:', error.message);
        }
    }
    
    /**
     * Generate recommendations based on validation results
     */
    generateRecommendations() {
        const failedResults = this.results.filter(r => !r.passed);
        const recommendations = [];
        
        // Security recommendations
        const securityFailures = failedResults.filter(r => r.category === 'Security');
        if (securityFailures.length > 0) {
            recommendations.push({
                category: 'Security',
                priority: 'High',
                message: 'Address security vulnerabilities before deployment',
                actions: [
                    'Review PHP files for proper ABSPATH checks',
                    'Ensure nonce validation is implemented',
                    'Add capability checks to admin functions',
                    'Remove any sensitive information from code'
                ]
            });
        }
        
        // Performance recommendations
        const performanceFailures = failedResults.filter(r => r.category === 'Performance');
        if (performanceFailures.length > 0) {
            recommendations.push({
                category: 'Performance',
                priority: 'Medium',
                message: 'Optimize files to meet performance requirements',
                actions: [
                    'Minify JavaScript and CSS files',
                    'Reduce file sizes where possible',
                    'Optimize images and assets',
                    'Consider code splitting for large files'
                ]
            });
        }
        
        // WordPress compatibility recommendations
        const wpFailures = failedResults.filter(r => r.category === 'WordPress Compatibility');
        if (wpFailures.length > 0) {
            recommendations.push({
                category: 'WordPress Compatibility',
                priority: 'High',
                message: 'Ensure full WordPress compatibility',
                actions: [
                    'Add proper plugin headers',
                    'Follow WordPress coding standards',
                    'Use WordPress functions correctly',
                    'Test with latest WordPress version'
                ]
            });
        }
        
        return recommendations;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new DeploymentValidator();
    validator.validate().catch(error => {
        console.error('Deployment validation failed:', error);
        process.exit(1);
    });
}

module.exports = DeploymentValidator;