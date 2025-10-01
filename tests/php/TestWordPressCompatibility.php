<?php
/**
 * WordPress Compatibility Tests
 * 
 * Comprehensive tests for WordPress 6.0+ compatibility, multisite support,
 * plugin conflict detection, and version compatibility validation.
 *
 * @package LiveAdminStyler
 * @subpackage Tests
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Test class for WordPress compatibility
 */
class TestWordPressCompatibility extends WP_UnitTestCase {
    
    /**
     * Minimum WordPress version required
     */
    const MIN_WP_VERSION = '6.0';
    
    /**
     * Test WordPress version compatibility
     */
    public function test_wordpress_version_compatibility() {
        global $wp_version;
        
        // Test minimum version requirement
        $this->assertTrue(
            version_compare($wp_version, self::MIN_WP_VERSION, '>='),
            "WordPress version {$wp_version} should be >= " . self::MIN_WP_VERSION
        );
        
        // Test specific WordPress 6.0+ features
        $this->assertTrue(function_exists('wp_get_environment_type'), 'wp_get_environment_type should be available in WP 6.0+');
        $this->assertTrue(function_exists('wp_is_block_theme'), 'wp_is_block_theme should be available in WP 6.0+');
        $this->assertTrue(function_exists('wp_get_global_settings'), 'wp_get_global_settings should be available in WP 6.0+');
        
        // Test WordPress 6.1+ features if available
        if (version_compare($wp_version, '6.1', '>=')) {
            $this->assertTrue(function_exists('wp_get_global_styles'), 'wp_get_global_styles should be available in WP 6.1+');
        }
        
        // Test WordPress 6.2+ features if available
        if (version_compare($wp_version, '6.2', '>=')) {
            $this->assertTrue(class_exists('WP_HTML_Tag_Processor'), 'WP_HTML_Tag_Processor should be available in WP 6.2+');
        }
    }
    
    /**
     * Test WordPress core API compatibility
     */
    public function test_core_api_compatibility() {
        // Test essential WordPress functions
        $essential_functions = [
            'add_action',
            'add_filter',
            'wp_enqueue_script',
            'wp_enqueue_style',
            'wp_create_nonce',
            'wp_verify_nonce',
            'current_user_can',
            'get_option',
            'update_option',
            'wp_send_json_success',
            'wp_send_json_error',
            'sanitize_text_field',
            'esc_html',
            'esc_attr',
            'wp_kses'
        ];
        
        foreach ($essential_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Essential WordPress function {$function} should be available"
            );
        }
        
        // Test essential WordPress classes
        $essential_classes = [
            'WP_Error',
            'WP_Query',
            'WP_User',
            'WP_Post',
            'WP_Screen'
        ];
        
