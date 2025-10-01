<?php
/**
 * SettingsManager - Settings management service with caching and preset support
 * 
 * Provides comprehensive settings management with caching integration, security validation,
 * preset management functionality, user state persistence, and multi-tab synchronization.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * SettingsManager class for comprehensive settings management
 */
class LAS_SettingsManager {
    
    /**
     * Cache manager instance
     * @var LAS_CacheManager
     */
    private $cache;
    
    /**
     * Security manager instance
     * @var LAS_SecurityManager
     */
    private $security;
    
    /**
     * Settings option prefix
     */
    const OPTION_PREFIX = 'las_fresh_';
    
    /**
     * User state meta key
     */
    const USER_STATE_KEY = 'las_fresh_user_state';
    
    /**
     * Preset option key
     */
    const PRESET_KEY = 'las_fresh_presets';
    
    /**
     * Default settings structure
     * @var array
     */
    private $default_settings = [
        'general' => [
            'theme_mode' => 'auto',
            'animation_speed' => 'normal',
            'live_preview' => true,
            'performance_mode' => 'balanced',
            'debug_mode' => false
        ],
        'menu' => [
            'background_color' => '#23282d',
            'text_color' => '#ffffff',
            'hover_color' => '#0073aa',
            'active_color' => '#0073aa',
            'font_size' => '14px',
            'font_family' => 'system',
            'border_radius' => '0px',
            'shadow' => 'none',
            'spacing' => 'normal'
        ],
        'adminbar' => [
            'background_color' => '#23282d',
            'text_color' => '#ffffff',
            'height' => '32px',
            'position' => 'fixed',
            'shadow' => 'none',
            'border_bottom' => 'none'
        ],
        'content' => [
            'background_color' => '#f1f1f1',
            'font_family' => 'system',
            'font_size' => '14px',
            'line_height' => '1.4',
            'text_color' => '#23282d',
            'link_color' => '#0073aa'
        ],
        'advanced' => [
            'custom_css' => '',
            'cache_enabled' => true,
            'minify_css' => true,
            'load_priority' => 'normal'
        ]
    ];
    
    /**
     * Built-in presets
     * @var array
     */
    private $builtin_presets = [
        'minimal' => [
            'name' => 'Minimal',
            'description' => 'Clean, white space focused design',
            'settings' => [
                'general' => [
                    'theme_mode' => 'light',
                    'animation_speed' => 'fast'
                ],
                'menu' => [
                    'background_color' => '#ffffff',
                    'text_color' => '#23282d',
                    'hover_color' => '#f0f0f0',
                    'active_color' => '#0073aa'
                ],
                'adminbar' => [
                    'background_color' => '#ffffff',
                    'text_color' => '#23282d'
                ]
            ]
        ],
        'glassmorphism' => [
            'name' => 'Glassmorphism',
            'description' => 'Modern frosted glass effects',
            'settings' => [
                'general' => [
                    'theme_mode' => 'auto',
                    'animation_speed' => 'normal'
                ],
                'menu' => [
                    'background_color' => 'rgba(255, 255, 255, 0.1)',
                    'text_color' => '#ffffff',
                    'hover_color' => 'rgba(255, 255, 255, 0.2)',
                    'active_color' => '#0073aa'
                ]
            ]
        ],
        'ios' => [
            'name' => 'iOS',
            'description' => 'Apple-inspired clean design',
            'settings' => [
                'general' => [
                    'theme_mode' => 'light',
                    'animation_speed' => 'normal'
                ],
                'menu' => [
                    'background_color' => '#f8f9fa',
                    'text_color' => '#1d1d1f',
                    'hover_color' => '#e5e5e7',
                    'border_radius' => '8px'
                ]
            ]
        ],
        'material' => [
            'name' => 'Material',
            'description' => 'Google Material Design inspired',
            'settings' => [
                'general' => [
                    'theme_mode' => 'light',
                    'animation_speed' => 'normal'
                ],
                'menu' => [
                    'background_color' => '#1976d2',
                    'text_color' => '#ffffff',
                    'hover_color' => '#1565c0',
                    'shadow' => '0 2px 4px rgba(0,0,0,0.1)'
                ]
            ]
        ],
        'dark_pro' => [
            'name' => 'Dark Pro',
            'description' => 'Professional dark theme',
            'settings' => [
                'general' => [
                    'theme_mode' => 'dark',
                    'animation_speed' => 'normal'
                ],
                'menu' => [
                    'background_color' => '#1a1a1a',
                    'text_color' => '#e0e0e0',
                    'hover_color' => '#2d2d2d',
                    'active_color' => '#bb86fc'
                ]
            ]
        ],
        'gradient' => [
            'name' => 'Gradient',
            'description' => 'Colorful gradient design',
            'settings' => [
                'general' => [
                    'theme_mode' => 'auto',
                    'animation_speed' => 'normal'
                ],
                'menu' => [
                    'background_color' => 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    'text_color' => '#ffffff',
                    'hover_color' => 'rgba(255, 255, 255, 0.1)'
                ]
            ]
        ]
    ];
    
