<?php
/**
 * Unit tests for CacheManager service
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/../../includes/CacheManager.php';

/**
 * Test class for LAS_CacheManager
 */
class TestCacheManager extends WP_UnitTestCase {
    
    /**
     * CacheManager instance
     * @var LAS_CacheManager
     */
    private $cache_manager;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        // Create cache manager with test configuration
        $config = [
            'memory_limit' => 1048576, // 1MB for testing
            'default_ttl' => 60, // 1 minute for testing
            'enable_object_cache' => false, // Disable for isolated testing
            'enable_transients' => false // Disable for isolated testing
        ];
        
        $this->cache_manager = new LAS_CacheManager($config);
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        $this->cache_manager->clear();
        parent::tearDown();
    }
    
    /**
     * Test basic cache set and get operations
     */
    public function test_basic_cache_operations() {
        $key = 'test_key';
        $value = 'test_value';
        $group = 'test_group';
        
        // Test set
        $result = $this->cache_manager->set($key, $value, 60, $group);
        $this->assertTrue($result, 'Cache set should return true');
        
        // Test get
        $cached_value = $this->cache_manager->get($key, $group);
        $this->assertEquals($value, $cached_value, 'Retrieved value should match stored value');
        
        // Test get with default
        $default_value = 'default';
        $missing_value = $this->cache_manager->get('missing_key', $group, $default_value);
        $this->assertEquals($default_value, $missing_value, 'Should return default for missing key');
    }
    
    /**
     * Test remember functionality with callback
     */
    public function test_remember_functionality() {
        $key = 'remember_test';
        $expected_value = 'generated_value';
        $callback_called = false;
        
        $callback = function() use ($expected_value, &$callback_called) {
            $callback_called = true;
            return $expected_value;
        };
        
        // First call should execute callback
        $result1 = $this->cache_manager->remember($key, $callback);
        $this->assertEquals($expected_value, $result1);
        $this->assertTrue($callback_called, 'Callback should be called on cache miss');
        
        // Reset callback flag
        $callback_called = false;
        
        // Second call should use cached value
        $result2 = $this->cache_manager->remember($key, $callback);
        $this->assertEquals($expected_value, $result2);
        $this->assertFalse($callback_called, 'Callback should not be called on cache hit');
    }
    
    /**
     * Test cache deletion
     */
    public function test_cache_deletion() {
        $key = 'delete_test';
        $value = 'test_value';
        
        // Set value
        $this->cache_manager->set($key, $value);
        $this->assertEquals($value, $this->cache_manager->get($key));
        
        // Delete value
        $result = $this->cache_manager->delete($key);
        $this->assertTrue($result, 'Delete should return true');
        
        // Verify deletion
        $this->assertNull($this->cache_manager->get($key), 'Deleted key should return null');
    }
    
    /**
     * Test cache expiration
     */
    public function test_cache_expiration() {
        $key = 'expiration_test';
        $value = 'test_value';
        $ttl = 1; // 1 second
        
        // Set value with short TTL
        $this->cache_manager->set($key, $value, $ttl);
        $this->assertEquals($value, $this->cache_manager->get($key));
        
        // Wait for expiration
        sleep(2);
        
        // Value should be expired
        $this->assertNull($this->cache_manager->get($key), 'Expired value should return null');
    }
    
    /**
     * Test cache metrics collection
     */
    public function test_cache_metrics() {
        $metrics = $this->cache_manager->getMetrics();
        
        // Check required metrics exist
        $required_metrics = [
            'hits', 'misses', 'sets', 'deletes', 'memory_usage',
            'hit_rate', 'memory_usage_mb', 'runtime_seconds',
            'cache_efficiency', 'memory_cache_count'
        ];
        
        foreach ($required_metrics as $metric) {
            $this->assertArrayHasKey($metric, $metrics, "Metric '{$metric}' should exist");
        }
        
        // Test metrics tracking
        $initial_metrics = $this->cache_manager->getMetrics();
        
        // Perform cache operations
        $this->cache_manager->set('metric_test', 'value');
        $this->cache_manager->get('metric_test');
        $this->cache_manager->get('missing_key');
        
        $final_metrics = $this->cache_manager->getMetrics();
        
        $this->assertGreaterThan($initial_metrics['sets'], $final_metrics['sets']);
        $this->assertGreaterThan($initial_metrics['hits'], $final_metrics['hits']);
        $this->assertGreaterThan($initial_metrics['misses'], $final_metrics['misses']);
    }
    
    /**
     * Test cache clearing
     */
    public function test_cache_clearing() {
        // Set values in different groups
        $this->cache_manager->set('key1', 'value1', 60, 'group1');
        $this->cache_manager->set('key2', 'value2', 60, 'group2');
        $this->cache_manager->set('key3', 'value3', 60, 'group1');
        
        // Verify values are set
        $this->assertEquals('value1', $this->cache_manager->get('key1', 'group1'));
        $this->assertEquals('value2', $this->cache_manager->get('key2', 'group2'));
        $this->assertEquals('value3', $this->cache_manager->get('key3', 'group1'));
        
        // Clear specific group
        $this->cache_manager->clear('group1');
        
        // Group1 values should be cleared
        $this->assertNull($this->cache_manager->get('key1', 'group1'));
        $this->assertNull($this->cache_manager->get('key3', 'group1'));
        
        // Group2 value should remain
        $this->assertEquals('value2', $this->cache_manager->get('key2', 'group2'));
        
        // Clear all cache
        $this->cache_manager->clear();
        $this->assertNull($this->cache_manager->get('key2', 'group2'));
    }
    
    /**
     * Test memory optimization
     */
    public function test_memory_optimization() {
        // Fill cache with data
        for ($i = 0; $i < 100; $i++) {
            $this->cache_manager->set("key_{$i}", str_repeat('x', 1000));
        }
        
        $initial_metrics = $this->cache_manager->getMetrics();
        
        // Run optimization
        $optimization_result = $this->cache_manager->optimizeMemory();
        
        $this->assertArrayHasKey('entries_before', $optimization_result);
        $this->assertArrayHasKey('entries_after', $optimization_result);
        $this->assertArrayHasKey('memory_freed', $optimization_result);
        
        $final_metrics = $this->cache_manager->getMetrics();
        
        // Memory usage should be reduced or at least not increased
        $this->assertLessThanOrEqual($initial_metrics['memory_usage'], $final_metrics['memory_usage']);
    }
    
    /**
     * Test cache warm up functionality
     */
    public function test_cache_warm_up() {
        $keys_and_callbacks = [
            'warm_key1' => function() { return 'warm_value1'; },
            'warm_key2' => function() { return 'warm_value2'; },
            'warm_key3' => function() { return 'warm_value3'; }
        ];
        
        $results = $this->cache_manager->warmUp($keys_and_callbacks, 'warm_group');
        
        // Check results structure
        foreach ($keys_and_callbacks as $key => $callback) {
            $this->assertArrayHasKey($key, $results);
            $this->assertArrayHasKey('success', $results[$key]);
            $this->assertArrayHasKey('time_taken', $results[$key]);
            $this->assertTrue($results[$key]['success']);
        }
        
        // Verify values are cached
        $this->assertEquals('warm_value1', $this->cache_manager->get('warm_key1', 'warm_group'));
        $this->assertEquals('warm_value2', $this->cache_manager->get('warm_key2', 'warm_group'));
        $this->assertEquals('warm_value3', $this->cache_manager->get('warm_key3', 'warm_group'));
    }
    
    /**
     * Test hit rate calculation
     */
    public function test_hit_rate_calculation() {
        // Start with clean metrics
        $this->cache_manager->clear();
        
        // Set some values
        $this->cache_manager->set('hit_test1', 'value1');
        $this->cache_manager->set('hit_test2', 'value2');
        
        // Generate hits and misses
        $this->cache_manager->get('hit_test1'); // Hit
        $this->cache_manager->get('hit_test2'); // Hit
        $this->cache_manager->get('missing1'); // Miss
        $this->cache_manager->get('missing2'); // Miss
        
        $metrics = $this->cache_manager->getMetrics();
        
        // Should have 50% hit rate (2 hits, 2 misses)
        $this->assertEquals(50.0, $metrics['hit_rate'], 'Hit rate should be 50%', 0.1);
    }
    
    /**
     * Test array and object caching
     */
    public function test_complex_data_caching() {
        // Test array caching
        $array_data = [
            'key1' => 'value1',
            'key2' => ['nested' => 'array'],
            'key3' => 123
        ];
        
        $this->cache_manager->set('array_test', $array_data);
        $cached_array = $this->cache_manager->get('array_test');
        
        $this->assertEquals($array_data, $cached_array, 'Array data should be preserved');
        
        // Test object caching
        $object_data = new stdClass();
        $object_data->property1 = 'value1';
        $object_data->property2 = 123;
        
        $this->cache_manager->set('object_test', $object_data);
        $cached_object = $this->cache_manager->get('object_test');
        
        $this->assertEquals($object_data, $cached_object, 'Object data should be preserved');
    }
    
    /**
     * Test cache key building and sanitization
     */
    public function test_cache_key_building() {
        // Test normal keys
        $this->cache_manager->set('normal_key', 'value1');
        $this->assertEquals('value1', $this->cache_manager->get('normal_key'));
        
        // Test keys with special characters
        $this->cache_manager->set('key-with-dashes', 'value2');
        $this->assertEquals('value2', $this->cache_manager->get('key-with-dashes'));
        
        // Test very long keys (should be hashed)
        $long_key = str_repeat('very_long_key_', 20);
        $this->cache_manager->set($long_key, 'long_value');
        $this->assertEquals('long_value', $this->cache_manager->get($long_key));
    }
    
    /**
     * Test cache with null and false values
     */
    public function test_null_and_false_values() {
        // Test null value
        $this->cache_manager->set('null_test', null);
        $this->assertNull($this->cache_manager->get('null_test'));
        
        // Test false value
        $this->cache_manager->set('false_test', false);
        $this->assertFalse($this->cache_manager->get('false_test'));
        
        // Test empty string
        $this->cache_manager->set('empty_test', '');
        $this->assertEquals('', $this->cache_manager->get('empty_test'));
        
        // Test zero
        $this->cache_manager->set('zero_test', 0);
        $this->assertEquals(0, $this->cache_manager->get('zero_test'));
    }
    
    /**
     * Test performance tracking
     */
    public function test_performance_tracking() {
        $slow_callback = function() {
            usleep(10000); // 10ms delay
            return 'slow_value';
        };
        
        // Generate value with callback
        $this->cache_manager->remember('slow_key', $slow_callback);
        
        $metrics = $this->cache_manager->getMetrics();
        
        $this->assertArrayHasKey('average_generation_time', $metrics);
        $this->assertGreaterThan(0, $metrics['average_generation_time']);
    }
}