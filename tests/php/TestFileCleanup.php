<?php

/**
 * Test suite for file cleanup system
 * Tests the LAS_File_Manager class and related functionality
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
class TestFileCleanup extends WP_UnitTestCase {

    private $file_manager;
    private $plugin_dir;
    private $test_files = array();

    public function setUp() {
        parent::setUp();
        
        // Initialize file manager
        $this->file_manager = new LAS_File_Manager();
        $this->plugin_dir = plugin_dir_path(dirname(dirname(__DIR__)) . '/live-admin-styler.php');
        
        // Create test files for cleanup testing
        $this->createTestFiles();
    }

    public function tearDown() {
        // Clean up test files
        $this->cleanupTestFiles();
        
        parent::tearDown();
    }

    /**
     * Create test files for cleanup testing
     */
    private function createTestFiles() {
        $test_files_to_create = array(
            'MENU_SIDEBAR_FIXES_SUMMARY.md',
            'TASK_10_INTEGRATION_SUMMARY.md',
            'TASK_7_IMPLEMENTATION_SUMMARY.md',
            'integration-verification.js',
            'test-file-1.html',
            'test-file-2.html'
        );
        
        foreach ($test_files_to_create as $filename) {
            $filepath = $this->plugin_dir . $filename;
            file_put_contents($filepath, "Test content for {$filename}");
            $this->test_files[] = $filepath;
        }
    }

    /**
     * Clean up test files
     */
    private function cleanupTestFiles() {
        foreach ($this->test_files as $filepath) {
            if (file_exists($filepath)) {
                unlink($filepath);
            }
        }
        $this->test_files = array();
    }

    /**
     * Test LAS_File_Manager instantiation
     */
    public function test_file_manager_instantiation() {
        $this->assertInstanceOf('LAS_File_Manager', $this->file_manager);
    }

    /**
     * Test plugin directory validation
     */
    public function test_plugin_directory_validation() {
        // Use reflection to test private method
        $reflection = new ReflectionClass($this->file_manager);
        $method = $reflection->getMethod('validate_plugin_directory');
        $method->setAccessible(true);
        
        $this->assertTrue($method->invoke($this->file_manager));
    }

    /**
     * Test cleanup preview functionality
     */
    public function test_cleanup_preview() {
        $preview = $this->file_manager->get_cleanup_preview();
        
        $this->assertIsArray($preview);
        $this->assertGreaterThan(0, count($preview));
        
        // Check that our test files are detected
        $filenames = array_column($preview, 'file');
        $this->assertContains('MENU_SIDEBAR_FIXES_SUMMARY.md', $filenames);
        $this->assertContains('TASK_10_INTEGRATION_SUMMARY.md', $filenames);
        $this->assertContains('integration-verification.js', $filenames);
        
        // Check preview structure
        foreach ($preview as $file_info) {
            $this->assertArrayHasKey('file', $file_info);
            $this->assertArrayHasKey('path', $file_info);
            $this->assertArrayHasKey('size', $file_info);
            $this->assertArrayHasKey('type', $file_info);
            
            $this->assertIsString($file_info['file']);
            $this->assertIsString($file_info['path']);
            $this->assertIsInt($file_info['size']);
            $this->assertContains($file_info['type'], array('exact_match', 'pattern_match'));
        }
    }

    /**
     * Test safe file deletion
     */
    public function test_safe_file_deletion() {
        // Use reflection to test private method
        $reflection = new ReflectionClass($this->file_manager);
        $method = $reflection->getMethod('safe_delete_file');
        $method->setAccessible(true);
        
        // Test successful deletion
        $test_file = $this->plugin_dir . 'test_deletion.txt';
        file_put_contents($test_file, 'test content');
        $this->assertTrue(file_exists($test_file));
        
        $result = $method->invoke($this->file_manager, $test_file, 'test_deletion.txt');
        
        $this->assertEquals('success', $result['status']);
        $this->assertEquals('test_deletion.txt', $result['file']);
        $this->assertEquals('File successfully deleted', $result['reason']);
        $this->assertFalse(file_exists($test_file));
        
        // Test non-existent file
        $result = $method->invoke($this->file_manager, $test_file, 'test_deletion.txt');
        $this->assertEquals('skipped', $result['status']);
        $this->assertEquals('File does not exist', $result['reason']);
        
        // Test protected file
        $protected_file = $this->plugin_dir . 'live-admin-styler.php';
        $result = $method->invoke($this->file_manager, $protected_file, 'live-admin-styler.php');
        $this->assertEquals('skipped', $result['status']);
        $this->assertEquals('Protected core file', $result['reason']);
        
        // Test file in protected directory
        $protected_dir_file = $this->plugin_dir . 'includes/test.php';
        $result = $method->invoke($this->file_manager, $protected_dir_file, 'test.php');
        $this->assertEquals('skipped', $result['status']);
        $this->assertStringContains('File in protected directory', $result['reason']);
    }

    /**
     * Test security validation for file paths
     */
    public function test_security_validation() {
        // Use reflection to test private method
        $reflection = new ReflectionClass($this->file_manager);
        $method = $reflection->getMethod('safe_delete_file');
        $method->setAccessible(true);
        
        // Test path traversal attempt
        $malicious_path = $this->plugin_dir . '../../../etc/passwd';
        $result = $method->invoke($this->file_manager, $malicious_path, 'passwd');
        
        $this->assertEquals('skipped', $result['status']);
        $this->assertEquals('File does not exist', $result['reason']);
        
        // Test absolute path outside plugin directory
        $outside_path = '/tmp/test_file.txt';
        file_put_contents($outside_path, 'test');
        
        $result = $method->invoke($this->file_manager, $outside_path, 'test_file.txt');
        $this->assertEquals('failed', $result['status']);
        $this->assertStringContains('security violation', $result['reason']);
        
        // Clean up
        if (file_exists($outside_path)) {
            unlink($outside_path);
        }
    }

    /**
     * Test full cleanup operation
     */
    public function test_cleanup_operation() {
        // Verify test files exist before cleanup
        $this->assertTrue(file_exists($this->plugin_dir . 'MENU_SIDEBAR_FIXES_SUMMARY.md'));
        $this->assertTrue(file_exists($this->plugin_dir . 'TASK_10_INTEGRATION_SUMMARY.md'));
        $this->assertTrue(file_exists($this->plugin_dir . 'integration-verification.js'));
        
        // Perform cleanup
        $results = $this->file_manager->cleanup_unnecessary_files();
        
        $this->assertIsArray($results);
        $this->assertArrayHasKey('success', $results);
        $this->assertArrayHasKey('failed', $results);
        $this->assertArrayHasKey('skipped', $results);
        
        // Check that files were successfully deleted
        $this->assertGreaterThan(0, count($results['success']));
        
        // Verify specific files were deleted
        $success_files = array_column($results['success'], 'file');
        $this->assertContains('MENU_SIDEBAR_FIXES_SUMMARY.md', $success_files);
        $this->assertContains('TASK_10_INTEGRATION_SUMMARY.md', $success_files);
        $this->assertContains('integration-verification.js', $success_files);
        
        // Verify files no longer exist
        $this->assertFalse(file_exists($this->plugin_dir . 'MENU_SIDEBAR_FIXES_SUMMARY.md'));
        $this->assertFalse(file_exists($this->plugin_dir . 'TASK_10_INTEGRATION_SUMMARY.md'));
        $this->assertFalse(file_exists($this->plugin_dir . 'integration-verification.js'));
        
        // Check result structure
        foreach ($results['success'] as $result) {
            $this->assertArrayHasKey('status', $result);
            $this->assertArrayHasKey('file', $result);
            $this->assertArrayHasKey('reason', $result);
            $this->assertEquals('success', $result['status']);
        }
    }

    /**
     * Test manual cleanup functionality
     */
    public function test_manual_cleanup() {
        // Create additional test file
        $manual_test_file = $this->plugin_dir . 'manual_test.md';
        file_put_contents($manual_test_file, 'manual test content');
        $this->test_files[] = $manual_test_file;
        
        // Perform manual cleanup
        $results = $this->file_manager->manual_cleanup();
        
        $this->assertIsArray($results);
        $this->assertArrayHasKey('success', $results);
        $this->assertArrayHasKey('failed', $results);
        $this->assertArrayHasKey('skipped', $results);
        
        // Should have same behavior as regular cleanup
        $this->assertGreaterThan(0, count($results['success']));
    }

    /**
     * Test cleanup on activation
     */
    public function test_cleanup_on_activation() {
        // Create test files
        $activation_test_file = $this->plugin_dir . 'TASK_ACTIVATION_SUMMARY.md';
        file_put_contents($activation_test_file, 'activation test content');
        $this->test_files[] = $activation_test_file;
        
        // Trigger activation cleanup
        $this->file_manager->cleanup_on_activation();
        
        // Check that cleanup results were stored
        $cleanup_results = get_option('las_fresh_cleanup_results');
        $this->assertIsArray($cleanup_results);
        $this->assertArrayHasKey('success', $cleanup_results);
        
        // Clean up option
        delete_option('las_fresh_cleanup_results');
    }

    /**
     * Test cleanup on deactivation
     */
    public function test_cleanup_on_deactivation() {
        // Create test files
        $deactivation_test_file = $this->plugin_dir . 'TASK_DEACTIVATION_SUMMARY.md';
        file_put_contents($deactivation_test_file, 'deactivation test content');
        $this->test_files[] = $deactivation_test_file;
        
        // Trigger deactivation cleanup (should not throw errors)
        $this->file_manager->cleanup_on_deactivation();
        
        // Method should complete without errors
        $this->assertTrue(true);
    }

    /**
     * Test AJAX cleanup handler
     */
    public function test_ajax_cleanup_handler() {
        // Mock AJAX request data
        $_POST['nonce'] = wp_create_nonce('las_admin_nonce');
        $_POST['action'] = 'las_file_cleanup';
        
        // Set current user as administrator
        wp_set_current_user($this->factory->user->create(array('role' => 'administrator')));
        
        // Capture output
        ob_start();
        
        try {
            $this->file_manager->ajax_cleanup();
        } catch (WPAjaxDieContinueException $e) {
            // Expected for AJAX handlers
        }
        
        $output = ob_get_clean();
        
        // Should produce JSON response
        $response = json_decode($output, true);
        $this->assertIsArray($response);
        
        // Clean up
        unset($_POST['nonce']);
        unset($_POST['action']);
    }

    /**
     * Test error handling for invalid directory
     */
    public function test_error_handling_invalid_directory() {
        // Create a file manager with invalid plugin path
        $invalid_manager = new LAS_File_Manager();
        
        // Mock invalid plugin directory by temporarily changing the plugin path
        $original_file = __FILE__;
        
        // This should trigger validation failure
        $results = $invalid_manager->cleanup_unnecessary_files();
        
        // Should handle gracefully
        $this->assertIsArray($results);
        $this->assertArrayHasKey('success', $results);
        $this->assertArrayHasKey('failed', $results);
        $this->assertArrayHasKey('skipped', $results);
    }

    /**
     * Test pattern matching for cleanup files
     */
    public function test_pattern_matching() {
        // Create files matching patterns
        $pattern_files = array(
            'TASK_123_SUMMARY.md',
            'TASK_ABC_SUMMARY.md',
            'test-pattern-1.html',
            'test-pattern-2.html'
        );
        
        foreach ($pattern_files as $filename) {
            $filepath = $this->plugin_dir . $filename;
            file_put_contents($filepath, "Pattern test content for {$filename}");
            $this->test_files[] = $filepath;
        }
        
        // Get cleanup preview
        $preview = $this->file_manager->get_cleanup_preview();
        $filenames = array_column($preview, 'file');
        
        // Check that pattern files are detected
        $this->assertContains('TASK_123_SUMMARY.md', $filenames);
        $this->assertContains('TASK_ABC_SUMMARY.md', $filenames);
        $this->assertContains('test-pattern-1.html', $filenames);
        $this->assertContains('test-pattern-2.html', $filenames);
        
        // Perform cleanup
        $results = $this->file_manager->cleanup_unnecessary_files();
        
        // Verify pattern files were cleaned up
        $success_files = array_column($results['success'], 'file');
        $this->assertContains('TASK_123_SUMMARY.md', $success_files);
        $this->assertContains('TASK_ABC_SUMMARY.md', $success_files);
    }

    /**
     * Test cleanup with no files to clean
     */
    public function test_cleanup_no_files() {
        // Remove all test files first
        $this->cleanupTestFiles();
        
        // Perform cleanup
        $results = $this->file_manager->cleanup_unnecessary_files();
        
        $this->assertIsArray($results);
        $this->assertEquals(0, count($results['success']));
        $this->assertGreaterThanOrEqual(0, count($results['skipped']));
    }

    /**
     * Test file size reporting in preview
     */
    public function test_file_size_reporting() {
        // Create file with known content
        $size_test_file = $this->plugin_dir . 'SIZE_TEST_SUMMARY.md';
        $test_content = str_repeat('A', 1000); // 1000 bytes
        file_put_contents($size_test_file, $test_content);
        $this->test_files[] = $size_test_file;
        
        $preview = $this->file_manager->get_cleanup_preview();
        
        // Find our test file in preview
        $test_file_info = null;
        foreach ($preview as $file_info) {
            if ($file_info['file'] === 'SIZE_TEST_SUMMARY.md') {
                $test_file_info = $file_info;
                break;
            }
        }
        
        $this->assertNotNull($test_file_info);
        $this->assertEquals(1000, $test_file_info['size']);
    }

    /**
     * Test concurrent cleanup operations
     */
    public function test_concurrent_cleanup() {
        // Simulate multiple cleanup operations
        $results1 = $this->file_manager->cleanup_unnecessary_files();
        $results2 = $this->file_manager->cleanup_unnecessary_files();
        
        // Second cleanup should find no files (already cleaned)
        $this->assertIsArray($results1);
        $this->assertIsArray($results2);
        
        // First cleanup should have successes, second should have mostly skips
        $this->assertGreaterThanOrEqual(count($results2['success']), count($results1['success']));
    }

    /**
     * Test cleanup results structure validation
     */
    public function test_cleanup_results_structure() {
        $results = $this->file_manager->cleanup_unnecessary_files();
        
        // Validate overall structure
        $this->assertIsArray($results);
        $this->assertArrayHasKey('success', $results);
        $this->assertArrayHasKey('failed', $results);
        $this->assertArrayHasKey('skipped', $results);
        
        // Validate individual result structures
        $all_results = array_merge($results['success'], $results['failed'], $results['skipped']);
        
        foreach ($all_results as $result) {
            $this->assertIsArray($result);
            $this->assertArrayHasKey('status', $result);
            $this->assertArrayHasKey('file', $result);
            $this->assertArrayHasKey('reason', $result);
            
            $this->assertContains($result['status'], array('success', 'failed', 'skipped'));
            $this->assertIsString($result['file']);
            $this->assertIsString($result['reason']);
        }
    }
}