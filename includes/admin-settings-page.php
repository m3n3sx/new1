<?php
// Prevent direct access to the file.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Adds the top-level menu page for Admin Styler settings.
 * Hooked to admin_menu.
 */
function las_fresh_add_admin_menu() {
    add_menu_page(
        __('Admin Styler Settings', LAS_FRESH_TEXT_DOMAIN),
        __('Admin Styler', LAS_FRESH_TEXT_DOMAIN),
        'manage_options',
        LAS_FRESH_SETTINGS_SLUG, // Use the constant for the slug
        'las_fresh_render_settings_page',
        'dashicons-admin-customizer',
        80
    );
}
add_action('admin_menu', 'las_fresh_add_admin_menu');


/**
 * Get the active tab state for the current user.
 * Uses the enhanced LAS_User_State class for better state management.
 *
 * @return string The active tab ID, defaults to 'general'.
 */
function las_fresh_get_active_tab() {
    $user_state = new LAS_User_State();
    return $user_state->get_active_tab();
}

/**
 * Save the active tab state for the current user.
 * Uses the enhanced LAS_User_State class for better state management.
 *
 * @param string $tab The tab ID to save.
 * @return bool True on success, false on failure.
 */
function las_fresh_save_active_tab($tab) {
    $user_state = new LAS_User_State();
    return $user_state->set_active_tab($tab);
}

/**
 * Get enhanced default options including UI preferences.
 *
 * @return array Enhanced default options.
 */
function las_fresh_get_enhanced_default_options() {
    $base_options = las_fresh_get_default_options();
    $user_state = new LAS_User_State();
    $ui_preferences = $user_state->get_ui_preferences();
    
    return array_merge($base_options, array(
        // UI Enhancement Options
        'ui_theme' => $ui_preferences['ui_theme'],
        'animation_speed' => $ui_preferences['animation_speed'],
        'submenu_visibility' => $ui_preferences['submenu_visibility'],
        
        // State Management
        'remember_tab_state' => $ui_preferences['remember_tab_state'],
        'auto_save_changes' => $ui_preferences['auto_save_changes'],
        
        // Live Preview Settings
        'live_preview_enabled' => $ui_preferences['live_preview_enabled'],
        'live_preview_debounce' => $ui_preferences['live_preview_debounce'],
        
        // Advanced Features
        'smart_submenu' => $ui_preferences['smart_submenu'],
        'enhanced_tooltips' => $ui_preferences['enhanced_tooltips'],
        'keyboard_shortcuts' => $ui_preferences['keyboard_shortcuts'],
        'notification_duration' => $ui_preferences['notification_duration'],
        'search_highlight' => $ui_preferences['search_highlight'],
        'compact_mode' => $ui_preferences['compact_mode']
    ));
}

/**
 * Renders the content of the Admin Styler settings page.
 */
