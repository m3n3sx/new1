<?php
/**
 * Performance Monitor Tests
 * 
 * Unit tests for the LAS_PerformanceMonitor class
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

class TestPerformanceMonitor extends WP_UnitTestCase {
    
    private $performance_monitor;
    
    public function setUp(): void {
        parent::setUp();
        $this->performance_monitor = LAS_PerformanceMonitor::getInstance();
        $this->performance_monitor->clearMetrics();
    }
    
    public function tearDown(): void {
        $this->performance_monitor->clearMetrics();
        parent::tearDown();
    }
    
    /**
     * Test singleton instance
     */
    public function test_singleton_instance() {
        $instance1 = LAS_PerformanceMonitor::getInstance();
        $instance2 = LAS_PerformanceMonitor::getInstance();
        
        $this->assertSame($instance1, $instance2);
        $this->assertInstanceOf('LAS_PerformanceMonitor', $instance1);
    }
    
    /**
     * Test timer functionality
     */
    public function test_timer_functionality() {
        // Start timer
        $start_time = $this->performance_monitor->startTimer('test_timer');
        $this->assertIsFloat($start_time);
        
        // Add small delay
        usleep(10000); // 10ms
        
        // End timer
        $duration = $this->performance_monitor->endTimer('test_timer');
        $this->assertIsFloat($duration);
        $this->assertGreaterThan(0.01, $duration); // Should be > 10ms
        
        // Get duration
        $retrieved_duration = $this->performance_monitor->getTimerDuration('test_timer');
        $this->assertEquals($duration, $retrieved_duration);
    }
    
    /**
     * Test timer with non-existent name
     */
    public function test_timer_nonexistent() {
        $duration = $this->performance_monitor->endTimer('nonexistent_timer');
        $this->assertNull($duration);
        
        $retrieved_duration = $this->performance_monitor->getTimerDuration('nonexistent_timer');
        $this->assertNull($retrieved_duration);
    }
    
    /**
     * Test memory snapshot recording
     */
    public function test_memory_snapshot() {
        $snapshot = $this->performance_monitor->recordMemorySnapshot('test_snapshot');
        
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
     * Test performance report generation
     */
    public function test_performance_report() {
        // Create some test data
        $this->performance_monitor->startTimer('test_operation');
        usleep(5000); // 5ms
        $this->performance_monitor->endTimer('test_operation');
        $this->performance_monitor->recordMemorySnapshot('test_memory');
        
        $report = $this->performance_monitor->getPerformanceReport();
        
        $this->assertIsArray($report);
        $this->assertArrayHasKey('timers', $report);
        $this->assertArrayHasKey('memory_snapshots', $report);
        $this->assertArrayHasKey('current_memory', $report);
        $this->assertArrayHasKey('thresholds', $report);
        $this->assertArrayHasKey('lighthouse_metrics', $report);
        $this->assertArrayHasKey('server_info', $report);
        
        // Check timer data
        $this->assertArrayHasKey('test_operation', $report['timers']);
        $this->assertIsFloat($report['timers']['test_operation']['duration']);
        
        // Check memory snapshots
        $this->assertNotEmpty($report['memory_snapshots']);
        
        // Check server info
        $this->assertArrayHasKey('php_version', $report['server_info']);
        $this->assertArrayHasKey('memory_limit', $report['server_info']);
    }
    
    /**
     * Test Lighthouse metrics calculation
     */
    public function test_lighthouse_metrics() {
        // Simulate page load
        $this->performance_monitor->startTimer('page_load');
        usleep(100000); // 100ms
        $this->performance_monitor->endTimer('page_load');
        
        $lighthouse_metrics = $this->performance_monitor->getLighthouseMetrics();
        
        $this->assertIsArray($lighthouse_metrics);
        $this->assertArrayHasKey('first_contentful_paint', $lighthouse_metrics);
        $this->assertArrayHasKey('performance_score', $lighthouse_metrics);
        $this->assertArrayHasKey('metrics_collected_at', $lighthouse_metrics);
        
        $this->assertIsInt($lighthouse_metrics['performance_score']);
        $this->assertGreaterThanOrEqual(0, $lighthouse_metrics['performance_score']);
        $this->assertLessThanOrEqual(100, $lighthouse_metrics['performance_score']);
    }
    
    /**
     * Test performance score calculation
     */
    public function test_performance_score_calculation() {
        // Test with fast page load (should get high score)
        $this->performance_monitor->startTimer('page_load');
        usleep(50000); // 50ms - very fast
        $this->performance_monitor->endTimer('page_load');
        
        $lighthouse_metrics = $this->performance_monitor->getLighthouseMetrics();
        $score = $lighthouse_metrics['performance_score'];
        
        $this->assertGreaterThan(80, $score); // Should be high score for fast load
        
        // Clear and test with slow page load
        $this->performance_monitor->clearMetrics();
        $this->performance_monitor->startTimer('page_load');
        usleep(2500000); // 2.5 seconds - slow
        $this->performance_monitor->endTimer('page_load');
        
        $lighthouse_metrics = $this->performance_monitor->getLighthouseMetrics();
        $score = $lighthouse_metrics['performance_score'];
        
        $this->assertLessThan(90, $score); // Should be lower score for slow load
    }
    
    /**
     * Test alert system
     */
    public function test_alert_system() {
        $alert_triggered = false;
        $alert_data = null;
        
        // Register alert callback
        $this->performance_monitor->registerAlertCallback(function($data) use (&$alert_triggered, &$alert_data) {
            $alert_triggered = true;
            $alert_data = $data;
        });
        
        // Trigger slow operation that should cause alert
        $this->performance_monitor->startTimer('ajax_request');
        usleep(600000); // 600ms - exceeds 500ms threshold
        $this->performance_monitor->endTimer('ajax_request');
        
        $this->assertTrue($alert_triggered);
        $this->assertIsArray($alert_data);
        $this->assertEquals('ajax_request', $alert_data['metric']);
        $this->assertGreaterThan(0.5, $alert_data['value']);
    }
    
    /**
     * Test benchmarking functionality
     */
    public function test_benchmark_function() {
        $test_function = function() {
            usleep(10000); // 10ms
            return 'test_result';
        };
        
        $result = $this->performance_monitor->benchmark($test_function, 'test_benchmark');
        
        $this->assertEquals('test_result', $result);
        
        $duration = $this->performance_monitor->getTimerDuration('test_benchmark');
        $this->assertGreaterThan(0.01, $duration); // Should be > 10ms
        
        $report = $this->performance_monitor->getPerformanceReport();
        $this->assertArrayHasKey('test_benchmark', $report['timers']);
    }
    
    /**
     * Test metrics export
     */
    public function test_metrics_export() {
        // Create some test data
        $this->performance_monitor->startTimer('export_test');
        usleep(5000);
        $this->performance_monitor->endTimer('export_test');
        
        $json = $this->performance_monitor->exportMetrics();
        $this->assertIsString($json);
        
        $decoded = json_decode($json, true);
        $this->assertIsArray($decoded);
        $this->assertArrayHasKey('timers', $decoded);
        $this->assertArrayHasKey('export_test', $decoded['timers']);
    }
    
    /**
     * Test memory limit parsing
     */
    public function test_memory_limit_parsing() {
        // Test with different memory limit formats
        $original_limit = ini_get('memory_limit');
        
        // Test with 'M' suffix
        ini_set('memory_limit', '128M');
        $snapshot = $this->performance_monitor->recordMemorySnapshot('memory_test');
        $this->assertEquals(128 * 1024 * 1024, $snapshot['memory_limit']);
        
        // Test with 'G' suffix
        ini_set('memory_limit', '1G');
        $snapshot = $this->performance_monitor->recordMemorySnapshot('memory_test');
        $this->assertEquals(1024 * 1024 * 1024, $snapshot['memory_limit']);
        
        // Restore original limit
        ini_set('memory_limit', $original_limit);
    }
    
    /**
     * Test AJAX performance report handler
     */
    public function test_ajax_performance_report() {
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
        $this->performance_monitor->handlePerformanceReport();
        $output = ob_get_clean();
        
        $this->assertNotEmpty($output);
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
    }
    
    /**
     * Test performance thresholds
     */
    public function test_performance_thresholds() {
        $report = $this->performance_monitor->getPerformanceReport();
        $thresholds = $report['thresholds'];
        
        // Verify all required thresholds exist
        $this->assertArrayHasKey('page_load_time', $thresholds);
        $this->assertArrayHasKey('ajax_response_time', $thresholds);
        $this->assertArrayHasKey('cache_operation_time', $thresholds);
        $this->assertArrayHasKey('memory_base', $thresholds);
        $this->assertArrayHasKey('memory_peak', $thresholds);
        $this->assertArrayHasKey('lighthouse_score', $thresholds);
        
        // Verify threshold values match requirements
        $this->assertEquals(2.0, $thresholds['page_load_time']); // 2 seconds
        $this->assertEquals(0.5, $thresholds['ajax_response_time']); // 500ms
        $this->assertEquals(0.1, $thresholds['cache_operation_time']); // 100ms
        $this->assertEquals(12 * 1024 * 1024, $thresholds['memory_base']); // 12MB
        $this->assertEquals(25 * 1024 * 1024, $thresholds['memory_peak']); // 25MB
        $this->assertEquals(90, $thresholds['lighthouse_score']); // Score > 90
    }
    
    /**
     * Test metrics clearing
     */
    public function test_metrics_clearing() {
        // Create some test data
        $this->performance_monitor->startTimer('clear_test');
        $this->performance_monitor->endTimer('clear_test');
        $this->performance_monitor->recordMemorySnapshot('clear_test');
        
        // Verify data exists
        $report = $this->performance_monitor->getPerformanceReport();
        $this->assertNotEmpty($report['timers']);
        $this->assertNotEmpty($report['memory_snapshots']);
        
        // Clear metrics
        $this->performance_monitor->clearMetrics();
        
        // Verify data is cleared
        $report = $this->performance_monitor->getPerformanceReport();
        $this->assertEmpty($report['timers']);
        $this->assertEmpty($report['memory_snapshots']);
        $this->assertEmpty($report['alerts']);
    }
}