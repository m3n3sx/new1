<?php
/**
 * Security Manager Tests
 * 
 * Comprehensive test suite for LAS_SecurityManager including input validation,
 * sanitization, XSS prevention, SQL injection prevention, and CSRF protection.
 *
 * @package LiveAdminStyler
 * @subpackage Tests
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Test class for SecurityManager
 */
class TestSecurityManager extends WP_UnitTestCase {
    
    /**
     * SecurityManager instance
     * @var LAS_SecurityManager
     */
    private $security_manager;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        $this->security_manager = new LAS_SecurityManager();
    }
    
    /**
     * Test nonce validation
     */
    public function test_nonce_validation() {
        // Test valid nonce
        $action = 'test_action';
        $nonce = $this->security_manager->createNonce($action);
        $this->assertTrue($this->security_manager->validateNonce($nonce, $action));
        
        // Test invalid nonce
        $this->assertFalse($this->security_manager->validateNonce('invalid_nonce', $action));
        
        // Test empty nonce
        $this->assertFalse($this->security_manager->validateNonce('', $action));
        
        // Test empty action
        $this->assertFalse($this->security_manager->validateNonce($nonce, ''));
    }
    
    /**
     * Test capability checking
     */
    public function test_capability_checking() {
        // Create admin user
        $admin_user = $this->factory->user->create(['role' => 'administrator']);
        wp_set_current_user($admin_user);
        
        $this->assertTrue($this->security_manager->checkCapability('manage_options'));
        $this->assertTrue($this->security_manager->checkCapability('edit_posts'));
        
        // Create subscriber user
        $subscriber_user = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_user);
        
        $this->assertFalse($this->security_manager->checkCapability('manage_options'));
        $this->assertTrue($this->security_manager->checkCapability('read'));
    }
    
    /**
     * Test input sanitization
     */
    public function test_input_sanitization() {
        // Test text sanitization
        $dirty_text = '<script>alert("xss")</script>Hello World';
        $clean_text = $this->security_manager->sanitize($dirty_text, 'text');
        $this->assertEquals('Hello World', $clean_text);
        
        // Test email sanitization
        $dirty_email = 'test@example.com<script>';
        $clean_email = $this->security_manager->sanitize($dirty_email, 'email');
        $this->assertEquals('test@example.com', $clean_email);
        
        // Test URL sanitization
        $dirty_url = 'http://example.com/path?param=value<script>';
        $clean_url = $this->security_manager->sanitize($dirty_url, 'url');
        $this->assertStringStartsWith('http://example.com', $clean_url);
        
        // Test number sanitization
        $this->assertEquals(123.45, $this->security_manager->sanitize('123.45', 'number'));
        $this->assertEquals(0, $this->security_manager->sanitize('not_a_number', 'number'));
        
        // Test boolean sanitization
        $this->assertTrue($this->security_manager->sanitize('1', 'boolean'));
        $this->assertTrue($this->security_manager->sanitize('true', 'boolean'));
        $this->assertFalse($this->security_manager->sanitize('0', 'boolean'));
        $this->assertFalse($this->security_manager->sanitize('false', 'boolean'));
    }
    
    /**
     * Test color validation and sanitization
     */
    public function test_color_validation() {
        // Test valid hex colors
        $this->assertEquals('#ff0000', $this->security_manager->sanitize('#ff0000', 'color'));
        $this->assertEquals('#f00', $this->security_manager->sanitize('#f00', 'color'));
        
        // Test valid RGB colors
        $this->assertEquals('rgb(255, 0, 0)', $this->security_manager->sanitize('rgb(255, 0, 0)', 'color'));
        $this->assertEquals('rgba(255, 0, 0, 0.5)', $this->security_manager->sanitize('rgba(255, 0, 0, 0.5)', 'color'));
        
        // Test valid HSL colors
        $this->assertEquals('hsl(0, 100%, 50%)', $this->security_manager->sanitize('hsl(0, 100%, 50%)', 'color'));
        $this->assertEquals('hsla(0, 100%, 50%, 0.5)', $this->security_manager->sanitize('hsla(0, 100%, 50%, 0.5)', 'color'));
        
        // Test invalid colors (should return default)
        $this->assertEquals('#000000', $this->security_manager->sanitize('invalid_color', 'color'));
        $this->assertEquals('#000000', $this->security_manager->sanitize('rgb(300, 0, 0)', 'color'));
        
        // Test color validation
        $this->assertTrue($this->security_manager->validate('#ff0000', 'color'));
        $this->assertInstanceOf('WP_Error', $this->security_manager->validate('invalid_color', 'color'));
        $this->assertInstanceOf('WP_Error', $this->security_manager->validate('rgb(300, 0, 0)', 'color'));
    }
    
    /**
     * Test CSS sanitization and validation
     */
    public function test_css_sanitization() {
        // Test safe CSS
        $safe_css = 'body { color: red; background: blue; }';
        $this->assertEquals($safe_css, $this->security_manager->sanitize($safe_css, 'css'));
        $this->assertTrue($this->security_manager->validate($safe_css, 'css'));
        
        // Test dangerous CSS patterns
        $dangerous_css = 'body { background: url(javascript:alert("xss")); }';
        $sanitized = $this->security_manager->sanitize($dangerous_css, 'css');
        $this->assertStringNotContainsString('javascript:', $sanitized);
        
        $this->assertInstanceOf('WP_Error', $this->security_manager->validate($dangerous_css, 'css'));
        
        // Test CSS length limit
        $long_css = str_repeat('a', 60000);
        $this->assertInstanceOf('WP_Error', $this->security_manager->validate($long_css, 'css'));
        
        // Test null byte removal
        $css_with_null = "body { color: red;\x00 }";
        $sanitized = $this->security_manager->sanitize($css_with_null, 'css');
        $this->assertStringNotContainsString("\x00", $sanitized);
    }
    
    /**
     * Test XSS prevention
     */
    public function test_xss_prevention() {
        $xss_attempts = [
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            '<img src="x" onerror="alert(\'xss\')">',
            '<div onload="alert(\'xss\')">content</div>',
            'eval("alert(\'xss\')")',
            'expression(alert("xss"))',
            'vbscript:msgbox("xss")',
            '<iframe src="javascript:alert(\'xss\')"></iframe>'
        ];
        
        foreach ($xss_attempts as $xss) {
            $escaped = $this->security_manager->preventXSS($xss, 'html');
            $this->assertStringNotContainsString('<script', $escaped);
            $this->assertStringNotContainsString('javascript:', $escaped);
            $this->assertStringNotContainsString('onerror=', $escaped);
            $this->assertStringNotContainsString('onload=', $escaped);
        }
        
        // Test array XSS prevention
        $xss_array = [
            'safe_value',
            '<script>alert("xss")</script>',
            'another_safe_value'
        ];
        
        $escaped_array = $this->security_manager->preventXSS($xss_array, 'html');
        $this->assertIsArray($escaped_array);
        $this->assertStringNotContainsString('<script', $escaped_array[1]);
    }
    
    /**
     * Test SQL injection prevention
     */
    public function test_sql_injection_prevention() {
        $safe_queries = [
            'SELECT * FROM wp_options WHERE option_name = %s',
            'UPDATE wp_options SET option_value = %s WHERE option_name = %s',
            'SELECT COUNT(*) FROM wp_posts WHERE post_status = "publish"'
        ];
        
        foreach ($safe_queries as $query) {
            $this->assertTrue($this->security_manager->validateSQLQuery($query));
        }
        
        $dangerous_queries = [
            'SELECT * FROM wp_options; DROP TABLE wp_posts;',
            'SELECT * FROM wp_options UNION SELECT * FROM wp_users',
            'UPDATE wp_options SET option_value = (SELECT password FROM wp_users LIMIT 1)',
            'DELETE FROM wp_options WHERE 1=1',
            'INSERT INTO wp_options (option_name) VALUES (LOAD_FILE("/etc/passwd"))',
            'SELECT BENCHMARK(1000000, MD5("test"))',
            'SELECT * FROM wp_options WHERE SLEEP(5)',
            'EXEC xp_cmdshell("dir")'
        ];
        
        foreach ($dangerous_queries as $query) {
            $result = $this->security_manager->validateSQLQuery($query);
            $this->assertInstanceOf('WP_Error', $result);
        }
    }
    
    /**
     * Test file path validation
     */
    public function test_file_path_validation() {
        // Test safe paths
        $safe_paths = [
            'templates/default.css',
            'assets/css/style.css',
            'config.json'
        ];
        
        foreach ($safe_paths as $path) {
            $this->assertTrue($this->security_manager->validateFilePath($path));
        }
        
        // Test dangerous paths
        $dangerous_paths = [
            '../../../etc/passwd',
            '..\\..\\windows\\system32\\config\\sam',
            '/etc/passwd',
            'C:\\Windows\\System32\\config\\SAM',
            "file\x00.txt",
            'templates/../../../sensitive.txt'
        ];
        
        foreach ($dangerous_paths as $path) {
            $result = $this->security_manager->validateFilePath($path);
            $this->assertInstanceOf('WP_Error', $result);
        }
    }
    
    /**
     * Test settings validation
     */
    public function test_settings_validation() {
        // Test valid settings
        $valid_settings = [
            'menu_background_color' => '#ff0000',
            'menu_text_color' => '#ffffff',
            'font_size' => 14,
            'animation_speed' => 'normal',
            'theme_mode' => 'auto',
            'custom_css' => 'body { color: red; }'
        ];
        
        $result = $this->security_manager->validateSettings($valid_settings);
        $this->assertIsArray($result);
        $this->assertEquals('#ff0000', $result['menu_background_color']);
        
        // Test invalid settings
        $invalid_settings = [
            'menu_background_color' => 'invalid_color',
            'font_size' => 999,
            'animation_speed' => 'invalid_speed',
            'theme_mode' => 'invalid_mode',
            'custom_css' => str_repeat('a', 60000)
        ];
        
        $result = $this->security_manager->validateSettings($invalid_settings);
        $this->assertIsArray($result); // Should still return sanitized data
        $this->assertEquals('#000000', $result['menu_background_color']); // Default color
    }
    
    /**
     * Test AJAX request validation
     */
    public function test_ajax_request_validation() {
        // Create admin user
        $admin_user = $this->factory->user->create(['role' => 'administrator']);
        wp_set_current_user($admin_user);
        
        $action = 'save_settings';
        $nonce = $this->security_manager->createNonce($action);
        
        // Test valid AJAX request
        $valid_request = [
            'nonce' => $nonce,
            'action' => $action,
            'settings' => [
                'menu_background_color' => '#ff0000',
                'menu_text_color' => '#ffffff'
            ]
        ];
        
        $result = $this->security_manager->validateAjaxRequest($valid_request, $action);
        $this->assertIsArray($result);
        
        // Test invalid nonce
        $invalid_nonce_request = [
            'nonce' => 'invalid_nonce',
            'action' => $action,
            'settings' => []
        ];
        
        $result = $this->security_manager->validateAjaxRequest($invalid_nonce_request, $action);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_nonce', $result->get_error_code());
        
        // Test insufficient capability
        $subscriber_user = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_user);
        
        $result = $this->security_manager->validateAjaxRequest($valid_request, $action);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('insufficient_capability', $result->get_error_code());
    }
    
    /**
     * Test rate limiting
     */
    public function test_rate_limiting() {
        $action = 'test_action';
        
        // First request should pass
        $this->assertTrue($this->security_manager->checkRateLimit($action, 2, 3600));
        
        // Second request should pass
        $this->assertTrue($this->security_manager->checkRateLimit($action, 2, 3600));
        
        // Third request should fail (limit is 2)
        $result = $this->security_manager->checkRateLimit($action, 2, 3600);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('rate_limit_exceeded', $result->get_error_code());
    }
    
    /**
     * Test template data validation
     */
    public function test_template_validation() {
        // Test valid template JSON
        $valid_template = [
            'name' => 'Test Template',
            'description' => 'A test template',
            'settings' => [
                'menu_background_color' => '#ff0000',
                'menu_text_color' => '#ffffff'
            ]
        ];
        
        $json = json_encode($valid_template);
        $result = $this->security_manager->validateAjaxRequest([
            'nonce' => $this->security_manager->createNonce('upload_template'),
            'template_json' => $json
        ], 'upload_template');
        
        // Should pass for admin user
        $admin_user = $this->factory->user->create(['role' => 'administrator']);
        wp_set_current_user($admin_user);
        
        $result = $this->security_manager->validateAjaxRequest([
            'nonce' => $this->security_manager->createNonce('upload_template'),
            'template_json' => $json
        ], 'upload_template');
        
        $this->assertTrue($result);
        
        // Test invalid JSON
        $result = $this->security_manager->validateAjaxRequest([
            'nonce' => $this->security_manager->createNonce('upload_template'),
            'template_json' => 'invalid json'
        ], 'upload_template');
        
        $this->assertInstanceOf('WP_Error', $result);
        
        // Test oversized JSON
        $large_template = array_fill(0, 10000, 'data');
        $large_json = json_encode($large_template);
        
        $result = $this->security_manager->validateAjaxRequest([
            'nonce' => $this->security_manager->createNonce('upload_template'),
            'template_json' => $large_json
        ], 'upload_template');
        
        $this->assertInstanceOf('WP_Error', $result);
    }
    
    /**
     * Test comprehensive data validation
     */
    public function test_comprehensive_data_validation() {
        $data = [
            'required_field' => 'value',
            'email_field' => 'test@example.com',
            'number_field' => 25,
            'color_field' => '#ff0000'
        ];
        
        $rules = [
            'required_field' => [
                'type' => 'text',
                'required' => true
            ],
            'email_field' => [
                'type' => 'email',
                'required' => false
            ],
            'number_field' => [
                'type' => 'number',
                'required' => false,
                'min' => 10,
                'max' => 100
            ],
            'color_field' => [
                'type' => 'color',
                'required' => false
            ],
            'custom_field' => [
                'type' => 'text',
                'required' => false,
                'custom' => function($value) {
                    return strlen($value) > 5 ? true : new WP_Error('too_short', 'Value too short');
                }
            ]
        ];
        
        // Test valid data
        $result = $this->security_manager->validateData($data, $rules);
        $this->assertTrue($result);
        
        // Test missing required field
        unset($data['required_field']);
        $result = $this->security_manager->validateData($data, $rules);
        $this->assertInstanceOf('WP_Error', $result);
        
        // Test invalid email
        $data['required_field'] = 'value';
        $data['email_field'] = 'invalid_email';
        $result = $this->security_manager->validateData($data, $rules);
        $this->assertInstanceOf('WP_Error', $result);
        
        // Test number out of range
        $data['email_field'] = 'test@example.com';
        $data['number_field'] = 150;
        $result = $this->security_manager->validateData($data, $rules);
        $this->assertInstanceOf('WP_Error', $result);
    }
    
    /**
     * Test output escaping
     */
    public function test_output_escaping() {
        $dangerous_data = '<script>alert("xss")</script>';
        
        // Test HTML escaping
        $escaped = $this->security_manager->escapeOutput($dangerous_data, 'html');
        $this->assertStringNotContainsString('<script>', $escaped);
        
        // Test attribute escaping
        $escaped = $this->security_manager->escapeOutput($dangerous_data, 'attr');
        $this->assertStringNotContainsString('<script>', $escaped);
        
        // Test JavaScript escaping
        $escaped = $this->security_manager->escapeOutput($dangerous_data, 'js');
        $this->assertStringNotContainsString('<script>', $escaped);
        
        // Test URL escaping
        $url_data = 'http://example.com/path?param=<script>';
        $escaped = $this->security_manager->escapeOutput($url_data, 'url');
        $this->assertStringNotContainsString('<script>', $escaped);
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        parent::tearDown();
        
        // Clean up transients used for rate limiting
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_las_rate_limit_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_las_rate_limit_%'");
    }
}