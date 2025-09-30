<?php
/**
 * Test Error Logging functionality
 */

class TestErrorLogging extends WP_UnitTestCase {
    
    private $error_logger;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create error logger instance
        $this->error_logger = new LAS_Error_Logger();
        
        // Clear any existing error logs
        $this->error_logger->clear_all_logs();
    }
    
    public function tearDown(): void {
        // Clean up after tests
        if ($this->error_logger) {
            $this->error_logger->clear_all_logs();
        }
        
        parent::tearDown();
    }
    
    /**
     * Test basic error logging
     */
    public function test_basic_error_logging() {
        $error_id = $this->error_logger->log_error(
            'Test error message',
            LAS_Error_Logger::CATEGORY_PHP,
            LAS_Error_Logger::SEVERITY_MEDIUM,
            array('test_context' => 'test_value')
        );
        
        $this->assertNotEmpty($error_id, 'Error ID should be returned');
        $this->assertStringStartsWith('las_error_', $error_id, 'Error ID should have correct prefix');
        
        // Verify error was stored
        $recent_errors = $this->error_logger->get_recent_errors(1);
        $this->assertCount(1, $recent_errors, 'Should have 1 recent error');
        
        $logged_error = $recent_errors[0];
        $this->assertEquals('Test error message', $logged_error['message']);
        $this->assertEquals(LAS_Error_Logger::CATEGORY_PHP, $logged_error['category']);
        $this->assertEquals(LAS_Error_Logger::SEVERITY_MEDIUM, $logged_error['severity']);
        $this->assertEquals('Medium', $logged_error['severity_label']);
        $this->assertArrayHasKey('test_context', $logged_error['context']);
        $this->assertEquals('test_value', $logged_error['context']['test_context']);
    }
    
    /**
     * Test error categorization
     */
    public function test_error_categorization() {
        $categories = array(
            LAS_Error_Logger::CATEGORY_JAVASCRIPT,
            LAS_Error_Logger::CATEGORY_PHP,
            LAS_Error_Logger::CATEGORY_AJAX,
            LAS_Error_Logger::CATEGORY_CSS,
            LAS_Error_Logger::CATEGORY_PERFORMANCE,
            LAS_Error_Logger::CATEGORY_SECURITY,
            LAS_Error_Logger::CATEGORY_DATABASE
        );
        
        foreach ($categories as $category) {
            $error_id = $this->error_logger->log_error(
                'Test error for category ' . $category,
                $category,
                LAS_Error_Logger::SEVERITY_LOW
            );
            
            $this->assertNotEmpty($error_id, 'Error ID should be returned for category ' . $category);
        }
        
        $recent_errors = $this->error_logger->get_recent_errors(count($categories));
        $this->assertCount(count($categories), $recent_errors, 'Should have logged all category errors');
        
        // Verify categories are correctly stored
        $logged_categories = array_column($recent_errors, 'category');
        foreach ($categories as $category) {
            $this->assertContains($category, $logged_categories, 'Category ' . $category . ' should be in logged errors');
        }
    }
    
    /**
     * Test severity levels
     */
    public function test_severity_levels() {
        $severities = array(
            LAS_Error_Logger::SEVERITY_LOW => 'Low',
            LAS_Error_Logger::SEVERITY_MEDIUM => 'Medium',
            LAS_Error_Logger::SEVERITY_HIGH => 'High',
            LAS_Error_Logger::SEVERITY_CRITICAL => 'Critical'
        );
        
        foreach ($severities as $severity => $label) {
            $error_id = $this->error_logger->log_error(
                'Test error with severity ' . $severity,
                LAS_Error_Logger::CATEGORY_PHP,
                $severity
            );
            
            $this->assertNotEmpty($error_id, 'Error ID should be returned for severity ' . $severity);
        }
        
        $recent_errors = $this->error_logger->get_recent_errors(count($severities));
        $this->assertCount(count($severities), $recent_errors, 'Should have logged all severity errors');
        
        // Verify severity labels are correct
        foreach ($recent_errors as $error) {
            $expected_label = $severities[$error['severity']];
            $this->assertEquals($expected_label, $error['severity_label'], 'Severity label should match');
        }
    }
    
    /**
     * Test duplicate error handling
     */
    public function test_duplicate_error_handling() {
        $message = 'Duplicate test error';
        $category = LAS_Error_Logger::CATEGORY_PHP;
        $severity = LAS_Error_Logger::SEVERITY_MEDIUM;
        
        // Log the same error multiple times
        $error_id1 = $this->error_logger->log_error($message, $category, $severity);
        $error_id2 = $this->error_logger->log_error($message, $category, $severity);
        $error_id3 = $this->error_logger->log_error($message, $category, $severity);
        
        $this->assertNotEmpty($error_id1, 'First error ID should be returned');
        $this->assertNotEmpty($error_id2, 'Second error ID should be returned');
        $this->assertNotEmpty($error_id3, 'Third error ID should be returned');
        
        $recent_errors = $this->error_logger->get_recent_errors(10);
        
        // Should have only one unique error with occurrence count
        $duplicate_errors = array_filter($recent_errors, function($error) use ($message) {
            return $error['message'] === $message;
        });
        
        $this->assertCount(1, $duplicate_errors, 'Should have only one unique error entry');
        
        $duplicate_error = array_values($duplicate_errors)[0];
        $this->assertEquals(3, $duplicate_error['occurrences'], 'Should have 3 occurrences');
    }
    
    /**
     * Test error log limits
     */
    public function test_error_log_limits() {
        // Log more than the maximum allowed errors
        $max_errors = 50; // Use a smaller number for testing
        
        for ($i = 0; $i < $max_errors + 10; $i++) {
            $this->error_logger->log_error(
                'Test error ' . $i,
                LAS_Error_Logger::CATEGORY_PHP,
                LAS_Error_Logger::SEVERITY_LOW
            );
        }
        
        $recent_errors = $this->error_logger->get_recent_errors(100);
        $this->assertLessThanOrEqual($max_errors, count($recent_errors), 'Should not exceed maximum error limit');
    }
    
    /**
     * Test critical error handling
     */
    public function test_critical_error_handling() {
        $error_id = $this->error_logger->log_error(
            'Critical test error',
            LAS_Error_Logger::CATEGORY_PHP,
            LAS_Error_Logger::SEVERITY_CRITICAL,
            array('critical_context' => 'critical_value')
        );
        
        $this->assertNotEmpty($error_id, 'Critical error ID should be returned');
        
        // Check if critical error transient was set
        $critical_error = get_transient('las_fresh_critical_error');
        $this->assertNotFalse($critical_error, 'Critical error transient should be set');
        $this->assertEquals('Critical test error', $critical_error['message']);
        $this->assertEquals(LAS_Error_Logger::SEVERITY_CRITICAL, $critical_error['severity']);
    }
    
    /**
     * Test error statistics
     */
    public function test_error_statistics() {
        // Log various errors
        $this->error_logger->log_error('Error 1', LAS_Error_Logger::CATEGORY_PHP, LAS_Error_Logger::SEVERITY_LOW);
        $this->error_logger->log_error('Error 2', LAS_Error_Logger::CATEGORY_JAVASCRIPT, LAS_Error_Logger::SEVERITY_MEDIUM);
        $this->error_logger->log_error('Error 3', LAS_Error_Logger::CATEGORY_AJAX, LAS_Error_Logger::SEVERITY_HIGH);
        $this->error_logger->log_error('Error 4', LAS_Error_Logger::CATEGORY_CSS, LAS_Error_Logger::SEVERITY_CRITICAL);
        
        $stats = $this->error_logger->get_error_statistics();
        
        $this->assertIsArray($stats, 'Statistics should be an array');
        $this->assertArrayHasKey('total_errors', $stats);
        $this->assertArrayHasKey('recent_errors', $stats);
        $this->assertArrayHasKey('by_severity', $stats);
        $this->assertArrayHasKey('by_category', $stats);
        
        $this->assertEquals(4, $stats['total_errors'], 'Should have 4 total errors');
        $this->assertEquals(4, $stats['recent_errors'], 'Should have 4 recent errors');
        
        // Check severity breakdown
        $this->assertEquals(1, $stats['by_severity']['Low'], 'Should have 1 low severity error');
        $this->assertEquals(1, $stats['by_severity']['Medium'], 'Should have 1 medium severity error');
        $this->assertEquals(1, $stats['by_severity']['High'], 'Should have 1 high severity error');
        $this->assertEquals(1, $stats['by_severity']['Critical'], 'Should have 1 critical severity error');
        
        // Check category breakdown
        $this->assertEquals(1, $stats['by_category']['php'], 'Should have 1 PHP error');
        $this->assertEquals(1, $stats['by_category']['javascript'], 'Should have 1 JavaScript error');
        $this->assertEquals(1, $stats['by_category']['ajax'], 'Should have 1 AJAX error');
        $this->assertEquals(1, $stats['by_category']['css'], 'Should have 1 CSS error');
    }
    
    /**
     * Test debug mode functionality
     */
    public function test_debug_mode() {
        // Test initial debug mode state
        $initial_debug_mode = $this->error_logger->is_debug_mode();
        $this->assertIsBool($initial_debug_mode, 'Debug mode should return boolean');
        
        // Enable debug mode
        $this->error_logger->enable_debug_mode();
        $this->assertTrue($this->error_logger->is_debug_mode(), 'Debug mode should be enabled');
        
        // Disable debug mode
        $this->error_logger->disable_debug_mode();
        $this->assertFalse($this->error_logger->is_debug_mode(), 'Debug mode should be disabled');
    }
    
    /**
     * Test context sanitization
     */
    public function test_context_sanitization() {
        $unsafe_context = array(
            'safe_string' => 'This is safe',
            'unsafe_html' => '<script>alert("xss")</script>',
            'nested_array' => array(
                'safe_nested' => 'Safe nested value',
                'unsafe_nested' => '<img src="x" onerror="alert(1)">'
            ),
            'number' => 123,
            'boolean' => true,
            'null_value' => null,
            'object' => new stdClass()
        );
        
        $error_id = $this->error_logger->log_error(
            'Test context sanitization',
            LAS_Error_Logger::CATEGORY_PHP,
            LAS_Error_Logger::SEVERITY_LOW,
            $unsafe_context
        );
        
        $this->assertNotEmpty($error_id, 'Error should be logged with sanitized context');
        
        $recent_errors = $this->error_logger->get_recent_errors(1);
        $logged_error = $recent_errors[0];
        
        // Check that unsafe content was sanitized
        $this->assertEquals('This is safe', $logged_error['context']['safe_string']);
        $this->assertStringNotContainsString('<script>', $logged_error['context']['unsafe_html']);
        $this->assertStringNotContainsString('alert', $logged_error['context']['unsafe_html']);
        
        // Check nested array sanitization
        $this->assertEquals('Safe nested value', $logged_error['context']['nested_array']['safe_nested']);
        $this->assertStringNotContainsString('<img', $logged_error['context']['nested_array']['unsafe_nested']);
        
        // Check other data types
        $this->assertEquals(123, $logged_error['context']['number']);
        $this->assertTrue($logged_error['context']['boolean']);
    }
    
    /**
     * Test error clearing
     */
    public function test_error_clearing() {
        // Log some errors
        $this->error_logger->log_error('Error 1', LAS_Error_Logger::CATEGORY_PHP, LAS_Error_Logger::SEVERITY_LOW);
        $this->error_logger->log_error('Error 2', LAS_Error_Logger::CATEGORY_JAVASCRIPT, LAS_Error_Logger::SEVERITY_MEDIUM);
        $this->error_logger->log_error('Error 3', LAS_Error_Logger::CATEGORY_AJAX, LAS_Error_Logger::SEVERITY_HIGH);
        
        // Verify errors were logged
        $errors_before = $this->error_logger->get_recent_errors(10);
        $this->assertCount(3, $errors_before, 'Should have 3 errors before clearing');
        
        // Clear all logs
        $cleared_count = $this->error_logger->clear_all_logs();
        $this->assertEquals(3, $cleared_count, 'Should have cleared 3 errors');
        
        // Verify errors were cleared
        $errors_after = $this->error_logger->get_recent_errors(10);
        $this->assertCount(0, $errors_after, 'Should have 0 errors after clearing');
    }
}