    /**
     * User state cache
     * @var array
     */
    private $user_state_cache = [];
    
    /**
     * Constructor
     * 
     * @param LAS_CacheManager $cache Cache manager instance
     * @param LAS_SecurityManager $security Security manager instance
     */
    public function __construct(LAS_CacheManager $cache, LAS_SecurityManager $security) {
        $this->cache = $cache;
        $this->security = $security;
        
        // Initialize hooks
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // AJAX hooks for multi-tab synchronization
        add_action('wp_ajax_las_sync_user_state', [$this, 'ajax_sync_user_state']);
        add_action('wp_ajax_las_broadcast_setting_change', [$this, 'ajax_broadcast_setting_change']);
        
        // Cleanup hooks
        add_action('wp_logout', [$this, 'cleanup_user_state']);
        add_action('las_daily_cleanup', [$this, 'cleanup_expired_states']);
    }
    
    /**
     * Get setting value with caching
     * 
     * @param string $key Setting key (dot notation supported: 'menu.background_color')
     * @param mixed $default Default value if not found
     * @return mixed Setting value
     */
    public function get($key, $default = null) {
        // Parse dot notation
        $keys = explode('.', $key);
        $group = $keys[0];
        $setting_key = isset($keys[1]) ? $keys[1] : null;
        
        // Get from cache first
        $cache_key = "setting_{$group}";
        $group_settings = $this->cache->remember(
            $cache_key,
            function() use ($group) {
                return $this->get_group_from_db($group);
            },
            3600, // 1 hour TTL
            LAS_CacheManager::GROUP_SETTINGS
        );
        
        if ($setting_key === null) {
            // Return entire group
            return $group_settings !== null ? $group_settings : ($default !== null ? $default : $this->get_default_group($group));
        }
        
        // Return specific setting
        if (isset($group_settings[$setting_key])) {
            return $group_settings[$setting_key];
        }
        
        // Return default value
        if ($default !== null) {
            return $default;
        }
        
        // Return from default settings
        $defaults = $this->get_default_group($group);
        return isset($defaults[$setting_key]) ? $defaults[$setting_key] : null;
    }
    
