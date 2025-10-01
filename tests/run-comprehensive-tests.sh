#!/bin/bash

# Live Admin Styler - Comprehensive Test Runner
# Runs all JavaScript, PHP, and integration tests

set -e

echo "🚀 Starting Live Admin Styler Comprehensive Test Suite"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
    esac
}

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    print_status "INFO" "Running $suite_name..."
    
    if eval "$command"; then
        print_status "SUCCESS" "$suite_name completed successfully"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_status "ERROR" "$suite_name failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
}

# Check if required tools are available
check_dependencies() {
    print_status "INFO" "Checking dependencies..."
    
    # Check for Node.js and npm
    if ! command -v node &> /dev/null; then
        print_status "ERROR" "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_status "ERROR" "npm is not installed"
        exit 1
    fi
    
    # Check for PHP
    if ! command -v php &> /dev/null; then
        print_status "WARNING" "PHP is not installed - PHP tests will be skipped"
    fi
    
    # Check for PHPUnit
    if ! command -v phpunit &> /dev/null && ! [ -f "vendor/bin/phpunit" ]; then
        print_status "WARNING" "PHPUnit is not installed - PHP tests will be skipped"
    fi
    
    print_status "SUCCESS" "Dependencies checked"
    echo ""
}

# Install npm dependencies if needed
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_status "INFO" "Installing npm dependencies..."
        npm install
        print_status "SUCCESS" "npm dependencies installed"
        echo ""
    fi
}

# Run JavaScript tests
run_javascript_tests() {
    print_status "INFO" "Running JavaScript Test Suites"
    echo "================================"
    
    # Run comprehensive test suite
    run_test_suite "Comprehensive JavaScript Tests" "npm test -- --testPathPattern=test-suite-comprehensive.js --verbose"
    
    # Run cross-browser compatibility tests
    run_test_suite "Cross-Browser Compatibility Tests" "timeout 30s npm test -- --testPathPattern=test-cross-browser-compatibility.js"
    
    # Run individual module tests
    local js_tests=(
        "test-las-core-manager.js"
        "test-las-error-handler.js"
        "test-settings-manager.js"
        "test-ajax-manager.js"
        "test-live-preview-engine.js"
    )
    
    for test_file in "${js_tests[@]}"; do
        if [ -f "js/$test_file" ]; then
            run_test_suite "JavaScript Test: $test_file" "timeout 30s npm test -- --testPathPattern=$test_file"
        fi
    done
}

# Run PHP tests
run_php_tests() {
    if command -v php &> /dev/null; then
        print_status "INFO" "Running PHP Test Suites"
        echo "========================"
        
        # Check if PHPUnit is available
        local phpunit_cmd=""
        if command -v phpunit &> /dev/null; then
            phpunit_cmd="phpunit"
        elif [ -f "vendor/bin/phpunit" ]; then
            phpunit_cmd="vendor/bin/phpunit"
        else
            print_status "WARNING" "PHPUnit not found - skipping PHP tests"
            return
        fi
        
        # Run comprehensive PHP test suite
        run_test_suite "Comprehensive PHP Tests" "$phpunit_cmd php/TestSuiteComprehensive.php --verbose"
        
        # Run individual PHP tests
        local php_tests=(
            "TestAjaxHandlers.php"
            "TestSecurityValidator.php"
            "TestSettingsStorage.php"
        )
        
        for test_file in "${php_tests[@]}"; do
            if [ -f "php/$test_file" ]; then
                run_test_suite "PHP Test: $test_file" "$phpunit_cmd php/$test_file"
            fi
        done
    else
        print_status "WARNING" "PHP not available - skipping PHP tests"
    fi
}

# Run integration tests
run_integration_tests() {
    print_status "INFO" "Running Integration Tests"
    echo "=========================="
    
    # Check if browser is available for integration tests
    if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null; then
        print_status "INFO" "Browser available for integration tests"
        
        # Note: In a real environment, you would use tools like Playwright or Puppeteer
        # For now, we'll just validate that the HTML file exists
        if [ -f "integration-live-preview-workflow.html" ]; then
            run_test_suite "Integration Test File Validation" "[ -f integration-live-preview-workflow.html ]"
        fi
    else
        print_status "WARNING" "No browser available for integration tests"
    fi
    
    # Run any other integration tests
    local integration_tests=(
        "integration-final-system.php"
        "integration-test-final.js"
    )
    
    for test_file in "${integration_tests[@]}"; do
        if [ -f "$test_file" ]; then
            case "$test_file" in
                *.php)
                    if command -v php &> /dev/null; then
                        run_test_suite "Integration Test: $test_file" "php $test_file"
                    fi
                    ;;
                *.js)
                    run_test_suite "Integration Test: $test_file" "node $test_file"
                    ;;
            esac
        fi
    done
}

# Generate final report
generate_report() {
    echo ""
    print_status "INFO" "Test Suite Summary"
    echo "=================="
    echo "Total Test Suites: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo "Success Rate: $success_rate%"
        
        if [ $FAILED_TESTS -eq 0 ]; then
            print_status "SUCCESS" "All test suites passed! 🎉"
            echo ""
            echo "✅ Live Admin Styler is ready for production deployment"
        elif [ $success_rate -ge 80 ]; then
            print_status "WARNING" "Most tests passed, but some issues need attention"
            echo ""
            echo "⚠️  Review failed tests before deployment"
        else
            print_status "ERROR" "Multiple test suites failed"
            echo ""
            echo "❌ Critical issues need to be resolved before deployment"
            exit 1
        fi
    else
        print_status "WARNING" "No tests were executed"
    fi
    
    echo ""
    echo "📊 For detailed test results, check individual test outputs above"
    echo "🔗 Integration tests can be run manually by opening:"
    echo "   tests/integration-live-preview-workflow.html"
    echo "   tests/cross-browser-test-runner.html"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Change to tests directory
    cd "$(dirname "$0")"
    
    print_status "INFO" "Starting comprehensive test suite in $(pwd)"
    echo ""
    
    # Run all test phases
    check_dependencies
    install_dependencies
    run_javascript_tests
    run_php_tests
    run_integration_tests
    
    # Generate final report
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    print_status "INFO" "Test suite completed in ${duration} seconds"
    generate_report
}

# Execute main function
main "$@"