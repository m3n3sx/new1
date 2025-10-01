<?php
/**
 * Live Admin Styler - AJAX Handlers
 *
 * Secure server-side AJAX handlers with proper validation, sanitization,
 * and error handling for the live preview critical repair.
 *
 * @package LiveAdminStyler
 * @version 1.2.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main AJAX Handlers class for Live Admin Styler
 *
 * Provides secure server-side handling of AJAX requests with comprehensive
 * validation, sanitization, and error handling.
 */
class LAS_Ajax_Handlers {

    /**
     * Security validator instance
     * @var LAS_Security_Validator
     */
    private $security;

    /**
     * Settings storage instance
     * @var LAS_Settings_Storage
     */
    private $storage;

    /**
     * Constructor - Initialize handlers and dependencies
     */
    public function __construct() {
        $this->security = new LAS_Security_Validator();
        $this->storage = new LAS_Settings_Storage();

        $this->register_handlers();
    }

    /**
     * Register all AJAX handlers
     */
    private function register_handlers() {
        add_action('wp_ajax_las_save_settings', [$this, 'handle_save_settings']);
        add_action('wp_ajax_las_load_settings', [$this, 'handle_load_settings']);
        add_action('wp_ajax_las_log_error', [$this, 'handle_log_error']);
        add_action('wp_ajax_las_get_preview_css', [$this, 'handle_get_preview_css']);
        add_action('wp_ajax_las_reset_settings', [$this, 'handle_reset_settings']);
    }

    /**
     * Handle settings save requests
     *
     * Processes incoming settings data with full validation and sanitization
     */
    public function handle_save_settings() {
        $start_time = microtime(true);

        try {

            if (!$this->security->verify_nonce($_POST['nonce'] ?? '', 'las_ajax_nonce')) {
                wp_die('Security check failed', 'Unauthorized', ['response' => 403]);
            }

            if (!current_user_can('manage_options')) {
                wp_die('Insufficient permissions', 'Forbidden', ['response' => 403]);
            }

            $settings_json = stripslashes($_POST['settings'] ?? '');
            $settings = json_decode($settings_json, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                wp_send_json_error([
                    'message' => 'Invalid JSON data provided',
                    'error_code' => 'invalid_json',
                    'json_error' => json_last_error_msg()
                ]);
                return;
            }

            if (!is_array($settings) || empty($settings)) {
                wp_send_json_error([
                    'message' => 'Settings data must be a non-empty array',
                    'error_code' => 'invalid_settings_format'
                ]);
                return;
            }

            $sanitized_settings = $this->security->sanitize_settings($settings);

            $result = $this->storage->save_settings($sanitized_settings);

            $execution_time = round((microtime(true) - $start_time) * 1000, 2);

            if ($result) {

                if ($execution_time > 500) {
                    error_log(sprintf(
                        '[LAS] Slow settings save: %dms for %d settings',
                        $execution_time,
                        count($sanitized_settings)
                    ));
                }

                wp_send_json_success([
                    'message' => 'Settings saved successfully',
                    'timestamp' => current_time('timestamp'),
                    'settings_count' => count($sanitized_settings),
                    'execution_time_ms' => $execution_time
                ]);
            } else {
                wp_send_json_error([
                    'message' => 'Failed to save settings to database',
                    'error_code' => 'database_save_failed',
                    'execution_time_ms' => $execution_time
                ]);
            }

        } catch (Exception $e) {
            $this->log_error('save_settings_error', $e, [
                'settings_count' => isset($settings) ? count($settings) : 0,
                'execution_time_ms' => round((microtime(true) - $start_time) * 1000, 2)
            ]);

            wp_send_json_error([
                'message' => 'An unexpected error occurred while saving settings',
                'error_code' => 'unexpected_error',
                'retry_suggested' => true
            ]);
        }
    }

    /**
     * Handle settings load requests
     *
     * Returns current settings with proper validation
     */
    public function handle_load_settings() {
        try {

            if (!$this->security->verify_nonce($_POST['nonce'] ?? '', 'las_ajax_nonce')) {
                wp_die('Security check failed', 'Unauthorized', ['response' => 403]);
            }

            if (!current_user_can('manage_options')) {
                wp_die('Insufficient permissions', 'Forbidden', ['response' => 403]);
            }

            $settings = $this->storage->load_settings();

            wp_send_json_success([
                'settings' => $settings,
                'timestamp' => current_time('timestamp'),
                'settings_count' => count($settings)
            ]);

        } catch (Exception $e) {
            $this->log_error('load_settings_error', $e);

            wp_send_json_error([
                'message' => 'Failed to load settings',
                'error_code' => 'load_failed'
            ]);
        }
    }

