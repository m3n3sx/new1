<?php
/**
 * Plugin Name: Live Admin Styler
 * Description: Dostosuj wygląd swojego panelu administratora WordPress.
 * Version: 1.2.0
 * Author: Twój Autor
 * Text Domain: live-admin-styler
 * Domain Path: /languages
 */

// Prevent direct access to the file.
if (!defined('ABSPATH')) {
    exit;
}

// Debug logging
if (defined('WP_DEBUG') && WP_DEBUG) {
    error_log('LAS Plugin: Starting to load live-admin-styler.php');
}

define('LAS_FRESH_VERSION', '1.2.0');
define('LAS_FRESH_TEXT_DOMAIN', 'live-admin-styler');
define('LAS_FRESH_SETTINGS_SLUG', 'live-admin-styler-settings');
define('LAS_FRESH_OPTION_GROUP', 'las_fresh_option_group');
define('LAS_FRESH_OPTION_NAME', 'las_fresh_options'); // This is the PHP constant

/**
 * Load plugin textdomain.
 */
function las_fresh_load_textdomain() {
    load_plugin_textdomain(LAS_FRESH_TEXT_DOMAIN, false, dirname(plugin_basename(__FILE__)) . '/languages');
}
add_action('plugins_loaded', 'las_fresh_load_textdomain');

/**
 * Initialize UI Repair System
 * Ensures proper WordPress admin integration with capability checks and security validation
 */
function las_fresh_init_ui_repair_system() {
    // Only initialize in admin context
    if (!is_admin()) {
        return;
    }
    
    // Check user capabilities
    if (!current_user_can('manage_options')) {
        return;
    }
    
    // Load UI Repair Asset Loader
    if (!class_exists('LAS_UI_Repair_Asset_Loader')) {
        require_once plugin_dir_path(__FILE__) . 'includes/UIRepairAssetLoader.php';
    }
    
    // Load Compatibility Manager
    if (!class_exists('LAS_Compatibility_Manager')) {
        require_once plugin_dir_path(__FILE__) . 'includes/CompatibilityManager.php';
    }
    
    // Initialize asset loader
    global $las_ui_repair_asset_loader;
    if (!$las_ui_repair_asset_loader) {
        $las_ui_repair_asset_loader = new LAS_UI_Repair_Asset_Loader();
    }
    
    // Initialize compatibility manager
    global $las_compatibility_manager;
    if (!$las_compatibility_manager) {
        $las_compatibility_manager = new LAS_Compatibility_Manager();
    }
    
    // Add WordPress admin hooks for UI repair
    add_action('admin_enqueue_scripts', 'las_fresh_enqueue_ui_repair_assets', 5);
    add_action('admin_footer', 'las_fresh_add_ui_repair_inline_scripts');
    add_action('admin_notices', 'las_fresh_show_ui_repair_notices');
    
    // AJAX handlers for UI repair functionality
    add_action('wp_ajax_las_save_tab_state', 'las_fresh_ajax_save_tab_state');
    add_action('wp_ajax_las_get_ui_state', 'las_fresh_ajax_get_ui_state');
    add_action('wp_ajax_las_validate_ui_repair', 'las_fresh_ajax_validate_ui_repair');
    
    // Add admin body classes for UI repair
    add_filter('admin_body_class', 'las_fresh_add_admin_body_classes');
}
add_action('admin_init', 'las_fresh_init_ui_repair_system');

/**
 * Enqueue UI repair assets with proper WordPress integration
 *
 * @param string $hook_suffix Current admin page hook suffix
 */
function las_fresh_enqueue_ui_repair_assets($hook_suffix) {
    // Only load on Live Admin Styler settings page
    $settings_pages = array(
        'toplevel_page_' . LAS_FRESH_SETTINGS_SLUG,
        'admin_page_' . LAS_FRESH_SETTINGS_SLUG
    );
    
    if (!in_array($hook_suffix, $settings_pages)) {
        return;
    }
    
    // Verify nonce for security
    $nonce = wp_create_nonce('las_ui_repair_nonce');
    
    // Enqueue UI repair assets via asset loader
    global $las_ui_repair_asset_loader;
    if ($las_ui_repair_asset_loader) {
        $las_ui_repair_asset_loader->enqueue_ui_repair_assets($hook_suffix);
    }
    
    // Add WordPress admin integration data
    wp_localize_script('las-ui-repair', 'lasWordPressData', array(
        'adminUrl' => admin_url(),
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => $nonce,
        'currentScreen' => get_current_screen()->id ?? '',
        'userCapabilities' => array(
            'manage_options' => current_user_can('manage_options'),
            'edit_theme_options' => current_user_can('edit_theme_options')
        ),
        'wpVersion' => get_bloginfo('version'),
        'isMultisite' => is_multisite(),
        'isNetworkAdmin' => is_network_admin(),
        'currentUserId' => get_current_user_id(),
        'adminColorScheme' => get_user_option('admin_color'),
        'locale' => get_locale(),
        'textDirection' => is_rtl() ? 'rtl' : 'ltr'
    ));
}

/**
 * Add inline scripts for UI repair initialization
 */
function las_fresh_add_ui_repair_inline_scripts() {
    $current_screen = get_current_screen();
    if (!$current_screen || strpos($current_screen->id, 'live-admin-styler') === false) {
        return;
    }
    
    ?>
    <script type="text/javascript">
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize UI repair system with WordPress integration
        if (typeof window.LASUICoreManager !== 'undefined') {
            window.lasUIManager = new window.LASUICoreManager();
            window.lasUIManager.init().then(function() {
                console.log('LAS UI: WordPress integration initialized successfully');
                
                // Mark UI as ready
                document.body.classList.add('las-ui-ready');
                document.body.classList.remove('las-ui-degraded');
                
                // Show ready state in settings container
                var container = document.querySelector('.las-fresh-settings-wrap');
                if (container) {
                    container.classList.add('las-ui-ready');
                }
                
                // Emit WordPress integration ready event
                var event = new CustomEvent('las:wordpress-integration-ready', {
                    detail: {
                        manager: window.lasUIManager,
                        timestamp: Date.now()
                    }
                });
                document.dispatchEvent(event);
                
            }).catch(function(error) {
                console.error('LAS UI: WordPress integration failed:', error);
                
                // Show error notice
                las_fresh_show_integration_error(error);
            });
        } else {
            console.error('LAS UI: Core manager not available');
            las_fresh_show_integration_error(new Error('UI Core Manager not loaded'));
        }
    });
    
    /**
     * Show integration error to user
     */
    function las_fresh_show_integration_error(error) {
        var container = document.querySelector('.las-fresh-settings-wrap');
        if (!container) return;
        
        var errorDiv = document.createElement('div');
        errorDiv.className = 'notice notice-error las-ui-integration-error';
        errorDiv.innerHTML = 
            '<p><strong><?php echo esc_js(__('Live Admin Styler Integration Error', LAS_FRESH_TEXT_DOMAIN)); ?>:</strong> ' +
            '<?php echo esc_js(__('Failed to initialize user interface. Some features may not work properly.', LAS_FRESH_TEXT_DOMAIN)); ?></p>' +
            '<p><button type="button" class="button" onclick="location.reload()"><?php echo esc_js(__('Refresh Page', LAS_FRESH_TEXT_DOMAIN)); ?></button></p>';
        
        container.insertBefore(errorDiv, container.firstChild);
        
        // Enable graceful degradation
        document.body.classList.add('las-ui-degraded');
    }
    </script>
    <?php
}

/**
 * Show UI repair notices in WordPress admin
 */
function las_fresh_show_ui_repair_notices() {
    $current_screen = get_current_screen();
    if (!$current_screen || strpos($current_screen->id, 'live-admin-styler') === false) {
        return;
    }
    
    // Check if UI repair assets are loaded
    global $las_ui_repair_asset_loader;
    if ($las_ui_repair_asset_loader) {
        $loading_errors = $las_ui_repair_asset_loader->get_loading_errors();
        
        if (!empty($loading_errors)) {
            echo '<div class="notice notice-warning is-dismissible">';
            echo '<p><strong>' . esc_html__('Live Admin Styler', LAS_FRESH_TEXT_DOMAIN) . ':</strong> ';
            echo esc_html__('Some UI components failed to load. Basic functionality is still available.', LAS_FRESH_TEXT_DOMAIN);
            echo '</p></div>';
        }
    }
    
    // Show compatibility notices if needed
    las_fresh_show_compatibility_notices();
}

/**
 * Show compatibility notices for WordPress version, plugins, etc.
 */
function las_fresh_show_compatibility_notices() {
    global $wp_version;
    
    // Check WordPress version compatibility
    if (version_compare($wp_version, '5.0', '<')) {
        echo '<div class="notice notice-error">';
        echo '<p><strong>' . esc_html__('Live Admin Styler', LAS_FRESH_TEXT_DOMAIN) . ':</strong> ';
        echo esc_html__('WordPress 5.0 or higher is required for full functionality.', LAS_FRESH_TEXT_DOMAIN);
        echo '</p></div>';
    }
    
    // Check for jQuery availability
    if (!wp_script_is('jquery', 'registered')) {
        echo '<div class="notice notice-warning">';
        echo '<p><strong>' . esc_html__('Live Admin Styler', LAS_FRESH_TEXT_DOMAIN) . ':</strong> ';
        echo esc_html__('jQuery is not available. Some features may not work properly.', LAS_FRESH_TEXT_DOMAIN);
        echo '</p></div>';
    }
}

/**
 * AJAX handler for saving tab state
 */
function las_fresh_ajax_save_tab_state() {
    try {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_ui_repair_nonce')) {
            wp_send_json_error('Invalid security token');
            return;
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        // Sanitize and validate tab ID
        $tab_id = sanitize_key($_POST['tab_id'] ?? '');
        $valid_tabs = array('general', 'menu', 'adminbar', 'content', 'logos', 'advanced');
        
        if (!in_array($tab_id, $valid_tabs)) {
            wp_send_json_error('Invalid tab ID');
            return;
        }
        
        // Save tab state using user state manager
        $user_state = new LAS_User_State();
        $success = $user_state->set_active_tab($tab_id);
        
        if ($success) {
            wp_send_json_success(array(
                'tab_id' => $tab_id,
                'message' => 'Tab state saved successfully'
            ));
        } else {
            wp_send_json_error('Failed to save tab state');
        }
        
    } catch (Exception $e) {
        error_log('LAS UI Repair: Tab state save error: ' . $e->getMessage());
        wp_send_json_error('Server error occurred');
    }
}

/**
 * AJAX handler for getting UI state
 */
function las_fresh_ajax_get_ui_state() {
    try {
        // Verify nonce and permissions
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_ui_repair_nonce') || 
            !current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
            return;
        }
        
        // Get user state
        $user_state = new LAS_User_State();
        $ui_state = array(
            'active_tab' => $user_state->get_active_tab(),
            'ui_preferences' => $user_state->get_ui_preferences(),
            'session_data' => $user_state->get_session_data()
        );
        
        wp_send_json_success($ui_state);
        
    } catch (Exception $e) {
        error_log('LAS UI Repair: UI state get error: ' . $e->getMessage());
        wp_send_json_error('Failed to retrieve UI state');
    }
}

/**
 * AJAX handler for validating UI repair system
 */
function las_fresh_ajax_validate_ui_repair() {
    try {
        // Verify nonce and permissions
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_ui_repair_nonce') || 
            !current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
            return;
        }
        
        // Validate UI repair system
        global $las_ui_repair_asset_loader;
        
        $validation_results = array(
            'wordpress_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
            'jquery_available' => wp_script_is('jquery', 'registered'),
            'assets_loaded' => $las_ui_repair_asset_loader ? $las_ui_repair_asset_loader->get_loaded_assets() : array(),
            'loading_errors' => $las_ui_repair_asset_loader ? $las_ui_repair_asset_loader->get_loading_errors() : array(),
            'user_capabilities' => array(
                'manage_options' => current_user_can('manage_options'),
                'edit_theme_options' => current_user_can('edit_theme_options')
            ),
            'environment' => array(
                'is_multisite' => is_multisite(),
                'is_network_admin' => is_network_admin(),
                'admin_color_scheme' => get_user_option('admin_color'),
                'locale' => get_locale(),
                'is_rtl' => is_rtl()
            )
        );
        
        wp_send_json_success($validation_results);
        
    } catch (Exception $e) {
        error_log('LAS UI Repair: Validation error: ' . $e->getMessage());
        wp_send_json_error('Validation failed');
    }
}

/**
 * Add admin body classes for UI repair
 *
 * @param string $classes Existing admin body classes
 * @return string Modified admin body classes
 */
function las_fresh_add_admin_body_classes($classes) {
    $current_screen = get_current_screen();
    
    // Add classes for Live Admin Styler pages
    if ($current_screen && strpos($current_screen->id, 'live-admin-styler') !== false) {
        $classes .= ' las-admin-page';
        
        // Add WordPress version class
        global $wp_version;
        $version_class = 'wp-version-' . str_replace('.', '-', $wp_version);
        $classes .= ' ' . sanitize_html_class($version_class);
        
        // Add multisite class
        if (is_multisite()) {
            $classes .= ' las-multisite';
        }
        
        // Add network admin class
        if (is_network_admin()) {
            $classes .= ' las-network-admin';
        }
        
        // Add RTL class
        if (is_rtl()) {
            $classes .= ' las-rtl';
        }
        
        // Add admin color scheme class
        $admin_color = get_user_option('admin_color');
        if ($admin_color) {
            $classes .= ' las-admin-color-' . sanitize_html_class($admin_color);
        }
    }
    
    return $classes;
}


/**
 * Get default plugin options.
 *
 * @return array Default options.
 */
function las_fresh_get_default_options() {
    return array(
        'active_template' => 'default',
        'border_radius' => 0,
        'admin_menu_detached' => false,
        'admin_menu_margin_top' => 10,
        'admin_menu_margin_left' => 10,
        'admin_menu_margin_bottom' => 10,
        'admin_bar_detached' => false,
        'admin_bar_margin_top' => 10,
        'admin_bar_margin_left' => 10,
        'admin_bar_margin_right' => 10,
        'admin_menu_bg_type' => 'solid',
        'admin_menu_bg_color' => '#23282d',
        'admin_menu_bg_gradient_color1' => '#23282d',
        'admin_menu_bg_gradient_color2' => '#191e23',
        'admin_menu_bg_gradient_direction' => 'to bottom',
        'admin_submenu_bg_color' => '#2c3338',
        'admin_menu_text_color' => '#f0f0f1',
        'admin_menu_font_family' => 'default',
        'admin_menu_google_font' => '',
        'admin_menu_font_size' => 14,
        'admin_submenu_text_color' => '#f0f0f1',
        'admin_submenu_font_family' => 'default',
        'admin_submenu_google_font' => '',
        'admin_submenu_font_size' => 13,
        'accent_color' => '#007cba',
        'admin_menu_width' => 220,
        'admin_menu_padding_top_bottom' => 5,
        'admin_menu_padding_left_right' => 10,
        'admin_menu_shadow_type' => 'none',
        'admin_menu_shadow_simple' => '2px 0 10px rgba(0,0,0,0.15)',
        'admin_menu_shadow_advanced_color' => 'rgba(0,0,0,0.15)',
        'admin_menu_shadow_advanced_offset_x' => 2,
        'admin_menu_shadow_advanced_offset_y' => 0,
        'admin_menu_shadow_advanced_blur' => 10,
        'admin_menu_shadow_advanced_spread' => 0,
        'admin_bar_bg_type' => 'solid',
        'admin_bar_bg_color' => '#1d2327',
        'admin_bar_bg_gradient_color1' => '#1d2327',
        'admin_bar_bg_gradient_color2' => '#23282d',
        'admin_bar_bg_gradient_direction' => 'to bottom',
        'admin_bar_text_color' => '#f0f0f1',
        'admin_bar_font_family' => 'default',
        'admin_bar_google_font' => '',
        'admin_bar_font_size' => 13,
        'admin_bar_height' => 32,
        'admin_bar_width_type' => 'percentage',
        'admin_bar_width_percentage' => 100,
        'admin_bar_width_px' => 1200,
        'admin_bar_padding_top_bottom' => 0,
        'admin_bar_padding_left_right' => 8,
        'admin_bar_shadow_type' => 'none',
        'admin_bar_shadow_simple' => '0 2px 5px rgba(0,0,0,0.1)',
        'admin_bar_shadow_advanced_color' => 'rgba(0,0,0,0.1)',
        'admin_bar_shadow_advanced_offset_x' => 0,
        'admin_bar_shadow_advanced_offset_y' => 2,
        'admin_bar_shadow_advanced_blur' => 5,
        'admin_bar_shadow_advanced_spread' => 0,
        'body_bg_type' => 'solid',
        'body_bg_color' => '#f0f1f2',
        'body_bg_gradient_color1' => '#f0f1f2',
        'body_bg_gradient_color2' => '#e9eaeb',
        'body_bg_gradient_direction' => 'to bottom',
        'body_text_color' => '#3c434a',
        'body_font_family' => 'default',
        'body_google_font' => '',
        'body_font_size' => 13,
        'admin_menu_logo' => '',
        'admin_menu_logo_height' => 50,
        'login_logo' => '',
        'footer_text' => '',
        'custom_css_rules' => '',
        'admin_bar_border_radius_type' => 'all', 
        'admin_bar_border_radius_all' => 0,
        'admin_bar_border_radius_tl' => 0,
        'admin_bar_border_radius_tr' => 0,
        'admin_bar_border_radius_br' => 0,
        'admin_bar_border_radius_bl' => 0,
        'admin_menu_border_radius_type' => 'all', 
        'admin_menu_border_radius_all' => 0,
        'admin_menu_border_radius_tl' => 0,
        'admin_menu_border_radius_tr' => 0,
        'admin_menu_border_radius_br' => 0,
        'admin_menu_border_radius_bl' => 0,
    );
}

