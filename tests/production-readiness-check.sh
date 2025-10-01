#!/bin/bash

# Production Readiness Check for Live Admin Styler v2.0
# Final validation before production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="2.0.0"
PLUGIN_NAME="Live Admin Styler"

# Results tracking
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_TOTAL=0
CRITICAL_ISSUES=0

echo -e "${BLUE}=========================================="
echo -e "🚀 Production Readiness Check"
echo -e "$PLUGIN_NAME v$VERSION"
echo -e "==========================================${NC}"

# Function to run check and track results
run_check() {
    local check_name="$1"
    local check_command="$2"
    local is_critical="${3:-false}"
    
    echo -e "\n${YELLOW}🔍 $check_name${NC}"
    echo "----------------------------------------"
    
    ((CHECKS_TOTAL++))
    
    if eval "$check_command"; then
        echo -e "${GREEN}✅ $check_name PASSED${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ $check_name FAILED${NC}"
        ((CHECKS_FAILED++))
        
        if [ "$is_critical" = "true" ]; then
            ((CRITICAL_ISSUES++))
        fi
        return 1
    fi
}

# Function to check file exists
check_file_exists() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        echo "✅ $description: $file"
        return 0
    else
        echo "❌ $description missing: $file"
        return 1
    fi
}

# Function to check directory exists
check_dir_exists() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        echo "✅ $description: $dir"
        return 0
    else
        echo "❌ $description missing: $dir"
        return 1
    fi
}

echo "Starting comprehensive production readiness validation..."

# 1. Core Files Check
run_check "Core Files Validation" '
    check_file_exists "live-admin-styler.php" "Main plugin file" &&
    check_file_exists "includes/CoreEngine.php" "Core engine" &&
    check_file_exists "includes/SettingsManager.php" "Settings manager" &&
    check_file_exists "includes/SecurityManager.php" "Security manager" &&
    check_file_exists "includes/CacheManager.php" "Cache manager" &&
    check_file_exists "includes/StyleGenerator.php" "Style generator" &&
    check_file_exists "includes/AssetLoader.php" "Asset loader" &&
    check_file_exists "includes/CommunicationManager.php" "Communication manager" &&
    check_file_exists "includes/TemplateManager.php" "Template manager" &&
    check_file_exists "includes/PerformanceMonitor.php" "Performance monitor"
' "true"

# 2. Asset Files Check
run_check "Asset Files Validation" '
    check_file_exists "assets/css/las-main.css" "Main CSS file" &&
    check_file_exists "assets/css/las-live-edit.css" "Live edit CSS" &&
    check_file_exists "assets/css/las-utilities.css" "Utilities CSS" &&
    check_file_exists "assets/js/las-core.js" "Core JavaScript" &&
    check_dir_exists "assets/js/modules" "JavaScript modules directory"
' "true"

# 3. Documentation Check
run_check "Documentation Validation" '
    check_file_exists "README.md" "README file" &&
    check_file_exists "CHANGELOG.md" "Changelog" &&
    check_file_exists "docs/USER_GUIDE.md" "User guide" &&
    check_file_exists "docs/DEVELOPER_GUIDE.md" "Developer guide" &&
    check_file_exists "docs/API.md" "API documentation" &&
    check_file_exists "docs/DEPLOYMENT_GUIDE.md" "Deployment guide" &&
    check_file_exists "docs/INSTALLATION_GUIDE.md" "Installation guide"
'

# 4. Configuration Files Check
run_check "Configuration Files Validation" '
    check_file_exists ".eslintrc.json" "ESLint configuration" &&
    check_file_exists ".stylelintrc.json" "Stylelint configuration" &&
    check_file_exists "phpcs.xml" "PHP CodeSniffer configuration" &&
    check_file_exists "package.json" "NPM package configuration" &&
    check_file_exists "version-control.json" "Version control file"
'

# 5. Test Files Check
run_check "Test Infrastructure Validation" '
    check_dir_exists "tests/php" "PHP tests directory" &&
    check_dir_exists "tests/js" "JavaScript tests directory" &&
    check_file_exists "phpunit.xml.dist" "PHPUnit configuration" &&
    check_file_exists "tests/run-final-integration-tests.sh" "Integration test runner"
'

# 6. Build System Check
run_check "Build System Validation" '
    check_file_exists "scripts/build-production.sh" "Production build script" &&
    check_file_exists "scripts/deploy-production.sh" "Deployment script" &&
    check_file_exists "scripts/code-quality.sh" "Code quality script"
'

# 7. Security Validation
run_check "Security Validation" '
    if [ -f "tests/security-audit-final.php" ]; then
        echo "Running security audit..."
        php tests/security-audit-final.php > /dev/null 2>&1
    else
        echo "Security audit script not found"
        false
    fi
