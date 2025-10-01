<?php
/**
 * Test Enhanced AJAX Handlers Infrastructure
 * 
 * Tests the enhanced AJAX handler class with standardized responses,
 * performance monitoring, and comprehensive error handling.
 * 
 * @package LiveAdminStyler
 * @version 1.2.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Test class for Enhanced AJAX Handlers
 */
class TestEnhancedAjaxHandlers extends WP_UnitTestCase {
    
    /**
     * AJAX handlers instance
     * @var LAS_Ajax_Handlers
     */
    private $ajax_handlers;
    
    /**
     * Test user ID
     * @var int
     */
    private $admin_user_id;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        // Create admin user for testing
        $this->admin_user_id = $this->factory->user->create([
            'role' => 'administrator'
        ]);
        wp_set_current_user($this->admin_user_id);
        
        // Initialize AJAX handlers
        $this->ajax_handlers = new LAS_Ajax_Handlers();
        
        // Set up $_POST superglobal for AJAX simulation
        $_POST = [];
        $_SERVER['REQUEST_METHOD'] = 'POST';
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        // Clean up $_POST and $_SERVER
        $_POST = [];
        unset($_SERVER['REQUEST_METHOD']);
        
        parent::tearDown();
    }
    
    /**
     * Test AJAX handler registration
     */
    public function test_ajax_handlers_registration() {
        // Check that WordPress hooks are registered
        $this->assertTrue(has_action('wp_ajax_las_save_settings'));
        $this->assertTrue(has_action('wp_ajax_las_load_settings'));
        $this->assertTrue(has_action('wp_ajax_las_get_preview_css'));
        $this->assertTrue(has_action('wp_ajax_las_batch_save_settings'));
        $this->assertTrue(has_action('wp_ajax_las_get_performance_metrics'));
        $this->assertTrue(has_action('wp_ajax_las_refresh_nonce'));
        $this->assertTrue(has_action('wp_ajax_las_health_check'));
    }
    
    /**
     * Test standardized success response format
     */
    public function test_standardized_success_response() {
        // Set up valid nonce and request data
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['action'] = 'las_load_settings';
        
        // Capture output
        ob_start();
        
        try {
            $this->ajax_handlers->handle_load_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify standardized response structure
        $this->assertIsArray($response);
        $this->assertArrayHasKey('success', $response);
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('meta', $response);
        
        // Verify meta information
        $this->assertArrayHasKey('timestamp', $response['meta']);
        $this->assertArrayHasKey('execution_time_ms', $response['meta']);
        $this->assertArrayHasKey('memory_usage', $response['meta']);
        $this->assertArrayHasKey('request_id', $response['meta']);
        $this->assertArrayHasKey('version', $response['meta']);
    }
    
    /**
     * Test standardized error response format
     */
    public function test_standardized_error_response() {
        // Set up invalid request (no nonce)
        $_POST['action'] = 'las_save_settings';
        // Intentionally omit nonce to trigger error
        
        // Capture output
        ob_start();
        
        try {
            $this->ajax_handlers->handle_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify standardized error response structure
        $this->assertIsArray($response);
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('error_code', $response);
        $this->assertArrayHasKey('meta', $response);
        
        // Verify error-specific fields
        $this->assertArrayHasKey('retry_suggested', $response['meta']);
        $this->assertArrayHasKey('execution_time_ms', $response['meta']);
    }
    
    /**
     * Test performance monitoring functionality
     */
    public function test_performance_monitoring() {
        // Set up valid request
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['action'] = 'las_get_performance_metrics';
        
        // Capture output
        ob_start();
        
        try {
            $this->ajax_handlers->handle_get_performance_metrics();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify performance metrics structure
        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('current', $response['data']);
        $this->assertArrayHasKey('historical', $response['data']);
        
        // Verify current metrics
        $current = $response['data']['current'];
        $this->assertArrayHasKey('current_memory_usage', $current);
        $this->assertArrayHasKey('peak_memory_usage', $current);
        $this->assertArrayHasKey('request_count', $current);
        $this->assertArrayHasKey('server_load', $current);
    }
    
    /**
     * Test security validation
     */
    public function test_security_validation() {
        // Test with invalid nonce
        $_POST['nonce'] = 'invalid_nonce';
        $_POST['action'] = 'las_save_settings';
        $_POST['settings'] = '{"test": "value"}';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Should return security error
        $this->assertFalse($response['success']);
        $this->assertEquals('invalid_nonce', $response['error_code']);
    }
    
    /**
     * Test nonce refresh functionality
     */
    public function test_nonce_refresh() {
        $_POST['action'] = 'las_refresh_nonce';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_refresh_nonce();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify nonce refresh response
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('nonce', $response['data']);
        $this->assertArrayHasKey('expires_in', $response['data']);
        
        // Verify new nonce is valid
        $new_nonce = $response['data']['nonce'];
        $this->assertTrue(wp_verify_nonce($new_nonce, 'las_ajax_nonce'));
    }
    
    /**
     * Test health check functionality
     */
    public function test_health_check() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['action'] = 'las_health_check';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_health_check();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify health check response
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('overall_status', $response['data']);
        $this->assertArrayHasKey('components', $response['data']);
        
        // Verify component checks
        $components = $response['data']['components'];
        $this->assertArrayHasKey('database', $components);
        $this->assertArrayHasKey('memory', $components);
        $this->assertArrayHasKey('storage', $components);
        $this->assertArrayHasKey('security', $components);
        $this->assertArrayHasKey('performance', $components);
    }
    
    /**
     * Test error logging functionality
     */
    public function test_error_logging() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['action'] = 'las_log_error';
        $_POST['error'] = 'Test JavaScript error';
        $_POST['stack'] = 'Error stack trace';
        $_POST['url'] = 'http://example.com/admin';
        $_POST['userAgent'] = 'Mozilla/5.0 (Test Browser)';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_log_error();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify error logging response
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('logged_at', $response['data']);
        $this->assertArrayHasKey('error_id', $response['data']);
    }
    
    /**
     * Test batch operations functionality
     */
    public function test_batch_operations() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['action'] = 'las_batch_save_settings';
        $_POST['operations'] = json_encode([
            [
                'type' => 'save_settings',
                'data' => ['test_setting_1' => 'value1']
            ],
            [
                'type' => 'save_settings',
                'data' => ['test_setting_2' => 'value2']
            ]
        ]);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_batch_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify batch operations response
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('results', $response['data']);
        $this->assertArrayHasKey('total_operations', $response['data']);
        $this->assertEquals(2, $response['data']['total_operations']);
    }
}