<?php
// Prevent direct access to the file.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enhanced AJAX handler for live preview CSS generation.
 * Provides improved error handling, performance optimizations, and better validation.
 */
function las_ajax_get_preview_css() {
    // Start performance timing
    $start_time = microtime(true);
    
    try {
        // Validate request type
        if (!wp_doing_ajax()) {
            status_header(400);
            echo 'Invalid request type for this endpoint.';
            exit;
        }

        // Enhanced security validation with detailed error handling
        $nonce_validation = las_validate_ajax_request(true);
        
        // Check if nonce should be refreshed proactively
        $should_suggest_refresh = $nonce_validation['should_refresh'];

        // Get base options for preview
        $options_for_preview = las_fresh_get_options();
        $defaults = las_fresh_get_default_options();

        // Handle single setting update
        if (isset($_POST['setting']) && isset($_POST['value'])) {
            $setting_key = sanitize_key($_POST['setting']);
            
            // Validate setting key exists in defaults
            if (!array_key_exists($setting_key, $defaults)) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid setting key provided.',
                    'invalid_setting',
                    array('setting' => $setting_key)
                ));
            }
            
            $raw_value = wp_unslash($_POST['value']);
            
            // Use enhanced sanitization
            $setting_type = get_setting_type($setting_key);
            $sanitized_value = las_enhanced_sanitize_setting_value($setting_key, $raw_value, $defaults[$setting_key]);

            // Handle special virtual settings
            if (in_array($setting_key, ['menu_collapse_state', 'menu_visual_effects_update'])) {
                // Virtual settings - don't store in options, just trigger CSS regeneration
                // These are used for menu state tracking and visual effects updates
            } else {
                // Store the setting in options for preview
                $options_for_preview[$setting_key] = $sanitized_value;
            }

            // Handle font family pairs for preview
            $options_for_preview = las_handle_font_family_pairs($options_for_preview, $setting_key, $sanitized_value, $defaults);

        } elseif (isset($_POST['settings_batch'])) {
            // Handle batch settings update
            $batch_settings_raw = json_decode(stripslashes($_POST['settings_batch']), true);
            
            if (!is_array($batch_settings_raw)) {
                wp_send_json_error(las_create_ajax_error_response(
                    'Invalid settings batch data format.',
                    'invalid_batch_format'
                ));
            }
            
            // Validate and sanitize batch settings
            $validated_batch = array();
            foreach ($batch_settings_raw as $key => $value) {
                $clean_key = sanitize_key($key);
                if (array_key_exists($clean_key, $defaults)) {
                    $validated_batch[$clean_key] = las_enhanced_sanitize_setting_value($clean_key, $value, $defaults[$clean_key]);
                }
            }
            
            $options_for_preview = array_merge($defaults, $validated_batch);
        }

        // Generate CSS with error handling
        $generated_css = las_fresh_generate_admin_css_output($options_for_preview);
        
        if ($generated_css === false || $generated_css === null) {
            wp_send_json_error(las_create_ajax_error_response(
                'Failed to generate CSS output.',
                'css_generation_failed'
            ));
        }

        // Calculate performance metrics
        $execution_time = round((microtime(true) - $start_time) * 1000, 2);
        $memory_usage = memory_get_usage(true);
        $peak_memory = memory_get_peak_usage(true);
        
        // Store AJAX performance metrics
        $ajax_metrics = array(
            'execution_time_ms' => $execution_time,
            'memory_usage_bytes' => $memory_usage,
            'memory_usage_formatted' => size_format($memory_usage),
            'peak_memory_bytes' => $peak_memory,
            'peak_memory_formatted' => size_format($peak_memory),
            'settings_processed' => isset($_POST['settings_batch']) ? count($validated_batch ?? array()) : 1,
            'request_type' => isset($_POST['settings_batch']) ? 'batch' : 'single',
            'setting_key' => isset($_POST['setting']) ? sanitize_key($_POST['setting']) : null,
            'timestamp' => current_time('timestamp'),
            'user_id' => get_current_user_id()
        );
        
        // Store metrics for reporting
        if (function_exists('las_fresh_store_performance_metrics')) {
            las_fresh_store_performance_metrics('ajax_preview', $ajax_metrics);
        }
        
        // Log performance metrics for optimization
        if ($execution_time > 500) { // Log slow operations
            error_log(sprintf(
                'LAS Performance Warning: Slow AJAX CSS generation - %dms, Memory: %s, Peak: %s, Setting: %s',
                $execution_time,
                size_format($memory_usage),
                size_format($peak_memory),
                isset($_POST['setting']) ? sanitize_key($_POST['setting']) : 'batch'
            ));
        }
        
        // Log high memory usage
        if ($memory_usage > 50 * 1024 * 1024) { // 50MB
            error_log(sprintf(
                'LAS Performance Warning: High memory usage in AJAX handler - Memory: %s, Peak: %s, Setting: %s',
                size_format($memory_usage),
                size_format($peak_memory),
                isset($_POST['setting']) ? sanitize_key($_POST['setting']) : 'batch'
            ));
        }
        
        // Prepare response data maintaining backward compatibility
        $response_data = array(
            'css' => $generated_css,
            'performance' => array(
                'execution_time_ms' => $execution_time,
                'memory_usage' => $memory_usage,
                'memory_usage_formatted' => size_format($memory_usage),
                'peak_memory' => $peak_memory,
                'peak_memory_formatted' => size_format($peak_memory),
                'settings_processed' => isset($_POST['settings_batch']) ? count($validated_batch ?? array()) : 1,
                'cache_recommended' => $execution_time > 200,
                'timestamp' => current_time('timestamp')
            )
        );
        
        // Add nonce refresh suggestion if needed
        if ($should_suggest_refresh) {
            $response_data['nonce_status'] = array(
                'should_refresh' => true,
                'message' => 'Consider refreshing security token for optimal performance'
            );
        }
        
        // Send successful response maintaining backward compatibility
        // The frontend expects response.data.css directly, so we return the data structure directly
        wp_send_json_success($response_data);
        
    } catch (Exception $e) {
        // Enhanced error logging with context
        $error_context = array(
            'user_id' => get_current_user_id(),
            'timestamp' => current_time('mysql'),
            'request_data' => array(
                'setting' => isset($_POST['setting']) ? sanitize_key($_POST['setting']) : null,
                'has_batch' => isset($_POST['settings_batch']),
                'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : 'unknown'
            ),
            'error_details' => array(
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => WP_DEBUG ? $e->getTraceAsString() : 'trace_disabled'
            )
        );
        
        error_log('LAS Live Preview Error: ' . wp_json_encode($error_context));
        
        // User-friendly error response with unified format
        $additional_data = array(
            'retry_suggested' => true
        );
        
        // Add debug info for developers
        if (WP_DEBUG) {
            $additional_data['debug'] = array(
                'exception_message' => $e->getMessage(),
                'exception_file' => basename($e->getFile()),
                'exception_line' => $e->getLine()
            );
        }
        
        wp_send_json_error(las_create_ajax_error_response(
            'An unexpected error occurred during preview generation. Please try again.',
            'unexpected_error',
            $additional_data
        ));
    }
}

