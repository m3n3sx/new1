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
     * Verify WordPress nonce
     *
     * @param string $nonce Nonce value to verify
     * @param string $action Nonce action
     * @return bool True if valid, false otherwise
     */
    public function verify_nonce($nonce, $action) {
        if (empty($nonce) || empty($action)) {
            return false;
        }

        return wp_verify_nonce($nonce, $action) !== false;
    }

    /**
     * Check if current user has required capabilities
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

        $clean_key = preg_replace('/[^a-zA-Z0-9_-]/', '', $key);

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

        if (strpos($key, '_color') !== false || strpos($key, '_gradient_color') !== false) {
            return 'color';
        }

        if (strpos($key, 'custom_css') !== false || strpos($key, '_shadow') !== false) {
            return 'css';
        }

        if (strpos($key, '_logo') !== false || strpos($key, '_url') !== false || strpos($key, '_image') !== false) {
            return 'url';
        }

        if (strpos($key, '_size') !== false || strpos($key, '_width') !== false ||
            strpos($key, '_height') !== false || strpos($key, '_radius') !== false ||
            strpos($key, '_margin') !== false || strpos($key, '_padding') !== false ||
            strpos($key, '_offset') !== false || strpos($key, '_blur') !== false ||
            strpos($key, '_spread') !== false) {
            return 'number';
        }

        if (strpos($key, 'enable_') === 0 || strpos($key, '_enabled') !== false ||
            in_array($key, ['admin_menu_detached', 'admin_bar_detached'])) {
            return 'boolean';
        }

        if (strpos($key, '_type') !== false || strpos($key, '_family') !== false ||
            strpos($key, '_style') !== false) {
            return 'select';
        }

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

        if (preg_match('/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $color)) {
            return strtolower($color);
        }

        if (preg_match('/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i', $color, $matches)) {
            $r = min(255, max(0, intval($matches[1])));
            $g = min(255, max(0, intval($matches[2])));
            $b = min(255, max(0, intval($matches[3])));
            return "rgb($r, $g, $b)";
        }

        if (preg_match('/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i', $color, $matches)) {
            $r = min(255, max(0, intval($matches[1])));
            $g = min(255, max(0, intval($matches[2])));
            $b = min(255, max(0, intval($matches[3])));
            $a = min(1, max(0, floatval($matches[4])));
            return "rgba($r, $g, $b, $a)";
        }

        if (preg_match('/^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i', $color, $matches)) {
            $h = min(360, max(0, intval($matches[1])));
            $s = min(100, max(0, intval($matches[2])));
            $l = min(100, max(0, intval($matches[3])));
            return "hsl($h, $s%, $l%)";
        }

        if (preg_match('/^hsla\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d.]+)\s*\)$/i', $color, $matches)) {
            $h = min(360, max(0, intval($matches[1])));
            $s = min(100, max(0, intval($matches[2])));
            $l = min(100, max(0, intval($matches[3])));
            $a = min(1, max(0, floatval($matches[4])));
            return "hsla($h, $s%, $l%, $a)";
        }

        $named_colors = [
            'transparent', 'inherit', 'initial', 'unset',
            'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
            'gray', 'grey', 'darkgray', 'darkgrey', 'lightgray', 'lightgrey',
            'orange', 'purple', 'brown', 'pink', 'lime', 'navy', 'teal', 'silver'
        ];

        if (in_array(strtolower($color), $named_colors)) {
            return strtolower($color);
        }

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

        foreach ($this->dangerous_css_patterns as $pattern) {
            $css = preg_replace($pattern, '', $css);
        }

        $css = wp_strip_all_tags($css);

        $css = preg_replace('/\/\*.*?\*\

        $css_rules = explode(';', $css);
        $safe_css = '';

        foreach ($css_rules as $rule) {
            $rule = trim($rule);
            if (empty($rule)) continue;

            if (strpos($rule, ':') !== false) {
                list($property, $value) = explode(':', $rule, 2);
                $property = trim(strtolower($property));
                $value = trim($value);

                if (in_array($property, $this->allowed_css_properties) && !empty($value)) {

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

        foreach ($this->dangerous_css_patterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return false;
            }
        }

        if (in_array($property, ['color', 'background-color', 'border-color'])) {
            return !empty($this->sanitize_color($value));
        }

        if (strpos($property, 'size') !== false || strpos($property, 'width') !== false ||
            strpos($property, 'height') !== false || strpos($property, 'margin') !== false ||
            strpos($property, 'padding') !== false) {
            return preg_match('/^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch)?$/i', $value);
        }

        if ($property === 'font-family') {
            return preg_match('/^[a-zA-Z0-9\s\-_,"\'\(\)]+$/', $value);
        }

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

        $clean_url = esc_url_raw($url);

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
     * Rate limiting for AJAX requests
     *
     * @param string $action Action name
     * @param int $limit Maximum requests per minute
     * @return bool True if within limit, false if exceeded
     */
    public function check_rate_limit($action, $limit = 60) {
        $user_id = get_current_user_id();
        $key = "las_rate_limit_{$action}_{$user_id}";
        $current_minute = floor(time() / 60);

        $requests = get_transient($key);
        if ($requests === false) {
            $requests = ['minute' => $current_minute, 'count' => 0];
        }

        if ($requests['minute'] !== $current_minute) {
            $requests = ['minute' => $current_minute, 'count' => 0];
        }

        $requests['count']++;

        set_transient($key, $requests, 120);

        return $requests['count'] <= $limit;
    }
}