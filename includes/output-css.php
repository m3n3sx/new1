<?php
// Prevent direct access to the file.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Convert hex color to rgba with alpha transparency
 */
function las_fresh_hex_to_rgba($hex, $alpha = 1) {
    try {
        // Remove # if present
        $hex = ltrim($hex, '#');
        
        // Validate hex color
        if (!preg_match('/^[a-fA-F0-9]{6}$/', $hex) && !preg_match('/^[a-fA-F0-9]{3}$/', $hex)) {
            return 'rgba(44, 51, 56, ' . $alpha . ')'; // Fallback color
        }
        
        // Convert 3-digit hex to 6-digit
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        
        // Convert hex to RGB
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        
        // Clamp alpha between 0 and 1
        $alpha = max(0, min(1, $alpha));
        
        return "rgba($r, $g, $b, $alpha)";
    } catch (Exception $e) {
        error_log('LAS CSS Generation: Error converting hex to rgba: ' . $e->getMessage());
        return 'rgba(44, 51, 56, ' . $alpha . ')'; // Fallback color
    }
}

/**
 * Generates the CSS output for styling the admin panel based on plugin options.
 */
function las_fresh_generate_admin_css_output($preview_options = null) {
    try {
        // Enhanced input validation with fallback handling
        if ($preview_options !== null && !is_array($preview_options)) {
            error_log('LAS CSS Generation: Invalid preview_options provided, expected array or null, got: ' . gettype($preview_options));
            $preview_options = null;
        }
        
        // Get options with error handling
        try {
            $options = ($preview_options !== null && is_array($preview_options)) ? $preview_options : las_fresh_get_options();
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error getting options: ' . $e->getMessage());
            $options = array(); // Fallback to empty array
        }
        
        // Validate options is an array
        if (!is_array($options)) {
            error_log('LAS CSS Generation: Options is not an array, using empty array as fallback');
            $options = array();
        }
        
        $css_output = "/* Live Admin Styler CSS v" . LAS_FRESH_VERSION . " (Specificity Enhanced v3) */\n";
        
        // Get defaults with error handling
        try {
            $defaults = las_fresh_get_default_options();
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error getting default options: ' . $e->getMessage());
            $defaults = array(); // Fallback to empty array
        }
        
        // Validate defaults is an array
        if (!is_array($defaults)) {
            error_log('LAS CSS Generation: Defaults is not an array, using empty array as fallback');
            $defaults = array();
        }
        
        $add_css = function ($selector, $property, $value_or_option_key, $important = true, $unit = '') use (&$css_output, $defaults, $options, $preview_options) {
        try {
            // Enhanced input validation with fallback values
            if (empty($selector) || !is_string($selector)) {
                error_log('LAS CSS Generation: Invalid selector provided: ' . var_export($selector, true));
                return;
            }
            
            if (empty($property) || !is_string($property)) {
                error_log('LAS CSS Generation: Invalid property provided: ' . var_export($property, true));
                return;
            }
            
            // Sanitize selector and property to prevent CSS injection
            $selector = preg_replace('/[^a-zA-Z0-9\s\-_#.,>+~:()[\]="\'*]/', '', $selector);
            $property = preg_replace('/[^a-zA-Z0-9\-_]/', '', $property);
            
            if (empty($selector) || empty($property)) {
                error_log('LAS CSS Generation: Selector or property became empty after sanitization');
                return;
            }
            
            $actual_value = $value_or_option_key;
            $is_option_key_passed = is_string($value_or_option_key) && array_key_exists($value_or_option_key, $options);

            if ($is_option_key_passed) {
                $actual_value = isset($options[$value_or_option_key]) ? $options[$value_or_option_key] : '';
            }
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in add_css function initialization: ' . $e->getMessage());
            return;
        }

        $is_preview_mode = ($preview_options !== null);
        $should_output = false;

        // Determine if the rule should be output
        // In preview mode, always try to output if the value is being processed for a setting that exists in defaults (to show live changes, even to default)
        // or if it's a direct value not necessarily tied to a default (e.g. complex constructed string)
        if ($is_preview_mode) {
            // For preview, if it's an option key, we always want to reflect its current value.
            // If it's a direct value, it's assumed to be intentional for the preview.
            if ($actual_value !== null) { // Allow 0, but not null
                 $should_output = true;
            }
        } else {
            // Not in preview mode (i.e., for admin_head styles)
            // Output if the value is different from default, or if it's an explicit reset (e.g., 0 when default is not 0)
            if ($is_option_key_passed && isset($defaults[$value_or_option_key])) {
                if ($defaults[$value_or_option_key] != $actual_value) {
                    $should_output = true;
                } elseif (($actual_value === 0 || $actual_value === '0' || $actual_value === '') && $defaults[$value_or_option_key] != $actual_value) {
                    $should_output = true; // Explicit reset
                }
            } elseif ($actual_value !== null && $actual_value !== '') { 
                // If not an option key with a default (e.g. a constructed string like a gradient), output if it has a meaningful value.
                $should_output = true;
            }
        }
        
        if (!$should_output) {
            return;
        }

        // Prepare the final CSS value string with enhanced error handling and fallbacks
        try {
            $css_value_string = '';
            
            if (is_numeric($actual_value)) {
                // Validate numeric values to prevent invalid CSS
                if (is_finite($actual_value)) {
                    $css_value_string = $actual_value . $unit;
                } else {
                    error_log('LAS CSS Generation: Invalid numeric value (infinite/NaN): ' . var_export($actual_value, true));
                    return;
                }
            } elseif (is_string($actual_value)) {
                $trimmed_value = trim($actual_value);
                
                // Enhanced validation for empty values
                if ($trimmed_value === '' && !in_array($property, ['content', 'background-image', 'box-shadow'])) {
                    return; // Don't output empty rules for most properties
                }
                
                // Enhanced handling for specific CSS properties with fallbacks
                if ($property === 'background-image') {
                    if (strtolower($trimmed_value) === 'none' || $trimmed_value === '') {
                        $css_value_string = 'none';
                    } else {
                        // Validate gradient syntax for background-image
                        if (strpos($trimmed_value, 'linear-gradient') !== false || strpos($trimmed_value, 'radial-gradient') !== false) {
                            $css_value_string = $trimmed_value; // Don't add unit to gradients
                        } else {
                            $css_value_string = esc_attr($trimmed_value) . $unit;
                        }
                    }
                } elseif ($property === 'box-shadow') {
                    if (strtolower($trimmed_value) === 'none' || $trimmed_value === '') {
                        $css_value_string = 'none';
                    } else {
                        $css_value_string = esc_attr($trimmed_value); // Don't add unit to box-shadow
                    }
                } elseif ($property === 'color' || strpos($property, 'color') !== false) {
                    // Enhanced color validation with fallbacks
                    if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $trimmed_value) || 
                        preg_match('/^rgba?\([^)]+\)$/', $trimmed_value) ||
                        in_array(strtolower($trimmed_value), ['transparent', 'inherit', 'initial', 'unset'])) {
                        $css_value_string = $trimmed_value;
                    } else {
                        error_log('LAS CSS Generation: Invalid color value: ' . $trimmed_value . ', using fallback');
                        $css_value_string = 'inherit'; // Fallback for invalid colors
                    }
                } else {
                    $css_value_string = esc_attr($trimmed_value) . $unit;
                }
            } else {
                error_log('LAS CSS Generation: Unsupported value type: ' . gettype($actual_value));
                return; // Not a string or number, skip
            }
            
            // Final validation of CSS value string
            if (empty($css_value_string) && $css_value_string !== '0') {
                return;
            }
            
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error preparing CSS value string: ' . $e->getMessage());
            return;
        }
        
        if ($css_value_string === 'px' && $unit === 'px' && $actual_value === 0) { // Avoid "0pxpx"
            $css_value_string = '0px';
        }


        // Enhance specificity with error handling and fallbacks
        try {
            $selectors_array = explode(',', $selector);
            $specific_selectors = array();
            
            foreach ($selectors_array as $sel) {
                try {
                    $trimmed_sel = trim($sel);
                    if (!empty($trimmed_sel)) {
                        // Enhanced selector validation
                        if (strpos($trimmed_sel, 'body.wp-admin') === 0 || 
                            strpos($trimmed_sel, 'html.wp-toolbar') === 0 || 
                            strpos($trimmed_sel, 'body.login') === 0) {
                            $specific_selectors[] = $trimmed_sel;
                        } else {
                            $specific_selectors[] = 'html body.wp-admin ' . $trimmed_sel;
                        }
                    }
                } catch (Exception $e) {
                    error_log('LAS CSS Generation: Error processing selector: ' . $sel . ' - ' . $e->getMessage());
                    continue; // Skip this selector and continue with others
                }
            }
            
            if (empty($specific_selectors)) {
                error_log('LAS CSS Generation: No valid selectors found after processing');
                return;
            }
            
            $final_selector = implode(', ', $specific_selectors);
            if (empty($final_selector)) {
                error_log('LAS CSS Generation: Final selector is empty');
                return;
            }
            
            // Enhanced CSS output with validation
            $important_suffix = $important ? ' !important' : '';
            $css_rule = $final_selector . ' {' . $property . ': ' . $css_value_string . $important_suffix . ";}\n";
            
            // Validate CSS rule length to prevent extremely long rules
            if (strlen($css_rule) > 10000) {
                error_log('LAS CSS Generation: CSS rule too long, skipping: ' . substr($css_rule, 0, 100) . '...');
                return;
            }
            
            $css_output .= $css_rule;
            
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in selector processing and CSS output: ' . $e->getMessage());
            return;
        }
    };
    
    $add_raw = function ($raw_css_block) use (&$css_output) {
        try {
            // Enhanced validation for raw CSS blocks
            if (!is_string($raw_css_block)) {
                error_log('LAS CSS Generation: Raw CSS block is not a string: ' . gettype($raw_css_block));
                return;
            }
            
            $trimmed_block = trim($raw_css_block);
            if (!empty($trimmed_block)) {
                // Basic CSS validation to prevent malformed CSS
                if (strpos($trimmed_block, '{') !== false && strpos($trimmed_block, '}') === false) {
                    error_log('LAS CSS Generation: Malformed CSS block (missing closing brace): ' . substr($trimmed_block, 0, 100));
                    return;
                }
                
                // Validate CSS block length
                if (strlen($trimmed_block) > 50000) {
                    error_log('LAS CSS Generation: Raw CSS block too long, truncating: ' . substr($trimmed_block, 0, 100) . '...');
                    $trimmed_block = substr($trimmed_block, 0, 50000) . '/* ... truncated ... */';
                }
                
                $css_output .= $trimmed_block . "\n";
            }
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in add_raw function: ' . $e->getMessage());
        }
    };

    $get_ff_val = function ($font_key, $google_key) use ($options, $defaults) {
        try {
            // Enhanced input validation with fallbacks
            if (!is_string($font_key) || !is_string($google_key)) {
                error_log('LAS CSS Generation: Invalid font key parameters: ' . var_export(array($font_key, $google_key), true));
                return '';
            }
            
            // Get font family with fallback handling
            $fam = '';
            if (isset($options[$font_key]) && !empty($options[$font_key])) {
                $fam = $options[$font_key];
            } elseif (isset($defaults[$font_key]) && !empty($defaults[$font_key])) {
                $fam = $defaults[$font_key];
            } else {
                return ''; // No font family specified
            }
            
            // Get Google font with error handling
            $gfont = '';
            if (isset($options[$google_key])) {
                $gfont = trim($options[$google_key]);
            }
            
            // Handle Google font selection with enhanced validation
            if ($fam === 'google' && !empty($gfont)) {
                try {
                    $parts = explode(':', $gfont);
                    if (is_array($parts) && count($parts) > 0) {
                        $name = sanitize_text_field(trim($parts[0]));
                        if (!empty($name) && strlen($name) <= 100) { // Reasonable font name length limit
                            return "'" . $name . "', sans-serif";
                        } else {
                            error_log('LAS CSS Generation: Invalid Google font name: ' . $name);
                        }
                    }
                } catch (Exception $e) {
                    error_log('LAS CSS Generation: Error processing Google font: ' . $e->getMessage());
                }
            }
            
            // Handle custom font family with enhanced validation
            if ($fam !== 'default' && $fam !== 'google' && !empty($fam)) {
                // Enhanced sanitization for font family names
                $safe_fam = preg_replace('/[^a-zA-Z0-9\s\-\'",.]/', '', $fam);
                if (!empty($safe_fam) && strlen($safe_fam) <= 200) { // Reasonable font family length limit
                    return $safe_fam;
                } else {
                    error_log('LAS CSS Generation: Invalid custom font family: ' . $fam);
                }
            }
            
            return ''; // Fallback to empty string
            
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in get_ff_val function: ' . $e->getMessage());
            return '';
        }
    };

    // --- Global/Body Styles ---
    $body_ff_val = $get_ff_val('body_font_family', 'body_google_font');
    $global_text_elements = '#wpbody-content, .wrap, p, li, div, table, th, td, h1, h2, h3, h4, h5, h6, .form-table th, .form-table td, .wp-core-ui .button, input, textarea, select';
    if ($body_ff_val) $add_css($global_text_elements, 'font-family', $body_ff_val, false);
    
    $add_css('body.wp-admin, #wpbody-content, .wrap, #wpbody-content p, #wpbody-content li, #wpbody-content div, #wpbody-content span', 'color', 'body_text_color'); // Pass option key
    $add_css('.wrap p, .form-table th, .form-table td, #wpbody-content input, #wpbody-content select, #wpbody-content textarea, .wp-core-ui .button', 'font-size', 'body_font_size', true, 'px'); // Pass option key

    $body_bg_selectors = '#wpwrap, #wpbody, #wpbody-content, #wpcontent, .wrap, .postbox, .widgets-holder-wrap .widget, .edit-post-layout__content, .interface-interface-skeleton__content, #dashboard-widgets-wrap';
    if ($options['body_bg_type'] === 'gradient') {
        $gradient_value = 'linear-gradient(' . esc_attr($options['body_bg_gradient_direction']) . ', ' . esc_attr($options['body_bg_gradient_color1']) . ', ' . esc_attr($options['body_bg_gradient_color2']) . ')';
        $add_css($body_bg_selectors, 'background-image', $gradient_value);
        $add_css($body_bg_selectors, 'background-color', 'transparent');
        $add_raw("html.wp-toolbar { background-image: {$gradient_value} !important; background-attachment: fixed !important; background-color: transparent !important; }");
        $add_raw("body.wp-admin { background: transparent !important; }");
    } else {
        $add_css($body_bg_selectors, 'background-color', 'body_bg_color'); // Pass option key
        $add_css($body_bg_selectors, 'background-image', 'none');
        $add_raw("html.wp-toolbar { background-color: " . esc_attr($options['body_bg_color']) . " !important; background-image: none !important; }");
        $add_raw("body.wp-admin { background: transparent !important; }");
    }

    $br_global_px_val = (int)$options['border_radius'];
    $radius_selectors = '.wp-core-ui .button, input[type=text], input[type=search], input[type=tel], input[type=url], input[type=password], input[type=email], input[type=number], input[type=date], input[type=time], select, textarea, .postbox, .widget, .wp-list-table, .notice, #adminmenu li.menu-top, #adminmenu .wp-submenu, .CodeMirror, .media-modal';
    $add_css($radius_selectors, 'border-radius', $br_global_px_val, true, 'px');
    if ($br_global_px_val > 0) {
        $add_css("#adminmenu .wp-submenu, .postbox, .widget, .media-modal", 'overflow', 'hidden');
    } else {
        $add_css("#adminmenu .wp-submenu, .postbox, .widget, .media-modal", 'overflow', 'visible');
    }

    // --- Admin Menu Styles ---
    // Proper admin menu background targeting - only style visible elements
    if ($options['admin_menu_bg_type'] === 'gradient') {
        $gradient_value = 'linear-gradient(' . esc_attr($options['admin_menu_bg_gradient_direction']) . ', ' . esc_attr($options['admin_menu_bg_gradient_color1']) . ', ' . esc_attr($options['admin_menu_bg_gradient_color2']) . ')';
        // Apply gradient only to main wrapper and menu content (not adminmenuback)
        $add_raw("html body.wp-admin #adminmenuwrap { 
            background-image: {$gradient_value} !important; 
            background-color: transparent !important; 
        }");
        // adminmenuback styling consolidated in width section below
        // Apply to menu items for consistency
        $add_raw("html body.wp-admin #adminmenu, 
                  html body.wp-admin #adminmenu li.menu-top, 
                  html body.wp-admin #adminmenu .wp-menu-arrow { 
            background-image: {$gradient_value} !important; 
            background-color: transparent !important; 
        }");
    } else {
        $bg_color = esc_attr($options['admin_menu_bg_color']);
        // Apply solid color only to main wrapper and menu content (not adminmenuback)
        $add_raw("html body.wp-admin #adminmenuwrap { 
            background-color: {$bg_color} !important; 
            background-image: none !important; 
        }");
        // adminmenuback styling consolidated in width section below
        // Apply to menu items for consistency
        $add_raw("html body.wp-admin #adminmenu, 
                  html body.wp-admin #adminmenu li.menu-top, 
                  html body.wp-admin #adminmenu .wp-menu-arrow,
                  html body.wp-admin #adminmenu li.menu-top:not(.wp-has-current-submenu):not(.current):not(:hover) { 
            background-color: {$bg_color} !important; 
            background-image: none !important; 
        }");
    }
    $add_css('#adminmenu .wp-submenu', 'background-color', 'admin_submenu_bg_color'); // Pass option key

    $menu_text_sel = '#adminmenu a, #adminmenu div.wp-menu-name, #adminmenu .wp-menu-arrow, #adminmenu div.wp-menu-image::before';
    $add_css($menu_text_sel, 'color', 'admin_menu_text_color'); // Pass option key
    $menu_ff_val = $get_ff_val('admin_menu_font_family', 'admin_menu_google_font');
    if ($menu_ff_val) $add_css($menu_text_sel, 'font-family', $menu_ff_val, false);
    $add_css($menu_text_sel, 'font-size', 'admin_menu_font_size', true, 'px'); // Pass option key

    $submenu_text_sel = '#adminmenu .wp-submenu a, #adminmenu .wp-submenu .wp-submenu-head';
    $add_css($submenu_text_sel, 'color', 'admin_submenu_text_color'); // Pass option key
    $submenu_ff_val = $get_ff_val('admin_submenu_font_family', 'admin_submenu_google_font');
    if ($submenu_ff_val) $add_css($submenu_text_sel, 'font-family', $submenu_ff_val, false);
    $add_css($submenu_text_sel, 'font-size', 'admin_submenu_font_size', true, 'px'); // Pass option key

    $menu_width_px_val = (int)$options['admin_menu_width'];
    $menu_width_px = $menu_width_px_val . 'px';
    // Width rule for menu containers
    $add_raw("html body.wp-admin #adminmenuwrap { 
        width: {$menu_width_px} !important; 
    }");
    // adminmenu should fill the wrapper, adminmenuback should not block interactions
    $add_raw("html body.wp-admin #adminmenu { 
        width: 100% !important; 
    }");
    // adminmenuback consolidated styling - should not interfere with interactions
    $add_raw("html body.wp-admin #adminmenuback { 
        width: 100% !important; 
        height: 100% !important; 
        position: absolute !important; 
        top: 0 !important; 
        left: 0 !important; 
        z-index: -1 !important; 
        pointer-events: none !important; 
        background: transparent !important; 
        border-radius: 0 !important; 
        box-shadow: none !important; 
    }");
    
    // Folded menu styles - only wrapper needs explicit width
    $add_raw("html body.wp-admin.folded #adminmenuwrap { 
        width: 36px !important; 
    }
    html body.wp-admin.folded #adminmenu { 
        width: 100% !important; 
    }
    // folded adminmenuback inherits from main consolidated rule above
    html body.wp-admin.folded #adminmenu .wp-menu-name, 
    html body.wp-admin.folded #adminmenu .wp-submenu-head { 
        display: none !important; 
    }
    html body.wp-admin.folded #adminmenu .wp-menu-image { 
        margin: 0 auto !important; 
    }
    html body.wp-admin.folded #adminmenu .wp-has-submenu.wp-not-current-submenu.opensub .wp-submenu { 
        width: auto !important; 
    }");

    $menu_item_sel = '#adminmenu li.menu-top > a.menu-top, #adminmenu li.menu-top > .wp-has-submenu';
    $add_css($menu_item_sel, 'padding-top', 'admin_menu_padding_top_bottom', true, 'px'); // Pass option key
    $add_css($menu_item_sel, 'padding-bottom', 'admin_menu_padding_top_bottom', true, 'px'); // Pass option key
    $add_css($menu_item_sel, 'padding-left', 'admin_menu_padding_left_right', true, 'px'); // Pass option key
    $add_css($menu_item_sel, 'padding-right', 'admin_menu_padding_left_right', true, 'px'); // Pass option key
    
    // Consolidated border radius application for menu containers
    // Determine if any border radius is applied
    $has_border_radius = (int)$options['admin_menu_border_radius_all'] > 0 || 
                        ($options['admin_menu_border_radius_type'] === 'individual' && 
                         ((int)$options['admin_menu_border_radius_tl'] > 0 || 
                          (int)$options['admin_menu_border_radius_tr'] > 0 || 
                          (int)$options['admin_menu_border_radius_br'] > 0 || 
                          (int)$options['admin_menu_border_radius_bl'] > 0));
    
    // Border radius - only apply to main wrapper, adminmenuback inherits clipping
    if ($options['admin_menu_border_radius_type'] === 'all') {
        $radius_all = (int)$options['admin_menu_border_radius_all'] . 'px';
        $add_raw("html body.wp-admin #adminmenuwrap { 
            border-radius: {$radius_all} !important; 
            " . ($has_border_radius ? 'overflow: hidden !important;' : 'overflow: visible !important;') . "
        }");
    } else {
        $radius_tl = (int)$options['admin_menu_border_radius_tl'] . 'px';
        $radius_tr = (int)$options['admin_menu_border_radius_tr'] . 'px';
        $radius_br = (int)$options['admin_menu_border_radius_br'] . 'px';
        $radius_bl = (int)$options['admin_menu_border_radius_bl'] . 'px';
        $add_raw("html body.wp-admin #adminmenuwrap { 
            border-top-left-radius: {$radius_tl} !important;
            border-top-right-radius: {$radius_tr} !important;
            border-bottom-right-radius: {$radius_br} !important;
            border-bottom-left-radius: {$radius_bl} !important;
            " . ($has_border_radius ? 'overflow: hidden !important;' : 'overflow: visible !important;') . "
        }");
    }
    
    // adminmenuback border-radius handled in consolidated section above
    
    if ($has_border_radius) {
        // Ensure menu content and items respect the border radius clipping
        $add_raw("html body.wp-admin #adminmenu { 
            overflow: visible !important; 
        }
        html body.wp-admin #adminmenu li.menu-top:first-child > a.menu-top { 
            border-top-left-radius: inherit !important; 
            border-top-right-radius: inherit !important; 
        }
        html body.wp-admin #adminmenu li.menu-top:last-child > a.menu-top { 
            border-bottom-left-radius: inherit !important; 
            border-bottom-right-radius: inherit !important; 
        }");
    } else {
        $add_raw("html body.wp-admin #adminmenu { 
            overflow: visible !important; 
        }");
    }

    // Consolidated shadow application for menu wrapper elements
    $has_shadow = false;
    $shadow_css = '';
    
    if ($options['admin_menu_shadow_type'] === 'simple' && !empty($options['admin_menu_shadow_simple'])) {
        $shadow_css = esc_attr($options['admin_menu_shadow_simple']);
        $has_shadow = true;
    } elseif ($options['admin_menu_shadow_type'] === 'advanced' && !empty($options['admin_menu_shadow_advanced_color'])) {
        $shadow_css = sprintf('%dpx %dpx %dpx %dpx %s', 
            (int)$options['admin_menu_shadow_advanced_offset_x'], 
            (int)$options['admin_menu_shadow_advanced_offset_y'], 
            (int)$options['admin_menu_shadow_advanced_blur'], 
            (int)$options['admin_menu_shadow_advanced_spread'], 
            esc_attr($options['admin_menu_shadow_advanced_color'])
        );
        $has_shadow = true;
    }
    
    if ($has_shadow) {
        // Single consolidated rule for shadow with proper z-index management
        $add_raw("html body.wp-admin #adminmenuwrap { 
            box-shadow: {$shadow_css} !important; 
            position: relative !important; 
            z-index: 9990 !important; 
        }
        html body.wp-admin #adminmenuback, 
        html body.wp-admin #adminmenu { 
            box-shadow: none !important; 
            position: relative !important; 
        }
        html body.wp-admin #adminmenu .wp-submenu { 
            z-index: 9999 !important; 
        }");
    } else {
        $add_raw("html body.wp-admin #adminmenuwrap { 
            box-shadow: none !important; 
        }");
    }
    
    // Consolidated visual effects integration
    if ($has_border_radius && $has_shadow) {
        // When both border radius and shadow are applied, ensure proper rendering
        $add_raw("html body.wp-admin #adminmenuwrap { 
            background-clip: padding-box !important; 
            isolation: isolate !important; 
        }
        // adminmenuback styling handled in consolidated section above");
    }
    
    // Handle visual effects for different menu states
    if ($has_border_radius || $has_shadow) {
        $visual_effects_css = '';
        if ($has_border_radius) $visual_effects_css .= 'border-radius: inherit !important; ';
        if ($has_shadow) $visual_effects_css .= 'box-shadow: inherit !important; ';
        
        $add_raw("html body.wp-admin.folded #adminmenuwrap { 
            {$visual_effects_css}
        }
        html body.wp-admin.folded #adminmenu li.menu-top > a.menu-top { 
            border-radius: inherit !important; 
        }");
        
        // Handle detached menu visual effects if applicable
        if (isset($options['admin_menu_detached']) && $options['admin_menu_detached']) {
            $add_raw("html body.wp-admin #adminmenuwrap { 
                {$visual_effects_css}
                backdrop-filter: none !important; 
            }");
        }
    }

    // Enhanced Submenu Visibility System
    // Modern submenu styling with backdrop blur and smooth transitions
    $submenu_bg_color = esc_attr($options['admin_submenu_bg_color']);
    $submenu_bg_rgba = las_fresh_hex_to_rgba($submenu_bg_color, 0.95);
    
    $add_raw("html body.wp-admin #adminmenu .wp-submenu { 
        position: absolute !important; 
        left: 100% !important; 
        top: 0 !important; 
        min-width: 200px !important; 
        z-index: 9999 !important; 
        visibility: visible !important; 
        opacity: 1 !important; 
        transform: translateX(0) !important;
        transition: all 0.2s ease-in-out !important;
        box-shadow: 2px 2px 8px rgba(0,0,0,0.1) !important;
        border-radius: 4px !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        background-color: {$submenu_bg_rgba} !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        margin-left: 0 !important;
    }");
    
    // Hidden state for smooth transitions
    $add_raw("html body.wp-admin #adminmenu .wp-submenu.las-submenu-hidden { 
        visibility: hidden !important; 
        opacity: 0 !important; 
        transform: translateX(-10px) !important; 
        pointer-events: none !important; 
    }");
    
    // Visible state for smooth transitions
    $add_raw("html body.wp-admin #adminmenu .wp-submenu.las-submenu-visible { 
        visibility: visible !important; 
        opacity: 1 !important; 
        transform: translateX(0) !important; 
        pointer-events: auto !important; 
    }");
    
    // Enhanced hover effects for submenu items
    $add_raw("html body.wp-admin #adminmenu .wp-submenu li a { 
        transition: all 0.15s ease-in-out !important; 
        border-radius: 2px !important; 
        margin: 2px 4px !important; 
        padding: 8px 12px !important; 
    }
    html body.wp-admin #adminmenu .wp-submenu li a:hover { 
        background-color: rgba(255, 255, 255, 0.1) !important; 
        transform: translateX(2px) !important; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; 
    }");
    
    // Enhanced parent menu item hover state
    $add_raw("html body.wp-admin #adminmenu .wp-has-submenu:hover > a,
    html body.wp-admin #adminmenu .wp-has-submenu.opensub > a { 
        background-color: rgba(255, 255, 255, 0.05) !important; 
        transition: background-color 0.2s ease-in-out !important; 
    }");
    
    // Submenu arrow enhancement
    $add_raw("html body.wp-admin #adminmenu .wp-has-submenu .wp-menu-arrow { 
        transition: transform 0.2s ease-in-out !important; 
    }
    html body.wp-admin #adminmenu .wp-has-submenu:hover .wp-menu-arrow,
    html body.wp-admin #adminmenu .wp-has-submenu.opensub .wp-menu-arrow { 
        transform: rotate(90deg) !important; 
    }");
    
    // Responsive submenu positioning for collapsed menu state (body.folded)
    $add_raw("html body.wp-admin.folded #adminmenu .wp-submenu { 
        left: 36px !important; 
        margin-left: 0 !important; 
        min-width: 200px !important; 
    }");
    
    // Ensure submenus are properly visible and positioned relative to their parent
    $add_raw("html body.wp-admin #adminmenu li.menu-top { 
        position: relative !important; 
    }");
    
    // Override WordPress default submenu positioning that might interfere
    $add_raw("html body.wp-admin #adminmenu .wp-has-submenu.wp-not-current-submenu.opensub .wp-submenu { 
        position: absolute !important; 
        left: 100% !important; 
        top: 0 !important; 
        width: auto !important; 
        min-width: 200px !important; 
    }");
    
    // Ensure submenu visibility when hovering over menu items
    $add_raw("html body.wp-admin #adminmenu li.menu-top:hover .wp-submenu, 
              html body.wp-admin #adminmenu li.opensub .wp-submenu { 
        display: block !important; 
        visibility: visible !important; 
        opacity: 1 !important; 
    }");

    // Scrollbar management CSS rules
    // Add overflow-y: auto and overflow-x: hidden to #adminmenuwrap for proper scrolling
    // Set overflow: visible on #adminmenu to prevent submenu clipping
    // Create conditional CSS to hide scrollbars when content fits within container
    $add_raw("html body.wp-admin #adminmenuwrap { 
        overflow-y: auto !important; 
        overflow-x: hidden !important; 
        scrollbar-width: thin !important; 
        scrollbar-color: rgba(255,255,255,0.3) transparent !important; 
    }");
    
    // WebKit scrollbar styling for better appearance
    $add_raw("html body.wp-admin #adminmenuwrap::-webkit-scrollbar { 
        width: 8px !important; 
    }");
    
    $add_raw("html body.wp-admin #adminmenuwrap::-webkit-scrollbar-track { 
        background: transparent !important; 
    }");
    
    $add_raw("html body.wp-admin #adminmenuwrap::-webkit-scrollbar-thumb { 
        background-color: rgba(255,255,255,0.3) !important; 
        border-radius: 4px !important; 
        border: none !important; 
    }");
    
    $add_raw("html body.wp-admin #adminmenuwrap::-webkit-scrollbar-thumb:hover { 
        background-color: rgba(255,255,255,0.5) !important; 
    }");
    
    // Note: #adminmenu overflow is already handled in border radius section above
    
    // Hide scrollbars when content fits within container (conditional CSS)
    $add_raw("html body.wp-admin #adminmenuwrap.no-scroll { 
        overflow-y: hidden !important; 
    }");

    if ($options['admin_menu_detached']) {
        $admin_bar_current_height = is_admin_bar_showing() ? (int)$options['admin_bar_height'] : 0;
        $admin_bar_current_margin_top = ($options['admin_bar_detached'] && is_admin_bar_showing()) ? (int)$options['admin_bar_margin_top'] : 0;
        $effective_top_offset_for_menu = $admin_bar_current_height + $admin_bar_current_margin_top;
        $menu_final_top = $effective_top_offset_for_menu + (int)$options['admin_menu_margin_top'];

        $add_raw("html body.wp-admin #adminmenuwrap { 
            position: fixed !important; 
            top: {$menu_final_top}px !important;
            left: " . (int)$options['admin_menu_margin_left'] . "px !important;
            bottom: " . (int)$options['admin_menu_margin_bottom'] . "px !important;
            width: {$menu_width_px} !important;
            height: auto !important;
            max-height: calc(100vh - {$menu_final_top}px - ".(int)$options['admin_menu_margin_bottom']."px) !important;
            z-index: 9990 !important; margin: 0 !important; padding: 0 !important;
        }");
        $add_raw("html body.wp-admin #adminmenu { height: 100% !important; }");

        $content_margin_left_val = $menu_width_px_val + (int)$options['admin_menu_margin_left'];
        $add_raw("html body.wp-admin #wpcontent, html body.wp-admin #wpfooter { margin-left: {$content_margin_left_val}px !important; }");
        $add_raw("html body.wp-admin.folded #wpcontent, html body.wp-admin.folded #wpfooter { margin-left: " . (36 + (int)$options['admin_menu_margin_left']) . "px !important; }");
    } else {
        $admin_bar_current_height_for_menu_top = is_admin_bar_showing() ? ((int)$options['admin_bar_height'] . 'px') : '0px';
        $add_raw("html body.wp-admin #adminmenuwrap { position: fixed !important; top: {$admin_bar_current_height_for_menu_top} !important; left: 0 !important; bottom: 0 !important; height: auto !important; max-height: calc(100vh - {$admin_bar_current_height_for_menu_top}) !important; width: {$menu_width_px} !important; margin:0 !important; padding: initial !important; z-index: 9990 !important;}");
        $add_raw("html body.wp-admin #adminmenu { height: 100% !important; }");
        $add_raw("html body.wp-admin #wpcontent, html body.wp-admin #wpfooter { margin-left: {$menu_width_px} !important; }");
        $add_raw("html body.wp-admin.folded #wpcontent, html body.wp-admin.folded #wpfooter { margin-left: 36px !important; }");
    }

    // --- Admin Bar Styles ---
    $admin_bar_selector = '#wpadminbar';
    if ($options['admin_bar_bg_type'] === 'gradient') {
        $add_css($admin_bar_selector, 'background-image', 'linear-gradient(' . esc_attr($options['admin_bar_bg_gradient_direction']) . ', ' . esc_attr($options['admin_bar_bg_gradient_color1']) . ', ' . esc_attr($options['admin_bar_bg_gradient_color2']) . ')');
        $add_css($admin_bar_selector, 'background-color', 'transparent');
    } else {
        $add_css($admin_bar_selector, 'background-color', 'admin_bar_bg_color'); // Pass option key
        $add_css($admin_bar_selector, 'background-image', 'none');
    }

    $bar_text_sel = '#wpadminbar .ab-item, #wpadminbar a.ab-item, #wpadminbar > #wp-toolbar span.ab-label, #wpadminbar > #wp-toolbar span.noticon, #wpadminbar .ab-icon::before, #wpadminbar .ab-item::before';
    $add_css($bar_text_sel, 'color', 'admin_bar_text_color'); // Pass option key
    $bar_ff_val = $get_ff_val('admin_bar_font_family', 'admin_bar_google_font');
    if ($bar_ff_val) $add_css($bar_text_sel, 'font-family', $bar_ff_val, false);
    $add_css($bar_text_sel, 'font-size', 'admin_bar_font_size', true, 'px'); // Pass option key
    
    $current_bar_height = (int)$options['admin_bar_height'];
    if ($current_bar_height > 0) { // Ensure height is positive
        $bar_height_px = $current_bar_height . 'px';
        $add_css($admin_bar_selector, 'height', $bar_height_px);
        $add_css('#wpadminbar .ab-item, #wpadminbar .ab-empty-item', 'height', $bar_height_px);
        $add_css('#wpadminbar .ab-icon::before, #wpadminbar .ab-item::before', 'line-height', $bar_height_px);
    }
    
    $admin_bar_width_value = ($options['admin_bar_width_type'] === 'px') ? ((int)$options['admin_bar_width_px'] . 'px') : ((int)$options['admin_bar_width_percentage'] . '%');
    $add_css($admin_bar_selector, 'width', $admin_bar_width_value);

    if (($options['admin_bar_width_type'] === 'percentage' && (int)$options['admin_bar_width_percentage'] < 100) || $options['admin_bar_width_type'] === 'px') {
        if (!$options['admin_bar_detached'] || ((int)$options['admin_bar_margin_left'] == 0 && (int)$options['admin_bar_margin_right'] == 0) ) {
            $add_css($admin_bar_selector, 'margin-left', 'auto');
            $add_css($admin_bar_selector, 'margin-right', 'auto');
        }
    }

    $bar_item_sel_padding = '#wpadminbar #wp-toolbar > ul > li > .ab-item';
    $add_css($bar_item_sel_padding, 'padding-top', 'admin_bar_padding_top_bottom', true, 'px');
    $add_css($bar_item_sel_padding, 'padding-bottom', 'admin_bar_padding_top_bottom', true, 'px');
    $add_css($bar_item_sel_padding, 'padding-left', 'admin_bar_padding_left_right', true, 'px');
    $add_css($bar_item_sel_padding, 'padding-right', 'admin_bar_padding_left_right', true, 'px');

    $admin_bar_radius_target = $admin_bar_selector . ', ' . $admin_bar_selector . ' .ab-sub-wrapper';
    if ($options['admin_bar_border_radius_type'] === 'all') {
        $add_css($admin_bar_radius_target, 'border-radius', 'admin_bar_border_radius_all', true, 'px');
    } else {
        $add_css($admin_bar_radius_target, 'border-top-left-radius', 'admin_bar_border_radius_tl', true, 'px');
        $add_css($admin_bar_radius_target, 'border-top-right-radius', 'admin_bar_border_radius_tr', true, 'px');
        $add_css($admin_bar_radius_target, 'border-bottom-right-radius', 'admin_bar_border_radius_br', true, 'px');
        $add_css($admin_bar_radius_target, 'border-bottom-left-radius', 'admin_bar_border_radius_bl', true, 'px');
    }
    if ((int)$options['admin_bar_border_radius_all'] > 0 || ($options['admin_bar_border_radius_type'] === 'individual' && ((int)$options['admin_bar_border_radius_tl'] > 0 || (int)$options['admin_bar_border_radius_tr'] > 0 || (int)$options['admin_bar_border_radius_br'] > 0 || (int)$options['admin_bar_border_radius_bl'] > 0))) {
        $add_css($admin_bar_selector . ' .ab-sub-wrapper', 'overflow', 'hidden');
    } else {
        $add_css($admin_bar_selector . ' .ab-sub-wrapper', 'overflow', 'visible');
    }

    if ($options['admin_bar_shadow_type'] === 'simple' && !empty($options['admin_bar_shadow_simple'])) {
        $add_css($admin_bar_selector, 'box-shadow', 'admin_bar_shadow_simple');
    } elseif ($options['admin_bar_shadow_type'] === 'advanced' && !empty($options['admin_bar_shadow_advanced_color'])) {
        $shadow_val = sprintf('%dpx %dpx %dpx %dpx %s', (int)$options['admin_bar_shadow_advanced_offset_x'], (int)$options['admin_bar_shadow_advanced_offset_y'], (int)$options['admin_bar_shadow_advanced_blur'], (int)$options['admin_bar_shadow_advanced_spread'], $options['admin_bar_shadow_advanced_color']);
        $add_css($admin_bar_selector, 'box-shadow', $shadow_val);
    } else {
        $add_css($admin_bar_selector, 'box-shadow', 'none');
    }
    
    if ($options['admin_bar_detached']) {
        $bar_final_top = (int)$options['admin_bar_margin_top'];
        $bar_final_left = (int)$options['admin_bar_margin_left'];
        $bar_final_right = (int)$options['admin_bar_margin_right'];

        $add_raw("html body.wp-admin #wpadminbar { 
            position: fixed !important; 
            top: {$bar_final_top}px !important;
            left: {$bar_final_left}px !important;
            right: {$bar_final_right}px !important;
            margin-left: 0 !important; 
            margin-right: 0 !important;
            padding: 0 !important; /* Reset padding for the bar itself when detached */
            z-index: 99999 !important;
        }");
        $html_padding_top = $current_bar_height + $bar_final_top;
        $add_raw("html.wp-toolbar { padding-top: {$html_padding_top}px !important; }");
    } else {
        $add_raw("html.wp-toolbar { padding-top: {$current_bar_height}px !important; }");
        // Default WP admin bar is fixed, centered if width < 100%
        $add_raw("html body.wp-admin #wpadminbar { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; margin-left: auto !important; margin-right: auto !important; }");
    }

    // --- Accent Color ---
    if (!empty($options['accent_color']) && $options['accent_color'] !== $defaults['accent_color']) {
        $ac = $options['accent_color'];
        $ac_text_on_accent = (hexdec(substr($ac, 1, 2)) * 0.299 + hexdec(substr($ac, 3, 2)) * 0.587 + hexdec(substr($ac, 5, 2)) * 0.114) > 186 ? '#000000' : '#ffffff';

        $add_css('#adminmenu li.menu-top:hover > a.menu-top, #adminmenu li.opensub > a.menu-top, #adminmenu li.wp-has-current-submenu > a.wp-has-current-submenu, #adminmenu li.current > a.menu-top', 'background-color', $ac);
        $add_css('#adminmenu li.menu-top:hover > a.menu-top, #adminmenu li.opensub > a.menu-top, #adminmenu li.wp-has-current-submenu > a.wp-has-current-submenu, #adminmenu li.current > a.menu-top, #adminmenu li.menu-top:hover div.wp-menu-image::before, #adminmenu li.opensub div.wp-menu-image::before, #adminmenu li.wp-has-current-submenu div.wp-menu-image::before, #adminmenu li.current div.wp-menu-image::before', 'color', $ac_text_on_accent);
        $add_css('#adminmenu .wp-submenu li.current a, #adminmenu .wp-submenu li.current a:hover, #adminmenu .wp-submenu li.current a:focus', 'background-color', $ac);
        $add_css('#adminmenu .wp-submenu li.current a, #adminmenu .wp-submenu li.current a:hover, #adminmenu .wp-submenu li.current a:focus', 'color', $ac_text_on_accent);
        $add_css('#adminmenu .wp-submenu a:hover', 'color', $ac);
        $add_css('#wpadminbar .ab-top-menu > li:hover > .ab-item, #wpadminbar .ab-top-menu > li.hover > .ab-item, #wpadminbar .ab-top-menu > li > .ab-item:focus', 'background-color', $ac);
        $add_css('#wpadminbar .ab-top-menu > li:hover > .ab-item, #wpadminbar .ab-top-menu > li.hover > .ab-item, #wpadminbar .ab-top-menu > li > .ab-item:focus, #wpadminbar .ab-top-menu > li:hover > .ab-item .ab-icon::before, #wpadminbar .ab-top-menu > li.hover > .ab-item .ab-icon::before, #wpadminbar .ab-top-menu > li > .ab-item:focus .ab-icon::before', 'color', $ac_text_on_accent);
        $add_css('.wp-core-ui .button-primary', 'background-color', $ac);
        $add_css('.wp-core-ui .button-primary', 'border-color', las_fresh_adjust_brightness_css($ac, -20));
        $add_css('.wp-core-ui .button-primary', 'color', $ac_text_on_accent);
        $add_css('.wp-core-ui .button-primary:hover, .wp-core-ui .button-primary:focus', 'background-color', las_fresh_adjust_brightness_css($ac, -15));
        $link_selectors = '.wrap a, #wpbody-content a, .row-actions span a, .comment-edit-link, .post-edit-link, .tag span.edit a, .category span.edit a';
        $add_css($link_selectors, 'color', $ac);
        $add_css('input[type=checkbox]:checked::before', 'color', $ac);
        $add_css('input[type=radio]:checked::before', 'background-color', $ac);
        $add_css('.wp-core-ui .notice.is-dismissible .notice-dismiss:before', 'color', $ac);
    }

    if (!empty($options['custom_css_rules'])) {
        $css_output .= "\n/* Custom CSS User Rules */\n" . wp_strip_all_tags(wp_kses_stripslashes($options['custom_css_rules'])) . "\n";
    }

        // Enhanced CSS output validation and return with error handling
        // Validate final CSS output
        if (!is_string($css_output)) {
            error_log('LAS CSS Generation: CSS output is not a string: ' . gettype($css_output));
            $css_output = "/* LAS CSS Generation Error: Invalid output type */\n";
        }
        
        // Check for extremely large CSS output that might cause memory issues
        if (strlen($css_output) > 1000000) { // 1MB limit
            error_log('LAS CSS Generation: CSS output is extremely large (' . strlen($css_output) . ' bytes), truncating');
            $css_output = substr($css_output, 0, 1000000) . "\n/* ... CSS truncated due to size limit ... */\n";
        }
        
        // In preview mode, always return CSS even if it's just the header comment
        if ($preview_options !== null) {
            return $css_output;
        }
        
        // In normal mode, return empty string if only header comment
        try {
            $comment_pattern = "/^\/\* Live Admin Styler CSS v" . preg_quote(LAS_FRESH_VERSION, '/') . " \(Specificity Enhanced v[23]\) \*\/\s*$/";
            if (preg_match($comment_pattern, trim($css_output))) {
                return '';
            }
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in comment pattern matching: ' . $e->getMessage());
            // Continue with returning the CSS output
        }
        
        return $css_output;
        
    } catch (Exception $e) {
        error_log('LAS CSS Generation: Critical error in CSS generation function: ' . $e->getMessage());
        return "/* LAS CSS Generation Critical Error: " . esc_html($e->getMessage()) . " */\n";
    }
}

