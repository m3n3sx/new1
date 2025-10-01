<?php
// Prevent direct access to the file.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enhanced color validation and sanitization functions
 */

/**
 * Validate and sanitize color values with comprehensive fallback handling
 */
function las_fresh_validate_color($color, $fallback = '#2c3338') {
    try {
        if (empty($color) || !is_string($color)) {
            error_log('LAS CSS Validation: Invalid color input type: ' . gettype($color));
            return $fallback;
        }
        
        $color = trim($color);
        
        // Handle named colors
        $named_colors = array(
            'transparent', 'inherit', 'initial', 'unset', 'currentColor',
            'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
            'gray', 'grey', 'orange', 'purple', 'brown', 'pink', 'lime', 'navy'
        );
        
        if (in_array(strtolower($color), $named_colors)) {
            return strtolower($color);
        }
        
        // Validate hex colors
        if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color)) {
            return $color;
        }
        
        // Validate RGB/RGBA colors
        if (preg_match('/^rgba?\(\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*(?:,\s*([01](?:\.\d+)?))?\s*\)$/i', $color, $matches)) {
            // Validate RGB values
            for ($i = 1; $i <= 3; $i++) {
                $value = $matches[$i];
                if (strpos($value, '%') !== false) {
                    $num = floatval(str_replace('%', '', $value));
                    if ($num < 0 || $num > 100) {
                        error_log('LAS CSS Validation: Invalid RGB percentage value: ' . $value);
                        return $fallback;
                    }
                } else {
                    $num = intval($value);
                    if ($num < 0 || $num > 255) {
                        error_log('LAS CSS Validation: Invalid RGB value: ' . $value);
                        return $fallback;
                    }
                }
            }
            
            // Validate alpha if present
            if (isset($matches[4])) {
                $alpha = floatval($matches[4]);
                if ($alpha < 0 || $alpha > 1) {
                    error_log('LAS CSS Validation: Invalid alpha value: ' . $alpha);
                    return $fallback;
                }
            }
            
            return $color;
        }
        
        // Validate HSL/HSLA colors
        if (preg_match('/^hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*([01](?:\.\d+)?))?\s*\)$/i', $color, $matches)) {
            $hue = floatval($matches[1]);
            $saturation = floatval($matches[2]);
            $lightness = floatval($matches[3]);
            
            if ($hue < 0 || $hue > 360 || $saturation < 0 || $saturation > 100 || $lightness < 0 || $lightness > 100) {
                error_log('LAS CSS Validation: Invalid HSL values: H=' . $hue . ', S=' . $saturation . ', L=' . $lightness);
                return $fallback;
            }
            
            if (isset($matches[4])) {
                $alpha = floatval($matches[4]);
                if ($alpha < 0 || $alpha > 1) {
                    error_log('LAS CSS Validation: Invalid HSL alpha value: ' . $alpha);
                    return $fallback;
                }
            }
            
            return $color;
        }
        
        error_log('LAS CSS Validation: Unrecognized color format: ' . $color);
        return $fallback;
        
    } catch (Exception $e) {
        error_log('LAS CSS Validation: Error validating color: ' . $e->getMessage());
        return $fallback;
    }
}

/**
 * Validate and sanitize numeric values with units
 */
function las_fresh_validate_numeric($value, $unit = '', $min = null, $max = null, $fallback = 0) {
    try {
        if ($value === null || $value === '') {
            return $fallback . $unit;
        }
        
        // Handle string values that might contain units
        if (is_string($value)) {
            $value = trim($value);
            // Extract numeric part
            if (preg_match('/^(-?\d+(?:\.\d+)?)/', $value, $matches)) {
                $value = floatval($matches[1]);
            } else {
                error_log('LAS CSS Validation: Non-numeric value provided: ' . $value);
                return $fallback . $unit;
            }
        }
        
        if (!is_numeric($value) || !is_finite($value)) {
            error_log('LAS CSS Validation: Invalid numeric value: ' . var_export($value, true));
            return $fallback . $unit;
        }
        
        $value = floatval($value);
        
        // Apply min/max constraints
        if ($min !== null && $value < $min) {
            error_log('LAS CSS Validation: Value below minimum (' . $min . '): ' . $value);
            $value = $min;
        }
        
        if ($max !== null && $value > $max) {
            error_log('LAS CSS Validation: Value above maximum (' . $max . '): ' . $value);
            $value = $max;
        }
        
        // Format the value appropriately
        if ($value == intval($value)) {
            return intval($value) . $unit;
        } else {
            return number_format($value, 2, '.', '') . $unit;
        }
        
    } catch (Exception $e) {
        error_log('LAS CSS Validation: Error validating numeric value: ' . $e->getMessage());
        return $fallback . $unit;
    }
}

/**
 * Enhanced CSS value validation with type-specific rules
 */
