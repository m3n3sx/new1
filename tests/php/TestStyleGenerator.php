<?php
/**
 * StyleGenerator Service Tests
 * 
 * @package LiveAdminStyler
 * @since 2.0.0
 */

class TestStyleGenerator extends WP_UnitTestCase {
    
    private $style_generator;
    private $cache_manager;
    private $security_manager;
    private $settings_manager;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create mock dependencies
        $this->cache_manager = $this->createMock(CacheManager::class);
        $this->security_manager = $this->createMock(SecurityManager::class);
        $this->settings_manager = $this->createMock(SettingsManager::class);
        
        // Configure mocks
        $this->security_manager->method('sanitize')
            ->willReturnCallback(function($value) {
                return sanitize_text_field($value);
            });
        
        $this->cache_manager->method('remember')
            ->willReturnCallback(function($key, $callback) {
                return $callback();
            });
        
        // Create StyleGenerator instance
        $this->style_generator = new StyleGenerator(
            $this->cache_manager,
            $this->security_manager,
            $this->settings_manager
        );
    }
    
    /**
     * Test variable registration
     */
    public function testRegisterVariable() {
        $this->style_generator->registerVariable('test-color', '#ff0000', 'colors', [
            'fallback' => '#000000',
            'inherit' => true
        ]);
        
        $variables = $this->style_generator->getVariables();
        
        $this->assertArrayHasKey('test-color', $variables);
        $this->assertEquals('#ff0000', $variables['test-color']['value']);
        $this->assertEquals('colors', $variables['test-color']['scope']);
        $this->assertEquals('#000000', $variables['test-color']['options']['fallback']);
    }
    
    /**
     * Test variable scoping
     */
    public function testVariableScoping() {
        $this->style_generator->registerVariable('color1', '#ff0000', 'colors');
        $this->style_generator->registerVariable('color2', '#00ff00', 'colors');
        $this->style_generator->registerVariable('size1', '16px', 'typography');
        
        $color_vars = $this->style_generator->getVariables('colors');
        $typography_vars = $this->style_generator->getVariables('typography');
        
        $this->assertCount(2, $color_vars);
        $this->assertArrayHasKey('color1', $color_vars);
        $this->assertArrayHasKey('color2', $color_vars);
        
        $this->assertCount(1, $typography_vars);
        $this->assertArrayHasKey('size1', $typography_vars);
    }
    
    /**
     * Test CSS generation
     */
    public function testGenerateCSS() {
        $settings = [
            'primary_color' => '#0073aa',
            'secondary_color' => '#23282d'
        ];
        
        $css = $this->style_generator->generateCSS($settings);
        
        $this->assertStringContains(':root', $css);
        $this->assertStringContains('--las-primary-color', $css);
        $this->assertStringContains('#0073aa', $css);
        $this->assertStringContains('#adminmenu', $css);
        $this->assertStringContains('#wpadminbar', $css);
    }
    
    /**
     * Test CSS variables generation
     */
    public function testGenerateVariables() {
        $settings = ['test_var' => 'test_value'];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateVariables');
        $method->setAccessible(true);
        
        $variables_css = $method->invoke($this->style_generator, $settings, [
            'include_fallbacks' => true,
            'scope' => ':root'
        ]);
        
        $this->assertStringContains(':root {', $variables_css);
        $this->assertStringContains('--las-', $variables_css);
        $this->assertStringContains('}', $variables_css);
    }
    
    /**
     * Test admin menu styles generation
     */
    public function testGenerateAdminMenuStyles() {
        $settings = [
            'menu_background' => '#333333',
            'menu_text_color' => '#ffffff'
        ];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateAdminMenuStyles');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->style_generator, $settings);
        
        $this->assertStringContains('#adminmenu', $css);
        $this->assertStringContains('background:', $css);
        $this->assertStringContains('color:', $css);
        $this->assertStringContains('var(--las-', $css);
    }
    
    /**
     * Test admin bar styles generation
     */
    public function testGenerateAdminBarStyles() {
        $settings = [
            'adminbar_background' => '#444444',
            'adminbar_height' => '40px'
        ];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateAdminBarStyles');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->style_generator, $settings);
        
        $this->assertStringContains('#wpadminbar', $css);
        $this->assertStringContains('background:', $css);
        $this->assertStringContains('height:', $css);
        $this->assertStringContains('var(--las-', $css);
    }
    
    /**
     * Test content area styles generation
     */
    public function testGenerateContentAreaStyles() {
        $settings = [
            'content_background' => '#f9f9f9',
            'content_font_size' => '15px'
        ];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateContentAreaStyles');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->style_generator, $settings);
        
        $this->assertStringContains('.wp-admin', $css);
        $this->assertStringContains('background:', $css);
        $this->assertStringContains('font-size:', $css);
        $this->assertStringContains('var(--las-', $css);
    }
    
    /**
     * Test form styles generation
     */
    public function testGenerateFormStyles() {
        $settings = ['form_border_color' => '#cccccc'];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateFormStyles');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->style_generator, $settings);
        
        $this->assertStringContains('input[type="text"]', $css);
        $this->assertStringContains('textarea', $css);
        $this->assertStringContains('border:', $css);
        $this->assertStringContains(':focus', $css);
    }
    
    /**
     * Test button styles generation
     */
    public function testGenerateButtonStyles() {
        $settings = ['primary_color' => '#0073aa'];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateButtonStyles');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->style_generator, $settings);
        
        $this->assertStringContains('.button', $css);
        $this->assertStringContains('.button-primary', $css);
        $this->assertStringContains('background:', $css);
        $this->assertStringContains(':hover', $css);
    }
    
    /**
     * Test responsive styles generation
     */
    public function testGenerateResponsiveStyles() {
        $settings = [];
        $options = ['include_fallbacks' => true];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateResponsiveStyles');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->style_generator, $settings, $options);
        
        $this->assertStringContains('@media', $css);
        $this->assertStringContains('max-width:', $css);
    }
    
    /**
     * Test theme styles generation
     */
    public function testGenerateThemeStyles() {
        $settings = [];
        $options = [];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('generateThemeStyles');
        $method->setAccessible(true);
        
        $css = $method->invoke($this->style_generator, $settings, $options);
        
        $this->assertStringContains('prefers-color-scheme', $css);
        $this->assertStringContains('[data-theme="dark"]', $css);
        $this->assertStringContains('[data-theme="light"]', $css);
    }
    
    /**
     * Test CSS minification
     */
    public function testMinifyCSS() {
        $css = '
        /* This is a comment */
        .test {
            color: red;
            background: blue;
        }
        
        .another-test {
            margin: 10px;
        }
        ';
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('minifyCSS');
        $method->setAccessible(true);
        
        $minified = $method->invoke($this->style_generator, $css);
        
        $this->assertStringNotContains('/* This is a comment */', $minified);
        $this->assertStringNotContains("\n", $minified);
        $this->assertStringContains('.test{', $minified);
        $this->assertStringContains('color:red;', $minified);
    }
    
    /**
     * Test browser prefix addition
     */
    public function testAddBrowserPrefixes() {
        $css = '.test { backdrop-filter: blur(10px); transform: scale(1.1); }';
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('addBrowserPrefixes');
        $method->setAccessible(true);
        
        $prefixed = $method->invoke($this->style_generator, $css);
        
        $this->assertStringContains('-webkit-backdrop-filter', $prefixed);
        $this->assertStringContains('-webkit-transform', $prefixed);
    }
    
    /**
     * Test variable value retrieval
     */
    public function testGetVariableValue() {
        $settings = ['test_setting' => 'test_value'];
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('getVariableValue');
        $method->setAccessible(true);
        
        // Test with setting value
        $value = $method->invoke($this->style_generator, 'test-setting', $settings);
        $this->assertEquals('test_value', $value);
        
        // Test with default value
        $this->style_generator->registerVariable('default-var', 'default_value');
        $value = $method->invoke($this->style_generator, 'default-var', []);
        $this->assertEquals('default_value', $value);
    }
    
    /**
     * Test component CSS generation
     */
    public function testGenerateComponentCSS() {
        $settings = ['menu_background' => '#333333'];
        
        $css = $this->style_generator->generateComponentCSS('admin-menu', $settings);
        
        $this->assertStringContains('#adminmenu', $css);
        $this->assertStringContains('background:', $css);
    }
    
    /**
     * Test invalid component CSS generation
     */
    public function testGenerateInvalidComponentCSS() {
        $css = $this->style_generator->generateComponentCSS('invalid-component');
        
        $this->assertEquals('', $css);
    }
    
    /**
     * Test CSS processing
     */
    public function testProcessCSS() {
        $css = '
        .test    {
            color:   red;
            background:    blue;
        }
        ';
        
        $reflection = new ReflectionClass($this->style_generator);
        $method = $reflection->getMethod('processCSS');
        $method->setAccessible(true);
        
        $processed = $method->invoke($this->style_generator, $css, []);
        
        $this->assertStringNotContains('    ', $processed);
        $this->assertEquals(trim($processed), $processed);
    }
    
    /**
     * Test statistics generation
     */
    public function testGetStats() {
        $this->cache_manager->method('getMetrics')
            ->willReturn(['hits' => 15, 'misses' => 3]);
        
        $stats = $this->style_generator->getStats();
        
        $this->assertArrayHasKey('total_variables', $stats);
        $this->assertArrayHasKey('scopes', $stats);
        $this->assertArrayHasKey('cache_hits', $stats);
        $this->assertArrayHasKey('cache_misses', $stats);
        
        $this->assertGreaterThan(0, $stats['total_variables']);
        $this->assertEquals(15, $stats['cache_hits']);
        $this->assertEquals(3, $stats['cache_misses']);
    }
    
    /**
     * Test default variables registration
     */
    public function testDefaultVariablesRegistration() {
        $variables = $this->style_generator->getVariables();
        
        // Check that default variables are registered
        $this->assertArrayHasKey('primary-color', $variables);
        $this->assertArrayHasKey('secondary-color', $variables);
        $this->assertArrayHasKey('spacing-md', $variables);
        $this->assertArrayHasKey('font-size-sm', $variables);
        $this->assertArrayHasKey('border-radius', $variables);
        $this->assertArrayHasKey('transition-normal', $variables);
    }
}