    /**
     * Handle client-side error logging
     *
     * Logs JavaScript errors from the frontend for debugging
     */
    public function handle_log_error() {
        try {

            if (!$this->security->verify_nonce($_POST['nonce'] ?? '', 'las_ajax_nonce')) {
                wp_send_json_error(['message' => 'Invalid nonce']);
                return;
            }

            if (!current_user_can('manage_options')) {
                wp_send_json_error(['message' => 'Insufficient permissions']);
                return;
            }

            $error_data = [
                'error' => sanitize_text_field($_POST['error'] ?? ''),
                'stack' => sanitize_textarea_field($_POST['stack'] ?? ''),
                'url' => esc_url_raw($_POST['url'] ?? ''),
                'user_agent' => sanitize_text_field($_POST['userAgent'] ?? ''),
                'timestamp' => current_time('mysql'),
                'user_id' => get_current_user_id(),
                'wp_version' => get_bloginfo('version'),
                'plugin_version' => defined('LAS_VERSION') ? LAS_VERSION : 'unknown'
            ];

            error_log('[LAS Frontend Error] ' . wp_json_encode($error_data, JSON_PRETTY_PRINT));

            wp_send_json_success([
                'message' => 'Error logged successfully',
                'timestamp' => $error_data['timestamp']
            ]);

        } catch (Exception $e) {

            error_log('[LAS] Error logging failed: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Logging failed']);
        }
    }

    /**
     * Handle live preview CSS generation
     *
     * Generates CSS for live preview with performance optimization
     */
    public function handle_get_preview_css() {
        $start_time = microtime(true);

        try {

            if (!$this->security->verify_nonce($_POST['nonce'] ?? '', 'las_ajax_nonce')) {
                wp_die('Security check failed', 'Unauthorized', ['response' => 403]);
            }

            if (!current_user_can('manage_options')) {
                wp_die('Insufficient permissions', 'Forbidden', ['response' => 403]);
            }

            $settings = $this->storage->load_settings();

            if (isset($_POST['preview_settings'])) {
                $preview_settings = json_decode(stripslashes($_POST['preview_settings']), true);
                if (is_array($preview_settings)) {
                    $sanitized_preview = $this->security->sanitize_settings($preview_settings);
                    $settings = array_merge($settings, $sanitized_preview);
                }
            }

            $css = $this->generate_preview_css($settings);

            $execution_time = round((microtime(true) - $start_time) * 1000, 2);
            $memory_usage = memory_get_usage(true);

            wp_send_json_success([
                'css' => $css,
                'performance' => [
                    'execution_time_ms' => $execution_time,
                    'memory_usage' => $memory_usage,
                    'memory_usage_formatted' => size_format($memory_usage),
                    'settings_processed' => count($settings),
                    'timestamp' => current_time('timestamp')
                ]
            ]);

        } catch (Exception $e) {
            $this->log_error('preview_css_error', $e, [
                'execution_time_ms' => round((microtime(true) - $start_time) * 1000, 2)
            ]);

            wp_send_json_error([
                'message' => 'Failed to generate preview CSS',
                'error_code' => 'css_generation_failed'
            ]);
        }
    }

    /**
     * Handle settings reset requests
     *
     * Resets all settings to default values
     */
    public function handle_reset_settings() {
        try {

            if (!$this->security->verify_nonce($_POST['nonce'] ?? '', 'las_ajax_nonce')) {
                wp_die('Security check failed', 'Unauthorized', ['response' => 403]);
            }

            if (!current_user_can('manage_options')) {
                wp_die('Insufficient permissions', 'Forbidden', ['response' => 403]);
            }

            $result = $this->storage->reset_settings();

            if ($result) {
                wp_send_json_success([
                    'message' => 'Settings reset to defaults successfully',
                    'timestamp' => current_time('timestamp')
                ]);
            } else {
                wp_send_json_error([
                    'message' => 'Failed to reset settings',
                    'error_code' => 'reset_failed'
                ]);
            }

        } catch (Exception $e) {
            $this->log_error('reset_settings_error', $e);

            wp_send_json_error([
                'message' => 'An unexpected error occurred while resetting settings',
                'error_code' => 'unexpected_error'
            ]);
        }
    }

    /**
     * Generate CSS for live preview
     *
     * @param array $settings Current settings
     * @return string Generated CSS
     */
    private function generate_preview_css($settings) {
        $css = '';

        if (!empty($settings['menu_background_color'])) {
            $css .= sprintf(
                '#adminmenu { background-color: %s !important; }' . "\n",
                esc_attr($settings['menu_background_color'])
            );
        }

        if (!empty($settings['menu_text_color'])) {
            $css .= sprintf(
                '#adminmenu a { color: %s !important; }' . "\n",
                esc_attr($settings['menu_text_color'])
            );
        }

        if (!empty($settings['menu_hover_color'])) {
            $css .= sprintf(
                '#adminmenu a:hover { color: %s !important; }' . "\n",
                esc_attr($settings['menu_hover_color'])
            );
        }

        if (!empty($settings['adminbar_background'])) {
            $css .= sprintf(
                '#wpadminbar { background: %s !important; }' . "\n",
                esc_attr($settings['adminbar_background'])
            );
        }

        if (!empty($settings['content_background'])) {
            $css .= sprintf(
                '#wpbody-content { background-color: %s !important; }' . "\n",
                esc_attr($settings['content_background'])
            );
        }

        return $css;
    }

    /**
     * Log errors with context information
     *
     * @param string $error_type Type of error
     * @param Exception $exception Exception object
     * @param array $context Additional context
     */
    private function log_error($error_type, $exception, $context = []) {
        $error_data = [
            'type' => $error_type,
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => WP_DEBUG ? $exception->getTraceAsString() : 'trace_disabled',
            'timestamp' => current_time('mysql'),
            'user_id' => get_current_user_id(),
            'memory_usage' => memory_get_usage(true),
            'context' => $context
        ];

        error_log('[LAS AJAX Error] ' . wp_json_encode($error_data, JSON_PRETTY_PRINT));
    }
}