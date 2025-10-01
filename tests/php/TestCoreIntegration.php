<?php
/**
 * Integration tests for Core services working together
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/../../includes/CoreEngine.php';
require_once dirname(__FILE__) . '/../../includes/SecurityManager.php';
require_once dirname(__FILE__) . '/../../includes/CacheManager.php';

/**
 * Test class for Core services integration
 */
class TestCoreIntegration extends WP_UnitTestCase {
    
    /**
     * CoreEngine instance
     * @var LAS_CoreEngine
     */
    private $core_engine;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        $this->core_engine = LAS_CoreEngine::getInstance();
        $this->core_engine->clearCache();
        
        // Register services
        $this->register_services();
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        $this->core_engine->clearCache();
        parent::tearDown();
    }
    
    /**
     * Register core services for testing
     */
    private function register_services() {
        // Register CacheManager
        $this->core_engine->register('cache', function() {
            return new LAS_CacheManager(['enable_transients' => false, 'enable_object_cache' => false]);
        });
        
        // Register SecurityManager
        $this->core_engine->register('security', function() {
            return new LAS_SecurityManager();
        });
        
        // Register a service that depends on both cache and security
        $this->core_engine->register('settings', function($cache, $security) {
            return new TestSettingsService($cache, $security);
        }, ['cache', 'security']);
    }
    
    /**
     * Test service registration and dependency injection
     */
    public function test_service_registration_and_injection() {
        $cache = $this->core_engine->get('cache');
        $security = $this->core_engine->get('security');
        $settings = $this->core_engine->get('settings');
        
        $this->assertInstanceOf('LAS_CacheManager', $cache);
        $this->assertInstanceOf('LAS_SecurityManager', $security);
        $this->assertInstanceOf('TestSettingsService', $settings);
        
        // Verify dependencies were injected
        $this->assertSame($cache, $settings->getCache());
        $this->assertSame($security, $settings->getSecurity());
    }
    
    /**
     * Test integrated security and caching workflow
     */
    public function test_integrated_security_caching_workflow() {
        $settings = $this->core_engine->get('settings');
        
        // Test setting a value (should be sanitized and cached)
        $dirty_value = '<script>alert("xss")</script>Hello World';
        $result = $settings->set('test_setting', $dirty_value);
        
        $this->assertTrue($result);
        
        // Get the value (should come from cache and be sanitized)
        $cached_value = $settings->get('test_setting');
        $this->assertEquals('Hello World', $cached_value);
        $this->assertStringNotContainsString('<script>', $cached_value);
    }
    
    /**
     * Test cache performance with security validation
     */
    public function test_cache_performance_with_security() {
        $settings = $this->core_engine->get('settings');
        
        // First call should be slow (validation + caching)
        $start_time = microtime(true);
        $value1 = $settings->get('performance_test', 'default_value');
        $first_call_time = microtime(true) - $start_time;
        
        // Second call should be fast (cached)
        $start_time = microtime(true);
        $value2 = $settings->get('performance_test', 'default_value');
        $second_call_time = microtime(true) - $start_time;
        
        $this->assertEquals($value1, $value2);
        $this->assertLessThan($first_call_time, $second_call_time, 'Cached call should be faster');
    }
    
    /**
     * Test error handling across services
     */
    public function test_error_handling_across_services() {
        $security = $this->core_engine->get('security');
        
        // Test invalid color validation
        $result = $security->validate('invalid-color', 'color');
        $this->assertInstanceOf('WP_Error', $result);
        
        // Test that cache still works after validation error
        $cache = $this->core_engine->get('cache');
        $cache->set('error_test', 'value_after_error');
        $this->assertEquals('value_after_error', $cache->get('error_test'));
    }
    
    /**
     * Test memory usage across all services
     */
    public function test_memory_usage_across_services() {
        $initial_memory = memory_get_usage(true);
        
        // Get all services
        $cache = $this->core_engine->get('cache');
        $security = $this->core_engine->get('security');
        $settings = $this->core_engine->get('settings');
        
        // Perform operations
        for ($i = 0; $i < 10; $i++) {
            $settings->set("test_key_{$i}", "test_value_{$i}");
            $settings->get("test_key_{$i}");
        }
        
        $final_memory = memory_get_usage(true);
        $memory_used = $final_memory - $initial_memory;
        
        // Should not use excessive memory (less than 5MB for this test)
        $this->assertLessThan(5 * 1024 * 1024, $memory_used, 'Memory usage should be reasonable');
        
        // Get cache metrics
        $metrics = $cache->getMetrics();
        $this->assertGreaterThan(0, $metrics['hits'], 'Should have cache hits');
        $this->assertGreaterThan(0, $metrics['sets'], 'Should have cache sets');
    }
}

/**
 * Mock settings service for testing integration
 */
class TestSettingsService {
    private $cache;
    private $security;
    
    public function __construct($cache, $security) {
        $this->cache = $cache;
        $this->security = $security;
    }
    
    public function set($key, $value) {
        $sanitized_value = $this->security->sanitize($value, 'text');
        return $this->cache->set($key, $sanitized_value);
    }
    
    public function get($key, $default = null) {
        return $this->cache->remember($key, function() use ($default) {
            return $default;
        });
    }
    
    public function getCache() {
        return $this->cache;
    }
    
    public function getSecurity() {
        return $this->security;
    }
}