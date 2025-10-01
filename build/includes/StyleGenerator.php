<?php
/**
 * StyleGenerator Service
 *
 * Handles dynamic CSS generation with CSS custom properties (variables),
 * variable scoping, inheritance, and browser compatibility.
 *
 * @package LiveAdminStyler
 * @since 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class StyleGenerator {

    /**
     * @var CacheManager Cache manager instance
     */
    private $cache;

    /**
     * @var SecurityManager Security manager instance
     */
    private $security;

    /**
     * @var SettingsManager Settings manager instance
     */
    private $settings;

    /**
     * @var array CSS variables registry
     */
    private $variables = [];

    /**
     * @var array Variable scopes
     */
    private $scopes = [];

    /**
     * @var array Browser compatibility mappings
     */
    private $compatibility_map = [];

    /**
     * @var bool Whether to minify CSS output
     */
    private $minify;

    /**
     * Constructor
     *
     * @param CacheManager $cache Cache manager instance
     * @param SecurityManager $security Security manager instance
     * @param SettingsManager $settings Settings manager instance
     */
    public function __construct(CacheManager $cache, SecurityManager $security, SettingsManager $settings) {
        $this->cache = $cache;
        $this->security = $security;
        $this->settings = $settings;
        $this->minify = !defined('WP_DEBUG') || !WP_DEBUG;

        $this->initializeCompatibilityMap();
        $this->registerDefaultVariables();
    }

    /**
     * Initialize browser compatibility mappings
     */
    private function initializeCompatibilityMap() {
        $this->compatibility_map = [
            'backdrop-filter' => [
                'fallback' => 'background',
                'prefixes' => ['-webkit-backdrop-filter']
            ],
            'grid' => [
                'fallback' => 'display: block',
                'prefixes' => ['-ms-grid', '-webkit-grid']
            ],
            'custom-properties' => [
                'fallback' => true,
                'min_version' => [
                    'chrome' => 49,
                    'firefox' => 31,
                    'safari' => 9.1,
                    'edge' => 16
                ]
            ]
        ];
    }

    /**
     * Register default CSS variables
     */
    private function registerDefaultVariables() {

        $this->registerVariable('primary-color', '#0073aa', 'colors');
        $this->registerVariable('secondary-color', '#23282d', 'colors');
        $this->registerVariable('success-color', '#46b450', 'colors');
        $this->registerVariable('warning-color', '#ffb900', 'colors');
        $this->registerVariable('error-color', '#dc3232', 'colors');

        $this->registerVariable('spacing-xs', '4px', 'spacing');
        $this->registerVariable('spacing-sm', '8px', 'spacing');
        $this->registerVariable('spacing-md', '16px', 'spacing');
        $this->registerVariable('spacing-lg', '24px', 'spacing');
        $this->registerVariable('spacing-xl', '32px', 'spacing');

        $this->registerVariable('font-size-xs', '12px', 'typography');
        $this->registerVariable('font-size-sm', '14px', 'typography');
        $this->registerVariable('font-size-md', '16px', 'typography');
        $this->registerVariable('font-size-lg', '18px', 'typography');
        $this->registerVariable('font-size-xl', '24px', 'typography');
        $this->registerVariable('font-size-xxl', '32px', 'typography');

        $this->registerVariable('border-radius', '4px', 'layout');
        $this->registerVariable('border-radius-lg', '8px', 'layout');
        $this->registerVariable('shadow-sm', '0 1px 3px rgba(0,0,0,0.12)', 'layout');
        $this->registerVariable('shadow-md', '0 4px 6px rgba(0,0,0,0.1)', 'layout');
        $this->registerVariable('shadow-lg', '0 10px 25px rgba(0,0,0,0.15)', 'layout');

        $this->registerVariable('transition-fast', '0.15s ease-out', 'animation');
        $this->registerVariable('transition-normal', '0.3s ease-out', 'animation');
        $this->registerVariable('transition-slow', '0.5s ease-out', 'animation');
    }

    /**
     * Register a CSS variable
     *
     * @param string $name Variable name (without -- prefix)
     * @param mixed $value Variable value
     * @param string $scope Variable scope/category
     * @param array $options Additional options
     */
    public function registerVariable($name, $value, $scope = 'global', $options = []) {
        $this->variables[$name] = [
            'value' => $value,
            'scope' => $scope,
            'options' => wp_parse_args($options, [
                'fallback' => null,
                'inherit' => true,
                'responsive' => false,
                'theme_dependent' => false
            ])
        ];

        if (!isset($this->scopes[$scope])) {
            $this->scopes[$scope] = [];
        }

        $this->scopes[$scope][] = $name;
    }

    /**
     * Generate complete CSS with variables
     *
     * @param array $settings Plugin settings
     * @param array $options Generation options
     * @return string Generated CSS
     */
    public function generateCSS($settings = [], $options = []) {
        $options = wp_parse_args($options, [
            'include_fallbacks' => true,
            'include_prefixes' => true,
            'minify' => $this->minify,
            'scope' => ':root'
        ]);

        $css_parts = [];

        $css_parts[] = $this->generateVariables($settings, $options);

        $css_parts[] = $this->generateComponentStyles($settings, $options);

        $css_parts[] = $this->generateResponsiveStyles($settings, $options);

        $css_parts[] = $this->generateThemeStyles($settings, $options);

        $css = implode("\n\n", array_filter($css_parts));

        if ($options['minify']) {
            $css = $this->minifyCSS($css);
        }

        return $css;
    }

    /**
     * Generate CSS variables declaration
     *
     * @param array $settings Plugin settings
     * @param array $options Generation options
     * @return string CSS variables
     */
    private function generateVariables($settings, $options) {
        $variables_css = [];
        $fallbacks_css = [];

        foreach ($this->variables as $name => $config) {
            $value = $this->getVariableValue($name, $settings);
            $css_var = "--las-{$name}";

            $variables_css[] = "{$css_var}: {$value};";

            if ($options['include_fallbacks'] && $config['options']['fallback']) {
                $fallback_value = $config['options']['fallback'];
                $fallbacks_css[] = "{$css_var}-fallback: {$fallback_value};";
            }
        }

        $css = $options['scope'] . " {\n";
        $css .= "  " . implode("\n  ", array_merge($fallbacks_css, $variables_css));
        $css .= "\n}";

        return $css;
    }

    /**
     * Generate component-specific styles
     *
     * @param array $settings Plugin settings
     * @param array $options Generation options
     * @return string Component CSS
     */
    private function generateComponentStyles($settings, $options) {
        $components = [
            'admin-menu' => $this->generateAdminMenuStyles($settings),
            'admin-bar' => $this->generateAdminBarStyles($settings),
            'content-area' => $this->generateContentAreaStyles($settings),
            'forms' => $this->generateFormStyles($settings),
            'buttons' => $this->generateButtonStyles($settings)
        ];

        return implode("\n\n", array_filter($components));
    }

    /**
     * Generate admin menu styles
     *
     * @param array $settings Plugin settings
     * @return string Admin menu CSS
     */
    private function generateAdminMenuStyles($settings) {
        $css = '
        #adminmenu {
            background: var(--las-menu-background, var(--las-secondary-color));
            color: var(--las-menu-text-color, #ffffff);
        }

        #adminmenu a {
            color: inherit;
            transition: var(--las-transition-fast);
        }

        #adminmenu .wp-has-current-submenu .wp-submenu,
        #adminmenu .wp-has-current-submenu .wp-submenu a,
        #adminmenu a.wp-has-current-submenu:focus + .wp-submenu a {
            color: var(--las-menu-submenu-color, #b4b9be);
        }

        #adminmenu li.current a.menu-top,
        #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu {
            background: var(--las-menu-active-background, var(--las-primary-color));
            color: var(--las-menu-active-color, #ffffff);
        }

        #adminmenu .wp-submenu {
            background: var(--las-menu-submenu-background, rgba(0,0,0,0.1));
        }
        ';

        return $this->processCSS($css, $settings);
    }

    /**
     * Generate admin bar styles
     *
     * @param array $settings Plugin settings
     * @return string Admin bar CSS
     */
    private function generateAdminBarStyles($settings) {
        $css = '
        #wpadminbar {
            background: var(--las-adminbar-background, var(--las-secondary-color));
            height: var(--las-adminbar-height, 32px);
        }

        #wpadminbar .ab-item,
        #wpadminbar a.ab-item,
        #wpadminbar > #wp-toolbar span.ab-label,
        #wpadminbar > #wp-toolbar span.noticon {
            color: var(--las-adminbar-text-color, #ffffff);
        }

        #wpadminbar .ab-top-menu > li:hover > .ab-item,
        #wpadminbar .ab-top-menu > li.hover > .ab-item,
        #wpadminbar .ab-top-menu > li > .ab-item:focus {
            background: var(--las-adminbar-hover-background, rgba(255,255,255,0.1));
            color: var(--las-adminbar-hover-color, #ffffff);
        }
        ';

        return $this->processCSS($css, $settings);
    }

    /**
     * Generate content area styles
     *
     * @param array $settings Plugin settings
     * @return string Content area CSS
     */
    private function generateContentAreaStyles($settings) {
        $css = '
        .wp-admin {
            background: var(--las-content-background, #f1f1f1);
            font-family: var(--las-content-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            font-size: var(--las-content-font-size, var(--las-font-size-sm));
        }

        .wrap {
            margin: var(--las-spacing-lg) var(--las-spacing-lg) 0 0;
        }

        .wp-admin h1,
        .wp-admin h2,
        .wp-admin h3 {
            color: var(--las-content-heading-color, var(--las-secondary-color));
        }
        ';

        return $this->processCSS($css, $settings);
    }

    /**
     * Generate form styles
     *
     * @param array $settings Plugin settings
     * @return string Form CSS
     */
    private function generateFormStyles($settings) {
        $css = '
        .wp-admin input[type="text"],
        .wp-admin input[type="email"],
        .wp-admin input[type="url"],
        .wp-admin input[type="password"],
        .wp-admin input[type="search"],
        .wp-admin input[type="number"],
        .wp-admin textarea,
        .wp-admin select {
            border: 1px solid var(--las-form-border-color, #ddd);
            border-radius: var(--las-border-radius);
            padding: var(--las-spacing-sm);
            font-size: var(--las-font-size-sm);
            transition: var(--las-transition-fast);
        }

        .wp-admin input[type="text"]:focus,
        .wp-admin input[type="email"]:focus,
        .wp-admin input[type="url"]:focus,
        .wp-admin input[type="password"]:focus,
        .wp-admin input[type="search"]:focus,
        .wp-admin input[type="number"]:focus,
        .wp-admin textarea:focus,
        .wp-admin select:focus {
            border-color: var(--las-primary-color);
            box-shadow: 0 0 0 1px var(--las-primary-color);
            outline: none;
        }
        ';

        return $this->processCSS($css, $settings);
    }

    /**
     * Generate button styles
     *
     * @param array $settings Plugin settings
     * @return string Button CSS
     */
    private function generateButtonStyles($settings) {
        $css = '
        .wp-admin .button,
        .wp-admin .button-primary,
        .wp-admin .button-secondary {
            border-radius: var(--las-border-radius);
            padding: var(--las-spacing-sm) var(--las-spacing-md);
            font-size: var(--las-font-size-sm);
            transition: var(--las-transition-fast);
            border: 1px solid transparent;
        }

        .wp-admin .button-primary {
            background: var(--las-primary-color);
            border-color: var(--las-primary-color);
            color: #ffffff;
        }

        .wp-admin .button-primary:hover,
        .wp-admin .button-primary:focus {
            background: var(--las-primary-color);
            filter: brightness(0.9);
            transform: translateY(-1px);
            box-shadow: var(--las-shadow-sm);
        }

        .wp-admin .button-secondary {
            background: #ffffff;
            border-color: var(--las-form-border-color, #ddd);
            color: var(--las-secondary-color);
        }

        .wp-admin .button-secondary:hover,
        .wp-admin .button-secondary:focus {
            border-color: var(--las-primary-color);
            color: var(--las-primary-color);
        }
        ';

        return $this->processCSS($css, $settings);
    }

    /**
     * Generate responsive styles
     *
     * @param array $settings Plugin settings
     * @param array $options Generation options
     * @return string Responsive CSS
     */
    private function generateResponsiveStyles($settings, $options) {
        $breakpoints = [
            'mobile' => '768px',
            'tablet' => '1024px',
            'desktop' => '1200px'
        ];

        $responsive_css = [];

        foreach ($breakpoints as $breakpoint => $width) {
            $styles = $this->generateBreakpointStyles($breakpoint, $settings);
            if (!empty($styles)) {
                $responsive_css[] = "@media (max-width: {$width}) {\n{$styles}\n}";
            }
        }

        return implode("\n\n", $responsive_css);
    }

    /**
     * Generate breakpoint-specific styles
     *
     * @param string $breakpoint Breakpoint name
     * @param array $settings Plugin settings
     * @return string Breakpoint CSS
     */
    private function generateBreakpointStyles($breakpoint, $settings) {
        $styles = [];

        if ($breakpoint === 'mobile') {
            $styles[] = '
            #adminmenu {
                transform: translateX(-100%);
                transition: var(--las-transition-normal);
            }

            #adminmenu.mobile-open {
                transform: translateX(0);
            }

            .wp-admin .wrap {
                margin: var(--las-spacing-md);
            }
            ';
        }

        return implode("\n", $styles);
    }

    /**
     * Generate theme-specific styles
     *
     * @param array $settings Plugin settings
     * @param array $options Generation options
     * @return string Theme CSS
     */
    private function generateThemeStyles($settings, $options) {
        $theme_mode = $this->settings->get('theme_mode', 'auto');
        $styles = [];

        $styles[] = '
        @media (prefers-color-scheme: dark) {
            :root {
                --las-content-background: #1e1e1e;
                --las-content-heading-color: #ffffff;
                --las-form-border-color: #444;
            }
        }

        [data-theme="dark"] {
            --las-content-background: #1e1e1e;
            --las-content-heading-color: #ffffff;
            --las-form-border-color: #444;
        }

        [data-theme="light"] {
            --las-content-background: #ffffff;
            --las-content-heading-color: #23282d;
            --las-form-border-color: #ddd;
        }
        ';

        return implode("\n", $styles);
    }

    /**
     * Get variable value from settings or default
     *
     * @param string $name Variable name
     * @param array $settings Plugin settings
     * @return mixed Variable value
     */
    private function getVariableValue($name, $settings) {
        $setting_key = str_replace('-', '_', $name);

        if (isset($settings[$setting_key])) {
            return $this->security->sanitize($settings[$setting_key]);
        }

        if (isset($this->variables[$name])) {
            return $this->variables[$name]['value'];
        }

        return '';
    }

    /**
     * Process CSS with variable substitution and optimization
     *
     * @param string $css Raw CSS
     * @param array $settings Plugin settings
     * @return string Processed CSS
     */
    private function processCSS($css, $settings) {

        $css = preg_replace('/\s+/', ' ', $css);
        $css = trim($css);

        $css = $this->addBrowserPrefixes($css);

        return $css;
    }

    /**
     * Add browser prefixes to CSS
     *
     * @param string $css CSS content
     * @return string CSS with prefixes
     */
    private function addBrowserPrefixes($css) {
        $prefixes = [
            'backdrop-filter' => ['-webkit-backdrop-filter'],
            'user-select' => ['-webkit-user-select', '-moz-user-select', '-ms-user-select'],
            'transform' => ['-webkit-transform', '-moz-transform', '-ms-transform'],
            'transition' => ['-webkit-transition', '-moz-transition', '-ms-transition']
        ];

        foreach ($prefixes as $property => $vendor_prefixes) {
            foreach ($vendor_prefixes as $prefix) {
                $css = str_replace($property . ':', $prefix . ': $1; ' . $property . ':', $css);
            }
        }

        return $css;
    }

    /**
     * Minify CSS content
     *
     * @param string $css CSS content
     * @return string Minified CSS
     */
    private function minifyCSS($css) {

        $css = preg_replace('!/\*[^*]*\*+([^/][^*]*\*+)*/!', '', $css);

        $css = preg_replace('/\s+/', ' ', $css);
        $css = preg_replace('/\s*{\s*/', '{', $css);
        $css = preg_replace('/;\s*}/', '}', $css);
        $css = preg_replace('/\s*;\s*/', ';', $css);
        $css = preg_replace('/\s*,\s*/', ',', $css);
        $css = preg_replace('/\s*>\s*/', '>', $css);
        $css = preg_replace('/\s*\+\s*/', '+', $css);
        $css = preg_replace('/\s*~\s*/', '~', $css);

        return trim($css);
    }

    /**
     * Generate CSS for specific component
     *
     * @param string $component Component name
     * @param array $settings Component settings
     * @return string Component CSS
     */
    public function generateComponentCSS($component, $settings = []) {
        $cache_key = "component_css_{$component}_" . md5(serialize($settings));

        return $this->cache->remember($cache_key, function() use ($component, $settings) {
            switch ($component) {
                case 'admin-menu':
                    return $this->generateAdminMenuStyles($settings);
                case 'admin-bar':
                    return $this->generateAdminBarStyles($settings);
                case 'content-area':
                    return $this->generateContentAreaStyles($settings);
                case 'forms':
                    return $this->generateFormStyles($settings);
                case 'buttons':
                    return $this->generateButtonStyles($settings);
                default:
                    return '';
            }
        }, 3600);
    }

    /**
     * Get all registered variables
     *
     * @param string $scope Optional scope filter
     * @return array Variables
     */
    public function getVariables($scope = null) {
        if ($scope && isset($this->scopes[$scope])) {
            $scoped_vars = [];
            foreach ($this->scopes[$scope] as $var_name) {
                $scoped_vars[$var_name] = $this->variables[$var_name];
            }
            return $scoped_vars;
        }

        return $this->variables;
    }

    /**
     * Get CSS generation statistics
     *
     * @return array Statistics
     */
    public function getStats() {
        return [
            'total_variables' => count($this->variables),
            'scopes' => array_keys($this->scopes),
            'cache_hits' => $this->cache->getMetrics()['hits'] ?? 0,
            'cache_misses' => $this->cache->getMetrics()['misses'] ?? 0
        ];
    }
}