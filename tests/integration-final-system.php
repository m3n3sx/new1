<?php
/**
 * Final System Integration Tests
 * 
 * Comprehensive integration testing for Live Admin Styler v2.0
 * Tests all services, modules, and components working together
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

class FinalSystemIntegrationTest extends WP_UnitTestCase {
    
    private $core_engine;
    private $test_results = [];
    
    public function setUp(): void {
        parent::setUp();
        
        // Initialize core engine with all services
        require_once dirname(__FILE__) . '/../includes/CoreEngine.php';
        $this->core_engine = CoreEngine::getInstance();
        
        // Register all services
        $this->registerAllServices();
        
        // Initialize test results tracking
        $this->test_results = [
            'services_loaded' => false,
            'dependencies_resolved' => false,
            'settings_functional' => false,
            'cache_operational' => false,
            'security_active' => false,
            'assets_loading' => false,
            'communication_working' => false,
            'live_edit_ready' => false,
            'performance_acceptable' => false
        ];
    }
    
    /**
     * Test complete system initialization
     */
    public function test_complete_system_initialization() {
        $start_time = microtime(true);
        $start_memory = memory_get_usage(true);
        
        // Test all services are properly loaded
        $this->assertTrue($this->test_all_services_loaded(), 'All services should be loaded');
        $this->test_results['services_loaded'] = true;
        
        // Test dependency injection is working
        $this->assertTrue($this->test_dependency_resolution(), 'Dependencies should resolve correctly');
        $this->test_results['dependencies_resolved'] = true;
        
        // Test settings management integration
        $this->assertTrue($this->test_settings_integration(), 'Settings integration should work');
        $this->test_results['settings_functional'] = true;
        
        // Test cache system integration
        $this->assertTrue($this->test_cache_integration(), 'Cache system should be operational');
        $this->test_results['cache_operational'] = true;
        
        // Test security system integration
        $this->assertTrue($this->test_security_integration(), 'Security system should be active');
        $this->test_results['security_active'] = true;
        
        // Performance validation
        $end_time = microtime(true);
        $end_memory = memory_get_usage(true);
        
        $execution_time = ($end_time - $start_time) * 1000; // Convert to milliseconds
        $memory_usage = ($end_memory - $start_memory) / 1024 / 1024; // Convert to MB
        
        $this->assertLessThan(2000, $execution_time, 'System initialization should complete under 2 seconds');
        $this->assertLessThan(25, $memory_usage, 'Memory usage should be under 25MB');
        $this->test_results['performance_acceptable'] = true;
        
        $this->log_integration_results();
    }
    
    /**
     * Test asset loading and optimization
     */
    public function test_asset_loading_integration() {
        $asset_loader = $this->core_engine->get('AssetLoader');
        
        // Test CSS files are properly enqueued
        $css_files = ['las-main.css', 'las-live-edit.css', 'las-utilities.css'];
        foreach ($css_files as $css_file) {
            $this->assertTrue($asset_loader->isEnqueued($css_file), "CSS file {$css_file} should be enqueued");
        }
        
        // Test JavaScript modules are loaded
        $js_modules = ['las-core.js', 'settings-manager.js', 'live-preview.js', 'ajax-manager.js'];
        foreach ($js_modules as $js_module) {
            $this->assertTrue($asset_loader->isEnqueued($js_module), "JS module {$js_module} should be enqueued");
        }
        
        $this->test_results['assets_loading'] = true;
    }
    
    /**
     * Test communication system integration
     */
    public function test_communication_integration() {
        $comm_manager = $this->core_engine->get('CommunicationManager');
        
        // Test AJAX handlers are registered
        $ajax_actions = ['save_settings', 'load_template', 'export_settings', 'validate_css'];
        foreach ($ajax_actions as $action) {
            $this->assertTrue($comm_manager->isActionRegistered($action), "AJAX action {$action} should be registered");
        }
        
        // Test REST API endpoints
        $rest_routes = ['/las/v1/settings', '/las/v1/templates', '/las/v1/preview'];
        foreach ($rest_routes as $route) {
            $this->assertTrue($comm_manager->isRouteRegistered($route), "REST route {$route} should be registered");
        }
        
        $this->test_results['communication_working'] = true;
    }
    
    /**
     * Test live edit system integration
     */
    public function test_live_edit_integration() {
        // Test live edit components are initialized
        $live_edit_components = [
            'LiveEditEngine',
            'MicroPanelSystem', 
            'CSSVariablesEngine',
            'ColorPicker',
            'GradientBuilder'
        ];
        
        foreach ($live_edit_components as $component) {
            $this->assertTrue(
                class_exists($component), 
                "Live edit component {$component} should exist"
            );
        }
        
        $this->test_results['live_edit_ready'] = true;
    }
    
    /**
     * Test end-to-end workflow
     */
    public function test_end_to_end_workflow() {
        // Simulate complete user workflow
        $settings_manager = $this->core_engine->get('SettingsManager');
        $style_generator = $this->core_engine->get('StyleGenerator');
        
        // 1. Load default settings
        $default_settings = $settings_manager->getDefaults();
        $this->assertNotEmpty($default_settings, 'Default settings should be available');
        
        // 2. Modify settings
        $test_settings = [
            'menu_background_color' => '#ff0000',
            'adminbar_height' => '40px',
            'theme_mode' => 'dark'
        ];
        
        foreach ($test_settings as $key => $value) {
            $settings_manager->set($key, $value);
            $this->assertEquals($value, $settings_manager->get($key), "Setting {$key} should be saved correctly");
        }
        
        // 3. Generate CSS
        $generated_css = $style_generator->generateCSS($test_settings);
        $this->assertNotEmpty($generated_css, 'CSS should be generated');
        $this->assertStringContains('--las-menu-background-color: #ff0000', $generated_css, 'CSS should contain custom variables');
        
        // 4. Apply template
        $template_manager = $this->core_engine->get('TemplateManager');
        $template_applied = $template_manager->applyTemplate('minimal');
        $this->assertTrue($template_applied, 'Template should be applied successfully');
        
        // 5. Export/Import settings
        $exported_settings = $settings_manager->exportSettings();
        $this->assertNotEmpty($exported_settings, 'Settings should be exportable');
        
        $import_result = $settings_manager->importSettings($exported_settings);
        $this->assertTrue($import_result, 'Settings should be importable');
    }
    
    /**
     * Register all services for testing
     */
    private function registerAllServices() {
        $services = [
            'SettingsManager' => function() {
                return new SettingsManager(
                    $this->core_engine->get('CacheManager'),
                    $this->core_engine->get('SecurityManager')
                );
            },
            'CacheManager' => function() {
                return new CacheManager();
            },
            'SecurityManager' => function() {
                return new SecurityManager();
            },
            'StyleGenerator' => function() {
                return new StyleGenerator(
                    $this->core_engine->get('CacheManager')
                );
            },
            'AssetLoader' => function() {
                return new AssetLoader();
            },
            'CommunicationManager' => function() {
                return new CommunicationManager(
                    $this->core_engine->get('SecurityManager')
                );
            },
            'TemplateManager' => function() {
                return new TemplateManager(
                    $this->core_engine->get('SettingsManager')
                );
            },
            'PerformanceMonitor' => function() {
                return new PerformanceMonitor();
            }
        ];
        
        foreach ($services as $name => $factory) {
            $this->core_engine->register($name, $factory);
        }
    }
    
    /**
     * Test all services are loaded
     */
    private function test_all_services_loaded() {
        $required_services = [
            'SettingsManager', 'CacheManager', 'SecurityManager', 
            'StyleGenerator', 'AssetLoader', 'CommunicationManager',
            'TemplateManager', 'PerformanceMonitor'
        ];
        
        foreach ($required_services as $service) {
            if (!$this->core_engine->has($service)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Test dependency resolution
     */
    private function test_dependency_resolution() {
        try {
            // Test circular dependency detection
            $settings_manager = $this->core_engine->get('SettingsManager');
            $cache_manager = $this->core_engine->get('CacheManager');
            $security_manager = $this->core_engine->get('SecurityManager');
            
            return ($settings_manager instanceof SettingsManager) &&
                   ($cache_manager instanceof CacheManager) &&
                   ($security_manager instanceof SecurityManager);
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Test settings integration
     */
    private function test_settings_integration() {
        $settings_manager = $this->core_engine->get('SettingsManager');
        
        // Test basic operations
        $settings_manager->set('test_key', 'test_value');
        $retrieved_value = $settings_manager->get('test_key');
        
        return $retrieved_value === 'test_value';
    }
    
    /**
     * Test cache integration
     */
    private function test_cache_integration() {
        $cache_manager = $this->core_engine->get('CacheManager');
        
        // Test cache operations
        $cache_manager->set('test_cache_key', 'test_cache_value', 3600);
        $cached_value = $cache_manager->get('test_cache_key');
        
        return $cached_value === 'test_cache_value';
    }
    
    /**
     * Test security integration
     */
    private function test_security_integration() {
        $security_manager = $this->core_engine->get('SecurityManager');
        
        // Test input sanitization
        $dirty_input = '<script>alert("xss")</script>test';
        $clean_input = $security_manager->sanitize($dirty_input);
        
        return !strpos($clean_input, '<script>') && strpos($clean_input, 'test') !== false;
    }
    
    /**
     * Log integration test results
     */
    private function log_integration_results() {
        $log_file = dirname(__FILE__) . '/reports/final-integration-results.json';
        
        $results = [
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '2.0.0',
            'test_results' => $this->test_results,
            'overall_status' => array_reduce($this->test_results, function($carry, $result) {
                return $carry && $result;
            }, true) ? 'PASS' : 'FAIL'
        ];
        
        if (!file_exists(dirname($log_file))) {
            wp_mkdir_p(dirname($log_file));
        }
        
        file_put_contents($log_file, json_encode($results, JSON_PRETTY_PRINT));
    }
    
    public function tearDown(): void {
        // Clean up test data
        delete_option('las_fresh_test_key');
        wp_cache_flush();
        
        parent::tearDown();
    }
}