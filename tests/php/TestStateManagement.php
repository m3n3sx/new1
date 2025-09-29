<?php

/**
 * Test suite for PHP state management functions
 * Tests the LAS_User_State class and related functionality
 * 
 * Requirements: 5.4, 6.4, 7.4
 */
class TestStateManagement extends WP_UnitTestCase {

    private $user_id;
    private $user_state;

    public function setUp() {
        parent::setUp();
        
        // Create a test user with manage_options capability
        $this->user_id = $this->factory->user->create(array(
            'role' => 'administrator'
        ));
        
        // Initialize user state instance
        $this->user_state = new LAS_User_State($this->user_id);
        
        // Clean up any existing user meta
        delete_user_meta($this->user_id, 'las_fresh_active_tab');
        delete_user_meta($this->user_id, 'las_fresh_ui_preferences');
    }

    public function tearDown() {
        // Clean up user meta
        delete_user_meta($this->user_id, 'las_fresh_active_tab');
        delete_user_meta($this->user_id, 'las_fresh_ui_preferences');
        
        parent::tearDown();
    }

    /**
     * Test LAS_User_State class instantiation
     */
    public function test_user_state_instantiation() {
        $this->assertInstanceOf('LAS_User_State', $this->user_state);
        $this->assertEquals($this->user_id, $this->user_state->get_user_id());
        $this->assertTrue($this->user_state->has_permissions());
    }

    /**
     * Test user state instantiation with invalid user
     */
    public function test_user_state_invalid_user() {
        $invalid_user_state = new LAS_User_State(99999);
        $this->assertEquals(0, $invalid_user_state->get_user_id());
        $this->assertFalse($invalid_user_state->has_permissions());
    }

    /**
     * Test active tab state persistence
     */
    public function test_active_tab_persistence() {
        // Test default tab
        $this->assertEquals('general', $this->user_state->get_active_tab());
        
        // Test setting valid tab
        $this->assertTrue($this->user_state->set_active_tab('menu'));
        $this->assertEquals('menu', $this->user_state->get_active_tab());
        
        // Test setting another valid tab
        $this->assertTrue($this->user_state->set_active_tab('adminbar'));
        $this->assertEquals('adminbar', $this->user_state->get_active_tab());
        
        // Test persistence across instances
        $new_user_state = new LAS_User_State($this->user_id);
        $this->assertEquals('adminbar', $new_user_state->get_active_tab());
    }

    /**
     * Test active tab validation
     */
    public function test_active_tab_validation() {
        // Test invalid tab IDs
        $this->assertFalse($this->user_state->set_active_tab('invalid_tab'));
        $this->assertFalse($this->user_state->set_active_tab(''));
        $this->assertFalse($this->user_state->set_active_tab(null));
        $this->assertFalse($this->user_state->set_active_tab(123));
        
        // Tab should remain at default
        $this->assertEquals('general', $this->user_state->get_active_tab());
        
        // Test all valid tab IDs
        $valid_tabs = array('general', 'menu', 'adminbar', 'content', 'logos', 'advanced');
        foreach ($valid_tabs as $tab) {
            $this->assertTrue($this->user_state->set_active_tab($tab));
            $this->assertEquals($tab, $this->user_state->get_active_tab());
        }
    }

    /**
     * Test UI preferences management
     */
    public function test_ui_preferences_management() {
        // Test default preferences
        $default_prefs = $this->user_state->get_ui_preferences();
        $this->assertIsArray($default_prefs);
        $this->assertArrayHasKey('ui_theme', $default_prefs);
        $this->assertArrayHasKey('animation_speed', $default_prefs);
        $this->assertArrayHasKey('live_preview_enabled', $default_prefs);
        
        // Test setting preferences
        $new_prefs = array(
            'ui_theme' => 'classic',
            'animation_speed' => 'fast',
            'live_preview_enabled' => false,
            'compact_mode' => true
        );
        
        $this->assertTrue($this->user_state->set_ui_preferences($new_prefs));
        
        $saved_prefs = $this->user_state->get_ui_preferences();
        $this->assertEquals('classic', $saved_prefs['ui_theme']);
        $this->assertEquals('fast', $saved_prefs['animation_speed']);
        $this->assertFalse($saved_prefs['live_preview_enabled']);
        $this->assertTrue($saved_prefs['compact_mode']);
    }

