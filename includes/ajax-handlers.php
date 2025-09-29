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

        // Enhanced security validation with security manager
        global $las_security_manager;
        $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
        
        if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_admin_nonce')) {
            wp_send_json_error(array(
                'message' => 'Invalid security token. Please refresh the page.',
                'code' => 'invalid_nonce',
                'refresh_nonce' => true
            ));
        }

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => 'You do not have sufficient permissions to perform this action.',
                'code' => 'insufficient_permissions'
            ));
        }

        // Get base options for preview
        $options_for_preview = las_fresh_get_options();
        $defaults = las_fresh_get_default_options();

        // Handle single setting update
        if (isset($_POST['setting']) && isset($_POST['value'])) {
            $setting_key = sanitize_key($_POST['setting']);
            
            // Validate setting key exists in defaults
            if (!array_key_exists($setting_key, $defaults)) {
                wp_send_json_error(array(
                    'message' => 'Invalid setting key provided.',
                    'code' => 'invalid_setting',
                    'setting' => $setting_key
                ));
            }
            
            $raw_value = wp_unslash($_POST['value']);
            
            // Use enhanced sanitization with security logging
            $setting_type = get_setting_type($setting_key);
            $sanitized_value = $las_security_manager->sanitize_input(
                $raw_value, 
                $setting_type, 
                array('default' => $defaults[$setting_key])
            );

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
                wp_send_json_error(array(
                    'message' => 'Invalid settings batch data format.',
                    'code' => 'invalid_batch_format'
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
            wp_send_json_error(array(
                'message' => 'Failed to generate CSS output.',
                'code' => 'css_generation_failed'
            ));
        }

        // Calculate performance metrics
        $execution_time = round((microtime(true) - $start_time) * 1000, 2);
        $memory_usage = memory_get_usage(true);
        $peak_memory = memory_get_peak_usage(true);
        
        // Log performance metrics for optimization
        if ($execution_time > 500) { // Log slow operations
            error_log(sprintf(
                'LAS Performance Warning: Slow CSS generation - %dms, Memory: %s, Peak: %s, Setting: %s',
                $execution_time,
                size_format($memory_usage),
                size_format($peak_memory),
                isset($_POST['setting']) ? sanitize_key($_POST['setting']) : 'batch'
            ));
        }
        
        // Send successful response with enhanced performance data
        wp_send_json_success(array(
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
        ));
        
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
        
        // User-friendly error response
        $error_response = array(
            'message' => 'Wystąpił nieoczekiwany błąd podczas generowania podglądu. Spróbuj ponownie.',
            'code' => 'unexpected_error',
            'timestamp' => time(),
            'retry_suggested' => true
        );
        
        // Add debug info for developers
        if (WP_DEBUG) {
            $error_response['debug'] = array(
                'exception_message' => $e->getMessage(),
                'exception_file' => basename($e->getFile()),
                'exception_line' => $e->getLine()
            );
        }
        
        wp_send_json_error($error_response);
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
    if (!wp_doing_ajax()) {
        status_header(400);
        echo 'Invalid request type for this endpoint.';
        exit;
    }

    global $las_security_manager;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_fresh_admin_nonce')) {
        wp_send_json_error(array(
            'message' => 'Invalid security token. Please refresh the page.',
            'code' => 'invalid_nonce',
            'refresh_nonce' => true
        ));
    }

    if (!current_user_can('manage_options')) {
        wp_send_json_error('You do not have sufficient permissions to perform this action.');
    }

    if (!isset($_POST['tab'])) {
        wp_send_json_error('Tab parameter is required.');
    }

    $tab = sanitize_key($_POST['tab']);
    $success = las_fresh_save_active_tab($tab);

    if ($success) {
        wp_send_json_success(array(
            'message' => 'Tab state saved successfully.',
            'active_tab' => $tab
        ));
    } else {
        wp_send_json_error('Failed to save tab state or invalid tab.');
    }
}
add_action('wp_ajax_las_save_tab_state', 'las_ajax_save_tab_state');

/**
 * AJAX handler for client-side error reporting.
 */
