<?php
/**
 * Live Admin Styler - Settings Storage
 *
 * Efficient database operations for settings persistence with caching,
 * batch operations, and performance optimization.
 *
 * @package LiveAdminStyler
 * @version 1.2.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Settings Storage class for Live Admin Styler
 *
 * Handles all database operations for settings with caching layer,
 * batch operations, and performance optimization.
 */
class LAS_Settings_Storage {

    /**
     * Option prefix for database storage
     * @var string
     */
    private $option_prefix = 'las_';

    /**
     * Cache group for WordPress object cache
     * @var string
     */
    private $cache_group = 'las_settings';

    /**
     * Cache expiration time in seconds
     * @var int
     */
    private $cache_expiration = 3600;

    /**
     * Default settings values
     * @var array
     */
    private $default_settings = [

        'menu_background_color' => '#23282d',
        'menu_text_color' => '#ffffff',
        'menu_hover_color' => '#0073aa',
        'menu_active_color' => '#0073aa',
        'menu_font_size' => '14',
        'menu_font_family' => 'default',

        'adminbar_background' => '#23282d',
        'adminbar_text_color' => '#ffffff',
        'adminbar_hover_color' => '#0073aa',
        'adminbar_height' => '32',

        'content_background' => '#f1f1f1',
        'content_text_color' => '#333333',
        'content_link_color' => '#0073aa',

        'enable_live_preview' => true,
        'enable_custom_css' => false,
        'enable_responsive_design' => true,

        'animation_speed' => 'normal',
        'cache_css' => true,
        'minify_css' => false,

        'custom_css' => '',
        'admin_menu_detached' => false,
        'admin_bar_detached' => false
    ];

    /**
     * Batch operation queue
     * @var array
     */
    private $batch_queue = [];

    /**
     * Performance metrics
     * @var array
     */
    private $performance_metrics = [];

    /**
     * Constructor
     */
    public function __construct() {

        wp_cache_add_global_groups([$this->cache_group]);

        add_action('shutdown', [$this, 'process_batch_queue']);
    }

