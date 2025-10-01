<?php
/**
 * Compatibility Manager
 * Handles conflict detection and resolution for other admin plugins and themes
 * 
 * @package LiveAdminStyler
 * @since 1.2.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Compatibility Manager Class
 * 
 * Detects and resolves conflicts with other WordPress plugins and themes,
 * implements proper CSS specificity and namespace isolation,
 * and provides multisite network admin support.
 */
class LAS_Compatibility_Manager {
    
    /**
     * Known conflicting plugins and their resolution strategies
     *
     * @var array
     */
    private $known_conflicts = array();
    
    /**
     * Detected conflicts
     *
     * @var array
     */
    private $detected_conflicts = array();
    
    /**
     * CSS namespace prefix
     *
     * @var string
     */
    private $css_namespace = 'las-';
    
    /**
     * JavaScript namespace
     *
     * @var string
     */
    private $js_namespace = 'LAS';
    
    /**
     * Debug mode flag
     *
     * @var bool
     */
    private $debug_mode;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->debug_mode = defined('WP_DEBUG') && WP_DEBUG;
        
        $this->init_known_conflicts();
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // Plugin compatibility checks
        add_action('admin_init', array($this, 'detect_plugin_conflicts'));
        add_action('admin_enqueue_scripts', array($this, 'apply_compatibility_fixes'), 20);
        
        // Theme compatibility
        add_action('admin_head', array($this, 'apply_theme_compatibility'));
        
        // Multisite support
        if (is_multisite()) {
            add_action('network_admin_menu', array($this, 'add_network_admin_support'));
            add_filter('network_admin_plugin_action_links_' . plugin_basename(dirname(__DIR__) . '/live-admin-styler.php'), 
                      array($this, 'add_network_action_links'));
        }
        
        // AJAX handlers
        add_action('wp_ajax_las_resolve_conflict', array($this, 'ajax_resolve_conflict'));
        add_action('wp_ajax_las_get_compatibility_status', array($this, 'ajax_get_compatibility_status'));
        