function las_fresh_render_settings_page() {
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to access this page.', LAS_FRESH_TEXT_DOMAIN));
    }

    $page_title = get_admin_page_title();
    $page_description = __('Dostosuj wygląd swojego panelu administratora. Zmiany w większości są widoczne na żywo. Zapisz, aby utrwalić.', LAS_FRESH_TEXT_DOMAIN);
    $active_tab = las_fresh_get_active_tab();
    ?>
    <div class="wrap las-fresh-settings-wrap">
        <h1><?php echo esc_html($page_title); ?></h1>
        <p><?php echo esc_html($page_description); ?></p>

        <?php if (isset($_GET['settings-updated']) && $_GET['settings-updated']) : ?>
            <div id="message" class="updated notice is-dismissible">
                <p><?php esc_html_e('Ustawienia zostały zapisane.', LAS_FRESH_TEXT_DOMAIN); ?></p>
            </div>
        <?php endif; ?>

        <!-- Enhanced Settings Search and Organization -->
        <div class="las-settings-header">
            <div class="las-search-container">
                <div class="las-search-wrapper">
                    <span class="las-search-icon dashicons dashicons-search"></span>
                    <input type="text" id="las-settings-search" class="las-search-input" 
                           placeholder="<?php esc_attr_e('Szukaj ustawień...', LAS_FRESH_TEXT_DOMAIN); ?>" 
                           autocomplete="off" />
                    <button type="button" id="las-search-clear" class="las-search-clear" 
                            title="<?php esc_attr_e('Wyczyść wyszukiwanie', LAS_FRESH_TEXT_DOMAIN); ?>">&times;</button>
                </div>
                <div class="las-search-results" id="las-search-results" style="display: none;">
                    <div class="las-search-results-header">
                        <span class="las-search-results-count"></span>
                        <button type="button" class="las-search-results-close">&times;</button>
                    </div>
                    <div class="las-search-results-content"></div>
                </div>
            </div>
            
            <div class="las-settings-filters">
                <button type="button" class="las-filter-button" data-filter="all">
                    <span class="dashicons dashicons-admin-settings"></span>
                    <?php esc_html_e('Wszystkie', LAS_FRESH_TEXT_DOMAIN); ?>
                </button>
                <button type="button" class="las-filter-button" data-filter="layout">
                    <span class="dashicons dashicons-layout"></span>
                    <?php esc_html_e('Układ', LAS_FRESH_TEXT_DOMAIN); ?>
                </button>
                <button type="button" class="las-filter-button" data-filter="colors">
                    <span class="dashicons dashicons-art"></span>
                    <?php esc_html_e('Kolory', LAS_FRESH_TEXT_DOMAIN); ?>
                </button>
                <button type="button" class="las-filter-button" data-filter="typography">
                    <span class="dashicons dashicons-editor-textcolor"></span>
                    <?php esc_html_e('Typografia', LAS_FRESH_TEXT_DOMAIN); ?>
                </button>
                <button type="button" class="las-filter-button" data-filter="advanced">
                    <span class="dashicons dashicons-admin-tools"></span>
                    <?php esc_html_e('Zaawansowane', LAS_FRESH_TEXT_DOMAIN); ?>
                </button>
            </div>
        </div>

        <div id="las-settings-tabs" data-active-tab="<?php echo esc_attr($active_tab); ?>">
            <ul>
                <li><a href="#las-tab-general">
                    <span class="las-tab-icon dashicons dashicons-admin-settings"></span>
                    <?php esc_html_e('Układ i Ogólne', LAS_FRESH_TEXT_DOMAIN); ?>
                </a></li>
                <li><a href="#las-tab-menu">
                    <span class="las-tab-icon dashicons dashicons-menu"></span>
                    <?php esc_html_e('Menu Boczne', LAS_FRESH_TEXT_DOMAIN); ?>
                </a></li>
                <li><a href="#las-tab-adminbar">
                    <span class="las-tab-icon dashicons dashicons-admin-generic"></span>
                    <?php esc_html_e('Górny Pasek', LAS_FRESH_TEXT_DOMAIN); ?>
                </a></li>
                <li><a href="#las-tab-content">
                    <span class="las-tab-icon dashicons dashicons-admin-page"></span>
                    <?php esc_html_e('Obszar Treści', LAS_FRESH_TEXT_DOMAIN); ?>
                </a></li>
                <li><a href="#las-tab-logos">
                    <span class="las-tab-icon dashicons dashicons-format-image"></span>
                    <?php esc_html_e('Logotypy', LAS_FRESH_TEXT_DOMAIN); ?>
                </a></li>
                <li><a href="#las-tab-advanced">
                    <span class="las-tab-icon dashicons dashicons-admin-tools"></span>
                    <?php esc_html_e('Zaawansowane', LAS_FRESH_TEXT_DOMAIN); ?>
                </a></li>
            </ul>

            <form method="post" action="options.php" id="las-fresh-settings-form">
                <?php
                settings_fields(LAS_FRESH_OPTION_GROUP); // Use the constant
                $page_slug_prefix = LAS_FRESH_SETTINGS_SLUG . '_'; // Use the constant
                ?>
                <div id="las-tab-general"><?php do_settings_sections($page_slug_prefix . 'general'); ?></div>
                <div id="las-tab-menu"><?php do_settings_sections($page_slug_prefix . 'menu'); ?></div>
                <div id="las-tab-adminbar"><?php do_settings_sections($page_slug_prefix . 'adminbar'); ?></div>
                <div id="las-tab-content"><?php do_settings_sections($page_slug_prefix . 'content'); ?></div>
                <div id="las-tab-logos"><?php do_settings_sections($page_slug_prefix . 'logos'); ?></div>
                <div id="las-tab-advanced"><?php do_settings_sections($page_slug_prefix . 'advanced'); ?></div>
                <?php submit_button(__('Zapisz wszystkie zmiany', LAS_FRESH_TEXT_DOMAIN)); ?>
            </form>
            
            <!-- User Preferences Panel -->
            <div class="las-preferences-panel">
                <h3><?php esc_html_e('Preferencje użytkownika', LAS_FRESH_TEXT_DOMAIN); ?></h3>
                <div class="las-preference-row">
                    <div>
                        <div class="las-preference-label"><?php esc_html_e('Zapamiętaj aktywną zakładkę', LAS_FRESH_TEXT_DOMAIN); ?></div>
                        <div class="las-preference-description"><?php esc_html_e('Automatycznie przywraca ostatnio aktywną zakładkę po odświeżeniu strony', LAS_FRESH_TEXT_DOMAIN); ?></div>
                    </div>
                    <div class="las-preference-control">
                        <label class="switch">
                            <input type="checkbox" id="las-pref-remember-tab" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="las-preference-row">
                    <div>
                        <div class="las-preference-label"><?php esc_html_e('Podgląd na żywo', LAS_FRESH_TEXT_DOMAIN); ?></div>
                        <div class="las-preference-description"><?php esc_html_e('Włącz natychmiastowy podgląd zmian podczas edycji ustawień', LAS_FRESH_TEXT_DOMAIN); ?></div>
                    </div>
                    <div class="las-preference-control">
                        <label class="switch">
                            <input type="checkbox" id="las-pref-live-preview" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="las-preference-row">
                    <div>
                        <div class="las-preference-label"><?php esc_html_e('Inteligentne submenu', LAS_FRESH_TEXT_DOMAIN); ?></div>
                        <div class="las-preference-description"><?php esc_html_e('Ulepszona widoczność i interakcje z submenu w panelu administracyjnym', LAS_FRESH_TEXT_DOMAIN); ?></div>
                    </div>
                    <div class="las-preference-control">
                        <label class="switch">
                            <input type="checkbox" id="las-pref-smart-submenu" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="las-preference-row">
                    <div>
                        <div class="las-preference-label"><?php esc_html_e('Tryb kompaktowy', LAS_FRESH_TEXT_DOMAIN); ?></div>
                        <div class="las-preference-description"><?php esc_html_e('Zmniejsza odstępy i rozmiary elementów interfejsu', LAS_FRESH_TEXT_DOMAIN); ?></div>
                    </div>
                    <div class="las-preference-control">
                        <label class="switch">
                            <input type="checkbox" id="las-pref-compact-mode">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="las-preference-row">
                    <div>
                        <div class="las-preference-label"><?php esc_html_e('Motyw interfejsu', LAS_FRESH_TEXT_DOMAIN); ?></div>
                        <div class="las-preference-description"><?php esc_html_e('Wybierz styl interfejsu wtyczki', LAS_FRESH_TEXT_DOMAIN); ?></div>
                    </div>
                    <div class="las-preference-control">
                        <select id="las-pref-ui-theme">
                            <option value="modern"><?php esc_html_e('Nowoczesny', LAS_FRESH_TEXT_DOMAIN); ?></option>
                            <option value="classic"><?php esc_html_e('Klasyczny', LAS_FRESH_TEXT_DOMAIN); ?></option>
                            <option value="minimal"><?php esc_html_e('Minimalny', LAS_FRESH_TEXT_DOMAIN); ?></option>
                        </select>
                    </div>
                </div>
                <div class="las-preference-row">
                    <div>
                        <div class="las-preference-label"><?php esc_html_e('Szybkość animacji', LAS_FRESH_TEXT_DOMAIN); ?></div>
                        <div class="las-preference-description"><?php esc_html_e('Kontroluje szybkość przejść i animacji w interfejsie', LAS_FRESH_TEXT_DOMAIN); ?></div>
                    </div>
                    <div class="las-preference-control">
                        <select id="las-pref-animation-speed">
                            <option value="slow"><?php esc_html_e('Wolno', LAS_FRESH_TEXT_DOMAIN); ?></option>
                            <option value="normal"><?php esc_html_e('Normalnie', LAS_FRESH_TEXT_DOMAIN); ?></option>
                            <option value="fast"><?php esc_html_e('Szybko', LAS_FRESH_TEXT_DOMAIN); ?></option>
                            <option value="none"><?php esc_html_e('Bez animacji', LAS_FRESH_TEXT_DOMAIN); ?></option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e1e5e9;">
                    <button type="button" class="button" id="las-reset-preferences"><?php esc_html_e('Resetuj preferencje', LAS_FRESH_TEXT_DOMAIN); ?></button>
                    <button type="button" class="button button-primary" id="las-save-preferences"><?php esc_html_e('Zapisz preferencje', LAS_FRESH_TEXT_DOMAIN); ?></button>
                </div>
            </div>

            <?php if (WP_DEBUG): ?>
            <!-- Debug: Enhanced System Test -->
            <div style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e1e5e9;">
                <h3>Test rozszerzonych funkcji (tylko w trybie debug)</h3>
                <p>Przetestuj różne komponenty systemu:</p>
                <div style="margin-bottom: 12px;">
                    <strong>Powiadomienia:</strong>
                    <button type="button" class="button" onclick="testNotifications('success')">Success</button>
                    <button type="button" class="button" onclick="testNotifications('error')">Error</button>
                    <button type="button" class="button" onclick="testNotifications('warning')">Warning</button>
                    <button type="button" class="button" onclick="testNotifications('info')">Info</button>
                </div>
                <div style="margin-bottom: 12px;">
                    <strong>Stan użytkownika:</strong>
                    <button type="button" class="button" onclick="testStateSync()">Test Sync</button>
                    <button type="button" class="button" onclick="testStateReset()">Test Reset</button>
                    <button type="button" class="button" onclick="testOfflineMode()">Test Offline</button>
                </div>
                <div>
                    <strong>Interfejs:</strong>
                    <button type="button" class="button" onclick="testLoadingOverlay()">Loading</button>
                    <button type="button" class="button" onclick="testThemeSwitch()">Theme Switch</button>
                </div>
                <script>
                function testNotifications(type) {
                    if (window.ErrorManager) {
                        var messages = {
                            success: 'Test powiadomienia o sukcesie z akcjami!',
                            error: 'Test powiadomienia o błędzie z szczegółami!',
                            warning: 'Test powiadomienia ostrzegawczego!',
                            info: 'Test powiadomienia informacyjnego!'
                        };
                        
                        var options = {
                            duration: 6000,
                            actions: [{
                                label: 'Akcja główna',
                                primary: true,
                                callback: function() {
                                    alert('Wykonano akcję główną!');
                                }
                            }, {
                                label: 'Anuluj',
                                callback: function() {
                                    console.log('Anulowano akcję');
                                }
                            }]
                        };
                        
                        window.ErrorManager['show' + type.charAt(0).toUpperCase() + type.slice(1)](messages[type], options);
                    } else {
                        alert('ErrorManager nie jest dostępny');
                    }
                }
                
                function testStateSync() {
                    if (window.StateManager) {
                        window.StateManager.syncToServer();
                        console.log('Test synchronizacji stanu wykonany');
                    }
                }
                
                function testStateReset() {
                    if (window.StateManager) {
                        window.StateManager.resetToDefaults();
                    }
                }
                
                function testOfflineMode() {
                    window.StateManager.isOnline = !window.StateManager.isOnline;
                    console.log('Tryb offline:', !window.StateManager.isOnline);
                    if (window.ErrorManager) {
                        window.ErrorManager.showInfo('Tryb offline: ' + (!window.StateManager.isOnline ? 'włączony' : 'wyłączony'));
                    }
                }
                
                function testLoadingOverlay() {
                    if (window.LoadingManager) {
                        window.LoadingManager.show('Testowanie nakładki ładowania...');
                        setTimeout(function() {
                            window.LoadingManager.updateMessage('Prawie gotowe...');
                        }, 2000);
                        setTimeout(function() {
                            window.LoadingManager.hide();
                        }, 4000);
                    } else {
                        alert('LoadingManager nie jest dostępny');
                    }
                }
                
                function testThemeSwitch() {
                    if (window.StateManager) {
                        var themes = ['modern', 'classic', 'minimal'];
                        var currentTheme = window.StateManager.getUserPreference('ui_theme', 'modern');
                        var currentIndex = themes.indexOf(currentTheme);
                        var nextTheme = themes[(currentIndex + 1) % themes.length];
                        
                        window.StateManager.setUserPreference('ui_theme', nextTheme);
                        
                        if (window.ErrorManager) {
                            window.ErrorManager.showInfo('Przełączono na motyw: ' + nextTheme);
                        }
                    }
                }
                </script>
            </div>
            <?php endif; ?>
        </div>
    </div>
    <?php
}

/**
 * Enhanced settings sanitization with improved validation.
 *
 * @param array $input Raw input data from form submission.
 * @return array Sanitized and validated options.
 */
function las_fresh_enhanced_sanitize_options($input) {
    if (!is_array($input)) {
        return las_fresh_get_enhanced_default_options();
    }
    
    $sanitized = array();
    $defaults = las_fresh_get_enhanced_default_options();
    $user_state = new LAS_User_State();
    $validation_rules = $user_state->get_validation_rules();
    
    foreach ($defaults as $key => $default_value) {
        if (!isset($input[$key])) {
            $sanitized[$key] = $default_value;
            continue;
        }
        
        $value = $input[$key];
        
        // Use enhanced validation if available
        if (isset($validation_rules[$key])) {
            $sanitized[$key] = las_validate_setting_by_rule($key, $value, $validation_rules[$key]);
        } else {
            // Fallback to legacy validation
            $sanitized[$key] = las_sanitize_setting_value($key, $value, $default_value);
        }
    }
    
    // Validate interdependent settings
    $sanitized = las_validate_interdependent_settings($sanitized);
    
    // Log validation results in debug mode
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $changed_settings = array();
        foreach ($sanitized as $key => $value) {
            if (isset($input[$key]) && $input[$key] !== $value) {
                $changed_settings[$key] = array(
                    'original' => $input[$key],
                    'sanitized' => $value
                );
            }
        }
        
        if (!empty($changed_settings)) {
            error_log('LAS Settings Validation: ' . wp_json_encode($changed_settings));
        }
    }
    
    return $sanitized;
}

/**
 * Validate a setting value based on validation rules.
 *
 * @param string $key Setting key.
 * @param mixed  $value Raw value.
 * @param array  $rule Validation rule.
 * @return mixed Validated value.
 */
