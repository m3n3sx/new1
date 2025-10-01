<?php
/**
 * Update Manager for Live Admin Styler
 *
 * Handles plugin updates, version checking, and migration
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class UpdateManager {

    private $plugin_file;
    private $plugin_slug;
    private $version;
    private $cache_key;
    private $cache_allowed;

    public function __construct($plugin_file) {
        $this->plugin_file = $plugin_file;
        $this->plugin_slug = plugin_basename($plugin_file);
        $this->version = LAS_VERSION;
        $this->cache_key = 'las_update_check';
        $this->cache_allowed = true;

        add_filter('pre_set_site_transient_update_plugins', [$this, 'check_for_update']);
        add_filter('plugins_api', [$this, 'plugin_info'], 20, 3);
        add_action('upgrader_process_complete', [$this, 'after_update'], 10, 2);
        add_action('admin_notices', [$this, 'update_notices']);
    }

    /**
     * Check for plugin updates
     */
    public function check_for_update($transient) {
        if (empty($transient->checked)) {
            return $transient;
        }

        $remote_version = $this->get_remote_version();

        if (!$remote_version) {
            return $transient;
        }

        if (version_compare($this->version, $remote_version['version'], '<')) {
            $transient->response[$this->plugin_slug] = (object) [
                'slug' => dirname($this->plugin_slug),
                'plugin' => $this->plugin_slug,
                'new_version' => $remote_version['version'],
                'url' => $remote_version['details_url'],
                'package' => $remote_version['download_url'],
                'tested' => $remote_version['tested'],
                'requires_php' => $remote_version['requires_php'],
                'compatibility' => new stdClass()
            ];
        }

        return $transient;
    }

    /**
     * Get plugin information for update screen
     */
    public function plugin_info($result, $action, $args) {
        if ($action !== 'plugin_information') {
            return $result;
        }

        if (!isset($args->slug) || $args->slug !== dirname($this->plugin_slug)) {
            return $result;
        }

        $remote_version = $this->get_remote_version();

        if (!$remote_version) {
            return $result;
        }

        return (object) [
            'name' => $remote_version['name'],
            'slug' => dirname($this->plugin_slug),
            'version' => $remote_version['version'],
            'author' => $remote_version['author'],
            'author_profile' => $remote_version['author_profile'],
            'requires' => $remote_version['requires'],
            'tested' => $remote_version['tested'],
            'requires_php' => $remote_version['requires_php'],
            'download_link' => $remote_version['download_url'],
            'trunk' => $remote_version['download_url'],
            'last_updated' => $remote_version['last_updated'],
            'sections' => [
                'description' => $remote_version['description'],
                'changelog' => $this->get_changelog(),
                'upgrade_notice' => $remote_version['upgrade_notice'] ?? ''
            ],
            'banners' => $remote_version['banners'] ?? [],
            'icons' => $remote_version['icons'] ?? []
        ];
    }

    /**
     * Handle post-update actions
     */
    public function after_update($upgrader_object, $options) {
        if ($options['action'] !== 'update' || $options['type'] !== 'plugin') {
            return;
        }

        if (!isset($options['plugins']) || !is_array($options['plugins'])) {
            return;
        }

        if (in_array($this->plugin_slug, $options['plugins'])) {

            delete_transient($this->cache_key);

            $this->run_migration();

            $this->log_update();
        }
    }

    /**
     * Display update notices
     */
    public function update_notices() {

        if ($this->needs_migration()) {
            $this->show_migration_notice();
        }

        if ($this->has_compatibility_issues()) {
            $this->show_compatibility_notice();
        }
    }

    /**
     * Get remote version information
     */
    private function get_remote_version() {
        $cache_key = $this->cache_key;

        if ($this->cache_allowed) {
            $cached = get_transient($cache_key);
            if ($cached !== false) {
                return $cached;
            }
        }

        $version_info = $this->get_local_version_info();

        if ($this->cache_allowed) {
            set_transient($cache_key, $version_info, 12 * HOUR_IN_SECONDS);
        }

        return $version_info;
    }

    /**
     * Get local version information
     */
    private function get_local_version_info() {
        $version_file = dirname($this->plugin_file) . '/version-control.json';

        if (!file_exists($version_file)) {
            return false;
        }

        $version_data = json_decode(file_get_contents($version_file), true);

        if (!$version_data) {
            return false;
        }

        return [
            'version' => $version_data['version'],
            'name' => $version_data['name'],
            'description' => $version_data['description'],
            'author' => $version_data['author'],
            'author_profile' => $version_data['author_uri'],
            'requires' => $version_data['wordpress_version_required'],
            'tested' => $version_data['tested_up_to'],
            'requires_php' => $version_data['php_version_required'],
            'last_updated' => $version_data['build_date'],
            'download_url' => $version_data['plugin_uri'] . '/releases/latest',
            'details_url' => $version_data['plugin_uri'],
            'upgrade_notice' => $this->get_upgrade_notice($version_data)
        ];
    }

    /**
     * Get upgrade notice for version
     */
    private function get_upgrade_notice($version_data) {
        $current_version = $this->version;
        $new_version = $version_data['version'];

        if (!isset($version_data['changelog'][$new_version])) {
            return '';
        }

        $changelog = $version_data['changelog'][$new_version];

        $notice = "Live Admin Styler v{$new_version} includes:\n";

        if (!empty($changelog['changes'])) {
            $notice .= "\nNew Features & Improvements:\n";
            foreach (array_slice($changelog['changes'], 0, 3) as $change) {
                $notice .= "• {$change}\n";
            }
        }

        if (!empty($changelog['breaking_changes'])) {
            $notice .= "\n⚠️ Breaking Changes:\n";
            foreach ($changelog['breaking_changes'] as $change) {
                $notice .= "• {$change}\n";
            }
        }

        if (!empty($changelog['migration_notes'])) {
            $notice .= "\n📋 Migration Notes:\n";
            foreach ($changelog['migration_notes'] as $note) {
                $notice .= "• {$note}\n";
            }
        }

        return $notice;
    }

    /**
     * Get changelog for display
     */
    private function get_changelog() {
        $version_file = dirname($this->plugin_file) . '/version-control.json';

        if (!file_exists($version_file)) {
            return 'Changelog not available.';
        }

        $version_data = json_decode(file_get_contents($version_file), true);

        if (!$version_data || !isset($version_data['changelog'])) {
            return 'Changelog not available.';
        }

        $changelog = '';

        foreach ($version_data['changelog'] as $version => $info) {
            $changelog .= "<h3>Version {$version} - {$info['date']}</h3>\n";

            if (!empty($info['changes'])) {
                $changelog .= "<h4>Changes:</h4>\n<ul>\n";
                foreach ($info['changes'] as $change) {
                    $changelog .= "<li>{$change}</li>\n";
                }
                $changelog .= "</ul>\n";
            }

            if (!empty($info['breaking_changes'])) {
                $changelog .= "<h4>Breaking Changes:</h4>\n<ul>\n";
                foreach ($info['breaking_changes'] as $change) {
                    $changelog .= "<li><strong>{$change}</strong></li>\n";
                }
                $changelog .= "</ul>\n";
            }
        }

        return $changelog;
    }

    /**
     * Check if migration is needed
     */
    private function needs_migration() {
        $db_version = get_option('las_fresh_db_version', '0.0.0');
        return version_compare($db_version, $this->version, '<');
    }

    /**
     * Run database migration
     */
    private function run_migration() {
        $db_version = get_option('las_fresh_db_version', '0.0.0');

        if (version_compare($db_version, $this->version, '>=')) {
            return;
        }

        if (version_compare($db_version, '2.0.0', '<')) {
            $this->migrate_from_v1();
        }

        update_option('las_fresh_db_version', $this->version);

        error_log("Live Admin Styler: Migrated from v{$db_version} to v{$this->version}");
    }

    /**
     * Migrate settings from v1.x
     */
    private function migrate_from_v1() {

        $old_settings = get_option('las_settings', []);

        if (empty($old_settings)) {
            return;
        }

        $new_settings = [
            'general' => [
                'theme_mode' => 'auto',
                'animation_speed' => 'normal',
                'live_preview' => true
            ],
            'menu' => [
                'background_color' => $old_settings['menu_bg_color'] ?? '#23282d',
                'text_color' => $old_settings['menu_text_color'] ?? '#ffffff',
                'hover_color' => $old_settings['menu_hover_color'] ?? '#0073aa',
                'active_color' => $old_settings['menu_active_color'] ?? '#0073aa'
            ],
            'adminbar' => [
                'background_color' => $old_settings['adminbar_bg_color'] ?? '#23282d',
                'height' => $old_settings['adminbar_height'] ?? '32px',
                'position' => 'fixed'
            ],
            'content' => [
                'background_color' => $old_settings['content_bg_color'] ?? '#f1f1f1',
                'font_family' => 'system',
                'font_size' => '14px'
            ]
        ];

        foreach ($new_settings as $section => $settings) {
            foreach ($settings as $key => $value) {
                update_option("las_fresh_{$section}_{$key}", $value);
            }
        }

        update_option('las_fresh_migration_v1_complete', true);

        update_option('las_settings_backup_v1', $old_settings);
    }

    /**
     * Check for compatibility issues
     */
    private function has_compatibility_issues() {
        global $wp_version;

        if (version_compare($wp_version, '6.0', '<')) {
            return true;
        }

        if (version_compare(PHP_VERSION, '7.4', '<')) {
            return true;
        }

        $conflicting_plugins = [
            'admin-color-schemes/admin-color-schemes.php',
            'admin-menu-editor/menu-editor.php'
        ];

        foreach ($conflicting_plugins as $plugin) {
            if (is_plugin_active($plugin)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Show migration notice
     */
    private function show_migration_notice() {
        $class = 'notice notice-info is-dismissible';
        $message = __('Live Admin Styler has been updated and needs to migrate your settings. This will happen automatically.', 'live-admin-styler');

        printf('<div class="%1$s"><p>%2$s</p></div>', esc_attr($class), esc_html($message));
    }

    /**
     * Show compatibility notice
     */
    private function show_compatibility_notice() {
        $class = 'notice notice-warning';
        $message = __('Live Admin Styler detected compatibility issues. Please check system requirements and active plugins.', 'live-admin-styler');

        printf('<div class="%1$s"><p>%2$s</p></div>', esc_attr($class), esc_html($message));
    }

    /**
     * Log successful update
     */
    private function log_update() {
        $log_entry = [
            'timestamp' => current_time('mysql'),
            'version' => $this->version,
            'user_id' => get_current_user_id(),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];

        $update_log = get_option('las_fresh_update_log', []);
        $update_log[] = $log_entry;

        $update_log = array_slice($update_log, -10);

        update_option('las_fresh_update_log', $update_log);
    }

    /**
     * Force update check
     */
    public function force_update_check() {
        delete_transient($this->cache_key);
        wp_update_plugins();
    }

    /**
     * Get update information
     */
    public function get_update_info() {
        return [
            'current_version' => $this->version,
            'remote_version' => $this->get_remote_version(),
            'needs_migration' => $this->needs_migration(),
            'has_compatibility_issues' => $this->has_compatibility_issues(),
            'last_check' => get_transient($this->cache_key . '_last_check')
        ];
    }
}