' "true"

# 8. Performance Validation
run_check "Performance Validation" '
    if [ -f "tests/performance-validation-final.js" ] && command -v node &> /dev/null; then
        echo "Running performance validation..."
        node tests/performance-validation-final.js > /dev/null 2>&1
    else
        echo "Performance validation not available"
        false
    fi
' "true"

# 9. Code Quality Check
run_check "Code Quality Validation" '
    if [ -f "scripts/code-quality.sh" ]; then
        echo "Running code quality checks..."
        bash scripts/code-quality.sh > /dev/null 2>&1
    else
        echo "Code quality script not found"
        false
    fi
'

# 10. System Integration Check
run_check "System Integration Validation" '
    if [ -f "tests/validate-system-integration.js" ] && command -v node &> /dev/null; then
        echo "Running system integration validation..."
        node tests/validate-system-integration.js > /dev/null 2>&1
    else
        echo "System integration validation not available"
        false
    fi
' "true"

# 11. Version Consistency Check
run_check "Version Consistency Validation" '
    # Check version in main plugin file
    if grep -q "Version: $VERSION" live-admin-styler.php; then
        echo "✅ Plugin header version correct: $VERSION"
    else
        echo "❌ Plugin header version mismatch"
        return 1
    fi
    
    # Check version constant
    if grep -q "define.*LAS_VERSION.*$VERSION" live-admin-styler.php; then
        echo "✅ Version constant correct: $VERSION"
    else
        echo "❌ Version constant mismatch"
        return 1
    fi
    
    # Check package.json version
    if [ -f "package.json" ] && grep -q "\"version\": \"$VERSION\"" package.json; then
        echo "✅ Package.json version correct: $VERSION"
    else
        echo "❌ Package.json version mismatch"
        return 1
    fi
'

# 12. File Permissions Check
run_check "File Permissions Validation" '
    # Check for overly permissive files
    PERM_ISSUES=0
    
    # Check PHP files (should be 644)
    while IFS= read -r -d "" file; do
        perms=$(stat -c "%a" "$file" 2>/dev/null || echo "000")
        if [ "$perms" -gt "644" ]; then
            echo "⚠️ Overly permissive file: $file ($perms)"
            ((PERM_ISSUES++))
        fi
    done < <(find . -name "*.php" -print0)
    
    # Check directories (should be 755)
    while IFS= read -r -d "" dir; do
        perms=$(stat -c "%a" "$dir" 2>/dev/null || echo "000")
        if [ "$perms" -gt "755" ]; then
            echo "⚠️ Overly permissive directory: $dir ($perms)"
            ((PERM_ISSUES++))
        fi
    done < <(find . -type d -print0)
    
    if [ $PERM_ISSUES -eq 0 ]; then
        echo "✅ File permissions are appropriate"
        return 0
    else
        echo "❌ Found $PERM_ISSUES permission issues"
        return 1
    fi
'

# 13. Backup Files Check
run_check "Backup Files Validation" '
    # Check for backup files that should not be in production
    BACKUP_FILES=$(find . -name "*.bak" -o -name "*.backup" -o -name "*.old" -o -name "*~" -o -name "*.tmp" | wc -l)
    
    if [ "$BACKUP_FILES" -eq 0 ]; then
        echo "✅ No backup files found"
        return 0
    else
        echo "❌ Found $BACKUP_FILES backup files that should be removed"
        find . -name "*.bak" -o -name "*.backup" -o -name "*.old" -o -name "*~" -o -name "*.tmp"
        return 1
    fi
'

# 14. Development Files Check
run_check "Development Files Validation" '
    # Check for development files that should not be in production
    DEV_FILES=0
    
    if [ -d ".git" ]; then
        echo "⚠️ .git directory found (should be excluded from production)"
        ((DEV_FILES++))
    fi
    
    if [ -d "node_modules" ]; then
        echo "⚠️ node_modules directory found (should be excluded from production)"
        ((DEV_FILES++))
    fi
    
    if [ -d "vendor" ]; then
        echo "⚠️ vendor directory found (may contain dev dependencies)"
        ((DEV_FILES++))
    fi
    
    if [ -f ".env" ]; then
        echo "❌ .env file found (should not be in production)"
        ((DEV_FILES++))
    fi
    
    if [ $DEV_FILES -eq 0 ]; then
        echo "✅ No problematic development files found"
        return 0
    else
        echo "Found $DEV_FILES development-related items"
        return 1
    fi
'

