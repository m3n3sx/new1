<?php
/**
 * Debug script for Live Preview in real WordPress environment
 * This should be run from WordPress admin to test live preview functionality
 */

// Only run in WordPress admin
if (!defined('ABSPATH') || !is_admin()) {
    die('This script must be run from WordPress admin');
}

echo "<h2>Live Preview Debug Report</h2>";

// Test 1: Check if functions exist
echo "<h3>1. Function Availability</h3>";
$functions_to_check = [
    'las_fresh_get_default_options',
    'las_fresh_generate_admin_css_output',
    'las_fresh_get_options'
];

foreach ($functions_to_check as $func) {
    if (function_exists($func)) {
        echo "✓ {$func} exists<br>";
    } else {
        echo "✗ {$func} missing<br>";
    }
}

// Test 2: Check if classes exist
echo "<h3>2. Class Availability</h3>";
$classes_to_check = [
    'LAS_Ajax_Handlers',
    'LAS_Security_Validator',
    'LAS_Settings_Storage'
];

foreach ($classes_to_check as $class) {
    if (class_exists($class)) {
        echo "✓ {$class} exists<br>";
    } else {
        echo "✗ {$class} missing<br>";
    }
}

// Test 3: Check AJAX handlers registration
echo "<h3>3. AJAX Handlers</h3>";
$ajax_actions = [
    'las_save_settings',
    'las_load_settings', 
    'las_get_preview_css',
    'las_log_error'
];

foreach ($ajax_actions as $action) {
    if (has_action("wp_ajax_{$action}")) {
        echo "✓ {$action} registered<br>";
    } else {
        echo "✗ {$action} not registered<br>";
    }
}

// Test 4: Test CSS generation
echo "<h3>4. CSS Generation Test</h3>";
if (function_exists('las_fresh_generate_admin_css_output')) {
    try {
        $test_settings = [
            'admin_menu_bg_color' => '#ff0000',
            'admin_menu_text_color' => '#ffffff'
        ];
        
        $css = las_fresh_generate_admin_css_output($test_settings);
        
        if (!empty($css)) {
            echo "✓ CSS generation works (" . strlen($css) . " characters)<br>";
            echo "<details><summary>Generated CSS Preview</summary><pre>" . esc_html(substr($css, 0, 500)) . "...</pre></details>";
        } else {
            echo "✗ CSS generation returned empty result<br>";
        }
    } catch (Exception $e) {
        echo "✗ CSS generation failed: " . esc_html($e->getMessage()) . "<br>";
    }
} else {
    echo "✗ CSS generation function not available<br>";
}

// Test 5: Test AJAX endpoint
echo "<h3>5. AJAX Endpoint Test</h3>";
if (current_user_can('manage_options')) {
    $nonce = wp_create_nonce('las_ajax_nonce');
    echo "✓ User has permissions<br>";
    echo "✓ Nonce created: " . substr($nonce, 0, 10) . "...<br>";
    
    // JavaScript test
    ?>
    <script>
    jQuery(document).ready(function($) {
        console.log('Testing AJAX endpoint...');
        
        $.post(ajaxurl, {
            action: 'las_get_preview_css',
            nonce: '<?php echo $nonce; ?>',
            setting: 'admin_menu_bg_color',
            value: '#ff0000'
        })
        .done(function(response) {
            console.log('AJAX Success:', response);
            $('#ajax-result').html('<span style="color: green;">✓ AJAX endpoint works</span>');
        })
        .fail(function(xhr, status, error) {
            console.error('AJAX Failed:', status, error);
            $('#ajax-result').html('<span style="color: red;">✗ AJAX endpoint failed: ' + status + '</span>');
        });
    });
    </script>
    <div id="ajax-result">Testing AJAX endpoint...</div>
    <?php
} else {
    echo "✗ User lacks permissions<br>";
}

// Test 6: Check JavaScript configuration
echo "<h3>6. JavaScript Configuration</h3>";
?>
<script>
if (typeof lasAdminData !== 'undefined') {
    console.log('lasAdminData available:', lasAdminData);
    document.write('✓ lasAdminData is available<br>');
    
    if (lasAdminData.ajax_actions && lasAdminData.ajax_actions.get_preview_css) {
        document.write('✓ get_preview_css action configured<br>');
    } else {
        document.write('✗ get_preview_css action missing<br>');
    }
    
    if (lasAdminData.ajax_url) {
        document.write('✓ AJAX URL configured<br>');
    } else {
        document.write('✗ AJAX URL missing<br>');
    }
    
    if (lasAdminData.nonce) {
        document.write('✓ Nonce configured<br>');
    } else {
        document.write('✗ Nonce missing<br>');
    }
} else {
    document.write('✗ lasAdminData not available<br>');
}
</script>