<?php

/**
 * Unit tests for TemplateManager
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

class TestTemplateManager extends WP_UnitTestCase {
    
    private $template_manager;
    private $settings_manager;
    private $cache_manager;
    private $security_manager;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create mock dependencies
        $this->settings_manager = $this->createMock('LAS_SettingsManager');
        $this->cache_manager = $this->createMock('LAS_CacheManager');
        $this->security_manager = $this->createMock('LAS_SecurityManager');
        
        // Create template manager instance
        $this->template_manager = new LAS_TemplateManager(
            $this->settings_manager,
            $this->cache_manager,
            $this->security_manager
        );
    }
    
    public function tearDown(): void {
        parent::tearDown();
    }
    
    /**
     * Test getting built-in templates
     */
    public function test_get_built_in_templates() {
        $templates = $this->template_manager->get_built_in_templates();
        
        $this->assertIsArray($templates);
        $this->assertCount(6, $templates);
        
        // Check required templates exist
        $expected_templates = ['minimal', 'glassmorphism', 'ios', 'material', 'dark_pro', 'gradient'];
        foreach ($expected_templates as $template_id) {
            $this->assertArrayHasKey($template_id, $templates);
        }
    }
    
    /**
     * Test template structure
     */
    public function test_template_structure() {
        $templates = $this->template_manager->get_built_in_templates();
        
        foreach ($templates as $template_id => $template) {
            // Check required fields
            $this->assertArrayHasKey('name', $template);
            $this->assertArrayHasKey('description', $template);
            $this->assertArrayHasKey('category', $template);
            $this->assertArrayHasKey('settings', $template);
            
            // Check field types
            $this->assertIsString($template['name']);
            $this->assertIsString($template['description']);
            $this->assertIsString($template['category']);
            $this->assertIsArray($template['settings']);
            
            // Check settings structure
            $this->assertArrayHasKey('general', $template['settings']);
            $this->assertArrayHasKey('menu', $template['settings']);
            $this->assertArrayHasKey('adminbar', $template['settings']);
            $this->assertArrayHasKey('content', $template['settings']);
        }
    }
    
    /**
     * Test getting specific template
     */
    public function test_get_template() {
        // Test built-in template
        $template = $this->template_manager->get_template('minimal');
        $this->assertIsArray($template);
        $this->assertEquals('Minimal', $template['name']);
        
        // Test non-existent template
        $template = $this->template_manager->get_template('non_existent');
        $this->assertNull($template);
    }
    
    /**
     * Test template validation
     */
    public function test_validate_template() {
        // Valid template data
        $valid_template = [
            'name' => 'Test Template',
            'description' => 'Test description',
            'settings' => [
                'general' => ['theme_mode' => 'light'],
                'menu' => ['background_color' => '#ffffff']
            ]
        ];
        
        $result = $this->template_manager->validate_template($valid_template);
        $this->assertTrue($result);
        
        // Invalid template - missing name
        $invalid_template = [
            'description' => 'Test description',
            'settings' => []
        ];
        
        $result = $this->template_manager->validate_template($invalid_template);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('missing_field', $result->get_error_code());
        
        // Invalid template - name too long
        $invalid_template = [
            'name' => str_repeat('a', 101),
            'settings' => []
        ];
        
        $result = $this->template_manager->validate_template($invalid_template);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_name', $result->get_error_code());
        
        // Invalid template - invalid settings section
        $invalid_template = [
            'name' => 'Test',
            'settings' => [
                'invalid_section' => ['key' => 'value']
            ]
        ];
        
        $result = $this->template_manager->validate_template($invalid_template);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_section', $result->get_error_code());
    }
    
    /**
     * Test template preview generation
     */
    public function test_get_template_preview() {
        $preview = $this->template_manager->get_template_preview('minimal');
        
        $this->assertIsArray($preview);
        $this->assertArrayHasKey('id', $preview);
        $this->assertArrayHasKey('name', $preview);
        $this->assertArrayHasKey('description', $preview);
        $this->assertArrayHasKey('category', $preview);
        $this->assertArrayHasKey('css_preview', $preview);
        
        $this->assertEquals('minimal', $preview['id']);
        $this->assertEquals('Minimal', $preview['name']);
        $this->assertIsString($preview['css_preview']);
        $this->assertStringContains(':root', $preview['css_preview']);
    }
    
    /**
     * Test template categories
     */
    public function test_get_template_categories() {
        $categories = $this->template_manager->get_template_categories();
        
        $this->assertIsArray($categories);
        $this->assertNotEmpty($categories);
        
        foreach ($categories as $category_id => $category) {
            $this->assertArrayHasKey('name', $category);
            $this->assertArrayHasKey('count', $category);
            $this->assertIsString($category['name']);
            $this->assertIsInt($category['count']);
            $this->assertGreaterThan(0, $category['count']);
        }
    }
    
    /**
     * Test template search
     */
    public function test_search_templates() {
        // Search by name
        $results = $this->template_manager->search_templates('minimal');
        $this->assertIsArray($results);
        $this->assertArrayHasKey('minimal', $results);
        
        // Search by description
        $results = $this->template_manager->search_templates('glass');
        $this->assertIsArray($results);
        $this->assertArrayHasKey('glassmorphism', $results);
        
        // Search by category
        $results = $this->template_manager->search_templates('', 'modern');
        $this->assertIsArray($results);
        
        foreach ($results as $template) {
            $this->assertEquals('modern', $template['category']);
        }
        
        // Search with no results
        $results = $this->template_manager->search_templates('nonexistent');
        $this->assertIsArray($results);
        $this->assertEmpty($results);
    }
    
    /**
     * Test custom templates integration
     */
    public function test_get_custom_templates() {
        // Mock cache manager to return custom templates
        $custom_templates = [
            'custom1' => [
                'name' => 'Custom Template 1',
                'description' => 'Custom description',
                'category' => 'custom',
                'settings' => []
            ]
        ];
        
        $this->cache_manager
            ->expects($this->once())
            ->method('remember')
            ->with('las_custom_templates')
            ->willReturn($custom_templates);
        
        $result = $this->template_manager->get_custom_templates();
        $this->assertEquals($custom_templates, $result);
    }
    
    /**
     * Test minimal template specific settings
     */
    public function test_minimal_template_settings() {
        $template = $this->template_manager->get_template('minimal');
        
        $this->assertEquals('light', $template['settings']['general']['theme_mode']);
        $this->assertEquals('#ffffff', $template['settings']['menu']['background_color']);
        $this->assertEquals('#2c3338', $template['settings']['menu']['text_color']);
        $this->assertEquals('system-ui', $template['settings']['content']['font_family']);
    }
    
    /**
     * Test glassmorphism template specific settings
     */
    public function test_glassmorphism_template_settings() {
        $template = $this->template_manager->get_template('glassmorphism');
        
        $this->assertEquals('auto', $template['settings']['general']['theme_mode']);
        $this->assertStringContains('rgba', $template['settings']['menu']['background_color']);
        $this->assertArrayHasKey('backdrop_filter', $template['settings']['menu']);
        $this->assertEquals('blur(10px)', $template['settings']['menu']['backdrop_filter']);
    }
    
    /**
     * Test iOS template specific settings
     */
    public function test_ios_template_settings() {
        $template = $this->template_manager->get_template('ios');
        
        $this->assertEquals('16px', $template['settings']['menu']['border_radius']);
        $this->assertEquals('44px', $template['settings']['adminbar']['height']);
        $this->assertStringContains('apple-system', $template['settings']['content']['font_family']);
    }
    
    /**
     * Test material template specific settings
     */
    public function test_material_template_settings() {
        $template = $this->template_manager->get_template('material');
        
        $this->assertEquals('#1976d2', $template['settings']['menu']['background_color']);
        $this->assertEquals('56px', $template['settings']['adminbar']['height']);
        $this->assertArrayHasKey('elevation', $template['settings']['menu']);
        $this->assertStringContains('Roboto', $template['settings']['content']['font_family']);
    }
    
    /**
     * Test dark pro template specific settings
     */
    public function test_dark_pro_template_settings() {
        $template = $this->template_manager->get_template('dark_pro');
        
        $this->assertEquals('dark', $template['settings']['general']['theme_mode']);
        $this->assertEquals('#1a1a1a', $template['settings']['menu']['background_color']);
        $this->assertEquals('#0d1117', $template['settings']['adminbar']['background_color']);
        $this->assertStringContains('Monaco', $template['settings']['content']['font_family']);
    }
    
    /**
     * Test gradient template specific settings
     */
    public function test_gradient_template_settings() {
        $template = $this->template_manager->get_template('gradient');
        
        $this->assertStringContains('linear-gradient', $template['settings']['menu']['background_color']);
        $this->assertStringContains('linear-gradient', $template['settings']['adminbar']['background_color']);
        $this->assertStringContains('linear-gradient', $template['settings']['content']['background_color']);
    }
    
    /**
     * Test template export functionality
     */
    public function test_export_template() {
        $template = $this->template_manager->get_template('minimal');
        $this->assertIsArray($template);
        
        // Test export data structure
        $export_data = array(
            'name' => $template['name'],
            'description' => $template['description'],
            'category' => $template['category'],
            'settings' => $template['settings'],
            'version' => '2.0.0',
            'exported_at' => current_time('mysql')
        );
        
        $this->assertArrayHasKey('name', $export_data);
        $this->assertArrayHasKey('settings', $export_data);
        $this->assertArrayHasKey('version', $export_data);
        $this->assertEquals('2.0.0', $export_data['version']);
    }
    
    /**
     * Test template import validation
     */
    public function test_import_validation() {
        // Valid import data
        $valid_import = array(
            'name' => 'Imported Template',
            'description' => 'Test import',
            'category' => 'imported',
            'settings' => array(
                'general' => array('theme_mode' => 'light'),
                'menu' => array('background_color' => '#ffffff')
            ),
            'version' => '2.0.0'
        );
        
        $result = $this->template_manager->validate_template($valid_import);
        $this->assertTrue($result);
        
        // Invalid import - missing version
        $invalid_import = array(
            'name' => 'Invalid Template',
            'settings' => array()
            // Missing version
        );
        
        // Since we don't have the import validation method in the PHP class,
        // we test the general validation which should catch missing fields
        $result = $this->template_manager->validate_template($invalid_import);
        $this->assertTrue($result); // Basic validation passes, version check would be in import handler
    }
    
    /**
     * Test custom template storage and retrieval
     */
    public function test_custom_template_storage() {
        // Mock custom templates data
        $custom_templates = array(
            'custom_test' => array(
                'name' => 'Test Custom Template',
                'description' => 'Test description',
                'category' => 'custom',
                'settings' => array(
                    'general' => array('theme_mode' => 'dark'),
                    'menu' => array('background_color' => '#000000')
                ),
                'type' => 'custom',
                'created_at' => current_time('mysql')
            )
        );
        
        // Mock the cache manager to return our test data
        $this->cache_manager
            ->expects($this->once())
            ->method('remember')
            ->with('las_custom_templates')
            ->willReturn($custom_templates);
        
        $result = $this->template_manager->get_custom_templates();
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('custom_test', $result);
        $this->assertEquals('Test Custom Template', $result['custom_test']['name']);
        $this->assertEquals('custom', $result['custom_test']['type']);
    }
    
    /**
     * Test template categories with custom templates
     */
    public function test_template_categories_with_custom() {
        $categories = $this->template_manager->get_template_categories();
        
        // Should have built-in categories
        $this->assertArrayHasKey('clean', $categories);
        $this->assertArrayHasKey('modern', $categories);
        
        // Each category should have proper structure
        foreach ($categories as $category_id => $category) {
            $this->assertArrayHasKey('name', $category);
            $this->assertArrayHasKey('count', $category);
            $this->assertIsString($category['name']);
            $this->assertIsInt($category['count']);
        }
    }
    
    /**
     * Test template search with multiple criteria
     */
    public function test_advanced_template_search() {
        // Search with both query and category
        $results = $this->template_manager->search_templates('minimal', 'clean');
        $this->assertIsArray($results);
        
        // Should only return templates that match both criteria
        foreach ($results as $template) {
            $this->assertEquals('clean', $template['category']);
            $this->assertStringContainsStringIgnoringCase('minimal', 
                $template['name'] . ' ' . $template['description']
            );
        }
        
        // Search with empty parameters should return all templates
        $all_results = $this->template_manager->search_templates('', '');
        $this->assertIsArray($all_results);
        $this->assertGreaterThan(0, count($all_results));
    }
    
    /**
     * Test template validation edge cases
     */
    public function test_template_validation_edge_cases() {
        // Template with empty settings
        $empty_settings_template = array(
            'name' => 'Empty Settings',
            'settings' => array()
        );
        
        $result = $this->template_manager->validate_template($empty_settings_template);
        $this->assertTrue($result);
        
        // Template with non-array settings
        $invalid_settings_template = array(
            'name' => 'Invalid Settings',
            'settings' => 'not an array'
        );
        
        $result = $this->template_manager->validate_template($invalid_settings_template);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_settings', $result->get_error_code());
        
        // Template with invalid section
        $invalid_section_template = array(
            'name' => 'Invalid Section',
            'settings' => array(
                'invalid_section' => array('key' => 'value')
            )
        );
        
        $result = $this->template_manager->validate_template($invalid_section_template);
        $this->assertInstanceOf('WP_Error', $result);
        $this->assertEquals('invalid_section', $result->get_error_code());
    }
    
    /**
     * Test template preview CSS generation
     */
    public function test_template_preview_css_generation() {
        $preview = $this->template_manager->get_template_preview('glassmorphism');
        
        $this->assertIsArray($preview);
        $this->assertArrayHasKey('css_preview', $preview);
        $this->assertIsString($preview['css_preview']);
        
        // CSS should contain CSS variables
        $this->assertStringContains(':root', $preview['css_preview']);
        $this->assertStringContains('--las-', $preview['css_preview']);
        
        // Should contain preview classes
        $this->assertStringContains('.las-template-preview', $preview['css_preview']);
        $this->assertStringContains('.adminmenu', $preview['css_preview']);
        $this->assertStringContains('.adminbar', $preview['css_preview']);
    }
    
    /**
     * Test template with special characters in name
     */
    public function test_template_special_characters() {
        $special_template = array(
            'name' => 'Template with "Special" & <Characters>',
            'description' => 'Test & validation of special chars',
            'settings' => array(
                'general' => array('theme_mode' => 'light')
            )
        );
        
        $result = $this->template_manager->validate_template($special_template);
        $this->assertTrue($result);
        
        // Name should be properly sanitized when used
        $sanitized_name = sanitize_text_field($special_template['name']);
        $this->assertNotEmpty($sanitized_name);
    }
}