# 15. Asset Size Check
run_check "Asset Size Validation" '
    TOTAL_SIZE=0
    LARGE_FILES=0
    
    # Check CSS files
    for css_file in assets/css/*.css; do
        if [ -f "$css_file" ]; then
            size=$(du -k "$css_file" | cut -f1)
            TOTAL_SIZE=$((TOTAL_SIZE + size))
            
            if [ $size -gt 50 ]; then
                echo "⚠️ Large CSS file: $css_file (${size}KB)"
                ((LARGE_FILES++))
            fi
        fi
    done
    
    # Check JS files
    for js_file in assets/js/*.js assets/js/modules/*.js; do
        if [ -f "$js_file" ]; then
            size=$(du -k "$js_file" | cut -f1)
            TOTAL_SIZE=$((TOTAL_SIZE + size))
            
            if [ $size -gt 30 ]; then
                echo "⚠️ Large JS file: $js_file (${size}KB)"
                ((LARGE_FILES++))
            fi
        fi
    done
    
    echo "Total asset size: ${TOTAL_SIZE}KB"
    
    if [ $TOTAL_SIZE -gt 300 ]; then
        echo "❌ Total asset size too large: ${TOTAL_SIZE}KB (limit: 300KB)"
        return 1
    elif [ $LARGE_FILES -gt 0 ]; then
        echo "⚠️ Found $LARGE_FILES large files, but total size acceptable"
        return 0
    else
        echo "✅ Asset sizes are optimal"
        return 0
    fi
'

# Generate final report
echo -e "\n${BLUE}=========================================="
echo -e "📊 PRODUCTION READINESS REPORT"
echo -e "==========================================${NC}"

echo -e "\n📈 Summary:"
echo -e "   Total Checks: $CHECKS_TOTAL"
echo -e "   Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "   Failed: ${RED}$CHECKS_FAILED${NC}"
echo -e "   Critical Issues: ${RED}$CRITICAL_ISSUES${NC}"

# Calculate readiness score
READINESS_SCORE=$(echo "scale=1; $CHECKS_PASSED * 100 / $CHECKS_TOTAL" | bc -l 2>/dev/null || echo "0")

echo -e "\n🎯 Readiness Score: ${READINESS_SCORE}%"

# Determine overall status
echo -e "\n🚀 Production Readiness Status:"

if [ $CRITICAL_ISSUES -eq 0 ] && [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ READY FOR PRODUCTION${NC}"
    echo -e "${GREEN}🎉 All checks passed! The plugin is ready for deployment.${NC}"
    FINAL_STATUS=0
elif [ $CRITICAL_ISSUES -eq 0 ] && [ $CHECKS_FAILED -le 2 ]; then
    echo -e "${YELLOW}⚠️ MOSTLY READY${NC}"
    echo -e "${YELLOW}Minor issues found, but no critical problems. Consider fixing before deployment.${NC}"
    FINAL_STATUS=0
elif [ $CRITICAL_ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️ NEEDS ATTENTION${NC}"
    echo -e "${YELLOW}Several issues found. Recommended to fix before production deployment.${NC}"
    FINAL_STATUS=1
else
    echo -e "${RED}❌ NOT READY${NC}"
    echo -e "${RED}Critical issues found that must be resolved before production deployment.${NC}"
    FINAL_STATUS=1
fi

# Save report
REPORT_FILE="tests/reports/production-readiness-$(date +%Y%m%d-%H%M%S).json"
mkdir -p tests/reports

cat > "$REPORT_FILE" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "plugin_name": "$PLUGIN_NAME",
    "version": "$VERSION",
    "readiness_score": $READINESS_SCORE,
    "checks_total": $CHECKS_TOTAL,
    "checks_passed": $CHECKS_PASSED,
    "checks_failed": $CHECKS_FAILED,
    "critical_issues": $CRITICAL_ISSUES,
    "production_ready": $([ $FINAL_STATUS -eq 0 ] && echo "true" || echo "false"),
    "status": "$([ $FINAL_STATUS -eq 0 ] && echo "READY" || echo "NOT_READY")"
}
EOF

echo -e "\n📄 Detailed report saved to: $REPORT_FILE"

# Final recommendations
if [ $FINAL_STATUS -eq 0 ]; then
    echo -e "\n${GREEN}🚀 Next Steps:${NC}"
    echo -e "   1. Create production build: ./scripts/build-production.sh"
    echo -e "   2. Deploy to staging for final testing"
    echo -e "   3. Deploy to production: ./scripts/deploy-production.sh"
    echo -e "   4. Monitor post-deployment metrics"
else
    echo -e "\n${RED}🔧 Required Actions:${NC}"
    echo -e "   1. Fix critical issues identified above"
    echo -e "   2. Re-run production readiness check"
    echo -e "   3. Test thoroughly in staging environment"
    echo -e "   4. Only deploy after all issues are resolved"
fi

exit $FINAL_STATUS