    /**
     * Set setting value with validation and caching
     * 
     * @param string $key Setting key (dot notation supported)
     * @param mixed $value Setting value
     * @param bool $validate Whether to validate the value
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function set($key, $value, $validate = true) {
        // Parse dot notation
        $keys = explode('.', $key);
        $group = $keys[0];
        $setting_key = isset($keys[1]) ? $keys[1] : null;
        
        if ($setting_key === null) {
            return new WP_Error('invalid_key', 'Setting key must include group and setting name');
        }
        
        // Validate value if requested
        if ($validate) {
            $validation_result = $this->validate_setting($key, $value);
            if (is_wp_error($validation_result)) {
                return $validation_result;
            }
        }
        
        // Sanitize value
        $sanitized_value = $this->sanitize_setting($key, $value);
        
        // Get current group settings
        $group_settings = $this->get($group, []);
        if (!is_array($group_settings)) {
            $group_settings = [];
        }
        
        // Update setting
        $group_settings[$setting_key] = $sanitized_value;
        
        // Save to database
        $option_key = self::OPTION_PREFIX . $group;
        $result = update_option($option_key, $group_settings);
        
        if ($result) {
            // Clear cache
            $this->cache->delete("setting_{$group}", LAS_CacheManager::GROUP_SETTINGS);
            
            // Broadcast change for multi-tab sync
            $this->broadcast_setting_change($key, $sanitized_value);
            
            // Log the change
            $this->log_setting_change($key, $sanitized_value);
            
            return true;
        }
        
        return new WP_Error('save_failed', 'Failed to save setting to database');
    }
    
    /**
     * Get multiple settings at once
     * 
     * @param array $keys Array of setting keys
     * @return array Array of key => value pairs
     */
    public function getMultiple($keys) {
        $results = [];
        
        foreach ($keys as $key) {
            $results[$key] = $this->get($key);
        }
        
        return $results;
    }
    
    /**
     * Set multiple settings at once
     * 
     * @param array $settings Array of key => value pairs
     * @param bool $validate Whether to validate values
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function setMultiple($settings, $validate = true) {
        $errors = [];
        
        foreach ($settings as $key => $value) {
            $result = $this->set($key, $value, $validate);
            if (is_wp_error($result)) {
                $errors[$key] = $result->get_error_message();
            }
        }
        
        if (!empty($errors)) {
            return new WP_Error('multiple_errors', 'Some settings failed to save', $errors);
        }
        
        return true;
    }
    
    /**
     * Reset settings to defaults
     * 
     * @param string $group Optional group to reset (null for all)
     * @return bool Success status
     */
    public function reset($group = null) {
        if ($group === null) {
            // Reset all groups
            foreach (array_keys($this->default_settings) as $group_name) {
                $this->reset($group_name);
            }
            return true;
        }
        
        if (!isset($this->default_settings[$group])) {
            return false;
        }
        
        $option_key = self::OPTION_PREFIX . $group;
        $result = update_option($option_key, $this->default_settings[$group]);
        
        if ($result) {
            // Clear cache
            $this->cache->delete("setting_{$group}", LAS_CacheManager::GROUP_SETTINGS);
            
            // Broadcast reset
            $this->broadcast_setting_change("{$group}.*", 'reset');
        }
        
        return $result;
    }
    
    /**
     * Get all settings
     * 
     * @return array All settings grouped by category
     */
    public function getAll() {
        $all_settings = [];
        
        foreach (array_keys($this->default_settings) as $group) {
            $all_settings[$group] = $this->get($group);
        }
        
        return $all_settings;
    }
    
    /**
     * Export settings to JSON
     * 
     * @param array $groups Optional array of groups to export (null for all)
     * @return string JSON string
     */
    public function export($groups = null) {
        if ($groups === null) {
            $settings = $this->getAll();
        } else {
            $settings = [];
            foreach ($groups as $group) {
                $settings[$group] = $this->get($group);
            }
        }
        
        $export_data = [
            'version' => '2.0.0',
            'timestamp' => current_time('timestamp'),
            'settings' => $settings
        ];
        
        return wp_json_encode($export_data, JSON_PRETTY_PRINT);
    }
    
