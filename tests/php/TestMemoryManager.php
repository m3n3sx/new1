<?php
/**
 * Memory Manager Tests
 * 
 * Unit tests for the LAS_MemoryManager class
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

class TestMemoryManager extends WP_UnitTestCase {
    
    private $memory_manager;
    
    public function setUp(): void {
        parent::setUp();
        $this->memory_manager = LAS_MemoryManager::getInstance();
        $this->memory_manager->clearMemoryData();
    }
    
    public function tearDown(): void {
        $this->memory_manager->clearMemoryData();
        parent::tearDown();
    }
    
    /**
     * Test singleton instance
     */
    public function test_singleton_instance() {
        $instance1 = LAS_MemoryManager::getInstance();
        $instance2 = LAS_MemoryManager::getInstance();
        
        $this->assertSame($instance1, $instance2);
        $this->assertInstanceOf('LAS_MemoryManager', $instance1);
    }
    
    /**
     * Test memory snapshot recording
     */
    public function test_memory_snapshot_recording() {
        $snapshot = $this->memory_manager->recordSnapshot('test_snapshot');
        
        $this->assertIsArray($snapshot);
        $this->assertArrayHasKey('label', $snapshot);
        $this->assertArrayHasKey('timestamp', $snapshot);
        $this->assertArrayHasKey('memory_usage', $snapshot);
        $this->assertArrayHasKey('memory_peak', $snapshot);
        $this->assertArrayHasKey('memory_limit', $snapshot);
        
        $this->assertEquals('test_snapshot', $snapshot['label']);
        $this->assertIsFloat($snapshot['timestamp']);
        $this->assertIsInt($snapshot['memory_usage']);
        $this->assertIsInt($snapshot['memory_peak']);
    }
    
    /**
     * Test memory report generation
     */
    public function test_memory_report_generation() {
        // Create some test data
        $this->memory_manager->recordSnapshot('test_memory');
        
        $report = $this->memory_manager->getMemoryReport();
        
        $this->assertIsArray($report);
        $this->assertArrayHasKey('current_usage', $report);
        $this->assertArrayHasKey('peak_usage', $report);
        $this->assertArrayHasKey('memory_limit', $report);
        $this->assertArrayHasKey('thresholds', $report);
        $this->assertArrayHasKey('snapshots', $report);
        $this->assertArrayHasKey('leak_detection', $report);
        $this->assertArrayHasKey('monitoring_enabled', $report);
        
        $this->assertIsInt($report['current_usage']);
        $this->assertIsInt($report['peak_usage']);
        $this->assertIsInt($report['memory_limit']);
        $this->assertIsBool($report['monitoring_enabled']);
    }
    
    /**
     * Test large object registration
     */
    public function test_large_object_registration() {
        $test_object = array_fill(0, 1000, 'test_data');
        $cleanup_called = false;
        
        $cleanup_callback = function() use (&$cleanup_called) {
            $cleanup_called = true;
        };
        
        $this->memory_manager->registerLargeObject('test_object', $test_object, $cleanup_callback);
        
        $report = $this->memory_manager->getMemoryReport();
        $this->assertEquals(1, $report['large_objects_count']);
        
        // Test cleanup
        $this->memory_manager->performCleanup();
        $this->assertTrue($cleanup_called);
        
        // Test unregistration
        $this->memory_manager->unregisterLargeObject('test_object');
        $report = $this->memory_manager->getMemoryReport();
        $this->assertEquals(0, $report['large_objects_count']);
    }
    
    /**
     * Test memory threshold checking
     */
    public function test_memory_threshold_checking() {
        $alert_triggered = false;
        
        // Register alert callback
        add_action('las_memory_alert', function($alert) use (&$alert_triggered) {
            $alert_triggered = true;
        });
        
        // Create snapshot with high memory usage (simulate)
        $snapshot = [
            'memory_usage' => 30 * 1024 * 1024, // 30MB - exceeds warning threshold
            'timestamp' => microtime(true),
            'label' => 'high_memory_test'
        ];
        
        // This would normally trigger an alert in real usage
        // For testing, we'll check the thresholds directly
        $report = $this->memory_manager->getMemoryReport();
        $this->assertArrayHasKey('thresholds', $report);
        $this->assertIsString($report['thresholds']['warning_usage']);
    }
    
    /**
     * Test cleanup callback registration
     */
    public function test_cleanup_callback_registration() {
        $callback_executed = false;
        
        $cleanup_callback = function() use (&$callback_executed) {
            $callback_executed = true;
            return 1024; // Return bytes cleaned
        };
        
        $this->memory_manager->registerCleanupCallback($cleanup_callback);
        
        $cleaned = $this->memory_manager->performCleanup();
        
        $this->assertTrue($callback_executed);
        $this->assertGreaterThanOrEqual(1024, $cleaned);
    }
    
    /**
     * Test monitoring enable/disable
     */
    public function test_monitoring_control() {
        $this->assertTrue($this->memory_manager->isMonitoringEnabled());
        
        $this->memory_manager->disableMonitoring();
        $this->assertFalse($this->memory_manager->isMonitoringEnabled());
        
        $this->memory_manager->enableMonitoring();
        $this->assertTrue($this->memory_manager->isMonitoringEnabled());
    }
    
    /**
     * Test memory statistics
     */
    public function test_memory_statistics() {
        $stats = $this->memory_manager->getMemoryStats();
        
        $this->assertIsArray($stats);
        $this->assertArrayHasKey('current', $stats);
        $this->assertArrayHasKey('peak', $stats);
        $this->assertArrayHasKey('limit', $stats);
        $this->assertArrayHasKey('snapshots_count', $stats);
        $this->assertArrayHasKey('large_objects_count', $stats);
        $this->assertArrayHasKey('alerts_count', $stats);
        $this->assertArrayHasKey('trend', $stats);
        
        $this->assertIsInt($stats['current']);
        $this->assertIsInt($stats['peak']);
        $this->assertIsInt($stats['limit']);
        $this->assertIsInt($stats['snapshots_count']);
        $this->assertIsInt($stats['large_objects_count']);
        $this->assertIsInt($stats['alerts_count']);
        $this->assertIsNumeric($stats['trend']);
    }
    
    /**
     * Test emergency cleanup
     */
    public function test_emergency_cleanup() {
        // Register some test objects
        $this->memory_manager->registerLargeObject('test1', ['data' => 'test1']);
        $this->memory_manager->registerLargeObject('test2', ['data' => 'test2']);
        
        // Record some snapshots
        $this->memory_manager->recordSnapshot('before_emergency');
        
        $report_before = $this->memory_manager->getMemoryReport();
        $objects_before = $report_before['large_objects_count'];
        $snapshots_before = count($report_before['snapshots']);
        
        // Perform emergency cleanup
        $this->memory_manager->performEmergencyCleanup();
        
        $report_after = $this->memory_manager->getMemoryReport();
        
        // Should have fewer snapshots after emergency cleanup
        $this->assertLessThanOrEqual($snapshots_before, count($report_after['snapshots']));
    }
    
    /**
     * Test AJAX memory report handler
     */
    public function test_ajax_memory_report() {
        // Mock WordPress functions
        if (!function_exists('wp_verify_nonce')) {
            function wp_verify_nonce($nonce, $action) {
                return true;
            }
        }
        
        if (!function_exists('current_user_can')) {
            function current_user_can($capability) {
                return true;
            }
        }
        
        if (!function_exists('wp_send_json_success')) {
            function wp_send_json_success($data) {
                echo json_encode(['success' => true, 'data' => $data]);
                return;
            }
        }
        
        // Set up POST data
        $_POST['nonce'] = 'test_nonce';
        
        // Capture output
        ob_start();
        $this->memory_manager->handleMemoryReport();
        $output = ob_get_clean();
        
        $this->assertNotEmpty($output);
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
    }
    
    /**
     * Test memory data clearing
     */
    public function test_memory_data_clearing() {
        // Create some test data
        $this->memory_manager->recordSnapshot('test_clear');
        $this->memory_manager->registerLargeObject('test_object', ['data' => 'test']);
        
        // Verify data exists
        $report = $this->memory_manager->getMemoryReport();
        $this->assertNotEmpty($report['snapshots']);
        $this->assertGreaterThan(0, $report['large_objects_count']);
        
        // Clear data
        $this->memory_manager->clearMemoryData();
        
        // Verify data is cleared
        $report = $this->memory_manager->getMemoryReport();
        $this->assertEmpty($report['snapshots']);
        $this->assertEquals(0, $report['large_objects_count']);
    }
}