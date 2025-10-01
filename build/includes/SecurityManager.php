<?php
/**
 * SecurityManager - Comprehensive security service for Live Admin Styler
 *
 * Provides nonce validation, input sanitization, capability checks, XSS prevention,
 * SQL injection prevention, and comprehensive input validation for all data types.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * SecurityManager class for comprehensive security handling
 */
class LAS_SecurityManager {

    /**
     * Nonce action prefix
     */
    const NONCE_PREFIX = 'las_fresh_';

    /**
     * Maximum CSS length to prevent DoS attacks
     */
    const MAX_CSS_LENGTH = 50000;

    /**
     * Maximum text field length
     */
    const MAX_TEXT_LENGTH = 1000;

    /**
     * Allowed HTML tags for rich text fields
     * @var array
     */
    private $allowed_html_tags = [
        'strong' => [],
        'em' => [],
        'b' => [],
        'i' => [],
        'u' => [],
        'br' => [],
        'p' => ['class' => []],
        'span' => ['class' => [], 'style' => []]
    ];

    /**
     * Dangerous CSS patterns to block
     * @var array
     */
    private $dangerous_css_patterns = [
        'javascript:',
        'expression(',
        '@import',
        'behavior:',
        'binding:',
        'eval(',
        'script:',
        'vbscript:',
        'onload=',
        'onerror=',
        'onclick=',
        'onmouseover=',
        'onfocus=',
        'onblur=',
        'onchange=',
        'onsubmit=',
        'onreset=',
        'onselect=',
        'onunload='
    ];

    /**
     * Valid color formats regex patterns
     * @var array
     */
    private $color_patterns = [
        'hex' => '/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/',
        'rgb' => '/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/',
        'rgba' => '/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/',
        'hsl' => '/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/',
        'hsla' => '/^hsla\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(0|1|0?\.\d+)\s*\)$/'
    ];

    /**
     * Constructor
     */
    public function __construct() {

        $this->init_security_hooks();
    }

    /**
     * Initialize security-related WordPress hooks
     */
    private function init_security_hooks() {

        add_action('admin_init', [$this, 'add_security_headers']);

        add_filter('wp_handle_upload_prefilter', [$this, 'sanitize_upload']);
    }

    /**
     * Validate WordPress nonce
     *
     * @param string $nonce Nonce value
     * @param string $action Action name
     * @return bool True if valid, false otherwise
     */
    public function validateNonce($nonce, $action) {
        if (empty($nonce) || empty($action)) {
            $this->log_security_event('nonce_validation_failed', 'Empty nonce or action');
            return false;
        }

        $full_action = self::NONCE_PREFIX . $action;
        $result = wp_verify_nonce($nonce, $full_action);

        if (!$result) {
            $this->log_security_event('nonce_validation_failed', "Action: {$action}");
        }

        return (bool) $result;
    }

    /**
     * Create WordPress nonce
     *
     * @param string $action Action name
     * @return string Nonce value
     */
    public function createNonce($action) {
        $full_action = self::NONCE_PREFIX . $action;
        return wp_create_nonce($full_action);
    }

    /**
     * Check user capability
     *
     * @param string $capability Capability to check (default: manage_options)
     * @return bool True if user has capability, false otherwise
     */
    public function checkCapability($capability = 'manage_options') {
        $result = current_user_can($capability);

        if (!$result) {
            $this->log_security_event('capability_check_failed', "Capability: {$capability}, User ID: " . get_current_user_id());
        }

        return $result;
    }

    /**
     * Comprehensive input sanitization
     *
     * @param mixed $data Data to sanitize
     * @param string $type Data type (text, email, url, color, css, html, number, boolean)
     * @return mixed Sanitized data
     */
    public function sanitize($data, $type = 'text') {
        if (is_array($data)) {
            return array_map(function($item) use ($type) {
                return $this->sanitize($item, $type);
            }, $data);
        }

        switch ($type) {
            case 'email':
                return sanitize_email($data);

            case 'url':
                return esc_url_raw($data);

            case 'color':
                return $this->sanitizeColor($data);

            case 'css':
                return $this->sanitizeCSS($data);

            case 'html':
                return wp_kses($data, $this->allowed_html_tags);

            case 'number':
                return is_numeric($data) ? (float) $data : 0;

            case 'integer':
                return (int) $data;

            case 'boolean':
                return (bool) $data;

            case 'slug':
                return sanitize_key($data);

            case 'filename':
                return sanitize_file_name($data);

            case 'textarea':
                return sanitize_textarea_field($data);

            case 'text':
            default:
                return sanitize_text_field($data);
        }
    }

