<?php
/**
 * PHPUnit bootstrap file for Live Admin Styler tests.
 */

$_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

if ( ! file_exists( "{$_tests_dir}/includes/functions.php" ) ) {
	echo "Could not find {$_tests_dir}/includes/functions.php, have you run bin/install-wp-tests.sh ?" . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit( 1 );
}

// Give access to tests_add_filter() function.
require_once "{$_tests_dir}/includes/functions.php";

/**
 * Manually load the plugin being tested.
 */
function _manually_load_plugin() {
	// Load the main plugin file first
	if ( file_exists( dirname( __DIR__ ) . '/live-admin-styler.php' ) ) {
		require_once dirname( __DIR__ ) . '/live-admin-styler.php';
	}
	
	// Load individual includes files for testing
	$includes_files = array(
		'output-css.php',
		'admin-settings-page.php',
		'ajax-handlers.php',
		'templates.php'
	);
	
	foreach ( $includes_files as $file ) {
		$file_path = dirname( __DIR__ ) . '/includes/' . $file;
		if ( file_exists( $file_path ) ) {
			require_once $file_path;
		}
	}
	
	// Initialize plugin constants if not already defined
	if ( ! defined( 'LAS_FRESH_VERSION' ) ) {
		define( 'LAS_FRESH_VERSION', '1.1.0' );
	}
	if ( ! defined( 'LAS_FRESH_TEXT_DOMAIN' ) ) {
		define( 'LAS_FRESH_TEXT_DOMAIN', 'live-admin-styler' );
	}
	if ( ! defined( 'LAS_FRESH_SETTINGS_SLUG' ) ) {
		define( 'LAS_FRESH_SETTINGS_SLUG', 'live-admin-styler-settings' );
	}
	if ( ! defined( 'LAS_FRESH_OPTION_GROUP' ) ) {
		define( 'LAS_FRESH_OPTION_GROUP', 'las_fresh_option_group' );
	}
	if ( ! defined( 'LAS_FRESH_OPTION_NAME' ) ) {
		define( 'LAS_FRESH_OPTION_NAME', 'las_fresh_options' );
	}
}
tests_add_filter( 'muplugins_loaded', '_manually_load_plugin' );

// Start up the WP testing environment.
require "{$_tests_dir}/includes/bootstrap.php";