/**
 * Get plugin options, merged with defaults.
 *
 * @return array Options.
 */
function las_fresh_get_options() {
    $defaults = las_fresh_get_default_options();
    $saved_options = get_option(LAS_FRESH_OPTION_NAME, $defaults);
    return array_merge($defaults, (array) $saved_options);
}

/**
 * Clear CSS cache when options are updated
 */
function las_fresh_clear_cache_on_option_update($option_name, $old_value, $value) {
    if ($option_name === LAS_FRESH_OPTION_NAME) {
        // Include the cache functions
        if (function_exists('las_fresh_clear_css_cache')) {
            las_fresh_clear_css_cache();
            error_log('LAS Cache: CSS cache cleared due to option update');
        }
    }
}
add_action('updated_option', 'las_fresh_clear_cache_on_option_update', 10, 3);

/**
 * Helper function to log errors using the error logger
 *
 * @param string $message Error message
 * @param string $category Error category
 * @param int $severity Error severity level
 * @param array $context Additional context data
 * @param Exception|null $exception Exception object if available
 * @return string Error ID for tracking
 */
function las_fresh_log_error($message, $category = 'php', $severity = 2, $context = array(), $exception = null) {
    global $las_error_logger;
    
    if ($las_error_logger instanceof LAS_Error_Logger) {
        return $las_error_logger->log_error($message, $category, $severity, $context, $exception);
    }
    
    // Fallback to WordPress error log
    error_log('LAS Error [' . $category . ']: ' . $message);
    return 'fallback_' . time();
}

/**
 * Helper function to check if debug mode is enabled
 *
 * @return bool True if debug mode is enabled
 */
function las_fresh_is_debug_mode() {
    global $las_error_logger;
    
    if ($las_error_logger instanceof LAS_Error_Logger) {
        return $las_error_logger->is_debug_mode();
    }
    
    return defined('WP_DEBUG') && WP_DEBUG;
}

/**
 * Helper function to get recent errors
 *
 * @param int $limit Number of errors to retrieve
 * @return array Recent errors
 */
function las_fresh_get_recent_errors($limit = 50) {
    global $las_error_logger;
    
    if ($las_error_logger instanceof LAS_Error_Logger) {
        return $las_error_logger->get_recent_errors($limit);
    }
    
    return array();
}

/**
 * Helper function to clear all error logs
 *
 * @return int Number of logs cleared
 */
function las_fresh_clear_error_logs() {
    global $las_error_logger;
    
    if ($las_error_logger instanceof LAS_Error_Logger) {
        return $las_error_logger->clear_all_logs();
    }
    
    return 0;
}

/**
 * Enhanced User State Management Class
 * 
 * This class manages user-specific preferences and state for the Live Admin Styler plugin.
 * It provides functionality for storing and retrieving user preferences, managing tab states,
 * and synchronizing settings between sessions.
 * 
 * Features:
 * - User-specific tab state persistence
 * - UI preferences management
 * - Settings validation and sanitization
 * - Session synchronization
 * - localStorage integration support
 * 
 * @since 1.1.0
 */
class LAS_User_State {
    
    /**
     * Current user ID.
     *
     * @var int
     */
    private $user_id;
    
    /**
     * Cache for user preferences to avoid multiple database queries.
     *
     * @var array
     */
    private $preferences_cache = null;
    
    /**
     * Valid tab IDs for validation.
     *
     * @var array
     */
    private $valid_tabs = array('general', 'menu', 'adminbar', 'content', 'logos', 'advanced');
    
    /**
     * Default UI preferences.
     *
     * @var array
     */
    private $default_ui_preferences = array(
        'ui_theme' => 'modern',
        'animation_speed' => 'normal',
        'submenu_visibility' => 'enhanced',
        'remember_tab_state' => true,
        'auto_save_changes' => false,
        'live_preview_enabled' => true,
        'live_preview_debounce' => 150,
        'smart_submenu' => true,
        'enhanced_tooltips' => true,
        'keyboard_shortcuts' => true,
        'notification_duration' => 5000,
        'search_highlight' => true,
        'compact_mode' => false
    );
    
    /**
     * Constructor.
     *
     * @param int|null $user_id User ID. If null, uses current user.
     */
    public function __construct($user_id = null) {
        $this->user_id = $user_id ?: get_current_user_id();
        
        // Validate user ID
        if (!$this->user_id || !user_can($this->user_id, 'manage_options')) {
            $this->user_id = 0; // Fallback for invalid users
        }
    }
    
    /**
     * Get the active tab for the current user.
     *
     * @return string The active tab ID, defaults to 'general'.
     */
    public function get_active_tab() {
        if (!$this->user_id) {
            return 'general';
        }
        
        $active_tab = get_user_meta($this->user_id, 'las_fresh_active_tab', true);
        
        // Validate tab ID
        if (!in_array($active_tab, $this->valid_tabs)) {
            $active_tab = 'general';
        }
        
        return $active_tab;
    }
    
    /**
     * Set the active tab for the current user.
     *
     * @param string $tab The tab ID to save.
     * @return bool True on success, false on failure.
     */
    public function set_active_tab($tab) {
        if (!$this->user_id) {
            return false;
        }
        
        $sanitized_tab = sanitize_key($tab);
        
        // Validate tab ID
        if (!in_array($sanitized_tab, $this->valid_tabs)) {
            return false;
        }
        
        $result = update_user_meta($this->user_id, 'las_fresh_active_tab', $sanitized_tab);
        
        // Log tab change for debugging
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("LAS User State: Tab changed to '{$sanitized_tab}' for user {$this->user_id}");
        }
        
