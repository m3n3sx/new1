<?php

use WP_UnitTestCase;

/**
 * Advanced CSS Generation Tests
 * Tests comprehensive CSS generation with various input combinations and edge cases
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
class TestCssGenerationAdvanced extends WP_UnitTestCase {

    private function get_test_default_options() {
        return [
            'body_bg_color' => '#f0f0f1',
            'body_text_color' => '#3c434a',
            'admin_menu_bg_color' => '#23282d',
            'admin_menu_text_color' => '#ffffff',
            'admin_menu_width' => '160',
            'admin_menu_bg_type' => 'solid',
            'admin_menu_border_radius_type' => 'none',
            'admin_menu_border_radius_all' => '0',
            'admin_menu_shadow_type' => 'none',
            'admin_bar_bg_color' => '#23282d',
            'admin_bar_text_color' => '#ffffff',
            'admin_menu_bg_gradient_direction' => '45deg',
            'admin_menu_bg_gradient_color1' => '#ffffff',
            'admin_menu_bg_gradient_color2' => '#f0f0f0',
            'admin_menu_shadow_simple' => '',
            'admin_menu_shadow_advanced_offset_x' => '0',
            'admin_menu_shadow_advanced_offset_y' => '0',
            'admin_menu_shadow_advanced_blur' => '0',
            'admin_menu_shadow_advanced_spread' => '0',
            'admin_menu_shadow_advanced_color' => 'rgba(0,0,0,0.1)',
        ];
    }

    public function setUp() {
        parent::setUp();
        
        if (!function_exists('las_fresh_generate_admin_css_output')) {
            $this->markTestSkipped('las_fresh_generate_admin_css_output() function not found.');
        }
        
        // Mock default options function if needed
        if (!function_exists('las_fresh_get_default_options')) {
            eval('function las_fresh_get_default_options() { return ' . var_export($this->get_test_default_options(), true) . '; }');
        }
        
        update_option('las_fresh_options', $this->get_test_default_options());
    }

    public function tearDown() {
        delete_option('las_fresh_options');
        parent::tearDown();
    }

    /**
     * Test CSS generation with invalid color values
     * Requirements: 4.1, 4.5
     */
    public function test_css_generation_with_invalid_colors() {
        $options = $this->get_test_default_options();
        
        // Test various invalid color formats
        $invalid_colors = [
            '#gggggg',    // Invalid hex
            'rgb(300, 300, 300)', // Out of range RGB
            'hsl(400, 150%, 150%)', // Out of range HSL
            'javascript:alert(1)', // Malicious input
            '<script>alert(1)</script>', // XSS attempt
            '',           // Empty string
            null,         // Null value
        ];
        
        foreach ($invalid_colors as $invalid_color) {
            $options['admin_menu_bg_color'] = $invalid_color;
            update_option('las_fresh_options', $options);
            
            $css = las_fresh_generate_admin_css_output();
            
            // Should not contain the invalid color
            $this->assertStringNotContainsString($invalid_color, $css, 
                "Invalid color '$invalid_color' should not appear in CSS output");
            
            // Should contain a fallback color or be properly handled
            $this->assertIsString($css, 'CSS output should still be a string with invalid colors');
        }
    }

    /**
     * Test CSS generation with extreme numeric values
     * Requirements: 4.1, 4.5
     */
    public function test_css_generation_with_extreme_numeric_values() {
        $options = $this->get_test_default_options();
        
        // Test extreme values
        $extreme_values = [
            '-999999',    // Very negative
            '999999',     // Very large
            '0.000001',   // Very small decimal
            'abc',        // Non-numeric
            '10px',       // With units (should be stripped)
            '50%',        // Percentage (should be handled)
        ];
        
        foreach ($extreme_values as $extreme_value) {
            $options['admin_menu_width'] = $extreme_value;
            update_option('las_fresh_options', $options);
            
            $css = las_fresh_generate_admin_css_output();
            
            // Should not break CSS generation
            $this->assertIsString($css, "CSS generation should handle extreme value '$extreme_value'");
            
            // Should not contain obviously invalid CSS
            $this->assertStringNotContainsString('width: abcpx', $css, 
                'Should not generate invalid CSS units');
        }
    }

    /**
     * Test CSS generation with complex gradient combinations
     * Requirements: 4.1, 4.2
     */
    public function test_css_generation_with_complex_gradients() {
        $options = $this->get_test_default_options();
        $options['admin_menu_bg_type'] = 'gradient';
        
        // Test various gradient configurations
        $gradient_tests = [
            [
                'direction' => '0deg',
                'color1' => '#ff0000',
                'color2' => '#0000ff',
                'expected' => 'linear-gradient(0deg, #ff0000, #0000ff)'
            ],
            [
                'direction' => '90deg',
                'color1' => 'rgba(255, 0, 0, 0.5)',
                'color2' => 'rgba(0, 0, 255, 0.8)',
                'expected' => 'linear-gradient(90deg, rgba(255, 0, 0, 0.5), rgba(0, 0, 255, 0.8))'
            ],
            [
                'direction' => 'to right',
                'color1' => 'hsl(0, 100%, 50%)',
                'color2' => 'hsl(240, 100%, 50%)',
                'expected' => 'linear-gradient(to right, hsl(0, 100%, 50%), hsl(240, 100%, 50%))'
            ],
        ];
        
        foreach ($gradient_tests as $test) {
            $options['admin_menu_bg_gradient_direction'] = $test['direction'];
            $options['admin_menu_bg_gradient_color1'] = $test['color1'];
            $options['admin_menu_bg_gradient_color2'] = $test['color2'];
            
            update_option('las_fresh_options', $options);
            $css = las_fresh_generate_admin_css_output();
            
            $this->assertStringContainsString('background-image:', $css, 
                'Gradient CSS should contain background-image property');
            $this->assertStringContainsString('linear-gradient', $css, 
                'Gradient CSS should contain linear-gradient function');
        }
    }

    /**
     * Test CSS generation with combined visual effects
     * Requirements: 4.2, 4.4
     */
    public function test_css_generation_with_combined_visual_effects() {
        $options = $this->get_test_default_options();
        
        // Combine border radius, shadow, and gradient
        $options['admin_menu_bg_type'] = 'gradient';
        $options['admin_menu_bg_gradient_direction'] = '45deg';
        $options['admin_menu_bg_gradient_color1'] = '#ff6b6b';
        $options['admin_menu_bg_gradient_color2'] = '#4ecdc4';
        $options['admin_menu_border_radius_type'] = 'all';
        $options['admin_menu_border_radius_all'] = '12';
        $options['admin_menu_shadow_type'] = 'advanced';
        $options['admin_menu_shadow_advanced_offset_x'] = '0';
        $options['admin_menu_shadow_advanced_offset_y'] = '4';
        $options['admin_menu_shadow_advanced_blur'] = '12';
        $options['admin_menu_shadow_advanced_spread'] = '0';
        $options['admin_menu_shadow_advanced_color'] = 'rgba(0,0,0,0.15)';
        
        update_option('las_fresh_options', $options);
        $css = las_fresh_generate_admin_css_output();
        
        // Should contain all visual effects
        $this->assertStringContainsString('linear-gradient', $css, 
            'Combined effects should include gradient');
        $this->assertStringContainsString('border-radius', $css, 
            'Combined effects should include border radius');
        $this->assertStringContainsString('box-shadow', $css, 
            'Combined effects should include shadow');
        
        // Should handle potential conflicts properly
        $this->assertStringContainsString('overflow: hidden', $css, 
            'Combined effects should include overflow handling for border radius');
        $this->assertStringContainsString('z-index', $css, 
            'Combined effects should include z-index for shadow layering');
    }

    /**
     * Test CSS generation with malicious input attempts
     * Requirements: 4.5
     */
    public function test_css_generation_security_validation() {
        $options = $this->get_test_default_options();
        
        // Test various malicious inputs
        $malicious_inputs = [
            'javascript:alert(1)',
            'expression(alert(1))',
            'url(javascript:alert(1))',
            '<script>alert(1)</script>',
            'behavior:url(malicious.htc)',
            '@import url(malicious.css)',
            'binding:url(malicious.xml)',
            'document.cookie',
            'vbscript:msgbox(1)',
        ];
        
        foreach ($malicious_inputs as $malicious_input) {
            $options['admin_menu_bg_color'] = $malicious_input;
            update_option('las_fresh_options', $options);
            
            $css = las_fresh_generate_admin_css_output();
            
            // Should not contain malicious content
            $this->assertStringNotContainsString('javascript:', $css, 
                'CSS should not contain javascript: protocol');
            $this->assertStringNotContainsString('expression(', $css, 
                'CSS should not contain expression() function');
            $this->assertStringNotContainsString('<script', $css, 
                'CSS should not contain script tags');
            $this->assertStringNotContainsString('behavior:', $css, 
                'CSS should not contain behavior property');
            $this->assertStringNotContainsString('@import', $css, 
                'CSS should not contain @import statements');
        }
    }

    /**
     * Test CSS generation performance with large option sets
     * Requirements: 7.1, 7.2
     */
    public function test_css_generation_performance() {
        $options = $this->get_test_default_options();
        
        // Add many options to test performance
        for ($i = 0; $i < 100; $i++) {
            $options["custom_option_$i"] = "value_$i";
        }
        
        update_option('las_fresh_options', $options);
        
        $start_time = microtime(true);
        $css = las_fresh_generate_admin_css_output();
        $end_time = microtime(true);
        
        $execution_time = ($end_time - $start_time) * 1000; // Convert to milliseconds
        
        // Should complete within reasonable time (500ms)
        $this->assertLessThan(500, $execution_time, 
            'CSS generation should complete within 500ms even with large option sets');
        
        $this->assertIsString($css, 'CSS should still be generated correctly');
    }

    /**
     * Test CSS generation with memory constraints
     * Requirements: 7.2
     */
    public function test_css_generation_memory_usage() {
        $memory_before = memory_get_usage();
        
        // Generate CSS multiple times to test memory usage
        for ($i = 0; $i < 10; $i++) {
            $css = las_fresh_generate_admin_css_output();
            unset($css); // Explicitly unset to help with garbage collection
        }
        
        $memory_after = memory_get_usage();
        $memory_increase = $memory_after - $memory_before;
        
        // Memory increase should be reasonable (less than 1MB)
        $this->assertLessThan(1048576, $memory_increase, 
            'CSS generation should not cause excessive memory usage');
    }

    /**
     * Test CSS generation with edge case option combinations
     * Requirements: 4.3, 4.4
     */
    public function test_css_generation_edge_case_combinations() {
        $options = $this->get_test_default_options();
        
        // Test edge case: zero values
        $options['admin_menu_width'] = '0';
        $options['admin_menu_border_radius_all'] = '0';
        $options['admin_menu_shadow_advanced_blur'] = '0';
        
        update_option('las_fresh_options', $options);
        $css = las_fresh_generate_admin_css_output();
        
        $this->assertIsString($css, 'Should handle zero values correctly');
        $this->assertStringContainsString('width: 0px', $css, 
            'Should generate valid CSS for zero width');
        
        // Test edge case: maximum values
        $options['admin_menu_width'] = '9999';
        $options['admin_menu_border_radius_all'] = '9999';
        
        update_option('las_fresh_options', $options);
        $css = las_fresh_generate_admin_css_output();
        
        $this->assertIsString($css, 'Should handle maximum values correctly');
        
        // Test edge case: conflicting settings
        $options['admin_menu_bg_type'] = 'gradient';
        $options['admin_menu_bg_color'] = '#ff0000'; // Solid color with gradient type
        
        update_option('las_fresh_options', $options);
        $css = las_fresh_generate_admin_css_output();
        
        $this->assertIsString($css, 'Should handle conflicting settings gracefully');
    }

    /**
     * Test CSS generation with internationalization considerations
     * Requirements: 6.1
     */
    public function test_css_generation_with_i18n_values() {
        $options = $this->get_test_default_options();
        
        // Test with various character encodings and special characters
        $i18n_values = [
            'admin_menu_bg_color' => '#ff0000', // Standard
            'custom_font_family' => 'Arial, "Helvetica Neue", sans-serif', // Quoted font names
            'custom_content' => 'Content with émojis 🎨 and spëcial chars', // Special characters
        ];
        
        foreach ($i18n_values as $key => $value) {
            $options[$key] = $value;
        }
        
        update_option('las_fresh_options', $options);
        $css = las_fresh_generate_admin_css_output();
        
        $this->assertIsString($css, 'Should handle internationalization correctly');
        
        // Should be valid UTF-8
        $this->assertTrue(mb_check_encoding($css, 'UTF-8'), 
            'Generated CSS should be valid UTF-8');
    }

    /**
     * Test CSS generation with responsive design considerations
     * Requirements: 3.2, 3.3
     */
    public function test_css_generation_responsive_design() {
        $options = $this->get_test_default_options();
        $options['admin_menu_width'] = '250';
        
        update_option('las_fresh_options', $options);
        $css = las_fresh_generate_admin_css_output();
        
        // Should include responsive considerations for collapsed menu
        $this->assertStringContainsString('folded', $css, 
            'CSS should include responsive rules for collapsed menu state');
        
        // Should handle different screen sizes appropriately
        $this->assertStringContainsString('margin-left', $css, 
            'CSS should include layout adjustments for menu width');
    }

    /**
     * Test CSS generation with browser compatibility
     * Requirements: 6.3
     */
    public function test_css_generation_browser_compatibility() {
        $options = $this->get_test_default_options();
        $options['admin_menu_bg_type'] = 'gradient';
        $options['admin_menu_shadow_type'] = 'simple';
        $options['admin_menu_shadow_simple'] = '0 2px 4px rgba(0,0,0,0.1)';
        
        update_option('las_fresh_options', $options);
        $css = las_fresh_generate_admin_css_output();
        
        // Should include vendor prefixes where necessary
        $this->assertStringContainsString('!important', $css, 
            'CSS should use !important for specificity where needed');
        
        // Should use standard CSS properties
        $this->assertStringContainsString('background-image', $css, 
            'CSS should use standard background-image for gradients');
        $this->assertStringContainsString('box-shadow', $css, 
            'CSS should use standard box-shadow property');
    }

    /**
     * Test CSS generation error recovery
     * Requirements: 5.1, 5.5
     */
    public function test_css_generation_error_recovery() {
        // Test with corrupted options
        update_option('las_fresh_options', 'corrupted_data');
        
        $css = las_fresh_generate_admin_css_output();
        
        // Should still return valid CSS (fallback to defaults)
        $this->assertIsString($css, 'Should return string even with corrupted options');
        $this->assertNotEmpty($css, 'Should return non-empty CSS with fallback values');
        
        // Test with missing options
        delete_option('las_fresh_options');
        
        $css = las_fresh_generate_admin_css_output();
        
        $this->assertIsString($css, 'Should handle missing options gracefully');
    }

    /**
     * Test CSS generation with caching considerations
     * Requirements: 7.3
     */
    public function test_css_generation_caching_behavior() {
        $options = $this->get_test_default_options();
        update_option('las_fresh_options', $options);
        
        // Generate CSS multiple times
        $css1 = las_fresh_generate_admin_css_output();
        $css2 = las_fresh_generate_admin_css_output();
        
        // Should be consistent
        $this->assertEquals($css1, $css2, 'CSS generation should be consistent');
        
        // Change options and regenerate
        $options['admin_menu_bg_color'] = '#ff0000';
        update_option('las_fresh_options', $options);
        
        $css3 = las_fresh_generate_admin_css_output();
        
        // Should reflect changes
        $this->assertNotEquals($css1, $css3, 'CSS should change when options change');
        $this->assertStringContainsString('#ff0000', $css3, 'CSS should contain new color');
    }

    /**
     * Test CSS generation output validation
     * Requirements: 4.5
     */
    public function test_css_generation_output_validation() {
        $options = $this->get_test_default_options();
        update_option('las_fresh_options', $options);
        
        $css = las_fresh_generate_admin_css_output();
        
        // Basic CSS syntax validation
        $this->assertStringNotContainsString(';;', $css, 
            'CSS should not contain double semicolons');
        $this->assertStringNotContainsString('{}', $css, 
            'CSS should not contain empty rule sets');
        
        // Count braces to ensure they're balanced
        $open_braces = substr_count($css, '{');
        $close_braces = substr_count($css, '}');
        $this->assertEquals($open_braces, $close_braces, 
            'CSS should have balanced braces');
        
        // Should not contain obvious syntax errors
        $this->assertStringNotContainsString(': ;', $css, 
            'CSS should not contain empty property values');
        $this->assertStringNotContainsString('px px', $css, 
            'CSS should not contain duplicate units');
    }
}