    /**
     * Test individual UI preference methods
     */
    public function test_individual_ui_preferences() {
        // Test getting individual preference
        $this->assertEquals('modern', $this->user_state->get_ui_preference('ui_theme'));
        $this->assertEquals('normal', $this->user_state->get_ui_preference('animation_speed'));
        $this->assertNull($this->user_state->get_ui_preference('nonexistent_key'));
        $this->assertEquals('default_value', $this->user_state->get_ui_preference('nonexistent_key', 'default_value'));
        
        // Test setting individual preference
        $this->assertTrue($this->user_state->set_ui_preference('ui_theme', 'minimal'));
        $this->assertEquals('minimal', $this->user_state->get_ui_preference('ui_theme'));
        
        $this->assertTrue($this->user_state->set_ui_preference('compact_mode', true));
        $this->assertTrue($this->user_state->get_ui_preference('compact_mode'));
    }

    /**
     * Test UI preferences validation and sanitization
     */
    public function test_ui_preferences_validation() {
        // Test invalid theme value
        $this->assertTrue($this->user_state->set_ui_preference('ui_theme', 'invalid_theme'));
        $this->assertEquals('modern', $this->user_state->get_ui_preference('ui_theme')); // Should fallback to default
        
        // Test invalid animation speed
        $this->assertTrue($this->user_state->set_ui_preference('animation_speed', 'invalid_speed'));
        $this->assertEquals('normal', $this->user_state->get_ui_preference('animation_speed')); // Should fallback to default
        
        // Test debounce value validation
        $this->assertTrue($this->user_state->set_ui_preference('live_preview_debounce', 25)); // Too low
        $this->assertEquals(150, $this->user_state->get_ui_preference('live_preview_debounce')); // Should use default
        
        $this->assertTrue($this->user_state->set_ui_preference('live_preview_debounce', 2000)); // Too high
        $this->assertEquals(150, $this->user_state->get_ui_preference('live_preview_debounce')); // Should use default
        
        $this->assertTrue($this->user_state->set_ui_preference('live_preview_debounce', 300)); // Valid
        $this->assertEquals(300, $this->user_state->get_ui_preference('live_preview_debounce'));
        
        // Test boolean conversion
        $this->assertTrue($this->user_state->set_ui_preference('live_preview_enabled', 'true'));
        $this->assertTrue($this->user_state->get_ui_preference('live_preview_enabled'));
        
        $this->assertTrue($this->user_state->set_ui_preference('live_preview_enabled', 0));
        $this->assertFalse($this->user_state->get_ui_preference('live_preview_enabled'));
    }

    /**
     * Test session data management
     */
    public function test_session_data_management() {
        // Set some state
        $this->user_state->set_active_tab('menu');
        $this->user_state->set_ui_preference('ui_theme', 'classic');
        
        // Get session data
        $session_data = $this->user_state->get_session_data();
        
        $this->assertIsArray($session_data);
        $this->assertArrayHasKey('active_tab', $session_data);
        $this->assertArrayHasKey('ui_preferences', $session_data);
        $this->assertArrayHasKey('user_id', $session_data);
        $this->assertArrayHasKey('timestamp', $session_data);
        $this->assertArrayHasKey('version', $session_data);
        
        $this->assertEquals('menu', $session_data['active_tab']);
        $this->assertEquals($this->user_id, $session_data['user_id']);
        $this->assertEquals('classic', $session_data['ui_preferences']['ui_theme']);
    }

    /**
     * Test session synchronization
     */
    public function test_session_synchronization() {
        // Create session data
        $session_data = array(
            'active_tab' => 'advanced',
            'ui_preferences' => array(
                'ui_theme' => 'minimal',
                'animation_speed' => 'slow',
                'compact_mode' => true
            )
        );
        
        // Sync from session
        $this->assertTrue($this->user_state->sync_from_session($session_data));
        
        // Verify sync worked
        $this->assertEquals('advanced', $this->user_state->get_active_tab());
        $this->assertEquals('minimal', $this->user_state->get_ui_preference('ui_theme'));
        $this->assertEquals('slow', $this->user_state->get_ui_preference('animation_speed'));
        $this->assertTrue($this->user_state->get_ui_preference('compact_mode'));
    }