        return $result !== false;
    }
    
    /**
     * Get UI preferences for the current user.
     *
     * @return array UI preferences merged with defaults.
     */
    public function get_ui_preferences() {
        if (!$this->user_id) {
            return $this->default_ui_preferences;
        }
        
        // Use cache if available
        if ($this->preferences_cache !== null) {
            return $this->preferences_cache;
        }
        
        $saved_preferences = get_user_meta($this->user_id, 'las_fresh_ui_preferences', true);
        
        if (!is_array($saved_preferences)) {
            $saved_preferences = array();
        }
        
        // Merge with defaults and cache result
        $this->preferences_cache = array_merge($this->default_ui_preferences, $saved_preferences);
        
        return $this->preferences_cache;
    }
    
    /**
     * Set UI preferences for the current user.
     *
     * @param array $preferences UI preferences to save.
     * @return bool True on success, false on failure.
     */
    public function set_ui_preferences($preferences) {
        if (!$this->user_id || !is_array($preferences)) {
            return false;
        }
        
        // Sanitize and validate preferences
        $sanitized_preferences = $this->sanitize_ui_preferences($preferences);
        
        $result = update_user_meta($this->user_id, 'las_fresh_ui_preferences', $sanitized_preferences);
        
        // Update cache
        if ($result !== false) {
            $this->preferences_cache = array_merge($this->default_ui_preferences, $sanitized_preferences);
        }
        
        return $result !== false;
    }
    
    /**
     * Get a specific UI preference.
     *
     * @param string $key Preference key.
     * @param mixed  $default Default value if preference doesn't exist.
     * @return mixed Preference value or default.
     */
    public function get_ui_preference($key, $default = null) {
        $preferences = $this->get_ui_preferences();
        
        if (isset($preferences[$key])) {
            return $preferences[$key];
        }
        
        return $default !== null ? $default : (isset($this->default_ui_preferences[$key]) ? $this->default_ui_preferences[$key] : null);
    }
    
    /**
     * Set a specific UI preference.
     *
     * @param string $key   Preference key.
     * @param mixed  $value Preference value.
     * @return bool True on success, false on failure.
     */
    public function set_ui_preference($key, $value) {
        $preferences = $this->get_ui_preferences();
        $preferences[$key] = $value;
        
        return $this->set_ui_preferences($preferences);
    }
    
    /**
     * Sanitize UI preferences.
     *
     * @param array $preferences Raw preferences array.
     * @return array Sanitized preferences.
     */
    private function sanitize_ui_preferences($preferences) {
        $sanitized = array();
        
        foreach ($preferences as $key => $value) {
            $sanitized_key = sanitize_key($key);
            
            // Only allow known preference keys
            if (!array_key_exists($sanitized_key, $this->default_ui_preferences)) {
                continue;
            }
            
            // Sanitize based on preference type
            $sanitized[$sanitized_key] = $this->sanitize_preference_value($sanitized_key, $value);
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize a specific preference value based on its key.
     *
     * @param string $key   Preference key.
     * @param mixed  $value Raw value.
     * @return mixed Sanitized value.
     */
    private function sanitize_preference_value($key, $value) {
        switch ($key) {
            case 'ui_theme':
                $valid_themes = array('modern', 'classic', 'minimal');
                return in_array($value, $valid_themes) ? $value : 'modern';
                
            case 'animation_speed':
                $valid_speeds = array('slow', 'normal', 'fast', 'none');
                return in_array($value, $valid_speeds) ? $value : 'normal';
                
            case 'submenu_visibility':
                $valid_visibility = array('default', 'enhanced', 'always_visible');
                return in_array($value, $valid_visibility) ? $value : 'enhanced';
                
            case 'live_preview_debounce':
                $int_value = intval($value);
                return ($int_value >= 50 && $int_value <= 1000) ? $int_value : 150;
                
            case 'notification_duration':
                $int_value = intval($value);
                return ($int_value >= 1000 && $int_value <= 10000) ? $int_value : 5000;
                
            case 'remember_tab_state':
            case 'auto_save_changes':
            case 'live_preview_enabled':
            case 'smart_submenu':
            case 'enhanced_tooltips':
            case 'keyboard_shortcuts':
            case 'search_highlight':
            case 'compact_mode':
                return (bool) $value;
                
            default:
                return sanitize_text_field($value);
        }
    }
    
    /**
     * Get user session data for synchronization.
     *
     * @return array Session data including preferences and state.
     */
    public function get_session_data() {
        return array(
            'active_tab' => $this->get_active_tab(),
            'ui_preferences' => $this->get_ui_preferences(),
            'user_id' => $this->user_id,
            'timestamp' => current_time('timestamp'),
            'version' => LAS_FRESH_VERSION
        );
    }
    
    /**
     * Synchronize user state from session data.
     *
     * @param array $session_data Session data to synchronize.
     * @return bool True on success, false on failure.
     */
    public function sync_from_session($session_data) {
        if (!is_array($session_data) || !$this->user_id) {
            return false;
        }
        
        $success = true;
        
        // Sync active tab
        if (isset($session_data['active_tab'])) {
            $success = $this->set_active_tab($session_data['active_tab']) && $success;
        }
        
        // Sync UI preferences
        if (isset($session_data['ui_preferences']) && is_array($session_data['ui_preferences'])) {
            $success = $this->set_ui_preferences($session_data['ui_preferences']) && $success;
        }
        
        return $success;
    }
    
    /**
     * Reset user state to defaults.
     *
     * @return bool True on success, false on failure.
     */
    public function reset_to_defaults() {
        if (!$this->user_id) {
            return false;
        }
        
        $success = true;
        
        // Reset tab state
        $success = $this->set_active_tab('general') && $success;
        
        // Reset UI preferences
        $success = $this->set_ui_preferences($this->default_ui_preferences) && $success;
        
        // Clear cache
        $this->preferences_cache = null;
        
        return $success;
    }
    
    /**
     * Export user state for backup or migration.
     *
     * @return array Exported state data.
     */
    public function export_state() {
        return array(
            'active_tab' => $this->get_active_tab(),
            'ui_preferences' => $this->get_ui_preferences(),
            'export_timestamp' => current_time('timestamp'),
            'plugin_version' => LAS_FRESH_VERSION
        );
    }
    
    /**
     * Import user state from exported data.
     *
     * @param array $state_data Exported state data.
     * @return bool True on success, false on failure.
     */
    public function import_state($state_data) {
        if (!is_array($state_data) || !$this->user_id) {
            return false;
        }
        
        return $this->sync_from_session($state_data);
    }
    
    /**
     * Get validation rules for settings.
     *
     * @return array Validation rules.
     */
    public function get_validation_rules() {
        return array(
            'ui_theme' => array(
                'type' => 'select',
                'options' => array('modern', 'classic', 'minimal'),
                'default' => 'modern'
            ),
            'animation_speed' => array(
                'type' => 'select',
                'options' => array('slow', 'normal', 'fast', 'none'),
                'default' => 'normal'
            ),
            'submenu_visibility' => array(
                'type' => 'select',
                'options' => array('default', 'enhanced', 'always_visible'),
                'default' => 'enhanced'
            ),
            'live_preview_debounce' => array(
                'type' => 'integer',
                'min' => 50,
                'max' => 1000,
                'default' => 150
            ),
            'notification_duration' => array(
                'type' => 'integer',
                'min' => 1000,
                'max' => 10000,
                'default' => 5000
            ),
            'remember_tab_state' => array(
                'type' => 'boolean',
                'default' => true
            ),
            'auto_save_changes' => array(
                'type' => 'boolean',
                'default' => false
            ),
            'live_preview_enabled' => array(
                'type' => 'boolean',
                'default' => true
            ),
            'smart_submenu' => array(
                'type' => 'boolean',
                'default' => true
            ),
            'enhanced_tooltips' => array(
                'type' => 'boolean',
                'default' => true
            ),
            'keyboard_shortcuts' => array(
                'type' => 'boolean',
                'default' => true
            ),
            'search_highlight' => array(
                'type' => 'boolean',
                'default' => true
            ),
            'compact_mode' => array(
                'type' => 'boolean',
                'default' => false
            )
        );
    }
    
    /**
     * Clear all cached data.
     */
    public function clear_cache() {
        $this->preferences_cache = null;
    }
    
    /**
     * Get the current user ID.
     *
     * @return int User ID.
     */
    public function get_user_id() {
        return $this->user_id;
    }
    
    /**
     * Check if the current user has valid permissions.
     *
     * @return bool True if user has permissions, false otherwise.
     */
    public function has_permissions() {
        return $this->user_id && user_can($this->user_id, 'manage_options');
    }
}

/**
 * Enhanced Error Logging and Debugging System
 * 
 * This class provides comprehensive error logging, debugging capabilities,
 * and performance monitoring for the Live Admin Styler plugin.
 * 
 * Features:
 * - Detailed error logging with context information
 * - Client-side error reporting to server
 * - Debug mode with enhanced error information
 * - Performance metrics logging for optimization
 * - Error categorization and severity levels
 * - Automatic error reporting and analysis
 * 
 * @since 1.2.0
 */
class LAS_Error_Logger {
    
    /**
     * Error severity levels
     */
    const SEVERITY_LOW = 1;
    const SEVERITY_MEDIUM = 2;
    const SEVERITY_HIGH = 3;
    const SEVERITY_CRITICAL = 4;
    
    /**
     * Error categories
     */
    const CATEGORY_JAVASCRIPT = 'javascript';
    const CATEGORY_PHP = 'php';
    const CATEGORY_AJAX = 'ajax';
    const CATEGORY_CSS = 'css';
    const CATEGORY_PERFORMANCE = 'performance';
    const CATEGORY_SECURITY = 'security';
    const CATEGORY_DATABASE = 'database';
    
    /**
     * Maximum number of error logs to store
     */
    const MAX_ERROR_LOGS = 1000;
    
    /**
     * Debug mode flag
     *
     * @var bool
     */
    private $debug_mode;
    
    /**
     * Error log storage option name
     *
     * @var string
     */
    private $error_log_option = 'las_fresh_error_logs';
    
    /**
     * Performance metrics option name
     *
     * @var string
     */
    private $performance_option = 'las_fresh_debug_performance';
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->debug_mode = defined('WP_DEBUG') && WP_DEBUG;
        
        // Initialize error logging hooks
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // PHP error handling
        add_action('wp_loaded', array($this, 'setup_error_handlers'));
        
        // AJAX handlers for client-side error reporting
        add_action('wp_ajax_las_report_client_error', array($this, 'handle_client_error_report'));
        add_action('wp_ajax_las_get_debug_info', array($this, 'get_debug_info'));
        add_action('wp_ajax_las_clear_error_logs', array($this, 'clear_error_logs'));
        
        // Admin notices for critical errors
        add_action('admin_notices', array($this, 'show_critical_error_notices'));
        
        // Cleanup old logs daily
        add_action('las_fresh_daily_cleanup', array($this, 'cleanup_old_logs'));
        if (!wp_next_scheduled('las_fresh_daily_cleanup')) {
            wp_schedule_event(time(), 'daily', 'las_fresh_daily_cleanup');
        }
    }
    
    /**
     * Setup PHP error handlers
     */
    public function setup_error_handlers() {
        // Only set up in debug mode to avoid conflicts
        if ($this->debug_mode) {
            set_error_handler(array($this, 'handle_php_error'), E_ALL);
            register_shutdown_function(array($this, 'handle_fatal_error'));
        }
    }
    
    /**
     * Log error with comprehensive context information
     *
     * @param string $message Error message
     * @param string $category Error category
     * @param int $severity Error severity level
     * @param array $context Additional context data
     * @param Exception|null $exception Exception object if available
     * @return string Error ID for tracking
     */
    public function log_error($message, $category = self::CATEGORY_PHP, $severity = self::SEVERITY_MEDIUM, $context = array(), $exception = null) {
        $error_id = $this->generate_error_id();
        
        // Prepare comprehensive error data
        $error_data = array(
            'id' => $error_id,
            'timestamp' => current_time('mysql'),
            'timestamp_unix' => current_time('timestamp'),
            'message' => sanitize_text_field($message),
            'category' => sanitize_key($category),
            'severity' => intval($severity),
            'severity_label' => $this->get_severity_label($severity),
            'context' => $this->sanitize_context($context),
            'system_info' => $this->get_system_info(),
            'user_info' => $this->get_user_info(),
            'request_info' => $this->get_request_info(),
            'plugin_info' => $this->get_plugin_info(),
            'performance_info' => $this->get_performance_info(),
            'stack_trace' => null,
            'resolved' => false,
            'occurrences' => 1
        );
        
        // Add exception information if available
        if ($exception instanceof Exception) {
            $error_data['stack_trace'] = $exception->getTraceAsString();
            $error_data['exception_file'] = $exception->getFile();
            $error_data['exception_line'] = $exception->getLine();
            $error_data['exception_code'] = $exception->getCode();
        }
        
        // Store error in database
        $this->store_error($error_data);
        
        // Log to WordPress error log
        $this->log_to_wp_error_log($error_data);
        
        // Send to external service if configured
        $this->send_to_external_service($error_data);
        
        // Trigger immediate notifications for critical errors
        if ($severity >= self::SEVERITY_HIGH) {
            $this->handle_critical_error($error_data);
        }
        
        return $error_id;
    }
    
    /**
     * Handle client-side error reports via AJAX
     */
    public function handle_client_error_report() {
        try {
            // Verify nonce
            if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_fresh_admin_nonce')) {
                wp_send_json_error('Invalid security token');
                return;
            }
            
            // Check permissions
            if (!current_user_can('manage_options')) {
                wp_send_json_error('Insufficient permissions');
                return;
            }
            
            // Sanitize input data
            $error_data = array(
                'message' => sanitize_text_field($_POST['message'] ?? 'Unknown client error'),
                'source' => sanitize_text_field($_POST['source'] ?? 'unknown'),
                'line' => intval($_POST['line'] ?? 0),
                'column' => intval($_POST['column'] ?? 0),
                'stack' => sanitize_textarea_field($_POST['stack'] ?? ''),
                'url' => esc_url_raw($_POST['url'] ?? ''),
                'user_agent' => sanitize_text_field($_POST['user_agent'] ?? ''),
                'browser_info' => array(
                    'language' => sanitize_text_field($_POST['language'] ?? ''),
                    'platform' => sanitize_text_field($_POST['platform'] ?? ''),
                    'cookie_enabled' => (bool) ($_POST['cookie_enabled'] ?? false),
                    'online' => (bool) ($_POST['online'] ?? true),
                    'screen_resolution' => sanitize_text_field($_POST['screen_resolution'] ?? ''),
                    'viewport_size' => sanitize_text_field($_POST['viewport_size'] ?? '')
                )
            );
            
            // Log the client-side error
            $error_id = $this->log_error(
                $error_data['message'],
                self::CATEGORY_JAVASCRIPT,
                self::SEVERITY_MEDIUM,
                array(
                    'client_error' => true,
                    'source_file' => $error_data['source'],
                    'line_number' => $error_data['line'],
                    'column_number' => $error_data['column'],
                    'stack_trace' => $error_data['stack'],
                    'page_url' => $error_data['url'],
                    'browser_info' => $error_data['browser_info']
                )
            );
            
            wp_send_json_success(array(
                'error_id' => $error_id,
                'message' => 'Error reported successfully'
            ));
            
        } catch (Exception $e) {
            error_log('LAS Error Logger: Failed to handle client error report: ' . $e->getMessage());
            wp_send_json_error('Failed to process error report');
        }
    }
    
    /**
     * Get comprehensive debug information
     */
    public function get_debug_info() {
        try {
            // Verify nonce and permissions
            if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_fresh_admin_nonce') || !current_user_can('manage_options')) {
                wp_send_json_error('Access denied');
                return;
            }
            
            $debug_info = array(
                'system_info' => $this->get_system_info(),
                'plugin_info' => $this->get_plugin_info(),
                'performance_info' => $this->get_performance_info(),
                'recent_errors' => $this->get_recent_errors(10),
                'error_statistics' => $this->get_error_statistics(),
                'performance_metrics' => $this->get_performance_metrics_summary(),
                'configuration' => $this->get_configuration_info(),
                'active_plugins' => $this->get_active_plugins_info(),
                'theme_info' => $this->get_theme_info()
            );
            
            wp_send_json_success($debug_info);
            
        } catch (Exception $e) {
            error_log('LAS Error Logger: Failed to get debug info: ' . $e->getMessage());
            wp_send_json_error('Failed to retrieve debug information');
        }
    }
    
    /**
     * Clear error logs (admin function)
     */
    public function clear_error_logs() {
        try {
            // Verify nonce and permissions
            if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_fresh_admin_nonce') || !current_user_can('manage_options')) {
                wp_send_json_error('Access denied');
                return;
            }
            
            $cleared_count = $this->clear_all_logs();
            
            wp_send_json_success(array(
                'message' => "Cleared {$cleared_count} error logs",
                'cleared_count' => $cleared_count
            ));
            
        } catch (Exception $e) {
            error_log('LAS Error Logger: Failed to clear error logs: ' . $e->getMessage());
            wp_send_json_error('Failed to clear error logs');
        }
    }
    
    /**
     * Handle PHP errors
     */
    public function handle_php_error($errno, $errstr, $errfile, $errline) {
        // Only handle errors from our plugin
        if (strpos($errfile, 'live-admin-styler') === false) {
            return false;
        }
        
        $severity = $this->map_php_error_severity($errno);
        $category = self::CATEGORY_PHP;
        
        $context = array(
            'php_error_type' => $errno,
            'php_error_name' => $this->get_php_error_name($errno),
            'file' => $errfile,
            'line' => $errline
        );
        
        $this->log_error($errstr, $category, $severity, $context);
        
        // Don't prevent default error handling
        return false;
    }
    
    /**
     * Handle fatal errors
     */
    public function handle_fatal_error() {
        $error = error_get_last();
        
        if ($error && in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR))) {
            // Only handle errors from our plugin
            if (strpos($error['file'], 'live-admin-styler') !== false) {
                $this->log_error(
                    $error['message'],
                    self::CATEGORY_PHP,
                    self::SEVERITY_CRITICAL,
                    array(
                        'fatal_error' => true,
                        'php_error_type' => $error['type'],
                        'file' => $error['file'],
                        'line' => $error['line']
                    )
                );
            }
        }
    }
    
    /**
     * Generate unique error ID
     */
    private function generate_error_id() {
        return 'las_error_' . date('Ymd_His') . '_' . wp_generate_password(8, false);
    }
    
    /**
     * Get severity label
     */
    private function get_severity_label($severity) {
        $labels = array(
            self::SEVERITY_LOW => 'Low',
            self::SEVERITY_MEDIUM => 'Medium',
            self::SEVERITY_HIGH => 'High',
            self::SEVERITY_CRITICAL => 'Critical'
        );
        
        return $labels[$severity] ?? 'Unknown';
    }
    
    /**
     * Sanitize context data
     */
    private function sanitize_context($context) {
        if (!is_array($context)) {
            return array();
        }
        
        $sanitized = array();
        foreach ($context as $key => $value) {
            $clean_key = sanitize_key($key);
            
            if (is_string($value)) {
                $sanitized[$clean_key] = sanitize_text_field($value);
            } elseif (is_array($value)) {
                $sanitized[$clean_key] = $this->sanitize_context($value);
            } elseif (is_numeric($value)) {
                $sanitized[$clean_key] = $value;
            } elseif (is_bool($value)) {
                $sanitized[$clean_key] = $value;
            } else {
                $sanitized[$clean_key] = sanitize_text_field(strval($value));
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Get comprehensive system information
     */
    private function get_system_info() {
        global $wpdb;
        
        return array(
            'wordpress_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
            'mysql_version' => $wpdb->db_version(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'max_input_vars' => ini_get('max_input_vars'),
            'timezone' => wp_timezone_string(),
            'locale' => get_locale(),
            'multisite' => is_multisite(),
            'debug_mode' => defined('WP_DEBUG') && WP_DEBUG,
            'script_debug' => defined('SCRIPT_DEBUG') && SCRIPT_DEBUG
        );
    }
    
    /**
     * Get user information
     */
    private function get_user_info() {
        $current_user = wp_get_current_user();
        
        return array(
            'user_id' => $current_user->ID,
            'user_login' => $current_user->user_login,
            'user_roles' => $current_user->roles,
            'user_capabilities' => array_keys($current_user->allcaps),
            'session_tokens' => count(WP_Session_Tokens::get_instance($current_user->ID)->get_all())
        );
    }
    
    /**
     * Get request information
     */
    private function get_request_info() {
        return array(
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            'query_string' => $_SERVER['QUERY_STRING'] ?? '',
            'http_referer' => $_SERVER['HTTP_REFERER'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? '',
            'http_host' => $_SERVER['HTTP_HOST'] ?? '',
            'https' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
            'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 0
        );
    }
    
    /**
     * Get plugin information
     */
    private function get_plugin_info() {
        return array(
            'plugin_version' => LAS_FRESH_VERSION,
            'plugin_file' => plugin_basename(__FILE__),
            'plugin_dir' => plugin_dir_path(__FILE__),
            'plugin_url' => plugin_dir_url(__FILE__),
            'text_domain' => LAS_FRESH_TEXT_DOMAIN,
            'settings_slug' => LAS_FRESH_SETTINGS_SLUG,
            'option_name' => LAS_FRESH_OPTION_NAME
        );
    }
    
    /**
     * Get performance information
     */
    private function get_performance_info() {
        return array(
            'memory_usage' => memory_get_usage(true),
            'memory_usage_formatted' => size_format(memory_get_usage(true)),
            'peak_memory' => memory_get_peak_usage(true),
            'peak_memory_formatted' => size_format(memory_get_peak_usage(true)),
            'memory_limit' => wp_convert_hr_to_bytes(ini_get('memory_limit')),
            'memory_limit_formatted' => ini_get('memory_limit'),
            'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
            'max_execution_time' => ini_get('max_execution_time'),
            'opcache_enabled' => function_exists('opcache_get_status') && opcache_get_status() !== false,
            'object_cache' => wp_using_ext_object_cache()
        );
    }
    
    /**
     * Store error in database
     */
    private function store_error($error_data) {
        $stored_errors = get_option($this->error_log_option, array());
        
        // Check for duplicate errors (same message and context within last hour)
        $duplicate_key = $this->find_duplicate_error($stored_errors, $error_data);
        
        if ($duplicate_key !== false) {
            // Increment occurrence count for duplicate
            $stored_errors[$duplicate_key]['occurrences']++;
            $stored_errors[$duplicate_key]['last_occurrence'] = $error_data['timestamp'];
        } else {
            // Add new error
            $stored_errors[] = $error_data;
        }
        
        // Limit stored errors to prevent database bloat
        if (count($stored_errors) > self::MAX_ERROR_LOGS) {
            // Remove oldest errors, keeping critical ones
            $stored_errors = $this->trim_error_logs($stored_errors);
        }
        
        update_option($this->error_log_option, $stored_errors, false);
    }
    
    /**
     * Find duplicate error within recent timeframe
     */
    private function find_duplicate_error($stored_errors, $new_error) {
        $cutoff_time = current_time('timestamp') - 3600; // 1 hour
        
        foreach ($stored_errors as $key => $stored_error) {
            if ($stored_error['timestamp_unix'] < $cutoff_time) {
                continue;
            }
            
            if ($stored_error['message'] === $new_error['message'] &&
                $stored_error['category'] === $new_error['category'] &&
                $stored_error['severity'] === $new_error['severity']) {
                return $key;
            }
        }
        
        return false;
    }
    
    /**
     * Trim error logs while preserving critical errors
     */
    private function trim_error_logs($errors) {
        // Separate critical errors from others
        $critical_errors = array();
        $other_errors = array();
        
        foreach ($errors as $error) {
            if ($error['severity'] >= self::SEVERITY_HIGH) {
                $critical_errors[] = $error;
            } else {
                $other_errors[] = $error;
            }
        }
        
        // Keep all critical errors and most recent other errors
        $max_other_errors = self::MAX_ERROR_LOGS - count($critical_errors);
        if ($max_other_errors > 0) {
            // Sort by timestamp and keep most recent
            usort($other_errors, function($a, $b) {
                return $b['timestamp_unix'] - $a['timestamp_unix'];
            });
            $other_errors = array_slice($other_errors, 0, $max_other_errors);
        } else {
            $other_errors = array();
        }
        
        return array_merge($critical_errors, $other_errors);
    }
    
    /**
     * Log to WordPress error log
     */
    private function log_to_wp_error_log($error_data) {
        $log_message = sprintf(
            'LAS Error [%s][%s]: %s | Context: %s',
            $error_data['severity_label'],
            $error_data['category'],
            $error_data['message'],
            wp_json_encode($error_data['context'])
        );
        
        error_log($log_message);
    }
    
    /**
     * Send error to external monitoring service
     */
    private function send_to_external_service($error_data) {
        // Only send critical errors to external service
        if ($error_data['severity'] < self::SEVERITY_HIGH) {
            return;
        }
        
        // Check if external service is configured
        if (!defined('LAS_ERROR_TRACKING_ENDPOINT') || !LAS_ERROR_TRACKING_ENDPOINT) {
            return;
        }
        
        // Prepare payload
        $payload = array(
            'plugin' => 'live-admin-styler',
            'version' => LAS_FRESH_VERSION,
            'error' => $error_data,
            'site_url' => get_site_url(),
            'timestamp' => current_time('c')
        );
        
        // Send asynchronously to avoid blocking
        wp_remote_post(LAS_ERROR_TRACKING_ENDPOINT, array(
            'timeout' => 5,
            'blocking' => false,
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'Live-Admin-Styler/' . LAS_FRESH_VERSION
            ),
            'body' => wp_json_encode($payload)
        ));
    }
    
    /**
     * Handle critical errors
     */
    private function handle_critical_error($error_data) {
        // Store critical error flag for admin notice
        set_transient('las_fresh_critical_error', $error_data, 24 * HOUR_IN_SECONDS);
        
        // Log critical error separately
        error_log('LAS CRITICAL ERROR: ' . wp_json_encode($error_data));
        
        // Send email notification if configured
        $this->send_critical_error_email($error_data);
    }
    
    /**
     * Send critical error email notification
     */
    private function send_critical_error_email($error_data) {
        // Only send if email notifications are enabled
        if (!apply_filters('las_fresh_send_critical_error_emails', false)) {
            return;
        }
        
        $admin_email = get_option('admin_email');
        if (!$admin_email) {
            return;
        }
        
        $subject = sprintf(
            '[%s] Live Admin Styler Critical Error',
            get_bloginfo('name')
        );
        
        $message = sprintf(
            "A critical error occurred in the Live Admin Styler plugin:\n\n" .
            "Error: %s\n" .
            "Category: %s\n" .
            "Severity: %s\n" .
            "Time: %s\n" .
            "Site: %s\n\n" .
            "Please check your WordPress admin area for more details.",
            $error_data['message'],
            $error_data['category'],
            $error_data['severity_label'],
            $error_data['timestamp'],
            get_site_url()
        );
        
        wp_mail($admin_email, $subject, $message);
    }
    
    /**
     * Show critical error notices in admin
     */
    public function show_critical_error_notices() {
        $critical_error = get_transient('las_fresh_critical_error');
        
        if ($critical_error && current_user_can('manage_options')) {
            echo '<div class="notice notice-error is-dismissible">';
            echo '<p><strong>Live Admin Styler Critical Error:</strong> ' . esc_html($critical_error['message']) . '</p>';
            echo '<p>Error ID: <code>' . esc_html($critical_error['id']) . '</code> | ';
            echo 'Time: ' . esc_html($critical_error['timestamp']) . '</p>';
            echo '</div>';
            
            // Clear the transient after showing
            delete_transient('las_fresh_critical_error');
        }
    }
    
    /**
     * Get recent errors
     */
    public function get_recent_errors($limit = 50) {
        $stored_errors = get_option($this->error_log_option, array());
        
        // Sort by timestamp (most recent first)
        usort($stored_errors, function($a, $b) {
            return $b['timestamp_unix'] - $a['timestamp_unix'];
        });
        
        return array_slice($stored_errors, 0, $limit);
    }
    
    /**
     * Get error statistics
     */
    public function get_error_statistics() {
        $stored_errors = get_option($this->error_log_option, array());
        $cutoff_time = current_time('timestamp') - (7 * 24 * 60 * 60); // Last 7 days
        
        $stats = array(
            'total_errors' => count($stored_errors),
            'recent_errors' => 0,
            'by_severity' => array(),
            'by_category' => array(),
            'by_day' => array()
        );
        
        foreach ($stored_errors as $error) {
            // Count recent errors
            if ($error['timestamp_unix'] >= $cutoff_time) {
                $stats['recent_errors']++;
            }
            
            // Count by severity
            $severity_label = $error['severity_label'];
            $stats['by_severity'][$severity_label] = ($stats['by_severity'][$severity_label] ?? 0) + 1;
            
            // Count by category
            $category = $error['category'];
            $stats['by_category'][$category] = ($stats['by_category'][$category] ?? 0) + 1;
            
            // Count by day (last 7 days)
            $day = date('Y-m-d', $error['timestamp_unix']);
            if ($error['timestamp_unix'] >= $cutoff_time) {
                $stats['by_day'][$day] = ($stats['by_day'][$day] ?? 0) + 1;
            }
        }
        
        return $stats;
    }
    
    /**
     * Get performance metrics summary
     */
    public function get_performance_metrics_summary() {
        if (!function_exists('las_fresh_get_performance_metrics')) {
            return array('error' => 'Performance metrics function not available');
        }
        
        $metrics = las_fresh_get_performance_metrics(null, 100);
        
        if (empty($metrics)) {
            return array('message' => 'No performance metrics available');
        }
        
        $summary = array(
            'total_operations' => count($metrics),
            'avg_execution_time' => 0,
            'max_execution_time' => 0,
            'avg_memory_usage' => 0,
            'max_memory_usage' => 0,
            'slow_operations' => 0,
            'by_operation_type' => array()
        );
        
        $total_execution_time = 0;
        $total_memory_usage = 0;
        
        foreach ($metrics as $metric) {
            $execution_time = $metric['execution_time_ms'] ?? 0;
            $memory_usage = $metric['memory_usage_bytes'] ?? 0;
            $operation_type = $metric['operation_type'] ?? 'unknown';
            
            $total_execution_time += $execution_time;
            $total_memory_usage += $memory_usage;
            
            if ($execution_time > $summary['max_execution_time']) {
                $summary['max_execution_time'] = $execution_time;
            }
            
            if ($memory_usage > $summary['max_memory_usage']) {
                $summary['max_memory_usage'] = $memory_usage;
            }
            
            if ($execution_time > 500) { // Slow operation threshold
                $summary['slow_operations']++;
            }
            
            $summary['by_operation_type'][$operation_type] = ($summary['by_operation_type'][$operation_type] ?? 0) + 1;
        }
        
        $summary['avg_execution_time'] = $total_execution_time / count($metrics);
        $summary['avg_memory_usage'] = $total_memory_usage / count($metrics);
        $summary['avg_memory_usage_formatted'] = size_format($summary['avg_memory_usage']);
        $summary['max_memory_usage_formatted'] = size_format($summary['max_memory_usage']);
        
        return $summary;
    }
    
    /**
     * Get configuration information
     */
    private function get_configuration_info() {
        $options = las_fresh_get_options();
        
        return array(
            'total_settings' => count($options),
            'active_template' => $options['active_template'] ?? 'default',
            'custom_css_length' => strlen($options['custom_css_rules'] ?? ''),
            'has_custom_logos' => !empty($options['admin_menu_logo']) || !empty($options['login_logo']),
            'detached_elements' => array(
                'admin_menu' => (bool) ($options['admin_menu_detached'] ?? false),
                'admin_bar' => (bool) ($options['admin_bar_detached'] ?? false)
            )
        );
    }
    
    /**
     * Get active plugins information
     */
    private function get_active_plugins_info() {
        $active_plugins = get_option('active_plugins', array());
        $plugin_info = array();
        
        foreach ($active_plugins as $plugin) {
            $plugin_data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin, false, false);
            $plugin_info[] = array(
                'name' => $plugin_data['Name'],
                'version' => $plugin_data['Version'],
                'file' => $plugin
            );
        }
        
        return $plugin_info;
    }
    
    /**
     * Get theme information
     */
    private function get_theme_info() {
        $theme = wp_get_theme();
        
        return array(
            'name' => $theme->get('Name'),
            'version' => $theme->get('Version'),
            'template' => $theme->get_template(),
            'stylesheet' => $theme->get_stylesheet(),
            'parent_theme' => $theme->parent() ? $theme->parent()->get('Name') : null
        );
    }
    
    /**
     * Map PHP error severity
     */
    private function map_php_error_severity($errno) {
        switch ($errno) {
            case E_ERROR:
            case E_PARSE:
            case E_CORE_ERROR:
            case E_COMPILE_ERROR:
                return self::SEVERITY_CRITICAL;
            
            case E_WARNING:
            case E_CORE_WARNING:
            case E_COMPILE_WARNING:
            case E_USER_ERROR:
                return self::SEVERITY_HIGH;
            
            case E_NOTICE:
            case E_USER_WARNING:
                return self::SEVERITY_MEDIUM;
            
            case E_STRICT:
            case E_DEPRECATED:
            case E_USER_NOTICE:
            case E_USER_DEPRECATED:
            default:
                return self::SEVERITY_LOW;
        }
    }
    
    /**
     * Get PHP error name
     */
    private function get_php_error_name($errno) {
        $error_names = array(
            E_ERROR => 'E_ERROR',
            E_WARNING => 'E_WARNING',
            E_PARSE => 'E_PARSE',
            E_NOTICE => 'E_NOTICE',
            E_CORE_ERROR => 'E_CORE_ERROR',
            E_CORE_WARNING => 'E_CORE_WARNING',
            E_COMPILE_ERROR => 'E_COMPILE_ERROR',
            E_COMPILE_WARNING => 'E_COMPILE_WARNING',
            E_USER_ERROR => 'E_USER_ERROR',
            E_USER_WARNING => 'E_USER_WARNING',
            E_USER_NOTICE => 'E_USER_NOTICE',
            E_STRICT => 'E_STRICT',
            E_RECOVERABLE_ERROR => 'E_RECOVERABLE_ERROR',
            E_DEPRECATED => 'E_DEPRECATED',
            E_USER_DEPRECATED => 'E_USER_DEPRECATED'
        );
        
        return $error_names[$errno] ?? 'UNKNOWN_ERROR';
    }
    
    /**
     * Clear all error logs
     */
    public function clear_all_logs() {
        $stored_errors = get_option($this->error_log_option, array());
        $count = count($stored_errors);
        
        delete_option($this->error_log_option);
        
        return $count;
    }
    
    /**
     * Cleanup old logs (called daily)
     */
    public function cleanup_old_logs() {
        $stored_errors = get_option($this->error_log_option, array());
        $cutoff_time = current_time('timestamp') - (30 * 24 * 60 * 60); // 30 days
        
        $filtered_errors = array_filter($stored_errors, function($error) use ($cutoff_time) {
            // Keep critical errors longer (90 days)
            if ($error['severity'] >= self::SEVERITY_HIGH) {
                $critical_cutoff = current_time('timestamp') - (90 * 24 * 60 * 60);
                return $error['timestamp_unix'] >= $critical_cutoff;
            }
            
            return $error['timestamp_unix'] >= $cutoff_time;
        });
        
        if (count($filtered_errors) !== count($stored_errors)) {
            update_option($this->error_log_option, array_values($filtered_errors), false);
        }
    }
    
    /**
     * Get debug mode status
     */
    public function is_debug_mode() {
        return $this->debug_mode;
    }
    
    /**
     * Enable debug mode
     */
    public function enable_debug_mode() {
        $this->debug_mode = true;
        update_option('las_fresh_debug_mode', true);
    }
    
    /**
     * Disable debug mode
     */
    public function disable_debug_mode() {
        $this->debug_mode = false;
        delete_option('las_fresh_debug_mode');
    }
}

/**
 * File Manager class for automatic cleanup of unnecessary files.
 * 
 * This class handles the automatic cleanup of temporary files, summaries,
 * and other unnecessary files that may accumulate during development.
 * It provides safe file deletion with proper validation and security checks.
 * 
 * Features:
 * - Automatic cleanup on plugin activation/deactivation
 * - Manual cleanup via admin interface
 * - Safe file deletion with security validation
 * - Preview functionality to see what files would be deleted
 * - Comprehensive logging and error handling
 * 
 * @since 1.1.0
 */
class LAS_File_Manager {
    
    /**
     * Array of file patterns to clean up.
     *
     * @var array
     */
    private $cleanup_files = [
        'MENU_SIDEBAR_FIXES_SUMMARY.md',
        'TASK_*_SUMMARY.md',
        'integration-verification.js',
        'test-*.html'
    ];
    
    /**
     * Array of specific files to clean up (exact matches).
     *
     * @var array
     */
    private $cleanup_exact_files = [
        'MENU_SIDEBAR_FIXES_SUMMARY.md',
        'TASK_10_INTEGRATION_SUMMARY.md',
        'TASK_7_IMPLEMENTATION_SUMMARY.md',
        'TASK_8_ERROR_HANDLING_SUMMARY.md',
        'integration-verification.js'
    ];
    
    /**
     * Initialize the file manager.
     */
    public function __construct() {
        // Add admin action for AJAX cleanup
        add_action('wp_ajax_las_file_cleanup', array($this, 'ajax_cleanup'));
    }
    
    /**
     * Validate that we're operating within the plugin directory.
     *
     * @return bool True if validation passes
     */
    private function validate_plugin_directory() {
        $plugin_dir = plugin_dir_path(__FILE__);
        $real_plugin_dir = realpath($plugin_dir);
        
        if ($real_plugin_dir === false) {
            error_log('LAS File Manager: Cannot resolve plugin directory path');
            return false;
        }
        
        // Ensure we're in a WordPress plugin directory
        if (!file_exists($real_plugin_dir . '/live-admin-styler.php')) {
            error_log('LAS File Manager: Main plugin file not found in expected location');
            return false;
        }
        
        return true;
    }
    
    /**
     * Clean up unnecessary files with proper validation.
     *
     * @return array Results of cleanup operation
     */
    public function cleanup_unnecessary_files() {
        $results = [
            'success' => [],
            'failed' => [],
            'skipped' => []
        ];
        
        // Validate plugin directory first
        if (!$this->validate_plugin_directory()) {
            $results['failed'][] = [
                'status' => 'failed',
                'file' => 'validation',
                'reason' => 'Plugin directory validation failed'
            ];
            return $results;
        }
        
        $plugin_dir = plugin_dir_path(__FILE__);
        
        // Clean up exact file matches first
        foreach ($this->cleanup_exact_files as $filename) {
            $file_path = $plugin_dir . $filename;
            $result = $this->safe_delete_file($file_path, $filename);
            $results[$result['status']][] = $result;
        }
        
        // Clean up pattern matches
        foreach ($this->cleanup_files as $pattern) {
            // Skip exact matches as they're already processed
            if (in_array($pattern, $this->cleanup_exact_files)) {
                continue;
            }
            
            $files = glob($plugin_dir . $pattern);
            if ($files) {
                foreach ($files as $file_path) {
                    $filename = basename($file_path);
                    $result = $this->safe_delete_file($file_path, $filename);
                    $results[$result['status']][] = $result;
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Safely delete a file with proper validation.
     *
     * @param string $file_path Full path to the file
     * @param string $filename  Filename for logging
     * @return array Result of deletion attempt
     */
    private function safe_delete_file($file_path, $filename) {
        // Validate file path is within plugin directory
        $plugin_dir = plugin_dir_path(__FILE__);
        $real_plugin_dir = realpath($plugin_dir);
        $real_file_path = realpath($file_path);
        
        // If realpath returns false, file doesn't exist
        if ($real_file_path === false) {
            return [
                'status' => 'skipped',
                'file' => $filename,
                'reason' => 'File does not exist'
            ];
        }
        
        // Security check: ensure file is within plugin directory
        if (strpos($real_file_path, $real_plugin_dir) !== 0) {
            return [
                'status' => 'failed',
                'file' => $filename,
                'reason' => 'File outside plugin directory - security violation'
            ];
        }
        
        // Additional security: don't delete core plugin files
        $protected_files = [
            'live-admin-styler.php',
            'phpunit.xml.dist'
        ];
        
        if (in_array($filename, $protected_files)) {
            return [
                'status' => 'skipped',
                'file' => $filename,
                'reason' => 'Protected core file'
            ];
        }
        
        // Don't delete files in protected directories
        $protected_dirs = ['includes', 'assets', 'js', 'languages', 'tests', '.kiro', '.idea', '.vscode'];
        foreach ($protected_dirs as $dir) {
            if (strpos($real_file_path, $real_plugin_dir . DIRECTORY_SEPARATOR . $dir) === 0) {
                return [
                    'status' => 'skipped',
                    'file' => $filename,
                    'reason' => 'File in protected directory: ' . $dir
                ];
            }
        }
        
        // Check if file exists and is writable
        if (!file_exists($file_path)) {
            return [
                'status' => 'skipped',
                'file' => $filename,
                'reason' => 'File does not exist'
            ];
        }
        
        if (!is_writable($file_path)) {
            return [
                'status' => 'failed',
                'file' => $filename,
                'reason' => 'File is not writable'
            ];
        }
        
        // Attempt to delete the file
        if (unlink($file_path)) {
            return [
                'status' => 'success',
                'file' => $filename,
                'reason' => 'File successfully deleted'
            ];
        } else {
            return [
                'status' => 'failed',
                'file' => $filename,
                'reason' => 'Failed to delete file'
            ];
        }
    }
    
    /**
     * Cleanup files on plugin activation.
     */
    public function cleanup_on_activation() {
        $results = $this->cleanup_unnecessary_files();
        
        // Log cleanup results
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS File Cleanup on Activation: ' . print_r($results, true));
        }
        
        // Store cleanup results in option for admin notice
        update_option('las_fresh_cleanup_results', $results, false);
    }
    
    /**
     * Cleanup files on plugin deactivation.
     */
    public function cleanup_on_deactivation() {
        $results = $this->cleanup_unnecessary_files();
        
        // Log cleanup results
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS File Cleanup on Deactivation: ' . print_r($results, true));
        }
    }
    
    /**
     * Manual cleanup trigger for admin use.
     *
     * @return array Results of cleanup operation
     */
    public function manual_cleanup() {
        $results = $this->cleanup_unnecessary_files();
        
        // Log cleanup results
        error_log('LAS Manual File Cleanup: ' . print_r($results, true));
        
        return $results;
    }
    
    /**
     * Get list of files that would be cleaned up (dry run).
     *
     * @return array List of files that would be affected
     */
    public function get_cleanup_preview() {
        $preview = [];
        $plugin_dir = plugin_dir_path(__FILE__);
        
        // Check exact file matches
        foreach ($this->cleanup_exact_files as $filename) {
            $file_path = $plugin_dir . $filename;
            if (file_exists($file_path)) {
                $preview[] = [
                    'file' => $filename,
                    'path' => $file_path,
                    'size' => filesize($file_path),
                    'type' => 'exact_match'
                ];
            }
        }
        
        // Check pattern matches
        foreach ($this->cleanup_files as $pattern) {
            if (in_array($pattern, $this->cleanup_exact_files)) {
                continue;
            }
            
            $files = glob($plugin_dir . $pattern);
            if ($files) {
                foreach ($files as $file_path) {
                    $filename = basename($file_path);
                    $preview[] = [
                        'file' => $filename,
                        'path' => $file_path,
                        'size' => filesize($file_path),
                        'type' => 'pattern_match',
                        'pattern' => $pattern
                    ];
                }
            }
        }
        
        return $preview;
    }
    
    /**
     * AJAX handler for file cleanup.
     */
    public function ajax_cleanup() {
        try {
            // Use consistent validation with unified nonce action
            if (!wp_doing_ajax()) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid request type for this endpoint.',
                    'invalid_request_type'
                ));
            }

            // Validate nonce with unified action
            $nonce = las_sanitize_ajax_input($_POST['nonce'] ?? '', 'text');
            if (!wp_verify_nonce($nonce, 'las_fresh_admin_nonce')) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid security token.',
                    'invalid_nonce'
                ));
            }

            // Check capabilities
            if (!current_user_can('manage_options')) {
                wp_send_json_error(las_create_ajax_error_response(
                    'You do not have sufficient permissions to perform this action.',
                    'insufficient_permissions'
                ));
            }
            
            $results = $this->manual_cleanup();
            
            if (!empty($results['success']) || !empty($results['failed'])) {
                wp_send_json_success(las_create_ajax_success_response(
                    array('results' => $results),
                    sprintf(
                        __('Cleanup completed: %d files removed, %d failed, %d skipped.', 'live-admin-styler'),
                        count($results['success']),
                        count($results['failed']),
                        count($results['skipped'])
                    )
                ));
            } else {
                wp_send_json_success(las_create_ajax_success_response(
                    array('results' => $results),
                    __('No files found for cleanup.', 'live-admin-styler')
                ));
            }
            
        } catch (Exception $e) {
            error_log('LAS File Cleanup Error: ' . $e->getMessage());
            
            wp_send_json_error(las_create_ajax_error_response(
                'An error occurred during file cleanup.',
                'cleanup_failed'
            ));
        }
    }
}

