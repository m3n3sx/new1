<?php
/**
 * Simple AJAX test for Live Preview
 */

// Simulate WordPress environment minimally
if (!defined('ABSPATH')) {
    define('ABSPATH', '/var/www/html/');
}

// Mock WordPress functions that are needed
if (!function_exists('wp_verify_nonce')) {
    function wp_verify_nonce($nonce, $action) { return true; }
}
if (!function_exists('current_user_can')) {
    function current_user_can($cap) { return true; }
}
if (!function_exists('get_current_user_id')) {
    function get_current_user_id() { return 1; }
}
if (!function_exists('wp_send_json')) {
    function wp_send_json($data) { echo json_encode($data); }
}
if (!function_exists('wp_send_json_success')) {
    function wp_send_json_success($data) { echo json_encode(['success' => true, 'data' => $data]); }
}
if (!function_exists('wp_send_json_error')) {
    function wp_send_json_error($data) { echo json_encode(['success' => false, 'data' => $data]); }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($str) { return strip_tags($str); }
}
if (!function_exists('esc_attr')) {
    function esc_attr($str) { return htmlspecialchars($str); }
}
if (!function_exists('current_time')) {
    function current_time($type) { return time(); }
}
if (!function_exists('size_format')) {
    function size_format($bytes) { return $bytes . ' bytes'; }
}
if (!function_exists('get_option')) {
    function get_option($option, $default = false) { return $default; }
}
if (!function_exists('update_option')) {
    function update_option($option, $value, $autoload = null) { return true; }
}
if (!function_exists('delete_option')) {
    function delete_option($option) { return true; }
}
if (!function_exists('get_bloginfo')) {
    function get_bloginfo($show = '') { return '6.0'; }
}
if (!function_exists('add_action')) {
    function add_action($hook, $callback, $priority = 10, $accepted_args = 1) { return true; }
}
if (!function_exists('has_action')) {
    function has_action($hook, $callback = false) { return false; }
}

// Mock WP_Error class
if (!class_exists('WP_Error')) {
    class WP_Error {
        private $errors = [];
        private $error_data = [];
        
        public function __construct($code = '', $message = '', $data = '') {
            if (!empty($code)) {
                $this->errors[$code][] = $message;
                if (!empty($data)) {
                    $this->error_data[$code] = $data;
                }
            }
        }
        
        public function get_error_message() {
            $code = $this->get_error_code();
            if (empty($code)) return '';
            return $this->errors[$code][0] ?? '';
        }
        
        public function get_error_code() {
            return array_keys($this->errors)[0] ?? '';
        }
        
        public function get_error_data() {
            $code = $this->get_error_code();
            return $this->error_data[$code] ?? [];
        }
    }
}

if (!function_exists('is_wp_error')) {
    function is_wp_error($thing) {
        return $thing instanceof WP_Error;
    }
}

// Mock las_fresh_get_default_options
function las_fresh_get_default_options() {
    return [
        'admin_menu_bg_color' => '#23282d',
        'admin_menu_text_color' => '#ffffff',
        'admin_bar_bg_color' => '#1d2327'
    ];
}

echo "Testing AJAX Handler Components...\n\n";

// Load required files
$files_to_load = [
    'includes/SecurityValidator.php',
    'includes/SettingsStorage.php',
    'includes/output-css.php',
    'includes/ajax-handlers.php'
];

foreach ($files_to_load as $file) {
    if (file_exists($file)) {
        require_once $file;
        echo "✓ Loaded: {$file}\n";
    } else {
        echo "✗ Missing: {$file}\n";
        exit(1);
    }
}

// Test CSS generation
echo "\nTesting CSS generation...\n";
if (function_exists('las_fresh_generate_admin_css_output')) {
    $test_settings = [
        'admin_menu_bg_color' => '#ff0000',
        'admin_menu_text_color' => '#ffffff'
    ];
    
    $css = las_fresh_generate_admin_css_output($test_settings);
    
    if (!empty($css)) {
        echo "✓ CSS generation works (" . strlen($css) . " characters)\n";
        echo "Sample CSS:\n" . substr($css, 0, 200) . "...\n\n";
    } else {
        echo "✗ CSS generation returned empty result\n";
    }
} else {
    echo "✗ CSS generation function not found\n";
}

// Test AJAX handler
echo "Testing AJAX handler...\n";
if (class_exists('LAS_Ajax_Handlers')) {
    // Simulate POST data
    $_POST = [
        'action' => 'las_get_preview_css',
        'nonce' => 'test_nonce',
        'setting' => 'admin_menu_bg_color',
        'value' => '#ff0000'
    ];
    
    try {
        $handler = new LAS_Ajax_Handlers();
        echo "✓ AJAX handler created successfully\n";
        
        // Test the handler method directly
        ob_start();
        $handler->handle_get_preview_css();
        $output = ob_get_clean();
        
        if (!empty($output)) {
            echo "✓ AJAX handler produced output\n";
            echo "Response: " . substr($output, 0, 200) . "...\n";
        } else {
            echo "✗ AJAX handler produced no output\n";
        }
        
    } catch (Exception $e) {
        echo "✗ AJAX handler error: " . $e->getMessage() . "\n";
    }
} else {
    echo "✗ AJAX handler class not found\n";
}

echo "\nTest completed.\n";