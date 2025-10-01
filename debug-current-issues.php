<?php
/**
 * Current Issues Diagnostic
 * 
 * This script will help identify what's broken in the current version
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
echo '<h1>Current Issues Diagnostic</h1>';

// Check if we're on the plugin admin page
$is_plugin_page = isset($_GET['page']) && $_GET['page'] === 'live-admin-styler-settings';

if (!$is_plugin_page) {
    echo '<div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">';
    echo '<h3>⚠️ Not on Plugin Page</h3>';
    echo '<p>This diagnostic should be run on the Live Admin Styler settings page.</p>';
    echo '<p><a href="' . admin_url('admin.php?page=live-admin-styler-settings') . '" class="button button-primary">Go to Plugin Settings</a></p>';
    echo '</div>';
}

// Step 1: Check JavaScript Loading
echo '<h2>Step 1: JavaScript Loading Check</h2>';
?>

<div id="js-loading-results" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">
    <p>JavaScript loading test results will appear here...</p>
</div>

<script>
function addResult(containerId, message, type = 'info') {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    const colors = {
        success: '#d4edda',
        error: '#f8d7da', 
        warning: '#fff3cd',
        info: '#d1ecf1'
    };
    div.style.background = colors[type] || colors.info;
    div.style.padding = '8px 12px';
    div.style.margin = '5px 0';
    div.style.borderRadius = '4px';
    div.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
    container.appendChild(div);
}

// Test JavaScript loading
function testJavaScriptLoading() {
    addResult('js-loading-results', 'Testing JavaScript loading...', 'info');
    
    // Test jQuery
    if (typeof jQuery !== 'undefined') {
        addResult('js-loading-results', '✅ jQuery loaded: ' + jQuery.fn.jquery, 'success');
    } else {
        addResult('js-loading-results', '❌ jQuery not loaded', 'error');
        return;
    }
    
    // Test jQuery UI
    if (typeof jQuery.ui !== 'undefined') {
        addResult('js-loading-results', '✅ jQuery UI loaded', 'success');
        
        if (typeof jQuery.ui.slider !== 'undefined') {
            addResult('js-loading-results', '✅ jQuery UI Slider available', 'success');
        } else {
            addResult('js-loading-results', '❌ jQuery UI Slider not available', 'error');
        }
    } else {
        addResult('js-loading-results', '❌ jQuery UI not loaded', 'error');
    }
    
    // Test lasAdminData
    if (typeof lasAdminData !== 'undefined') {
        addResult('js-loading-results', '✅ lasAdminData available', 'success');
        
        if (lasAdminData.ajax_url) {
            addResult('js-loading-results', '✅ AJAX URL: ' + lasAdminData.ajax_url, 'success');
        } else {
            addResult('js-loading-results', '❌ AJAX URL missing', 'error');
        }
        
        if (lasAdminData.nonce) {
            addResult('js-loading-results', '✅ Nonce available', 'success');
        } else {
            addResult('js-loading-results', '❌ Nonce missing', 'error');
        }
        
        if (lasAdminData.jquery_ui) {
            addResult('js-loading-results', '✅ jQuery UI config: ' + JSON.stringify(lasAdminData.jquery_ui), 'success');
        } else {
            addResult('js-loading-results', '❌ jQuery UI config missing', 'error');
        }
    } else {
        addResult('js-loading-results', '❌ lasAdminData not available', 'error');
    }
    
    // Test LAS classes
    if (typeof window.LASCoreManager !== 'undefined') {
        addResult('js-loading-results', '✅ LASCoreManager available', 'success');
    } else {
        addResult('js-loading-results', '❌ LASCoreManager not available', 'error');
    }
    
    if (typeof window.LASLivePreview !== 'undefined') {
        addResult('js-loading-results', '✅ LASLivePreview available', 'success');
    } else {
        addResult('js-loading-results', '❌ LASLivePreview not available', 'error');
    }
}

// Auto-run test
jQuery(document).ready(function() {
    testJavaScriptLoading();
});
</script>

<?php
// Step 2: Check DOM Elements
echo '<h2>Step 2: DOM Elements Check</h2>';
?>

<div id="dom-check-results" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">
    <p>DOM elements check results will appear here...</p>
</div>

<script>
function testDOMElements() {
    addResult('dom-check-results', 'Testing DOM elements...', 'info');
    
    // Test sliders
    const sliders = document.querySelectorAll('.las-slider');
    if (sliders.length > 0) {
        addResult('dom-check-results', `✅ Found ${sliders.length} slider elements`, 'success');
        
        sliders.forEach((slider, index) => {
            const setting = slider.dataset.setting;
            const input = document.getElementById(setting);
            if (input) {
                addResult('dom-check-results', `✅ Slider ${index + 1}: ${setting} has input`, 'success');
            } else {
                addResult('dom-check-results', `❌ Slider ${index + 1}: ${setting} missing input`, 'error');
            }
        });
    } else {
        addResult('dom-check-results', '❌ No slider elements found', 'error');
    }
    
    // Test color pickers
    const colorPickers = document.querySelectorAll('.las-fresh-color-picker');
    if (colorPickers.length > 0) {
        addResult('dom-check-results', `✅ Found ${colorPickers.length} color picker elements`, 'success');
    } else {
        addResult('dom-check-results', '❌ No color picker elements found', 'error');
    }
    
    // Test submenu
    const submenu = document.querySelectorAll('#adminmenu .wp-submenu');
    if (submenu.length > 0) {
        addResult('dom-check-results', `✅ Found ${submenu.length} submenu elements`, 'success');
        
        let visibleCount = 0;
        submenu.forEach(menu => {
            const style = window.getComputedStyle(menu);
            if (style.visibility !== 'hidden' && style.display !== 'none') {
                visibleCount++;
            }
        });
        
        if (visibleCount > 0) {
            addResult('dom-check-results', `✅ ${visibleCount} submenu elements are visible`, 'success');
        } else {
            addResult('dom-check-results', '❌ All submenu elements are hidden', 'error');
        }
    } else {
        addResult('dom-check-results', '❌ No submenu elements found', 'error');
    }
}

// Run DOM test after a delay
jQuery(document).ready(function() {
    setTimeout(testDOMElements, 1000);
});
</script>

<?php
// Step 3: Test AJAX
echo '<h2>Step 3: AJAX Test</h2>';
?>

<div id="ajax-test-results" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">
    <p>AJAX test results will appear here...</p>
</div>

<button onclick="testAJAX()" class="button button-primary">Test AJAX</button>

<script>
function testAJAX() {
    addResult('ajax-test-results', 'Testing AJAX...', 'info');
    
    if (typeof lasAdminData === 'undefined') {
        addResult('ajax-test-results', '❌ Cannot test AJAX - lasAdminData not available', 'error');
        return;
    }
    
    jQuery.post(lasAdminData.ajax_url, {
        action: 'las_get_preview_css',
        nonce: lasAdminData.nonce,
        setting: 'admin_menu_bg_color',
        value: '#ff0000'
    })
    .done(function(response) {
        console.log('AJAX Response:', response);
        if (response.success) {
            addResult('ajax-test-results', '✅ AJAX request successful', 'success');
            if (response.data && response.data.css) {
                addResult('ajax-test-results', `✅ CSS generated (${response.data.css.length} chars)`, 'success');
            } else {
                addResult('ajax-test-results', '❌ No CSS in response', 'error');
            }
        } else {
            addResult('ajax-test-results', '❌ AJAX returned error: ' + (response.data || response.message), 'error');
        }
    })
    .fail(function(xhr, status, error) {
        addResult('ajax-test-results', '❌ AJAX failed: ' + status + ' - ' + error, 'error');
        if (xhr.responseText) {
            addResult('ajax-test-results', 'Response: ' + xhr.responseText.substring(0, 200), 'error');
        }
    });
}
</script>

<?php
// Step 4: Test Slider Initialization
echo '<h2>Step 4: Slider Initialization Test</h2>';
?>

<div id="slider-test-results" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">
    <p>Slider initialization test results will appear here...</p>
</div>

<button onclick="testSliderInitialization()" class="button button-primary">Test Slider Initialization</button>

<script>
function testSliderInitialization() {
    addResult('slider-test-results', 'Testing slider initialization...', 'info');
    
    const sliders = jQuery('.las-slider');
    if (sliders.length === 0) {
        addResult('slider-test-results', '❌ No sliders found', 'error');
        return;
    }
    
    addResult('slider-test-results', `Found ${sliders.length} sliders`, 'info');
    
    sliders.each(function(index) {
        const $slider = jQuery(this);
        const setting = $slider.data('setting');
        
        if ($slider.hasClass('ui-slider')) {
            addResult('slider-test-results', `✅ Slider ${index + 1} (${setting}) is jQuery UI slider`, 'success');
        } else {
            addResult('slider-test-results', `❌ Slider ${index + 1} (${setting}) is NOT jQuery UI slider`, 'error');
            
            // Try to initialize it
            try {
                const min = parseInt($slider.data('min')) || 0;
                const max = parseInt($slider.data('max')) || 100;
                const step = parseInt($slider.data('step')) || 1;
                const $input = jQuery('#' + setting);
                const value = parseInt($input.val()) || min;
                
                $slider.slider({
                    min: min,
                    max: max,
                    step: step,
                    value: value,
                    slide: function(event, ui) {
                        $input.val(ui.value);
                        addResult('slider-test-results', `Slider ${setting} moved to ${ui.value}`, 'info');
                    }
                });
                
                addResult('slider-test-results', `✅ Successfully initialized slider ${setting}`, 'success');
            } catch (error) {
                addResult('slider-test-results', `❌ Failed to initialize slider ${setting}: ${error.message}`, 'error');
            }
        }
    });
}
</script>

<?php
echo '<h2>Step 5: Console Errors</h2>';
echo '<div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">';
echo '<h3>Check Browser Console</h3>';
echo '<p>Open your browser\'s developer tools (F12) and check the Console tab for any JavaScript errors.</p>';
echo '<p>Common errors to look for:</p>';
echo '<ul>';
echo '<li>jQuery is not defined</li>';
echo '<li>lasAdminData is not defined</li>';
echo '<li>jQuery UI slider is not a function</li>';
echo '<li>AJAX 404 or 403 errors</li>';
echo '</ul>';
echo '</div>';

echo '</div>';
?>