function las_fresh_generate_login_css_rules() {
    try {
        // Get options with error handling
        try {
            $options = las_fresh_get_options();
        } catch (Exception $e) {
            error_log('LAS Login CSS: Error getting options: ' . $e->getMessage());
            return '';
        }
        
        // Validate options
        if (!is_array($options)) {
            error_log('LAS Login CSS: Options is not an array');
            return '';
        }
        
        $login_logo_url = isset($options['login_logo']) ? $options['login_logo'] : '';
        $css = '';
        
        // Enhanced validation for login logo URL
        if (!empty($login_logo_url)) {
            // Validate URL format and security
            if (filter_var($login_logo_url, FILTER_VALIDATE_URL) && 
                (strpos($login_logo_url, 'http://') === 0 || strpos($login_logo_url, 'https://') === 0)) {
                
                try {
                    $logo_url = esc_url($login_logo_url);
                    if (!empty($logo_url)) {
                        $css .= "body.login div#login h1 a { background-image: url({$logo_url}) !important; width: 100% !important; max-width:320px !important; min-height:80px !important; height:auto !important; background-size: contain !important; background-position: center center !important; background-repeat:no-repeat !important; margin-bottom:25px !important; padding-bottom:0 !important; }\n";
                    }
                } catch (Exception $e) {
                    error_log('LAS Login CSS: Error processing logo URL: ' . $e->getMessage());
                }
            } else {
                error_log('LAS Login CSS: Invalid login logo URL: ' . $login_logo_url);
            }
        }
        
        return trim($css);
        
    } catch (Exception $e) {
        error_log('LAS Login CSS: Critical error in login CSS generation: ' . $e->getMessage());
        return '';
    }
}

