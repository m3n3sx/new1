/**
 * Module Coverage Validation for Live Admin Styler v2.0
 * 
 * Ensures all JavaScript modules have comprehensive test coverage
 * and validates test quality and completeness.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');

describe('JavaScript Module Test Coverage Validation', () => {
    
    const moduleConfig = {
        // Core modules - require 90%+ coverage
        core: {
            'las-core': {
                file: '../../assets/js/las-core.js',
                testFile: 'test-las-core.js',
                minTests: 20,
                minCoverage: 90,
                criticalMethods: [
                    'init', 'loadModule', 'registerModule', 'on', 'emit', 'handleError'
                ]
            },
            'settings-manager': {
                file: '../../assets/js/modules/settings-manager.js',
                testFile: 'test-settings-manager.js',
                minTests: 15,
                minCoverage: 85,
                criticalMethods: [
                    'get', 'set', 'save', 'load', 'sync'
                ]
            },
            'live-preview': {
                file: '../../assets/js/modules/live-preview.js',
                testFile: 'test-live-preview.js',
                minTests: 15,
                minCoverage: 85,
                criticalMethods: [
                    'updatePreview', 'injectCSS', 'applyStyles'
                ]
            },
            'ajax-manager': {
                file: '../../assets/js/modules/ajax-manager.js',
                testFile: 'test-ajax-manager.js',
                minTests: 12,
                minCoverage: 85,
                criticalMethods: [
                    'request', 'retry', 'queue', 'handleError'
                ]
            }
        },
        
        // Live Edit modules - require 80%+ coverage
        liveEdit: {
            'live-edit-engine': {
                file: '../../assets/js/modules/live-edit-engine.js',
                testFile: 'test-live-edit-engine.js',
                minTests: 12,
                minCoverage: 80,
                criticalMethods: [
                    'activate', 'deactivate', 'selectElement', 'showPanel'
                ]
            },
            'micro-panel': {
                file: '../../assets/js/modules/micro-panel.js',
                testFile: 'test-micro-panel.js',
                minTests: 10,
                minCoverage: 80,
                criticalMethods: [
                    'show', 'hide', 'position', 'generateControls'
                ]
            },
            'auto-save': {
                file: '../../assets/js/modules/auto-save.js',
                testFile: 'test-auto-save.js',
                minTests: 8,
                minCoverage: 80,
                criticalMethods: [
                    'enable', 'disable', 'save', 'restore'
                ]
            },
            'tab-sync': {
                file: '../../assets/js/modules/tab-sync.js',
                testFile: 'test-tab-sync.js',
                minTests: 8,
                minCoverage: 80,
                criticalMethods: [
                    'sync', 'broadcast', 'receive'
                ]
            }
        },
        
        // UI modules - require 75%+ coverage
        ui: {
            'color-picker': {
                file: '../../assets/js/modules/color-picker.js',
                testFile: 'test-color-picker.js',
                minTests: 12,
                minCoverage: 75,
                criticalMethods: [
                    'init', 'show', 'hide', 'setValue', 'getValue'
                ]
            },
            'gradient-builder': {
                file: '../../assets/js/modules/gradient-builder.js',
                testFile: 'test-gradient-builder.js',
                minTests: 10,
                minCoverage: 75,
                criticalMethods: [
                    'create', 'addStop', 'removeStop', 'generateCSS'
                ]
            },
            'css-variables-engine': {
                file: '../../assets/js/modules/css-variables-engine.js',
                testFile: 'test-css-variables-engine.js',
                minTests: 10,
                minCoverage: 75,
                criticalMethods: [
                    'set', 'get', 'apply', 'generateTheme'
                ]
            },
            'navigation-manager': {
                file: '../../assets/js/modules/navigation-manager.js',
                testFile: 'test-navigation-manager.js',
                minTests: 8,
                minCoverage: 75,
                criticalMethods: [
                    'init', 'switchTab', 'updateState'
                ]
            },
            'card-layout': {
                file: '../../assets/js/modules/card-layout.js',
                testFile: 'test-card-layout.js',
                minTests: 8,
                minCoverage: 75,
                criticalMethods: [
                    'init', 'render', 'update'
                ]
            },
            'form-controls': {
                file: '../../assets/js/modules/form-controls.js',
                testFile: 'test-form-controls.js',
                minTests: 10,
                minCoverage: 75,
                criticalMethods: [
                    'init', 'validate', 'serialize'
                ]
            },
            'animation-manager': {
                file: '../../assets/js/modules/animation-manager.js',
                testFile: 'test-animation-manager.js',
                minTests: 8,
                minCoverage: 75,
                criticalMethods: [
                    'animate', 'stop', 'queue'
                ]
            }
        },
        
        // System modules - require 75%+ coverage
        system: {
            'theme-manager': {
                file: '../../assets/js/modules/theme-manager.js',
                testFile: 'test-theme-manager.js',
                minTests: 10,
                minCoverage: 75,
                criticalMethods: [
                    'setTheme', 'getTheme', 'detectPreference'
                ]
            },
            'template-manager': {
                file: '../../assets/js/modules/template-manager.js',
                testFile: 'test-template-manager.js',
                minTests: 12,
                minCoverage: 75,
                criticalMethods: [
                    'apply', 'save', 'load', 'export', 'import'
                ]
            },
            'performance-monitor': {
                file: '../../assets/js/modules/performance-monitor.js',
                testFile: 'test-performance-monitor.js',
                minTests: 8,
                minCoverage: 75,
                criticalMethods: [
                    'start', 'stop', 'measure', 'report'
                ]
            },
            'memory-manager': {
                file: '../../assets/js/modules/memory-manager.js',
                testFile: 'test-memory-manager.js',
                minTests: 8,
                minCoverage: 75,
                criticalMethods: [
                    'monitor', 'cleanup', 'optimize'
                ]
            }
        }
    };
    
    let coverageResults = {
        totalModules: 0,
        testedModules: 0,
        missingTests: [],
        insufficientCoverage: [],
        missingCriticalTests: []
    };
    
    beforeAll(() => {
        // Count total modules
        Object.values(moduleConfig).forEach(category => {
            coverageResults.totalModules += Object.keys(category).length;
        });
    });
    
    afterAll(() => {
        // Generate coverage report
        generateCoverageReport();
    });
    
    describe('Test File Existence', () => {
        
        Object.entries(moduleConfig).forEach(([categoryName, modules]) => {
            describe(`${categoryName} modules`, () => {
                
                Object.entries(modules).forEach(([moduleName, config]) => {
                    test(`should have test file for ${moduleName}`, () => {
                        const testFilePath = path.join(__dirname, config.testFile);
                        const exists = fs.existsSync(testFilePath);
                        
                        if (exists) {
                            coverageResults.testedModules++;
                        } else {
                            coverageResults.missingTests.push(moduleName);
                        }
                        
                        expect(exists).toBe(true);
                    });
                    
                });
                
            });
        });
        
    });
    
    describe('Test Coverage Quality', () => {
        
        Object.entries(moduleConfig).forEach(([categoryName, modules]) => {
            describe(`${categoryName} modules`, () => {
                
                Object.entries(modules).forEach(([moduleName, config]) => {
                    test(`should have sufficient test methods for ${moduleName}`, () => {
                        const testFilePath = path.join(__dirname, config.testFile);
                        
                        if (!fs.existsSync(testFilePath)) {
                            // Skip if test file doesn't exist (will be caught by previous test)
                            return;
                        }
                        
                        const testMethodCount = getTestMethodsCount(testFilePath);
                        
                        if (testMethodCount < config.minTests) {
                            coverageResults.insufficientCoverage.push({
                                module: moduleName,
                                current: testMethodCount,
                                required: config.minTests
                            });
                        }
                        
                        expect(testMethodCount).toBeGreaterThanOrEqual(config.minTests);
                    });
                    
                    test(`should test critical methods for ${moduleName}`, () => {
                        const testFilePath = path.join(__dirname, config.testFile);
                        
                        if (!fs.existsSync(testFilePath)) {
                            return;
                        }
                        
                        const testContent = fs.readFileSync(testFilePath, 'utf8');
                        const missingCriticalTests = [];
                        
                        config.criticalMethods.forEach(method => {
                            // Check if method is tested (simple string search)
                            const methodTestPattern = new RegExp(`(test|it).*${method}`, 'i');
                            if (!methodTestPattern.test(testContent)) {
                                missingCriticalTests.push(method);
                            }
                        });
                        
                        if (missingCriticalTests.length > 0) {
                            coverageResults.missingCriticalTests.push({
                                module: moduleName,
                                missingMethods: missingCriticalTests
                            });
                        }
                        
                        expect(missingCriticalTests).toEqual([]);
                    });
                    
                });
                
            });
        });
        
    });
    
    describe('Module File Existence', () => {
        
        Object.entries(moduleConfig).forEach(([categoryName, modules]) => {
            describe(`${categoryName} modules`, () => {
                
                Object.entries(modules).forEach(([moduleName, config]) => {
                    test(`should have source file for ${moduleName}`, () => {
                        const moduleFilePath = path.join(__dirname, config.file);
                        const exists = fs.existsSync(moduleFilePath);
                        
                        expect(exists).toBe(true);
                    });
                    
                });
                
            });
        });
        
    });
    
    describe('Integration Test Coverage', () => {
        
        const integrationTests = [
            'test-integration.js',
            'test-ajax-workflows.js',
            'test-template-application.js',
            'test-state-management.js',
            'test-cross-browser-compatibility.js',
            'test-integration-comprehensive.js'
        ];
        
        integrationTests.forEach(testFile => {
            test(`should have integration test: ${testFile}`, () => {
                const testFilePath = path.join(__dirname, testFile);
                const exists = fs.existsSync(testFilePath);
                
                expect(exists).toBe(true);
            });
        });
        
        test('should have comprehensive test suite runner', () => {
            const runnerPath = path.join(__dirname, 'test-suite-runner.js');
            const exists = fs.existsSync(runnerPath);
            
            expect(exists).toBe(true);
        });
        
    });
    
    describe('Test Quality Metrics', () => {
        
        test('should have overall test coverage above 80%', () => {
            const coveragePercentage = (coverageResults.testedModules / coverageResults.totalModules) * 100;
            
            expect(coveragePercentage).toBeGreaterThanOrEqual(80);
        });
        
        test('should have no missing critical method tests', () => {
            expect(coverageResults.missingCriticalTests).toEqual([]);
        });
        
        test('should have Jest configuration file', () => {
            const jestConfigExists = fs.existsSync(path.join(__dirname, '../../package.json'));
            
            expect(jestConfigExists).toBe(true);
            
            if (jestConfigExists) {
                const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
                expect(packageJson.jest).toBeDefined();
                expect(packageJson.jest.testEnvironment).toBe('jsdom');
                expect(packageJson.jest.coverageThreshold).toBeDefined();
            }
        });
        
        test('should have test setup file', () => {
            const setupPath = path.join(__dirname, 'setup.js');
            const exists = fs.existsSync(setupPath);
            
            expect(exists).toBe(true);
        });
        
    });
    
    /**
     * Helper functions
     */
    
    function getTestMethodsCount(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const testMatches = content.match(/(?:test|it)\s*\(/g);
            return testMatches ? testMatches.length : 0;
        } catch (error) {
            return 0;
        }
    }
    
    function generateCoverageReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalModules: coverageResults.totalModules,
                testedModules: coverageResults.testedModules,
                coveragePercentage: Math.round((coverageResults.testedModules / coverageResults.totalModules) * 100),
                missingTestsCount: coverageResults.missingTests.length,
                insufficientCoverageCount: coverageResults.insufficientCoverage.length,
                missingCriticalTestsCount: coverageResults.missingCriticalTests.length
            },
            details: {
                missingTests: coverageResults.missingTests,
                insufficientCoverage: coverageResults.insufficientCoverage,
                missingCriticalTests: coverageResults.missingCriticalTests
            },
            moduleBreakdown: generateModuleBreakdown(),
            recommendations: generateRecommendations()
        };
        
        // Write report to file
        const reportPath = path.join(__dirname, '../reports/module-coverage-report.json');
        try {
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        } catch (error) {
            console.warn('Could not write coverage report:', error.message);
        }
        
        // Console output
        console.log('\n📊 Module Coverage Report');
        console.log('=========================');
        console.log(`📦 Total Modules: ${report.summary.totalModules}`);
        console.log(`✅ Tested Modules: ${report.summary.testedModules}`);
        console.log(`📈 Coverage: ${report.summary.coveragePercentage}%`);
        
        if (report.summary.missingTestsCount > 0) {
            console.log(`❌ Missing Tests: ${report.summary.missingTestsCount}`);
            console.log('   Modules:', report.details.missingTests.join(', '));
        }
        
        if (report.summary.insufficientCoverageCount > 0) {
            console.log(`⚠️  Insufficient Coverage: ${report.summary.insufficientCoverageCount}`);
        }
        
        if (report.summary.missingCriticalTestsCount > 0) {
            console.log(`🔴 Missing Critical Tests: ${report.summary.missingCriticalTestsCount}`);
        }
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }
        
        return report;
    }
    
    function generateModuleBreakdown() {
        const breakdown = {};
        
        Object.entries(moduleConfig).forEach(([categoryName, modules]) => {
            breakdown[categoryName] = {
                total: Object.keys(modules).length,
                tested: 0,
                coverage: 0
            };
            
            Object.entries(modules).forEach(([moduleName, config]) => {
                const testFilePath = path.join(__dirname, config.testFile);
                if (fs.existsSync(testFilePath)) {
                    breakdown[categoryName].tested++;
                }
            });
            
            breakdown[categoryName].coverage = Math.round(
                (breakdown[categoryName].tested / breakdown[categoryName].total) * 100
            );
        });
        
        return breakdown;
    }
    
    function generateRecommendations() {
        const recommendations = [];
        
        if (coverageResults.missingTests.length > 0) {
            recommendations.push(`Create test files for ${coverageResults.missingTests.length} missing modules`);
        }
        
        if (coverageResults.insufficientCoverage.length > 0) {
            recommendations.push(`Increase test coverage for ${coverageResults.insufficientCoverage.length} modules`);
        }
        
        if (coverageResults.missingCriticalTests.length > 0) {
            recommendations.push(`Add tests for critical methods in ${coverageResults.missingCriticalTests.length} modules`);
        }
        
        const coveragePercentage = (coverageResults.testedModules / coverageResults.totalModules) * 100;
        if (coveragePercentage < 80) {
            recommendations.push('Increase overall test coverage to meet 80% threshold');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Excellent test coverage! Consider adding performance and edge case tests');
        }
        
        return recommendations;
    }
    
});