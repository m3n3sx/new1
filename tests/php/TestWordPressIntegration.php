<?php
/**
 * WordPress Integration Tests for UI Repair System
 * 
 * Tests WordPress admin integration, capability checks, and security validation
 * for the UI repair functionality.
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestWordPressIntegration extends WP_UnitTestCase {
    
    /**
     * UI Repair Asset Loader instance
     *
     * @var LAS_UI_Repair_Asset_Loader
     */
    private $asset_loader;
    
    /**
     * Test user ID
     *
     * @var int
     */
    private $test_user_id;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        // Create test user with admin capabilities
        $this->test_user_id = $this->factory->user->create(array(
            'role' => 'administrator'
        ));
        
        // Set current user
        wp_set_current_user($this->test_user_id);
        
        // Initialize asset loader
        if (!class_exists('LAS_UI_Repair_Asset_Loader')) {
            require_once dirname(dirname(__DIR__)) . '/includes/UIRepairAssetLoader.php';
        }
        
        $this->asset_loader = new LAS_UI_Repair_Asset_Loader();
        
        // Set admin context
        set_current_screen('toplevel_page_live-admin-styler-settings');
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        wp_delete_user($this->test_user_id);
        parent::tearDown();
    }
    
    /**
     * Test WordPress admin integration initialization
     */
    public function test_wordpress_admin_integration_init() {
        // Test that UI repair system initializes in admin context
        $this->assertTrue(is_admin());
        $this->assertTrue(current_user_can('manage_options'));
        
        // Test that required functions are available
        $this->assertTrue(function_exists('las_fresh_init_ui_repair_system'));
        $this->assertTrue(function_exists('las_fresh_enqueue_ui_repair_assets'));
        $this->assertTrue(function_exists('las_fresh_ajax_save_tab_state'));
        
        // Test that hooks are properly registered
        $this->assertNotFalse(has_action('admin_init', 'las_fresh_init_ui_repair_system'));
        $this->assertNotFalse(has_action('admin_enqueue_scripts', 'las_fresh_enqueue_ui_repair_assets'));
    }
    
    /**
     * Test capability checks for UI repair functionality
     */
    public function test_capability_checks() {
        // Test with admin user
        wp_set_current_user($this->test_user_id);
        $this->assertTrue(current_user_can('manage_options'));
        
        // Test with non-admin user
        $subscriber_id = $this->factory->user->create(array('role' => 'subscriber'));
        wp_set_current_user($subscriber_id);
        $this->assertFalse(current_user_can('manage_options'));
        
        // Test with no user
        wp_set_current_user(0);
        $this->assertFalse(current_user_can('manage_options'));
        
        // Clean up
        wp_delete_user($subscriber_id);
        wp_set_current_user($this->test_user_id);
    }
    
    /**
     * Test AJAX security validation
     */
    public function test_ajax_security_validation() {
        // Test nonce validation
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        $_POST['tab_id'] = 'general';
        
        // Capture output
        ob_start();
        las_fresh_ajax_save_tab_state();
        $output = ob_get_clean();
        
        // Should succeed with valid nonce and permissions
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        
        // Test with invalid nonce
        $_POST['nonce'] = 'invalid_nonce';
        
        ob_start();
        las_fresh_ajax_save_tab_state();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertFalse($response['success']);
        $this->assertEquals('Invalid security token', $response['data']);
    }
    
    /**
     * Test asset enqueuing on correct pages
     */
    public function test_asset_enqueuing_page_restriction() {
        // Test on Live Admin Styler settings page
        set_current_screen('toplevel_page_live-admin-styler-settings');
        
        // Mock the asset loader method
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('should_load_assets');
        $method->setAccessible(true);
        
        $should_load = $method->invoke($this->asset_loader, 'toplevel_page_live-admin-styler-settings');
        $this->assertTrue($should_load);
        
        // Test on different admin page
        $should_load = $method->invoke($this->asset_loader, 'edit.php');
        $this->assertFalse($should_load);
    }
    
    /**
     * Test WordPress version compatibility
     */
    public function test_wordpress_version_compatibility() {
        global $wp_version;
        
        // Test minimum version requirement
        $this->assertGreaterThanOrEqual('5.0', $wp_version, 'WordPress 5.0+ required for UI repair system');
        
        // Test that compatibility notices work
        ob_start();
        las_fresh_show_compatibility_notices();
        $output = ob_get_clean();
        
        // Should not show version warning for supported versions
        if (version_compare($wp_version, '5.0', '>=')) {
            $this->assertStringNotContainsString('WordPress 5.0 or higher is required', $output);
        }
    }
    
    /**
     * Test multisite compatibility
     */
    public function test_multisite_compatibility() {
        // Test multisite detection
        $is_multisite = is_multisite();
        
        // Test that multisite-specific functionality works
        if ($is_multisite) {
            $this->assertTrue(function_exists('is_network_admin'));
            
            // Test network admin detection
            $is_network_admin = is_network_admin();
            $this->assertIsBool($is_network_admin);
        }
        
        // Test admin body classes include multisite info
        $body_classes = las_fresh_add_admin_body_classes('');
        
        if ($is_multisite) {
            $this->assertStringContainsString('las-multisite', $body_classes);
        } else {
            $this->assertStringNotContainsString('las-multisite', $body_classes);
        }
    }
    
    /**
     * Test RTL language support
     */
    public function test_rtl_language_support() {
        // Test RTL detection
        $is_rtl = is_rtl();
        $this->assertIsBool($is_rtl);
        
        // Test that RTL class is added when appropriate
        $body_classes = las_fresh_add_admin_body_classes('');
        
        if ($is_rtl) {
            $this->assertStringContainsString('las-rtl', $body_classes);
        }
        
        // Test localization data includes text direction
        wp_enqueue_script('las-ui-repair', '', array(), '1.0.0');
        las_fresh_enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        global $wp_scripts;
        $localized_data = $wp_scripts->get_data('las-ui-repair', 'data');
        
        if ($localized_data) {
            $this->assertStringContainsString('textDirection', $localized_data);
            $expected_direction = $is_rtl ? 'rtl' : 'ltr';
            $this->assertStringContainsString($expected_direction, $localized_data);
        }
    }
    
    /**
     * Test admin color scheme integration
     */
    public function test_admin_color_scheme_integration() {
        // Set admin color scheme
        update_user_option($this->test_user_id, 'admin_color', 'blue');
        
        // Test that color scheme is included in body classes
        $body_classes = las_fresh_add_admin_body_classes('');
        $this->assertStringContainsString('las-admin-color-blue', $body_classes);
        
        // Test that color scheme is included in localized data
        wp_enqueue_script('las-ui-repair', '', array(), '1.0.0');
        las_fresh_enqueue_ui_repair_assets('toplevel_page_live-admin-styler-settings');
        
        global $wp_scripts;
        $localized_data = $wp_scripts->get_data('las-ui-repair', 'data');
        
        if ($localized_data) {
            $this->assertStringContainsString('adminColorScheme', $localized_data);
            $this->assertStringContainsString('blue', $localized_data);
        }
    }
    
    /**
     * Test user state management integration
     */
    public function test_user_state_management_integration() {
        // Test user state class integration
        $user_state = new LAS_User_State($this->test_user_id);
        
        $this->assertEquals($this->test_user_id, $user_state->get_user_id());
        $this->assertTrue($user_state->has_permissions());
        
        // Test tab state persistence
        $this->assertTrue($user_state->set_active_tab('menu'));
        $this->assertEquals('menu', $user_state->get_active_tab());
        
        // Test UI preferences
        $preferences = $user_state->get_ui_preferences();
        $this->assertIsArray($preferences);
        $this->assertArrayHasKey('ui_theme', $preferences);
        $this->assertArrayHasKey('live_preview_enabled', $preferences);
    }
    
    /**
     * Test AJAX handlers functionality
     */
    public function test_ajax_handlers_functionality() {
        // Test save tab state AJAX handler
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        $_POST['tab_id'] = 'adminbar';
        
        ob_start();
        las_fresh_ajax_save_tab_state();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertEquals('adminbar', $response['data']['tab_id']);
        
        // Test get UI state AJAX handler
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        
        ob_start();
        las_fresh_ajax_get_ui_state();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('active_tab', $response['data']);
        $this->assertArrayHasKey('ui_preferences', $response['data']);
        
        // Test validation AJAX handler
        ob_start();
        las_fresh_ajax_validate_ui_repair();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('wordpress_version', $response['data']);
        $this->assertArrayHasKey('user_capabilities', $response['data']);
    }
    
    /**
     * Test error handling and graceful degradation
     */
    public function test_error_handling_and_graceful_degradation() {
        // Test with invalid tab ID
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        $_POST['tab_id'] = 'invalid_tab';
        
        ob_start();
        las_fresh_ajax_save_tab_state();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertFalse($response['success']);
        $this->assertEquals('Invalid tab ID', $response['data']);
        
        // Test without proper permissions
        $subscriber_id = $this->factory->user->create(array('role' => 'subscriber'));
        wp_set_current_user($subscriber_id);
        
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        $_POST['tab_id'] = 'general';
        
        ob_start();
        las_fresh_ajax_save_tab_state();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertFalse($response['success']);
        $this->assertEquals('Insufficient permissions', $response['data']);
        
        // Clean up
        wp_delete_user($subscriber_id);
        wp_set_current_user($this->test_user_id);
    }
    
    /**
     * Test asset loading validation
     */
    public function test_asset_loading_validation() {
        // Test that required assets are tracked
        $loaded_assets = $this->asset_loader->get_loaded_assets();
        $this->assertIsArray($loaded_assets);
        
        // Test loading error tracking
        $loading_errors = $this->asset_loader->get_loading_errors();
        $this->assertIsArray($loading_errors);
        
        // Test specific asset loading check
        $this->assertIsBool($this->asset_loader->is_asset_loaded('jquery'));
    }
    
    /**
     * Test WordPress hooks integration
     */
    public function test_wordpress_hooks_integration() {
        // Test that all required hooks are registered
        $required_hooks = array(
            'admin_init' => 'las_fresh_init_ui_repair_system',
            'admin_enqueue_scripts' => 'las_fresh_enqueue_ui_repair_assets',
            'admin_footer' => 'las_fresh_add_ui_repair_inline_scripts',
            'admin_notices' => 'las_fresh_show_ui_repair_notices',
            'wp_ajax_las_save_tab_state' => 'las_fresh_ajax_save_tab_state',
            'wp_ajax_las_get_ui_state' => 'las_fresh_ajax_get_ui_state',
            'wp_ajax_las_validate_ui_repair' => 'las_fresh_ajax_validate_ui_repair'
        );
        
        foreach ($required_hooks as $hook => $function) {
            $this->assertNotFalse(
                has_action($hook, $function),
                "Hook {$hook} should be registered with function {$function}"
            );
        }
        
        // Test filter hooks
        $this->assertNotFalse(has_filter('admin_body_class', 'las_fresh_add_admin_body_classes'));
    }
}