    /**
     * Import settings from JSON
     * 
     * @param string $json JSON string
     * @param bool $merge Whether to merge with existing settings
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function import($json, $merge = true) {
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('invalid_json', 'Invalid JSON format');
        }
        
        if (!isset($data['settings']) || !is_array($data['settings'])) {
            return new WP_Error('invalid_format', 'Invalid settings format');
        }
        
        $errors = [];
        
        foreach ($data['settings'] as $group => $group_settings) {
            if (!isset($this->default_settings[$group])) {
                continue; // Skip unknown groups
            }
            
            if ($merge) {
                // Merge with existing settings
                $current_settings = $this->get($group, []);
                $group_settings = array_merge($current_settings, $group_settings);
            }
            
            foreach ($group_settings as $key => $value) {
                $result = $this->set("{$group}.{$key}", $value);
                if (is_wp_error($result)) {
                    $errors["{$group}.{$key}"] = $result->get_error_message();
                }
            }
        }
        
        if (!empty($errors)) {
            return new WP_Error('import_errors', 'Some settings failed to import', $errors);
        }
        
        return true;
    }
    
    /**
     * Get available presets
     * 
     * @param bool $include_custom Whether to include custom presets
     * @return array Array of presets
     */
    public function getPresets($include_custom = true) {
        $presets = $this->builtin_presets;
        
        if ($include_custom) {
            $custom_presets = get_option(self::PRESET_KEY, []);
            $presets = array_merge($presets, $custom_presets);
        }
        
        return $presets;
    }
    
    /**
     * Get specific preset
     * 
     * @param string $preset_id Preset ID
     * @return array|null Preset data or null if not found
     */
    public function getPreset($preset_id) {
        $presets = $this->getPresets();
        return isset($presets[$preset_id]) ? $presets[$preset_id] : null;
    }
    
    /**
     * Apply preset to current settings
     * 
     * @param string $preset_id Preset ID
     * @param bool $merge Whether to merge with existing settings
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function applyPreset($preset_id, $merge = false) {
        $preset = $this->getPreset($preset_id);
        
        if (!$preset) {
            return new WP_Error('preset_not_found', 'Preset not found');
        }
        
        if (!isset($preset['settings']) || !is_array($preset['settings'])) {
            return new WP_Error('invalid_preset', 'Invalid preset format');
        }
        
        $errors = [];
        
        foreach ($preset['settings'] as $group => $group_settings) {
            if ($merge) {
                // Merge with existing settings
                $current_settings = $this->get($group, []);
                $group_settings = array_merge($current_settings, $group_settings);
            }
            
            foreach ($group_settings as $key => $value) {
                $result = $this->set("{$group}.{$key}", $value);
                if (is_wp_error($result)) {
                    $errors["{$group}.{$key}"] = $result->get_error_message();
                }
            }
        }
        
        if (!empty($errors)) {
            return new WP_Error('preset_apply_errors', 'Some preset settings failed to apply', $errors);
        }
        
        // Log preset application
        $this->log_preset_application($preset_id);
        
        return true;
    }
    
    /**
     * Save custom preset
     * 
     * @param string $preset_id Preset ID
     * @param string $name Preset name
     * @param string $description Preset description
     * @param array $settings Preset settings (null to use current settings)
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function savePreset($preset_id, $name, $description = '', $settings = null) {
        // Validate preset ID
        if (empty($preset_id) || !preg_match('/^[a-z0-9_-]+$/', $preset_id)) {
            return new WP_Error('invalid_preset_id', 'Invalid preset ID format');
        }
        
        // Check if preset ID conflicts with built-in presets
        if (isset($this->builtin_presets[$preset_id])) {
            return new WP_Error('preset_id_conflict', 'Preset ID conflicts with built-in preset');
        }
        
        if ($settings === null) {
            $settings = $this->getAll();
        }
        
        $custom_presets = get_option(self::PRESET_KEY, []);
        
        $custom_presets[$preset_id] = [
            'name' => sanitize_text_field($name),
            'description' => sanitize_textarea_field($description),
            'settings' => $settings,
            'created' => current_time('timestamp'),
            'modified' => current_time('timestamp')
        ];
        
        $result = update_option(self::PRESET_KEY, $custom_presets);
        
        if ($result) {
            // Clear presets cache
            $this->cache->delete('presets', LAS_CacheManager::GROUP_TEMPLATES);
        }
        
        return $result;
    }
    
    /**
     * Delete custom preset
     * 
     * @param string $preset_id Preset ID
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function deletePreset($preset_id) {
        // Cannot delete built-in presets
        if (isset($this->builtin_presets[$preset_id])) {
            return new WP_Error('cannot_delete_builtin', 'Cannot delete built-in preset');
        }
        
        $custom_presets = get_option(self::PRESET_KEY, []);
        
        if (!isset($custom_presets[$preset_id])) {
            return new WP_Error('preset_not_found', 'Custom preset not found');
        }
        
        unset($custom_presets[$preset_id]);
        
        $result = update_option(self::PRESET_KEY, $custom_presets);
        
        if ($result) {
            // Clear presets cache
            $this->cache->delete('presets', LAS_CacheManager::GROUP_TEMPLATES);
        }
        
        return $result;
    }   
 
    /**
     * Get user state
     * 
     * @param int $user_id User ID (null for current user)
     * @return array User state data
     */
    public function getUserState($user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        // Check cache first
        if (isset($this->user_state_cache[$user_id])) {
            return $this->user_state_cache[$user_id];
        }
        
        $state = get_user_meta($user_id, self::USER_STATE_KEY, true);
        
        if (!is_array($state)) {
            $state = $this->get_default_user_state();
        }
        
        // Cache the state
        $this->user_state_cache[$user_id] = $state;
        
        return $state;
    }
    
