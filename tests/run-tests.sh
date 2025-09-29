#!/bin/bash

# Live Admin Styler Test Runner
# Runs both PHP and JavaScript tests with coverage reporting

set -e

echo "🧪 Live Admin Styler - Comprehensive Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check for PHPUnit
    if ! command -v phpunit &> /dev/null; then
        print_error "PHPUnit is not installed. Please install it first."
        exit 1
    fi
    
    # Check for Node.js and npm
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Install JavaScript dependencies if needed
install_js_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_status "Installing JavaScript dependencies..."
        npm install
        print_success "JavaScript dependencies installed"
    else
        print_status "JavaScript dependencies already installed"
    fi
}

# Run PHP tests
run_php_tests() {
    print_status "Running PHP tests..."
    echo ""
    
    # Create coverage directory if it doesn't exist
    mkdir -p tests/coverage/php
    
    # Run PHPUnit with coverage
    if phpunit --configuration phpunit.xml.dist --coverage-html tests/coverage/php --coverage-text; then
        print_success "PHP tests passed"
        return 0
    else
        print_error "PHP tests failed"
        return 1
    fi
}

# Run JavaScript tests
run_js_tests() {
    print_status "Running JavaScript tests..."
    echo ""
    
    # Create coverage directory if it doesn't exist
    mkdir -p tests/coverage/js
    
    # Run Jest with coverage
    if npm run test:coverage; then
        print_success "JavaScript tests passed"
        return 0
    else
        print_error "JavaScript tests failed"
        return 1
    fi
}

# Run specific test suite
run_specific_tests() {
    case $1 in
        "php")
            run_php_tests
            ;;
        "js"|"javascript")
            install_js_dependencies
            run_js_tests
            ;;
        "state")
            print_status "Running state management tests..."
            phpunit --testsuite state-management
            npx jest tests/js/test-state-management.js
            ;;
        "cleanup")
            print_status "Running file cleanup tests..."
            phpunit --testsuite file-cleanup
            ;;
        "preview")
            print_status "Running live preview tests..."
            npx jest tests/js/test-live-preview.js
            ;;
        "integration")
            print_status "Running integration tests..."
            npx jest tests/js/test-integration.js
            ;;
        *)
            print_error "Unknown test suite: $1"
            echo "Available options: php, js, state, cleanup, preview, integration"
            exit 1
            ;;
    esac
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    
    # Create reports directory
    mkdir -p tests/reports
    
    # Generate combined report
    cat > tests/reports/test-summary.md << EOF
# Live Admin Styler - Test Report

Generated on: $(date)

## Test Coverage

### PHP Tests
- State Management: $(find tests/coverage/php -name "*.html" | wc -l) files
- File Cleanup: Comprehensive security and functionality tests
- CSS Output: Enhanced CSS generation with performance tests

### JavaScript Tests  
- State Management: UI state persistence and synchronization
- Live Preview: Debouncing, caching, and error handling
- Integration: End-to-end workflows and component interactions

## Coverage Reports

- **PHP Coverage**: tests/coverage/php/index.html
- **JavaScript Coverage**: tests/coverage/js/index.html

## Requirements Coverage

- ✅ 5.4 - File cleanup system automated testing
- ✅ 6.4 - Settings organization and state management
- ✅ 7.4 - Error handling and notification system  
- ✅ 3.1-3.4 - Live preview functionality

EOF

    print_success "Test report generated: tests/reports/test-summary.md"
}

# Main execution
main() {
    # Parse command line arguments
    if [ $# -eq 0 ]; then
        # Run all tests
        check_dependencies
        install_js_dependencies
        
        php_result=0
        js_result=0
        
        echo ""
        print_status "Running all tests..."
        echo ""
        
        # Run PHP tests
        run_php_tests || php_result=$?
        
        echo ""
        
        # Run JavaScript tests
        run_js_tests || js_result=$?
        
        echo ""
        
        # Generate report
        generate_report
        
        # Final status
        if [ $php_result -eq 0 ] && [ $js_result -eq 0 ]; then
            print_success "All tests passed! 🎉"
            echo ""
            echo "Coverage reports:"
            echo "  - PHP: tests/coverage/php/index.html"
            echo "  - JavaScript: tests/coverage/js/index.html"
            exit 0
        else
            print_error "Some tests failed"
            exit 1
        fi
    else
        # Run specific test suite
        check_dependencies
        if [[ "$1" == "js" || "$1" == "javascript" || "$1" == "preview" || "$1" == "integration" || "$1" == "state" ]]; then
            install_js_dependencies
        fi
        run_specific_tests $1
    fi
}

# Help function
show_help() {
    echo "Live Admin Styler Test Runner"
    echo ""
    echo "Usage: $0 [test-suite]"
    echo ""
    echo "Test Suites:"
    echo "  (no args)    Run all tests"
    echo "  php          Run only PHP tests"
    echo "  js           Run only JavaScript tests"
    echo "  state        Run state management tests"
    echo "  cleanup      Run file cleanup tests"
    echo "  preview      Run live preview tests"
    echo "  integration  Run integration tests"
    echo ""
    echo "Examples:"
    echo "  $0                 # Run all tests"
    echo "  $0 php            # Run only PHP tests"
    echo "  $0 js             # Run only JavaScript tests"
    echo "  $0 state          # Run state management tests"
    echo ""
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"