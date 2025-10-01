# Live Admin Styler v2.0 - Inline Help System

## Overview

The inline help system provides contextual assistance directly within the WordPress admin interface, making it easy for users to understand and use Live Admin Styler features without leaving the page.

## Help Content Structure

### General Settings Help

**Theme Mode**
- **Auto**: Automatically switches between light and dark themes based on your system preferences
- **Light**: Always uses the light theme regardless of system settings
- **Dark**: Always uses the dark theme for reduced eye strain

**Animation Speed**
- **Slow**: Smooth, deliberate animations (400ms duration)
- **Normal**: Balanced animation speed (300ms duration) - recommended
- **Fast**: Quick, snappy animations (200ms duration)

**Live Preview**
- **Enabled**: See changes instantly as you make them
- **Disabled**: Changes apply only when you save settings

### Menu Styling Help

**Background Color**
- Controls the main background color of the WordPress admin menu
- Supports HEX (#ff0000), RGB (rgb(255,0,0)), and HSL (hsl(0,100%,50%)) formats
- Use the color picker or enter values manually
- **Tip**: Choose colors with sufficient contrast for accessibility

**Text Color**
- Sets the color of menu item text and icons
- Should contrast well with the background color
- **Accessibility**: Maintain at least 4.5:1 contrast ratio

**Hover Color**
- Color that appears when you hover over menu items
- Should be visually distinct from the background color
- **Tip**: Use a slightly lighter or darker shade of your background color

**Active Color**
- Highlights the currently active/selected menu item
- Should stand out clearly from other menu items
- **Best Practice**: Use your brand's primary color

**Font Settings**
- **Font Size**: Controls text size in the menu (12px - 18px recommended)
- **Font Family**: Choose from system fonts or web-safe options
- **Font Weight**: Normal (400) or Bold (600) text

**Spacing and Layout**
- **Border Radius**: Rounds the corners of menu items (0px = square, 8px = rounded)
- **Padding**: Internal spacing within menu items
- **Margin**: Space between menu items

### Admin Bar Help

**Background Color**
- Controls the WordPress admin bar (top bar) background
- Usually matches or complements the menu background
- **Note**: Affects both frontend and backend admin bars

**Text Color**
- Color of text and icons in the admin bar
- Must be readable against the background color
- **Accessibility**: Ensure good contrast for all users

**Height**
- Controls the height of the admin bar
- **Default**: 32px (recommended)
- **Range**: 28px - 48px
- **Note**: Very tall admin bars may interfere with responsive design

**Position**
- **Fixed**: Admin bar stays at top when scrolling (default)
- **Absolute**: Admin bar scrolls with page content
- **Sticky**: Similar to fixed but with different behavior on mobile

### Content Area Help

**Background Color**
- Sets the main content area background color
- Should provide good contrast for text readability
- **Light themes**: Use light colors (#f1f1f1, #ffffff)
- **Dark themes**: Use dark colors (#1e1e1e, #2d2d2d)

**Text Color**
- Primary text color for content areas
- Must be highly readable against the background
- **Accessibility**: Maintain at least 4.5:1 contrast ratio

**Link Color**
- Color for clickable links in the admin area
- Should be visually distinct from regular text
- **Best Practice**: Use your brand's accent color

**Typography**
- **Font Family**: Choose readable fonts for long-form content
- **Font Size**: 14px is recommended for body text
- **Line Height**: 1.4 - 1.6 for optimal readability

### Advanced Settings Help

**Custom CSS**
- Add your own CSS code for advanced customizations
- **Security**: Code is automatically sanitized for safety
- **Variables**: Use CSS custom properties for dynamic theming
- **Example**:
  ```css
  .my-custom-element {
      background-color: var(--las-primary);
      color: var(--las-text-color);
  }
  ```

**Performance Mode**
- **Performance**: Prioritizes speed over visual effects
- **Balanced**: Good balance of performance and visuals (recommended)
- **Quality**: Maximum visual quality, may impact performance

**Cache Settings**
- **Enable Caching**: Improves performance by storing generated CSS
- **Cache Duration**: How long to keep cached files (1 hour recommended)
- **Clear Cache**: Force regeneration of all cached files

### Live Edit Mode Help

**Activating Live Edit Mode**
1. Click the "Live Edit Mode" toggle
2. Navigate to any admin page
3. Hover over elements to see them highlighted
4. Click highlighted elements to open editing panels

**Using Micro-Panels**
- **Positioning**: Panels appear above or beside the selected element
- **Auto-hide**: Panels disappear when you click elsewhere
- **Multiple panels**: Only one panel can be open at a time
- **Responsive**: Panels adapt to screen size

**Live Edit Features**
- **Real-time preview**: Changes appear instantly
- **Auto-save**: Changes save automatically after 2 seconds
- **Undo/Redo**: Use Ctrl+Z (Cmd+Z on Mac) to undo changes
- **Multi-tab sync**: Changes sync across browser tabs

**Tips for Live Edit Mode**
- Start with major elements (menu, admin bar) before fine-tuning
- Use the preview toggle to see changes without editing interface
- Test on different screen sizes using browser responsive mode
- Save frequently or enable auto-save for peace of mind

### Color Picker Help

**Color Formats**
- **HEX**: #ff0000 (most common format)
- **RGB**: rgb(255, 0, 0) (red, green, blue values)
- **RGBA**: rgba(255, 0, 0, 0.5) (includes transparency)
- **HSL**: hsl(0, 100%, 50%) (hue, saturation, lightness)
- **HSLA**: hsla(0, 100%, 50%, 0.5) (includes transparency)

**Color Picker Features**
- **Visual wheel**: Click and drag to select colors
- **Sliders**: Fine-tune individual color components
- **Input fields**: Enter exact color values
- **Eyedropper**: Sample colors from anywhere on screen (modern browsers)
- **Palette**: Save and reuse favorite colors
- **Recent colors**: Quick access to recently used colors

**Accessibility Features**
- **Contrast checker**: Automatically validates color combinations
- **WCAG compliance**: Ensures colors meet accessibility standards
- **Color blindness**: Considers different types of color vision
- **Warnings**: Alerts you to potential accessibility issues

### Template System Help

**Built-in Templates**
- **Minimal**: Clean, white space focused design
- **Glassmorphism**: Modern frosted glass effects
- **iOS**: Apple-inspired clean design
- **Material**: Google Material Design principles
- **Dark Pro**: Professional dark theme
- **Gradient**: Colorful gradient backgrounds

**Applying Templates**
1. Browse available templates in the Templates section
2. Hover over templates to see previews
3. Click "Apply" on your chosen template
4. Confirm application (this will override current settings)
5. Customize the template further if desired

**Creating Custom Templates**
1. Customize your interface to your liking
2. Click "Save as Template" in the Templates section
3. Enter a name and description for your template
4. Click "Save" to make it available for future use

**Template Management**
- **Export**: Save templates as JSON files for backup or sharing
- **Import**: Load templates from JSON files
- **Delete**: Remove custom templates you no longer need
- **Conflicts**: System warns about conflicting settings when applying templates

### Troubleshooting Help

**Changes Not Appearing**
1. **Clear browser cache**: Ctrl+F5 (Cmd+Shift+R on Mac)
2. **Check caching plugins**: Temporarily disable caching plugins
3. **Verify permissions**: Ensure you have admin privileges
4. **Plugin conflicts**: Deactivate other admin styling plugins

**Live Edit Mode Issues**
1. **JavaScript errors**: Check browser console (F12)
2. **Browser compatibility**: Ensure you're using a modern browser
3. **Extensions**: Disable browser extensions that might interfere
4. **Incognito mode**: Try in private/incognito browsing mode

**Color Picker Problems**
1. **Browser support**: Update to the latest browser version
2. **Format issues**: Try different color input methods
3. **Reset colors**: Use the reset button to return to defaults
4. **Manual input**: Enter color values directly if picker fails

**Performance Issues**
1. **Reduce animations**: Lower animation speed in settings
2. **Performance mode**: Enable performance mode in Advanced settings
3. **Clear cache**: Clear plugin cache regularly
4. **Plugin conflicts**: Check for conflicts with other plugins

### Keyboard Shortcuts

**General**
- `Ctrl+S` / `Cmd+S`: Save current settings
- `Ctrl+Z` / `Cmd+Z`: Undo last change
- `Ctrl+Y` / `Cmd+Y`: Redo last undone change
- `Esc`: Close open panels or exit Live Edit Mode

**Live Edit Mode**
- `Tab`: Navigate between editable elements
- `Enter`: Open editing panel for selected element
- `Esc`: Close current editing panel
- `Arrow keys`: Fine-tune numeric values in panels

**Color Picker**
- `Tab`: Navigate between color input fields
- `Arrow keys`: Adjust color values in small increments
- `Shift + Arrow keys`: Adjust color values in large increments
- `Enter`: Apply color and close picker

### Best Practices

**Color Selection**
- Use a consistent color palette throughout
- Ensure sufficient contrast for accessibility
- Test colors in both light and dark environments
- Consider color blindness when choosing color combinations

**Typography**
- Choose readable fonts for long-form content
- Maintain consistent font sizes and weights
- Use appropriate line heights for readability
- Limit the number of different fonts used

**Layout and Spacing**
- Use consistent spacing throughout the interface
- Maintain visual hierarchy with size and color
- Ensure clickable elements are large enough (minimum 44px)
- Test on different screen sizes and devices

**Performance**
- Enable caching for better performance
- Use performance mode on slower devices
- Limit the use of complex animations
- Regularly clear cache to prevent issues

**Accessibility**
- Maintain proper color contrast ratios
- Ensure all interactive elements are keyboard accessible
- Provide alternative text for visual elements
- Test with screen readers when possible

### Getting More Help

**Documentation**
- **User Guide**: Comprehensive guide for all features
- **Developer Guide**: Technical documentation for developers
- **API Reference**: Complete API documentation
- **Video Tutorials**: Step-by-step video guides

**Support Channels**
- **Support Forum**: Community help and discussions
- **GitHub Issues**: Bug reports and feature requests
- **Email Support**: Direct support from the development team
- **Live Chat**: Real-time assistance (premium users)

**Community Resources**
- **Discord Server**: Chat with other users and developers
- **Facebook Group**: Share tips and showcase customizations
- **YouTube Channel**: Video tutorials and feature demonstrations
- **Blog**: Latest news, tips, and updates

---

*This inline help content is displayed contextually throughout the Live Admin Styler interface to provide users with immediate assistance and guidance.*