# Live Admin Styler v2.0 - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Customization](#basic-customization)
3. [Live Edit Mode](#live-edit-mode)
4. [Color Management](#color-management)
5. [Templates and Presets](#templates-and-presets)
6. [Advanced Features](#advanced-features)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Getting Started

### Installation

1. **Download** the Live Admin Styler plugin from the WordPress repository or upload the plugin files
2. **Activate** the plugin through the 'Plugins' menu in WordPress
3. **Navigate** to `Settings > Live Admin Styler` to access the customization panel

### First Steps

After activation, you'll see the Live Admin Styler menu in your WordPress admin sidebar. Click on it to open the customization interface.

The interface is divided into several sections:
- **General Settings** - Overall theme preferences
- **Menu Styling** - Customize the admin menu appearance
- **Admin Bar** - Modify the top admin bar
- **Content Area** - Style the main content area
- **Advanced** - Custom CSS and advanced options

### System Requirements

- WordPress 6.0 or higher
- PHP 7.4 or higher
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

## Basic Customization

### Changing Colors

1. **Navigate** to the color section you want to modify (Menu, Admin Bar, or Content)
2. **Click** on any color picker to open the color selection tool
3. **Choose** your desired color using:
   - Color wheel for visual selection
   - HEX input for precise colors (#ff0000)
   - RGB sliders for fine-tuning
   - HSL controls for advanced color theory
4. **Preview** changes in real-time as you adjust colors
5. **Save** your changes using the save button

### Typography Settings

1. **Font Family**: Choose from system fonts or web-safe options
2. **Font Size**: Adjust text size using the slider or input field
3. **Line Height**: Control text spacing for better readability
4. **Font Weight**: Make text bold, normal, or light

### Layout Adjustments

1. **Spacing**: Modify padding and margins between elements
2. **Border Radius**: Add rounded corners to interface elements
3. **Shadows**: Apply subtle shadows for depth and modern appearance
4. **Animation Speed**: Control how fast transitions and animations play

## Live Edit Mode

Live Edit Mode allows you to customize your admin interface by clicking directly on elements you want to modify.

### Activating Live Edit Mode

1. **Click** the "Live Edit Mode" toggle in the main interface
2. **Navigate** to any admin page you want to customize
3. **Hover** over elements to see them highlighted
4. **Click** on highlighted elements to open editing panels

### Using Micro-Panels

When you click on an element in Live Edit Mode, a micro-panel appears with relevant customization options:

- **Colors**: Background, text, border colors
- **Typography**: Font size, weight, family
- **Spacing**: Padding, margins
- **Effects**: Shadows, borders, animations

### Live Edit Features

- **Real-time Preview**: See changes instantly as you make them
- **Auto-save**: Changes are automatically saved every 2 seconds
- **Undo/Redo**: Use Ctrl+Z (Cmd+Z on Mac) to undo changes
- **Multi-tab Sync**: Changes sync across multiple browser tabs
- **Mobile Responsive**: Edit interface works on mobile devices

### Tips for Live Edit Mode

- **Start with major elements** like the menu background before fine-tuning details
- **Use the preview toggle** to see your changes without the editing interface
- **Test on different screen sizes** using your browser's responsive mode
- **Save frequently** or enable auto-save for peace of mind

## Color Management

### Color Picker Features

The advanced color picker includes:

- **Visual Color Wheel**: Intuitive color selection
- **Format Support**: HEX, RGB, RGBA, HSL, HSLA
- **Color Palette**: Save and reuse favorite colors
- **Recent Colors**: Quick access to recently used colors
- **Accessibility Check**: Automatic contrast ratio validation

### Creating Color Schemes

1. **Start with a base color** for your primary interface elements
2. **Use the color wheel** to find complementary colors
3. **Check contrast ratios** to ensure accessibility compliance
4. **Save your palette** for future use or sharing
5. **Test in different lighting** conditions if possible

### Accessibility Guidelines

The plugin automatically checks color combinations for WCAG 2.1 AA compliance:

- **Text Contrast**: Minimum 4.5:1 ratio for normal text
- **Large Text**: Minimum 3:1 ratio for large text (18pt+)
- **Interactive Elements**: Clear visual distinction for buttons and links
- **Color Blindness**: Avoid relying solely on color to convey information

### Color Best Practices

- **Consistency**: Use a limited color palette throughout
- **Hierarchy**: Use color to establish visual hierarchy
- **Brand Alignment**: Match your website's brand colors
- **User Comfort**: Avoid overly bright or harsh color combinations
- **Dark Mode**: Consider how colors work in both light and dark themes

## Templates and Presets

### Built-in Templates

Live Admin Styler includes 6 professionally designed templates:

#### 1. Minimal
- Clean, white space focused design
- Subtle colors and typography
- Perfect for content-focused workflows

#### 2. Glassmorphism
- Modern frosted glass effects
- Translucent elements with backdrop blur
- Contemporary and stylish appearance

#### 3. iOS
- Apple-inspired clean design
- Rounded corners and subtle shadows
- Familiar and user-friendly interface

#### 4. Material
- Google Material Design principles
- Bold colors and clear typography
- Modern and functional approach

#### 5. Dark Pro
- Professional dark theme
- Easy on the eyes for long work sessions
- Sophisticated and modern appearance

#### 6. Gradient
- Colorful gradient backgrounds
- Dynamic and vibrant design
- Creative and inspiring workspace

### Applying Templates

1. **Navigate** to the Templates section
2. **Preview** templates by hovering over them
3. **Click "Apply"** on your chosen template
4. **Confirm** the application (this will override current settings)
5. **Customize** the template further if desired

### Creating Custom Templates

1. **Customize** your interface to your liking
2. **Click** "Save as Template" in the Templates section
3. **Name** your template and add a description
4. **Save** to make it available for future use
5. **Share** by exporting the template file

### Template Management

- **Export Templates**: Save templates as JSON files for backup or sharing
- **Import Templates**: Load templates from JSON files
- **Delete Templates**: Remove custom templates you no longer need
- **Template Conflicts**: The system will warn about conflicting settings

## Advanced Features

### Custom CSS

For advanced users, the Custom CSS feature allows complete control:

1. **Navigate** to Advanced > Custom CSS
2. **Write** your CSS code in the editor
3. **Use** CSS variables for dynamic theming:
   ```css
   .my-custom-element {
       background-color: var(--las-primary);
       color: var(--las-text-color);
   }
   ```
4. **Preview** changes in real-time
5. **Validate** CSS for security and compatibility

### CSS Variables

Live Admin Styler uses CSS custom properties for theming:

```css
/* Menu Variables */
--las-menu-bg: #23282d;
--las-menu-text: #ffffff;
--las-menu-hover: #0073aa;

/* Admin Bar Variables */
--las-adminbar-bg: #23282d;
--las-adminbar-text: #ffffff;

/* Content Variables */
--las-content-bg: #f1f1f1;
--las-content-text: #23282d;
```

### Performance Settings

Optimize the plugin's performance:

- **Cache Settings**: Enable caching for faster load times
- **Asset Loading**: Choose which assets to load conditionally
- **Animation Performance**: Adjust animation quality vs. performance
- **Memory Usage**: Monitor and optimize memory consumption

### Import/Export Settings

**Export Settings**:
1. Go to Advanced > Import/Export
2. Click "Export Settings"
3. Save the JSON file as backup

**Import Settings**:
1. Go to Advanced > Import/Export
2. Click "Choose File" and select your JSON file
3. Choose merge or replace options
4. Click "Import Settings"

### Multi-site Support

For WordPress multisite installations:

- **Network Settings**: Configure plugin settings across the network
- **Site-specific Overrides**: Allow individual sites to customize
- **Template Sharing**: Share templates across network sites
- **Centralized Management**: Manage all sites from the network admin

## Troubleshooting

### Common Issues

#### Changes Not Appearing
1. **Clear browser cache** and refresh the page
2. **Check if caching plugins** are interfering
3. **Verify user permissions** (need manage_options capability)
4. **Disable other admin styling plugins** temporarily

#### Live Edit Mode Not Working
1. **Check browser console** for JavaScript errors
2. **Ensure modern browser** compatibility
3. **Disable browser extensions** that might interfere
4. **Try in incognito/private mode**

#### Performance Issues
1. **Reduce animation complexity** in settings
2. **Enable performance mode** in Advanced settings
3. **Clear plugin cache** regularly
4. **Check for plugin conflicts**

#### Color Picker Problems
1. **Update browser** to latest version
2. **Check color format** compatibility
3. **Try different color input methods**
4. **Reset to default colors** if needed

### Debug Mode

Enable debug mode for troubleshooting:

1. Add to wp-config.php:
   ```php
   define('LAS_DEBUG', true);
   ```
2. Check browser console for detailed error messages
3. Review WordPress debug log for PHP errors
4. Use browser developer tools to inspect CSS

### Getting Help

If you need assistance:

1. **Check the FAQ** section below
2. **Search the documentation** for your specific issue
3. **Contact support** with detailed information about your problem
4. **Include system information** (WordPress version, PHP version, browser)

## FAQ

### General Questions

**Q: Is Live Admin Styler compatible with my theme?**
A: Yes, Live Admin Styler only affects the WordPress admin area, not your website's frontend.

**Q: Will my customizations be lost when I update WordPress?**
A: No, all customizations are stored in the database and persist through WordPress updates.

**Q: Can I use Live Admin Styler on a multisite installation?**
A: Yes, the plugin supports WordPress multisite with network-wide and site-specific settings.

**Q: Does the plugin affect website performance?**
A: No, the plugin only loads in the admin area and doesn't affect your website's frontend performance.

### Customization Questions

**Q: Can I customize the login page?**
A: Currently, Live Admin Styler focuses on the admin area. Login page customization may be added in future versions.

**Q: How do I reset all settings to default?**
A: Go to Advanced > Reset Settings and click "Reset All Settings to Default."

**Q: Can I hide certain admin menu items?**
A: Live Admin Styler focuses on styling. For hiding menu items, consider using a dedicated admin menu management plugin.

**Q: Is it possible to have different styles for different user roles?**
A: This feature is planned for a future version. Currently, styles apply to all users with admin access.

### Technical Questions

**Q: What browsers are supported?**
A: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. IE11 has basic support with fallbacks.

**Q: Can I use custom fonts?**
A: Yes, you can add custom fonts via the Custom CSS feature or by enqueueing them in your theme.

**Q: Is the plugin translation-ready?**
A: Yes, the plugin is fully translatable and includes translation files for multiple languages.

**Q: How do I backup my settings?**
A: Use the Export Settings feature in Advanced > Import/Export to create a JSON backup file.

### Troubleshooting Questions

**Q: Why aren't my changes showing up?**
A: Clear your browser cache, check for caching plugins, and ensure you have proper user permissions.

**Q: The color picker isn't working properly.**
A: Update your browser, disable extensions, or try a different browser to isolate the issue.

**Q: Live Edit Mode is not responding.**
A: Check the browser console for errors, ensure JavaScript is enabled, and try disabling other plugins temporarily.

**Q: How do I report a bug?**
A: Contact support with detailed steps to reproduce the issue, your system information, and any error messages.

---

## Need More Help?

- **Documentation**: Visit our complete documentation at [plugin-website.com/docs]
- **Support Forum**: Get help from the community at [plugin-website.com/support]
- **Video Tutorials**: Watch step-by-step guides at [plugin-website.com/tutorials]
- **Contact Support**: Email us at support@plugin-website.com

---

*Live Admin Styler v2.0 - Transform your WordPress admin experience*