    /**
     * Save settings to database with caching
     *
     * @param array $settings Settings to save
     * @return bool True on success, false on failure
     */
    public function save_settings($settings) {
        if (!is_array($settings) || empty($settings)) {
            return false;
        }

        $start_time = microtime(true);
        $success_count = 0;
        $total_count = count($settings);

        try {

            global $wpdb;
            $wpdb->query('START TRANSACTION');

            foreach ($settings as $key => $value) {
                $option_name = $this->get_option_name($key);

                if (!$this->is_valid_setting_key($key)) {
                    continue;
                }

                $result = update_option($option_name, $value, false);

                if ($result || get_option($option_name) === $value) {
                    $success_count++;

                    $this->set_cache($key, $value);

                    $this->clear_related_caches($key);
                } else {
                    error_log("[LAS] Failed to save setting: $key");
                }
            }

            $wpdb->query('COMMIT');

            $execution_time = (microtime(true) - $start_time) * 1000;
            $this->record_performance_metric('save_settings', [
                'execution_time_ms' => $execution_time,
                'settings_count' => $total_count,
                'success_count' => $success_count,
                'memory_usage' => memory_get_usage(true)
            ]);

            do_action('las_settings_saved', $settings, $success_count, $total_count);

            return $success_count === $total_count;

        } catch (Exception $e) {

            global $wpdb;
            $wpdb->query('ROLLBACK');

            error_log('[LAS] Settings save error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Load settings from database with caching
     *
     * @param array $keys Specific keys to load (optional)
     * @return array Settings array
     */
    public function load_settings($keys = null) {
        $start_time = microtime(true);

        $keys_to_load = $keys ?: array_keys($this->default_settings);
        $settings = [];
        $cache_hits = 0;
        $cache_misses = 0;

        foreach ($keys_to_load as $key) {

            $cached_value = $this->get_cache($key);

            if ($cached_value !== false) {
                $settings[$key] = $cached_value;
                $cache_hits++;
            } else {

                $option_name = $this->get_option_name($key);
                $default_value = $this->default_settings[$key] ?? null;
                $value = get_option($option_name, $default_value);

                $settings[$key] = $value;
                $cache_misses++;

                $this->set_cache($key, $value);
            }
        }

        $execution_time = (microtime(true) - $start_time) * 1000;
        $this->record_performance_metric('load_settings', [
            'execution_time_ms' => $execution_time,
            'settings_count' => count($settings),
            'cache_hits' => $cache_hits,
            'cache_misses' => $cache_misses,
            'cache_hit_ratio' => $cache_hits / ($cache_hits + $cache_misses),
            'memory_usage' => memory_get_usage(true)
        ]);

        return $settings;
    }

    /**
     * Reset settings to default values
     *
     * @return bool True on success, false on failure
     */
    public function reset_settings() {
        $start_time = microtime(true);

        try {

            global $wpdb;
            $wpdb->query('START TRANSACTION');

            $success_count = 0;
            $total_count = count($this->default_settings);

            foreach ($this->default_settings as $key => $default_value) {
                $option_name = $this->get_option_name($key);

                $result = update_option($option_name, $default_value, false);

                if ($result || get_option($option_name) === $default_value) {
                    $success_count++;

                    $this->set_cache($key, $default_value);
                }
            }

            $wpdb->query('COMMIT');

            $this->clear_all_caches();

            $execution_time = (microtime(true) - $start_time) * 1000;
            $this->record_performance_metric('reset_settings', [
                'execution_time_ms' => $execution_time,
                'settings_count' => $total_count,
                'success_count' => $success_count
            ]);

            do_action('las_settings_reset', $this->default_settings);

            return $success_count === $total_count;

        } catch (Exception $e) {

            global $wpdb;
            $wpdb->query('ROLLBACK');

            error_log('[LAS] Settings reset error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Queue settings for batch save operation
     *
     * @param array $settings Settings to queue
     */
    public function queue_batch_save($settings) {
        if (!is_array($settings)) {
            return;
        }

        $this->batch_queue = array_merge($this->batch_queue, $settings);
    }

    /**
     * Process queued batch operations
     */
    public function process_batch_queue() {
        if (empty($this->batch_queue)) {
            return;
        }

        $this->save_settings($this->batch_queue);
        $this->batch_queue = [];
    }

    /**
     * Get single setting value with caching
     *
     * @param string $key Setting key
     * @param mixed $default Default value
     * @return mixed Setting value
     */
    public function get_setting($key, $default = null) {

        $cached_value = $this->get_cache($key);

        if ($cached_value !== false) {
            return $cached_value;
        }

        $option_name = $this->get_option_name($key);
        $default_value = $default ?? ($this->default_settings[$key] ?? null);
        $value = get_option($option_name, $default_value);

        $this->set_cache($key, $value);

        return $value;
    }

    /**
     * Set single setting value with caching
     *
     * @param string $key Setting key
     * @param mixed $value Setting value
     * @return bool True on success, false on failure
     */
    public function set_setting($key, $value) {
        if (!$this->is_valid_setting_key($key)) {
            return false;
        }

        $option_name = $this->get_option_name($key);
        $result = update_option($option_name, $value, false);

        if ($result || get_option($option_name) === $value) {

            $this->set_cache($key, $value);

            $this->clear_related_caches($key);

            return true;
        }

        return false;
    }

    /**
     * Delete setting from database and cache
     *
     * @param string $key Setting key
     * @return bool True on success, false on failure
     */
    public function delete_setting($key) {
        $option_name = $this->get_option_name($key);
        $result = delete_option($option_name);

        if ($result) {

            $this->delete_cache($key);

            $this->clear_related_caches($key);
        }

        return $result;
    }

    /**
     * Get default settings
     *
     * @return array Default settings
     */
    public function get_default_settings() {
        return $this->default_settings;
    }

    /**
     * Check if setting key exists in defaults
     *
     * @param string $key Setting key
     * @return bool True if exists, false otherwise
     */
    public function has_default_setting($key) {
        return array_key_exists($key, $this->default_settings);
    }

    /**
     * Get performance metrics
     *
     * @return array Performance metrics
     */
    public function get_performance_metrics() {
        return $this->performance_metrics;
    }

    /**
     * Export settings for backup/migration
     *
     * @return array Settings export data
     */
    public function export_settings() {
        $settings = $this->load_settings();

        return [
            'version' => '1.2.0',
            'timestamp' => current_time('mysql'),
            'site_url' => get_site_url(),
            'settings' => $settings,
            'defaults' => $this->default_settings
        ];
    }

    /**
     * Import settings from backup/migration
     *
     * @param array $import_data Import data
     * @return bool True on success, false on failure
     */
    public function import_settings($import_data) {
        if (!is_array($import_data) || !isset($import_data['settings'])) {
            return false;
        }

        if (!isset($import_data['version']) || !isset($import_data['settings'])) {
            return false;
        }

        $valid_settings = [];
        foreach ($import_data['settings'] as $key => $value) {
            if ($this->is_valid_setting_key($key)) {
                $valid_settings[$key] = $value;
            }
        }

        if (empty($valid_settings)) {
            return false;
        }

        return $this->save_settings($valid_settings);
    }

    /**
     * Get option name with prefix
     *
     * @param string $key Setting key
     * @return string Full option name
     */
    private function get_option_name($key) {
        return $this->option_prefix . $key;
    }

    /**
     * Validate setting key
     *
     * @param string $key Setting key
     * @return bool True if valid, false otherwise
     */
    private function is_valid_setting_key($key) {

        return array_key_exists($key, $this->default_settings) ||
               preg_match('/^[a-zA-Z0-9_-]+$/', $key);
    }

    /**
     * Get value from cache
     *
     * @param string $key Cache key
     * @return mixed Cached value or false if not found
     */
    private function get_cache($key) {
        return wp_cache_get($key, $this->cache_group);
    }

    /**
     * Set value in cache
     *
     * @param string $key Cache key
     * @param mixed $value Value to cache
     */
    private function set_cache($key, $value) {
        wp_cache_set($key, $value, $this->cache_group, $this->cache_expiration);
    }

    /**
     * Delete value from cache
     *
     * @param string $key Cache key
     */
    private function delete_cache($key) {
        wp_cache_delete($key, $this->cache_group);
    }

    /**
     * Clear related caches when a setting changes
     *
     * @param string $key Setting key that changed
     */
    private function clear_related_caches($key) {

        if (strpos($key, '_color') !== false ||
            strpos($key, '_font') !== false ||
            strpos($key, 'custom_css') !== false) {
            wp_cache_delete('las_generated_css', 'las_css');
        }

        wp_cache_delete('las_preview_css', 'las_preview');

        wp_cache_delete('las_settings_summary', $this->cache_group);
    }

    /**
     * Clear all LAS caches
     */
    private function clear_all_caches() {

        foreach (array_keys($this->default_settings) as $key) {
            $this->delete_cache($key);
        }

        wp_cache_delete('las_generated_css', 'las_css');
        wp_cache_delete('las_preview_css', 'las_preview');
        wp_cache_delete('las_settings_summary', $this->cache_group);
    }

    /**
     * Record performance metric
     *
     * @param string $operation Operation name
     * @param array $metrics Metrics data
     */
    private function record_performance_metric($operation, $metrics) {
        $this->performance_metrics[$operation][] = array_merge([
            'timestamp' => microtime(true),
            'memory_peak' => memory_get_peak_usage(true)
        ], $metrics);

        if (count($this->performance_metrics[$operation]) > 100) {
            $this->performance_metrics[$operation] = array_slice(
                $this->performance_metrics[$operation], -100
            );
        }

        if (isset($metrics['execution_time_ms']) && $metrics['execution_time_ms'] > 1000) {
            error_log(sprintf(
                '[LAS] Slow database operation: %s took %dms',
                $operation,
                $metrics['execution_time_ms']
            ));
        }
    }

    /**
     * Optimize database tables (maintenance function)
     *
     * @return bool True on success, false on failure
     */
    public function optimize_database() {
        global $wpdb;

        try {

            $options = $wpdb->get_results($wpdb->prepare(
                "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
                $this->option_prefix . '%'
            ));

            $optimized_count = 0;

            foreach ($options as $option) {

                $wpdb->update(
                    $wpdb->options,
                    ['autoload' => 'no'],
                    ['option_name' => $option->option_name],
                    ['%s'],
                    ['%s']
                );
                $optimized_count++;
            }

            $wpdb->query("OPTIMIZE TABLE {$wpdb->options}");

            error_log("[LAS] Database optimization completed: $optimized_count options optimized");

            return true;

        } catch (Exception $e) {
            error_log('[LAS] Database optimization error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get database statistics
     *
     * @return array Database statistics
     */
    public function get_database_stats() {
        global $wpdb;

        $stats = [];

        try {

            $option_count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
                $this->option_prefix . '%'
            ));

            $total_size = $wpdb->get_var($wpdb->prepare(
                "SELECT SUM(LENGTH(option_value)) FROM {$wpdb->options} WHERE option_name LIKE %s",
                $this->option_prefix . '%'
            ));

            $stats = [
                'option_count' => intval($option_count),
                'total_size_bytes' => intval($total_size),
                'total_size_formatted' => size_format($total_size),
                'average_size_bytes' => $option_count > 0 ? round($total_size / $option_count, 2) : 0,
                'cache_hit_ratio' => $this->calculate_cache_hit_ratio(),
                'performance_metrics' => $this->get_performance_summary()
            ];

        } catch (Exception $e) {
            error_log('[LAS] Database stats error: ' . $e->getMessage());
            $stats['error'] = $e->getMessage();
        }

        return $stats;
    }

    /**
     * Calculate cache hit ratio from performance metrics
     *
     * @return float Cache hit ratio (0-1)
     */
    private function calculate_cache_hit_ratio() {
        if (empty($this->performance_metrics['load_settings'])) {
            return 0;
        }

        $total_hits = 0;
        $total_requests = 0;

        foreach ($this->performance_metrics['load_settings'] as $metric) {
            if (isset($metric['cache_hit_ratio'])) {
                $total_hits += $metric['cache_hit_ratio'];
                $total_requests++;
            }
        }

        return $total_requests > 0 ? $total_hits / $total_requests : 0;
    }

    /**
     * Get performance summary
     *
     * @return array Performance summary
     */
    private function get_performance_summary() {
        $summary = [];

        foreach ($this->performance_metrics as $operation => $metrics) {
            if (empty($metrics)) continue;

            $execution_times = array_column($metrics, 'execution_time_ms');
            $memory_usage = array_column($metrics, 'memory_usage');

            $summary[$operation] = [
                'count' => count($metrics),
                'avg_execution_time_ms' => array_sum($execution_times) / count($execution_times),
                'max_execution_time_ms' => max($execution_times),
                'min_execution_time_ms' => min($execution_times),
                'avg_memory_usage' => array_sum($memory_usage) / count($memory_usage),
                'max_memory_usage' => max($memory_usage)
            ];
        }

        return $summary;
    }
}