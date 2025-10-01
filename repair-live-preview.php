<?php
/**
 * Live Preview Repair Script
 * 
 * This script diagnoses and repairs live preview functionality
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
echo '<h1>Live Preview Repair</h1>';

// Step 1: Check plugin status
echo '<h2>Step 1: Plugin Status</h2>';
if (defined('LAS_FRESH_VERSION')) {
    echo '<p style="color: green;">✅ Plugin active (Version: ' . LAS_FRESH_VERSION . ')</p>';
} else {
    echo '<p style="color: red;">❌ Plugin not active</p>';
    echo '</div>';
    return;
}

// Step 2: Check AJAX handlers
echo '<h2>Step 2: AJAX Handler Registration</h2>';
$ajax_actions = ['las_save_settings', 'las_load_settings', 'las_get_preview_css'];
$missing_handlers = [];

foreach ($ajax_actions as $action) {
    if (has_action("wp_ajax_{$action}")) {
        echo '<p style="color: green;">✅ ' . $action . ' registered</p>';
    } else {
        echo '<p style="color: red;">❌ ' . $action . ' missing</p>';
        $missing_handlers[] = $action;
    }
}

// Step 3: Repair missing handlers if needed
if (!empty($missing_handlers)) {
    echo '<h2>Step 3: Repairing Missing Handlers</h2>';
    
    // Try to initialize AJAX handlers
    if (class_exists('LAS_Ajax_Handlers')) {
        echo '<p>Attempting to initialize AJAX handlers...</p>';
        
        // Create new instance if global doesn't exist
        if (!isset($GLOBALS['las_ajax_handlers'])) {
            $GLOBALS['las_ajax_handlers'] = new LAS_Ajax_Handlers();
            echo '<p style="color: green;">✅ AJAX handlers instance created</p>';
        }
        
        // Re-check handlers
        $still_missing = [];
        foreach ($missing_handlers as $action) {
            if (has_action("wp_ajax_{$action}")) {
                echo '<p style="color: green;">✅ ' . $action . ' now registered</p>';
            } else {
                $still_missing[] = $action;
            }
        }
        
        if (empty($still_missing)) {
            echo '<p style="color: green;">✅ All AJAX handlers repaired</p>';
        } else {
            echo '<p style="color: red;">❌ Still missing: ' . implode(', ', $still_missing) . '</p>';
        }
    } else {
        echo '<p style="color: red;">❌ LAS_Ajax_Handlers class not found</p>';
    }
}

// Step 4: Test CSS generation
echo '<h2>Step 4: CSS Generation Test</h2>';
if (function_exists('las_fresh_generate_admin_css_output')) {
    try {
        $test_settings = ['admin_menu_bg_color' => '#ff0000'];
        $css = las_fresh_generate_admin_css_output($test_settings);
        
        if (!empty($css)) {
            echo '<p style="color: green;">✅ CSS generation works (' . strlen($css) . ' characters)</p>';
            echo '<details><summary>Sample CSS</summary><pre style="background: #f0f0f0; padding: 10px; max-height: 200px; overflow-y: auto;">' . esc_html(substr($css, 0, 500)) . '...</pre></details>';
        } else {
            echo '<p style="color: red;">❌ CSS generation returns empty</p>';
        }
    } catch (Exception $e) {
        echo '<p style="color: red;">❌ CSS generation error: ' . esc_html($e->getMessage()) . '</p>';
    }
} else {
    echo '<p style="color: red;">❌ CSS generation function not available</p>';
}

// Step 5: Test AJAX endpoint directly
echo '<h2>Step 5: Direct AJAX Test</h2>';
if (isset($GLOBALS['las_ajax_handlers']) && method_exists($GLOBALS['las_ajax_handlers'], 'handle_get_preview_css')) {
    // Simulate AJAX request
    $_POST = [
        'action' => 'las_get_preview_css',
        'nonce' => wp_create_nonce('las_ajax_nonce'),
        'setting' => 'admin_menu_bg_color',
        'value' => '#00ff00'
    ];
    
    try {
        ob_start();
        $GLOBALS['las_ajax_handlers']->handle_get_preview_css();
        $output = ob_get_clean();
        
        if (!empty($output)) {
            echo '<p style="color: green;">✅ AJAX handler produces output</p>';
            
            $json = json_decode($output, true);
            if ($json !== null) {
                echo '<p style="color: green;">✅ Output is valid JSON</p>';
                if (isset($json['success']) && $json['success']) {
                    echo '<p style="color: green;">✅ AJAX handler returns success</p>';
                    if (isset($json['data']['css']) && !empty($json['data']['css'])) {
                        echo '<p style="color: green;">✅ CSS generated successfully</p>';
                    } else {
                        echo '<p style="color: red;">❌ No CSS in response</p>';
                    }
                } else {
                    echo '<p style="color: red;">❌ AJAX handler returns error: ' . ($json['message'] ?? 'Unknown') . '</p>';
                }
            } else {
                echo '<p style="color: red;">❌ Output is not valid JSON</p>';
                echo '<details><summary>Raw Output</summary><pre>' . esc_html($output) . '</pre></details>';
            }
        } else {
            echo '<p style="color: red;">❌ AJAX handler produces no output</p>';
        }
    } catch (Exception $e) {
        echo '<p style="color: red;">❌ AJAX handler error: ' . esc_html($e->getMessage()) . '</p>';
    }
    
    // Clean up
    unset($_POST);
} else {
    echo '<p style="color: red;">❌ AJAX handler not available for testing</p>';
}

// Step 6: JavaScript configuration test
echo '<h2>Step 6: JavaScript Configuration</h2>';
$nonce = wp_create_nonce('las_ajax_nonce');
?>

<div id="js-test-results" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">
    <p>JavaScript test results will appear here...</p>
</div>

<button onclick="runJavaScriptTest()" class="button button-primary">Run JavaScript Test</button>

<script>
function runJavaScriptTest() {
    const results = document.getElementById('js-test-results');
    results.innerHTML = '<p>Running JavaScript test...</p>';
    
    // Check jQuery
    if (typeof jQuery !== 'undefined') {
        results.innerHTML += '<p style="color: green;">✅ jQuery available: ' + jQuery.fn.jquery + '</p>';
        
        // Check lasAdminData
        if (typeof lasAdminData !== 'undefined') {
            results.innerHTML += '<p style="color: green;">✅ lasAdminData available</p>';
            
            // Test AJAX call
            jQuery.post(lasAdminData.ajax_url, {
                action: lasAdminData.ajax_actions?.get_preview_css || 'las_get_preview_css',
                nonce: '<?php echo $nonce; ?>',
                setting: 'admin_menu_bg_color',
                value: '#0000ff'
            })
            .done(function(response) {
                console.log('JavaScript AJAX Success:', response);
                if (response.success) {
                    results.innerHTML += '<p style="color: green;">✅ JavaScript AJAX successful</p>';
                    if (response.data && response.data.css) {
                        results.innerHTML += '<p style="color: green;">✅ CSS received (' + response.data.css.length + ' chars)</p>';
                        
                        // Apply CSS to test
                        const existingStyle = document.getElementById('repair-test-styles');
                        if (existingStyle) {
                            existingStyle.remove();
                        }
                        
                        const style = document.createElement('style');
                        style.id = 'repair-test-styles';
                        style.textContent = response.data.css;
                        document.head.appendChild(style);
                        
                        results.innerHTML += '<p style="color: green;">✅ CSS applied to page</p>';
                    } else {
                        results.innerHTML += '<p style="color: red;">❌ No CSS in response</p>';
                    }
                } else {
                    results.innerHTML += '<p style="color: red;">❌ AJAX error: ' + (response.data || response.message) + '</p>';
                }
            })
            .fail(function(xhr, status, error) {
                console.error('JavaScript AJAX Failed:', status, error);
                results.innerHTML += '<p style="color: red;">❌ AJAX failed: ' + status + '</p>';
                if (xhr.responseText) {
                    results.innerHTML += '<p style="color: red;">Response: ' + xhr.responseText.substring(0, 200) + '</p>';
                }
            });
        } else {
            results.innerHTML += '<p style="color: red;">❌ lasAdminData not available</p>';
        }
    } else {
        results.innerHTML += '<p style="color: red;">❌ jQuery not available</p>';
    }
}

// Auto-run test
jQuery(document).ready(function() {
    runJavaScriptTest();
});
</script>

<?php
echo '<h2>Step 7: Repair Summary</h2>';
echo '<div style="background: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3;">';
echo '<h3>Next Steps:</h3>';
echo '<ol>';
echo '<li>If AJAX handlers are missing, the plugin may need to be reactivated</li>';
echo '<li>If CSS generation fails, check the output-css.php file</li>';
echo '<li>If JavaScript test fails, check browser console for errors</li>';
echo '<li>Test the admin settings page to see if sliders appear</li>';
echo '</ol>';
echo '</div>';

echo '</div>';
?>