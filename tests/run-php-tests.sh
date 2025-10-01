#!/bin/bash

# Live Admin Styler v2.0 - PHP Test Suite Runner
# Comprehensive PHPUnit test execution with coverage reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTS_DIR="${PLUGIN_DIR}/tests"
COVERAGE_DIR="${TESTS_DIR}/coverage"
WP_TESTS_DIR="${WP_TESTS_DIR:-/tmp/wordpress-tests-lib}"

echo -e "${BLUE}Live Admin Styler v2.0 - PHP Test Suite${NC}"
echo "=================================================="

# Check if WordPress test library exists
if [ ! -d "$WP_TESTS_DIR" ]; then
    echo -e "${YELLOW}WordPress test library not found at $WP_TESTS_DIR${NC}"
    echo "Please install WordPress test library first:"
    echo "bash tests/install-wp-tests.sh wordpress_test root '' localhost latest"
    exit 1
fi

# Create coverage directory
mkdir -p "$COVERAGE_DIR"

# Function to run specific test suite
run_test_suite() {
    local suite_name="$1"
    local description="$2"
    
    echo -e "\n${BLUE}Running $description...${NC}"
    echo "----------------------------------------"
    
    if vendor/bin/phpunit --testsuite="$suite_name" --coverage-text --coverage-html="$COVERAGE_DIR/html/$suite_name"; then
        echo -e "${GREEN}✓ $description completed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ $description failed${NC}"
        return 1
    fi
}

# Function to run all tests with comprehensive coverage
run_comprehensive_tests() {
    echo -e "\n${BLUE}Running comprehensive test suite with coverage...${NC}"
    echo "--------------------------------------------------------"
    
    # Run all tests with coverage
    if vendor/bin/phpunit \
        --coverage-html="$COVERAGE_DIR/html" \
        --coverage-clover="$COVERAGE_DIR/clover.xml" \
        --coverage-xml="$COVERAGE_DIR/xml" \
        --log-junit="$COVERAGE_DIR/junit.xml" \
        --coverage-text; then
        
        echo -e "${GREEN}✓ Comprehensive test suite completed successfully${NC}"
        
        # Generate coverage report summary
        generate_coverage_summary
        
        return 0
    else
        echo -e "${RED}✗ Comprehensive test suite failed${NC}"
        return 1
    fi
}

# Function to generate coverage summary
generate_coverage_summary() {
    echo -e "\n${BLUE}Generating coverage summary...${NC}"
    
    if [ -f "$COVERAGE_DIR/clover.xml" ]; then
        # Extract coverage percentage from clover.xml
        local coverage_percent=$(grep -o 'percent="[0-9.]*"' "$COVERAGE_DIR/clover.xml" | head -1 | grep -o '[0-9.]*')
        
        echo -e "\n${BLUE}Coverage Summary:${NC}"
        echo "=================="
        echo -e "Overall Coverage: ${GREEN}${coverage_percent}%${NC}"
        
        if (( $(echo "$coverage_percent >= 70" | bc -l) )); then
            echo -e "Status: ${GREEN}✓ Coverage target met (≥70%)${NC}"
        else
            echo -e "Status: ${YELLOW}⚠ Coverage below target (<70%)${NC}"
        fi
        
        echo -e "\nDetailed reports available at:"
        echo "- HTML: file://$COVERAGE_DIR/html/index.html"
        echo "- Clover XML: $COVERAGE_DIR/clover.xml"
        echo "- JUnit XML: $COVERAGE_DIR/junit.xml"
    fi
}

# Function to validate test environment
validate_environment() {
    echo -e "${BLUE}Validating test environment...${NC}"
    
    # Check PHP version
    local php_version=$(php -r "echo PHP_VERSION;")
    echo "PHP Version: $php_version"
    
    # Check PHPUnit
    if ! command -v vendor/bin/phpunit &> /dev/null; then
        echo -e "${RED}PHPUnit not found. Please run: composer install${NC}"
        exit 1
    fi
    
    local phpunit_version=$(vendor/bin/phpunit --version | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
    echo "PHPUnit Version: $phpunit_version"
    
    # Check WordPress test environment
    if [ ! -f "$WP_TESTS_DIR/includes/functions.php" ]; then
        echo -e "${RED}WordPress test functions not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Environment validation passed${NC}"
}

# Function to install WordPress test library
install_wp_tests() {
    echo -e "${BLUE}Installing WordPress test library...${NC}"
    
    if [ ! -f "$TESTS_DIR/install-wp-tests.sh" ]; then
        curl -s https://raw.githubusercontent.com/wp-cli/scaffold-command/master/templates/install-wp-tests.sh > "$TESTS_DIR/install-wp-tests.sh"
        chmod +x "$TESTS_DIR/install-wp-tests.sh"
    fi
    
    bash "$TESTS_DIR/install-wp-tests.sh" wordpress_test root '' localhost latest
}

# Main execution
main() {
    cd "$PLUGIN_DIR"
    
    # Parse command line arguments
    case "${1:-all}" in
        "install")
            install_wp_tests
            ;;
        "validate")
            validate_environment
            ;;
        "core")
            validate_environment
            run_test_suite "core-services" "Core Services Tests"
            ;;
        "advanced")
            validate_environment
            run_test_suite "advanced-services" "Advanced Services Tests"
            ;;
        "integration")
            validate_environment
            run_test_suite "integration" "Integration Tests"
            ;;
        "legacy")
            validate_environment
            run_test_suite "legacy-compatibility" "Legacy Compatibility Tests"
            ;;
        "comprehensive")
            validate_environment
            run_test_suite "comprehensive" "Comprehensive Test Suite"
            ;;
        "coverage")
            validate_environment
            run_comprehensive_tests
            ;;
        "all"|*)
            validate_environment
            
            echo -e "\n${BLUE}Running all test suites...${NC}"
            
            local failed_suites=()
            
            # Run each test suite
            run_test_suite "core-services" "Core Services Tests" || failed_suites+=("core-services")
            run_test_suite "advanced-services" "Advanced Services Tests" || failed_suites+=("advanced-services")
            run_test_suite "integration" "Integration Tests" || failed_suites+=("integration")
            run_test_suite "legacy-compatibility" "Legacy Compatibility Tests" || failed_suites+=("legacy-compatibility")
            run_test_suite "comprehensive" "Comprehensive Test Suite" || failed_suites+=("comprehensive")
            
            # Final summary
            echo -e "\n${BLUE}Test Execution Summary${NC}"
            echo "======================"
            
            if [ ${#failed_suites[@]} -eq 0 ]; then
                echo -e "${GREEN}✓ All test suites passed successfully${NC}"
                
                # Run comprehensive coverage report
                echo -e "\n${BLUE}Generating final coverage report...${NC}"
                run_comprehensive_tests
                
                exit 0
            else
                echo -e "${RED}✗ Failed test suites: ${failed_suites[*]}${NC}"
                exit 1
            fi
            ;;
    esac
}

# Help function
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install       Install WordPress test library"
    echo "  validate      Validate test environment"
    echo "  core          Run core services tests"
    echo "  advanced      Run advanced services tests"
    echo "  integration   Run integration tests"
    echo "  legacy        Run legacy compatibility tests"
    echo "  comprehensive Run comprehensive test suite"
    echo "  coverage      Run all tests with coverage reporting"
    echo "  all           Run all test suites (default)"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install     # Install WordPress test library"
    echo "  $0 core        # Run only core services tests"
    echo "  $0 coverage    # Run all tests with coverage"
    echo "  $0             # Run all tests"
}

# Check for help
if [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Execute main function
main "$@"