<?php
/**
 * Live Admin Styler - Enhanced AJAX Handlers
 * 
 * Enterprise-grade AJAX communication system with comprehensive error handling,
 * performance monitoring, standardized response formatting, and security validation.
 * 
 * @package LiveAdminStyler
 * @version 1.2.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enhanced AJAX Handlers class for Live Admin Styler
 * 
 * Provides bulletproof server-side handling of AJAX requests with:
 * - Comprehensive validation and sanitization
 * - Standardized response formatting
 * - Performance monitoring and execution tracking
 * - Advanced error handling and logging
 * - Rate limiting and security protection
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
     * Performance metrics storage
     * @var array
     */
    private $performance_metrics = [];
    
    /**
     * Request start time for performance tracking
     * @var float
     */
    private $request_start_time;
    
    /**
     * Request metadata for logging and debugging
     * @var array
     */
    private $request_metadata = [];
    
    /**
     * Constructor - Initialize handlers and dependencies
     */
    public function __construct() {
        // Check if required classes exist
        if (!class_exists('LAS_Security_Validator')) {
            error_log('[LAS Ajax Handlers] LAS_Security_Validator class not found');
            return;
        }
        
        if (!class_exists('LAS_Settings_Storage')) {
            error_log('[LAS Ajax Handlers] LAS_Settings_Storage class not found');
            return;
        }
        
        $this->security = new LAS_Security_Validator();
        $this->storage = new LAS_Settings_Storage();
        
        // Initialize performance tracking
        $this->request_start_time = microtime(true);
        $this->init_request_metadata();
        
        $this->register_handlers();
        
        error_log('[LAS Ajax Handlers] Successfully initialized');
    }
    
    /**
     * Initialize request metadata for performance tracking and debugging
     */
    private function init_request_metadata() {
        $this->request_metadata = [
            'timestamp' => current_time('timestamp'),
            'user_id' => get_current_user_id(),
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? 'unknown'),
            'ip_address' => $this->get_client_ip(),
            'wp_version' => get_bloginfo('version'),
            'plugin_version' => defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : 'unknown',
            'memory_start' => memory_get_usage(true),
            'memory_peak_start' => memory_get_peak_usage(true)
        ];
    }
    
    /**
     * Register all AJAX handlers with proper WordPress hooks
     */
    private function register_handlers() {
        // Core settings handlers
        add_action('wp_ajax_las_save_settings', [$this, 'handle_save_settings']);
        add_action('wp_ajax_las_load_settings', [$this, 'handle_load_settings']);
        add_action('wp_ajax_las_reset_settings', [$this, 'handle_reset_settings']);
        
        // Preview and CSS generation handlers
        add_action('wp_ajax_las_get_preview_css', [$this, 'handle_get_preview_css']);
        add_action('wp_ajax_las_generate_css', [$this, 'handle_generate_css']);
        
        // Security and error handling handlers
        add_action('wp_ajax_las_refresh_nonce', [$this, 'handle_refresh_nonce']);
        add_action('wp_ajax_las_error_report', [$this, 'handle_error_report']);
        add_action('wp_ajax_las_report_errors', [$this, 'handle_error_reporting']);
        add_action('wp_ajax_las_get_error_statistics', [$this, 'get_error_statistics']);
        
        // Batch operation handlers
        add_action('wp_ajax_las_batch_save_settings', [$this, 'handle_batch_save_settings']);
        add_action('wp_ajax_las_batch_operations', [$this, 'handle_batch_operations']);
        
        // Error and debugging handlers
        add_action('wp_ajax_las_log_error', [$this, 'handle_log_error']);
        add_action('wp_ajax_las_get_debug_info', [$this, 'handle_get_debug_info']);
        
        // Performance monitoring handlers
        add_action('wp_ajax_las_get_performance_metrics', [$this, 'handle_get_performance_metrics']);
        add_action('wp_ajax_las_clear_performance_logs', [$this, 'handle_clear_performance_logs']);
        
        // Security and validation handlers
        add_action('wp_ajax_las_validate_settings', [$this, 'handle_validate_settings']);
        
        // System status handlers
        add_action('wp_ajax_las_get_system_status', [$this, 'handle_get_system_status']);
        add_action('wp_ajax_las_health_check', [$this, 'handle_health_check']);
    }
    
    /**
     * Get client IP address with proxy support
     * 
     * @return string Client IP address
     */
    private function get_client_ip() {
        $ip_keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = sanitize_text_field($_SERVER[$key]);
                // Handle comma-separated IPs (from proxies)
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }
    
    /**
     * Send standardized success response
     * 
     * @param mixed $data Response data
     * @param array $meta Additional metadata
     * @param string $message Success message
     */
    private function send_success_response($data = null, $meta = [], $message = 'Operation completed successfully') {
        $execution_time = round((microtime(true) - $this->request_start_time) * 1000, 2);
        $memory_usage = memory_get_usage(true);
        $memory_peak = memory_get_peak_usage(true);
        
        $response = [
            'success' => true,
            'data' => $data,
            'message' => $message,
            'meta' => array_merge([
                'timestamp' => current_time('timestamp'),
                'execution_time_ms' => $execution_time,
                'memory_usage' => $memory_usage,
                'memory_usage_formatted' => size_format($memory_usage),
                'memory_peak' => $memory_peak,
                'memory_peak_formatted' => size_format($memory_peak),
                'request_id' => $this->generate_request_id(),
                'version' => $this->request_metadata['plugin_version']
            ], $meta)
        ];
        
        // Log performance metrics
        $this->log_performance_metrics('success', $execution_time, $memory_usage, $memory_peak);
        
        wp_send_json($response);
    }
    
    /**
     * Send standardized error response
     * 
     * @param string $message Error message
     * @param string $code Error code
     * @param array $errors Detailed error information
     * @param array $meta Additional metadata
     * @param int $http_code HTTP status code
     */
    private function send_error_response($message, $code = 'unknown_error', $errors = [], $meta = [], $http_code = 400) {
        $execution_time = round((microtime(true) - $this->request_start_time) * 1000, 2);
        $memory_usage = memory_get_usage(true);
        $memory_peak = memory_get_peak_usage(true);
        
        $response = [
            'success' => false,
            'message' => $message,
            'error_code' => $code,
            'errors' => $errors,
            'meta' => array_merge([
                'timestamp' => current_time('timestamp'),
                'execution_time_ms' => $execution_time,
                'memory_usage' => $memory_usage,
                'memory_usage_formatted' => size_format($memory_usage),
                'memory_peak' => $memory_peak,
                'memory_peak_formatted' => size_format($memory_peak),
                'request_id' => $this->generate_request_id(),
                'version' => $this->request_metadata['plugin_version'],
                'retry_suggested' => in_array($code, ['network_error', 'server_error', 'timeout_error'])
            ], $meta)
        ];
        
        // Log performance metrics for errors
        $this->log_performance_metrics('error', $execution_time, $memory_usage, $memory_peak, $code);
        
        wp_send_json($response, $http_code);
    }
    
    /**
     * Generate unique request ID for tracking
     * 
     * @return string Unique request identifier
     */
    private function generate_request_id() {
        return sprintf(
            'las_%s_%s_%s',
            date('Ymd_His'),
            substr(md5(uniqid()), 0, 8),
            $this->request_metadata['user_id']
        );
    }
    
    /**
     * Log performance metrics for monitoring and optimization
     * 
     * @param string $status Request status (success/error)
     * @param float $execution_time Execution time in milliseconds
     * @param int $memory_usage Memory usage in bytes
     * @param int $memory_peak Peak memory usage in bytes
     * @param string $error_code Error code if applicable
     */
    private function log_performance_metrics($status, $execution_time, $memory_usage, $memory_peak, $error_code = null) {
        $action = sanitize_text_field($_POST['action'] ?? 'unknown');
        
        $metrics = [
            'action' => $action,
            'status' => $status,
            'execution_time_ms' => $execution_time,
            'memory_usage' => $memory_usage,
            'memory_peak' => $memory_peak,
            'memory_delta' => $memory_peak - $this->request_metadata['memory_start'],
            'timestamp' => current_time('mysql'),
            'user_id' => $this->request_metadata['user_id'],
            'ip_address' => $this->request_metadata['ip_address'],
            'user_agent' => $this->request_metadata['user_agent'],
            'error_code' => $error_code
        ];
        
        // Store metrics for batch logging
        $this->performance_metrics[] = $metrics;
        
        // Log slow operations immediately
        if ($execution_time > 1000) { // > 1 second
            error_log(sprintf(
                '[LAS Performance Warning] Slow operation: %s took %dms, used %s memory',
                $action,
                $execution_time,
                size_format($memory_usage)
            ));
        }
        
        // Log high memory usage
        if ($memory_usage > 50 * 1024 * 1024) { // > 50MB
            error_log(sprintf(
                '[LAS Performance Warning] High memory usage: %s used %s memory',
                $action,
                size_format($memory_usage)
            ));
        }
        
        // Store metrics in database for analysis (optional)
        if (defined('LAS_STORE_PERFORMANCE_METRICS') && LAS_STORE_PERFORMANCE_METRICS) {
            $this->store_performance_metrics($metrics);
        }
    }
    
    /**
     * Store performance metrics in database for analysis
     * 
     * @param array $metrics Performance metrics data
     */
    private function store_performance_metrics($metrics) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_performance_metrics';
        
        // Create table if it doesn't exist
        $this->maybe_create_performance_table();
        
        $wpdb->insert(
            $table_name,
            [
                'action' => $metrics['action'],
                'status' => $metrics['status'],
                'execution_time_ms' => $metrics['execution_time_ms'],
                'memory_usage' => $metrics['memory_usage'],
                'memory_peak' => $metrics['memory_peak'],
                'memory_delta' => $metrics['memory_delta'],
                'user_id' => $metrics['user_id'],
                'ip_address' => $metrics['ip_address'],
                'error_code' => $metrics['error_code'],
                'created_at' => $metrics['timestamp']
            ],
            ['%s', '%s', '%f', '%d', '%d', '%d', '%d', '%s', '%s', '%s']
        );
    }
    
    /**
     * Create performance metrics table if needed
     */
    private function maybe_create_performance_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_performance_metrics';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            action varchar(100) NOT NULL,
            status varchar(20) NOT NULL,
            execution_time_ms decimal(10,2) NOT NULL,
            memory_usage bigint(20) unsigned NOT NULL,
            memory_peak bigint(20) unsigned NOT NULL,
            memory_delta bigint(20) NOT NULL,
            user_id bigint(20) unsigned NOT NULL,
            ip_address varchar(45) NOT NULL,
            error_code varchar(50) DEFAULT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY action_status (action, status),
            KEY created_at (created_at),
            KEY user_id (user_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Validate request security and permissions
     * 
     * @param string $required_capability Required user capability
     * @param bool $check_nonce Whether to check nonce
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    private function validate_request_security($required_capability = 'manage_options', $check_nonce = true) {
        // Check nonce if required
        if ($check_nonce) {
            $nonce = sanitize_text_field($_POST['nonce'] ?? '');
            $nonce_result = $this->security->verify_nonce($nonce, 'las_ajax_nonce');
            if (!$nonce_result['valid']) {
                return new WP_Error('invalid_nonce', 'Security check failed: ' . ($nonce_result['message'] ?? 'Invalid nonce'), ['status' => 403]);
            }
        }
        
        // Check user capabilities
        if (!current_user_can($required_capability)) {
            return new WP_Error('insufficient_permissions', 'Insufficient permissions', ['status' => 403]);
        }
        
        // Check rate limiting if security class supports it
        if (method_exists($this->security, 'check_rate_limit')) {
            $rate_limit_check = $this->security->check_rate_limit(get_current_user_id(), $_POST['action'] ?? '');
            if (is_wp_error($rate_limit_check)) {
                return $rate_limit_check;
            }
        }
        
        return true;
    }
    
    /**
     * Handle settings save requests
     * 
     * Processes incoming settings data with full validation and sanitization
     */
    public function handle_save_settings() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            // Get and validate settings data
            $settings_json = stripslashes($_POST['settings'] ?? '');
            $settings = json_decode($settings_json, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->send_error_response(
                    'Invalid JSON data provided',
                    'invalid_json',
                    [
                        [
                            'code' => 'json_decode_error',
                            'message' => json_last_error_msg(),
                            'field' => 'settings',
                            'severity' => 'error'
                        ]
                    ]
                );
                return;
            }
            
            if (!is_array($settings) || empty($settings)) {
                $this->send_error_response(
                    'Settings data must be a non-empty array',
                    'invalid_settings_format',
                    [
                        [
                            'code' => 'empty_settings',
                            'message' => 'No settings data provided',
                            'field' => 'settings',
                            'severity' => 'error'
                        ]
                    ]
                );
                return;
            }
            
            // Sanitize all settings
            $sanitized_settings = $this->security->sanitize_settings($settings);
            
            // Validate sanitized settings
            $validation_errors = $this->validate_settings_data($sanitized_settings);
            if (!empty($validation_errors)) {
                $this->send_error_response(
                    'Settings validation failed',
                    'validation_failed',
                    $validation_errors
                );
                return;
            }
            
            // Save to database
            $result = $this->storage->save_settings($sanitized_settings);
            
            if ($result) {
                $this->send_success_response(
                    [
                        'settings_saved' => count($sanitized_settings),
                        'settings_keys' => array_keys($sanitized_settings)
                    ],
                    [
                        'operation' => 'save_settings',
                        'settings_count' => count($sanitized_settings),
                        'data_size' => strlen($settings_json)
                    ],
                    'Settings saved successfully'
                );
            } else {
                $this->send_error_response(
                    'Failed to save settings to database',
                    'database_save_failed',
                    [
                        [
                            'code' => 'storage_error',
                            'message' => 'Database operation failed',
                            'field' => 'storage',
                            'severity' => 'error'
                        ]
                    ]
                );
            }
            
        } catch (Exception $e) {
            $this->log_error('save_settings_error', $e, [
                'settings_count' => isset($settings) ? count($settings) : 0,
                'data_size' => isset($settings_json) ? strlen($settings_json) : 0
            ]);
            
            $this->send_error_response(
                'An unexpected error occurred while saving settings',
                'unexpected_error',
                [
                    [
                        'code' => 'exception',
                        'message' => WP_DEBUG ? $e->getMessage() : 'Internal server error',
                        'field' => 'system',
                        'severity' => 'error'
                    ]
                ]
            );
        }
    }
    
    /**
     * Validate settings data structure and values
     * 
     * @param array $settings Settings to validate
     * @return array Array of validation errors
     */
    private function validate_settings_data($settings) {
        $errors = [];
        
        // Check for required settings structure
        if (!is_array($settings)) {
            $errors[] = [
                'code' => 'invalid_type',
                'message' => 'Settings must be an array',
                'field' => 'settings',
                'severity' => 'error'
            ];
            return $errors;
        }
        
        // Validate individual setting values
        foreach ($settings as $key => $value) {
            // Check key format
            if (!is_string($key) || empty($key)) {
                $errors[] = [
                    'code' => 'invalid_key',
                    'message' => 'Setting key must be a non-empty string',
                    'field' => $key,
                    'severity' => 'error'
                ];
                continue;
            }
            
            // Validate color values
            if (strpos($key, 'color') !== false && !empty($value)) {
                if (!preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $value)) {
                    $errors[] = [
                        'code' => 'invalid_color',
                        'message' => 'Invalid color format',
                        'field' => $key,
                        'severity' => 'warning'
                    ];
                }
            }
            
            // Validate numeric values
            if (in_array($key, ['font_size', 'border_radius', 'width', 'height']) && !empty($value)) {
                if (!is_numeric($value) || $value < 0) {
                    $errors[] = [
                        'code' => 'invalid_number',
                        'message' => 'Value must be a positive number',
                        'field' => $key,
                        'severity' => 'warning'
                    ];
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Handle settings load requests
     * 
     * Returns current settings with proper validation
     */
    public function handle_load_settings() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            // Load settings from storage
            $settings = $this->storage->load_settings();
            
            if ($settings === false) {
                $this->send_error_response(
                    'Failed to load settings from database',
                    'database_load_failed',
                    [
                        [
                            'code' => 'storage_error',
                            'message' => 'Could not retrieve settings from storage',
                            'field' => 'storage',
                            'severity' => 'error'
                        ]
                    ]
                );
                return;
            }
            
            $this->send_success_response(
                [
                    'settings' => $settings,
                    'settings_count' => count($settings),
                    'default_settings' => $this->get_default_settings_info()
                ],
                [
                    'operation' => 'load_settings',
                    'cache_status' => 'fresh'
                ],
                'Settings loaded successfully'
            );
            
        } catch (Exception $e) {
            $this->log_error('load_settings_error', $e);
            
            $this->send_error_response(
                'An unexpected error occurred while loading settings',
                'unexpected_error',
                [
                    [
                        'code' => 'exception',
                        'message' => WP_DEBUG ? $e->getMessage() : 'Internal server error',
                        'field' => 'system',
                        'severity' => 'error'
                    ]
                ]
            );
        }
    }
    
    /**
     * Handle nonce refresh requests
     * 
     * Generates new nonce for security token refresh
     */
    public function handle_refresh_nonce() {
        try {
            // For nonce refresh, we need lighter security validation
            // Check user capability but don't validate nonce (since we're refreshing it)
            if (!current_user_can('manage_options')) {
                $this->send_error_response(
                    'Insufficient permissions',
                    'insufficient_permissions',
                    [],
                    [],
                    403
                );
                return;
            }
            
            // Generate new nonce
            $new_nonce = wp_create_nonce('las_ajax_nonce');
            
            if (empty($new_nonce)) {
                $this->send_error_response(
                    'Failed to generate new nonce',
                    'nonce_generation_failed',
                    [
                        [
                            'code' => 'wp_nonce_error',
                            'message' => 'WordPress nonce generation failed',
                            'field' => 'nonce',
                            'severity' => 'error'
                        ]
                    ]
                );
                return;
            }
            
            $this->send_success_response(
                [
                    'nonce' => $new_nonce,
                    'expires_in' => DAY_IN_SECONDS, // WordPress default nonce lifetime
                    'generated_at' => current_time('timestamp')
                ],
                [
                    'operation' => 'refresh_nonce',
                    'user_id' => get_current_user_id(),
                    'session_token' => wp_get_session_token()
                ],
                'Nonce refreshed successfully'
            );
            
        } catch (Exception $e) {
            $this->log_error('refresh_nonce_error', $e);
            
            $this->send_error_response(
                'An unexpected error occurred while refreshing nonce',
                'unexpected_error',
                [
                    [
                        'code' => 'exception',
                        'message' => WP_DEBUG ? $e->getMessage() : 'Internal server error',
                        'field' => 'system',
                        'severity' => 'error'
                    ]
                ]
            );
        }
    }

    /**
     * Handle error reporting requests
     * 
     * Processes and stores error reports from the frontend
     */
    public function handle_error_report() {
        try {
            // Validate request security with lighter validation for error reporting
            if (!current_user_can('manage_options')) {
                $this->send_error_response(
                    'Insufficient permissions',
                    'insufficient_permissions',
                    [],
                    [],
                    403
                );
                return;
            }
            
            // Get error data
            $error_data = [
                'errors' => json_decode(stripslashes($_POST['errors'] ?? '[]'), true),
                'context' => sanitize_text_field($_POST['context'] ?? ''),
                'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
                'url' => esc_url_raw($_POST['url'] ?? ''),
                'timestamp' => current_time('mysql'),
                'user_id' => get_current_user_id(),
                'session_id' => wp_get_session_token()
            ];
            
            // Validate error data
            if (!is_array($error_data['errors']) || empty($error_data['errors'])) {
                $this->send_error_response(
                    'No valid error data provided',
                    'invalid_error_data'
                );
                return;
            }
            
            // Process and store errors
            $processed_errors = [];
            foreach ($error_data['errors'] as $error) {
                if (is_array($error) && !empty($error['message'])) {
                    $processed_error = [
                        'message' => sanitize_text_field($error['message']),
                        'type' => sanitize_text_field($error['type'] ?? 'javascript'),
                        'stack' => sanitize_textarea_field($error['stack'] ?? ''),
                        'line' => intval($error['line'] ?? 0),
                        'column' => intval($error['column'] ?? 0),
                        'file' => sanitize_text_field($error['file'] ?? ''),
                        'timestamp' => $error_data['timestamp'],
                        'context' => $error_data['context']
                    ];
                    
                    $processed_errors[] = $processed_error;
                    
                    // Log individual error
                    error_log('[LAS Error Report] ' . wp_json_encode($processed_error));
                }
            }
            
            // Store error batch in database if enabled
            if (defined('LAS_STORE_ERROR_REPORTS') && LAS_STORE_ERROR_REPORTS) {
                $this->store_error_reports($processed_errors);
            }
            
            $this->send_success_response(
                [
                    'errors_processed' => count($processed_errors),
                    'report_id' => md5(serialize($processed_errors) . $error_data['timestamp'])
                ],
                [
                    'operation' => 'error_report',
                    'error_count' => count($processed_errors)
                ],
                'Error report processed successfully'
            );
            
        } catch (Exception $e) {
            error_log('[LAS] Error reporting failed: ' . $e->getMessage());
            
            $this->send_error_response(
                'Failed to process error report',
                'error_reporting_failed'
            );
        }
    }

    /**
     * Handle error reporting (alias for backward compatibility)
     */
    public function handle_error_reporting() {
        $this->handle_error_report();
    }

    /**
     * Get error statistics
     */
    public function get_error_statistics() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            // Get basic error statistics
            $stats = [
                'total_errors' => 0,
                'recent_errors' => 0,
                'error_types' => [],
                'last_error_time' => null,
                'error_rate' => 0
            ];
            
            // If error storage is enabled, get real statistics
            if (defined('LAS_STORE_ERROR_REPORTS') && LAS_STORE_ERROR_REPORTS) {
                $stats = $this->get_stored_error_statistics();
            }
            
            $this->send_success_response(
                $stats,
                [
                    'operation' => 'get_error_statistics',
                    'period' => '24h'
                ],
                'Error statistics retrieved successfully'
            );
            
        } catch (Exception $e) {
            $this->log_error('get_error_statistics_error', $e);
            
            $this->send_error_response(
                'Failed to retrieve error statistics',
                'statistics_failed'
            );
        }
    }

    /**
     * Handle client-side error logging
     * 
     * Logs JavaScript errors from the frontend for debugging
     */
    public function handle_log_error() {
        try {
            // Validate request security (use lighter validation for error logging)
            $security_check = $this->validate_request_security('manage_options', true);
            if (is_wp_error($security_check)) {
                // Silently fail to prevent logging loops
                $this->send_error_response(
                    'Security validation failed',
                    'security_failed',
                    [],
                    [],
                    403
                );
                return;
            }
            
            // Sanitize error data
            $error_data = [
                'error' => sanitize_text_field($_POST['error'] ?? ''),
                'stack' => sanitize_textarea_field($_POST['stack'] ?? ''),
                'url' => esc_url_raw($_POST['url'] ?? ''),
                'user_agent' => sanitize_text_field($_POST['userAgent'] ?? ''),
                'line_number' => intval($_POST['lineNumber'] ?? 0),
                'column_number' => intval($_POST['columnNumber'] ?? 0),
                'timestamp' => current_time('mysql'),
                'user_id' => get_current_user_id(),
                'wp_version' => get_bloginfo('version'),
                'plugin_version' => $this->request_metadata['plugin_version'],
                'browser_info' => $this->extract_browser_info($_POST['userAgent'] ?? '')
            ];
            
            // Validate error data
            if (empty($error_data['error'])) {
                $this->send_error_response(
                    'Error message is required',
                    'missing_error_message'
                );
                return;
            }
            
            // Log the error with enhanced context
            error_log('[LAS Frontend Error] ' . wp_json_encode($error_data, JSON_PRETTY_PRINT));
            
            $this->send_success_response(
                [
                    'logged_at' => $error_data['timestamp'],
                    'error_id' => md5($error_data['error'] . $error_data['timestamp'])
                ],
                [
                    'operation' => 'log_error',
                    'error_severity' => $this->classify_error_severity($error_data['error'])
                ],
                'Error logged successfully'
            );
            
        } catch (Exception $e) {
            // Silently fail error logging to prevent infinite loops
            error_log('[LAS] Error logging failed: ' . $e->getMessage());
            
            $this->send_error_response(
                'Failed to log error',
                'logging_failed'
            );
        }
    }
    
    /**
     * Handle live preview CSS generation
     * 
     * Generates CSS for live preview with performance optimization
     */
    public function handle_get_preview_css() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            // Get current settings
            $settings = $this->storage->load_settings();
            
            if ($settings === false) {
                $this->send_error_response(
                    'Failed to load base settings',
                    'settings_load_failed'
                );
                return;
            }
            
            // Apply any temporary preview changes
            $preview_changes_count = 0;
            
            // Handle single setting change (from live preview)
            if (isset($_POST['setting']) && isset($_POST['value'])) {
                $setting_key = sanitize_text_field($_POST['setting']);
                $setting_value = sanitize_text_field($_POST['value']);
                
                if (!empty($setting_key)) {
                    $settings[$setting_key] = $setting_value;
                    $preview_changes_count = 1;
                }
            }
            // Handle batch preview settings
            elseif (isset($_POST['preview_settings'])) {
                $preview_settings = json_decode(stripslashes($_POST['preview_settings']), true);
                if (is_array($preview_settings)) {
                    $sanitized_preview = $this->security->sanitize_settings($preview_settings);
                    $settings = array_merge($settings, $sanitized_preview);
                    $preview_changes_count = count($sanitized_preview);
                }
            }
            
            // Generate CSS with caching consideration
            $css_cache_key = md5(serialize($settings));
            $css = $this->generate_preview_css($settings);
            
            if (empty($css)) {
                // Log more details about why CSS is empty
                error_log('[LAS Ajax Handlers] CSS generation returned empty result. Settings count: ' . count($settings));
                error_log('[LAS Ajax Handlers] Function exists: ' . (function_exists('las_fresh_generate_admin_css_output') ? 'YES' : 'NO'));
                
                $this->send_error_response(
                    'Generated CSS is empty',
                    'empty_css_generated',
                    [
                        [
                            'code' => 'css_generation_failed',
                            'message' => 'CSS generation function returned empty result',
                            'field' => 'css',
                            'severity' => 'error'
                        ]
                    ]
                );
                return;
            }
            
            $this->send_success_response(
                [
                    'css' => $css,
                    'css_length' => strlen($css),
                    'cache_key' => $css_cache_key,
                    'preview_changes' => $preview_changes_count,
                    'settings_count' => count($settings)
                ],
                [
                    'operation' => 'get_preview_css',
                    'css_size' => strlen($css),
                    'generation_method' => function_exists('las_fresh_generate_admin_css_output') ? 'native' : 'fallback'
                ],
                'Preview CSS generated successfully'
            );
            
        } catch (Exception $e) {
            $this->log_error('get_preview_css_error', $e, [
                'settings_count' => isset($settings) ? count($settings) : 0,
                'preview_changes' => $preview_changes_count ?? 0
            ]);
            
            $this->send_error_response(
                'An unexpected error occurred while generating preview CSS',
                'unexpected_error',
                [
                    [
                        'code' => 'exception',
                        'message' => WP_DEBUG ? $e->getMessage() : 'Internal server error',
                        'field' => 'system',
                        'severity' => 'error'
                    ]
                ]
            );
        }
    }



    /**
     * Store error reports in database
     * 
     * @param array $errors Array of processed errors
     */
    private function store_error_reports($errors) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        // Create table if it doesn't exist
        $this->maybe_create_error_reports_table();
        
        foreach ($errors as $error) {
            $wpdb->insert(
                $table_name,
                [
                    'message' => $error['message'],
                    'type' => $error['type'],
                    'stack' => $error['stack'],
                    'line_number' => $error['line'],
                    'column_number' => $error['column'],
                    'file' => $error['file'],
                    'context' => $error['context'],
                    'user_id' => get_current_user_id(),
                    'ip_address' => $this->request_metadata['ip_address'],
                    'user_agent' => $this->request_metadata['user_agent'],
                    'created_at' => $error['timestamp']
                ],
                ['%s', '%s', '%s', '%d', '%d', '%s', '%s', '%d', '%s', '%s', '%s']
            );
        }
    }

    /**
     * Create error reports table if needed
     */
    private function maybe_create_error_reports_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            message text NOT NULL,
            type varchar(50) NOT NULL DEFAULT 'javascript',
            stack text,
            line_number int unsigned DEFAULT 0,
            column_number int unsigned DEFAULT 0,
            file varchar(255) DEFAULT '',
            context varchar(100) DEFAULT '',
            user_id bigint(20) unsigned NOT NULL,
            ip_address varchar(45) NOT NULL,
            user_agent text,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY type_created (type, created_at),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    /**
     * Get stored error statistics
     * 
     * @return array Error statistics
     */
    private function get_stored_error_statistics() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        // Check if table exists
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
            return [
                'total_errors' => 0,
                'recent_errors' => 0,
                'error_types' => [],
                'last_error_time' => null,
                'error_rate' => 0
            ];
        }
        
        $stats = [];
        
        // Total errors
        $stats['total_errors'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
        
        // Recent errors (last 24 hours)
        $stats['recent_errors'] = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE created_at > %s",
            date('Y-m-d H:i:s', strtotime('-24 hours'))
        ));
        
        // Error types
        $error_types = $wpdb->get_results(
            "SELECT type, COUNT(*) as count FROM $table_name GROUP BY type ORDER BY count DESC LIMIT 10"
        );
        
        $stats['error_types'] = [];
        foreach ($error_types as $type) {
            $stats['error_types'][$type->type] = (int) $type->count;
        }
        
        // Last error time
        $last_error = $wpdb->get_var("SELECT created_at FROM $table_name ORDER BY created_at DESC LIMIT 1");
        $stats['last_error_time'] = $last_error;
        
        // Error rate (errors per hour in last 24h)
        $stats['error_rate'] = round($stats['recent_errors'] / 24, 2);
        
        return $stats;
    }

    /**
     * Extract browser information from user agent
     * 
     * @param string $user_agent User agent string
     * @return array Browser information
     */
    private function extract_browser_info($user_agent) {
        $browser_info = [
            'browser' => 'Unknown',
            'version' => 'Unknown',
            'platform' => 'Unknown'
        ];
        
        // Simple browser detection
        if (preg_match('/Chrome\/([0-9\.]+)/', $user_agent, $matches)) {
            $browser_info['browser'] = 'Chrome';
            $browser_info['version'] = $matches[1];
        } elseif (preg_match('/Firefox\/([0-9\.]+)/', $user_agent, $matches)) {
            $browser_info['browser'] = 'Firefox';
            $browser_info['version'] = $matches[1];
        } elseif (preg_match('/Safari\/([0-9\.]+)/', $user_agent, $matches)) {
            $browser_info['browser'] = 'Safari';
            $browser_info['version'] = $matches[1];
        } elseif (preg_match('/Edge\/([0-9\.]+)/', $user_agent, $matches)) {
            $browser_info['browser'] = 'Edge';
            $browser_info['version'] = $matches[1];
        }
        
        // Platform detection
        if (strpos($user_agent, 'Windows') !== false) {
            $browser_info['platform'] = 'Windows';
        } elseif (strpos($user_agent, 'Mac') !== false) {
            $browser_info['platform'] = 'macOS';
        } elseif (strpos($user_agent, 'Linux') !== false) {
            $browser_info['platform'] = 'Linux';
        } elseif (strpos($user_agent, 'Android') !== false) {
            $browser_info['platform'] = 'Android';
        } elseif (strpos($user_agent, 'iOS') !== false) {
            $browser_info['platform'] = 'iOS';
        }
        
        return $browser_info;
    }

    /**
     * Classify error severity based on error message
     * 
     * @param string $error_message Error message
     * @return string Severity level
     */
    private function classify_error_severity($error_message) {
        $error_lower = strtolower($error_message);
        
        if (strpos($error_lower, 'fatal') !== false || 
            strpos($error_lower, 'critical') !== false ||
            strpos($error_lower, 'cannot read') !== false) {
            return 'critical';
        }
        
        if (strpos($error_lower, 'warning') !== false ||
            strpos($error_lower, 'deprecated') !== false) {
            return 'warning';
        }
        
        if (strpos($error_lower, 'notice') !== false ||
            strpos($error_lower, 'info') !== false) {
            return 'info';
        }
        
        return 'error';
    }

    /**
     * Get default settings information
     * 
     * @return array Default settings info
     */
    private function get_default_settings_info() {
        return [
            'available' => true,
            'count' => 0,
            'last_reset' => get_option('las_last_settings_reset', null)
        ];
    }

    /**
     * Log error with context
     * 
     * @param string $context Error context
     * @param Exception $exception Exception object
     * @param array $additional_data Additional data to log
     */
    private function log_error($context, $exception, $additional_data = []) {
        $error_data = [
            'context' => $context,
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'additional_data' => $additional_data,
            'request_metadata' => $this->request_metadata,
            'timestamp' => current_time('mysql')
        ];
        
        error_log('[LAS Ajax Error] ' . wp_json_encode($error_data, JSON_PRETTY_PRINT));
    }
    
    /**
     * Handle settings reset requests
     * 
     * Resets all settings to default values
     */
    public function handle_reset_settings() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            // Get current settings count for comparison
            $current_settings = $this->storage->load_settings();
            $current_count = is_array($current_settings) ? count($current_settings) : 0;
            
            // Reset settings to defaults
            $result = $this->storage->reset_settings();
            
            if ($result) {
                // Get default settings for verification
                $default_settings = $this->storage->load_settings();
                $default_count = is_array($default_settings) ? count($default_settings) : 0;
                
                $this->send_success_response(
                    [
                        'reset_completed' => true,
                        'previous_settings_count' => $current_count,
                        'default_settings_count' => $default_count,
                        'default_settings' => $default_settings
                    ],
                    [
                        'operation' => 'reset_settings',
                        'settings_cleared' => $current_count,
                        'defaults_applied' => $default_count
                    ],
                    'Settings reset to defaults successfully'
                );
            } else {
                $this->send_error_response(
                    'Failed to reset settings to defaults',
                    'reset_operation_failed',
                    [
                        [
                            'code' => 'storage_error',
                            'message' => 'Storage reset operation returned false',
                            'field' => 'storage',
                            'severity' => 'error'
                        ]
                    ]
                );
            }
            
        } catch (Exception $e) {
            $this->log_error('reset_settings_error', $e, [
                'current_settings_count' => $current_count ?? 0
            ]);
            
            $this->send_error_response(
                'An unexpected error occurred while resetting settings',
                'unexpected_error',
                [
                    [
                        'code' => 'exception',
                        'message' => WP_DEBUG ? $e->getMessage() : 'Internal server error',
                        'field' => 'system',
                        'severity' => 'error'
                    ]
                ]
            );
        }
    }
    
    /**
     * Generate CSS for live preview
     * 
     * @param array $settings Current settings
     * @return string Generated CSS
     */
    private function generate_preview_css($settings) {
        try {
            // Use the comprehensive CSS generation function from output-css.php
            if (function_exists('las_fresh_generate_admin_css_output')) {
                return las_fresh_generate_admin_css_output($settings);
            }
            
            // Fallback to simple CSS generation if main function not available
            error_log('[LAS Ajax Handlers] Main CSS generation function not available, using fallback');
            
            $css = '';
            
            // Menu background color
            if (!empty($settings['menu_background_color'])) {
                $css .= sprintf(
                    '#adminmenu { background-color: %s !important; }' . "\n",
                    esc_attr($settings['menu_background_color'])
                );
            }
            
            // Menu text color
            if (!empty($settings['menu_text_color'])) {
                $css .= sprintf(
                    '#adminmenu a { color: %s !important; }' . "\n",
                    esc_attr($settings['menu_text_color'])
                );
            }
            
            // Menu hover color
            if (!empty($settings['menu_hover_color'])) {
                $css .= sprintf(
                    '#adminmenu a:hover { color: %s !important; }' . "\n",
                    esc_attr($settings['menu_hover_color'])
                );
            }
            
            // Admin bar background
            if (!empty($settings['adminbar_background'])) {
                $css .= sprintf(
                    '#wpadminbar { background: %s !important; }' . "\n",
                    esc_attr($settings['adminbar_background'])
                );
            }
            
            // Content background
            if (!empty($settings['content_background'])) {
                $css .= sprintf(
                    '#wpbody-content { background-color: %s !important; }' . "\n",
                    esc_attr($settings['content_background'])
                );
            }
            
            return $css;
            
        } catch (Exception $e) {
            error_log('[LAS Ajax Handlers] CSS generation failed: ' . $e->getMessage());
            return '';
        }
    }
    

    
    /**
     * Handle batch settings save requests
     * 
     * Processes multiple settings operations in a single request
     */
    public function handle_batch_save_settings() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            // Get batch operations data
            $operations_json = stripslashes($_POST['operations'] ?? '');
            $operations = json_decode($operations_json, true);
            
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($operations)) {
                $this->send_error_response(
                    'Invalid batch operations data',
                    'invalid_batch_data'
                );
                return;
            }
            
            $results = [];
            $errors = [];
            
            foreach ($operations as $index => $operation) {
                try {
                    if (!isset($operation['type']) || !isset($operation['data'])) {
                        $errors[] = [
                            'index' => $index,
                            'code' => 'invalid_operation',
                            'message' => 'Operation must have type and data fields'
                        ];
                        continue;
                    }
                    
                    switch ($operation['type']) {
                        case 'save_settings':
                            $sanitized = $this->security->sanitize_settings($operation['data']);
                            $result = $this->storage->save_settings($sanitized);
                            $results[] = [
                                'index' => $index,
                                'type' => 'save_settings',
                                'success' => $result,
                                'settings_count' => count($sanitized)
                            ];
                            break;
                            
                        default:
                            $errors[] = [
                                'index' => $index,
                                'code' => 'unknown_operation',
                                'message' => 'Unknown operation type: ' . $operation['type']
                            ];
                    }
                } catch (Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'code' => 'operation_failed',
                        'message' => $e->getMessage()
                    ];
                }
            }
            
            $this->send_success_response(
                [
                    'results' => $results,
                    'errors' => $errors,
                    'total_operations' => count($operations),
                    'successful_operations' => count($results),
                    'failed_operations' => count($errors)
                ],
                [
                    'operation' => 'batch_save_settings',
                    'batch_size' => count($operations)
                ],
                'Batch operations completed'
            );
            
        } catch (Exception $e) {
            $this->log_error('batch_save_error', $e);
            
            $this->send_error_response(
                'Batch operation failed',
                'batch_operation_failed',
                [
                    [
                        'code' => 'exception',
                        'message' => WP_DEBUG ? $e->getMessage() : 'Internal server error',
                        'field' => 'system',
                        'severity' => 'error'
                    ]
                ]
            );
        }
    }
    
    /**
     * Handle performance metrics requests
     * 
     * Returns current performance statistics
     */
    public function handle_get_performance_metrics() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            // Get current session metrics
            $current_metrics = [
                'current_memory_usage' => memory_get_usage(true),
                'peak_memory_usage' => memory_get_peak_usage(true),
                'request_count' => count($this->performance_metrics),
                'average_execution_time' => $this->calculate_average_execution_time(),
                'server_load' => $this->get_server_load_info()
            ];
            
            // Get historical metrics if available
            $historical_metrics = $this->get_historical_performance_metrics();
            
            $this->send_success_response(
                [
                    'current' => $current_metrics,
                    'historical' => $historical_metrics,
                    'session_metrics' => $this->performance_metrics
                ],
                [
                    'operation' => 'get_performance_metrics',
                    'metrics_available' => !empty($this->performance_metrics)
                ],
                'Performance metrics retrieved successfully'
            );
            
        } catch (Exception $e) {
            $this->log_error('performance_metrics_error', $e);
            
            $this->send_error_response(
                'Failed to retrieve performance metrics',
                'metrics_retrieval_failed'
            );
        }
    }
    

    
    /**
     * Handle system health check requests
     * 
     * Returns comprehensive system status information
     */
    public function handle_health_check() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }
            
            $health_status = [
                'database' => $this->check_database_health(),
                'memory' => $this->check_memory_health(),
                'storage' => $this->check_storage_health(),
                'security' => $this->check_security_health(),
                'performance' => $this->check_performance_health()
            ];
            
            $overall_status = $this->calculate_overall_health($health_status);
            
            $this->send_success_response(
                [
                    'overall_status' => $overall_status,
                    'components' => $health_status,
                    'recommendations' => $this->get_health_recommendations($health_status)
                ],
                [
                    'operation' => 'health_check',
                    'check_timestamp' => current_time('timestamp')
                ],
                'System health check completed'
            );
            
        } catch (Exception $e) {
            $this->log_error('health_check_error', $e);
            
            $this->send_error_response(
                'Health check failed',
                'health_check_failed'
            );
        }
    }
    
    /**
     * Calculate average execution time from current metrics
     * 
     * @return float Average execution time in milliseconds
     */
    private function calculate_average_execution_time() {
        if (empty($this->performance_metrics)) {
            return 0;
        }
        
        $total_time = array_sum(array_column($this->performance_metrics, 'execution_time_ms'));
        return round($total_time / count($this->performance_metrics), 2);
    }
    
    /**
     * Get server load information
     * 
     * @return array Server load data
     */
    private function get_server_load_info() {
        $load_info = [
            'php_version' => PHP_VERSION,
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'upload_max_filesize' => ini_get('upload_max_filesize')
        ];
        
        // Get system load average if available (Unix systems)
        if (function_exists('sys_getloadavg')) {
            $load_info['system_load'] = sys_getloadavg();
        }
        
        return $load_info;
    }
    
    /**
     * Get historical performance metrics from database
     * 
     * @return array Historical metrics data
     */
    private function get_historical_performance_metrics() {
        if (!defined('LAS_STORE_PERFORMANCE_METRICS') || !LAS_STORE_PERFORMANCE_METRICS) {
            return ['message' => 'Historical metrics not enabled'];
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'las_performance_metrics';
        
        // Check if table exists
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
            return ['message' => 'Metrics table not found'];
        }
        
        // Get metrics from last 24 hours
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT action, AVG(execution_time_ms) as avg_time, COUNT(*) as request_count, 
                    AVG(memory_usage) as avg_memory, MAX(memory_peak) as peak_memory
             FROM $table_name 
             WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
             GROUP BY action
             ORDER BY avg_time DESC",
        ));
        
        return $results ?: [];
    }
    
    /**
     * Check database health status
     * 
     * @return array Database health information
     */
    private function check_database_health() {
        global $wpdb;
        
        $start_time = microtime(true);
        $test_query = $wpdb->get_var("SELECT 1");
        $query_time = round((microtime(true) - $start_time) * 1000, 2);
        
        return [
            'status' => $test_query === '1' ? 'healthy' : 'error',
            'response_time_ms' => $query_time,
            'connection' => is_resource($wpdb->dbh) || is_object($wpdb->dbh) ? 'active' : 'inactive'
        ];
    }
    
    /**
     * Check memory health status
     * 
     * @return array Memory health information
     */
    private function check_memory_health() {
        $current_usage = memory_get_usage(true);
        $peak_usage = memory_get_peak_usage(true);
        $memory_limit = $this->parse_memory_limit(ini_get('memory_limit'));
        
        $usage_percentage = $memory_limit > 0 ? ($current_usage / $memory_limit) * 100 : 0;
        
        return [
            'status' => $usage_percentage > 80 ? 'warning' : ($usage_percentage > 90 ? 'critical' : 'healthy'),
            'current_usage' => $current_usage,
            'current_usage_formatted' => size_format($current_usage),
            'peak_usage' => $peak_usage,
            'peak_usage_formatted' => size_format($peak_usage),
            'memory_limit' => $memory_limit,
            'memory_limit_formatted' => size_format($memory_limit),
            'usage_percentage' => round($usage_percentage, 2)
        ];
    }
    
    /**
     * Parse memory limit string to bytes
     * 
     * @param string $limit Memory limit string (e.g., "128M")
     * @return int Memory limit in bytes
     */
    private function parse_memory_limit($limit) {
        if ($limit === '-1') {
            return PHP_INT_MAX;
        }
        
        $limit = trim($limit);
        $last_char = strtolower($limit[strlen($limit) - 1]);
        $number = (int) $limit;
        
        switch ($last_char) {
            case 'g':
                $number *= 1024 * 1024 * 1024;
                break;
            case 'm':
                $number *= 1024 * 1024;
                break;
            case 'k':
                $number *= 1024;
                break;
        }
        
        return $number;
    }
    
    /**
     * Check storage health status
     * 
     * @return array Storage health information
     */
    private function check_storage_health() {
        try {
            $test_settings = ['test_key' => 'test_value'];
            $save_result = $this->storage->save_settings($test_settings);
            $load_result = $this->storage->load_settings();
            
            return [
                'status' => ($save_result && is_array($load_result)) ? 'healthy' : 'error',
                'save_test' => $save_result ? 'passed' : 'failed',
                'load_test' => is_array($load_result) ? 'passed' : 'failed'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Check security health status
     * 
     * @return array Security health information
     */
    private function check_security_health() {
        $nonce_test = wp_create_nonce('test_nonce');
        $nonce_valid = wp_verify_nonce($nonce_test, 'test_nonce');
        
        return [
            'status' => $nonce_valid ? 'healthy' : 'warning',
            'nonce_system' => $nonce_valid ? 'working' : 'issues_detected',
            'ssl_enabled' => is_ssl(),
            'user_capabilities' => current_user_can('manage_options')
        ];
    }
    
    /**
     * Check performance health status
     * 
     * @return array Performance health information
     */
    private function check_performance_health() {
        $avg_execution_time = $this->calculate_average_execution_time();
        
        return [
            'status' => $avg_execution_time > 1000 ? 'warning' : 'healthy',
            'average_execution_time_ms' => $avg_execution_time,
            'request_count' => count($this->performance_metrics),
            'php_version' => PHP_VERSION,
            'opcache_enabled' => function_exists('opcache_get_status') && opcache_get_status()
        ];
    }
    
    /**
     * Calculate overall health status
     * 
     * @param array $health_status Individual component health statuses
     * @return string Overall health status
     */
    private function calculate_overall_health($health_status) {
        $statuses = array_column($health_status, 'status');
        
        if (in_array('critical', $statuses)) {
            return 'critical';
        } elseif (in_array('error', $statuses)) {
            return 'error';
        } elseif (in_array('warning', $statuses)) {
            return 'warning';
        } else {
            return 'healthy';
        }
    }
    
    /**
     * Get health recommendations based on status
     * 
     * @param array $health_status Health status data
     * @return array Recommendations
     */
    private function get_health_recommendations($health_status) {
        $recommendations = [];
        
        foreach ($health_status as $component => $status) {
            if ($status['status'] !== 'healthy') {
                switch ($component) {
                    case 'memory':
                        if ($status['usage_percentage'] > 80) {
                            $recommendations[] = 'Consider increasing PHP memory limit or optimizing memory usage';
                        }
                        break;
                    case 'performance':
                        if ($status['average_execution_time_ms'] > 1000) {
                            $recommendations[] = 'AJAX requests are running slowly - consider performance optimization';
                        }
                        break;
                    case 'database':
                        if ($status['status'] === 'error') {
                            $recommendations[] = 'Database connection issues detected - check database server';
                        }
                        break;
                }
            }
        }
        
        return $recommendations;
    }
    

    

    

    
    /**
     * Handle error report requests from client-side error handler
     * 
     * Receives and processes error reports from the JavaScript error handler
     */
    public function handle_error_report() {
        try {
            // Basic capability check (errors can happen to any user)
            if (!is_user_logged_in()) {
                $this->send_error_response(
                    'Authentication required',
                    'authentication_required',
                    [],
                    [],
                    401
                );
                return;
            }
            
            // Get error data from request
            $error_data_json = file_get_contents('php://input');
            if (empty($error_data_json)) {
                $error_data_json = stripslashes($_POST['error_data'] ?? '');
            }
            
            if (empty($error_data_json)) {
                $this->send_error_response(
                    'No error data provided',
                    'missing_error_data'
                );
                return;
            }
            
            $error_data = json_decode($error_data_json, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->send_error_response(
                    'Invalid error data format',
                    'invalid_error_data'
                );
                return;
            }
            
            // Sanitize and validate error data
            $sanitized_error = $this->sanitize_error_report($error_data);
            
            if (empty($sanitized_error)) {
                $this->send_error_response(
                    'Error data validation failed',
                    'error_data_validation_failed'
                );
                return;
            }
            
            // Log the client-side error
            $this->log_client_error($sanitized_error);
            
            $this->send_success_response(
                [
                    'error_logged' => true,
                    'error_id' => $sanitized_error['id'] ?? 'unknown',
                    'timestamp' => current_time('mysql')
                ],
                [
                    'operation' => 'error_report',
                    'error_type' => $sanitized_error['classification']['code'] ?? 'unknown'
                ],
                'Error report processed successfully'
            );
            
        } catch (Exception $e) {
            error_log('[LAS Error Handler] Failed to process error report: ' . $e->getMessage());
            
            $this->send_error_response(
                'Failed to process error report',
                'error_report_processing_failed'
            );
        }
    }
    
    /**
     * Sanitize client-side error report data
     * 
     * @param array $error_data Raw error data from client
     * @return array|null Sanitized error data or null if invalid
     */
    private function sanitize_error_report($error_data) {
        if (!is_array($error_data) || empty($error_data)) {
            return null;
        }
        
        $sanitized = [
            'id' => sanitize_text_field($error_data['id'] ?? ''),
            'timestamp' => sanitize_text_field($error_data['timestamp'] ?? ''),
            'server_timestamp' => current_time('mysql'),
            'user_id' => get_current_user_id(),
            'ip_address' => $this->get_client_ip()
        ];
        
        // Sanitize classification data
        if (isset($error_data['classification']) && is_array($error_data['classification'])) {
            $sanitized['classification'] = [
                'code' => sanitize_text_field($error_data['classification']['code'] ?? ''),
                'category' => sanitize_text_field($error_data['classification']['category'] ?? ''),
                'severity' => sanitize_text_field($error_data['classification']['severity'] ?? ''),
                'retryable' => (bool) ($error_data['classification']['retryable'] ?? false),
                'user_message' => sanitize_text_field($error_data['classification']['userMessage'] ?? ''),
                'technical_message' => sanitize_text_field($error_data['classification']['technicalMessage'] ?? '')
            ];
        }
        
        // Sanitize original error data
        if (isset($error_data['originalError']) && is_array($error_data['originalError'])) {
            $sanitized['original_error'] = [
                'name' => sanitize_text_field($error_data['originalError']['name'] ?? ''),
                'message' => sanitize_textarea_field($error_data['originalError']['message'] ?? ''),
                'status' => (int) ($error_data['originalError']['status'] ?? 0),
                'code' => sanitize_text_field($error_data['originalError']['code'] ?? '')
            ];
            
            // Include stack trace only in debug mode
            if (WP_DEBUG && !empty($error_data['originalError']['stack'])) {
                $sanitized['original_error']['stack'] = sanitize_textarea_field($error_data['originalError']['stack']);
            }
        }
        
        // Sanitize context data
        if (isset($error_data['context']) && is_array($error_data['context'])) {
            $sanitized['context'] = [
                'url' => esc_url_raw($error_data['context']['url'] ?? ''),
                'user_agent' => sanitize_text_field($error_data['context']['userAgent'] ?? ''),
                'request_id' => sanitize_text_field($error_data['context']['requestId'] ?? ''),
                'action' => sanitize_text_field($error_data['context']['action'] ?? ''),
                'method' => sanitize_text_field($error_data['context']['method'] ?? ''),
                'attempt' => (int) ($error_data['context']['attempt'] ?? 1)
            ];
        }
        
        // Sanitize environment data
        if (isset($error_data['environment']) && is_array($error_data['environment'])) {
            $sanitized['environment'] = [
                'online' => (bool) ($error_data['environment']['online'] ?? true),
                'cookie_enabled' => (bool) ($error_data['environment']['cookieEnabled'] ?? true),
                'language' => sanitize_text_field($error_data['environment']['language'] ?? ''),
                'platform' => sanitize_text_field($error_data['environment']['platform'] ?? '')
            ];
            
            // Sanitize viewport data
            if (isset($error_data['environment']['viewport']) && is_array($error_data['environment']['viewport'])) {
                $sanitized['environment']['viewport'] = [
                    'width' => (int) ($error_data['environment']['viewport']['width'] ?? 0),
                    'height' => (int) ($error_data['environment']['viewport']['height'] ?? 0)
                ];
            }
            
            // Sanitize memory data
            if (isset($error_data['environment']['memory']) && is_array($error_data['environment']['memory'])) {
                $sanitized['environment']['memory'] = [
                    'used' => (int) ($error_data['environment']['memory']['used'] ?? 0),
                    'total' => (int) ($error_data['environment']['memory']['total'] ?? 0),
                    'limit' => (int) ($error_data['environment']['memory']['limit'] ?? 0)
                ];
            }
            
            // Sanitize connection data
            if (isset($error_data['environment']['connection']) && is_array($error_data['environment']['connection'])) {
                $sanitized['environment']['connection'] = [
                    'effective_type' => sanitize_text_field($error_data['environment']['connection']['effectiveType'] ?? ''),
                    'downlink' => (float) ($error_data['environment']['connection']['downlink'] ?? 0),
                    'rtt' => (int) ($error_data['environment']['connection']['rtt'] ?? 0)
                ];
            }
        }
        
        // Sanitize response data if present
        if (isset($error_data['response']) && is_array($error_data['response'])) {
            $sanitized['response'] = [
                'status' => (int) ($error_data['response']['status'] ?? 0),
                'status_text' => sanitize_text_field($error_data['response']['statusText'] ?? '')
            ];
            
            // Include response data only if it's not too large
            if (isset($error_data['response']['data']) && is_array($error_data['response']['data'])) {
                $response_data_json = wp_json_encode($error_data['response']['data']);
                if (strlen($response_data_json) < 1000) { // Limit to 1KB
                    $sanitized['response']['data'] = $error_data['response']['data'];
                }
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Log client-side error with enhanced context
     * 
     * @param array $error_data Sanitized error data
     */
    private function log_client_error($error_data) {
        // Create comprehensive log entry
        $log_entry = [
            'source' => 'client_side',
            'error_id' => $error_data['id'],
            'classification' => $error_data['classification'] ?? [],
            'original_error' => $error_data['original_error'] ?? [],
            'context' => $error_data['context'] ?? [],
            'environment' => $error_data['environment'] ?? [],
            'response' => $error_data['response'] ?? [],
            'server_context' => [
                'php_version' => PHP_VERSION,
                'wp_version' => get_bloginfo('version'),
                'plugin_version' => defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : 'unknown',
                'memory_usage' => memory_get_usage(true),
                'peak_memory' => memory_get_peak_usage(true),
                'server_time' => current_time('mysql')
            ],
            'user_context' => [
                'user_id' => $error_data['user_id'],
                'ip_address' => $error_data['ip_address'],
                'user_agent' => $error_data['context']['user_agent'] ?? '',
                'capabilities' => array_keys(wp_get_current_user()->allcaps ?? [])
            ]
        ];
        
        // Determine log level based on error severity
        $severity = $error_data['classification']['severity'] ?? 'error';
        $log_level = $this->map_severity_to_log_level($severity);
        
        // Log to WordPress error log
        error_log(sprintf(
            '[LAS Client Error] %s: %s | ID: %s | User: %d | URL: %s',
            strtoupper($severity),
            $error_data['classification']['technical_message'] ?? 'Unknown error',
            $error_data['id'],
            $error_data['user_id'],
            $error_data['context']['url'] ?? 'unknown'
        ));
        
        // Log detailed information in debug mode
        if (WP_DEBUG) {
            error_log('[LAS Client Error Details] ' . wp_json_encode($log_entry, JSON_PRETTY_PRINT));
        }
        
        // Store critical errors in database for monitoring
        if ($severity === 'critical' || $severity === 'error') {
            $this->store_client_error($log_entry);
        }
        
        // Send to external error tracking service if configured
        if (defined('LAS_ERROR_TRACKING_ENDPOINT') && LAS_ERROR_TRACKING_ENDPOINT) {
            $this->send_to_error_tracking_service($log_entry);
        }
    }
    
    /**
     * Map error severity to log level
     * 
     * @param string $severity Error severity
     * @return string Log level
     */
    private function map_severity_to_log_level($severity) {
        $severity_map = [
            'critical' => 'critical',
            'error' => 'error',
            'warning' => 'warning',
            'info' => 'info',
            'debug' => 'debug'
        ];
        
        return $severity_map[$severity] ?? 'error';
    }
    
    /**
     * Store client error in database for monitoring
     * 
     * @param array $error_data Error data to store
     */
    private function store_client_error($error_data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_client_errors';
        
        // Create table if it doesn't exist
        $this->create_client_errors_table();
        
        $wpdb->insert(
            $table_name,
            [
                'error_id' => $error_data['error_id'],
                'classification_code' => $error_data['classification']['code'] ?? '',
                'severity' => $error_data['classification']['severity'] ?? 'error',
                'category' => $error_data['classification']['category'] ?? 'unknown',
                'message' => $error_data['original_error']['message'] ?? '',
                'url' => $error_data['context']['url'] ?? '',
                'user_agent' => $error_data['context']['user_agent'] ?? '',
                'user_id' => $error_data['user_context']['user_id'],
                'ip_address' => $error_data['user_context']['ip_address'],
                'error_data' => wp_json_encode($error_data),
                'created_at' => current_time('mysql')
            ],
            ['%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s']
        );
    }
    
    /**
     * Create client errors table
     */
    private function create_client_errors_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_client_errors';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            error_id varchar(100) NOT NULL,
            classification_code varchar(50) NOT NULL,
            severity varchar(20) NOT NULL,
            category varchar(50) NOT NULL,
            message text NOT NULL,
            url varchar(500) DEFAULT NULL,
            user_agent varchar(500) DEFAULT NULL,
            user_id bigint(20) unsigned DEFAULT NULL,
            ip_address varchar(45) DEFAULT NULL,
            error_data longtext DEFAULT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY error_id (error_id),
            KEY severity (severity),
            KEY category (category),
            KEY created_at (created_at),
            KEY user_id (user_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Send error to external tracking service
     * 
     * @param array $error_data Error data to send
     */
    private function send_to_error_tracking_service($error_data) {
        if (!defined('LAS_ERROR_TRACKING_ENDPOINT') || !LAS_ERROR_TRACKING_ENDPOINT) {
            return;
        }
        
        // Send asynchronously to avoid blocking the response
        wp_remote_post(LAS_ERROR_TRACKING_ENDPOINT, [
            'body' => wp_json_encode($error_data),
            'headers' => [
                'Content-Type' => 'application/json',
                'User-Agent' => 'LiveAdminStyler/' . (defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : '1.0')
            ],
            'timeout' => 5,
            'blocking' => false // Non-blocking request
        ]);
    }
    
    /**
     * Store critical error in database
     * 
     * @param array $error_data Error data to store
     */
    private function store_critical_error($error_data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_critical_errors';
        
        // Create table if it doesn't exist
        $this->create_critical_errors_table();
        
        $wpdb->insert(
            $table_name,
            [
                'error_type' => $error_data['type'],
                'message' => $error_data['message'],
                'file' => $error_data['file'] ?? '',
                'line' => $error_data['line'] ?? 0,
                'severity' => $error_data['severity'],
                'user_id' => $error_data['user_id'],
                'memory_usage' => $error_data['memory_usage'],
                'context_data' => wp_json_encode($error_data['context'] ?? []),
                'request_metadata' => wp_json_encode($error_data['request_metadata'] ?? []),
                'created_at' => $error_data['timestamp']
            ],
            ['%s', '%s', '%s', '%d', '%s', '%d', '%d', '%s', '%s', '%s']
        );
    }
    
    /**
     * Create critical errors table
     */
    private function create_critical_errors_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_critical_errors';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            error_type varchar(100) NOT NULL,
            message text NOT NULL,
            file varchar(500) DEFAULT NULL,
            line int DEFAULT NULL,
            severity varchar(20) NOT NULL,
            user_id bigint(20) unsigned DEFAULT NULL,
            memory_usage bigint(20) unsigned DEFAULT NULL,
            context_data longtext DEFAULT NULL,
            request_metadata longtext DEFAULT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY error_type (error_type),
            KEY severity (severity),
            KEY created_at (created_at),
            KEY user_id (user_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Classify exception severity
     * 
     * @param Exception $exception Exception object
     * @return string Severity level
     */
    private function classify_exception_severity($exception) {
        $message = strtolower($exception->getMessage());
        
        // Critical system errors
        if (strpos($message, 'fatal') !== false ||
            strpos($message, 'out of memory') !== false ||
            strpos($message, 'maximum execution time') !== false ||
            strpos($message, 'cannot connect') !== false) {
            return 'critical';
        }
        
        // High severity errors
        if (strpos($message, 'database') !== false ||
            strpos($message, 'permission') !== false ||
            strpos($message, 'security') !== false ||
            strpos($message, 'authentication') !== false) {
            return 'error';
        }
        
        // Medium severity errors
        if (strpos($message, 'warning') !== false ||
            strpos($message, 'deprecated') !== false ||
            strpos($message, 'notice') !== false) {
            return 'warning';
        }
        
        // Default to error level
        return 'error';
    }
    
    /**
     * Handle error reporting AJAX request
     * 
     * Receives and processes error reports from the frontend error reporting system.
     * Validates, sanitizes, and stores error information for debugging and monitoring.
     */
    public function handle_error_reporting() {
        try {
            // Start performance tracking
            $start_time = microtime(true);
            
            // Verify nonce and capabilities
            if (!wp_verify_nonce($_POST['_ajax_nonce'] ?? '', 'las_ajax_action') || 
                !current_user_can('manage_options')) {
                wp_send_json_error([
                    'message' => 'Security check failed',
                    'code' => 'SECURITY_ERROR'
                ]);
                return;
            }
            
            // Validate and sanitize input
            $errors = $this->validate_error_report_data($_POST);
            if (is_wp_error($errors)) {
                wp_send_json_error([
                    'message' => $errors->get_error_message(),
                    'code' => 'VALIDATION_ERROR'
                ]);
                return;
            }
            
            // Process and store errors
            $processed_count = 0;
            $failed_count = 0;
            
            foreach ($errors as $error_data) {
                try {
                    $this->store_error_report($error_data);
                    $processed_count++;
                } catch (Exception $e) {
                    $failed_count++;
                    error_log("LAS Error Reporting: Failed to store error - " . $e->getMessage());
                }
            }
            
            // Log performance metrics
            $execution_time = microtime(true) - $start_time;
            $this->log_performance_metric('error_reporting', $execution_time, [
                'processed_count' => $processed_count,
                'failed_count' => $failed_count
            ]);
            
            // Send success response
            wp_send_json_success([
                'message' => sprintf(
                    'Processed %d errors successfully (%d failed)',
                    $processed_count,
                    $failed_count
                ),
                'processed' => $processed_count,
                'failed' => $failed_count,
                'execution_time' => round($execution_time * 1000, 2) // ms
            ]);
            
        } catch (Exception $e) {
            error_log("LAS Error Reporting Handler Exception: " . $e->getMessage());
            wp_send_json_error([
                'message' => 'Internal server error during error reporting',
                'code' => 'SERVER_ERROR'
            ]);
        }
    }
    
    /**
     * Validate error report data
     * 
     * @param array $post_data Raw POST data
     * @return array|WP_Error Validated errors array or WP_Error on failure
     */
    private function validate_error_report_data($post_data) {
        // Check if errors data exists
        if (!isset($post_data['errors']) || !is_array($post_data['errors'])) {
            return new WP_Error('missing_errors', 'No error data provided');
        }
        
        $errors = $post_data['errors'];
        
        // Validate array size
        if (count($errors) > 50) { // Limit batch size
            return new WP_Error('too_many_errors', 'Too many errors in batch (max 50)');
        }
        
        $validated_errors = [];
        
        foreach ($errors as $index => $error) {
            // Validate required fields
            if (!isset($error['id']) || !isset($error['message']) || !isset($error['timestamp'])) {
                continue; // Skip invalid errors
            }
            
            // Sanitize and validate error data
            $validated_error = [
                'id' => sanitize_text_field($error['id']),
                'type' => sanitize_text_field($error['type'] ?? 'unknown'),
                'message' => sanitize_textarea_field($error['message']),
                'timestamp' => absint($error['timestamp']),
                'url' => esc_url_raw($error['url'] ?? ''),
                'user_agent' => sanitize_text_field($error['userAgent'] ?? ''),
                'stack' => sanitize_textarea_field($error['stack'] ?? ''),
                'filename' => sanitize_text_field($error['filename'] ?? ''),
                'lineno' => absint($error['lineno'] ?? 0),
                'colno' => absint($error['colno'] ?? 0)
            ];
            
            // Validate classification if present
            if (isset($error['classification']) && is_array($error['classification'])) {
                $validated_error['classification'] = [
                    'type' => sanitize_text_field($error['classification']['type'] ?? 'unknown'),
                    'severity' => sanitize_text_field($error['classification']['severity'] ?? 'medium'),
                    'recoverable' => (bool)($error['classification']['recoverable'] ?? true),
                    'strategy' => sanitize_text_field($error['classification']['strategy'] ?? '')
                ];
            }
            
            // Validate context if present
            if (isset($error['context']) && is_array($error['context'])) {
                $context = $error['context'];
                $validated_error['context'] = [
                    'component' => sanitize_text_field($context['component'] ?? ''),
                    'viewport_width' => absint($context['viewport']['width'] ?? 0),
                    'viewport_height' => absint($context['viewport']['height'] ?? 0),
                    'memory_used' => absint($context['memory']['used'] ?? 0),
                    'memory_total' => absint($context['memory']['total'] ?? 0),
                    'connection_type' => sanitize_text_field($context['connection']['effectiveType'] ?? ''),
                    'user_id' => absint($context['user']['id'] ?? 0)
                ];
                
                // Validate component status if present
                if (isset($context['components']) && is_array($context['components'])) {
                    $component_status = [];
                    foreach ($context['components'] as $comp_name => $comp_data) {
                        $component_status[sanitize_text_field($comp_name)] = [
                            'initialized' => (bool)($comp_data['initialized'] ?? false),
                            'name' => sanitize_text_field($comp_data['name'] ?? '')
                        ];
                    }
                    $validated_error['context']['components'] = $component_status;
                }
            }
            
            $validated_errors[] = $validated_error;
        }
        
        if (empty($validated_errors)) {
            return new WP_Error('no_valid_errors', 'No valid errors found in batch');
        }
        
        return $validated_errors;
    }
    
    /**
     * Store error report in database
     * 
     * @param array $error_data Validated error data
     * @throws Exception If storage fails
     */
    private function store_error_report($error_data) {
        global $wpdb;
        
        // Prepare data for storage
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        // Create table if it doesn't exist
        $this->ensure_error_reports_table();
        
        // Insert error report
        $result = $wpdb->insert(
            $table_name,
            [
                'error_id' => $error_data['id'],
                'error_type' => $error_data['type'],
                'message' => $error_data['message'],
                'stack_trace' => $error_data['stack'],
                'filename' => $error_data['filename'],
                'line_number' => $error_data['lineno'],
                'column_number' => $error_data['colno'],
                'url' => $error_data['url'],
                'user_agent' => $error_data['user_agent'],
                'user_id' => get_current_user_id(),
                'session_id' => sanitize_text_field($_POST['session_id'] ?? ''),
                'classification' => wp_json_encode($error_data['classification'] ?? []),
                'context_data' => wp_json_encode($error_data['context'] ?? []),
                'timestamp' => date('Y-m-d H:i:s', $error_data['timestamp'] / 1000),
                'created_at' => current_time('mysql')
            ],
            [
                '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s'
            ]
        );
        
        if ($result === false) {
            throw new Exception('Failed to insert error report: ' . $wpdb->last_error);
        }
        
        // Update error statistics
        $this->update_error_statistics($error_data);
    }
    
    /**
     * Ensure error reports table exists
     */
    private function ensure_error_reports_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'las_error_reports';
        
        // Check if table exists
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
        
        if (!$table_exists) {
            $charset_collate = $wpdb->get_charset_collate();
            
            $sql = "CREATE TABLE $table_name (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                error_id varchar(100) NOT NULL,
                error_type varchar(50) NOT NULL DEFAULT 'unknown',
                message text NOT NULL,
                stack_trace longtext,
                filename varchar(500),
                line_number int(11) DEFAULT 0,
                column_number int(11) DEFAULT 0,
                url varchar(500),
                user_agent text,
                user_id bigint(20) unsigned DEFAULT 0,
                session_id varchar(100),
                classification longtext,
                context_data longtext,
                timestamp datetime NOT NULL,
                created_at datetime NOT NULL,
                PRIMARY KEY (id),
                KEY error_id (error_id),
                KEY error_type (error_type),
                KEY user_id (user_id),
                KEY timestamp (timestamp),
                KEY created_at (created_at)
            ) $charset_collate;";
            
            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
            dbDelta($sql);
        }
    }
    
    /**
     * Update error statistics
     * 
     * @param array $error_data Error data
     */
    private function update_error_statistics($error_data) {
        $stats_option = 'las_error_statistics';
        $stats = get_option($stats_option, [
            'total_errors' => 0,
            'error_types' => [],
            'last_error' => null,
            'first_error' => null
        ]);
        
        // Update counters
        $stats['total_errors']++;
        
        $error_type = $error_data['type'];
        if (!isset($stats['error_types'][$error_type])) {
            $stats['error_types'][$error_type] = 0;
        }
        $stats['error_types'][$error_type]++;
        
        // Update timestamps
        $current_time = current_time('mysql');
        $stats['last_error'] = $current_time;
        
        if (!$stats['first_error']) {
            $stats['first_error'] = $current_time;
        }
        
        // Store updated statistics
        update_option($stats_option, $stats);
    }
    
    /**
     * Handle nonce refresh AJAX request
     */
    public function handle_nonce_refresh() {
        try {
            // Basic security check (can't use nonce verification for nonce refresh)
            if (!current_user_can('manage_options')) {
                wp_send_json_error([
                    'message' => 'Insufficient permissions',
                    'code' => 'PERMISSION_DENIED'
                ]);
                return;
            }
            
            // Generate new nonce
            $new_nonce = wp_create_nonce('las_ajax_action');
            
            wp_send_json_success([
                'nonce' => $new_nonce,
                'message' => 'Nonce refreshed successfully'
            ]);
            
        } catch (Exception $e) {
            error_log("LAS Nonce Refresh Exception: " . $e->getMessage());
            wp_send_json_error([
                'message' => 'Failed to refresh nonce',
                'code' => 'NONCE_REFRESH_ERROR'
            ]);
        }
    }
    
    /**
     * Get error statistics
     */
    public function get_error_statistics() {
        try {
            // Verify nonce and capabilities
            if (!wp_verify_nonce($_POST['_ajax_nonce'] ?? '', 'las_ajax_action') || 
                !current_user_can('manage_options')) {
                wp_send_json_error([
                    'message' => 'Security check failed',
                    'code' => 'SECURITY_ERROR'
                ]);
                return;
            }
            
            $stats = get_option('las_error_statistics', [
                'total_errors' => 0,
                'error_types' => [],
                'last_error' => null,
                'first_error' => null
            ]);
            
            // Get recent errors from database
            global $wpdb;
            $table_name = $wpdb->prefix . 'las_error_reports';
            
            $recent_errors = $wpdb->get_results(
                "SELECT error_type, COUNT(*) as count 
                 FROM $table_name 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 GROUP BY error_type
                 ORDER BY count DESC
                 LIMIT 10"
            );
            
            $stats['recent_errors'] = $recent_errors;
            
            wp_send_json_success($stats);
            
        } catch (Exception $e) {
            error_log("LAS Error Statistics Exception: " . $e->getMessage());
            wp_send_json_error([
                'message' => 'Failed to get error statistics',
                'code' => 'STATS_ERROR'
            ]);
        }
    }

    /**
     * Handle batch operations
     */
    public function handle_batch_operations() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            $this->send_success_response(
                ['message' => 'Batch operations not yet implemented'],
                ['operation' => 'batch_operations'],
                'Batch operations endpoint ready'
            );

        } catch (Exception $e) {
            $this->log_error('batch_operations_error', $e);
            $this->send_error_response(
                'Batch operations failed',
                'batch_operations_failed'
            );
        }
    }

    /**
     * Handle batch save settings
     */
    public function handle_batch_save_settings() {
        // Delegate to regular save settings for now
        $this->handle_save_settings();
    }

    /**
     * Handle reset settings
     */
    public function handle_reset_settings() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            // Reset settings to defaults
            $result = $this->storage->reset_settings();

            if ($result) {
                update_option('las_last_settings_reset', current_time('mysql'));
                
                $this->send_success_response(
                    ['reset_at' => current_time('mysql')],
                    ['operation' => 'reset_settings'],
                    'Settings reset to defaults successfully'
                );
            } else {
                $this->send_error_response(
                    'Failed to reset settings',
                    'reset_failed'
                );
            }

        } catch (Exception $e) {
            $this->log_error('reset_settings_error', $e);
            $this->send_error_response(
                'An unexpected error occurred while resetting settings',
                'unexpected_error'
            );
        }
    }

    /**
     * Handle CSS generation
     */
    public function handle_generate_css() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            // Load current settings
            $settings = $this->storage->load_settings();
            
            if ($settings === false) {
                $this->send_error_response(
                    'Failed to load settings for CSS generation',
                    'settings_load_failed'
                );
                return;
            }

            // Generate CSS
            $css = $this->generate_preview_css($settings);

            $this->send_success_response(
                [
                    'css' => $css,
                    'css_length' => strlen($css),
                    'settings_count' => count($settings)
                ],
                ['operation' => 'generate_css'],
                'CSS generated successfully'
            );

        } catch (Exception $e) {
            $this->log_error('generate_css_error', $e);
            $this->send_error_response(
                'CSS generation failed',
                'css_generation_failed'
            );
        }
    }

    /**
     * Handle get debug info
     */
    public function handle_get_debug_info() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            $debug_info = [
                'php_version' => PHP_VERSION,
                'wp_version' => get_bloginfo('version'),
                'plugin_version' => $this->request_metadata['plugin_version'],
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'current_memory' => memory_get_usage(true),
                'peak_memory' => memory_get_peak_usage(true),
                'loaded_extensions' => get_loaded_extensions(),
                'active_plugins' => get_option('active_plugins', []),
                'current_theme' => get_option('current_theme'),
                'multisite' => is_multisite(),
                'debug_mode' => WP_DEBUG,
                'script_debug' => defined('SCRIPT_DEBUG') && SCRIPT_DEBUG
            ];

            $this->send_success_response(
                $debug_info,
                ['operation' => 'get_debug_info'],
                'Debug information retrieved successfully'
            );

        } catch (Exception $e) {
            $this->log_error('get_debug_info_error', $e);
            $this->send_error_response(
                'Failed to retrieve debug information',
                'debug_info_failed'
            );
        }
    }

    /**
     * Handle get performance metrics
     */
    public function handle_get_performance_metrics() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            $metrics = [
                'current_request' => $this->performance_metrics,
                'system_metrics' => [
                    'memory_usage' => memory_get_usage(true),
                    'memory_peak' => memory_get_peak_usage(true),
                    'execution_time' => microtime(true) - $this->request_start_time
                ]
            ];

            $this->send_success_response(
                $metrics,
                ['operation' => 'get_performance_metrics'],
                'Performance metrics retrieved successfully'
            );

        } catch (Exception $e) {
            $this->log_error('get_performance_metrics_error', $e);
            $this->send_error_response(
                'Failed to retrieve performance metrics',
                'performance_metrics_failed'
            );
        }
    }

    /**
     * Handle clear performance logs
     */
    public function handle_clear_performance_logs() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            // Clear performance metrics
            $this->performance_metrics = [];

            $this->send_success_response(
                ['cleared_at' => current_time('mysql')],
                ['operation' => 'clear_performance_logs'],
                'Performance logs cleared successfully'
            );

        } catch (Exception $e) {
            $this->log_error('clear_performance_logs_error', $e);
            $this->send_error_response(
                'Failed to clear performance logs',
                'clear_logs_failed'
            );
        }
    }

    /**
     * Handle validate settings
     */
    public function handle_validate_settings() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            // Get settings to validate
            $settings_json = stripslashes($_POST['settings'] ?? '');
            $settings = json_decode($settings_json, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->send_error_response(
                    'Invalid JSON data provided',
                    'invalid_json'
                );
                return;
            }

            // Validate settings
            $validation_errors = $this->validate_settings_data($settings);

            $this->send_success_response(
                [
                    'valid' => empty($validation_errors),
                    'errors' => $validation_errors,
                    'settings_count' => count($settings)
                ],
                ['operation' => 'validate_settings'],
                empty($validation_errors) ? 'Settings validation passed' : 'Settings validation completed with errors'
            );

        } catch (Exception $e) {
            $this->log_error('validate_settings_error', $e);
            $this->send_error_response(
                'Settings validation failed',
                'validation_failed'
            );
        }
    }

    /**
     * Handle get system status
     */
    public function handle_get_system_status() {
        try {
            // Validate request security
            $security_check = $this->validate_request_security();
            if (is_wp_error($security_check)) {
                $this->send_error_response(
                    $security_check->get_error_message(),
                    $security_check->get_error_code(),
                    [],
                    [],
                    $security_check->get_error_data()['status'] ?? 403
                );
                return;
            }

            $status = [
                'system_health' => 'good',
                'database_connection' => $this->test_database_connection(),
                'file_permissions' => $this->check_file_permissions(),
                'memory_usage' => [
                    'current' => memory_get_usage(true),
                    'peak' => memory_get_peak_usage(true),
                    'limit' => ini_get('memory_limit')
                ],
                'plugin_status' => [
                    'version' => $this->request_metadata['plugin_version'],
                    'active' => true,
                    'settings_loaded' => $this->storage->load_settings() !== false
                ]
            ];

            $this->send_success_response(
                $status,
                ['operation' => 'get_system_status'],
                'System status retrieved successfully'
            );

        } catch (Exception $e) {
            $this->log_error('get_system_status_error', $e);
            $this->send_error_response(
                'Failed to retrieve system status',
                'system_status_failed'
            );
        }
    }

    /**
     * Handle health check
     */
    public function handle_health_check() {
        try {
            $health_status = [
                'status' => 'healthy',
                'timestamp' => current_time('mysql'),
                'checks' => [
                    'database' => $this->test_database_connection(),
                    'memory' => memory_get_usage(true) < (50 * 1024 * 1024), // < 50MB
                    'execution_time' => (microtime(true) - $this->request_start_time) < 1.0 // < 1 second
                ]
            ];

            // Determine overall health
            $all_checks_passed = array_reduce($health_status['checks'], function($carry, $check) {
                return $carry && $check;
            }, true);

            $health_status['status'] = $all_checks_passed ? 'healthy' : 'degraded';

            $this->send_success_response(
                $health_status,
                ['operation' => 'health_check'],
                'Health check completed'
            );

        } catch (Exception $e) {
            $this->log_error('health_check_error', $e);
            $this->send_error_response(
                'Health check failed',
                'health_check_failed'
            );
        }
    }

    /**
     * Test database connection
     */
    private function test_database_connection() {
        global $wpdb;
        
        try {
            $result = $wpdb->get_var("SELECT 1");
            return $result === '1';
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Check file permissions
     */
    private function check_file_permissions() {
        $upload_dir = wp_upload_dir();
        return is_writable($upload_dir['basedir']);
    }
}

// Initialize the AJAX handlers
if (class_exists('LAS_Ajax_Handlers')) {
    new LAS_Ajax_Handlers();
}