/**
 * Get the expected type for a setting key.
 *
 * @param string $setting_key The setting key.
 * @return string The expected type.
 */
function get_setting_type($setting_key) {
    // Color settings
    if (strpos($setting_key, '_color') !== false || strpos($setting_key, '_gradient_color') !== false) {
        return 'color';
    }
    
    // Numeric settings
    if (is_numeric($setting_key) || 
        strpos($setting_key, '_size') !== false || 
        strpos($setting_key, '_height') !== false || 
        strpos($setting_key, '_width') !== false || 
        strpos($setting_key, '_margin') !== false || 
        strpos($setting_key, '_padding') !== false || 
        strpos($setting_key, '_radius') !== false || 
        strpos($setting_key, '_offset_') !== false || 
        strpos($setting_key, '_blur') !== false || 
        strpos($setting_key, '_spread') !== false) {
        return 'integer';
    }
    
    // Boolean settings
    if (in_array($setting_key, ['admin_menu_detached', 'admin_bar_detached'])) {
        return 'boolean';
    }
    
    // CSS settings
    if (strpos($setting_key, 'custom_css') !== false || strpos($setting_key, '_shadow_') !== false) {
        return 'css';
    }
    
    // URL settings
    if (strpos($setting_key, '_logo') !== false || strpos($setting_key, '_url') !== false) {
        return 'url';
    }
    
    // Select settings
    if (in_array($setting_key, [
        'admin_menu_bg_type', 'admin_bar_bg_type', 'body_bg_type',
        'admin_menu_font_family', 'admin_bar_font_family', 'body_font_family',
        'admin_menu_shadow_type', 'admin_bar_shadow_type',
        'admin_bar_width_type', 'admin_bar_border_radius_type', 'admin_menu_border_radius_type'
    ])) {
        return 'select';
    }
    
    return 'text';
}

/**
 * Enhanced setting value sanitization with improved type handling.
 */
function las_enhanced_sanitize_setting_value($setting_key, $raw_value, $default_value) {
    // Color settings
    if (strpos($setting_key, '_color') !== false || strpos($setting_key, '_gradient_color') !== false) {
        $sanitized = sanitize_hex_color($raw_value);
        return $sanitized ? $sanitized : $default_value;
    }
    
    // Numeric settings
    if (is_numeric($raw_value) && (
        is_int($default_value) || 
        strpos($setting_key, '_size') !== false || 
        strpos($setting_key, '_height') !== false || 
        strpos($setting_key, '_width') !== false || 
        strpos($setting_key, '_margin') !== false || 
        strpos($setting_key, '_padding') !== false || 
        strpos($setting_key, '_radius') !== false || 
        strpos($setting_key, '_offset_') !== false || 
        strpos($setting_key, '_blur') !== false || 
        strpos($setting_key, '_spread') !== false
    )) {
        // Allow negative values for offset and spread settings
        if (in_array($setting_key, [
            'admin_menu_shadow_advanced_offset_x', 
            'admin_menu_shadow_advanced_offset_y', 
            'admin_menu_shadow_advanced_spread',
            'admin_bar_shadow_advanced_offset_x', 
            'admin_bar_shadow_advanced_offset_y', 
            'admin_bar_shadow_advanced_spread'
        ])) {
            return intval($raw_value);
        } else {
            return absint($raw_value);
        }
    }
    
    // Boolean settings
    if (is_bool($default_value) || in_array($setting_key, ['admin_menu_detached', 'admin_bar_detached'])) {
        return ($raw_value === '1' || $raw_value === true || $raw_value === 1);
    }
    
    // Default text sanitization
    return sanitize_text_field($raw_value);
}

/**
 * Handle font family pairs for preview generation.
 */
function las_handle_font_family_pairs($options, $setting_key, $sanitized_value, $defaults) {
    if (strpos($setting_key, '_google_font') !== false && !empty($sanitized_value)) {
        $font_family_key = str_replace('_google_font', '_font_family', $setting_key);
        if (array_key_exists($font_family_key, $defaults)) {
            $options[$font_family_key] = 'google';
        }
    } elseif (strpos($setting_key, '_font_family') !== false && $sanitized_value !== 'google') {
        $google_font_key = str_replace('_font_family', '_google_font', $setting_key);
        if (array_key_exists($google_font_key, $defaults)) {
            $options[$google_font_key] = '';
        }
    }
    
    return $options;
}
add_action('wp_ajax_las_get_preview_css', 'las_ajax_get_preview_css');

/**
 * AJAX handler for saving active tab state.
 */
function las_ajax_save_tab_state() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        // Validate and sanitize input
        $tab = las_sanitize_ajax_input($_POST['tab'] ?? '', 'key');
        if (empty($tab)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Tab parameter is required.',
                'missing_tab_parameter'
            ));
        }

        // Validate tab is in allowed list
        $allowed_tabs = array('general', 'menu', 'adminbar', 'content', 'logos', 'advanced');
        if (!in_array($tab, $allowed_tabs)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Invalid tab specified.',
                'invalid_tab',
                array('allowed_tabs' => $allowed_tabs)
            ));
        }

        $success = las_fresh_save_active_tab($tab);

        if ($success) {
            wp_send_json_success(las_create_ajax_success_response(
                array('active_tab' => $tab),
                'Tab state saved successfully.'
            ));
        } else {
            wp_send_json_error(las_create_ajax_error_response(
                'Failed to save tab state.',
                'save_failed'
            ));
        }
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'tab_state_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_save_tab_state',
            'tab' => $_POST['tab'] ?? 'unknown'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while saving tab state.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_save_tab_state', 'las_ajax_save_tab_state');

/**
 * Enhanced error logging function with context information.
 */
