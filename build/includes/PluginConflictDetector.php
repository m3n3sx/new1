<?php
/**
 * Plugin Conflict Detector
 *
 * Detects and resolves conflicts with other WordPress plugins that might
 * interfere with Live Admin Styler functionality.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Plugin Conflict Detector class
 */
class LAS_PluginConflictDetector {

    /**
     * Known conflicting plugins
     * @var array
     */
    private $known_conflicts = [
        'admin-color-schemes/admin-color-schemes.php' => [
            'name' => 'Admin Color Schemes',
            'type' => 'styling',
            'severity' => 'medium',
            'description' => 'May conflict with color customization features',
            'resolution' => 'Disable conflicting color scheme features or use LAS color system exclusively'
        ],
        'wp-admin-ui-customize/wp-admin-ui-customize.php' => [
            'name' => 'WP Admin UI Customize',
            'type' => 'admin_ui',
            'severity' => 'high',
            'description' => 'Direct conflict with admin interface customization',
            'resolution' => 'Choose one plugin for admin customization to avoid conflicts'
        ],
        'admin-menu-editor/menu-editor.php' => [
            'name' => 'Admin Menu Editor',
            'type' => 'menu',
            'severity' => 'low',
            'description' => 'May interfere with menu styling',
            'resolution' => 'Menu styling conflicts can usually be resolved with CSS priority'
        ],
        'white-label-cms/white-label-cms.php' => [
            'name' => 'White Label CMS',
            'type' => 'branding',
            'severity' => 'medium',
            'description' => 'May conflict with admin branding and styling',
            'resolution' => 'Coordinate branding settings between both plugins'
        ],
        'custom-admin-interface/custom-admin-interface.php' => [
            'name' => 'Custom Admin Interface',
            'type' => 'admin_ui',
            'severity' => 'high',
            'description' => 'Direct conflict with admin interface customization',
            'resolution' => 'Deactivate one of the admin customization plugins'
        ],
        'adminimize/adminimize.php' => [
            'name' => 'Adminimize',
            'type' => 'admin_ui',
            'severity' => 'medium',
            'description' => 'May hide elements that LAS tries to style',
            'resolution' => 'Ensure LAS styles are applied before Adminimize hides elements'
        ],
        'admin-columns/admin-columns.php' => [
            'name' => 'Admin Columns',
            'type' => 'layout',
            'severity' => 'low',
            'description' => 'Minor styling conflicts with admin tables',
            'resolution' => 'CSS specificity adjustments may be needed'
        ],
        'advanced-custom-fields/acf.php' => [
            'name' => 'Advanced Custom Fields',
            'type' => 'fields',
            'severity' => 'low',
            'description' => 'Custom field styling may need adjustment',
            'resolution' => 'Include ACF-specific styles in customization'
        ],
        'elementor/elementor.php' => [
            'name' => 'Elementor',
            'type' => 'page_builder',
            'severity' => 'low',
            'description' => 'Elementor admin styles may conflict',
            'resolution' => 'Use CSS specificity to target non-Elementor admin pages'
        ],
        'wp-rocket/wp-rocket.php' => [
            'name' => 'WP Rocket',
            'type' => 'caching',
            'severity' => 'low',
            'description' => 'CSS/JS caching may interfere with live preview',
            'resolution' => 'Exclude LAS assets from caching or clear cache after changes'
        ]
    ];

    /**
     * Detected conflicts
     * @var array
     */
    private $detected_conflicts = [];

    /**
     * Constructor
     */
    public function __construct() {
        add_action('admin_init', [$this, 'detect_conflicts']);
        add_action('admin_notices', [$this, 'display_conflict_notices']);
        add_action('wp_ajax_las_resolve_conflict', [$this, 'handle_conflict_resolution']);
    }

    /**
     * Detect plugin conflicts
     */
    public function detect_conflicts() {
        if (!is_admin()) {
            return;
        }

        $this->detected_conflicts = [];

        foreach ($this->known_conflicts as $plugin_path => $conflict_info) {
            if (is_plugin_active($plugin_path)) {
                $this->detected_conflicts[$plugin_path] = $conflict_info;

                error_log(sprintf(
                    '[LAS] Plugin conflict detected: %s (%s severity)',
                    $conflict_info['name'],
                    $conflict_info['severity']
                ));
            }
        }

        update_option('las_fresh_detected_conflicts', $this->detected_conflicts);

        $this->detect_runtime_conflicts();
    }

    /**
     * Detect runtime conflicts (CSS/JS conflicts)
     */
    private function detect_runtime_conflicts() {

        $this->detect_css_conflicts();

        $this->detect_js_conflicts();

        $this->detect_menu_conflicts();
    }

