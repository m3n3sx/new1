#!/bin/bash

# Final Integration Test Runner
# Runs comprehensive system integration tests for Live Admin Styler v2.0

set -e

echo "=========================================="
echo "Live Admin Styler v2.0 - Final Integration Tests"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    
    ((TESTS_TOTAL++))
}

# Create reports directory
mkdir -p tests/reports

echo "Starting comprehensive integration tests..."

# 1. PHP Integration Tests
run_test "PHP System Integration Tests" \
    "vendor/bin/phpunit tests/integration-final-system.php --testdox"

# 2. JavaScript Integration Tests  
run_test "JavaScript System Integration Tests" \
    "npm test -- tests/js/test-final-system-integration.js"

# 3. System Validation
run_test "Final System Validation" \
    "php tests/final-system-validation.php"

# 4. Code Quality Checks
run_test "PHP Code Quality (PHPCS)" \
    "vendor/bin/phpcs --standard=phpcs.xml includes/ --report=summary"

run_test "JavaScript Code Quality (ESLint)" \
    "npx eslint assets/js/ --ext .js --format compact"

run_test "CSS Code Quality (Stylelint)" \
    "npx stylelint 'assets/css/*.css' --formatter compact"

# 5. Security Validation
run_test "Security Validation" \
    "php tests/security-validation-suite.php"

# 6. Performance Benchmarks
run_test "Performance Benchmarks" \
    "node tests/validate-performance-optimization.js"

# 7. Cross-Browser Compatibility (if available)
if command -v playwright &> /dev/null; then
    run_test "Cross-Browser Compatibility Tests" \
        "npx playwright test tests/browser-compatibility-test.html"
else
    echo -e "${YELLOW}⚠ Playwright not available - Skipping cross-browser tests${NC}"
fi

# 8. WordPress Integration Tests
run_test "WordPress Integration Tests" \
    "vendor/bin/phpunit tests/php/TestWordPressIntegration.php --testdox"

# 9. Memory Leak Detection
run_test "Memory Leak Detection" \
    "php tests/validate-memory-usage.php"

# 10. Final Validation Report
echo -e "\n${YELLOW}Generating Final Integration Report...${NC}"

# Create comprehensive report
cat > tests/reports/final-integration-summary.json << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "version": "2.0.0",
    "test_summary": {
        "total_tests": $TESTS_TOTAL,
        "passed": $TESTS_PASSED,
        "failed": $TESTS_FAILED,
        "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l)
    },
    "system_status": "$([ $TESTS_FAILED -eq 0 ] && echo "READY" || echo "NOT_READY")",
    "production_ready": $([ $TESTS_FAILED -eq 0 ] && echo "true" || echo "false")
}
EOF

# Display final results
echo ""
echo "=========================================="
echo "FINAL INTEGRATION TEST RESULTS"
echo "=========================================="
echo -e "Total Tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION!${NC}"
    echo -e "${GREEN}✓ Live Admin Styler v2.0 integration validation complete${NC}"
    exit 0
else
    echo -e "\n${RED}❌ INTEGRATION TESTS FAILED${NC}"
    echo -e "${RED}✗ Please fix failing tests before production deployment${NC}"
    echo -e "\nFailed tests need to be addressed:"
    echo -e "- Check individual test outputs above"
    echo -e "- Review logs in tests/reports/ directory"
    echo -e "- Fix issues and re-run integration tests"
    exit 1
fi