function las_log_error_with_context($error_data, $context = array()) {
    // Prepare comprehensive error context
    $full_context = array_merge(array(
        'timestamp' => current_time('mysql'),
        'user_id' => get_current_user_id(),
        'user_login' => wp_get_current_user()->user_login,
        'site_url' => get_site_url(),
        'wp_version' => get_bloginfo('version'),
        'php_version' => PHP_VERSION,
        'plugin_version' => defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : 'unknown',
        'memory_usage' => memory_get_usage(true),
        'memory_peak' => memory_get_peak_usage(true),
        'request_uri' => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '',
        'http_referer' => isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '',
        'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : 'unknown',
        'remote_addr' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
        'server_software' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'unknown'
    ), $context);
    
    // Combine error data with context
    $log_entry = array(
        'error' => $error_data,
        'context' => $full_context
    );
    
    // Log to WordPress error log
    error_log('LAS Error Report: ' . wp_json_encode($log_entry, JSON_PRETTY_PRINT));
    
    // Store in database for analysis (optional - only if WP_DEBUG is enabled)
    if (defined('WP_DEBUG') && WP_DEBUG) {
        las_store_error_in_database($log_entry);
    }
    
    // Send to external error tracking service if configured
    if (defined('LAS_ERROR_TRACKING_ENDPOINT') && LAS_ERROR_TRACKING_ENDPOINT) {
        las_send_error_to_tracking_service($log_entry);
    }
    
    return $log_entry;
}

/**
 * Store error in database for analysis.
 */
function las_store_error_in_database($log_entry) {
    global $wpdb;
    
    try {
        // Create table if it doesn't exist
        $table_name = $wpdb->prefix . 'las_error_logs';
        
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            timestamp datetime DEFAULT CURRENT_TIMESTAMP,
            user_id bigint(20) UNSIGNED,
            error_type varchar(50),
            error_message text,
            error_context longtext,
            resolved tinyint(1) DEFAULT 0,
            PRIMARY KEY (id),
            KEY timestamp (timestamp),
            KEY user_id (user_id),
            KEY error_type (error_type)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Insert error log
        $wpdb->insert(
            $table_name,
            array(
                'user_id' => $log_entry['context']['user_id'],
                'error_type' => $log_entry['error']['type'] ?? 'unknown',
                'error_message' => $log_entry['error']['message'] ?? 'No message',
                'error_context' => wp_json_encode($log_entry)
            ),
            array('%d', '%s', '%s', '%s')
        );
        
        // Clean up old entries (keep only last 1000)
        $wpdb->query("DELETE FROM $table_name WHERE id NOT IN (SELECT id FROM (SELECT id FROM $table_name ORDER BY timestamp DESC LIMIT 1000) as t)");
        
    } catch (Exception $e) {
        error_log('LAS: Failed to store error in database: ' . $e->getMessage());
    }
}

/**
 * Send error to external tracking service.
 */
function las_send_error_to_tracking_service($log_entry) {
    try {
        $response = wp_remote_post(LAS_ERROR_TRACKING_ENDPOINT, array(
            'timeout' => 5,
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'Live-Admin-Styler/' . (defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : '1.0')
            ),
            'body' => wp_json_encode($log_entry)
        ));
        
        if (is_wp_error($response)) {
            error_log('LAS: Failed to send error to tracking service: ' . $response->get_error_message());
        }
    } catch (Exception $e) {
        error_log('LAS: Exception sending error to tracking service: ' . $e->getMessage());
    }
}

/**
 * AJAX handler for client-side error reporting with enhanced logging.
 * This handler is kept for backward compatibility but redirects to the new error logger.
 */
function las_ajax_report_error() {
    // Redirect to new error reporting handler
    las_ajax_report_client_error();
}
add_action('wp_ajax_las_report_error', 'las_ajax_report_error');

/**
 * New AJAX handler for client-side error reporting using the enhanced error logger.
 */
function las_ajax_report_client_error() {
    global $las_error_logger;
    
    // If error logger is not available, fall back to basic logging
    if (!($las_error_logger instanceof LAS_Error_Logger)) {
        las_ajax_report_error_fallback();
        return;
    }
    
    // Use the error logger's built-in AJAX handler
    $las_error_logger->handle_client_error_report();
}
add_action('wp_ajax_las_report_client_error', 'las_ajax_report_client_error');

/**
 * Fallback error reporting when error logger is not available.
 */
function las_ajax_report_error_fallback() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        // Sanitize and validate all input data
        $error_data = array(
            'message' => las_sanitize_ajax_input($_POST['message'] ?? '', 'text', 'Unknown error'),
            'type' => las_sanitize_ajax_input($_POST['type'] ?? '', 'key', 'javascript'),
            'source' => las_sanitize_ajax_input($_POST['source'] ?? '', 'text', 'unknown'),
            'line' => las_sanitize_ajax_input($_POST['line'] ?? '', 'int', 0),
            'column' => las_sanitize_ajax_input($_POST['column'] ?? '', 'int', 0),
            'stack' => las_sanitize_ajax_input($_POST['stack'] ?? '', 'textarea', ''),
            'url' => las_sanitize_ajax_input($_POST['url'] ?? '', 'url', ''),
            'user_agent_client' => las_sanitize_ajax_input($_POST['user_agent'] ?? '', 'text', ''),
            'timestamp_client' => las_sanitize_ajax_input($_POST['timestamp'] ?? '', 'int', 0),
            'browser_info' => array(
                'language' => las_sanitize_ajax_input($_POST['language'] ?? '', 'text', ''),
                'platform' => las_sanitize_ajax_input($_POST['platform'] ?? '', 'text', ''),
                'cookie_enabled' => las_sanitize_ajax_input($_POST['cookie_enabled'] ?? '', 'bool', false),
                'online' => las_sanitize_ajax_input($_POST['online'] ?? '', 'bool', true),
                'screen_resolution' => las_sanitize_ajax_input($_POST['screen_resolution'] ?? '', 'text', ''),
                'viewport_size' => las_sanitize_ajax_input($_POST['viewport_size'] ?? '', 'text', '')
            )
        );

        // Validate required fields
        if (empty($error_data['message']) || strlen($error_data['message']) < 3) {
            wp_send_json_error(las_create_ajax_error_response(
                'Error message is required and must be at least 3 characters.',
                'invalid_error_message'
            ));
        }

        // Additional context for server-side logging
        $context = array(
            'ajax_action' => 'las_report_client_error',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'content_length' => isset($_SERVER['CONTENT_LENGTH']) ? absint($_SERVER['CONTENT_LENGTH']) : 0,
            'active_plugins' => get_option('active_plugins', array()),
            'active_theme' => get_template(),
            'multisite' => is_multisite(),
            'debug_mode' => defined('WP_DEBUG') && WP_DEBUG,
            'error_reporting_level' => error_reporting(),
            'fallback_mode' => true
        );

        // Log the client-side error with full context
        $log_entry = las_log_error_with_context($error_data, $context);

        // Track error frequency for this user
        $user_id = get_current_user_id();
        $error_count_key = 'las_error_count_' . date('Y-m-d');
        $current_count = get_user_meta($user_id, $error_count_key, true);
        $current_count = is_numeric($current_count) ? intval($current_count) + 1 : 1;
        update_user_meta($user_id, $error_count_key, $current_count);
        
        // Alert if user is experiencing many errors
        $alert_threshold = 10;
        $should_alert = $current_count >= $alert_threshold;
        
        if ($should_alert) {
            error_log("LAS Alert: User {$user_id} has reported {$current_count} errors today");
        }

        wp_send_json_success(las_create_ajax_success_response(
            array(
                'logged' => true,
                'log_id' => isset($log_entry['context']['timestamp']) ? $log_entry['context']['timestamp'] : null,
                'error_count_today' => $current_count,
                'should_show_support_notice' => $should_alert,
                'support_url' => 'https://wordpress.org/support/plugin/live-admin-styler/',
                'fallback_mode' => true
            ),
            'Error reported successfully (fallback mode)'
        ));
        
    } catch (Exception $e) {
        error_log('LAS Error Reporting Fallback Failed: ' . $e->getMessage());
        
        wp_send_json_error(las_create_ajax_error_response(
            'Failed to report error.',
            'error_reporting_failed'
        ));
    }
}

