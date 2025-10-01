# Live Admin Styler v2.0 - Installation Guide

## Quick Installation

### Method 1: WordPress Admin (Recommended)

1. **Download** the latest release package (`live-admin-styler-v2.0.0.zip`)
2. **Login** to your WordPress admin dashboard
3. **Navigate** to Plugins → Add New → Upload Plugin
4. **Choose** the downloaded ZIP file and click "Install Now"
5. **Activate** the plugin after installation completes
6. **Access** the settings at Settings → Live Admin Styler

### Method 2: FTP Upload

1. **Extract** the ZIP file to your computer
2. **Upload** the `live-admin-styler` folder to `/wp-content/plugins/`
3. **Login** to WordPress admin and navigate to Plugins
4. **Find** "Live Admin Styler" and click "Activate"

## System Requirements

### Minimum Requirements
- **WordPress**: 6.0 or higher
- **PHP**: 7.4 or higher
- **MySQL**: 5.7 or higher
- **Memory**: 256MB
- **Disk Space**: 50MB

### Recommended Requirements
- **WordPress**: 6.4 or higher
- **PHP**: 8.0 or higher
- **MySQL**: 8.0 or higher
- **Memory**: 512MB
- **Disk Space**: 100MB

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## First-Time Setup

### 1. Initial Configuration

After activation, you'll see a welcome screen with setup options:

1. **Choose Theme Mode**
   - Auto (follows system preference)
   - Light mode
   - Dark mode

2. **Select Animation Speed**
   - Slow (for older devices)
   - Normal (recommended)
   - Fast (for modern devices)

3. **Enable Live Preview**
   - Recommended for real-time editing
   - Can be disabled for performance

### 2. Basic Customization

Start with these basic customizations:

1. **Menu Colors**
   - Background color
   - Text color
   - Hover effects

2. **Admin Bar**
   - Height adjustment
   - Background color
   - Position (fixed/absolute)

3. **Content Area**
   - Background color
   - Font settings
   - Spacing adjustments

### 3. Template Selection

Choose from 6 built-in templates:

- **Minimal**: Clean, white-space focused
- **Glassmorphism**: Modern frosted glass effects
- **iOS**: Apple-inspired design
- **Material**: Google Material Design
- **Dark Pro**: Professional dark theme
- **Gradient**: Colorful gradient design

## Advanced Installation

### Development Installation

For developers who want to contribute or customize:

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

4. **Run Tests**
   ```bash
   npm test
   vendor/bin/phpunit
   ```

### Multisite Installation

For WordPress multisite networks:

1. **Network Activate** (optional)
   - Upload plugin to `/wp-content/plugins/`
   - Network activate from Network Admin → Plugins

2. **Site-Specific Activation**
   - Each site can activate individually
   - Settings are site-specific

3. **Network-Wide Settings** (if network activated)
   - Configure default settings in Network Admin
   - Individual sites can override settings

## Configuration Options

### General Settings

```php
// wp-config.php additions (optional)

// Enable debug mode
define('LAS_DEBUG', true);

// Set default theme mode
define('LAS_DEFAULT_THEME', 'auto'); // 'light', 'dark', 'auto'

// Disable live preview by default
define('LAS_DISABLE_LIVE_PREVIEW', false);

// Set performance mode
define('LAS_PERFORMANCE_MODE', 'balanced'); // 'performance', 'balanced', 'quality'
```

### Advanced Configuration

```php
// Custom capability requirement
define('LAS_REQUIRED_CAPABILITY', 'manage_options');

// Custom cache duration (in seconds)
define('LAS_CACHE_DURATION', 3600);

// Disable specific features
define('LAS_DISABLE_LIVE_EDIT', false);
define('LAS_DISABLE_TEMPLATES', false);
define('LAS_DISABLE_COLOR_PICKER', false);
```

## Troubleshooting Installation

### Common Issues

#### Plugin Won't Activate

**Error**: "Plugin could not be activated because it triggered a fatal error"

**Solutions**:
1. Check PHP version (must be 7.4+)
2. Increase memory limit in wp-config.php:
   ```php
   ini_set('memory_limit', '512M');
   ```
3. Check error logs for specific issues
4. Deactivate conflicting plugins

#### Missing Dependencies

**Error**: "Class not found" or similar dependency errors

**Solutions**:
1. Re-upload the complete plugin package
2. Verify all files were uploaded correctly
3. Check file permissions (644 for files, 755 for directories)

