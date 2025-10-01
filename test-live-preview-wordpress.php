<?php
/**
 * Test Live Preview w WordPress Admin
 * 
 * Dodaj ten kod do functions.php lub utwórz jako plugin testowy:
 * 
 * 1. Skopiuj ten plik do katalogu pluginu
 * 2. Odwiedź: /wp-admin/admin.php?page=test-live-preview
 */

// Tylko w WordPress admin
if (!defined('ABSPATH')) {
    die('Must be run in WordPress');
}

// Dodaj menu testowe
add_action('admin_menu', function() {
    add_submenu_page(
        'tools.php',
        'Test Live Preview',
        'Test Live Preview',
        'manage_options',
        'test-live-preview',
        'las_test_live_preview_page'
    );
});

function las_test_live_preview_page() {
    // Enqueue scripts needed for testing
    wp_enqueue_script('jquery');
    wp_enqueue_style('wp-color-picker');
    wp_enqueue_script('wp-color-picker');
    
    ?>
    <div class="wrap">
        <h1>Test Live Preview System</h1>
        
        <div style="display: flex; gap: 20px;">
            <!-- Test Controls -->
            <div style="flex: 1; max-width: 400px;">
                <h2>Test Controls</h2>
                
                <div style="margin: 15px 0;">
                    <label>Menu Background Color:</label><br>
                    <input type="color" id="menu-bg-test" value="#23282d" class="las-fresh-color-picker">
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Menu Text Color:</label><br>
                    <input type="color" id="menu-text-test" value="#f0f0f1" class="las-fresh-color-picker">
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Admin Bar Background:</label><br>
                    <input type="color" id="adminbar-bg-test" value="#1d2327" class="las-fresh-color-picker">
                </div>
                
                <div style="margin: 15px 0;">
                    <button type="button" class="button button-primary" onclick="testLivePreview()">Test Live Preview</button>
                    <button type="button" class="button" onclick="resetColors()">Reset Colors</button>
                </div>
                
                <div style="margin: 15px 0;">
                    <h3>System Status</h3>
                    <div id="system-status">Checking...</div>
                </div>
                
                <div style="margin: 15px 0;">
                    <h3>Test Results</h3>
                    <div id="test-results" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background: #f9f9f9;"></div>
                </div>
            </div>
            
            <!-- Preview Area -->
            <div style="flex: 1;">
                <h2>Preview Area</h2>
                <div style="border: 1px solid #ddd; padding: 20px; background: #f1f1f1;">
                    <!-- Simulate WordPress admin elements -->
                    <div id="wpadminbar" style="background: #1d2327; color: #f0f0f1; padding: 8px; margin-bottom: 10px; height: 32px; line-height: 16px;">
                        <span>WordPress Admin Bar Preview</span>
                    </div>
                    
                    <div id="adminmenu" style="background: #23282d; color: #f0f0f1; padding: 15px; border-radius: 3px;">
                        <div style="margin: 5px 0; padding: 8px; border-radius: 3px;">
                            <a href="#" style="color: inherit; text-decoration: none;">📊 Dashboard</a>
                        </div>
                        <div style="margin: 5px 0; padding: 8px; border-radius: 3px;">
                            <a href="#" style="color: inherit; text-decoration: none;">📝 Posts</a>
                        </div>
                        <div style="margin: 5px 0; padding: 8px; border-radius: 3px;">
                            <a href="#" style="color: inherit; text-decoration: none;">🖼️ Media</a>
                        </div>
                        <div style="margin: 5px 0; padding: 8px; border-radius: 3px;">
                            <a href="#" style="color: inherit; text-decoration: none;">📄 Pages</a>
                        </div>
                    </div>
                    
                    <div id="wpbody-content" style="background: #f1f1f1; padding: 20px; margin-top: 10px; border-radius: 3px;">
                        <h3>Content Area Preview</h3>
                        <p>This is the main content area where WordPress admin content is displayed.</p>
                        <a href="#" style="color: #0073aa;">Sample link</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        console.log('Test page loaded');
        
        // Initialize color pickers
        $('.las-fresh-color-picker').wpColorPicker({
            change: function(event, ui) {
                const color = ui.color.toString();
                const id = $(this).attr('id');
                console.log('Color changed:', id, '=', color);
                
                // Update preview immediately
                updatePreviewDirect(id, color);
                
                // Test LAS system if available
                testLASSystem(id, color);
            }
        });
        
        // Check system status
        checkSystemStatus();
        
        // Check periodically for LAS system
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            checkCount++;
            if (window.LAS && window.LAS.coreManager) {
                clearInterval(checkInterval);
                addResult('✅ LAS Core Manager detected');
                checkSystemStatus();
            } else if (checkCount > 20) { // 10 seconds
                clearInterval(checkInterval);
                addResult('❌ LAS Core Manager not detected after 10 seconds');
            }
        }, 500);
    });
    
    function checkSystemStatus() {
        const results = [];
        
        // Check LAS namespace
        if (typeof window.LAS !== 'undefined') {
            results.push('✅ LAS namespace available');
            
            if (window.LAS.coreManager) {
                results.push('✅ LAS Core Manager available');
                
                if (window.LAS.coreManager.isInitialized && window.LAS.coreManager.isInitialized()) {
                    results.push('✅ Core Manager initialized');
                    
                    // Check modules
                    const modules = ['error', 'settings', 'preview', 'ajax'];
                    modules.forEach(module => {
                        const moduleInstance = window.LAS.coreManager.get(module);
                        if (moduleInstance) {
                            results.push(`✅ ${module} module available`);
                        } else {
                            results.push(`❌ ${module} module missing`);
                        }
                    });
                } else {
                    results.push('⚠️ Core Manager not initialized');
                }
            } else {
                results.push('❌ LAS Core Manager not available');
            }
        } else {
            results.push('❌ LAS namespace not available');
        }
        
        // Check configuration
        if (typeof lasAdminData !== 'undefined') {
            results.push('✅ lasAdminData available');
            
            if (lasAdminData.ajax_actions && lasAdminData.ajax_actions.get_preview_css) {
                results.push('✅ get_preview_css action configured');
            } else {
                results.push('❌ get_preview_css action missing');
            }
        } else {
            results.push('❌ lasAdminData not available');
        }
        
        document.getElementById('system-status').innerHTML = results.join('<br>');
    }
    
    function testLivePreview() {
        addResult('🧪 Starting live preview test...');
        
        // Test 1: Direct color changes
        updatePreviewDirect('menu-bg-test', '#ff0000');
        updatePreviewDirect('menu-text-test', '#ffffff');
        updatePreviewDirect('adminbar-bg-test', '#333333');
        
        // Test 2: LAS system if available
        if (window.LAS && window.LAS.coreManager) {
            testLASSystem('menu-bg-test', '#ff0000');
        } else {
            addResult('⚠️ LAS system not available for testing');
        }
    }
    
    function testLASSystem(elementId, color) {
        if (!window.LAS || !window.LAS.coreManager) {
            addResult('❌ LAS Core Manager not available');
            return;
        }
        
        const settingsManager = window.LAS.coreManager.get('settings');
        if (!settingsManager) {
            addResult('❌ Settings Manager not available');
            return;
        }
        
        // Map element ID to setting key
        const settingMap = {
            'menu-bg-test': 'menu_background_color',
            'menu-text-test': 'menu_text_color',
            'adminbar-bg-test': 'adminbar_background'
        };
        
        const settingKey = settingMap[elementId];
        if (!settingKey) {
            addResult(`❌ Unknown setting for ${elementId}`);
            return;
        }
        
        try {
            settingsManager.set(settingKey, color);
            addResult(`✅ LAS system updated: ${settingKey} = ${color}`);
        } catch (error) {
            addResult(`❌ LAS system error: ${error.message}`);
        }
    }
    
    function updatePreviewDirect(elementId, color) {
        // Direct DOM updates for immediate feedback
        switch(elementId) {
            case 'menu-bg-test':
                document.getElementById('adminmenu').style.backgroundColor = color;
                addResult(`✅ Direct update: menu background = ${color}`);
                break;
            case 'menu-text-test':
                const menuLinks = document.querySelectorAll('#adminmenu a');
                menuLinks.forEach(link => link.style.color = color);
                addResult(`✅ Direct update: menu text = ${color}`);
                break;
            case 'adminbar-bg-test':
                document.getElementById('wpadminbar').style.backgroundColor = color;
                addResult(`✅ Direct update: adminbar background = ${color}`);
                break;
        }
    }
    
    function resetColors() {
        updatePreviewDirect('menu-bg-test', '#23282d');
        updatePreviewDirect('menu-text-test', '#f0f0f1');
        updatePreviewDirect('adminbar-bg-test', '#1d2327');
        
        // Reset color picker values
        document.getElementById('menu-bg-test').value = '#23282d';
        document.getElementById('menu-text-test').value = '#f0f0f1';
        document.getElementById('adminbar-bg-test').value = '#1d2327';
        
        addResult('🔄 Colors reset to defaults');
    }
    
    function addResult(message) {
        const results = document.getElementById('test-results');
        const timestamp = new Date().toLocaleTimeString();
        results.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        results.scrollTop = results.scrollHeight;
    }
    </script>
    
    <style>
    .wrap { max-width: none; }
    #test-results div { 
        padding: 2px 0; 
        border-bottom: 1px solid #eee; 
        font-family: monospace; 
        font-size: 12px; 
    }
    </style>
    <?php
}

// Auto-add to admin menu if this file is accessed directly
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    // This file is being accessed directly, show instructions
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Live Preview Test Instructions</title>
    </head>
    <body>
        <h1>Live Preview Test Instructions</h1>
        <p>To test the live preview system:</p>
        <ol>
            <li>Copy this file to your WordPress plugin directory</li>
            <li>Add this line to your theme's functions.php or create a simple plugin:
                <pre>require_once '/path/to/test-live-preview-wordpress.php';</pre>
            </li>
            <li>Go to WordPress Admin → Tools → Test Live Preview</li>
            <li>Test the color pickers and check the results</li>
        </ol>
        
        <h2>Alternative: Quick Test</h2>
        <p>You can also add this to your WordPress admin page directly by adding it to the Live Admin Styler settings page.</p>
    </body>
    </html>
    <?php
    exit;
}
?>