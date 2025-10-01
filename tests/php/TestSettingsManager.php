<?php
/**
 * Unit tests for SettingsManager
 * 
 * Tests settings management functionality including get/set operations,
 * caching integration, security validation, preset management, and
 * user state persistence.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Test class for SettingsManager
 */
class TestSettingsManager extends WP_UnitTestCase {
    
    /**
     * SettingsManager instance
     * @var LAS_SettingsManager
     */
    private $settings_manager;
    
    /**
     * Mock CacheManager instance
     * @var LAS_CacheManager
     */
    private $cache_manager;
    
    /**
     * Mock SecurityManager instance
     * @var LAS_SecurityManager
     */
    private $security_manager;
    
    /**
     * Test user ID
     * @var int
     */
    private $test_user_id;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        // Create test user
        $this->test_user_id = $this->factory->user->create([
            'role' => 'administrator'
        ]);
        wp_set_current_user($this->test_user_id);
        
        // Create mock dependencies
        $this->cache_manager = new LAS_CacheManager();
        $this->security_manager = new LAS_SecurityManager();
        
        // Create SettingsManager instance
        $this->settings_manager = new LAS_SettingsManager(
            $this->cache_manager,
            $this->security_manager
        );
        
        // Clean up any existing test data
        $this->cleanup_test_data();
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        $this->cleanup_test_data();
        parent::tearDown();
    }
    
    /**
     * Clean up test data
     */
    private function cleanup_test_data() {
        // Delete test options
        delete_option('las_fresh_general');
        delete_option('las_fresh_menu');
        delete_option('las_fresh_adminbar');
        delete_option('las_fresh_content');
        delete_option('las_fresh_advanced');
        delete_option('las_fresh_presets');
        
        // Delete test user meta
        delete_user_meta($this->test_user_id, 'las_fresh_user_state');
        
        // Clear cache
        $this->cache_manager->clear();
    }
    
    /**
     * Test getting default settings
     */
    public function test_get_default_settings() {
        // Test getting entire group
        $menu_settings = $this->settings_manager->get('menu');
        $this->assertIsArray($menu_settings);
        $this->assertArrayHasKey('background_color', $menu_settings);
        $this->assertEquals('#23282d', $menu_settings['background_color']);
        
        // Test getting specific setting
        $bg_color = $this->settings_manager->get('menu.background_color');
        $this->assertEquals('#23282d', $bg_color);
        
        // Test getting non-existent setting with default
        $non_existent = $this->settings_manager->get('menu.non_existent', 'default_value');
        $this->assertEquals('default_value', $non_existent);
    }
    
    /**
     * Test setting and getting values
     */
    public function test_set_and_get_settings() {
        // Test setting a value
        $result = $this->settings_manager->set('menu.background_color', '#ff0000');
        $this->assertTrue($result);
        
        // Test getting the set value
        $value = $this->settings_manager->get('menu.background_color');
        $this->assertEquals('#ff0000', $value);
        
        // Test that the value persists in database
        $db_value = get_option('las_fresh_menu');
        $this->assertIsArray($db_value);
        $this->assertEquals('#ff0000', $db_value['background_color']);
    }
    
    /**
     * Test setting validation
     */
    public function test_setting_validation() {
        // Test valid color
        $result = $this->settings_manager->set('menu.background_color', '#ff0000');
        $this->assertTrue($result);
        
        // Test invalid color format
        $result = $this->settings_manager->set('menu.background_color', 'invalid-color');
        $this->assertInstanceOf('WP_Error', $result);
        
        // Test valid theme mode
        $result = $this->settings_manager->set('general.theme_mode', 'dark');
        $this->assertTrue($result);
        
        // Test invalid theme mode
        $result = $this->settings_manager->set('general.theme_mode', 'invalid-mode');
        $this->assertInstanceOf('WP_Error', $result);
    }
    
    /**
     * Test setting sanitization
     */
    public function test_setting_sanitization() {
        // Test color sanitization
        $this->settings_manager->set('menu.background_color', '  #FF0000  ');
        $value = $this->settings_manager->get('menu.background_color');
        $this->assertEquals('#FF0000', $value);
        
        // Test boolean sanitization
        $this->settings_manager->set('general.live_preview', '1');
        $value = $this->settings_manager->get('general.live_preview');
        $this->assertTrue($value);
        
        $this->settings_manager->set('general.live_preview', '0');
        $value = $this->settings_manager->get('general.live_preview');
        $this->assertFalse($value);
    }
    
    /**
     * Test multiple settings operations
     */
    public function test_multiple_settings() {
        $settings = [
            'menu.background_color' => '#ff0000',
            'menu.text_color' => '#ffffff',
            'general.theme_mode' => 'dark'
        ];
        
        // Test setting multiple values
        $result = $this->settings_manager->setMultiple($settings);
        $this->assertTrue($result);
        
        // Test getting multiple values
        $retrieved = $this->settings_manager->getMultiple(array_keys($settings));
        $this->assertEquals($settings['menu.background_color'], $retrieved['menu.background_color']);
        $this->assertEquals($settings['menu.text_color'], $retrieved['menu.text_color']);
        $this->assertEquals($settings['general.theme_mode'], $retrieved['general.theme_mode']);
    }
    
    /**
     * Test settings reset
     */
    public function test_settings_reset() {
        // Set some custom values
        $this->settings_manager->set('menu.background_color', '#ff0000');
        $this->settings_manager->set('menu.text_color', '#00ff00');
        
        // Verify custom values are set
        $this->assertEquals('#ff0000', $this->settings_manager->get('menu.background_color'));
        $this->assertEquals('#00ff00', $this->settings_manager->get('menu.text_color'));
        
        // Reset menu group
        $result = $this->settings_manager->reset('menu');
        $this->assertTrue($result);
        
        // Verify values are back to defaults
        $this->assertEquals('#23282d', $this->settings_manager->get('menu.background_color'));
        $this->assertEquals('#ffffff', $this->settings_manager->get('menu.text_color'));
    }
    
    /**
     * Test settings export
     */
    public function test_settings_export() {
        // Set some custom values
        $this->settings_manager->set('menu.background_color', '#ff0000');
        $this->settings_manager->set('general.theme_mode', 'dark');
        
        // Export settings
        $json = $this->settings_manager->export();
        $this->assertIsString($json);
        
        // Verify JSON structure
        $data = json_decode($json, true);
        $this->assertIsArray($data);
        $this->assertArrayHasKey('version', $data);
        $this->assertArrayHasKey('settings', $data);
        $this->assertArrayHasKey('timestamp', $data);
        
        // Verify exported values
        $this->assertEquals('#ff0000', $data['settings']['menu']['background_color']);
        $this->assertEquals('dark', $data['settings']['general']['theme_mode']);
    }
    
    /**
     * Test settings import
     */
    public function test_settings_import() {
        $import_data = [
            'version' => '2.0.0',
            'timestamp' => time(),
            'settings' => [
                'menu' => [
                    'background_color' => '#00ff00',
                    'text_color' => '#000000'
                ],
                'general' => [
                    'theme_mode' => 'light'
                ]
            ]
        ];
        
        $json = wp_json_encode($import_data);
        
        // Import settings
        $result = $this->settings_manager->import($json, false);
        $this->assertTrue($result);
        
        // Verify imported values
        $this->assertEquals('#00ff00', $this->settings_manager->get('menu.background_color'));
        $this->assertEquals('#000000', $this->settings_manager->get('menu.text_color'));
        $this->assertEquals('light', $this->settings_manager->get('general.theme_mode'));
    }
    
    /**
     * Test invalid import data
     */
    public function test_invalid_import() {
        // Test invalid JSON
        $result = $this->settings_manager->import('invalid json');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_json', $result->get_error_code());
        
        // Test missing settings key
        $invalid_data = wp_json_encode(['version' => '2.0.0']);
        $result = $this->settings_manager->import($invalid_data);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_format', $result->get_error_code());
    }
    
    /**
     * Test built-in presets
     */
    public function test_builtin_presets() {
        $presets = $this->settings_manager->getPresets(false); // Built-in only
        $this->assertIsArray($presets);
        $this->assertArrayHasKey('minimal', $presets);
        $this->assertArrayHasKey('glassmorphism', $presets);
        $this->assertArrayHasKey('ios', $presets);
        $this->assertArrayHasKey('material', $presets);
        $this->assertArrayHasKey('dark_pro', $presets);
        $this->assertArrayHasKey('gradient', $presets);
        
        // Test getting specific preset
        $minimal = $this->settings_manager->getPreset('minimal');
        $this->assertIsArray($minimal);
        $this->assertArrayHasKey('name', $minimal);
        $this->assertArrayHasKey('description', $minimal);
        $this->assertArrayHasKey('settings', $minimal);
        $this->assertEquals('Minimal', $minimal['name']);
    }
    
    /**
     * Test preset application
     */
    public function test_preset_application() {
        // Apply minimal preset
        $result = $this->settings_manager->applyPreset('minimal');
        $this->assertTrue($result);
        
        // Verify preset settings were applied
        $theme_mode = $this->settings_manager->get('general.theme_mode');
        $this->assertEquals('light', $theme_mode);
        
        $menu_bg = $this->settings_manager->get('menu.background_color');
        $this->assertEquals('#ffffff', $menu_bg);
        
        // Test applying non-existent preset
        $result = $this->settings_manager->applyPreset('non_existent');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('preset_not_found', $result->get_error_code());
    }
    
    /**
     * Test custom preset management
     */
    public function test_custom_presets() {
        // Save custom preset
        $result = $this->settings_manager->savePreset(
            'my_custom',
            'My Custom Preset',
            'A custom preset for testing',
            [
                'menu' => ['background_color' => '#123456'],
                'general' => ['theme_mode' => 'dark']
            ]
        );
        $this->assertTrue($result);
        
        // Verify preset was saved
        $preset = $this->settings_manager->getPreset('my_custom');
        $this->assertIsArray($preset);
        $this->assertEquals('My Custom Preset', $preset['name']);
        $this->assertEquals('#123456', $preset['settings']['menu']['background_color']);
        
        // Test applying custom preset
        $result = $this->settings_manager->applyPreset('my_custom');
        $this->assertTrue($result);
        
        $bg_color = $this->settings_manager->get('menu.background_color');
        $this->assertEquals('#123456', $bg_color);
        
        // Delete custom preset
        $result = $this->settings_manager->deletePreset('my_custom');
        $this->assertTrue($result);
        
        // Verify preset was deleted
        $preset = $this->settings_manager->getPreset('my_custom');
        $this->assertNull($preset);
    }
    
    /**
     * Test custom preset validation
     */
    public function test_custom_preset_validation() {
        // Test invalid preset ID
        $result = $this->settings_manager->savePreset('Invalid ID!', 'Test', 'Test');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_preset_id', $result->get_error_code());
        
        // Test conflict with built-in preset
        $result = $this->settings_manager->savePreset('minimal', 'Test', 'Test');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('preset_id_conflict', $result->get_error_code());
        
        // Test deleting built-in preset
        $result = $this->settings_manager->deletePreset('minimal');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('cannot_delete_builtin', $result->get_error_code());
    }
    
    /**
     * Test user state management
     */
    public function test_user_state() {
        // Test default user state
        $state = $this->settings_manager->getUserState();
        $this->assertIsArray($state);
        $this->assertArrayHasKey('active_tab', $state);
        $this->assertArrayHasKey('live_edit_mode', $state);
        $this->assertArrayHasKey('session', $state);
        $this->assertEquals('general', $state['active_tab']);
        $this->assertFalse($state['live_edit_mode']);
        
        // Test setting user state
        $new_state = $state;
        $new_state['active_tab'] = 'menu';
        $new_state['live_edit_mode'] = true;
        
        $result = $this->settings_manager->setUserState($new_state);
        $this->assertTrue($result);
        
        // Verify state was saved
        $retrieved_state = $this->settings_manager->getUserState();
        $this->assertEquals('menu', $retrieved_state['active_tab']);
        $this->assertTrue($retrieved_state['live_edit_mode']);
    }
    
    /**
     * Test user state property operations
     */
    public function test_user_state_properties() {
        // Test setting property
        $result = $this->settings_manager->setUserStateProperty('active_tab', 'content');
        $this->assertTrue($result);
        
        // Test getting property
        $value = $this->settings_manager->getUserStateProperty('active_tab');
        $this->assertEquals('content', $value);
        
        // Test nested property
        $result = $this->settings_manager->setUserStateProperty('ui_preferences.sidebar_collapsed', true);
        $this->assertTrue($result);
        
        $value = $this->settings_manager->getUserStateProperty('ui_preferences.sidebar_collapsed');
        $this->assertTrue($value);
        
        // Test getting non-existent property with default
        $value = $this->settings_manager->getUserStateProperty('non_existent', 'default');
        $this->assertEquals('default', $value);
    }
    
    /**
     * Test caching integration
     */
    public function test_caching_integration() {
        // Set a value to trigger caching
        $this->settings_manager->set('menu.background_color', '#ff0000');
        
        // Get the value (should be cached now)
        $value1 = $this->settings_manager->get('menu.background_color');
        $value2 = $this->settings_manager->get('menu.background_color');
        
        $this->assertEquals($value1, $value2);
        $this->assertEquals('#ff0000', $value1);
        
        // Verify cache metrics show hits
        $metrics = $this->cache_manager->getMetrics();
        $this->assertGreaterThan(0, $metrics['hits']);
    }
    
    /**
     * Test error handling
     */
    public function test_error_handling() {
        // Test invalid key format
        $result = $this->settings_manager->set('invalid_key', 'value');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_key', $result->get_error_code());
        
        // Test setting with validation disabled should still sanitize
        $result = $this->settings_manager->set('menu.background_color', '  #ff0000  ', false);
        $this->assertTrue($result);
        
        $value = $this->settings_manager->get('menu.background_color');
        $this->assertEquals('#ff0000', $value); // Should be trimmed
    }
    
    /**
     * Test security integration
     */
    public function test_security_integration() {
        // Test CSS sanitization
        $dangerous_css = 'body { background: url(javascript:alert("xss")); }';
        $this->settings_manager->set('advanced.custom_css', $dangerous_css, false);
        
        $sanitized = $this->settings_manager->get('advanced.custom_css');
        $this->assertStringNotContainsString('javascript:', $sanitized);
        
        // Test color validation
        $result = $this->settings_manager->set('menu.background_color', 'rgb(300, 300, 300)');
        $this->assertInstanceOf('WP_Error', $result);
    }
}