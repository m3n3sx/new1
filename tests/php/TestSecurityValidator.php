<?php
/**
 * PHPUnit tests for LAS_Security_Validator class
 * 
 * Tests security validation, sanitization, and XSS prevention
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestSecurityValidator extends WP_UnitTestCase {
    
    /**
     * Security validator instance
     * @var LAS_Security_Validator
     */
    private $validator;
    
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
        
        $this->validator = new LAS_Security_Validator();
        
        // Create admin user for testing
        $this->admin_user_id = $this->factory->user->create([
            'role' => 'administrator'
        ]);
        
        wp_set_current_user($this->admin_user_id);
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        parent::tearDown();
        wp_delete_user($this->admin_user_id);
    }
    
    /**
     * Test nonce verification
     */
    public function test_nonce_verification() {
        $action = 'test_action';
        $valid_nonce = wp_create_nonce($action);
        $invalid_nonce = 'invalid_nonce';
        
        // Test valid nonce
        $this->assertTrue($this->validator->verify_nonce($valid_nonce, $action));
        
        // Test invalid nonce
        $this->assertFalse($this->validator->verify_nonce($invalid_nonce, $action));
        
        // Test empty nonce
        $this->assertFalse($this->validator->verify_nonce('', $action));
        
        // Test empty action
        $this->assertFalse($this->validator->verify_nonce($valid_nonce, ''));
    }
    
    /**
     * Test capability checking
     */
    public function test_capability_checking() {
        // Test admin user
        $this->assertTrue($this->validator->check_capability('manage_options'));
        $this->assertTrue($this->validator->check_capability('edit_posts'));
        
        // Test subscriber user
        $subscriber_id = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_id);
        
        $this->assertFalse($this->validator->check_capability('manage_options'));
        $this->assertTrue($this->validator->check_capability('read'));
        
        wp_delete_user($subscriber_id);
        wp_set_current_user($this->admin_user_id);
    }
    
    /**
     * Test color sanitization
     */
    public function test_color_sanitization() {
        // Valid hex colors
        $this->assertEquals('#ff0000', $this->validator->sanitize_color('#FF0000'));
        $this->assertEquals('#fff', $this->validator->sanitize_color('#FFF'));
        $this->assertEquals('#123456', $this->validator->sanitize_color('#123456'));
        
        // Valid RGB colors
        $this->assertEquals('rgb(255, 0, 0)', $this->validator->sanitize_color('rgb(255, 0, 0)'));
        $this->assertEquals('rgb(255, 255, 255)', $this->validator->sanitize_color('RGB(255, 255, 255)'));
        $this->assertEquals('rgb(0, 0, 0)', $this->validator->sanitize_color('rgb(300, -10, 0)')); // Clamped values
        
        // Valid RGBA colors
        $this->assertEquals('rgba(255, 0, 0, 0.5)', $this->validator->sanitize_color('rgba(255, 0, 0, 0.5)'));
        $this->assertEquals('rgba(255, 0, 0, 1)', $this->validator->sanitize_color('rgba(255, 0, 0, 1.5)')); // Clamped alpha
        
        // Valid HSL colors
        $this->assertEquals('hsl(360, 100%, 50%)', $this->validator->sanitize_color('hsl(360, 100%, 50%)'));
        $this->assertEquals('hsl(0, 0%, 0%)', $this->validator->sanitize_color('hsl(400, 150%, -10%)')); // Clamped values
        
        // Valid HSLA colors
        $this->assertEquals('hsla(360, 100%, 50%, 0.5)', $this->validator->sanitize_color('hsla(360, 100%, 50%, 0.5)'));
        
        // Valid named colors
        $this->assertEquals('red', $this->validator->sanitize_color('RED'));
        $this->assertEquals('transparent', $this->validator->sanitize_color('transparent'));
        $this->assertEquals('inherit', $this->validator->sanitize_color('inherit'));
        
        // Invalid colors
        $this->assertEquals('', $this->validator->sanitize_color('#gggggg'));
        $this->assertEquals('', $this->validator->sanitize_color('invalid'));
        $this->assertEquals('', $this->validator->sanitize_color('javascript:alert(1)'));
        $this->assertEquals('', $this->validator->sanitize_color('<script>alert(1)</script>'));
    }
    
    /**
     * Test CSS sanitization
     */
    public function test_css_sanitization() {
        // Valid CSS
        $valid_css = 'color: red; background-color: #ffffff; font-size: 14px;';
        $result = $this->validator->sanitize_css($valid_css);
        $this->assertStringContains('color: red', $result);
        $this->assertStringContains('background-color: #ffffff', $result);
        $this->assertStringContains('font-size: 14px', $result);
        
        // Dangerous CSS patterns
        $dangerous_css = [
            'background: url(javascript:alert(1));',
            'color: expression(alert(1));',
            '@import url(malicious.css);',
            'behavior: url(malicious.htc);',
            '-moz-binding: url(malicious.xml);',
            'background: url(vbscript:alert(1));',
            'background: url(data:text/html,<script>alert(1)</script>);'
        ];
        
        foreach ($dangerous_css as $css) {
            $result = $this->validator->sanitize_css($css);
            $this->assertEmpty($result, "Dangerous CSS not properly sanitized: $css");
        }
        
        // CSS with comments
        $css_with_comments = 'color: red; /* comment */ background: blue;';
        $result = $this->validator->sanitize_css($css_with_comments);
        $this->assertStringNotContains('/*', $result);
        $this->assertStringNotContains('*/', $result);
        
        // CSS with HTML tags
        $css_with_html = 'color: red; <script>alert(1)</script> background: blue;';
        $result = $this->validator->sanitize_css($css_with_html);
        $this->assertStringNotContains('<script>', $result);
        $this->assertStringNotContains('</script>', $result);
    }
    
    /**
     * Test URL sanitization
     */
    public function test_url_sanitization() {
        // Valid URLs
        $this->assertEquals('https://example.com', $this->validator->sanitize_url('https://example.com'));
        $this->assertEquals('http://example.com/path', $this->validator->sanitize_url('http://example.com/path'));
        
        // Valid data URLs for images
        $data_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        $this->assertEquals($data_url, $this->validator->sanitize_url($data_url));
        
        // Invalid URLs
        $this->assertEquals('', $this->validator->sanitize_url('javascript:alert(1)'));
        $this->assertEquals('', $this->validator->sanitize_url('vbscript:alert(1)'));
        $this->assertEquals('', $this->validator->sanitize_url('ftp://example.com'));
        $this->assertEquals('', $this->validator->sanitize_url('file:///etc/passwd'));
    }
    
    /**
     * Test number sanitization
     */
    public function test_number_sanitization() {
        $this->assertEquals(123, $this->validator->sanitize_number('123'));
        $this->assertEquals(123, $this->validator->sanitize_number(123));
        $this->assertEquals(123, $this->validator->sanitize_number('123.456'));
        $this->assertEquals(-123, $this->validator->sanitize_number('-123'));
        $this->assertEquals(0, $this->validator->sanitize_number('abc'));
        $this->assertEquals(0, $this->validator->sanitize_number(''));
        $this->assertEquals(0, $this->validator->sanitize_number(null));
    }
    
    /**
     * Test boolean sanitization
     */
    public function test_boolean_sanitization() {
        $this->assertTrue($this->validator->sanitize_boolean(true));
        $this->assertTrue($this->validator->sanitize_boolean('true'));
        $this->assertTrue($this->validator->sanitize_boolean('1'));
        $this->assertTrue($this->validator->sanitize_boolean(1));
        $this->assertTrue($this->validator->sanitize_boolean('yes'));
        $this->assertTrue($this->validator->sanitize_boolean('on'));
        
        $this->assertFalse($this->validator->sanitize_boolean(false));
        $this->assertFalse($this->validator->sanitize_boolean('false'));
        $this->assertFalse($this->validator->sanitize_boolean('0'));
        $this->assertFalse($this->validator->sanitize_boolean(0));
        $this->assertFalse($this->validator->sanitize_boolean('no'));
        $this->assertFalse($this->validator->sanitize_boolean('off'));
        $this->assertFalse($this->validator->sanitize_boolean(''));
    }
    
    /**
     * Test settings sanitization
     */
    public function test_settings_sanitization() {
        $raw_settings = [
            'menu_background_color' => '#FF0000',
            'menu_text_color' => 'rgb(255, 255, 255)',
            'custom_css' => 'color: red; background: blue;',
            'logo_url' => 'https://example.com/logo.png',
            'font_size' => '14',
            'enable_feature' => 'true',
            'invalid_key!' => 'should be removed',
            'admin_menu_bg_type' => 'gradient'
        ];
        
        $sanitized = $this->validator->sanitize_settings($raw_settings);
        
        $this->assertEquals('#ff0000', $sanitized['menu_background_color']);
        $this->assertEquals('rgb(255, 255, 255)', $sanitized['menu_text_color']);
        $this->assertStringContains('color: red', $sanitized['custom_css']);
        $this->assertEquals('https://example.com/logo.png', $sanitized['logo_url']);
        $this->assertEquals(14, $sanitized['font_size']);
        $this->assertTrue($sanitized['enable_feature']);
        $this->assertArrayNotHasKey('invalid_key!', $sanitized);
        $this->assertEquals('gradient', $sanitized['admin_menu_bg_type']);
    }
    
    /**
     * Test XSS prevention
     */
    public function test_xss_prevention() {
        $xss_attempts = [
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert("xss")>',
            'javascript:alert("xss")',
            'vbscript:alert("xss")',
            '<iframe src="javascript:alert(1)"></iframe>',
            '<svg onload=alert(1)>',
            '<div onclick="alert(1)">click me</div>'
        ];
        
        foreach ($xss_attempts as $xss) {
            // Test text sanitization
            $sanitized_text = $this->validator->sanitize_text($xss);
            $this->assertStringNotContains('<script>', $sanitized_text);
            $this->assertStringNotContains('javascript:', $sanitized_text);
            $this->assertStringNotContains('onerror=', $sanitized_text);
            $this->assertStringNotContains('onload=', $sanitized_text);
            $this->assertStringNotContains('onclick=', $sanitized_text);
            
            // Test CSS sanitization
            $sanitized_css = $this->validator->sanitize_css($xss);
            $this->assertStringNotContains('<script>', $sanitized_css);
            $this->assertStringNotContains('javascript:', $sanitized_css);
            
            // Test URL sanitization
            $sanitized_url = $this->validator->sanitize_url($xss);
            if (strpos($xss, 'javascript:') !== false || strpos($xss, 'vbscript:') !== false) {
                $this->assertEquals('', $sanitized_url);
            }
        }
    }
    
    /**
     * Test SQL injection detection
     */
    public function test_sql_injection_detection() {
        $sql_injection_attempts = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "1 UNION SELECT * FROM users",
            "admin'--",
            "1; INSERT INTO users VALUES ('hacker', 'password');",
            "1' AND 1=1--",
            "EXEC xp_cmdshell('dir')",
            "<script>alert('xss')</script>"
        ];
        
        foreach ($sql_injection_attempts as $attempt) {
            $this->assertTrue(
                $this->validator->has_sql_injection($attempt),
                "SQL injection not detected: $attempt"
            );
        }
        
        // Test safe inputs
        $safe_inputs = [
            'normal text',
            'user@example.com',
            '#ff0000',
            'rgb(255, 0, 0)',
            'https://example.com'
        ];
        
        foreach ($safe_inputs as $safe) {
            $this->assertFalse(
                $this->validator->has_sql_injection($safe),
                "False positive for safe input: $safe"
            );
        }
    }
    
    /**
     * Test AJAX input sanitization
     */
    public function test_ajax_input_sanitization() {
        // Test JSON input
        $json_input = '{"key": "value", "number": 123}';
        $result = $this->validator->sanitize_ajax_input($json_input, 'json');
        $this->assertIsArray($result);
        $this->assertEquals('value', $result['key']);
        $this->assertEquals(123, $result['number']);
        
        // Test invalid JSON
        $invalid_json = '{"invalid": json}';
        $result = $this->validator->sanitize_ajax_input($invalid_json, 'json', []);
        $this->assertEquals([], $result);
        
        // Test integer input
        $this->assertEquals(123, $this->validator->sanitize_ajax_input('123', 'int'));
        $this->assertEquals(0, $this->validator->sanitize_ajax_input('abc', 'int'));
        
        // Test email input
        $this->assertEquals('user@example.com', $this->validator->sanitize_ajax_input('user@example.com', 'email'));
        $this->assertEquals('', $this->validator->sanitize_ajax_input('invalid-email', 'email'));
        
        // Test color input
        $this->assertEquals('#ff0000', $this->validator->sanitize_ajax_input('#FF0000', 'color'));
        $this->assertEquals('', $this->validator->sanitize_ajax_input('invalid-color', 'color'));
    }
    
    /**
     * Test rate limiting
     */
    public function test_rate_limiting() {
        $action = 'test_action';
        $limit = 5;
        
        // Test within limit
        for ($i = 0; $i < $limit; $i++) {
            $this->assertTrue(
                $this->validator->check_rate_limit($action, $limit),
                "Request $i should be within limit"
            );
        }
        
        // Test exceeding limit
        $this->assertFalse(
            $this->validator->check_rate_limit($action, $limit),
            "Request should exceed limit"
        );
    }
    
    /**
     * Test select value sanitization
     */
    public function test_select_sanitization() {
        // Test valid select values
        $this->assertEquals('solid', $this->validator->sanitize_select('admin_menu_bg_type', 'solid'));
        $this->assertEquals('gradient', $this->validator->sanitize_select('admin_menu_bg_type', 'gradient'));
        
        // Test invalid select values (should return first allowed value)
        $result = $this->validator->sanitize_select('admin_menu_bg_type', 'invalid');
        $this->assertEquals('solid', $result);
        
        // Test unknown select key
        $result = $this->validator->sanitize_select('unknown_key', 'value');
        $this->assertEquals('', $result);
    }
    
    /**
     * Test comprehensive security validation
     */
    public function test_comprehensive_security_validation() {
        $malicious_settings = [
            'menu_background_color' => '<script>alert("xss")</script>',
            'custom_css' => 'background: url(javascript:alert(1)); color: red;',
            'logo_url' => 'javascript:alert("xss")',
            'description' => '<img src=x onerror=alert("xss")>',
            'font_size' => "'; DROP TABLE users; --",
            'enable_feature' => '<script>alert(1)</script>',
            'admin_menu_bg_type' => 'malicious_value'
        ];
        
        $sanitized = $this->validator->sanitize_settings($malicious_settings);
        
        // Verify all malicious content is removed or sanitized
        $this->assertEquals('', $sanitized['menu_background_color']); // Invalid color
        $this->assertStringNotContains('javascript:', $sanitized['custom_css']);
        $this->assertEquals('', $sanitized['logo_url']); // Invalid URL
        $this->assertStringNotContains('<img', $sanitized['description']);
        $this->assertEquals(0, $sanitized['font_size']); // Invalid number
        $this->assertFalse($sanitized['enable_feature']); // Invalid boolean
        $this->assertEquals('solid', $sanitized['admin_menu_bg_type']); // Default value
    }
    
    /**
     * Test enhanced nonce verification with refresh capability
     */
    public function test_enhanced_nonce_verification() {
        $action = 'test_action';
        $valid_nonce = wp_create_nonce($action);
        
        // Test valid fresh nonce
        $result = $this->validator->verify_nonce($valid_nonce, $action);
        $this->assertTrue($result['valid']);
        $this->assertTrue($result['fresh']);
        $this->assertEquals($valid_nonce, $result['nonce']);
        
        // Test invalid nonce
        $result = $this->validator->verify_nonce('invalid_nonce', $action);
        $this->assertFalse($result['valid']);
        $this->assertEquals('invalid_nonce', $result['error']);
        $this->assertStringContains('invalid or expired', $result['message']);
        
        // Test missing nonce
        $result = $this->validator->verify_nonce('', $action);
        $this->assertFalse($result['valid']);
        $this->assertEquals('missing_nonce_or_action', $result['error']);
        
        // Test nonce refresh
        $new_nonce = $this->validator->refresh_nonce($action);
        $this->assertNotEmpty($new_nonce);
        $this->assertNotEquals($valid_nonce, $new_nonce);
        
        // Test get fresh nonce
        $fresh_nonce = $this->validator->get_fresh_nonce($action);
        $this->assertNotEmpty($fresh_nonce);
    }
    
    /**
     * Test granular capability checking
     */
    public function test_granular_capability_checking() {
        // Test valid action with admin user
        $result = $this->validator->check_capabilities('save_settings');
        $this->assertTrue($result['valid']);
        $this->assertEquals('manage_options', $result['capability']);
        $this->assertEquals($this->admin_user_id, $result['user_id']);
        
        // Test action with different capability requirement
        $result = $this->validator->check_capabilities('load_settings');
        $this->assertTrue($result['valid']);
        $this->assertEquals('edit_theme_options', $result['capability']);
        
        // Test with subscriber user
        $subscriber_id = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_id);
        
        $result = $this->validator->check_capabilities('save_settings');
        $this->assertFalse($result['valid']);
        $this->assertEquals('insufficient_permissions', $result['error']);
        $this->assertEquals('manage_options', $result['required_capability']);
        
        // Test not logged in
        wp_set_current_user(0);
        $result = $this->validator->check_capabilities('save_settings');
        $this->assertFalse($result['valid']);
        $this->assertEquals('not_logged_in', $result['error']);
        
        // Test unknown action
        wp_set_current_user($this->admin_user_id);
        $result = $this->validator->check_capabilities('unknown_action');
        $this->assertTrue($result['valid']); // Should use default capability
        
        // Clean up
        wp_delete_user($subscriber_id);
    }
    
    /**
     * Test enhanced rate limiting system
     */
    public function test_enhanced_rate_limiting() {
        $action = 'save_settings';
        
        // Test within limits
        $result = $this->validator->check_rate_limit($action);
        $this->assertTrue($result['allowed']);
        $this->assertEquals($action, $result['action']);
        $this->assertEquals($this->admin_user_id, $result['user_id']);
        $this->assertArrayHasKey('user_requests', $result);
        $this->assertArrayHasKey('ip_requests', $result);
        $this->assertArrayHasKey('reset_time', $result);
        
        // Test custom rate limit
        $this->validator->set_rate_limit('test_action', 2, 60);
        
        // First request should pass
        $result = $this->validator->check_rate_limit('test_action');
        $this->assertTrue($result['allowed']);
        
        // Second request should pass
        $result = $this->validator->check_rate_limit('test_action');
        $this->assertTrue($result['allowed']);
        
        // Third request should fail
        $result = $this->validator->check_rate_limit('test_action');
        $this->assertFalse($result['allowed']);
        $this->assertEquals('rate_limit_exceeded', $result['error']);
        $this->assertStringContains('Rate limit exceeded', $result['message']);
        $this->assertArrayHasKey('retry_after', $result);
    }
    
    /**
     * Test comprehensive AJAX request validation
     */
    public function test_ajax_request_validation() {
        $action = 'save_settings';
        $nonce = wp_create_nonce($action);
        
        // Test valid request
        $request = [
            'nonce' => $nonce,
            'menu_background_color' => '#ff0000',
            'font_size' => '14',
            'enable_feature' => 'true'
        ];
        
        $result = $this->validator->validate_ajax_request($request, $action);
        $this->assertTrue($result['valid']);
        $this->assertArrayHasKey('data', $result);
        $this->assertEquals('#ff0000', $result['data']['menu_background_color']);
        $this->assertEquals(14, $result['data']['font_size']);
        $this->assertTrue($result['data']['enable_feature']);
        
        // Test invalid request format
        $result = $this->validator->validate_ajax_request('not_an_array', $action);
        $this->assertFalse($result['valid']);
        $this->assertEquals('invalid_request_format', $result['errors'][0]['code']);
        
        // Test invalid nonce
        $request['nonce'] = 'invalid_nonce';
        $result = $this->validator->validate_ajax_request($request, $action);
        $this->assertFalse($result['valid']);
        $this->assertEquals('invalid_nonce', $result['errors'][0]['code']);
        
        // Test malicious input
        $request['nonce'] = $nonce;
        $request['malicious_field'] = '<script>alert("xss")</script>';
        $request['sql_injection'] = "'; DROP TABLE users; --";
        
        $result = $this->validator->validate_ajax_request($request, $action);
        $this->assertFalse($result['valid']);
        $this->assertEquals('malicious_input_detected', $result['errors'][0]['code']);
    }
    
    /**
     * Test batch operations sanitization
     */
    public function test_batch_operations_sanitization() {
        $operations = [
            [
                'type' => 'save',
                'id' => 'op1',
                'data' => [
                    'menu_background_color' => '#ff0000',
                    'font_size' => '14'
                ]
            ],
            [
                'type' => 'delete',
                'id' => 'op2',
                'data' => []
            ],
            'invalid_operation', // Should be filtered out
            [
                'type' => 'update<script>alert(1)</script>',
                'data' => [
                    'malicious_field' => '<script>alert("xss")</script>'
                ]
            ]
        ];
        
        $sanitized = $this->validator->sanitize_batch_operations($operations);
        
        $this->assertCount(3, $sanitized); // Invalid operation filtered out
        $this->assertEquals('save', $sanitized[0]['type']);
        $this->assertEquals('op1', $sanitized[0]['id']);
        $this->assertEquals('#ff0000', $sanitized[0]['data']['menu_background_color']);
        $this->assertEquals(14, $sanitized[0]['data']['font_size']);
        
        $this->assertEquals('delete', $sanitized[1]['type']);
        $this->assertEquals('op2', $sanitized[1]['id']);
        
        // Malicious content should be sanitized
        $this->assertStringNotContains('<script>', $sanitized[2]['type']);
        $this->assertStringNotContains('<script>', $sanitized[2]['data']['malicious_field']);
    }
    
    /**
     * Test file upload validation
     */
    public function test_file_upload_validation() {
        // Test missing file
        $result = $this->validator->validate_file_upload([]);
        $this->assertFalse($result['valid']);
        $this->assertEquals('no_file_uploaded', $result['errors'][0]['code']);
        
        // Test file too large
        $large_file = [
            'tmp_name' => '/tmp/test_file',
            'size' => 2 * 1024 * 1024, // 2MB
            'name' => 'test.json'
        ];
        
        $result = $this->validator->validate_file_upload($large_file);
        $this->assertFalse($result['valid']);
        $this->assertEquals('file_too_large', $result['errors'][0]['code']);
        
        // Test invalid extension
        $invalid_file = [
            'tmp_name' => '/tmp/test_file',
            'size' => 1024,
            'name' => 'test.exe'
        ];
        
        $result = $this->validator->validate_file_upload($invalid_file);
        $this->assertFalse($result['valid']);
        $this->assertEquals('invalid_file_extension', $result['errors'][0]['code']);
    }
    
    /**
     * Test malicious pattern detection
     */
    public function test_malicious_pattern_detection() {
        $malicious_data = [
            'sql_injection' => "'; DROP TABLE users; --",
            'xss_script' => '<script>alert("xss")</script>',
            'command_injection' => 'system("rm -rf /")',
            'file_inclusion' => '../../../etc/passwd',
            'nested' => [
                'deep_xss' => '<iframe src="javascript:alert(1)"></iframe>'
            ]
        ];
        
        $reflection = new ReflectionClass($this->validator);
        $method = $reflection->getMethod('contains_malicious_patterns');
        $method->setAccessible(true);
        
        $this->assertTrue($method->invoke($this->validator, $malicious_data));
        
        // Test safe data
        $safe_data = [
            'color' => '#ff0000',
            'text' => 'normal text',
            'number' => 123,
            'nested' => [
                'safe_field' => 'safe value'
            ]
        ];
        
        $this->assertFalse($method->invoke($this->validator, $safe_data));
    }
    
    /**
     * Test security summary
     */
    public function test_security_summary() {
        $summary = $this->validator->get_security_summary();
        
        $this->assertArrayHasKey('rate_limit_config', $summary);
        $this->assertArrayHasKey('action_capabilities', $summary);
        $this->assertArrayHasKey('allowed_css_properties_count', $summary);
        $this->assertArrayHasKey('dangerous_patterns_count', $summary);
        $this->assertArrayHasKey('current_user_id', $summary);
        $this->assertArrayHasKey('client_ip', $summary);
        
        $this->assertIsArray($summary['rate_limit_config']);
        $this->assertIsArray($summary['action_capabilities']);
        $this->assertIsInt($summary['allowed_css_properties_count']);
        $this->assertIsInt($summary['dangerous_patterns_count']);
        $this->assertEquals($this->admin_user_id, $summary['current_user_id']);
    }
    
    /**
     * Test action capability management
     */
    public function test_action_capability_management() {
        // Test getting required capability
        $this->assertEquals('manage_options', $this->validator->get_required_capability('save_settings'));
        $this->assertEquals('edit_theme_options', $this->validator->get_required_capability('load_settings'));
        $this->assertEquals('manage_options', $this->validator->get_required_capability('unknown_action'));
        
        // Test setting custom capability
        $this->validator->set_action_capability('custom_action', 'edit_posts');
        $this->assertEquals('edit_posts', $this->validator->get_required_capability('custom_action'));
        
        // Test capability check with custom action
        $result = $this->validator->check_capabilities('custom_action');
        $this->assertTrue($result['valid']);
        $this->assertEquals('edit_posts', $result['capability']);
    }
}