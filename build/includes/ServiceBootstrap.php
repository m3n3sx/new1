<?php
/**
 * Service Bootstrap - Initialize and register all core services
 *
 * This file demonstrates how to properly initialize the CoreEngine
 * and register all services with their dependencies.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/CoreEngine.php';
require_once __DIR__ . '/SecurityManager.php';
require_once __DIR__ . '/CacheManager.php';

/**
 * Bootstrap class for initializing services
 */
class LAS_ServiceBootstrap {

    /**
     * CoreEngine instance
     * @var LAS_CoreEngine
     */
    private $core;

    /**
     * Constructor
     */
    public function __construct() {
        $this->core = LAS_CoreEngine::getInstance();
        $this->register_services();
    }

    /**
     * Register all core services with their dependencies
     */
    private function register_services() {

        $this->core->register('cache', function() {
            $config = [
                'memory_limit' => 10 * 1024 * 1024,
                'default_ttl' => 3600,
                'enable_object_cache' => true,
                'enable_transients' => true,
                'enable_memory_cache' => true
            ];
            return new LAS_CacheManager($config);
        });

        $this->core->register('security', function() {
            return new LAS_SecurityManager();
        });

        $this->core->register('settings', function($cache, $security) {
            return new LAS_SettingsManager($cache, $security);
        }, ['cache', 'security']);

        $this->core->register('style_generator', function($cache, $security) {
            return new LAS_StyleGenerator($cache, $security);
        }, ['cache', 'security']);

        $this->core->register('communication', function($security) {
            return new LAS_CommunicationManager($security);
        }, ['security']);

        $this->core->register('asset_loader', function($cache) {
            return new LAS_AssetLoader($cache);
        }, ['cache']);

        $this->core->register('admin_interface', function($settings, $security, $asset_loader) {
            return new LAS_AdminInterface($settings, $security, $asset_loader);
        }, ['settings', 'security', 'asset_loader']);
    }

    /**
     * Get service instance
     *
     * @param string $service_name Service name
     * @return mixed Service instance
     */
    public function get($service_name) {
        return $this->core->get($service_name);
    }

    /**
     * Check if service is available
     *
     * @param string $service_name Service name
     * @return bool
     */
    public function has($service_name) {
        return $this->core->has($service_name);
    }

    /**
     * Get all registered services
     *
     * @return array
     */
    public function getRegisteredServices() {
        return $this->core->getRegisteredServices();
    }

    /**
     * Get system status and metrics
     *
     * @return array
     */
    public function getSystemStatus() {
        $cache = $this->core->get('cache');
        $core_metrics = $this->core->getMemoryStats();
        $cache_metrics = $cache->getMetrics();

        return [
            'core_engine' => [
                'services_registered' => count($this->core->getRegisteredServices()),
                'services_instantiated' => count($this->core->getInstantiatedServices()),
                'memory_usage' => $core_metrics['current_usage'],
                'peak_memory' => $core_metrics['peak_usage']
            ],
            'cache_manager' => [
                'hit_rate' => $cache_metrics['hit_rate'],
                'memory_usage_mb' => $cache_metrics['memory_usage_mb'],
                'cache_efficiency' => $cache_metrics['cache_efficiency'],
                'total_operations' => $cache_metrics['hits'] + $cache_metrics['misses']
            ],
            'system' => [
                'php_memory_usage' => memory_get_usage(true),
                'php_peak_memory' => memory_get_peak_usage(true),
                'wordpress_version' => get_bloginfo('version'),
                'php_version' => PHP_VERSION
            ]
        ];
    }

    /**
     * Initialize services for WordPress hooks
     */
    public function init_wordpress_integration() {

        add_action('init', [$this, 'on_wordpress_init']);
        add_action('admin_init', [$this, 'on_admin_init']);
        add_action('wp_ajax_las_action', [$this, 'handle_ajax_request']);
        add_action('wp_ajax_nopriv_las_action', [$this, 'handle_ajax_request']);
    }

    /**
     * WordPress init hook handler
     */
    public function on_wordpress_init() {

        $security = $this->core->get('security');
        $cache = $this->core->get('cache');

        $cache->warmUp([
            'plugin_version' => function() { return LAS_VERSION ?? '2.0.0'; },
            'user_capabilities' => function() { return current_user_can('manage_options'); }
        ], 'system');
    }

    /**
     * Admin init hook handler
     */
    public function on_admin_init() {
        if (!is_admin()) {
            return;
        }

        $security = $this->core->get('security');

        if (!$security->checkCapability('manage_options')) {
            return;
        }

    }

    /**
     * Handle AJAX requests
     */
    public function handle_ajax_request() {
        $security = $this->core->get('security');

        if (!$security->validateNonce($_POST['nonce'] ?? '', 'ajax_action')) {
            wp_die('Security check failed');
        }

        wp_send_json_success(['message' => 'Services are working correctly']);
    }
}