<?php
/**
 * UI Repair Asset Loader
 * Manages loading and dependency management for UI repair assets
 * 
 * @package LiveAdminStyler
 * @since 1.2.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * UI Repair Asset Loader Class
 * 
 * Handles proper WordPress asset enqueuing with dependency validation,
 * cache busting, version management, and fallback loading mechanisms
 * for the UI repair system.
 */
class LAS_UI_Repair_Asset_Loader {
    
    /**
     * Plugin version for cache busting
     *
     * @var string
     */
    private $version;
    
    /**
     * Plugin directory URL
     *
     * @var string
     */
    private $plugin_url;
    
    /**
     * Plugin directory path
     *
     * @var string
     */
    private $plugin_path;
    
    /**
     * Asset dependencies
     *
     * @var array
     */
    private $dependencies = array();
    
    /**
     * Loaded assets tracking
     *
     * @var array
     */
    private $loaded_assets = array();
    
    /**
     * Asset loading errors
     *
     * @var array
     */
    private $loading_errors = array();
    
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
        $this->version = defined('LAS_FRESH_VERSION') ? LAS_FRESH_VERSION : '1.2.0';
        $this->plugin_url = plugin_dir_url(dirname(__FILE__));
        $this->plugin_path = plugin_dir_path(dirname(__FILE__));
        $this->debug_mode = defined('WP_DEBUG') && WP_DEBUG;
        
        $this->init_dependencies();
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // Admin asset loading
        add_action('admin_enqueue_scripts', array($this, 'enqueue_ui_repair_assets'), 5);
        
        // Asset loading validation
        add_action('admin_footer', array($this, 'validate_asset_loading'));
        
        // AJAX handlers for asset management
        add_action('wp_ajax_las_validate_assets', array($this, 'ajax_validate_assets'));
        add_action('wp_ajax_las_reload_assets', array($this, 'ajax_reload_assets'));
        