/**
 * Enhanced Security Manager for Live Admin Styler
 * 
 * This class provides comprehensive security features including:
 * - Enhanced CSRF protection with nonce refresh
 * - Rate limiting for AJAX requests
 * - Security logging for suspicious activities
 * - Input validation and sanitization
 * - Brute force protection
 * 
 * @since 1.1.0
 */
class LAS_Security_Manager {
    
    /**
     * Rate limiting data storage key.
     */
    const RATE_LIMIT_KEY = 'las_rate_limits';
    
    /**
     * Security log option key.
     */
    const SECURITY_LOG_KEY = 'las_security_log';
    
    /**
     * Maximum requests per minute per user.
     */
    const MAX_REQUESTS_PER_MINUTE = 60;
    
    /**
     * Maximum requests per hour per user.
     */
    const MAX_REQUESTS_PER_HOUR = 300;
    
    /**
     * Nonce refresh interval in seconds.
     */
    const NONCE_REFRESH_INTERVAL = 43200; // 12 hours
    
    /**
     * Maximum security log entries.
     */
    const MAX_LOG_ENTRIES = 1000;
    
    /**
     * Initialize security manager.
     */
    public function __construct() {
        add_action('wp_ajax_las_refresh_nonce', array($this, 'ajax_refresh_nonce'));
        add_action('wp_ajax_las_get_security_status', array($this, 'ajax_get_security_status'));
        add_action('wp_ajax_las_clear_security_log', array($this, 'ajax_clear_security_log'));
        
        // Include nonce refresh handler
        require_once plugin_dir_path(__FILE__) . 'includes/ajax-nonce-refresh.php';
        
        // Hook into all LAS AJAX actions for rate limiting
        add_action('wp_ajax_las_get_preview_css', array($this, 'check_rate_limit'), 1);
        add_action('wp_ajax_las_save_tab_state', array($this, 'check_rate_limit'), 1);
        add_action('wp_ajax_las_save_user_preferences', array($this, 'check_rate_limit'), 1);
        add_action('wp_ajax_las_get_user_preferences', array($this, 'check_rate_limit'), 1);
        add_action('wp_ajax_las_sync_user_state', array($this, 'check_rate_limit'), 1);
        add_action('wp_ajax_las_reset_user_state', array($this, 'check_rate_limit'), 1);
        add_action('wp_ajax_las_get_performance_stats', array($this, 'check_rate_limit'), 1);
        add_action('wp_ajax_las_report_error', array($this, 'check_rate_limit'), 1);
        
        // Schedule nonce cleanup
        if (!wp_next_scheduled('las_cleanup_expired_nonces')) {
            wp_schedule_event(time(), 'daily', 'las_cleanup_expired_nonces');
        }
        add_action('las_cleanup_expired_nonces', array($this, 'cleanup_expired_nonces'));
    }
    