/**
 * AJAX handler for saving user preferences.
 */
function las_ajax_save_user_preferences() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        // Validate and sanitize preferences data
        $preferences_raw = las_sanitize_ajax_input($_POST['preferences'] ?? '', 'json');
        if (empty($preferences_raw) || !is_array($preferences_raw)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Preferences parameter is required and must be valid JSON.',
                'missing_or_invalid_preferences'
            ));
        }

        // Validate preferences structure
        $allowed_preference_keys = array('theme', 'layout', 'notifications', 'auto_save', 'debug_mode');
        $sanitized_preferences = array();
        
        foreach ($preferences_raw as $key => $value) {
            $clean_key = sanitize_key($key);
            if (in_array($clean_key, $allowed_preference_keys)) {
                $sanitized_preferences[$clean_key] = las_sanitize_ajax_input($value, 'text');
            }
        }

        if (empty($sanitized_preferences)) {
            wp_send_json_error(las_create_ajax_error_response(
                'No valid preferences provided.',
                'no_valid_preferences',
                array('allowed_keys' => $allowed_preference_keys)
            ));
        }

        $user_state = new LAS_User_State();
        $success = $user_state->set_ui_preferences($sanitized_preferences);

        if ($success) {
            wp_send_json_success(las_create_ajax_success_response(
                array('preferences' => $user_state->get_ui_preferences()),
                'User preferences saved successfully.'
            ));
        } else {
            wp_send_json_error(las_create_ajax_error_response(
                'Failed to save user preferences.',
                'save_failed'
            ));
        }
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'user_preferences_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_save_user_preferences'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while saving preferences.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_save_user_preferences', 'las_ajax_save_user_preferences');

/**
 * AJAX handler for getting user preferences.
 */
function las_ajax_get_user_preferences() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        $user_state = new LAS_User_State();
        $session_data = $user_state->get_session_data();

        // Validate session data structure
        if (!is_array($session_data)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Invalid session data structure.',
                'invalid_session_data'
            ));
        }

        wp_send_json_success(las_create_ajax_success_response(
            array(
                'session_data' => $session_data,
                'preferences' => $session_data['ui_preferences'] ?? array(),
                'active_tab' => $session_data['active_tab'] ?? 'general'
            ),
            'User preferences retrieved successfully.'
        ));
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'get_user_preferences_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_get_user_preferences'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while retrieving preferences.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_get_user_preferences', 'las_ajax_get_user_preferences');

/**
 * AJAX handler for synchronizing user state between sessions.
 */
function las_ajax_sync_user_state() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        // Validate and sanitize session data
        $session_data_raw = las_sanitize_ajax_input($_POST['session_data'] ?? '', 'json');
        if (empty($session_data_raw) || !is_array($session_data_raw)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Session data parameter is required and must be valid JSON.',
                'missing_or_invalid_session_data'
            ));
        }

        // Validate session data structure
        $required_keys = array('ui_preferences', 'active_tab');
        foreach ($required_keys as $key) {
            if (!array_key_exists($key, $session_data_raw)) {
                wp_send_json_error(las_create_ajax_error_response(
                    "Missing required session data key: {$key}",
                    'incomplete_session_data',
                    array('required_keys' => $required_keys)
                ));
            }
        }

        $user_state = new LAS_User_State();
        $success = $user_state->sync_from_session($session_data_raw);

        if ($success) {
            wp_send_json_success(las_create_ajax_success_response(
                array('session_data' => $user_state->get_session_data()),
                'User state synchronized successfully.'
            ));
        } else {
            wp_send_json_error(las_create_ajax_error_response(
                'Failed to synchronize user state.',
                'sync_failed'
            ));
        }
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'user_state_sync_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_sync_user_state'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while synchronizing state.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_sync_user_state', 'las_ajax_sync_user_state');

/**
 * AJAX handler for getting debug information.
 */
function las_ajax_get_debug_info() {
    global $las_error_logger;
    
    // If error logger is not available, return basic debug info
    if (!($las_error_logger instanceof LAS_Error_Logger)) {
        las_ajax_get_debug_info_fallback();
        return;
    }
    
    // Use the error logger's built-in AJAX handler
    $las_error_logger->get_debug_info();
}
add_action('wp_ajax_las_get_debug_info', 'las_ajax_get_debug_info');

/**
 * Fallback debug info when error logger is not available.
 */
function las_ajax_get_debug_info_fallback() {
    try {
        // Verify nonce and permissions
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_fresh_admin_nonce') || !current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
            return;
        }
        
        $debug_info = array(
            'system_info' => array(
                'wordpress_version' => get_bloginfo('version'),
                'php_version' => PHP_VERSION,
                'plugin_version' => LAS_FRESH_VERSION,
                'debug_mode' => defined('WP_DEBUG') && WP_DEBUG,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time')
            ),
            'plugin_info' => array(
                'version' => LAS_FRESH_VERSION,
                'text_domain' => LAS_FRESH_TEXT_DOMAIN,
                'settings_slug' => LAS_FRESH_SETTINGS_SLUG
            ),
            'performance_info' => array(
                'memory_usage' => memory_get_usage(true),
                'memory_usage_formatted' => size_format(memory_get_usage(true)),
                'peak_memory' => memory_get_peak_usage(true),
                'peak_memory_formatted' => size_format(memory_get_peak_usage(true))
            ),
            'recent_errors' => array(),
            'error_statistics' => array('message' => 'Error logger not available'),
            'performance_metrics' => array('message' => 'Performance metrics not available'),
            'configuration' => las_fresh_get_options(),
            'fallback_mode' => true
        );
        
        wp_send_json_success($debug_info);
        
    } catch (Exception $e) {
        error_log('LAS Debug Info Fallback Failed: ' . $e->getMessage());
        wp_send_json_error('Failed to retrieve debug information');
    }
}

