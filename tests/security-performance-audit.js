/**
 * Security and Performance Audit for Live Admin Styler
 * 
 * This comprehensive audit validates security measures and performance
 * requirements for production deployment.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityPerformanceAuditor {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.buildDir = 'build';
        this.securityThreshold = 85; // Minimum security score
        this.performanceThreshold = 90; // Minimum performance score
        
        console.log('🔍 Starting Security & Performance Audit...');
        console.log('===========================================');
    }
    
    /**
     * Run complete security and performance audit
     */
    async audit() {
        try {
            // Security Audit
            await this.auditSecurity();
            
            // Performance Audit
            await this.auditPerformance();
            
            // Code Quality Audit
            await this.auditCodeQuality();
            
            // Vulnerability Scan
            await this.scanVulnerabilities();
            
            // Performance Benchmarks
            await this.runPerformanceBenchmarks();
            
            // Generate final audit report
            this.generateAuditReport();
            
        } catch (error) {
            console.error('❌ Security & Performance audit failed:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Comprehensive security audit
     */
    async auditSecurity() {
        console.log('\n🔒 Security Audit...');
        
        // Input validation and sanitization
        await this.auditInputValidation();
        
        // Authentication and authorization
        await this.auditAuthenticationAuthorization();
        
        // Data protection
        await this.auditDataProtection();
        
        // CSRF protection
        await this.auditCSRFProtection();
        
        // SQL injection prevention
        await this.auditSQLInjectionPrevention();
        
        // XSS prevention
        await this.auditXSSPrevention();
        
        // File security
        await this.auditFileSecurity();
        
        // Configuration security
        await this.auditConfigurationSecurity();
    }
    
    /**
     * Audit input validation and sanitization
     */
    async auditInputValidation() {
        console.log('\n🛡️  Auditing Input Validation...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let validationScore = 0;
        let totalChecks = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for sanitization functions
            const sanitizationFunctions = [
                'sanitize_text_field',
                'sanitize_textarea_field',
                'sanitize_email',
                'sanitize_url',
                'esc_html',
                'esc_attr',
                'wp_strip_all_tags'
            ];
            
            let sanitizationCount = 0;
            for (const func of sanitizationFunctions) {
                if (content.includes(func)) {
                    sanitizationCount++;
                }
            }
            
            // Check for validation patterns
            const validationPatterns = [
                /is_email\s*\(/,
                /filter_var\s*\(/,
                /preg_match\s*\(/,
                /wp_verify_nonce\s*\(/,
                /current_user_can\s*\(/
            ];
            
            let validationCount = 0;
            for (const pattern of validationPatterns) {
                if (pattern.test(content)) {
                    validationCount++;
                }
            }
            
            const fileScore = (sanitizationCount + validationCount) / 10 * 100;
            validationScore += fileScore;
            totalChecks++;
            
            this.addResult('Security - Input Validation', `File: ${fileName}`, fileScore >= 30,
                `Sanitization: ${sanitizationCount}/7, Validation: ${validationCount}/5 (Score: ${fileScore.toFixed(0)}%)`);
        }
        
        const overallScore = totalChecks > 0 ? validationScore / totalChecks : 0;
        this.addResult('Security - Input Validation', 'Overall Input Validation', overallScore >= 50,
            `Average score: ${overallScore.toFixed(1)}% across ${totalChecks} files`);
    }
    
    /**
     * Audit authentication and authorization
     */
    async auditAuthenticationAuthorization() {
        console.log('\n👤 Auditing Authentication & Authorization...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let authScore = 0;
        let totalFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for capability checks
            const hasCapabilityCheck = content.includes('current_user_can');
            
            // Check for nonce verification
            const hasNonceCheck = content.includes('wp_verify_nonce');
            
            // Check for user authentication
            const hasAuthCheck = content.includes('is_user_logged_in') || 
                                content.includes('wp_get_current_user') ||
                                content.includes('get_current_user_id');
            
            // Check for admin checks
            const hasAdminCheck = content.includes('is_admin') || 
                                content.includes('admin_url') ||
                                content.includes('manage_options');
            
            const authChecks = [hasCapabilityCheck, hasNonceCheck, hasAuthCheck, hasAdminCheck];
            const fileAuthScore = authChecks.filter(Boolean).length / authChecks.length * 100;
            
            if (content.includes('wp_ajax_') || content.includes('admin_') || content.includes('settings')) {
                authScore += fileAuthScore;
                totalFiles++;
                
                this.addResult('Security - Authentication', `File: ${fileName}`, fileAuthScore >= 50,
                    `Auth checks: ${authChecks.filter(Boolean).length}/4 (Score: ${fileAuthScore.toFixed(0)}%)`);
            }
        }
        
        const overallAuthScore = totalFiles > 0 ? authScore / totalFiles : 0;
        this.addResult('Security - Authentication', 'Overall Authentication', overallAuthScore >= 60,
            `Average auth score: ${overallAuthScore.toFixed(1)}% across ${totalFiles} relevant files`);
    }
    
    /**
     * Audit data protection
     */
    async auditDataProtection() {
        console.log('\n🔐 Auditing Data Protection...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let protectionScore = 0;
        let totalFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for data encryption/hashing
            const hasEncryption = content.includes('wp_hash') || 
                                content.includes('hash') ||
                                content.includes('password_hash') ||
                                content.includes('wp_generate_password');
            
            // Check for secure data storage
            const hasSecureStorage = content.includes('update_option') ||
                                   content.includes('add_option') ||
                                   content.includes('wp_cache_');
            
            // Check for data validation before storage
            const hasValidation = content.includes('validate') ||
                                content.includes('sanitize') ||
                                content.includes('filter_var');
            
            // Check for proper error handling
            const hasErrorHandling = content.includes('try') ||
                                   content.includes('catch') ||
                                   content.includes('error_log');
            
            const protectionChecks = [hasEncryption, hasSecureStorage, hasValidation, hasErrorHandling];
            const fileProtectionScore = protectionChecks.filter(Boolean).length / protectionChecks.length * 100;
            
            if (content.includes('settings') || content.includes('data') || content.includes('storage')) {
                protectionScore += fileProtectionScore;
                totalFiles++;
                
                this.addResult('Security - Data Protection', `File: ${fileName}`, fileProtectionScore >= 50,
                    `Protection measures: ${protectionChecks.filter(Boolean).length}/4 (Score: ${fileProtectionScore.toFixed(0)}%)`);
            }
        }
        
        const overallProtectionScore = totalFiles > 0 ? protectionScore / totalFiles : 0;
        this.addResult('Security - Data Protection', 'Overall Data Protection', overallProtectionScore >= 60,
            `Average protection score: ${overallProtectionScore.toFixed(1)}% across ${totalFiles} relevant files`);
    }
    
    /**
     * Audit CSRF protection
     */
    async auditCSRFProtection() {
        console.log('\n🛡️  Auditing CSRF Protection...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let csrfProtectedFiles = 0;
        let ajaxFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check if file handles AJAX requests
            if (content.includes('wp_ajax_') || content.includes('$_POST') || content.includes('$_GET')) {
                ajaxFiles++;
                
                // Check for nonce verification
                const hasNonceVerification = content.includes('wp_verify_nonce');
                
                // Check for nonce creation
                const hasNonceCreation = content.includes('wp_create_nonce') ||
                                       content.includes('wp_nonce_field') ||
                                       content.includes('wp_localize_script');
                
                if (hasNonceVerification) {
                    csrfProtectedFiles++;
                    this.addResult('Security - CSRF Protection', `File: ${fileName}`, true,
                        `CSRF protection implemented (nonce verification: ${hasNonceVerification})`);
                } else {
                    this.addResult('Security - CSRF Protection', `File: ${fileName}`, false,
                        'Missing CSRF protection (no nonce verification)');
                }
            }
        }
        
        const csrfScore = ajaxFiles > 0 ? (csrfProtectedFiles / ajaxFiles) * 100 : 100;
        this.addResult('Security - CSRF Protection', 'Overall CSRF Protection', csrfScore >= 80,
            `${csrfProtectedFiles}/${ajaxFiles} AJAX files have CSRF protection (${csrfScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit SQL injection prevention
     */
    async auditSQLInjectionPrevention() {
        console.log('\n💉 Auditing SQL Injection Prevention...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let sqlFiles = 0;
        let protectedSqlFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check if file contains SQL operations
            if (content.includes('$wpdb') || content.includes('SELECT') || 
                content.includes('INSERT') || content.includes('UPDATE') || content.includes('DELETE')) {
                sqlFiles++;
                
                // Check for prepared statements
                const hasPreparedStatements = content.includes('prepare') ||
                                            content.includes('$wpdb->prepare');
                
                // Check for input sanitization
                const hasSanitization = content.includes('sanitize_') ||
                                      content.includes('esc_sql') ||
                                      content.includes('intval') ||
                                      content.includes('floatval');
                
                // Check for dangerous patterns
                const hasDangerousPatterns = /\$wpdb->query\s*\(\s*[^$]/.test(content) ||
                                           /\$wpdb->get_/.test(content.replace(/\$wpdb->prepare/, ''));
                
                if ((hasPreparedStatements || hasSanitization) && !hasDangerousPatterns) {
                    protectedSqlFiles++;
                    this.addResult('Security - SQL Injection', `File: ${fileName}`, true,
                        `SQL injection protection (prepared: ${hasPreparedStatements}, sanitized: ${hasSanitization})`);
                } else {
                    this.addResult('Security - SQL Injection', `File: ${fileName}`, false,
                        `Potential SQL injection risk (dangerous patterns: ${hasDangerousPatterns})`);
                }
            }
        }
        
        const sqlScore = sqlFiles > 0 ? (protectedSqlFiles / sqlFiles) * 100 : 100;
        this.addResult('Security - SQL Injection', 'Overall SQL Injection Prevention', sqlScore >= 90,
            `${protectedSqlFiles}/${sqlFiles} SQL files are protected (${sqlScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit XSS prevention
     */
    async auditXSSPrevention() {
        console.log('\n🚫 Auditing XSS Prevention...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let outputFiles = 0;
        let protectedOutputFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check if file outputs data
            if (content.includes('echo') || content.includes('print') || 
                content.includes('printf') || content.includes('?>')) {
                outputFiles++;
                
                // Check for output escaping
                const hasEscaping = content.includes('esc_html') ||
                                  content.includes('esc_attr') ||
                                  content.includes('esc_url') ||
                                  content.includes('wp_kses');
                
                // Check for dangerous output patterns
                const hasDangerousOutput = /echo\s+\$[^;]*;/.test(content) ||
                                         /print\s+\$[^;]*;/.test(content);
                
                if (hasEscaping && !hasDangerousOutput) {
                    protectedOutputFiles++;
                    this.addResult('Security - XSS Prevention', `File: ${fileName}`, true,
                        'XSS prevention implemented (proper output escaping)');
                } else {
                    this.addResult('Security - XSS Prevention', `File: ${fileName}`, false,
                        `Potential XSS risk (escaping: ${hasEscaping}, dangerous: ${hasDangerousOutput})`);
                }
            }
        }
        
        const xssScore = outputFiles > 0 ? (protectedOutputFiles / outputFiles) * 100 : 100;
        this.addResult('Security - XSS Prevention', 'Overall XSS Prevention', xssScore >= 80,
            `${protectedOutputFiles}/${outputFiles} output files are protected (${xssScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit file security
     */
    async auditFileSecurity() {
        console.log('\n📁 Auditing File Security...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let secureFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for ABSPATH protection
            const hasAbspathProtection = content.includes('ABSPATH') ||
                                       content.includes('defined(\'ABSPATH\')') ||
                                       content.includes('defined("ABSPATH")');
            
            // Check for proper PHP opening tag
            const hasProperPhpTag = content.startsWith('<?php');
            
            // Check for file inclusion security
            const hasSecureInclusion = !content.includes('include $_') &&
                                     !content.includes('require $_') &&
                                     !content.includes('include_once $_') &&
                                     !content.includes('require_once $_');
            
            const securityChecks = [hasAbspathProtection, hasProperPhpTag, hasSecureInclusion];
            const fileSecurityScore = securityChecks.filter(Boolean).length;
            
            if (fileSecurityScore >= 2) {
                secureFiles++;
            }
            
            this.addResult('Security - File Security', `File: ${fileName}`, fileSecurityScore >= 2,
                `Security checks: ${fileSecurityScore}/3 (ABSPATH: ${hasAbspathProtection}, PHP tag: ${hasProperPhpTag}, Secure inclusion: ${hasSecureInclusion})`);
        }
        
        const fileSecurityScore = (secureFiles / phpFiles.length) * 100;
        this.addResult('Security - File Security', 'Overall File Security', fileSecurityScore >= 90,
            `${secureFiles}/${phpFiles.length} files are secure (${fileSecurityScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit configuration security
     */
    async auditConfigurationSecurity() {
        console.log('\n⚙️  Auditing Configuration Security...');
        
        // Check for hardcoded credentials
        const allFiles = this.findFiles(this.buildDir, '');
        let credentialIssues = 0;
        
        const credentialPatterns = [
            /password\s*=\s*['"]\w+['"]/i,
            /api[_-]?key\s*=\s*['"]\w+['"]/i,
            /secret\s*=\s*['"]\w+['"]/i,
            /token\s*=\s*['"]\w+['"]/i
        ];
        
        for (const file of allFiles) {
            if (fs.statSync(file).isFile()) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    const fileName = path.basename(file);
                    
                    for (const pattern of credentialPatterns) {
                        if (pattern.test(content)) {
                            credentialIssues++;
                            this.addResult('Security - Configuration', `Credentials: ${fileName}`, false,
                                'Hardcoded credentials detected');
                            break;
                        }
                    }
                } catch (error) {
                    // Skip binary files
                }
            }
        }
        
        this.addResult('Security - Configuration', 'Hardcoded Credentials', credentialIssues === 0,
            credentialIssues === 0 ? 'No hardcoded credentials found' : `${credentialIssues} files contain potential credentials`);
        
        // Check for debug information
        let debugIssues = 0;
        for (const file of allFiles) {
            if (fs.statSync(file).isFile() && file.endsWith('.php')) {
                const content = fs.readFileSync(file, 'utf8');
                
                if (content.includes('var_dump') || content.includes('print_r') || 
                    content.includes('WP_DEBUG') || content.includes('error_reporting')) {
                    debugIssues++;
                }
            }
        }
        
        this.addResult('Security - Configuration', 'Debug Information', debugIssues === 0,
            debugIssues === 0 ? 'No debug information in production code' : `${debugIssues} files contain debug code`);
    }
    
    /**
     * Comprehensive performance audit
     */
    async auditPerformance() {
        console.log('\n⚡ Performance Audit...');
        
        // File size optimization
        await this.auditFileSizes();
        
        // Code optimization
        await this.auditCodeOptimization();
        
        // Database performance
        await this.auditDatabasePerformance();
        
        // Caching implementation
        await this.auditCaching();
        
        // Asset optimization
        await this.auditAssetOptimization();
        
        // Memory usage
        await this.auditMemoryUsage();
    }
    
    /**
     * Audit file sizes for performance
     */
    async auditFileSizes() {
        console.log('\n📏 Auditing File Sizes...');
        
        const sizeChecks = [
            { path: 'js/admin-settings.js', maxSize: 500 * 1024, name: 'Main JavaScript' },
            { path: 'assets/js/modules/browser-compatibility.js', maxSize: 100 * 1024, name: 'Browser Compatibility' },
            { path: 'assets/css/admin-style.css', maxSize: 200 * 1024, name: 'Main CSS' },
            { path: 'live-admin-styler.php', maxSize: 300 * 1024, name: 'Main Plugin File' }
        ];
        
        let optimizedFiles = 0;
        
        for (const check of sizeChecks) {
            const filePath = path.join(this.buildDir, check.path);
            
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeOk = stats.size <= check.maxSize;
                const sizeKB = Math.round(stats.size / 1024);
                const maxKB = Math.round(check.maxSize / 1024);
                
                if (sizeOk) optimizedFiles++;
                
                this.addResult('Performance - File Sizes', check.name, sizeOk,
                    `${sizeKB}KB (max: ${maxKB}KB) - ${sizeOk ? 'Optimized' : 'Too large'}`);
            } else {
                this.addResult('Performance - File Sizes', check.name, false, 'File not found');
            }
        }
        
        // Total package size
        const totalSize = this.calculateTotalSize();
        const totalSizeOk = totalSize <= 5 * 1024 * 1024; // 5MB limit
        
        this.addResult('Performance - File Sizes', 'Total Package Size', totalSizeOk,
            `${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB (max: 5MB)`);
    }
    
    /**
     * Audit code optimization
     */
    async auditCodeOptimization() {
        console.log('\n🔧 Auditing Code Optimization...');
        
        // JavaScript optimization
        const jsFiles = this.findFiles(this.buildDir, '.js');
        let optimizedJs = 0;
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for minification indicators
            const isMinified = !content.includes('  ') && // No double spaces
                             !content.includes('\n\n') && // No double newlines
                             !content.includes('/* ') && // No spaced comments
                             content.length < content.replace(/\s+/g, ' ').length * 1.5;
            
            if (isMinified) optimizedJs++;
            
            this.addResult('Performance - Code Optimization', `JS: ${fileName}`, isMinified,
                isMinified ? 'Minified' : 'Not minified');
        }
        
        // CSS optimization
        const cssFiles = this.findFiles(this.buildDir, '.css');
        let optimizedCss = 0;
        
        for (const file of cssFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for CSS minification
            const isMinified = !content.includes('  ') &&
                             !content.includes('\n\n') &&
                             !content.includes('/* ');
            
            if (isMinified) optimizedCss++;
            
            this.addResult('Performance - Code Optimization', `CSS: ${fileName}`, isMinified,
                isMinified ? 'Minified' : 'Not minified');
        }
        
        const jsOptimizationScore = jsFiles.length > 0 ? (optimizedJs / jsFiles.length) * 100 : 100;
        const cssOptimizationScore = cssFiles.length > 0 ? (optimizedCss / cssFiles.length) * 100 : 100;
        
        this.addResult('Performance - Code Optimization', 'JavaScript Optimization', jsOptimizationScore >= 80,
            `${optimizedJs}/${jsFiles.length} JS files optimized (${jsOptimizationScore.toFixed(1)}%)`);
        
        this.addResult('Performance - Code Optimization', 'CSS Optimization', cssOptimizationScore >= 80,
            `${optimizedCss}/${cssFiles.length} CSS files optimized (${cssOptimizationScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit database performance
     */
    async auditDatabasePerformance() {
        console.log('\n🗄️  Auditing Database Performance...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let dbOptimizedFiles = 0;
        let dbFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check if file uses database operations
            if (content.includes('$wpdb') || content.includes('get_option') || 
                content.includes('update_option') || content.includes('wp_cache_')) {
                dbFiles++;
                
                // Check for performance optimizations
                const hasPreparedStatements = content.includes('prepare');
                const hasCaching = content.includes('wp_cache_') || content.includes('transient');
                const hasBatchOperations = content.includes('batch') || content.includes('bulk');
                const hasIndexing = content.includes('INDEX') || content.includes('KEY');
                
                const optimizations = [hasPreparedStatements, hasCaching, hasBatchOperations, hasIndexing];
                const optimizationScore = optimizations.filter(Boolean).length;
                
                if (optimizationScore >= 2) {
                    dbOptimizedFiles++;
                }
                
                this.addResult('Performance - Database', `File: ${fileName}`, optimizationScore >= 2,
                    `DB optimizations: ${optimizationScore}/4 (Prepared: ${hasPreparedStatements}, Cache: ${hasCaching}, Batch: ${hasBatchOperations}, Index: ${hasIndexing})`);
            }
        }
        
        const dbPerformanceScore = dbFiles > 0 ? (dbOptimizedFiles / dbFiles) * 100 : 100;
        this.addResult('Performance - Database', 'Overall Database Performance', dbPerformanceScore >= 70,
            `${dbOptimizedFiles}/${dbFiles} database files optimized (${dbPerformanceScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit caching implementation
     */
    async auditCaching() {
        console.log('\n💾 Auditing Caching Implementation...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let cachingFiles = 0;
        let totalFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check if file should implement caching
            if (content.includes('get_option') || content.includes('$wpdb') || 
                content.includes('wp_remote_') || content.includes('file_get_contents')) {
                totalFiles++;
                
                // Check for caching implementation
                const hasWpCache = content.includes('wp_cache_get') || content.includes('wp_cache_set');
                const hasTransients = content.includes('get_transient') || content.includes('set_transient');
                const hasObjectCache = content.includes('wp_cache_') || content.includes('object-cache');
                
                if (hasWpCache || hasTransients || hasObjectCache) {
                    cachingFiles++;
                    this.addResult('Performance - Caching', `File: ${fileName}`, true,
                        `Caching implemented (WP Cache: ${hasWpCache}, Transients: ${hasTransients}, Object Cache: ${hasObjectCache})`);
                } else {
                    this.addResult('Performance - Caching', `File: ${fileName}`, false,
                        'No caching implementation found');
                }
            }
        }
        
        const cachingScore = totalFiles > 0 ? (cachingFiles / totalFiles) * 100 : 100;
        this.addResult('Performance - Caching', 'Overall Caching Implementation', cachingScore >= 60,
            `${cachingFiles}/${totalFiles} files implement caching (${cachingScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit asset optimization
     */
    async auditAssetOptimization() {
        console.log('\n🎨 Auditing Asset Optimization...');
        
        // Check for asset compression
        const jsFiles = this.findFiles(this.buildDir, '.js');
        const cssFiles = this.findFiles(this.buildDir, '.css');
        
        let compressionRatio = 0;
        let totalFiles = 0;
        
        // Estimate compression by comparing file sizes
        for (const file of [...jsFiles, ...cssFiles]) {
            const content = fs.readFileSync(file, 'utf8');
            const originalSize = content.length;
            const compressedSize = content.replace(/\s+/g, ' ').trim().length;
            
            const fileCompressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
            compressionRatio += fileCompressionRatio;
            totalFiles++;
        }
        
        const avgCompressionRatio = totalFiles > 0 ? compressionRatio / totalFiles : 0;
        
        this.addResult('Performance - Asset Optimization', 'Compression Ratio', avgCompressionRatio >= 20,
            `Average compression: ${avgCompressionRatio.toFixed(1)}% (target: 20%+)`);
        
        // Check for asset concatenation opportunities
        const jsModules = this.findFiles(path.join(this.buildDir, 'assets/js/modules'), '.js');
        const hasManyModules = jsModules.length > 10;
        
        this.addResult('Performance - Asset Optimization', 'Asset Concatenation', !hasManyModules,
            hasManyModules ? `${jsModules.length} JS modules (consider concatenation)` : 'Reasonable number of assets');
    }
    
    /**
     * Audit memory usage patterns
     */
    async auditMemoryUsage() {
        console.log('\n🧠 Auditing Memory Usage...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let memoryOptimizedFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for memory optimization patterns
            const hasUnset = content.includes('unset(');
            const hasMemoryLimit = content.includes('memory_limit') || content.includes('ini_set');
            const hasLargeArrays = /\$\w+\s*=\s*array\s*\(/.test(content) && content.length > 10000;
            const hasMemoryMonitoring = content.includes('memory_get_usage') || content.includes('memory_get_peak_usage');
            
            // Check for potential memory issues
            const hasGlobalVars = content.includes('global $') && content.split('global $').length > 3;
            const hasLargeLoops = /for\s*\([^)]*\$\w+\s*<\s*\d{4,}/.test(content);
            
            const memoryScore = [hasUnset, hasMemoryMonitoring, !hasGlobalVars, !hasLargeLoops].filter(Boolean).length;
            
            if (memoryScore >= 2) {
                memoryOptimizedFiles++;
            }
            
            this.addResult('Performance - Memory Usage', `File: ${fileName}`, memoryScore >= 2,
                `Memory optimization score: ${memoryScore}/4 (Unset: ${hasUnset}, Monitoring: ${hasMemoryMonitoring}, No excessive globals: ${!hasGlobalVars}, No large loops: ${!hasLargeLoops})`);
        }
        
        const memoryScore = (memoryOptimizedFiles / phpFiles.length) * 100;
        this.addResult('Performance - Memory Usage', 'Overall Memory Optimization', memoryScore >= 70,
            `${memoryOptimizedFiles}/${phpFiles.length} files are memory optimized (${memoryScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit code quality
     */
    async auditCodeQuality() {
        console.log('\n📊 Code Quality Audit...');
        
        // Check for code documentation
        await this.auditDocumentation();
        
        // Check for error handling
        await this.auditErrorHandling();
        
        // Check for coding standards
        await this.auditCodingStandards();
    }
    
    /**
     * Audit code documentation
     */
    async auditDocumentation() {
        console.log('\n📝 Auditing Code Documentation...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let documentedFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for documentation
            const hasFileHeader = content.includes('/**') && content.includes('* @');
            const hasFunctionDocs = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length >= 2;
            const hasInlineComments = content.includes('//') || content.includes('#');
            
            const docScore = [hasFileHeader, hasFunctionDocs, hasInlineComments].filter(Boolean).length;
            
            if (docScore >= 2) {
                documentedFiles++;
            }
            
            this.addResult('Code Quality - Documentation', `File: ${fileName}`, docScore >= 2,
                `Documentation score: ${docScore}/3 (Header: ${hasFileHeader}, Function docs: ${hasFunctionDocs}, Comments: ${hasInlineComments})`);
        }
        
        const docScore = (documentedFiles / phpFiles.length) * 100;
        this.addResult('Code Quality - Documentation', 'Overall Documentation', docScore >= 70,
            `${documentedFiles}/${phpFiles.length} files are well documented (${docScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit error handling
     */
    async auditErrorHandling() {
        console.log('\n🚨 Auditing Error Handling...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let errorHandlingFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check for error handling
            const hasTryCatch = content.includes('try') && content.includes('catch');
            const hasErrorLogging = content.includes('error_log') || content.includes('wp_die');
            const hasValidation = content.includes('validate') || content.includes('is_wp_error');
            const hasGracefulDegradation = content.includes('return false') || content.includes('return null');
            
            const errorScore = [hasTryCatch, hasErrorLogging, hasValidation, hasGracefulDegradation].filter(Boolean).length;
            
            if (errorScore >= 2) {
                errorHandlingFiles++;
            }
            
            this.addResult('Code Quality - Error Handling', `File: ${fileName}`, errorScore >= 2,
                `Error handling score: ${errorScore}/4 (Try/Catch: ${hasTryCatch}, Logging: ${hasErrorLogging}, Validation: ${hasValidation}, Graceful: ${hasGracefulDegradation})`);
        }
        
        const errorHandlingScore = (errorHandlingFiles / phpFiles.length) * 100;
        this.addResult('Code Quality - Error Handling', 'Overall Error Handling', errorHandlingScore >= 70,
            `${errorHandlingFiles}/${phpFiles.length} files have proper error handling (${errorHandlingScore.toFixed(1)}%)`);
    }
    
    /**
     * Audit coding standards
     */
    async auditCodingStandards() {
        console.log('\n📏 Auditing Coding Standards...');
        
        const phpFiles = this.findFiles(this.buildDir, '.php');
        let standardsCompliantFiles = 0;
        
        for (const file of phpFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            
            // Check WordPress coding standards
            const hasProperPhpTag = content.startsWith('<?php');
            const hasProperNaming = /class\s+[A-Z][A-Za-z0-9_]*/.test(content) || !content.includes('class ');
            const hasProperIndentation = !content.includes('\t') || content.split('\t').length < content.split('    ').length;
            const hasProperBraces = content.includes('{') ? content.split('{').length === content.split('}').length : true;
            
            const standardsScore = [hasProperPhpTag, hasProperNaming, hasProperIndentation, hasProperBraces].filter(Boolean).length;
            
            if (standardsScore >= 3) {
                standardsCompliantFiles++;
            }
            
            this.addResult('Code Quality - Coding Standards', `File: ${fileName}`, standardsScore >= 3,
                `Standards score: ${standardsScore}/4 (PHP tag: ${hasProperPhpTag}, Naming: ${hasProperNaming}, Indentation: ${hasProperIndentation}, Braces: ${hasProperBraces})`);
        }
        
        const standardsScore = (standardsCompliantFiles / phpFiles.length) * 100;
        this.addResult('Code Quality - Coding Standards', 'Overall Coding Standards', standardsScore >= 80,
            `${standardsCompliantFiles}/${phpFiles.length} files follow coding standards (${standardsScore.toFixed(1)}%)`);
    }
    
    /**
     * Scan for common vulnerabilities
     */
    async scanVulnerabilities() {
        console.log('\n🔍 Vulnerability Scan...');
        
        const allFiles = this.findFiles(this.buildDir, '');
        let vulnerabilities = 0;
        
        // Common vulnerability patterns
        const vulnerabilityPatterns = [
            { pattern: /eval\s*\(/i, name: 'Code Injection (eval)', severity: 'High' },
            { pattern: /exec\s*\(/i, name: 'Command Injection (exec)', severity: 'High' },
            { pattern: /system\s*\(/i, name: 'Command Injection (system)', severity: 'High' },
            { pattern: /shell_exec\s*\(/i, name: 'Command Injection (shell_exec)', severity: 'High' },
            { pattern: /file_get_contents\s*\(\s*\$_/i, name: 'File Inclusion', severity: 'Medium' },
            { pattern: /include\s+\$_/i, name: 'Dynamic Include', severity: 'High' },
            { pattern: /require\s+\$_/i, name: 'Dynamic Require', severity: 'High' },
            { pattern: /\$_GET\[.*\]\s*\)/i, name: 'Unfiltered GET Input', severity: 'Medium' },
            { pattern: /\$_POST\[.*\]\s*\)/i, name: 'Unfiltered POST Input', severity: 'Medium' },
            { pattern: /base64_decode\s*\(/i, name: 'Base64 Decode (potential obfuscation)', severity: 'Low' }
        ];
        
        for (const file of allFiles) {
            if (fs.statSync(file).isFile()) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    const fileName = path.relative(this.buildDir, file);
                    
                    for (const vuln of vulnerabilityPatterns) {
                        if (vuln.pattern.test(content)) {
                            vulnerabilities++;
                            this.addResult('Vulnerability Scan', `${vuln.severity}: ${fileName}`, false,
                                `${vuln.name} detected`);
                        }
                    }
                } catch (error) {
                    // Skip binary files
                }
            }
        }
        
        this.addResult('Vulnerability Scan', 'Overall Vulnerability Status', vulnerabilities === 0,
            vulnerabilities === 0 ? 'No common vulnerabilities detected' : `${vulnerabilities} potential vulnerabilities found`);
    }
    
    /**
     * Run performance benchmarks
     */
    async runPerformanceBenchmarks() {
        console.log('\n🏃 Performance Benchmarks...');
        
        // File loading benchmark
        const startTime = process.hrtime.bigint();
        
        // Simulate loading all JavaScript files
        const jsFiles = this.findFiles(this.buildDir, '.js');
        let totalJsSize = 0;
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            totalJsSize += content.length;
        }
        
        const endTime = process.hrtime.bigint();
        const loadTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        this.addResult('Performance Benchmarks', 'File Loading Speed', loadTime < 100,
            `Loaded ${jsFiles.length} JS files (${Math.round(totalJsSize / 1024)}KB) in ${loadTime.toFixed(2)}ms`);
        
        // Memory usage benchmark
        const memUsage = process.memoryUsage();
        const memoryOk = memUsage.heapUsed < 100 * 1024 * 1024; // 100MB limit
        
        this.addResult('Performance Benchmarks', 'Memory Usage', memoryOk,
            `Heap used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB (max: 100MB)`);
        
        // Package size benchmark
        const totalSize = this.calculateTotalSize();
        const sizeOk = totalSize < 5 * 1024 * 1024; // 5MB limit
        
        this.addResult('Performance Benchmarks', 'Package Size', sizeOk,
            `Total size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB (max: 5MB)`);
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
     * Add audit result
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
     * Generate comprehensive audit report
     */
    generateAuditReport() {
        const duration = Date.now() - this.startTime;
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log('\n🎯 SECURITY & PERFORMANCE AUDIT REPORT');
        console.log('======================================');
        console.log(`Audit Duration: ${duration}ms`);
        console.log(`Total Audits: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${successRate}%`);
        
        // Calculate category scores
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
        let securityScore = 0;
        let performanceScore = 0;
        let securityCategories = 0;
        let performanceCategories = 0;
        
        Object.keys(categories).forEach(category => {
            const cat = categories[category];
            const catRate = Math.round((cat.passed / cat.total) * 100);
            const status = catRate >= 90 ? '✅' : catRate >= 70 ? '⚠️' : '❌';
            
            console.log(`${status} ${category}: ${cat.passed}/${cat.total} (${catRate}%)`);
            
            // Calculate security and performance scores
            if (category.includes('Security') || category.includes('Vulnerability')) {
                securityScore += catRate;
                securityCategories++;
            } else if (category.includes('Performance') || category.includes('Code Quality')) {
                performanceScore += catRate;
                performanceCategories++;
            }
        });
        
        // Calculate overall scores
        const avgSecurityScore = securityCategories > 0 ? securityScore / securityCategories : 0;
        const avgPerformanceScore = performanceCategories > 0 ? performanceScore / performanceCategories : 0;
        
        console.log('\n🔒 Security Assessment:');
        console.log(`Average Security Score: ${avgSecurityScore.toFixed(1)}%`);
        console.log(`Security Threshold: ${this.securityThreshold}%`);
        console.log(`Security Status: ${avgSecurityScore >= this.securityThreshold ? '✅ PASSED' : '❌ FAILED'}`);
        
        console.log('\n⚡ Performance Assessment:');
        console.log(`Average Performance Score: ${avgPerformanceScore.toFixed(1)}%`);
        console.log(`Performance Threshold: ${this.performanceThreshold}%`);
        console.log(`Performance Status: ${avgPerformanceScore >= this.performanceThreshold ? '✅ PASSED' : '❌ FAILED'}`);
        
        // Show critical failures
        const criticalFailures = this.results.filter(r => !r.passed && 
            (r.category.includes('Security') || r.category.includes('Vulnerability')));
        
        if (criticalFailures.length > 0) {
            console.log('\n🚨 Critical Security Issues:');
            criticalFailures.forEach(result => {
                console.log(`  • ${result.category} - ${result.name}: ${result.message}`);
            });
        }
        
        console.log('\n======================================');
        
        // Final audit verdict
        const securityPassed = avgSecurityScore >= this.securityThreshold;
        const performancePassed = avgPerformanceScore >= this.performanceThreshold;
        const overallPassed = securityPassed && performancePassed && successRate >= 85;
        
        if (overallPassed) {
            console.log('🎉 AUDIT PASSED!');
            console.log('✅ Security requirements met');
            console.log('✅ Performance requirements met');
            console.log('✅ Code quality standards achieved');
            console.log('\n🚀 System is ready for production deployment!');
        } else {
            console.log('❌ AUDIT FAILED');
            if (!securityPassed) console.log('🚨 Security requirements not met');
            if (!performancePassed) console.log('⚡ Performance requirements not met');
            console.log('🔧 Critical issues must be resolved before deployment');
            process.exit(1);
        }
        
        // Save detailed audit report
        this.saveAuditReport(avgSecurityScore, avgPerformanceScore, overallPassed);
    }
    
    /**
     * Save detailed audit report
     */
    saveAuditReport(securityScore, performanceScore, passed) {
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            auditPassed: passed,
            scores: {
                security: securityScore,
                performance: performanceScore,
                overall: Math.round((securityScore + performanceScore) / 2)
            },
            thresholds: {
                security: this.securityThreshold,
                performance: this.performanceThreshold
            },
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.passed).length,
                failed: this.results.filter(r => !r.passed).length,
                successRate: Math.round((this.results.filter(r => r.passed).length / this.results.length) * 100)
            },
            results: this.results,
            recommendations: this.generateSecurityPerformanceRecommendations()
        };
        
        try {
            if (!fs.existsSync('dist')) {
                fs.mkdirSync('dist', { recursive: true });
            }
            
            fs.writeFileSync('dist/security-performance-audit-report.json', 
                JSON.stringify(reportData, null, 2));
            console.log('\n📄 Detailed audit report saved to: dist/security-performance-audit-report.json');
        } catch (error) {
            console.warn('⚠️  Could not save detailed audit report:', error.message);
        }
    }
    
    /**
     * Generate security and performance recommendations
     */
    generateSecurityPerformanceRecommendations() {
        const failedResults = this.results.filter(r => !r.passed);
        const recommendations = [];
        
        // Security recommendations
        const securityFailures = failedResults.filter(r => 
            r.category.includes('Security') || r.category.includes('Vulnerability'));
        
        if (securityFailures.length > 0) {
            recommendations.push({
                category: 'Security',
                priority: 'Critical',
                message: 'Address security vulnerabilities immediately',
                actions: [
                    'Implement proper input validation and sanitization',
                    'Add CSRF protection to all AJAX endpoints',
                    'Ensure proper authentication and authorization checks',
                    'Remove any hardcoded credentials or debug information',
                    'Implement proper error handling and logging'
                ]
            });
        }
        
        // Performance recommendations
        const performanceFailures = failedResults.filter(r => 
            r.category.includes('Performance'));
        
        if (performanceFailures.length > 0) {
            recommendations.push({
                category: 'Performance',
                priority: 'High',
                message: 'Optimize performance for production deployment',
                actions: [
                    'Minify and compress JavaScript and CSS files',
                    'Implement proper caching strategies',
                    'Optimize database queries and add indexing',
                    'Reduce file sizes and optimize assets',
                    'Implement memory management best practices'
                ]
            });
        }
        
        // Code quality recommendations
        const qualityFailures = failedResults.filter(r => 
            r.category.includes('Code Quality'));
        
        if (qualityFailures.length > 0) {
            recommendations.push({
                category: 'Code Quality',
                priority: 'Medium',
                message: 'Improve code quality and maintainability',
                actions: [
                    'Add comprehensive code documentation',
                    'Implement proper error handling throughout',
                    'Follow WordPress coding standards consistently',
                    'Add unit tests for critical functionality',
                    'Refactor complex functions for better readability'
                ]
            });
        }
        
        return recommendations;
    }
}

// Run audit if called directly
if (require.main === module) {
    const auditor = new SecurityPerformanceAuditor();
    auditor.audit().catch(error => {
        console.error('Security & Performance audit failed:', error);
        process.exit(1);
    });
}

module.exports = SecurityPerformanceAuditor;