    /**
     * Validate input data
     *
     * @param mixed $data Data to validate
     * @param string $type Data type
     * @param array $options Validation options
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    public function validate($data, $type = 'text', $options = []) {
        switch ($type) {
            case 'color':
                return $this->validateColor($data);

            case 'css':
                return $this->validateCSS($data);

            case 'email':
                return is_email($data) ? true : new WP_Error('invalid_email', 'Invalid email format');

            case 'url':
                return filter_var($data, FILTER_VALIDATE_URL) ? true : new WP_Error('invalid_url', 'Invalid URL format');

            case 'number':
                $min = isset($options['min']) ? $options['min'] : null;
                $max = isset($options['max']) ? $options['max'] : null;

                if (!is_numeric($data)) {
                    return new WP_Error('invalid_number', 'Value must be numeric');
                }

                $num = (float) $data;
                if ($min !== null && $num < $min) {
                    return new WP_Error('number_too_small', "Value must be at least {$min}");
                }

                if ($max !== null && $num > $max) {
                    return new WP_Error('number_too_large', "Value must be at most {$max}");
                }

                return true;

            case 'text':
                $max_length = isset($options['max_length']) ? $options['max_length'] : self::MAX_TEXT_LENGTH;

                if (strlen($data) > $max_length) {
                    return new WP_Error('text_too_long', "Text must be at most {$max_length} characters");
                }

                return true;

            default:
                return true;
        }
    }

    /**
     * Sanitize color values
     *
     * @param string $color Color value
     * @return string Sanitized color
     */
    private function sanitizeColor($color) {
        $color = trim($color);

        foreach ($this->color_patterns as $format => $pattern) {
            if (preg_match($pattern, $color)) {
                return $color;
            }
        }

        return '#000000';
    }

    /**
     * Validate color values
     *
     * @param string $color Color value
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    private function validateColor($color) {
        $color = trim($color);

        foreach ($this->color_patterns as $format => $pattern) {
            if (preg_match($pattern, $color)) {

                if (in_array($format, ['rgb', 'rgba'])) {
                    preg_match_all('/\d+/', $color, $matches);
                    foreach (array_slice($matches[0], 0, 3) as $value) {
                        if ((int) $value > 255) {
                            return new WP_Error('invalid_rgb_value', 'RGB values must be between 0 and 255');
                        }
                    }
                }

                if (in_array($format, ['hsl', 'hsla'])) {
                    preg_match_all('/\d+/', $color, $matches);
                    $values = $matches[0];

                    if (isset($values[0]) && (int) $values[0] > 360) {
                        return new WP_Error('invalid_hue_value', 'Hue value must be between 0 and 360');
                    }

                    if (isset($values[1]) && (int) $values[1] > 100) {
                        return new WP_Error('invalid_saturation_value', 'Saturation value must be between 0 and 100');
                    }

                    if (isset($values[2]) && (int) $values[2] > 100) {
                        return new WP_Error('invalid_lightness_value', 'Lightness value must be between 0 and 100');
                    }
                }

                return true;
            }
        }

        return new WP_Error('invalid_color_format', 'Invalid color format');
    }

    /**
     * Sanitize CSS content
     *
     * @param string $css CSS content
     * @return string Sanitized CSS
     */
    private function sanitizeCSS($css) {
        if (strlen($css) > self::MAX_CSS_LENGTH) {
            $css = substr($css, 0, self::MAX_CSS_LENGTH);
        }

        foreach ($this->dangerous_css_patterns as $pattern) {
            $css = str_ireplace($pattern, '', $css);
        }

        $css = strip_tags($css);

        $css = str_replace(chr(0), '', $css);

        return $css;
    }

