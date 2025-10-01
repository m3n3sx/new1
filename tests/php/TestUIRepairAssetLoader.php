<?php
/**
 * Integration Tests for UI Repair Asset Loader
 * Tests asset loading, dependency management, and fallback mechanisms
 */

class TestUIRepairAssetLoader extends WP_UnitTestCase {
    
    /**
     * Asset loader instance
     *
     * @var LAS_UI_Repair_Asset_Loader
     */
    private $asset_loader;
    
    /**
     * Test user ID
     *
     * @var int
     */
    private $admin_user_id;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        // Create admin user
        $this->admin_user_id = $this->factory->user->create(array(
            'role' => 'administrator'
        ));
        wp_set_current_user($this->admin_user_id);
        
        // Set admin context
        set_current_screen('toplevel_page_live-admin-styler-settings');
        
        // Initialize asset loader
        $this->asset_loader = new LAS_UI_Repair_Asset_Loader();
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        // Clean up enqueued scripts and styles
        global $wp_scripts, $wp_styles;
        $wp_scripts->queue = array();
        $wp_styles->queue = array();
        
        parent::tearDown();
    }
    
    /**
     * Test asset loader initialization
     */
    public function test_asset_loader_initialization() {
        $this->assertInstanceOf('LAS_UI_Repair_Asset_Loader', $this->asset_loader);
        $this->assertEmpty($this->asset_loader->get_loaded_assets());
        $this->assertEmpty($this->asset_loader->get_loading_errors());
    }
    
    /**
     * Test should load assets on correct pages
     */
    public function test_should_load_assets_on_settings_page() {
        // Test on settings page
        set_current_screen('toplevel_page_live-admin-styler-settings');
        
        // Use reflection to test private method
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('should_load_assets');
        $method->setAccessible(true);
        
        $result = $method->invoke($this->asset_loader, 'toplevel_page_live-admin-styler-settings');
        $this->assertTrue($result);
    }
    
    /**
     * Test should not load assets on other pages
     */
    public function test_should_not_load_assets_on_other_pages() {
        set_current_screen('edit-post');
        
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('should_load_assets');
        $method->setAccessible(true);
        
        $result = $method->invoke($this->asset_loader, 'edit-post');
        $this->assertFalse($result);
    }
    
    /**
     * Test environment validation
     */
    public function test_environment_validation() {
        // Mock admin context
        $GLOBALS['current_screen'] = (object) array('id' => 'toplevel_page_live-admin-styler-settings');
        
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('validate_environment');
        $method->setAccessible(true);
        
        $result = $method->invoke($this->asset_loader);
        $this->assertTrue($result);
    }
    
    /**
     * Test environment validation failure with insufficient permissions
     */
    public function test_environment_validation_fails_with_insufficient_permissions() {
        // Create user without admin permissions
        $user_id = $this->factory->user->create(array('role' => 'subscriber'));
        wp_set_current_user($user_id);
        
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('validate_environment');
        $method->setAccessible(true);
        
        $this->expectException('Exception');
        $this->expectExceptionMessage('Insufficient user permissions');
        
        $method->invoke($this->asset_loader);
    }
    
    /**
     * Test core dependencies loading
     */
    public function test_core_dependencies_loading() {
        // Mock the enqueue_ui_repair_assets method call
        $this->asset_loader->enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        // Check that core dependencies are enqueued
        $this->assertTrue(wp_script_is('jquery', 'enqueued'));
        $this->assertTrue(wp_script_is('wp-util', 'enqueued'));
        
        // Check that assets were tracked
        $loaded_assets = $this->asset_loader->get_loaded_assets();
        $this->assertContains('jquery', $loaded_assets);
        $this->assertContains('wp-util', $loaded_assets);
    }
    
    /**
     * Test UI repair script loading
     */
    public function test_ui_repair_script_loading() {
        // Create the UI repair script file for testing
        $script_path = plugin_dir_path(dirname(dirname(__FILE__))) . 'assets/js/ui-repair.js';
        $script_dir = dirname($script_path);
        
        if (!is_dir($script_dir)) {
            wp_mkdir_p($script_dir);
        }
        
        file_put_contents($script_path, '// Test UI repair script');
        
        // Load assets
        $this->asset_loader->enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        // Check that UI repair script is enqueued
        $this->assertTrue(wp_script_is('las-ui-repair', 'enqueued'));
        
        // Check that script data is localized
        global $wp_scripts;
        $script_data = $wp_scripts->get_data('las-ui-repair', 'data');
        $this->assertNotEmpty($script_data);
        $this->assertStringContains('lasAdminData', $script_data);
        
        // Clean up
        unlink($script_path);
    }
    
    /**
     * Test UI repair CSS loading
     */
    public function test_ui_repair_css_loading() {
        // Load assets (this should create CSS file if it doesn't exist)
        $this->asset_loader->enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        // Check that UI repair CSS is enqueued
        $this->assertTrue(wp_style_is('las-ui-repair-css', 'enqueued'));
        
        // Check that CSS file was created
        $css_path = plugin_dir_path(dirname(dirname(__FILE__))) . 'assets/css/ui-repair.css';
        $this->assertFileExists($css_path);
        
        // Check CSS content
        $css_content = file_get_contents($css_path);
        $this->assertStringContains('las-ui-error', $css_content);
        $this->assertStringContains('las-ui-degraded', $css_content);
    }
    
    /**
     * Test optional dependency loading with fallback
     */
    public function test_optional_dependency_fallback() {
        // Mock a scenario where jQuery UI slider is not available
        global $wp_scripts;
        
        // Remove jQuery UI slider from registered scripts
        unset($wp_scripts->registered['jquery-ui-slider']);
        
        // Load assets
        $this->asset_loader->enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        // The asset loader should handle the missing dependency gracefully
        $errors = $this->asset_loader->get_loading_errors();
        
        // Should not have critical errors (optional dependencies can fail)
        $critical_errors = array_filter($errors, function($error) {
            return strpos($error['message'], 'ui-repair') !== false;
        });
        
        $this->assertEmpty($critical_errors);
    }
    
    /**
     * Test file version generation for cache busting
     */
    public function test_file_version_generation() {
        // Create a test file
        $test_file = plugin_dir_path(dirname(dirname(__FILE__))) . 'test-file.js';
        file_put_contents($test_file, '// Test file');
        
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('get_file_version');
        $method->setAccessible(true);
        
        $version = $method->invoke($this->asset_loader, $test_file);
        
        // Version should include plugin version and file modification time
        $this->assertStringContains(LAS_FRESH_VERSION, $version);
        $this->assertStringContains((string)filemtime($test_file), $version);
        
        // Clean up
        unlink($test_file);
    }
    
    /**
     * Test graceful degradation fallback
     */
    public function test_graceful_degradation_fallback() {
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('execute_fallback');
        $method->setAccessible(true);
        
        // Capture output
        ob_start();
        
        // Execute graceful degradation fallback
        $method->invoke($this->asset_loader, 'enable_graceful_degradation', 'test-handle');
        
        // Trigger admin_footer action to execute the fallback
        do_action('admin_footer');
        
        $output = ob_get_clean();
        
        // Should contain graceful degradation script
        $this->assertStringContains('las-ui-degraded', $output);
        $this->assertStringContains('console.log', $output);
    }
    
    /**
     * Test AJAX asset validation
     */
    public function test_ajax_asset_validation() {
        // Set up AJAX request
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        $_POST['action'] = 'las_validate_assets';
        
        // Capture output
        ob_start();
        
        try {
            $this->asset_loader->ajax_validate_assets();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        
        // Should return JSON success response
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('loaded_assets', $response['data']);
        $this->assertArrayHasKey('loading_errors', $response['data']);
    }
    
    /**
     * Test AJAX asset validation with invalid nonce
     */
    public function test_ajax_asset_validation_invalid_nonce() {
        // Set up AJAX request with invalid nonce
        $_POST['nonce'] = 'invalid_nonce';
        $_POST['action'] = 'las_validate_assets';
        
        ob_start();
        
        try {
            $this->asset_loader->ajax_validate_assets();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        
        // Should return JSON error response
        $response = json_decode($output, true);
        $this->assertFalse($response['success']);
        $this->assertEquals('Invalid security token', $response['data']);
    }
    
    /**
     * Test asset cleanup
     */
    public function test_asset_cleanup() {
        // Set some test options
        update_option('las_ui_repair_asset_cache', array('test' => 'data'));
        set_transient('las_ui_repair_dependencies', array('test' => 'data'), 3600);
        
        // Run cleanup
        $this->asset_loader->cleanup_assets();
        
        // Check that options were removed
        $this->assertFalse(get_option('las_ui_repair_asset_cache'));
        $this->assertFalse(get_transient('las_ui_repair_dependencies'));
    }
    
    /**
     * Test error handling during asset loading
     */
    public function test_error_handling_during_loading() {
        // Create a scenario that will cause an error (missing file)
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('load_ui_repair_script');
        $method->setAccessible(true);
        
        // Remove the UI repair script file if it exists
        $script_path = plugin_dir_path(dirname(dirname(__FILE__))) . 'assets/js/ui-repair.js';
        if (file_exists($script_path)) {
            rename($script_path, $script_path . '.backup');
        }
        
        // This should throw an exception
        $this->expectException('Exception');
        $this->expectExceptionMessage('UI repair script file not found');
        
        $method->invoke($this->asset_loader);
        
        // Restore file if it was backed up
        if (file_exists($script_path . '.backup')) {
            rename($script_path . '.backup', $script_path);
        }
    }
    
    /**
     * Test asset loading status tracking
     */
    public function test_asset_loading_status_tracking() {
        // Initially no assets should be loaded
        $this->assertFalse($this->asset_loader->is_asset_loaded('jquery'));
        
        // Load assets
        $this->asset_loader->enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        // Now jQuery should be tracked as loaded
        $this->assertTrue($this->asset_loader->is_asset_loaded('jquery'));
        
        // Check loaded assets list
        $loaded_assets = $this->asset_loader->get_loaded_assets();
        $this->assertIsArray($loaded_assets);
        $this->assertNotEmpty($loaded_assets);
    }
    
    /**
     * Test localized script data structure
     */
    public function test_localized_script_data_structure() {
        // Load assets to trigger localization
        $this->asset_loader->enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        // Get localized data
        global $wp_scripts;
        $script_data = $wp_scripts->get_data('las-ui-repair', 'data');
        
        $this->assertNotEmpty($script_data);
        
        // Parse the localized data
        preg_match('/var lasAdminData = ({.*?});/', $script_data, $matches);
        $this->assertNotEmpty($matches);
        
        $data = json_decode($matches[1], true);
        
        // Check required data structure
        $this->assertArrayHasKey('ajaxUrl', $data);
        $this->assertArrayHasKey('nonce', $data);
        $this->assertArrayHasKey('debug', $data);
        $this->assertArrayHasKey('version', $data);
        $this->assertArrayHasKey('uiRepair', $data);
        $this->assertArrayHasKey('strings', $data);
        
        // Check UI repair specific configuration
        $this->assertArrayHasKey('timeout', $data['uiRepair']);
        $this->assertArrayHasKey('retryAttempts', $data['uiRepair']);
        $this->assertArrayHasKey('debounceDelay', $data['uiRepair']);
    }
}