function las_ajax_report_error() {
    if (!wp_doing_ajax()) {
        status_header(400);
        echo 'Invalid request type for this endpoint.';
        exit;
    }

    global $las_security_manager;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_fresh_admin_nonce')) {
        wp_send_json_error(array(
            'message' => 'Invalid security token. Please refresh the page.',
            'code' => 'invalid_nonce',
            'refresh_nonce' => true
        ));
    }

    if (!current_user_can('manage_options')) {
        wp_send_json_error('You do not have sufficient permissions to perform this action.');
    }

    $error_data = array(
        'message' => isset($_POST['message']) ? sanitize_text_field($_POST['message']) : 'Unknown error',
        'type' => isset($_POST['type']) ? sanitize_key($_POST['type']) : 'javascript',
        'source' => isset($_POST['source']) ? sanitize_text_field($_POST['source']) : 'unknown',
        'line' => isset($_POST['line']) ? absint($_POST['line']) : 0,
        'stack' => isset($_POST['stack']) ? sanitize_textarea_field($_POST['stack']) : '',
        'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : 'unknown',
        'url' => isset($_POST['url']) ? esc_url_raw($_POST['url']) : '',
        'timestamp' => current_time('mysql'),
        'user_id' => get_current_user_id()
    );

    // Log the client-side error
    error_log('LAS Client Error: ' . wp_json_encode($error_data));

    wp_send_json_success(array(
        'message' => 'Error reported successfully',
        'logged' => true
    ));
}
add_action('wp_ajax_las_report_error', 'las_ajax_report_error');

/**
 * AJAX handler for saving user preferences.
 */
function las_ajax_save_user_preferences() {
    if (!wp_doing_ajax()) {
        status_header(400);
        echo 'Invalid request type for this endpoint.';
        exit;
    }

    global $las_security_manager;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_fresh_admin_nonce')) {
        wp_send_json_error(array(
            'message' => 'Invalid security token. Please refresh the page.',
            'code' => 'invalid_nonce',
            'refresh_nonce' => true
        ));
    }

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array(
            'message' => 'You do not have sufficient permissions to perform this action.',
            'code' => 'insufficient_permissions'
        ));
    }

    if (!isset($_POST['preferences'])) {
        wp_send_json_error(array(
            'message' => 'Preferences parameter is required.',
            'code' => 'missing_preferences'
        ));
    }

    try {
        $raw_preferences = json_decode(stripslashes($_POST['preferences']), true);
        
        if (!is_array($raw_preferences)) {
            wp_send_json_error(array(
                'message' => 'Invalid preferences format.',
                'code' => 'invalid_format'
            ));
        }

        $user_state = new LAS_User_State();
        $success = $user_state->set_ui_preferences($raw_preferences);

        if ($success) {
            wp_send_json_success(array(
                'message' => 'User preferences saved successfully.',
                'preferences' => $user_state->get_ui_preferences()
            ));
        } else {
            wp_send_json_error(array(
                'message' => 'Failed to save user preferences.',
                'code' => 'save_failed'
            ));
        }
        
    } catch (Exception $e) {
        error_log('LAS User Preferences Error: ' . $e->getMessage());
        
        wp_send_json_error(array(
            'message' => 'An error occurred while saving preferences.',
            'code' => 'unexpected_error',
            'debug' => WP_DEBUG ? $e->getMessage() : null
        ));
    }
}
add_action('wp_ajax_las_save_user_preferences', 'las_ajax_save_user_preferences');

/**
 * AJAX handler for getting user preferences.
 */
function las_ajax_get_user_preferences() {
    if (!wp_doing_ajax()) {
        status_header(400);
        echo 'Invalid request type for this endpoint.';
        exit;
    }

    global $las_security_manager;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_fresh_admin_nonce')) {
        wp_send_json_error(array(
            'message' => 'Invalid security token. Please refresh the page.',
            'code' => 'invalid_nonce',
            'refresh_nonce' => true
        ));
    }

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array(
            'message' => 'You do not have sufficient permissions to perform this action.',
            'code' => 'insufficient_permissions'
        ));
    }

    try {
        $user_state = new LAS_User_State();
        $session_data = $user_state->get_session_data();

        wp_send_json_success(array(
            'message' => 'User preferences retrieved successfully.',
            'session_data' => $session_data,
            'preferences' => $session_data['ui_preferences'],
            'active_tab' => $session_data['active_tab']
        ));
        
    } catch (Exception $e) {
        error_log('LAS Get User Preferences Error: ' . $e->getMessage());
        
        wp_send_json_error(array(
            'message' => 'An error occurred while retrieving preferences.',
            'code' => 'unexpected_error',
            'debug' => WP_DEBUG ? $e->getMessage() : null
        ));
    }
}
add_action('wp_ajax_las_get_user_preferences', 'las_ajax_get_user_preferences');

/**
 * AJAX handler for synchronizing user state between sessions.
 */