    /**
     * Validate CSS content
     *
     * @param string $css CSS content
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    private function validateCSS($css) {
        if (strlen($css) > self::MAX_CSS_LENGTH) {
            return new WP_Error('css_too_long', 'CSS content is too long');
        }

        foreach ($this->dangerous_css_patterns as $pattern) {
            if (stripos($css, $pattern) !== false) {
                return new WP_Error('dangerous_css_pattern', "Dangerous CSS pattern detected: {$pattern}");
            }
        }

        if (strpos($css, chr(0)) !== false) {
            return new WP_Error('null_byte_detected', 'Null bytes are not allowed in CSS');
        }

        return true;
    }

    /**
     * Prevent XSS attacks
     *
     * @param string $data Data to escape
     * @param string $context Context (html, attr, js, css, url)
     * @return string Escaped data
     */
    public function escapeOutput($data, $context = 'html') {
        switch ($context) {
            case 'attr':
                return esc_attr($data);

            case 'js':
                return esc_js($data);

            case 'css':

                return preg_replace('/[<>"\'&]/', '', $data);

            case 'url':
                return esc_url($data);

            case 'html':
            default:
                return esc_html($data);
        }
    }

    /**
     * Validate file path to prevent directory traversal
     *
     * @param string $path File path
     * @param string $allowed_base Allowed base directory
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    public function validateFilePath($path, $allowed_base = '') {

        $path = str_replace(chr(0), '', $path);

        if (strpos($path, '..') !== false) {
            return new WP_Error('directory_traversal', 'Directory traversal detected');
        }

        if (empty($allowed_base) && (strpos($path, '/') === 0 || strpos($path, '\\') === 0)) {
            return new WP_Error('absolute_path', 'Absolute paths are not allowed');
        }

        if (!empty($allowed_base)) {
            $real_base = realpath($allowed_base);
            $real_path = realpath($allowed_base . '/' . $path);

            if (!$real_path || strpos($real_path, $real_base) !== 0) {
                return new WP_Error('path_outside_base', 'Path is outside allowed directory');
            }
        }

        return true;
    }

    /**
     * Add security headers
     */
    public function add_security_headers() {
        if (is_admin() && isset($_GET['page']) && strpos($_GET['page'], 'live-admin-styler') !== false) {
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: SAMEORIGIN');
            header('X-XSS-Protection: 1; mode=block');
        }
    }

    /**
     * Sanitize file uploads
     *
     * @param array $file File data
     * @return array Sanitized file data
     */
    public function sanitize_upload($file) {

        $allowed_extensions = ['css', 'txt', 'json'];
        $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($file_extension, $allowed_extensions)) {
            $file['error'] = 'File type not allowed';
            return $file;
        }

        $file['name'] = sanitize_file_name($file['name']);

