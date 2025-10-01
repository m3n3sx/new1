# Live Admin Styler v2.0 - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying Live Admin Styler v2.0 to production environments. The plugin has been modernized with enterprise-grade architecture and requires specific deployment considerations.

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Production Build Process](#production-build-process)
3. [Deployment Methods](#deployment-methods)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)

## Pre-Deployment Requirements

### System Requirements

#### WordPress Environment
- **WordPress Version**: 6.0 or higher
- **PHP Version**: 7.4 or higher (8.0+ recommended)
- **MySQL Version**: 5.7 or higher
- **Memory Limit**: 256MB minimum (512MB recommended)
- **Max Execution Time**: 60 seconds minimum

#### Server Requirements
- **Web Server**: Apache 2.4+ or Nginx 1.18+
- **SSL Certificate**: Required for production
- **File Permissions**: Proper WordPress file permissions
- **Backup System**: Automated backup solution in place

#### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS 14+, Android 10+)

### Pre-Deployment Checklist

- [ ] **Backup Current Site**: Complete database and file backup
- [ ] **Test Environment**: Deploy and test in staging environment first
- [ ] **Plugin Conflicts**: Check for potential conflicts with existing plugins
- [ ] **Theme Compatibility**: Verify compatibility with current theme
- [ ] **Performance Baseline**: Establish current performance metrics
- [ ] **User Permissions**: Verify admin user capabilities
- [ ] **Maintenance Mode**: Plan for maintenance window if needed

## Production Build Process

### Automated Build

Use the provided build script for automated production package creation:

```bash
# Make build script executable
chmod +x scripts/build-production.sh

# Run production build
./scripts/build-production.sh
```

The build process includes:
- Code quality checks (PHPCS, ESLint, Stylelint)
- Test suite execution
- Asset optimization and minification
- Production package creation
- Checksum generation
- Build report generation

### Manual Build Process

If automated build is not available:

1. **Install Dependencies**
   ```bash
   npm install
   composer install --no-dev --optimize-autoloader
   ```

2. **Run Quality Checks**
   ```bash
   vendor/bin/phpcs --standard=phpcs.xml includes/
   npx eslint assets/js/ --ext .js
   npx stylelint 'assets/css/*.css'
   ```

3. **Run Tests**
   ```bash
   vendor/bin/phpunit
   npm test
   ```

4. **Optimize Assets**
   ```bash
   # Minify CSS
   npx cleancss -o assets/css/las-main.min.css assets/css/las-main.css
   
   # Minify JavaScript
   npx terser assets/js/las-core.js -o assets/js/las-core.min.js
   ```

5. **Create Package**
   ```bash
   zip -r live-admin-styler-v2.0.0.zip . -x "node_modules/*" "vendor/*" "tests/*" ".git/*"
   ```

### Build Artifacts

The build process generates:
- `live-admin-styler-v2.0.0.zip` - WordPress plugin package
- `live-admin-styler-v2.0.0.tar.gz` - Alternative package format
- `build-report.json` - Detailed build information
- Checksum files (MD5 and SHA256)

## Deployment Methods

### Method 1: WordPress Admin Upload (Recommended)

1. **Access WordPress Admin**
   - Log in to WordPress admin dashboard
   - Navigate to Plugins → Add New → Upload Plugin

2. **Upload Plugin Package**
   - Click "Choose File" and select `live-admin-styler-v2.0.0.zip`
   - Click "Install Now"
   - Wait for upload and installation to complete

3. **Activate Plugin**
   - Click "Activate Plugin" after successful installation
   - Verify activation in Plugins list

### Method 2: FTP/SFTP Upload

1. **Extract Plugin Package**
   ```bash
   unzip live-admin-styler-v2.0.0.zip -d live-admin-styler/
   ```

2. **Upload via FTP/SFTP**
   - Connect to your server via FTP/SFTP
   - Navigate to `/wp-content/plugins/`
   - Upload the `live-admin-styler/` directory
   - Ensure proper file permissions (644 for files, 755 for directories)

3. **Activate via WordPress Admin**
   - Log in to WordPress admin
   - Navigate to Plugins
   - Find "Live Admin Styler" and click "Activate"

### Method 3: WP-CLI Deployment

1. **Install via WP-CLI**
   ```bash
   wp plugin install live-admin-styler-v2.0.0.zip --activate
   ```

2. **Verify Installation**
   ```bash
   wp plugin list | grep live-admin-styler
   ```

### Method 4: Git Deployment

For development/staging environments:

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-repo/live-admin-styler.git
   cd live-admin-styler
   ```

2. **Install Dependencies**
   ```bash
   npm install
   composer install
   ```

3. **Build Assets**
   ```bash
   npm run build
   ```

## Post-Deployment Verification

### Immediate Verification Steps

1. **Plugin Activation Check**
   - Verify plugin appears in active plugins list
   - Check for any activation errors in debug log

2. **Admin Interface Access**
   - Navigate to Settings → Live Admin Styler
   - Verify admin interface loads without errors
   - Check browser console for JavaScript errors

3. **Basic Functionality Test**
   - Change a simple setting (e.g., menu background color)
   - Verify live preview updates
   - Save settings and reload page to confirm persistence

4. **Performance Check**
   - Monitor page load times
   - Check memory usage in debug log
   - Verify no significant performance degradation

### Comprehensive Testing

1. **Feature Testing**
   - Test all major features (color picker, live edit mode, templates)
   - Verify responsive design on mobile devices
   - Test with different user roles and capabilities

2. **Compatibility Testing**
   - Test with other active plugins
   - Verify theme compatibility
   - Check multisite compatibility (if applicable)

3. **Performance Testing**
   - Run performance benchmarks
   - Monitor server resource usage
   - Test under load (if possible)

4. **Security Testing**
   - Verify nonce validation is working
   - Test input sanitization
   - Check capability-based access control

### Monitoring Setup

1. **Error Monitoring**
   - Enable WordPress debug logging
   - Monitor error logs for plugin-related issues
   - Set up automated error notifications

2. **Performance Monitoring**
   - Monitor page load times
   - Track memory usage
   - Monitor database query performance

3. **User Experience Monitoring**
   - Monitor user feedback
   - Track feature usage
   - Monitor support requests

## Rollback Procedures

### Immediate Rollback

If critical issues are discovered:

1. **Deactivate Plugin**
   ```bash
   wp plugin deactivate live-admin-styler
   ```

2. **Restore Previous Version**
   - Upload previous plugin version
   - Activate previous version
   - Verify functionality

3. **Database Rollback** (if needed)
   - Restore database from pre-deployment backup
   - Verify data integrity

### Planned Rollback

For planned rollbacks:

1. **Backup Current State**
   - Create backup of current plugin state
   - Export current settings

2. **Communicate Rollback**
   - Notify users of planned rollback
   - Document rollback reasons

3. **Execute Rollback**
   - Follow immediate rollback procedures
   - Verify system stability

4. **Post-Rollback Actions**
   - Update documentation
   - Plan fixes for identified issues

## Troubleshooting

### Common Issues

#### Plugin Won't Activate

**Symptoms**: Plugin fails to activate or shows error message

**Solutions**:
1. Check PHP error logs for specific error messages
2. Verify PHP version compatibility (7.4+)
3. Check for plugin conflicts by deactivating other plugins
4. Verify file permissions (644 for files, 755 for directories)
5. Increase memory limit if needed

#### Admin Interface Not Loading

**Symptoms**: Settings page shows blank or error

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify all asset files are properly uploaded
3. Check for theme conflicts
4. Clear browser cache and WordPress cache
5. Verify user has proper capabilities

#### Live Preview Not Working

**Symptoms**: Changes don't appear in live preview

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify AJAX endpoints are accessible
3. Check nonce validation
4. Clear browser cache
5. Test with default theme

#### Performance Issues

**Symptoms**: Slow page loads or high memory usage

**Solutions**:
1. Check for plugin conflicts
2. Optimize database queries
3. Enable caching
4. Increase server resources
5. Review error logs for bottlenecks

### Debug Mode

Enable debug mode for troubleshooting:

1. **WordPress Debug Mode**
   ```php
   // wp-config.php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   define('WP_DEBUG_DISPLAY', false);
   ```

2. **Plugin Debug Mode**
   ```php
   // Enable plugin-specific debugging
   define('LAS_DEBUG', true);
   ```

3. **Check Debug Logs**
   - Monitor `/wp-content/debug.log`
   - Look for plugin-specific error messages

### Support Resources

- **Documentation**: `/docs/` directory
- **API Reference**: `/docs/API.md`
- **Developer Guide**: `/docs/DEVELOPER_GUIDE.md`
- **User Guide**: `/docs/USER_GUIDE.md`

## Security Considerations

### Production Security

1. **File Permissions**
   - Files: 644
   - Directories: 755
   - wp-config.php: 600

2. **Access Control**
   - Restrict admin access to authorized users
   - Use strong passwords
   - Enable two-factor authentication

3. **Regular Updates**
   - Keep WordPress core updated
   - Update plugins and themes regularly
   - Monitor security advisories

4. **Backup Strategy**
   - Automated daily backups
   - Test backup restoration regularly
   - Store backups securely off-site

### Plugin-Specific Security

1. **Input Validation**
   - All user inputs are sanitized
   - Nonce validation for all AJAX requests
   - Capability checks for admin operations

2. **File Security**
   - Direct access to PHP files is blocked
   - Sensitive files are protected
   - No executable uploads allowed

3. **Database Security**
   - Prepared statements for all queries
   - Input sanitization before database operations
   - Regular security audits

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Monitor error logs
   - Check performance metrics
   - Review user feedback

2. **Monthly**
   - Update dependencies
   - Run security scans
   - Review and optimize database

3. **Quarterly**
   - Comprehensive security audit
   - Performance optimization review
   - Documentation updates

### Update Procedures

1. **Minor Updates**
   - Test in staging environment
   - Deploy during low-traffic periods
   - Monitor for issues post-deployment

2. **Major Updates**
   - Comprehensive testing in staging
   - Plan maintenance window
   - Prepare rollback procedures
   - Communicate with users

## Conclusion

Following this deployment guide ensures a smooth and secure deployment of Live Admin Styler v2.0. Always test thoroughly in a staging environment before deploying to production, and maintain regular backups and monitoring to ensure continued stability and performance.

For additional support or questions, refer to the documentation in the `/docs/` directory or contact the development team.

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Plugin Version**: 2.0.0