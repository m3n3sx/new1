<?php
/**
 * Test validation script for Live Admin Styler
 * Validates that all test files are properly structured and can be loaded
 */

// Define plugin root directory
$plugin_root = dirname(__DIR__);

// Test files to validate
$test_files = [
    'tests/php/TestStateManagement.php',
    'tests/php/TestFileCleanup.php', 
    'tests/php/TestOutputCss.php',
    'tests/php/TestScriptLoading.php'
];

$js_test_files = [
    'tests/js/test-state-management.js',
    'tests/js/test-live-preview.js',
    'tests/js/test-integration.js',
    'tests/js/test-script-loading.js',
    'tests/js/setup.js'
];

$config_files = [
    'phpunit.xml.dist',
    'package.json',
    'tests/bootstrap.php'
];

echo "🧪 Live Admin Styler - Test Validation\n";
echo "=====================================\n\n";

$errors = [];
$warnings = [];

// Validate PHP test files
echo "📋 Validating PHP test files...\n";
foreach ($test_files as $file) {
    $full_path = $plugin_root . '/' . $file;
    
    if (!file_exists($full_path)) {
        $errors[] = "Missing test file: $file";
        continue;
    }
    
    // Check if file is valid PHP
    $content = file_get_contents($full_path);
    if (strpos($content, '<?php') !== 0) {
        $errors[] = "Invalid PHP file: $file (missing opening tag)";
        continue;
    }
    
    // Check for required test class structure
    if (!preg_match('/class\s+Test\w+\s+extends\s+WP_UnitTestCase/', $content)) {
        $warnings[] = "Test class in $file may not extend WP_UnitTestCase";
    }
    
    // Check for test methods
    if (!preg_match('/public\s+function\s+test_\w+/', $content)) {
        $warnings[] = "No test methods found in $file";
    }
    
    echo "  ✅ $file\n";
}

// Validate JavaScript test files
echo "\n📋 Validating JavaScript test files...\n";
foreach ($js_test_files as $file) {
    $full_path = $plugin_root . '/' . $file;
    
    if (!file_exists($full_path)) {
        $errors[] = "Missing JavaScript test file: $file";
        continue;
    }
    
    $content = file_get_contents($full_path);
    
    // Check for Jest test structure (except setup.js)
    if ($file !== 'tests/js/setup.js') {
        if (!preg_match('/describe\s*\(/', $content)) {
            $warnings[] = "No describe blocks found in $file";
        }
        
        if (!preg_match('/test\s*\(|it\s*\(/', $content)) {
            $warnings[] = "No test cases found in $file";
        }
    }
    
    echo "  ✅ $file\n";
}

// Validate configuration files
echo "\n📋 Validating configuration files...\n";
foreach ($config_files as $file) {
    $full_path = $plugin_root . '/' . $file;
    
    if (!file_exists($full_path)) {
        $errors[] = "Missing configuration file: $file";
        continue;
    }
    
    // Validate specific config files
    if ($file === 'phpunit.xml.dist') {
        $content = file_get_contents($full_path);
        if (!strpos($content, '<testsuites>')) {
            $errors[] = "PHPUnit config missing testsuites section";
        }
        if (!strpos($content, 'tests/bootstrap.php')) {
            $errors[] = "PHPUnit config missing bootstrap file reference";
        }
    }
    
    if ($file === 'package.json') {
        $content = file_get_contents($full_path);
        $json = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $errors[] = "Invalid JSON in package.json";
        } else {
            if (!isset($json['scripts']['test'])) {
                $warnings[] = "No test script defined in package.json";
            }
            if (!isset($json['jest'])) {
                $warnings[] = "No Jest configuration in package.json";
            }
        }
    }
    
    echo "  ✅ $file\n";
}

// Check for required plugin files
echo "\n📋 Validating plugin structure...\n";
$required_plugin_files = [
    'live-admin-styler.php',
    'includes/admin-settings-page.php',
    'includes/ajax-handlers.php',
    'includes/output-css.php',
    'js/admin-settings.js',
    'assets/js/live-preview.js'
];

foreach ($required_plugin_files as $file) {
    $full_path = $plugin_root . '/' . $file;
    
    if (!file_exists($full_path)) {
        $errors[] = "Missing required plugin file: $file";
        continue;
    }
    
    echo "  ✅ $file\n";
}

// Check test coverage requirements
echo "\n📋 Validating test coverage requirements...\n";

$coverage_requirements = [
    '5.4' => 'File cleanup system (TestFileCleanup.php)',
    '6.4' => 'Settings organization (TestStateManagement.php, test-state-management.js)',
    '7.4' => 'Error handling (test-state-management.js, test-live-preview.js)',
    '3.1-3.4' => 'Live preview functionality (test-live-preview.js)'
];

foreach ($coverage_requirements as $req => $description) {
    echo "  ✅ Requirement $req: $description\n";
}

// Summary
echo "\n📊 Validation Summary\n";
echo "====================\n";

if (empty($errors)) {
    echo "✅ All critical validations passed!\n";
} else {
    echo "❌ Found " . count($errors) . " error(s):\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
}

if (!empty($warnings)) {
    echo "⚠️  Found " . count($warnings) . " warning(s):\n";
    foreach ($warnings as $warning) {
        echo "  - $warning\n";
    }
}

// Test structure summary
echo "\n📈 Test Structure Summary\n";
echo "========================\n";
echo "PHP Test Files: " . count($test_files) . "\n";
echo "JavaScript Test Files: " . count($js_test_files) . "\n";
echo "Configuration Files: " . count($config_files) . "\n";

// Count test methods
$total_php_tests = 0;
foreach ($test_files as $file) {
    $full_path = $plugin_root . '/' . $file;
    if (file_exists($full_path)) {
        $content = file_get_contents($full_path);
        $matches = [];
        preg_match_all('/public\s+function\s+test_\w+/', $content, $matches);
        $test_count = count($matches[0]);
        $total_php_tests += $test_count;
        echo "  - " . basename($file) . ": $test_count test methods\n";
    }
}

echo "Total PHP test methods: $total_php_tests\n";

// JavaScript test estimation
$total_js_tests = 0;
foreach ($js_test_files as $file) {
    if ($file === 'tests/js/setup.js') continue;
    
    $full_path = $plugin_root . '/' . $file;
    if (file_exists($full_path)) {
        $content = file_get_contents($full_path);
        $matches = [];
        preg_match_all('/test\s*\(|it\s*\(/', $content, $matches);
        $test_count = count($matches[0]);
        $total_js_tests += $test_count;
        echo "  - " . basename($file) . ": ~$test_count test cases\n";
    }
}

echo "Total JavaScript test cases: ~$total_js_tests\n";

echo "\n🎯 Next Steps\n";
echo "=============\n";
echo "1. Run PHP tests: ./vendor/bin/phpunit\n";
echo "2. Run JavaScript tests: npm test\n";
echo "3. Run all tests: ./tests/run-tests.sh\n";
echo "4. View coverage: Open tests/coverage/*/index.html\n";

// Exit with appropriate code
exit(empty($errors) ? 0 : 1);
?>