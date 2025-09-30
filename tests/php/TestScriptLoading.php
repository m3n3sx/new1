<?php
/**
 * Test script loading order and dependency management
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestScriptLoading extends WP_UnitTestCase {
    
    private $original_wp_scripts;
    
    public function setUp(): void {
        parent::setUp();
        
        // Store original wp_scripts for restoration
        global $wp_scripts;
        $this->original_wp_scripts = $wp_scripts;
        
        // Set up admin user for capability checks
        $user_id = $this->factory->user->create(array('role' => 'administrator'));
        wp_set_current_user($user_id);
        
        // Mock admin context
        set_current_screen('settings_page_live-admin-styler-settings');
    }
    
    public function tearDown(): void {
        // Restore original wp_scripts
        global $wp_scripts;
        $wp_scripts = $this->original_wp_scripts;
        
        parent::tearDown();
    }
    
    /**
     * Test admin page detection functionality
     */
    public function test_admin_page_detection() {
        // Test direct hook suffix detection
        $this->assertTrue(las_fresh_is_plugin_admin_page('settings_page_live-admin-styler-settings'));
        
        // Test non-plugin page
        $this->assertFalse(las_fresh_is_plugin_admin_page('edit.php'));
        
        // Test plugin admin context
        $_GET['page'] = LAS_FRESH_SETTINGS_SLUG;
        $this->assertTrue(las_fresh_is_plugin_admin_context());
        unset($_GET['page']);
    }
    
    /**
     * Test jQuery UI availability checking
     */
    public function test_jquery_ui_availability() {
        global $wp_scripts;
        
        // Mock wp_scripts with jQuery UI components
        $wp_scripts = new WP_Scripts();
        $wp_scripts->add('jquery', false);
        $wp_scripts->add('jquery-ui-core', false, array('jquery'));
        $wp_scripts->add('jquery-ui-widget', false, array('jquery-ui-core'));
        $wp_scripts->add('jquery-ui-tabs', false, array('jquery-ui-core', 'jquery-ui-widget'));
        $wp_scripts->add('jquery-ui-slider', false, array('jquery-ui-core', 'jquery-ui-widget', 'jquery-ui-mouse'));
        $wp_scripts->add('jquery-ui-mouse', false, array('jquery-ui-core', 'jquery-ui-widget'));
        
        $availability = las_fresh_check_jquery_ui_availability();
        
        // Test that components are detected as available
        $this->assertTrue($availability['core']);
        $this->assertTrue($availability['widget']);
        $this->assertTrue($availability['tabs']);
        $this->assertTrue($availability['slider']);
        $this->assertTrue($availability['mouse']);
        
        // Test summary information
        $this->assertArrayHasKey('summary', $availability);
        $this->assertTrue($availability['summary']['jquery_available']);
        $this->assertTrue($availability['summary']['tabs_functional']);
        $this->assertTrue($availability['summary']['slider_functional']);
    }
    
    /**
     * Test dependency validation
     */
    public function test_dependency_validation() {
        global $wp_scripts;
        
        // Mock wp_scripts with limited components
        $wp_scripts = new WP_Scripts();
        $wp_scripts->add('jquery', false);
        $wp_scripts->add('wp-color-picker', false, array('jquery'));
        
        $dependencies = array('jquery', 'wp-color-picker', 'non-existent-script');
        $validated = las_fresh_validate_script_dependencies($dependencies);
        
        // Should only include existing dependencies
        $this->assertContains('jquery', $validated);
        $this->assertContains('wp-color-picker', $validated);
        $this->assertNotContains('non-existent-script', $validated);
    }
    
    /**
     * Test script version generation
     */
    public function test_script_version_generation() {
        // Test with existing file
        $version = las_fresh_get_script_version('js/admin-settings.js');
        $this->assertStringContains(LAS_FRESH_VERSION, $version);
        $this->assertStringContains('-', $version);
        
        // Test with non-existent file
        $version = las_fresh_get_script_version('non-existent-file.js');
        $this->assertStringContains(LAS_FRESH_VERSION, $version);
    }
    
    /**
     * Test dependency configuration building
     */
    public function test_dependency_config_building() {
        $jquery_ui_available = array(
            'core' => true,
            'widget' => true,
            'tabs' => true,
            'slider' => true,
            'mouse' => true,
            'accordion' => false,
            'dialog' => false,
            'sortable' => false,
            'draggable' => false,
            'resizable' => false
        );
        
        $config = las_fresh_build_dependency_config($jquery_ui_available);
        
        // Test admin dependencies
        $this->assertContains('jquery', $config['admin']);
        $this->assertContains('wp-color-picker', $config['admin']);
        $this->assertContains('jquery-ui-tabs', $config['admin']);
        $this->assertContains('jquery-ui-core', $config['admin']);
        
        // Test preview dependencies
        $this->assertContains('jquery', $config['preview']);
        $this->assertContains('wp-color-picker', $config['preview']);
        $this->assertContains('jquery-ui-slider', $config['preview']);
        $this->assertContains('jquery-ui-mouse', $config['preview']);
    }
    
    /**
     * Test script loading configuration
     */
    public function test_script_loading_config() {
        $config = las_fresh_get_script_loading_config();
        
        $this->assertArrayHasKey('load_in_footer', $config);
        $this->assertArrayHasKey('defer_non_critical', $config);
        $this->assertArrayHasKey('minify_enabled', $config);
        $this->assertArrayHasKey('cache_busting', $config);
        
        // Test that footer loading is enabled for performance
        $this->assertTrue($config['load_in_footer']);
    }
    
    /**
     * Test localization data creation
     */
    public function test_localization_data_creation() {
        $jquery_ui_available = array(
            'core' => true,
            'tabs' => true,
            'slider' => false,
            'summary' => array(
                'tabs_functional' => true,
                'slider_functional' => false
            )
        );
        
        $data = las_fresh_create_localization_data($jquery_ui_available);
        
        // Test required keys
        $this->assertArrayHasKey('ajax_url', $data);
        $this->assertArrayHasKey('nonce', $data);
        $this->assertArrayHasKey('plugin_version', $data);
        $this->assertArrayHasKey('jquery_ui', $data);
        $this->assertArrayHasKey('strings', $data);
        
        // Test values
        $this->assertEquals(LAS_FRESH_VERSION, $data['plugin_version']);
        $this->assertEquals(LAS_FRESH_OPTION_NAME, $data['option_name']);
        $this->assertFalse($data['fallback_mode']); // tabs is available
        
        // Test localization strings
        $this->assertArrayHasKey('loading', $data['strings']);
        $this->assertArrayHasKey('error', $data['strings']);
        $this->assertArrayHasKey('saved', $data['strings']);
    }
    
    /**
     * Test script priority system
     */
    public function test_script_priority() {
        $this->assertEquals(5, las_fresh_get_script_priority('core'));
        $this->assertEquals(8, las_fresh_get_script_priority('ui'));
        $this->assertEquals(10, las_fresh_get_script_priority('plugin'));
        $this->assertEquals(10, las_fresh_get_script_priority('unknown'));
    }
    
    /**
     * Test full enqueue process (integration test)
     */
    public function test_full_enqueue_process() {
        global $wp_scripts;
        
        // Set up complete wp_scripts environment
        $wp_scripts = new WP_Scripts();
        $wp_scripts->add('jquery', false);
        $wp_scripts->add('wp-color-picker', false, array('jquery'));
        $wp_scripts->add('wp-util', false, array('jquery'));
        $wp_scripts->add('wp-a11y', false, array('jquery'));
        $wp_scripts->add('jquery-ui-core', false, array('jquery'));
        $wp_scripts->add('jquery-ui-widget', false, array('jquery-ui-core'));
        $wp_scripts->add('jquery-ui-tabs', false, array('jquery-ui-core', 'jquery-ui-widget'));
        
        // Mock the hook suffix for plugin page
        $hook_suffix = 'settings_page_live-admin-styler-settings';
        
        // Run the enqueue function
        las_fresh_enqueue_assets($hook_suffix);
        
        // Verify scripts were enqueued
        $this->assertTrue(wp_script_is('las-fresh-admin-settings-js', 'enqueued'));
        $this->assertTrue(wp_script_is('las-fresh-live-preview-js', 'enqueued'));
        $this->assertTrue(wp_script_is('wp-color-picker', 'enqueued'));
        $this->assertTrue(wp_script_is('jquery-ui-tabs', 'enqueued'));
        
        // Verify styles were enqueued
        $this->assertTrue(wp_style_is('las-fresh-admin-style-css', 'enqueued'));
        $this->assertTrue(wp_style_is('wp-color-picker', 'enqueued'));
    }
    
    /**
     * Test that scripts are not enqueued on non-plugin pages
     */
    public function test_conditional_loading() {
        global $wp_scripts;
        $wp_scripts = new WP_Scripts();
        
        // Test with non-plugin page
        $hook_suffix = 'edit.php';
        las_fresh_enqueue_assets($hook_suffix);
        
        // Verify scripts were NOT enqueued
        $this->assertFalse(wp_script_is('las-fresh-admin-settings-js', 'enqueued'));
        $this->assertFalse(wp_script_is('las-fresh-live-preview-js', 'enqueued'));
    }
}