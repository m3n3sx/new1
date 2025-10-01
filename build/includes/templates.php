<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Defines the available color/style templates for the plugin.
 */
function las_fresh_get_available_templates() {

    $plugin_defaults = las_fresh_get_default_options();

    return array(
        'default' => array(
            'name' => __('Domyślny (Twoje Ustawienia)', LAS_FRESH_TEXT_DOMAIN),
            'settings' => array(),
        ),
        'default_wordpress' => array(
            'name' => __('Domyślny Wordpress', LAS_FRESH_TEXT_DOMAIN),
            'settings' => array_merge($plugin_defaults, array(
                'admin_menu_bg_color'    => '#23282d',
                'admin_menu_text_color'  => '#f0f0f1',
                'admin_submenu_bg_color' => '#2c3338',
                'admin_submenu_text_color' => '#f0f0f1',
                'accent_color'           => '#007cba',
                'admin_bar_bg_color'     => '#1d2327',
                'admin_bar_text_color'   => '#f0f0f1',
                'body_bg_color'          => '#f0f1f2',
                'body_text_color'        => '#3c434a',
                'border_radius'          => 0,
                'admin_bar_border_radius_all' => 0,
                'admin_menu_border_radius_all' => 0,
                'admin_menu_detached'    => false,
                'admin_bar_detached'     => false,
                'admin_bar_shadow_type'  => 'simple',
                'admin_bar_shadow_simple'=> '0 1px 3px rgba(0,0,0,0.1)',
                'admin_menu_shadow_type' => 'simple',
                'admin_menu_shadow_simple'=> '2px 0 10px rgba(0,0,0,0.15)',
            ))
        ),
        'terminal' => array(
            'name' => __('Terminal', LAS_FRESH_TEXT_DOMAIN),
            'settings' => array_merge($plugin_defaults, array(
                'admin_menu_bg_color'    => '#1e1e1e',
                'admin_menu_text_color'  => '#A0A0A0',
                'admin_menu_font_family' => 'Courier New, Courier, monospace',
                'admin_submenu_bg_color' => '#252525',
                'admin_submenu_text_color'=> '#A0A0A0',
                'admin_submenu_font_family' => 'Courier New, Courier, monospace',
                'accent_color'           => '#33FF33',
                'admin_bar_bg_color'     => '#101010',
                'admin_bar_text_color'   => '#A0A0A0',
                'admin_bar_font_family'  => 'Courier New, Courier, monospace',
                'body_bg_color'          => '#0d0d0d',
                'body_text_color'        => '#CCCCCC',
                'body_font_family'       => 'Courier New, Courier, monospace',
                'border_radius'          => 0,
                'admin_bar_border_radius_all' => 0,
                'admin_menu_border_radius_all' => 0,
                'admin_bar_shadow_type'  => 'none',
                'admin_menu_shadow_type' => 'none',
            ))
        ),
        'light_icloud' => array(
            'name' => __('Light (iCloud Style)', LAS_FRESH_TEXT_DOMAIN),
            'settings' => array_merge($plugin_defaults, array(
                'admin_menu_bg_color'    => '#f5f5f7',
                'admin_menu_text_color'  => '#1d1d1f',
                'admin_menu_font_family' => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                'admin_submenu_bg_color' => '#ebebf0',
                'admin_submenu_text_color'=> '#1d1d1f',
                'admin_submenu_font_family' => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                'accent_color'           => '#007aff',
                'admin_bar_bg_color'     => '#fbfbfc',
                'admin_bar_text_color'   => '#1d1d1f',
                'admin_bar_font_family'  => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                'body_bg_color'          => '#ffffff',
                'body_text_color'        => '#1d1d1f',
                'body_font_family'       => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                'border_radius'          => 8,
                'admin_bar_border_radius_all' => 8,
                'admin_menu_border_radius_all' => 8,
                'admin_bar_shadow_type'  => 'simple', 'admin_bar_shadow_simple' => '0 1px 1px rgba(0,0,0,0.05)',
                'admin_menu_shadow_type' => 'simple', 'admin_menu_shadow_simple' => '1px 0 3px rgba(0,0,0,0.05)',
            ))
        ),
         'happy_deepin' => array(
            'name' => __('Happy (Deepin Style)', LAS_FRESH_TEXT_DOMAIN),
            'settings' => array_merge($plugin_defaults, array(
                'admin_menu_bg_type'       => 'gradient',
                'admin_menu_bg_gradient_color1' => '#5D5FEF',
                'admin_menu_bg_gradient_color2' => '#31A4F8',
                'admin_menu_bg_gradient_direction' => '135deg',
                'admin_menu_text_color'    => '#ffffff',
                'admin_menu_font_size'     => 15,
                'admin_submenu_bg_color'   => 'rgba(0,0,0,0.15)',
                'admin_submenu_text_color' => '#ffffff',
                'admin_submenu_font_size'  => 14,
                'accent_color'             => '#FFFFFF',
                'admin_bar_bg_type'        => 'gradient',
                'admin_bar_bg_gradient_color1' => '#31A4F8',
                'admin_bar_bg_gradient_color2' => '#5D5FEF',
                'admin_bar_bg_gradient_direction' => 'to right',
                'admin_bar_text_color'     => '#ffffff',
                'admin_bar_font_size'      => 14,
                'admin_bar_border_radius_all' => 12,
                'admin_menu_border_radius_all' => 12,
                'body_bg_color'            => '#f4f7f9',
                'body_text_color'          => '#444444',
                'body_font_size'           => 14,
                'border_radius'            => 12,
                'admin_bar_shadow_type'    => 'simple', 'admin_bar_shadow_simple' => '0 2px 8px rgba(0,0,0,0.1)',
                'admin_menu_shadow_type'   => 'simple', 'admin_menu_shadow_simple' => '2px 0 12px rgba(0,0,0,0.2)',
                'body_bg_type'             => 'solid',
            ))
        ),
    );
}

/**
 * AJAX handler to apply template settings.
 */
function las_fresh_ajax_apply_template() {
    check_ajax_referer( 'las_fresh_admin_nonce', 'nonce' );

    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => __( 'Brak uprawnień.', LAS_FRESH_TEXT_DOMAIN ) ) );
    }

    $template_key = isset( $_POST['template'] ) ? sanitize_key( $_POST['template'] ) : 'default';
    $available_templates = las_fresh_get_available_templates();

    if ( array_key_exists( $template_key, $available_templates ) ) {
        $template_settings = $available_templates[$template_key]['settings'];
        $defaults = las_fresh_get_default_options();

        if ($template_key === 'default') {

            $new_options = $defaults;
        } else {

            $new_options = array_merge( $defaults, $template_settings );
        }

        $sanitized_new_options = las_fresh_sanitize_options($new_options);

        wp_send_json_success( array(
            'settings' => $sanitized_new_options,
            'message' => sprintf( __( 'Zastosowano ustawienia szablonu: %s. Pamiętaj, aby zapisać zmiany, aby je utrwalić.', LAS_FRESH_TEXT_DOMAIN ), esc_html($available_templates[$template_key]['name']) )
        ) );
    } else {
        wp_send_json_error( array( 'message' => __( 'Nieznany szablon.', LAS_FRESH_TEXT_DOMAIN ) ) );
    }
}
add_action('wp_ajax_las_fresh_apply_template', 'las_fresh_ajax_apply_template');