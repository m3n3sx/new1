# Live Admin Styler - Upgrade Guide

## Upgrading to Version 1.1.0

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
2. Download new version: live-admin-styler-1.1.0.zip
3. Delete old plugin files via FTP
4. Upload new plugin files
5. Reactivate plugin
6. Verify settings are preserved

#### Method 3: WP-CLI Upgrade
```bash
wp plugin update live-admin-styler
```

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

#### From 1.1.x to 1.1.0
- New security enhancements implemented
- Performance improvements added
- Additional browser compatibility
- Enhanced error handling

#### From 1.0.x to 1.1.0
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