    /**
     * Set user state
     * 
     * @param array $state User state data
     * @param int $user_id User ID (null for current user)
     * @return bool Success status
     */
    public function setUserState($state, $user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        // Validate and sanitize state
        $state = $this->sanitize_user_state($state);
        
        $result = update_user_meta($user_id, self::USER_STATE_KEY, $state);
        
        if ($result) {
            // Update cache
            $this->user_state_cache[$user_id] = $state;
            
            // Broadcast state change for multi-tab sync
            $this->broadcast_user_state_change($state, $user_id);
        }
        
        return (bool) $result;
    }
    
    /**
     * Update specific user state property
     * 
     * @param string $key State key (dot notation supported)
     * @param mixed $value State value
     * @param int $user_id User ID (null for current user)
     * @return bool Success status
     */
    public function setUserStateProperty($key, $value, $user_id = null) {
        $state = $this->getUserState($user_id);
        
        // Parse dot notation
        $keys = explode('.', $key);
        $current = &$state;
        
        foreach ($keys as $i => $k) {
            if ($i === count($keys) - 1) {
                $current[$k] = $value;
            } else {
                if (!isset($current[$k]) || !is_array($current[$k])) {
                    $current[$k] = [];
                }
                $current = &$current[$k];
            }
        }
        
        return $this->setUserState($state, $user_id);
    }
    
    /**
     * Get user state property
     * 
     * @param string $key State key (dot notation supported)
     * @param mixed $default Default value
     * @param int $user_id User ID (null for current user)
     * @return mixed State value
     */
    public function getUserStateProperty($key, $default = null, $user_id = null) {
        $state = $this->getUserState($user_id);
        
        // Parse dot notation
        $keys = explode('.', $key);
        $current = $state;
        
        foreach ($keys as $k) {
            if (!isset($current[$k])) {
                return $default;
            }
            $current = $current[$k];
        }
        
        return $current;
    }
    
    /**
     * AJAX handler for user state synchronization
     */
    public function ajax_sync_user_state() {
        // Verify nonce
        if (!$this->security->validateNonce($_POST['nonce'] ?? '', 'sync_user_state')) {
            wp_die('Security check failed');
        }
        
        // Check capability
        if (!$this->security->checkCapability()) {
            wp_die('Insufficient permissions');
        }
        
        $user_id = get_current_user_id();
        $state = $this->getUserState($user_id);
        
        wp_send_json_success([
            'state' => $state,
            'timestamp' => current_time('timestamp')
        ]);
    }
    
