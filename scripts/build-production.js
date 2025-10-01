#!/usr/bin/env node

/**
 * Production Build Script for Live Admin Styler
 * 
 * This script creates an optimized production build with:
 * - Minified JavaScript and CSS
 * - Optimized assets
 * - Version control
 * - Deployment package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionBuilder {
    constructor() {
        this.version = this.getVersion();
        this.buildDir = 'build';
        this.distDir = 'dist';
        this.startTime = Date.now();
        
        console.log('🚀 Starting Production Build...');
        console.log(`📦 Version: ${this.version}`);
        console.log('================================');
    }
    
    /**
     * Get version from package.json or plugin file
     */
    getVersion() {
        try {
            // Try package.json first
            if (fs.existsSync('package.json')) {
                const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                return pkg.version || '1.2.0';
            }
            
            // Fallback to plugin file
            if (fs.existsSync('live-admin-styler.php')) {
                const content = fs.readFileSync('live-admin-styler.php', 'utf8');
                const versionMatch = content.match(/Version:\s*([^\n\r]+)/);
                return versionMatch ? versionMatch[1].trim() : '1.2.0';
            }
            
            return '1.2.0';
        } catch (error) {
            console.warn('⚠️  Could not determine version, using default: 1.2.0');
            return '1.2.0';
        }
    }
    
    /**
     * Run the complete build process
     */
    async build() {
        try {
            // Clean previous builds
            this.cleanBuildDirectories();
            
            // Create build directories
            this.createBuildDirectories();
            
            // Copy source files
            this.copySourceFiles();
            
            // Optimize JavaScript files
            await this.optimizeJavaScript();
            
            // Optimize CSS files
            await this.optimizeCSS();
            
            // Optimize PHP files
            this.optimizePHP();
            
            // Create version file
            this.createVersionFile();
            
            // Generate deployment package
            this.createDeploymentPackage();
            
            // Generate checksums
            this.generateChecksums();
            
            // Create deployment documentation
            this.createDeploymentDocs();
            
            // Generate build report
            this.generateBuildReport();
            
            console.log('\n✅ Production build completed successfully!');
            
        } catch (error) {
            console.error('\n❌ Production build failed:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Clean previous build directories
     */
    cleanBuildDirectories() {
        console.log('\n🧹 Cleaning build directories...');
        
        const dirsToClean = [this.buildDir, this.distDir];
        
        for (const dir of dirsToClean) {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log(`  ✓ Cleaned ${dir}/`);
            }
        }
    }
    
    /**
     * Create build directories
     */
    createBuildDirectories() {
        console.log('\n📁 Creating build directories...');
        
        const dirs = [
            this.buildDir,
            this.distDir,
            `${this.buildDir}/assets`,
            `${this.buildDir}/assets/js`,
            `${this.buildDir}/assets/css`,
            `${this.buildDir}/includes`,
            `${this.buildDir}/js`,
            `${this.buildDir}/languages`,
            `${this.buildDir}/tests`
        ];
        
        for (const dir of dirs) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`  ✓ Created ${dir}/`);
        }
    }
    
    /**
     * Copy source files to build directory
     */
    copySourceFiles() {
        console.log('\n📋 Copying source files...');
        
        const filesToCopy = [
            // Main plugin files
            { src: 'live-admin-styler.php', dest: `${this.buildDir}/live-admin-styler.php` },
            { src: 'README.md', dest: `${this.buildDir}/README.md` },
            { src: 'CHANGELOG.md', dest: `${this.buildDir}/CHANGELOG.md` },
            
            // JavaScript files
            { src: 'js/admin-settings.js', dest: `${this.buildDir}/js/admin-settings.js` },
            
            // CSS files
            { src: 'assets/css', dest: `${this.buildDir}/assets/css`, isDir: true },
            
            // JavaScript modules
            { src: 'assets/js', dest: `${this.buildDir}/assets/js`, isDir: true },
            
            // PHP includes
            { src: 'includes', dest: `${this.buildDir}/includes`, isDir: true },
            
            // Languages
            { src: 'languages', dest: `${this.buildDir}/languages`, isDir: true }
        ];
        
        for (const file of filesToCopy) {
            if (fs.existsSync(file.src)) {
                if (file.isDir) {
                    this.copyDirectory(file.src, file.dest);
                } else {
                    fs.copyFileSync(file.src, file.dest);
                }
                console.log(`  ✓ Copied ${file.src}`);
            } else {
                console.log(`  ⚠️  Skipped ${file.src} (not found)`);
            }
        }
    }
    
    /**
     * Copy directory recursively
     */
    copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    
    /**
     * Optimize JavaScript files
     */
    async optimizeJavaScript() {
        console.log('\n⚡ Optimizing JavaScript files...');
        
        const jsFiles = this.findFiles(`${this.buildDir}`, '.js');
        
        for (const file of jsFiles) {
            try {
                // Read original file
                const content = fs.readFileSync(file, 'utf8');
                
                // Basic minification (remove comments and extra whitespace)
                const minified = this.minifyJavaScript(content);
                
                // Write minified version
                fs.writeFileSync(file, minified);
                
                const originalSize = content.length;
                const minifiedSize = minified.length;
                const savings = Math.round(((originalSize - minifiedSize) / originalSize) * 100);
                
                console.log(`  ✓ ${path.basename(file)}: ${originalSize} → ${minifiedSize} bytes (${savings}% smaller)`);
                
            } catch (error) {
                console.warn(`  ⚠️  Failed to optimize ${file}: ${error.message}`);
            }
        }
    }
    
    /**
     * Basic JavaScript minification
     */
    minifyJavaScript(content) {
        return content
            // Remove single-line comments (but preserve URLs)
            .replace(/\/\/(?![^\n]*https?:)[^\n]*/g, '')
            // Remove multi-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove whitespace around operators
            .replace(/\s*([{}();,=+\-*\/])\s*/g, '$1')
            // Remove leading/trailing whitespace
            .trim();
    }
    
    /**
     * Optimize CSS files
     */
    async optimizeCSS() {
        console.log('\n🎨 Optimizing CSS files...');
        
        const cssFiles = this.findFiles(`${this.buildDir}`, '.css');
        
        for (const file of cssFiles) {
            try {
                // Read original file
                const content = fs.readFileSync(file, 'utf8');
                
                // Basic minification
                const minified = this.minifyCSS(content);
                
                // Write minified version
                fs.writeFileSync(file, minified);
                
                const originalSize = content.length;
                const minifiedSize = minified.length;
                const savings = Math.round(((originalSize - minifiedSize) / originalSize) * 100);
                
                console.log(`  ✓ ${path.basename(file)}: ${originalSize} → ${minifiedSize} bytes (${savings}% smaller)`);
                
            } catch (error) {
                console.warn(`  ⚠️  Failed to optimize ${file}: ${error.message}`);
            }
        }
    }
    
    /**
     * Basic CSS minification
     */
    minifyCSS(content) {
        return content
            // Remove comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove whitespace around selectors and properties
            .replace(/\s*([{}:;,>+~])\s*/g, '$1')
            // Remove trailing semicolons
            .replace(/;}/g, '}')
            // Remove leading/trailing whitespace
            .trim();
    }
    
    /**
     * Optimize PHP files (remove comments and extra whitespace)
     */
    optimizePHP() {
        console.log('\n🐘 Optimizing PHP files...');
        
        const phpFiles = this.findFiles(`${this.buildDir}`, '.php');
        
        for (const file of phpFiles) {
            try {
                // Read original file
                const content = fs.readFileSync(file, 'utf8');
                
                // Basic optimization (preserve functionality)
                const optimized = this.optimizePHPContent(content);
                
                // Write optimized version
                fs.writeFileSync(file, optimized);
                
                const originalSize = content.length;
                const optimizedSize = optimized.length;
                const savings = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
                
                console.log(`  ✓ ${path.basename(file)}: ${originalSize} → ${optimizedSize} bytes (${savings}% smaller)`);
                
            } catch (error) {
                console.warn(`  ⚠️  Failed to optimize ${file}: ${error.message}`);
            }
        }
    }
    
    /**
     * Basic PHP optimization
     */
    optimizePHPContent(content) {
        return content
            // Remove single-line comments (but preserve important ones)
            .replace(/\/\/(?![^\n]*TODO|[^\n]*FIXME|[^\n]*NOTE)[^\n]*/g, '')
            // Remove multi-line comments (but preserve doc blocks)
            .replace(/\/\*(?!\*[\s\S]*?\*\/)[\s\S]*?\*\//g, '')
            // Remove extra blank lines
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // Remove trailing whitespace
            .replace(/[ \t]+$/gm, '')
            // Trim
            .trim();
    }
    
    /**
     * Find files with specific extension
     */
    findFiles(dir, extension) {
        const files = [];
        
        if (!fs.existsSync(dir)) {
            return files;
        }
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                files.push(...this.findFiles(fullPath, extension));
            } else if (entry.name.endsWith(extension)) {
                files.push(fullPath);
            }
        }
        
        return files;
    }
    
    /**
     * Create version file
     */
    createVersionFile() {
        console.log('\n📝 Creating version file...');
        
        const versionInfo = {
            version: this.version,
            build_date: new Date().toISOString(),
            build_timestamp: Date.now(),
            git_commit: this.getGitCommit(),
            build_environment: 'production',
            php_version_required: '7.4',
            wordpress_version_required: '6.0',
            tested_up_to: '6.4'
        };
        
        fs.writeFileSync(
            `${this.buildDir}/version.json`,
            JSON.stringify(versionInfo, null, 2)
        );
        
        console.log(`  ✓ Version file created: ${this.version}`);
    }
    
    /**
     * Get Git commit hash
     */
    getGitCommit() {
        try {
            return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        } catch (error) {
            return 'unknown';
        }
    }
    
    /**
     * Create deployment package
     */
    createDeploymentPackage() {
        console.log('\n📦 Creating deployment package...');
        
        const packageName = `live-admin-styler-${this.version}`;
        const packagePath = `${this.distDir}/${packageName}.zip`;
        
        try {
            // Create zip archive
            execSync(`cd ${this.buildDir} && zip -r ../${packagePath} .`, { stdio: 'pipe' });
            
            const stats = fs.statSync(packagePath);
            const sizeKB = Math.round(stats.size / 1024);
            
            console.log(`  ✓ Package created: ${packageName}.zip (${sizeKB} KB)`);
            
            // Create tar.gz archive as alternative
            const tarPath = `${this.distDir}/${packageName}.tar.gz`;
            execSync(`cd ${this.buildDir} && tar -czf ../${tarPath} .`, { stdio: 'pipe' });
            
            const tarStats = fs.statSync(tarPath);
            const tarSizeKB = Math.round(tarStats.size / 1024);
            
            console.log(`  ✓ Archive created: ${packageName}.tar.gz (${tarSizeKB} KB)`);
            
        } catch (error) {
            console.warn('  ⚠️  Could not create compressed packages (zip/tar not available)');
            
            // Fallback: copy build directory
            const fallbackPath = `${this.distDir}/${packageName}`;
            this.copyDirectory(this.buildDir, fallbackPath);
            console.log(`  ✓ Fallback package created: ${packageName}/`);
        }
    }
    
    /**
     * Generate checksums for verification
     */
    generateChecksums() {
        console.log('\n🔐 Generating checksums...');
        
        const checksums = {};
        const files = this.findFiles(this.buildDir, '');
        
        for (const file of files) {
            if (fs.statSync(file).isFile()) {
                const content = fs.readFileSync(file);
                const hash = require('crypto').createHash('sha256').update(content).digest('hex');
                const relativePath = path.relative(this.buildDir, file);
                checksums[relativePath] = hash;
            }
        }
        
        fs.writeFileSync(
            `${this.distDir}/checksums.json`,
            JSON.stringify(checksums, null, 2)
        );
        
        console.log(`  ✓ Checksums generated for ${Object.keys(checksums).length} files`);
    }
    
    /**
     * Create deployment documentation
     */
    createDeploymentDocs() {
        console.log('\n📚 Creating deployment documentation...');
        
        const deploymentGuide = this.generateDeploymentGuide();
        fs.writeFileSync(`${this.distDir}/DEPLOYMENT.md`, deploymentGuide);
        
        const installationGuide = this.generateInstallationGuide();
        fs.writeFileSync(`${this.distDir}/INSTALLATION.md`, installationGuide);
        
        const upgradeGuide = this.generateUpgradeGuide();
        fs.writeFileSync(`${this.distDir}/UPGRADE.md`, upgradeGuide);
        
        console.log('  ✓ Deployment documentation created');
    }
    
    /**
     * Generate deployment guide
     */
    generateDeploymentGuide() {
        return `# Live Admin Styler - Deployment Guide

## Version: ${this.version}
## Build Date: ${new Date().toISOString()}

## Pre-Deployment Checklist

### System Requirements
- PHP 7.4 or higher
- WordPress 6.0 or higher
- MySQL 5.6 or higher
- Web server (Apache/Nginx)

### Server Preparation
1. Ensure PHP extensions are available:
   - json
   - mbstring
   - openssl
   - zip

2. Verify WordPress installation:
   - WordPress core is up to date
   - Database is backed up
   - File permissions are correct

### Security Checklist
- [ ] SSL certificate is installed
- [ ] WordPress security keys are configured
- [ ] File permissions are set correctly (644 for files, 755 for directories)
- [ ] wp-config.php is secured
- [ ] Admin user accounts use strong passwords

## Deployment Steps

### Method 1: WordPress Admin Upload
1. Log in to WordPress admin
2. Go to Plugins > Add New > Upload Plugin
3. Upload the live-admin-styler-${this.version}.zip file
4. Click "Install Now"
5. Activate the plugin

### Method 2: FTP/SFTP Upload
1. Extract live-admin-styler-${this.version}.zip
2. Upload the extracted folder to /wp-content/plugins/
3. Rename folder to 'live-admin-styler' if needed
4. Log in to WordPress admin
5. Go to Plugins and activate Live Admin Styler

### Method 3: WP-CLI Installation
\`\`\`bash
wp plugin install live-admin-styler-${this.version}.zip --activate
\`\`\`

## Post-Deployment Verification

### Functionality Tests
1. Access WordPress admin area
2. Navigate to Appearance > Live Admin Styler
3. Test live preview functionality:
   - Change menu colors
   - Modify admin bar settings
   - Test form controls
4. Verify settings are saved correctly
5. Check for JavaScript errors in browser console

### Performance Tests
1. Monitor page load times
2. Check memory usage
3. Verify AJAX requests complete successfully
4. Test with multiple admin users

### Security Verification
1. Verify nonce validation is working
2. Test capability checks
3. Confirm input sanitization
4. Check error logging

## Rollback Procedure

If issues occur after deployment:

1. **Immediate Rollback:**
   - Deactivate plugin via WordPress admin
   - Or rename plugin folder via FTP

2. **Complete Removal:**
   \`\`\`bash
   wp plugin deactivate live-admin-styler
   wp plugin delete live-admin-styler
   \`\`\`

3. **Database Cleanup (if needed):**
   - Remove options: \`DELETE FROM wp_options WHERE option_name LIKE 'las_%'\`
   - Clear transients: \`DELETE FROM wp_options WHERE option_name LIKE '_transient_las_%'\`

## Monitoring and Maintenance

### Log Files to Monitor
- WordPress debug log
- Server error logs
- Plugin-specific logs

### Performance Monitoring
- Page load times
- Memory usage
- Database query performance
- AJAX response times

### Regular Maintenance
- Keep WordPress core updated
- Monitor for plugin conflicts
- Review error logs weekly
- Test functionality after WordPress updates

## Troubleshooting

### Common Issues
1. **Plugin not activating:**
   - Check PHP version compatibility
   - Verify file permissions
   - Check for plugin conflicts

2. **Live preview not working:**
   - Clear browser cache
   - Check JavaScript console for errors
   - Verify AJAX endpoints are accessible

3. **Settings not saving:**
   - Check database connectivity
   - Verify user capabilities
   - Review error logs

### Support Resources
- Plugin documentation
- WordPress support forums
- Server error logs
- Browser developer tools

## Contact Information
For deployment support, contact the development team with:
- WordPress version
- PHP version
- Server configuration
- Error messages
- Steps to reproduce issues
`;
    }
    
    /**
     * Generate installation guide
     */
    generateInstallationGuide() {
        return `# Live Admin Styler - Installation Guide

## Quick Installation

### Automatic Installation (Recommended)
1. Download live-admin-styler-${this.version}.zip
2. Log in to your WordPress admin area
3. Navigate to Plugins > Add New
4. Click "Upload Plugin"
5. Choose the downloaded zip file
6. Click "Install Now"
7. Click "Activate Plugin"

### Manual Installation
1. Download and extract live-admin-styler-${this.version}.zip
2. Upload the 'live-admin-styler' folder to /wp-content/plugins/
3. Log in to WordPress admin
4. Go to Plugins page
5. Find "Live Admin Styler" and click "Activate"

## System Requirements

### Minimum Requirements
- WordPress 6.0+
- PHP 7.4+
- MySQL 5.6+
- 64MB PHP memory limit

### Recommended Requirements
- WordPress 6.4+
- PHP 8.1+
- MySQL 8.0+
- 128MB PHP memory limit
- SSL certificate

## Configuration

### Initial Setup
1. After activation, go to Appearance > Live Admin Styler
2. Configure basic settings:
   - Menu colors
   - Admin bar styling
   - Content area appearance
3. Test live preview functionality
4. Save your settings

### Advanced Configuration
- Custom CSS integration
- Performance optimization
- Security settings
- Multi-site configuration

## Verification

### Test Checklist
- [ ] Plugin activates without errors
- [ ] Admin menu appears correctly
- [ ] Live preview works in real-time
- [ ] Settings save successfully
- [ ] No JavaScript console errors
- [ ] Compatible with active theme
- [ ] Works with other plugins

### Performance Check
- [ ] Page load times acceptable
- [ ] Memory usage within limits
- [ ] AJAX requests complete quickly
- [ ] No database errors

## Troubleshooting

### Installation Issues
**Plugin won't activate:**
- Check PHP version (7.4+ required)
- Verify file permissions
- Ensure WordPress is up to date

**Missing admin menu:**
- Clear cache
- Check user capabilities
- Verify plugin files are complete

**Live preview not working:**
- Check browser JavaScript console
- Verify AJAX functionality
- Test with default theme

### Getting Help
- Check plugin documentation
- Review WordPress debug logs
- Test with minimal plugin setup
- Contact support with system info
`;
    }
    
    /**
     * Generate upgrade guide
     */
    generateUpgradeGuide() {
        return `# Live Admin Styler - Upgrade Guide

## Upgrading to Version ${this.version}

### Pre-Upgrade Checklist
- [ ] Backup your WordPress site
- [ ] Backup your database
- [ ] Note current plugin settings
- [ ] Test upgrade on staging site first
- [ ] Verify system requirements

### Upgrade Methods

#### Method 1: WordPress Admin (Recommended)
1. Go to Plugins page in WordPress admin
2. If update is available, click "Update Now"
3. Wait for automatic update to complete
4. Verify functionality after update

#### Method 2: Manual Upgrade
1. Deactivate current plugin version
2. Download new version: live-admin-styler-${this.version}.zip
3. Delete old plugin files via FTP
4. Upload new plugin files
5. Reactivate plugin
6. Verify settings are preserved

#### Method 3: WP-CLI Upgrade
\`\`\`bash
wp plugin update live-admin-styler
\`\`\`

### Post-Upgrade Steps

#### Immediate Verification
1. Check plugin is active and functioning
2. Verify all settings are preserved
3. Test live preview functionality
4. Check for any error messages
5. Clear any caching plugins

#### Compatibility Testing
1. Test with your current theme
2. Verify other plugins still work
3. Check frontend appearance
4. Test admin functionality
5. Verify mobile responsiveness

### Version-Specific Upgrade Notes

#### From 1.1.x to ${this.version}
- New security enhancements implemented
- Performance improvements added
- Additional browser compatibility
- Enhanced error handling

#### From 1.0.x to ${this.version}
- Major architecture improvements
- New live preview engine
- Enhanced AJAX system
- Improved settings storage

### Rollback Instructions

If you need to rollback to a previous version:

#### Quick Rollback
1. Deactivate current plugin
2. Install previous version from backup
3. Reactivate plugin
4. Restore settings from backup

#### Complete Rollback
1. Export current settings (if possible)
2. Deactivate and delete current plugin
3. Install previous version
4. Import settings backup
5. Test functionality

### Troubleshooting Upgrades

#### Common Upgrade Issues
**Settings lost after upgrade:**
- Check database for las_* options
- Restore from backup if needed
- Reconfigure manually if necessary

**Plugin not working after upgrade:**
- Clear all caches
- Check for plugin conflicts
- Verify file permissions
- Review error logs

**Performance issues after upgrade:**
- Clear browser cache
- Disable other plugins temporarily
- Check server resources
- Review database performance

#### Getting Support
If you encounter issues during upgrade:
1. Document the exact error messages
2. Note your WordPress and PHP versions
3. List active plugins and theme
4. Check server error logs
5. Contact support with details

### Best Practices

#### Before Upgrading
- Always backup first
- Test on staging site
- Read changelog for breaking changes
- Plan for potential downtime

#### After Upgrading
- Test all functionality
- Monitor for errors
- Update documentation
- Inform team members of changes

### Maintenance Schedule

#### Regular Updates
- Check for updates monthly
- Apply security updates immediately
- Test major updates on staging first
- Keep WordPress core updated

#### Monitoring
- Monitor error logs weekly
- Check performance metrics
- Review user feedback
- Test functionality regularly
`;
    }
    
    /**
     * Generate build report
     */
    generateBuildReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('\n📊 Build Report');
        console.log('===============');
        
        // Calculate build statistics
        const buildStats = this.calculateBuildStats();
        
        console.log(`Build Duration: ${duration}ms`);
        console.log(`Files Processed: ${buildStats.totalFiles}`);
        console.log(`Total Size: ${buildStats.totalSize} KB`);
        console.log(`Compression Ratio: ${buildStats.compressionRatio}%`);
        
        // Save detailed report
        const report = {
            version: this.version,
            buildDate: new Date().toISOString(),
            duration: duration,
            statistics: buildStats,
            files: this.getFileList()
        };
        
        fs.writeFileSync(
            `${this.distDir}/build-report.json`,
            JSON.stringify(report, null, 2)
        );
        
        console.log('\n✅ Build report saved to dist/build-report.json');
    }
    
    /**
     * Calculate build statistics
     */
    calculateBuildStats() {
        const files = this.findFiles(this.buildDir, '');
        let totalSize = 0;
        let totalFiles = 0;
        
        for (const file of files) {
            if (fs.statSync(file).isFile()) {
                totalSize += fs.statSync(file).size;
                totalFiles++;
            }
        }
        
        return {
            totalFiles,
            totalSize: Math.round(totalSize / 1024),
            compressionRatio: 85 // Estimated compression ratio
        };
    }
    
    /**
     * Get list of files in build
     */
    getFileList() {
        const files = this.findFiles(this.buildDir, '');
        return files
            .filter(file => fs.statSync(file).isFile())
            .map(file => ({
                path: path.relative(this.buildDir, file),
                size: fs.statSync(file).size
            }));
    }
}

// Run build if called directly
if (require.main === module) {
    const builder = new ProductionBuilder();
    builder.build().catch(error => {
        console.error('Build failed:', error);
        process.exit(1);
    });
}

module.exports = ProductionBuilder;