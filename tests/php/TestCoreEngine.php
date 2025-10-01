<?php
/**
 * Unit tests for CoreEngine dependency injection system
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/../../includes/CoreEngine.php';

/**
 * Test class for LAS_CoreEngine
 */
class TestCoreEngine extends WP_UnitTestCase {
    
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
        
        // Get fresh instance and clear any existing cache
        $this->core_engine = LAS_CoreEngine::getInstance();
        $this->core_engine->clearCache();
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        $this->core_engine->clearCache();
        parent::tearDown();
    }
    
    /**
     * Test singleton pattern
     */
    public function test_singleton_pattern() {
        $instance1 = LAS_CoreEngine::getInstance();
        $instance2 = LAS_CoreEngine::getInstance();
        
        $this->assertSame($instance1, $instance2, 'CoreEngine should return same instance');
    }
    
    /**
     * Test service registration
     */
    public function test_service_registration() {
        $service_name = 'test_service';
        $factory = function() {
            return new stdClass();
        };
        
        $result = $this->core_engine->register($service_name, $factory);
        
        $this->assertInstanceOf('LAS_CoreEngine', $result, 'Register should return CoreEngine instance');
        $this->assertTrue($this->core_engine->has($service_name), 'Service should be registered');
        $this->assertContains($service_name, $this->core_engine->getRegisteredServices());
    }
    
    /**
     * Test service registration with invalid factory
     */
    public function test_service_registration_invalid_factory() {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Service factory for 'invalid_service' must be callable");
        
        $this->core_engine->register('invalid_service', 'not_callable');
    }
    
    /**
     * Test service resolution with lazy loading
     */
    public function test_service_resolution_lazy_loading() {
        $service_name = 'lazy_service';
        $factory_called = false;
        
        $factory = function() use (&$factory_called) {
            $factory_called = true;
            return new stdClass();
        };
        
        $this->core_engine->register($service_name, $factory);
        
        // Factory should not be called yet
        $this->assertFalse($factory_called, 'Factory should not be called during registration');
        
        // Get service - factory should be called now
        $service = $this->core_engine->get($service_name);
        
        $this->assertTrue($factory_called, 'Factory should be called during resolution');
        $this->assertInstanceOf('stdClass', $service);
        $this->assertContains($service_name, $this->core_engine->getInstantiatedServices());
    }
    
    /**
     * Test service caching
     */
    public function test_service_caching() {
        $service_name = 'cached_service';
        $call_count = 0;
        
        $factory = function() use (&$call_count) {
            $call_count++;
            return new stdClass();
        };
        
        $this->core_engine->register($service_name, $factory);
        
        $service1 = $this->core_engine->get($service_name);
        $service2 = $this->core_engine->get($service_name);
        
        $this->assertEquals(1, $call_count, 'Factory should only be called once');
        $this->assertSame($service1, $service2, 'Should return same cached instance');
    }
    
    /**
     * Test dependency injection
     */
    public function test_dependency_injection() {
        // Register dependency
        $this->core_engine->register('dependency', function() {
            $dep = new stdClass();
            $dep->value = 'dependency_value';
            return $dep;
        });
        
        // Register service with dependency
        $this->core_engine->register('service_with_dep', function($dependency) {
            $service = new stdClass();
            $service->dependency = $dependency;
            return $service;
        }, ['dependency']);
        
        $service = $this->core_engine->get('service_with_dep');
        
        $this->assertInstanceOf('stdClass', $service);
        $this->assertInstanceOf('stdClass', $service->dependency);
        $this->assertEquals('dependency_value', $service->dependency->value);
    }
    
    /**
     * Test circular dependency detection
     */
    public function test_circular_dependency_detection() {
        // Register services with circular dependencies
        $this->core_engine->register('service_a', function($service_b) {
            return new stdClass();
        }, ['service_b']);
        
        $this->core_engine->register('service_b', function($service_a) {
            return new stdClass();
        }, ['service_a']);
        
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Circular dependency detected');
        
        $this->core_engine->get('service_a');
    }
    
    /**
     * Test service not found exception
     */
    public function test_service_not_found() {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Service 'nonexistent_service' not found");
        
        $this->core_engine->get('nonexistent_service');
    }
    
    /**
     * Test cache clearing
     */
    public function test_cache_clearing() {
        $service_name = 'clearable_service';
        $call_count = 0;
        
        $factory = function() use (&$call_count) {
            $call_count++;
            return new stdClass();
        };
        
        $this->core_engine->register($service_name, $factory);
        
        // Get service to cache it
        $this->core_engine->get($service_name);
        $this->assertEquals(1, $call_count);
        
        // Clear specific service cache
        $this->core_engine->clearCache($service_name);
        
        // Get service again - should call factory again
        $this->core_engine->get($service_name);
        $this->assertEquals(2, $call_count);
        
        // Clear all cache
        $this->core_engine->clearCache();
        $this->assertEmpty($this->core_engine->getInstantiatedServices());
    }
    
    /**
     * Test dependency graph retrieval
     */
    public function test_dependency_graph() {
        $this->core_engine->register('service_a', function() {
            return new stdClass();
        }, ['service_b', 'service_c']);
        
        $this->core_engine->register('service_b', function() {
            return new stdClass();
        });
        
        $graph = $this->core_engine->getDependencyGraph();
        
        $this->assertArrayHasKey('service_a', $graph);
        $this->assertEquals(['service_b', 'service_c'], $graph['service_a']);
        $this->assertEquals([], $graph['service_b']);
    }
    
    /**
     * Test memory statistics
     */
    public function test_memory_statistics() {
        $stats = $this->core_engine->getMemoryStats();
        
        $this->assertArrayHasKey('current_usage', $stats);
        $this->assertArrayHasKey('peak_usage', $stats);
        $this->assertArrayHasKey('services_count', $stats);
        $this->assertArrayHasKey('registered_count', $stats);
        
        $this->assertIsInt($stats['current_usage']);
        $this->assertIsInt($stats['peak_usage']);
        $this->assertIsInt($stats['services_count']);
        $this->assertIsInt($stats['registered_count']);
    }
    
    /**
     * Test complex dependency chain
     */
    public function test_complex_dependency_chain() {
        // Create a chain: A -> B -> C -> D
        $this->core_engine->register('service_d', function() {
            $service = new stdClass();
            $service->name = 'D';
            return $service;
        });
        
        $this->core_engine->register('service_c', function($service_d) {
            $service = new stdClass();
            $service->name = 'C';
            $service->dependency = $service_d;
            return $service;
        }, ['service_d']);
        
        $this->core_engine->register('service_b', function($service_c) {
            $service = new stdClass();
            $service->name = 'B';
            $service->dependency = $service_c;
            return $service;
        }, ['service_c']);
        
        $this->core_engine->register('service_a', function($service_b) {
            $service = new stdClass();
            $service->name = 'A';
            $service->dependency = $service_b;
            return $service;
        }, ['service_b']);
        
        $service_a = $this->core_engine->get('service_a');
        
        $this->assertEquals('A', $service_a->name);
        $this->assertEquals('B', $service_a->dependency->name);
        $this->assertEquals('C', $service_a->dependency->dependency->name);
        $this->assertEquals('D', $service_a->dependency->dependency->dependency->name);
    }
}