        // Admin notices for conflicts
        add_action('admin_notices', array($this, 'show_conflict_notices'));
    }
    
    /**
     * Initialize known plugin conflicts and their resolution strategies
     */
    private function init_known_conflicts() {
        $this->known_conflicts = array(
            // Popular admin plugins
            'yoast-seo' => array(
                'name' => 'Yoast SEO',
                'file' => 'wordpress-seo/wp-seo.php',
                'conflicts' => array(
                    'css_specificity' => array(
                        'selectors' => array('.yoast', '#wpseo-conf'),
                        'resolution' => 'increase_specificity'
                    ),
                    'js_namespace' => array(
                        'variables' => array('YoastSEO', 'wpseoAdminL10n'),
                        'resolution' => 'namespace_isolation'
                    )
                )
            ),
            
            'woocommerce' => array(
                'name' => 'WooCommerce',
                'file' => 'woocommerce/woocommerce.php',
                'conflicts' => array(
                    'admin_styles' => array(
                        'selectors' => array('.woocommerce', '.wc-admin'),
                        'resolution' => 'scope_isolation'
                    ),
                    'color_picker' => array(
                        'scripts' => array('wc-color-picker'),
                        'resolution' => 'script_priority'
                    )
                )
            ),
            
            'elementor' => array(
                'name' => 'Elementor',
                'file' => 'elementor/elementor.php',
                'conflicts' => array(
                    'admin_ui' => array(
                        'selectors' => array('#elementor-panel', '.elementor-admin'),
                        'resolution' => 'ui_isolation'
                    ),
                    'modal_conflicts' => array(
                        'scripts' => array('elementor-admin'),
                        'resolution' => 'modal_namespace'
                    )
                )
            ),
            
            'advanced-custom-fields' => array(
                'name' => 'Advanced Custom Fields',
                'file' => 'advanced-custom-fields/acf.php',
                'conflicts' => array(
                    'field_styles' => array(
                        'selectors' => array('.acf-field', '.acf-admin'),
                        'resolution' => 'field_isolation'
                    )
                )
            ),
            
            'gravity-forms' => array(
                'name' => 'Gravity Forms',
                'file' => 'gravityforms/gravityforms.php',
                'conflicts' => array(
                    'form_styles' => array(
                        'selectors' => array('.gform', '.gf_admin'),
                        'resolution' => 'form_isolation'
                    )
                )
            ),
            
            // Admin theme plugins
            'admin-color-schemes' => array(
                'name' => 'Admin Color Schemes',
                'file' => 'admin-color-schemes/admin-color-schemes.php',
                'conflicts' => array(
                    'color_schemes' => array(
                        'styles' => array('admin-colors'),
                        'resolution' => 'color_adaptation'
                    )
                )
            ),
            
            'admin-menu-editor' => array(
                'name' => 'Admin Menu Editor',
                'file' => 'admin-menu-editor/menu-editor.php',
                'conflicts' => array(
                    'menu_modifications' => array(
                        'selectors' => array('#adminmenu', '.wp-menu-name'),
                        'resolution' => 'menu_priority'
                    )
                )
            )
        );
    }
    
    /**
     * Detect plugin conflicts
     */
    public function detect_plugin_conflicts() {
        $this->detected_conflicts = array();
        
        foreach ($this->known_conflicts as $plugin_slug => $plugin_data) {
            if ($this->is_plugin_active($plugin_data['file'])) {
                $conflicts = $this->check_plugin_conflicts($plugin_slug, $plugin_data);
                
                if (!empty($conflicts)) {
                    $this->detected_conflicts[$plugin_slug] = array(
                        'name' => $plugin_data['name'],
                        'conflicts' => $conflicts,
                        'severity' => $this->calculate_conflict_severity($conflicts)
                    );
                    
                    $this->log_debug("Detected conflicts with {$plugin_data['name']}: " . implode(', ', array_keys($conflicts)));
                }
            }
        }
        
        // Store detected conflicts for later use
        update_option('las_detected_conflicts', $this->detected_conflicts);
    }
    
    /**
     * Check if plugin is active
     */
    private function is_plugin_active($plugin_file) {
        if (is_multisite()) {
            return is_plugin_active_for_network($plugin_file) || is_plugin_active($plugin_file);
        }
        
        return is_plugin_active($plugin_file);
    }
    
    /**
     * Check specific plugin conflicts
     */
    private function check_plugin_conflicts($plugin_slug, $plugin_data) {
        $conflicts = array();
        
        foreach ($plugin_data['conflicts'] as $conflict_type => $conflict_data) {
            if ($this->has_conflict($conflict_type, $conflict_data)) {
                $conflicts[$conflict_type] = $conflict_data;
            }
        }
        
        return $conflicts;
    }
    
    /**
     * Check if specific conflict exists
     */
    private function has_conflict($conflict_type, $conflict_data) {
        switch ($conflict_type) {
            case 'css_specificity':
            case 'admin_styles':
            case 'admin_ui':
            case 'field_styles':
            case 'form_styles':
            case 'menu_modifications':
                return $this->check_css_conflicts($conflict_data);
                
            case 'js_namespace':
            case 'modal_conflicts':
                return $this->check_js_conflicts($conflict_data);
                
            case 'color_picker':
            case 'color_schemes':
                return $this->check_script_conflicts($conflict_data);
                
            default:
                return false;
        }
    }
    
    /**
     * Check CSS conflicts
     */
    private function check_css_conflicts($conflict_data) {
        // In admin context, we can't directly check DOM elements,
        // so we check if the conflicting styles are enqueued
        global $wp_styles;
        
        if (isset($conflict_data['selectors'])) {
            // Check if any registered styles might contain conflicting selectors
            foreach ($wp_styles->registered as $handle => $style) {
                if (strpos($handle, 'yoast') !== false || 
                    strpos($handle, 'woocommerce') !== false ||
                    strpos($handle, 'elementor') !== false ||
                    strpos($handle, 'acf') !== false ||
                    strpos($handle, 'gform') !== false) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check JavaScript conflicts
     */
    private function check_js_conflicts($conflict_data) {
        global $wp_scripts;
        
        if (isset($conflict_data['variables'])) {
            // Check if conflicting JavaScript variables might be present
            foreach ($wp_scripts->registered as $handle => $script) {
                if (isset($conflict_data['variables'])) {
                    foreach ($conflict_data['variables'] as $variable) {
                        if (strpos($handle, strtolower($variable)) !== false) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check script conflicts
     */
    private function check_script_conflicts($conflict_data) {
        global $wp_scripts;
        
        if (isset($conflict_data['scripts'])) {
            foreach ($conflict_data['scripts'] as $script_handle) {
                if (wp_script_is($script_handle, 'registered') || wp_script_is($script_handle, 'enqueued')) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Calculate conflict severity
     */
    private function calculate_conflict_severity($conflicts) {
        $severity_scores = array(
            'css_specificity' => 2,
            'js_namespace' => 3,
            'admin_styles' => 2,
            'color_picker' => 1,
            'admin_ui' => 3,
            'modal_conflicts' => 2,
            'field_styles' => 1,
            'form_styles' => 1,
            'color_schemes' => 1,
            'menu_modifications' => 2
        );
        
        $total_score = 0;
        foreach ($conflicts as $conflict_type => $conflict_data) {
            $total_score += $severity_scores[$conflict_type] ?? 1;
        }
        
        if ($total_score >= 6) {
            return 'high';
        } elseif ($total_score >= 3) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    /**
     * Apply compatibility fixes
     */
    public function apply_compatibility_fixes($hook_suffix) {
        // Only apply on Live Admin Styler pages
        if (strpos($hook_suffix, 'live-admin-styler') === false) {
            return;
        }
        
        $detected_conflicts = get_option('las_detected_conflicts', array());
        
        foreach ($detected_conflicts as $plugin_slug => $conflict_data) {
            $this->apply_plugin_fixes($plugin_slug, $conflict_data);
        }
        
        // Apply general compatibility CSS
        $this->enqueue_compatibility_styles();
        
        // Apply compatibility JavaScript
        $this->enqueue_compatibility_scripts();
    }
    
    /**
     * Apply fixes for specific plugin
     */
    private function apply_plugin_fixes($plugin_slug, $conflict_data) {
        $plugin_config = $this->known_conflicts[$plugin_slug] ?? null;
        
        if (!$plugin_config) {
            return;
        }
        
        foreach ($conflict_data['conflicts'] as $conflict_type => $conflict_details) {
            $resolution = $conflict_details['resolution'] ?? null;
            
            if ($resolution) {
                $this->apply_resolution_strategy($resolution, $plugin_slug, $conflict_details);
            }
        }
    }
    
    /**
     * Apply resolution strategy
     */
    private function apply_resolution_strategy($strategy, $plugin_slug, $conflict_details) {
        switch ($strategy) {
            case 'increase_specificity':
                $this->increase_css_specificity($plugin_slug);
                break;
                
            case 'namespace_isolation':
                $this->apply_namespace_isolation($plugin_slug);
                break;
                
            case 'scope_isolation':
                $this->apply_scope_isolation($plugin_slug);
                break;
                
            case 'script_priority':
                $this->adjust_script_priority($plugin_slug);
                break;
                
            case 'ui_isolation':
                $this->apply_ui_isolation($plugin_slug);
                break;
                
            case 'modal_namespace':
                $this->apply_modal_namespace($plugin_slug);
                break;
                
            case 'field_isolation':
                $this->apply_field_isolation($plugin_slug);
                break;
                
            case 'form_isolation':
                $this->apply_form_isolation($plugin_slug);
                break;
                
            case 'color_adaptation':
                $this->apply_color_adaptation($plugin_slug);
                break;
                
            case 'menu_priority':
                $this->apply_menu_priority($plugin_slug);
                break;
        }
        
        $this->log_debug("Applied resolution strategy '{$strategy}' for {$plugin_slug}");
    }
    
    /**
     * Increase CSS specificity
     */
    private function increase_css_specificity($plugin_slug) {
        $css = "
        /* Increased specificity for {$plugin_slug} compatibility */
        .las-fresh-settings-wrap .las-tab,
        .las-fresh-settings-wrap .las-button,
        .las-fresh-settings-wrap .las-card {
            /* Force higher specificity */
        }
        ";
        
        wp_add_inline_style('las-ui-repair-css', $css);
    }
    
    /**
     * Apply namespace isolation
     */
    private function apply_namespace_isolation($plugin_slug) {
        $js = "
        // Namespace isolation for {$plugin_slug}
        (function() {
            if (typeof window.{$this->js_namespace} === 'undefined') {
                window.{$this->js_namespace} = {};
            }
            
            // Protect our namespace
            Object.defineProperty(window, '{$this->js_namespace}', {
                writable: false,
                configurable: false
            });
        })();
        ";
        
        wp_add_inline_script('las-ui-repair', $js, 'before');
    }
    
    /**
     * Apply scope isolation
     */
    private function apply_scope_isolation($plugin_slug) {
        $css = "
        /* Scope isolation for {$plugin_slug} */
        .las-fresh-settings-wrap {
            isolation: isolate;
            position: relative;
            z-index: 1000;
        }
        
        .las-fresh-settings-wrap * {
            box-sizing: border-box;
        }
        ";
        
        wp_add_inline_style('las-ui-repair-css', $css);
    }
    
    /**
     * Adjust script priority
     */
    private function adjust_script_priority($plugin_slug) {
        // Ensure our scripts load after conflicting ones
        global $wp_scripts;
        
        if (isset($wp_scripts->registered['las-ui-repair'])) {
            $wp_scripts->registered['las-ui-repair']->deps[] = 'jquery-ui-core';
        }
    }
    
    /**
     * Apply UI isolation
     */
    private function apply_ui_isolation($plugin_slug) {
        $css = "
        /* UI isolation for {$plugin_slug} */
        .las-fresh-settings-wrap {
            contain: layout style;
        }
        
        .las-modal,
        .las-overlay {
            z-index: 999999 !important;
        }
        ";
        
        wp_add_inline_style('las-ui-repair-css', $css);
    }
    
    /**
     * Apply modal namespace
     */
    private function apply_modal_namespace($plugin_slug) {
        $js = "
        // Modal namespace protection for {$plugin_slug}
        document.addEventListener('DOMContentLoaded', function() {
            if (window.{$this->js_namespace} && window.{$this->js_namespace}.Modal) {
                window.{$this->js_namespace}.Modal.namespace = 'las-modal';
            }
        });
        ";
        
        wp_add_inline_script('las-ui-repair', $js);
    }
    
    /**
     * Apply field isolation
     */
    private function apply_field_isolation($plugin_slug) {
        $css = "
        /* Field isolation for {$plugin_slug} */
        .las-fresh-settings-wrap .las-field {
            position: relative;
            isolation: isolate;
        }
        
        .las-fresh-settings-wrap input,
        .las-fresh-settings-wrap select,
        .las-fresh-settings-wrap textarea {
            font-family: inherit;
            font-size: inherit;
        }
        ";
        
        wp_add_inline_style('las-ui-repair-css', $css);
    }
    
    /**
     * Apply form isolation
     */
    private function apply_form_isolation($plugin_slug) {
        $css = "
        /* Form isolation for {$plugin_slug} */
        .las-fresh-settings-wrap form {
            isolation: isolate;
        }
        
        .las-fresh-settings-wrap .las-form-field {
            position: relative;
        }
        ";
        
        wp_add_inline_style('las-ui-repair-css', $css);
    }
    
    /**
     * Apply color adaptation
     */
    private function apply_color_adaptation($plugin_slug) {
        $admin_color = get_user_option('admin_color');
        
        $css = "
        /* Color adaptation for {$plugin_slug} and admin color scheme: {$admin_color} */
        .las-fresh-settings-wrap {
            --las-admin-color-primary: var(--wp-admin-theme-color, #007cba);
            --las-admin-color-secondary: var(--wp-admin-theme-color-darker-10, #005a87);
        }
        ";
        
        wp_add_inline_style('las-ui-repair-css', $css);
    }
    
    /**
     * Apply menu priority
     */
    private function apply_menu_priority($plugin_slug) {
        $css = "
        /* Menu priority for {$plugin_slug} */
        .las-fresh-settings-wrap .las-menu {
            z-index: 1001;
        }
        
        .las-submenu-visible {
            z-index: 1002 !important;
        }
        ";
        
        wp_add_inline_style('las-ui-repair-css', $css);
    }
    
    /**
     * Enqueue compatibility styles
     */
    private function enqueue_compatibility_styles() {
        $compatibility_css = $this->generate_compatibility_css();
        
        wp_register_style(
            'las-compatibility',
            false,
            array('las-ui-repair-css'),
            LAS_FRESH_VERSION
        );
        
        wp_enqueue_style('las-compatibility');
        wp_add_inline_style('las-compatibility', $compatibility_css);
    }
    
    /**
     * Generate compatibility CSS
     */
    private function generate_compatibility_css() {
        return "
        /* Live Admin Styler Compatibility Styles */
        
        /* General namespace isolation */
        .{$this->css_namespace}fresh-settings-wrap {
            --las-namespace: '{$this->css_namespace}';
            isolation: isolate;
            contain: layout style;
        }
        
        /* Prevent conflicts with common admin plugins */
        .{$this->css_namespace}fresh-settings-wrap * {
            box-sizing: border-box;
        }
        
        /* High specificity reset for conflicting elements */
        .{$this->css_namespace}fresh-settings-wrap .{$this->css_namespace}tab,
        .{$this->css_namespace}fresh-settings-wrap .{$this->css_namespace}button,
        .{$this->css_namespace}fresh-settings-wrap .{$this->css_namespace}card,
        .{$this->css_namespace}fresh-settings-wrap .{$this->css_namespace}form {
            all: revert;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
        }
        
        /* Modal and overlay z-index management */
        .{$this->css_namespace}modal,
        .{$this->css_namespace}overlay {
            z-index: 999999;
        }
        
        /* Color picker compatibility */
        .{$this->css_namespace}fresh-settings-wrap .wp-color-picker {
            position: relative;
            z-index: 1000;
        }
        
        /* Slider compatibility */
        .{$this->css_namespace}fresh-settings-wrap .ui-slider {
            position: relative;
            z-index: 100;
        }
        
        /* RTL compatibility */
        .rtl .{$this->css_namespace}fresh-settings-wrap {
            direction: rtl;
        }
        
        /* Multisite compatibility */
        .network-admin .{$this->css_namespace}fresh-settings-wrap {
            /* Network admin specific styles */
        }
        
        /* Mobile compatibility */
        @media screen and (max-width: 782px) {
            .{$this->css_namespace}fresh-settings-wrap {
                margin: 0;
                padding: 10px;
            }
        }
        ";
    }
    
    /**
     * Enqueue compatibility scripts
     */
    private function enqueue_compatibility_scripts() {
        wp_register_script(
            'las-compatibility',
            false,
            array('las-ui-repair'),
            LAS_FRESH_VERSION,
            true
        );
        
        wp_enqueue_script('las-compatibility');
        
        $compatibility_js = $this->generate_compatibility_js();
        wp_add_inline_script('las-compatibility', $compatibility_js);
        
        // Localize compatibility data
        wp_localize_script('las-compatibility', 'lasCompatibilityData', array(
            'detectedConflicts' => $this->detected_conflicts,
            'namespace' => $this->js_namespace,
            'cssNamespace' => $this->css_namespace,
            'isMultisite' => is_multisite(),
            'isNetworkAdmin' => is_network_admin()
        ));
    }
    
    /**
     * Generate compatibility JavaScript
     */
    private function generate_compatibility_js() {
        return "
        // Live Admin Styler Compatibility Script
        (function() {
            'use strict';
            
            // Namespace protection
            if (typeof window.{$this->js_namespace} === 'undefined') {
                window.{$this->js_namespace} = {};
            }
            
            // Compatibility manager
            window.{$this->js_namespace}.Compatibility = {
                namespace: '{$this->js_namespace}',
                cssNamespace: '{$this->css_namespace}',
                
                init: function() {
                    this.protectNamespace();
                    this.handleConflicts();
                    this.setupEventDelegation();
                },
                
                protectNamespace: function() {
                    // Prevent namespace pollution
                    Object.defineProperty(window, '{$this->js_namespace}', {
                        writable: false,
                        configurable: false
                    });
                },
                
                handleConflicts: function() {
                    var conflicts = window.lasCompatibilityData?.detectedConflicts || {};
                    
                    Object.keys(conflicts).forEach(function(plugin) {
                        console.log('LAS Compatibility: Handling conflicts with ' + plugin);
                    });
                },
                
                setupEventDelegation: function() {
                    // Use event delegation to avoid conflicts
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('.{$this->css_namespace}fresh-settings-wrap')) {
                            // Handle our events
                            e.stopPropagation();
                        }
                    }, true);
                }
            };
            
            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    window.{$this->js_namespace}.Compatibility.init();
                });
            } else {
                window.{$this->js_namespace}.Compatibility.init();
            }
        })();
        ";
    }
    
    /**
     * Apply theme compatibility
     */
    public function apply_theme_compatibility() {
        $current_screen = get_current_screen();
        
        if (!$current_screen || strpos($current_screen->id, 'live-admin-styler') === false) {
            return;
        }
        
        // Get current admin color scheme
        $admin_color = get_user_option('admin_color');
        
        // Apply theme-specific compatibility
        $this->apply_admin_color_compatibility($admin_color);
        $this->apply_custom_theme_compatibility();
    }
    
    /**
     * Apply admin color compatibility
     */
    private function apply_admin_color_compatibility($admin_color) {
        $color_schemes = array(
            'fresh' => array('primary' => '#007cba', 'secondary' => '#005a87'),
            'light' => array('primary' => '#04a4cc', 'secondary' => '#037c9a'),
            'blue' => array('primary' => '#096484', 'secondary' => '#07526c'),
            'coffee' => array('primary' => '#46403c', 'secondary' => '#383330'),
            'ectoplasm' => array('primary' => '#523f6d', 'secondary' => '#46365d'),
            'midnight' => array('primary' => '#e14d43', 'secondary' => '#dd382d'),
            'ocean' => array('primary' => '#627c83', 'secondary' => '#576e74'),
            'sunrise' => array('primary' => '#dd823b', 'secondary' => '#d97426')
        );
        
        $scheme = $color_schemes[$admin_color] ?? $color_schemes['fresh'];
        
        echo "<style>
        .las-fresh-settings-wrap {
            --las-admin-primary: {$scheme['primary']};
            --las-admin-secondary: {$scheme['secondary']};
        }
        
        .las-button-primary {
            background-color: var(--las-admin-primary);
            border-color: var(--las-admin-secondary);
        }
        
        .las-tab.active {
            border-bottom-color: var(--las-admin-primary);
        }
        </style>";
    }
    
    /**
     * Apply custom theme compatibility
     */
    private function apply_custom_theme_compatibility() {
        // Check for custom admin themes
        $custom_css = get_option('las_custom_admin_css', '');
        
        if (!empty($custom_css)) {
            echo "<style>{$custom_css}</style>";
        }
        
        // Apply responsive compatibility
        echo "<style>
        @media screen and (max-width: 782px) {
            .las-fresh-settings-wrap {
                margin-left: 0;
                margin-right: 0;
            }
            
            .las-tabs {
                flex-direction: column;
            }
            
            .las-tab {
                width: 100%;
                margin-bottom: 5px;
            }
        }
        </style>";
    }
    
    /**
     * Add network admin support for multisite
     */
    public function add_network_admin_support() {
        if (!current_user_can('manage_network_options')) {
            return;
        }
        
        add_menu_page(
            __('Live Admin Styler Network', LAS_FRESH_TEXT_DOMAIN),
            __('Admin Styler', LAS_FRESH_TEXT_DOMAIN),
            'manage_network_options',
            'las-network-settings',
            array($this, 'render_network_admin_page'),
            'dashicons-admin-customizer',
            80
        );
    }
    
    /**
     * Render network admin page
     */
    public function render_network_admin_page() {
        if (!current_user_can('manage_network_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', LAS_FRESH_TEXT_DOMAIN));
        }
        
        ?>
        <div class="wrap las-network-admin">
            <h1><?php esc_html_e('Live Admin Styler Network Settings', LAS_FRESH_TEXT_DOMAIN); ?></h1>
            
            <div class="las-network-info">
                <p><?php esc_html_e('Configure Live Admin Styler settings for the entire network.', LAS_FRESH_TEXT_DOMAIN); ?></p>
            </div>
            
            <div class="las-network-sites">
                <h2><?php esc_html_e('Site Compatibility Status', LAS_FRESH_TEXT_DOMAIN); ?></h2>
                
                <?php
                $sites = get_sites(array('number' => 100));
                foreach ($sites as $site) {
                    switch_to_blog($site->blog_id);
                    
                    $conflicts = get_option('las_detected_conflicts', array());
                    $conflict_count = count($conflicts);
                    
                    echo '<div class="las-site-status">';
                    echo '<h3>' . esc_html(get_bloginfo('name')) . '</h3>';
                    echo '<p>URL: ' . esc_url(get_home_url()) . '</p>';
                    
                    if ($conflict_count > 0) {
                        echo '<p class="las-conflicts">⚠️ ' . sprintf(
                            esc_html__('%d conflicts detected', LAS_FRESH_TEXT_DOMAIN),
                            $conflict_count
                        ) . '</p>';
                    } else {
                        echo '<p class="las-no-conflicts">✅ ' . esc_html__('No conflicts detected', LAS_FRESH_TEXT_DOMAIN) . '</p>';
                    }
                    
                    echo '</div>';
                    
                    restore_current_blog();
                }
                ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * Add network action links
     */
    public function add_network_action_links($links) {
        $network_link = '<a href="' . network_admin_url('admin.php?page=las-network-settings') . '">' . 
                       esc_html__('Network Settings', LAS_FRESH_TEXT_DOMAIN) . '</a>';
        
        array_unshift($links, $network_link);
        
        return $links;
    }
    
    /**
     * Show conflict notices
     */
    public function show_conflict_notices() {
        $current_screen = get_current_screen();
        
        if (!$current_screen || strpos($current_screen->id, 'live-admin-styler') === false) {
            return;
        }
        
        $detected_conflicts = get_option('las_detected_conflicts', array());
        
        if (empty($detected_conflicts)) {
            return;
        }
        
        $high_severity_conflicts = array_filter($detected_conflicts, function($conflict) {
            return $conflict['severity'] === 'high';
        });
        
        if (!empty($high_severity_conflicts)) {
            echo '<div class="notice notice-warning is-dismissible">';
            echo '<p><strong>' . esc_html__('Live Admin Styler', LAS_FRESH_TEXT_DOMAIN) . ':</strong> ';
            echo esc_html__('High-severity plugin conflicts detected. Some features may not work properly.', LAS_FRESH_TEXT_DOMAIN);
            echo '</p>';
            
            echo '<ul>';
            foreach ($high_severity_conflicts as $plugin_slug => $conflict_data) {
                echo '<li>' . esc_html($conflict_data['name']) . '</li>';
            }
            echo '</ul>';
            
            echo '<p><a href="#" class="las-resolve-conflicts">' . 
                 esc_html__('Attempt to resolve conflicts automatically', LAS_FRESH_TEXT_DOMAIN) . '</a></p>';
            echo '</div>';
        }
    }
    
    /**
     * AJAX handler for resolving conflicts
     */
    public function ajax_resolve_conflict() {
        try {
            // Verify nonce and permissions
            if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_ui_repair_nonce') || 
                !current_user_can('manage_options')) {
                wp_send_json_error('Access denied');
                return;
            }
            
            $plugin_slug = sanitize_key($_POST['plugin_slug'] ?? '');
            
            if (empty($plugin_slug)) {
                wp_send_json_error('Invalid plugin slug');
                return;
            }
            
            // Re-detect conflicts
            $this->detect_plugin_conflicts();
            
            // Apply fixes
            $detected_conflicts = get_option('las_detected_conflicts', array());
            
            if (isset($detected_conflicts[$plugin_slug])) {
                $this->apply_plugin_fixes($plugin_slug, $detected_conflicts[$plugin_slug]);
                
                wp_send_json_success(array(
                    'message' => 'Conflicts resolved successfully',
                    'plugin' => $plugin_slug
                ));
            } else {
                wp_send_json_error('No conflicts found for this plugin');
            }
            
        } catch (Exception $e) {
            error_log('LAS Compatibility: Conflict resolution error: ' . $e->getMessage());
            wp_send_json_error('Failed to resolve conflicts');
        }
    }
    
    /**
     * AJAX handler for getting compatibility status
     */
    public function ajax_get_compatibility_status() {
        try {
            // Verify nonce and permissions
            if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_ui_repair_nonce') || 
                !current_user_can('manage_options')) {
                wp_send_json_error('Access denied');
                return;
            }
            
            $detected_conflicts = get_option('las_detected_conflicts', array());
            
            $status = array(
                'total_conflicts' => count($detected_conflicts),
                'high_severity' => count(array_filter($detected_conflicts, function($c) { return $c['severity'] === 'high'; })),
                'medium_severity' => count(array_filter($detected_conflicts, function($c) { return $c['severity'] === 'medium'; })),
                'low_severity' => count(array_filter($detected_conflicts, function($c) { return $c['severity'] === 'low'; })),
                'conflicts' => $detected_conflicts,
                'multisite' => is_multisite(),
                'network_admin' => is_network_admin()
            );
            
            wp_send_json_success($status);
            
        } catch (Exception $e) {
            error_log('LAS Compatibility: Status retrieval error: ' . $e->getMessage());
            wp_send_json_error('Failed to get compatibility status');
        }
    }
    
    /**
     * Debug logging utility
     */
    private function log_debug($message) {
        if ($this->debug_mode) {
            error_log('LAS Compatibility Manager: ' . $message);
        }
    }
    
    /**
     * Get detected conflicts
     */
    public function get_detected_conflicts() {
        return $this->detected_conflicts;
    }
    
    /**
     * Get known conflicts
     */
    public function get_known_conflicts() {
        return $this->known_conflicts;
    }
}

// Initialize the compatibility manager
global $las_compatibility_manager;
$las_compatibility_manager = new LAS_Compatibility_Manager();