    /**
     * AJAX handler for broadcasting setting changes
     */
    public function ajax_broadcast_setting_change() {
        // Verify nonce
        if (!$this->security->validateNonce($_POST['nonce'] ?? '', 'broadcast_change')) {
            wp_die('Security check failed');
        }
        
        // Check capability
        if (!$this->security->checkCapability()) {
            wp_die('Insufficient permissions');
        }
        
        $key = sanitize_text_field($_POST['key'] ?? '');
        $value = $_POST['value'] ?? '';
        
        if (empty($key)) {
            wp_send_json_error('Invalid key');
        }
        
        // Sanitize value based on setting type
        $sanitized_value = $this->sanitize_setting($key, $value);
        
        wp_send_json_success([
            'key' => $key,
            'value' => $sanitized_value,
            'timestamp' => current_time('timestamp')
        ]);
    }
    
    /**
     * Get setting group from database
     * 
     * @param string $group Group name
     * @return array|null Group settings or null if not found
     */
    private function get_group_from_db($group) {
        $option_key = self::OPTION_PREFIX . $group;
        $settings = get_option($option_key, null);
        
        if ($settings === null) {
            return null;
        }
        
        // Merge with defaults to ensure all keys exist
        $defaults = $this->get_default_group($group);
        if ($defaults) {
            $settings = array_merge($defaults, $settings);
        }
        
        return $settings;
    }
    
    /**
     * Get default settings for a group
     * 
     * @param string $group Group name
     * @return array|null Default settings or null if group not found
     */
    private function get_default_group($group) {
        return isset($this->default_settings[$group]) ? $this->default_settings[$group] : null;
    }
    
    /**
     * Get default user state
     * 
     * @return array Default user state
     */
    private function get_default_user_state() {
        return [
            'active_tab' => 'general',
            'live_edit_mode' => false,
            'panel_positions' => [],
            'recent_colors' => [],
            'custom_presets' => [],
            'ui_preferences' => [
                'sidebar_collapsed' => false,
                'preview_mode' => 'desktop',
                'show_advanced' => false
            ],
            'session' => [
                'last_active' => current_time('timestamp'),
                'tab_id' => wp_generate_uuid4()
            ]
        ];
    }
    
