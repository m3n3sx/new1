<?php

/**
 * Template Manager for Live Admin Styler
 *
 * Manages built-in templates, custom templates, and template operations
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class LAS_TemplateManager {

    /**
     * @var LAS_SettingsManager
     */
    private $settings_manager;

    /**
     * @var LAS_CacheManager
     */
    private $cache_manager;

    /**
     * @var LAS_SecurityManager
     */
    private $security_manager;

    /**
     * Built-in templates
     * @var array
     */
    private $built_in_templates = [];

    /**
     * Constructor
     */
    public function __construct($settings_manager, $cache_manager, $security_manager) {
        $this->settings_manager = $settings_manager;
        $this->cache_manager = $cache_manager;
        $this->security_manager = $security_manager;

        $this->init_built_in_templates();
    }

    /**
     * Initialize built-in templates
     */
    private function init_built_in_templates() {
        $this->built_in_templates = [
            'minimal' => [
                'name' => 'Minimal',
                'description' => 'Clean, white space focused design with minimal visual elements',
                'category' => 'clean',
                'preview_image' => 'minimal-preview.png',
                'settings' => [
                    'general' => [
                        'theme_mode' => 'light',
                        'animation_speed' => 'fast',
                        'live_preview' => true
                    ],
                    'menu' => [
                        'background_color' => '#ffffff',
                        'text_color' => '#2c3338',
                        'hover_color' => '#f0f0f1',
                        'active_color' => '#0073aa',
                        'border_radius' => '0px',
                        'font_weight' => '400'
                    ],
                    'adminbar' => [
                        'background_color' => '#ffffff',
                        'text_color' => '#2c3338',
                        'height' => '32px',
                        'position' => 'fixed',
                        'border_bottom' => '1px solid #e1e1e1'
                    ],
                    'content' => [
                        'background_color' => '#ffffff',
                        'font_family' => 'system-ui',
                        'font_size' => '14px',
                        'line_height' => '1.6'
                    ]
                ]
            ],

            'glassmorphism' => [
                'name' => 'Glassmorphism',
                'description' => 'Modern frosted glass effects with backdrop blur and transparency',
                'category' => 'modern',
                'preview_image' => 'glassmorphism-preview.png',
                'settings' => [
                    'general' => [
                        'theme_mode' => 'auto',
                        'animation_speed' => 'normal',
                        'live_preview' => true
                    ],
                    'menu' => [
                        'background_color' => 'rgba(255, 255, 255, 0.1)',
                        'text_color' => '#ffffff',
                        'hover_color' => 'rgba(255, 255, 255, 0.2)',
                        'active_color' => 'rgba(0, 115, 170, 0.8)',
                        'border_radius' => '12px',
                        'backdrop_filter' => 'blur(10px)',
                        'border' => '1px solid rgba(255, 255, 255, 0.2)'
                    ],
                    'adminbar' => [
                        'background_color' => 'rgba(35, 40, 45, 0.8)',
                        'text_color' => '#ffffff',
                        'height' => '36px',
                        'position' => 'fixed',
                        'backdrop_filter' => 'blur(15px)'
                    ],
                    'content' => [
                        'background_color' => 'rgba(241, 241, 241, 0.9)',
                        'font_family' => 'Inter',
                        'font_size' => '14px',
                        'backdrop_filter' => 'blur(5px)'
                    ]
                ]
            ],

            'ios' => [
                'name' => 'iOS',
                'description' => 'Apple iOS inspired design with rounded corners and smooth animations',
                'category' => 'mobile',
                'preview_image' => 'ios-preview.png',
                'settings' => [
                    'general' => [
                        'theme_mode' => 'light',
                        'animation_speed' => 'normal',
                        'live_preview' => true
                    ],
                    'menu' => [
                        'background_color' => '#f2f2f7',
                        'text_color' => '#1c1c1e',
                        'hover_color' => '#e5e5ea',
                        'active_color' => '#007aff',
                        'border_radius' => '16px',
                        'font_weight' => '500',
                        'padding' => '12px'
                    ],
                    'adminbar' => [
                        'background_color' => '#f2f2f7',
                        'text_color' => '#1c1c1e',
                        'height' => '44px',
                        'position' => 'fixed',
                        'border_bottom' => '0.5px solid #c6c6c8'
                    ],
                    'content' => [
                        'background_color' => '#ffffff',
                        'font_family' => '-apple-system, BlinkMacSystemFont',
                        'font_size' => '15px',
                        'line_height' => '1.47',
                        'border_radius' => '12px'
                    ]
                ]
            ],

            'material' => [
                'name' => 'Material',
                'description' => 'Google Material Design 3 with elevation and dynamic colors',
                'category' => 'modern',
                'preview_image' => 'material-preview.png',
                'settings' => [
                    'general' => [
                        'theme_mode' => 'auto',
                        'animation_speed' => 'normal',
                        'live_preview' => true
                    ],
                    'menu' => [
                        'background_color' => '#1976d2',
                        'text_color' => '#ffffff',
                        'hover_color' => '#1565c0',
                        'active_color' => '#0d47a1',
                        'border_radius' => '4px',
                        'elevation' => '2',
                        'font_weight' => '500'
                    ],
                    'adminbar' => [
                        'background_color' => '#1976d2',
                        'text_color' => '#ffffff',
                        'height' => '56px',
                        'position' => 'fixed',
                        'elevation' => '4'
                    ],
                    'content' => [
                        'background_color' => '#fafafa',
                        'font_family' => 'Roboto, sans-serif',
                        'font_size' => '14px',
                        'line_height' => '1.43',
                        'elevation' => '1'
                    ]
                ]
            ],

            'dark_pro' => [
                'name' => 'Dark Pro',
                'description' => 'Professional dark theme optimized for extended use',
                'category' => 'dark',
                'preview_image' => 'dark-pro-preview.png',
                'settings' => [
                    'general' => [
                        'theme_mode' => 'dark',
                        'animation_speed' => 'fast',
                        'live_preview' => true
                    ],
                    'menu' => [
                        'background_color' => '#1a1a1a',
                        'text_color' => '#e0e0e0',
                        'hover_color' => '#2d2d2d',
                        'active_color' => '#4a9eff',
                        'border_radius' => '6px',
                        'font_weight' => '400',
                        'border' => '1px solid #333333'
                    ],
                    'adminbar' => [
                        'background_color' => '#0d1117',
                        'text_color' => '#f0f6fc',
                        'height' => '32px',
                        'position' => 'fixed',
                        'border_bottom' => '1px solid #21262d'
                    ],
                    'content' => [
                        'background_color' => '#161b22',
                        'font_family' => 'SF Mono, Monaco, Consolas',
                        'font_size' => '14px',
                        'line_height' => '1.5',
                        'color' => '#e6edf3'
                    ]
                ]
            ],

            'gradient' => [
                'name' => 'Gradient',
                'description' => 'Vibrant gradient backgrounds with dynamic color transitions',
                'category' => 'colorful',
                'preview_image' => 'gradient-preview.png',
                'settings' => [
                    'general' => [
                        'theme_mode' => 'auto',
                        'animation_speed' => 'slow',
                        'live_preview' => true
                    ],
                    'menu' => [
                        'background_color' => 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        'text_color' => '#ffffff',
                        'hover_color' => 'rgba(255, 255, 255, 0.1)',
                        'active_color' => 'rgba(255, 255, 255, 0.2)',
                        'border_radius' => '8px',
                        'font_weight' => '500'
                    ],
                    'adminbar' => [
                        'background_color' => 'linear-gradient(90deg, #ff6b6b 0%, #4ecdc4 100%)',
                        'text_color' => '#ffffff',
                        'height' => '36px',
                        'position' => 'fixed'
                    ],
                    'content' => [
                        'background_color' => 'linear-gradient(180deg, #ffecd2 0%, #fcb69f 100%)',
                        'font_family' => 'Inter, sans-serif',
                        'font_size' => '14px',
                        'line_height' => '1.6'
                    ]
                ]
            ]
        ];
    }

    /**
     * Get all built-in templates
     *
     * @return array
     */
    public function get_built_in_templates() {
        return $this->built_in_templates;
    }

    /**
     * Get template by ID
     *
     * @param string $template_id
     * @return array|null
     */
    public function get_template($template_id) {
        if (isset($this->built_in_templates[$template_id])) {
            return $this->built_in_templates[$template_id];
        }

        $custom_templates = $this->get_custom_templates();
        if (isset($custom_templates[$template_id])) {
            return $custom_templates[$template_id];
        }

        return null;
    }

    /**
     * Get custom templates
     *
     * @return array
     */
    public function get_custom_templates() {
        return $this->cache_manager->remember('las_custom_templates', function() {
            return get_option('las_custom_templates', []);
        }, 3600);
    }

    /**
     * Get template preview data
     *
     * @param string $template_id
     * @return array
     */
    public function get_template_preview($template_id) {
        $template = $this->get_template($template_id);

        if (!$template) {
            return null;
        }

        return [
            'id' => $template_id,
            'name' => $template['name'],
            'description' => $template['description'],
            'category' => $template['category'],
            'preview_image' => $template['preview_image'] ?? null,
            'css_preview' => $this->generate_preview_css($template['settings'])
        ];
    }

    /**
     * Generate preview CSS for template
     *
     * @param array $settings
     * @return string
     */
    private function generate_preview_css($settings) {
        $css = '';

        $css .= ':root {';
        foreach ($settings as $section => $section_settings) {
            foreach ($section_settings as $key => $value) {
                $css .= "--las-{$section}-{$key}: {$value};";
            }
        }
        $css .= '}';

        $css .= '
        .las-template-preview {
            background: var(--las-content-background_color, #f1f1f1);
            font-family: var(--las-content-font_family, system-ui);
            font-size: var(--las-content-font_size, 14px);
        }

        .las-template-preview .adminmenu {
            background: var(--las-menu-background_color, #23282d);
            color: var(--las-menu-text_color, #ffffff);
            border-radius: var(--las-menu-border_radius, 0);
        }

        .las-template-preview .adminbar {
            background: var(--las-adminbar-background_color, #23282d);
            color: var(--las-adminbar-text_color, #ffffff);
            height: var(--las-adminbar-height, 32px);
        }
        ';

        return $css;
    }

    /**
     * Validate template data
     *
     * @param array $template_data
     * @return bool|WP_Error
     */
    public function validate_template($template_data) {

        $required_fields = ['name', 'settings'];

        foreach ($required_fields as $field) {
            if (!isset($template_data[$field]) || empty($template_data[$field])) {
                return new WP_Error('missing_field', "Template field '{$field}' is required");
            }
        }

        if (!is_string($template_data['name']) || strlen($template_data['name']) > 100) {
            return new WP_Error('invalid_name', 'Template name must be a string with max 100 characters');
        }

        if (!is_array($template_data['settings'])) {
            return new WP_Error('invalid_settings', 'Template settings must be an array');
        }

        $valid_sections = ['general', 'menu', 'adminbar', 'content', 'advanced'];
        foreach ($template_data['settings'] as $section => $settings) {
            if (!in_array($section, $valid_sections)) {
                return new WP_Error('invalid_section', "Invalid settings section: {$section}");
            }

            if (!is_array($settings)) {
                return new WP_Error('invalid_section_data', "Settings section '{$section}' must be an array");
            }
        }

        return true;
    }

    /**
     * Get template categories
     *
     * @return array
     */
    public function get_template_categories() {
        $categories = [];

        foreach ($this->built_in_templates as $template) {
            $category = $template['category'];
            if (!isset($categories[$category])) {
                $categories[$category] = [
                    'name' => ucfirst($category),
                    'count' => 0
                ];
            }
            $categories[$category]['count']++;
        }

        return $categories;
    }

    /**
     * Search templates
     *
     * @param string $query
     * @param string $category
     * @return array
     */
    public function search_templates($query = '', $category = '') {
        $all_templates = array_merge($this->built_in_templates, $this->get_custom_templates());
        $results = [];

        foreach ($all_templates as $id => $template) {
            $match = true;

            if (!empty($category) && $template['category'] !== $category) {
                $match = false;
            }

            if (!empty($query)) {
                $searchable = strtolower($template['name'] . ' ' . $template['description']);
                if (strpos($searchable, strtolower($query)) === false) {
                    $match = false;
                }
            }

            if ($match) {
                $results[$id] = $template;
            }
        }

        return $results;
    }
}