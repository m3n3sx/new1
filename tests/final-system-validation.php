<?php
/**
 * Final System Validation Script
 * 
 * Comprehensive validation of all system components
 * Checks for proper integration and functionality
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class FinalSystemValidator {
    
    private $validation_results = [];
    private $errors = [];
    private $warnings = [];
    
    public function __construct() {
        $this->validation_results = [
            'core_engine' => false,
            'services' => false,
            'assets' => false,
            'database' => false,
            'security' => false,
            'performance' => false,
            'compatibility' => false,
            'documentation' => false
        ];
    }
    
    /**
     * Run complete system validation
     */
    public function validate() {
        echo "Starting Final System Validation for Live Admin Styler v2.0...\n";
        echo str_repeat("=", 60) . "\n";
        
        $this->validate_core_engine();
        $this->validate_services();
        $this->validate_assets();
        $this->validate_database();
        $this->validate_security();
        $this->validate_performance();
        $this->validate_compatibility();
        $this->validate_documentation();
        
        $this->generate_validation_report();
        
        return $this->is_system_ready();
    }
    
    /**
     * Validate core engine functionality
     */
    private function validate_core_engine() {
        echo "Validating Core Engine...\n";
        
        try {
            // Check if CoreEngine class exists
            if (!class_exists('CoreEngine')) {
                $this->errors[] = 'CoreEngine class not found';
                return;
            }
            
            // Test singleton pattern
            $instance1 = CoreEngine::getInstance();
            $instance2 = CoreEngine::getInstance();
            
            if ($instance1 !== $instance2) {
                $this->errors[] = 'CoreEngine singleton pattern not working';
                return;
            }
            
            // Test service registration
            $instance1->register('TestService', function() {
                return new stdClass();
            });
            
            $service = $instance1->get('TestService');
            if (!is_object($service)) {
                $this->errors[] = 'Service registration/resolution not working';
                return;
            }
            
            $this->validation_results['core_engine'] = true;
            echo "✓ Core Engine validation passed\n";
            
        } catch (Exception $e) {
            $this->errors[] = "Core Engine validation failed: " . $e->getMessage();
        }
    }
    
    /**
     * Validate all services
     */
    private function validate_services() {
        echo "Validating Services...\n";
        
        $required_services = [
            'SettingsManager',
            'CacheManager', 
            'SecurityManager',
            'StyleGenerator',
            'AssetLoader',
            'CommunicationManager',
            'TemplateManager',
            'PerformanceMonitor'
        ];
        
        $missing_services = [];
        
        foreach ($required_services as $service) {
            $file_path = dirname(__FILE__) . "/../includes/{$service}.php";
            
            if (!file_exists($file_path)) {
                $missing_services[] = $service;
                continue;
            }
            
            require_once $file_path;
            
            if (!class_exists($service)) {
                $missing_services[] = $service;
            }
        }
        
        if (!empty($missing_services)) {
            $this->errors[] = 'Missing services: ' . implode(', ', $missing_services);
            return;
        }
        
        // Test service instantiation
        try {
            $core = CoreEngine::getInstance();
            
            // Register services
            $core->register('CacheManager', function() {
                return new CacheManager();
            });
            
            $core->register('SecurityManager', function() {
                return new SecurityManager();
            });
            
            $core->register('SettingsManager', function() use ($core) {
                return new SettingsManager(
                    $core->get('CacheManager'),
                    $core->get('SecurityManager')
                );
            });
            
            // Test service resolution
            $settings_manager = $core->get('SettingsManager');
            if (!($settings_manager instanceof SettingsManager)) {
                $this->errors[] = 'Service instantiation failed';
                return;
            }
            
            $this->validation_results['services'] = true;
            echo "✓ Services validation passed\n";
            
        } catch (Exception $e) {
            $this->errors[] = "Services validation failed: " . $e->getMessage();
        }
    }
    
    /**
     * Validate assets
     */
    private function validate_assets() {
        echo "Validating Assets...\n";
        
        $required_css = [
            'assets/css/las-main.css',
            'assets/css/las-live-edit.css', 
            'assets/css/las-utilities.css'
        ];
        
        $required_js = [
            'assets/js/las-core.js',
            'assets/js/modules/settings-manager.js',
            'assets/js/modules/live-preview.js',
            'assets/js/modules/ajax-manager.js'
        ];
        
        $missing_assets = [];
        
        // Check CSS files
        foreach ($required_css as $css_file) {
            $file_path = dirname(__FILE__) . "/../{$css_file}";
            if (!file_exists($file_path)) {
                $missing_assets[] = $css_file;
            } else {
                // Check file size (should not be empty)
                if (filesize($file_path) < 100) {
                    $this->warnings[] = "CSS file {$css_file} seems too small";
                }
            }
        }
        
        // Check JS files
        foreach ($required_js as $js_file) {
            $file_path = dirname(__FILE__) . "/../{$js_file}";
            if (!file_exists($file_path)) {
                $missing_assets[] = $js_file;
            } else {
                // Basic syntax check
                $content = file_get_contents($file_path);
                if (empty($content)) {
                    $this->warnings[] = "JS file {$js_file} is empty";
                }
            }
        }
        
        if (!empty($missing_assets)) {
            $this->errors[] = 'Missing assets: ' . implode(', ', $missing_assets);
            return;
        }
        
        $this->validation_results['assets'] = true;
        echo "✓ Assets validation passed\n";
    }
    
    /**
     * Validate database operations
     */
    private function validate_database() {
        echo "Validating Database Operations...\n";
        
        try {
            // Test option operations
            $test_option = 'las_fresh_validation_test';
            $test_value = 'validation_test_value_' . time();
            
            // Test setting option
            update_option($test_option, $test_value);
            
            // Test getting option
            $retrieved_value = get_option($test_option);
            
            if ($retrieved_value !== $test_value) {
                $this->errors[] = 'Database option operations not working';
                return;
            }
            
            // Test deleting option
            delete_option($test_option);
            
            $deleted_check = get_option($test_option, 'not_found');
            if ($deleted_check !== 'not_found') {
                $this->errors[] = 'Database option deletion not working';
                return;
            }
            
            // Test user meta operations
            $user_id = get_current_user_id();
            if ($user_id > 0) {
                $test_meta_key = 'las_validation_test';
                $test_meta_value = 'validation_meta_value_' . time();
                
                update_user_meta($user_id, $test_meta_key, $test_meta_value);
                $retrieved_meta = get_user_meta($user_id, $test_meta_key, true);
                
                if ($retrieved_meta !== $test_meta_value) {
                    $this->warnings[] = 'User meta operations may not be working correctly';
                } else {
                    delete_user_meta($user_id, $test_meta_key);
                }
            }
            
            $this->validation_results['database'] = true;
            echo "✓ Database validation passed\n";
            
        } catch (Exception $e) {
            $this->errors[] = "Database validation failed: " . $e->getMessage();
        }
    }
    
    /**
     * Validate security measures
     */
    private function validate_security() {
        echo "Validating Security Measures...\n";
        
        try {
            // Test nonce functionality
            $nonce = wp_create_nonce('las_test_action');
            $nonce_valid = wp_verify_nonce($nonce, 'las_test_action');
            
            if (!$nonce_valid) {
                $this->errors[] = 'Nonce validation not working';
                return;
            }
            
            // Test capability checks
            if (!function_exists('current_user_can')) {
                $this->errors[] = 'WordPress capability functions not available';
                return;
            }
            
            // Test input sanitization
            if (!class_exists('SecurityManager')) {
                $this->errors[] = 'SecurityManager class not found';
                return;
            }
            
            $security_manager = new SecurityManager();
            
            $dirty_input = '<script>alert("xss")</script>test';
            $clean_input = $security_manager->sanitize($dirty_input);
            
            if (strpos($clean_input, '<script>') !== false) {
                $this->errors[] = 'Input sanitization not working properly';
                return;
            }
            
            $this->validation_results['security'] = true;
            echo "✓ Security validation passed\n";
            
        } catch (Exception $e) {
            $this->errors[] = "Security validation failed: " . $e->getMessage();
        }
    }
    
    /**
     * Validate performance requirements
     */
    private function validate_performance() {
        echo "Validating Performance Requirements...\n";
        
        try {
            $start_time = microtime(true);
            $start_memory = memory_get_usage(true);
            
            // Simulate typical operations
            for ($i = 0; $i < 100; $i++) {
                $test_option = "las_perf_test_{$i}";
                update_option($test_option, "test_value_{$i}");
                get_option($test_option);
                delete_option($test_option);
            }
            
            $end_time = microtime(true);
            $end_memory = memory_get_usage(true);
            
            $execution_time = ($end_time - $start_time) * 1000; // Convert to milliseconds
            $memory_usage = ($end_memory - $start_memory) / 1024 / 1024; // Convert to MB
            
            // Performance thresholds
            if ($execution_time > 2000) { // 2 seconds
                $this->warnings[] = "Performance test took {$execution_time}ms (threshold: 2000ms)";
            }
            
            if ($memory_usage > 25) { // 25MB
                $this->warnings[] = "Memory usage was {$memory_usage}MB (threshold: 25MB)";
            }
            
            $this->validation_results['performance'] = true;
            echo "✓ Performance validation passed\n";
            
        } catch (Exception $e) {
            $this->errors[] = "Performance validation failed: " . $e->getMessage();
        }
    }
    
    /**
     * Validate WordPress compatibility
     */
    private function validate_compatibility() {
        echo "Validating WordPress Compatibility...\n";
        
        try {
            // Check WordPress version
            global $wp_version;
            if (version_compare($wp_version, '6.0', '<')) {
                $this->warnings[] = "WordPress version {$wp_version} is below recommended 6.0+";
            }
            
            // Check required WordPress functions
            $required_functions = [
                'wp_enqueue_script',
                'wp_enqueue_style', 
                'wp_create_nonce',
                'wp_verify_nonce',
                'current_user_can',
                'add_action',
                'add_filter'
            ];
            
            $missing_functions = [];
            foreach ($required_functions as $function) {
                if (!function_exists($function)) {
                    $missing_functions[] = $function;
                }
            }
            
            if (!empty($missing_functions)) {
                $this->errors[] = 'Missing WordPress functions: ' . implode(', ', $missing_functions);
                return;
            }
            
            // Check for plugin conflicts
            $active_plugins = get_option('active_plugins', []);
            $potential_conflicts = [
                'admin-color-schemes/admin-color-schemes.php',
                'admin-menu-editor/menu-editor.php'
            ];
            
            $conflicts = array_intersect($active_plugins, $potential_conflicts);
            if (!empty($conflicts)) {
                $this->warnings[] = 'Potential plugin conflicts detected: ' . implode(', ', $conflicts);
            }
            
            $this->validation_results['compatibility'] = true;
            echo "✓ Compatibility validation passed\n";
            
        } catch (Exception $e) {
            $this->errors[] = "Compatibility validation failed: " . $e->getMessage();
        }
    }
    
    /**
     * Validate documentation
     */
    private function validate_documentation() {
        echo "Validating Documentation...\n";
        
        $required_docs = [
            'README.md',
            'CHANGELOG.md',
            'docs/USER_GUIDE.md',
            'docs/DEVELOPER_GUIDE.md',
            'docs/API.md',
            'docs/SETUP_GUIDE.md'
        ];
        
        $missing_docs = [];
        
        foreach ($required_docs as $doc) {
            $doc_path = dirname(__FILE__) . "/../{$doc}";
            if (!file_exists($doc_path)) {
                $missing_docs[] = $doc;
            } else {
                // Check if file has content
                if (filesize($doc_path) < 100) {
                    $this->warnings[] = "Documentation file {$doc} seems incomplete";
                }
            }
        }
        
        if (!empty($missing_docs)) {
            $this->warnings[] = 'Missing documentation: ' . implode(', ', $missing_docs);
        }
        
        $this->validation_results['documentation'] = true;
        echo "✓ Documentation validation passed\n";
    }
    
    /**
     * Generate validation report
     */
    private function generate_validation_report() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "FINAL SYSTEM VALIDATION REPORT\n";
        echo str_repeat("=", 60) . "\n";
        
        $total_checks = count($this->validation_results);
        $passed_checks = array_sum($this->validation_results);
        
        echo "Overall Status: ";
        if ($passed_checks === $total_checks && empty($this->errors)) {
            echo "✓ SYSTEM READY FOR PRODUCTION\n";
        } else {
            echo "✗ SYSTEM NOT READY - ISSUES FOUND\n";
        }
        
        echo "\nValidation Results:\n";
        foreach ($this->validation_results as $check => $result) {
            $status = $result ? '✓ PASS' : '✗ FAIL';
            echo "  {$check}: {$status}\n";
        }
        
        echo "\nSummary:\n";
        echo "  Passed: {$passed_checks}/{$total_checks}\n";
        echo "  Errors: " . count($this->errors) . "\n";
        echo "  Warnings: " . count($this->warnings) . "\n";
        
        if (!empty($this->errors)) {
            echo "\nERRORS:\n";
            foreach ($this->errors as $error) {
                echo "  ✗ {$error}\n";
            }
        }
        
        if (!empty($this->warnings)) {
            echo "\nWARNINGS:\n";
            foreach ($this->warnings as $warning) {
                echo "  ⚠ {$warning}\n";
            }
        }
        
        // Save report to file
        $report_data = [
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '2.0.0',
            'validation_results' => $this->validation_results,
            'passed_checks' => $passed_checks,
            'total_checks' => $total_checks,
            'errors' => $this->errors,
            'warnings' => $this->warnings,
            'system_ready' => $this->is_system_ready()
        ];
        
        $report_file = dirname(__FILE__) . '/reports/final-validation-report.json';
        if (!file_exists(dirname($report_file))) {
            wp_mkdir_p(dirname($report_file));
        }
        
        file_put_contents($report_file, json_encode($report_data, JSON_PRETTY_PRINT));
        
        echo "\nDetailed report saved to: {$report_file}\n";
    }
    
    /**
     * Check if system is ready for production
     */
    private function is_system_ready() {
        $all_passed = array_reduce($this->validation_results, function($carry, $result) {
            return $carry && $result;
        }, true);
        
        return $all_passed && empty($this->errors);
    }
}

// Run validation if called directly
if (defined('WP_CLI') && WP_CLI) {
    $validator = new FinalSystemValidator();
    $is_ready = $validator->validate();
    
    if ($is_ready) {
        WP_CLI::success('System validation completed successfully - Ready for production!');
    } else {
        WP_CLI::error('System validation failed - Please fix issues before production deployment');
    }
} elseif (isset($_GET['run_validation']) && current_user_can('manage_options')) {
    $validator = new FinalSystemValidator();
    $validator->validate();
}