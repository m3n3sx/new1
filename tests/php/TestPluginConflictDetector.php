<?php
/**
 * Plugin Conflict Detector Tests
 * 
 * Tests for the plugin conflict detection and resolution system.
 *
 * @package LiveAdminStyler
 * @subpackage Tests
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Test class for Plugin Conflict Detector
 */
class TestPluginConflictDetector extends WP_UnitTestCase {
    
    /**
     * Plugin conflict detector instance
     * @var LAS_PluginConflictDetector
     */
    private $conflict_detector;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        $this->conflict_detector = new LAS_PluginConflictDetector();
        
        // Create admin user
        $admin_user = $this->factory->user->create(['role' => 'administrator']);
        wp_set_current_user($admin_user);
    }
    
    /**
     * Test conflict detection initialization
     */
    public function test_conflict_detection_initialization() {
        // Test that hooks are properly registered
        $this->assertGreaterThan(0, has_action('admin_init', [$this->conflict_detector, 'detect_conflicts']));
        $this->assertGreaterThan(0, has_action('admin_notices', [$this->conflict_detector, 'display_conflict_notices']));
        $this->assertGreaterThan(0, has_action('wp_ajax_las_resolve_conflict', [$this->conflict_detector, 'handle_conflict_resolution']));
    }
    
    /**
     * Test known conflicts detection
     */
    public function test_known_conflicts_detection() {
        // Mock active plugins
        $active_plugins = [
            'admin-color-schemes/admin-color-schemes.php',
            'wp-admin-ui-customize/wp-admin-ui-customize.php'
        ];
        
        // Mock is_plugin_active function
        add_filter('option_active_plugins', function() use ($active_plugins) {
            return $active_plugins;
        });
        
        // Trigger conflict detection
        $this->conflict_detector->detect_conflicts();
        
        // Check that conflicts were detected
        $detected_conflicts = get_option('las_fresh_detected_conflicts', []);
        
        $this->assertArrayHasKey('admin-color-schemes/admin-color-schemes.php', $detected_conflicts);
        $this->assertArrayHasKey('wp-admin-ui-customize/wp-admin-ui-customize.php', $detected_conflicts);
        
        // Verify conflict details
        $color_scheme_conflict = $detected_conflicts['admin-color-schemes/admin-color-schemes.php'];
        $this->assertEquals('Admin Color Schemes', $color_scheme_conflict['name']);
        $this->assertEquals('styling', $color_scheme_conflict['type']);
        $this->assertEquals('medium', $color_scheme_conflict['severity']);
        
        $admin_ui_conflict = $detected_conflicts['wp-admin-ui-customize/wp-admin-ui-customize.php'];
        $this->assertEquals('WP Admin UI Customize', $admin_ui_conflict['name']);
        $this->assertEquals('admin_ui', $admin_ui_conflict['type']);
        $this->assertEquals('high', $admin_ui_conflict['severity']);
    }
    
    /**
     * Test CSS conflict detection
     */
    public function test_css_conflict_detection() {
        global $wp_styles;
        
        // Initialize WP_Styles if not already done
        if (!$wp_styles instanceof WP_Styles) {
            $wp_styles = new WP_Styles();
        }
        
        // Register conflicting styles
        $wp_styles->add('admin-color-scheme-test', '/test/admin-color-scheme.css');
        $wp_styles->add('custom-admin-css-test', '/test/custom-admin.css');
        $wp_styles->add('safe-style-test', '/test/safe-style.css');
        
        // Trigger conflict detection
        $this->conflict_detector->detect_conflicts();
        
        // Check detected conflicts
        $detected_conflicts = get_option('las_fresh_detected_conflicts', []);
        
        // Should detect CSS conflicts
        $css_conflicts = array_filter($detected_conflicts, function($conflict) {
            return $conflict['type'] === 'css';
        });
        
        $this->assertGreaterThan(0, count($css_conflicts), 'CSS conflicts should be detected');
        
        // Verify conflict details
        foreach ($css_conflicts as $conflict) {
            $this->assertEquals('css', $conflict['type']);
            $this->assertEquals('medium', $conflict['severity']);
            $this->assertStringContainsString('CSS Conflict:', $conflict['name']);
        }
    }
    
    /**
     * Test JavaScript conflict detection
     */
    public function test_javascript_conflict_detection() {
        global $wp_scripts;
        
        // Initialize WP_Scripts if not already done
        if (!$wp_scripts instanceof WP_Scripts) {
            $wp_scripts = new WP_Scripts();
        }
        
        // Register conflicting scripts
        $wp_scripts->add('admin-ui-test', '/test/admin-ui.js');
        $wp_scripts->add('custom-admin-test', '/test/custom-admin.js');
        $wp_scripts->add('las-safe-script', '/test/las-safe.js'); // Should not conflict
        
        // Trigger conflict detection
        $this->conflict_detector->detect_conflicts();
        
        // Check detected conflicts
        $detected_conflicts = get_option('las_fresh_detected_conflicts', []);
        
        // Should detect JS conflicts
        $js_conflicts = array_filter($detected_conflicts, function($conflict) {
            return $conflict['type'] === 'javascript';
        });
        
        $this->assertGreaterThan(0, count($js_conflicts), 'JavaScript conflicts should be detected');
        
        // Verify LAS scripts are not flagged as conflicts
        $las_conflicts = array_filter($js_conflicts, function($conflict) {
            return strpos($conflict['name'], 'las-') !== false;
        });
        
        $this->assertEquals(0, count($las_conflicts), 'LAS scripts should not be flagged as conflicts');
    }
    
    /**
     * Test conflict report generation
     */
    public function test_conflict_report_generation() {
        // Set up test conflicts
        $test_conflicts = [
            'test-plugin-1/test-plugin-1.php' => [
                'name' => 'Test Plugin 1',
                'type' => 'styling',
                'severity' => 'high'
            ],
            'test-plugin-2/test-plugin-2.php' => [
                'name' => 'Test Plugin 2',
                'type' => 'admin_ui',
                'severity' => 'medium'
            ],
            'test-plugin-3/test-plugin-3.php' => [
                'name' => 'Test Plugin 3',
                'type' => 'menu',
                'severity' => 'low'
            ]
        ];
        
        update_option('las_fresh_detected_conflicts', $test_conflicts);
        update_option('las_fresh_ignored_conflicts', ['ignored-plugin/ignored.php']);
        
        // Generate report
        $report = $this->conflict_detector->get_conflict_report();
        
        // Verify report structure
        $this->assertArrayHasKey('detected', $report);
        $this->assertArrayHasKey('ignored', $report);
        $this->assertArrayHasKey('total_detected', $report);
        $this->assertArrayHasKey('high_severity', $report);
        $this->assertArrayHasKey('medium_severity', $report);
        $this->assertArrayHasKey('low_severity', $report);
        
        // Verify report data
        $this->assertEquals(3, $report['total_detected']);
        $this->assertEquals(1, $report['high_severity']);
        $this->assertEquals(1, $report['medium_severity']);
        $this->assertEquals(1, $report['low_severity']);
        $this->assertContains('ignored-plugin/ignored.php', $report['ignored']);
    }
    
    /**
     * Test conflict resolution - styling conflicts
     */
    public function test_styling_conflict_resolution() {
        // Set up styling conflict
        $conflicts = [
            'admin-color-schemes/admin-color-schemes.php' => [
                'name' => 'Admin Color Schemes',
                'type' => 'styling',
                'severity' => 'medium'
            ]
        ];
        
        update_option('las_fresh_detected_conflicts', $conflicts);
        
        // Mock AJAX request
        $_POST['plugin'] = 'admin-color-schemes/admin-color-schemes.php';
        $_POST['resolution_action'] = 'auto_resolve';
        $_POST['nonce'] = wp_create_nonce('las_resolve_conflict');
        
        // Capture output
        ob_start();
        try {
            $this->conflict_detector->handle_conflict_resolution();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        $output = ob_get_clean();
        
        // Verify conflict was resolved
        $remaining_conflicts = get_option('las_fresh_detected_conflicts', []);
        $this->assertArrayNotHasKey('admin-color-schemes/admin-color-schemes.php', $remaining_conflicts);
        
        // Verify response
        $response = json_decode($output, true);
        $this->assertTrue($response['success']);
        $this->assertStringContainsString('Styling conflict resolved', $response['data']['message']);
    }
    
    /**
     * Test conflict resolution - admin UI conflicts
     */
    public function test_admin_ui_conflict_resolution() {
        // Set up admin UI conflict
        $conflicts = [
            'wp-admin-ui-customize/wp-admin-ui-customize.php' => [
                'name' => 'WP Admin UI Customize',
                'type' => 'admin_ui',
                'severity' => 'high'
            ]
        ];
        
        update_option('las_fresh_detected_conflicts', $conflicts);
        
        // Mock AJAX request
        $_POST['plugin'] = 'wp-admin-ui-customize/wp-admin-ui-customize.php';
        $_POST['resolution_action'] = 'auto_resolve';
        $_POST['nonce'] = wp_create_nonce('las_resolve_conflict');
        
        // Capture output
        ob_start();
        try {
            $this->conflict_detector->handle_conflict_resolution();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        $output = ob_get_clean();
        
        // Verify compatibility mode was enabled
        $this->assertTrue(get_option('las_fresh_compatibility_mode'));
        
        // Verify conflict was resolved
        $remaining_conflicts = get_option('las_fresh_detected_conflicts', []);
        $this->assertArrayNotHasKey('wp-admin-ui-customize/wp-admin-ui-customize.php', $remaining_conflicts);
    }
    
    /**
     * Test conflict ignoring
     */
    public function test_conflict_ignoring() {
        // Set up test conflict
        $conflicts = [
            'test-plugin/test-plugin.php' => [
                'name' => 'Test Plugin',
                'type' => 'menu',
                'severity' => 'low'
            ]
        ];
        
        update_option('las_fresh_detected_conflicts', $conflicts);
        
        // Mock AJAX request to ignore conflict
        $_POST['plugin'] = 'test-plugin/test-plugin.php';
        $_POST['resolution_action'] = 'ignore';
        $_POST['nonce'] = wp_create_nonce('las_resolve_conflict');
        
        // Handle conflict resolution
        ob_start();
        try {
            $this->conflict_detector->handle_conflict_resolution();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        ob_get_clean();
        
        // Verify conflict was removed from detected list
        $remaining_conflicts = get_option('las_fresh_detected_conflicts', []);
        $this->assertArrayNotHasKey('test-plugin/test-plugin.php', $remaining_conflicts);
        
        // Verify conflict was added to ignored list
        $ignored_conflicts = get_option('las_fresh_ignored_conflicts', []);
        $this->assertContains('test-plugin/test-plugin.php', $ignored_conflicts);
    }
    
    /**
     * Test low priority conflict dismissal
     */
    public function test_low_priority_conflict_dismissal() {
        // Mock AJAX request to dismiss low priority conflicts
        $_POST['resolution_action'] = 'dismiss_low';
        $_POST['nonce'] = wp_create_nonce('las_resolve_conflict');
        
        // Handle conflict resolution
        ob_start();
        try {
            $this->conflict_detector->handle_conflict_resolution();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_success
        }
        ob_get_clean();
        
        // Verify user meta was set
        $dismissed = get_user_meta(get_current_user_id(), 'las_dismissed_low_conflicts', true);
        $this->assertTrue($dismissed);
    }
    
    /**
     * Test conflict notice display permissions
     */
    public function test_conflict_notice_permissions() {
        // Set up conflicts
        $conflicts = [
            'test-plugin/test-plugin.php' => [
                'name' => 'Test Plugin',
                'type' => 'styling',
                'severity' => 'high'
            ]
        ];
        
        update_option('las_fresh_detected_conflicts', $conflicts);
        
        // Test with admin user (should display)
        $admin_user = $this->factory->user->create(['role' => 'administrator']);
        wp_set_current_user($admin_user);
        
        ob_start();
        $this->conflict_detector->display_conflict_notices();
        $admin_output = ob_get_clean();
        
        $this->assertStringContainsString('High Priority Conflicts Detected', $admin_output);
        
        // Test with subscriber user (should not display)
        $subscriber_user = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_user);
        
        ob_start();
        $this->conflict_detector->display_conflict_notices();
        $subscriber_output = ob_get_clean();
        
        $this->assertEmpty($subscriber_output);
    }
    
    /**
     * Test AJAX security
     */
    public function test_ajax_security() {
        // Test without nonce
        $_POST['plugin'] = 'test-plugin/test-plugin.php';
        $_POST['resolution_action'] = 'auto_resolve';
        unset($_POST['nonce']);
        
        ob_start();
        try {
            $this->conflict_detector->handle_conflict_resolution();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_die
        }
        $output = ob_get_clean();
        
        // Should fail without nonce
        $this->assertStringContainsString('Security check failed', $output);
        
        // Test with invalid nonce
        $_POST['nonce'] = 'invalid_nonce';
        
        ob_start();
        try {
            $this->conflict_detector->handle_conflict_resolution();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_die
        }
        $output = ob_get_clean();
        
        // Should fail with invalid nonce
        $this->assertStringContainsString('Security check failed', $output);
        
        // Test with subscriber user (insufficient permissions)
        $subscriber_user = $this->factory->user->create(['role' => 'subscriber']);
        wp_set_current_user($subscriber_user);
        $_POST['nonce'] = wp_create_nonce('las_resolve_conflict');
        
        ob_start();
        try {
            $this->conflict_detector->handle_conflict_resolution();
        } catch (WPAjaxDieStopException $e) {
            // Expected for wp_send_json_error
        }
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertFalse($response['success']);
        $this->assertEquals('Insufficient permissions', $response['data']['message']);
    }
    
    /**
     * Test conflict clearing
     */
    public function test_conflict_clearing() {
        // Set up test data
        update_option('las_fresh_detected_conflicts', ['test' => 'data']);
        update_option('las_fresh_ignored_conflicts', ['ignored' => 'data']);
        update_user_meta(get_current_user_id(), 'las_dismissed_low_conflicts', true);
        
        // Clear all conflicts
        $this->conflict_detector->clear_all_conflicts();
        
        // Verify data was cleared
        $this->assertFalse(get_option('las_fresh_detected_conflicts'));
        $this->assertFalse(get_option('las_fresh_ignored_conflicts'));
        $this->assertEmpty(get_user_meta(get_current_user_id(), 'las_dismissed_low_conflicts', true));
    }
    
    /**
     * Clean up test environment
     */
    public function tearDown(): void {
        // Clean up test options
        delete_option('las_fresh_detected_conflicts');
        delete_option('las_fresh_ignored_conflicts');
        delete_option('las_fresh_compatibility_mode');
        delete_user_meta(get_current_user_id(), 'las_dismissed_low_conflicts');
        
        // Clean up POST data
        unset($_POST['plugin'], $_POST['resolution_action'], $_POST['nonce']);
        
        parent::tearDown();
    }
}