function las_validate_setting_by_rule($key, $value, $rule) {
    switch ($rule['type']) {
        case 'select':
            return in_array($value, $rule['options']) ? $value : $rule['default'];
            
        case 'integer':
            $int_value = intval($value);
            if (isset($rule['min']) && $int_value < $rule['min']) {
                return $rule['min'];
            }
            if (isset($rule['max']) && $int_value > $rule['max']) {
                return $rule['max'];
            }
            return $int_value;
            
        case 'boolean':
            return (bool) $value;
            
        default:
            return sanitize_text_field($value);
    }
}

/**
 * Validate interdependent settings.
 *
 * @param array $settings Sanitized settings array.
 * @return array Settings with interdependent validation applied.
 */
function las_validate_interdependent_settings($settings) {
    // Validate font family and Google font pairs
    $font_pairs = array(
        'admin_menu_font_family' => 'admin_menu_google_font',
        'admin_submenu_font_family' => 'admin_submenu_google_font',
        'admin_bar_font_family' => 'admin_bar_google_font',
        'body_font_family' => 'body_google_font'
    );
    
    foreach ($font_pairs as $family_key => $google_key) {
        if (isset($settings[$family_key]) && isset($settings[$google_key])) {
            if ($settings[$family_key] === 'google' && empty($settings[$google_key])) {
                // If Google font is selected but no font name provided, reset to default
                $settings[$family_key] = 'default';
            } elseif ($settings[$family_key] !== 'google' && !empty($settings[$google_key])) {
                // If non-Google font is selected but Google font name is provided, clear it
                $settings[$google_key] = '';
            }
        }
    }
    
    // Validate shadow settings
    $shadow_pairs = array(
        'admin_menu_shadow_type' => array(
            'simple' => 'admin_menu_shadow_simple',
            'advanced' => array(
                'admin_menu_shadow_advanced_color',
                'admin_menu_shadow_advanced_offset_x',
                'admin_menu_shadow_advanced_offset_y',
                'admin_menu_shadow_advanced_blur',
                'admin_menu_shadow_advanced_spread'
            )
        ),
        'admin_bar_shadow_type' => array(
            'simple' => 'admin_bar_shadow_simple',
            'advanced' => array(
                'admin_bar_shadow_advanced_color',
                'admin_bar_shadow_advanced_offset_x',
                'admin_bar_shadow_advanced_offset_y',
                'admin_bar_shadow_advanced_blur',
                'admin_bar_shadow_advanced_spread'
            )
        )
    );
    
    foreach ($shadow_pairs as $type_key => $dependent_keys) {
        if (isset($settings[$type_key])) {
            $shadow_type = $settings[$type_key];
            
            if ($shadow_type === 'none') {
                // Clear all shadow-related settings when type is 'none'
                foreach ($dependent_keys as $mode => $keys) {
                    if (is_array($keys)) {
                        foreach ($keys as $key) {
                            if (isset($settings[$key])) {
                                $settings[$key] = '';
                            }
                        }
                    } elseif (isset($settings[$keys])) {
                        $settings[$keys] = '';
                    }
                }
            }
        }
    }
    
    // Validate border radius settings
    $radius_pairs = array(
        'admin_menu_border_radius_type' => 'admin_menu',
        'admin_bar_border_radius_type' => 'admin_bar'
    );
    
    foreach ($radius_pairs as $type_key => $prefix) {
        if (isset($settings[$type_key])) {
            $radius_type = $settings[$type_key];
            
            if ($radius_type === 'all') {
                // Clear individual radius settings when type is 'all'
                $individual_keys = array('_tl', '_tr', '_br', '_bl');
                foreach ($individual_keys as $suffix) {
                    $key = $prefix . '_border_radius' . $suffix;
                    if (isset($settings[$key])) {
                        $settings[$key] = 0;
                    }
                }
            }
        }
    }
    
    return $settings;
}

/**
 * Legacy setting value sanitization for backward compatibility.
 *
 * @param string $key Setting key.
 * @param mixed  $value Raw value.
 * @param mixed  $default_value Default value.
 * @return mixed Sanitized value.
 */
function las_sanitize_setting_value($key, $value, $default_value) {
    // Color settings
    if (strpos($key, '_color') !== false || strpos($key, '_gradient_color') !== false) {
        $sanitized = sanitize_hex_color($value);
        return $sanitized ? $sanitized : $default_value;
    }
    
    // Numeric settings
    if (is_numeric($value) && (
        is_int($default_value) || 
        strpos($key, '_size') !== false || 
        strpos($key, '_height') !== false || 
        strpos($key, '_width') !== false || 
        strpos($key, '_margin') !== false || 
        strpos($key, '_padding') !== false || 
        strpos($key, '_radius') !== false || 
        strpos($key, '_offset_') !== false || 
        strpos($key, '_blur') !== false || 
        strpos($key, '_spread') !== false
    )) {
        // Allow negative values for offset and spread settings
        if (in_array($key, array(
            'admin_menu_shadow_advanced_offset_x', 
            'admin_menu_shadow_advanced_offset_y', 
            'admin_menu_shadow_advanced_spread',
            'admin_bar_shadow_advanced_offset_x', 
            'admin_bar_shadow_advanced_offset_y', 
            'admin_bar_shadow_advanced_spread'
        ))) {
            return intval($value);
        } else {
            return absint($value);
        }
    }
    
    // Boolean settings
    if (is_bool($default_value) || in_array($key, array('admin_menu_detached', 'admin_bar_detached'))) {
        return ($value === '1' || $value === true || $value === 1);
    }
    
    // Default text sanitization
    return sanitize_text_field($value);
}

/**
 * Registers settings, sections, and fields with WordPress Settings API.
 */