    /**
     * Enhanced nonce verification with additional security checks.
     *
     * @param string $nonce The nonce to verify.
     * @param string $action The action for which the nonce was created.
     * @return bool True if nonce is valid, false otherwise.
     */
    public function verify_enhanced_nonce($nonce, $action = 'las_admin_nonce') {
        // Basic nonce verification
        if (!wp_verify_nonce($nonce, $action)) {
            $this->log_security_event('invalid_nonce', array(
                'action' => $action,
                'provided_nonce' => substr($nonce, 0, 10) . '...',
                'user_id' => get_current_user_id(),
                'ip_address' => $this->get_client_ip(),
                'user_agent' => $this->get_user_agent_hash()
            ));
            return false;
        }
        
        // Check if nonce is too old (additional security layer)
        $nonce_age = $this->get_nonce_age($nonce);
        if ($nonce_age > self::NONCE_REFRESH_INTERVAL) {
            $this->log_security_event('expired_nonce', array(
                'action' => $action,
                'nonce_age' => $nonce_age,
                'user_id' => get_current_user_id(),
                'ip_address' => $this->get_client_ip()
            ));
            return false;
        }
        
        return true;
    }
    
    /**
     * Generate a new nonce with enhanced security.
     *
     * @param string $action The action for which to create the nonce.
     * @return string The generated nonce.
     */
    public function create_enhanced_nonce($action = 'las_admin_nonce') {
        $nonce = wp_create_nonce($action);
        
        // Store nonce creation time for age verification
        $nonce_data = get_option('las_nonce_data', array());
        $nonce_data[$nonce] = array(
            'created' => time(),
            'action' => $action,
            'user_id' => get_current_user_id(),
            'ip_address' => $this->get_client_ip()
        );
        
        // Clean old nonces to prevent database bloat
        $nonce_data = array_slice($nonce_data, -100, null, true);
        update_option('las_nonce_data', $nonce_data, false);
        
        return $nonce;
    }
    
    /**
     * Get the age of a nonce in seconds.
     *
     * @param string $nonce The nonce to check.
     * @return int Age in seconds, or 0 if not found.
     */
    private function get_nonce_age($nonce) {
        $nonce_data = get_option('las_nonce_data', array());
        
        if (isset($nonce_data[$nonce]['created'])) {
            return time() - $nonce_data[$nonce]['created'];
        }
        
        return 0;
    }
    
    /**
     * Check rate limits for the current user.
     *
     * @return bool True if within limits, false if exceeded.
     */
    public function check_rate_limit() {
        $user_id = get_current_user_id();
        $ip_address = $this->get_client_ip();
        $current_time = time();
        
        // Get current rate limit data
        $rate_limits = get_option(self::RATE_LIMIT_KEY, array());
        
        // Create unique key for user/IP combination
        $limit_key = $user_id . '_' . md5($ip_address);
        
        // Initialize user data if not exists
        if (!isset($rate_limits[$limit_key])) {
            $rate_limits[$limit_key] = array(
                'requests' => array(),
                'blocked_until' => 0
            );
        }
        
        $user_limits = &$rate_limits[$limit_key];
        
        // Check if user is currently blocked
        if ($user_limits['blocked_until'] > $current_time) {
            $this->log_security_event('rate_limit_blocked', array(
                'user_id' => $user_id,
                'ip_address' => $ip_address,
                'blocked_until' => $user_limits['blocked_until'],
                'action' => current_action()
            ));
            
            wp_send_json_error(array(
                'message' => 'Rate limit exceeded. Please try again later.',
                'code' => 'rate_limit_exceeded',
                'retry_after' => $user_limits['blocked_until'] - $current_time
            ));
            return false;
        }
        
        // Clean old requests (older than 1 hour)
        $user_limits['requests'] = array_filter($user_limits['requests'], function($timestamp) use ($current_time) {
            return ($current_time - $timestamp) < 3600; // 1 hour
        });
        
        // Add current request
        $user_limits['requests'][] = $current_time;
        
        // Check minute limit
        $requests_last_minute = array_filter($user_limits['requests'], function($timestamp) use ($current_time) {
            return ($current_time - $timestamp) < 60; // 1 minute
        });
        
        if (count($requests_last_minute) > self::MAX_REQUESTS_PER_MINUTE) {
            $user_limits['blocked_until'] = $current_time + 300; // Block for 5 minutes
            
            $this->log_security_event('rate_limit_exceeded_minute', array(
                'user_id' => $user_id,
                'ip_address' => $ip_address,
                'requests_count' => count($requests_last_minute),
                'limit' => self::MAX_REQUESTS_PER_MINUTE,
                'blocked_until' => $user_limits['blocked_until'],
                'action' => current_action()
            ));
            
            update_option(self::RATE_LIMIT_KEY, $rate_limits, false);
            
            wp_send_json_error(array(
                'message' => 'Too many requests per minute. Please slow down.',
                'code' => 'rate_limit_exceeded',
                'retry_after' => 300
            ));
            return false;
        }
        
        // Check hour limit
        if (count($user_limits['requests']) > self::MAX_REQUESTS_PER_HOUR) {
            $user_limits['blocked_until'] = $current_time + 1800; // Block for 30 minutes
            
            $this->log_security_event('rate_limit_exceeded_hour', array(
                'user_id' => $user_id,
                'ip_address' => $ip_address,
                'requests_count' => count($user_limits['requests']),
                'limit' => self::MAX_REQUESTS_PER_HOUR,
                'blocked_until' => $user_limits['blocked_until'],
                'action' => current_action()
            ));
            
            update_option(self::RATE_LIMIT_KEY, $rate_limits, false);
            
            wp_send_json_error(array(
                'message' => 'Too many requests per hour. Please try again later.',
                'code' => 'rate_limit_exceeded',
                'retry_after' => 1800
            ));
            return false;
        }
        
        // Update rate limits
        update_option(self::RATE_LIMIT_KEY, $rate_limits, false);
        
        return true;
    }
    
    /**
     * Enhanced input sanitization with security logging.
     *
     * @param mixed  $input The input to sanitize.
     * @param string $type  The expected input type.
     * @param array  $options Additional sanitization options.
     * @return mixed Sanitized input.
     */
    public function sanitize_input($input, $type = 'text', $options = array()) {
        $original_input = $input;
        
        switch ($type) {
            case 'color':
                $sanitized = sanitize_hex_color($input);
                if (!$sanitized && !empty($input)) {
                    $this->log_security_event('invalid_color_input', array(
                        'input' => $input,
                        'user_id' => get_current_user_id()
                    ));
                }
                return $sanitized ?: '#000000';
                
            case 'integer':
                $sanitized = intval($input);
                $min = isset($options['min']) ? $options['min'] : null;
                $max = isset($options['max']) ? $options['max'] : null;
                
                if ($min !== null && $sanitized < $min) {
                    $this->log_security_event('input_below_minimum', array(
                        'input' => $input,
                        'sanitized' => $sanitized,
                        'minimum' => $min,
                        'user_id' => get_current_user_id()
                    ));
                    $sanitized = $min;
                }
                
                if ($max !== null && $sanitized > $max) {
                    $this->log_security_event('input_above_maximum', array(
                        'input' => $input,
                        'sanitized' => $sanitized,
                        'maximum' => $max,
                        'user_id' => get_current_user_id()
                    ));
                    $sanitized = $max;
                }
                
                return $sanitized;
                
            case 'boolean':
                return (bool) $input;
                
            case 'select':
                $allowed = isset($options['allowed']) ? $options['allowed'] : array();
                if (!empty($allowed) && !in_array($input, $allowed)) {
                    $this->log_security_event('invalid_select_option', array(
                        'input' => $input,
                        'allowed' => $allowed,
                        'user_id' => get_current_user_id()
                    ));
                    return isset($options['default']) ? $options['default'] : $allowed[0];
                }
                return sanitize_key($input);
                
            case 'css':
                // Enhanced CSS sanitization
                $sanitized = wp_strip_all_tags($input);
                $sanitized = preg_replace('/[<>"\']/', '', $sanitized);
                
                // Check for suspicious CSS patterns
                $suspicious_patterns = array(
                    '/javascript:/i',
                    '/expression\s*\(/i',
                    '/behavior\s*:/i',
                    '/@import/i',
                    '/binding\s*:/i'
                );
                
                foreach ($suspicious_patterns as $pattern) {
                    if (preg_match($pattern, $sanitized)) {
                        $this->log_security_event('suspicious_css_input', array(
                            'input' => substr($input, 0, 200),
                            'pattern' => $pattern,
                            'user_id' => get_current_user_id()
                        ));
                        return '';
                    }
                }
                
                return $sanitized;
                
            case 'url':
                $sanitized = esc_url_raw($input);
                if ($sanitized !== $input && !empty($input)) {
                    $this->log_security_event('url_sanitization', array(
                        'original' => $input,
                        'sanitized' => $sanitized,
                        'user_id' => get_current_user_id()
                    ));
                }
                return $sanitized;
                
            default:
                $sanitized = sanitize_text_field($input);
                
                // Check for potential XSS attempts
                if ($sanitized !== $original_input && !empty($original_input)) {
                    $this->log_security_event('text_sanitization', array(
                        'original' => substr($original_input, 0, 200),
                        'sanitized' => substr($sanitized, 0, 200),
                        'user_id' => get_current_user_id()
                    ));
                }
                
                return $sanitized;
        }
    }
    
    /**
     * Log security events.
     *
     * @param string $event_type Type of security event.
     * @param array  $data       Event data.
     */
    public function log_security_event($event_type, $data = array()) {
        $log_entry = array(
            'timestamp' => current_time('mysql'),
            'event_type' => $event_type,
            'user_id' => get_current_user_id(),
            'ip_address' => $this->get_client_ip(),
            'user_agent' => $this->get_user_agent_hash(),
            'request_uri' => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '',
            'data' => $data
        );
        
        // Get current log
        $security_log = get_option(self::SECURITY_LOG_KEY, array());
        
        // Add new entry
        array_unshift($security_log, $log_entry);
        
        // Limit log size
        if (count($security_log) > self::MAX_LOG_ENTRIES) {
            $security_log = array_slice($security_log, 0, self::MAX_LOG_ENTRIES);
        }
        
        // Save log
        update_option(self::SECURITY_LOG_KEY, $security_log, false);
        
        // Also log to PHP error log for critical events
        $critical_events = array('rate_limit_exceeded_minute', 'rate_limit_exceeded_hour', 'suspicious_css_input', 'invalid_nonce');
        if (in_array($event_type, $critical_events)) {
            error_log('LAS Security Event [' . $event_type . ']: ' . wp_json_encode($log_entry));
        }
    }
    
    /**
     * Get client IP address with proxy support.
     *
     * @return string Client IP address.
     */
    private function get_client_ip() {
        $ip_keys = array('HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR');
        
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                // Handle comma-separated IPs (from proxies)
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
    }
    
    /**
     * Get hashed user agent for privacy.
     *
     * @return string Hashed user agent.
     */
    private function get_user_agent_hash() {
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        return substr(md5($user_agent), 0, 16);
    }
    
    /**
     * AJAX handler for nonce refresh.
     */
    public function ajax_refresh_nonce() {
        try {
            if (!wp_doing_ajax()) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid request type for this endpoint.',
                    'invalid_request_type'
                ));
            }

            if (!current_user_can('manage_options')) {
                wp_send_json_error(las_create_ajax_error_response(
                    'You do not have sufficient permissions to perform this action.',
                    'insufficient_permissions'
                ));
            }
            
            // Use unified nonce action
            $new_nonce = wp_create_nonce('las_fresh_admin_nonce');
            
            if (empty($new_nonce)) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Failed to generate new security token.',
                    'nonce_generation_failed'
                ));
            }
            
            wp_send_json_success(las_create_ajax_success_response(
                array(
                    'nonce' => $new_nonce,
                    'expires_in' => self::NONCE_REFRESH_INTERVAL
                ),
                'Security token refreshed successfully'
            ));
            
        } catch (Exception $e) {
            error_log('LAS Security Manager Nonce Refresh Error: ' . $e->getMessage());
            
            wp_send_json_error(las_create_ajax_error_response(
                'An error occurred while refreshing security token.',
                'refresh_failed'
            ));
        }
    }
    
    /**
     * AJAX handler for getting security status.
     */
    public function ajax_get_security_status() {
        try {
            // Use consistent validation with unified nonce action
            if (!wp_doing_ajax()) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid request type for this endpoint.',
                    'invalid_request_type'
                ));
            }

            // Validate nonce with unified action
            $nonce = las_sanitize_ajax_input($_POST['nonce'] ?? '', 'text');
            if (!wp_verify_nonce($nonce, 'las_fresh_admin_nonce')) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid security token.',
                    'invalid_nonce'
                ));
            }
            
            if (!current_user_can('manage_options')) {
                wp_send_json_error(las_create_ajax_error_response(
                    'You do not have sufficient permissions to perform this action.',
                    'insufficient_permissions'
                ));
            }
        
        $user_id = get_current_user_id();
        $ip_address = $this->get_client_ip();
        $limit_key = $user_id . '_' . md5($ip_address);
        
        $rate_limits = get_option(self::RATE_LIMIT_KEY, array());
        $security_log = get_option(self::SECURITY_LOG_KEY, array());
        
        $user_limits = isset($rate_limits[$limit_key]) ? $rate_limits[$limit_key] : array('requests' => array(), 'blocked_until' => 0);
        
        // Get recent security events for this user
        $recent_events = array_filter($security_log, function($entry) use ($user_id) {
            return $entry['user_id'] == $user_id && (time() - strtotime($entry['timestamp'])) < 3600; // Last hour
        });
        
            wp_send_json_success(las_create_ajax_success_response(
                array(
                    'rate_limit_status' => array(
                        'requests_last_hour' => count($user_limits['requests']),
                        'max_requests_hour' => self::MAX_REQUESTS_PER_HOUR,
                        'requests_last_minute' => count(array_filter($user_limits['requests'], function($timestamp) {
                            return (time() - $timestamp) < 60;
                        })),
                        'max_requests_minute' => self::MAX_REQUESTS_PER_MINUTE,
                        'blocked_until' => $user_limits['blocked_until'],
                        'is_blocked' => $user_limits['blocked_until'] > time()
                    ),
                    'security_events' => array(
                        'recent_count' => count($recent_events),
                        'total_count' => count($security_log),
                        'events' => array_slice($recent_events, 0, 10) // Last 10 events
                    ),
                    'nonce_status' => array(
                        'current_nonce' => wp_create_nonce('las_fresh_admin_nonce'),
                        'refresh_interval' => self::NONCE_REFRESH_INTERVAL
                    )
                ),
                'Security status retrieved successfully'
            ));
            
        } catch (Exception $e) {
            error_log('LAS Security Status Error: ' . $e->getMessage());
            
            wp_send_json_error(las_create_ajax_error_response(
                'An error occurred while retrieving security status.',
                'security_status_failed'
            ));
        }
    }
    
    /**
     * AJAX handler for clearing security log.
     */
    public function ajax_clear_security_log() {
        try {
            // Use consistent validation with unified nonce action
            if (!wp_doing_ajax()) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid request type for this endpoint.',
                    'invalid_request_type'
                ));
            }

            // Validate nonce with unified action
            $nonce = las_sanitize_ajax_input($_POST['nonce'] ?? '', 'text');
            if (!wp_verify_nonce($nonce, 'las_fresh_admin_nonce')) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid security token.',
                    'invalid_nonce'
                ));
            }
            
            if (!current_user_can('manage_options')) {
                wp_send_json_error(las_create_ajax_error_response(
                    'You do not have sufficient permissions to perform this action.',
                    'insufficient_permissions'
                ));
            }

            // Require confirmation for destructive action
            $confirm = las_sanitize_ajax_input($_POST['confirm'] ?? '', 'bool', false);
            if (!$confirm) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Confirmation is required to clear security log.',
                    'confirmation_required'
                ));
            }
            
            delete_option(self::SECURITY_LOG_KEY);
            
            $this->log_security_event('security_log_cleared', array(
                'cleared_by' => get_current_user_id()
            ));
            
            wp_send_json_success(las_create_ajax_success_response(
                null,
                'Security log cleared successfully'
            ));
            
        } catch (Exception $e) {
            error_log('LAS Clear Security Log Error: ' . $e->getMessage());
            
            wp_send_json_error(las_create_ajax_error_response(
                'An error occurred while clearing security log.',
                'clear_log_failed'
            ));
        }
    }
    
    /**
     * Cleanup expired nonces.
     */
    public function cleanup_expired_nonces() {
        $nonce_data = get_option('las_nonce_data', array());
        $current_time = time();
        $cleaned_data = array();
        
        foreach ($nonce_data as $nonce => $data) {
            if (($current_time - $data['created']) < self::NONCE_REFRESH_INTERVAL * 2) {
                $cleaned_data[$nonce] = $data;
            }
        }
        
        update_option('las_nonce_data', $cleaned_data, false);
        
        // Also cleanup old rate limit data
        $rate_limits = get_option(self::RATE_LIMIT_KEY, array());
        foreach ($rate_limits as $key => $data) {
            $rate_limits[$key]['requests'] = array_filter($data['requests'], function($timestamp) use ($current_time) {
                return ($current_time - $timestamp) < 3600; // Keep only last hour
            });
            
            // Remove blocked status if expired
            if ($data['blocked_until'] < $current_time) {
                $rate_limits[$key]['blocked_until'] = 0;
            }
        }
        update_option(self::RATE_LIMIT_KEY, $rate_limits, false);
    }
    
    /**
     * Get security statistics.
     *
     * @return array Security statistics.
     */
    public function get_security_stats() {
        $security_log = get_option(self::SECURITY_LOG_KEY, array());
        $rate_limits = get_option(self::RATE_LIMIT_KEY, array());
        
        $stats = array(
            'total_events' => count($security_log),
            'events_last_24h' => 0,
            'blocked_users' => 0,
            'top_event_types' => array(),
            'unique_ips' => array()
        );
        
        $event_types = array();
        $current_time = time();
        
        foreach ($security_log as $entry) {
            // Count events in last 24 hours
            if ((time() - strtotime($entry['timestamp'])) < 86400) {
                $stats['events_last_24h']++;
            }
            
            // Count event types
            $type = $entry['event_type'];
            $event_types[$type] = isset($event_types[$type]) ? $event_types[$type] + 1 : 1;
            
            // Collect unique IPs
            if (!in_array($entry['ip_address'], $stats['unique_ips'])) {
                $stats['unique_ips'][] = $entry['ip_address'];
            }
        }
        
        // Count blocked users
        foreach ($rate_limits as $data) {
            if ($data['blocked_until'] > $current_time) {
                $stats['blocked_users']++;
            }
        }
        
        // Sort event types by frequency
        arsort($event_types);
        $stats['top_event_types'] = array_slice($event_types, 0, 10, true);
        $stats['unique_ip_count'] = count($stats['unique_ips']);
        unset($stats['unique_ips']); // Don't expose IPs in stats
        
        return $stats;
    }
}