/**
 * AJAX handler for clearing error logs.
 */
function las_ajax_clear_error_logs() {
    global $las_error_logger;
    
    // If error logger is not available, return error
    if (!($las_error_logger instanceof LAS_Error_Logger)) {
        wp_send_json_error('Error logger not available');
        return;
    }
    
    // Use the error logger's built-in AJAX handler
    $las_error_logger->clear_error_logs();
}
add_action('wp_ajax_las_clear_error_logs', 'las_ajax_clear_error_logs');

/**
 * AJAX handler for resetting user state to defaults.
 */
function las_ajax_reset_user_state() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        // Optional confirmation parameter
        $confirm_reset = las_sanitize_ajax_input($_POST['confirm'] ?? '', 'bool', false);
        if (!$confirm_reset) {
            wp_send_json_error(las_create_ajax_error_response(
                'Reset confirmation is required.',
                'reset_not_confirmed',
                array('confirm_required' => true)
            ));
        }

        $user_state = new LAS_User_State();
        $success = $user_state->reset_to_defaults();

        if ($success) {
            wp_send_json_success(las_create_ajax_success_response(
                array('session_data' => $user_state->get_session_data()),
                'User state reset to defaults successfully.'
            ));
        } else {
            wp_send_json_error(las_create_ajax_error_response(
                'Failed to reset user state.',
                'reset_failed'
            ));
        }
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'reset_user_state_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_reset_user_state'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while resetting state.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_reset_user_state', 'las_ajax_reset_user_state');

/**
 * AJAX handler for getting performance metrics and reports
 */
function las_ajax_get_performance_metrics() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        // Get request parameters
        $operation_type = las_sanitize_ajax_input($_POST['operation_type'] ?? '', 'key');
        $report_days = las_sanitize_ajax_input($_POST['days'] ?? 7, 'int');
        $limit = las_sanitize_ajax_input($_POST['limit'] ?? 50, 'int');
        
        // Validate parameters
        $report_days = max(1, min(30, $report_days)); // 1-30 days
        $limit = max(10, min(200, $limit)); // 10-200 entries
        
        $valid_operation_types = array('css_generation', 'ajax_preview', 'all');
        if (!empty($operation_type) && !in_array($operation_type, $valid_operation_types)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Invalid operation type specified.',
                'invalid_operation_type',
                array('valid_types' => $valid_operation_types)
            ));
        }
        
        // Get performance data
        $response_data = array();
        
        // Get raw metrics
        if (function_exists('las_fresh_get_performance_metrics')) {
            $metrics = las_fresh_get_performance_metrics($operation_type ?: null, $limit);
            $response_data['metrics'] = $metrics;
        } else {
            $response_data['metrics'] = array();
        }
        
        // Generate performance report
        if (function_exists('las_fresh_generate_performance_report')) {
            $report = las_fresh_generate_performance_report($operation_type ?: null, $report_days);
            $response_data['report'] = $report;
        } else {
            $response_data['report'] = array('error' => 'Performance reporting not available');
        }
        
        // Get cache statistics
        if (function_exists('las_fresh_get_cache_stats')) {
            $cache_stats = las_fresh_get_cache_stats();
            $response_data['cache_stats'] = $cache_stats;
        } else {
            $response_data['cache_stats'] = array('status' => 'unavailable');
        }
        
        // Add system information
        $response_data['system_info'] = array(
            'php_version' => PHP_VERSION,
            'wp_version' => get_bloginfo('version'),
            'plugin_version' => defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : 'unknown',
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'current_memory_usage' => size_format(memory_get_usage(true)),
            'peak_memory_usage' => size_format(memory_get_peak_usage(true)),
            'timestamp' => current_time('timestamp')
        );

        wp_send_json_success(las_create_ajax_success_response(
            $response_data,
            'Performance metrics retrieved successfully.'
        ));
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'performance_metrics_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_get_performance_metrics'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while retrieving performance metrics.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_get_performance_metrics', 'las_ajax_get_performance_metrics');

/**
 * AJAX handler for clearing performance metrics and cache
 */
function las_ajax_clear_performance_data() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);

        // Get clear type parameter
        $clear_type = las_sanitize_ajax_input($_POST['clear_type'] ?? 'cache', 'key');
        
        $valid_clear_types = array('cache', 'metrics', 'all');
        if (!in_array($clear_type, $valid_clear_types)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Invalid clear type specified.',
                'invalid_clear_type',
                array('valid_types' => $valid_clear_types)
            ));
        }
        
        $results = array();
        
        // Clear cache
        if ($clear_type === 'cache' || $clear_type === 'all') {
            if (function_exists('las_fresh_clear_css_cache')) {
                $cache_cleared = las_fresh_clear_css_cache();
                $results['cache_cleared'] = $cache_cleared;
            } else {
                $results['cache_cleared'] = false;
                $results['cache_error'] = 'Cache clearing function not available';
            }
        }
        
        // Clear metrics
        if ($clear_type === 'metrics' || $clear_type === 'all') {
            $metrics_cleared = delete_option('las_fresh_performance_metrics');
            $results['metrics_cleared'] = $metrics_cleared;
        }
        
        // Determine overall success
        $overall_success = true;
        if (isset($results['cache_cleared'])) {
            $overall_success = $overall_success && $results['cache_cleared'];
        }
        if (isset($results['metrics_cleared'])) {
            $overall_success = $overall_success && $results['metrics_cleared'];
        }
        
        if ($overall_success) {
            wp_send_json_success(las_create_ajax_success_response(
                $results,
                'Performance data cleared successfully.'
            ));
        } else {
            wp_send_json_error(las_create_ajax_error_response(
                'Some performance data could not be cleared.',
                'partial_clear_failure',
                $results
            ));
        }
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'clear_performance_data_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_clear_performance_data'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while clearing performance data.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_clear_performance_data', 'las_ajax_clear_performance_data');

/**
 * AJAX handler for getting performance statistics.
 */