    /**
     * Test state reset functionality
     */
    public function test_state_reset() {
        // Set some non-default values
        $this->user_state->set_active_tab('advanced');
        $this->user_state->set_ui_preference('ui_theme', 'classic');
        $this->user_state->set_ui_preference('compact_mode', true);
        
        // Verify values are set
        $this->assertEquals('advanced', $this->user_state->get_active_tab());
        $this->assertEquals('classic', $this->user_state->get_ui_preference('ui_theme'));
        $this->assertTrue($this->user_state->get_ui_preference('compact_mode'));
        
        // Reset to defaults
        $this->assertTrue($this->user_state->reset_to_defaults());
        
        // Verify reset worked
        $this->assertEquals('general', $this->user_state->get_active_tab());
        $this->assertEquals('modern', $this->user_state->get_ui_preference('ui_theme'));
        $this->assertFalse($this->user_state->get_ui_preference('compact_mode'));
    }

    /**
     * Test state export and import
     */
    public function test_state_export_import() {
        // Set some state
        $this->user_state->set_active_tab('logos');
        $this->user_state->set_ui_preference('ui_theme', 'classic');
        $this->user_state->set_ui_preference('animation_speed', 'fast');
        
        // Export state
        $exported_state = $this->user_state->export_state();
        
        $this->assertIsArray($exported_state);
        $this->assertArrayHasKey('active_tab', $exported_state);
        $this->assertArrayHasKey('ui_preferences', $exported_state);
        $this->assertArrayHasKey('export_timestamp', $exported_state);
        $this->assertArrayHasKey('plugin_version', $exported_state);
        
        // Reset state
        $this->user_state->reset_to_defaults();
        $this->assertEquals('general', $this->user_state->get_active_tab());
        
        // Import state
        $this->assertTrue($this->user_state->import_state($exported_state));
        
        // Verify import worked
        $this->assertEquals('logos', $this->user_state->get_active_tab());
        $this->assertEquals('classic', $this->user_state->get_ui_preference('ui_theme'));
        $this->assertEquals('fast', $this->user_state->get_ui_preference('animation_speed'));
    }

    /**
     * Test validation rules
     */
    public function test_validation_rules() {
        $rules = $this->user_state->get_validation_rules();
        
        $this->assertIsArray($rules);
        $this->assertArrayHasKey('ui_theme', $rules);
        $this->assertArrayHasKey('animation_speed', $rules);
        $this->assertArrayHasKey('live_preview_debounce', $rules);
        
        // Test ui_theme rule
        $theme_rule = $rules['ui_theme'];
        $this->assertEquals('select', $theme_rule['type']);
        $this->assertContains('modern', $theme_rule['options']);
        $this->assertContains('classic', $theme_rule['options']);
        $this->assertContains('minimal', $theme_rule['options']);
        
        // Test integer rule
        $debounce_rule = $rules['live_preview_debounce'];
        $this->assertEquals('integer', $debounce_rule['type']);
        $this->assertEquals(50, $debounce_rule['min']);
        $this->assertEquals(1000, $debounce_rule['max']);
    }

    /**
     * Test cache functionality
     */
    public function test_cache_functionality() {
        // Set preferences to populate cache
        $this->user_state->set_ui_preference('ui_theme', 'classic');
        
        // Get preferences (should use cache)
        $prefs1 = $this->user_state->get_ui_preferences();
        $prefs2 = $this->user_state->get_ui_preferences();
        
        $this->assertEquals($prefs1, $prefs2);
        $this->assertEquals('classic', $prefs1['ui_theme']);
        
        // Clear cache
        $this->user_state->clear_cache();
        
        // Get preferences again (should reload from database)
        $prefs3 = $this->user_state->get_ui_preferences();
        $this->assertEquals('classic', $prefs3['ui_theme']);
    }

    /**
     * Test error handling with invalid user
     */
    public function test_error_handling_invalid_user() {
        $invalid_state = new LAS_User_State(0);
        
        // All operations should fail gracefully
        $this->assertEquals('general', $invalid_state->get_active_tab());
        $this->assertFalse($invalid_state->set_active_tab('menu'));
        
        $default_prefs = $invalid_state->get_ui_preferences();
        $this->assertIsArray($default_prefs);
        $this->assertFalse($invalid_state->set_ui_preferences(array('ui_theme' => 'classic')));
        
        $this->assertFalse($invalid_state->reset_to_defaults());
        $this->assertFalse($invalid_state->sync_from_session(array()));
    }

