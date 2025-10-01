<?php
/**
 * PHPUnit tests for LAS_Ajax_Handlers class
 * 
 * Tests security, functionality, and error handling of AJAX handlers
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestAjaxHandlers extends WP_UnitTestCase {
    
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
        
        // Set current user
        wp_set_current_user($this->admin_user_id);
        
        // Initialize AJAX handlers
        $this->ajax_handlers = new LAS_Ajax_Handlers();
        
        // Set up AJAX environment
        if (!defined('DOING_AJAX')) {
            define('DOING_AJAX', true);
        }
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        parent::tearDown();
        
        // Clean up any test data
        wp_delete_user($this->admin_user_id);
    }
    
    /**
     * Test AJAX handlers class initialization
     */
    public function test_ajax_handlers_initialization() {
        $this->assertInstanceOf('LAS_Ajax_Handlers', $this->ajax_handlers);
        
        // Verify handlers are registered
        $this->assertTrue(has_action('wp_ajax_las_save_settings'));
        $this->assertTrue(has_action('wp_ajax_las_load_settings'));
        $this->assertTrue(has_action('wp_ajax_las_log_error'));
        $this->assertTrue(has_action('wp_ajax_las_get_preview_css'));
        $this->assertTrue(has_action('wp_ajax_las_reset_settings'));
    }
    
    /**
     * Test save settings with valid nonce and capabilities
     */
    public function test_save_settings_success() {
        // Set up valid nonce
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['settings'] = json_encode([
            'menu_background_color' => '#ff0000',
            'menu_text_color' => '#ffffff'
        ]);
        
        // Capture output
        ob_start();
        
        try {
            $this->ajax_handlers->handle_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertEquals('Settings saved successfully', $response['data']['message']);
    }
    
    /**
     * Test save settings with invalid nonce
     */
    public function test_save_settings_invalid_nonce() {
        $_POST['nonce'] = 'invalid_nonce';
        $_POST['settings'] = json_encode(['test' => 'value']);
        
        $this->expectException('WPAjaxDieStopException');
        $this->ajax_handlers->handle_save_settings();
    }
    
    /**
     * Test save settings without admin capabilities
     */
    public function test_save_settings_insufficient_permissions() {
        // Create subscriber user
        $subscriber_id = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_id);
        
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['settings'] = json_encode(['test' => 'value']);
        
        $this->expectException('WPAjaxDieStopException');
        $this->ajax_handlers->handle_save_settings();
        
        wp_delete_user($subscriber_id);
    }
    
    /**
     * Test save settings with invalid JSON
     */
    public function test_save_settings_invalid_json() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['settings'] = 'invalid json {';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('invalid_json', $response['data']['error_code']);
    }
    
    /**
     * Test save settings with empty settings array
     */
    public function test_save_settings_empty_array() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['settings'] = json_encode([]);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('invalid_settings_format', $response['data']['error_code']);
    }
    
    /**
     * Test load settings functionality
     */
    public function test_load_settings_success() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_load_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('settings', $response['data']);
        $this->assertIsArray($response['data']['settings']);
    }
    
    /**
     * Test error logging functionality
     */
    public function test_log_error_success() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['error'] = 'Test JavaScript error';
        $_POST['stack'] = 'Error stack trace';
        $_POST['url'] = 'https://example.com/admin';
        $_POST['userAgent'] = 'Mozilla/5.0 Test Browser';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_log_error();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertEquals('Error logged successfully', $response['data']['message']);
    }
    
    /**
     * Test preview CSS generation
     */
    public function test_get_preview_css_success() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['preview_settings'] = json_encode([
            'menu_background_color' => '#ff0000',
            'menu_text_color' => '#ffffff'
        ]);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_get_preview_css();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('css', $response['data']);
        $this->assertStringContains('#adminmenu', $response['data']['css']);
        $this->assertStringContains('#ff0000', $response['data']['css']);
    }
    
    /**
     * Test settings reset functionality
     */
    public function test_reset_settings_success() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_reset_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertEquals('Settings reset to defaults successfully', $response['data']['message']);
    }
    
    /**
     * Test CSS generation with various settings
     */
    public function test_css_generation_comprehensive() {
        $settings = [
            'menu_background_color' => '#123456',
            'menu_text_color' => '#abcdef',
            'menu_hover_color' => '#fedcba',
            'adminbar_background' => '#987654',
            'content_background' => '#456789'
        ];
        
        // Use reflection to test private method
        $reflection = new ReflectionClass($this->ajax_handlers);
        $method = $reflection->getMethod('generate_preview_css');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->ajax_handlers, $settings);
        
        // Verify all settings are included in CSS
        $this->assertStringContains('#adminmenu { background-color: #123456', $css);
        $this->assertStringContains('#adminmenu a { color: #abcdef', $css);
        $this->assertStringContains('#adminmenu a:hover { color: #fedcba', $css);
        $this->assertStringContains('#wpadminbar { background: #987654', $css);
        $this->assertStringContains('#wpbody-content { background-color: #456789', $css);
    }
    
    /**
     * Test error handling in save settings
     */
    public function test_save_settings_exception_handling() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['settings'] = json_encode(['test' => 'value']);
        
        // Mock storage to throw exception
        $mock_storage = $this->createMock('LAS_Settings_Storage');
        $mock_storage->method('save_settings')->willThrowException(new Exception('Database error'));
        
        // Use reflection to replace storage
        $reflection = new ReflectionClass($this->ajax_handlers);
        $property = $reflection->getProperty('storage');
        $property->setAccessible(true);
        $property->setValue($this->ajax_handlers, $mock_storage);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_error
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertFalse($response['success']);
        $this->assertEquals('unexpected_error', $response['data']['error_code']);
    }
    
    /**
     * Test performance metrics in save settings
     */
    public function test_save_settings_performance_metrics() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['settings'] = json_encode([
            'menu_background_color' => '#ff0000',
            'menu_text_color' => '#ffffff'
        ]);
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_save_settings();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('execution_time_ms', $response['data']);
        $this->assertArrayHasKey('settings_count', $response['data']);
        $this->assertEquals(2, $response['data']['settings_count']);
        $this->assertIsNumeric($response['data']['execution_time_ms']);
    }
    
    /**
     * Test XSS prevention in error logging
     */
    public function test_error_logging_xss_prevention() {
        $_POST['nonce'] = wp_create_nonce('las_ajax_nonce');
        $_POST['error'] = '<script>alert("xss")</script>';
        $_POST['stack'] = '<img src=x onerror=alert("xss")>';
        $_POST['url'] = 'javascript:alert("xss")';
        $_POST['userAgent'] = '<script>alert("xss")</script>';
        
        ob_start();
        
        try {
            $this->ajax_handlers->handle_log_error();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for wp_send_json_success
        }
        
        $output = ob_get_clean();
        $response = json_decode($output, true);
        
        $this->assertTrue($response['success']);
        
        // Verify no script tags in sanitized data
        $this->assertStringNotContains('<script>', $_POST['error']);
        $this->assertStringNotContains('<img', $_POST['stack']);
        $this->assertStringNotContains('javascript:', $_POST['url']);
    }
}