// Debug logging
if (defined('WP_DEBUG') && WP_DEBUG) {
    error_log('LAS Plugin: All classes defined successfully');
}

// Initialize managers after WordPress is fully loaded
add_action('init', function() {
    global $las_error_logger, $las_security_manager, $las_file_manager;
    
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('LAS Plugin: Starting manager initialization');
    }
    
    // Initialize the error logger first
    try {
        $las_error_logger = new LAS_Error_Logger();
    } catch (Exception $e) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS Error Logger Initialization Error: ' . $e->getMessage());
        }
        $las_error_logger = null;
    }
    
    // Initialize the security manager
    try {
        $las_security_manager = new LAS_Security_Manager();
    } catch (Exception $e) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS Security Manager Initialization Error: ' . $e->getMessage());
        }
        $las_security_manager = null;
    }

    // Initialize the file manager
    try {
        $las_file_manager = new LAS_File_Manager();
        
        // Hook file manager methods to activation/deactivation
        if ($las_file_manager) {
            register_activation_hook(__FILE__, array($las_file_manager, 'cleanup_on_activation'));
            register_deactivation_hook(__FILE__, array($las_file_manager, 'cleanup_on_deactivation'));
        }
    } catch (Exception $e) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS File Manager Initialization Error: ' . $e->getMessage());
        }
        $las_file_manager = null;
    }
    
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('LAS Plugin: Manager initialization completed');
    }
});

/**
 * Display admin notice for cleanup results.
 */
function las_fresh_display_cleanup_notice() {
    $cleanup_results = get_option('las_fresh_cleanup_results');
    
    if ($cleanup_results && is_array($cleanup_results)) {
        $success_count = count($cleanup_results['success']);
        $failed_count = count($cleanup_results['failed']);
        $skipped_count = count($cleanup_results['skipped']);
        
        if ($success_count > 0 || $failed_count > 0) {
            $class = $failed_count > 0 ? 'notice-warning' : 'notice-success';
            $message = sprintf(
                __('Live Admin Styler file cleanup completed: %d files removed, %d failed, %d skipped.', 'live-admin-styler'),
                $success_count,
                $failed_count,
                $skipped_count
            );
            
            echo '<div class="notice ' . esc_attr($class) . ' is-dismissible">';
            echo '<p>' . esc_html($message) . '</p>';
            echo '</div>';
            
            // Clear the notice after displaying
            delete_option('las_fresh_cleanup_results');
        }
    }
}
add_action('admin_notices', 'las_fresh_display_cleanup_notice');

/**
 * Add manual cleanup functionality to admin.
 */
function las_fresh_handle_manual_cleanup() {
    if (isset($_GET['las_cleanup']) && $_GET['las_cleanup'] === '1' && 
        isset($_GET['_wpnonce']) && wp_verify_nonce($_GET['_wpnonce'], 'las_manual_cleanup')) {
        
        global $las_file_manager;
        if ($las_file_manager && method_exists($las_file_manager, 'manual_cleanup')) {
            $results = $las_file_manager->manual_cleanup();
        } else {
            $results = array('success' => array(), 'failed' => array(), 'skipped' => array());
        }
        
        // Store results for display
        update_option('las_fresh_cleanup_results', $results, false);
        
        // Redirect to remove query parameters
        wp_redirect(remove_query_arg(['las_cleanup', '_wpnonce']));
        exit;
    }
}
add_action('admin_init', 'las_fresh_handle_manual_cleanup');

// Include sub-files
// Include required files with error handling
$required_files = array(
    'includes/admin-settings-page.php',
    'includes/ajax-handlers.php',
    'includes/output-css.php',
    'includes/templates.php'
);

foreach ($required_files as $file) {
    $file_path = plugin_dir_path(__FILE__) . $file;
    if (file_exists($file_path)) {
        require_once $file_path;
    } else {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS Missing Required File: ' . $file_path);
        }
    }
}


/**
 * Enhanced script enqueue function with proper dependency checking and fallback mechanisms.
 * Implements proper loading order, conditional loading, and consistent variable names.
 * 
 * @param string $hook_suffix The current admin page hook suffix
 */
function las_fresh_enqueue_assets($hook_suffix) {
    // Enhanced admin page context detection with multiple fallbacks
    $is_plugin_settings_page = las_fresh_is_plugin_admin_page($hook_suffix);
    
    if (!$is_plugin_settings_page) {
        return;
    }

    try {
        // Performance optimization: Generate cache busting version strings with error handling
        $script_version = las_fresh_get_script_version('js/admin-settings.js');
        $preview_version = las_fresh_get_script_version('assets/js/live-preview.js');
        $style_version = las_fresh_get_script_version('assets/css/admin-style.css');

        // Step 1: Enqueue WordPress core dependencies in proper order
        las_fresh_enqueue_core_dependencies();
        
        // Step 2: Check and enqueue jQuery UI components with availability validation
        $jquery_ui_available = las_fresh_enqueue_jquery_ui_dependencies();
        
        // Step 3: Build optimized dependency arrays based on availability
        $dependency_config = las_fresh_build_dependency_config($jquery_ui_available);
        
        // Step 4: Enqueue critical live preview scripts with proper dependencies
        las_fresh_enqueue_live_preview_scripts($dependency_config, $script_version, $preview_version);
        
        // Step 5: Create unified localization data with AJAX configuration
        $localization_data = las_fresh_create_localization_data($jquery_ui_available);
        
        // Step 6: Localize scripts with AJAX URLs and nonce configuration
        las_fresh_localize_live_preview_scripts($localization_data);
        
        // Step 7: Enqueue styles with proper dependencies
        las_fresh_enqueue_plugin_styles($style_version);
        
        // Log successful asset loading in debug mode
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS: Assets enqueued successfully for ' . $hook_suffix);
        }
        
    } catch (Exception $e) {
        // Log error and provide fallback
        error_log('LAS: Asset enqueuing failed: ' . $e->getMessage());
        
        // Enqueue minimal fallback assets
        las_fresh_enqueue_fallback_assets($script_version, $style_version);
    }
}

/**
 * Enhanced admin page detection with multiple validation methods
 * 
 * @param string $hook_suffix The current admin page hook suffix
 * @return bool True if on plugin admin page, false otherwise
 */
function las_fresh_is_plugin_admin_page($hook_suffix) {
    // Method 1: Direct hook suffix check
    if (strpos($hook_suffix, LAS_FRESH_SETTINGS_SLUG) !== false) {
        return true;
    }
    
    // Method 2: Current screen check with error handling
    $current_screen = get_current_screen();
    if ($current_screen) {
        if (strpos($current_screen->id, LAS_FRESH_SETTINGS_SLUG) !== false) {
            return true;
        }
        
        // Method 3: Base check for WordPress admin pages
        if (isset($current_screen->base) && strpos($current_screen->base, LAS_FRESH_SETTINGS_SLUG) !== false) {
            return true;
        }
    }
    
    // Method 4: GET parameter check as fallback
    if (isset($_GET['page']) && $_GET['page'] === LAS_FRESH_SETTINGS_SLUG) {
        return true;
    }
    
    return false;
}

/**
 * Generate cache busting version string with error handling
 * 
 * @param string $file_path Relative file path from plugin directory
 * @return string Version string with timestamp
 */
function las_fresh_get_script_version($file_path) {
    $full_path = plugin_dir_path(__FILE__) . $file_path;
    
    if (file_exists($full_path)) {
        $file_time = filemtime($full_path);
        return LAS_FRESH_VERSION . '-' . $file_time;
    }
    
    // Fallback to plugin version if file doesn't exist
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('LAS: File not found for version generation: ' . $full_path);
    }
    
    return LAS_FRESH_VERSION . '-' . time();
}

/**
 * Enqueue WordPress core dependencies in proper order
 */
function las_fresh_enqueue_core_dependencies() {
    // Enqueue jQuery first (WordPress core dependency)
    wp_enqueue_script('jquery');
    
    // Enqueue WordPress color picker components
    wp_enqueue_style('wp-color-picker');
    wp_enqueue_script('wp-color-picker');
    
    // Enqueue WordPress utilities that might be needed
    wp_enqueue_script('wp-util');
    wp_enqueue_script('wp-a11y');
}

/**
 * Check and enqueue jQuery UI dependencies with proper validation
 * 
 * @return array jQuery UI availability status
 */
function las_fresh_enqueue_jquery_ui_dependencies() {
    $jquery_ui_available = las_fresh_check_jquery_ui_availability();
    
    // Enqueue jQuery UI components in dependency order
    if ($jquery_ui_available['core']) {
        wp_enqueue_script('jquery-ui-core');
    }
    
    if ($jquery_ui_available['widget']) {
        wp_enqueue_script('jquery-ui-widget');
    }
    
    if ($jquery_ui_available['tabs']) {
        wp_enqueue_script('jquery-ui-tabs');
    }
    
    if ($jquery_ui_available['slider']) {
        wp_enqueue_script('jquery-ui-slider');
    }
    
    if ($jquery_ui_available['mouse']) {
        wp_enqueue_script('jquery-ui-mouse');
    }
    
    // Enqueue jQuery UI CSS with proper fallback and version
    if ($jquery_ui_available['tabs'] || $jquery_ui_available['slider']) {
        wp_enqueue_style(
            'jquery-ui-theme',
            '//ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/themes/ui-lightness/jquery-ui.css',
            array(),
            '1.13.2'
        );
    }
    
    // Force jQuery UI slider CSS for admin pages to ensure sliders are visible
    if (las_fresh_is_plugin_admin_context()) {
        wp_enqueue_style(
            'jquery-ui-slider-css',
            '//ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/themes/ui-lightness/jquery-ui.css',
            array(),
            '1.13.2'
        );
        
        // Also ensure jQuery UI slider script is loaded
        wp_enqueue_script('jquery-ui-slider');
    }
    
    return $jquery_ui_available;
}

/**
 * Build optimized dependency configuration arrays
 * 
 * @param array $jquery_ui_available jQuery UI availability status
 * @return array Dependency configuration
 */
function las_fresh_build_dependency_config($jquery_ui_available) {
    // Base dependencies that are always required
    $base_dependencies = array('jquery', 'wp-color-picker', 'wp-util');
    
    // Admin settings script dependencies
    $admin_dependencies = $base_dependencies;
    if ($jquery_ui_available['tabs']) {
        $admin_dependencies[] = 'jquery-ui-tabs';
    }
    if ($jquery_ui_available['core']) {
        $admin_dependencies[] = 'jquery-ui-core';
    }
    if ($jquery_ui_available['widget']) {
        $admin_dependencies[] = 'jquery-ui-widget';
    }
    
    // Live preview script dependencies
    $preview_dependencies = $base_dependencies;
    if ($jquery_ui_available['slider']) {
        $preview_dependencies[] = 'jquery-ui-slider';
    }
    if ($jquery_ui_available['mouse']) {
        $preview_dependencies[] = 'jquery-ui-mouse';
    }
    
    return array(
        'admin' => $admin_dependencies,
        'preview' => $preview_dependencies,
        'jquery_ui' => $jquery_ui_available
    );
}

/**
 * Enqueue plugin scripts with proper dependency order and performance monitoring
 * 
 * @param array $dependency_config Dependency configuration
 * @param string $script_version Admin script version
 * @param string $preview_version Preview script version
 */
function las_fresh_enqueue_plugin_scripts($dependency_config, $script_version, $preview_version) {
    // Get script loading configuration
    $loading_config = las_fresh_get_script_loading_config();
    
    // Validate dependencies before enqueuing
    $validated_admin_deps = las_fresh_validate_script_dependencies($dependency_config['admin']);
    $validated_preview_deps = las_fresh_validate_script_dependencies($dependency_config['preview']);
    
    // Enqueue theme manager first (design system foundation)
    wp_enqueue_script(
        'las-fresh-theme-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/theme-manager.js',
        array(), // No dependencies - loads first
        $script_version,
        false // Load in head to prevent FOUC
    );
    
    // Enqueue error handling system (critical for graceful degradation)
    wp_enqueue_script(
        'las-fresh-error-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/error-manager.js',
        array(), // No dependencies - loads early for error catching
        $script_version,
        false // Load in head for immediate error handling
    );
    
    wp_enqueue_script(
        'las-fresh-progressive-enhancement-js',
        plugin_dir_url(__FILE__) . 'assets/js/progressive-enhancement.js',
        array('las-fresh-error-manager-js'), // Depends on error manager
        $script_version,
        false // Load in head for immediate enhancement detection
    );
    
    // Enqueue responsive manager (design system foundation)
    wp_enqueue_script(
        'las-fresh-responsive-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/responsive-manager.js',
        array('las-fresh-theme-manager-js', 'las-fresh-error-manager-js'), // Depends on theme manager and error handling
        $script_version,
        false // Load in head for immediate breakpoint detection
    );
    
    // Enqueue navigation manager (modern navigation system)
    wp_enqueue_script(
        'las-fresh-navigation-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/navigation-manager.js',
        array('las-fresh-theme-manager-js', 'las-fresh-responsive-manager-js', 'las-fresh-error-manager-js'), // Depends on design system managers and error handling
        $script_version,
        false // Load in head for immediate navigation setup
    );
    
    // Enqueue modern UI component scripts
    wp_enqueue_script(
        'las-fresh-accessibility-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/accessibility-manager.js',
        array('las-fresh-theme-manager-js', 'wp-a11y'),
        $script_version,
        false // Load in head for immediate accessibility setup
    );
    
    wp_enqueue_script(
        'las-fresh-color-picker-js',
        plugin_dir_url(__FILE__) . 'assets/js/color-picker.js',
        array('las-fresh-theme-manager-js', 'wp-color-picker'),
        $script_version,
        $loading_config['load_in_footer']
    );
    
    wp_enqueue_script(
        'las-fresh-color-picker-integration-js',
        plugin_dir_url(__FILE__) . 'assets/js/color-picker-integration.js',
        array('las-fresh-color-picker-js'),
        $script_version,
        $loading_config['load_in_footer']
    );
    
    wp_enqueue_script(
        'las-fresh-loading-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/loading-manager.js',
        array('las-fresh-theme-manager-js'),
        $script_version,
        false // Load in head for immediate loading state management
    );
    
    wp_enqueue_script(
        'las-fresh-loading-integration-js',
        plugin_dir_url(__FILE__) . 'assets/js/loading-integration.js',
        array('las-fresh-loading-manager-js'),
        $script_version,
        $loading_config['load_in_footer']
    );
    
    wp_enqueue_script(
        'las-fresh-performance-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/performance-manager.js',
        array('las-fresh-theme-manager-js'),
        $script_version,
        false // Load in head for immediate performance monitoring
    );
    
    wp_enqueue_script(
        'las-fresh-performance-integration-js',
        plugin_dir_url(__FILE__) . 'assets/js/performance-integration.js',
        array('las-fresh-performance-manager-js'),
        $script_version,
        $loading_config['load_in_footer']
    );
    
    // Enqueue new performance monitoring system
    wp_enqueue_script(
        'las-fresh-performance-monitor-js',
        plugin_dir_url(__FILE__) . 'assets/js/modules/performance-monitor.js',
        array('las-fresh-theme-manager-js'),
        $script_version,
        false // Load in head for immediate monitoring
    );
    
    // Enqueue memory management system
    wp_enqueue_script(
        'las-fresh-memory-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/modules/memory-manager.js',
        array('las-fresh-performance-monitor-js'),
        $script_version,
        false // Load in head for immediate memory management
    );
    
    // Enqueue enhanced AJAX communication modules
    wp_enqueue_script(
        'las-fresh-http-transport-js',
        plugin_dir_url(__FILE__) . 'assets/js/modules/http-transport.js',
        array('las-fresh-memory-manager-js'),
        $script_version,
        false
    );
    
    wp_enqueue_script(
        'las-fresh-request-queue-js',
        plugin_dir_url(__FILE__) . 'assets/js/modules/request-queue.js',
        array('las-fresh-http-transport-js'),
        $script_version,
        false
    );
    
    wp_enqueue_script(
        'las-fresh-retry-engine-js',
        plugin_dir_url(__FILE__) . 'assets/js/modules/retry-engine.js',
        array('las-fresh-request-queue-js'),
        $script_version,
        false
    );
    
    wp_enqueue_script(
        'las-fresh-ajax-manager-js',
        plugin_dir_url(__FILE__) . 'assets/js/modules/ajax-manager.js',
        array('las-fresh-retry-engine-js'),
        $script_version,
        false
    );
    
    // Add performance monitoring for design system scripts
    if (defined('WP_DEBUG') && WP_DEBUG) {
        las_fresh_monitor_script_performance('las-fresh-theme-manager-js');
        las_fresh_add_script_error_handling('las-fresh-theme-manager-js');
        las_fresh_monitor_script_performance('las-fresh-responsive-manager-js');
        las_fresh_add_script_error_handling('las-fresh-responsive-manager-js');
        las_fresh_monitor_script_performance('las-fresh-navigation-manager-js');
        las_fresh_add_script_error_handling('las-fresh-navigation-manager-js');
    }
    
    // Enqueue admin settings script (main controller)
    $modern_ui_dependencies = array(
        'las-fresh-theme-manager-js',
        'las-fresh-responsive-manager-js', 
        'las-fresh-navigation-manager-js',
        'las-fresh-accessibility-manager-js',
        'las-fresh-loading-manager-js',
        'las-fresh-performance-manager-js',
        'las-fresh-performance-monitor-js',
        'las-fresh-memory-manager-js',
        'las-fresh-http-transport-js',
        'las-fresh-request-queue-js',
        'las-fresh-retry-engine-js',
        'las-fresh-ajax-manager-js'
    );
    
    wp_enqueue_script(
        'las-fresh-admin-settings-js',
        plugin_dir_url(__FILE__) . 'js/admin-settings.js',
        array_merge($validated_admin_deps, $modern_ui_dependencies), // Include all modern UI dependencies
        $script_version,
        $loading_config['load_in_footer']
    );
    
    // Add performance monitoring for admin script
    if (defined('WP_DEBUG') && WP_DEBUG) {
        las_fresh_monitor_script_performance('las-fresh-admin-settings-js');
        las_fresh_add_script_error_handling('las-fresh-admin-settings-js');
    }

    // Enqueue live preview script (depends on admin settings for some shared functionality)
    $preview_dependencies = array_merge($validated_preview_deps, array('las-fresh-admin-settings-js'));
    wp_enqueue_script(
        'las-fresh-live-preview-js',
        plugin_dir_url(__FILE__) . 'assets/js/live-preview.js',
        $preview_dependencies,
        $preview_version,
        $loading_config['load_in_footer']
    );
    
    // Add performance monitoring for preview script
    if (defined('WP_DEBUG') && WP_DEBUG) {
        las_fresh_monitor_script_performance('las-fresh-live-preview-js');
        las_fresh_add_script_error_handling('las-fresh-live-preview-js');
    }
}