function las_fresh_custom_admin_footer_text_output($footer_text) {
    try {
        // Get custom footer text with error handling
        try {
            $custom_text = las_fresh_get_option('footer_text');
        } catch (Exception $e) {
            error_log('LAS Footer Text: Error getting footer text option: ' . $e->getMessage());
            return $footer_text; // Return original footer text on error
        }
        
        // Enhanced validation for custom footer text
        if (!empty($custom_text) && is_string($custom_text)) {
            // Validate text length to prevent extremely long footer text
            if (strlen($custom_text) > 1000) {
                error_log('LAS Footer Text: Custom footer text too long, truncating');
                $custom_text = substr($custom_text, 0, 1000) . '...';
            }
            
            try {
                return wp_kses_post($custom_text);
            } catch (Exception $e) {
                error_log('LAS Footer Text: Error sanitizing custom footer text: ' . $e->getMessage());
                return $footer_text; // Return original on sanitization error
            }
        }
        
        return $footer_text;
        
    } catch (Exception $e) {
        error_log('LAS Footer Text: Critical error in footer text processing: ' . $e->getMessage());
        return $footer_text; // Always return something, even if it's the original
    }
}

if (!function_exists('las_fresh_adjust_brightness_css')) {
    function las_fresh_adjust_brightness_css($hex, $steps) {
        try {
            // Enhanced input validation with fallbacks
            if (!is_string($hex)) {
                error_log('LAS Brightness Adjustment: Hex value is not a string: ' . gettype($hex));
                return '#000000'; // Fallback to black
            }
            
            if (!is_numeric($steps)) {
                error_log('LAS Brightness Adjustment: Steps value is not numeric: ' . gettype($steps));
                $steps = 0; // Fallback to no change
            }
            
            $original_hex = $hex;
            $hex = ltrim($hex, '#');
            
            // Validate hex string
            if (empty($hex)) {
                error_log('LAS Brightness Adjustment: Empty hex value provided');
                return '#000000'; // Fallback to black
            }
            
            // Expand 3-character hex to 6-character
            if (strlen($hex) === 3) {
                $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
            }
            
            // Enhanced hex validation
            if (strlen($hex) !== 6 || !ctype_xdigit($hex)) {
                error_log('LAS Brightness Adjustment: Invalid hex format: ' . $original_hex);
                return '#' . ltrim($original_hex, '#'); // Return original if invalid
            }
            
            // Clamp steps to valid range
            $steps = max(-255, min(255, (int)$steps));
            
            $rgb_array = array();
            
            // Process each color component with error handling
            for ($i = 0; $i < 3; $i++) {
                try {
                    $hex_component = substr($hex, $i * 2, 2);
                    $color_component = hexdec($hex_component);
                    
                    // Validate hexdec result
                    if ($color_component === false) {
                        error_log('LAS Brightness Adjustment: Error converting hex component: ' . $hex_component);
                        $color_component = 0; // Fallback to 0
                    }
                    
                    $rgb_array[] = max(0, min(255, $color_component + $steps));
                    
                } catch (Exception $e) {
                    error_log('LAS Brightness Adjustment: Error processing color component ' . $i . ': ' . $e->getMessage());
                    $rgb_array[] = 0; // Fallback to 0 for this component
                }
            }
            
            // Build new hex value with error handling
            $new_hex = '#';
            foreach ($rgb_array as $component) {
                try {
                    $hex_component = dechex($component);
                    $new_hex .= str_pad($hex_component, 2, '0', STR_PAD_LEFT);
                } catch (Exception $e) {
                    error_log('LAS Brightness Adjustment: Error converting component to hex: ' . $e->getMessage());
                    $new_hex .= '00'; // Fallback to 00
                }
            }
            
            // Final validation of result
            if (strlen($new_hex) !== 7 || $new_hex[0] !== '#') {
                error_log('LAS Brightness Adjustment: Invalid result format: ' . $new_hex);
                return '#' . ltrim($original_hex, '#'); // Return original on error
            }
            
            return $new_hex;
            
        } catch (Exception $e) {
            error_log('LAS Brightness Adjustment: Critical error in brightness adjustment: ' . $e->getMessage());
            return '#000000'; // Fallback to black on critical error
        }
    }
}
?>