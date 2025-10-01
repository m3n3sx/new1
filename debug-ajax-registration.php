<?php
/**
 * Debug AJAX registration - to be run in WordPress admin
 */

// Only run in WordPress
if (!defined('ABSPATH')) {
    die('Must be run in WordPress');
}

?>
<div class="wrap">
    <h1>AJAX Registration Debug</h1>
    
    <?php
    // Check if our AJAX actions are registered
    $ajax_actions = [
        'las_save_settings',
        'las_load_settings', 
        'las_get_preview_css',
        'las_log_error',
        'las_refresh_nonce'
    ];
    
    echo "<h2>AJAX Actions Registration Status</h2>";
    echo "<table class='wp-list-table widefat fixed striped'>";
    echo "<thead><tr><th>Action</th><th>Status</th><th>Hook</th></tr></thead><tbody>";
    
    foreach ($ajax_actions as $action) {
        $hook_name = "wp_ajax_{$action}";
        $has_action = has_action($hook_name);
        
        $status = $has_action ? '<span style="color: green;">✓ Registered</span>' : '<span style="color: red;">✗ Not Registered</span>';
        
        echo "<tr>";
        echo "<td><code>{$action}</code></td>";
        echo "<td>{$status}</td>";
        echo "<td><code>{$hook_name}</code></td>";
        echo "</tr>";
    }
    
    echo "</tbody></table>";
    
    // Check if classes exist
    echo "<h2>Required Classes</h2>";
    $classes = [
        'LAS_Ajax_Handlers',
        'LAS_Security_Validator', 
        'LAS_Settings_Storage'
    ];
    
    echo "<table class='wp-list-table widefat fixed striped'>";
    echo "<thead><tr><th>Class</th><th>Status</th></tr></thead><tbody>";
    
    foreach ($classes as $class) {
        $exists = class_exists($class);
        $status = $exists ? '<span style="color: green;">✓ Exists</span>' : '<span style="color: red;">✗ Missing</span>';
        
        echo "<tr>";
        echo "<td><code>{$class}</code></td>";
        echo "<td>{$status}</td>";
        echo "</tr>";
    }
    
    echo "</tbody></table>";
    
    // Check if functions exist
    echo "<h2>Required Functions</h2>";
    $functions = [
        'las_fresh_get_default_options',
        'las_fresh_generate_admin_css_output',
        'las_fresh_get_options'
    ];
    
    echo "<table class='wp-list-table widefat fixed striped'>";
    echo "<thead><tr><th>Function</th><th>Status</th></tr></thead><tbody>";
    
    foreach ($functions as $function) {
        $exists = function_exists($function);
        $status = $exists ? '<span style="color: green;">✓ Exists</span>' : '<span style="color: red;">✗ Missing</span>';
        
        echo "<tr>";
        echo "<td><code>{$function}</code></td>";
        echo "<td>{$status}</td>";
        echo "</tr>";
    }
    
    echo "</tbody></table>";
    
    // Test CSS generation
    echo "<h2>CSS Generation Test</h2>";
    if (function_exists('las_fresh_generate_admin_css_output')) {
        try {
            $test_settings = [
                'admin_menu_bg_color' => '#ff0000',
                'admin_menu_text_color' => '#ffffff'
            ];
            
            $css = las_fresh_generate_admin_css_output($test_settings);
            
            if (!empty($css)) {
                echo "<p><span style='color: green;'>✓ CSS generation works</span> (" . strlen($css) . " characters)</p>";
                echo "<details><summary>Generated CSS (first 500 chars)</summary>";
                echo "<pre>" . esc_html(substr($css, 0, 500)) . "...</pre>";
                echo "</details>";
            } else {
                echo "<p><span style='color: red;'>✗ CSS generation returned empty result</span></p>";
            }
        } catch (Exception $e) {
            echo "<p><span style='color: red;'>✗ CSS generation failed:</span> " . esc_html($e->getMessage()) . "</p>";
        }
    } else {
        echo "<p><span style='color: red;'>✗ CSS generation function not available</span></p>";
    }
    
    // Test AJAX endpoint directly
    echo "<h2>AJAX Endpoint Test</h2>";
    if (current_user_can('manage_options')) {
        $nonce = wp_create_nonce('las_ajax_nonce');
        ?>
        <p>Testing AJAX endpoint with JavaScript...</p>
        <div id="ajax-test-result">Testing...</div>
        
        <script>
        jQuery(document).ready(function($) {
            $.post(ajaxurl, {
                action: 'las_get_preview_css',
                nonce: '<?php echo $nonce; ?>',
                setting: 'admin_menu_bg_color',
                value: '#ff0000'
            })
            .done(function(response) {
                console.log('AJAX Test Success:', response);
                if (response.success) {
                    $('#ajax-test-result').html('<span style="color: green;">✓ AJAX endpoint works</span>');
                } else {
                    $('#ajax-test-result').html('<span style="color: red;">✗ AJAX returned error: ' + (response.data || 'Unknown') + '</span>');
                }
            })
            .fail(function(xhr, status, error) {
                console.error('AJAX Test Failed:', status, error, xhr.responseText);
                $('#ajax-test-result').html('<span style="color: red;">✗ AJAX failed: ' + status + ' - ' + error + '</span>');
            });
        });
        </script>
        <?php
    } else {
        echo "<p><span style='color: red;'>✗ User lacks manage_options capability</span></p>";
    }
    
    // Check global variables
    echo "<h2>Global Variables</h2>";
    $globals = [
        'las_ajax_handlers' => isset($GLOBALS['las_ajax_handlers']),
        'las_error_logger' => isset($GLOBALS['las_error_logger'])
    ];
    
    echo "<table class='wp-list-table widefat fixed striped'>";
    echo "<thead><tr><th>Global Variable</th><th>Status</th></tr></thead><tbody>";
    
    foreach ($globals as $var => $exists) {
        $status = $exists ? '<span style="color: green;">✓ Set</span>' : '<span style="color: red;">✗ Not Set</span>';
        
        echo "<tr>";
        echo "<td><code>\$GLOBALS['{$var}']</code></td>";
        echo "<td>{$status}</td>";
        echo "</tr>";
    }
    
    echo "</tbody></table>";
    ?>
</div>