        // Asset cleanup on plugin deactivation
        register_deactivation_hook(dirname(__FILE__) . '/live-admin-styler.php', array($this, 'cleanup_assets'));
    }
    
    /**
     * Initialize asset dependencies
     */
    private function init_dependencies() {
        $this->dependencies = array(
            'ui-repair-js' => array(
                'file' => 'assets/js/ui-repair.js',
                'deps' => array('jquery', 'wp-util'),
                'type' => 'script',
                'required' => true,
                'fallback' => 'enable_graceful_degradation'
            ),
            'ui-repair-css' => array(
                'file' => 'assets/css/ui-repair.css',
                'deps' => array(),
                'type' => 'style',
                'required' => true,
                'fallback' => 'load_minimal_styles'
            ),
            'jquery-ui-slider' => array(
                'file' => null, // WordPress core
                'deps' => array('jquery', 'jquery-ui-core'),
                'type' => 'script',
                'required' => false,
                'fallback' => 'use_native_range_inputs'
            ),
            'wp-color-picker' => array(
                'file' => null, // WordPress core
                'deps' => array('jquery'),
                'type' => 'script',
                'required' => false,
                'fallback' => 'use_native_color_inputs'
            ),
            'wp-color-picker-css' => array(
                'file' => null, // WordPress core
                'deps' => array(),
                'type' => 'style',
                'required' => false,
                'fallback' => null
            )
        );
    }
    
    /**
     * Enqueue UI repair assets on admin pages
     *
     * @param string $hook_suffix Current admin page hook suffix
     */
    public function enqueue_ui_repair_assets($hook_suffix) {
        // Only load on Live Admin Styler settings page
        if (!$this->should_load_assets($hook_suffix)) {
            return;
        }
        
        try {
            $this->log_debug('Starting UI repair asset loading...');
            
            // Validate environment before loading
            if (!$this->validate_environment()) {
                throw new Exception('Environment validation failed');
            }
            
            // Load core dependencies first
            $this->load_core_dependencies();
            
            // Load UI repair assets
            $this->load_ui_repair_assets();
            
            // Localize script data
            $this->localize_script_data();
            
            // Add inline styles for immediate fixes
            $this->add_inline_styles();
            
            $this->log_debug('UI repair assets loaded successfully');
            
        } catch (Exception $e) {
            $this->handle_loading_error($e);
        }
    }
    
    /**
     * Check if assets should be loaded on current page
     *
     * @param string $hook_suffix Current admin page hook suffix
     * @return bool
     */
    private function should_load_assets($hook_suffix) {
        // Load on Live Admin Styler settings page
        $settings_pages = array(
            'toplevel_page_live-admin-styler-settings',
            'admin_page_live-admin-styler-settings'
        );
        
        if (in_array($hook_suffix, $settings_pages)) {
            return true;
        }
        
        // Load on pages with LAS containers (for testing/debugging)
        if ($this->debug_mode && $this->has_las_container()) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if page has LAS container elements
     *
     * @return bool
     */
    private function has_las_container() {
        // This is a simple check - in real implementation, 
        // we might need to check via AJAX or other means
        return isset($_GET['page']) && strpos($_GET['page'], 'live-admin-styler') !== false;
    }
    
    /**
     * Validate environment for asset loading
     *
     * @return bool
     * @throws Exception
     */
    private function validate_environment() {
        // Check WordPress version
        global $wp_version;
        if (version_compare($wp_version, '5.0', '<')) {
            throw new Exception('WordPress version 5.0 or higher required');
        }
        
        // Check if we're in admin context
        if (!is_admin()) {
            throw new Exception('Not in admin context');
        }
        
        // Check user permissions
        if (!current_user_can('manage_options')) {
            throw new Exception('Insufficient user permissions');
        }
        
        // Check if jQuery is available
        if (!wp_script_is('jquery', 'registered')) {
            throw new Exception('jQuery not available');
        }
        
        return true;
    }
    
    /**
     * Load core WordPress dependencies
     */
    private function load_core_dependencies() {
        $core_deps = array(
            'jquery',
            'wp-util',
            'jquery-ui-core'
        );
        
        foreach ($core_deps as $handle) {
            if (!wp_script_is($handle, 'enqueued')) {
                wp_enqueue_script($handle);
                $this->loaded_assets[] = $handle;
                $this->log_debug("Loaded core dependency: {$handle}");
            }
        }
        
        // Load optional dependencies with fallbacks
        $this->load_optional_dependency('jquery-ui-slider');
        $this->load_optional_dependency('wp-color-picker');
        $this->load_optional_dependency('wp-color-picker-css', 'style');
    }
    
    /**
     * Load optional dependency with fallback handling
     *
     * @param string $handle Dependency handle
     * @param string $type Asset type (script|style)
     */
    private function load_optional_dependency($handle, $type = 'script') {
        $dependency = $this->dependencies[$handle] ?? null;
        
        if (!$dependency) {
            return;
        }
        
        try {
            if ($type === 'script') {
                if (!wp_script_is($handle, 'registered')) {
                    // Try to register if not already registered
                    wp_register_script($handle, '', $dependency['deps'], $this->version);
                }
                
                if (wp_script_is($handle, 'registered')) {
                    wp_enqueue_script($handle);
                    $this->loaded_assets[] = $handle;
                    $this->log_debug("Loaded optional script dependency: {$handle}");
                } else {
                    throw new Exception("Failed to register script: {$handle}");
                }
            } else {
                if (!wp_style_is($handle, 'registered')) {
                    wp_register_style($handle, '', $dependency['deps'], $this->version);
                }
                
                if (wp_style_is($handle, 'registered')) {
                    wp_enqueue_style($handle);
                    $this->loaded_assets[] = $handle;
                    $this->log_debug("Loaded optional style dependency: {$handle}");
                } else {
                    throw new Exception("Failed to register style: {$handle}");
                }
            }
            
        } catch (Exception $e) {
            $this->log_debug("Optional dependency {$handle} failed to load: " . $e->getMessage());
            
            // Execute fallback if available
            if (!empty($dependency['fallback'])) {
                $this->execute_fallback($dependency['fallback'], $handle);
            }
        }
    }
    
    /**
     * Load UI repair specific assets
     */
    private function load_ui_repair_assets() {
        // Load system repair first (highest priority)
        $this->load_system_repair();
        
        // Load UI repair integration system
        $this->load_ui_repair_integration();
        
        // Load UI repair JavaScript
        $this->load_ui_repair_script();
        
        // Load UI repair CSS
        $this->load_ui_repair_styles();
    }
    
    /**
     * Load system repair script
     */
    private function load_system_repair() {
        $handle = 'las-system-repair';
        $file_path = $this->plugin_path . 'tests/integration-system-repair.js';
        $file_url = $this->plugin_url . 'tests/integration-system-repair.js';
        
        // Check if file exists
        if (!file_exists($file_path)) {
            $this->log_debug("System repair file not found: {$file_path}");
            return;
        }
        
        // Get file modification time for cache busting
        $file_version = $this->get_file_version($file_path);
        
        // Register and enqueue script with highest priority
        wp_register_script(
            $handle,
            $file_url,
            array(), // No dependencies - this loads first
            $file_version,
            false // Load in head for immediate execution
        );
        
        wp_enqueue_script($handle);
        $this->loaded_assets[] = $handle;
        
        $this->log_debug("Loaded system repair: {$handle}");
    }

    /**
     * Load UI repair integration system
     */
    private function load_ui_repair_integration() {
        $handle = 'las-ui-repair-integration';
        $file_path = $this->plugin_path . 'assets/js/ui-repair-integration.js';
        $file_url = $this->plugin_url . 'assets/js/ui-repair-integration.js';
        
        // Check if file exists
        if (!file_exists($file_path)) {
            throw new Exception("UI repair integration file not found: {$file_path}");
        }
        
        // Get file modification time for cache busting
        $file_version = $this->get_file_version($file_path);
        
        // Register and enqueue script with dependency on system repair
        wp_register_script(
            $handle,
            $file_url,
            array('las-system-repair'), // Depends on system repair
            $file_version,
            false // Load in head for early initialization
        );
        
        wp_enqueue_script($handle);
        $this->loaded_assets[] = $handle;
        
        $this->log_debug("Loaded UI repair integration: {$handle}");
    }

    /**
     * Load UI repair JavaScript file
     */
    private function load_ui_repair_script() {
        $handle = 'las-ui-repair';
        $dependency = $this->dependencies['ui-repair-js'];
        $file_path = $this->plugin_path . $dependency['file'];
        $file_url = $this->plugin_url . $dependency['file'];
        
        // Check if file exists
        if (!file_exists($file_path)) {
            throw new Exception("UI repair script file not found: {$file_path}");
        }
        
        // Get file modification time for cache busting
        $file_version = $this->get_file_version($file_path);
        
        // Register and enqueue script with system repair and integration dependencies
        wp_register_script(
            $handle,
            $file_url,
            array_merge($dependency['deps'], array('las-system-repair', 'las-ui-repair-integration')),
            $file_version,
            true // Load in footer
        );
        
        wp_enqueue_script($handle);
        $this->loaded_assets[] = $handle;
        
        $this->log_debug("Loaded UI repair script: {$handle}");
    }
    
    /**
     * Load UI repair CSS file
     */
    private function load_ui_repair_styles() {
        $handle = 'las-ui-repair-css';
        $dependency = $this->dependencies['ui-repair-css'];
        
        // Check if CSS file exists, create if not
        $this->ensure_ui_repair_css_exists();
        
        $file_path = $this->plugin_path . $dependency['file'];
        $file_url = $this->plugin_url . $dependency['file'];
        $file_version = $this->get_file_version($file_path);
        
        // Register and enqueue style
        wp_register_style(
            $handle,
            $file_url,
            $dependency['deps'],
            $file_version
        );
        
        wp_enqueue_style($handle);
        $this->loaded_assets[] = $handle;
        
        $this->log_debug("Loaded UI repair styles: {$handle}");
    }
    
    /**
     * Ensure UI repair CSS file exists
     */
    private function ensure_ui_repair_css_exists() {
        $css_path = $this->plugin_path . 'assets/css/ui-repair.css';
        
        if (!file_exists($css_path)) {
            $this->create_ui_repair_css($css_path);
        }
    }
    
    /**
     * Create basic UI repair CSS file
     *
     * @param string $css_path Path to create CSS file
     */
    private function create_ui_repair_css($css_path) {
        $css_dir = dirname($css_path);
        
        // Create directory if it doesn't exist
        if (!is_dir($css_dir)) {
            wp_mkdir_p($css_dir);
        }
        
        $css_content = $this->get_basic_ui_repair_css();
        
        if (file_put_contents($css_path, $css_content) === false) {
            throw new Exception("Failed to create UI repair CSS file: {$css_path}");
        }
        
        $this->log_debug("Created UI repair CSS file: {$css_path}");
    }
    
    /**
     * Get basic UI repair CSS content
     *
     * @return string
     */
    private function get_basic_ui_repair_css() {
        return '/* Live Admin Styler UI Repair Styles */

/* Error notifications */
.las-ui-error {
    margin: 10px 0;
    padding: 12px;
    border-left: 4px solid #dc3232;
    background: #fff;
    box-shadow: 0 1px 1px rgba(0,0,0,0.04);
}

.las-ui-error p {
    margin: 0.5em 0;
}

/* Graceful degradation mode */
.las-ui-degraded .las-tab {
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;
}

.las-ui-degraded .las-tab:hover,
.las-ui-degraded .las-tab.active {
    opacity: 1;
}

.las-ui-degraded .las-tab-panel {
    display: none;
}

.las-ui-degraded .las-tab-panel.active {
    display: block;
}

/* Loading states */
.las-button-loading {
    position: relative;
    pointer-events: none;
}

.las-button-loading::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    margin: -8px 0 0 -8px;
    border: 2px solid #fff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: las-spin 1s linear infinite;
}

@keyframes las-spin {
    to {
        transform: rotate(360deg);
    }
}

/* Accessibility improvements */
.las-tab[aria-selected="true"] {
    font-weight: 600;
}

.las-tab:focus {
    outline: 2px solid #007cba;
    outline-offset: -2px;
}

/* Submenu visibility */
.las-submenu-visible {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
}

.wp-submenu {
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

.wp-submenu:not(.las-submenu-visible) {
    opacity: 0;
    visibility: hidden;
}

/* Form control improvements */
.las-slider-ui {
    margin: 10px 0;
}

.las-color-picker-wrapper {
    display: inline-block;
}

/* Debug information */
.las-debug-info {
    background: #f1f1f1;
    border: 1px solid #ccc;
    padding: 10px;
    margin: 10px 0;
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
}';
    }
    
    /**
     * Localize script data for JavaScript
     */
    private function localize_script_data() {
        $script_data = array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('las_ui_repair_nonce'),
            'debug' => $this->debug_mode,
            'version' => $this->version,
            'pluginUrl' => $this->plugin_url,
            'loadedAssets' => $this->loaded_assets,
            'uiRepair' => array(
                'timeout' => 10000,
                'retryAttempts' => 3,
                'debounceDelay' => 300,
                'enableGracefulDegradation' => true
            ),
            'strings' => array(
                'errorTitle' => __('Live Admin Styler UI Error', 'live-admin-styler'),
                'errorMessage' => __('Failed to initialize interface. Please refresh the page.', 'live-admin-styler'),
                'loadingAssets' => __('Loading interface assets...', 'live-admin-styler'),
                'assetLoadFailed' => __('Failed to load required assets.', 'live-admin-styler')
            )
        );
        
        wp_localize_script('las-ui-repair', 'lasAdminData', $script_data);
        
        $this->log_debug('Localized script data for UI repair');
    }
    
    /**
     * Add inline styles for immediate fixes
     */
    private function add_inline_styles() {
        $inline_css = '
        /* Immediate UI fixes */
        .las-fresh-settings-wrap {
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .las-fresh-settings-wrap.las-ui-ready {
            opacity: 1;
        }
        
        /* Hide elements until JS loads */
        .las-tab-panel:not(.active) {
            display: none;
        }
        ';
        
        wp_add_inline_style('las-ui-repair-css', $inline_css);
        
        $this->log_debug('Added inline styles for immediate fixes');
    }
    
    /**
     * Get file version for cache busting
     *
     * @param string $file_path File path
     * @return string Version string
     */
    private function get_file_version($file_path) {
        if (file_exists($file_path)) {
            $file_time = filemtime($file_path);
            return $this->version . '.' . $file_time;
        }
        
        return $this->version;
    }
    
    /**
     * Execute fallback for failed dependency
     *
     * @param string $fallback_method Fallback method name
     * @param string $handle Asset handle
     */
    private function execute_fallback($fallback_method, $handle) {
        switch ($fallback_method) {
            case 'enable_graceful_degradation':
                $this->enable_graceful_degradation();
                break;
                
            case 'load_minimal_styles':
                $this->load_minimal_styles();
                break;
                
            case 'use_native_range_inputs':
                $this->use_native_range_inputs();
                break;
                
            case 'use_native_color_inputs':
                $this->use_native_color_inputs();
                break;
                
            default:
                $this->log_debug("Unknown fallback method: {$fallback_method}");
        }
        
        $this->log_debug("Executed fallback '{$fallback_method}' for {$handle}");
    }
    
    /**
     * Enable graceful degradation mode
     */
    private function enable_graceful_degradation() {
        add_action('admin_footer', function() {
            echo '<script>
                document.body.classList.add("las-ui-degraded");
                console.log("LAS UI: Graceful degradation mode enabled");
            </script>';
        });
    }
    
    /**
     * Load minimal styles as fallback
     */
    private function load_minimal_styles() {
        add_action('admin_head', function() {
            echo '<style>
                .las-ui-error { 
                    background: #fff; 
                    border-left: 4px solid #dc3232; 
                    padding: 12px; 
                    margin: 10px 0; 
                }
                .las-tab.active { 
                    font-weight: bold; 
                }
                .las-tab-panel:not(.active) { 
                    display: none; 
                }
            </style>';
        });
    }
    
    /**
     * Use native range inputs as fallback
     */
    private function use_native_range_inputs() {
        add_action('admin_footer', function() {
            echo '<script>
                document.addEventListener("DOMContentLoaded", function() {
                    var sliders = document.querySelectorAll("input[type=range]");
                    sliders.forEach(function(slider) {
                        slider.style.display = "block";
                        console.log("LAS UI: Using native range input for slider");
                    });
                });
            </script>';
        });
    }
    
    /**
     * Use native color inputs as fallback
     */
    private function use_native_color_inputs() {
        add_action('admin_footer', function() {
            echo '<script>
                document.addEventListener("DOMContentLoaded", function() {
                    var colorPickers = document.querySelectorAll("input[type=color]");
                    colorPickers.forEach(function(picker) {
                        picker.style.display = "inline-block";
                        console.log("LAS UI: Using native color input for color picker");
                    });
                });
            </script>';
        });
    }
    
    /**
     * Validate asset loading in admin footer
     */
    public function validate_asset_loading() {
        if (!$this->should_load_assets(get_current_screen()->id ?? '')) {
            return;
        }
        
        echo '<script>
        document.addEventListener("DOMContentLoaded", function() {
            // Validate that UI repair system loaded
            if (typeof window.LASUICoreManager === "undefined") {
                console.error("LAS UI: Core manager not loaded");
                document.body.classList.add("las-ui-degraded");
            } else {
                console.log("LAS UI: Asset validation passed");
            }
        });
        </script>';
    }
    
    /**
     * AJAX handler for asset validation
     */
    public function ajax_validate_assets() {
        try {
            // Verify nonce
            if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_ui_repair_nonce')) {
                wp_send_json_error('Invalid security token');
                return;
            }
            
            // Check permissions
            if (!current_user_can('manage_options')) {
                wp_send_json_error('Insufficient permissions');
                return;
            }
            
            $validation_results = array(
                'loaded_assets' => $this->loaded_assets,
                'loading_errors' => $this->loading_errors,
                'environment_valid' => $this->validate_environment(),
                'timestamp' => current_time('mysql')
            );
            
            wp_send_json_success($validation_results);
            
        } catch (Exception $e) {
            wp_send_json_error('Validation failed: ' . $e->getMessage());
        }
    }
    
    /**
     * AJAX handler for asset reloading
     */
    public function ajax_reload_assets() {
        try {
            // Verify nonce and permissions
            if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_ui_repair_nonce') || 
                !current_user_can('manage_options')) {
                wp_send_json_error('Access denied');
                return;
            }
            
            // Clear loaded assets tracking
            $this->loaded_assets = array();
            $this->loading_errors = array();
            
            // Attempt to reload assets
            $this->enqueue_ui_repair_assets(get_current_screen()->id ?? '');
            
            wp_send_json_success(array(
                'message' => 'Assets reloaded successfully',
                'loaded_assets' => $this->loaded_assets
            ));
            
        } catch (Exception $e) {
            wp_send_json_error('Reload failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Handle asset loading errors
     *
     * @param Exception $e Exception object
     */
    private function handle_loading_error($e) {
        $error_data = array(
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'timestamp' => current_time('mysql')
        );
        
        $this->loading_errors[] = $error_data;
        
        // Log error
        $this->log_debug('Asset loading error: ' . $e->getMessage());
        
        // Show admin notice
        add_action('admin_notices', function() use ($e) {
            echo '<div class="notice notice-error is-dismissible">';
            echo '<p><strong>Live Admin Styler:</strong> Failed to load UI repair assets. ';
            echo esc_html($e->getMessage());
            echo '</p></div>';
        });
        
        // Enable graceful degradation
        $this->enable_graceful_degradation();
    }
    
    /**
     * Cleanup assets on plugin deactivation
     */
    public function cleanup_assets() {
        // Remove any cached asset data
        delete_option('las_ui_repair_asset_cache');
        
        // Clear any transients
        delete_transient('las_ui_repair_dependencies');
        
        $this->log_debug('UI repair assets cleaned up');
    }
    
    /**
     * Debug logging utility
     *
     * @param string $message Log message
     */
    private function log_debug($message) {
        if ($this->debug_mode) {
            error_log('LAS UI Repair Asset Loader: ' . $message);
        }
    }
    
    /**
     * Get loaded assets list
     *
     * @return array
     */
    public function get_loaded_assets() {
        return $this->loaded_assets;
    }
    
    /**
     * Get loading errors
     *
     * @return array
     */
    public function get_loading_errors() {
        return $this->loading_errors;
    }
    
    /**
     * Check if specific asset is loaded
     *
     * @param string $handle Asset handle
     * @return bool
     */
    public function is_asset_loaded($handle) {
        return in_array($handle, $this->loaded_assets);
    }
}

// Initialize the asset loader
global $las_ui_repair_asset_loader;
$las_ui_repair_asset_loader = new LAS_UI_Repair_Asset_Loader();