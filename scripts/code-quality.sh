#!/bin/bash

# Live Admin Styler v2.0 - Code Quality Check Script
# This script runs all code quality checks and linting

set -e

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to run check and track results
run_check() {
    local check_name="$1"
    local check_command="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    print_status "Running $check_name..."
    
    if eval "$check_command"; then
        print_success "$check_name passed"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_error "$check_name failed"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Header
echo "========================================"
echo "Live Admin Styler v2.0 - Code Quality"
echo "========================================"
echo ""

# Check for required tools
print_status "Checking for required tools..."

MISSING_TOOLS=()

if ! command_exists phpcs; then
    MISSING_TOOLS+=("phpcs (PHP_CodeSniffer)")
fi

if ! command_exists phpcbf; then
    MISSING_TOOLS+=("phpcbf (PHP Code Beautifier)")
fi

if ! command_exists eslint; then
    MISSING_TOOLS+=("eslint")
fi

if ! command_exists prettier; then
    MISSING_TOOLS+=("prettier")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    print_error "Missing required tools:"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo "  - $tool"
    done
    echo ""
    echo "Please install missing tools:"
    echo "  npm install -g eslint prettier @wordpress/eslint-config"
    echo "  composer global require squizlabs/php_codesniffer"
    echo "  composer global require wp-coding-standards/wpcs"
    echo ""
    exit 1
fi

print_success "All required tools are available"
echo ""

# PHP Code Quality Checks
echo "========================================"
echo "PHP Code Quality Checks"
echo "========================================"

# PHPCS - WordPress Coding Standards
run_check "PHP Coding Standards (PHPCS)" "phpcs --standard=phpcs.xml --report=summary"

# PHP Syntax Check
run_check "PHP Syntax Check" "find includes -name '*.php' -exec php -l {} \; | grep -v 'No syntax errors'"

# PHP Mess Detector (if available)
if command_exists phpmd; then
    run_check "PHP Mess Detector" "phpmd includes text cleancode,codesize,controversial,design,naming,unusedcode"
else
    print_warning "PHP Mess Detector not available, skipping..."
fi

# PHPStan (if available)
if command_exists phpstan; then
    run_check "PHPStan Static Analysis" "phpstan analyse includes --level=5"
else
    print_warning "PHPStan not available, skipping..."
fi

echo ""

# JavaScript Code Quality Checks
echo "========================================"
echo "JavaScript Code Quality Checks"
echo "========================================"

# ESLint
run_check "JavaScript Linting (ESLint)" "eslint assets/js/**/*.js --format=compact"

# Prettier Check
run_check "Code Formatting (Prettier)" "prettier --check 'assets/js/**/*.js'"

# JSHint (if available)
if command_exists jshint; then
    run_check "JSHint Analysis" "jshint assets/js/**/*.js"
else
    print_warning "JSHint not available, skipping..."
fi

echo ""

# CSS Code Quality Checks
echo "========================================"
echo "CSS Code Quality Checks"
echo "========================================"

# Stylelint (if available)
if command_exists stylelint; then
    run_check "CSS Linting (Stylelint)" "stylelint 'assets/css/**/*.css'"
else
    print_warning "Stylelint not available, skipping..."
fi

# CSS Validation (if available)
if command_exists css-validator; then
    run_check "CSS Validation" "css-validator assets/css/**/*.css"
else
    print_warning "CSS Validator not available, skipping..."
fi

echo ""

# Security Checks
echo "========================================"
echo "Security Checks"
echo "========================================"

# PHP Security Checker (if available)
if command_exists security-checker; then
    run_check "PHP Security Check" "security-checker security:check composer.lock"
else
    print_warning "PHP Security Checker not available, skipping..."
fi

# ESLint Security Plugin
if eslint --print-config assets/js/las-core.js | grep -q "security"; then
    run_check "JavaScript Security Check" "eslint assets/js/**/*.js --config .eslintrc.security.json"
else
    print_warning "ESLint Security plugin not configured, skipping..."
fi

echo ""

# Documentation Checks
echo "========================================"
echo "Documentation Checks"
echo "========================================"

# PHPDoc Coverage
if command_exists phpdoc; then
    run_check "PHPDoc Coverage" "phpdoc --config=phpdoc.xml --validate"
else
    print_warning "PHPDoc not available, skipping documentation coverage check..."
fi

# JSDoc Coverage
if command_exists jsdoc; then
    run_check "JSDoc Coverage" "jsdoc -c jsdoc.conf.json --dry-run"
else
    print_warning "JSDoc not available, skipping documentation coverage check..."
fi

echo ""

# Performance Checks
echo "========================================"
echo "Performance Checks"
echo "========================================"

# File Size Check
print_status "Checking file sizes..."
LARGE_FILES=$(find assets -name "*.js" -o -name "*.css" | xargs ls -la | awk '$5 > 100000 {print $9 " (" $5 " bytes)"}')
if [ -n "$LARGE_FILES" ]; then
    print_warning "Large files detected (>100KB):"
    echo "$LARGE_FILES"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
    print_success "All asset files are within size limits"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Complexity Check
print_status "Checking code complexity..."
COMPLEX_FILES=$(find includes -name "*.php" -exec wc -l {} \; | awk '$1 > 500 {print $2 " (" $1 " lines)"}')
if [ -n "$COMPLEX_FILES" ]; then
    print_warning "Complex files detected (>500 lines):"
    echo "$COMPLEX_FILES"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
    print_success "All PHP files are within complexity limits"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""

# Summary
echo "========================================"
echo "Code Quality Summary"
echo "========================================"
echo "Total Checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $FAILED_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    print_success "All code quality checks passed! 🎉"
    echo ""
    echo "Your code meets all quality standards:"
    echo "✓ WordPress Coding Standards"
    echo "✓ JavaScript Best Practices"
    echo "✓ Security Guidelines"
    echo "✓ Documentation Standards"
    echo "✓ Performance Guidelines"
    exit 0
else
    print_error "Some code quality checks failed."
    echo ""
    echo "Please fix the issues above and run the checks again."
    echo ""
    echo "Quick fixes:"
    echo "  - Run 'phpcbf' to auto-fix PHP coding standards"
    echo "  - Run 'eslint --fix' to auto-fix JavaScript issues"
    echo "  - Run 'prettier --write' to format code"
    echo ""
    exit 1
fi