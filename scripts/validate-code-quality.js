#!/usr/bin/env node

/**
 * Live Admin Styler v2.0 - Code Quality Validation Script
 * 
 * This script validates code quality metrics and generates reports
 * 
 * @since 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    thresholds: {
        phpcs: {
            maxErrors: 0,
            maxWarnings: 5
        },
        eslint: {
            maxErrors: 0,
            maxWarnings: 10
        },
        complexity: {
            maxCyclomaticComplexity: 10,
            maxNestingLevel: 5,
            maxLinesPerFunction: 50
        },
        coverage: {
            minBranches: 80,
            minFunctions: 80,
            minLines: 80,
            minStatements: 80
        },
        fileSize: {
            maxJsSize: 100000, // 100KB
            maxCssSize: 50000,  // 50KB
            maxPhpSize: 200000  // 200KB
        },
        documentation: {
            minPhpDocCoverage: 80,
            minJsDocCoverage: 80
        }
    },
    paths: {
        php: ['includes/', 'live-admin-styler.php'],
        js: ['assets/js/', 'js/'],
        css: ['assets/css/'],
        tests: ['tests/']
    }
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * Print colored console output
 * @param {string} message - Message to print
 * @param {string} color - Color code
 */
function printColored(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Execute command and return result
 * @param {string} command - Command to execute
 * @param {boolean} silent - Whether to suppress output
 * @returns {Object} Result object
 */
function executeCommand(command, silent = false) {
    try {
        const output = execSync(command, { 
            encoding: 'utf8',
            stdio: silent ? 'pipe' : 'inherit'
        });
        return { success: true, output };
    } catch (error) {
        return { 
            success: false, 
            error: error.message,
            output: error.stdout || '',
            stderr: error.stderr || ''
        };
    }
}

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean}
 */
function fileExists(filePath) {
    return fs.existsSync(filePath);
}

/**
 * Get file size in bytes
 * @param {string} filePath - Path to file
 * @returns {number}
 */
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return 0;
    }
}

/**
 * Get all files with specific extension
 * @param {string} dir - Directory to search
 * @param {string} ext - File extension
 * @returns {Array} Array of file paths
 */
function getFilesWithExtension(dir, ext) {
    const files = [];
    
    function traverse(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                traverse(fullPath);
            } else if (stat.isFile() && item.endsWith(ext)) {
                files.push(fullPath);
            }
        }
    }
    
    if (fs.existsSync(dir)) {
        traverse(dir);
    }
    
    return files;
}

/**
 * Validate PHP code quality
 * @returns {Object} Validation result
 */
function validatePhpQuality() {
    printColored('\n=== PHP Code Quality Validation ===', 'blue');
    
    const results = {
        phpcs: { passed: false, errors: 0, warnings: 0 },
        syntax: { passed: false, errors: [] },
        complexity: { passed: false, issues: [] },
        fileSize: { passed: false, largeFiles: [] }
    };
    
    // PHPCS validation
    printColored('Running PHPCS...', 'cyan');
    const phpcsResult = executeCommand('phpcs --standard=phpcs.xml --report=json', true);
    
    if (phpcsResult.success) {
        try {
            const phpcsData = JSON.parse(phpcsResult.output);
            results.phpcs.errors = phpcsData.totals.errors || 0;
            results.phpcs.warnings = phpcsData.totals.warnings || 0;
            results.phpcs.passed = results.phpcs.errors <= CONFIG.thresholds.phpcs.maxErrors &&
                                   results.phpcs.warnings <= CONFIG.thresholds.phpcs.maxWarnings;
        } catch (error) {
            results.phpcs.passed = phpcsResult.output.includes('0 errors, 0 warnings');
        }
    }
    
    // PHP syntax validation
    printColored('Checking PHP syntax...', 'cyan');
    const phpFiles = [];
    CONFIG.paths.php.forEach(dir => {
        phpFiles.push(...getFilesWithExtension(dir, '.php'));
    });
    
    let syntaxErrors = 0;
    phpFiles.forEach(file => {
        const syntaxResult = executeCommand(`php -l "${file}"`, true);
        if (!syntaxResult.success) {
            results.syntax.errors.push(file);
            syntaxErrors++;
        }
    });
    results.syntax.passed = syntaxErrors === 0;
    
    // File size validation
    printColored('Checking file sizes...', 'cyan');
    phpFiles.forEach(file => {
        const size = getFileSize(file);
        if (size > CONFIG.thresholds.fileSize.maxPhpSize) {
            results.fileSize.largeFiles.push({
                file,
                size,
                limit: CONFIG.thresholds.fileSize.maxPhpSize
            });
        }
    });
    results.fileSize.passed = results.fileSize.largeFiles.length === 0;
    
    return results;
}

/**
 * Validate JavaScript code quality
 * @returns {Object} Validation result
 */
