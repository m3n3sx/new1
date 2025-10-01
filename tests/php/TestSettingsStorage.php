<?php
/**
 * PHPUnit tests for LAS_Settings_Storage class
 * 
 * Tests database operations, caching, and performance optimization
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestSettingsStorage extends WP_UnitTestCase {
    
    /**
     * Settings storage instance
     * @var LAS_Settings_Storage
     */
    private $storage;
    
    /**
     * Test settings data
     * @var array
     */
    private $test_settings = [
        'menu_background_color' => '#ff0000',
        'menu_text_color' => '#ffffff',
        'adminbar_background' => '#0073aa',
        'enable_live_preview' => true,
        'font_size' => 16
    ];
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        $this->storage = new LAS_Settings_Storage();
        
        // Clear any existing test data
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
        global $wpdb;
        
        // Remove test options
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
            'las_%'
        ));
        
        // Clear caches
        wp_cache_flush();
    }
    
    /**
     * Test settings storage initialization
     */
    public function test_storage_initialization() {
        $this->assertInstanceOf('LAS_Settings_Storage', $this->storage);
        
        $defaults = $this->storage->get_default_settings();
        $this->assertIsArray($defaults);
        $this->assertNotEmpty($defaults);
        
        // Check for required default settings
        $required_settings = [
            'menu_background_color',
            'menu_text_color',
            'adminbar_background',
            'content_background',
            'enable_live_preview'
        ];
        
        foreach ($required_settings as $setting) {
            $this->assertArrayHasKey($setting, $defaults);
        }
    }
    
    /**
     * Test saving settings to database
     */
    public function test_save_settings() {
        $result = $this->storage->save_settings($this->test_settings);
        $this->assertTrue($result);
        
        // Verify settings were saved to database
        foreach ($this->test_settings as $key => $expected_value) {
            $actual_value = get_option('las_' . $key);
            $this->assertEquals($expected_value, $actual_value);
        }
    }
    
    /**
     * Test loading settings from database
     */
    public function test_load_settings() {
        // Save test settings first
        $this->storage->save_settings($this->test_settings);
        
        // Load all settings
        $loaded_settings = $this->storage->load_settings();
        $this->assertIsArray($loaded_settings);
        
        // Verify test settings are loaded correctly
        foreach ($this->test_settings as $key => $expected_value) {
            $this->assertArrayHasKey($key, $loaded_settings);
            $this->assertEquals($expected_value, $loaded_settings[$key]);
        }
    }
    
    /**
     * Test loading specific settings
     */
    public function test_load_specific_settings() {
        // Save test settings first
        $this->storage->save_settings($this->test_settings);
        
        // Load specific settings
        $keys_to_load = ['menu_background_color', 'enable_live_preview'];
        $loaded_settings = $this->storage->load_settings($keys_to_load);
        
        $this->assertCount(2, $loaded_settings);
        $this->assertEquals('#ff0000', $loaded_settings['menu_background_color']);
        $this->assertTrue($loaded_settings['enable_live_preview']);
    }
    
    /**
     * Test single setting operations
     */
    public function test_single_setting_operations() {
        // Test set single setting
        $result = $this->storage->set_setting('menu_background_color', '#00ff00');
        $this->assertTrue($result);
        
        // Test get single setting
        $value = $this->storage->get_setting('menu_background_color');
        $this->assertEquals('#00ff00', $value);
        
        // Test get with default
        $value = $this->storage->get_setting('nonexistent_setting', 'default_value');
        $this->assertEquals('default_value', $value);
        
        // Test delete setting
        $result = $this->storage->delete_setting('menu_background_color');
        $this->assertTrue($result);
        
        // Verify setting is deleted
        $value = get_option('las_menu_background_color', 'not_found');
        $this->assertEquals('not_found', $value);
    }
    
    /**
     * Test settings reset functionality
     */
    public function test_reset_settings() {
        // Save custom settings
        $this->storage->save_settings($this->test_settings);
        
        // Reset to defaults
        $result = $this->storage->reset_settings();
        $this->assertTrue($result);
        
        // Verify settings are reset to defaults
        $defaults = $this->storage->get_default_settings();
        $loaded_settings = $this->storage->load_settings();
        
        foreach ($defaults as $key => $default_value) {
            $this->assertEquals($default_value, $loaded_settings[$key]);
        }
    }
    
    /**
     * Test caching functionality
     */
    public function test_caching() {
        // Save a setting
        $this->storage->set_setting('menu_background_color', '#ff0000');
        
        // Load setting (should cache it)
        $value1 = $this->storage->get_setting('menu_background_color');
        $this->assertEquals('#ff0000', $value1);
        
        // Manually change database value (bypassing cache)
        update_option('las_menu_background_color', '#00ff00');
        
        // Load setting again (should return cached value)
        $value2 = $this->storage->get_setting('menu_background_color');
        $this->assertEquals('#ff0000', $value2); // Still cached value
        
        // Clear cache and load again
        wp_cache_delete('menu_background_color', 'las_settings');
        $value3 = $this->storage->get_setting('menu_background_color');
        $this->assertEquals('#00ff00', $value3); // Now updated value
    }
    
    /**
     * Test batch operations
     */
    public function test_batch_operations() {
        // Queue batch save
        $this->storage->queue_batch_save($this->test_settings);
        
        // Process batch queue
        $this->storage->process_batch_queue();
        
        // Verify all settings were saved
        foreach ($this->test_settings as $key => $expected_value) {
            $actual_value = get_option('las_' . $key);
            $this->assertEquals($expected_value, $actual_value);
        }
    }
    
    /**
     * Test invalid input handling
     */
    public function test_invalid_input_handling() {
        // Test save with invalid input
        $this->assertFalse($this->storage->save_settings(null));
        $this->assertFalse($this->storage->save_settings('not_array'));
        $this->assertFalse($this->storage->save_settings([]));
        
        // Test set with invalid key
        $this->assertFalse($this->storage->set_setting('invalid!key', 'value'));
        $this->assertFalse($this->storage->set_setting('', 'value'));
    }
    
    /**
     * Test performance metrics
     */
    public function test_performance_metrics() {
        // Perform some operations to generate metrics
        $this->storage->save_settings($this->test_settings);
        $this->storage->load_settings();
        $this->storage->reset_settings();
        
        $metrics = $this->storage->get_performance_metrics();
        $this->assertIsArray($metrics);
        
        // Check for expected metric operations
        $this->assertArrayHasKey('save_settings', $metrics);
        $this->assertArrayHasKey('load_settings', $metrics);
        $this->assertArrayHasKey('reset_settings', $metrics);
        
        // Verify metric structure
        foreach ($metrics as $operation => $operation_metrics) {
            $this->assertIsArray($operation_metrics);
            $this->assertNotEmpty($operation_metrics);
            
            foreach ($operation_metrics as $metric) {
                $this->assertArrayHasKey('timestamp', $metric);
                $this->assertArrayHasKey('execution_time_ms', $metric);
                $this->assertArrayHasKey('memory_usage', $metric);
            }
        }
    }
    
    /**
     * Test export/import functionality
     */
    public function test_export_import() {
        // Save test settings
        $this->storage->save_settings($this->test_settings);
        
        // Export settings
        $export_data = $this->storage->export_settings();
        $this->assertIsArray($export_data);
        $this->assertArrayHasKey('version', $export_data);
        $this->assertArrayHasKey('timestamp', $export_data);
        $this->assertArrayHasKey('settings', $export_data);
        $this->assertArrayHasKey('defaults', $export_data);
        
        // Verify exported settings
        foreach ($this->test_settings as $key => $expected_value) {
            $this->assertEquals($expected_value, $export_data['settings'][$key]);
        }
        
        // Reset settings
        $this->storage->reset_settings();
        
        // Import settings
        $result = $this->storage->import_settings($export_data);
        $this->assertTrue($result);
        
        // Verify imported settings
        $loaded_settings = $this->storage->load_settings();
        foreach ($this->test_settings as $key => $expected_value) {
            $this->assertEquals($expected_value, $loaded_settings[$key]);
        }
    }
    
    /**
     * Test import with invalid data
     */
    public function test_import_invalid_data() {
        // Test with null data
        $this->assertFalse($this->storage->import_settings(null));
        
        // Test with invalid structure
        $this->assertFalse($this->storage->import_settings(['invalid' => 'data']));
        
        // Test with empty settings
        $this->assertFalse($this->storage->import_settings([
            'version' => '1.0',
            'settings' => []
        ]));
        
        // Test with invalid settings keys
        $this->assertFalse($this->storage->import_settings([
            'version' => '1.0',
            'settings' => ['invalid!key' => 'value']
        ]));
    }
    
    /**
     * Test database statistics
     */
    public function test_database_stats() {
        // Save some settings to generate data
        $this->storage->save_settings($this->test_settings);
        
        $stats = $this->storage->get_database_stats();
        $this->assertIsArray($stats);
        
        // Check for expected statistics
        $this->assertArrayHasKey('option_count', $stats);
        $this->assertArrayHasKey('total_size_bytes', $stats);
        $this->assertArrayHasKey('total_size_formatted', $stats);
        $this->assertArrayHasKey('average_size_bytes', $stats);
        $this->assertArrayHasKey('cache_hit_ratio', $stats);
        $this->assertArrayHasKey('performance_metrics', $stats);
        
        // Verify data types
        $this->assertIsInt($stats['option_count']);
        $this->assertIsInt($stats['total_size_bytes']);
        $this->assertIsString($stats['total_size_formatted']);
        $this->assertIsNumeric($stats['average_size_bytes']);
        $this->assertIsNumeric($stats['cache_hit_ratio']);
        $this->assertIsArray($stats['performance_metrics']);
        
        // Verify we have at least the test settings count
        $this->assertGreaterThanOrEqual(count($this->test_settings), $stats['option_count']);
    }
    
    /**
     * Test database optimization
     */
    public function test_database_optimization() {
        // Save settings first
        $this->storage->save_settings($this->test_settings);
        
        // Run optimization
        $result = $this->storage->optimize_database();
        $this->assertTrue($result);
        
        // Verify settings still work after optimization
        $loaded_settings = $this->storage->load_settings();
        foreach ($this->test_settings as $key => $expected_value) {
            $this->assertEquals($expected_value, $loaded_settings[$key]);
        }
    }
    
    /**
     * Test transaction rollback on error
     */
    public function test_transaction_rollback() {
        global $wpdb;
        
        // Mock database error by temporarily changing table name
        $original_options_table = $wpdb->options;
        $wpdb->options = 'nonexistent_table';
        
        // Attempt to save settings (should fail and rollback)
        $result = $this->storage->save_settings($this->test_settings);
        $this->assertFalse($result);
        
        // Restore original table name
        $wpdb->options = $original_options_table;
        
        // Verify no partial data was saved
        foreach ($this->test_settings as $key => $value) {
            $actual_value = get_option('las_' . $key, 'not_found');
            $this->assertEquals('not_found', $actual_value);
        }
    }
    
    /**
     * Test concurrent access handling
     */
    public function test_concurrent_access() {
        // Simulate concurrent saves
        $settings1 = ['menu_background_color' => '#ff0000'];
        $settings2 = ['menu_background_color' => '#00ff00'];
        
        // Save both concurrently (in real scenario, these would be separate processes)
        $result1 = $this->storage->save_settings($settings1);
        $result2 = $this->storage->save_settings($settings2);
        
        $this->assertTrue($result1);
        $this->assertTrue($result2);
        
        // The last save should win
        $final_value = $this->storage->get_setting('menu_background_color');
        $this->assertEquals('#00ff00', $final_value);
    }
    
    /**
     * Test memory usage optimization
     */
    public function test_memory_optimization() {
        $initial_memory = memory_get_usage(true);
        
        // Perform memory-intensive operations
        for ($i = 0; $i < 100; $i++) {
            $large_settings = [];
            for ($j = 0; $j < 50; $j++) {
                $large_settings["test_setting_$j"] = str_repeat('x', 1000);
            }
            $this->storage->save_settings($large_settings);
            $this->storage->load_settings();
        }
        
        $final_memory = memory_get_usage(true);
        $memory_increase = $final_memory - $initial_memory;
        
        // Memory increase should be reasonable (less than 10MB for this test)
        $this->assertLessThan(10 * 1024 * 1024, $memory_increase);
    }
    
    /**
     * Test cache invalidation
     */
    public function test_cache_invalidation() {
        // Set a setting
        $this->storage->set_setting('menu_background_color', '#ff0000');
        
        // Verify it's cached
        $cached_value = wp_cache_get('menu_background_color', 'las_settings');
        $this->assertEquals('#ff0000', $cached_value);
        
        // Update the setting
        $this->storage->set_setting('menu_background_color', '#00ff00');
        
        // Verify cache is updated
        $new_cached_value = wp_cache_get('menu_background_color', 'las_settings');
        $this->assertEquals('#00ff00', $new_cached_value);
        
        // Delete the setting
        $this->storage->delete_setting('menu_background_color');
        
        // Verify cache is cleared
        $deleted_cached_value = wp_cache_get('menu_background_color', 'las_settings');
        $this->assertFalse($deleted_cached_value);
    }
}