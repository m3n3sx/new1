<?php
/**
 * Test Performance Monitoring functionality
 */

class TestPerformanceMonitoring extends WP_UnitTestCase {
    
    public function setUp(): void {
        parent::setUp();
        
        // Include the output-css.php file to access performance functions
        require_once plugin_dir_path(__FILE__) . '../../includes/output-css.php';
        
        // Clear any existing performance data
        delete_option('las_fresh_performance_metrics');
        delete_option('las_fresh_css_cache');
    }
    
    public function tearDown(): void {
        // Clean up after tests
        delete_option('las_fresh_performance_metrics');
        delete_option('las_fresh_css_cache');
        
        parent::tearDown();
    }
    
    /**
     * Test performance metrics storage
     */
    public function test_performance_metrics_storage() {
        $metrics = array(
            'execution_time_ms' => 150.5,
            'memory_usage_bytes' => 1024000,
            'css_size_bytes' => 5000,
            'mode' => 'test',
            'timestamp' => current_time('timestamp'),
            'user_id' => 1
        );
        
        $result = las_fresh_store_performance_metrics('css_generation', $metrics);
        $this->assertTrue($result, 'Performance metrics should be stored successfully');
        
        $stored_metrics = las_fresh_get_performance_metrics('css_generation');
        $this->assertNotEmpty($stored_metrics, 'Stored metrics should not be empty');
        $this->assertEquals($metrics['execution_time_ms'], $stored_metrics[0]['execution_time_ms']);
    }
    
    /**
     * Test performance report generation
     */
    public function test_performance_report_generation() {
        // Add some test metrics
        $metrics = array(
            array(
                'execution_time_ms' => 100,
                'memory_used_bytes' => 1000000,
                'css_size_bytes' => 5000,
                'mode' => 'normal',
                'timestamp' => current_time('timestamp')
            ),
            array(
                'execution_time_ms' => 600, // Slow operation
                'memory_used_bytes' => 2000000,
                'css_size_bytes' => 8000,
                'mode' => 'preview',
                'timestamp' => current_time('timestamp')
            )
        );
        
        foreach ($metrics as $metric) {
            las_fresh_store_performance_metrics('css_generation', $metric);
        }
        
        $report = las_fresh_generate_performance_report('css_generation', 7);
        
        $this->assertIsArray($report, 'Report should be an array');
        $this->assertEquals(2, $report['total_operations'], 'Should count 2 operations');
        $this->assertEquals(1, $report['slow_operations_count'], 'Should identify 1 slow operation');
        $this->assertGreaterThan(0, $report['avg_execution_time_ms'], 'Should calculate average execution time');
    }
    
    /**
     * Test CSS caching functionality
     */
    public function test_css_caching() {
        $test_css = '/* Test CSS */ body { color: red; }';
        
        // Test caching
        $cache_result = las_fresh_cache_css($test_css);
        $this->assertTrue($cache_result, 'CSS should be cached successfully');
        
        // Test cache retrieval
        $cached_css = las_fresh_get_cached_css();
        $this->assertEquals($test_css, $cached_css, 'Cached CSS should match original');
        
        // Test cache stats
        $stats = las_fresh_get_cache_stats();
        $this->assertEquals('valid', $stats['status'], 'Cache status should be valid');
        $this->assertEquals(strlen($test_css), $stats['size_bytes'], 'Cache size should match CSS length');
    }
    
    /**
     * Test cache invalidation
     */
    public function test_cache_invalidation() {
        $test_css = '/* Test CSS */ body { color: red; }';
        las_fresh_cache_css($test_css);
        
        // Verify cache exists
        $cached_css = las_fresh_get_cached_css();
        $this->assertEquals($test_css, $cached_css);
        
        // Clear cache
        $clear_result = las_fresh_clear_css_cache();
        $this->assertTrue($clear_result, 'Cache should be cleared successfully');
        
        // Verify cache is cleared
        $cached_css_after_clear = las_fresh_get_cached_css();
        $this->assertFalse($cached_css_after_clear, 'Cache should be empty after clearing');
    }
    
    /**
     * Test options hash generation for cache validation
     */
    public function test_options_hash_generation() {
        // Mock some options
        update_option('las_fresh_options', array(
            'admin_menu_bg_color' => '#123456',
            'admin_bar_bg_color' => '#654321'
        ));
        
        $hash1 = las_fresh_get_options_hash();
        $this->assertNotEmpty($hash1, 'Options hash should not be empty');
        
        // Change options
        update_option('las_fresh_options', array(
            'admin_menu_bg_color' => '#abcdef',
            'admin_bar_bg_color' => '#654321'
        ));
        
        $hash2 = las_fresh_get_options_hash();
        $this->assertNotEquals($hash1, $hash2, 'Hash should change when options change');
    }
    
    /**
     * Test performance metrics limits
     */
    public function test_performance_metrics_limits() {
        // Add more than 100 metrics to test limit
        for ($i = 0; $i < 105; $i++) {
            $metrics = array(
                'execution_time_ms' => 100 + $i,
                'memory_usage_bytes' => 1000000,
                'css_size_bytes' => 5000,
                'mode' => 'test',
                'timestamp' => current_time('timestamp') + $i,
                'user_id' => 1
            );
            las_fresh_store_performance_metrics('css_generation', $metrics);
        }
        
        $stored_metrics = las_fresh_get_performance_metrics('css_generation');
        $this->assertLessThanOrEqual(100, count($stored_metrics), 'Should not store more than 100 metrics');
    }
    
    /**
     * Test performance logging function
     */
    public function test_performance_logging() {
        $start_time = microtime(true) - 0.2; // Simulate 200ms execution
        $start_memory = memory_get_usage(true) - 1000000; // Simulate 1MB memory usage
        $start_peak_memory = memory_get_peak_usage(true);
        $css_output = str_repeat('/* test */', 1000); // Generate some CSS
        
        $metrics = las_fresh_log_css_performance_metrics($start_time, $start_memory, $start_peak_memory, $css_output, 'test');
        
        $this->assertIsArray($metrics, 'Metrics should be returned as array');
        $this->assertArrayHasKey('execution_time_ms', $metrics);
        $this->assertArrayHasKey('memory_used_bytes', $metrics);
        $this->assertArrayHasKey('css_size_bytes', $metrics);
        $this->assertGreaterThan(0, $metrics['execution_time_ms']);
    }
}