<?php
/**
 * AssetLoader Service
 *
 * Handles conditional loading of CSS and JavaScript assets with dependency management,
 * version control, and optimization features.
 *
 * @package LiveAdminStyler
 * @since 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class AssetLoader {

    /**
     * @var CacheManager Cache manager instance
     */
    private $cache;

    /**
     * @var SecurityManager Security manager instance
     */
    private $security;

    /**
     * @var array Registered assets
     */
    private $assets = [];

    /**
     * @var array Asset dependencies
     */
    private $dependencies = [];

    /**
     * @var string Plugin version for cache busting
     */
    private $version;

    /**
     * @var bool Whether to use minified assets
     */
    private $use_minified;

    /**
     * Constructor
     *
     * @param CacheManager $cache Cache manager instance
     * @param SecurityManager $security Security manager instance
     */
    public function __construct(CacheManager $cache, SecurityManager $security) {
        $this->cache = $cache;
        $this->security = $security;
        $this->version = defined('LAS_VERSION') ? LAS_VERSION : '2.0.0';
        $this->use_minified = !defined('WP_DEBUG') || !WP_DEBUG;

        $this->init();
    }

    /**
     * Initialize the asset loader
     */
    private function init() {
        add_action('admin_enqueue_scripts', [$this, 'enqueueAssets']);
        add_action('wp_enqueue_scripts', [$this, 'enqueueFrontendAssets']);

        $this->registerCoreAssets();
    }

    /**
     * Register core plugin assets
     */
    private function registerCoreAssets() {

        $this->registerCSS('las-main', 'assets/css/las-main.css', [], [
            'context' => 'admin',
            'conditional' => true,
            'critical' => true
        ]);

        $this->registerCSS('las-live-edit', 'assets/css/las-live-edit.css', ['las-main'], [
            'context' => 'admin',
            'conditional' => 'live_edit_mode',
            'critical' => false
        ]);

        $this->registerCSS('las-utilities', 'assets/css/las-utilities.css', ['las-main'], [
            'context' => 'admin',
            'conditional' => true,
            'critical' => false
        ]);

        $this->registerJS('las-core', 'assets/js/las-core.js', ['jquery'], [
            'context' => 'admin',
            'conditional' => true,
            'footer' => true,
            'module' => true
        ]);

        $this->registerJS('las-settings-manager', 'assets/js/settings-manager.js', ['las-core'], [
            'context' => 'admin',
            'conditional' => true,
            'footer' => true,
            'module' => true
        ]);

        $this->registerJS('las-live-preview', 'assets/js/live-preview.js', ['las-core', 'las-settings-manager'], [
            'context' => 'admin',
            'conditional' => 'live_preview_enabled',
            'footer' => true,
            'module' => true
        ]);
    }

    /**
     * Register a CSS asset
     *
     * @param string $handle Asset handle
     * @param string $src Asset source path
     * @param array $deps Dependencies
     * @param array $options Asset options
     */
    public function registerCSS($handle, $src, $deps = [], $options = []) {
        $this->assets[$handle] = [
            'type' => 'css',
            'src' => $src,
            'deps' => $deps,
            'options' => wp_parse_args($options, [
                'context' => 'admin',
                'conditional' => false,
                'critical' => false,
                'media' => 'all'
            ])
        ];

        $this->dependencies[$handle] = $deps;
    }

    /**
     * Register a JavaScript asset
     *
     * @param string $handle Asset handle
     * @param string $src Asset source path
     * @param array $deps Dependencies
     * @param array $options Asset options
     */
    public function registerJS($handle, $src, $deps = [], $options = []) {
        $this->assets[$handle] = [
            'type' => 'js',
            'src' => $src,
            'deps' => $deps,
            'options' => wp_parse_args($options, [
                'context' => 'admin',
                'conditional' => false,
                'footer' => true,
                'module' => false,
                'localize' => []
            ])
        ];

        $this->dependencies[$handle] = $deps;
    }

    /**
     * Enqueue admin assets
     *
     * @param string $hook_suffix Current admin page hook suffix
     */
    public function enqueueAssets($hook_suffix) {

        if (!$this->shouldLoadOnPage($hook_suffix)) {
            return;
        }

        foreach ($this->assets as $handle => $asset) {
            if ($asset['options']['context'] !== 'admin') {
                continue;
            }

            if ($this->shouldLoadAsset($handle, $asset)) {
                $this->enqueueAsset($handle, $asset);
            }
        }
    }

    /**
     * Enqueue frontend assets
     */
    public function enqueueFrontendAssets() {
        foreach ($this->assets as $handle => $asset) {
            if ($asset['options']['context'] !== 'frontend') {
                continue;
            }

            if ($this->shouldLoadAsset($handle, $asset)) {
                $this->enqueueAsset($handle, $asset);
            }
        }
    }

    /**
     * Enqueue a single asset
     *
     * @param string $handle Asset handle
     * @param array $asset Asset configuration
     */
    private function enqueueAsset($handle, $asset) {
        $src = $this->getAssetUrl($asset['src']);
        $version = $this->getAssetVersion($asset['src']);

        if ($asset['type'] === 'css') {
            wp_enqueue_style(
                $handle,
                $src,
                $asset['deps'],
                $version,
                $asset['options']['media']
            );

            if ($asset['options']['critical']) {
                $this->addCriticalCSS($handle, $asset);
            }

        } elseif ($asset['type'] === 'js') {
            wp_enqueue_script(
                $handle,
                $src,
                $asset['deps'],
                $version,
                $asset['options']['footer']
            );

            if ($asset['options']['module']) {
                add_filter('script_loader_tag', function($tag, $script_handle) use ($handle) {
                    if ($script_handle === $handle) {
                        return str_replace('<script ', '<script type="module" ', $tag);
                    }
                    return $tag;
                }, 10, 2);
            }

            if (!empty($asset['options']['localize'])) {
                wp_localize_script($handle, $asset['options']['localize']['object'], $asset['options']['localize']['data']);
            }
        }
    }

    /**
     * Check if assets should load on current page
     *
     * @param string $hook_suffix Current admin page hook suffix
     * @return bool
     */
    private function shouldLoadOnPage($hook_suffix) {
        $allowed_pages = [
            'toplevel_page_live-admin-styler',
            'admin_page_las-settings',
            'settings_page_live-admin-styler'
        ];

        return in_array($hook_suffix, $allowed_pages) ||
               apply_filters('las_load_assets_on_page', false, $hook_suffix);
    }

    /**
     * Check if a specific asset should be loaded
     *
     * @param string $handle Asset handle
     * @param array $asset Asset configuration
     * @return bool
     */
    private function shouldLoadAsset($handle, $asset) {
        $conditional = $asset['options']['conditional'];

        if ($conditional === false || $conditional === true) {
            return $conditional;
        }

        switch ($conditional) {
            case 'live_edit_mode':
                return $this->isLiveEditModeEnabled();

            case 'live_preview_enabled':
                return $this->isLivePreviewEnabled();

            case 'debug_mode':
                return defined('WP_DEBUG') && WP_DEBUG;

            default:
                return apply_filters("las_should_load_asset_{$handle}", true, $conditional);
        }
    }

    /**
     * Get asset URL with proper path resolution
     *
     * @param string $src Asset source path
     * @return string
     */
    private function getAssetUrl($src) {
        $plugin_url = plugin_dir_url(dirname(__FILE__));

        if ($this->use_minified) {
            $minified_src = $this->getMinifiedPath($src);
            if (file_exists(plugin_dir_path(dirname(__FILE__)) . $minified_src)) {
                $src = $minified_src;
            }
        }

        return $plugin_url . $src;
    }

    /**
     * Get minified asset path
     *
     * @param string $src Original asset path
     * @return string
     */
    private function getMinifiedPath($src) {
        $path_info = pathinfo($src);
        return $path_info['dirname'] . '/' . $path_info['filename'] . '.min.' . $path_info['extension'];
    }

    /**
     * Get asset version for cache busting
     *
     * @param string $src Asset source path
     * @return string
     */
    private function getAssetVersion($src) {
        $file_path = plugin_dir_path(dirname(__FILE__)) . $src;

        if (file_exists($file_path)) {
            return $this->version . '-' . filemtime($file_path);
        }

        return $this->version;
    }

    /**
     * Add critical CSS inline
     *
     * @param string $handle Asset handle
     * @param array $asset Asset configuration
     */
    private function addCriticalCSS($handle, $asset) {
        $critical_css = $this->cache->remember("critical_css_{$handle}", function() use ($asset) {
            $file_path = plugin_dir_path(dirname(__FILE__)) . $asset['src'];
            if (file_exists($file_path)) {
                $css = file_get_contents($file_path);
                return $this->extractCriticalCSS($css);
            }
            return '';
        }, 3600);

        if (!empty($critical_css)) {
            wp_add_inline_style($handle, $critical_css);
        }
    }

    /**
     * Extract critical CSS from full stylesheet
     *
     * @param string $css Full CSS content
     * @return string Critical CSS
     */
    private function extractCriticalCSS($css) {

        preg_match_all('/\/\*\s*critical\s*\*\/(.*?)\/\*\s*\/critical\s*\*\

        if (!empty($matches[1])) {
            return implode("\n", $matches[1]);
        }

        return substr($css, 0, 2048);
    }

    /**
     * Check if live edit mode is enabled
     *
     * @return bool
     */
    private function isLiveEditModeEnabled() {
        return get_user_meta(get_current_user_id(), 'las_live_edit_mode', true) === '1';
    }

    /**
     * Check if live preview is enabled
     *
     * @return bool
     */
    private function isLivePreviewEnabled() {
        return get_option('las_fresh_live_preview', true);
    }

    /**
     * Get dependency resolution order
     *
     * @param string $handle Asset handle
     * @return array Ordered list of dependencies
     */
    public function resolveDependencies($handle) {
        $resolved = [];
        $this->resolveDependenciesRecursive($handle, $resolved, []);
        return array_reverse($resolved);
    }

    /**
     * Recursively resolve dependencies
     *
     * @param string $handle Current asset handle
     * @param array &$resolved Resolved dependencies
     * @param array &$resolving Currently resolving (for circular detection)
     */
    private function resolveDependenciesRecursive($handle, &$resolved, &$resolving) {
        if (in_array($handle, $resolving)) {
            throw new Exception("Circular dependency detected: " . implode(' -> ', $resolving) . " -> {$handle}");
        }

        if (in_array($handle, $resolved)) {
            return;
        }

        $resolving[] = $handle;

        if (isset($this->dependencies[$handle])) {
            foreach ($this->dependencies[$handle] as $dep) {
                $this->resolveDependenciesRecursive($dep, $resolved, $resolving);
            }
        }

        array_pop($resolving);
        $resolved[] = $handle;
    }

    /**
     * Preload critical assets
     */
    public function preloadCriticalAssets() {
        $critical_assets = apply_filters('las_critical_assets', [
            'las-main' => 'style',
            'las-core' => 'script'
        ]);

        foreach ($critical_assets as $handle => $type) {
            if (isset($this->assets[$handle])) {
                $asset = $this->assets[$handle];
                $url = $this->getAssetUrl($asset['src']);

                echo sprintf(
                    '<link rel="preload" href="%s" as="%s" crossorigin="anonymous">',
                    esc_url($url),
                    esc_attr($type)
                );
            }
        }
    }

    /**
     * Get asset loading statistics
     *
     * @return array
     */
    public function getLoadingStats() {
        return [
            'total_assets' => count($this->assets),
            'loaded_assets' => count(array_filter($this->assets, [$this, 'shouldLoadAsset'])),
            'cache_hits' => $this->cache->getMetrics()['hits'] ?? 0,
            'cache_misses' => $this->cache->getMetrics()['misses'] ?? 0
        ];
    }
}