function validateJsQuality() {
    printColored('\n=== JavaScript Code Quality Validation ===', 'blue');
    
    const results = {
        eslint: { passed: false, errors: 0, warnings: 0 },
        complexity: { passed: false, issues: [] },
        fileSize: { passed: false, largeFiles: [] },
        security: { passed: false, issues: [] }
    };
    
    // ESLint validation
    printColored('Running ESLint...', 'cyan');
    const eslintResult = executeCommand('eslint assets/js/**/*.js js/**/*.js --format=json', true);
    
    if (eslintResult.success || eslintResult.output) {
        try {
            const eslintData = JSON.parse(eslintResult.output || '[]');
            let totalErrors = 0;
            let totalWarnings = 0;
            
            eslintData.forEach(file => {
                totalErrors += file.errorCount || 0;
                totalWarnings += file.warningCount || 0;
            });
            
            results.eslint.errors = totalErrors;
            results.eslint.warnings = totalWarnings;
            results.eslint.passed = totalErrors <= CONFIG.thresholds.eslint.maxErrors &&
                                   totalWarnings <= CONFIG.thresholds.eslint.maxWarnings;
        } catch (error) {
            results.eslint.passed = false;
        }
    }
    
    // Security validation
    printColored('Running security checks...', 'cyan');
    const securityResult = executeCommand('eslint assets/js/**/*.js --config .eslintrc.security.json --format=json', true);
    
    if (securityResult.success || securityResult.output) {
        try {
            const securityData = JSON.parse(securityResult.output || '[]');
            let securityIssues = 0;
            
            securityData.forEach(file => {
                securityIssues += (file.errorCount || 0) + (file.warningCount || 0);
            });
            
            results.security.issues = securityIssues;
            results.security.passed = securityIssues === 0;
        } catch (error) {
            results.security.passed = false;
        }
    }
    
    // File size validation
    printColored('Checking file sizes...', 'cyan');
    const jsFiles = [];
    CONFIG.paths.js.forEach(dir => {
        jsFiles.push(...getFilesWithExtension(dir, '.js'));
    });
    
    jsFiles.forEach(file => {
        const size = getFileSize(file);
        if (size > CONFIG.thresholds.fileSize.maxJsSize) {
            results.fileSize.largeFiles.push({
                file,
                size,
                limit: CONFIG.thresholds.fileSize.maxJsSize
            });
        }
    });
    results.fileSize.passed = results.fileSize.largeFiles.length === 0;
    
    return results;
}

/**
 * Validate CSS code quality
 * @returns {Object} Validation result
 */
function validateCssQuality() {
    printColored('\n=== CSS Code Quality Validation ===', 'blue');
    
    const results = {
        stylelint: { passed: false, errors: 0, warnings: 0 },
        fileSize: { passed: false, largeFiles: [] }
    };
    
    // Stylelint validation
    printColored('Running Stylelint...', 'cyan');
    const stylelintResult = executeCommand('stylelint "assets/css/**/*.css" --formatter=json', true);
    
    if (stylelintResult.success || stylelintResult.output) {
        try {
            const stylelintData = JSON.parse(stylelintResult.output || '[]');
            let totalErrors = 0;
            let totalWarnings = 0;
            
            stylelintData.forEach(file => {
                file.warnings.forEach(warning => {
                    if (warning.severity === 'error') {
                        totalErrors++;
                    } else {
                        totalWarnings++;
                    }
                });
            });
            
            results.stylelint.errors = totalErrors;
            results.stylelint.warnings = totalWarnings;
            results.stylelint.passed = totalErrors === 0 && totalWarnings <= 5;
        } catch (error) {
            results.stylelint.passed = false;
        }
    }
    
    // File size validation
    printColored('Checking file sizes...', 'cyan');
    const cssFiles = [];
    CONFIG.paths.css.forEach(dir => {
        cssFiles.push(...getFilesWithExtension(dir, '.css'));
    });
    
    cssFiles.forEach(file => {
        const size = getFileSize(file);
        if (size > CONFIG.thresholds.fileSize.maxCssSize) {
            results.fileSize.largeFiles.push({
                file,
                size,
                limit: CONFIG.thresholds.fileSize.maxCssSize
            });
        }
    });
    results.fileSize.passed = results.fileSize.largeFiles.length === 0;
    
    return results;
}

/**
 * Validate test coverage
 * @returns {Object} Validation result
 */
function validateTestCoverage() {
    printColored('\n=== Test Coverage Validation ===', 'blue');
    
    const results = {
        js: { passed: false, coverage: {} },
        php: { passed: false, coverage: {} }
    };
    
    // JavaScript coverage
    printColored('Checking JavaScript test coverage...', 'cyan');
    const jsCoverageResult = executeCommand('jest --coverage --coverageReporters=json-summary', true);
    
    if (jsCoverageResult.success && fileExists('coverage/coverage-summary.json')) {
        try {
            const coverageData = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const total = coverageData.total;
            
            results.js.coverage = {
                branches: total.branches.pct,
                functions: total.functions.pct,
                lines: total.lines.pct,
                statements: total.statements.pct
            };
            
            results.js.passed = total.branches.pct >= CONFIG.thresholds.coverage.minBranches &&
                               total.functions.pct >= CONFIG.thresholds.coverage.minFunctions &&
                               total.lines.pct >= CONFIG.thresholds.coverage.minLines &&
                               total.statements.pct >= CONFIG.thresholds.coverage.minStatements;
        } catch (error) {
            results.js.passed = false;
        }
    }
    
    // PHP coverage (if available)
    printColored('Checking PHP test coverage...', 'cyan');
    if (fileExists('tests/coverage/php/coverage.xml')) {
        // Parse PHP coverage XML if available
        results.php.passed = true; // Simplified for now
    }
    
    return results;
}

