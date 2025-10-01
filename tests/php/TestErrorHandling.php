<?php
/**
 * Test suite for Enhanced Error Handling System
 * 
 * Tests AJAX error handlers, nonce refresh, error reporting,
 * and server-side error classification.
 */

class TestErrorHandling extends WP_UnitTestCase {
    
    private $ajax_handlers;
    private $security_validator;
    private $test_user_id;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create test user
        $this->test_user_id = $this->factory->user->create([
            'role' => 'administrator'
        ]);
        
        wp_set_current_user($this->test_user_id);
        
        // Initialize handlers
        $this->ajax_handlers = new LAS_Ajax_Handlers();
        $this->security_validator = new LAS_Security_Validator();
        
        // Set up WordPress AJAX environment
        if (!defined('DOING_AJAX')) {
            define('DOING_AJAX', true);
        }
        
        // Mock $_POST and $_SERVER globals
        $_POST = [];
        $_SERVER['HTTP_USER_AGENT'] = 'PHPUnit Test';
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_SERVER['REQUEST_URI'] = '/wp-admin/admin-ajax.php';
    }
    
    public function tearDown(): void {
        // Clean up
        wp_delete_user($this->test_user_id);
        
        // Reset globals
        $_POST = [];
        $_SERVER = [];
        
        parent::tearDown();
    }
    
    /**
     * Test nonce refresh handler
     */
    public function test_nonce_refresh_handler() {
        // Set up request
        $_POST['action'] = 'las_refresh_nonce';
        
        // Capture output
        ob_start();
        
        try {
            $this->ajax_handlers->handle_refresh_nonce();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json calls
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify response structure
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('nonce', $response['data']);
        $this->assertArrayHasKey('expires_in', $response['data']);
        
        // Verify nonce is valid
        $new_nonce = $response['data']['nonce'];
        $this->assertTrue(wp_verify_nonce($new_nonce, 'las_ajax_nonce'));
    }
    
    /**
     * Test nonce refresh with insufficient permissions
     */
    public function test_nonce_refresh_insufficient_permissions() {
        // Create user without manage_options capability
        $subscriber_id = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_id);
        
        $_POST['action'] = 'las_refresh_nonce';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_refresh_nonce();
        } catch (WPAjaxDieContinueException $e) {
            // Expected
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Should return error
        $this->assertFalse($response['success']);
        $this->assertEquals('insufficient_permissions', $response['data']['code']);
        
        wp_delete_user($subscriber_id);
    }
    
    /**
     * Test error report handler with valid data
     */
    public function test_error_report_handler_valid_data() {
        $error_data = [
            'id' => 'err_test_123',
            'timestamp' => '2024-01-10T10:00:00.000Z',
            'classification' => [
                'code' => 'NETWORK_TIMEOUT',
                'category' => 'network',
                'severity' => 'warning',
                'retryable' => true,
                'userMessage' => 'Connection timeout - please check your internet connection.',
                'technicalMessage' => 'Request timed out'
            ],
            'originalError' => [
                'name' => 'AbortError',
                'message' => 'Request timed out',
                'status' => 0,
                'code' => 'TIMEOUT'
            ],
            'context' => [
                'url' => 'https://example.com/wp-admin/',
                'userAgent' => 'Mozilla/5.0 (Test Browser)',
                'requestId' => 'req_test_123',
                'action' => 'las_save_settings',
                'method' => 'POST',
                'attempt' => 1
            ],
            'environment' => [
                'online' => true,
                'cookieEnabled' => true,
                'language' => 'en-US',
                'platform' => 'Linux',
                'viewport' => [
                    'width' => 1920,
                    'height' => 1080
                ],
                'memory' => [
                    'used' => 1000000,
                    'total' => 2000000,
                    'limit' => 4000000
                ],
                'connection' => [
                    'effectiveType' => '4g',
                    'downlink' => 10,
                    'rtt' => 50
                ]
            ]
        ];
        
        // Set up request with JSON data
        $_POST['error_data'] = json_encode($error_data);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_report();
        } catch (WPAjaxDieContinueException $e) {
            // Expected
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify successful processing
        $this->assertTrue($response['success']);
        $this->assertTrue($response['data']['error_logged']);
        $this->assertEquals('err_test_123', $response['data']['error_id']);
    }
    
    /**
     * Test error report handler with invalid JSON
     */
    public function test_error_report_handler_invalid_json() {
        $_POST['error_data'] = 'invalid json data';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_report();
        } catch (WPAjaxDieContinueException $e) {
            // Expected
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Should return error
        $this->assertFalse($response['success']);
        $this->assertEquals('invalid_error_data', $response['data']['code']);
    }
    
    /**
     * Test error report handler without authentication
     */
    public function test_error_report_handler_no_auth() {
        wp_set_current_user(0); // No user logged in
        
        $_POST['error_data'] = json_encode(['test' => 'data']);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_report();
        } catch (WPAjaxDieContinueException $e) {
            // Expected
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Should return authentication error
        $this->assertFalse($response['success']);
        $this->assertEquals('authentication_required', $response['data']['code']);
    }
    
    /**
     * Test error data sanitization
     */
    public function test_error_data_sanitization() {
        $malicious_data = [
            'id' => '<script>alert("xss")</script>',
            'classification' => [
                'code' => 'TEST_ERROR<script>',
                'category' => 'test"category',
                'severity' => 'high\'; DROP TABLE users; --',
                'userMessage' => '<img src=x onerror=alert(1)>',
                'technicalMessage' => 'Test message with <b>HTML</b>'
            ],
            'originalError' => [
                'message' => 'Error with <script>malicious code</script>',
                'stack' => 'Stack trace with <script>alert("xss")</script>'
            ],
            'context' => [
                'url' => 'javascript:alert("xss")',
                'userAgent' => 'User agent with <script>',
                'action' => 'malicious_action<script>'
            ]
        ];
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->ajax_handlers);
        $sanitize_method = $reflection->getMethod('sanitize_error_report');
        $sanitize_method->setAccessible(true);
        
        $sanitized = $sanitize_method->invoke($this->ajax_handlers, $malicious_data);
        
        // Verify sanitization
        $this->assertStringNotContainsString('<script>', $sanitized['id']);
        $this->assertStringNotContainsString('<script>', $sanitized['classification']['code']);
        $this->assertStringNotContainsString('DROP TABLE', $sanitized['classification']['severity']);
        $this->assertStringNotContainsString('<img', $sanitized['classification']['user_message']);
        $this->assertStringNotContainsString('<script>', $sanitized['original_error']['message']);
        $this->assertEquals('', $sanitized['context']['url']); // Invalid URL should be empty
        $this->assertStringNotContainsString('<script>', $sanitized['context']['user_agent']);
    }
    
    /**
     * Test exception severity classification
     */
    public function test_exception_severity_classification() {
        $reflection = new ReflectionClass($this->ajax_handlers);
        $classify_method = $reflection->getMethod('classify_exception_severity');
        $classify_method->setAccessible(true);
        
        // Test critical errors
        $fatal_error = new Exception('Fatal error: Out of memory');
        $this->assertEquals('critical', $classify_method->invoke($this->ajax_handlers, $fatal_error));
        
        $timeout_error = new Exception('Maximum execution time exceeded');
        $this->assertEquals('critical', $classify_method->invoke($this->ajax_handlers, $timeout_error));
        
        // Test high severity errors
        $db_error = new Exception('Database connection failed');
        $this->assertEquals('error', $db_error);
        
        $security_error = new Exception('Permission denied');
        $this->assertEquals('error', $classify_method->invoke($this->ajax_handlers, $security_error));
        
        // Test medium severity errors
        $warning_error = new Exception('Warning: Deprecated function');
        $this->assertEquals('warning', $classify_method->invoke($this->ajax_handlers, $warning_error));
        
        // Test default case
        $generic_error = new Exception('Some generic error');
        $this->assertEquals('error', $classify_method->invoke($this->ajax_handlers, $generic_error));
    }
    
    /**
     * Test client error table creation
     */
    public function test_client_errors_table_creation() {
        global $wpdb;
        
        $reflection = new ReflectionClass($this->ajax_handlers);
        $create_table_method = $reflection->getMethod('create_client_errors_table');
        $create_table_method->setAccessible(true);
        
        // Create table
        $create_table_method->invoke($this->ajax_handlers);
        
        // Verify table exists
        $table_name = $wpdb->prefix . 'las_client_errors';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
        
        $this->assertTrue($table_exists);
        
        // Verify table structure
        $columns = $wpdb->get_results("DESCRIBE $table_name");
        $column_names = array_column($columns, 'Field');
        
        $expected_columns = [
            'id', 'error_id', 'classification_code', 'severity', 
            'category', 'message', 'url', 'user_agent', 
            'user_id', 'ip_address', 'error_data', 'created_at'
        ];
        
        foreach ($expected_columns as $column) {
            $this->assertContains($column, $column_names);
        }
    }
    
    /**
     * Test critical error table creation
     */
    public function test_critical_errors_table_creation() {
        global $wpdb;
        
        $reflection = new ReflectionClass($this->ajax_handlers);
        $create_table_method = $reflection->getMethod('create_critical_errors_table');
        $create_table_method->setAccessible(true);
        
        // Create table
        $create_table_method->invoke($this->ajax_handlers);
        
        // Verify table exists
        $table_name = $wpdb->prefix . 'las_critical_errors';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
        
        $this->assertTrue($table_exists);
        
        // Verify table structure
        $columns = $wpdb->get_results("DESCRIBE $table_name");
        $column_names = array_column($columns, 'Field');
        
        $expected_columns = [
            'id', 'error_type', 'message', 'file', 'line', 
            'severity', 'user_id', 'memory_usage', 
            'context_data', 'request_metadata', 'created_at'
        ];
        
        foreach ($expected_columns as $column) {
            $this->assertContains($column, $column_names);
        }
    }
    
    /**
     * Test client error storage
     */
    public function test_client_error_storage() {
        global $wpdb;
        
        $error_data = [
            'error_id' => 'test_error_123',
            'classification' => [
                'code' => 'NETWORK_TIMEOUT',
                'severity' => 'warning',
                'category' => 'network'
            ],
            'original_error' => [
                'message' => 'Test error message'
            ],
            'context' => [
                'url' => 'https://example.com',
                'user_agent' => 'Test Browser'
            ],
            'user_context' => [
                'user_id' => $this->test_user_id,
                'ip_address' => '127.0.0.1'
            ]
        ];
        
        $reflection = new ReflectionClass($this->ajax_handlers);
        $store_method = $reflection->getMethod('store_client_error');
        $store_method->setAccessible(true);
        
        // Store error
        $store_method->invoke($this->ajax_handlers, $error_data);
        
        // Verify storage
        $table_name = $wpdb->prefix . 'las_client_errors';
        $stored_error = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE error_id = %s",
            'test_error_123'
        ));
        
        $this->assertNotNull($stored_error);
        $this->assertEquals('NETWORK_TIMEOUT', $stored_error->classification_code);
        $this->assertEquals('warning', $stored_error->severity);
        $this->assertEquals('network', $stored_error->category);
        $this->assertEquals($this->test_user_id, $stored_error->user_id);
    }
    
    /**
     * Test error severity mapping
     */
    public function test_error_severity_mapping() {
        $reflection = new ReflectionClass($this->ajax_handlers);
        $map_method = $reflection->getMethod('map_severity_to_log_level');
        $map_method->setAccessible(true);
        
        $this->assertEquals('critical', $map_method->invoke($this->ajax_handlers, 'critical'));
        $this->assertEquals('error', $map_method->invoke($this->ajax_handlers, 'error'));
        $this->assertEquals('warning', $map_method->invoke($this->ajax_handlers, 'warning'));
        $this->assertEquals('info', $map_method->invoke($this->ajax_handlers, 'info'));
        $this->assertEquals('debug', $map_method->invoke($this->ajax_handlers, 'debug'));
        $this->assertEquals('error', $map_method->invoke($this->ajax_handlers, 'unknown_severity'));
    }
    
    /**
     * Test IP address extraction
     */
    public function test_ip_address_extraction() {
        $reflection = new ReflectionClass($this->ajax_handlers);
        $get_ip_method = $reflection->getMethod('get_client_ip');
        $get_ip_method->setAccessible(true);
        
        // Test direct REMOTE_ADDR
        $_SERVER['REMOTE_ADDR'] = '192.168.1.100';
        $ip = $get_ip_method->invoke($this->ajax_handlers);
        $this->assertEquals('192.168.1.100', $ip);
        
        // Test X-Forwarded-For header
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '203.0.113.1, 192.168.1.100';
        $ip = $get_ip_method->invoke($this->ajax_handlers);
        $this->assertEquals('203.0.113.1', $ip);
        
        // Test Client-IP header
        unset($_SERVER['HTTP_X_FORWARDED_FOR']);
        $_SERVER['HTTP_CLIENT_IP'] = '203.0.113.2';
        $ip = $get_ip_method->invoke($this->ajax_handlers);
        $this->assertEquals('203.0.113.2', $ip);
    }
    
    /**
     * Test error logging with context
     */
    public function test_error_logging_with_context() {
        $reflection = new ReflectionClass($this->ajax_handlers);
        $log_method = $reflection->getMethod('log_error');
        $log_method->setAccessible(true);
        
        $exception = new Exception('Test error for logging');
        $context = [
            'action' => 'test_action',
            'user_input' => 'test_data'
        ];
        
        // Capture error log output
        $error_log_file = tempnam(sys_get_temp_dir(), 'las_test_error_log');
        ini_set('log_errors', 1);
        ini_set('error_log', $error_log_file);
        
        // Log error
        $log_method->invoke($this->ajax_handlers, 'test_error_type', $exception, $context);
        
        // Verify log entry
        $log_content = file_get_contents($error_log_file);
        $this->assertStringContainsString('[LAS AJAX Error]', $log_content);
        $this->assertStringContainsString('test_error_type', $log_content);
        $this->assertStringContainsString('Test error for logging', $log_content);
        
        // Clean up
        unlink($error_log_file);
    }
    
    /**
     * Test performance metrics integration
     */
    public function test_performance_metrics_integration() {
        // Test that error handling doesn't interfere with performance tracking
        $start_memory = memory_get_usage(true);
        
        $error_data = [
            'id' => 'perf_test_error',
            'classification' => ['code' => 'TEST_ERROR', 'severity' => 'info'],
            'user_context' => ['user_id' => $this->test_user_id]
        ];
        
        $reflection = new ReflectionClass($this->ajax_handlers);
        $log_client_error_method = $reflection->getMethod('log_client_error');
        $log_client_error_method->setAccessible(true);
        
        $log_client_error_method->invoke($this->ajax_handlers, $error_data);
        
        $end_memory = memory_get_usage(true);
        
        // Verify memory usage is reasonable (less than 1MB increase)
        $memory_increase = $end_memory - $start_memory;
        $this->assertLessThan(1024 * 1024, $memory_increase);
    }
    
    /**
     * Test error handling under high load simulation
     */
    public function test_error_handling_high_load() {
        $errors_processed = 0;
        $start_time = microtime(true);
        
        // Simulate processing 100 errors quickly
        for ($i = 0; $i < 100; $i++) {
            $error_data = [
                'id' => "load_test_error_$i",
                'classification' => [
                    'code' => 'LOAD_TEST_ERROR',
                    'severity' => 'info',
                    'category' => 'test'
                ],
                'original_error' => [
                    'message' => "Load test error $i"
                ],
                'user_context' => [
                    'user_id' => $this->test_user_id,
                    'ip_address' => '127.0.0.1'
                ]
            ];
            
            $reflection = new ReflectionClass($this->ajax_handlers);
            $log_client_error_method = $reflection->getMethod('log_client_error');
            $log_client_error_method->setAccessible(true);
            
            $log_client_error_method->invoke($this->ajax_handlers, $error_data);
            $errors_processed++;
        }
        
        $end_time = microtime(true);
        $processing_time = $end_time - $start_time;
        
        // Verify all errors were processed
        $this->assertEquals(100, $errors_processed);
        
        // Verify processing time is reasonable (less than 5 seconds)
        $this->assertLessThan(5.0, $processing_time);
        
        // Verify average processing time per error is reasonable (less than 50ms)
        $avg_time_per_error = ($processing_time / $errors_processed) * 1000;
        $this->assertLessThan(50, $avg_time_per_error);
    }
}