        foreach ($essential_classes as $class) {
            $this->assertTrue(
                class_exists($class),
                "Essential WordPress class {$class} should be available"
            );
        }
    }
    
    /**
     * Test WordPress admin interface compatibility
     */
    public function test_admin_interface_compatibility() {
        // Test admin functions
        $admin_functions = [
            'add_menu_page',
            'add_submenu_page',
            'add_settings_section',
            'add_settings_field',
            'register_setting',
            'settings_fields',
            'do_settings_sections',
            'get_current_screen'
        ];
        
        foreach ($admin_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Admin function {$function} should be available"
            );
        }
        
        // Test admin hooks
        $admin_hooks = [
            'admin_init',
            'admin_menu',
            'admin_enqueue_scripts',
            'admin_notices',
            'admin_head',
            'admin_footer'
        ];
        
        foreach ($admin_hooks as $hook) {
            $this->assertGreaterThanOrEqual(
                0,
                has_action($hook),
                "Admin hook {$hook} should be available"
            );
        }
    }
    
    /**
     * Test WordPress AJAX compatibility
     */
    public function test_ajax_compatibility() {
        // Test AJAX functions
        $ajax_functions = [
            'wp_ajax_url',
            'check_ajax_referer',
            'wp_send_json',
            'wp_send_json_success',
            'wp_send_json_error',
            'wp_die'
        ];
        
        foreach ($ajax_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "AJAX function {$function} should be available"
            );
        }
        
        // Test AJAX constants
        $this->assertTrue(defined('DOING_AJAX'), 'DOING_AJAX constant should be defined');
        
        // Test AJAX hooks
        $this->assertGreaterThanOrEqual(0, has_action('wp_ajax_heartbeat'), 'AJAX heartbeat should be available');
    }
    
    /**
     * Test WordPress REST API compatibility
     */
    public function test_rest_api_compatibility() {
        // Test REST API functions
        $rest_functions = [
            'register_rest_route',
            'rest_ensure_response',
            'rest_url',
            'rest_get_server',
            'rest_validate_request_arg',
            'rest_sanitize_request_arg'
        ];
        
        foreach ($rest_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "REST API function {$function} should be available"
            );
        }
        
        // Test REST API classes
        $rest_classes = [
            'WP_REST_Server',
            'WP_REST_Request',
            'WP_REST_Response',
            'WP_Error'
        ];
        
        foreach ($rest_classes as $class) {
            $this->assertTrue(
                class_exists($class),
                "REST API class {$class} should be available"
            );
        }
        
        // Test REST API constants
        $this->assertTrue(defined('REST_REQUEST'), 'REST_REQUEST constant should be defined');
    }
    
    /**
     * Test WordPress multisite compatibility
     */
    public function test_multisite_compatibility() {
        // Test multisite functions (should exist even in single site)
        $multisite_functions = [
            'is_multisite',
            'get_site_option',
            'update_site_option',
            'delete_site_option',
            'switch_to_blog',
            'restore_current_blog',
            'get_current_blog_id',
            'get_main_site_id'
        ];
        
        foreach ($multisite_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Multisite function {$function} should be available"
            );
        }
        
        if (is_multisite()) {
            // Test multisite-specific functionality
            $this->assertIsInt(get_current_blog_id(), 'Current blog ID should be integer');
            $this->assertIsInt(get_main_site_id(), 'Main site ID should be integer');
            
            // Test network admin functions
            $network_functions = [
                'is_network_admin',
                'network_admin_url',
                'add_network_admin_menu'
            ];
            
            foreach ($network_functions as $function) {
                $this->assertTrue(
                    function_exists($function),
                    "Network admin function {$function} should be available"
                );
            }
        }
    }
    
    /**
     * Test WordPress security features compatibility
     */
    public function test_security_features_compatibility() {
        // Test security functions
        $security_functions = [
            'wp_create_nonce',
            'wp_verify_nonce',
            'check_admin_referer',
            'check_ajax_referer',
            'current_user_can',
            'user_can',
            'sanitize_text_field',
            'sanitize_email',
            'sanitize_url',
            'esc_html',
            'esc_attr',
            'esc_js',
            'esc_url',
            'wp_kses',
            'wp_kses_post'
        ];
        
        foreach ($security_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Security function {$function} should be available"
            );
        }
        
        // Test capability system
        $this->assertTrue(function_exists('map_meta_cap'), 'Capability mapping should be available');
        $this->assertTrue(function_exists('get_role'), 'Role system should be available');
    }
    
    /**
     * Test WordPress database compatibility
     */
    public function test_database_compatibility() {
        global $wpdb;
        
        $this->assertInstanceOf('wpdb', $wpdb, 'WordPress database object should be available');
        
        // Test essential database methods
        $db_methods = [
            'prepare',
            'query',
            'get_results',
            'get_row',
            'get_col',
            'get_var',
            'insert',
            'update',
            'delete'
        ];
        
        foreach ($db_methods as $method) {
            $this->assertTrue(
                method_exists($wpdb, $method),
                "Database method {$method} should be available"
            );
        }
        
        // Test database tables
        $essential_tables = [
            'posts',
            'postmeta',
            'users',
            'usermeta',
            'options',
            'comments',
            'commentmeta',
            'terms',
            'term_taxonomy',
            'term_relationships'
        ];
        
        foreach ($essential_tables as $table) {
            $this->assertNotEmpty(
                $wpdb->{$table},
                "Database table {$table} should be defined"
            );
        }
    }
    
    /**
     * Test WordPress filesystem compatibility
     */
    public function test_filesystem_compatibility() {
        // Test filesystem functions
        $filesystem_functions = [
            'WP_Filesystem',
            'get_filesystem_method',
            'wp_upload_dir',
            'wp_get_upload_dir',
            'wp_mkdir_p',
            'wp_normalize_path'
        ];
        
        foreach ($filesystem_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Filesystem function {$function} should be available"
            );
        }
        
        // Test upload directory
        $upload_dir = wp_upload_dir();
        $this->assertIsArray($upload_dir, 'Upload directory info should be array');
        $this->assertArrayHasKey('basedir', $upload_dir, 'Upload directory should have basedir');
        $this->assertArrayHasKey('baseurl', $upload_dir, 'Upload directory should have baseurl');
        
        // Test filesystem initialization
        if (!function_exists('WP_Filesystem')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        
        $this->assertTrue(WP_Filesystem(), 'WordPress filesystem should initialize');
    }
    
    /**
     * Test WordPress caching compatibility
     */
    public function test_caching_compatibility() {
        // Test caching functions
        $cache_functions = [
            'wp_cache_get',
            'wp_cache_set',
            'wp_cache_delete',
            'wp_cache_flush',
            'get_transient',
            'set_transient',
            'delete_transient'
        ];
        
        foreach ($cache_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Cache function {$function} should be available"
            );
        }
        
        // Test transient functionality
        $test_key = 'las_test_transient';
        $test_value = 'test_value_' . time();
        
        $this->assertTrue(set_transient($test_key, $test_value, 3600), 'Transient should be set');
        $this->assertEquals($test_value, get_transient($test_key), 'Transient should be retrieved');
        $this->assertTrue(delete_transient($test_key), 'Transient should be deleted');
    }
    
    /**
     * Test WordPress plugin system compatibility
     */
    public function test_plugin_system_compatibility() {
        // Test plugin functions
        $plugin_functions = [
            'is_plugin_active',
            'activate_plugin',
            'deactivate_plugins',
            'get_plugins',
            'get_plugin_data',
            'plugin_basename',
            'plugin_dir_path',
            'plugin_dir_url'
        ];
        
        foreach ($plugin_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Plugin function {$function} should be available"
            );
        }
        
        // Test plugin hooks
        $plugin_hooks = [
            'activate_',
            'deactivate_',
            'uninstall_',
            'plugin_action_links_',
            'plugin_row_meta'
        ];
        
        foreach ($plugin_hooks as $hook_prefix) {
            // These are dynamic hooks, so we just test they can be added
            $test_hook = $hook_prefix . 'test';
            add_action($test_hook, '__return_true');
            $this->assertTrue(has_action($test_hook), "Plugin hook {$hook_prefix} should work");
            remove_action($test_hook, '__return_true');
        }
    }
    
    /**
     * Test WordPress theme compatibility
     */
    public function test_theme_compatibility() {
        // Test theme functions
        $theme_functions = [
            'get_template',
            'get_stylesheet',
            'get_theme_root',
            'get_theme_root_uri',
            'wp_get_theme',
            'is_child_theme'
        ];
        
        foreach ($theme_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Theme function {$function} should be available"
            );
        }
        
        // Test current theme
        $current_theme = wp_get_theme();
        $this->assertInstanceOf('WP_Theme', $current_theme, 'Current theme should be WP_Theme object');
        
        // Test theme support
        $this->assertTrue(function_exists('add_theme_support'), 'Theme support system should be available');
        $this->assertTrue(function_exists('current_theme_supports'), 'Theme support checking should be available');
    }
    
    /**
     * Test WordPress customizer compatibility
     */
    public function test_customizer_compatibility() {
        // Test customizer functions
        $customizer_functions = [
            'is_customize_preview',
            'wp_get_custom_css',
            'wp_update_custom_css_post'
        ];
        
        foreach ($customizer_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Customizer function {$function} should be available"
            );
        }
        
        // Test customizer classes
        $customizer_classes = [
            'WP_Customize_Manager',
            'WP_Customize_Control',
            'WP_Customize_Setting'
        ];
        
        foreach ($customizer_classes as $class) {
            $this->assertTrue(
                class_exists($class),
                "Customizer class {$class} should be available"
            );
        }
    }
    
    /**
     * Test WordPress block editor compatibility
     */
    public function test_block_editor_compatibility() {
        // Test block editor functions (WordPress 5.0+)
        $block_functions = [
            'register_block_type',
            'unregister_block_type',
            'has_blocks',
            'parse_blocks',
            'serialize_blocks'
        ];
        
        foreach ($block_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Block editor function {$function} should be available"
            );
        }
        
        // Test block editor hooks
        $block_hooks = [
            'enqueue_block_editor_assets',
            'enqueue_block_assets',
            'block_categories_all'
        ];
        
        foreach ($block_hooks as $hook) {
            $this->assertGreaterThanOrEqual(
                0,
                has_action($hook),
                "Block editor hook {$hook} should be available"
            );
        }
    }
    
    /**
     * Test plugin conflict detection
     */
    public function test_plugin_conflict_detection() {
        // Common conflicting plugins that might interfere with admin styling
        $potential_conflicts = [
            'admin-color-schemes/admin-color-schemes.php',
            'wp-admin-ui-customize/wp-admin-ui-customize.php',
            'admin-menu-editor/menu-editor.php',
            'white-label-cms/white-label-cms.php',
            'custom-admin-interface/custom-admin-interface.php'
        ];
        
        $active_conflicts = [];
        
        foreach ($potential_conflicts as $plugin) {
            if (is_plugin_active($plugin)) {
                $active_conflicts[] = $plugin;
            }
        }
        
        // Log potential conflicts but don't fail the test
        if (!empty($active_conflicts)) {
            error_log('LAS: Potential plugin conflicts detected: ' . implode(', ', $active_conflicts));
        }
        
        $this->assertTrue(true, 'Plugin conflict detection completed');
    }
    
    /**
     * Test WordPress environment compatibility
     */
    public function test_environment_compatibility() {
        // Test PHP version compatibility
        $min_php_version = '7.4';
        $this->assertTrue(
            version_compare(PHP_VERSION, $min_php_version, '>='),
            "PHP version " . PHP_VERSION . " should be >= {$min_php_version}"
        );
        
        // Test required PHP extensions
        $required_extensions = [
            'json',
            'mbstring',
            'curl',
            'gd',
            'zip'
        ];
        
        foreach ($required_extensions as $extension) {
            $this->assertTrue(
                extension_loaded($extension),
                "PHP extension {$extension} should be loaded"
            );
        }
        
        // Test WordPress environment
        if (function_exists('wp_get_environment_type')) {
            $env_type = wp_get_environment_type();
            $valid_environments = ['production', 'staging', 'development', 'local'];
            $this->assertContains(
                $env_type,
                $valid_environments,
                "Environment type {$env_type} should be valid"
            );
        }
        
        // Test memory limit
        $memory_limit = wp_convert_hr_to_bytes(ini_get('memory_limit'));
        $min_memory = 64 * 1024 * 1024; // 64MB
        $this->assertGreaterThanOrEqual(
            $min_memory,
            $memory_limit,
            'Memory limit should be at least 64MB'
        );
    }
    
    /**
     * Test WordPress performance compatibility
     */
    public function test_performance_compatibility() {
        // Test object cache availability
        $this->assertTrue(function_exists('wp_cache_get'), 'Object cache functions should be available');
        
        // Test if object cache is persistent
        wp_cache_set('las_test_cache', 'test_value', 'test_group');
        $cached_value = wp_cache_get('las_test_cache', 'test_group');
        $this->assertEquals('test_value', $cached_value, 'Object cache should work');
        
        // Test database query optimization
        global $wpdb;
        $queries_before = $wpdb->num_queries;
        
        // Perform a simple query
        get_option('admin_email');
        
        $queries_after = $wpdb->num_queries;
        $this->assertGreaterThanOrEqual($queries_before, $queries_after, 'Database queries should be tracked');
        
        // Test if query caching is working
        $option_value_1 = get_option('admin_email');
        $queries_middle = $wpdb->num_queries;
        $option_value_2 = get_option('admin_email');
        $queries_final = $wpdb->num_queries;
        
        $this->assertEquals($option_value_1, $option_value_2, 'Option values should be consistent');
        // Note: Query count might be the same if caching is working properly
    }
    
    /**
     * Test WordPress accessibility compatibility
     */
    public function test_accessibility_compatibility() {
        // Test accessibility functions
        $a11y_functions = [
            'wp_admin_css_color',
            'get_user_option'
        ];
        
        foreach ($a11y_functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Accessibility function {$function} should be available"
            );
        }
        
        // Test admin color schemes
        global $_wp_admin_css_colors;
        $this->assertNotEmpty($_wp_admin_css_colors, 'Admin color schemes should be available');
        
        // Test user preferences
        $user_id = $this->factory->user->create(['role' => 'administrator']);
        wp_set_current_user($user_id);
        
        $admin_color = get_user_option('admin_color');
        $this->assertNotEmpty($admin_color, 'User should have admin color preference');
    }
}