    /**
     * Detect CSS conflicts
     */
    private function detect_css_conflicts() {
        global $wp_styles;

        if (!$wp_styles instanceof WP_Styles) {
            return;
        }

        $conflicting_styles = [
            'admin-color-scheme',
            'custom-admin-css',
            'wp-admin-ui',
            'admin-theme',
            'custom-admin-style'
        ];

        foreach ($wp_styles->registered as $handle => $style) {
            foreach ($conflicting_styles as $conflict_pattern) {
                if (strpos($handle, $conflict_pattern) !== false) {
                    $this->detected_conflicts['css_conflict_' . $handle] = [
                        'name' => 'CSS Conflict: ' . $handle,
                        'type' => 'css',
                        'severity' => 'medium',
                        'description' => "CSS handle '{$handle}' may conflict with LAS styles",
                        'resolution' => 'Adjust CSS specificity or load order'
                    ];
                }
            }
        }
    }

    /**
     * Detect JavaScript conflicts
     */
    private function detect_js_conflicts() {
        global $wp_scripts;

        if (!$wp_scripts instanceof WP_Scripts) {
            return;
        }

        $conflicting_scripts = [
            'admin-ui',
            'custom-admin',
            'admin-theme',
            'live-preview'
        ];

        foreach ($wp_scripts->registered as $handle => $script) {
            foreach ($conflicting_scripts as $conflict_pattern) {
                if (strpos($handle, $conflict_pattern) !== false && strpos($handle, 'las-') === false) {
                    $this->detected_conflicts['js_conflict_' . $handle] = [
                        'name' => 'JavaScript Conflict: ' . $handle,
                        'type' => 'javascript',
                        'severity' => 'medium',
                        'description' => "JavaScript handle '{$handle}' may conflict with LAS functionality",
                        'resolution' => 'Check for namespace conflicts and load order'
                    ];
                }
            }
        }
    }

    /**
     * Detect admin menu conflicts
     */
    private function detect_menu_conflicts() {
        global $menu, $submenu;

        $las_menu_positions = [25, 26, 27, 28, 29];

        foreach ($las_menu_positions as $position) {
            if (isset($menu[$position])) {
                $menu_item = $menu[$position];
                if (strpos(strtolower($menu_item[0]), 'admin') !== false ||
                    strpos(strtolower($menu_item[0]), 'customize') !== false) {

                    $this->detected_conflicts['menu_conflict_' . $position] = [
                        'name' => 'Menu Conflict: ' . $menu_item[0],
                        'type' => 'menu',
                        'severity' => 'low',
                        'description' => "Menu item '{$menu_item[0]}' at position {$position} may conflict",
                        'resolution' => 'Adjust menu positioning or styling'
                    ];
                }
            }
        }
    }

    /**
     * Display conflict notices in admin
     */
    public function display_conflict_notices() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $conflicts = get_option('las_fresh_detected_conflicts', []);

        if (empty($conflicts)) {
            return;
        }

        $high_severity = array_filter($conflicts, function($conflict) {
            return $conflict['severity'] === 'high';
        });

        $medium_severity = array_filter($conflicts, function($conflict) {
            return $conflict['severity'] === 'medium';
        });

        $low_severity = array_filter($conflicts, function($conflict) {
            return $conflict['severity'] === 'low';
        });

        if (!empty($high_severity)) {
            $this->display_conflict_notice($high_severity, 'error', 'High Priority Conflicts Detected');
        }

        if (!empty($medium_severity)) {
            $this->display_conflict_notice($medium_severity, 'warning', 'Medium Priority Conflicts Detected');
        }

