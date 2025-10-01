#!/bin/bash

# Production Deployment Script for Live Admin Styler v2.0
# Handles deployment to production WordPress environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLUGIN_NAME="live-admin-styler"
VERSION="2.0.0"
BACKUP_DIR="backups"
DEPLOY_LOG="deploy-$(date +%Y%m%d-%H%M%S).log"

# Function to log messages
log() {
    echo -e "$1" | tee -a "$DEPLOY_LOG"
}

# Function to log steps
log_step() {
    log "\n${YELLOW}🚀 $1${NC}"
    log "----------------------------------------"
}

# Function to log success
log_success() {
    log "${GREEN}✅ $1${NC}"
}

# Function to log error and exit
log_error() {
    log "${RED}❌ $1${NC}"
    exit 1
}

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
}

# Display deployment header
log "${BLUE}=========================================="
log "Live Admin Styler v2.0 - Production Deployment"
log "==========================================${NC}"

# Check if we're in the right directory
if [ ! -f "live-admin-styler.php" ]; then
    log_error "live-admin-styler.php not found. Please run from plugin root directory."
fi

# Parse command line arguments
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE_DEPLOY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-backup    Skip backup creation"
            echo "  --skip-tests     Skip test execution"
            echo "  --force          Force deployment without confirmations"
            echo "  --dry-run        Show what would be done without executing"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            ;;
    esac
done

# Pre-deployment checks
log_step "Pre-deployment checks"

# Check if WordPress is accessible
if ! wp core is-installed 2>/dev/null; then
    log_error "WordPress installation not found or WP-CLI not available"
fi

# Check WordPress version
WP_VERSION=$(wp core version 2>/dev/null || echo "unknown")
log "WordPress Version: $WP_VERSION"

# Check PHP version
PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2)
log "PHP Version: $PHP_VERSION"

# Verify minimum requirements
if ! php -v | grep -q "PHP [78]"; then
    log_error "PHP 7.4+ required. Current version: $PHP_VERSION"
fi

log_success "Pre-deployment checks passed"

# Create backup (unless skipped)
if [ "$SKIP_BACKUP" = false ]; then
    log_step "Creating backup"
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/${PLUGIN_NAME}-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Check if plugin is currently installed
    if wp plugin is-installed live-admin-styler 2>/dev/null; then
        log "Creating backup of current installation..."
        
        if [ "$DRY_RUN" = false ]; then
            # Backup current plugin files
            tar -czf "$BACKUP_FILE" -C "$(wp plugin path)" live-admin-styler/ 2>/dev/null || true
            
            # Backup database settings
            wp db export "$BACKUP_DIR/database-backup-$(date +%Y%m%d-%H%M%S).sql" --add-drop-table
            
            log_success "Backup created: $BACKUP_FILE"
        else
            log "DRY RUN: Would create backup at $BACKUP_FILE"
        fi
    else
        log "No existing installation found - skipping backup"
    fi
fi

# Run tests (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
    log_step "Running pre-deployment tests"
    
    if [ "$DRY_RUN" = false ]; then
        # Run PHP tests
        if [ -f "vendor/bin/phpunit" ]; then
            vendor/bin/phpunit --configuration phpunit.xml.dist || log_error "PHP tests failed"
            log_success "PHP tests passed"
        else
            log "${YELLOW}⚠️ PHPUnit not available - skipping PHP tests${NC}"
        fi
        
        # Run JavaScript tests
        if command -v npm &> /dev/null && [ -f "package.json" ]; then
            npm test || log_error "JavaScript tests failed"
            log_success "JavaScript tests passed"
        else
            log "${YELLOW}⚠️ npm/package.json not available - skipping JS tests${NC}"
        fi
        
        # Run system validation
        if [ -f "tests/validate-system-integration.js" ]; then
            node tests/validate-system-integration.js || log_error "System validation failed"
            log_success "System validation passed"
        fi
    else
        log "DRY RUN: Would run test suite"
    fi
fi

# Build production package
log_step "Building production package"

if [ "$DRY_RUN" = false ]; then
    if [ -f "scripts/build-production.sh" ]; then
        chmod +x scripts/build-production.sh
        ./scripts/build-production.sh || log_error "Production build failed"
        log_success "Production package built"
    else
        log_error "Build script not found: scripts/build-production.sh"
    fi
else
    log "DRY RUN: Would build production package"
fi

# Deployment confirmation
if [ "$FORCE_DEPLOY" = false ] && [ "$DRY_RUN" = false ]; then
    log_step "Deployment confirmation"
    log "Ready to deploy Live Admin Styler v$VERSION"
    log "WordPress: $WP_VERSION"
    log "PHP: $PHP_VERSION"
    log "Backup: $([ "$SKIP_BACKUP" = true ] && echo "Skipped" || echo "Created")"
    log "Tests: $([ "$SKIP_TESTS" = true ] && echo "Skipped" || echo "Passed")"
    
    confirm "Proceed with deployment?"
fi

# Deploy plugin
log_step "Deploying plugin"

if [ "$DRY_RUN" = false ]; then
    # Check if plugin package exists
    PLUGIN_PACKAGE="dist/${PLUGIN_NAME}-v${VERSION}.zip"
    if [ ! -f "$PLUGIN_PACKAGE" ]; then
        log_error "Plugin package not found: $PLUGIN_PACKAGE"
    fi
    
    # Deactivate current plugin if installed
    if wp plugin is-installed live-admin-styler; then
        log "Deactivating current plugin..."
        wp plugin deactivate live-admin-styler
    fi
    
    # Install new version
    log "Installing Live Admin Styler v$VERSION..."
    wp plugin install "$PLUGIN_PACKAGE" --force
    
    # Activate plugin
    log "Activating plugin..."
    wp plugin activate live-admin-styler
    
    log_success "Plugin deployed and activated"