function las_ajax_get_performance_stats() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);
        $stats = array(
            'server' => array(
                'php_version' => PHP_VERSION,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'current_memory_usage' => memory_get_usage(true),
                'current_memory_usage_formatted' => size_format(memory_get_usage(true)),
                'peak_memory_usage' => memory_get_peak_usage(true),
                'peak_memory_usage_formatted' => size_format(memory_get_peak_usage(true))
            ),
            'wordpress' => array(
                'version' => get_bloginfo('version'),
                'multisite' => is_multisite(),
                'debug_mode' => WP_DEBUG,
                'active_plugins' => count(get_option('active_plugins', array())),
                'active_theme' => get_template()
            ),
            'plugin' => array(
                'version' => defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : 'unknown',
                'options_count' => count(las_fresh_get_options()),
                'user_preferences_size' => strlen(serialize(get_user_meta(get_current_user_id(), 'las_ui_preferences', true))),
                'cache_enabled' => true // Always enabled in this version
            ),
            'recommendations' => array()
        );
        
        // Add performance recommendations
        $memory_usage_mb = memory_get_usage(true) / 1024 / 1024;
        if ($memory_usage_mb > 64) {
            $stats['recommendations'][] = array(
                'type' => 'warning',
                'message' => 'High memory usage detected. Consider optimizing other plugins.',
                'action' => 'memory_optimization'
            );
        }
        
        if (count(get_option('active_plugins', array())) > 30) {
            $stats['recommendations'][] = array(
                'type' => 'info',
                'message' => 'Many active plugins detected. This may affect performance.',
                'action' => 'plugin_audit'
            );
        }
        
        if (!WP_DEBUG && current_user_can('manage_options')) {
            $stats['recommendations'][] = array(
                'type' => 'success',
                'message' => 'Debug mode is disabled - good for performance.',
                'action' => 'none'
            );
        }

        wp_send_json_success(las_create_ajax_success_response(
            $stats,
            'Performance statistics retrieved successfully.'
        ));
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'performance_stats_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_get_performance_stats'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while retrieving performance statistics.',
            'unexpected_error'
        ));
    }
}
add_action('wp_ajax_las_get_performance_stats', 'las_ajax_get_performance_stats');

/**
 * Get client IP address with proxy support.
 * 
 * @return string Client IP address
 */
function las_get_client_ip() {
    $ip_keys = array(
        'HTTP_CF_CONNECTING_IP',     // Cloudflare
        'HTTP_CLIENT_IP',            // Proxy
        'HTTP_X_FORWARDED_FOR',      // Load balancer/proxy
        'HTTP_X_FORWARDED',          // Proxy
        'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster
        'HTTP_FORWARDED_FOR',        // Proxy
        'HTTP_FORWARDED',            // Proxy
        'REMOTE_ADDR'                // Standard
    );
    
    foreach ($ip_keys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            $ip = $_SERVER[$key];
            if (strpos($ip, ',') !== false) {
                $ip = explode(',', $ip)[0];
            }
            $ip = trim($ip);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
}

/**
 * Log security violations for monitoring and analysis.
 * 
 * @param string $violation_type Type of security violation
 * @param array $context Additional context information
 */
function las_log_security_violation($violation_type, $context = array()) {
    $violation_data = array(
        'type' => $violation_type,
        'timestamp' => current_time('mysql'),
        'user_id' => get_current_user_id(),
        'ip_address' => las_get_client_ip(),
        'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : 'unknown',
        'request_uri' => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : 'unknown',
        'referer' => isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'unknown',
        'context' => $context
    );
    
    // Log to WordPress error log
    error_log('LAS Security Violation: ' . wp_json_encode($violation_data));
    
    // Store in database for analysis (if debug mode is enabled)
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $security_log = get_option('las_security_violations', array());
        $security_log[] = $violation_data;
        
        // Keep only last 100 violations to prevent database bloat
        if (count($security_log) > 100) {
            $security_log = array_slice($security_log, -100);
        }
        
        update_option('las_security_violations', $security_log);
    }
    
    // Trigger action for external security monitoring
    do_action('las_security_violation', $violation_type, $violation_data);
}

/**
 * Sanitize and validate AJAX input data with type-specific validation.
 * 
 * @param mixed $value The value to sanitize
 * @param string $type The expected data type
 * @param mixed $default Default value if validation fails
 * @return mixed Sanitized value
 */
function las_sanitize_ajax_input($value, $type = 'text', $default = '') {
    if ($value === null || $value === '') {
        return $default;
    }
    
    switch ($type) {
        case 'email':
            $sanitized = sanitize_email($value);
            return is_email($sanitized) ? $sanitized : $default;
            
        case 'url':
            $sanitized = esc_url_raw($value);
            return filter_var($sanitized, FILTER_VALIDATE_URL) ? $sanitized : $default;
            
        case 'int':
        case 'integer':
            return is_numeric($value) ? intval($value) : $default;
            
        case 'float':
        case 'number':
            return is_numeric($value) ? floatval($value) : $default;
            
        case 'bool':
        case 'boolean':
            return in_array($value, array(true, 1, '1', 'true', 'yes', 'on'), true);
            
        case 'array':
            return is_array($value) ? array_map('sanitize_text_field', $value) : $default;
            
        case 'json':
            if (is_string($value)) {
                $decoded = json_decode($value, true);
                return (json_last_error() === JSON_ERROR_NONE) ? $decoded : $default;
            }
            return is_array($value) ? $value : $default;
            
        case 'key':
            return sanitize_key($value);
            
        case 'slug':
            return sanitize_title($value);
            
        case 'html':
            return wp_kses_post($value);
            
        case 'textarea':
            return sanitize_textarea_field($value);
            
        case 'color':
            $sanitized = sanitize_hex_color($value);
            return $sanitized ? $sanitized : $default;
            
        case 'css':
            // Basic CSS sanitization - remove dangerous functions
            $dangerous_functions = array('expression', 'javascript:', 'vbscript:', 'data:', 'import');
            $sanitized = str_ireplace($dangerous_functions, '', $value);
            return sanitize_textarea_field($sanitized);
            
        case 'text':
        default:
            return sanitize_text_field($value);
    }
}

/**
 * Create unified error response format for all AJAX handlers.
 * 
 * @param string $message Error message
 * @param string $code Error code
 * @param array $additional_data Additional error data
 * @return array Formatted error response
 */
function las_create_ajax_error_response($message, $code = 'generic_error', $additional_data = array()) {
    $error_response = array(
        'message' => sanitize_text_field($message),
        'code' => sanitize_key($code),
        'timestamp' => current_time('timestamp'),
        'request_id' => uniqid('las_', true)
    );
    
    // Add additional data if provided
    if (!empty($additional_data) && is_array($additional_data)) {
        $error_response = array_merge($error_response, $additional_data);
    }
    
    // Add debug information if WP_DEBUG is enabled
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $error_response['debug'] = array(
            'user_id' => get_current_user_id(),
            'ip_address' => las_get_client_ip(),
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 100) : 'unknown',
            'memory_usage' => size_format(memory_get_usage(true))
        );
    }
    
    return $error_response;
}

/**
 * Create unified success response format for all AJAX handlers.
 * 
 * @param mixed $data Success data
 * @param string $message Success message
 * @param array $additional_data Additional response data
 * @return array Formatted success response
 */