    /**
     * Validate setting value
     * 
     * @param string $key Setting key
     * @param mixed $value Setting value
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    private function validate_setting($key, $value) {
        $keys = explode('.', $key);
        $group = $keys[0];
        $setting_key = $keys[1] ?? '';
        
        // Define validation rules
        $validation_rules = [
            'menu.background_color' => ['type' => 'color'],
            'menu.text_color' => ['type' => 'color'],
            'menu.hover_color' => ['type' => 'color'],
            'menu.active_color' => ['type' => 'color'],
            'menu.font_size' => ['type' => 'text', 'pattern' => '/^\d+(px|em|rem|%)$/'],
            'menu.border_radius' => ['type' => 'text', 'pattern' => '/^\d+(px|em|rem|%)$/'],
            'adminbar.background_color' => ['type' => 'color'],
            'adminbar.text_color' => ['type' => 'color'],
            'adminbar.height' => ['type' => 'text', 'pattern' => '/^\d+(px|em|rem)$/'],
            'content.background_color' => ['type' => 'color'],
            'content.text_color' => ['type' => 'color'],
            'content.link_color' => ['type' => 'color'],
            'content.font_size' => ['type' => 'text', 'pattern' => '/^\d+(px|em|rem)$/'],
            'advanced.custom_css' => ['type' => 'css'],
            'general.theme_mode' => ['type' => 'text', 'options' => ['auto', 'light', 'dark']],
            'general.animation_speed' => ['type' => 'text', 'options' => ['slow', 'normal', 'fast']],
            'general.performance_mode' => ['type' => 'text', 'options' => ['performance', 'balanced', 'quality']]
        ];
        
        $rule_key = "{$group}.{$setting_key}";
        
        if (!isset($validation_rules[$rule_key])) {
            // No specific validation rule, use generic validation
            return true;
        }
        
        $rule = $validation_rules[$rule_key];
        
        // Type-based validation
        switch ($rule['type']) {
            case 'color':
                return $this->security->validate($value, 'color');
                
            case 'css':
                return $this->security->validate($value, 'css');
                
            case 'text':
                $result = $this->security->validate($value, 'text');
                if (is_wp_error($result)) {
                    return $result;
                }
                
                // Pattern validation
                if (isset($rule['pattern']) && !preg_match($rule['pattern'], $value)) {
                    return new WP_Error('invalid_format', 'Invalid format for ' . $key);
                }
                
                // Options validation
                if (isset($rule['options']) && !in_array($value, $rule['options'])) {
                    return new WP_Error('invalid_option', 'Invalid option for ' . $key);
                }
                
                return true;
                
            default:
                return true;
        }
    }
    
    /**
     * Sanitize setting value
     * 
     * @param string $key Setting key
     * @param mixed $value Setting value
     * @return mixed Sanitized value
     */
    private function sanitize_setting($key, $value) {
        $keys = explode('.', $key);
        $group = $keys[0];
        $setting_key = $keys[1] ?? '';
        
        // Define sanitization rules
        $sanitization_rules = [
            'menu.background_color' => 'color',
            'menu.text_color' => 'color',
            'menu.hover_color' => 'color',
            'menu.active_color' => 'color',
            'adminbar.background_color' => 'color',
            'adminbar.text_color' => 'color',
            'content.background_color' => 'color',
            'content.text_color' => 'color',
            'content.link_color' => 'color',
            'advanced.custom_css' => 'css',
            'general.live_preview' => 'boolean',
            'general.debug_mode' => 'boolean',
            'advanced.cache_enabled' => 'boolean',
            'advanced.minify_css' => 'boolean'
        ];
        
        $rule_key = "{$group}.{$setting_key}";
        $type = $sanitization_rules[$rule_key] ?? 'text';
        
        return $this->security->sanitize($value, $type);
    }
    
    /**
     * Sanitize user state data
     * 
     * @param array $state User state data
     * @return array Sanitized state data
     */
    private function sanitize_user_state($state) {
        if (!is_array($state)) {
            return $this->get_default_user_state();
        }
        
        $sanitized = [];
        
        // Sanitize each property
        $sanitized['active_tab'] = sanitize_key($state['active_tab'] ?? 'general');
        $sanitized['live_edit_mode'] = (bool) ($state['live_edit_mode'] ?? false);
        $sanitized['panel_positions'] = is_array($state['panel_positions'] ?? null) ? $state['panel_positions'] : [];
        $sanitized['recent_colors'] = is_array($state['recent_colors'] ?? null) ? array_slice($state['recent_colors'], 0, 10) : [];
        $sanitized['custom_presets'] = is_array($state['custom_presets'] ?? null) ? $state['custom_presets'] : [];
        
        // Sanitize UI preferences
        if (isset($state['ui_preferences']) && is_array($state['ui_preferences'])) {
            $sanitized['ui_preferences'] = [
                'sidebar_collapsed' => (bool) ($state['ui_preferences']['sidebar_collapsed'] ?? false),
                'preview_mode' => sanitize_key($state['ui_preferences']['preview_mode'] ?? 'desktop'),
                'show_advanced' => (bool) ($state['ui_preferences']['show_advanced'] ?? false)
            ];
        } else {
            $sanitized['ui_preferences'] = $this->get_default_user_state()['ui_preferences'];
        }
        
        // Update session info
        $sanitized['session'] = [
            'last_active' => current_time('timestamp'),
            'tab_id' => $state['session']['tab_id'] ?? wp_generate_uuid4()
        ];
        
        return $sanitized;
    }
    
