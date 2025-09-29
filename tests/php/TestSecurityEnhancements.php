<?php
/**
 * Test Security Enhancements
 * 
 * Tests for the enhanced security features including:
 * - Enhanced CSRF protection with nonce refresh
 * - Input validation and sanitization
 * - Security logging for suspicious activities
 * - Rate limiting for AJAX requests
 */

class TestSecurityEnhancements extends WP_UnitTestCase {
    
    private $security_manager;
    private $test_user_id;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create test user with admin capabilities
        $this->test_user_id = $this->factory->user->create(array(
            'role' => 'administrator'
        ));
        wp_set_current_user($this->test_user_id);
        
        // Initialize security manager
        $this->security_manager = new LAS_Security_Manager();
    }
    
    public function tearDown(): void {
        // Clean up test data
        delete_option(LAS_Security_Manager::RATE_LIMIT_KEY);
        delete_option(LAS_Security_Manager::SECURITY_LOG_KEY);
        delete_option('las_nonce_data');
        
        parent::tearDown();
    }
    
    /**
     * Test enhanced nonce creation and verification.
     */
    public function test_enhanced_nonce_creation_and_verification() {
        $nonce = $this->security_manager->create_enhanced_nonce('test_action');
        
        $this->assertNotEmpty($nonce);
        $this->assertTrue($this->security_manager->verify_enhanced_nonce($nonce, 'test_action'));
        $this->assertFalse($this->security_manager->verify_enhanced_nonce($nonce, 'wrong_action'));
        $this->assertFalse($this->security_manager->verify_enhanced_nonce('invalid_nonce', 'test_action'));
    }
    
    /**
     * Test nonce age verification.
     */
    public function test_nonce_age_verification() {
        $nonce = $this->security_manager->create_enhanced_nonce('test_action');
        
        // Simulate old nonce by manipulating stored data
        $nonce_data = get_option('las_nonce_data', array());
        $nonce_data[$nonce]['created'] = time() - (LAS_Security_Manager::NONCE_REFRESH_INTERVAL + 1);
        update_option('las_nonce_data', $nonce_data);
        
        $this->assertFalse($this->security_manager->verify_enhanced_nonce($nonce, 'test_action'));
    }
    
    /**
     * Test rate limiting functionality.
     */
    public function test_rate_limiting() {
        // Simulate multiple requests
        for ($i = 0; $i < LAS_Security_Manager::MAX_REQUESTS_PER_MINUTE + 1; $i++) {
            $result = $this->security_manager->check_rate_limit();
            if ($i < LAS_Security_Manager::MAX_REQUESTS_PER_MINUTE) {
                $this->assertTrue($result);
            } else {
                $this->assertFalse($result);
            }
        }
    }
    
    /**
     * Test input sanitization for different types.
     */
    public function test_input_sanitization() {
        // Test color sanitization
        $this->assertEquals('#ff0000', $this->security_manager->sanitize_input('#ff0000', 'color'));
        $this->assertEquals('#000000', $this->security_manager->sanitize_input('invalid_color', 'color'));
        
        // Test integer sanitization
        $this->assertEquals(100, $this->security_manager->sanitize_input('100', 'integer'));
        $this->assertEquals(50, $this->security_manager->sanitize_input('150', 'integer', array('max' => 50)));
        $this->assertEquals(10, $this->security_manager->sanitize_input('5', 'integer', array('min' => 10)));
        
        // Test boolean sanitization
        $this->assertTrue($this->security_manager->sanitize_input('1', 'boolean'));
        $this->assertTrue($this->security_manager->sanitize_input(true, 'boolean'));
        $this->assertFalse($this->security_manager->sanitize_input('0', 'boolean'));
        $this->assertFalse($this->security_manager->sanitize_input(false, 'boolean'));
        
        // Test select sanitization
        $options = array('allowed' => array('option1', 'option2'), 'default' => 'option1');
        $this->assertEquals('option1', $this->security_manager->sanitize_input('option1', 'select', $options));
        $this->assertEquals('option1', $this->security_manager->sanitize_input('invalid_option', 'select', $options));
        
        // Test CSS sanitization
        $safe_css = 'color: red; background: blue;';
        $this->assertEquals($safe_css, $this->security_manager->sanitize_input($safe_css, 'css'));
        
        $malicious_css = 'color: red; javascript:alert("xss");';
        $this->assertEquals('', $this->security_manager->sanitize_input($malicious_css, 'css'));
        
        // Test URL sanitization
        $valid_url = 'https://example.com/image.jpg';
        $this->assertEquals($valid_url, $this->security_manager->sanitize_input($valid_url, 'url'));
        
        $invalid_url = 'javascript:alert("xss")';
        $this->assertEquals('', $this->security_manager->sanitize_input($invalid_url, 'url'));
    }
    
    /**
     * Test security logging functionality.
     */
    public function test_security_logging() {
        $this->security_manager->log_security_event('test_event', array('test_data' => 'value'));
        
        $security_log = get_option(LAS_Security_Manager::SECURITY_LOG_KEY, array());
        
        $this->assertNotEmpty($security_log);
        $this->assertEquals('test_event', $security_log[0]['event_type']);
        $this->assertEquals('value', $security_log[0]['data']['test_data']);
        $this->assertEquals($this->test_user_id, $security_log[0]['user_id']);
    }
    
    /**
     * Test security log size limitation.
     */
    public function test_security_log_size_limit() {
        // Add more than max entries
        for ($i = 0; $i < LAS_Security_Manager::MAX_LOG_ENTRIES + 10; $i++) {
            $this->security_manager->log_security_event('test_event_' . $i, array('index' => $i));
        }
        
        $security_log = get_option(LAS_Security_Manager::SECURITY_LOG_KEY, array());
        
        $this->assertEquals(LAS_Security_Manager::MAX_LOG_ENTRIES, count($security_log));
        
        // Check that newest entries are kept
        $this->assertEquals('test_event_' . (LAS_Security_Manager::MAX_LOG_ENTRIES + 9), $security_log[0]['event_type']);
    }
    
    /**
     * Test security statistics generation.
     */
    public function test_security_statistics() {
        // Add some test events
        $this->security_manager->log_security_event('invalid_nonce', array());
        $this->security_manager->log_security_event('rate_limit_exceeded', array());
        $this->security_manager->log_security_event('invalid_nonce', array());
        
        $stats = $this->security_manager->get_security_stats();
        
        $this->assertArrayHasKey('total_events', $stats);
        $this->assertArrayHasKey('events_last_24h', $stats);
        $this->assertArrayHasKey('top_event_types', $stats);
        $this->assertEquals(3, $stats['total_events']);
        $this->assertEquals(2, $stats['top_event_types']['invalid_nonce']);
        $this->assertEquals(1, $stats['top_event_types']['rate_limit_exceeded']);
    }
    
    /**
     * Test nonce cleanup functionality.
     */
    public function test_nonce_cleanup() {
        // Create some test nonces
        $old_nonce = $this->security_manager->create_enhanced_nonce('old_action');
        $new_nonce = $this->security_manager->create_enhanced_nonce('new_action');
        
        // Simulate old nonce
        $nonce_data = get_option('las_nonce_data', array());
        $nonce_data[$old_nonce]['created'] = time() - (LAS_Security_Manager::NONCE_REFRESH_INTERVAL * 3);
        update_option('las_nonce_data', $nonce_data);
        
        // Run cleanup
        $this->security_manager->cleanup_expired_nonces();
        
        $cleaned_data = get_option('las_nonce_data', array());
        
        $this->assertArrayNotHasKey($old_nonce, $cleaned_data);
        $this->assertArrayHasKey($new_nonce, $cleaned_data);
    }
    
    /**
     * Test rate limit cleanup functionality.
     */
    public function test_rate_limit_cleanup() {
        // Add some rate limit data
        $rate_limits = array(
            'user1_hash' => array(
                'requests' => array(time() - 7200, time() - 3600, time()), // 2 hours, 1 hour, now
                'blocked_until' => time() - 100 // Expired block
            ),
            'user2_hash' => array(
                'requests' => array(time()),
                'blocked_until' => time() + 300 // Active block
            )
        );
        update_option(LAS_Security_Manager::RATE_LIMIT_KEY, $rate_limits);
        
        // Run cleanup
        $this->security_manager->cleanup_expired_nonces();
        
        $cleaned_limits = get_option(LAS_Security_Manager::RATE_LIMIT_KEY, array());
        
        // Check that old requests are removed and expired blocks are cleared
        $this->assertEquals(2, count($cleaned_limits['user1_hash']['requests'])); // Only last 2 requests within 1 hour
        $this->assertEquals(0, $cleaned_limits['user1_hash']['blocked_until']); // Expired block cleared
        $this->assertGreaterThan(time(), $cleaned_limits['user2_hash']['blocked_until']); // Active block preserved
    }
    
    /**
     * Test client IP detection.
     */
    public function test_client_ip_detection() {
        // Test with different server variables
        $_SERVER['REMOTE_ADDR'] = '192.168.1.1';
        $reflection = new ReflectionClass($this->security_manager);
        $method = $reflection->getMethod('get_client_ip');
        $method->setAccessible(true);
        
        $ip = $method->invoke($this->security_manager);
        $this->assertEquals('192.168.1.1', $ip);
        
        // Test with proxy headers
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '203.0.113.1, 192.168.1.1';
        $ip = $method->invoke($this->security_manager);
        $this->assertEquals('203.0.113.1', $ip);
        
        // Clean up
        unset($_SERVER['HTTP_X_FORWARDED_FOR']);
        unset($_SERVER['REMOTE_ADDR']);
    }
    
    /**
     * Test user agent hashing.
     */
    public function test_user_agent_hashing() {
        $_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0 (Test Browser)';
        
        $reflection = new ReflectionClass($this->security_manager);
        $method = $reflection->getMethod('get_user_agent_hash');
        $method->setAccessible(true);
        
        $hash = $method->invoke($this->security_manager);
        
        $this->assertEquals(16, strlen($hash));
        $this->assertMatchesRegularExpression('/^[a-f0-9]+$/', $hash);
        
        // Clean up
        unset($_SERVER['HTTP_USER_AGENT']);
    }
}