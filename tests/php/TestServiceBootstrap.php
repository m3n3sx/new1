<?php
/**
 * Unit tests for ServiceBootstrap
 * 
 * Tests the service initialization and bootstrapping functionality
 * including dependency resolution, service registration, and startup sequence.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/../../includes/ServiceBootstrap.php';
require_once dirname(__FILE__) . '/../../includes/CoreEngine.php';

/**
 * Test class for ServiceBootstrap
 */
class TestServiceBootstrap extends WP_UnitTestCase {
    
    /**
     * ServiceBootstrap instance
     * @var LAS_ServiceBootstrap
     */
    private $bootstrap;
    
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
        
        // Get fresh CoreEngine instance
        $this->core_engine = LAS_CoreEngine::getInstance();
        $this->core_engine->clearCache();
        
        // Create ServiceBootstrap instance
        $this->bootstrap = new LAS_ServiceBootstrap($this->core_engine);
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        $this->core_engine->clearCache();
        parent::tearDown();
    }
    
    /**
     * Test service bootstrap initialization
     */
    public function test_bootstrap_initialization() {
        $this->assertInstanceOf('LAS_ServiceBootstrap', $this->bootstrap);
        $this->assertInstanceOf('LAS_CoreEngine', $this->bootstrap->getCoreEngine());
    }
    
    /**
     * Test service registration during bootstrap
     */
    public function test_service_registration() {
        // Bootstrap should register all core services
        $this->bootstrap->registerServices();
        
        $registered_services = $this->core_engine->getRegisteredServices();
        
        $expected_services = [
            'cache_manager',
            'security_manager',
            'settings_manager',
            'style_generator',
            'asset_loader',
            'communication_manager',
            'template_manager',
            'performance_monitor',
            'memory_manager',
            'database_optimizer',
            'error_logger'
        ];
        
        foreach ($expected_services as $service) {
            $this->assertContains(
                $service,
                $registered_services,
                "Service {$service} should be registered"
            );
        }
    }
    
    /**
     * Test service dependency resolution
     */
    public function test_service_dependency_resolution() {
        $this->bootstrap->registerServices();
        
        // Test that services with dependencies can be resolved
        $settings_manager = $this->core_engine->get('settings_manager');
        $this->assertInstanceOf('LAS_SettingsManager', $settings_manager);
        
        $style_generator = $this->core_engine->get('style_generator');
        $this->assertInstanceOf('LAS_StyleGenerator', $style_generator);
        
        $communication_manager = $this->core_engine->get('communication_manager');
        $this->assertInstanceOf('LAS_CommunicationManager', $communication_manager);
    }
    
    /**
     * Test bootstrap startup sequence
     */
    public function test_bootstrap_startup_sequence() {
        $startup_log = [];
        
        // Mock the startup process
        add_action('las_service_registered', function($service_name) use (&$startup_log) {
            $startup_log[] = "registered_{$service_name}";
        });
        
        add_action('las_service_initialized', function($service_name) use (&$startup_log) {
            $startup_log[] = "initialized_{$service_name}";
        });
        
        // Run bootstrap
        $result = $this->bootstrap->boot();
        
        $this->assertTrue($result, 'Bootstrap should complete successfully');
        $this->assertNotEmpty($startup_log, 'Startup events should be logged');
    }
    
    /**
     * Test bootstrap error handling
     */
    public function test_bootstrap_error_handling() {
        // Register a service with invalid factory
        $this->core_engine->register('invalid_service', 'not_callable');
        
        // Bootstrap should handle the error gracefully
        $result = $this->bootstrap->boot();
        
        // Should still return true but log the error
        $this->assertTrue($result, 'Bootstrap should handle errors gracefully');
    }
    
    /**
     * Test service health checks
     */
    public function test_service_health_checks() {
        $this->bootstrap->registerServices();
        $this->bootstrap->boot();
        
        $health_status = $this->bootstrap->getServiceHealthStatus();
        
        $this->assertIsArray($health_status);
        $this->assertArrayHasKey('overall_status', $health_status);
        $this->assertArrayHasKey('services', $health_status);
        
        // All core services should be healthy
        foreach ($health_status['services'] as $service => $status) {
            $this->assertEquals('healthy', $status['status'], "Service {$service} should be healthy");
        }
    }
    
    /**
     * Test service performance metrics
     */
    public function test_service_performance_metrics() {
        $start_time = microtime(true);
        
        $this->bootstrap->registerServices();
        $this->bootstrap->boot();
        
        $end_time = microtime(true);
        $boot_time = $end_time - $start_time;
        
        // Bootstrap should complete quickly
        $this->assertLessThan(1.0, $boot_time, 'Bootstrap should complete in under 1 second');
        
        $metrics = $this->bootstrap->getPerformanceMetrics();
        $this->assertIsArray($metrics);
        $this->assertArrayHasKey('boot_time', $metrics);
        $this->assertArrayHasKey('memory_usage', $metrics);
        $this->assertArrayHasKey('services_loaded', $metrics);
    }
    
    /**
     * Test WordPress hooks integration
     */
    public function test_wordpress_hooks_integration() {
        $hooks_registered = [];
        
        // Mock WordPress hook functions
        add_filter('las_bootstrap_services', function($services) use (&$hooks_registered) {
            $hooks_registered[] = 'las_bootstrap_services';
            return $services;
        });
        
        add_action('las_bootstrap_complete', function() use (&$hooks_registered) {
            $hooks_registered[] = 'las_bootstrap_complete';
        });
        
        $this->bootstrap->registerServices();
        $this->bootstrap->boot();
        
        $this->assertContains('las_bootstrap_services', $hooks_registered);
        $this->assertContains('las_bootstrap_complete', $hooks_registered);
    }
    
    /**
     * Test service configuration loading
     */
    public function test_service_configuration_loading() {
        // Test default configuration
        $config = $this->bootstrap->getServiceConfiguration();
        
        $this->assertIsArray($config);
        $this->assertArrayHasKey('cache_manager', $config);
        $this->assertArrayHasKey('security_manager', $config);
        
        // Test custom configuration
        $custom_config = [
            'cache_manager' => ['ttl' => 7200],
            'security_manager' => ['strict_mode' => true]
        ];
        
        $this->bootstrap->setServiceConfiguration($custom_config);
        $updated_config = $this->bootstrap->getServiceConfiguration();
        
        $this->assertEquals(7200, $updated_config['cache_manager']['ttl']);
        $this->assertTrue($updated_config['security_manager']['strict_mode']);
    }
    
    /**
     * Test service shutdown handling
     */
    public function test_service_shutdown_handling() {
        $this->bootstrap->registerServices();
        $this->bootstrap->boot();
        
        $shutdown_log = [];
        
        add_action('las_service_shutdown', function($service_name) use (&$shutdown_log) {
            $shutdown_log[] = $service_name;
        });
        
        $result = $this->bootstrap->shutdown();
        
        $this->assertTrue($result, 'Shutdown should complete successfully');
        $this->assertNotEmpty($shutdown_log, 'Shutdown events should be logged');
    }
    
    /**
     * Test service restart functionality
     */
    public function test_service_restart() {
        $this->bootstrap->registerServices();
        $this->bootstrap->boot();
        
        // Get initial service instance
        $initial_cache = $this->core_engine->get('cache_manager');
        
        // Restart specific service
        $result = $this->bootstrap->restartService('cache_manager');
        $this->assertTrue($result, 'Service restart should succeed');
        
        // Get new service instance
        $restarted_cache = $this->core_engine->get('cache_manager');
        
        // Should be a new instance
        $this->assertNotSame($initial_cache, $restarted_cache);
    }
    
    /**
     * Test bootstrap in different environments
     */
    public function test_bootstrap_environments() {
        // Test development environment
        define('WP_DEBUG', true);
        $dev_result = $this->bootstrap->boot();
        $this->assertTrue($dev_result);
        
        // Test production environment
        if (defined('WP_DEBUG')) {
            // Can't redefine constant, so we'll simulate
            $this->bootstrap->setEnvironment('production');
        }
        
        $prod_result = $this->bootstrap->boot();
        $this->assertTrue($prod_result);
        
        // Verify different configurations are applied
        $dev_config = $this->bootstrap->getEnvironmentConfiguration('development');
        $prod_config = $this->bootstrap->getEnvironmentConfiguration('production');
        
        $this->assertNotEquals($dev_config, $prod_config);
    }
    
    /**
     * Test service loading order
     */
    public function test_service_loading_order() {
        $loading_order = [];
        
        // Track service loading order
        add_action('las_service_loaded', function($service_name) use (&$loading_order) {
            $loading_order[] = $service_name;
        });
        
        $this->bootstrap->registerServices();
        $this->bootstrap->boot();
        
        // Core services should load first
        $this->assertEquals('cache_manager', $loading_order[0]);
        $this->assertEquals('security_manager', $loading_order[1]);
        
        // Settings manager should load after cache and security
        $settings_index = array_search('settings_manager', $loading_order);
        $cache_index = array_search('cache_manager', $loading_order);
        $security_index = array_search('security_manager', $loading_order);
        
        $this->assertGreaterThan($cache_index, $settings_index);
        $this->assertGreaterThan($security_index, $settings_index);
    }
}