function las_ajax_sync_user_state() {
    if (!wp_doing_ajax()) {
        status_header(400);
        echo 'Invalid request type for this endpoint.';
        exit;
    }

    global $las_security_manager;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_fresh_admin_nonce')) {
        wp_send_json_error(array(
            'message' => 'Invalid security token. Please refresh the page.',
            'code' => 'invalid_nonce',
            'refresh_nonce' => true
        ));
    }

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array(
            'message' => 'You do not have sufficient permissions to perform this action.',
            'code' => 'insufficient_permissions'
        ));
    }

    if (!isset($_POST['session_data'])) {
        wp_send_json_error(array(
            'message' => 'Session data parameter is required.',
            'code' => 'missing_session_data'
        ));
    }

    try {
        $raw_session_data = json_decode(stripslashes($_POST['session_data']), true);
        
        if (!is_array($raw_session_data)) {
            wp_send_json_error(array(
                'message' => 'Invalid session data format.',
                'code' => 'invalid_format'
            ));
        }

        $user_state = new LAS_User_State();
        $success = $user_state->sync_from_session($raw_session_data);

        if ($success) {
            wp_send_json_success(array(
                'message' => 'User state synchronized successfully.',
                'session_data' => $user_state->get_session_data()
            ));
        } else {
            wp_send_json_error(array(
                'message' => 'Failed to synchronize user state.',
                'code' => 'sync_failed'
            ));
        }
        
    } catch (Exception $e) {
        error_log('LAS User State Sync Error: ' . $e->getMessage());
        
        wp_send_json_error(array(
            'message' => 'An error occurred while synchronizing state.',
            'code' => 'unexpected_error',
            'debug' => WP_DEBUG ? $e->getMessage() : null
        ));
    }
}
add_action('wp_ajax_las_sync_user_state', 'las_ajax_sync_user_state');

/**
 * AJAX handler for resetting user state to defaults.
 */
function las_ajax_reset_user_state() {
    if (!wp_doing_ajax()) {
        status_header(400);
        echo 'Invalid request type for this endpoint.';
        exit;
    }

    global $las_security_manager;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_fresh_admin_nonce')) {
        wp_send_json_error(array(
            'message' => 'Invalid security token. Please refresh the page.',
            'code' => 'invalid_nonce',
            'refresh_nonce' => true
        ));
    }

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array(
            'message' => 'You do not have sufficient permissions to perform this action.',
            'code' => 'insufficient_permissions'
        ));
    }

    try {
        $user_state = new LAS_User_State();
        $success = $user_state->reset_to_defaults();

        if ($success) {
            wp_send_json_success(array(
                'message' => 'User state reset to defaults successfully.',
                'session_data' => $user_state->get_session_data()
            ));
        } else {
            wp_send_json_error(array(
                'message' => 'Failed to reset user state.',
                'code' => 'reset_failed'
            ));
        }
        
    } catch (Exception $e) {
        error_log('LAS Reset User State Error: ' . $e->getMessage());
        
        wp_send_json_error(array(
            'message' => 'An error occurred while resetting state.',
            'code' => 'unexpected_error',
            'debug' => WP_DEBUG ? $e->getMessage() : null
        ));
    }
}
add_action('wp_ajax_las_reset_user_state', 'las_ajax_reset_user_state');

/**
 * AJAX handler for getting performance statistics.
 */
function las_ajax_get_performance_stats() {
    if (!wp_doing_ajax()) {
        status_header(400);
        echo 'Invalid request type for this endpoint.';
        exit;
    }

    global $las_security_manager;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    if (!$las_security_manager->verify_enhanced_nonce($nonce, 'las_fresh_admin_nonce')) {
        wp_send_json_error(array(
            'message' => 'Invalid security token. Please refresh the page.',
            'code' => 'invalid_nonce',
            'refresh_nonce' => true
        ));
    }

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array(
            'message' => 'You do not have sufficient permissions to perform this action.',
            'code' => 'insufficient_permissions'
        ));
    }

    try {
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

        wp_send_json_success($stats);
        
    } catch (Exception $e) {
        error_log('LAS Performance Stats Error: ' . $e->getMessage());
        
        wp_send_json_error(array(
            'message' => 'An error occurred while retrieving performance statistics.',
            'code' => 'unexpected_error',
            'debug' => WP_DEBUG ? $e->getMessage() : null
        ));
    }
}
add_action('wp_ajax_las_get_performance_stats', 'las_ajax_get_performance_stats');