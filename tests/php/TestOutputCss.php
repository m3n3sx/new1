<?php

use WP_UnitTestCase;

/**
 * Class TestOutputCss
 *
 * @package Live_Admin_Styler
 */
class TestOutputCss extends WP_UnitTestCase {

	/**
	 * Default options for the plugin.
	 * This should mirror your plugin's actual default options.
	 * If `las_get_default_options()` is defined in a loaded file, this might not be needed here.
	 * For robustness, we define it here to control test conditions.
	 */
	private function get_test_default_options() {
		return [
			'body_bg_color'                 => '#f0f0f1',
			'body_text_color'               => '#3c434a',
			'admin_menu_padding_top_bottom' => '0', // Key from warning
			'admin_menu_padding_left_right' => '0', // Key from warning
			'admin_menu_shadow_enabled'     => false, // Key from warning
			'admin_bar_shadow_enabled'      => false, // Key from warning
			'admin_bar_padding_top_bottom'  => '0',   // Key from warning
			'admin_bar_padding_left_right'  => '0',   // Key from warning
			// Border radius options
			'admin_menu_border_radius_type' => 'all',
			'admin_menu_border_radius_all'  => '0',
			'admin_menu_border_radius_tl'   => '0',
			'admin_menu_border_radius_tr'   => '0',
			'admin_menu_border_radius_br'   => '0',
			'admin_menu_border_radius_bl'   => '0',
			// Shadow options
			'admin_menu_shadow_type'        => 'none',
			'admin_menu_shadow_simple'      => '',
			'admin_menu_shadow_advanced_offset_x' => '0',
			'admin_menu_shadow_advanced_offset_y' => '0',
			'admin_menu_shadow_advanced_blur'     => '0',
			'admin_menu_shadow_advanced_spread'   => '0',
			'admin_menu_shadow_advanced_color'    => '',
			// Menu detached option
			'admin_menu_detached'           => false,
			// Add other relevant default options here
		];
	}

	public function setUp() {
		parent::setUp();
		// Ensure the function we are testing exists
		if ( ! function_exists( 'las_fresh_generate_admin_css_output' ) ) {
			$this->markTestSkipped( 'las_fresh_generate_admin_css_output() function not found. Check bootstrap.php or plugin file includes.' );
		}
		// Mock las_fresh_get_default_options if it's not available or to control its output
		if ( ! function_exists( 'las_fresh_get_default_options' ) ) {
			// Define a mock if it's not part of the loaded files
			eval( 'function las_fresh_get_default_options() { return ' . var_export( $this->get_test_default_options(), true ) . '; }' );
		}
		// Set default options for tests
		update_option( 'las_fresh_options', $this->get_test_default_options() );
	}

	public function tearDown() {
		delete_option( 'las_fresh_options' );
		parent::tearDown();
	}

	/**
	 * Test if las_fresh_generate_admin_css_output function exists.
	 */
	public function test_las_fresh_generate_admin_css_output_exists() {
		$this->assertTrue( function_exists( 'las_fresh_generate_admin_css_output' ), 'Function las_fresh_generate_admin_css_output should exist.' );
	}

	/**
	 * Test CSS generation with default options.
	 * This test expects that with default options, no PHP warnings/notices are thrown.
	 */
	public function test_css_generation_with_default_options() {
		// Ensure PHPUnit converts warnings to exceptions (set in phpunit.xml.dist)
		$css = las_fresh_generate_admin_css_output();
		$this->assertIsString( $css, 'CSS output should be a string.' );
		// Add more specific assertions based on expected default CSS
		// For example, if body_bg_color default is #f0f0f1
		$this->assertStringContainsString( 'background-color: #f0f0f1', $css, 'Default body background color CSS missing or incorrect.' );
	}

	/**
	 * Test CSS generation with a specific option changed.
	 */
	public function test_css_generation_with_custom_body_bg_color() {
		$options = $this->get_test_default_options();
		$options['body_bg_color'] = '#ff0000';
		update_option( 'las_fresh_options', $options );

		$css = las_fresh_generate_admin_css_output();
		$this->assertStringContainsString( 'background-color: #ff0000', $css, 'Custom body background color CSS missing or incorrect.' );
	}