/**
 * Create unified localization data with consistent variable names
 * 
 * @param array $jquery_ui_available jQuery UI availability status
 * @return array Localization data
 */
function las_fresh_create_localization_data($jquery_ui_available) {
    // Create unified nonce for consistent security validation
    $unified_nonce = wp_create_nonce('las_fresh_admin_nonce');
    $ajax_nonce = wp_create_nonce('las_ajax_nonce');
    
    // Get current user state for better UX
    $user_state = new LAS_User_State();
    $current_tab = $user_state->get_active_tab();
    $ui_preferences = $user_state->get_ui_preferences();
    
    // Debug logging
    error_log('[LAS] Creating localization data with ajax_nonce: ' . substr($ajax_nonce, 0, 10) . '...');
    
    // Create optimized AJAX data with consistent naming for live preview critical repair
    return array(
        // Core AJAX configuration - Critical for live preview functionality
        'ajax_url'          => admin_url('admin-ajax.php'),
        'ajaxurl'           => admin_url('admin-ajax.php'), // Backward compatibility
        'nonce'             => $ajax_nonce, // Use specific AJAX nonce
        'admin_nonce'       => $unified_nonce, // Keep admin nonce separate
        'nonce_action'      => 'las_ajax_nonce',
        
        // AJAX action names for live preview critical repair
        'ajax_actions' => array(
            'save_settings' => 'las_save_settings',
            'load_settings' => 'las_load_settings',
            'get_preview_css' => 'las_get_preview_css',
            'log_error' => 'las_log_error',
            'refresh_nonce' => 'las_refresh_nonce'
        ),
        
        // Plugin configuration
        'option_name'       => LAS_FRESH_OPTION_NAME,
        'plugin_version'    => LAS_FRESH_VERSION,
        'text_domain'       => LAS_FRESH_TEXT_DOMAIN,
        
        // Dependency information
        'jquery_ui'         => $jquery_ui_available,
        'fallback_mode'     => !$jquery_ui_available['tabs'],
        
        // User state and preferences
        'user_id'           => get_current_user_id(),
        'current_tab'       => $current_tab,
        'ui_preferences'    => $ui_preferences,
        
        // Performance settings for live preview
        'debounce_delay'    => intval($ui_preferences['live_preview_debounce'] ?? 300),
        'retry_attempts'    => 3,
        'retry_delay'       => 1000,
        'timeout'           => 10000, // 10 seconds timeout
        
        // Security and nonce management
        'nonce_refresh_url' => admin_url('admin-ajax.php'),
        'auto_refresh_nonce' => true,
        'nonce_lifetime'    => 12 * HOUR_IN_SECONDS,
        'refresh_threshold' => 2 * HOUR_IN_SECONDS,
        
        // Debug and development
        'debug_mode'        => defined('WP_DEBUG') && WP_DEBUG,
        'script_debug'      => defined('SCRIPT_DEBUG') && SCRIPT_DEBUG,
        
        // WordPress environment info
        'wp_version'        => get_bloginfo('version'),
        'is_multisite'      => is_multisite(),
        'current_screen'    => get_current_screen() ? get_current_screen()->id : '',
        
        // Live preview specific configuration
        'live_preview' => array(
            'enabled' => $ui_preferences['live_preview_enabled'] ?? true,
            'debounce' => intval($ui_preferences['live_preview_debounce'] ?? 300),
            'css_injection_method' => 'style_element', // Use style element for CSS injection
            'update_queue_size' => 10, // Maximum queued updates
            'performance_monitoring' => defined('WP_DEBUG') && WP_DEBUG
        ),
        
        // Settings management configuration
        'settings' => array(
            'auto_save' => $ui_preferences['auto_save_changes'] ?? false,
            'sync_tabs' => true, // Enable multi-tab synchronization
            'localStorage_backup' => true,
            'validation_enabled' => true
        ),
        
        // Localization strings for JavaScript
        'strings' => array(
            'loading'           => __('Loading...', LAS_FRESH_TEXT_DOMAIN),
            'saving'            => __('Saving...', LAS_FRESH_TEXT_DOMAIN),
            'saved'             => __('Settings saved successfully', LAS_FRESH_TEXT_DOMAIN),
            'error'             => __('An error occurred', LAS_FRESH_TEXT_DOMAIN),
            'retry'             => __('Retry', LAS_FRESH_TEXT_DOMAIN),
            'confirm'           => __('Are you sure?', LAS_FRESH_TEXT_DOMAIN),
            'invalid_nonce'     => __('Security check failed. Please refresh the page.', LAS_FRESH_TEXT_DOMAIN),
            'network_error'     => __('Network error. Please check your connection.', LAS_FRESH_TEXT_DOMAIN),
            'permission_error'  => __('You do not have permission to perform this action.', LAS_FRESH_TEXT_DOMAIN),
            'settings_saved'    => __('Settings saved', LAS_FRESH_TEXT_DOMAIN),
            'settings_failed'   => __('Failed to save settings', LAS_FRESH_TEXT_DOMAIN),
            'preview_updated'   => __('Preview updated', LAS_FRESH_TEXT_DOMAIN),
            'connection_lost'   => __('Connection lost. Retrying...', LAS_FRESH_TEXT_DOMAIN),
            'connection_restored' => __('Connection restored', LAS_FRESH_TEXT_DOMAIN)
        )
    );
}

/**
 * Enqueue critical live preview scripts with proper WordPress standards
 * 
 * @param array $dependency_config Dependency configuration
 * @param string $script_version Script version for cache busting
 * @param string $preview_version Preview script version
 */
function las_fresh_enqueue_live_preview_scripts($dependency_config, $script_version, $preview_version) {
    // Core dependencies for live preview functionality
    $core_dependencies = array('jquery', 'wp-util');
    
    // Add jQuery UI dependencies if available
    if (!empty($dependency_config['admin_settings'])) {
        $core_dependencies = array_merge($core_dependencies, $dependency_config['admin_settings']);
    }
    
    // Enqueue main admin settings script (contains LASCoreManager and all modules)
    wp_enqueue_script(
        'las-fresh-admin-settings-js',
        plugin_dir_url(__FILE__) . 'js/admin-settings.js',
        $core_dependencies,
        $script_version,
        true // Load in footer for better performance
    );
    
    // Re-enable live preview functionality - it's needed for sliders and real-time updates
    wp_enqueue_script(
        'las-fresh-live-preview-js',
        plugin_dir_url(__FILE__) . 'assets/js/live-preview.js',
        array('las-fresh-admin-settings-js'), // Depends on core manager
        $preview_version,
        true
    );
    
    // Add error handling script for graceful degradation
    wp_enqueue_script(
        'las-fresh-error-handler-js',
        plugin_dir_url(__FILE__) . 'assets/js/error-handler.js',
        array('jquery'),
        $script_version,
        true
    );
    
    // Add communication manager for AJAX handling
    wp_enqueue_script(
        'las-fresh-communication-js',
        plugin_dir_url(__FILE__) . 'assets/js/communication-manager.js',
        array('las-fresh-admin-settings-js', 'wp-util'),
        $script_version,
        true
    );
}

/**
 * Localize live preview scripts with AJAX URLs and nonce configuration
 * 
 * @param array $localization_data Localization data with AJAX configuration
 */
function las_fresh_localize_live_preview_scripts($localization_data) {
    // Primary localization for main admin settings script
    wp_localize_script('las-fresh-admin-settings-js', 'lasAdminData', $localization_data);
    
    // Secondary localization for live preview script (for backward compatibility)
    wp_localize_script('las-fresh-live-preview-js', 'lasAdminData', $localization_data);
    
    // Add AJAX-specific configuration for communication manager
    $ajax_config = array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('las_ajax_nonce'),
        'actions' => array(
            'save_settings' => 'las_save_settings',
            'load_settings' => 'las_load_settings',
            'log_error' => 'las_log_error'
        ),
        'timeout' => 10000, // 10 seconds
        'retry_attempts' => 3,
        'retry_delay' => 1000 // 1 second base delay
    );
    
    wp_localize_script('las-fresh-communication-js', 'lasAjaxConfig', $ajax_config);
    
    // Add inline script for immediate availability and initialization
    $inline_script = "
        window.lasPluginReady = window.lasPluginReady || {};
        window.lasPluginReady.dataLoaded = true;
        window.lasPluginReady.version = '" . esc_js(LAS_FRESH_VERSION) . "';
        window.lasPluginReady.timestamp = " . time() . ";
        window.lasPluginReady.ajaxConfigured = true;
        
        // Initialize core manager when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            if (window.LAS && window.LAS.CoreManager) {
                window.LAS.coreManager = new window.LAS.CoreManager();
                window.LAS.coreManager.init().catch(function(error) {
                    console.error('LAS: Failed to initialize core manager:', error);
                });
            }
        });
    ";
    
    wp_add_inline_script('las-fresh-admin-settings-js', $inline_script, 'before');
}

/**
 * Enqueue fallback assets when main enqueuing fails
 * 
 * @param string $script_version Script version
 * @param string $style_version Style version
 */
function las_fresh_enqueue_fallback_assets($script_version, $style_version) {
    // Minimal jQuery dependency
    wp_enqueue_script('jquery');
    
    // Basic admin settings script
    wp_enqueue_script(
        'las-fresh-admin-settings-js',
        plugin_dir_url(__FILE__) . 'js/admin-settings.js',
        array('jquery'),
        $script_version,
        true
    );
    
    // Basic styles
    wp_enqueue_style(
        'las-fresh-admin-style-css',
        plugin_dir_url(__FILE__) . 'assets/css/admin-style.css',
        array(),
        $style_version
    );
    
    // Minimal localization
    $fallback_data = array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('las_ajax_nonce'),
        'fallback_mode' => true,
        'strings' => array(
            'error' => __('An error occurred', LAS_FRESH_TEXT_DOMAIN),
            'loading' => __('Loading...', LAS_FRESH_TEXT_DOMAIN)
        )
    );
    
    wp_localize_script('las-fresh-admin-settings-js', 'lasAdminData', $fallback_data);
}

/**
 * Enqueue plugin styles with proper dependencies
 * 
 * @param string $style_version Style version string
 */
function las_fresh_enqueue_plugin_styles($style_version) {
    // Enqueue base reset and typography system first
    wp_enqueue_style(
        'las-fresh-base-reset-css',
        plugin_dir_url(__FILE__) . 'assets/css/base-reset.css',
        array(), // No dependencies for base reset
        $style_version
    );
    
    // Enqueue design system foundation
    wp_enqueue_style(
        'las-fresh-design-system-css',
        plugin_dir_url(__FILE__) . 'assets/css/design-system.css',
        array('las-fresh-base-reset-css'), // Depends on base reset
        $style_version
    );
    
    // Enqueue graceful degradation and error handling styles
    wp_enqueue_style(
        'las-fresh-graceful-degradation-css',
        plugin_dir_url(__FILE__) . 'assets/css/graceful-degradation.css',
        array('las-fresh-design-system-css'), // Depends on design system
        $style_version
    );
    
    // Enqueue main admin styles with modern UI components
    wp_enqueue_style(
        'las-fresh-admin-style-css',
        plugin_dir_url(__FILE__) . 'assets/css/admin-style.css',
        array('las-fresh-graceful-degradation-css', 'wp-color-picker', 'common', 'forms'), // Include graceful degradation as dependency
        $style_version
    );
    
    // Enqueue modern UI component styles
    wp_enqueue_style(
        'las-fresh-accessibility-css',
        plugin_dir_url(__FILE__) . 'assets/css/accessibility.css',
        array('las-fresh-design-system-css'),
        $style_version
    );
    
    wp_enqueue_style(
        'las-fresh-color-picker-css',
        plugin_dir_url(__FILE__) . 'assets/css/color-picker.css',
        array('las-fresh-design-system-css', 'wp-color-picker'),
        $style_version
    );
    
    wp_enqueue_style(
        'las-fresh-loading-states-css',
        plugin_dir_url(__FILE__) . 'assets/css/loading-states.css',
        array('las-fresh-design-system-css'),
        $style_version
    );
    
    wp_enqueue_style(
        'las-fresh-performance-optimizations-css',
        plugin_dir_url(__FILE__) . 'assets/css/performance-optimizations.css',
        array('las-fresh-design-system-css'),
        $style_version
    );
    
    // Enqueue slider fallback CSS to ensure sliders are always visible
    wp_enqueue_style(
        'las-fresh-slider-fallback-css',
        plugin_dir_url(__FILE__) . 'assets/css/slider-fallback.css',
        array(),
        $style_version
    );
    
    // Add inline styles for immediate visual feedback and theme initialization
    $inline_css = las_fresh_get_inline_css_for_modern_ui();
    wp_add_inline_style('las-fresh-admin-style-css', $inline_css);
    
    // Add error handling and graceful degradation
    las_fresh_add_error_handling_styles($style_version);
    las_fresh_add_graceful_degradation_support();
}

/**
 * Get inline CSS for modern UI initialization and fallbacks
 * 
 * @return string Inline CSS
 */