function las_create_ajax_success_response($data = null, $message = 'Operation completed successfully', $additional_data = array()) {
    $success_response = array(
        'message' => sanitize_text_field($message),
        'timestamp' => current_time('timestamp'),
        'request_id' => uniqid('las_', true)
    );
    
    // Add data if provided
    if ($data !== null) {
        $success_response['data'] = $data;
    }
    
    // Add additional data if provided
    if (!empty($additional_data) && is_array($additional_data)) {
        $success_response = array_merge($success_response, $additional_data);
    }
    
    return $success_response;
}

/**
 * Enhanced nonce validation function with detailed error reporting.
 */
function las_validate_nonce_with_details($nonce, $action = 'las_fresh_admin_nonce') {
    $validation_result = array(
        'valid' => false,
        'error_code' => null,
        'error_message' => null,
        'should_refresh' => false
    );
    
    if (empty($nonce)) {
        $validation_result['error_code'] = 'missing_nonce';
        $validation_result['error_message'] = 'Security token is missing';
        $validation_result['should_refresh'] = true;
        return $validation_result;
    }
    
    $nonce_result = wp_verify_nonce($nonce, $action);
    
    if ($nonce_result === false) {
        $validation_result['error_code'] = 'invalid_nonce';
        $validation_result['error_message'] = 'Invalid security token';
        $validation_result['should_refresh'] = true;
        return $validation_result;
    }
    
    if ($nonce_result === 1) {
        // Nonce is valid and within the first half of its lifetime
        $validation_result['valid'] = true;
        return $validation_result;
    }
    
    if ($nonce_result === 2) {
        // Nonce is valid but in the second half of its lifetime
        $validation_result['valid'] = true;
        $validation_result['should_refresh'] = true; // Suggest refresh for next request
        return $validation_result;
    }
    
    // Fallback for unexpected result
    $validation_result['error_code'] = 'unexpected_result';
    $validation_result['error_message'] = 'Unexpected nonce validation result';
    $validation_result['should_refresh'] = true;
    return $validation_result;
}

/**
 * Enhanced AJAX nonce validation wrapper for all handlers.
 * Provides consistent security validation across all AJAX endpoints.
 * 
 * @param bool $require_manage_options Whether to require manage_options capability
 * @param string $nonce_action Custom nonce action (defaults to unified action)
 * @return array Validation result with nonce status information
 */
function las_validate_ajax_request($require_manage_options = true, $nonce_action = 'las_fresh_admin_nonce') {
    // Validate request type
    if (!wp_doing_ajax()) {
        wp_send_json_error(array(
            'message' => 'Invalid request type for this endpoint.',
            'code' => 'invalid_request_type',
            'timestamp' => current_time('timestamp')
        ));
    }
    
    // Get and validate nonce with comprehensive sanitization
    $nonce = '';
    if (isset($_POST['nonce'])) {
        $nonce = sanitize_text_field(wp_unslash($_POST['nonce']));
    } elseif (isset($_GET['nonce'])) {
        $nonce = sanitize_text_field(wp_unslash($_GET['nonce']));
    }
    
    $nonce_validation = las_validate_nonce_with_details($nonce, $nonce_action);
    
    if (!$nonce_validation['valid']) {
        // Log security violation for monitoring
        las_log_security_violation('invalid_nonce', array(
            'nonce_provided' => !empty($nonce),
            'nonce_action' => $nonce_action,
            'error_code' => $nonce_validation['error_code'],
            'user_id' => get_current_user_id(),
            'ip_address' => las_get_client_ip(),
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : 'unknown',
            'referer' => isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'unknown'
        ));
        
        wp_send_json_error(array(
            'message' => $nonce_validation['error_message'],
            'code' => $nonce_validation['error_code'],
            'refresh_nonce' => $nonce_validation['should_refresh'],
            'timestamp' => current_time('timestamp'),
            'retry_after' => 1 // Suggest retry after 1 second
        ));
    }
    
    // Check user capabilities if required
    if ($require_manage_options && !current_user_can('manage_options')) {
        // Log capability violation
        las_log_security_violation('insufficient_permissions', array(
            'required_capability' => 'manage_options',
            'user_id' => get_current_user_id(),
            'user_roles' => wp_get_current_user()->roles,
            'ip_address' => las_get_client_ip()
        ));
        
        wp_send_json_error(array(
            'message' => 'You do not have sufficient permissions to perform this action.',
            'code' => 'insufficient_permissions',
            'required_capability' => 'manage_options',
            'timestamp' => current_time('timestamp')
        ));
    }
    
    // Log successful validation for security monitoring
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log(sprintf(
            'LAS Security: Successful AJAX validation - User: %d, Action: %s, IP: %s',
            get_current_user_id(),
            $nonce_action,
            las_get_client_ip()
        ));
    }
    
    // Return validation result for additional processing
    return $nonce_validation;
}

/**
 * AJAX handler for refreshing security nonce.
 */
function las_ajax_refresh_nonce() {
    try {
        // Use more lenient validation for nonce refresh since the nonce might be expired
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

        // Generate new unified nonce
        $new_nonce = wp_create_nonce('las_fresh_admin_nonce');
        
        if (empty($new_nonce)) {
            wp_send_json_error(las_create_ajax_error_response(
                'Failed to generate new security token.',
                'nonce_generation_failed'
            ));
        }
        
        // Log nonce refresh for security monitoring
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                'LAS Security: Nonce refreshed for user %d at %s (IP: %s, User-Agent: %s)',
                get_current_user_id(),
                current_time('mysql'),
                las_get_client_ip(),
                isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 100) : 'unknown'
            ));
        }

        // Track nonce refresh statistics
        $user_id = get_current_user_id();
        $refresh_count = get_user_meta($user_id, 'las_nonce_refresh_count', true);
        $refresh_count = is_numeric($refresh_count) ? intval($refresh_count) + 1 : 1;
        update_user_meta($user_id, 'las_nonce_refresh_count', $refresh_count);
        update_user_meta($user_id, 'las_last_nonce_refresh', current_time('timestamp'));

        // Send response maintaining backward compatibility for nonce refresh
        // The frontend expects response.data.nonce directly
        wp_send_json_success(array(
            'nonce' => $new_nonce,
            'refresh_count' => $refresh_count,
            'expires_in' => 12 * HOUR_IN_SECONDS, // 12 hours
            'message' => 'Security token refreshed successfully',
            'timestamp' => current_time('timestamp')
        ));
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'nonce_refresh_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_refresh_nonce'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while refreshing security token.',
            'refresh_failed'
        ));
    }
}
add_action('wp_ajax_las_refresh_nonce', 'las_ajax_refresh_nonce');

/**
 * AJAX handler for getting system status and error statistics.
 */