function las_fresh_validate_css_value($value, $property, $fallback = '') {
    try {
        if ($value === null || $value === '') {
            return $fallback;
        }
        
        $value = trim($value);
        
        // Property-specific validation rules
        switch ($property) {
            case 'display':
                $valid_values = array('none', 'block', 'inline', 'inline-block', 'flex', 'grid', 'table', 'table-cell', 'table-row', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'position':
                $valid_values = array('static', 'relative', 'absolute', 'fixed', 'sticky', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'overflow':
            case 'overflow-x':
            case 'overflow-y':
                $valid_values = array('visible', 'hidden', 'scroll', 'auto', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'text-align':
                $valid_values = array('left', 'right', 'center', 'justify', 'start', 'end', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'font-weight':
                $valid_values = array('normal', 'bold', 'bolder', 'lighter', 'inherit', 'initial', 'unset');
                $numeric_values = array('100', '200', '300', '400', '500', '600', '700', '800', '900');
                return (in_array($value, $valid_values) || in_array($value, $numeric_values)) ? $value : $fallback;
                
            case 'font-style':
                $valid_values = array('normal', 'italic', 'oblique', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'text-decoration':
                $valid_values = array('none', 'underline', 'overline', 'line-through', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'cursor':
                $valid_values = array('auto', 'default', 'pointer', 'text', 'wait', 'help', 'move', 'crosshair', 'not-allowed', 'grab', 'grabbing', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'border-style':
            case 'border-top-style':
            case 'border-right-style':
            case 'border-bottom-style':
            case 'border-left-style':
                $valid_values = array('none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'background-repeat':
                $valid_values = array('repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'background-attachment':
                $valid_values = array('scroll', 'fixed', 'local', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            case 'background-size':
                $valid_values = array('auto', 'cover', 'contain', 'inherit', 'initial', 'unset');
                if (in_array($value, $valid_values)) {
                    return $value;
                }
                // Allow percentage and length values
                if (preg_match('/^(\d+(?:\.\d+)?(%|px|em|rem|vh|vw)\s*){1,2}$/', $value)) {
                    return $value;
                }
                return $fallback;
                
            case 'box-sizing':
                $valid_values = array('content-box', 'border-box', 'inherit', 'initial', 'unset');
                return in_array($value, $valid_values) ? $value : $fallback;
                
            default:
                // For unknown properties, perform basic sanitization
                return las_fresh_sanitize_css_value($value, $fallback);
        }
        
    } catch (Exception $e) {
        error_log('LAS CSS Validation: Error validating CSS value: ' . $e->getMessage());
        return $fallback;
    }
}

/**
 * Basic CSS value sanitization for unknown properties
 */
function las_fresh_sanitize_css_value($value, $fallback = '') {
    try {
        if (empty($value)) {
            return $fallback;
        }
        
        // Remove potentially dangerous content
        $dangerous_patterns = array(
            '/javascript:/i',
            '/expression\s*\(/i',
            '/behavior\s*:/i',
            '/binding\s*:/i',
            '/@import/i',
            '/url\s*\(\s*["\']?\s*javascript:/i'
        );
        
        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $value)) {
                error_log('LAS CSS Validation: Dangerous pattern detected in CSS value: ' . $value);
                return $fallback;
            }
        }
        
        // Basic sanitization - allow common CSS characters
        $sanitized = preg_replace('/[^a-zA-Z0-9\s\-_.,()%#\/\'":]/', '', $value);
        
        return !empty($sanitized) ? $sanitized : $fallback;
        
    } catch (Exception $e) {
        error_log('LAS CSS Validation: Error sanitizing CSS value: ' . $e->getMessage());
        return $fallback;
    }
}

/**
 * Validate CSS selector to prevent injection and ensure proper syntax
 */
function las_fresh_validate_selector($selector) {
    try {
        if (empty($selector) || !is_string($selector)) {
            error_log('LAS CSS Validation: Invalid selector input: ' . var_export($selector, true));
            return '';
        }
        
        $selector = trim($selector);
        
        // Remove potentially dangerous characters while preserving valid CSS selector syntax
        $sanitized = preg_replace('/[^a-zA-Z0-9\s\-_#.,>+~:()[\]="\'*@]/', '', $selector);
        
        if (empty($sanitized)) {
            error_log('LAS CSS Validation: Selector became empty after sanitization: ' . $selector);
            return '';
        }
        
        // Basic validation for common CSS selector patterns
        if (!preg_match('/^[a-zA-Z0-9\s\-_#.,>+~:()[\]="\'*@]+$/', $sanitized)) {
            error_log('LAS CSS Validation: Invalid selector pattern: ' . $sanitized);
            return '';
        }
        
        // Check for balanced brackets and quotes
        $brackets = substr_count($sanitized, '[') - substr_count($sanitized, ']');
        $parens = substr_count($sanitized, '(') - substr_count($sanitized, ')');
        $single_quotes = substr_count($sanitized, "'") % 2;
        $double_quotes = substr_count($sanitized, '"') % 2;
        
        if ($brackets !== 0 || $parens !== 0 || $single_quotes !== 0 || $double_quotes !== 0) {
            error_log('LAS CSS Validation: Unbalanced brackets or quotes in selector: ' . $sanitized);
            return '';
        }
        
        return $sanitized;
        
    } catch (Exception $e) {
        error_log('LAS CSS Validation: Error validating selector: ' . $e->getMessage());
        return '';
    }
}

/**
 * Enhanced CSS selector specificity management
 * Ensures proper specificity to override WordPress defaults
 */
function las_fresh_enhance_selector_specificity($selector) {
    try {
        if (empty($selector) || !is_string($selector)) {
            error_log('LAS CSS Specificity: Invalid selector input: ' . var_export($selector, true));
            return '';
        }
        
        $selector = trim($selector);
        
        // Calculate current specificity level
        $specificity_score = las_fresh_calculate_selector_specificity($selector);
        
        // Define specificity requirements for different selector types
        $required_specificity = array(
            'adminmenu' => 120,      // WordPress admin menu has high specificity
            'adminbar' => 110,       // Admin bar needs high specificity
            'wp-admin' => 100,       // General admin styles
            'default' => 90          // Default minimum specificity
        );
        
        // Determine required specificity based on selector content
        $target_specificity = $required_specificity['default'];
        
        if (strpos($selector, '#adminmenu') !== false || strpos($selector, '.wp-menu') !== false) {
            $target_specificity = $required_specificity['adminmenu'];
        } elseif (strpos($selector, '#wpadminbar') !== false || strpos($selector, '.ab-') !== false) {
            $target_specificity = $required_specificity['adminbar'];
        } elseif (strpos($selector, '.wp-admin') !== false || strpos($selector, '#wpbody') !== false) {
            $target_specificity = $required_specificity['wp-admin'];
        }
        
        // Check if selector already has sufficient specificity
        if ($specificity_score >= $target_specificity) {
            return $selector;
        }
        
        // Enhance specificity based on selector type
        return las_fresh_add_specificity_prefix($selector, $target_specificity - $specificity_score);
        
    } catch (Exception $e) {
        error_log('LAS CSS Specificity: Error enhancing selector specificity: ' . $e->getMessage());
        return $selector; // Return original selector as fallback
    }
}

/**
 * Calculate CSS selector specificity score
 * Based on CSS specificity rules: IDs=100, Classes/Attributes/Pseudo-classes=10, Elements=1
 */
function las_fresh_calculate_selector_specificity($selector) {
    try {
        $score = 0;
        
        // Count IDs (#)
        $score += substr_count($selector, '#') * 100;
        
        // Count classes (.), attributes ([]), and pseudo-classes (:)
        $score += substr_count($selector, '.') * 10;
        $score += substr_count($selector, '[') * 10;
        $score += preg_match_all('/:[a-zA-Z-]+(?:\([^)]*\))?/', $selector) * 10;
        
        // Count elements (simplified - count words that don't start with # . : [ or contain special chars)
        $elements = preg_split('/[\s>+~]/', $selector);
        foreach ($elements as $element) {
            $element = trim($element);
            if (!empty($element) && !preg_match('/^[#.:\[]/', $element) && preg_match('/^[a-zA-Z]/', $element)) {
                $score += 1;
            }
        }
        
        return $score;
        
    } catch (Exception $e) {
        error_log('LAS CSS Specificity: Error calculating specificity: ' . $e->getMessage());
        return 0;
    }
}

/**
 * Add appropriate specificity prefix to reach target specificity
 */
function las_fresh_add_specificity_prefix($selector, $needed_specificity) {
    try {
        // Define specificity prefixes in order of preference
        $prefixes = array(
            'html body.wp-admin' => 12,           // html(1) + body(1) + .wp-admin(10) = 12
            'body.wp-admin' => 11,                // body(1) + .wp-admin(10) = 11  
            'html.wp-toolbar' => 11,              // html(1) + .wp-toolbar(10) = 11
            '.wp-admin' => 10,                    // .wp-admin(10) = 10
            'html' => 1,                          // html(1) = 1
            'body' => 1                           // body(1) = 1
        );
        
        // Check if selector already has high-specificity prefixes
        foreach (array_keys($prefixes) as $prefix) {
            if (strpos($selector, $prefix) === 0) {
                return $selector; // Already has a good prefix
            }
        }
        
        // Find the most appropriate prefix
        foreach ($prefixes as $prefix => $prefix_score) {
            if ($prefix_score >= $needed_specificity) {
                return $prefix . ' ' . $selector;
            }
        }
        
        // If we need very high specificity, use the strongest prefix
        return 'html body.wp-admin ' . $selector;
        
    } catch (Exception $e) {
        error_log('LAS CSS Specificity: Error adding prefix: ' . $e->getMessage());
        return 'html body.wp-admin ' . $selector; // Safe fallback
    }
}

/**
 * Validate CSS property name
 */
function las_fresh_validate_property($property) {
    try {
        if (empty($property) || !is_string($property)) {
            error_log('LAS CSS Validation: Invalid property input: ' . var_export($property, true));
            return '';
        }
        
        $property = trim($property);
        
        // CSS property names can only contain letters, numbers, and hyphens
        $sanitized = preg_replace('/[^a-zA-Z0-9\-]/', '', $property);
        
        if (empty($sanitized)) {
            error_log('LAS CSS Validation: Property became empty after sanitization: ' . $property);
            return '';
        }
        
        // Must start with a letter
        if (!preg_match('/^[a-zA-Z]/', $sanitized)) {
            error_log('LAS CSS Validation: Property must start with a letter: ' . $sanitized);
            return '';
        }
        
        return $sanitized;
        
    } catch (Exception $e) {
        error_log('LAS CSS Validation: Error validating property: ' . $e->getMessage());
        return '';
    }
}

/**
 * Convert hex color to rgba with alpha transparency (Enhanced)
 */
function las_fresh_hex_to_rgba($hex, $alpha = 1) {
    try {
        // Validate inputs
        if (!is_string($hex) || empty($hex)) {
            error_log('LAS CSS Generation: Invalid hex input for rgba conversion: ' . var_export($hex, true));
            return 'rgba(44, 51, 56, ' . max(0, min(1, $alpha)) . ')';
        }
        
        if (!is_numeric($alpha)) {
            error_log('LAS CSS Generation: Invalid alpha value for rgba conversion: ' . var_export($alpha, true));
            $alpha = 1;
        }
        
        // Remove # if present
        $hex = ltrim($hex, '#');
        
        // Validate hex color format
        if (!preg_match('/^[a-fA-F0-9]{6}$/', $hex) && !preg_match('/^[a-fA-F0-9]{3}$/', $hex)) {
            error_log('LAS CSS Generation: Invalid hex color format: ' . $hex);
            return 'rgba(44, 51, 56, ' . max(0, min(1, $alpha)) . ')';
        }
        
        // Convert 3-digit hex to 6-digit
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        
        // Convert hex to RGB with validation
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        
        // Validate RGB values
        if ($r === false || $g === false || $b === false) {
            error_log('LAS CSS Generation: Error converting hex components to decimal: ' . $hex);
            return 'rgba(44, 51, 56, ' . max(0, min(1, $alpha)) . ')';
        }
        
        // Clamp values to valid ranges
        $r = max(0, min(255, $r));
        $g = max(0, min(255, $g));
        $b = max(0, min(255, $b));
        $alpha = max(0, min(1, $alpha));
        
        return "rgba($r, $g, $b, $alpha)";
        
    } catch (Exception $e) {
        error_log('LAS CSS Generation: Error converting hex to rgba: ' . $e->getMessage());
        return 'rgba(44, 51, 56, ' . max(0, min(1, floatval($alpha))) . ')';
    }
}

/**
 * Get property-specific fallback values for invalid CSS
 */
function las_fresh_get_property_fallback($property, $original_value = null) {
    try {
        // Define fallback values for common CSS properties
        $fallbacks = array(
            'color' => 'inherit',
            'background-color' => 'transparent',
            'border-color' => 'currentColor',
            'font-size' => '14px',
            'font-family' => 'inherit',
            'font-weight' => 'normal',
            'line-height' => 'normal',
            'margin' => '0',
            'padding' => '0',
            'width' => 'auto',
            'height' => 'auto',
            'border-radius' => '0',
            'opacity' => '1',
            'z-index' => 'auto',
            'display' => 'block',
            'position' => 'static',
            'overflow' => 'visible',
            'text-align' => 'left',
            'background-image' => 'none',
            'background-repeat' => 'repeat',
            'background-position' => '0 0',
            'background-size' => 'auto',
            'border-style' => 'solid',
            'border-width' => '0',
            'box-shadow' => 'none',
            'text-decoration' => 'none',
            'cursor' => 'auto'
        );
        
        // Check for property-specific fallbacks
        if (isset($fallbacks[$property])) {
            return $fallbacks[$property];
        }
        
        // Check for property family fallbacks
        if (strpos($property, 'color') !== false) {
            return 'inherit';
        } elseif (strpos($property, 'font') !== false) {
            return 'inherit';
        } elseif (strpos($property, 'margin') !== false || strpos($property, 'padding') !== false) {
            return '0';
        } elseif (strpos($property, 'border') !== false) {
            if (strpos($property, 'width') !== false) return '0';
            if (strpos($property, 'style') !== false) return 'solid';
            if (strpos($property, 'color') !== false) return 'currentColor';
            return 'none';
        } elseif (strpos($property, 'background') !== false) {
            return 'transparent';
        }
        
        // Generic fallbacks based on original value type
        if (is_numeric($original_value)) {
            return '0';
        }
        
        return 'initial';
        
    } catch (Exception $e) {
        error_log('LAS CSS Fallback: Error getting fallback for ' . $property . ': ' . $e->getMessage());
        return 'initial';
    }
}

/**
 * Map new settings structure to legacy format for CSS generation compatibility
 * This ensures the CSS output system works with both old and new settings structures
 */
function las_fresh_map_new_settings_to_legacy($new_settings) {
    try {
        if (!is_array($new_settings)) {
            error_log('LAS CSS Mapping: Invalid new_settings provided, expected array, got: ' . gettype($new_settings));
            return array();
        }
        
        // Define mapping between new settings keys and legacy option keys
        $mapping = array(
            // Menu settings
            'menu_background_color' => 'admin_menu_bg_color',
            'menu_text_color' => 'admin_menu_text_color',
            'menu_hover_color' => 'accent_color',
            'menu_active_color' => 'accent_color',
            'menu_font_size' => 'admin_menu_font_size',
            'menu_font_family' => 'admin_menu_font_family',
            
            // Admin bar settings
            'adminbar_background' => 'admin_bar_bg_color',
            'adminbar_text_color' => 'admin_bar_text_color',
            'adminbar_hover_color' => 'accent_color',
            'adminbar_height' => 'admin_bar_height',
            
            // Content area settings
            'content_background' => 'body_bg_color',
            'content_text_color' => 'body_text_color',
            'content_link_color' => 'accent_color',
            
            // Advanced settings
            'custom_css' => 'custom_css_rules',
            'admin_menu_detached' => 'admin_menu_detached',
            'admin_bar_detached' => 'admin_bar_detached'
        );
        
        $legacy_options = array();
        
        // Map new settings to legacy format
        foreach ($mapping as $new_key => $legacy_key) {
            if (isset($new_settings[$new_key])) {
                $legacy_options[$legacy_key] = $new_settings[$new_key];
            }
        }
        
        // Add any additional legacy settings that might be needed
        $legacy_defaults = array(
            'active_template' => 'default',
            'border_radius' => 0,
            'admin_menu_width' => 220,
            'admin_menu_padding_top_bottom' => 5,
            'admin_menu_padding_left_right' => 10,
            'admin_menu_shadow_type' => 'none',
            'admin_bar_width_type' => 'percentage',
            'admin_bar_width_percentage' => 100,
            'admin_bar_padding_top_bottom' => 0,
            'admin_bar_padding_left_right' => 8,
            'admin_bar_shadow_type' => 'none',
            'body_bg_type' => 'solid',
            'body_font_size' => 13,
            'admin_menu_bg_type' => 'solid',
            'admin_bar_bg_type' => 'solid'
        );
        
        // Merge with defaults for any missing values
        $legacy_options = array_merge($legacy_defaults, $legacy_options);
        
        // Log successful mapping in debug mode
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS CSS Mapping: Successfully mapped ' . count($new_settings) . ' new settings to ' . count($legacy_options) . ' legacy options');
        }
        
        return $legacy_options;
        
    } catch (Exception $e) {
        error_log('LAS CSS Mapping: Error mapping settings: ' . $e->getMessage());
        return array();
    }
}

/**
 * Enhanced CSS caching system for live preview critical repair
 */
function las_fresh_get_cached_css() {
    try {
        // Check if caching is enabled
        if (!las_fresh_is_css_caching_enabled()) {
            return false;
        }
        
        $cache_key = 'las_generated_css_' . LAS_FRESH_VERSION;
        
        // Try WordPress object cache first
        $cached_css = wp_cache_get($cache_key, 'las_css');
        if ($cached_css !== false) {
            return $cached_css;
        }
        
        // Try transient cache as fallback
        $cached_css = get_transient($cache_key);
        if ($cached_css !== false) {
            // Store in object cache for faster access
            wp_cache_set($cache_key, $cached_css, 'las_css', 3600);
            return $cached_css;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('LAS CSS Cache: Error retrieving cached CSS: ' . $e->getMessage());
        return false;
    }
}

/**
 * Cache generated CSS for performance
 */
function las_fresh_cache_css($css_content) {
    try {
        if (!las_fresh_is_css_caching_enabled() || empty($css_content)) {
            return false;
        }
        
        $cache_key = 'las_generated_css_' . LAS_FRESH_VERSION;
        $cache_duration = 3600; // 1 hour
        
        // Store in WordPress object cache
        wp_cache_set($cache_key, $css_content, 'las_css', $cache_duration);
        
        // Store in transient as backup
        set_transient($cache_key, $css_content, $cache_duration);
        
        // Log successful caching in debug mode
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS CSS Cache: Successfully cached ' . strlen($css_content) . ' bytes of CSS');
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log('LAS CSS Cache: Error caching CSS: ' . $e->getMessage());
        return false;
    }
}

/**
 * Clear CSS cache when settings are updated
 */
function las_fresh_clear_css_cache() {
    try {
        $cache_key = 'las_generated_css_' . LAS_FRESH_VERSION;
        
        // Clear from object cache
        wp_cache_delete($cache_key, 'las_css');
        
        // Clear from transients
        delete_transient($cache_key);
        
        // Clear any version-specific caches
        $cache_keys_to_clear = array(
            'las_generated_css_' . LAS_FRESH_VERSION,
            'las_css_output',
            'las_admin_css'
        );
        
        foreach ($cache_keys_to_clear as $key) {
            wp_cache_delete($key, 'las_css');
            delete_transient($key);
        }
        
        // Log cache clearing in debug mode
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('LAS CSS Cache: Successfully cleared CSS cache');
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log('LAS CSS Cache: Error clearing cache: ' . $e->getMessage());
        return false;
    }
}

/**
 * Check if CSS caching is enabled
 */
function las_fresh_is_css_caching_enabled() {
    // Check if caching is explicitly disabled
    if (defined('LAS_DISABLE_CSS_CACHE') && LAS_DISABLE_CSS_CACHE) {
        return false;
    }
    
    // Check user preference if settings storage is available
    if (class_exists('LAS_Settings_Storage')) {
        try {
            $settings_storage = new LAS_Settings_Storage();
            $settings = $settings_storage->load_settings();
            return isset($settings['cache_css']) ? (bool) $settings['cache_css'] : true;
        } catch (Exception $e) {
            error_log('LAS CSS Cache: Error checking cache setting: ' . $e->getMessage());
        }
    }
    
    // Default to enabled
    return true;
}

/**
 * Log CSS performance metrics for optimization
 */
function las_fresh_log_css_performance_metrics($start_time, $start_memory, $start_peak_memory, $css_content, $cache_status = 'generated') {
    try {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }
        
        $end_time = microtime(true);
        $end_memory = memory_get_usage(true);
        $end_peak_memory = memory_get_peak_usage(true);
        
        $metrics = array(
            'execution_time' => round(($end_time - $start_time) * 1000, 2), // milliseconds
            'memory_used' => round(($end_memory - $start_memory) / 1024, 2), // KB
            'peak_memory_increase' => round(($end_peak_memory - $start_peak_memory) / 1024, 2), // KB
            'css_size' => strlen($css_content),
            'cache_status' => $cache_status,
            'timestamp' => current_time('Y-m-d H:i:s')
        );
        
        error_log('LAS CSS Performance: ' . json_encode($metrics));
        
    } catch (Exception $e) {
        error_log('LAS CSS Performance: Error logging metrics: ' . $e->getMessage());
    }
}

/**
 * Validate final CSS value syntax
 */
function las_fresh_is_valid_css_value($value, $property) {
    try {
        if (empty($value) && $value !== '0') {
            return false;
        }
        
        // Check for dangerous content
        $dangerous_patterns = array(
            '/javascript:/i',
            '/expression\s*\(/i',
            '/behavior\s*:/i',
            '/binding\s*:/i',
            '/<script/i',
            '/on\w+\s*=/i'
        );
        
        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return false;
            }
        }
        
        // Basic syntax validation
        $brackets = substr_count($value, '(') - substr_count($value, ')');
        $quotes = (substr_count($value, '"') + substr_count($value, "'")) % 2;
        
        if ($brackets !== 0 || $quotes !== 0) {
            return false;
        }
        
        // Property-specific validation
        switch ($property) {
            case 'color':
            case 'background-color':
            case 'border-color':
                return preg_match('/^(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|\w+|transparent|inherit|initial|unset)$/', $value);
                
            case 'font-size':
                return preg_match('/^\d+(\.\d+)?(px|em|rem|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)$/', $value) || 
                       in_array($value, array('inherit', 'initial', 'unset', 'smaller', 'larger'));
                
            case 'opacity':
                return preg_match('/^(0(\.\d+)?|1(\.0+)?|inherit|initial|unset)$/', $value);
                
            default:
                // For other properties, basic validation passed above is sufficient
                return true;
        }
        
    } catch (Exception $e) {
        error_log('LAS CSS Validation: Error validating CSS value syntax: ' . $e->getMessage());
        return false;
    }
}

/**
 * Generates the CSS output for styling the admin panel based on plugin options.
 * Updated for Live Preview Critical Repair with new settings structure integration.
 */
/**
 * Get fallback default options when main plugin functions aren't available
 * 
 * @return array Default options
 */
/**
 * Fallback for is_admin_bar_showing() when not in WordPress context
 * 
 * @return bool
 */
function las_fresh_is_admin_bar_showing_fallback() {
    if (function_exists('is_admin_bar_showing')) {
        return is_admin_bar_showing();
    }
    
    // Fallback - assume admin bar is showing in admin context
    return defined('WP_ADMIN') && WP_ADMIN;
}

function las_fresh_get_fallback_default_options() {
    return array(
        'active_template' => 'default',
        'border_radius' => 0,
        'admin_menu_detached' => false,
        'admin_menu_margin_top' => 10,
        'admin_menu_margin_left' => 10,
        'admin_menu_margin_bottom' => 10,
        'admin_bar_detached' => false,
        'admin_bar_margin_top' => 10,
        'admin_bar_margin_left' => 10,
        'admin_bar_margin_right' => 10,
        'admin_menu_bg_type' => 'solid',
        'admin_menu_bg_color' => '#23282d',
        'admin_menu_bg_gradient_color1' => '#23282d',
        'admin_menu_bg_gradient_color2' => '#191e23',
        'admin_menu_bg_gradient_direction' => 'to bottom',
        'admin_submenu_bg_color' => '#2c3338',
        'admin_menu_text_color' => '#f0f0f1',
        'admin_menu_font_family' => 'default',
        'admin_menu_google_font' => '',
        'admin_menu_font_size' => 14,
        'admin_submenu_text_color' => '#f0f0f1',
        'admin_submenu_font_family' => 'default',
        'admin_submenu_google_font' => '',
        'admin_submenu_font_size' => 13,
        'accent_color' => '#007cba',
        'admin_menu_width' => 220,
        'admin_menu_padding_top_bottom' => 5,
        'admin_menu_padding_left_right' => 10,
        'admin_menu_shadow_type' => 'none',
        'admin_menu_shadow_simple' => '2px 0 10px rgba(0,0,0,0.15)',
        'admin_menu_shadow_advanced_color' => 'rgba(0,0,0,0.15)',
        'admin_menu_shadow_advanced_offset_x' => 2,
        'admin_menu_shadow_advanced_offset_y' => 0,
        'admin_menu_shadow_advanced_blur' => 10,
        'admin_menu_shadow_advanced_spread' => 0,
        'admin_bar_bg_type' => 'solid',
        'admin_bar_bg_color' => '#1d2327',
        'admin_bar_bg_gradient_color1' => '#1d2327',
        'admin_bar_bg_gradient_color2' => '#23282d',
        'admin_bar_bg_gradient_direction' => 'to bottom',
        'admin_bar_text_color' => '#f0f0f1',
        'admin_bar_font_family' => 'default',
        'admin_bar_google_font' => '',
        'admin_bar_font_size' => 13,
        'admin_bar_height' => 32,
        'admin_bar_width_type' => 'percentage',
        'admin_bar_width_percentage' => 100,
        'admin_bar_width_px' => 1200,
        'admin_bar_padding_top_bottom' => 0,
        'admin_bar_padding_left_right' => 8,
        'admin_bar_shadow_type' => 'none',
        'admin_bar_shadow_simple' => '0 2px 5px rgba(0,0,0,0.1)',
        'admin_bar_shadow_advanced_color' => 'rgba(0,0,0,0.1)',
        'admin_bar_shadow_advanced_offset_x' => 0,
        'admin_bar_shadow_advanced_offset_y' => 2,
        'admin_bar_shadow_advanced_blur' => 5,
        'admin_bar_shadow_advanced_spread' => 0,
        'body_bg_type' => 'solid',
        'body_bg_color' => '#f0f1f2',
        'body_bg_gradient_color1' => '#f0f1f2',
        'body_bg_gradient_color2' => '#e9eaeb',
        'body_bg_gradient_direction' => 'to bottom',
        'body_text_color' => '#3c434a',
        'body_font_family' => 'default',
        'body_google_font' => '',
        'body_font_size' => 13,
        'admin_menu_logo' => '',
        'admin_menu_logo_height' => 50,
        'login_logo' => '',
        'footer_text' => '',
        'custom_css_rules' => '',
        'admin_bar_border_radius_type' => 'all', 
        'admin_bar_border_radius_all' => 0,
        'admin_bar_border_radius_tl' => 0,
        'admin_bar_border_radius_tr' => 0,
        'admin_bar_border_radius_br' => 0,
        'admin_bar_border_radius_bl' => 0,
        'admin_menu_border_radius_type' => 'all', 
        'admin_menu_border_radius_all' => 0,
        'admin_menu_border_radius_tl' => 0,
        'admin_menu_border_radius_tr' => 0,
        'admin_menu_border_radius_br' => 0,
        'admin_menu_border_radius_bl' => 0,
    );
}

function las_fresh_generate_admin_css_output($preview_options = null) {
    // Start performance monitoring
    $performance_start = microtime(true);
    $memory_start = memory_get_usage(true);
    $peak_memory_start = memory_get_peak_usage(true);
    
    try {
        // Enhanced input validation with fallback handling
        if ($preview_options !== null && !is_array($preview_options)) {
            error_log('LAS CSS Generation: Invalid preview_options provided, expected array or null, got: ' . gettype($preview_options));
            $preview_options = null;
        }
        
        // Check cache for non-preview requests
        if ($preview_options === null) {
            $cached_css = las_fresh_get_cached_css();
            if ($cached_css !== false) {
                // Log cache hit performance
                las_fresh_log_css_performance_metrics($performance_start, $memory_start, $peak_memory_start, $cached_css, 'cache_hit');
                return $cached_css;
            }
        }
        
        // Get options with error handling - integrate with new settings storage
        try {
            if ($preview_options !== null && is_array($preview_options)) {
                $options = $preview_options;
            } else {
                // Try to use new settings storage system if available
                if (class_exists('LAS_Settings_Storage')) {
                    $settings_storage = new LAS_Settings_Storage();
                    $new_settings = $settings_storage->load_settings();
                    
                    // Map new settings structure to legacy format for compatibility
                    $options = las_fresh_map_new_settings_to_legacy($new_settings);
                } else {
                    // Fallback to legacy options system
                    if (function_exists('las_fresh_get_options')) {
                        $options = las_fresh_get_options();
                    } else {
                        // Ultimate fallback - use WordPress get_option directly
                        $option_name = defined('LAS_FRESH_OPTION_NAME') ? LAS_FRESH_OPTION_NAME : 'las_fresh_options';
                        $saved_options = get_option($option_name, array());
                        $defaults = las_fresh_get_fallback_default_options();
                        $options = array_merge($defaults, (array) $saved_options);
                    }
                }
            }
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error getting options: ' . $e->getMessage());
            $options = array(); // Fallback to empty array
        }
        
        // Validate options is an array
        if (!is_array($options)) {
            error_log('LAS CSS Generation: Options is not an array, using empty array as fallback');
            $options = array();
        }
        
        $version = defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : '1.2.0';
        $css_output = "/* Live Admin Styler CSS v" . $version . " (Live Preview Critical Repair) */\n";
        $css_output .= "/* Generated: " . (function_exists('current_time') ? current_time('Y-m-d H:i:s') : date('Y-m-d H:i:s')) . " */\n\n";
        
        // Get defaults with error handling and fallback
        try {
            if (function_exists('las_fresh_get_default_options')) {
                $defaults = las_fresh_get_default_options();
            } else {
                // Fallback default options for when main plugin functions aren't available
                $defaults = las_fresh_get_fallback_default_options();
            }
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error getting default options: ' . $e->getMessage());
            $defaults = las_fresh_get_fallback_default_options(); // Fallback to internal defaults
        }
        
        // Validate defaults is an array
        if (!is_array($defaults)) {
            error_log('LAS CSS Generation: Defaults is not an array, using fallback defaults');
            $defaults = las_fresh_get_fallback_default_options();
        }
        
        $add_css = function ($selector, $property, $value_or_option_key, $important = true, $unit = '') use (&$css_output, $defaults, $options, $preview_options) {
        try {
            // Enhanced input validation with comprehensive fallback handling
            $validated_selector = las_fresh_validate_selector($selector);
            if (empty($validated_selector)) {
                error_log('LAS CSS Generation: Invalid or empty selector after validation: ' . var_export($selector, true));
                return;
            }
            
            $validated_property = las_fresh_validate_property($property);
            if (empty($validated_property)) {
                error_log('LAS CSS Generation: Invalid or empty property after validation: ' . var_export($property, true));
                return;
            }
            
            $selector = $validated_selector;
            $property = $validated_property;
            
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

        // Enhanced CSS value processing with comprehensive validation and fallbacks
        try {
            $css_value_string = '';
            
            if (is_numeric($actual_value)) {
                // Enhanced numeric validation with range checking
                if (!is_finite($actual_value)) {
                    error_log('LAS CSS Generation: Invalid numeric value (infinite/NaN): ' . var_export($actual_value, true));
                    return;
                }
                
                // Apply property-specific numeric validation
                if (in_array($property, ['opacity', 'z-index'])) {
                    if ($property === 'opacity') {
                        $css_value_string = las_fresh_validate_numeric($actual_value, '', 0, 1, 1);
                    } else { // z-index
                        $css_value_string = las_fresh_validate_numeric($actual_value, '', -2147483648, 2147483647, 0);
                    }
                } elseif (strpos($property, 'width') !== false || strpos($property, 'height') !== false || 
                         strpos($property, 'margin') !== false || strpos($property, 'padding') !== false ||
                         strpos($property, 'border') !== false || strpos($property, 'radius') !== false) {
                    // Dimension properties - prevent negative values for most cases
                    $min_value = (strpos($property, 'margin') !== false) ? null : 0; // margins can be negative
                    $css_value_string = las_fresh_validate_numeric($actual_value, $unit, $min_value, 10000, 0);
                } elseif (strpos($property, 'font-size') !== false) {
                    // Font size validation
                    $css_value_string = las_fresh_validate_numeric($actual_value, $unit, 1, 200, 14);
                } else {
                    $css_value_string = las_fresh_validate_numeric($actual_value, $unit);
                }
                
            } elseif (is_string($actual_value)) {
                $trimmed_value = trim($actual_value);
                
                // Enhanced validation for empty values
                if ($trimmed_value === '' && !in_array($property, ['content', 'background-image', 'box-shadow', 'border'])) {
                    return; // Don't output empty rules for most properties
                }
                
                // Property-specific validation and processing
                if ($property === 'background-image') {
                    if (strtolower($trimmed_value) === 'none' || $trimmed_value === '') {
                        $css_value_string = 'none';
                    } elseif (strpos($trimmed_value, 'linear-gradient') !== false || 
                             strpos($trimmed_value, 'radial-gradient') !== false ||
                             strpos($trimmed_value, 'conic-gradient') !== false) {
                        // Validate gradient syntax
                        if (preg_match('/^(linear|radial|conic)-gradient\s*\([^)]+\)$/', $trimmed_value)) {
                            $css_value_string = $trimmed_value;
                        } else {
                            error_log('LAS CSS Generation: Invalid gradient syntax: ' . $trimmed_value);
                            $css_value_string = 'none';
                        }
                    } elseif (strpos($trimmed_value, 'url(') !== false) {
                        // Validate URL syntax
                        if (preg_match('/^url\s*\(\s*["\']?[^"\'()]+["\']?\s*\)$/', $trimmed_value)) {
                            $css_value_string = esc_attr($trimmed_value);
                        } else {
                            error_log('LAS CSS Generation: Invalid URL syntax: ' . $trimmed_value);
                            $css_value_string = 'none';
                        }
                    } else {
                        // Use enhanced CSS value validation
                        $validated_value = las_fresh_validate_css_value($trimmed_value, $property, $trimmed_value);
                        $css_value_string = esc_attr($validated_value) . $unit;
                    }
                    
                } elseif ($property === 'box-shadow') {
                    if (strtolower($trimmed_value) === 'none' || $trimmed_value === '') {
                        $css_value_string = 'none';
                    } else {
                        // Basic box-shadow validation
                        if (preg_match('/^(\d+px\s+){2,4}(rgba?\([^)]+\)|#[a-fA-F0-9]{3,6}|\w+)(\s+inset)?$/', $trimmed_value) ||
                            preg_match('/^inset\s+(\d+px\s+){2,4}(rgba?\([^)]+\)|#[a-fA-F0-9]{3,6}|\w+)$/', $trimmed_value)) {
                            $css_value_string = esc_attr($trimmed_value);
                        } else {
                            error_log('LAS CSS Generation: Invalid box-shadow syntax: ' . $trimmed_value);
                            $css_value_string = 'none';
                        }
                    }
                    
                } elseif ($property === 'color' || strpos($property, 'color') !== false) {
                    // Enhanced color validation using the new validation function
                    $css_value_string = las_fresh_validate_color($trimmed_value, 'inherit');
                    
                } elseif ($property === 'font-family') {
                    // Font family validation
                    if (strlen($trimmed_value) > 200) {
                        error_log('LAS CSS Generation: Font family name too long: ' . substr($trimmed_value, 0, 50) . '...');
                        return;
                    }
                    // Remove potentially dangerous characters but preserve quotes and commas
                    $safe_font = preg_replace('/[^a-zA-Z0-9\s\-\'",.]/', '', $trimmed_value);
                    if (!empty($safe_font)) {
                        $css_value_string = $safe_font;
                    } else {
                        error_log('LAS CSS Generation: Font family became empty after sanitization: ' . $trimmed_value);
                        return;
                    }
                    
                } elseif (in_array($property, ['display', 'position', 'overflow', 'visibility', 'float', 'clear'])) {
                    // Validate CSS keyword properties
                    $valid_keywords = array(
                        'display' => ['none', 'block', 'inline', 'inline-block', 'flex', 'grid', 'table', 'table-cell', 'table-row', 'inherit', 'initial', 'unset'],
                        'position' => ['static', 'relative', 'absolute', 'fixed', 'sticky', 'inherit', 'initial', 'unset'],
                        'overflow' => ['visible', 'hidden', 'scroll', 'auto', 'inherit', 'initial', 'unset'],
                        'visibility' => ['visible', 'hidden', 'collapse', 'inherit', 'initial', 'unset'],
                        'float' => ['none', 'left', 'right', 'inherit', 'initial', 'unset'],
                        'clear' => ['none', 'left', 'right', 'both', 'inherit', 'initial', 'unset']
                    );
                    
                    if (isset($valid_keywords[$property]) && in_array(strtolower($trimmed_value), $valid_keywords[$property])) {
                        $css_value_string = strtolower($trimmed_value);
                    } else {
                        error_log('LAS CSS Generation: Invalid keyword for ' . $property . ': ' . $trimmed_value);
                        return;
                    }
                    
                } else {
                    // General string value processing with enhanced sanitization
                    $sanitized_value = esc_attr($trimmed_value);
                    if (strlen($sanitized_value) > 1000) {
                        error_log('LAS CSS Generation: CSS value too long, truncating: ' . substr($sanitized_value, 0, 50) . '...');
                        $sanitized_value = substr($sanitized_value, 0, 1000);
                    }
                    $css_value_string = $sanitized_value . $unit;
                }
                
            } else {
                error_log('LAS CSS Generation: Unsupported value type for property ' . $property . ': ' . gettype($actual_value));
                return;
            }
            
            // Final validation of CSS value string with fallback mechanisms
            if (empty($css_value_string) && $css_value_string !== '0') {
                // Apply property-specific fallbacks
                $css_value_string = las_fresh_get_property_fallback($property, $actual_value);
                if (empty($css_value_string)) {
                    return; // Skip if no valid fallback available
                }
            }
            
            // Additional syntax validation for the complete CSS value
            if (strlen($css_value_string) > 2000) {
                error_log('LAS CSS Generation: CSS value string too long, truncating: ' . substr($css_value_string, 0, 50) . '...');
                $css_value_string = substr($css_value_string, 0, 2000);
            }
            
            // Final CSS syntax validation
            if (!las_fresh_is_valid_css_value($css_value_string, $property)) {
                error_log('LAS CSS Generation: Invalid CSS syntax detected, applying fallback for ' . $property . ': ' . $css_value_string);
                $css_value_string = las_fresh_get_property_fallback($property, $actual_value);
                if (empty($css_value_string)) {
                    return; // Skip if fallback also fails
                }
            }
            
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error preparing CSS value string for ' . $property . ': ' . $e->getMessage());
            return;
        }
        
        if ($css_value_string === 'px' && $unit === 'px' && $actual_value === 0) { // Avoid "0pxpx"
            $css_value_string = '0px';
        }


        // Enhanced specificity management with comprehensive validation and fallbacks
        try {
            $selectors_array = explode(',', $selector);
            $specific_selectors = array();
            
            foreach ($selectors_array as $sel) {
                try {
                    $trimmed_sel = trim($sel);
                    if (empty($trimmed_sel)) {
                        continue;
                    }
                    
                    // Validate individual selector
                    $validated_sel = las_fresh_validate_selector($trimmed_sel);
                    if (empty($validated_sel)) {
                        error_log('LAS CSS Generation: Invalid selector in list: ' . $trimmed_sel);
                        continue;
                    }
                    
                    // Enhanced specificity management for WordPress admin
                    $enhanced_selector = las_fresh_enhance_selector_specificity($validated_sel);
                    if (!empty($enhanced_selector)) {
                        $specific_selectors[] = $enhanced_selector;
                    }
                    
                } catch (Exception $e) {
                    error_log('LAS CSS Generation: Error processing individual selector: ' . $sel . ' - ' . $e->getMessage());
                    continue; // Skip this selector and continue with others
                }
            }
            
            if (empty($specific_selectors)) {
                error_log('LAS CSS Generation: No valid selectors found after processing selector list: ' . $selector);
                return;
            }
            
            $final_selector = implode(', ', $specific_selectors);
            if (empty($final_selector)) {
                error_log('LAS CSS Generation: Final selector is empty after joining');
                return;
            }
            
            // Validate final selector length
            if (strlen($final_selector) > 5000) {
                error_log('LAS CSS Generation: Final selector too long, truncating: ' . substr($final_selector, 0, 100) . '...');
                $final_selector = substr($final_selector, 0, 5000);
            }
            
            // Enhanced CSS rule construction with validation
            $important_suffix = $important ? ' !important' : '';
            
            // Validate the complete CSS rule syntax
            $css_rule = $final_selector . ' { ' . $property . ': ' . $css_value_string . $important_suffix . "; }\n";
            
            // Comprehensive CSS rule validation
            if (strlen($css_rule) > 10000) {
                error_log('LAS CSS Generation: CSS rule too long, skipping: ' . substr($css_rule, 0, 100) . '...');
                return;
            }
            
            // Basic CSS syntax validation
            if (substr_count($css_rule, '{') !== substr_count($css_rule, '}')) {
                error_log('LAS CSS Generation: Unbalanced braces in CSS rule: ' . substr($css_rule, 0, 100));
                return;
            }
            
            // Check for potential CSS injection patterns
            if (preg_match('/[<>]|javascript:|expression\s*\(|@import|@charset/i', $css_rule)) {
                error_log('LAS CSS Generation: Potential CSS injection detected, skipping rule: ' . substr($css_rule, 0, 100));
                return;
            }
            
            $css_output .= $css_rule;
            
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in selector processing and CSS output for property ' . $property . ': ' . $e->getMessage());
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
            if (empty($trimmed_block)) {
                return;
            }
            
            // Comprehensive CSS syntax validation
            $open_braces = substr_count($trimmed_block, '{');
            $close_braces = substr_count($trimmed_block, '}');
            
            if ($open_braces !== $close_braces) {
                error_log('LAS CSS Generation: Unbalanced braces in raw CSS block: ' . substr($trimmed_block, 0, 100));
                return;
            }
            
            // Check for potential CSS injection patterns
            if (preg_match('/[<>]|javascript:|expression\s*\(|@import|@charset|<script|<\/script/i', $trimmed_block)) {
                error_log('LAS CSS Generation: Potential CSS injection detected in raw block: ' . substr($trimmed_block, 0, 100));
                return;
            }
            
            // Validate CSS block length with more reasonable limits
            if (strlen($trimmed_block) > 20000) {
                error_log('LAS CSS Generation: Raw CSS block too long (' . strlen($trimmed_block) . ' chars), truncating: ' . substr($trimmed_block, 0, 100) . '...');
                $trimmed_block = substr($trimmed_block, 0, 20000) . "\n/* ... CSS block truncated due to length ... */";
            }
            
            // Basic selector validation for raw blocks
            if (preg_match_all('/([^{]+)\s*{/', $trimmed_block, $matches)) {
                foreach ($matches[1] as $selector) {
                    $clean_selector = las_fresh_validate_selector(trim($selector));
                    if (empty($clean_selector)) {
                        error_log('LAS CSS Generation: Invalid selector in raw CSS block: ' . trim($selector));
                        // Don't return here, just log the issue and continue
                    }
                }
            }
            
            // Sanitize the CSS block while preserving valid CSS syntax
            $sanitized_block = preg_replace('/\/\*.*?\*\//s', '', $trimmed_block); // Remove comments for validation
            $sanitized_block = preg_replace('/\s+/', ' ', $sanitized_block); // Normalize whitespace
            
            // Final validation - ensure we still have valid CSS structure
            if (empty(trim($sanitized_block))) {
                error_log('LAS CSS Generation: Raw CSS block became empty after sanitization');
                return;
            }
            
            $css_output .= $trimmed_block . "\n";
            
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in add_raw function: ' . $e->getMessage());
        }
    };

    $get_ff_val = function ($font_key, $google_key) use ($options, $defaults) {
        try {
            // Enhanced input validation with comprehensive fallbacks
            if (!is_string($font_key) || !is_string($google_key)) {
                error_log('LAS CSS Generation: Invalid font key parameters: ' . var_export(array($font_key, $google_key), true));
                return '';
            }
            
            // Get font family with enhanced error handling
            $fam = '';
            if (isset($options[$font_key]) && is_string($options[$font_key]) && !empty(trim($options[$font_key]))) {
                $fam = trim($options[$font_key]);
            } elseif (isset($defaults[$font_key]) && is_string($defaults[$font_key]) && !empty(trim($defaults[$font_key]))) {
                $fam = trim($defaults[$font_key]);
            } else {
                return ''; // No font family specified
            }
            
            // Validate font family value
            if (strlen($fam) > 200) {
                error_log('LAS CSS Generation: Font family key value too long: ' . substr($fam, 0, 50) . '...');
                return '';
            }
            
            // Get Google font with enhanced error handling
            $gfont = '';
            if (isset($options[$google_key]) && is_string($options[$google_key])) {
                $gfont = trim($options[$google_key]);
            }
            
            // Handle Google font selection with comprehensive validation
            if ($fam === 'google' && !empty($gfont)) {
                try {
                    // Validate Google font string format
                    if (strlen($gfont) > 300) {
                        error_log('LAS CSS Generation: Google font string too long: ' . substr($gfont, 0, 50) . '...');
                        return '';
                    }
                    
                    $parts = explode(':', $gfont);
                    if (is_array($parts) && count($parts) > 0) {
                        $name = sanitize_text_field(trim($parts[0]));
                        
                        // Enhanced font name validation
                        if (empty($name)) {
                            error_log('LAS CSS Generation: Empty Google font name after sanitization');
                            return '';
                        }
                        
                        if (strlen($name) > 100) {
                            error_log('LAS CSS Generation: Google font name too long: ' . $name);
                            return '';
                        }
                        
                        // Validate font name characters
                        if (!preg_match('/^[a-zA-Z0-9\s\-_]+$/', $name)) {
                            error_log('LAS CSS Generation: Invalid characters in Google font name: ' . $name);
                            return '';
                        }
                        
                        // Return properly formatted font family with fallback
                        return "'" . esc_attr($name) . "', sans-serif";
                        
                    } else {
                        error_log('LAS CSS Generation: Invalid Google font format: ' . $gfont);
                    }
                } catch (Exception $e) {
                    error_log('LAS CSS Generation: Error processing Google font: ' . $e->getMessage());
                }
            }
            
            // Handle custom font family with comprehensive validation
            if ($fam !== 'default' && $fam !== 'google' && !empty($fam)) {
                // Enhanced sanitization for font family names
                $safe_fam = preg_replace('/[^a-zA-Z0-9\s\-\'",.]/', '', $fam);
                
                if (empty($safe_fam)) {
                    error_log('LAS CSS Generation: Font family became empty after sanitization: ' . $fam);
                    return '';
                }
                
                if (strlen($safe_fam) > 200) {
                    error_log('LAS CSS Generation: Custom font family too long after sanitization: ' . substr($safe_fam, 0, 50) . '...');
                    return '';
                }
                
                // Additional validation for font family format
                if (preg_match('/^[a-zA-Z0-9\s\-\'",.\(\)]+$/', $safe_fam)) {
                    return $safe_fam;
                } else {
                    error_log('LAS CSS Generation: Invalid custom font family format: ' . $safe_fam);
                    return '';
                }
            }
            
            return ''; // Fallback to empty string for default or unrecognized values
            
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
        $admin_bar_current_height = las_fresh_is_admin_bar_showing_fallback() ? (int)$options['admin_bar_height'] : 0;
        $admin_bar_current_margin_top = ($options['admin_bar_detached'] && las_fresh_is_admin_bar_showing_fallback()) ? (int)$options['admin_bar_margin_top'] : 0;
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
        $admin_bar_current_height_for_menu_top = las_fresh_is_admin_bar_showing_fallback() ? ((int)$options['admin_bar_height'] . 'px') : '0px';
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

        // Comprehensive CSS output validation and finalization
        try {
            // Validate final CSS output type
            if (!is_string($css_output)) {
                error_log('LAS CSS Generation: CSS output is not a string: ' . gettype($css_output));
                $css_output = "/* LAS CSS Generation Error: Invalid output type */\n";
            }
            
            // Check for extremely large CSS output that might cause memory issues
            $css_length = strlen($css_output);
            if ($css_length > 500000) { // 500KB limit (reduced from 1MB for better performance)
                error_log('LAS CSS Generation: CSS output is very large (' . $css_length . ' bytes), truncating for performance');
                $css_output = substr($css_output, 0, 500000) . "\n/* ... CSS truncated due to size limit for performance ... */\n";
            }
            
            // Comprehensive CSS syntax validation
            $open_braces = substr_count($css_output, '{');
            $close_braces = substr_count($css_output, '}');
            
            if ($open_braces !== $close_braces) {
                error_log('LAS CSS Generation: Final CSS has unbalanced braces (open: ' . $open_braces . ', close: ' . $close_braces . ')');
                // Try to fix by adding missing closing braces
                if ($open_braces > $close_braces) {
                    $missing_braces = $open_braces - $close_braces;
                    $css_output .= str_repeat("\n}", $missing_braces) . "\n/* Auto-fixed missing closing braces */\n";
                }
            }
            
            // Check for potential CSS injection in final output
            if (preg_match('/[<>]|javascript:|expression\s*\(|<script|<\/script/i', $css_output)) {
                error_log('LAS CSS Generation: Potential CSS injection detected in final output, sanitizing');
                $css_output = preg_replace('/[<>]|javascript:|expression\s*\(|<script.*?<\/script>/i', '', $css_output);
                $css_output .= "\n/* CSS sanitized for security */\n";
            }
            
            // Validate CSS contains only printable characters and common CSS symbols
            if (preg_match('/[^\x20-\x7E\r\n\t]/', $css_output)) {
                error_log('LAS CSS Generation: Non-printable characters detected in CSS output');
                $css_output = preg_replace('/[^\x20-\x7E\r\n\t]/', '', $css_output);
                $css_output .= "\n/* Non-printable characters removed */\n";
            }
            
            // Performance metrics logging
            if ($css_length > 100000) {
                error_log('LAS CSS Generation: Large CSS output generated (' . $css_length . ' bytes) - consider optimization');
            }
            
            // In preview mode, always return CSS even if it's just the header comment
            if ($preview_options !== null) {
                // Log performance metrics for preview mode
                las_fresh_log_css_performance_metrics($performance_start, $memory_start, $peak_memory_start, $css_output, 'preview');
                return $css_output;
            }
            
            // In normal mode, return empty string if only header comment
            try {
                $comment_pattern = "/^\/\* Live Admin Styler CSS v" . preg_quote(LAS_FRESH_VERSION, '/') . " \(Specificity Enhanced v[0-9]\) \*\/\s*$/";
                if (preg_match($comment_pattern, trim($css_output))) {
                    return '';
                }
            } catch (Exception $e) {
                error_log('LAS CSS Generation: Error in comment pattern matching: ' . $e->getMessage());
                // Continue with returning the CSS output
            }
            
            // Final validation - ensure we're returning valid CSS
            if (empty(trim($css_output))) {
                return '';
            }
            
            // Cache the CSS output for future requests
            las_fresh_cache_css($css_output);
            
            // Log performance metrics for normal mode
            las_fresh_log_css_performance_metrics($performance_start, $memory_start, $peak_memory_start, $css_output, 'normal');
            return $css_output;
            
        } catch (Exception $e) {
            error_log('LAS CSS Generation: Error in final CSS validation: ' . $e->getMessage());
            las_fresh_log_css_performance_metrics($performance_start, $memory_start, $peak_memory_start, '', 'error');
            return "/* LAS CSS Generation Error in final validation: " . esc_html($e->getMessage()) . " */\n";
        }
        
    } catch (Exception $e) {
        error_log('LAS CSS Generation: Critical error in CSS generation function: ' . $e->getMessage());
        las_fresh_log_css_performance_metrics($performance_start, $memory_start, $peak_memory_start, '', 'critical_error');
        return "/* LAS CSS Generation Critical Error: " . esc_html($e->getMessage()) . " */\n";
    }
}



/**
 * Cache CSS output for future requests
 */




/**
 * Get cache statistics
 */
function las_fresh_get_cache_stats() {
    try {
        $cache_data = get_option('las_fresh_css_cache', false);
        
        if (!$cache_data || !is_array($cache_data)) {
            return array(
                'status' => 'empty',
                'message' => 'No cache data available'
            );
        }
        
        $current_time = current_time('timestamp');
        $is_expired = $current_time > ($cache_data['expiry'] ?? 0);
        
        return array(
            'status' => $is_expired ? 'expired' : 'valid',
            'created' => $cache_data['created'] ?? 0,
            'created_formatted' => isset($cache_data['created']) ? date('Y-m-d H:i:s', $cache_data['created']) : 'Unknown',
            'expiry' => $cache_data['expiry'] ?? 0,
            'expiry_formatted' => isset($cache_data['expiry']) ? date('Y-m-d H:i:s', $cache_data['expiry']) : 'Unknown',
            'size_bytes' => $cache_data['size'] ?? 0,
            'size_formatted' => isset($cache_data['size']) ? size_format($cache_data['size']) : 'Unknown',
            'options_hash' => $cache_data['options_hash'] ?? '',
            'time_remaining' => max(0, ($cache_data['expiry'] ?? 0) - $current_time),
            'time_remaining_formatted' => las_fresh_format_time_remaining(max(0, ($cache_data['expiry'] ?? 0) - $current_time))
        );
        
    } catch (Exception $e) {
        error_log('LAS CSS Cache: Error getting cache stats: ' . $e->getMessage());
        return array(
            'status' => 'error',
            'message' => $e->getMessage()
        );
    }
}

/**
 * Format time remaining in human readable format
 */
function las_fresh_format_time_remaining($seconds) {
    if ($seconds <= 0) {
        return 'Expired';
    }
    
    if ($seconds < 60) {
        return $seconds . ' seconds';
    } elseif ($seconds < 3600) {
        return round($seconds / 60) . ' minutes';
    } else {
        return round($seconds / 3600, 1) . ' hours';
    }
}



/**
 * Store performance metrics for analysis and reporting
 */
function las_fresh_store_performance_metrics($operation_type, $metrics) {
    try {
        // Get existing metrics
        $stored_metrics = get_option('las_fresh_performance_metrics', array());
        
        if (!is_array($stored_metrics)) {
            $stored_metrics = array();
        }
        
        // Initialize operation type array if not exists
        if (!isset($stored_metrics[$operation_type])) {
            $stored_metrics[$operation_type] = array();
        }
        
        // Add current metrics
        $stored_metrics[$operation_type][] = $metrics;
        
        // Keep only last 100 entries per operation type to prevent database bloat
        if (count($stored_metrics[$operation_type]) > 100) {
            $stored_metrics[$operation_type] = array_slice($stored_metrics[$operation_type], -100);
        }
        
        // Update option
        update_option('las_fresh_performance_metrics', $stored_metrics, false);
        
        return true;
        
    } catch (Exception $e) {
        error_log('LAS Performance Storage: Error storing metrics: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get performance metrics for reporting
 */
function las_fresh_get_performance_metrics($operation_type = null, $limit = 50) {
    try {
        $stored_metrics = get_option('las_fresh_performance_metrics', array());
        
        if (!is_array($stored_metrics)) {
            return array();
        }
        
        if ($operation_type) {
            $metrics = isset($stored_metrics[$operation_type]) ? $stored_metrics[$operation_type] : array();
            return array_slice($metrics, -$limit);
        }
        
        return $stored_metrics;
        
    } catch (Exception $e) {
        error_log('LAS Performance Retrieval: Error getting metrics: ' . $e->getMessage());
        return array();
    }
}

/**
 * Generate performance report
 */
function las_fresh_generate_performance_report($operation_type = null, $days = 7) {
    try {
        $metrics = las_fresh_get_performance_metrics($operation_type);
        $cutoff_time = current_time('timestamp') - ($days * 24 * 60 * 60);
        
        $report = array(
            'operation_type' => $operation_type ?: 'all',
            'period_days' => $days,
            'total_operations' => 0,
            'avg_execution_time_ms' => 0,
            'max_execution_time_ms' => 0,
            'min_execution_time_ms' => PHP_INT_MAX,
            'avg_memory_usage_bytes' => 0,
            'max_memory_usage_bytes' => 0,
            'avg_css_size_bytes' => 0,
            'max_css_size_bytes' => 0,
            'slow_operations_count' => 0,
            'high_memory_operations_count' => 0,
            'operations_by_mode' => array(),
            'recommendations' => array()
        );
        
        if ($operation_type) {
            $operation_metrics = isset($metrics[$operation_type]) ? $metrics[$operation_type] : array();
        } else {
            $operation_metrics = array();
            foreach ($metrics as $type => $type_metrics) {
                $operation_metrics = array_merge($operation_metrics, $type_metrics);
            }
        }
        
        // Filter by time period
        $recent_metrics = array_filter($operation_metrics, function($metric) use ($cutoff_time) {
            return isset($metric['timestamp']) && $metric['timestamp'] >= $cutoff_time;
        });
        
        if (empty($recent_metrics)) {
            return $report;
        }
        
        $report['total_operations'] = count($recent_metrics);
        
        $total_execution_time = 0;
        $total_memory_usage = 0;
        $total_css_size = 0;
        
        foreach ($recent_metrics as $metric) {
            // Execution time stats
            $exec_time = $metric['execution_time_ms'] ?? 0;
            $total_execution_time += $exec_time;
            $report['max_execution_time_ms'] = max($report['max_execution_time_ms'], $exec_time);
            $report['min_execution_time_ms'] = min($report['min_execution_time_ms'], $exec_time);
            
            if ($exec_time > 500) {
                $report['slow_operations_count']++;
            }
            
            // Memory stats
            $memory_usage = $metric['memory_used_bytes'] ?? 0;
            $total_memory_usage += $memory_usage;
            $report['max_memory_usage_bytes'] = max($report['max_memory_usage_bytes'], $memory_usage);
            
            if ($memory_usage > 10 * 1024 * 1024) { // 10MB
                $report['high_memory_operations_count']++;
            }
            
            // CSS size stats
            $css_size = $metric['css_size_bytes'] ?? 0;
            $total_css_size += $css_size;
            $report['max_css_size_bytes'] = max($report['max_css_size_bytes'], $css_size);
            
            // Mode statistics
            $mode = $metric['mode'] ?? 'unknown';
            if (!isset($report['operations_by_mode'][$mode])) {
                $report['operations_by_mode'][$mode] = 0;
            }
            $report['operations_by_mode'][$mode]++;
        }
        
        // Calculate averages
        $report['avg_execution_time_ms'] = round($total_execution_time / $report['total_operations'], 2);
        $report['avg_memory_usage_bytes'] = round($total_memory_usage / $report['total_operations']);
        $report['avg_css_size_bytes'] = round($total_css_size / $report['total_operations']);
        
        // Fix min value if no operations
        if ($report['min_execution_time_ms'] === PHP_INT_MAX) {
            $report['min_execution_time_ms'] = 0;
        }
        
        // Generate recommendations
        if ($report['avg_execution_time_ms'] > 300) {
            $report['recommendations'][] = 'Consider implementing CSS caching to improve performance';
        }
        
        if ($report['slow_operations_count'] > $report['total_operations'] * 0.1) {
            $report['recommendations'][] = 'High number of slow operations detected - review CSS generation logic';
        }
        
        if ($report['high_memory_operations_count'] > 0) {
            $report['recommendations'][] = 'Memory usage optimization needed - consider reducing CSS complexity';
        }
        
        if ($report['max_css_size_bytes'] > 100 * 1024) { // 100KB
            $report['recommendations'][] = 'Large CSS output detected - consider CSS minification';
        }
        
        return $report;
        
    } catch (Exception $e) {
        error_log('LAS Performance Report: Error generating report: ' . $e->getMessage());
        return array('error' => $e->getMessage());
    }
}

function las_fresh_generate_login_css_rules() {
    try {
        // Get options with comprehensive error handling
        try {
            $options = las_fresh_get_options();
        } catch (Exception $e) {
            error_log('LAS Login CSS: Error getting options: ' . $e->getMessage());
            return '';
        }
        
        // Enhanced options validation
        if (!is_array($options)) {
            error_log('LAS Login CSS: Options is not an array, got: ' . gettype($options));
            return '';
        }
        
        $login_logo_url = isset($options['login_logo']) && is_string($options['login_logo']) ? trim($options['login_logo']) : '';
        $css = '';
        
        // Comprehensive validation for login logo URL
        if (!empty($login_logo_url)) {
            // Enhanced URL validation with security checks
            if (strlen($login_logo_url) > 2000) {
                error_log('LAS Login CSS: Login logo URL too long: ' . substr($login_logo_url, 0, 100) . '...');
                return '';
            }
            
            // Validate URL format and protocol
            if (filter_var($login_logo_url, FILTER_VALIDATE_URL)) {
                $parsed_url = parse_url($login_logo_url);
                
                if (!$parsed_url || !isset($parsed_url['scheme']) || !isset($parsed_url['host'])) {
                    error_log('LAS Login CSS: Invalid URL structure: ' . $login_logo_url);
                    return '';
                }
                
                // Only allow HTTP and HTTPS protocols
                if (!in_array(strtolower($parsed_url['scheme']), ['http', 'https'])) {
                    error_log('LAS Login CSS: Invalid URL protocol: ' . $parsed_url['scheme']);
                    return '';
                }
                
                // Additional security checks
                $dangerous_patterns = [
                    'javascript:', 'data:', 'vbscript:', 'file:', 'ftp:',
                    '<script', '</script', 'onload=', 'onerror=', 'onclick='
                ];
                
                foreach ($dangerous_patterns as $pattern) {
                    if (stripos($login_logo_url, $pattern) !== false) {
                        error_log('LAS Login CSS: Potentially dangerous pattern in URL: ' . $pattern);
                        return '';
                    }
                }
                
                try {
                    $logo_url = esc_url($login_logo_url);
                    if (!empty($logo_url) && $logo_url === $login_logo_url) {
                        // Generate validated CSS with enhanced security
                        $css_rule = sprintf(
                            'body.login div#login h1 a { ' .
                            'background-image: url(%s) !important; ' .
                            'width: 100%% !important; ' .
                            'max-width: 320px !important; ' .
                            'min-height: 80px !important; ' .
                            'height: auto !important; ' .
                            'background-size: contain !important; ' .
                            'background-position: center center !important; ' .
                            'background-repeat: no-repeat !important; ' .
                            'margin-bottom: 25px !important; ' .
                            'padding-bottom: 0 !important; ' .
                            '}',
                            esc_attr($logo_url)
                        );
                        
                        // Validate generated CSS length
                        if (strlen($css_rule) > 1000) {
                            error_log('LAS Login CSS: Generated CSS rule too long');
                            return '';
                        }
                        
                        $css .= $css_rule . "\n";
                        
                    } else {
                        error_log('LAS Login CSS: URL failed esc_url validation: ' . $login_logo_url);
                    }
                } catch (Exception $e) {
                    error_log('LAS Login CSS: Error processing logo URL: ' . $e->getMessage());
                }
            } else {
                error_log('LAS Login CSS: Invalid login logo URL format: ' . $login_logo_url);
            }
        }
        
        // Final CSS validation
        $trimmed_css = trim($css);
        
        if (!empty($trimmed_css)) {
            // Basic CSS syntax validation
            if (substr_count($trimmed_css, '{') !== substr_count($trimmed_css, '}')) {
                error_log('LAS Login CSS: Unbalanced braces in generated CSS');
                return '';
            }
            
            // Check for potential injection
            if (preg_match('/[<>]|javascript:|expression\s*\(/i', $trimmed_css)) {
                error_log('LAS Login CSS: Potential CSS injection detected');
                return '';
            }
        }
        
        return $trimmed_css;
        
    } catch (Exception $e) {
        error_log('LAS Login CSS: Critical error in login CSS generation: ' . $e->getMessage());
        return '';
    }
}

function las_fresh_custom_admin_footer_text_output($footer_text) {
    try {
        // Validate input parameter
        if (!is_string($footer_text)) {
            error_log('LAS Footer Text: Invalid footer_text parameter type: ' . gettype($footer_text));
            $footer_text = ''; // Fallback to empty string
        }
        
        // Get custom footer text with comprehensive error handling
        try {
            $custom_text = las_fresh_get_option('footer_text');
        } catch (Exception $e) {
            error_log('LAS Footer Text: Error getting footer text option: ' . $e->getMessage());
            return $footer_text; // Return original footer text on error
        }
        
        // Enhanced validation for custom footer text
        if (!empty($custom_text)) {
            if (!is_string($custom_text)) {
                error_log('LAS Footer Text: Custom footer text is not a string: ' . gettype($custom_text));
                return $footer_text;
            }
            
            $custom_text = trim($custom_text);
            
            if (empty($custom_text)) {
                return $footer_text; // Return original if custom text is empty after trimming
            }
            
            // Enhanced length validation with more reasonable limits
            if (strlen($custom_text) > 500) {
                error_log('LAS Footer Text: Custom footer text too long (' . strlen($custom_text) . ' chars), truncating');
                $custom_text = substr($custom_text, 0, 500) . '...';
            }
            
            // Check for potentially dangerous content
            $dangerous_patterns = [
                '<script', '</script', 'javascript:', 'onload=', 'onerror=', 
                'onclick=', 'onmouseover=', 'onfocus=', 'data:text/html'
            ];
            
            foreach ($dangerous_patterns as $pattern) {
                if (stripos($custom_text, $pattern) !== false) {
                    error_log('LAS Footer Text: Potentially dangerous pattern detected: ' . $pattern);
                    return $footer_text; // Return original text for security
                }
            }
            
            try {
                // Enhanced sanitization with WordPress functions
                $sanitized_text = wp_kses_post($custom_text);
                
                if (empty($sanitized_text) && !empty($custom_text)) {
                    error_log('LAS Footer Text: Custom text became empty after sanitization, using fallback');
                    // Try basic sanitization as fallback
                    $sanitized_text = sanitize_text_field($custom_text);
                }
                
                // Final validation of sanitized text
                if (!empty($sanitized_text) && is_string($sanitized_text)) {
                    return $sanitized_text;
                } else {
                    error_log('LAS Footer Text: Sanitized text is invalid, returning original');
                    return $footer_text;
                }
                
            } catch (Exception $e) {
                error_log('LAS Footer Text: Error sanitizing custom footer text: ' . $e->getMessage());
                return $footer_text; // Return original on sanitization error
            }
        }
        
        return $footer_text;
        
    } catch (Exception $e) {
        error_log('LAS Footer Text: Critical error in footer text processing: ' . $e->getMessage());
        return is_string($footer_text) ? $footer_text : ''; // Always return a string
    }
}

if (!function_exists('las_fresh_adjust_brightness_css')) {
    function las_fresh_adjust_brightness_css($hex, $steps) {
        try {
            // Comprehensive input validation with enhanced fallbacks
            if (!is_string($hex)) {
                error_log('LAS Brightness Adjustment: Hex value is not a string: ' . gettype($hex));
                return '#000000'; // Fallback to black
            }
            
            if (!is_numeric($steps)) {
                error_log('LAS Brightness Adjustment: Steps value is not numeric: ' . gettype($steps));
                $steps = 0; // Fallback to no change
            }
            
            $original_hex = $hex;
            $hex = trim(ltrim($hex, '#'));
            
            // Enhanced validation for empty or invalid input
            if (empty($hex)) {
                error_log('LAS Brightness Adjustment: Empty hex value provided');
                return '#000000'; // Fallback to black
            }
            
            // Validate hex string length and characters
            if (!in_array(strlen($hex), [3, 6]) || !ctype_xdigit($hex)) {
                error_log('LAS Brightness Adjustment: Invalid hex format: ' . $original_hex);
                // Try to return a valid color based on original input
                if (preg_match('/^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/', $original_hex)) {
                    return '#' . ltrim($original_hex, '#');
                }
                return '#000000'; // Ultimate fallback
            }
            
            // Expand 3-character hex to 6-character with validation
            if (strlen($hex) === 3) {
                if (ctype_xdigit($hex)) {
                    $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
                } else {
                    error_log('LAS Brightness Adjustment: Invalid 3-character hex: ' . $hex);
                    return '#000000';
                }
            }
            
            // Final validation after expansion
            if (strlen($hex) !== 6 || !ctype_xdigit($hex)) {
                error_log('LAS Brightness Adjustment: Hex validation failed after expansion: ' . $hex);
                return '#000000';
            }
            
            // Enhanced steps validation with reasonable limits
            if (!is_finite($steps)) {
                error_log('LAS Brightness Adjustment: Steps value is not finite: ' . $steps);
                $steps = 0;
            }
            
            $steps = max(-255, min(255, (int)$steps));
            
            $rgb_array = array();
            
            // Process each color component with comprehensive error handling
            for ($i = 0; $i < 3; $i++) {
                try {
                    $start_pos = $i * 2;
                    if ($start_pos + 1 >= strlen($hex)) {
                        error_log('LAS Brightness Adjustment: Hex string too short for component ' . $i);
                        $rgb_array[] = 0;
                        continue;
                    }
                    
                    $hex_component = substr($hex, $start_pos, 2);
                    
                    if (strlen($hex_component) !== 2 || !ctype_xdigit($hex_component)) {
                        error_log('LAS Brightness Adjustment: Invalid hex component: ' . $hex_component);
                        $rgb_array[] = 0;
                        continue;
                    }
                    
                    $color_component = hexdec($hex_component);
                    
                    // Validate hexdec result
                    if ($color_component === false || !is_numeric($color_component)) {
                        error_log('LAS Brightness Adjustment: Error converting hex component: ' . $hex_component);
                        $rgb_array[] = 0;
                        continue;
                    }
                    
                    // Apply brightness adjustment with clamping
                    $adjusted_component = $color_component + $steps;
                    $rgb_array[] = max(0, min(255, $adjusted_component));
                    
                } catch (Exception $e) {
                    error_log('LAS Brightness Adjustment: Error processing color component ' . $i . ': ' . $e->getMessage());
                    $rgb_array[] = 0; // Fallback to 0 for this component
                }
            }
            
            // Ensure we have exactly 3 RGB components
            if (count($rgb_array) !== 3) {
                error_log('LAS Brightness Adjustment: Invalid RGB array length: ' . count($rgb_array));
                return '#000000';
            }
            
            // Build new hex value with comprehensive error handling
            $new_hex = '#';
            foreach ($rgb_array as $index => $component) {
                try {
                    if (!is_numeric($component) || $component < 0 || $component > 255) {
                        error_log('LAS Brightness Adjustment: Invalid RGB component value: ' . $component);
                        $component = 0; // Fallback to 0
                    }
                    
                    $hex_component = dechex((int)$component);
                    
                    if ($hex_component === false) {
                        error_log('LAS Brightness Adjustment: Error converting component to hex: ' . $component);
                        $hex_component = '00'; // Fallback
                    }
                    
                    $new_hex .= str_pad($hex_component, 2, '0', STR_PAD_LEFT);
                    
                } catch (Exception $e) {
                    error_log('LAS Brightness Adjustment: Error converting component ' . $index . ' to hex: ' . $e->getMessage());
                    $new_hex .= '00'; // Fallback to 00 for this component
                }
            }
            
            // Final validation of generated hex color
            if (strlen($new_hex) !== 7 || !preg_match('/^#[a-fA-F0-9]{6}$/', $new_hex)) {
                error_log('LAS Brightness Adjustment: Generated invalid hex color: ' . $new_hex);
                return '#000000';
            }
            
            return $new_hex;
            
        } catch (Exception $e) {
            error_log('LAS Brightness Adjustment: Critical error in brightness adjustment: ' . $e->getMessage());
            return '#000000'; // Fallback to black on critical error
        }
    }
}
?>