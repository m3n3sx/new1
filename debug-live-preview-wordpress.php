<?php
/**
 * WordPress Live Preview Debug Script
 * 
 * Umieść ten plik w katalogu pluginu i odwiedź:
 * /wp-admin/admin.php?page=debug-live-preview
 */

// Tylko w WordPress admin
if (!defined('ABSPATH') || !is_admin()) {
    die('Ten skrypt musi być uruchomiony w WordPress admin');
}

// Dodaj stronę debug do menu admin
add_action('admin_menu', function() {
    add_submenu_page(
        'tools.php',
        'Live Preview Debug',
        'Live Preview Debug',
        'manage_options',
        'debug-live-preview',
        'las_debug_live_preview_page'
    );
});

function las_debug_live_preview_page() {
    ?>
    <div class="wrap">
        <h1>Live Preview Debug</h1>
        
        <div id="debug-results">
            <h2>1. Sprawdzanie funkcji</h2>
            <?php
            $functions = [
                'las_fresh_get_default_options',
                'las_fresh_generate_admin_css_output',
                'las_fresh_get_options'
            ];
            
            foreach ($functions as $func) {
                if (function_exists($func)) {
                    echo "<p style='color: green;'>✓ {$func} istnieje</p>";
                } else {
                    echo "<p style='color: red;'>✗ {$func} brakuje</p>";
                }
            }
            ?>
            
            <h2>2. Sprawdzanie klas</h2>
            <?php
            $classes = [
                'LAS_Ajax_Handlers',
                'LAS_Security_Validator',
                'LAS_Settings_Storage'
            ];
            
            foreach ($classes as $class) {
                if (class_exists($class)) {
                    echo "<p style='color: green;'>✓ {$class} istnieje</p>";
                } else {
                    echo "<p style='color: red;'>✗ {$class} brakuje</p>";
                }
            }
            ?>
            
            <h2>3. Sprawdzanie AJAX handlers</h2>
            <?php
            $ajax_actions = [
                'las_save_settings',
                'las_load_settings',
                'las_get_preview_css',
                'las_log_error'
            ];
            
            foreach ($ajax_actions as $action) {
                $hook = "wp_ajax_{$action}";
                if (has_action($hook)) {
                    echo "<p style='color: green;'>✓ {$action} zarejestrowany</p>";
                } else {
                    echo "<p style='color: red;'>✗ {$action} nie zarejestrowany</p>";
                }
            }
            ?>
            
            <h2>4. Test generowania CSS</h2>
            <?php
            if (function_exists('las_fresh_generate_admin_css_output')) {
                try {
                    $test_settings = [
                        'admin_menu_bg_color' => '#ff0000',
                        'admin_menu_text_color' => '#ffffff'
                    ];
                    
                    $css = las_fresh_generate_admin_css_output($test_settings);
                    
                    if (!empty($css)) {
                        echo "<p style='color: green;'>✓ CSS generation działa (" . strlen($css) . " znaków)</p>";
                        echo "<details><summary>Podgląd CSS</summary><pre style='max-height: 200px; overflow-y: auto;'>" . esc_html(substr($css, 0, 1000)) . "...</pre></details>";
                    } else {
                        echo "<p style='color: red;'>✗ CSS generation zwraca pusty wynik</p>";
                    }
                } catch (Exception $e) {
                    echo "<p style='color: red;'>✗ CSS generation błąd: " . esc_html($e->getMessage()) . "</p>";
                }
            } else {
                echo "<p style='color: red;'>✗ Funkcja CSS generation nie istnieje</p>";
            }
            ?>
            
            <h2>5. Test AJAX endpoint</h2>
            <div id="ajax-test-result">Testowanie...</div>
            
            <h2>6. Test JavaScript konfiguracji</h2>
            <div id="js-config-test">Sprawdzanie...</div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            // Test AJAX endpoint
            console.log('Testowanie AJAX endpoint...');
            
            $.post(ajaxurl, {
                action: 'las_get_preview_css',
                nonce: '<?php echo wp_create_nonce('las_ajax_nonce'); ?>',
                setting: 'admin_menu_bg_color',
                value: '#ff0000'
            })
            .done(function(response) {
                console.log('AJAX Success:', response);
                if (response.success) {
                    $('#ajax-test-result').html('<p style="color: green;">✓ AJAX endpoint działa</p>');
                } else {
                    $('#ajax-test-result').html('<p style="color: red;">✗ AJAX błąd: ' + (response.message || 'Nieznany błąd') + '</p>');
                }
            })
            .fail(function(xhr, status, error) {
                console.error('AJAX Failed:', status, error, xhr.responseText);
                $('#ajax-test-result').html('<p style="color: red;">✗ AJAX failed: ' + status + ' - ' + error + '</p>');
                if (xhr.responseText) {
                    $('#ajax-test-result').append('<details><summary>Response</summary><pre>' + xhr.responseText.substring(0, 500) + '</pre></details>');
                }
            });
            
            // Test JavaScript config
            if (typeof lasAdminData !== 'undefined') {
                $('#js-config-test').html('<p style="color: green;">✓ lasAdminData dostępne</p>');
                
                if (lasAdminData.ajax_actions && lasAdminData.ajax_actions.get_preview_css) {
                    $('#js-config-test').append('<p style="color: green;">✓ get_preview_css action skonfigurowany</p>');
                } else {
                    $('#js-config-test').append('<p style="color: red;">✗ get_preview_css action brakuje</p>');
                }
                
                console.log('lasAdminData:', lasAdminData);
            } else {
                $('#js-config-test').html('<p style="color: red;">✗ lasAdminData nie dostępne</p>');
            }
        });
        </script>
        
        <style>
        .wrap { max-width: 1200px; }
        details { margin: 10px 0; }
        pre { background: #f1f1f1; padding: 10px; border-radius: 4px; }
        </style>
    </div>
    <?php
}

// Jeśli uruchamiamy bezpośrednio, pokaż debug
if (isset($_GET['page']) && $_GET['page'] === 'debug-live-preview') {
    // Strona zostanie wyświetlona przez WordPress
}
?>