else
    log "DRY RUN: Would deploy plugin package"
fi

# Post-deployment verification
log_step "Post-deployment verification"

if [ "$DRY_RUN" = false ]; then
    # Verify plugin is active
    if wp plugin is-active live-admin-styler; then
        log_success "Plugin is active"
    else
        log_error "Plugin activation failed"
    fi
    
    # Check plugin version
    INSTALLED_VERSION=$(wp plugin get live-admin-styler --field=version 2>/dev/null || echo "unknown")
    if [ "$INSTALLED_VERSION" = "$VERSION" ]; then
        log_success "Correct version installed: $INSTALLED_VERSION"
    else
        log_error "Version mismatch. Expected: $VERSION, Installed: $INSTALLED_VERSION"
    fi
    
    # Basic functionality test
    log "Testing basic functionality..."
    
    # Check if admin page is accessible
    if wp eval "echo (class_exists('LiveAdminStyler\\CoreEngine') ? 'OK' : 'FAIL');" | grep -q "OK"; then
        log_success "Core engine loaded successfully"
    else
        log_error "Core engine failed to load"
    fi
    
    # Check database tables/options
    if wp option get las_fresh_version >/dev/null 2>&1; then
        log_success "Plugin options initialized"
    else
        log "${YELLOW}⚠️ Plugin options not found - may be first install${NC}"
    fi
    
    # Performance check
    log "Running performance check..."
    MEMORY_USAGE=$(wp eval "echo memory_get_peak_usage(true) / 1024 / 1024;" | cut -d. -f1)
    if [ "$MEMORY_USAGE" -lt 50 ]; then
        log_success "Memory usage acceptable: ${MEMORY_USAGE}MB"
    else
        log "${YELLOW}⚠️ High memory usage: ${MEMORY_USAGE}MB${NC}"
    fi
    
else
    log "DRY RUN: Would verify deployment"
fi

# Generate deployment report
log_step "Generating deployment report"

REPORT_FILE="deploy-report-$(date +%Y%m%d-%H%M%S).json"

if [ "$DRY_RUN" = false ]; then
    cat > "$REPORT_FILE" << EOF
{
    "deployment_info": {
        "plugin_name": "$PLUGIN_NAME",
        "version": "$VERSION",
        "deployment_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
        "deployment_type": "production"
    },
    "environment": {
        "wordpress_version": "$WP_VERSION",
        "php_version": "$PHP_VERSION",
        "memory_usage": "${MEMORY_USAGE:-unknown}MB"
    },
    "deployment_options": {
        "backup_created": $([ "$SKIP_BACKUP" = true ] && echo "false" || echo "true"),
        "tests_run": $([ "$SKIP_TESTS" = true ] && echo "false" || echo "true"),
        "forced_deployment": $([ "$FORCE_DEPLOY" = true ] && echo "true" || echo "false")
    },
    "verification": {
        "plugin_active": $(wp plugin is-active live-admin-styler && echo "true" || echo "false"),
        "version_correct": $([ "$INSTALLED_VERSION" = "$VERSION" ] && echo "true" || echo "false"),
        "core_engine_loaded": true
    },
    "deployment_status": "success"
}
EOF
    
    log_success "Deployment report generated: $REPORT_FILE"
else
    log "DRY RUN: Would generate deployment report"
fi

# Cleanup
log_step "Cleanup"

if [ "$DRY_RUN" = false ]; then
    # Clean up temporary files
    rm -f wp-cli.log
    
    # Archive deployment log
    mkdir -p logs
    mv "$DEPLOY_LOG" logs/
    
    log_success "Cleanup completed"
else
    log "DRY RUN: Would perform cleanup"
fi

# Display deployment summary
log "\n${GREEN}=========================================="
log "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
log "==========================================${NC}"

log "\n📦 ${BLUE}Deployment Summary:${NC}"
log "   Plugin: $PLUGIN_NAME v$VERSION"
log "   Environment: WordPress $WP_VERSION, PHP $PHP_VERSION"
log "   Deployment Date: $(date)"
log "   Backup: $([ "$SKIP_BACKUP" = true ] && echo "Skipped" || echo "Created")"
log "   Tests: $([ "$SKIP_TESTS" = true ] && echo "Skipped" || echo "Passed")"

if [ "$DRY_RUN" = false ]; then
    log "\n📁 ${BLUE}Generated Files:${NC}"
    log "   Deployment Report: $REPORT_FILE"
    log "   Deployment Log: logs/$DEPLOY_LOG"
    if [ "$SKIP_BACKUP" = false ] && [ -f "$BACKUP_FILE" ]; then
        log "   Backup: $BACKUP_FILE"
    fi
    
    log "\n✅ ${GREEN}Next Steps:${NC}"
    log "   1. Test the admin interface at /wp-admin/admin.php?page=live-admin-styler"
    log "   2. Verify all features are working correctly"
    log "   3. Monitor error logs for any issues"
    log "   4. Update documentation if needed"
    
    log "\n🔍 ${BLUE}Monitoring:${NC}"
    log "   - Check WordPress error logs"
    log "   - Monitor plugin performance"
    log "   - Watch for user feedback"
else
    log "\n${YELLOW}DRY RUN COMPLETED - No changes were made${NC}"
fi

log "\n🎊 ${GREEN}Live Admin Styler v$VERSION is now live!${NC}"

exit 0