function las_fresh_get_inline_css_for_modern_ui() {
    return "
        /* Immediate loading states */
        .las-loading { opacity: 0.6; pointer-events: none; }
        .las-error { border-left: 4px solid #dc3232; }
        .las-success { border-left: 4px solid #46b450; }
        
        /* Prevent FOUC (Flash of Unstyled Content) */
        .las-fresh-settings-wrap {
            opacity: 0;
            animation: fadeInUp 0.6s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Theme initialization */
        :root {
            color-scheme: light dark;
        }
        
        [data-theme='dark'] {
            color-scheme: dark;
        }
        
        /* Modern UI fallbacks for unsupported features */
        @supports not (backdrop-filter: blur(10px)) {
            .las-card {
                background: rgba(255, 255, 255, 0.95) !important;
            }
            [data-theme='dark'] .las-card {
                background: rgba(38, 38, 38, 0.95) !important;
            }
        }
        
        @supports not (container-type: inline-size) {
            .las-responsive-component {
                /* Fallback responsive behavior */
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .las-card {
                border: 2px solid;
            }
            .las-button {
                border: 2px solid;
            }
        }
    ";
}

/**
 * Add error handling styles for graceful degradation
 * 
 * @param string $style_version Style version
 */
function las_fresh_add_error_handling_styles($style_version) {
    $error_css = "
        /* Error boundary styles */
        .las-error-boundary {
            padding: var(--las-space-lg, 24px);
            border: 2px solid #dc3232;
            border-radius: var(--las-radius-md, 8px);
            background: #fff2f2;
            color: #721c24;
            margin: var(--las-space-md, 16px) 0;
        }
        
        .las-error-boundary h3 {
            margin: 0 0 var(--las-space-sm, 8px) 0;
            color: #721c24;
        }
        
        .las-error-boundary p {
            margin: 0 0 var(--las-space-sm, 8px) 0;
        }
        
        .las-error-boundary .las-error-actions {
            margin-top: var(--las-space-md, 16px);
        }
        
        /* Fallback component styles */
        .las-fallback-component {
            padding: var(--las-space-md, 16px);
            border: 1px solid #ddd;
            border-radius: var(--las-radius-sm, 4px);
            background: #f9f9f9;
            text-align: center;
        }
        
        /* Loading fallback */
        .las-loading-fallback {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    ";
    
    wp_add_inline_style('las-fresh-admin-style-css', $error_css);
}

/**
 * Add graceful degradation support for modern UI features
 */
function las_fresh_add_graceful_degradation_support() {
    // Add feature detection script
    $feature_detection_script = "
        window.lasFeatureSupport = {
            backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
            containerQueries: CSS.supports('container-type', 'inline-size'),
            customProperties: CSS.supports('color', 'var(--test)'),
            grid: CSS.supports('display', 'grid'),
            flexbox: CSS.supports('display', 'flex'),
            transforms: CSS.supports('transform', 'translateX(0)'),
            transitions: CSS.supports('transition', 'opacity 0.3s'),
            animations: CSS.supports('animation', 'fadeIn 1s'),
            
            // Add feature classes to document
            init: function() {
                const html = document.documentElement;
                Object.keys(this).forEach(feature => {
                    if (typeof this[feature] === 'boolean') {
                        html.classList.add(this[feature] ? 'has-' + feature : 'no-' + feature);
                    }
                });
            }
        };
        
        // Initialize feature detection
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                window.lasFeatureSupport.init();
            });
        } else {
            window.lasFeatureSupport.init();
        }
        
        // Error boundary for JavaScript components
        window.lasErrorBoundary = function(componentName, errorCallback) {
            return function(fn) {
                try {
                    return fn();
                } catch (error) {
                    console.error('LAS Component Error (' + componentName + '):', error);
                    if (typeof errorCallback === 'function') {
                        errorCallback(error);
                    }
                    return null;
                }
            };
        };
    ";
    
    wp_add_inline_script('las-fresh-theme-manager-js', $feature_detection_script, 'before');
}

/**
 * Ensure WordPress admin compatibility and preserve existing functionality
 */
function las_fresh_ensure_wordpress_compatibility() {
    // Preserve WordPress admin body classes
    add_filter('admin_body_class', function($classes) {
        $classes .= ' las-modern-ui-enabled';
        return $classes;
    });
    
    // Ensure WordPress admin styles are not overridden
    add_action('admin_head', function() {
        echo '<style>
            /* Preserve WordPress admin functionality */
            .las-fresh-settings-wrap .wp-core-ui .button,
            .las-fresh-settings-wrap .wp-core-ui .button-primary,
            .las-fresh-settings-wrap .wp-core-ui .button-secondary {
                /* Allow WordPress buttons to coexist with modern UI */
                font-family: inherit;
            }
            
            /* Ensure WordPress notices work properly */
            .las-fresh-settings-wrap .notice,
            .las-fresh-settings-wrap .error,
            .las-fresh-settings-wrap .updated {
                margin: 5px 0 15px;
                padding: 1px 12px;
            }
            
            /* Preserve WordPress form styling where needed */
            .las-fresh-settings-wrap .wp-core-ui select,
            .las-fresh-settings-wrap .wp-core-ui input[type="text"],
            .las-fresh-settings-wrap .wp-core-ui input[type="number"],
            .las-fresh-settings-wrap .wp-core-ui textarea {
                /* Maintain WordPress form compatibility */
            }
        </style>';
    }, 100); // High priority to override if needed
    
    // Preserve WordPress admin menu highlighting
    add_action('admin_head', function() {
        global $plugin_page;
        if ($plugin_page === LAS_FRESH_SETTINGS_SLUG) {
            echo '<script>
                jQuery(document).ready(function($) {
                    // Ensure WordPress admin menu stays highlighted
                    $("#toplevel_page_' . LAS_FRESH_SETTINGS_SLUG . '").addClass("current");
                });
            </script>';
        }
    });
}

/**
 * Add modern UI integration hooks
 */
function las_fresh_add_modern_ui_hooks() {
    // Hook for theme initialization
    add_action('admin_footer', function() {
        echo '<script>
            // Initialize modern UI after WordPress admin is ready
            jQuery(document).ready(function($) {
                if (window.ThemeManager) {
                    window.ThemeManager.init();
                }
                if (window.ResponsiveManager) {
                    window.ResponsiveManager.init();
                }
                if (window.NavigationManager) {
                    window.NavigationManager.init();
                }
                if (window.AccessibilityManager && !window.lasAccessibilityManager) {
                    window.lasAccessibilityManager = new window.AccessibilityManager();
                }
                if (window.LoadingManager) {
                    window.LoadingManager.init();
                }
                if (window.PerformanceManager) {
                    window.PerformanceManager.init();
                }
                
                // Trigger modern UI ready event
                $(document).trigger("las-modern-ui-ready");
            });
        </script>';
    });
    
    // Add modern UI data attributes to admin pages
    add_action('admin_body_class', function($classes) {
        if (get_current_screen() && get_current_screen()->id === 'toplevel_page_' . LAS_FRESH_SETTINGS_SLUG) {
            $classes .= ' las-modern-ui-page';
        }
        return $classes;
    });
}

// Initialize WordPress compatibility and modern UI integration
add_action('admin_init', 'las_fresh_ensure_wordpress_compatibility');
add_action('admin_init', 'las_fresh_add_modern_ui_hooks');

// Hook with priority 10 to ensure proper loading order after WordPress core scripts
add_action('admin_enqueue_scripts', 'las_fresh_enqueue_assets', 10);

/**
 * Check jQuery UI component availability.
 *
 * @return array Availability status for jQuery UI components.
 */
/**
 * Enhanced jQuery UI availability check with comprehensive component validation
 * 
 * @return array Availability status for jQuery UI components
 */
function las_fresh_check_jquery_ui_availability() {
    global $wp_scripts;
    
    // Initialize availability array with all components we might need
    $availability = array(
        'core'      => false,
        'widget'    => false,
        'mouse'     => false,
        'tabs'      => false,
        'slider'    => false,
        'accordion' => false,
        'dialog'    => false,
        'sortable'  => false,
        'draggable' => false,
        'resizable' => false
    );
    
    // Check WordPress script registration
    if (isset($wp_scripts->registered)) {
        foreach ($availability as $component => $status) {
            $script_handle = 'jquery-ui-' . $component;
            if (isset($wp_scripts->registered[$script_handle])) {
                $availability[$component] = true;
            }
        }
    }
    
    // Additional validation: Check if jQuery itself is available
    $jquery_available = isset($wp_scripts->registered['jquery']);
    
    // If jQuery is not available, mark all jQuery UI components as unavailable
    if (!$jquery_available) {
        foreach ($availability as $component => $status) {
            $availability[$component] = false;
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS: jQuery not available - disabling all jQuery UI components');
        }
    }
    
    // Validate component dependencies
    $availability = las_fresh_validate_jquery_ui_dependencies($availability);
    
    // Add summary information
    $availability['summary'] = array(
        'total_available' => count(array_filter($availability, function($v) { return $v === true; })),
        'jquery_available' => $jquery_available,
        'core_available' => $availability['core'],
        'ui_functional' => $availability['core'] && $availability['widget'],
        'tabs_functional' => $availability['tabs'] && $availability['core'] && $availability['widget'],
        'slider_functional' => $availability['slider'] && $availability['core'] && $availability['widget'] && $availability['mouse']
    );
    
    // Log comprehensive availability for debugging
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('LAS jQuery UI Comprehensive Availability: ' . wp_json_encode($availability, JSON_PRETTY_PRINT));
    }
    
    return $availability;
}

/**
 * Validate jQuery UI component dependencies
 * 
 * @param array $availability Current availability status
 * @return array Updated availability status with dependency validation
 */
function las_fresh_validate_jquery_ui_dependencies($availability) {
    // Core is required for all other components
    if (!$availability['core']) {
        // If core is not available, disable components that depend on it
        $core_dependent = array('widget', 'mouse', 'tabs', 'slider', 'accordion', 'dialog', 'sortable', 'draggable', 'resizable');
        foreach ($core_dependent as $component) {
            if ($availability[$component]) {
                $availability[$component] = false;
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log("LAS: Disabling {$component} due to missing jquery-ui-core dependency");
                }
            }
        }
    }
    
    // Widget is required for most UI components
    if (!$availability['widget']) {
        $widget_dependent = array('tabs', 'slider', 'accordion', 'dialog');
        foreach ($widget_dependent as $component) {
            if ($availability[$component]) {
                $availability[$component] = false;
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log("LAS: Disabling {$component} due to missing jquery-ui-widget dependency");
                }
            }
        }
    }
    
    // Mouse is required for interactive components
    if (!$availability['mouse']) {
        $mouse_dependent = array('slider', 'sortable', 'draggable', 'resizable');
        foreach ($mouse_dependent as $component) {
            if ($availability[$component]) {
                $availability[$component] = false;
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log("LAS: Disabling {$component} due to missing jquery-ui-mouse dependency");
                }
            }
        }
    }
    
    return $availability;
}

/**
 * Get current user's active tab with fallback.
 *
 * @return string Active tab ID.
 */
function las_fresh_get_current_user_tab() {
    $user_state = new LAS_User_State();
    return $user_state->get_active_tab();
}

/**
 * Save active tab for current user.
 *
 * @param string $tab_id Tab ID to save.
 * @return bool True on success, false on failure.
 */
function las_fresh_save_active_tab($tab_id) {
    $user_state = new LAS_User_State();
    return $user_state->set_active_tab($tab_id);
}

/**
 * Add dynamic CSS to admin head for overall admin styling.
 */
function las_fresh_add_dynamic_inline_styles() {
    // Make sure WordPress is fully loaded
    if (!function_exists('is_admin') || !function_exists('get_option')) {
        return;
    }
    
    if (is_admin()) {
        try {
            if (function_exists('las_fresh_generate_admin_css_output')) {
                $generated_css = las_fresh_generate_admin_css_output();
                if (!empty($generated_css)) {
                    echo '<style type="text/css" id="las-fresh-dynamic-admin-styles">' . "\n" . $generated_css . "\n" . '</style>';
                }
            }
        } catch (Exception $e) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('LAS CSS Generation Error: ' . $e->getMessage());
            }
        }
    }
}
add_action('admin_head', 'las_fresh_add_dynamic_inline_styles');

/**
 * Add dynamic CSS to login page head.
 */
function las_fresh_add_login_styles() {
    // Make sure WordPress is fully loaded
    if (!function_exists('get_option') || !function_exists('esc_html')) {
        return;
    }
    
    try {
        if (function_exists('las_fresh_generate_login_css_rules')) {
            $login_css = las_fresh_generate_login_css_rules();
            if (!empty($login_css)) {
                echo '<style type="text/css" id="las-fresh-dynamic-login-styles">' . "\n" . esc_html($login_css) . "\n" . '</style>';
            }
        }
    } catch (Exception $e) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS Login CSS Generation Error: ' . $e->getMessage());
        }
    }
}
add_action('login_head', 'las_fresh_add_login_styles');

/**
 * Hook for custom footer text.
 */
add_filter('admin_footer_text', 'las_fresh_custom_admin_footer_text_output');

/**
 * Activation hook to set default options and cleanup files.
 */
function las_fresh_activate() {
    if (false === get_option(LAS_FRESH_OPTION_NAME)) {
        add_option(LAS_FRESH_OPTION_NAME, las_fresh_get_default_options());
    }
    
    // File cleanup is handled by LAS_File_Manager class
    // which is already hooked into activation via register_activation_hook
}
register_activation_hook(__FILE__, 'las_fresh_activate');

/**
 * Deactivation hook for cleanup.
 */
function las_fresh_deactivate() {
    // File cleanup is handled by LAS_File_Manager class
    // which is already hooked into deactivation via register_deactivation_hook
}
register_deactivation_hook(__FILE__, 'las_fresh_deactivate');

/**
 * Initialize Live Preview Critical Repair Components
 * Load and initialize the AJAX handlers and other critical components
 */
function las_fresh_init_live_preview_components() {
    // Load required classes for live preview critical repair
    $includes_path = plugin_dir_path(__FILE__) . 'includes/';
    
    // Load in dependency order
    $required_files = array(
        'SecurityValidator.php',
        'SettingsStorage.php',
        'output-css.php',
        'ajax-handlers.php'
    );
    
    foreach ($required_files as $file) {
        $file_path = $includes_path . $file;
        if (file_exists($file_path)) {
            require_once $file_path;
        } else {
            error_log("LAS: Required file not found: {$file_path}");
        }
    }
    
    // Initialize enhanced AJAX handlers if class exists
    if (class_exists('LAS_Ajax_Handlers')) {
        global $las_ajax_handlers;
        $las_ajax_handlers = new LAS_Ajax_Handlers();
        
        // Log successful initialization
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS: Enhanced AJAX handlers initialized successfully');
        }
    } else {
        error_log('LAS: Warning - LAS_Ajax_Handlers class not found');
    }
    
    // Initialize error logger if not already done
    if (!isset($GLOBALS['las_error_logger']) && class_exists('LAS_Error_Logger')) {
        global $las_error_logger;
        $las_error_logger = new LAS_Error_Logger();
    }
}

// Initialize components after WordPress is loaded
add_action('init', 'las_fresh_init_live_preview_components');

/**
 * Hook to clear CSS cache when settings are updated via new settings system
 */
function las_fresh_clear_css_cache_on_settings_update() {
    // Clear CSS cache when settings are updated
    if (function_exists('las_fresh_clear_css_cache')) {
        las_fresh_clear_css_cache();
    }
}

// Hook into settings updates for cache clearing
add_action('las_settings_saved', 'las_fresh_clear_css_cache_on_settings_update');
add_action('las_settings_reset', 'las_fresh_clear_css_cache_on_settings_update');

/**
 * Additional helper functions for enhanced script loading and dependency management
 */

/**
 * Check if current request is for plugin admin pages with enhanced detection
 * 
 * @return bool True if on plugin admin page
 */
function las_fresh_is_plugin_admin_context() {
    // Check if we're in admin area
    if (!is_admin()) {
        return false;
    }
    
    // Check various methods to detect plugin pages
    $page_indicators = array(
        isset($_GET['page']) && $_GET['page'] === LAS_FRESH_SETTINGS_SLUG,
        isset($_POST['option_page']) && $_POST['option_page'] === LAS_FRESH_OPTION_GROUP,
        strpos($_SERVER['REQUEST_URI'] ?? '', LAS_FRESH_SETTINGS_SLUG) !== false
    );
    
    return in_array(true, $page_indicators, true);
}

/**
 * Get script loading priority based on dependency requirements
 * 
 * @param string $script_type Type of script ('core', 'ui', 'plugin')
 * @return int Priority value for wp_enqueue_script
 */
function las_fresh_get_script_priority($script_type = 'plugin') {
    $priorities = array(
        'core' => 5,     // WordPress core scripts
        'ui' => 8,       // jQuery UI components
        'plugin' => 10   // Plugin scripts
    );
    
    return isset($priorities[$script_type]) ? $priorities[$script_type] : 10;
}

/**
 * Validate script dependencies before enqueuing
 * 
 * @param array $dependencies Array of script handles to check
 * @return array Validated dependencies that are actually available
 */
function las_fresh_validate_script_dependencies($dependencies) {
    global $wp_scripts;
    
    if (!is_array($dependencies)) {
        return array();
    }
    
    $validated = array();
    
    foreach ($dependencies as $dependency) {
        // Check if dependency is registered
        if (isset($wp_scripts->registered[$dependency])) {
            $validated[] = $dependency;
        } else {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log("LAS: Script dependency '{$dependency}' not found - skipping");
            }
        }
    }
    
    return $validated;
}

/**
 * Get optimized script loading configuration based on environment
 * 
 * @return array Configuration array with loading preferences
 */
function las_fresh_get_script_loading_config() {
    return array(
        'load_in_footer' => true, // Better performance
        'defer_non_critical' => !is_customize_preview(), // Don't defer in customizer
        'minify_enabled' => !defined('SCRIPT_DEBUG') || !SCRIPT_DEBUG,
        'cache_busting' => defined('WP_DEBUG') && WP_DEBUG,
        'async_loading' => false, // Keep false for dependency management
        'preload_critical' => true
    );
}

/**
 * Register script performance monitoring
 * 
 * @param string $script_handle Script handle to monitor
 */
function las_fresh_monitor_script_performance($script_handle) {
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    
    // Add inline script to measure loading time
    $monitoring_script = "
        (function() {
            var startTime = performance.now();
            document.addEventListener('DOMContentLoaded', function() {
                var loadTime = performance.now() - startTime;
                console.log('LAS Script Performance - {$script_handle}: ' + loadTime.toFixed(2) + 'ms');
            });
        })();
    ";
    
    wp_add_inline_script($script_handle, $monitoring_script, 'before');
}

/**
 * Add script loading error handling
 * 
 * @param string $script_handle Script handle to add error handling for
 */
function las_fresh_add_script_error_handling($script_handle) {
    $error_handling_script = "
        window.addEventListener('error', function(e) {
            if (e.filename && e.filename.indexOf('{$script_handle}') !== -1) {
                console.error('LAS Script Error in {$script_handle}:', e.message, 'at line', e.lineno);
                if (window.lasAdminData && window.lasAdminData.debug_mode) {
                    console.log('LAS Debug Info:', window.lasAdminData);
                }
            }
        });
    ";
    
    wp_add_inline_script($script_handle, $error_handling_script, 'before');
}

/**
 * Cleanup script handles on page unload to prevent memory leaks
 */
function las_fresh_add_script_cleanup() {
    $cleanup_script = "
        window.addEventListener('beforeunload', function() {
            // Cleanup any active timers or intervals
            if (window.lasActiveTimers) {
                window.lasActiveTimers.forEach(function(timer) {
                    clearTimeout(timer);
                    clearInterval(timer);
                });
                window.lasActiveTimers = [];
            }
            
            // Cleanup any active AJAX requests
            if (window.lasActiveRequests) {
                window.lasActiveRequests.forEach(function(request) {
                    if (request.abort) {
                        request.abort();
                    }
                });
                window.lasActiveRequests = [];
            }
        });
    ";
    
    wp_add_inline_script('las-fresh-admin-settings-js', $cleanup_script, 'after');
}

// Add script cleanup on plugin pages
add_action('admin_footer', function() {
    if (las_fresh_is_plugin_admin_context()) {
        las_fresh_add_script_cleanup();
    }
});

// Load UI Repair Asset Loader
require_once plugin_dir_path(__FILE__) . 'includes/UIRepairAssetLoader.php';

// Debug logging
if (defined('WP_DEBUG') && WP_DEBUG) {
    error_log('LAS Plugin: live-admin-styler.php loaded successfully with enhanced script management and UI repair system');
}

?>