	/**
	 * Test CSS generation when a potentially problematic option (from warnings) is explicitly missing from saved options.
	 * It should fall back to defaults defined in las_get_default_options() and not throw a warning.
	 */
	public function test_css_generation_with_missing_admin_menu_padding_option() {
		$current_options = get_option( 'las_fresh_options', [] );
		// Ensure the specific key is NOT set, to test default fallback
		unset( $current_options['admin_menu_padding_top_bottom'] );
		update_option( 'las_fresh_options', $current_options );

		// This call should not produce a PHP warning if las_fresh_generate_admin_css_output
		// correctly uses defaults (e.g., from las_fresh_get_default_options() via get_option).
		$css = las_fresh_generate_admin_css_output();

		// Example assertion: Check if a default padding is applied or if the rule is absent/correctly formed.
		// This depends on how your las_generate_admin_css handles this specific default.
		// If default for 'admin_menu_padding_top_bottom' is '0':
		// $this->assertStringContainsString( '#adminmenuwrap { padding-top: 0px;', $css ); // Adjust selector and property as needed
		$this->assertIsString($css); // Basic check that it ran without fatal errors/exceptions from warnings.
	}

	/**
	 * Test enhanced admin menu background targeting for comprehensive menu styling.
	 * Requirements: 2.1, 2.2, 2.4
	 */
	public function test_enhanced_admin_menu_background_targeting() {
		$options = $this->get_test_default_options();
		$options['admin_menu_bg_color'] = '#ff0000';
		$options['admin_menu_bg_type'] = 'solid';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that background color is applied to proper menu elements (not adminmenuback)
		$this->assertStringContainsString( '#adminmenuwrap', $css, 'Menu background should target main wrapper' );
		$this->assertStringContainsString( 'background-color: #ff0000', $css, 'Background color should be applied to enhanced menu selectors' );
		
		// Test higher specificity rules to override WordPress defaults
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuwrap', $css, 'Enhanced CSS should include high specificity rules for #adminmenuwrap' );
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuback { background: transparent', $css, 'adminmenuback should be transparent to not interfere' );
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu', $css, 'Enhanced CSS should include high specificity rules for #adminmenu' );
		
		// Test that menu items and arrows inherit the background styling
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu li.menu-top', $css, 'Menu items should inherit background styling' );
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu .wp-menu-arrow', $css, 'Menu arrows should inherit background styling' );
	}

	/**
	 * Test enhanced admin menu gradient background targeting.
	 * Requirements: 2.1, 2.2, 2.4
	 */
	public function test_enhanced_admin_menu_gradient_background_targeting() {
		$options = $this->get_test_default_options();
		$options['admin_menu_bg_type'] = 'gradient';
		$options['admin_menu_bg_gradient_direction'] = '45deg';
		$options['admin_menu_bg_gradient_color1'] = '#ff0000';
		$options['admin_menu_bg_gradient_color2'] = '#0000ff';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that gradient is applied to all menu-related elements
		$this->assertStringContainsString( 'linear-gradient(45deg, #ff0000, #0000ff)', $css, 'Gradient should be applied with correct parameters' );
		$this->assertStringContainsString( 'background-image: linear-gradient', $css, 'Gradient should be applied as background-image' );
		$this->assertStringContainsString( 'background-color: transparent', $css, 'Background color should be transparent when gradient is used' );
		
		// Test higher specificity gradient rules
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuwrap { background-image:', $css, 'High specificity gradient rules should be present for wrapper' );
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuback { background: transparent', $css, 'adminmenuback should be transparent for gradients' );
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu { background-image:', $css, 'High specificity gradient rules should be present for menu' );
	}

	/**
	 * Test consistent styling application to all menu elements.
	 * Requirements: 2.4
	 */
	public function test_consistent_styling_application_to_menu_elements() {
		$options = $this->get_test_default_options();
		$options['admin_menu_bg_color'] = '#333333';
		$options['admin_menu_bg_type'] = 'solid';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that WordPress default menu item backgrounds are overridden
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu li.menu-top:not(.wp-has-current-submenu):not(.current):not(:hover)', $css, 'Default menu item backgrounds should be overridden' );
		
		// Test that all menu elements have consistent background application
		$this->assertStringContainsString( 'background-color: #333333 !important;', $css, 'All menu elements should have consistent background color' );
		$this->assertStringContainsString( 'background-image: none !important;', $css, 'Background image should be reset for solid colors' );
	}

	/**
	 * Test submenu positioning and visibility fixes.
	 * Requirements: 3.1, 3.2, 3.3, 3.4
	 */
	public function test_submenu_positioning_and_visibility_fixes() {
		$css = las_fresh_generate_admin_css_output();
		
		// Test proper submenu positioning that extends beyond #adminmenuback container
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu .wp-submenu', $css, 'Submenu positioning CSS should target submenus with high specificity' );
		$this->assertStringContainsString( 'position: absolute !important;', $css, 'Submenus should have absolute positioning' );
		$this->assertStringContainsString( 'left: 100% !important;', $css, 'Submenus should be positioned to the right of menu' );
		$this->assertStringContainsString( 'top: 0 !important;', $css, 'Submenus should be aligned to top of parent' );
		$this->assertStringContainsString( 'min-width: 200px !important;', $css, 'Submenus should have minimum width' );
		$this->assertStringContainsString( 'z-index: 9999 !important;', $css, 'Submenus should have high z-index for visibility' );
	}

	/**
	 * Test responsive submenu positioning for collapsed menu state.
	 * Requirements: 3.2, 3.3, 3.4
	 */
	public function test_responsive_submenu_positioning_collapsed_state() {
		$css = las_fresh_generate_admin_css_output();
		
		// Test collapsed menu state submenu positioning
		$this->assertStringContainsString( 'html body.wp-admin.folded #adminmenu .wp-submenu', $css, 'Collapsed state submenu positioning should be present' );
		$this->assertStringContainsString( 'left: 36px !important;', $css, 'Collapsed state submenus should be positioned at 36px from left' );
		$this->assertStringContainsString( 'margin-left: 0 !important;', $css, 'Collapsed state submenus should have no left margin' );
		
		// Test that parent menu items are positioned relatively
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu li.menu-top', $css, 'Menu items should have relative positioning' );
		$this->assertStringContainsString( 'position: relative !important;', $css, 'Menu items should be positioned relatively for submenu anchoring' );
	}

	/**
	 * Test submenu visibility and hover behavior.
	 * Requirements: 3.1, 3.4
	 */
	public function test_submenu_visibility_and_hover_behavior() {
		$css = las_fresh_generate_admin_css_output();
		
		// Test submenu visibility properties
		$this->assertStringContainsString( 'visibility: visible !important;', $css, 'Submenus should have explicit visibility' );
		$this->assertStringContainsString( 'opacity: 1 !important;', $css, 'Submenus should have full opacity' );
		
		// Test hover and open state visibility
		$this->assertStringContainsString( '#adminmenu li.menu-top:hover .wp-submenu', $css, 'Hover state submenu visibility should be handled' );
		$this->assertStringContainsString( '#adminmenu li.opensub .wp-submenu', $css, 'Open state submenu visibility should be handled' );
		$this->assertStringContainsString( 'display: block !important;', $css, 'Hovered/open submenus should be displayed' );
		
		// Test WordPress default submenu override
		$this->assertStringContainsString( '#adminmenu .wp-has-submenu.wp-not-current-submenu.opensub .wp-submenu', $css, 'WordPress default submenu positioning should be overridden' );
		$this->assertStringContainsString( 'width: auto !important;', $css, 'Submenu width should be automatic' );
	}

	/**
	 * Test scrollbar management CSS rules are properly generated.
	 * Requirements: 5.1, 5.2, 5.4
	 */
	public function test_scrollbar_management_css_rules() {
		$css = las_fresh_generate_admin_css_output();
		
		// Test that overflow-y: auto and overflow-x: hidden are applied to #adminmenuwrap
		$this->assertStringContainsString( 'overflow-y: auto !important;', $css, 'Scrollbar management CSS should include overflow-y: auto for #adminmenuwrap' );
		$this->assertStringContainsString( 'overflow-x: hidden !important;', $css, 'Scrollbar management CSS should include overflow-x: hidden for #adminmenuwrap' );
		
		// Test that overflow: visible is set on #adminmenu to prevent submenu clipping
		$this->assertStringContainsString( 'overflow: visible !important;', $css, 'Scrollbar management CSS should include overflow: visible for #adminmenu' );
		
		// Test that conditional CSS for hiding scrollbars when content fits is present
		$this->assertStringContainsString( '#adminmenuwrap.no-scroll', $css, 'Scrollbar management CSS should include conditional .no-scroll class rules' );
		$this->assertStringContainsString( 'overflow-y: hidden !important;', $css, 'Scrollbar management CSS should include overflow-y: hidden for .no-scroll class' );
		
		// Test Firefox scrollbar styling
		$this->assertStringContainsString( 'scrollbar-width: thin !important;', $css, 'Firefox scrollbar styling should be present' );
		$this->assertStringContainsString( 'scrollbar-color: rgba(255,255,255,0.3) transparent !important;', $css, 'Firefox scrollbar color should be styled' );
	}

	/**
	 * Test WebKit scrollbar styling CSS rules are properly generated.
	 * Requirements: 5.1, 5.2
	 */
	public function test_webkit_scrollbar_styling_css_rules() {
		$css = las_fresh_generate_admin_css_output();
		
		// Test WebKit scrollbar width styling
		$this->assertStringContainsString( '::-webkit-scrollbar', $css, 'Scrollbar management CSS should include WebKit scrollbar styling' );
		$this->assertStringContainsString( 'width: 8px !important;', $css, 'WebKit scrollbar should have 8px width' );
		
		// Test WebKit scrollbar track styling
		$this->assertStringContainsString( '::-webkit-scrollbar-track', $css, 'Scrollbar management CSS should include WebKit scrollbar track styling' );
		$this->assertStringContainsString( 'background: transparent !important;', $css, 'WebKit scrollbar track should have transparent background' );
		
		// Test WebKit scrollbar thumb styling
		$this->assertStringContainsString( '::-webkit-scrollbar-thumb', $css, 'Scrollbar management CSS should include WebKit scrollbar thumb styling' );
		$this->assertStringContainsString( 'background-color: rgba(255,255,255,0.3) !important;', $css, 'WebKit scrollbar thumb should have semi-transparent white background' );
		$this->assertStringContainsString( 'border-radius: 4px !important;', $css, 'WebKit scrollbar thumb should have 4px border radius' );
		
		// Test WebKit scrollbar thumb hover styling
		$this->assertStringContainsString( '::-webkit-scrollbar-thumb:hover', $css, 'Scrollbar management CSS should include WebKit scrollbar thumb hover styling' );
		$this->assertStringContainsString( 'background-color: rgba(255,255,255,0.5) !important;', $css, 'WebKit scrollbar thumb hover should have more opaque background' );
	}

	/**
	 * Test Firefox scrollbar styling CSS rules are properly generated.
	 * Requirements: 5.1, 5.2
	 */
	public function test_firefox_scrollbar_styling_css_rules() {
		$css = las_fresh_generate_admin_css_output();
		
		// Test Firefox scrollbar styling
		$this->assertStringContainsString( 'scrollbar-width: thin !important;', $css, 'Scrollbar management CSS should include Firefox scrollbar-width: thin' );
		$this->assertStringContainsString( 'scrollbar-color: rgba(255,255,255,0.3) transparent !important;', $css, 'Scrollbar management CSS should include Firefox scrollbar-color styling' );
	}

	/**
	 * Test enhanced border radius CSS generation for menu containers.
	 * Requirements: 4.1, 4.2
	 */
	public function test_enhanced_border_radius_css_generation() {
		// Test with 'all' border radius type
		$options = $this->get_test_default_options();
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '10';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that border radius is applied to correct menu wrapper elements
		$this->assertStringContainsString( '#adminmenuwrap, #adminmenuback', $css, 'Border radius should target correct menu wrapper elements' );
		$this->assertStringContainsString( 'border-radius: 10px !important;', $css, 'Border radius should be applied with correct value and unit' );
		
		// Test individual border radius type
		$options['admin_menu_border_radius_type'] = 'individual';
		$options['admin_menu_border_radius_tl'] = '5';
		$options['admin_menu_border_radius_tr'] = '10';
		$options['admin_menu_border_radius_br'] = '15';
		$options['admin_menu_border_radius_bl'] = '20';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		$this->assertStringContainsString( 'border-top-left-radius: 5px !important;', $css, 'Individual border radius top-left should be applied' );
		$this->assertStringContainsString( 'border-top-right-radius: 10px !important;', $css, 'Individual border radius top-right should be applied' );
		$this->assertStringContainsString( 'border-bottom-right-radius: 15px !important;', $css, 'Individual border radius bottom-right should be applied' );
		$this->assertStringContainsString( 'border-bottom-left-radius: 20px !important;', $css, 'Individual border radius bottom-left should be applied' );
	}

	/**
	 * Test enhanced border radius application with menu structure.
	 * Requirements: 4.1, 4.3
	 */
	public function test_enhanced_border_radius_application_with_menu_structure() {
		$options = $this->get_test_default_options();
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '12';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test enhanced CSS rules for proper border radius application
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuwrap { 
            border-radius: inherit !important; 
            overflow: hidden !important; 
        }', $css, 'Enhanced border radius rules should be present for wrapper' );
		
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuback { 
            border-radius: inherit !important; 
            overflow: hidden !important; 
        }', $css, 'Enhanced border radius rules should be present for background' );
		
		// Test that menu items near borders respect rounded corners
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu li.menu-top:first-child > a.menu-top', $css, 'First menu item should have border radius applied' );
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu li.menu-top:last-child > a.menu-top', $css, 'Last menu item should have border radius applied' );
		$this->assertStringContainsString( 'border-top-left-radius: inherit !important;', $css, 'First menu item should inherit top border radius' );
		$this->assertStringContainsString( 'border-bottom-left-radius: inherit !important;', $css, 'Last menu item should inherit bottom border radius' );
	}

	/**
	 * Test overflow properties when border radius is applied.
	 * Requirements: 4.3
	 */
	public function test_overflow_properties_with_border_radius() {
		$options = $this->get_test_default_options();
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '10';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that overflow hidden is applied to wrapper elements when border radius is present
		$this->assertStringContainsString( 'overflow: hidden !important;', $css, 'Overflow hidden should be applied to wrapper elements with border radius' );
		
		// Test that overflow visible is applied to menu content
		$this->assertStringContainsString( 'overflow: visible !important;', $css, 'Overflow visible should be applied to menu content' );
		
		// Test enhanced CSS rules for proper border radius application
		$this->assertStringContainsString( 'border-radius: inherit !important;', $css, 'Enhanced border radius rules should use inherit for consistency' );
		
		// Test that menu items respect border radius boundaries
		$this->assertStringContainsString( '#adminmenu li.menu-top:first-child > a.menu-top', $css, 'First menu item should have border radius applied' );
		$this->assertStringContainsString( '#adminmenu li.menu-top:last-child > a.menu-top', $css, 'Last menu item should have border radius applied' );
	}

	/**
	 * Test overflow properties when no border radius is applied.
	 * Requirements: 4.3
	 */
	public function test_overflow_properties_without_border_radius() {
		$options = $this->get_test_default_options();
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '0';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that overflow visible is applied when no border radius
		$this->assertStringContainsString( 'overflow: visible', $css, 'Overflow visible should be applied when no border radius for submenus' );
	}

	/**
	 * Test enhanced shadow CSS generation for menu wrapper elements.
	 * Requirements: 4.1, 4.2
	 */
	public function test_enhanced_shadow_css_generation() {
		// Test simple shadow type
		$options = $this->get_test_default_options();
		$options['admin_menu_shadow_type'] = 'simple';
		$options['admin_menu_shadow_simple'] = '0 2px 4px rgba(0,0,0,0.1)';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that shadow is applied to correct menu wrapper element (#adminmenuwrap)
		$this->assertStringContainsString( 'box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;', $css, 'Simple shadow should be applied with correct value' );
		
		// Test advanced shadow type
		$options['admin_menu_shadow_type'] = 'advanced';
		$options['admin_menu_shadow_advanced_offset_x'] = '2';
		$options['admin_menu_shadow_advanced_offset_y'] = '4';
		$options['admin_menu_shadow_advanced_blur'] = '8';
		$options['admin_menu_shadow_advanced_spread'] = '1';
		$options['admin_menu_shadow_advanced_color'] = 'rgba(0,0,0,0.2)';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		$this->assertStringContainsString( 'box-shadow: 2px 4px 8px 1px rgba(0,0,0,0.2) !important;', $css, 'Advanced shadow should be applied with correct calculated value' );
		
		// Test that shadow targets the correct wrapper element
		$this->assertStringContainsString( '#adminmenuwrap', $css, 'Shadow should target #adminmenuwrap for proper rendering' );
	}

	/**
	 * Test enhanced shadow application with menu structure.
	 * Requirements: 4.2, 4.4
	 */
	public function test_enhanced_shadow_application_with_menu_structure() {
		$options = $this->get_test_default_options();
		$options['admin_menu_shadow_type'] = 'simple';
		$options['admin_menu_shadow_simple'] = '0 4px 8px rgba(0,0,0,0.15)';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test enhanced CSS rules for proper shadow rendering
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuwrap { 
            position: relative !important; 
            z-index: 9990 !important; 
        }', $css, 'Enhanced shadow rules should include proper positioning and z-index for wrapper' );
		
		// Test that inner menu elements don't interfere with shadow rendering
		$this->assertStringContainsString( 'html body.wp-admin #adminmenuback { 
            box-shadow: none !important; 
            position: relative !important; 
        }', $css, 'Inner menu elements should not have conflicting shadows' );
		
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu { 
            box-shadow: none !important; 
            position: relative !important; 
        }', $css, 'Menu content should not have conflicting shadows' );
		
		// Test that submenus appear above the shadow
		$this->assertStringContainsString( 'html body.wp-admin #adminmenu .wp-submenu { 
            z-index: 9999 !important; 
        }', $css, 'Submenus should have higher z-index than shadow' );
	}

	/**
	 * Test shadow effects work correctly with enhanced menu structure.
	 * Requirements: 4.4
	 */
	public function test_shadow_effects_with_enhanced_menu_structure() {
		$options = $this->get_test_default_options();
		$options['admin_menu_shadow_type'] = 'simple';
		$options['admin_menu_shadow_simple'] = '0 2px 4px rgba(0,0,0,0.1)';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that proper z-index is applied for shadow rendering
		$this->assertStringContainsString( 'z-index: 9990 !important;', $css, 'Shadow effects should include proper z-index for menu wrapper' );
		
		// Test that inner menu elements don't interfere with shadow rendering
		$this->assertStringContainsString( 'box-shadow: none !important;', $css, 'Inner menu elements should not have conflicting shadows' );
		
		// Test that submenus appear above the shadow
		$this->assertStringContainsString( 'z-index: 9999 !important;', $css, 'Submenus should have higher z-index than shadow' );
	}

	/**
	 * Test border radius and shadow interaction.
	 * Requirements: 4.4
	 */
	public function test_border_radius_and_shadow_interaction() {
		$options = $this->get_test_default_options();
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '10';
		$options['admin_menu_shadow_type'] = 'simple';
		$options['admin_menu_shadow_simple'] = '0 2px 4px rgba(0,0,0,0.1)';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that background-clip is applied when both border radius and shadow are present
		$this->assertStringContainsString( 'background-clip: padding-box !important;', $css, 'Background-clip should be applied when combining border radius and shadow' );
		
		// Test that isolation is applied to prevent visual artifacts
		$this->assertStringContainsString( 'isolation: isolate !important;', $css, 'Isolation should be applied when combining border radius and shadow' );
	}

	/**
	 * Test visual effects work correctly across different menu states.
	 * Requirements: 4.4
	 */
	public function test_visual_effects_across_menu_states() {
		$options = $this->get_test_default_options();
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '10';
		$options['admin_menu_shadow_type'] = 'simple';
		$options['admin_menu_shadow_simple'] = '0 2px 4px rgba(0,0,0,0.1)';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test collapsed menu state visual effects
		$this->assertStringContainsString( 'body.wp-admin.folded #adminmenuwrap', $css, 'Visual effects should handle collapsed menu state' );
		$this->assertStringContainsString( 'border-radius: inherit !important;', $css, 'Collapsed menu should inherit border radius' );
		$this->assertStringContainsString( 'box-shadow: inherit !important;', $css, 'Collapsed menu should inherit shadow' );
		
		// Test that menu items respect visual boundaries in collapsed state
		$this->assertStringContainsString( 'body.wp-admin.folded #adminmenu li.menu-top > a.menu-top', $css, 'Collapsed menu items should respect visual boundaries' );
	}

	/**
	 * Test visual effects with detached menu.
	 * Requirements: 4.4
	 */
	public function test_visual_effects_with_detached_menu() {
		$options = $this->get_test_default_options();
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '10';
		$options['admin_menu_shadow_type'] = 'simple';
		$options['admin_menu_shadow_simple'] = '0 2px 4px rgba(0,0,0,0.1)';
		$options['admin_menu_detached'] = true;
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that detached menu visual effects are handled
		$this->assertStringContainsString( 'backdrop-filter: none !important;', $css, 'Detached menu should have backdrop-filter disabled' );
	}

	/**
	 * Test that no shadow is applied when shadow type is not set or empty.
	 * Requirements: 4.2
	 */
	public function test_no_shadow_when_disabled() {
		$options = $this->get_test_default_options();
		$options['admin_menu_shadow_type'] = 'none';
		
		$css = las_fresh_generate_admin_css_output($options);
		
		// Test that box-shadow: none is applied when no shadow is configured
		$this->assertStringContainsString( 'box-shadow: none !important;', $css, 'No shadow should be applied when shadow type is none or disabled' );
	}

	/**
	 * Test menu state integration with live preview system.
	 * Requirements: 1.4, 2.4, 3.4, 5.4
	 */
	public function test_menu_state_live_preview_integration() {
		// Test that CSS generation works with different menu widths (simulating collapse states)
		$options = $this->get_test_default_options();
		
		// Test expanded menu width
		$options['admin_menu_width'] = '220';
		$css_expanded = las_fresh_generate_admin_css_output($options);
		$this->assertStringContainsString( 'width: 220px !important;', $css_expanded, 'Expanded menu width should be applied correctly' );
		
		// Test collapsed menu width (simulating collapsed state)
		$options['admin_menu_width'] = '36';
		$css_collapsed = las_fresh_generate_admin_css_output($options);
		$this->assertStringContainsString( 'width: 36px !important;', $css_collapsed, 'Collapsed menu width should be applied correctly' );
		
		// Test that both CSS outputs contain the necessary menu state CSS rules
		$this->assertStringContainsString( 'body.folded #adminmenuwrap', $css_expanded, 'CSS should contain folded state rules for expanded menu' );
		$this->assertStringContainsString( 'body.folded #adminmenuwrap', $css_collapsed, 'CSS should contain folded state rules for collapsed menu' );
		
		// Test that submenu positioning CSS is present for both states
		$this->assertStringContainsString( '#adminmenu .wp-submenu', $css_expanded, 'Submenu positioning CSS should be present for expanded menu' );
		$this->assertStringContainsString( '#adminmenu .wp-submenu', $css_collapsed, 'Submenu positioning CSS should be present for collapsed menu' );
		$this->assertStringContainsString( 'position: absolute !important;', $css_expanded, 'Submenu absolute positioning should be present for expanded menu' );
		$this->assertStringContainsString( 'position: absolute !important;', $css_collapsed, 'Submenu absolute positioning should be present for collapsed menu' );
		
		// Test that scrollbar management CSS is present for both states
		$this->assertStringContainsString( 'overflow-y: auto !important;', $css_expanded, 'Scrollbar management should be present for expanded menu' );
		$this->assertStringContainsString( 'overflow-y: auto !important;', $css_collapsed, 'Scrollbar management should be present for collapsed menu' );
	}

	/**
	 * Test CSS regeneration with menu state changes.
	 * Requirements: 1.4, 2.4
	 */
	public function test_css_regeneration_with_menu_state_changes() {
		$options = $this->get_test_default_options();
		
		// Test that CSS generation handles menu width changes properly
		$options['admin_menu_width'] = '180';
		$css = las_fresh_generate_admin_css_output($options);
		
		// Verify that the new width is applied to all relevant selectors
		$this->assertStringContainsString( 'width: 180px', $css, 'Menu width changes should be reflected in CSS output' );
		
		// Test that background color application works with different menu widths
		$options['admin_menu_bg_color'] = '#ff0000';
		$options['admin_menu_bg_type'] = 'solid';
		$css = las_fresh_generate_admin_css_output($options);
		
		$this->assertStringContainsString( 'background-color: #ff0000', $css, 'Background color should be applied consistently with menu state changes' );
		$this->assertStringContainsString( '#adminmenuwrap', $css, 'Background color should target main wrapper' );
		$this->assertStringContainsString( 'adminmenuback { background: transparent', $css, 'adminmenuback should remain transparent' );
	}

	/**
	 * Test seamless live preview updates with menu state transitions.
	 * Requirements: 3.4, 5.4
	 */
	public function test_seamless_live_preview_updates() {
		$options = $this->get_test_default_options();
		
		// Test that visual effects work correctly with menu state changes
		$options['admin_menu_border_radius_type'] = 'all';
		$options['admin_menu_border_radius_all'] = '8';
		$options['admin_menu_shadow_type'] = 'simple';
		$options['admin_menu_shadow_simple'] = '0 2px 4px rgba(0,0,0,0.1)';
		
		// Test with different menu widths to simulate state transitions
		$options['admin_menu_width'] = '220';
		$css_expanded = las_fresh_generate_admin_css_output($options);
		
		$options['admin_menu_width'] = '36';
		$css_collapsed = las_fresh_generate_admin_css_output($options);
		
		// Both states should have consistent visual effects
		$this->assertStringContainsString( 'border-radius: 8px', $css_expanded, 'Border radius should be consistent in expanded state' );
		$this->assertStringContainsString( 'border-radius: 8px', $css_collapsed, 'Border radius should be consistent in collapsed state' );
		
		$this->assertStringContainsString( 'box-shadow: 0 2px 4px rgba(0,0,0,0.1)', $css_expanded, 'Shadow should be consistent in expanded state' );
		$this->assertStringContainsString( 'box-shadow: 0 2px 4px rgba(0,0,0,0.1)', $css_collapsed, 'Shadow should be consistent in collapsed state' );
		
		// Both states should have proper submenu positioning
		$this->assertStringContainsString( 'left: 100% !important;', $css_expanded, 'Submenu positioning should work in expanded state' );
		$this->assertStringContainsString( 'left: 36px !important;', $css_collapsed, 'Submenu positioning should work in collapsed state' );
	}
}