function las_ajax_get_system_status() {
    try {
        // Use enhanced validation system
        las_validate_ajax_request(true);
        $user_id = get_current_user_id();
        $today = date('Y-m-d');
        
        // Get error statistics
        $error_count_today = get_user_meta($user_id, 'las_error_count_' . $today, true);
        $error_count_today = is_numeric($error_count_today) ? intval($error_count_today) : 0;
        
        // Get system information
        $system_status = array(
            'server' => array(
                'php_version' => PHP_VERSION,
                'wordpress_version' => get_bloginfo('version'),
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'current_memory_usage' => memory_get_usage(true),
                'current_memory_usage_formatted' => size_format(memory_get_usage(true)),
                'peak_memory_usage' => memory_get_peak_usage(true),
                'peak_memory_usage_formatted' => size_format(memory_get_peak_usage(true)),
                'server_software' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'unknown'
            ),
            'wordpress' => array(
                'multisite' => is_multisite(),
                'debug_mode' => defined('WP_DEBUG') && WP_DEBUG,
                'active_plugins_count' => count(get_option('active_plugins', array())),
                'active_theme' => get_template(),
                'locale' => get_locale(),
                'timezone' => get_option('timezone_string', 'UTC')
            ),
            'plugin' => array(
                'version' => defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : 'unknown',
                'options_count' => count(las_fresh_get_options()),
                'error_count_today' => $error_count_today,
                'last_error_time' => get_user_meta($user_id, 'las_last_error_time', true),
                'nonce_refresh_count' => get_user_meta($user_id, 'las_nonce_refresh_count', true),
                'last_nonce_refresh' => get_user_meta($user_id, 'las_last_nonce_refresh', true)
            ),
            'browser' => array(
                'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown',
                'accept_language' => isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) ? $_SERVER['HTTP_ACCEPT_LANGUAGE'] : 'unknown',
                'remote_addr' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown'
            ),
            'performance' => array(
                'timestamp' => current_time('timestamp'),
                'mysql_version' => $GLOBALS['wpdb']->db_version(),
                'object_cache' => wp_using_ext_object_cache() ? 'external' : 'internal',
                'opcache_enabled' => function_exists('opcache_get_status') && opcache_get_status() !== false
            )
        );
        
        // Add health recommendations
        $recommendations = array();
        
        // Memory usage check
        $memory_usage_mb = memory_get_usage(true) / 1024 / 1024;
        if ($memory_usage_mb > 128) {
            $recommendations[] = array(
                'type' => 'warning',
                'category' => 'memory',
                'message' => 'High memory usage detected (' . round($memory_usage_mb, 1) . 'MB)',
                'suggestion' => 'Consider deactivating unused plugins or increasing PHP memory limit'
            );
        }
        
        // Error frequency check
        if ($error_count_today > 5) {
            $recommendations[] = array(
                'type' => 'error',
                'category' => 'errors',
                'message' => 'Multiple errors reported today (' . $error_count_today . ')',
                'suggestion' => 'Check browser console for JavaScript errors and consider reporting issues'
            );
        }
        
        // PHP version check
        if (version_compare(PHP_VERSION, '8.0', '<')) {
            $recommendations[] = array(
                'type' => 'warning',
                'category' => 'php',
                'message' => 'PHP version ' . PHP_VERSION . ' is outdated',
                'suggestion' => 'Consider upgrading to PHP 8.0+ for better performance and security'
            );
        }
        
        // WordPress version check
        if (version_compare(get_bloginfo('version'), '6.0', '<')) {
            $recommendations[] = array(
                'type' => 'warning',
                'category' => 'wordpress',
                'message' => 'WordPress version ' . get_bloginfo('version') . ' may not be fully supported',
                'suggestion' => 'Consider updating to WordPress 6.0+ for optimal compatibility'
            );
        }
        
        $system_status['recommendations'] = $recommendations;
        $system_status['health_score'] = las_calculate_health_score($system_status, $recommendations);

        wp_send_json_success(las_create_ajax_success_response(
            $system_status,
            'System status retrieved successfully.'
        ));
        
    } catch (Exception $e) {
        las_log_error_with_context(array(
            'message' => $e->getMessage(),
            'type' => 'system_status_error',
            'source' => $e->getFile(),
            'line' => $e->getLine()
        ), array(
            'ajax_action' => 'las_get_system_status'
        ));
        
        wp_send_json_error(las_create_ajax_error_response(
            'An error occurred while retrieving system status.',
            'system_status_error'
        ));
    }
}

/**
 * Calculate system health score based on various factors.
 */
function las_calculate_health_score($system_status, $recommendations) {
    $score = 100;
    
    foreach ($recommendations as $recommendation) {
        switch ($recommendation['type']) {
            case 'error':
                $score -= 20;
                break;
            case 'warning':
                $score -= 10;
                break;
            case 'info':
                $score -= 5;
                break;
        }
    }
    
    // Additional scoring factors
    $memory_usage_mb = $system_status['server']['current_memory_usage'] / 1024 / 1024;
    if ($memory_usage_mb > 256) {
        $score -= 15;
    } elseif ($memory_usage_mb > 128) {
        $score -= 10;
    }
    
    // Plugin count factor
    if ($system_status['wordpress']['active_plugins_count'] > 50) {
        $score -= 10;
    } elseif ($system_status['wordpress']['active_plugins_count'] > 30) {
        $score -= 5;
    }
    
    return max(0, min(100, $score));
}

add_action('wp_ajax_las_get_system_status', 'las_ajax_get_system_status');
/**

 * Simple ping endpoint for connection testing
 */
function las_ajax_ping() {
    wp_send_json_success(array(
        'message' => 'Connection OK',
        'timestamp' => time(),
        'server_time' => current_time('mysql')
    ));
}
add_action('wp_ajax_las_ping', 'las_ajax_ping');

/**
 * Check login status endpoint
 */
function las_ajax_check_login_status() {
    try {
        // Basic validation
        if (!wp_verify_nonce($_POST['nonce'], 'las_fresh_nonce')) {
            wp_send_json_error(array(
                'message' => 'Security check failed',
                'code' => 'invalid_nonce'
            ));
        }
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => 'Insufficient permissions',
                'code' => 'insufficient_permissions'
            ));
        }
        
        wp_send_json_success(array(
            'message' => 'Login status valid',
            'user_id' => get_current_user_id(),
            'timestamp' => time()
        ));
        
    } catch (Exception $e) {
        wp_send_json_error(array(
            'message' => 'Error checking login status',
            'code' => 'check_failed',
            'details' => $e->getMessage()
        ));
    }
}
add_action('wp_ajax_las_check_login_status', 'las_ajax_check_login_status');