    /**
     * Test helper functions for tab state management
     */
    public function test_helper_functions() {
        // Test las_fresh_get_active_tab function
        $active_tab = las_fresh_get_active_tab();
        $this->assertEquals('general', $active_tab);
        
        // Test las_fresh_save_active_tab function
        $this->assertTrue(las_fresh_save_active_tab('menu'));
        $this->assertEquals('menu', las_fresh_get_active_tab());
        
        // Test with invalid tab
        $this->assertFalse(las_fresh_save_active_tab('invalid'));
        $this->assertEquals('menu', las_fresh_get_active_tab()); // Should remain unchanged
    }

    /**
     * Test enhanced default options function
     */
    public function test_enhanced_default_options() {
        $enhanced_options = las_fresh_get_enhanced_default_options();
        
        $this->assertIsArray($enhanced_options);
        
        // Should include base options
        $this->assertArrayHasKey('admin_menu_bg_color', $enhanced_options);
        $this->assertArrayHasKey('admin_bar_bg_color', $enhanced_options);
        
        // Should include UI preferences
        $this->assertArrayHasKey('ui_theme', $enhanced_options);
        $this->assertArrayHasKey('animation_speed', $enhanced_options);
        $this->assertArrayHasKey('live_preview_enabled', $enhanced_options);
        $this->assertArrayHasKey('smart_submenu', $enhanced_options);
    }

    /**
     * Test settings validation functions
     */
    public function test_settings_validation() {
        // Test las_validate_setting_by_rule function
        $select_rule = array(
            'type' => 'select',
            'options' => array('option1', 'option2', 'option3'),
            'default' => 'option1'
        );
        
        $this->assertEquals('option2', las_validate_setting_by_rule('test_key', 'option2', $select_rule));
        $this->assertEquals('option1', las_validate_setting_by_rule('test_key', 'invalid', $select_rule));
        
        $integer_rule = array(
            'type' => 'integer',
            'min' => 10,
            'max' => 100,
            'default' => 50
        );
        
        $this->assertEquals(25, las_validate_setting_by_rule('test_key', 25, $integer_rule));
        $this->assertEquals(10, las_validate_setting_by_rule('test_key', 5, $integer_rule)); // Below min
        $this->assertEquals(100, las_validate_setting_by_rule('test_key', 150, $integer_rule)); // Above max
        
        $boolean_rule = array(
            'type' => 'boolean',
            'default' => false
        );
        
        $this->assertTrue(las_validate_setting_by_rule('test_key', true, $boolean_rule));
        $this->assertTrue(las_validate_setting_by_rule('test_key', 1, $boolean_rule));
        $this->assertFalse(las_validate_setting_by_rule('test_key', false, $boolean_rule));
        $this->assertFalse(las_validate_setting_by_rule('test_key', 0, $boolean_rule));
    }

    /**
     * Test interdependent settings validation
     */
    public function test_interdependent_settings_validation() {
        $settings = array(
            'admin_menu_font_family' => 'google',
            'admin_menu_google_font' => 'Roboto:400,700',
            'admin_menu_shadow_type' => 'simple',
            'admin_menu_shadow_simple' => '2px 2px 4px rgba(0,0,0,0.1)',
            'admin_menu_border_radius_type' => 'all',
            'admin_menu_border_radius_all' => 10
        );
        
        $validated = las_validate_interdependent_settings($settings);
        
        // Font settings should remain as is (valid combination)
        $this->assertEquals('google', $validated['admin_menu_font_family']);
        $this->assertEquals('Roboto:400,700', $validated['admin_menu_google_font']);
        
        // Test invalid font combination
        $settings['admin_menu_font_family'] = 'Arial';
        $settings['admin_menu_google_font'] = 'Roboto:400,700'; // Should be cleared
        
        $validated = las_validate_interdependent_settings($settings);
        $this->assertEquals('Arial', $validated['admin_menu_font_family']);
        $this->assertEquals('', $validated['admin_menu_google_font']);
        
        // Test shadow type none
        $settings['admin_menu_shadow_type'] = 'none';
        $validated = las_validate_interdependent_settings($settings);
        $this->assertEquals('', $validated['admin_menu_shadow_simple']);
    }
}