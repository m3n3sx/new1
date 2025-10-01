<?php
/**
 * Test script to check if all components are working
 */

// Simulate WordPress environment
define('ABSPATH', dirname(__FILE__) . '/');
define('WP_DEBUG', true);

// Mock WordPress functions
function wp_create_nonce($action) {
    return 'test_nonce_' . md5($action . time());
}

function wp_verify_nonce($nonce, $action) {
    return 1; // Always valid for testing
}

function current_user_can($capability) {
    return true; // Always allow for testing
}

function get_current_user_id() {
    return 1;
}

function sanitize_text_field($str) {
    return strip_tags($str);
}

function esc_attr($str) {
    return htmlspecialchars($str, ENT_QUOTES);
}

function admin_url($path) {
    return 'http://localhost/wp-admin/' . $path;
}

function current_time($type) {
    return ($type === 'timestamp') ? time() : date('Y-m-d H:i:s');
}

function wp_send_json($data, $status = null) {
    header('Content-Type: application/json');
    if ($status) {
        http_response_code($status);
    }
    echo json_encode($data);
    exit;
}

// Test component loading
echo "Testing Live Preview Components...\n\n";

// Test 1: Check if files exist
$files = [
    'includes/SecurityValidator.php',
    'includes/SettingsStorage.php',
    'includes/output-css.php',
    'includes/ajax-handlers.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "✓ File exists: $file\n";
    } else {
        echo "✗ File missing: $file\n";
    }
}

echo "\n";

// Test 2: Try to load classes
try {
    require_once 'includes/SecurityValidator.php';
    echo "✓ SecurityValidator loaded\n";
} catch (Exception $e) {
    echo "✗ SecurityValidator failed: " . $e->getMessage() . "\n";
}

try {
    require_once 'includes/SettingsStorage.php';
    echo "✓ SettingsStorage loaded\n";
} catch (Exception $e) {
    echo "✗ SettingsStorage failed: " . $e->getMessage() . "\n";
}

try {
    require_once 'includes/output-css.php';
    echo "✓ output-css loaded\n";
} catch (Exception $e) {
    echo "✗ output-css failed: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Check if CSS generation function exists
if (function_exists('las_fresh_generate_admin_css_output')) {
    echo "✓ las_fresh_generate_admin_css_output function exists\n";
    
    // Test CSS generation
    $test_settings = [
        'menu_background_color' => '#ff0000',
        'menu_text_color' => '#ffffff'
    ];
    
    $css = las_fresh_generate_admin_css_output($test_settings);
    if (!empty($css)) {
        echo "✓ CSS generation works, generated " . strlen($css) . " characters\n";
        echo "Sample CSS: " . substr($css, 0, 100) . "...\n";
    } else {
        echo "✗ CSS generation returned empty result\n";
    }
} else {
    echo "✗ las_fresh_generate_admin_css_output function not found\n";
}

echo "\nTest completed.\n";
?>