function las_fresh_register_settings() {
    register_setting(LAS_FRESH_OPTION_GROUP, LAS_FRESH_OPTION_NAME, array( // Use constants
        'sanitize_callback' => 'las_fresh_enhanced_sanitize_options',
        'default'           => las_fresh_get_enhanced_default_options(), // Provide enhanced defaults
    ));

    $defaults = las_fresh_get_default_options();
    $page_slug_prefix = LAS_FRESH_SETTINGS_SLUG . '_'; // Use the constant

    $font_family_options = array(
        'default' => __('Domyślna WordPress', LAS_FRESH_TEXT_DOMAIN),
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif' => __('Systemowa Sans-serif', LAS_FRESH_TEXT_DOMAIN),
        'Arial, Helvetica, sans-serif' => 'Arial',
        'Georgia, serif' => 'Georgia',
        'Verdana, Geneva, sans-serif' => 'Verdana',
        'Times New Roman, Times, serif' => 'Times New Roman',
        'Courier New, Courier, monospace' => 'Courier New',
        'google' => __('Użyj Google Font (wpisz poniżej)', LAS_FRESH_TEXT_DOMAIN)
    );
    $gradient_directions = array(
        'to bottom'       => __('Do dołu', LAS_FRESH_TEXT_DOMAIN),
        'to top'          => __('Do góry', LAS_FRESH_TEXT_DOMAIN),
        'to right'        => __('Do prawa', LAS_FRESH_TEXT_DOMAIN),
        'to left'         => __('Do lewa', LAS_FRESH_TEXT_DOMAIN),
        'to bottom right' => __('Do prawego dolnego rogu', LAS_FRESH_TEXT_DOMAIN),
        'to bottom left'  => __('Do lewego dolnego rogu', LAS_FRESH_TEXT_DOMAIN),
        '45deg'           => __('Ukośnie (45°)', LAS_FRESH_TEXT_DOMAIN),
        '135deg'          => __('Ukośnie (135°)', LAS_FRESH_TEXT_DOMAIN)
    );
    $shadow_types_options = array(
        'none'     => __('Brak cienia', LAS_FRESH_TEXT_DOMAIN),
        'simple'   => __('Prosty (wpisz wartość)', LAS_FRESH_TEXT_DOMAIN),
        'advanced' => __('Zaawansowany (skonfiguruj poniżej)', LAS_FRESH_TEXT_DOMAIN)
    );
    $border_radius_type_options = array(
        'all'        => __('Wszystkie narożniki takie same', LAS_FRESH_TEXT_DOMAIN),
        'individual' => __('Pojedyncze narożniki', LAS_FRESH_TEXT_DOMAIN)
    );

    $available_templates_raw = las_fresh_get_available_templates();
    $template_options_for_select = array();
    foreach ($available_templates_raw as $key => $template) {
        $template_options_for_select[$key] = $template['name'];
    }

    // --- General Tab ---
    add_settings_section('las_fresh_s_general_main', '', 'las_fresh_render_enhanced_general_section_header', "{$page_slug_prefix}general");
    add_settings_field('active_template_selector', __('Wybierz Gotowy Szablon', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_enhanced_template_selector_field', $page_slug_prefix . 'general', 'las_fresh_s_general_main', array('id' => 'active_template_selector', 'options' => $template_options_for_select, 'description' => __('Wybierz szablon i kliknij "Zastosuj". Pamiętaj, aby zapisać wszystkie zmiany.', LAS_FRESH_TEXT_DOMAIN)));
    add_settings_field('border_radius', __('Globalne Zaokrąglenie Rogów (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_enhanced_slider_field', $page_slug_prefix . 'general', 'las_fresh_s_general_main', array('id' => 'border_radius', 'default' => $defaults['border_radius'], 'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px'));

    add_settings_section('las_fresh_s_general_layout', __('Odklejenie Elementów od Krawędzi', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}general");
    add_settings_field('admin_menu_detached', __('Menu Boczne', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_checkbox_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_menu_detached', 'default' => $defaults['admin_menu_detached'], 'cb_label' => __('Odklejone', LAS_FRESH_TEXT_DOMAIN), 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_menu_margin_top', __('Margines Górny Menu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_menu_margin_top', 'default' => $defaults['admin_menu_margin_top'], 'min' => 0, 'max' => 100, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_detached', 'dependency_value' => '1'));
    add_settings_field('admin_menu_margin_left', __('Margines Lewy Menu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_menu_margin_left', 'default' => $defaults['admin_menu_margin_left'], 'min' => 0, 'max' => 100, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_detached', 'dependency_value' => '1'));
    add_settings_field('admin_menu_margin_bottom', __('Margines Dolny Menu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_menu_margin_bottom', 'default' => $defaults['admin_menu_margin_bottom'], 'min' => 0, 'max' => 100, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_detached', 'dependency_value' => '1'));
    
    add_settings_field('admin_bar_detached', __('Górny Pasek', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_checkbox_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_bar_detached', 'default' => $defaults['admin_bar_detached'], 'cb_label' => __('Odklejony', LAS_FRESH_TEXT_DOMAIN), 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_bar_margin_top', __('Margines Górny Paska (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_bar_margin_top', 'default' => $defaults['admin_bar_margin_top'], 'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_detached', 'dependency_value' => '1'));
    add_settings_field('admin_bar_margin_left', __('Margines Lewy Paska (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_bar_margin_left', 'default' => $defaults['admin_bar_margin_left'], 'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_detached', 'dependency_value' => '1'));
    add_settings_field('admin_bar_margin_right', __('Margines Prawy Paska (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'general', 'las_fresh_s_general_layout', array('id' => 'admin_bar_margin_right', 'default' => $defaults['admin_bar_margin_right'], 'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_detached', 'dependency_value' => '1'));

    // --- Menu Tab ---
    add_settings_section('las_fresh_s_menu_bg', __('Tło Menu Bocznego', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}menu");
    add_settings_field('admin_menu_bg_type', __('Typ Tła', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_bg', array('id' => 'admin_menu_bg_type', 'default' => $defaults['admin_menu_bg_type'], 'options' => array('solid' => 'Jednolity Kolor', 'gradient' => 'Gradient'), 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_menu_bg_color', __('Kolor Tła (jednolity)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_bg', array('id' => 'admin_menu_bg_color', 'default' => $defaults['admin_menu_bg_color'], 'dependency_id' => 'admin_menu_bg_type', 'dependency_value' => 'solid'));
    add_settings_field('admin_menu_bg_gradient_color1', __('Kolor 1 Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_bg', array('id' => 'admin_menu_bg_gradient_color1', 'default' => $defaults['admin_menu_bg_gradient_color1'], 'dependency_id' => 'admin_menu_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('admin_menu_bg_gradient_color2', __('Kolor 2 Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_bg', array('id' => 'admin_menu_bg_gradient_color2', 'default' => $defaults['admin_menu_bg_gradient_color2'], 'dependency_id' => 'admin_menu_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('admin_menu_bg_gradient_direction', __('Kierunek Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_bg', array('id' => 'admin_menu_bg_gradient_direction', 'default' => $defaults['admin_menu_bg_gradient_direction'], 'options' => $gradient_directions, 'dependency_id' => 'admin_menu_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('admin_submenu_bg_color', __('Tło Submenu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_bg', array('id' => 'admin_submenu_bg_color', 'default' => $defaults['admin_submenu_bg_color']));
    
    add_settings_section('las_fresh_s_menu_text', __('Tekst Menu Bocznego', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}menu");
    add_settings_field('admin_menu_text_color', __('Kolor Tekstu Menu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_text', array('id' => 'admin_menu_text_color', 'default' => $defaults['admin_menu_text_color']));
    add_settings_field('admin_menu_font_family', __('Rodzina Czcionek Menu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_with_google_font_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_text', array('id' => 'admin_menu_font_family', 'google_font_id' => 'admin_menu_google_font', 'default' => $defaults['admin_menu_font_family'], 'options' => $font_family_options));
    add_settings_field('admin_menu_font_size', __('Rozmiar Czcionki Menu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_text', array('id' => 'admin_menu_font_size', 'default' => $defaults['admin_menu_font_size'], 'min' => 10, 'max' => 24, 'step' => 1, 'unit' => 'px'));
    add_settings_field('admin_submenu_text_color', __('Kolor Tekstu Submenu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_text', array('id' => 'admin_submenu_text_color', 'default' => $defaults['admin_submenu_text_color']));
    add_settings_field('admin_submenu_font_family', __('Rodzina Czcionek Submenu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_with_google_font_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_text', array('id' => 'admin_submenu_font_family', 'google_font_id' => 'admin_submenu_google_font', 'default' => $defaults['admin_submenu_font_family'], 'options' => $font_family_options));
    add_settings_field('admin_submenu_font_size', __('Rozmiar Czcionki Submenu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_text', array('id' => 'admin_submenu_font_size', 'default' => $defaults['admin_submenu_font_size'], 'min' => 9, 'max' => 20, 'step' => 1, 'unit' => 'px'));
    add_settings_field('accent_color', __('Kolor Akcentu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_text', array('id' => 'accent_color', 'default' => $defaults['accent_color']));
    
    add_settings_section('las_fresh_s_menu_layout', __('Układ Menu Bocznego', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}menu");
    add_settings_field('admin_menu_width', __('Szerokość Menu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_width', 'default' => $defaults['admin_menu_width'], 'min' => 160, 'max' => 350, 'step' => 1, 'unit' => 'px'));
    add_settings_field('admin_menu_padding_top_bottom', __('Padding Góra/Dół Pozycji (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_padding_top_bottom', 'default' => $defaults['admin_menu_padding_top_bottom'], 'min' => 0, 'max' => 30, 'step' => 1, 'unit' => 'px'));
    add_settings_field('admin_menu_padding_left_right', __('Padding Lewo/Prawo Pozycji (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_padding_left_right', 'default' => $defaults['admin_menu_padding_left_right'], 'min' => 0, 'max' => 30, 'step' => 1, 'unit' => 'px'));
    
    // Menu Corner Rounding
    add_settings_field('admin_menu_border_radius_type', __('Typ Zaokrąglenia Narożników Menu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_border_radius_type', 'default' => $defaults['admin_menu_border_radius_type'], 'options' => $border_radius_type_options, 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_menu_border_radius_all', __('Zaokrąglenie Rogów Menu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_border_radius_all', 'default' => $defaults['admin_menu_border_radius_all'], 'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_border_radius_type', 'dependency_value' => 'all'));
    las_fresh_render_individual_border_radius_fields($page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', 'admin_menu', $defaults);


    add_settings_field('admin_menu_shadow_type', __('Typ Cienia Menu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_shadow_type', 'default' => $defaults['admin_menu_shadow_type'], 'options' => $shadow_types_options, 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_menu_shadow_simple', __('Cień Menu (prosty)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_text_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_shadow_simple', 'default' => $defaults['admin_menu_shadow_simple'], 'dependency_id' => 'admin_menu_shadow_type', 'dependency_value' => 'simple', 'description' => 'Np. 2px 0 10px rgba(0,0,0,0.15)'));
    add_settings_field('admin_menu_shadow_advanced_color', __('Kolor Cienia (zaaw.)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_shadow_advanced_color', 'default' => $defaults['admin_menu_shadow_advanced_color'], 'dependency_id' => 'admin_menu_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_menu_shadow_advanced_offset_x', __('Przesunięcie X (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_shadow_advanced_offset_x', 'default' => $defaults['admin_menu_shadow_advanced_offset_x'], 'min' => -50, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_menu_shadow_advanced_offset_y', __('Przesunięcie Y (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_shadow_advanced_offset_y', 'default' => $defaults['admin_menu_shadow_advanced_offset_y'], 'min' => -50, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_menu_shadow_advanced_blur', __('Rozmycie (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_shadow_advanced_blur', 'default' => $defaults['admin_menu_shadow_advanced_blur'], 'min' => 0, 'max' => 100, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_menu_shadow_advanced_spread', __('Rozprzestrzenienie (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'menu', 'las_fresh_s_menu_layout', array('id' => 'admin_menu_shadow_advanced_spread', 'default' => $defaults['admin_menu_shadow_advanced_spread'], 'min' => -50, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_menu_shadow_type', 'dependency_value' => 'advanced'));

    // --- Admin Bar Tab ---
    add_settings_section('las_fresh_s_adminbar_bg', __('Tło Górnego Paska', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}adminbar");
    add_settings_field('admin_bar_bg_type', __('Typ Tła', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_bg', array('id' => 'admin_bar_bg_type', 'default' => $defaults['admin_bar_bg_type'], 'options' => array('solid' => 'Jednolity Kolor', 'gradient' => 'Gradient'), 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_bar_bg_color', __('Kolor Tła (jednolity)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_bg', array('id' => 'admin_bar_bg_color', 'default' => $defaults['admin_bar_bg_color'], 'dependency_id' => 'admin_bar_bg_type', 'dependency_value' => 'solid'));
    add_settings_field('admin_bar_bg_gradient_color1', __('Kolor 1 Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_bg', array('id' => 'admin_bar_bg_gradient_color1', 'default' => $defaults['admin_bar_bg_gradient_color1'], 'dependency_id' => 'admin_bar_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('admin_bar_bg_gradient_color2', __('Kolor 2 Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_bg', array('id' => 'admin_bar_bg_gradient_color2', 'default' => $defaults['admin_bar_bg_gradient_color2'], 'dependency_id' => 'admin_bar_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('admin_bar_bg_gradient_direction', __('Kierunek Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_bg', array('id' => 'admin_bar_bg_gradient_direction', 'default' => $defaults['admin_bar_bg_gradient_direction'], 'options' => $gradient_directions, 'dependency_id' => 'admin_bar_bg_type', 'dependency_value' => 'gradient'));
    
    add_settings_section('las_fresh_s_adminbar_text', __('Tekst i Układ Górnego Paska', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}adminbar");
    add_settings_field('admin_bar_text_color', __('Kolor Tekstu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_text_color', 'default' => $defaults['admin_bar_text_color']));
    add_settings_field('admin_bar_font_family', __('Rodzina Czcionek', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_with_google_font_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_font_family', 'google_font_id' => 'admin_bar_google_font', 'default' => $defaults['admin_bar_font_family'], 'options' => $font_family_options));
    add_settings_field('admin_bar_font_size', __('Rozmiar Czcionki (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_font_size', 'default' => $defaults['admin_bar_font_size'], 'min' => 9, 'max' => 20, 'step' => 1, 'unit' => 'px'));
    add_settings_field('admin_bar_height', __('Wysokość Paska (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_height', 'default' => $defaults['admin_bar_height'], 'min' => 28, 'max' => 80, 'step' => 1, 'unit' => 'px', 'description' => __('Puste lub 0 = domyślna WordPress (32px).', LAS_FRESH_TEXT_DOMAIN)));
    add_settings_field('admin_bar_width_type', __('Typ Szerokości Paska', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_width_type', 'default' => $defaults['admin_bar_width_type'], 'options' => array('percentage' => __('% (procenty)', LAS_FRESH_TEXT_DOMAIN), 'px' => __('px (piksele)', LAS_FRESH_TEXT_DOMAIN)), 'description' => __('Działa najlepiej z "Odklejonym Paskiem".', LAS_FRESH_TEXT_DOMAIN), 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_bar_width_percentage', __('Szerokość Paska (%)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_width_percentage', 'default' => $defaults['admin_bar_width_percentage'], 'min' => 50, 'max' => 100, 'step' => 1, 'unit' => '%', 'dependency_id' => 'admin_bar_width_type', 'dependency_value' => 'percentage'));
    add_settings_field('admin_bar_width_px', __('Szerokość Paska (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_width_px', 'default' => $defaults['admin_bar_width_px'], 'min' => 400, 'max' => 2000, 'step' => 10, 'unit' => 'px', 'dependency_id' => 'admin_bar_width_type', 'dependency_value' => 'px'));
    add_settings_field('admin_bar_padding_top_bottom', __('Padding Góra/Dół Pozycji (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_padding_top_bottom', 'default' => $defaults['admin_bar_padding_top_bottom'], 'min' => 0, 'max' => 30, 'step' => 1, 'unit' => 'px'));
    add_settings_field('admin_bar_padding_left_right', __('Padding Lewo/Prawo Pozycji (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_padding_left_right', 'default' => $defaults['admin_bar_padding_left_right'], 'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px'));
    
    // Admin Bar Corner Rounding
    add_settings_field('admin_bar_border_radius_type', __('Typ Zaokrąglenia Narożników Paska', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_border_radius_type', 'default' => $defaults['admin_bar_border_radius_type'], 'options' => $border_radius_type_options, 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_bar_border_radius_all', __('Zaokrąglenie Rogów Paska (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_border_radius_all', 'default' => $defaults['admin_bar_border_radius_all'], 'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_border_radius_type', 'dependency_value' => 'all'));
    las_fresh_render_individual_border_radius_fields($page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', 'admin_bar', $defaults);
    // Removed 'admin_bar_round_bottom_corners' field

    add_settings_field('admin_bar_shadow_type', __('Typ Cienia Paska', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_shadow_type', 'default' => $defaults['admin_bar_shadow_type'], 'options' => $shadow_types_options, 'data-dependency-trigger' => 'true'));
    add_settings_field('admin_bar_shadow_simple', __('Cień Paska (prosty)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_text_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_shadow_simple', 'default' => $defaults['admin_bar_shadow_simple'], 'dependency_id' => 'admin_bar_shadow_type', 'dependency_value' => 'simple', 'description' => 'Np. 0 2px 5px rgba(0,0,0,0.1)'));
    add_settings_field('admin_bar_shadow_advanced_color', __('Kolor Cienia (zaaw.)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_shadow_advanced_color', 'default' => $defaults['admin_bar_shadow_advanced_color'], 'dependency_id' => 'admin_bar_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_bar_shadow_advanced_offset_x', __('Przesunięcie X (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_shadow_advanced_offset_x', 'default' => $defaults['admin_bar_shadow_advanced_offset_x'], 'min' => -50, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_bar_shadow_advanced_offset_y', __('Przesunięcie Y (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_shadow_advanced_offset_y', 'default' => $defaults['admin_bar_shadow_advanced_offset_y'], 'min' => -50, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_bar_shadow_advanced_blur', __('Rozmycie (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_shadow_advanced_blur', 'default' => $defaults['admin_bar_shadow_advanced_blur'], 'min' => 0, 'max' => 100, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_shadow_type', 'dependency_value' => 'advanced'));
    add_settings_field('admin_bar_shadow_advanced_spread', __('Rozprzestrzenienie (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'adminbar', 'las_fresh_s_adminbar_text', array('id' => 'admin_bar_shadow_advanced_spread', 'default' => $defaults['admin_bar_shadow_advanced_spread'], 'min' => -50, 'max' => 50, 'step' => 1, 'unit' => 'px', 'dependency_id' => 'admin_bar_shadow_type', 'dependency_value' => 'advanced'));

    // --- Content Tab ---
    add_settings_section('las_fresh_s_content_look', __('Wygląd Obszaru Treści', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}content");
    add_settings_field('body_bg_type', __('Typ Tła Obszaru Treści', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_bg_type', 'default' => $defaults['body_bg_type'], 'options' => array('solid' => 'Jednolity Kolor', 'gradient' => 'Gradient'), 'data-dependency-trigger' => 'true'));
    add_settings_field('body_bg_color', __('Kolor Tła (jednolity)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_bg_color', 'default' => $defaults['body_bg_color'], 'dependency_id' => 'body_bg_type', 'dependency_value' => 'solid'));
    add_settings_field('body_bg_gradient_color1', __('Kolor 1 Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_bg_gradient_color1', 'default' => $defaults['body_bg_gradient_color1'], 'dependency_id' => 'body_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('body_bg_gradient_color2', __('Kolor 2 Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_bg_gradient_color2', 'default' => $defaults['body_bg_gradient_color2'], 'dependency_id' => 'body_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('body_bg_gradient_direction', __('Kierunek Gradientu', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_bg_gradient_direction', 'default' => $defaults['body_bg_gradient_direction'], 'options' => $gradient_directions, 'dependency_id' => 'body_bg_type', 'dependency_value' => 'gradient'));
    add_settings_field('body_text_color', __('Kolor Tekstu Głównego', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_color_picker_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_text_color', 'default' => $defaults['body_text_color']));
    add_settings_field('body_font_family', __('Rodzina Czcionek Główna', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_select_with_google_font_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_font_family', 'google_font_id' => 'body_google_font', 'default' => $defaults['body_font_family'], 'options' => $font_family_options));
    add_settings_field('body_font_size', __('Rozmiar Czcionki Głównej (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'content', 'las_fresh_s_content_look', array('id' => 'body_font_size', 'default' => $defaults['body_font_size'], 'min' => 10, 'max' => 20, 'step' => 1, 'unit' => 'px'));

    // --- Logos Tab ---
    add_settings_section('las_fresh_s_logos_main', __('Ustawienia Logotypów', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}logos");
    add_settings_field('admin_menu_logo', __('Logo w Menu Bocznym', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_image_upload_field', $page_slug_prefix . 'logos', 'las_fresh_s_logos_main', array('id' => 'admin_menu_logo', 'default' => $defaults['admin_menu_logo']));
    add_settings_field('admin_menu_logo_height', __('Maks. Wysokość Logo w Menu (px)', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_slider_field', $page_slug_prefix . 'logos', 'las_fresh_s_logos_main', array('id' => 'admin_menu_logo_height', 'default' => $defaults['admin_menu_logo_height'], 'min' => 20, 'max' => 150, 'step' => 1, 'unit' => 'px'));
    add_settings_field('login_logo', __('Logo na Stronie Logowania', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_image_upload_field', $page_slug_prefix . 'logos', 'las_fresh_s_logos_main', array('id' => 'login_logo', 'default' => $defaults['login_logo']));

    // --- Advanced Tab ---
    add_settings_section('las_fresh_s_advanced_footer', __('Stopka', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}advanced");
    add_settings_field('footer_text', __('Własny Tekst w Stopce', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_textarea_field', $page_slug_prefix . 'advanced', 'las_fresh_s_advanced_footer', array('id' => 'footer_text', 'default' => $defaults['footer_text'], 'rows' => 3));
    add_settings_section('las_fresh_s_advanced_css', __('Własny CSS', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}advanced");
    add_settings_field('custom_css_rules', __('Dodatkowe Reguły CSS', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_textarea_field', $page_slug_prefix . 'advanced', 'las_fresh_s_advanced_css', array('id' => 'custom_css_rules', 'default' => $defaults['custom_css_rules'], 'rows' => 10, 'placeholder' => '.example { color: red; }'));
    
    // --- File Cleanup Section ---
    add_settings_section('las_fresh_s_advanced_cleanup', __('Zarządzanie Plikami', LAS_FRESH_TEXT_DOMAIN), '', "{$page_slug_prefix}advanced");
    add_settings_field('file_cleanup_info', __('Czyszczenie Plików', LAS_FRESH_TEXT_DOMAIN), 'las_fresh_render_file_cleanup_field', $page_slug_prefix . 'advanced', 'las_fresh_s_advanced_cleanup', array());
}
add_action('admin_init', 'las_fresh_register_settings');


/**
 * Helper function to render individual border radius fields.
 */
function las_fresh_render_individual_border_radius_fields($page_slug, $section_id, $prefix, $defaults) {
    $corners = array(
        'tl' => __('Górny Lewy (px)', LAS_FRESH_TEXT_DOMAIN),
        'tr' => __('Górny Prawy (px)', LAS_FRESH_TEXT_DOMAIN),
        'br' => __('Dolny Prawy (px)', LAS_FRESH_TEXT_DOMAIN),
        'bl' => __('Dolny Lewy (px)', LAS_FRESH_TEXT_DOMAIN),
    );
    foreach ($corners as $key => $label) {
        add_settings_field(
            $prefix . '_border_radius_' . $key,
            $label,
            'las_fresh_render_slider_field',
            $page_slug,
            $section_id,
            array(
                'id' => $prefix . '_border_radius_' . $key,
                'default' => $defaults[$prefix . '_border_radius_' . $key],
                'min' => 0, 'max' => 50, 'step' => 1, 'unit' => 'px',
                'dependency_id' => $prefix . '_border_radius_type',
                'dependency_value' => 'individual'
            )
        );
    }
}


/**
 * Helper function to get a single option value with a default.
 */
if (!function_exists('las_fresh_get_option')) {
    function las_fresh_get_option($key, $default = '') {
        $options = get_option(LAS_FRESH_OPTION_NAME, las_fresh_get_default_options());
        return isset($options[$key]) ? $options[$key] : $default;
    }
}

/**
 * Render function for template selector field.
 */
function las_fresh_render_template_selector_field($args) {
    $current_active_template_key = las_fresh_get_option('active_template', 'default');
    ?>
    <div class="field-row">
        <select id="<?php echo esc_attr($args['id']); ?>" name="<?php echo esc_attr($args['id']); // Nazwa bez LAS_FRESH_OPTION_NAME, bo to nie jest opcja do zapisu ?>">
            <?php foreach ($args['options'] as $key => $name): ?>
                <option value="<?php echo esc_attr($key); ?>" <?php selected($current_active_template_key, $key); ?>>
                    <?php echo esc_html($name); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <button type="button" id="las-apply-template-button" class="button"
                style="margin-left:10px;vertical-align:middle;"><?php esc_html_e('Zastosuj szablon', LAS_FRESH_TEXT_DOMAIN); ?></button>
        <span id="las-template-ajax-spinner" class="spinner" style="float:none;vertical-align:middle;"></span>
        <p id="las-template-ajax-response" style="display:inline-block;margin-left:10px;"></p>
    </div>
    <?php if (isset($args['description']))
        printf('<p class="description">%s</p>', esc_html($args['description']));
}

/**
 * Render function for a standard select field with dependency support.
 */
function las_fresh_render_select_field($args) {
    $v = las_fresh_get_option($args['id'], $args['default']);
    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    $trigger_attr = isset($args['data-dependency-trigger']) && $args['data-dependency-trigger'] === 'true' ? ' data-dependency-trigger="true"' : '';
    ?>
    <div class="field-row" <?php echo $dependency_attrs; ?>>
        <select id="<?php echo esc_attr($args['id']); ?>"
                name="<?php echo esc_attr(LAS_FRESH_OPTION_NAME . '[' . $args['id'] . ']'); ?>"
                class="las-field <?php echo isset($args['class']) ? esc_attr($args['class']) : ''; ?>"
                <?php echo $trigger_attr; ?> >
            <?php foreach ($args['options'] as $val => $lbl): ?>
                <option value="<?php echo esc_attr($val); ?>" <?php selected($v, $val, false); ?>>
                    <?php echo esc_html($lbl); ?>
                </option>
            <?php endforeach; ?>
        </select>
    </div>
    <?php if (isset($args['description']))
        printf('<p class="description">%s</p>', esc_html($args['description']));
}


/**
 * Render function for a select field with Google Font option.
 */
function las_fresh_render_select_with_google_font_field($args) {
    $options = las_fresh_get_options();
    $font_family_value = isset($options[$args['id']]) ? $options[$args['id']] : $args['default'];
    $google_font_value = isset($options[$args['google_font_id']]) ? $options[$args['google_font_id']] : '';

    $all_options = $args['options'];
    if (!empty($google_font_value) && $font_family_value === 'google') {
         if ( !isset($all_options[$google_font_value]) && array_search($google_font_value . ' (Google Font)', $all_options) === false ) {
             $all_options[$google_font_value] = esc_html($google_font_value) . ' (Google Font)';
         }
    }

    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    ?>
    <div class="las-font-selector-container field-row" <?php echo $dependency_attrs; ?> >
        <select id="<?php echo esc_attr($args['id']); ?>"
                name="<?php echo esc_attr(LAS_FRESH_OPTION_NAME . '[' . $args['id'] . ']'); ?>"
                class="las-font-family-select las-field">
            <?php
            foreach ($all_options as $val => $label) {
                printf('<option value="%s" %s>%s</option>',
                    esc_attr($val),
                    selected($font_family_value, $val, false),
                    esc_html($label)
                );
            }
            ?>
        </select>
        <div class="sub-field google-font-field-wrapper"
             style="<?php echo ($font_family_value === 'google') ? '' : 'display:none;'; ?>">
             <label for="<?php echo esc_attr($args['google_font_id']); ?>">
                 <?php esc_html_e('Nazwa Google Font:', LAS_FRESH_TEXT_DOMAIN); ?>
             </label><br/>
            <input type="text"
                   id="<?php echo esc_attr($args['google_font_id']); ?>"
                   name="<?php echo esc_attr(LAS_FRESH_OPTION_NAME . '[' . $args['google_font_id'] . ']'); ?>"
                   value="<?php echo esc_attr($google_font_value); ?>"
                   class="regular-text google-font-input las-field"
                   placeholder="<?php esc_attr_e('np. Roboto:wght@400;700', LAS_FRESH_TEXT_DOMAIN); ?>" />
        </div>
    </div>
    <?php if (isset($args['description']))
        printf('<p class="description" style="margin-top:10px;">%s</p>', esc_html($args['description']));
}


/**
 * Render function for a checkbox field with dependency and trigger support.
 */
function las_fresh_render_checkbox_field($args) {
    $v = las_fresh_get_option($args['id'], $args['default']);
    // Ensure $v is correctly interpreted as boolean for checked()
    $is_checked = is_string($v) ? ($v === '1') : (bool) $v;

    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    $trigger_attr = isset($args['data-dependency-trigger']) && $args['data-dependency-trigger'] === 'true' ? ' data-dependency-trigger="true"' : '';

    $output = sprintf('<label><input type="checkbox" id="%s" name="%s[%s]" value="1" %s class="las-field"%s /> %s</label>',
        esc_attr($args['id']),
        esc_attr(LAS_FRESH_OPTION_NAME),
        esc_attr($args['id']),
        checked($is_checked, true, false),
        $trigger_attr,
        isset($args['cb_label']) ? esc_html($args['cb_label']) : ''
    );

    if (isset($args['description']))
        $output .= sprintf('<p class="description">%s</p>', esc_html($args['description']));

    echo "<div class='field-row' {$dependency_attrs}>{$output}</div>";
}

/**
 * Render function for a text input field with dependency support.
 */
function las_fresh_render_text_field($args) {
    $v = las_fresh_get_option($args['id'], $args['default']);
    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    $extra_attrs_str = '';
    if (isset($args['extra_attrs']))
        $extra_attrs_str = $args['extra_attrs'];

    echo "<div class='field-row' {$dependency_attrs}>";
    printf('<input type="text" id="%s" name="%s[%s]" value="%s" class="regular-text las-field %s" %s />',
        esc_attr($args['id']),
        esc_attr(LAS_FRESH_OPTION_NAME),
        esc_attr($args['id']),
        esc_attr($v),
        isset($args['class']) ? esc_attr($args['class']) : '',
        $extra_attrs_str
    );
    echo "</div>";

    if (isset($args['description']))
        printf('<p class="description">%s</p>', esc_html($args['description']));
}

/**
 * Render function for a color picker field with dependency support.
 */
function las_fresh_render_color_picker_field($args) {
    $v = las_fresh_get_option($args['id'], $args['default']);
    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    ?>
    <div class="field-row" <?php echo $dependency_attrs; ?>>
        <input type="text"
               id="<?php echo esc_attr($args['id']); ?>"
               name="<?php echo esc_attr(LAS_FRESH_OPTION_NAME . '[' . $args['id'] . ']'); ?>"
               value="<?php echo esc_attr($v); ?>"
               class="las-fresh-color-picker las-field"
               data-default-color="<?php echo esc_attr($args['default']); ?>" />
    </div>
    <?php if (isset($args['description']))
        printf('<p class="description">%s</p>', esc_html($args['description']));
}

/**
 * Render function for a slider field with associated input, value display, and dependency support.
 */
function las_fresh_render_slider_field($args) {
    $v = las_fresh_get_option($args['id'], $args['default']);
    $u = isset($args['unit']) ? esc_html($args['unit']) : '';
    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    ?>
    <div class="las-slider-container field-row" <?php echo $dependency_attrs; ?>>
        <input type="number"
               id="<?php echo esc_attr($args['id']); ?>"
               name="<?php echo esc_attr(LAS_FRESH_OPTION_NAME . '[' . $args['id'] . ']'); ?>"
               value="<?php echo esc_attr($v); ?>"
               min="<?php echo esc_attr($args['min']); ?>"
               max="<?php echo esc_attr($args['max']); ?>"
               step="<?php echo esc_attr($args['step']); ?>"
               class="las-slider-input small-text las-field"
               data-unit="<?php echo $u; ?>" />
        <div id="<?php echo esc_attr($args['id']); ?>-slider"
             class="las-slider"
             data-setting="<?php echo esc_attr($args['id']); ?>"
             data-min="<?php echo esc_attr($args['min']); ?>"
             data-max="<?php echo esc_attr($args['max']); ?>"
             data-step="<?php echo esc_attr($args['step']); ?>"
             data-unit="<?php echo $u; ?>"></div>
        <span id="<?php echo esc_attr($args['id']); ?>-value" class="las-slider-value"><?php echo esc_html($v) . ($u === 'none' ? '' : $u) ; ?></span>
    </div>
    <?php if (isset($args['description']))
        printf('<p class="description">%s</p>', esc_html($args['description']));
}

/**
 * Render function for an image upload field with preview.
 */
function las_fresh_render_image_upload_field($args) {
    $v = las_fresh_get_option($args['id'], $args['default']);
    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    $image_url = !empty($v) ? esc_url($v) : '';
    $image_visible = !empty($image_url) ? '' : 'display:none;';
    ?>
    <div class="field-row" <?php echo $dependency_attrs; ?>>
        <input type="text"
               id="<?php echo esc_attr($args['id']); ?>"
               name="<?php echo esc_attr(LAS_FRESH_OPTION_NAME . '[' . $args['id'] . ']'); ?>"
               value="<?php echo $image_url; ?>"
               class="large-text las-image-url-field las-field" />
        <button type="button" class="button las-upload-image-button">
            <?php esc_html_e('Wybierz/Wyślij', LAS_FRESH_TEXT_DOMAIN); ?>
        </button>
        <button type="button" class="button las-remove-image-button" style="<?php echo $image_visible; ?>">
            <?php esc_html_e('Usuń', LAS_FRESH_TEXT_DOMAIN); ?>
        </button>
    </div>
    <div class="las-image-preview field-row" <?php echo $dependency_attrs; ?>>
        <img src="<?php echo $image_url; ?>"
             alt="<?php esc_attr_e('Podgląd', LAS_FRESH_TEXT_DOMAIN); ?>"
             style="<?php echo $image_visible; ?> max-width:200px;height:auto;" />
    </div>
    <?php if (isset($args['description']))
        printf('<p class="description">%s</p>', esc_html($args['description']));
}

/**
 * Render function for a textarea field with dependency support.
 */
function las_fresh_render_textarea_field($args) {
    $v = las_fresh_get_option($args['id'], $args['default']);
    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    $rows = isset($args['rows']) ? absint($args['rows']) : 5;
    $placeholder = isset($args['placeholder']) ? esc_attr($args['placeholder']) : '';
    ?>
    <div class="field-row" <?php echo $dependency_attrs; ?>>
        <textarea id="<?php echo esc_attr($args['id']); ?>"
                  name="<?php echo esc_attr(LAS_FRESH_OPTION_NAME . '[' . $args['id'] . ']'); ?>"
                  rows="<?php echo $rows; ?>"
                  class="large-text las-field"
                  placeholder="<?php echo $placeholder; ?>" ><?php echo esc_textarea($v); ?></textarea>
    </div>
    <?php if (isset($args['description']))
        printf('<p class="description">%s</p>', esc_html($args['description']));
}

/**
 * Sanitizes the plugin options.
 * This is the crucial function for preventing settings loss.
 */
function las_fresh_sanitize_options($input) {
    // Get the full array of currently saved options, or defaults if not yet saved.
    $current_options = get_option(LAS_FRESH_OPTION_NAME, las_fresh_get_default_options());
    if (!is_array($current_options)) {
        $current_options = las_fresh_get_default_options();
    }

    // $input here is only the subset of options submitted by the current form/tab.
    // Merge this subset onto the full set of current options.
    // This ensures that settings not present in $input (from other tabs) are preserved.
    $new_options = array_merge($current_options, (array)$input);

    // Now, sanitize each value in the merged $new_options array.
    $sanitized_options = array();
    $defaults = las_fresh_get_default_options(); // For type hints and fallback defaults

    foreach ($defaults as $key => $default_value) {
        // Use the value from $new_options if it exists, otherwise, it means
        // the key might have been removed or is new, so use default.
        $value_to_sanitize = isset($new_options[$key]) ? $new_options[$key] : $default_value;

        // Checkbox sanitization (ensure '1' or '0')
        if (is_bool($default_value) || in_array($key, ['admin_menu_detached', 'admin_bar_detached'])) {
             // Checkboxes are only present in $input if checked. If not in $input, it means unchecked for the current submission.
             // But $new_options already merged $input with $current_options.
             // So, if $key is in $input, it was submitted. If $input[$key] is '1', it's checked.
             // If $key is NOT in $input (for a checkbox), it means it was unchecked on the form.
             if (array_key_exists($key, (array)$input)) { // Check if this specific checkbox was part of the submitted form data
                $sanitized_options[$key] = ($input[$key] === '1' ? true : false);
             } else if (is_bool($default_value)) { // If not in submitted form, and it's a bool, assume it was unchecked
                $sanitized_options[$key] = false;
             } else { // Fallback to its existing value in $new_options (which could be from $current_options)
                $sanitized_options[$key] = (isset($new_options[$key]) && $new_options[$key] === '1') ? true : false;
             }
        }
        // Color sanitization
        elseif (strpos($key, '_color') !== false || strpos($key, '_gradient_color') !== false) {
            $s_val = sanitize_hex_color($value_to_sanitize);
            $sanitized_options[$key] = (empty($s_val) && !empty($value_to_sanitize) && $value_to_sanitize !== $default_value) ? $default_value : $s_val;
        }
        // Numeric sanitization (sliders, sizes, etc.)
        elseif (is_int($default_value) || (is_string($default_value) && ctype_digit($default_value) && is_numeric($value_to_sanitize)) ||
                strpos($key, '_size') !== false || strpos($key, '_height') !== false || strpos($key, '_width') !== false ||
                strpos($key, '_margin') !== false || strpos($key, '_padding') !== false || strpos($key, '_radius') !== false ||
                strpos($key, '_offset_') !== false || strpos($key, '_blur') !== false || strpos($key, '_spread') !== false) {
            if (in_array($key, ['admin_menu_shadow_advanced_offset_x', 'admin_menu_shadow_advanced_offset_y', 'admin_menu_shadow_advanced_spread', 'admin_bar_shadow_advanced_offset_x', 'admin_bar_shadow_advanced_offset_y', 'admin_bar_shadow_advanced_spread'])) {
                $sanitized_options[$key] = intval($value_to_sanitize);
            } else {
                $sanitized_options[$key] = absint($value_to_sanitize);
            }
        }
        // Google Font name
        elseif (strpos($key, '_google_font') !== false) {
            $sanitized_options[$key] = sanitize_text_field(preg_replace('/[^a-zA-Z0-9\s\-\:\;\+&]/', '', $value_to_sanitize));
        }
        // Image URLs
        elseif ($key === 'admin_menu_logo' || $key === 'login_logo') {
            $sanitized_options[$key] = esc_url_raw($value_to_sanitize);
        }
        // Footer text (allow some HTML)
        elseif ($key === 'footer_text') {
            $sanitized_options[$key] = wp_kses_post($value_to_sanitize);
        }
        // Custom CSS (strip tags, but allow CSS characters)
        elseif ($key === 'custom_css_rules') {
            $sanitized_options[$key] = wp_strip_all_tags(wp_kses_stripslashes($value_to_sanitize));
        }
        // Selects and other text fields
        else {
            // For specific select keys, ensure the value is one of the allowed options.
            $allowed_select_keys = [
                'active_template', 'admin_menu_bg_type', 'admin_bar_bg_type', 'body_bg_type',
                'admin_menu_bg_gradient_direction', 'admin_bar_bg_gradient_direction', 'body_bg_gradient_direction',
                'admin_menu_shadow_type', 'admin_bar_shadow_type', 'admin_bar_width_type',
                'admin_menu_font_family', 'admin_submenu_font_family', 'admin_bar_font_family', 'body_font_family',
                'admin_bar_border_radius_type', 'admin_menu_border_radius_type' // New select types
            ];
            if (in_array($key, $allowed_select_keys)) {
                // Further validation could be added here to check against specific options for each select
                $sanitized_options[$key] = sanitize_key($value_to_sanitize);
            } else {
                $sanitized_options[$key] = sanitize_text_field($value_to_sanitize);
            }
        }
    }
    return $sanitized_options;
}

/**
 * Enhanced field wrapper with icons and descriptions
 */
function las_fresh_render_enhanced_field_wrapper($field_id, $field_title, $field_content, $args = array()) {
    $icon = isset($args['icon']) ? $args['icon'] : 'dashicons-admin-generic';
    $description = isset($args['description']) ? $args['description'] : '';
    $category = isset($args['category']) ? $args['category'] : 'general';
    $keywords = isset($args['keywords']) ? implode(' ', $args['keywords']) : '';
    $example = isset($args['example']) ? $args['example'] : '';
    
    $dependency_attrs = '';
    if (isset($args['dependency_id']) && isset($args['dependency_value'])) {
        $dependency_attrs = sprintf(' data-dependency-id="%s" data-dependency-value="%s"', 
            esc_attr($args['dependency_id']), esc_attr($args['dependency_value']));
    }
    
    ?>
    <div class="las-enhanced-field-wrapper" 
         data-field-id="<?php echo esc_attr($field_id); ?>"
         data-category="<?php echo esc_attr($category); ?>"
         data-keywords="<?php echo esc_attr($keywords . ' ' . strtolower($field_title)); ?>"
         <?php echo $dependency_attrs; ?>>
        
        <div class="las-field-header">
            <div class="las-field-icon">
                <span class="dashicons <?php echo esc_attr($icon); ?>"></span>
            </div>
            <div class="las-field-title-wrapper">
                <h4 class="las-field-title"><?php echo esc_html($field_title); ?></h4>
                <?php if ($description): ?>
                    <p class="las-field-description"><?php echo esc_html($description); ?></p>
                <?php endif; ?>
            </div>
            <?php if ($example): ?>
                <div class="las-field-example">
                    <button type="button" class="las-example-toggle" title="<?php esc_attr_e('Pokaż przykład', LAS_FRESH_TEXT_DOMAIN); ?>">
                        <span class="dashicons dashicons-info"></span>
                    </button>
                    <div class="las-example-content" style="display: none;">
                        <strong><?php esc_html_e('Przykład:', LAS_FRESH_TEXT_DOMAIN); ?></strong>
                        <code><?php echo esc_html($example); ?></code>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="las-field-content">
            <?php echo $field_content; ?>
        </div>
    </div>
    <?php
}

/**
 * Enhanced section header with visual separators
 */
function las_fresh_render_enhanced_section_header($title, $args = array()) {
    $icon = isset($args['icon']) ? $args['icon'] : 'dashicons-admin-generic';
    $description = isset($args['description']) ? $args['description'] : '';
    $collapsible = isset($args['collapsible']) ? $args['collapsible'] : false;
    $category = isset($args['category']) ? $args['category'] : 'general';
    
    ?>
    <div class="las-enhanced-section-header" data-category="<?php echo esc_attr($category); ?>">
        <div class="las-section-title-wrapper">
            <div class="las-section-icon">
                <span class="dashicons <?php echo esc_attr($icon); ?>"></span>
            </div>
            <div class="las-section-content">
                <h3 class="las-section-title"><?php echo esc_html($title); ?></h3>
                <?php if ($description): ?>
                    <p class="las-section-description"><?php echo esc_html($description); ?></p>
                <?php endif; ?>
            </div>
            <?php if ($collapsible): ?>
                <button type="button" class="las-section-toggle" aria-expanded="true">
                    <span class="dashicons dashicons-arrow-up-alt2"></span>
                </button>
            <?php endif; ?>
        </div>
        <div class="las-section-separator"></div>
    </div>
    <?php
}

/**
 * Enhanced section header for General tab
 */
function las_fresh_render_enhanced_general_section_header() {
    las_fresh_render_enhanced_section_header(
        __('Ustawienia Ogólne, Szablony i Układ', LAS_FRESH_TEXT_DOMAIN),
        array(
            'icon' => 'dashicons-admin-settings',
            'description' => __('Podstawowe ustawienia wyglądu i gotowe szablony stylów', LAS_FRESH_TEXT_DOMAIN),
            'category' => 'general'
        )
    );
}

/**
 * Enhanced template selector field
 */
function las_fresh_render_enhanced_template_selector_field($args) {
    ob_start();
    las_fresh_render_template_selector_field($args);
    $field_content = ob_get_clean();
    
    las_fresh_render_enhanced_field_wrapper(
        $args['id'],
        __('Wybierz Gotowy Szablon', LAS_FRESH_TEXT_DOMAIN),
        $field_content,
        array(
            'icon' => 'dashicons-admin-appearance',
            'description' => __('Szybko zastosuj jeden z gotowych stylów dla całego panelu administracyjnego', LAS_FRESH_TEXT_DOMAIN),
            'category' => 'general',
            'keywords' => array('szablon', 'template', 'styl', 'theme', 'wygląd'),
            'example' => __('Nowoczesny, Klasyczny, Minimalistyczny', LAS_FRESH_TEXT_DOMAIN)
        )
    );
}

/**
 * Enhanced slider field
 */
function las_fresh_render_enhanced_slider_field($args) {
    ob_start();
    las_fresh_render_slider_field($args);
    $field_content = ob_get_clean();
    
    $field_title = '';
    $description = '';
    $category = 'layout';
    $keywords = array('slider', 'suwak', 'wartość', 'value');
    $example = '';
    
    // Customize based on field ID
    switch ($args['id']) {
        case 'border_radius':
            $field_title = __('Globalne Zaokrąglenie Rogów', LAS_FRESH_TEXT_DOMAIN);
            $description = __('Ustaw zaokrąglenie rogów dla wszystkich elementów interfejsu', LAS_FRESH_TEXT_DOMAIN);
            $keywords = array_merge($keywords, array('zaokrąglenie', 'rogi', 'border', 'radius'));
            $example = '0px = ostre rogi, 10px = lekko zaokrąglone, 20px = bardzo zaokrąglone';
            break;
    }
    
    las_fresh_render_enhanced_field_wrapper(
        $args['id'],
        $field_title,
        $field_content,
        array(
            'icon' => 'dashicons-image-rotate',
            'description' => $description,
            'category' => $category,
            'keywords' => $keywords,
            'example' => $example
        )
    );
}

/**
 * Render function for file cleanup field.
 */
function las_fresh_render_file_cleanup_field($args) {
    global $las_file_manager;
    
    // Get cleanup preview
    $preview = $las_file_manager->get_cleanup_preview();
    $cleanup_url = wp_nonce_url(add_query_arg('las_cleanup', '1'), 'las_manual_cleanup');
    
    ?>
    <div class="las-file-cleanup-section">
        <p><?php esc_html_e('System automatycznie czyści niepotrzebne pliki podczas aktywacji i dezaktywacji wtyczki. Możesz również uruchomić czyszczenie ręcznie.', 'live-admin-styler'); ?></p>
        
        <?php if (!empty($preview)): ?>
            <div class="las-cleanup-preview">
                <h4><?php esc_html_e('Pliki do usunięcia:', 'live-admin-styler'); ?></h4>
                <ul class="las-cleanup-file-list">
                    <?php foreach ($preview as $file_info): ?>
                        <li>
                            <strong><?php echo esc_html($file_info['file']); ?></strong>
                            <span class="las-file-size">(<?php echo esc_html(size_format($file_info['size'])); ?>)</span>
                            <?php if ($file_info['type'] === 'pattern_match'): ?>
                                <em class="las-file-pattern"><?php echo esc_html($file_info['pattern']); ?></em>
                            <?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
                
                <p class="las-cleanup-actions">
                    <a href="<?php echo esc_url($cleanup_url); ?>" class="button button-secondary las-cleanup-button" 
                       onclick="return confirm('<?php esc_attr_e('Czy na pewno chcesz usunąć te pliki? Ta operacja jest nieodwracalna.', 'live-admin-styler'); ?>')">
                        <?php esc_html_e('Usuń pliki teraz', 'live-admin-styler'); ?>
                    </a>
                </p>
            </div>
        <?php else: ?>
            <div class="las-cleanup-empty">
                <p><em><?php esc_html_e('Brak plików do usunięcia.', 'live-admin-styler'); ?></em></p>
            </div>
        <?php endif; ?>
        
        <div class="las-cleanup-info">
            <h4><?php esc_html_e('Automatyczne czyszczenie obejmuje:', 'live-admin-styler'); ?></h4>
            <ul>
                <li><?php esc_html_e('Pliki podsumowań tasków (TASK_*_SUMMARY.md)', 'live-admin-styler'); ?></li>
                <li><?php esc_html_e('Pliki testowe (test-*.html)', 'live-admin-styler'); ?></li>
                <li><?php esc_html_e('Pliki weryfikacji integracji (integration-verification.js)', 'live-admin-styler'); ?></li>
                <li><?php esc_html_e('Inne pliki tymczasowe i podsumowania', 'live-admin-styler'); ?></li>
            </ul>
        </div>
    </div>
    
    <style>
    .las-file-cleanup-section {
        background: #f8f9fa;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        padding: 16px;
        margin-top: 8px;
    }
    
    .las-cleanup-preview {
        margin: 16px 0;
        padding: 12px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #ddd;
    }
    
    .las-cleanup-file-list {
        margin: 8px 0;
        padding-left: 20px;
    }
    
    .las-cleanup-file-list li {
        margin: 4px 0;
        font-family: monospace;
    }
    
    .las-file-size {
        color: #666;
        font-size: 0.9em;
    }
    
    .las-file-pattern {
        color: #007cba;
        font-size: 0.85em;
        margin-left: 8px;
    }
    
    .las-cleanup-actions {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #eee;
    }
    
    .las-cleanup-button {
        background: #dc3232 !important;
        border-color: #dc3232 !important;
        color: #fff !important;
    }
    
    .las-cleanup-button:hover {
        background: #c62d2d !important;
        border-color: #c62d2d !important;
    }
    
    .las-cleanup-empty {
        padding: 12px;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 4px;
        color: #155724;
    }
    
    .las-cleanup-info {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #ddd;
    }
    
    .las-cleanup-info ul {
        margin: 8px 0;
        padding-left: 20px;
    }
    
    .las-cleanup-info li {
        margin: 4px 0;
        color: #666;
    }
    </style>
    <?php
}