<?php
/**
 * Debug Admin Page Registration
 * 
 * Add this to WordPress to check if admin page is properly registered
 */
// Ensure we're in WordPress
if (!defined('ABSPATH')) {
    die('This must be run in WordPress');
}

// Only for admin users
if (!current_user_can('manage_options')) {
    die('Insufficient permissions');
}

echo '<div class="wrap">';
echo '<h1>Admin Page Registration Debug</h1>';

// Check if plugin is active
echo '<h2>Plugin Status</h2>';
if (defined('LAS_FRESH_VERSION')) {
    echo '<p style="color: green;">✅ Plugin is active (Version: ' . LAS_FRESH_VERSION . ')</p>';
    echo '<p>Settings Slug: ' . LAS_FRESH_SETTINGS_SLUG . '</p>';
    echo '<p>Text Domain: ' . LAS_FRESH_TEXT_DOMAIN . '</p>';
} else {
    echo '<p style="color: red;">❌ Plugin not active</p>';
}

// Check if admin page function exists
echo '<h2>Admin Page Functions</h2>';
if (function_exists('las_fresh_add_admin_menu')) {
    echo '<p style="color: green;">✅ las_fresh_add_admin_menu() function exists</p>';
} else {
    echo '<p style="color: red;">❌ las_fresh_add_admin_menu() function missing</p>';
}

if (function_exists('las_fresh_render_settings_page')) {
    echo '<p style="color: green;">✅ las_fresh_render_settings_page() function exists</p>';
} else {
    echo '<p style="color: red;">❌ las_fresh_render_settings_page() function missing</p>';
}

// Check if admin menu hook is registered
echo '<h2>Hook Registration</h2>';
if (has_action('admin_menu', 'las_fresh_add_admin_menu')) {
    echo '<p style="color: green;">✅ admin_menu hook is registered</p>';
} else {
    echo '<p style="color: red;">❌ admin_menu hook not registered</p>';
}

// Check WordPress menu structure
echo '<h2>WordPress Menu Structure</h2>';
global $menu, $submenu;

echo '<h3>Main Menu Items:</h3>';
if (is_array($menu)) {
    foreach ($menu as $item) {
        if (is_array($item) && isset($item[2])) {
            $slug = $item[2];
            $title = $item[0];
            if (strpos($slug, 'live-admin-styler') !== false || strpos($title, 'Admin Styler') !== false) {
                echo '<p style="color: green;">✅ Found menu item: ' . esc_html($title) . ' (' . esc_html($slug) . ')</p>';
            }
        }
    }
} else {
    echo '<p style="color: red;">❌ Menu array not available</p>';
}

// Check if we can access the admin page directly
echo '<h2>Direct Access Test</h2>';
$admin_url = admin_url('admin.php?page=' . LAS_FRESH_SETTINGS_SLUG);
echo '<p>Admin page URL: <a href="' . esc_url($admin_url) . '" target="_blank">' . esc_html($admin_url) . '</a></p>';

// Check current screen
echo '<h2>Current Screen Info</h2>';
$current_screen = get_current_screen();
if ($current_screen) {
    echo '<p>Current screen ID: ' . esc_html($current_screen->id) . '</p>';
    echo '<p>Current screen base: ' . esc_html($current_screen->base) . '</p>';
    echo '<p>Current screen parent_base: ' . esc_html($current_screen->parent_base) . '</p>';
} else {
    echo '<p style="color: red;">❌ Current screen not available</p>';
}

// Check if files exist
echo '<h2>File Existence Check</h2>';
$plugin_dir = plugin_dir_path(__FILE__);
$files_to_check = [
    'includes/admin-settings-page.php',
    'js/admin-settings.js',
    'assets/js/live-preview.js',
    'assets/css/admin.css'
];

foreach ($files_to_check as $file) {
    $file_path = $plugin_dir . $file;
    if (file_exists($file_path)) {
        echo '<p style="color: green;">✅ ' . esc_html($file) . ' exists</p>';
    } else {
        echo '<p style="color: red;">❌ ' . esc_html($file) . ' missing</p>';
    }
}

// Test if we can call the admin page function directly
echo '<h2>Direct Function Call Test</h2>';
if (function_exists('las_fresh_render_settings_page')) {
    echo '<p>Attempting to call las_fresh_render_settings_page()...</p>';
    echo '<div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0; background: #f9f9f9;">';
    try {
        ob_start();
        las_fresh_render_settings_page();
        $output = ob_get_clean();
        if (!empty($output)) {
            echo '<p style="color: green;">✅ Function executed successfully</p>';
            echo '<details><summary>Function Output (first 500 chars)</summary>';
            echo '<pre>' . esc_html(substr($output, 0, 500)) . '...</pre>';
            echo '</details>';
        } else {
            echo '<p style="color: red;">❌ Function executed but returned no output</p>';
        }
    } catch (Exception $e) {
        echo '<p style="color: red;">❌ Function execution failed: ' . esc_html($e->getMessage()) . '</p>';
    }
    echo '</div>';
} else {
    echo '<p style="color: red;">❌ Cannot test - function not available</p>';
}

echo '</div>';
?>