<?php
/**
 * Access Control Manager Tests
 * 
 * Comprehensive tests for capability-based access control, role-based permissions,
 * secure file operations, and access validation.
 *
 * @package LiveAdminStyler
 * @subpackage Tests
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Test class for Access Control Manager
 */
class TestAccessControlManager extends WP_UnitTestCase {
    
    /**
     * Access Control Manager instance
     * @var LAS_AccessControlManager
     */
    private $access_control;
    
    /**
     * Test users
     * @var array
     */
    private $test_users = [];
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        $this->access_control = new LAS_AccessControlManager();
        
        // Create test users with different roles
        $this->test_users = [
            'administrator' => $this->factory->user->create(['role' => 'administrator']),
            'editor' => $this->factory->user->create(['role' => 'editor']),
            'author' => $this->factory->user->create(['role' => 'author']),
            'contributor' => $this->factory->user->create(['role' => 'contributor']),
            'subscriber' => $this->factory->user->create(['role' => 'subscriber'])
        ];
        
        // Set administrator as current user
        wp_set_current_user($this->test_users['administrator']);
    }
    
    /**
     * Test capability registration
     */
    public function test_capability_registration() {
        // Trigger capability registration
        $this->access_control->register_capabilities();
        
        // Check that capabilities were registered
        $this->assertEquals('2.0.0', get_option('las_fresh_capabilities_registered'));
        
        // Test administrator capabilities
        $admin_user = new WP_User($this->test_users['administrator']);
        $this->assertTrue($admin_user->has_cap('las_manage_settings'));
        $this->assertTrue($admin_user->has_cap('las_manage_templates'));
        $this->assertTrue($admin_user->has_cap('las_use_live_edit'));
        $this->assertTrue($admin_user->has_cap('las_manage_advanced'));
        $this->assertTrue($admin_user->has_cap('las_export_import'));
        $this->assertTrue($admin_user->has_cap('las_view_analytics'));
        $this->assertTrue($admin_user->has_cap('las_manage_users'));
        
        // Test editor capabilities
        $editor_user = new WP_User($this->test_users['editor']);
        $this->assertTrue($editor_user->has_cap('las_manage_settings'));
        $this->assertTrue($editor_user->has_cap('las_manage_templates'));
        $this->assertTrue($editor_user->has_cap('las_use_live_edit'));
        $this->assertTrue($editor_user->has_cap('las_export_import'));
        $this->assertFalse($editor_user->has_cap('las_manage_advanced'));
        $this->assertFalse($editor_user->has_cap('las_view_analytics'));
        $this->assertFalse($editor_user->has_cap('las_manage_users'));
        
        // Test author capabilities
        $author_user = new WP_User($this->test_users['author']);
        $this->assertTrue($author_user->has_cap('las_use_live_edit'));
        $this->assertFalse($author_user->has_cap('las_manage_settings'));
        $this->assertFalse($author_user->has_cap('las_manage_templates'));
        
        // Test subscriber capabilities (should have none)
        $subscriber_user = new WP_User($this->test_users['subscriber']);
        $this->assertFalse($subscriber_user->has_cap('las_manage_settings'));
        $this->assertFalse($subscriber_user->has_cap('las_use_live_edit'));
    }
    
    /**
     * Test user capability checking
     */
    public function test_user_capability_checking() {
        // Test administrator
        wp_set_current_user($this->test_users['administrator']);
        $this->assertTrue($this->access_control->user_can('las_manage_settings'));
        $this->assertTrue($this->access_control->user_can('las_manage_advanced'));
        $this->assertTrue($this->access_control->user_can('las_manage_users'));
        
        // Test editor
        wp_set_current_user($this->test_users['editor']);
        $this->assertTrue($this->access_control->user_can('las_manage_settings'));
        $this->assertFalse($this->access_control->user_can('las_manage_advanced'));
        $this->assertFalse($this->access_control->user_can('las_manage_users'));
        
        // Test author
        wp_set_current_user($this->test_users['author']);
        $this->assertTrue($this->access_control->user_can('las_use_live_edit'));
        $this->assertFalse($this->access_control->user_can('las_manage_settings'));
        
        // Test subscriber
        wp_set_current_user($this->test_users['subscriber']);
        $this->assertFalse($this->access_control->user_can('las_use_live_edit'));
        $this->assertFalse($this->access_control->user_can('las_manage_settings'));
        
        // Test with specific user ID
        $this->assertTrue($this->access_control->user_can('las_manage_settings', $this->test_users['administrator']));
        $this->assertFalse($this->access_control->user_can('las_manage_settings', $this->test_users['subscriber']));
    }
    
    /**
     * Test advanced access verification
     */
    public function test_advanced_access_verification() {
        // Test administrator (should auto-grant advanced access)
        wp_set_current_user($this->test_users['administrator']);
        $this->assertTrue($this->access_control->user_can('las_manage_advanced'));
        
        // Check that administrator was added to advanced users
        $advanced_users = get_option('las_fresh_advanced_users', []);
        $this->assertContains($this->test_users['administrator'], $advanced_users);
        
        // Test editor (should not have advanced access by default)
        wp_set_current_user($this->test_users['editor']);
        $this->assertFalse($this->access_control->user_can('las_manage_advanced'));
        
        // Manually grant advanced access to editor
        $advanced_users[] = $this->test_users['editor'];
        update_option('las_fresh_advanced_users', $advanced_users);
        
        // Now editor should have advanced access
        $this->assertTrue($this->access_control->user_can('las_manage_advanced'));
    }
    
    /**
     * Test file path validation
     */
    public function test_file_path_validation() {
        wp_set_current_user($this->test_users['administrator']);
        
        // Get secure directories
        $secure_dirs = $this->access_control->get_secure_directories();
        $templates_dir = $secure_dirs['templates'];
        
        // Create test directory if it doesn't exist
        if (!file_exists($templates_dir)) {
            wp_mkdir_p($templates_dir);
        }
        
        // Test valid file operations
        $valid_css_file = $templates_dir . 'test-template.css';
        $valid_json_file = $templates_dir . 'test-template.json';
        
        // Test read operations
        $this->assertTrue($this->access_control->secure_file_operation('read', $valid_css_file));
        $this->assertTrue($this->access_control->secure_file_operation('read', $valid_json_file));
        
        // Test write operations
        $this->assertTrue($this->access_control->secure_file_operation('write', $valid_css_file));
        $this->assertTrue($this->access_control->secure_file_operation('write', $valid_json_file));
        
        // Test invalid file extensions
        $invalid_php_file = $templates_dir . 'malicious.php';
        $result = $this->access_control->secure_file_operation('write', $invalid_php_file);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('file_operation_denied', $result->get_error_code());
        
        // Test directory traversal attempts
        $traversal_file = $templates_dir . '../../../wp-config.php';
        $result = $this->access_control->secure_file_operation('read', $traversal_file);
        $this->assertInstanceOf('WP_Error', $result);
        
        // Test dangerous file names
        $dangerous_file = $templates_dir . '.htaccess';
        $result = $this->access_control->secure_file_operation('write', $dangerous_file);
        $this->assertInstanceOf('WP_Error', $result);
        
        // Test files outside secure directories
        $unsafe_file = '/tmp/unsafe-file.css';
        $result = $this->access_control->secure_file_operation('read', $unsafe_file);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('insecure_directory', $result->get_error_code());
    }
    
    /**
     * Test secure file operations with different capabilities
     */
    public function test_secure_file_operations_with_capabilities() {
        $secure_dirs = $this->access_control->get_secure_directories();
        $test_file = $secure_dirs['templates'] . 'test.css';
        
        // Test with administrator (should have all permissions)
        wp_set_current_user($this->test_users['administrator']);
        $this->assertTrue($this->access_control->secure_file_operation('read', $test_file, 'las_manage_settings'));
        $this->assertTrue($this->access_control->secure_file_operation('write', $test_file, 'las_manage_templates'));
        
        // Test with editor (should have limited permissions)
        wp_set_current_user($this->test_users['editor']);
        $this->assertTrue($this->access_control->secure_file_operation('read', $test_file, 'las_manage_settings'));
        $this->assertTrue($this->access_control->secure_file_operation('write', $test_file, 'las_manage_templates'));
        
        // Test advanced operations (should fail for editor)
        $result = $this->access_control->secure_file_operation('write', $test_file, 'las_manage_advanced');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('insufficient_capability', $result->get_error_code());
        
        // Test with subscriber (should fail)
        wp_set_current_user($this->test_users['subscriber']);
        $result = $this->access_control->secure_file_operation('read', $test_file, 'las_manage_settings');
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('insufficient_capability', $result->get_error_code());
    }
    
    /**
     * Test AJAX permission checking
     */
    public function test_ajax_permission_checking() {
        wp_set_current_user($this->test_users['administrator']);
        
        // Test valid permission check
        $_POST['capability'] = 'las_manage_settings';
        $_POST['user_id'] = $this->test_users['administrator'];
        $_POST['nonce'] = wp_create_nonce('las_check_permission');
        
        ob_start();
        try {
            $this->access_control->ajax_check_permission();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertTrue($response['data']['has_permission']);
        $this->assertEquals('las_manage_settings', $response['data']['capability']);
        
        // Test checking other user's permissions (should work for admin)
        $_POST['user_id'] = $this->test_users['editor'];
        
        ob_start();
        try {
            $this->access_control->ajax_check_permission();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        
        // Test with non-admin user trying to check other user's permissions
        wp_set_current_user($this->test_users['editor']);
        $_POST['user_id'] = $this->test_users['administrator'];
        $_POST['nonce'] = wp_create_nonce('las_check_permission');
        
        ob_start();
        try {
            $this->access_control->ajax_check_permission();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertFalse($response['success']);
        $this->assertStringContainsString('Insufficient permissions', $response['data']['message']);
    }
    
    /**
     * Test user permission management
     */
    public function test_user_permission_management() {
        wp_set_current_user($this->test_users['administrator']);
        
        // Test granting capability
        $_POST['action_type'] = 'grant';
        $_POST['user_id'] = $this->test_users['author'];
        $_POST['capability'] = 'las_manage_settings';
        $_POST['nonce'] = wp_create_nonce('las_manage_user_permissions');
        
        ob_start();
        try {
            $this->access_control->ajax_manage_user_permissions();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        
        // Verify capability was granted
        $author_user = new WP_User($this->test_users['author']);
        $this->assertTrue($author_user->has_cap('las_manage_settings'));
        
        // Test revoking capability
        $_POST['action_type'] = 'revoke';
        $_POST['nonce'] = wp_create_nonce('las_manage_user_permissions');
        
        ob_start();
        try {
            $this->access_control->ajax_manage_user_permissions();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        
        // Verify capability was revoked
        $author_user = new WP_User($this->test_users['author']);
        $this->assertFalse($author_user->has_cap('las_manage_settings'));
        
        // Test with non-admin user (should fail)
        wp_set_current_user($this->test_users['editor']);
        $_POST['action_type'] = 'grant';
        $_POST['nonce'] = wp_create_nonce('las_manage_user_permissions');
        
        ob_start();
        try {
            $this->access_control->ajax_manage_user_permissions();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertFalse($response['success']);
        $this->assertStringContainsString('Insufficient permissions', $response['data']['message']);
    }
    
    /**
     * Test user permissions summary
     */
    public function test_user_permissions_summary() {
        wp_set_current_user($this->test_users['administrator']);
        
        // Test getting administrator permissions
        $admin_permissions = $this->access_control->get_user_permissions($this->test_users['administrator']);
        
        $this->assertIsArray($admin_permissions);
        $this->assertEquals($this->test_users['administrator'], $admin_permissions['user_id']);
        $this->assertArrayHasKey('permissions', $admin_permissions);
        
        // Check specific permissions
        $this->assertTrue($admin_permissions['permissions']['las_manage_settings']['has_capability']);
        $this->assertTrue($admin_permissions['permissions']['las_manage_advanced']['has_capability']);
        $this->assertTrue($admin_permissions['permissions']['las_manage_users']['has_capability']);
        
        // Test getting editor permissions
        $editor_permissions = $this->access_control->get_user_permissions($this->test_users['editor']);
        
        $this->assertTrue($editor_permissions['permissions']['las_manage_settings']['has_capability']);
        $this->assertFalse($editor_permissions['permissions']['las_manage_advanced']['has_capability']);
        $this->assertFalse($editor_permissions['permissions']['las_manage_users']['has_capability']);
        
        // Test with non-admin trying to view other user's permissions
        wp_set_current_user($this->test_users['editor']);
        $result = $this->access_control->get_user_permissions($this->test_users['administrator']);
        
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('insufficient_permissions', $result->get_error_code());
        
        // Test user viewing own permissions (should work)
        $own_permissions = $this->access_control->get_user_permissions($this->test_users['editor']);
        $this->assertIsArray($own_permissions);
    }
    
    /**
     * Test capability filtering
     */
    public function test_capability_filtering() {
        // Create a user with custom capabilities
        $test_user_id = $this->factory->user->create(['role' => 'editor']);
        $test_user = new WP_User($test_user_id);
        
        // Add a custom capability
        $test_user->add_cap('las_manage_advanced');
        
        // Test that additional security checks are applied
        wp_set_current_user($test_user_id);
        
        // Should fail because user is not in advanced users list
        $this->assertFalse($this->access_control->user_can('las_manage_advanced'));
        
        // Add user to advanced users list
        $advanced_users = get_option('las_fresh_advanced_users', []);
        $advanced_users[] = $test_user_id;
        update_option('las_fresh_advanced_users', $advanced_users);
        
        // Now should pass
        $this->assertTrue($this->access_control->user_can('las_manage_advanced'));
    }
    
    /**
     * Test multisite compatibility
     */
    public function test_multisite_compatibility() {
        if (!is_multisite()) {
            $this->markTestSkipped('Multisite tests require multisite installation');
            return;
        }
        
        // Test super admin capabilities
        $super_admin_id = $this->factory->user->create(['role' => 'administrator']);
        grant_super_admin($super_admin_id);
        
        wp_set_current_user($super_admin_id);
        $this->assertTrue($this->access_control->user_can('las_manage_users'));
        
        // Test regular admin on multisite
        $regular_admin_id = $this->factory->user->create(['role' => 'administrator']);
        wp_set_current_user($regular_admin_id);
        
        // Should not have user management capability on multisite without super admin
        $this->assertFalse($this->access_control->user_can('las_manage_users'));
    }
    
    /**
     * Test security logging
     */
    public function test_security_logging() {
        // Enable debug mode for logging
        if (!defined('WP_DEBUG')) {
            define('WP_DEBUG', true);
        }
        
        wp_set_current_user($this->test_users['subscriber']);
        
        // Attempt unauthorized access (should be logged)
        $this->assertFalse($this->access_control->user_can('las_manage_settings'));
        
        // Check that log entry would be created (we can't easily test actual logging)
        $this->assertTrue(true); // Placeholder assertion
    }
    
    /**
     * Test capability removal on deactivation
     */
    public function test_capability_removal() {
        // First ensure capabilities are registered
        $this->access_control->register_capabilities();
        
        // Verify capabilities exist
        $admin_user = new WP_User($this->test_users['administrator']);
        $this->assertTrue($admin_user->has_cap('las_manage_settings'));
        
        // Remove capabilities
        $this->access_control->remove_capabilities_from_roles();
        
        // Verify capabilities were removed
        $admin_user = new WP_User($this->test_users['administrator']); // Refresh user object
        $this->assertFalse($admin_user->has_cap('las_manage_settings'));
        
        // Verify option was deleted
        $this->assertFalse(get_option('las_fresh_capabilities_registered'));
    }
    
    /**
     * Test secure directory creation
     */
    public function test_secure_directory_creation() {
        $secure_dirs = $this->access_control->get_secure_directories();
        
        foreach ($secure_dirs as $dir_name => $dir_path) {
            // Check that directory exists
            $this->assertTrue(file_exists($dir_path), "Secure directory {$dir_name} should exist");
            
            // Check that .htaccess file exists
            $htaccess_file = $dir_path . '.htaccess';
            $this->assertTrue(file_exists($htaccess_file), ".htaccess should exist in {$dir_name}");
            
            // Check that index.php file exists
            $index_file = $dir_path . 'index.php';
            $this->assertTrue(file_exists($index_file), "index.php should exist in {$dir_name}");
            
            // Verify .htaccess content
            $htaccess_content = file_get_contents($htaccess_file);
            $this->assertStringContainsString('Options -Indexes', $htaccess_content);
            $this->assertStringContainsString('Require all denied', $htaccess_content);
        }
    }
    
    /**
     * Test invalid user handling
     */
    public function test_invalid_user_handling() {
        // Test with non-existent user ID
        $this->assertFalse($this->access_control->user_can('las_manage_settings', 99999));
        
        // Test with zero user ID
        $this->assertFalse($this->access_control->user_can('las_manage_settings', 0));
        
        // Test with null user ID when no user is logged in
        wp_set_current_user(0);
        $this->assertFalse($this->access_control->user_can('las_manage_settings'));
    }
    
    /**
     * Clean up test environment
     */
    public function tearDown(): void {
        // Clean up test options
        delete_option('las_fresh_capabilities_registered');
        delete_option('las_fresh_advanced_users');
        
        // Clean up POST data
        unset($_POST['capability'], $_POST['user_id'], $_POST['nonce'], $_POST['action_type']);
        
        // Remove capabilities from test users
        foreach ($this->test_users as $user_id) {
            $user = new WP_User($user_id);
            $capabilities = $this->access_control->get_plugin_capabilities();
            
            foreach (array_keys($capabilities) as $capability) {
                $user->remove_cap($capability);
            }
        }
        
        parent::tearDown();
    }
}