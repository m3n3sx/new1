<?php
/**
 * WordPress Asset Loading Integration Tests
 * 
 * Tests for the WordPress asset enqueuing system in Live Admin Styler
 * live preview critical repair implementation.
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestWordPressAssetLoading extends WP_UnitTestCase {
    
    /**
     * Test setup
     */
    public function setUp(): void {
        parent::setUp();
        
        // Ensure we're testing in admin context
        set_current_screen('settings_page_live-admin-styler-settings');
        
        // Create admin user for capability tests
        $this->admin_user = $this->factory->user->create(array(
            'role' => 'administrator'
        ));
        wp_set_current_user($this->admin_user);
    }
    
    /**
     * Test that assets are only enqueued on plugin admin pages
     */
    public function test_conditional_asset_loading() {
        // Test on plugin admin page
        $_GET['page'] = 'live-admin-styler-settings';
        
        // Simulate admin_enqueue_scripts hook
        do_action('admin_enqueue_scripts', 'settings_page_live-admin-styler-settings');
        
        // Check that main script is enqueued
        $this->assertTrue(wp_script_is('las-fresh-admin-settings-js', 'enqueued'));
        
        // Check that live preview script is enqueued
        $this->assertTrue(wp_script_is('las-fresh-live-preview-js', 'enqueued'));
        
        // Check that main stylesheet is enqueued
        $this->assertTrue(wp_style_is('las-fresh-admin-style-css', 'enqueued'));
    }
    
    /**
     * Test that assets are NOT enqueued on non-plugin pages
     */
    public function test_assets_not_loaded_on_other_pages() {
        // Clear any existing enqueued scripts
        global $wp_scripts, $wp_styles;
        $wp_scripts = new WP_Scripts();
        $wp_styles = new WP_Styles();
        
        // Test on different admin page
        unset($_GET['page']);
        
        // Simulate admin_enqueue_scripts hook for different page
        do_action('admin_enqueue_scripts', 'edit.php');
        
        // Check that plugin scripts are NOT enqueued
        $this->assertFalse(wp_script_is('las-fresh-admin-settings-js', 'enqueued'));
        $this->assertFalse(wp_script_is('las-fresh-live-preview-js', 'enqueued'));
        $this->assertFalse(wp_style_is('las-fresh-admin-style-css', 'enqueued'));
    }
    
    /**
     * Test proper script dependencies
     */
    public function test_script_dependencies() {
        $_GET['page'] = 'live-admin-styler-settings';
        
        // Enqueue assets
        do_action('admin_enqueue_scripts', 'settings_page_live-admin-styler-settings');
        
        global $wp_scripts;
        
        // Check that admin settings script has proper dependencies
        $admin_script = $wp_scripts->registered['las-fresh-admin-settings-js'];
        $this->assertContains('jquery', $admin_script->deps);
        $this->assertContains('wp-util', $admin_script->deps);
        
        // Check that live preview script depends on admin settings
        $preview_script = $wp_scripts->registered['las-fresh-live-preview-js'];
        $this->assertContains('las-fresh-admin-settings-js', $preview_script->deps);
        
        // Check that communication script has proper dependencies
        if (isset($wp_scripts->registered['las-fresh-communication-js'])) {
            $comm_script = $wp_scripts->registered['las-fresh-communication-js'];
            $this->assertContains('las-fresh-admin-settings-js', $comm_script->deps);
            $this->assertContains('wp-util', $comm_script->deps);
        }
    }
    
    /**
     * Test script localization
     */
    public function test_script_localization() {
        $_GET['page'] = 'live-admin-styler-settings';
        
        // Enqueue assets
        do_action('admin_enqueue_scripts', 'settings_page_live-admin-styler-settings');
        
        global $wp_scripts;
        
        // Check that lasAdminData is localized
        $admin_script = $wp_scripts->registered['las-fresh-admin-settings-js'];
        $this->assertNotEmpty($admin_script->extra['data']);
        
        // Parse the localized data
        $localized_data = $admin_script->extra['data'];
        $this->assertStringContains('lasAdminData', $localized_data);
        
        // Check for required AJAX configuration
        $this->assertStringContains('ajax_url', $localized_data);
        $this->assertStringContains('nonce', $localized_data);
        $this->assertStringContains('ajax_actions', $localized_data);
    }
    
    /**
     * Test AJAX configuration in localized data
     */
    public function test_ajax_configuration() {
        $_GET['page'] = 'live-admin-styler-settings';
        
        // Create localization data
        $jquery_ui_available = array('tabs' => true, 'slider' => true);
        $localization_data = las_fresh_create_localization_data($jquery_ui_available);
        
        // Check AJAX URL
        $this->assertEquals(admin_url('admin-ajax.php'), $localization_data['ajax_url']);
        
        // Check nonce is present
        $this->assertNotEmpty($localization_data['nonce']);
        
        // Check AJAX actions are defined
        $this->assertArrayHasKey('ajax_actions', $localization_data);
        $this->assertArrayHasKey('save_settings', $localization_data['ajax_actions']);
        $this->assertArrayHasKey('load_settings', $localization_data['ajax_actions']);
        $this->assertArrayHasKey('log_error', $localization_data['ajax_actions']);
        
        // Check performance settings
        $this->assertArrayHasKey('timeout', $localization_data);
        $this->assertEquals(10000, $localization_data['timeout']);
        $this->assertArrayHasKey('retry_attempts', $localization_data);
        $this->assertEquals(3, $localization_data['retry_attempts']);
        
        // Check live preview configuration
        $this->assertArrayHasKey('live_preview', $localization_data);
        $this->assertArrayHasKey('enabled', $localization_data['live_preview']);
        $this->assertArrayHasKey('debounce', $localization_data['live_preview']);
    }
    
    /**
     * Test fallback asset loading
     */
    public function test_fallback_asset_loading() {
        // Mock a scenario where main enqueuing fails
        // This would typically be tested by temporarily breaking dependencies
        
        // Call fallback function directly
        las_fresh_enqueue_fallback_assets('1.0.0', '1.0.0');
        
        // Check that jQuery is enqueued
        $this->assertTrue(wp_script_is('jquery', 'enqueued'));
        
        // Check that basic admin script is enqueued
        $this->assertTrue(wp_script_is('las-fresh-admin-settings-js', 'enqueued'));
        
        // Check that basic styles are enqueued
        $this->assertTrue(wp_style_is('las-fresh-admin-style-css', 'enqueued'));
        
        // Check fallback localization
        global $wp_scripts;
        $admin_script = $wp_scripts->registered['las-fresh-admin-settings-js'];
        $localized_data = $admin_script->extra['data'];
        $this->assertStringContains('fallback_mode', $localized_data);
    }
    
    /**
     * Test admin page detection
     */
    public function test_admin_page_detection() {
        // Test direct hook suffix check
        $this->assertTrue(las_fresh_is_plugin_admin_page('settings_page_live-admin-styler-settings'));
        
        // Test with GET parameter
        $_GET['page'] = 'live-admin-styler-settings';
        $this->assertTrue(las_fresh_is_plugin_admin_page('some-other-page'));
        
        // Test negative case
        unset($_GET['page']);
        $this->assertFalse(las_fresh_is_plugin_admin_page('edit.php'));
    }
    
    /**
     * Test script loading in footer
     */
    public function test_scripts_load_in_footer() {
        $_GET['page'] = 'live-admin-styler-settings';
        
        // Enqueue assets
        do_action('admin_enqueue_scripts', 'settings_page_live-admin-styler-settings');
        
        global $wp_scripts;
        
        // Check that main scripts are set to load in footer
        $admin_script = $wp_scripts->registered['las-fresh-admin-settings-js'];
        $this->assertEquals(1, $admin_script->args); // 1 means footer
        
        $preview_script = $wp_scripts->registered['las-fresh-live-preview-js'];
        $this->assertEquals(1, $preview_script->args);
    }
    
    /**
     * Test nonce generation and validation
     */
    public function test_nonce_generation() {
        $localization_data = las_fresh_create_localization_data(array());
        
        // Check that nonces are generated
        $this->assertNotEmpty($localization_data['nonce']);
        $this->assertNotEmpty($localization_data['admin_nonce']);
        
        // Check nonce actions
        $this->assertEquals('las_ajax_nonce', $localization_data['nonce_action']);
        
        // Verify nonces are valid
        $this->assertTrue(wp_verify_nonce($localization_data['nonce'], 'las_ajax_nonce'));
        $this->assertTrue(wp_verify_nonce($localization_data['admin_nonce'], 'las_fresh_admin_nonce'));
    }
    
    /**
     * Test error handling in asset loading
     */
    public function test_asset_loading_error_handling() {
        // This test would check that errors in asset loading are properly caught
        // and fallback assets are loaded
        
        // Mock WP_DEBUG to test error logging
        if (!defined('WP_DEBUG')) {
            define('WP_DEBUG', true);
        }
        
        $_GET['page'] = 'live-admin-styler-settings';
        
        // Capture error log output
        $error_log_before = error_get_last();
        
        // Enqueue assets (should succeed normally)
        do_action('admin_enqueue_scripts', 'settings_page_live-admin-styler-settings');
        
        // In normal conditions, no errors should be logged
        $error_log_after = error_get_last();
        
        // If there was an error, it should be the same as before (no new errors)
        $this->assertEquals($error_log_before, $error_log_after);
    }
    
    /**
     * Test capability requirements
     */
    public function test_capability_requirements() {
        // Test with user without manage_options capability
        $subscriber = $this->factory->user->create(array('role' => 'subscriber'));
        wp_set_current_user($subscriber);
        
        $_GET['page'] = 'live-admin-styler-settings';
        
        // Create localization data
        $localization_data = las_fresh_create_localization_data(array());
        
        // User ID should still be included but capabilities will be checked server-side
        $this->assertEquals($subscriber, $localization_data['user_id']);
        
        // Switch back to admin user
        wp_set_current_user($this->admin_user);
        
        $admin_localization_data = las_fresh_create_localization_data(array());
        $this->assertEquals($this->admin_user, $admin_localization_data['user_id']);
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        // Clean up global variables
        unset($_GET['page']);
        
        // Reset current screen
        set_current_screen('dashboard');
        
        parent::tearDown();
    }
}