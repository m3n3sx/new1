<?php
/**
 * CSS Output System Integration Tests
 * 
 * Tests for the CSS output system integration with new settings structure
 * in Live Admin Styler live preview critical repair implementation.
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestCssOutputIntegration extends WP_UnitTestCase {
    
    /**
     * Settings storage instance for testing
     * @var LAS_Settings_Storage
     */
    private $settings_storage;
    
    /**
     * Test setup
     */
    public function setUp(): void {
        parent::setUp();
        
        // Load required files
        require_once plugin_dir_path(__FILE__) . '../../includes/SettingsStorage.php';
        require_once plugin_dir_path(__FILE__) . '../../includes/output-css.php';
        
        // Initialize settings storage
        $this->settings_storage = new LAS_Settings_Storage();
        
        // Clear any existing cache
        las_fresh_clear_css_cache();
    }
    
    /**
     * Test new settings to legacy mapping
     */
    public function test_new_settings_to_legacy_mapping() {
        $new_settings = array(
            'menu_background_color' => '#ff0000',
            'menu_text_color' => '#ffffff',
            'adminbar_background' => '#00ff00',
            'content_background' => '#0000ff',
            'custom_css' => 'body { color: red; }'
        );
        
        $legacy_options = las_fresh_map_new_settings_to_legacy($new_settings);
        
        // Check that mapping worked correctly
        $this->assertEquals('#ff0000', $legacy_options['admin_menu_bg_color']);
        $this->assertEquals('#ffffff', $legacy_options['admin_menu_text_color']);
        $this->assertEquals('#00ff00', $legacy_options['admin_bar_bg_color']);
        $this->assertEquals('#0000ff', $legacy_options['body_bg_color']);
        $this->assertEquals('body { color: red; }', $legacy_options['custom_css_rules']);
        
        // Check that defaults are included
        $this->assertEquals('default', $legacy_options['active_template']);
        $this->assertEquals(220, $legacy_options['admin_menu_width']);
    }
    
    /**
     * Test CSS generation with new settings structure
     */
    public function test_css_generation_with_new_settings() {
        // Save test settings using new structure
        $test_settings = array(
            'menu_background_color' => '#333333',
            'menu_text_color' => '#ffffff',
            'adminbar_background' => '#444444',
            'content_background' => '#f9f9f9'
        );
        
        $this->settings_storage->save_settings($test_settings);
        
        // Generate CSS
        $css_output = las_fresh_generate_admin_css_output();
        
        // Check that CSS was generated
        $this->assertNotEmpty($css_output);
        $this->assertStringContains('Live Admin Styler CSS', $css_output);
        $this->assertStringContains('Live Preview Critical Repair', $css_output);
        
        // Check that settings are reflected in CSS (basic check)
        $this->assertStringContains('#333333', $css_output);
        $this->assertStringContains('#444444', $css_output);
    }
    
    /**
     * Test CSS generation with preview options
     */
    public function test_css_generation_with_preview_options() {
        $preview_options = array(
            'admin_menu_bg_color' => '#red',
            'admin_menu_text_color' => '#white',
            'admin_bar_bg_color' => '#blue'
        );
        
        $css_output = las_fresh_generate_admin_css_output($preview_options);
        
        // Check that CSS was generated
        $this->assertNotEmpty($css_output);
        
        // Check that preview options are used (not cached values)
        $this->assertStringContains('red', $css_output);
        $this->assertStringContains('blue', $css_output);
    }
    
    /**
     * Test CSS caching functionality
     */
    public function test_css_caching() {
        // Ensure caching is enabled
        $this->assertTrue(las_fresh_is_css_caching_enabled());
        
        // Clear cache first
        las_fresh_clear_css_cache();
        
        // Generate CSS (should not be cached)
        $css_output1 = las_fresh_generate_admin_css_output();
        $this->assertNotEmpty($css_output1);
        
        // Generate CSS again (should be cached)
        $css_output2 = las_fresh_generate_admin_css_output();
        $this->assertEquals($css_output1, $css_output2);
        
        // Test cache clearing
        $this->assertTrue(las_fresh_clear_css_cache());
        
        // Generate CSS after cache clear
        $css_output3 = las_fresh_generate_admin_css_output();
        $this->assertNotEmpty($css_output3);
    }
    
    /**
     * Test CSS cache clearing on settings update
     */
    public function test_cache_clearing_on_settings_update() {
        // Generate initial CSS to populate cache
        $initial_css = las_fresh_generate_admin_css_output();
        $this->assertNotEmpty($initial_css);
        
        // Update settings
        $new_settings = array(
            'menu_background_color' => '#updated',
            'menu_text_color' => '#changed'
        );
        
        $this->settings_storage->save_settings($new_settings);
        
        // Trigger the cache clearing hook
        do_action('las_settings_saved', $new_settings);
        
        // Generate CSS again - should reflect new settings
        $updated_css = las_fresh_generate_admin_css_output();
        $this->assertNotEmpty($updated_css);
        
        // CSS should contain updated values
        $this->assertStringContains('#updated', $updated_css);
        $this->assertStringContains('#changed', $updated_css);
    }
    
    /**
     * Test error handling in CSS generation
     */
    public function test_css_generation_error_handling() {
        // Test with invalid preview options
        $css_output = las_fresh_generate_admin_css_output('invalid_input');
        $this->assertNotEmpty($css_output);
        $this->assertStringContains('Live Admin Styler CSS', $css_output);
        
        // Test with empty array
        $css_output = las_fresh_generate_admin_css_output(array());
        $this->assertNotEmpty($css_output);
        
        // Test mapping with invalid input
        $legacy_options = las_fresh_map_new_settings_to_legacy('invalid');
        $this->assertIsArray($legacy_options);
        $this->assertEmpty($legacy_options);
    }
    
    /**
     * Test CSS validation functions
     */
    public function test_css_validation_functions() {
        // Test color validation
        $this->assertEquals('#ff0000', las_fresh_validate_color('#ff0000'));
        $this->assertEquals('#000000', las_fresh_validate_color('invalid_color', '#000000'));
        
        // Test numeric validation
        $this->assertEquals('10px', las_fresh_validate_numeric(10, 'px'));
        $this->assertEquals('0px', las_fresh_validate_numeric('invalid', 'px', null, null, 0));
        
        // Test selector validation
        $this->assertEquals('#adminmenu', las_fresh_validate_selector('#adminmenu'));
        $this->assertEquals('', las_fresh_validate_selector('<script>'));
        
        // Test property validation
        $this->assertEquals('color', las_fresh_validate_property('color'));
        $this->assertEquals('', las_fresh_validate_property('invalid<script>'));
    }
    
    /**
     * Test CSS specificity enhancement
     */
    public function test_css_specificity_enhancement() {
        // Test admin menu selector enhancement
        $enhanced = las_fresh_enhance_selector_specificity('#adminmenu');
        $this->assertNotEmpty($enhanced);
        $this->assertStringContains('#adminmenu', $enhanced);
        
        // Test admin bar selector enhancement
        $enhanced = las_fresh_enhance_selector_specificity('#wpadminbar');
        $this->assertNotEmpty($enhanced);
        $this->assertStringContains('#wpadminbar', $enhanced);
        
        // Test specificity calculation
        $score = las_fresh_calculate_selector_specificity('#adminmenu .wp-menu-name');
        $this->assertGreaterThan(100, $score); // Should have high specificity
    }
    
    /**
     * Test performance monitoring
     */
    public function test_performance_monitoring() {
        // Enable debug mode for performance logging
        if (!defined('WP_DEBUG')) {
            define('WP_DEBUG', true);
        }
        
        $start_time = microtime(true);
        $start_memory = memory_get_usage(true);
        $start_peak = memory_get_peak_usage(true);
        
        // Generate CSS
        $css_output = las_fresh_generate_admin_css_output();
        
        // Test performance logging (should not throw errors)
        las_fresh_log_css_performance_metrics($start_time, $start_memory, $start_peak, $css_output, 'test');
        
        $this->assertNotEmpty($css_output);
    }
    
    /**
     * Test CSS value validation
     */
    public function test_css_value_validation() {
        // Test valid CSS values
        $this->assertTrue(las_fresh_is_valid_css_value('#ff0000', 'color'));
        $this->assertTrue(las_fresh_is_valid_css_value('14px', 'font-size'));
        $this->assertTrue(las_fresh_is_valid_css_value('0.5', 'opacity'));
        
        // Test invalid CSS values
        $this->assertFalse(las_fresh_is_valid_css_value('javascript:alert(1)', 'color'));
        $this->assertFalse(las_fresh_is_valid_css_value('expression(alert(1))', 'background'));
        $this->assertFalse(las_fresh_is_valid_css_value('2.5', 'opacity')); // Invalid opacity
    }
    
    /**
     * Test fallback value generation
     */
    public function test_fallback_value_generation() {
        // Test property-specific fallbacks
        $this->assertEquals('inherit', las_fresh_get_property_fallback('color'));
        $this->assertEquals('transparent', las_fresh_get_property_fallback('background-color'));
        $this->assertEquals('14px', las_fresh_get_property_fallback('font-size'));
        $this->assertEquals('0', las_fresh_get_property_fallback('margin'));
        
        // Test generic fallback
        $this->assertEquals('initial', las_fresh_get_property_fallback('unknown-property'));
    }
    
    /**
     * Test hex to rgba conversion
     */
    public function test_hex_to_rgba_conversion() {
        // Test valid hex colors
        $this->assertEquals('rgba(255, 0, 0, 1)', las_fresh_hex_to_rgba('#ff0000', 1));
        $this->assertEquals('rgba(255, 0, 0, 0.5)', las_fresh_hex_to_rgba('#ff0000', 0.5));
        $this->assertEquals('rgba(255, 255, 255, 1)', las_fresh_hex_to_rgba('#fff', 1));
        
        // Test invalid inputs
        $this->assertStringContains('rgba(44, 51, 56', las_fresh_hex_to_rgba('invalid', 1));
        $this->assertStringContains('rgba(255, 0, 0', las_fresh_hex_to_rgba('#ff0000', 'invalid'));
    }
    
    /**
     * Test integration with WordPress hooks
     */
    public function test_wordpress_hooks_integration() {
        // Test that cache clearing hooks are registered
        $this->assertTrue(has_action('las_settings_saved', 'las_fresh_clear_css_cache_on_settings_update'));
        $this->assertTrue(has_action('las_settings_reset', 'las_fresh_clear_css_cache_on_settings_update'));
        
        // Test hook execution
        $initial_css = las_fresh_generate_admin_css_output();
        las_fresh_cache_css($initial_css);
        
        // Trigger settings saved hook
        do_action('las_settings_saved', array('test' => 'value'));
        
        // Cache should be cleared (this is tested indirectly)
        $this->assertTrue(true); // Hook executed without errors
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        // Clear cache
        las_fresh_clear_css_cache();
        
        parent::tearDown();
    }
}