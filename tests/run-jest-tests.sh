#!/bin/bash

# Jest Test Execution Script for Live Admin Styler v2.0
# 
# Comprehensive test runner that executes all JavaScript tests
# with proper configuration, coverage reporting, and validation.
#
# Usage:
#   ./run-jest-tests.sh [unit|integration|coverage|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$SCRIPT_DIR/js"
COVERAGE_DIR="$SCRIPT_DIR/coverage/js"
REPORTS_DIR="$SCRIPT_DIR/reports"

# Ensure directories exist
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORTS_DIR"

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

# Function to check if Node.js and npm are available
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 14 or higher."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        print_error "Node.js version 14 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Function to install npm dependencies
install_dependencies() {
    print_status "Installing npm dependencies..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in project root"
        exit 1
    fi
    
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        npm install
    else
        print_status "Dependencies already installed"
    fi
    
    print_success "Dependencies installed"
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run Jest with specific test pattern for unit tests
    npm test -- \
        --testPathPattern="test-(las-core|settings-manager|live-preview|ajax-manager|live-edit-engine|micro-panel|auto-save|tab-sync|color-picker|gradient-builder|css-variables-engine|navigation-manager|card-layout|form-controls|animation-manager|theme-manager|template-manager|performance-monitor|memory-manager)" \
        --verbose \
        --collectCoverage \
        --coverageDirectory="$COVERAGE_DIR" \
        --coverageReporters=text,html,json \
        --testTimeout=10000
    
    print_success "Unit tests completed"
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run Jest with specific test pattern for integration tests
    npm test -- \
        --testPathPattern="test-(integration|ajax-workflows|template-application|state-management|cross-browser-compatibility)" \
        --verbose \
        --collectCoverage \
        --coverageDirectory="$COVERAGE_DIR" \
        --coverageReporters=text,html,json \
        --testTimeout=15000
    
    print_success "Integration tests completed"
}

# Function to run comprehensive tests
run_comprehensive_tests() {
    print_status "Running comprehensive test suite..."
    
    cd "$PROJECT_ROOT"
    
    # Run the comprehensive test suite
    npm test -- \
        --testPathPattern="test-(suite-runner|integration-comprehensive|module-coverage)" \
        --verbose \
        --collectCoverage \
        --coverageDirectory="$COVERAGE_DIR" \
        --coverageReporters=text,html,json,lcov \
        --testTimeout=30000
    
    print_success "Comprehensive tests completed"
}

# Function to run all tests
run_all_tests() {
    print_status "Running all JavaScript tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run all Jest tests
    npm test -- \
        --verbose \
        --collectCoverage \
        --coverageDirectory="$COVERAGE_DIR" \
        --coverageReporters=text,html,json,lcov \
        --testTimeout=30000 \
        --maxWorkers=4
    
    print_success "All tests completed"
}

# Function to generate coverage report
generate_coverage_report() {
    print_status "Generating coverage report..."
    
    cd "$PROJECT_ROOT"
    
    # Run Jest with coverage only
    npm run test:coverage
    
    # Check if coverage meets thresholds
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        print_status "Coverage summary generated at $COVERAGE_DIR/coverage-summary.json"
        
        # Extract coverage percentage (simplified)
        if command -v jq &> /dev/null; then
            COVERAGE=$(jq -r '.total.statements.pct' "$COVERAGE_DIR/coverage-summary.json" 2>/dev/null || echo "unknown")
            if [ "$COVERAGE" != "unknown" ] && [ "$COVERAGE" != "null" ]; then
                print_status "Overall coverage: ${COVERAGE}%"
                
                # Check if coverage meets threshold
                THRESHOLD=80
                if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l) )); then
                    print_success "Coverage meets threshold of ${THRESHOLD}%"
                else
                    print_warning "Coverage below threshold of ${THRESHOLD}%"
                fi
            fi
        fi
    fi
    
    # Open coverage report in browser (optional)
    if [ -f "$COVERAGE_DIR/index.html" ]; then
        print_status "HTML coverage report available at: $COVERAGE_DIR/index.html"
    fi
    
    print_success "Coverage report generated"
}

# Function to validate test setup
validate_test_setup() {
    print_status "Validating test setup..."
    
    # Check if Jest is configured
    if ! grep -q '"jest"' "$PROJECT_ROOT/package.json"; then
        print_error "Jest configuration not found in package.json"
        exit 1
    fi
    
    # Check if test setup file exists
    if [ ! -f "$TEST_DIR/setup.js" ]; then
        print_error "Test setup file not found: $TEST_DIR/setup.js"
        exit 1
    fi
    
    # Check if test files exist
    TEST_FILES_COUNT=$(find "$TEST_DIR" -name "test-*.js" | wc -l)
    if [ "$TEST_FILES_COUNT" -lt 10 ]; then
        print_warning "Only $TEST_FILES_COUNT test files found. Expected at least 10."
    else
        print_status "Found $TEST_FILES_COUNT test files"
    fi
    
    print_success "Test setup validation passed"
}

# Function to run module coverage validation
run_module_coverage_validation() {
    print_status "Running module coverage validation..."
    
    cd "$PROJECT_ROOT"
    
    # Run the module coverage validation test
    npm test -- \
        --testPathPattern="test-module-coverage" \
        --verbose \
        --testTimeout=10000
    
    print_success "Module coverage validation completed"
}

# Function to clean up test artifacts
cleanup() {
    print_status "Cleaning up test artifacts..."
    
    # Remove temporary files
    find "$PROJECT_ROOT" -name "*.tmp" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -name ".nyc_output" -type d -exec rm -rf {} + 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  unit          Run unit tests only"
    echo "  integration   Run integration tests only"
    echo "  comprehensive Run comprehensive test suite"
    echo "  coverage      Generate coverage report"
    echo "  validate      Validate test setup"
    echo "  all           Run all tests (default)"
    echo "  clean         Clean up test artifacts"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 unit"
    echo "  $0 coverage"
    echo "  $0 all"
}

# Main execution
main() {
    local command="${1:-all}"
    
    case "$command" in
        "unit")
            check_dependencies
            install_dependencies
            validate_test_setup
            run_unit_tests
            ;;
        "integration")
            check_dependencies
            install_dependencies
            validate_test_setup
            run_integration_tests
            ;;
        "comprehensive")
            check_dependencies
            install_dependencies
            validate_test_setup
            run_comprehensive_tests
            ;;
        "coverage")
            check_dependencies
            install_dependencies
            validate_test_setup
            generate_coverage_report
            ;;
        "validate")
            check_dependencies
            install_dependencies
            validate_test_setup
            run_module_coverage_validation
            ;;
        "all")
            check_dependencies
            install_dependencies
            validate_test_setup
            run_all_tests
            generate_coverage_report
            ;;
        "clean")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Execute main function
main "$@"

print_success "Jest test execution completed successfully!"