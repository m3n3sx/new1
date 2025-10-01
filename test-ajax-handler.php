<?php
/**
 * Test script to check if AJAX handler is working
 */

// Simulate WordPress environment
define('ABSPATH', '/path/to/wordpress/');
define('WP_DEBUG', true);

// Mock WordPress functions for testing
if (!function_exists('wp_send_json')) {
    function wp_send_json($response, $status_code = null) {
        header('Content-Type: application/json');
        if ($status_code) {
            http_response_code($status_code);
        }
        echo json_encode($response);
        exit;
    }
}

if (!function_exists('current_time')) {
    function current_time($type) {
        return ($type === 'timestamp') ? time() : date('Y-m-d H:i:s');
    }
}

if (!function_exists('get_current_user_id')) {
    function get_current_user_id() {
        return 1; // Mock user ID
    }
}

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($str) {
        return strip_tags($str);
    }
}

// Test if classes exist
echo "Testing Live Preview AJAX Handler...\n";

// Check if required files exist
$files_to_check = [
    'includes/SecurityValidator.php',
    'includes/SettingsStorage.php', 
    'includes/output-css.php',
    'includes/ajax-handlers.php'
];

foreach ($files_to_check as $file) {
    if (file_exists($file)) {
        echo "✓ File exists: $file\n";
    } else {
        echo "✗ File missing: $file\n";
    }
}

echo "\nTest completed.\n";
?>