    /**
     * Broadcast setting change for multi-tab synchronization
     * 
     * @param string $key Setting key
     * @param mixed $value Setting value
     */
    private function broadcast_setting_change($key, $value) {
        // Store in transient for other tabs to pick up
        $broadcast_key = 'las_broadcast_' . get_current_user_id();
        $broadcast_data = get_transient($broadcast_key) ?: [];
        
        $broadcast_data[] = [
            'type' => 'setting_change',
            'key' => $key,
            'value' => $value,
            'timestamp' => current_time('timestamp'),
            'tab_id' => $this->getUserStateProperty('session.tab_id')
        ];
        
        // Keep only last 10 changes
        $broadcast_data = array_slice($broadcast_data, -10);
        
        set_transient($broadcast_key, $broadcast_data, 300); // 5 minutes
    }
    
    /**
     * Broadcast user state change for multi-tab synchronization
     * 
     * @param array $state User state
     * @param int $user_id User ID
     */
    private function broadcast_user_state_change($state, $user_id) {
        $broadcast_key = 'las_state_broadcast_' . $user_id;
        
        $broadcast_data = [
            'type' => 'state_change',
            'state' => $state,
            'timestamp' => current_time('timestamp'),
            'tab_id' => $state['session']['tab_id'] ?? ''
        ];
        
        set_transient($broadcast_key, $broadcast_data, 300); // 5 minutes
    }
    
    /**
     * Log setting change
     * 
     * @param string $key Setting key
     * @param mixed $value Setting value
     */
    private function log_setting_change($key, $value) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $user_id = get_current_user_id();
            error_log(sprintf(
                '[LAS SettingsManager] Setting changed - Key: %s, User ID: %d, Timestamp: %s',
                $key,
                $user_id,
                current_time('mysql')
            ));
        }
    }
    
    /**
     * Log preset application
     * 
     * @param string $preset_id Preset ID
     */
    private function log_preset_application($preset_id) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $user_id = get_current_user_id();
            error_log(sprintf(
                '[LAS SettingsManager] Preset applied - Preset: %s, User ID: %d, Timestamp: %s',
                $preset_id,
                $user_id,
                current_time('mysql')
            ));
        }
    }
    
    /**
     * Cleanup user state on logout
     */
    public function cleanup_user_state() {
        $user_id = get_current_user_id();
        
        // Clear broadcast transients
        delete_transient('las_broadcast_' . $user_id);
        delete_transient('las_state_broadcast_' . $user_id);
        
        // Clear user state cache
        unset($this->user_state_cache[$user_id]);
    }
    
    /**
     * Cleanup expired user states (daily cron job)
     */
    public function cleanup_expired_states() {
        global $wpdb;
        
        // Clean up old broadcast transients
        $wpdb->query("
            DELETE FROM {$wpdb->options} 
            WHERE option_name LIKE '_transient_las_broadcast_%' 
            OR option_name LIKE '_transient_timeout_las_broadcast_%'
            OR option_name LIKE '_transient_las_state_broadcast_%'
            OR option_name LIKE '_transient_timeout_las_state_broadcast_%'
        ");
        
        // Clean up old user states (older than 30 days)
        $cutoff_date = date('Y-m-d H:i:s', strtotime('-30 days'));
        
        $old_states = $wpdb->get_results($wpdb->prepare("
            SELECT user_id, meta_value 
            FROM {$wpdb->usermeta} 
            WHERE meta_key = %s
        ", self::USER_STATE_KEY));
        
        foreach ($old_states as $state_row) {
            $state = maybe_unserialize($state_row->meta_value);
            if (is_array($state) && isset($state['session']['last_active'])) {
                $last_active = date('Y-m-d H:i:s', $state['session']['last_active']);
                if ($last_active < $cutoff_date) {
                    delete_user_meta($state_row->user_id, self::USER_STATE_KEY);
                }
            }
        }
    }
}