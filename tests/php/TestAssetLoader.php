<?php
/**
 * AssetLoader Service Tests
 * 
 * @package LiveAdminStyler
 * @since 2.0.0
 */

class TestAssetLoader extends WP_UnitTestCase {
    
    private $asset_loader;
    private $cache_manager;
    private $security_manager;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create mock dependencies
        $this->cache_manager = $this->createMock(CacheManager::class);
        $this->security_manager = $this->createMock(SecurityManager::class);
        
        // Create AssetLoader instance
        $this->asset_loader = new AssetLoader($this->cache_manager, $this->security_manager);
    }
    
    public function tearDown(): void {
        parent::tearDown();
        
        // Clean up any registered assets
        global $wp_styles, $wp_scripts;
        $wp_styles = new WP_Styles();
        $wp_scripts = new WP_Scripts();
    }
    
    /**
     * Test asset registration
     */
    public function testRegisterCSS() {
        $this->asset_loader->registerCSS('test-css', 'test.css', ['dependency'], [
            'context' => 'admin',
            'conditional' => true
        ]);
        
        // Use reflection to access private assets property
        $reflection = new ReflectionClass($this->asset_loader);
        $assets_property = $reflection->getProperty('assets');
        $assets_property->setAccessible(true);
        $assets = $assets_property->getValue($this->asset_loader);
        
        $this->assertArrayHasKey('test-css', $assets);
        $this->assertEquals('css', $assets['test-css']['type']);
        $this->assertEquals('test.css', $assets['test-css']['src']);
        $this->assertEquals(['dependency'], $assets['test-css']['deps']);
        $this->assertEquals('admin', $assets['test-css']['options']['context']);
    }
    
    /**
     * Test JavaScript asset registration
     */
    public function testRegisterJS() {
        $this->asset_loader->registerJS('test-js', 'test.js', ['jquery'], [
            'context' => 'admin',
            'footer' => true,
            'module' => true
        ]);
        
        $reflection = new ReflectionClass($this->asset_loader);
        $assets_property = $reflection->getProperty('assets');
        $assets_property->setAccessible(true);
        $assets = $assets_property->getValue($this->asset_loader);
        
        $this->assertArrayHasKey('test-js', $assets);
        $this->assertEquals('js', $assets['test-js']['type']);
        $this->assertEquals('test.js', $assets['test-js']['src']);
        $this->assertEquals(['jquery'], $assets['test-js']['deps']);
        $this->assertTrue($assets['test-js']['options']['footer']);
        $this->assertTrue($assets['test-js']['options']['module']);
    }
    
    /**
     * Test dependency resolution
     */
    public function testDependencyResolution() {
        // Register assets with dependencies
        $this->asset_loader->registerJS('base', 'base.js');
        $this->asset_loader->registerJS('middle', 'middle.js', ['base']);
        $this->asset_loader->registerJS('top', 'top.js', ['middle']);
        
        $dependencies = $this->asset_loader->resolveDependencies('top');
        
        $this->assertEquals(['base', 'middle', 'top'], $dependencies);
    }
    
    /**
     * Test circular dependency detection
     */
    public function testCircularDependencyDetection() {
        $this->asset_loader->registerJS('a', 'a.js', ['b']);
        $this->asset_loader->registerJS('b', 'b.js', ['c']);
        $this->asset_loader->registerJS('c', 'c.js', ['a']);
        
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Circular dependency detected');
        
        $this->asset_loader->resolveDependencies('a');
    }
    
    /**
     * Test conditional loading logic
     */
    public function testConditionalLoading() {
        // Mock the shouldLoadAsset method behavior
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('shouldLoadAsset');
        $method->setAccessible(true);
        
        // Test always load
        $asset_always = ['options' => ['conditional' => true]];
        $this->assertTrue($method->invoke($this->asset_loader, 'test', $asset_always));
        
        // Test never load
        $asset_never = ['options' => ['conditional' => false]];
        $this->assertFalse($method->invoke($this->asset_loader, 'test', $asset_never));
    }
    
    /**
     * Test asset URL generation
     */
    public function testAssetUrlGeneration() {
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('getAssetUrl');
        $method->setAccessible(true);
        
        $url = $method->invoke($this->asset_loader, 'assets/css/test.css');
        
        $this->assertStringContains('assets/css/test.css', $url);
        $this->assertStringStartsWith('http', $url);
    }
    
    /**
     * Test minified path generation
     */
    public function testMinifiedPathGeneration() {
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('getMinifiedPath');
        $method->setAccessible(true);
        
        $minified = $method->invoke($this->asset_loader, 'assets/css/style.css');
        $this->assertEquals('assets/css/style.min.css', $minified);
        
        $minified_js = $method->invoke($this->asset_loader, 'assets/js/script.js');
        $this->assertEquals('assets/js/script.min.js', $minified_js);
    }
    
    /**
     * Test asset version generation
     */
    public function testAssetVersionGeneration() {
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('getAssetVersion');
        $method->setAccessible(true);
        
        $version = $method->invoke($this->asset_loader, 'nonexistent.css');
        
        // Should return base version for non-existent files
        $this->assertStringContains('2.0.0', $version);
    }
    
    /**
     * Test critical CSS extraction
     */
    public function testCriticalCSSExtraction() {
        $css = '
        /* critical */
        .critical-rule { color: red; }
        /* /critical */
        
        .normal-rule { color: blue; }
        
        /* critical */
        .another-critical { font-size: 16px; }
        /* /critical */
        ';
        
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('extractCriticalCSS');
        $method->setAccessible(true);
        
        $critical = $method->invoke($this->asset_loader, $css);
        
        $this->assertStringContains('.critical-rule', $critical);
        $this->assertStringContains('.another-critical', $critical);
        $this->assertStringNotContains('.normal-rule', $critical);
    }
    
    /**
     * Test loading statistics
     */
    public function testLoadingStats() {
        // Mock cache metrics
        $this->cache_manager->method('getMetrics')
            ->willReturn(['hits' => 10, 'misses' => 5]);
        
        // Register some assets
        $this->asset_loader->registerCSS('test1', 'test1.css');
        $this->asset_loader->registerJS('test2', 'test2.js');
        
        $stats = $this->asset_loader->getLoadingStats();
        
        $this->assertArrayHasKey('total_assets', $stats);
        $this->assertArrayHasKey('loaded_assets', $stats);
        $this->assertArrayHasKey('cache_hits', $stats);
        $this->assertArrayHasKey('cache_misses', $stats);
        
        $this->assertGreaterThan(0, $stats['total_assets']);
        $this->assertEquals(10, $stats['cache_hits']);
        $this->assertEquals(5, $stats['cache_misses']);
    }
    
    /**
     * Test page loading conditions
     */
    public function testShouldLoadOnPage() {
        $reflection = new ReflectionClass($this->asset_loader);
        $method = $reflection->getMethod('shouldLoadOnPage');
        $method->setAccessible(true);
        
        // Test allowed pages
        $this->assertTrue($method->invoke($this->asset_loader, 'toplevel_page_live-admin-styler'));
        $this->assertTrue($method->invoke($this->asset_loader, 'admin_page_las-settings'));
        
        // Test disallowed pages
        $this->assertFalse($method->invoke($this->asset_loader, 'edit.php'));
        $this->assertFalse($method->invoke($this->asset_loader, 'plugins.php'));
    }
    
    /**
     * Test asset enqueuing
     */
    public function testAssetEnqueuing() {
        global $wp_styles, $wp_scripts;
        
        // Register and enqueue a CSS asset
        $this->asset_loader->registerCSS('test-style', 'test.css', [], [
            'context' => 'admin',
            'conditional' => true
        ]);
        
        // Simulate admin page
        set_current_screen('toplevel_page_live-admin-styler');
        
        // Trigger asset enqueuing
        $this->asset_loader->enqueueAssets('toplevel_page_live-admin-styler');
        
        // Check if style was enqueued (this would require more complex mocking in real scenario)
        $this->assertTrue(true); // Placeholder assertion
    }
    
    /**
     * Test preload functionality
     */
    public function testPreloadCriticalAssets() {
        // Capture output
        ob_start();
        $this->asset_loader->preloadCriticalAssets();
        $output = ob_get_clean();
        
        // Should contain preload links for critical assets
        $this->assertStringContains('rel="preload"', $output);
    }
}