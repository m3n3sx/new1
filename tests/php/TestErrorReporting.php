<?php
/**
 * Test Suite for LAS Error Reporting System
 * 
 * Tests the PHP backend error reporting functionality including
 * AJAX handlers, database operations, and error statistics.
 *
 * @package LiveAdminStyler
 * @version 1.0.0
 */

class TestErrorReporting extends WP_UnitTestCase {
    
    private $ajax_handlers;
    private $user_id;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create test user with admin capabilities
        $this->user_id = $this->factory->user->create([
            'role' => 'administrator'
        ]);
        wp_set_current_user($this->user_id);
        
        // Initialize AJAX handlers
        $this->ajax_handlers = new LAS_Ajax_Handlers();
        
        // Set up $_POST superglobal for AJAX tests
        $_POST = [];
        $_REQUEST = [];
    }
    
    public function tearDown(): void {
        // Clean up database
        global $wpdb;
        $table_name = $wpdb->prefix . 'las_error_reports';
        $wpdb->query("DROP TABLE IF EXISTS $table_name");
        
        // Clean up options
        delete_option('las_error_statistics');
        
        // Reset superglobals
        $_POST = [];
        $_REQUEST = [];
        
        parent::tearDown();
    }
    
    /**
     * Test error reporting AJAX handler with valid data
     */
    public function test_handle_error_reporting_success() {
        // Set up valid POST data
        $_POST = [
            '_ajax_nonce' => wp_create_nonce('las_ajax_action'),
            'errors' => [
                [
                    'id' => 'err_123_abc',
                    'type' => 'javascript_error',
                    'message' => 'Test error message',
                    'timestamp' => time() * 1000,
                    'url' => 'https://example.com/wp-admin/',
                    'userAgent' => 'Mozilla/5.0 Test Browser',
                    'stack' => 'Error stack trace',
                    'filename' => 'test.js',
                    'lineno' => 10,
                    'colno' => 5,
                    'classification' => [
                        'type' => 'component',
                        'severity' => 'medium',
                        'recoverable' => true,
                        'strategy' => 'component_recovery'
                    ],
                    'context' => [
                        'component' => 'tabs',
                        'viewport' => [
                            'width' => 1920,
                            'height' => 1080
                        ],
                        'memory' => [
                            'used' => 1000000,
                            'total' => 2000000
                        ],
                        'user' => [
                            'id' => $this->user_id
                        ]
                    ]
                ]
            ],
            'session_id' => 'sess_test_123'
        ];
        
        // Capture output
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_reporting();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        // Verify response
        $this->assertTrue($response['success']);
        $this->assertEquals(1, $response['data']['processed']);
        $this->assertEquals(0, $response['data']['failed']);
        
        // Verify database storage
        global $wpdb;
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        $stored_error = $wpdb->get_row(
            "SELECT * FROM $table_name WHERE error_id = 'err_123_abc'"
        );
        
        $this->assertNotNull($stored_error);
        $this->assertEquals('javascript_error', $stored_error->error_type);
        $this->assertEquals('Test error message', $stored_error->message);
        $this->assertEquals($this->user_id, $stored_error->user_id);
        
        // Verify error statistics
        $stats = get_option('las_error_statistics');
        $this->assertEquals(1, $stats['total_errors']);
        $this->assertEquals(1, $stats['error_types']['javascript_error']);
    }
    
    /**
     * Test error reporting with invalid nonce
     */
    public function test_handle_error_reporting_invalid_nonce() {
        $_POST = [
            '_ajax_nonce' => 'invalid_nonce',
            'errors' => [
                [
                    'id' => 'err_123',
                    'message' => 'Test error',
                    'timestamp' => time() * 1000
                ]
            ]
        ];
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_reporting();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('SECURITY_ERROR', $response['data']['code']);
    }
    
    /**
     * Test error reporting with insufficient permissions
     */
    public function test_handle_error_reporting_insufficient_permissions() {
        // Create user without admin capabilities
        $user_id = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($user_id);
        
        $_POST = [
            '_ajax_nonce' => wp_create_nonce('las_ajax_action'),
            'errors' => [
                [
                    'id' => 'err_123',
                    'message' => 'Test error',
                    'timestamp' => time() * 1000
                ]
            ]
        ];
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_reporting();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('SECURITY_ERROR', $response['data']['code']);
    }
    
    /**
     * Test error reporting with missing error data
     */
    public function test_handle_error_reporting_missing_data() {
        $_POST = [
            '_ajax_nonce' => wp_create_nonce('las_ajax_action')
            // Missing 'errors' key
        ];
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_reporting();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('VALIDATION_ERROR', $response['data']['code']);
    }
    
    /**
     * Test error reporting with too many errors
     */
    public function test_handle_error_reporting_too_many_errors() {
        $errors = [];
        for ($i = 0; $i < 60; $i++) { // Exceeds limit of 50
            $errors[] = [
                'id' => "err_$i",
                'message' => "Error $i",
                'timestamp' => time() * 1000
            ];
        }
        
        $_POST = [
            '_ajax_nonce' => wp_create_nonce('las_ajax_action'),
            'errors' => $errors
        ];
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_reporting();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('VALIDATION_ERROR', $response['data']['code']);
    }
    
    /**
     * Test error reporting with invalid error data
     */
    public function test_handle_error_reporting_invalid_error_data() {
        $_POST = [
            '_ajax_nonce' => wp_create_nonce('las_ajax_action'),
            'errors' => [
                [
                    // Missing required fields (id, message, timestamp)
                    'type' => 'test_error'
                ]
            ]
        ];
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_reporting();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('VALIDATION_ERROR', $response['data']['code']);
    }
    
    /**
     * Test error data validation
     */
    public function test_validate_error_report_data() {
        $valid_data = [
            'errors' => [
                [
                    'id' => 'err_123',
                    'type' => 'javascript_error',
                    'message' => 'Test error message',
                    'timestamp' => time() * 1000,
                    'url' => 'https://example.com',
                    'userAgent' => 'Test Browser',
                    'stack' => 'Error stack',
                    'filename' => 'test.js',
                    'lineno' => 10,
                    'colno' => 5,
                    'classification' => [
                        'type' => 'component',
                        'severity' => 'medium',
                        'recoverable' => true,
                        'strategy' => 'component_recovery'
                    ],
                    'context' => [
                        'component' => 'tabs',
                        'viewport' => ['width' => 1920, 'height' => 1080],
                        'memory' => ['used' => 1000000, 'total' => 2000000],
                        'user' => ['id' => 123]
                    ]
                ]
            ]
        ];
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->ajax_handlers);
        $method = $reflection->getMethod('validate_error_report_data');
        $method->setAccessible(true);
        
        $result = $method->invoke($this->ajax_handlers, $valid_data);
        
        $this->assertIsArray($result);
        $this->assertCount(1, $result);
        
        $validated_error = $result[0];
        $this->assertEquals('err_123', $validated_error['id']);
        $this->assertEquals('javascript_error', $validated_error['type']);
        $this->assertEquals('Test error message', $validated_error['message']);
    }
    
    /**
     * Test error statistics retrieval
     */
    public function test_get_error_statistics() {
        // Set up test statistics
        update_option('las_error_statistics', [
            'total_errors' => 10,
            'error_types' => [
                'javascript_error' => 5,
                'network_error' => 3,
                'security_error' => 2
            ],
            'last_error' => '2023-01-01 12:00:00',
            'first_error' => '2023-01-01 10:00:00'
        ]);
        
        $_POST = [
            '_ajax_nonce' => wp_create_nonce('las_ajax_action')
        ];
        
        ob_start();
        
        try {
            $this->ajax_handlers->get_error_statistics();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertEquals(10, $response['data']['total_errors']);
        $this->assertEquals(5, $response['data']['error_types']['javascript_error']);
    }
    
    /**
     * Test nonce refresh handler
     */
    public function test_handle_nonce_refresh() {
        ob_start();
        
        try {
            $this->ajax_handlers->handle_nonce_refresh();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertNotEmpty($response['data']['nonce']);
        $this->assertEquals('Nonce refreshed successfully', $response['data']['message']);
        
        // Verify nonce is valid
        $this->assertTrue(wp_verify_nonce($response['data']['nonce'], 'las_ajax_action'));
    }
    
    /**
     * Test nonce refresh with insufficient permissions
     */
    public function test_handle_nonce_refresh_insufficient_permissions() {
        // Create user without admin capabilities
        $user_id = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($user_id);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_nonce_refresh();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('PERMISSION_DENIED', $response['data']['code']);
    }
    
    /**
     * Test error reports table creation
     */
    public function test_ensure_error_reports_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        // Drop table if exists
        $wpdb->query("DROP TABLE IF EXISTS $table_name");
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->ajax_handlers);
        $method = $reflection->getMethod('ensure_error_reports_table');
        $method->setAccessible(true);
        
        $method->invoke($this->ajax_handlers);
        
        // Check if table was created
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
        $this->assertTrue($table_exists);
        
        // Check table structure
        $columns = $wpdb->get_results("DESCRIBE $table_name");
        $column_names = array_column($columns, 'Field');
        
        $expected_columns = [
            'id', 'error_id', 'error_type', 'message', 'stack_trace',
            'filename', 'line_number', 'column_number', 'url', 'user_agent',
            'user_id', 'session_id', 'classification', 'context_data',
            'timestamp', 'created_at'
        ];
        
        foreach ($expected_columns as $column) {
            $this->assertContains($column, $column_names);
        }
    }
    
    /**
     * Test error storage
     */
    public function test_store_error_report() {
        $error_data = [
            'id' => 'err_test_123',
            'type' => 'javascript_error',
            'message' => 'Test error message',
            'stack' => 'Error stack trace',
            'filename' => 'test.js',
            'lineno' => 10,
            'colno' => 5,
            'url' => 'https://example.com',
            'user_agent' => 'Test Browser',
            'timestamp' => time() * 1000,
            'classification' => [
                'type' => 'component',
                'severity' => 'medium'
            ],
            'context' => [
                'component' => 'tabs',
                'viewport_width' => 1920
            ]
        ];
        
        $_POST['session_id'] = 'sess_test_123';
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->ajax_handlers);
        $method = $reflection->getMethod('store_error_report');
        $method->setAccessible(true);
        
        $method->invoke($this->ajax_handlers, $error_data);
        
        // Verify storage
        global $wpdb;
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        $stored_error = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM $table_name WHERE error_id = %s", 'err_test_123')
        );
        
        $this->assertNotNull($stored_error);
        $this->assertEquals('javascript_error', $stored_error->error_type);
        $this->assertEquals('Test error message', $stored_error->message);
        $this->assertEquals('test.js', $stored_error->filename);
        $this->assertEquals(10, $stored_error->line_number);
        $this->assertEquals(5, $stored_error->column_number);
        $this->assertEquals($this->user_id, $stored_error->user_id);
        $this->assertEquals('sess_test_123', $stored_error->session_id);
        
        // Verify JSON fields
        $classification = json_decode($stored_error->classification, true);
        $this->assertEquals('component', $classification['type']);
        
        $context = json_decode($stored_error->context_data, true);
        $this->assertEquals('tabs', $context['component']);
    }
    
    /**
     * Test error statistics update
     */
    public function test_update_error_statistics() {
        $error_data = [
            'type' => 'javascript_error'
        ];
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->ajax_handlers);
        $method = $reflection->getMethod('update_error_statistics');
        $method->setAccessible(true);
        
        // First update
        $method->invoke($this->ajax_handlers, $error_data);
        
        $stats = get_option('las_error_statistics');
        $this->assertEquals(1, $stats['total_errors']);
        $this->assertEquals(1, $stats['error_types']['javascript_error']);
        $this->assertNotNull($stats['first_error']);
        $this->assertNotNull($stats['last_error']);
        
        // Second update
        $method->invoke($this->ajax_handlers, $error_data);
        
        $stats = get_option('las_error_statistics');
        $this->assertEquals(2, $stats['total_errors']);
        $this->assertEquals(2, $stats['error_types']['javascript_error']);
        
        // Different error type
        $error_data['type'] = 'network_error';
        $method->invoke($this->ajax_handlers, $error_data);
        
        $stats = get_option('las_error_statistics');
        $this->assertEquals(3, $stats['total_errors']);
        $this->assertEquals(2, $stats['error_types']['javascript_error']);
        $this->assertEquals(1, $stats['error_types']['network_error']);
    }
    
    /**
     * Test batch error processing
     */
    public function test_batch_error_processing() {
        $errors = [];
        for ($i = 0; $i < 5; $i++) {
            $errors[] = [
                'id' => "err_batch_$i",
                'type' => 'batch_error',
                'message' => "Batch error $i",
                'timestamp' => time() * 1000
            ];
        }
        
        $_POST = [
            '_ajax_nonce' => wp_create_nonce('las_ajax_action'),
            'errors' => $errors,
            'session_id' => 'sess_batch_test'
        ];
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_error_reporting();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertEquals(5, $response['data']['processed']);
        $this->assertEquals(0, $response['data']['failed']);
        
        // Verify all errors were stored
        global $wpdb;
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        $count = $wpdb->get_var(
            "SELECT COUNT(*) FROM $table_name WHERE error_type = 'batch_error'"
        );
        
        $this->assertEquals(5, $count);
    }
}