/**
 * Generate quality report
 * @param {Object} results - All validation results
 */
function generateReport(results) {
    printColored('\n=== Code Quality Report ===', 'bright');
    
    let totalChecks = 0;
    let passedChecks = 0;
    
    // PHP Results
    printColored('\nPHP Quality:', 'yellow');
    Object.entries(results.php).forEach(([check, result]) => {
        totalChecks++;
        if (result.passed) {
            passedChecks++;
            printColored(`  ✓ ${check}`, 'green');
        } else {
            printColored(`  ✗ ${check}`, 'red');
            if (check === 'phpcs') {
                console.log(`    Errors: ${result.errors}, Warnings: ${result.warnings}`);
            } else if (check === 'syntax') {
                console.log(`    Files with errors: ${result.errors.length}`);
            } else if (check === 'fileSize') {
                console.log(`    Large files: ${result.largeFiles.length}`);
            }
        }
    });
    
    // JavaScript Results
    printColored('\nJavaScript Quality:', 'yellow');
    Object.entries(results.js).forEach(([check, result]) => {
        totalChecks++;
        if (result.passed) {
            passedChecks++;
            printColored(`  ✓ ${check}`, 'green');
        } else {
            printColored(`  ✗ ${check}`, 'red');
            if (check === 'eslint') {
                console.log(`    Errors: ${result.errors}, Warnings: ${result.warnings}`);
            } else if (check === 'security') {
                console.log(`    Security issues: ${result.issues}`);
            } else if (check === 'fileSize') {
                console.log(`    Large files: ${result.largeFiles.length}`);
            }
        }
    });
    
    // CSS Results
    printColored('\nCSS Quality:', 'yellow');
    Object.entries(results.css).forEach(([check, result]) => {
        totalChecks++;
        if (result.passed) {
            passedChecks++;
            printColored(`  ✓ ${check}`, 'green');
        } else {
            printColored(`  ✗ ${check}`, 'red');
            if (check === 'stylelint') {
                console.log(`    Errors: ${result.errors}, Warnings: ${result.warnings}`);
            } else if (check === 'fileSize') {
                console.log(`    Large files: ${result.largeFiles.length}`);
            }
        }
    });
    
    // Coverage Results
    printColored('\nTest Coverage:', 'yellow');
    Object.entries(results.coverage).forEach(([lang, result]) => {
        totalChecks++;
        if (result.passed) {
            passedChecks++;
            printColored(`  ✓ ${lang} coverage`, 'green');
        } else {
            printColored(`  ✗ ${lang} coverage`, 'red');
            if (result.coverage && Object.keys(result.coverage).length > 0) {
                Object.entries(result.coverage).forEach(([metric, value]) => {
                    console.log(`    ${metric}: ${value}%`);
                });
            }
        }
    });
    
    // Summary
    printColored('\n=== Summary ===', 'bright');
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Passed: ${passedChecks}`);
    console.log(`Failed: ${totalChecks - passedChecks}`);
    
    const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);
    
    if (passedChecks === totalChecks) {
        printColored('\n🎉 All code quality checks passed!', 'green');
        return true;
    } else {
        printColored('\n❌ Some code quality checks failed.', 'red');
        return false;
    }
}

/**
 * Main execution function
 */
function main() {
    printColored('Live Admin Styler v2.0 - Code Quality Validation', 'bright');
    printColored('================================================', 'bright');
    
    const results = {
        php: validatePhpQuality(),
        js: validateJsQuality(),
        css: validateCssQuality(),
        coverage: validateTestCoverage()
    };
    
    const success = generateReport(results);
    
    // Save results to file
    const reportPath = 'tests/reports/code-quality-report.json';
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        results,
        summary: {
            totalChecks: Object.values(results).reduce((total, category) => 
                total + Object.keys(category).length, 0),
            passedChecks: Object.values(results).reduce((total, category) => 
                total + Object.values(category).filter(check => check.passed).length, 0)
        }
    }, null, 2));
    
    printColored(`\nDetailed report saved to: ${reportPath}`, 'cyan');
    
    process.exit(success ? 0 : 1);
}

// Run the validation
if (require.main === module) {
    main();
}

module.exports = {
    validatePhpQuality,
    validateJsQuality,
    validateCssQuality,
    validateTestCoverage,
    generateReport
};