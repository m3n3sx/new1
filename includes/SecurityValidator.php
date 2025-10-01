<?php
/**
 * Live Admin Styler - Security Validator
 * 
 * Comprehensive input validation and sanitization for security protection.
 * Handles color validation, CSS sanitization, XSS prevention, and access control.
 * 
 * @package LiveAdminStyler
 * @version 1.2.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Security Validator class for Live Admin Styler
 * 
 * Provides comprehensive input sanitization, validation, and security checks
 * to prevent XSS, SQL injection, and other security vulnerabilities.
 */
class LAS_Security_Validator {
    
    /**
     * Rate limiting storage
     * @var array
     */
    private $rate_limits = [];
    
    /**
     * Action-specific capability requirements
     * @var array
     */
    private $action_capabilities = [
        'save_settings' => 'manage_options',
        'load_settings' => 'edit_theme_options',
        'get_preview_css' => 'edit_theme_options',
        'reset_settings' => 'manage_options',
        'export_settings' => 'export',
        'import_settings' => 'import',
        'batch_operations' => 'manage_options',
        'get_system_info' => 'manage_options'
    ];
    
    /**
     * Rate limit configurations per action
     * @var array
     */
    private $rate_limit_config = [
        'save_settings' => ['requests' => 30, 'window' => 60], // 30 requests per minute
        'load_settings' => ['requests' => 60, 'window' => 60], // 60 requests per minute
        'get_preview_css' => ['requests' => 120, 'window' => 60], // 120 requests per minute
        'reset_settings' => ['requests' => 5, 'window' => 300], // 5 requests per 5 minutes
        'export_settings' => ['requests' => 10, 'window' => 300], // 10 requests per 5 minutes
        'import_settings' => ['requests' => 5, 'window' => 300], // 5 requests per 5 minutes
        'batch_operations' => ['requests' => 10, 'window' => 60], // 10 requests per minute
        'default' => ['requests' => 60, 'window' => 60] // Default rate limit
    ];
    
    /**
     * Allowed CSS properties for sanitization
     * @var array
     */
    private $allowed_css_properties = [
        'color', 'background-color', 'background', 'background-image',
        'font-size', 'font-family', 'font-weight', 'font-style',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-color', 'border-width', 'border-style', 'border-radius',
        'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
        'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
        'opacity', 'visibility', 'overflow', 'text-align', 'text-decoration',
        'line-height', 'letter-spacing', 'word-spacing', 'text-transform',
        'box-shadow', 'text-shadow', 'transform', 'transition'
    ];
    
    /**
     * Dangerous CSS patterns to remove
     * @var array
     */
    private $dangerous_css_patterns = [
        '/javascript\s*:/i',
        '/expression\s*\(/i',
        '/@import/i',
        '/behavior\s*:/i',
        '/-moz-binding/i',
        '/vbscript\s*:/i',
        '/data\s*:/i',
        '/url\s*\(\s*["\']?\s*javascript/i',
        '/url\s*\(\s*["\']?\s*data/i',
        '/url\s*\(\s*["\']?\s*vbscript/i'
    ];
    
    /**
     * Verify WordPress nonce with automatic refresh capability
     * 
     * @param string $nonce Nonce value to verify
     * @param string $action Nonce action
     * @return array Result with status and new nonce if refreshed
     */
    public function verify_nonce($nonce, $action) {
        if (empty($nonce) || empty($action)) {
            return [
                'valid' => false,
                'error' => 'missing_nonce_or_action',
                'message' => 'Nonce or action parameter is missing'
            ];
        }
        
        $verification = wp_verify_nonce($nonce, $action);
        
        if ($verification === 1) {
            // Nonce is valid and fresh
            return [
                'valid' => true,
                'fresh' => true,
                'nonce' => $nonce
            ];
        } elseif ($verification === 2) {
            // Nonce is valid but older than 12 hours, refresh it
            $new_nonce = $this->refresh_nonce($action);
            return [
                'valid' => true,
                'fresh' => false,
                'refreshed' => true,
                'nonce' => $new_nonce,
                'message' => 'Nonce was refreshed due to age'
            ];
        } else {
            // Nonce is invalid
            return [
                'valid' => false,
                'error' => 'invalid_nonce',
                'message' => 'Security token is invalid or expired'
            ];
        }
    }
    
