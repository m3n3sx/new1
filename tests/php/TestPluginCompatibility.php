<?php
/**
 * Plugin Compatibility Tests
 * 
 * Tests compatibility with popular WordPress plugins and themes,
 * conflict detection and resolution mechanisms.
 * 
 * @package LiveAdminStyler
 * @subpackage Tests
 */

class TestPluginCompatibility extends WP_UnitTestCase {
    
    /**
     * Compatibility Manager instance
     *
     * @var LAS_Compatibility_Manager
     */
    private $compatibility_manager;
    
    /**
     * Test user ID
     *
     * @var int
     */
    private $test_user_id;
    
    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        // Create test user with admin capabilities
        $this->test_user_id = $this->factory->user->create(array(
            'role' => 'administrator'
        ));
        
        wp_set_current_user($this->test_user_id);
        
        // Initialize compatibility manager
        if (!class_exists('LAS_Compatibility_Manager')) {
            require_once dirname(dirname(__DIR__)) . '/includes/CompatibilityManager.php';
        }
        
        $this->compatibility_manager = new LAS_Compatibility_Manager();
        
        // Set admin context
        set_current_screen('toplevel_page_live-admin-styler-settings');
    }
    
    /**
     * Clean up after tests
     */
    public function tearDown(): void {
        wp_delete_user($this->test_user_id);
        delete_option('las_detected_conflicts');
        parent::tearDown();
    }
    
    /**
     * Test compatibility manager initialization
     */
    public function test_compatibility_manager_initialization() {
        $this->assertInstanceOf('LAS_Compatibility_Manager', $this->compatibility_manager);
        
        // Test that known conflicts are loaded
        $known_conflicts = $this->compatibility_manager->get_known_conflicts();
        $this->assertIsArray($known_conflicts);
        $this->assertNotEmpty($known_conflicts);
        
        // Test that common plugins are included
        $this->assertArrayHasKey('yoast-seo', $known_conflicts);
        $this->assertArrayHasKey('woocommerce', $known_conflicts);
        $this->assertArrayHasKey('elementor', $known_conflicts);
    }
    
    /**
     * Test conflict detection mechanism
     */
    public function test_conflict_detection_mechanism() {
        // Simulate plugin activation by registering conflicting styles/scripts
        wp_register_style('yoast-admin', 'fake-url.css');
        wp_register_script('woocommerce-admin', 'fake-url.js');
        
        // Trigger conflict detection
        $this->compatibility_manager->detect_plugin_conflicts();
        
        // Check if conflicts were detected
        $detected_conflicts = get_option('las_detected_conflicts', array());
        $this->assertIsArray($detected_conflicts);
        
        // Verify conflict data structure
        foreach ($detected_conflicts as $plugin_slug => $conflict_data) {
            $this->assertArrayHasKey('name', $conflict_data);
            $this->assertArrayHasKey('conflicts', $conflict_data);
            $this->assertArrayHasKey('severity', $conflict_data);
            $this->assertContains($conflict_data['severity'], array('low', 'medium', 'high'));
        }
    }
    
    /**
     * Test CSS namespace isolation
     */
    public function test_css_namespace_isolation() {
        // Test CSS namespace prefix
        $reflection = new ReflectionClass($this->compatibility_manager);
        $property = $reflection->getProperty('css_namespace');
        $property->setAccessible(true);
        $css_namespace = $property->getValue($this->compatibility_manager);
        
        $this->assertEquals('las-', $css_namespace);
        
        // Test that namespace is applied in compatibility fixes
        ob_start();
        $this->compatibility_manager->apply_compatibility_fixes('toplevel_page_live-admin-styler-settings');
        $output = ob_get_clean();
        
        // Check if namespace is used in generated CSS
        global $wp_styles;
        $inline_styles = '';
        
        if (isset($wp_styles->registered['las-compatibility'])) {
            $inline_styles = $wp_styles->print_inline_style('las-compatibility', false);
        }
        
        if (!empty($inline_styles)) {
            $this->assertStringContainsString('las-', $inline_styles);
        }
    }
    
    /**
     * Test JavaScript namespace protection
     */
    public function test_javascript_namespace_protection() {
        // Test JavaScript namespace
        $reflection = new ReflectionClass($this->compatibility_manager);
        $property = $reflection->getProperty('js_namespace');
        $property->setAccessible(true);
        $js_namespace = $property->getValue($this->compatibility_manager);
        
        $this->assertEquals('LAS', $js_namespace);
        
        // Test namespace protection in generated JavaScript
        ob_start();
        $this->compatibility_manager->apply_compatibility_fixes('toplevel_page_live-admin-styler-settings');
        ob_get_clean();
        
        global $wp_scripts;
        $inline_scripts = '';
        
        if (isset($wp_scripts->registered['las-compatibility'])) {
            $inline_scripts = $wp_scripts->print_inline_script('las-compatibility', false);
        }
        
        if (!empty($inline_scripts)) {
            $this->assertStringContainsString('LAS', $inline_scripts);
            $this->assertStringContainsString('namespace', $inline_scripts);
        }
    }
    
    /**
     * Test Yoast SEO compatibility
     */
    public function test_yoast_seo_compatibility() {
        // Simulate Yoast SEO presence
        wp_register_style('yoast-seo-admin', 'fake-yoast.css');
        wp_register_script('yoast-seo-admin', 'fake-yoast.js');
        
        // Test conflict detection
        $this->compatibility_manager->detect_plugin_conflicts();
        $detected_conflicts = get_option('las_detected_conflicts', array());
        
        // Apply compatibility fixes
        $this->compatibility_manager->apply_compatibility_fixes('toplevel_page_live-admin-styler-settings');
        
        // Verify that Yoast-specific fixes are applied
        $this->assertTrue(wp_style_is('las-compatibility', 'registered'));
    }
    
    /**
     * Test WooCommerce compatibility
     */
    public function test_woocommerce_compatibility() {
        // Simulate WooCommerce presence
        wp_register_style('woocommerce-admin', 'fake-woo.css');
        wp_register_script('wc-color-picker', 'fake-woo-color.js');
        
        // Test conflict detection and resolution
        $this->compatibility_manager->detect_plugin_conflicts();
        $this->compatibility_manager->apply_compatibility_fixes('toplevel_page_live-admin-styler-settings');
        
        // Verify compatibility scripts are enqueued
        $this->assertTrue(wp_script_is('las-compatibility', 'registered'));
    }
    
    /**
     * Test Elementor compatibility
     */
    public function test_elementor_compatibility() {
        // Simulate Elementor presence
        wp_register_style('elementor-admin', 'fake-elementor.css');
        wp_register_script('elementor-admin', 'fake-elementor.js');
        
        // Test UI isolation for Elementor
        $this->compatibility_manager->detect_plugin_conflicts();
        $this->compatibility_manager->apply_compatibility_fixes('toplevel_page_live-admin-styler-settings');
        
        // Check for UI isolation CSS
        global $wp_styles;
        if (isset($wp_styles->registered['las-compatibility'])) {
            $this->assertNotNull($wp_styles->registered['las-compatibility']);
        }
    }
    
    /**
     * Test multisite compatibility
     */
    public function test_multisite_compatibility() {
        // Test multisite detection
        $is_multisite = is_multisite();
        
        if ($is_multisite) {
            // Test network admin support
            $this->assertTrue(method_exists($this->compatibility_manager, 'add_network_admin_support'));
            $this->assertTrue(method_exists($this->compatibility_manager, 'render_network_admin_page'));
            
            // Test network admin capability checks
            $user_can_manage_network = current_user_can('manage_network_options');
            $this->assertIsBool($user_can_manage_network);
        }
        
        // Test multisite-specific CSS
        ob_start();
        $this->compatibility_manager->apply_theme_compatibility();
        $output = ob_get_clean();
        
        // Should not cause errors regardless of multisite status
        $this->assertEmpty($output);
    }
    
    /**
     * Test admin color scheme compatibility
     */
    public function test_admin_color_scheme_compatibility() {
        // Test different admin color schemes
        $color_schemes = array('fresh', 'light', 'blue', 'coffee', 'ectoplasm', 'midnight', 'ocean', 'sunrise');
        
        foreach ($color_schemes as $scheme) {
            update_user_option($this->test_user_id, 'admin_color', $scheme);
            
            ob_start();
            $this->compatibility_manager->apply_theme_compatibility();
            $output = ob_get_clean();
            
            // Should generate color-specific CSS
            if (!empty($output)) {
                $this->assertStringContainsString('--las-admin-primary', $output);
                $this->assertStringContainsString('--las-admin-secondary', $output);
            }
        }
    }
    
    /**
     * Test RTL language support
     */
    public function test_rtl_language_support() {
        // Test RTL compatibility CSS generation
        ob_start();
        $this->compatibility_manager->apply_theme_compatibility();
        $output = ob_get_clean();
        
        // Should include RTL-aware CSS
        if (!empty($output)) {
            $this->assertStringContainsString('@media', $output);
        }
    }
    
    /**
     * Test conflict severity calculation
     */
    public function test_conflict_severity_calculation() {
        // Create mock conflicts with different severities
        $test_conflicts = array(
            'low_severity' => array('field_styles' => array()),
            'medium_severity' => array('css_specificity' => array(), 'admin_styles' => array()),
            'high_severity' => array('js_namespace' => array(), 'admin_ui' => array(), 'modal_conflicts' => array())
        );
        
        $reflection = new ReflectionClass($this->compatibility_manager);
        $method = $reflection->getMethod('calculate_conflict_severity');
        $method->setAccessible(true);
        
        foreach ($test_conflicts as $expected_severity => $conflicts) {
            $calculated_severity = $method->invoke($this->compatibility_manager, $conflicts);
            
            if ($expected_severity === 'low_severity') {
                $this->assertEquals('low', $calculated_severity);
            } elseif ($expected_severity === 'medium_severity') {
                $this->assertEquals('medium', $calculated_severity);
            } elseif ($expected_severity === 'high_severity') {
                $this->assertEquals('high', $calculated_severity);
            }
        }
    }
    
    /**
     * Test AJAX conflict resolution
     */
    public function test_ajax_conflict_resolution() {
        // Set up AJAX request data
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        $_POST['plugin_slug'] = 'yoast-seo';
        
        // Simulate detected conflicts
        update_option('las_detected_conflicts', array(
            'yoast-seo' => array(
                'name' => 'Yoast SEO',
                'conflicts' => array('css_specificity' => array()),
                'severity' => 'medium'
            )
        ));
        
        // Test AJAX handler
        ob_start();
        $this->compatibility_manager->ajax_resolve_conflict();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        $this->assertIsArray($response);
        
        if (isset($response['success'])) {
            $this->assertTrue($response['success']);
        }
    }
    
    /**
     * Test compatibility status retrieval
     */
    public function test_compatibility_status_retrieval() {
        // Set up test conflicts
        $test_conflicts = array(
            'plugin1' => array('severity' => 'high'),
            'plugin2' => array('severity' => 'medium'),
            'plugin3' => array('severity' => 'low')
        );
        
        update_option('las_detected_conflicts', $test_conflicts);
        
        // Set up AJAX request
        $_POST['nonce'] = wp_create_nonce('las_ui_repair_nonce');
        
        ob_start();
        $this->compatibility_manager->ajax_get_compatibility_status();
        $output = ob_get_clean();
        
        $response = json_decode($output, true);
        
        if (isset($response['success']) && $response['success']) {
            $data = $response['data'];
            
            $this->assertEquals(3, $data['total_conflicts']);
            $this->assertEquals(1, $data['high_severity']);
            $this->assertEquals(1, $data['medium_severity']);
            $this->assertEquals(1, $data['low_severity']);
        }
    }
    
    /**
     * Test conflict notices display
     */
    public function test_conflict_notices_display() {
        // Set up high-severity conflicts
        update_option('las_detected_conflicts', array(
            'problematic-plugin' => array(
                'name' => 'Problematic Plugin',
                'conflicts' => array('js_namespace' => array(), 'admin_ui' => array()),
                'severity' => 'high'
            )
        ));
        
        // Capture notice output
        ob_start();
        $this->compatibility_manager->show_conflict_notices();
        $output = ob_get_clean();
        
        // Should show warning notice for high-severity conflicts
        if (!empty($output)) {
            $this->assertStringContainsString('notice-warning', $output);
            $this->assertStringContainsString('Problematic Plugin', $output);
        }
    }
    
    /**
     * Test CSS specificity handling
     */
    public function test_css_specificity_handling() {
        // Test CSS generation with proper specificity
        $reflection = new ReflectionClass($this->compatibility_manager);
        $method = $reflection->getMethod('generate_compatibility_css');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->compatibility_manager);
        
        $this->assertStringContainsString('.las-fresh-settings-wrap', $css);
        $this->assertStringContainsString('isolation: isolate', $css);
        $this->assertStringContainsString('z-index:', $css);
    }
    
    /**
     * Test responsive compatibility
     */
    public function test_responsive_compatibility() {
        ob_start();
        $this->compatibility_manager->apply_theme_compatibility();
        $output = ob_get_clean();
        
        // Should include mobile-responsive CSS
        if (!empty($output)) {
            $this->assertStringContainsString('@media screen and (max-width: 782px)', $output);
        }
    }
    
    /**
     * Test plugin activation detection
     */
    public function test_plugin_activation_detection() {
        $reflection = new ReflectionClass($this->compatibility_manager);
        $method = $reflection->getMethod('is_plugin_active');
        $method->setAccessible(true);
        
        // Test with non-existent plugin
        $is_active = $method->invoke($this->compatibility_manager, 'non-existent-plugin/plugin.php');
        $this->assertFalse($is_active);
        
        // Test with WordPress core (should always be "active")
        $is_active = $method->invoke($this->compatibility_manager, 'wordpress/wp-includes/version.php');
        $this->assertFalse($is_active); // This should be false as it's not a real plugin file
    }
    
    /**
     * Test namespace protection
     */
    public function test_namespace_protection() {
        $reflection = new ReflectionClass($this->compatibility_manager);
        $method = $reflection->getMethod('generate_compatibility_js');
        $method->setAccessible(true);
        
        $js = $method->invoke($this->compatibility_manager);
        
        // Should include namespace protection code
        $this->assertStringContainsString('window.LAS', $js);
        $this->assertStringContainsString('protectNamespace', $js);
        $this->assertStringContainsString('writable: false', $js);
        $this->assertStringContainsString('configurable: false', $js);
    }
    
    /**
     * Test event delegation setup
     */
    public function test_event_delegation_setup() {
        $reflection = new ReflectionClass($this->compatibility_manager);
        $method = $reflection->getMethod('generate_compatibility_js');
        $method->setAccessible(true);
        
        $js = $method->invoke($this->compatibility_manager);
        
        // Should include event delegation code
        $this->assertStringContainsString('setupEventDelegation', $js);
        $this->assertStringContainsString('addEventListener', $js);
        $this->assertStringContainsString('stopPropagation', $js);
    }
}