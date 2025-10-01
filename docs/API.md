# Live Admin Styler v2.0 - API Documentation

## Overview

Live Admin Styler v2.0 provides a comprehensive API for customizing WordPress admin interface with modern UI components, real-time preview, and advanced theming capabilities.

## Table of Contents

1. [PHP API](#php-api)
2. [JavaScript API](#javascript-api)
3. [Hooks and Filters](#hooks-and-filters)
4. [CSS Custom Properties](#css-custom-properties)
5. [Template System](#template-system)
6. [Security](#security)

## PHP API

### Core Services

#### CoreEngine

The dependency injection container and service orchestrator.

```php
// Get the core engine instance
$core = LAS_CoreEngine::getInstance();

// Register a service
$core->register('my-service', function() {
    return new MyService();
});

// Get a service
$service = $core->get('my-service');
```

**Methods:**
- `getInstance()` - Get singleton instance
- `register($name, $factory, $dependencies = [])` - Register service factory
- `get($name)` - Get service instance with lazy loading
- `has($name)` - Check if service is registered
- `clearCache($name = null)` - Clear service cache

#### SettingsManager

Manages plugin settings with caching and validation.

```php
// Get settings manager
$settings = $core->get('settings-manager');

// Get a setting
$value = $settings->get('menu.background_color', '#23282d');

// Set a setting
$settings->set('menu.background_color', '#ff0000');

// Get all settings
$all_settings = $settings->getAll();

// Apply a preset
$settings->applyPreset('minimal');
```

**Methods:**
- `get($key, $default = null)` - Get setting value (supports dot notation)
- `set($key, $value, $validate = true)` - Set setting value
- `getMultiple($keys)` - Get multiple settings
- `setMultiple($settings, $validate = true)` - Set multiple settings
- `reset($group = null)` - Reset settings to defaults
- `export($groups = null)` - Export settings to JSON
- `import($json, $merge = true)` - Import settings from JSON
- `getPresets($include_custom = true)` - Get available presets
- `applyPreset($preset_id, $merge = false)` - Apply preset

#### SecurityManager

Provides comprehensive security validation and sanitization.

```php
// Get security manager
$security = $core->get('security-manager');

// Validate nonce
$valid = $security->validateNonce($_POST['nonce'], 'save_settings');

// Check capability
$can_manage = $security->checkCapability('manage_options');

// Sanitize data
$clean_data = $security->sanitize($user_input, 'color');

// Validate data
$validation_result = $security->validate($data, 'css');
```

**Methods:**
- `validateNonce($nonce, $action)` - Validate WordPress nonce
- `createNonce($action)` - Create WordPress nonce
- `checkCapability($capability = 'manage_options')` - Check user capability
- `sanitize($data, $type = 'text')` - Sanitize input data
- `validate($data, $type = 'text', $options = [])` - Validate input data
- `escapeOutput($data, $context = 'html')` - Escape output data
- `validateFilePath($path, $allowed_base = '')` - Validate file paths

#### CacheManager

Multi-level caching with performance monitoring.

```php
// Get cache manager
$cache = $core->get('cache-manager');

// Cache with callback
$value = $cache->remember('expensive-operation', function() {
    return expensive_calculation();
}, 3600);

// Direct cache operations
$cache->set('key', 'value', 3600);
$value = $cache->get('key', 'default');
$cache->delete('key');

// Get metrics
$metrics = $cache->getMetrics();
```

**Methods:**
- `remember($key, $callback, $ttl = 3600, $group = 'default')` - Cache with callback
- `get($key, $default = null, $group = 'default')` - Get cached value
- `set($key, $value, $ttl = 3600, $group = 'default')` - Set cached value
- `delete($key, $group = 'default')` - Delete cached value
- `flush($group = null)` - Flush cache group or all
- `getMetrics()` - Get cache performance metrics

### Hooks and Filters

#### Actions

```php
// Before settings are saved
do_action('las_before_save_settings', $settings);

// After settings are saved
do_action('las_after_save_settings', $settings);

// Before template is applied
do_action('las_before_apply_template', $template_id, $settings);

// After template is applied
do_action('las_after_apply_template', $template_id, $settings);

// CSS generation
do_action('las_before_css_generation', $settings);
do_action('las_after_css_generation', $css, $settings);
```

#### Filters

```php
// Modify settings before save
$settings = apply_filters('las_pre_save_settings', $settings);

// Modify generated CSS
$css = apply_filters('las_generated_css', $css, $settings);

// Modify available templates
$templates = apply_filters('las_available_templates', $templates);

// Modify color picker options
$options = apply_filters('las_color_picker_options', $options);

// Modify validation rules
$rules = apply_filters('las_validation_rules', $rules, $context);
```

## JavaScript API

### Core Module System

#### LASCore

The main module loader and event system.

```javascript
// Access global instance
const core = window.LAS;

// Load a module
const settingsManager = await core.loadModule('settings-manager');

// Event system
core.on('settings:changed', (data) => {
    console.log('Setting changed:', data);
});

core.emit('custom:event', { data: 'value' });

// Get system info
const info = core.getSystemInfo();
```

**Methods:**
- `loadModule(name, path = null)` - Load module dynamically
- `getModule(name)` - Get loaded module
- `hasModule(name)` - Check if module is loaded
- `on(event, callback, context = null)` - Add event listener
- `off(event, callback)` - Remove event listener
- `emit(event, data = null)` - Emit event
- `getSystemInfo()` - Get system information

#### SettingsManager

Client-side settings management with multi-tab sync.

```javascript
// Get settings manager
const settings = core.getModule('settings-manager');

// Get/set settings
const value = settings.get('menu.background_color', '#23282d');
settings.set('menu.background_color', '#ff0000');

// Bulk operations
settings.setMultiple({
    'menu.background_color': '#ff0000',
    'menu.text_color': '#ffffff'
});

// Change listeners
settings.onChange('menu.background_color', (newValue, oldValue) => {
    console.log('Color changed:', newValue);
});

// Get all settings
const allSettings = settings.getAll();
```

**Methods:**
- `get(key, defaultValue = null)` - Get setting value
- `set(key, value, immediate = false)` - Set setting value
- `setMultiple(settings, immediate = false)` - Set multiple settings
- `getAll()` - Get all settings
- `onChange(key, callback)` - Add change listener
- `offChange(key, callback)` - Remove change listener
- `reset()` - Reset to original values
- `hasUnsavedChanges()` - Check for unsaved changes

#### AjaxManager

AJAX requests with retry logic and error handling.

```javascript
// Get AJAX manager
const ajax = core.getModule('ajax-manager');

// Make request
try {
    const response = await ajax.request('save_settings', {
        settings: { 'menu.background_color': '#ff0000' }
    });
    console.log('Settings saved:', response);
} catch (error) {
    console.error('Save failed:', error);
}

// Configure options
ajax.configure({
    maxRetries: 5,
    timeout: 60000
});

// Get metrics
const metrics = ajax.getMetrics();
```

**Methods:**
- `request(action, data = {}, options = {})` - Make AJAX request
- `configure(config)` - Set configuration options
- `getMetrics()` - Get performance metrics
- `getHistory(limit = 50)` - Get request history
- `onNotification(callback)` - Register notification callback

#### LivePreview

Real-time preview system.

```javascript
// Get live preview
const preview = core.getModule('live-preview');

// Update preview
preview.updatePreview('menu.background_color', '#ff0000');

// Bulk update
preview.updateMultiple({
    'menu.background_color': '#ff0000',
    'menu.text_color': '#ffffff'
});

// Enable/disable
preview.enable();
preview.disable();
```

**Methods:**
- `updatePreview(key, value)` - Update single preview
- `updateMultiple(settings)` - Update multiple previews
- `enable()` - Enable live preview
- `disable()` - Disable live preview
- `isEnabled()` - Check if enabled

### UI Components

#### ColorPicker

Advanced color picker with multiple formats.

```javascript
// Get color picker
const colorPicker = core.getModule('color-picker');

// Create color picker
const picker = colorPicker.create('#color-input', {
    format: 'hex',
    alpha: true,
    palette: ['#ff0000', '#00ff00', '#0000ff']
});

// Event listeners
picker.on('change', (color) => {
    console.log('Color changed:', color);
});
```

#### ThemeManager

Dark/light theme management.

```javascript
// Get theme manager
const themes = core.getModule('theme-manager');

// Set theme
themes.setTheme('dark');
themes.setTheme('light');
themes.setTheme('auto');

// Get current theme
const currentTheme = themes.getCurrentTheme();

// Listen for changes
themes.on('theme-changed', (theme) => {
    console.log('Theme changed to:', theme);
});
```

## CSS Custom Properties

Live Admin Styler uses CSS custom properties (variables) for dynamic theming:

### Menu Variables
```css
:root {
    --las-menu-bg: #23282d;
    --las-menu-text: #ffffff;
    --las-menu-hover: #0073aa;
    --las-menu-active: #0073aa;
    --las-menu-font-size: 14px;
    --las-menu-border-radius: 0px;
}
```

### Admin Bar Variables
```css
:root {
    --las-adminbar-bg: #23282d;
    --las-adminbar-text: #ffffff;
    --las-adminbar-height: 32px;
}
```

### Content Variables
```css
:root {
    --las-content-bg: #f1f1f1;
    --las-content-text: #23282d;
    --las-content-font-size: 14px;
    --las-content-line-height: 1.4;
}
```

### Theme Variables
```css
:root {
    --las-primary: #0073aa;
    --las-secondary: #23282d;
    --las-success: #46b450;
    --las-warning: #ffb900;
    --las-error: #dc3232;
}
```

## Template System

### Built-in Templates

1. **Minimal** - Clean, white space focused design
2. **Glassmorphism** - Modern frosted glass effects
3. **iOS** - Apple-inspired clean design
4. **Material** - Google Material Design inspired
5. **Dark Pro** - Professional dark theme
6. **Gradient** - Colorful gradient design

### Custom Templates

```php
// Register custom template
add_filter('las_available_templates', function($templates) {
    $templates['my-template'] = [
        'name' => 'My Custom Template',
        'description' => 'My custom design',
        'settings' => [
            'menu' => [
                'background_color' => '#custom-color',
                // ... other settings
            ]
        ]
    ];
    return $templates;
});
```

### Template Structure

```json
{
    "name": "Template Name",
    "description": "Template description",
    "version": "1.0.0",
    "author": "Author Name",
    "settings": {
        "general": {
            "theme_mode": "auto",
            "animation_speed": "normal"
        },
        "menu": {
            "background_color": "#23282d",
            "text_color": "#ffffff"
        },
        "adminbar": {
            "background_color": "#23282d",
            "text_color": "#ffffff"
        },
        "content": {
            "background_color": "#f1f1f1",
            "font_family": "system"
        }
    }
}
```

## Security

### Nonce Validation

All AJAX requests require nonce validation:

```php
// PHP - Create nonce
$nonce = $security->createNonce('save_settings');

// JavaScript - Include in request
const response = await ajax.request('save_settings', {
    settings: {...},
    nonce: window.lasConfig.nonce
});
```

### Input Sanitization

All user input is sanitized based on data type:

```php
// Sanitize different data types
$color = $security->sanitize($input, 'color');
$css = $security->sanitize($input, 'css');
$text = $security->sanitize($input, 'text');
$email = $security->sanitize($input, 'email');
$url = $security->sanitize($input, 'url');
```

### Capability Checks

All admin operations require proper capabilities:

```php
// Check if user can manage options
if (!$security->checkCapability('manage_options')) {
    wp_die('Insufficient permissions');
}
```

### Rate Limiting

AJAX requests are rate limited to prevent abuse:

```php
// Check rate limit (100 requests per hour)
$rate_check = $security->checkRateLimit('save_settings', 100, 3600);
if (is_wp_error($rate_check)) {
    wp_send_json_error($rate_check->get_error_message());
}
```

## Error Handling

### PHP Errors

```php
try {
    $settings->set('invalid.key', 'value');
} catch (Exception $e) {
    error_log('LAS Error: ' . $e->getMessage());
    wp_send_json_error('Settings save failed');
}
```

### JavaScript Errors

```javascript
// Global error handling
core.on('core:error', (errorData) => {
    console.error('LAS Error:', errorData);
    // Show user notification
});

// Request error handling
try {
    await ajax.request('save_settings', data);
} catch (error) {
    console.error('Request failed:', error);
    // Handle error appropriately
}
```

## Performance

### Caching

- Multi-level caching (memory, transients, object cache)
- Automatic cache invalidation
- Performance metrics collection

### Asset Optimization

- Conditional loading based on context
- CSS/JS minification
- Critical CSS inlining
- Lazy loading for non-essential resources

### Memory Management

- Service lazy loading
- Memory usage monitoring
- Automatic cleanup of large objects
- Memory leak prevention

## Browser Compatibility

- **Chrome 90+** - Full support
- **Firefox 88+** - Full support
- **Safari 14+** - Full support
- **Edge 90+** - Full support
- **IE11** - Basic support with fallbacks

## Examples

### Complete Settings Update

```javascript
// Update multiple settings with live preview
const settings = core.getModule('settings-manager');
const preview = core.getModule('live-preview');

// Update settings
await settings.setMultiple({
    'menu.background_color': '#2c3e50',
    'menu.text_color': '#ecf0f1',
    'menu.hover_color': '#3498db',
    'adminbar.background_color': '#2c3e50'
});

// Settings are automatically previewed and saved
console.log('Settings updated successfully');
```

### Custom Color Picker Integration

```javascript
// Create custom color picker
const colorPicker = core.getModule('color-picker');

const picker = colorPicker.create('#my-color-input', {
    format: 'hex',
    alpha: false,
    palette: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'],
    onChange: (color) => {
        // Update setting in real-time
        settings.set('menu.background_color', color.hex);
    }
});
```

### Template Application

```javascript
// Apply template with confirmation
const templates = core.getModule('template-manager');

if (confirm('Apply the Minimal template? This will override current settings.')) {
    try {
        await templates.apply('minimal');
        console.log('Template applied successfully');
    } catch (error) {
        console.error('Template application failed:', error);
    }
}
```

This API documentation provides comprehensive coverage of all available methods, events, and integration points for Live Admin Styler v2.0.