    /**
     * Refresh WordPress nonce for given action
     * 
     * @param string $action Nonce action
     * @return string New nonce value
     */
    public function refresh_nonce($action) {
        return wp_create_nonce($action);
    }
    
    /**
     * Get fresh nonce for action
     * 
     * @param string $action Nonce action
     * @return string Fresh nonce value
     */
    public function get_fresh_nonce($action) {
        return wp_create_nonce($action);
    }
    
    /**
     * Check if current user has required capabilities with granular action-based checking
     * 
     * @param string $action AJAX action name
     * @param string $capability Optional specific capability to check
     * @return array Result with capability check status and details
     */
    public function check_capabilities($action, $capability = null) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return [
                'valid' => false,
                'error' => 'not_logged_in',
                'message' => 'User must be logged in to perform this action'
            ];
        }
        
        // Use specific capability if provided, otherwise get from action mapping
        $required_capability = $capability ?: $this->get_required_capability($action);
        
        if (!$required_capability) {
            return [
                'valid' => false,
                'error' => 'unknown_action',
                'message' => 'Unknown action or capability requirement'
            ];
        }
        
        $has_capability = current_user_can($required_capability);
        
        if (!$has_capability) {
            return [
                'valid' => false,
                'error' => 'insufficient_permissions',
                'message' => "User lacks required capability: {$required_capability}",
                'required_capability' => $required_capability,
                'user_id' => $user_id
            ];
        }
        
        return [
            'valid' => true,
            'capability' => $required_capability,
            'user_id' => $user_id
        ];
    }
    
    /**
     * Get required capability for specific action
     * 
     * @param string $action AJAX action name
     * @return string|null Required capability or null if unknown
     */
    public function get_required_capability($action) {
        return $this->action_capabilities[$action] ?? $this->action_capabilities['default'] ?? 'manage_options';
    }
    
    /**
     * Add or update capability requirement for action
     * 
     * @param string $action AJAX action name
     * @param string $capability Required capability
     * @return void
     */
    public function set_action_capability($action, $capability) {
        $this->action_capabilities[$action] = $capability;
    }
    
    /**
     * Check if current user has required capabilities (legacy method for backward compatibility)
     * 
     * @param string $capability Required capability (default: manage_options)
     * @return bool True if user has capability, false otherwise
     */
    public function check_capability($capability = 'manage_options') {
        return current_user_can($capability);
    }
    
    /**
     * Sanitize array of settings with type-specific validation
     * 
     * @param array $settings Raw settings array
     * @return array Sanitized settings array
     */
    public function sanitize_settings($settings) {
        if (!is_array($settings)) {
            return [];
        }
        
        $sanitized = [];
        
        foreach ($settings as $key => $value) {
            $clean_key = $this->sanitize_setting_key($key);
            if (!empty($clean_key)) {
                $sanitized[$clean_key] = $this->sanitize_setting_value($clean_key, $value);
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize setting key
     * 
     * @param string $key Raw setting key
     * @return string Sanitized key
     */
    private function sanitize_setting_key($key) {
        // Only allow alphanumeric characters, underscores, and hyphens
        $clean_key = preg_replace('/[^a-zA-Z0-9_-]/', '', $key);
        
        // Limit length to prevent abuse
        return substr($clean_key, 0, 100);
    }
    
    /**
     * Sanitize setting value based on key type
     * 
     * @param string $key Setting key
     * @param mixed $value Raw value
     * @return mixed Sanitized value
     */
    public function sanitize_setting_value($key, $value) {
        $type = $this->get_setting_type($key);
        
        switch ($type) {
            case 'color':
                return $this->sanitize_color($value);
                
            case 'css':
                return $this->sanitize_css($value);
                
            case 'url':
                return $this->sanitize_url($value);
                
            case 'number':
                return $this->sanitize_number($value);
                
            case 'boolean':
                return $this->sanitize_boolean($value);
                
            case 'select':
                return $this->sanitize_select($key, $value);
                
            case 'textarea':
                return $this->sanitize_textarea($value);
                
            case 'text':
            default:
                return $this->sanitize_text($value);
        }
    }
    
    /**
     * Determine setting type based on key
     * 
     * @param string $key Setting key
     * @return string Setting type
     */
    private function get_setting_type($key) {
        // Color settings
        if (strpos($key, '_color') !== false || strpos($key, '_gradient_color') !== false) {
            return 'color';
        }
        
        // CSS settings
        if (strpos($key, 'custom_css') !== false || strpos($key, '_shadow') !== false) {
            return 'css';
        }
        
        // URL settings
        if (strpos($key, '_logo') !== false || strpos($key, '_url') !== false || strpos($key, '_image') !== false) {
            return 'url';
        }
        
        // Number settings
        if (strpos($key, '_size') !== false || strpos($key, '_width') !== false || 
            strpos($key, '_height') !== false || strpos($key, '_radius') !== false ||
            strpos($key, '_margin') !== false || strpos($key, '_padding') !== false ||
            strpos($key, '_offset') !== false || strpos($key, '_blur') !== false ||
            strpos($key, '_spread') !== false) {
            return 'number';
        }
        
        // Boolean settings
        if (strpos($key, 'enable_') === 0 || strpos($key, '_enabled') !== false ||
            in_array($key, ['admin_menu_detached', 'admin_bar_detached'])) {
            return 'boolean';
        }
        
        // Select settings
        if (strpos($key, '_type') !== false || strpos($key, '_family') !== false ||
            strpos($key, '_style') !== false) {
            return 'select';
        }
        
        // Textarea settings
        if (strpos($key, '_description') !== false || strpos($key, '_content') !== false) {
            return 'textarea';
        }
        
        return 'text';
    }
    
    /**
     * Sanitize color values (hex, rgb, rgba, hsl, hsla)
     * 
     * @param string $color Raw color value
     * @return string Sanitized color value
     */
    public function sanitize_color($color) {
        if (empty($color)) {
            return '';
        }
        
        $color = trim($color);
        
        // Validate hex color format (#fff, #ffffff)
        if (preg_match('/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $color)) {
            return strtolower($color);
        }
        
        // Validate RGB format (rgb(255, 255, 255))
        if (preg_match('/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i', $color, $matches)) {
            $r = min(255, max(0, intval($matches[1])));
            $g = min(255, max(0, intval($matches[2])));
            $b = min(255, max(0, intval($matches[3])));
            return "rgb($r, $g, $b)";
        }
        
        // Validate RGBA format (rgba(255, 255, 255, 0.5))
        if (preg_match('/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i', $color, $matches)) {
            $r = min(255, max(0, intval($matches[1])));
            $g = min(255, max(0, intval($matches[2])));
            $b = min(255, max(0, intval($matches[3])));
            $a = min(1, max(0, floatval($matches[4])));
            return "rgba($r, $g, $b, $a)";
        }
        
        // Validate HSL format (hsl(360, 100%, 50%))
        if (preg_match('/^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i', $color, $matches)) {
            $h = min(360, max(0, intval($matches[1])));
            $s = min(100, max(0, intval($matches[2])));
            $l = min(100, max(0, intval($matches[3])));
            return "hsl($h, $s%, $l%)";
        }
        
        // Validate HSLA format (hsla(360, 100%, 50%, 0.5))
        if (preg_match('/^hsla\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d.]+)\s*\)$/i', $color, $matches)) {
            $h = min(360, max(0, intval($matches[1])));
            $s = min(100, max(0, intval($matches[2])));
            $l = min(100, max(0, intval($matches[3])));
            $a = min(1, max(0, floatval($matches[4])));
            return "hsla($h, $s%, $l%, $a)";
        }
        
        // Validate named colors
        $named_colors = [
            'transparent', 'inherit', 'initial', 'unset',
            'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
            'gray', 'grey', 'darkgray', 'darkgrey', 'lightgray', 'lightgrey',
            'orange', 'purple', 'brown', 'pink', 'lime', 'navy', 'teal', 'silver'
        ];
        
        if (in_array(strtolower($color), $named_colors)) {
            return strtolower($color);
        }
        
        // Return empty string for invalid colors
        return '';
    }
    
    /**
     * Sanitize CSS content
     * 
     * @param string $css Raw CSS content
     * @return string Sanitized CSS content
     */
    public function sanitize_css($css) {
        if (empty($css)) {
            return '';
        }
        
        // Remove dangerous patterns
        foreach ($this->dangerous_css_patterns as $pattern) {
            $css = preg_replace($pattern, '', $css);
        }
        
        // Remove HTML tags
        $css = wp_strip_all_tags($css);
        
        // Remove comments
        $css = preg_replace('/\/\*.*?\*\//s', '', $css);
        
        // Validate CSS properties (basic validation)
        $css_rules = explode(';', $css);
        $safe_css = '';
        
        foreach ($css_rules as $rule) {
            $rule = trim($rule);
            if (empty($rule)) continue;
            
            if (strpos($rule, ':') !== false) {
                list($property, $value) = explode(':', $rule, 2);
                $property = trim(strtolower($property));
                $value = trim($value);
                
                // Only allow safe CSS properties
                if (in_array($property, $this->allowed_css_properties) && !empty($value)) {
                    // Additional validation for specific properties
                    if ($this->validate_css_value($property, $value)) {
                        $safe_css .= $property . ': ' . $value . '; ';
                    }
                }
            }
        }
        
        return trim($safe_css);
    }
    
    /**
     * Validate CSS property values
     * 
     * @param string $property CSS property name
     * @param string $value CSS property value
     * @return bool True if valid, false otherwise
     */
    private function validate_css_value($property, $value) {
        // Remove any remaining dangerous patterns
        foreach ($this->dangerous_css_patterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return false;
            }
        }
        
        // Color properties
        if (in_array($property, ['color', 'background-color', 'border-color'])) {
            return !empty($this->sanitize_color($value));
        }
        
        // Size properties
        if (strpos($property, 'size') !== false || strpos($property, 'width') !== false || 
            strpos($property, 'height') !== false || strpos($property, 'margin') !== false ||
            strpos($property, 'padding') !== false) {
            return preg_match('/^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch)?$/i', $value);
        }
        
        // Font family
        if ($property === 'font-family') {
            return preg_match('/^[a-zA-Z0-9\s\-_,"\'\(\)]+$/', $value);
        }
        
        // Generic validation - allow alphanumeric, spaces, and common CSS characters
        return preg_match('/^[a-zA-Z0-9\s\-_#%.,()]+$/', $value);
    }
    
    /**
     * Sanitize URL values
     * 
     * @param string $url Raw URL
     * @return string Sanitized URL
     */
    public function sanitize_url($url) {
        if (empty($url)) {
            return '';
        }
        
        // Use WordPress built-in URL sanitization
        $clean_url = esc_url_raw($url);
        
        // Additional validation - only allow http, https, and data URLs for images
        if (!preg_match('/^(https?:\/\/|data:image\/)/i', $clean_url)) {
            return '';
        }
        
        return $clean_url;
    }
    
    /**
     * Sanitize numeric values
     * 
     * @param mixed $value Raw numeric value
     * @return int Sanitized integer
     */
    public function sanitize_number($value) {
        if (is_numeric($value)) {
            return intval($value);
        }
        
        return 0;
    }
    
    /**
     * Sanitize boolean values
     * 
     * @param mixed $value Raw boolean value
     * @return bool Sanitized boolean
     */
    public function sanitize_boolean($value) {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
    
    /**
     * Sanitize select/dropdown values
     * 
     * @param string $key Setting key
     * @param string $value Raw value
     * @return string Sanitized value
     */
    public function sanitize_select($key, $value) {
        $allowed_values = $this->get_allowed_select_values($key);
        
        if (in_array($value, $allowed_values)) {
            return sanitize_text_field($value);
        }
        
        // Return first allowed value as default
        return !empty($allowed_values) ? $allowed_values[0] : '';
    }
    
    /**
     * Get allowed values for select fields
     * 
     * @param string $key Setting key
     * @return array Allowed values
     */
    private function get_allowed_select_values($key) {
        $select_options = [
            'admin_menu_bg_type' => ['solid', 'gradient', 'image'],
            'admin_bar_bg_type' => ['solid', 'gradient', 'image'],
            'body_bg_type' => ['solid', 'gradient', 'image'],
            'admin_menu_font_family' => ['default', 'arial', 'helvetica', 'times', 'courier', 'georgia', 'verdana', 'google'],
            'admin_bar_font_family' => ['default', 'arial', 'helvetica', 'times', 'courier', 'georgia', 'verdana', 'google'],
            'body_font_family' => ['default', 'arial', 'helvetica', 'times', 'courier', 'georgia', 'verdana', 'google'],
            'admin_menu_shadow_type' => ['none', 'basic', 'advanced'],
            'admin_bar_shadow_type' => ['none', 'basic', 'advanced']
        ];
        
        return $select_options[$key] ?? [];
    }
    
    /**
     * Sanitize textarea content
     * 
     * @param string $value Raw textarea content
     * @return string Sanitized content
     */
    public function sanitize_textarea($value) {
        return sanitize_textarea_field($value);
    }
    
    /**
     * Sanitize text content
     * 
     * @param string $value Raw text content
     * @return string Sanitized content
     */
    public function sanitize_text($value) {
        return sanitize_text_field($value);
    }
    
    /**
     * Validate and sanitize AJAX input
     * 
     * @param mixed $input Raw input
     * @param string $type Expected input type
     * @param mixed $default Default value if validation fails
     * @return mixed Sanitized input
     */
    public function sanitize_ajax_input($input, $type = 'text', $default = '') {
        switch ($type) {
            case 'json':
                $decoded = json_decode($input, true);
                return (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : $default;
                
            case 'int':
            case 'integer':
                return is_numeric($input) ? intval($input) : $default;
                
            case 'float':
                return is_numeric($input) ? floatval($input) : $default;
                
            case 'bool':
            case 'boolean':
                return filter_var($input, FILTER_VALIDATE_BOOLEAN);
                
            case 'email':
                return is_email($input) ? sanitize_email($input) : $default;
                
            case 'url':
                return $this->sanitize_url($input);
                
            case 'color':
                return $this->sanitize_color($input);
                
            case 'css':
                return $this->sanitize_css($input);
                
            case 'key':
                return sanitize_key($input);
                
            case 'textarea':
                return sanitize_textarea_field($input);
                
            case 'text':
            default:
                return sanitize_text_field($input);
        }
    }
    
    /**
     * Check for SQL injection patterns
     * 
     * @param string $input Input to check
     * @return bool True if potentially dangerous, false if safe
     */
    public function has_sql_injection($input) {
        $dangerous_patterns = [
            '/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i',
            '/(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i',
            '/[\'";].*(\bOR\b|\bAND\b).*[\'";]/i',
            '/\b(EXEC|EXECUTE)\b/i',
            '/\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b/i'
        ];
        
        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Enhanced rate limiting system with user-based and IP-based tracking
     * 
     * @param string $action Action name
     * @param array $options Rate limiting options
     * @return array Rate limit check result
     */
    public function check_rate_limit($action, $options = []) {
        $config = $this->get_rate_limit_config($action);
        $user_id = get_current_user_id();
        $ip_address = $this->get_client_ip();
        $current_time = time();
        $window_start = floor($current_time / $config['window']) * $config['window'];
        
        // Check user-based rate limit
        $user_result = $this->check_user_rate_limit($action, $user_id, $config, $window_start);
        
        // Check IP-based rate limit (stricter for anonymous users)
        $ip_result = $this->check_ip_rate_limit($action, $ip_address, $config, $window_start);
        
        // Determine overall result
        $is_limited = !$user_result['allowed'] || !$ip_result['allowed'];
        
        $result = [
            'allowed' => !$is_limited,
            'action' => $action,
            'user_id' => $user_id,
            'ip_address' => $this->anonymize_ip($ip_address),
            'window_start' => $window_start,
            'window_duration' => $config['window'],
            'user_requests' => $user_result['count'],
            'ip_requests' => $ip_result['count'],
            'user_limit' => $config['requests'],
            'ip_limit' => $config['requests'] * 2, // IP limit is typically higher
            'reset_time' => $window_start + $config['window']
        ];
        
        if ($is_limited) {
            $result['error'] = 'rate_limit_exceeded';
            $result['message'] = $this->get_rate_limit_message($action, $result);
            $result['retry_after'] = $result['reset_time'] - $current_time;
        }
        
        // Log rate limit violations
        if ($is_limited) {
            $this->log_rate_limit_violation($result);
        }
        
        return $result;
    }
    
    /**
     * Check user-based rate limit
     * 
     * @param string $action Action name
     * @param int $user_id User ID
     * @param array $config Rate limit configuration
     * @param int $window_start Window start timestamp
     * @return array Rate limit result
     */
    private function check_user_rate_limit($action, $user_id, $config, $window_start) {
        $key = "las_rate_limit_user_{$action}_{$user_id}_{$window_start}";
        $count = (int) get_transient($key);
        $count++;
        
        // Store updated count with expiration
        set_transient($key, $count, $config['window'] + 60);
        
        return [
            'allowed' => $count <= $config['requests'],
            'count' => $count,
            'limit' => $config['requests']
        ];
    }
    
    /**
     * Check IP-based rate limit
     * 
     * @param string $action Action name
     * @param string $ip_address IP address
     * @param array $config Rate limit configuration
     * @param int $window_start Window start timestamp
     * @return array Rate limit result
     */
    private function check_ip_rate_limit($action, $ip_address, $config, $window_start) {
        $ip_hash = hash('sha256', $ip_address . 'las_salt');
        $key = "las_rate_limit_ip_{$action}_{$ip_hash}_{$window_start}";
        $count = (int) get_transient($key);
        $count++;
        
        // IP limits are typically higher to account for shared IPs
        $ip_limit = $config['requests'] * 2;
        
        // Store updated count with expiration
        set_transient($key, $count, $config['window'] + 60);
        
        return [
            'allowed' => $count <= $ip_limit,
            'count' => $count,
            'limit' => $ip_limit
        ];
    }
    
    /**
     * Get rate limit configuration for action
     * 
     * @param string $action Action name
     * @return array Rate limit configuration
     */
    private function get_rate_limit_config($action) {
        return $this->rate_limit_config[$action] ?? $this->rate_limit_config['default'];
    }
    
    /**
     * Get client IP address with proxy support
     * 
     * @return string Client IP address
     */
    private function get_client_ip() {
        $ip_headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_CLIENT_IP',            // Proxy
            'HTTP_X_FORWARDED_FOR',      // Load balancer/proxy
            'HTTP_X_FORWARDED',          // Proxy
            'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster
            'HTTP_FORWARDED_FOR',        // Proxy
            'HTTP_FORWARDED',            // Proxy
            'REMOTE_ADDR'                // Standard
        ];
        
        foreach ($ip_headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];
                
                // Handle comma-separated IPs (X-Forwarded-For)
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                
                // Validate IP address
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    /**
     * Anonymize IP address for privacy
     * 
     * @param string $ip IP address
     * @return string Anonymized IP address
     */
    private function anonymize_ip($ip) {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            // IPv4: mask last octet
            return preg_replace('/\.\d+$/', '.xxx', $ip);
        } elseif (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            // IPv6: mask last 64 bits
            return preg_replace('/:[^:]+:[^:]+:[^:]+:[^:]+$/', ':xxxx:xxxx:xxxx:xxxx', $ip);
        }
        
        return 'unknown';
    }
    
    /**
     * Get rate limit error message
     * 
     * @param string $action Action name
     * @param array $result Rate limit result
     * @return string Error message
     */
    private function get_rate_limit_message($action, $result) {
        $retry_minutes = ceil($result['retry_after'] / 60);
        
        return sprintf(
            'Rate limit exceeded for action "%s". Please wait %d minute(s) before trying again.',
            $action,
            $retry_minutes
        );
    }
    
    /**
     * Log rate limit violation
     * 
     * @param array $result Rate limit result
     * @return void
     */
    private function log_rate_limit_violation($result) {
        if (class_exists('LAS_Error_Logger')) {
            $logger = new LAS_Error_Logger();
            $logger->log_security_event('rate_limit_violation', [
                'action' => $result['action'],
                'user_id' => $result['user_id'],
                'ip_address' => $result['ip_address'],
                'user_requests' => $result['user_requests'],
                'ip_requests' => $result['ip_requests'],
                'user_limit' => $result['user_limit'],
                'ip_limit' => $result['ip_limit']
            ]);
        }
    }
    
    /**
     * Set custom rate limit for action
     * 
     * @param string $action Action name
     * @param int $requests Maximum requests
     * @param int $window Time window in seconds
     * @return void
     */
    public function set_rate_limit($action, $requests, $window) {
        $this->rate_limit_config[$action] = [
            'requests' => $requests,
            'window' => $window
        ];
    }
    
    /**
     * Comprehensive AJAX request validation and sanitization
     * 
     * @param array $request Raw request data
     * @param string $action AJAX action name
     * @return array Validation result with sanitized data
     */
    public function validate_ajax_request($request, $action) {
        $result = [
            'valid' => false,
            'data' => [],
            'errors' => [],
            'warnings' => []
        ];
        
        // Check if request is array
        if (!is_array($request)) {
            $result['errors'][] = [
                'code' => 'invalid_request_format',
                'message' => 'Request must be an array'
            ];
            return $result;
        }
        
        // Validate nonce if present
        if (isset($request['nonce'])) {
            $nonce_result = $this->verify_nonce($request['nonce'], $action);
            if (!$nonce_result['valid']) {
                $result['errors'][] = [
                    'code' => $nonce_result['error'],
                    'message' => $nonce_result['message']
                ];
                return $result;
            }
            
            if (isset($nonce_result['refreshed'])) {
                $result['new_nonce'] = $nonce_result['nonce'];
                $result['warnings'][] = [
                    'code' => 'nonce_refreshed',
                    'message' => $nonce_result['message']
                ];
            }
        }
        
        // Check capabilities
        $capability_result = $this->check_capabilities($action);
        if (!$capability_result['valid']) {
            $result['errors'][] = [
                'code' => $capability_result['error'],
                'message' => $capability_result['message']
            ];
            return $result;
        }
        
        // Check rate limits
        $rate_limit_result = $this->check_rate_limit($action);
        if (!$rate_limit_result['allowed']) {
            $result['errors'][] = [
                'code' => $rate_limit_result['error'],
                'message' => $rate_limit_result['message'],
                'retry_after' => $rate_limit_result['retry_after']
            ];
            return $result;
        }
        
        // Sanitize request data
        $sanitized_data = $this->sanitize_request_data($request, $action);
        
        // Check for SQL injection patterns
        if ($this->contains_malicious_patterns($sanitized_data)) {
            $result['errors'][] = [
                'code' => 'malicious_input_detected',
                'message' => 'Potentially malicious input detected'
            ];
            $this->log_security_event('malicious_input_attempt', [
                'action' => $action,
                'user_id' => get_current_user_id(),
                'ip_address' => $this->anonymize_ip($this->get_client_ip())
            ]);
            return $result;
        }
        
        $result['valid'] = true;
        $result['data'] = $sanitized_data;
        
        return $result;
    }
    
    /**
     * Sanitize request data based on action and field types
     * 
     * @param array $data Raw request data
     * @param string $action AJAX action name
     * @return array Sanitized data
     */
    private function sanitize_request_data($data, $action) {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            $clean_key = $this->sanitize_setting_key($key);
            if (empty($clean_key)) {
                continue;
            }
            
            // Skip internal fields
            if (in_array($clean_key, ['nonce', 'action', '_wpnonce', '_wp_http_referer'])) {
                $sanitized[$clean_key] = sanitize_text_field($value);
                continue;
            }
            
            // Apply action-specific sanitization rules
            $sanitized[$clean_key] = $this->apply_action_sanitization($clean_key, $value, $action);
        }
        
        return $sanitized;
    }
    
    /**
     * Apply action-specific sanitization rules
     * 
     * @param string $key Field key
     * @param mixed $value Field value
     * @param string $action AJAX action name
     * @return mixed Sanitized value
     */
    private function apply_action_sanitization($key, $value, $action) {
        // Action-specific sanitization rules
        switch ($action) {
            case 'save_settings':
                return $this->sanitize_setting_value($key, $value);
                
            case 'import_settings':
                if ($key === 'settings_data') {
                    return $this->sanitize_import_data($value);
                }
                return $this->sanitize_setting_value($key, $value);
                
            case 'batch_operations':
                if ($key === 'operations') {
                    return $this->sanitize_batch_operations($value);
                }
                return $this->sanitize_setting_value($key, $value);
                
            case 'get_preview_css':
                if ($key === 'settings') {
                    return $this->sanitize_settings($value);
                }
                return $this->sanitize_ajax_input($value, 'text');
                
            default:
                return $this->sanitize_setting_value($key, $value);
        }
    }
    
    /**
     * Sanitize import data
     * 
     * @param mixed $data Import data
     * @return array Sanitized import data
     */
    private function sanitize_import_data($data) {
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return [];
            }
            $data = $decoded;
        }
        
        if (!is_array($data)) {
            return [];
        }
        
        return $this->sanitize_settings($data);
    }
    
    /**
     * Sanitize batch operations
     * 
     * @param mixed $operations Batch operations data
     * @return array Sanitized operations
     */
    private function sanitize_batch_operations($operations) {
        if (!is_array($operations)) {
            return [];
        }
        
        $sanitized = [];
        foreach ($operations as $operation) {
            if (!is_array($operation) || !isset($operation['type'])) {
                continue;
            }
            
            $sanitized_op = [
                'type' => sanitize_key($operation['type']),
                'data' => isset($operation['data']) ? $this->sanitize_settings($operation['data']) : []
            ];
            
            if (isset($operation['id'])) {
                $sanitized_op['id'] = sanitize_text_field($operation['id']);
            }
            
            $sanitized[] = $sanitized_op;
        }
        
        return $sanitized;
    }
    
    /**
     * Check for malicious patterns in data
     * 
     * @param array $data Data to check
     * @return bool True if malicious patterns found
     */
    private function contains_malicious_patterns($data) {
        $malicious_patterns = [
            // SQL injection patterns
            '/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i',
            '/(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i',
            '/[\'";].*(\bOR\b|\bAND\b).*[\'";]/i',
            '/\b(EXEC|EXECUTE)\b/i',
            
            // XSS patterns
            '/<script[^>]*>.*?<\/script>/is',
            '/javascript\s*:/i',
            '/on\w+\s*=/i',
            '/<iframe[^>]*>.*?<\/iframe>/is',
            
            // File inclusion patterns
            '/\.\.[\/\\\\]/i',
            '/\b(include|require)(_once)?\s*\(/i',
            '/\bfile_get_contents\s*\(/i',
            
            // Command injection patterns
            '/[;&|`$(){}[\]]/i',
            '/\b(system|exec|shell_exec|passthru|eval)\s*\(/i'
        ];
        
        return $this->check_patterns_recursive($data, $malicious_patterns);
    }
    
    /**
     * Recursively check patterns in data structure
     * 
     * @param mixed $data Data to check
     * @param array $patterns Patterns to match
     * @return bool True if patterns found
     */
    private function check_patterns_recursive($data, $patterns) {
        if (is_string($data)) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $data)) {
                    return true;
                }
            }
        } elseif (is_array($data)) {
            foreach ($data as $value) {
                if ($this->check_patterns_recursive($value, $patterns)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Log security event
     * 
     * @param string $event_type Type of security event
     * @param array $context Event context data
     * @return void
     */
    private function log_security_event($event_type, $context = []) {
        if (class_exists('LAS_Error_Logger')) {
            $logger = new LAS_Error_Logger();
            $logger->log_security_event($event_type, $context);
        }
        
        // Also log to WordPress debug log if enabled
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                'LAS Security Event: %s - %s',
                $event_type,
                json_encode($context)
            ));
        }
    }
    
    /**
     * Validate file upload for import functionality
     * 
     * @param array $file $_FILES array element
     * @return array Validation result
     */
    public function validate_file_upload($file) {
        $result = [
            'valid' => false,
            'errors' => []
        ];
        
        // Check if file was uploaded
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            $result['errors'][] = [
                'code' => 'no_file_uploaded',
                'message' => 'No file was uploaded'
            ];
            return $result;
        }
        
        // Check file size (max 1MB)
        $max_size = 1024 * 1024; // 1MB
        if ($file['size'] > $max_size) {
            $result['errors'][] = [
                'code' => 'file_too_large',
                'message' => 'File size exceeds maximum allowed size (1MB)'
            ];
            return $result;
        }
        
        // Check file type
        $allowed_types = ['application/json', 'text/plain'];
        $file_type = mime_content_type($file['tmp_name']);
        
        if (!in_array($file_type, $allowed_types)) {
            $result['errors'][] = [
                'code' => 'invalid_file_type',
                'message' => 'Only JSON files are allowed'
            ];
            return $result;
        }
        
        // Check file extension
        $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($file_extension, ['json', 'txt'])) {
            $result['errors'][] = [
                'code' => 'invalid_file_extension',
                'message' => 'File must have .json or .txt extension'
            ];
            return $result;
        }
        
        $result['valid'] = true;
        return $result;
    }
    
    /**
     * Get security validation summary for debugging
     * 
     * @return array Security validation summary
     */
    public function get_security_summary() {
        return [
            'rate_limit_config' => $this->rate_limit_config,
            'action_capabilities' => $this->action_capabilities,
            'allowed_css_properties_count' => count($this->allowed_css_properties),
            'dangerous_patterns_count' => count($this->dangerous_css_patterns),
            'current_user_id' => get_current_user_id(),
            'client_ip' => $this->anonymize_ip($this->get_client_ip())
        ];
    }
}