#### Permission Errors

**Error**: "You do not have sufficient permissions"

**Solutions**:
1. Verify user has 'manage_options' capability
2. Check if custom capability is defined
3. Contact site administrator

#### Asset Loading Issues

**Error**: CSS/JS files not loading or 404 errors

**Solutions**:
1. Clear browser cache
2. Clear WordPress cache (if using caching plugin)
3. Check file permissions
4. Verify .htaccess rules aren't blocking assets

### Debug Mode

Enable debug mode to troubleshoot issues:

1. **WordPress Debug**
   ```php
   // wp-config.php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   define('WP_DEBUG_DISPLAY', false);
   ```

2. **Plugin Debug**
   ```php
   // wp-config.php
   define('LAS_DEBUG', true);
   ```

3. **Check Logs**
   - WordPress: `/wp-content/debug.log`
   - Plugin: `/wp-content/plugins/live-admin-styler/logs/`

## Migration from v1.x

### Automatic Migration

The plugin automatically migrates settings from v1.x:

1. **Backup** your current settings (recommended)
2. **Install** v2.0 (don't uninstall v1.x first)
3. **Activate** v2.0 - migration runs automatically
4. **Verify** settings were migrated correctly
5. **Deactivate** and delete v1.x

### Manual Migration

If automatic migration fails:

1. **Export** v1.x settings (if available)
2. **Note** your current customizations
3. **Install** v2.0 fresh
4. **Manually** recreate your customizations
5. **Use** templates as starting points

### Migration Issues

**Settings Not Migrated**:
- Check if v1.x settings exist in database
- Verify user permissions
- Check error logs for migration errors

**Visual Differences**:
- v2.0 uses modern CSS architecture
- Some visual elements may look different
- Use templates to achieve similar looks

## Performance Optimization

### Recommended Settings

For optimal performance:

1. **Performance Mode**: Set to "Performance" in Advanced settings
2. **Animation Speed**: Set to "Fast" on modern devices
3. **Live Preview**: Disable if not needed
4. **Caching**: Enable WordPress caching plugins

### Server Optimization

1. **PHP OpCache**: Enable for better PHP performance
2. **Object Caching**: Use Redis or Memcached if available
3. **CDN**: Use CDN for static assets
4. **Compression**: Enable Gzip compression

### Database Optimization

1. **Regular Cleanup**: Remove unused options and transients
2. **Database Optimization**: Use plugins like WP-Optimize
3. **Indexing**: Ensure proper database indexing

## Security Considerations

### File Permissions

Set correct file permissions:
```bash
# Files
find /path/to/live-admin-styler -type f -exec chmod 644 {} \;

# Directories  
find /path/to/live-admin-styler -type d -exec chmod 755 {} \;
```

### Access Control

1. **User Capabilities**: Only users with 'manage_options' can access settings
2. **Nonce Validation**: All forms use WordPress nonces
3. **Input Sanitization**: All inputs are sanitized and validated

### Regular Updates

1. **Enable Auto-Updates**: For security patches
2. **Monitor Updates**: Check for new versions regularly
3. **Test Updates**: Test in staging before production

## Getting Help

### Documentation

- **User Guide**: `/docs/USER_GUIDE.md`
- **Developer Guide**: `/docs/DEVELOPER_GUIDE.md`
- **API Reference**: `/docs/API.md`

### Support Channels

1. **Documentation**: Check docs first
2. **WordPress.org**: Plugin support forum
3. **GitHub Issues**: For bug reports and feature requests
4. **Community**: WordPress community forums

### Before Requesting Support

1. **Check Requirements**: Verify system meets requirements
2. **Enable Debug**: Enable debug mode and check logs
3. **Test Conflicts**: Deactivate other plugins to test
4. **Provide Details**: Include WordPress version, PHP version, error messages

## Next Steps

After successful installation:

1. **Read User Guide**: `/docs/USER_GUIDE.md`
2. **Explore Templates**: Try different built-in templates
3. **Customize Settings**: Adjust colors, fonts, and layout
4. **Enable Live Edit**: Try the live editing features
5. **Create Backups**: Set up regular backup schedule

---

**Need Help?** Check the [User Guide](USER_GUIDE.md) or [Troubleshooting Guide](TROUBLESHOOTING.md) for detailed information.

**Version**: 2.0.0  
**Last Updated**: $(date)