        if (!empty($low_severity) && !get_user_meta(get_current_user_id(), 'las_dismissed_low_conflicts', true)) {
            $this->display_conflict_notice($low_severity, 'info', 'Low Priority Conflicts Detected');
        }
    }

    /**
     * Display individual conflict notice
     *
     * @param array $conflicts Conflicts to display
     * @param string $type Notice type (error, warning, info)
     * @param string $title Notice title
     */
    private function display_conflict_notice($conflicts, $type, $title) {
        $notice_class = 'notice notice-' . $type;

        echo '<div class="' . esc_attr($notice_class) . ' las-conflict-notice">';
        echo '<h3>' . esc_html($title) . '</h3>';
        echo '<div class="las-conflicts-list">';

        foreach ($conflicts as $plugin_path => $conflict) {
            echo '<div class="las-conflict-item">';
            echo '<h4>' . esc_html($conflict['name']) . '</h4>';
            echo '<p><strong>Issue:</strong> ' . esc_html($conflict['description']) . '</p>';
            echo '<p><strong>Resolution:</strong> ' . esc_html($conflict['resolution']) . '</p>';

            if ($type === 'error' || $type === 'warning') {
                echo '<p>';
                echo '<button type="button" class="button button-primary las-resolve-conflict" ';
                echo 'data-plugin="' . esc_attr($plugin_path) . '" ';
                echo 'data-action="auto_resolve">Auto Resolve</button> ';
                echo '<button type="button" class="button las-ignore-conflict" ';
                echo 'data-plugin="' . esc_attr($plugin_path) . '">Ignore</button>';
                echo '</p>';
            }

            echo '</div>';
        }

        echo '</div>';

        if ($type === 'info') {
            echo '<p>';
            echo '<button type="button" class="button las-dismiss-low-conflicts">Dismiss Low Priority Conflicts</button>';
            echo '</p>';
        }

        echo '</div>';

        $this->add_conflict_resolution_script();
    }

    /**
     * Add JavaScript for conflict resolution
     */
    private function add_conflict_resolution_script() {
        static $script_added = false;

        if ($script_added) {
            return;
        }

        $script_added = true;

        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {

            $('.las-resolve-conflict').on('click', function() {
                var $button = $(this);
                var plugin = $button.data('plugin');
                var action = $button.data('action');

                $button.prop('disabled', true).text('Resolving...');

                $.post(ajaxurl, {
                    action: 'las_resolve_conflict',
                    plugin: plugin,
                    resolution_action: action,
                    nonce: '<?php echo wp_create_nonce('las_resolve_conflict'); ?>'
                }, function(response) {
                    if (response.success) {
                        $button.closest('.las-conflict-item').fadeOut();
                        if (response.data.message) {
                            alert(response.data.message);
                        }
                    } else {
                        alert('Failed to resolve conflict: ' + response.data.message);
                        $button.prop('disabled', false).text('Auto Resolve');
                    }
                });
            });

            $('.las-ignore-conflict').on('click', function() {
                var $button = $(this);
                var plugin = $button.data('plugin');

                $.post(ajaxurl, {
                    action: 'las_resolve_conflict',
                    plugin: plugin,
                    resolution_action: 'ignore',
                    nonce: '<?php echo wp_create_nonce('las_resolve_conflict'); ?>'
                }, function(response) {
                    if (response.success) {
                        $button.closest('.las-conflict-item').fadeOut();
                    }
                });
            });

            $('.las-dismiss-low-conflicts').on('click', function() {
                var $button = $(this);

                $.post(ajaxurl, {
                    action: 'las_resolve_conflict',
                    resolution_action: 'dismiss_low',
                    nonce: '<?php echo wp_create_nonce('las_resolve_conflict'); ?>'
                }, function(response) {
                    if (response.success) {
                        $button.closest('.las-conflict-notice').fadeOut();
                    }
                });
            });
        });
        </script>
        <style type="text/css">
        .las-conflict-notice {
            border-left-width: 4px;
        }
        .las-conflicts-list {
            margin: 10px 0;
        }
        .las-conflict-item {
            background: #f9f9f9;
            border: 1px solid #ddd;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .las-conflict-item h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .las-conflict-item p {
            margin: 5px 0;
        }
        .las-conflict-item .button {
            margin-right: 10px;
        }
        </style>
        <?php
    }

    /**
     * Handle AJAX conflict resolution
     */
    public function handle_conflict_resolution() {
        check_ajax_referer('las_resolve_conflict', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Insufficient permissions']);
        }

        $plugin = sanitize_text_field($_POST['plugin'] ?? '');
        $action = sanitize_text_field($_POST['resolution_action'] ?? '');

        switch ($action) {
            case 'auto_resolve':
                $result = $this->auto_resolve_conflict($plugin);
                break;

            case 'ignore':
                $result = $this->ignore_conflict($plugin);
                break;

            case 'dismiss_low':
                $result = $this->dismiss_low_priority_conflicts();
                break;

            default:
                wp_send_json_error(['message' => 'Invalid action']);
        }

        if ($result) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error(['message' => 'Failed to resolve conflict']);
        }
    }

    /**
     * Auto resolve conflict
     *
     * @param string $plugin Plugin path
     * @return array|false Result data or false on failure
     */
    private function auto_resolve_conflict($plugin) {
        $conflicts = get_option('las_fresh_detected_conflicts', []);

        if (!isset($conflicts[$plugin])) {
            return false;
        }

        $conflict = $conflicts[$plugin];
        $resolved = false;
        $message = '';

        switch ($conflict['type']) {
            case 'styling':

                $resolved = $this->resolve_styling_conflict($plugin);
                $message = 'Styling conflict resolved. LAS color system will take precedence.';
                break;

            case 'admin_ui':

                $resolved = $this->resolve_admin_ui_conflict($plugin);
                $message = 'Admin UI conflict detected. Consider using only one admin customization plugin.';
                break;

            case 'css':

                $resolved = $this->resolve_css_conflict($plugin);
                $message = 'CSS load order adjusted to prevent conflicts.';
                break;

            case 'javascript':

                $resolved = $this->resolve_js_conflict($plugin);
                $message = 'JavaScript compatibility mode enabled.';
                break;

            default:
                $resolved = $this->generic_conflict_resolution($plugin);
                $message = 'Conflict marked as resolved.';
        }

        if ($resolved) {

            unset($conflicts[$plugin]);
            update_option('las_fresh_detected_conflicts', $conflicts);

            return ['message' => $message];
        }

        return false;
    }

    /**
     * Resolve styling conflicts
     *
     * @param string $plugin Plugin path
     * @return bool Success
     */
    private function resolve_styling_conflict($plugin) {

        add_action('admin_head', function() {
            echo '<style type="text/css">';
            echo '';
            echo '.las-admin-active { position: relative; z-index: 999999; }';
            echo '.las-admin-active * { box-sizing: border-box; }';
            echo '</style>';
        }, 999);

        return true;
    }

    /**
     * Resolve admin UI conflicts
     *
     * @param string $plugin Plugin path
     * @return bool Success
     */
    private function resolve_admin_ui_conflict($plugin) {

        update_option('las_fresh_compatibility_mode', true);

        add_action('admin_head', function() {
            echo '<style type="text/css">';
            echo '';
            echo '.las-compatibility-mode .las-panel { z-index: 999998 !important; }';
            echo '.las-compatibility-mode .las-overlay { z-index: 999997 !important; }';
            echo '</style>';
        }, 1000);

        return true;
    }

    /**
     * Resolve CSS conflicts
     *
     * @param string $plugin Plugin path
     * @return bool Success
     */
    private function resolve_css_conflict($plugin) {

        add_action('admin_enqueue_scripts', function() {
            global $wp_styles;

            if (isset($wp_styles->registered['las-main'])) {
                $wp_styles->registered['las-main']->deps = array_merge(
                    $wp_styles->registered['las-main']->deps,
                    ['admin-bar', 'dashicons', 'common']
                );
            }
        }, 999);

        return true;
    }

    /**
     * Resolve JavaScript conflicts
     *
     * @param string $plugin Plugin path
     * @return bool Success
     */
    private function resolve_js_conflict($plugin) {

        add_action('admin_footer', function() {
            echo '<script type="text/javascript">';
            echo '';
            echo 'if (typeof window.LAS === "undefined") { window.LAS = {}; }';
            echo 'window.LAS.conflictResolution = true;';
            echo '</script>';
        }, 999);

        return true;
    }

    /**
     * Generic conflict resolution
     *
     * @param string $plugin Plugin path
     * @return bool Success
     */
    private function generic_conflict_resolution($plugin) {

        error_log("[LAS] Generic conflict resolution applied for: {$plugin}");

        add_action('admin_init', function() {

            add_action('admin_enqueue_scripts', 'las_enqueue_admin_assets', 999);
            add_action('admin_head', 'las_add_admin_styles', 999);
        });

        return true;
    }

    /**
     * Ignore conflict
     *
     * @param string $plugin Plugin path
     * @return array Result data
     */
    private function ignore_conflict($plugin) {
        $conflicts = get_option('las_fresh_detected_conflicts', []);

        unset($conflicts[$plugin]);
        update_option('las_fresh_detected_conflicts', $conflicts);

        $ignored = get_option('las_fresh_ignored_conflicts', []);
        $ignored[] = $plugin;
        update_option('las_fresh_ignored_conflicts', array_unique($ignored));

        return ['message' => 'Conflict ignored'];
    }

    /**
     * Dismiss low priority conflicts
     *
     * @return array Result data
     */
    private function dismiss_low_priority_conflicts() {
        update_user_meta(get_current_user_id(), 'las_dismissed_low_conflicts', true);

        return ['message' => 'Low priority conflicts dismissed'];
    }

    /**
     * Get conflict report
     *
     * @return array Conflict report
     */
    public function get_conflict_report() {
        $conflicts = get_option('las_fresh_detected_conflicts', []);
        $ignored = get_option('las_fresh_ignored_conflicts', []);

        return [
            'detected' => $conflicts,
            'ignored' => $ignored,
            'total_detected' => count($conflicts),
            'high_severity' => count(array_filter($conflicts, function($c) { return $c['severity'] === 'high'; })),
            'medium_severity' => count(array_filter($conflicts, function($c) { return $c['severity'] === 'medium'; })),
            'low_severity' => count(array_filter($conflicts, function($c) { return $c['severity'] === 'low'; }))
        ];
    }

    /**
     * Clear all conflicts (for testing)
     */
    public function clear_all_conflicts() {
        delete_option('las_fresh_detected_conflicts');
        delete_option('las_fresh_ignored_conflicts');
        delete_user_meta(get_current_user_id(), 'las_dismissed_low_conflicts');
    }
}