        return $file;
    }

    /**
     * Log security events
     *
     * @param string $event Event type
     * @param string $details Event details
     */
    private function log_security_event($event, $details = '') {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $user_id = get_current_user_id();
            $ip_address = $this->get_client_ip();
            $timestamp = current_time('mysql');

            error_log(sprintf(
                '[LAS SECURITY] %s - Event: %s, Details: %s, User ID: %d, IP: %s',
                $timestamp,
                $event,
                $details,
                $user_id,
                $ip_address
            ));
        }
    }

    /**
     * Get client IP address
     *
     * @return string Client IP address
     */
    private function get_client_ip() {
        $ip_keys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];

        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }

        return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    }

    /**
     * Rate limiting check
     *
     * @param string $action Action being performed
     * @param int $limit Number of attempts allowed
     * @param int $window Time window in seconds
     * @return bool|WP_Error True if allowed, WP_Error if rate limited
     */
    public function checkRateLimit($action, $limit = 60, $window = 3600) {
        $user_id = get_current_user_id();
        $ip_address = $this->get_client_ip();
        $key = "las_rate_limit_{$action}_{$user_id}_{$ip_address}";

        $attempts = get_transient($key);

        if ($attempts === false) {
            set_transient($key, 1, $window);
            return true;
        }

        if ($attempts >= $limit) {
            $this->log_security_event('rate_limit_exceeded', "Action: {$action}, Attempts: {$attempts}");
            return new WP_Error('rate_limit_exceeded', 'Too many requests. Please try again later.');
        }

        set_transient($key, $attempts + 1, $window);
        return true;
    }

    /**
     * Comprehensive data validation for all plugin operations
     *
     * @param array $data Data to validate
     * @param array $rules Validation rules
     * @return bool|WP_Error True if valid, WP_Error with details if invalid
     */
    public function validateData($data, $rules) {
        $errors = [];

        foreach ($rules as $field => $field_rules) {
            $value = isset($data[$field]) ? $data[$field] : null;

            if (isset($field_rules['required']) && $field_rules['required'] && empty($value)) {
                $errors[$field] = "Field {$field} is required";
                continue;
            }

            if (empty($value) && (!isset($field_rules['required']) || !$field_rules['required'])) {
                continue;
            }

            if (isset($field_rules['type'])) {
                $validation_result = $this->validate($value, $field_rules['type'], $field_rules);
                if (is_wp_error($validation_result)) {
                    $errors[$field] = $validation_result->get_error_message();
                }
            }

            if (isset($field_rules['custom']) && is_callable($field_rules['custom'])) {
                $custom_result = call_user_func($field_rules['custom'], $value);
                if (is_wp_error($custom_result)) {
                    $errors[$field] = $custom_result->get_error_message();
                }
            }
        }

        if (!empty($errors)) {
            return new WP_Error('validation_failed', 'Validation failed', $errors);
        }

        return true;
    }

    /**
     * Sanitize and validate settings data
     *
     * @param array $settings Settings data
     * @return array|WP_Error Sanitized settings or error
     */
    public function validateSettings($settings) {
        $validation_rules = [
            'menu_background_color' => [
                'type' => 'color',
                'required' => false
            ],
            'menu_text_color' => [
                'type' => 'color',
                'required' => false
            ],
            'menu_hover_color' => [
                'type' => 'color',
                'required' => false
            ],
            'adminbar_background_color' => [
                'type' => 'color',
                'required' => false
            ],
            'adminbar_text_color' => [
                'type' => 'color',
                'required' => false
            ],
            'content_background_color' => [
                'type' => 'color',
                'required' => false
            ],
            'custom_css' => [
                'type' => 'css',
                'required' => false,
                'max_length' => self::MAX_CSS_LENGTH
            ],
            'font_size' => [
                'type' => 'number',
                'required' => false,
                'min' => 8,
                'max' => 72
            ],
            'animation_speed' => [
                'type' => 'text',
                'required' => false,
                'custom' => function($value) {
                    $allowed = ['slow', 'normal', 'fast'];
                    return in_array($value, $allowed) ? true : new WP_Error('invalid_animation_speed', 'Invalid animation speed');
                }
            ],
            'theme_mode' => [
                'type' => 'text',
                'required' => false,
                'custom' => function($value) {
                    $allowed = ['auto', 'light', 'dark'];
                    return in_array($value, $allowed) ? true : new WP_Error('invalid_theme_mode', 'Invalid theme mode');
                }
            ]
        ];

        $validation_result = $this->validateData($settings, $validation_rules);
        if (is_wp_error($validation_result)) {
            return $validation_result;
        }

        $sanitized = [];
        foreach ($settings as $key => $value) {
            if (isset($validation_rules[$key])) {
                $type = $validation_rules[$key]['type'];
                $sanitized[$key] = $this->sanitize($value, $type);
            } else {

                $sanitized[$key] = $this->sanitize($value, 'text');
            }
        }

        return $sanitized;
    }

    /**
     * Validate AJAX request data
     *
     * @param array $data Request data
     * @param string $action Action being performed
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    public function validateAjaxRequest($data, $action) {

        if (!isset($data['nonce']) || !$this->validateNonce($data['nonce'], $action)) {
            return new WP_Error('invalid_nonce', 'Security check failed');
        }

        if (!$this->checkCapability()) {
            return new WP_Error('insufficient_capability', 'Insufficient permissions');
        }

        $rate_limit_result = $this->checkRateLimit($action, 100, 3600);
        if (is_wp_error($rate_limit_result)) {
            return $rate_limit_result;
        }

        switch ($action) {
            case 'save_settings':
                if (!isset($data['settings']) || !is_array($data['settings'])) {
                    return new WP_Error('invalid_settings_data', 'Invalid settings data');
                }
                return $this->validateSettings($data['settings']);

            case 'save_template':
                if (!isset($data['template_data']) || !is_array($data['template_data'])) {
                    return new WP_Error('invalid_template_data', 'Invalid template data');
                }
                return $this->validateTemplateData($data['template_data']);

            case 'upload_template':
                if (!isset($data['template_json'])) {
                    return new WP_Error('missing_template_json', 'Template JSON data is required');
                }
                return $this->validateTemplateJSON($data['template_json']);

            default:
                return true;
        }
    }

    /**
     * Validate template data
     *
     * @param array $template_data Template data
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    private function validateTemplateData($template_data) {
        $required_fields = ['name', 'settings'];

        foreach ($required_fields as $field) {
            if (!isset($template_data[$field])) {
                return new WP_Error('missing_template_field', "Template field {$field} is required");
            }
        }

        if (strlen($template_data['name']) > 100) {
            return new WP_Error('template_name_too_long', 'Template name must be 100 characters or less');
        }

        return $this->validateSettings($template_data['settings']);
    }

    /**
     * Validate template JSON data
     *
     * @param string $json JSON string
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    private function validateTemplateJSON($json) {

        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('invalid_json', 'Invalid JSON format');
        }

        if (strlen($json) > 100000) {
            return new WP_Error('json_too_large', 'Template JSON is too large');
        }

        return $this->validateTemplateData($data);
    }

    /**
     * Prevent SQL injection by validating database queries
     *
     * @param string $query SQL query
     * @param array $allowed_tables Allowed table names
     * @return bool|WP_Error True if safe, WP_Error if dangerous
     */
    public function validateSQLQuery($query, $allowed_tables = []) {

        $query_lower = strtolower($query);

        $dangerous_patterns = [
            'union select',
            'drop table',
            'drop database',
            'truncate',
            'delete from',
            'update.*set',
            'insert into',
            'create table',
            'alter table',
            'grant',
            'revoke',
            'exec',
            'execute',
            'sp_',
            'xp_',
            'cmdshell',
            'benchmark',
            'sleep(',
            'waitfor',
            'load_file',
            'into outfile',
            'into dumpfile'
        ];

        foreach ($dangerous_patterns as $pattern) {
            if (strpos($query_lower, $pattern) !== false) {
                $this->log_security_event('dangerous_sql_pattern', "Pattern: {$pattern}, Query: " . substr($query, 0, 100));
                return new WP_Error('dangerous_sql_pattern', 'Dangerous SQL pattern detected');
            }
        }

        if (!empty($allowed_tables)) {
            foreach ($allowed_tables as $table) {
                if (strpos($query_lower, strtolower($table)) === false) {
                    return new WP_Error('unauthorized_table_access', 'Unauthorized table access detected');
                }
            }
        }

        return true;
    }

    /**
     * Enhanced XSS prevention with context-aware escaping
     *
     * @param mixed $data Data to escape
     * @param string $context Output context
     * @return mixed Escaped data
     */
    public function preventXSS($data, $context = 'html') {
        if (is_array($data)) {
            return array_map(function($item) use ($context) {
                return $this->preventXSS($item, $context);
            }, $data);
        }

        if ($this->detectXSSAttempt($data)) {
            $this->log_security_event('xss_attempt_detected', substr($data, 0, 200));
        }

        return $this->escapeOutput($data, $context);
    }

    /**
     * Detect potential XSS attempts
     *
     * @param string $data Data to check
     * @return bool True if XSS attempt detected
     */
    private function detectXSSAttempt($data) {
        $xss_patterns = [
            '<script',
            'javascript:',
            'onload=',
            'onerror=',
            'onclick=',
            'onmouseover=',
            'onfocus=',
            'onblur=',
            'onchange=',
            'onsubmit=',
            'eval(',
            'expression(',
            'vbscript:',
            'data:text/html',
            'data:application/javascript'
        ];

        $data_lower = strtolower($data);
        foreach ($xss_patterns as $pattern) {
            if (strpos($data_lower, $pattern) !== false) {
                return true;
            }
        }

        return false;
    }
}