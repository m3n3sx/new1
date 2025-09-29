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
        // Hook into plugin activation and deactivation
        register_activation_hook(__FILE__, array($this, 'cleanup_on_activation'));
        register_deactivation_hook(__FILE__, array($this, 'cleanup_on_deactivation'));
        
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
        // Verify nonce and permissions
        if (!wp_verify_nonce($_POST['nonce'], 'las_admin_nonce') || !current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Unauthorized access', 'live-admin-styler')]);
            return;
        }
        
        $results = $this->manual_cleanup();
        
        if (!empty($results['success']) || !empty($results['failed'])) {
            wp_send_json_success([
                'message' => sprintf(
                    __('Cleanup completed: %d files removed, %d failed, %d skipped.', 'live-admin-styler'),
                    count($results['success']),
                    count($results['failed']),
                    count($results['skipped'])
                ),
                'results' => $results
            ]);
        } else {
            wp_send_json_success([
                'message' => __('No files found for cleanup.', 'live-admin-styler'),
                'results' => $results
            ]);
        }
    }
}

// Initialize the file manager
$las_file_manager = new LAS_File_Manager();

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
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => 'Insufficient permissions',
                'code' => 'insufficient_permissions'
            ));
        }
        
        $new_nonce = $this->create_enhanced_nonce('las_admin_nonce');
        
        wp_send_json_success(array(
            'nonce' => $new_nonce,
            'expires_in' => self::NONCE_REFRESH_INTERVAL,
            'message' => 'Nonce refreshed successfully'
        ));
    }
    
    /**
     * AJAX handler for getting security status.
     */
    public function ajax_get_security_status() {
        if (!isset($_POST['nonce']) || !$this->verify_enhanced_nonce($_POST['nonce'])) {
            wp_send_json_error(array(
                'message' => 'Invalid security token',
                'code' => 'invalid_nonce'
            ));
        }
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => 'Insufficient permissions',
                'code' => 'insufficient_permissions'
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
        
        wp_send_json_success(array(
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
                'current_nonce' => $this->create_enhanced_nonce('las_admin_nonce'),
                'refresh_interval' => self::NONCE_REFRESH_INTERVAL
            )
        ));
    }
    
    /**
     * AJAX handler for clearing security log.
     */
    public function ajax_clear_security_log() {
        if (!isset($_POST['nonce']) || !$this->verify_enhanced_nonce($_POST['nonce'])) {
            wp_send_json_error(array(
                'message' => 'Invalid security token',
                'code' => 'invalid_nonce'
            ));
        }
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => 'Insufficient permissions',
                'code' => 'insufficient_permissions'
            ));
        }
        
        delete_option(self::SECURITY_LOG_KEY);
        
        $this->log_security_event('security_log_cleared', array(
            'cleared_by' => get_current_user_id()
        ));
        
        wp_send_json_success(array(
            'message' => 'Security log cleared successfully'
        ));
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

// Initialize the security manager
$las_security_manager = new LAS_Security_Manager();

// Initialize the file manager
$las_file_manager = new LAS_File_Manager();

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
        $results = $las_file_manager->manual_cleanup();
        
        // Store results for display
        update_option('las_fresh_cleanup_results', $results, false);
        
        // Redirect to remove query parameters
        wp_redirect(remove_query_arg(['las_cleanup', '_wpnonce']));
        exit;
    }
}
add_action('admin_init', 'las_fresh_handle_manual_cleanup');

// Include sub-files
require_once plugin_dir_path(__FILE__) . 'includes/admin-settings-page.php';
require_once plugin_dir_path(__FILE__) . 'includes/ajax-handlers.php';
require_once plugin_dir_path(__FILE__) . 'includes/output-css.php';
require_once plugin_dir_path(__FILE__) . 'includes/templates.php';


/**
 * Enqueue admin scripts and styles.
 */
function las_fresh_enqueue_assets($hook_suffix) {
    // Determine if we are on the plugin's settings page
    $is_plugin_settings_page = false;
    if (strpos($hook_suffix, LAS_FRESH_SETTINGS_SLUG) !== false) {
        $is_plugin_settings_page = true;
    } else {
        $current_screen = get_current_screen();
        if ($current_screen && strpos($current_screen->id, LAS_FRESH_SETTINGS_SLUG) !== false) {
            $is_plugin_settings_page = true;
        }
    }

    if (!$is_plugin_settings_page) {
        return;
    }

    wp_enqueue_style('wp-color-picker');
    wp_enqueue_script('wp-color-picker');
    wp_enqueue_script('jquery-ui-tabs');
    wp_enqueue_script('jquery-ui-slider');
    wp_enqueue_style('jquery-ui-css', '//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css');

    wp_enqueue_script(
        'las-fresh-admin-settings-js',
        plugin_dir_url(__FILE__) . 'js/admin-settings.js',
        array('jquery', 'wp-color-picker', 'jquery-ui-tabs', 'jquery-ui-slider'),
        LAS_FRESH_VERSION,
        true
    );

    wp_enqueue_script(
        'las-fresh-live-preview-js',
        plugin_dir_url(__FILE__) . 'assets/js/live-preview.js',
        array('jquery', 'wp-color-picker', 'jquery-ui-slider'),
        LAS_FRESH_VERSION,
        true
    );

    // Localize script for admin-settings.js
    wp_localize_script('las-fresh-admin-settings-js', 'lasFreshData', array(
        'ajax_url'      => admin_url('admin-ajax.php'),
        'nonce'         => wp_create_nonce('las_fresh_admin_nonce'),
        'option_name'   => LAS_FRESH_OPTION_NAME
    ));

    // Localize script for live-preview.js
    wp_localize_script('las-fresh-live-preview-js', 'lasAdminData', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('las_admin_nonce')
    ));

    wp_enqueue_style(
        'las-fresh-admin-style-css',
        plugin_dir_url(__FILE__) . 'assets/css/admin-style.css',
        array(),
        LAS_FRESH_VERSION
    );
}
add_action('admin_enqueue_scripts', 'las_fresh_enqueue_assets');

/**
 * Add dynamic CSS to admin head for overall admin styling.
 */
function las_fresh_add_dynamic_inline_styles() {
    if (is_admin()) {
        $generated_css = las_fresh_generate_admin_css_output();
        if (!empty($generated_css)) {
            echo '<style type="text/css" id="las-fresh-dynamic-admin-styles">' . "\n" . $generated_css . "\n" . '</style>';
        }
    }
}
add_action('admin_head', 'las_fresh_add_dynamic_inline_styles');

/**
 * Add dynamic CSS to login page head.
 */
function las_fresh_add_login_styles() {
    $login_css = las_fresh_generate_login_css_rules();
    if (!empty($login_css)) {
        echo '<style type="text/css" id="las-fresh-dynamic-login-styles">' . "\n" . esc_html($login_css) . "\n" . '</style>';
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

?>