# Live Admin Styler v2.0 - Developer Guide

## Table of Contents

1. [Development Setup](#development-setup)
2. [Architecture Overview](#architecture-overview)
3. [Contributing Guidelines](#contributing-guidelines)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Build Process](#build-process)
7. [API Reference](#api-reference)
8. [Extending the Plugin](#extending-the-plugin)
9. [Debugging](#debugging)
10. [Deployment](#deployment)

## Development Setup

### Prerequisites

- **PHP 7.4+** with required extensions
- **Node.js 16+** and npm
- **Composer** for PHP dependencies
- **WordPress 6.0+** development environment
- **Git** for version control

### Local Development Environment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/live-admin-styler.git
   cd live-admin-styler
   ```

2. **Install PHP dependencies**:
   ```bash
   composer install
   ```

3. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

4. **Set up WordPress**:
   - Install WordPress locally (using Local, XAMPP, or Docker)
   - Symlink or copy the plugin to `wp-content/plugins/`
   - Activate the plugin

5. **Configure development environment**:
   ```php
   // Add to wp-config.php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   define('LAS_DEBUG', true);
   ```

### Development Tools

Install recommended development tools:

```bash
# Global tools
npm install -g eslint prettier jsdoc
composer global require squizlabs/php_codesniffer
composer global require wp-coding-standards/wpcs

# Configure PHPCS
phpcs --config-set installed_paths ~/.composer/vendor/wp-coding-standards/wpcs
```

### IDE Configuration

**VS Code Extensions**:
- PHP Intelephense
- ESLint
- Prettier
- WordPress Snippets
- GitLens

**PHPStorm Plugins**:
- WordPress Support
- PHP Annotations
- .env files support

## Architecture Overview

### Directory Structure

```
live-admin-styler/
├── assets/                 # Frontend assets
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript modules
├── includes/              # PHP classes and services
├── tests/                 # Test files
│   ├── php/              # PHPUnit tests
│   └── js/               # Jest tests
├── docs/                  # Documentation
├── scripts/               # Build and utility scripts
├── languages/             # Translation files
└── live-admin-styler.php  # Main plugin file
```

### Core Architecture

Live Admin Styler v2.0 follows a service-oriented architecture:

```
┌─────────────────┐
│   WordPress     │
│   Integration   │
└─────────────────┘
         │
┌─────────────────┐
│   CoreEngine    │ ← Dependency Injection Container
│   (Singleton)   │
└─────────────────┘
         │
┌─────────────────┐
│   Services      │
│   Layer         │
├─────────────────┤
│ SettingsManager │
│ SecurityManager │
│ CacheManager    │
│ StyleGenerator  │
│ AssetLoader     │
│ etc.            │
└─────────────────┘
         │
┌─────────────────┐
│   Frontend      │
│   Layer         │
├─────────────────┤
│ JavaScript      │
│ Modules         │
│ CSS Variables   │
│ UI Components   │
└─────────────────┘
```

### Service Registration

Services are registered in the CoreEngine:

```php
// In ServiceBootstrap.php
$core = LAS_CoreEngine::getInstance();

$core->register('settings-manager', function() use ($core) {
    return new LAS_SettingsManager(
        $core->get('cache-manager'),
        $core->get('security-manager')
    );
}, ['cache-manager', 'security-manager']);
```

### JavaScript Module System

JavaScript modules use ES6+ with IE11 fallbacks:

```javascript
// Module definition
class MyModule {
    constructor(core) {
        this.core = core;
        this.init();
    }
    
    init() {
        // Module initialization
    }
}

// Module registration
if (window.LAS) {
    window.LAS.registerModule('my-module', MyModule);
}
```

## Contributing Guidelines

### Getting Started

1. **Fork** the repository on GitHub
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Make** your changes following our coding standards
4. **Test** your changes thoroughly
5. **Commit** with descriptive messages
6. **Push** to your fork and create a pull request

### Pull Request Process

1. **Update documentation** for any new features
2. **Add tests** for new functionality
3. **Ensure all tests pass**: `npm run test:all`
4. **Run code quality checks**: `npm run quality`
5. **Update the changelog** if applicable
6. **Request review** from maintainers

### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples**:
```
feat(color-picker): add HSL color format support
fix(live-edit): resolve micro-panel positioning issue
docs(api): update settings manager documentation
```

### Code Review Guidelines

**For Authors**:
- Keep PRs focused and small
- Write clear descriptions
- Respond to feedback promptly
- Update based on review comments

**For Reviewers**:
- Be constructive and specific
- Focus on code quality and standards
- Test functionality when possible
- Approve when ready for merge

## Code Standards

### PHP Standards

Follow WordPress Coding Standards with some modifications:

```php
<?php
/**
 * Class description
 * 
 * @package LiveAdminStyler
 * @since 2.0.0
 */
class LAS_MyClass {
    
    /**
     * Property description
     * 
     * @var string
     */
    private $property;
    
    /**
     * Method description
     * 
     * @param string $param Parameter description
     * @return bool Return description
     */
    public function myMethod($param) {
        // Implementation
        return true;
    }
}
```

**Key Points**:
- Use tabs for indentation
- Class names: `LAS_ClassName`
- Method names: `camelCase` or `snake_case`
- Constants: `UPPER_CASE`
- Always use braces for control structures
- Maximum line length: 120 characters

### JavaScript Standards

Follow WordPress JavaScript standards with ES6+ features:

```javascript
/**
 * Class description
 * 
 * @since 2.0.0
 */
class MyClass {
    
    /**
     * Constructor description
     * 
     * @param {Object} core - Core instance
     */
    constructor(core) {
        this.core = core;
        this.property = 'value';
    }
    
    /**
     * Method description
     * 
     * @param {string} param - Parameter description
     * @returns {boolean} Return description
     */
    myMethod(param) {
        // Implementation
        return true;
    }
}
```

**Key Points**:
- Use 4 spaces for indentation
- Use `const`/`let` instead of `var`
- Use arrow functions appropriately
- Use template literals for string interpolation
- Maximum line length: 120 characters

### CSS Standards

Follow WordPress CSS standards:

```css
/* Component: Color Picker */
.las-color-picker {
    display: flex;
    flex-direction: column;
    padding: var(--las-spacing-md);
    background-color: var(--las-surface-color);
    border-radius: var(--las-border-radius);
}

.las-color-picker__input {
    width: 100%;
    padding: var(--las-spacing-sm);
    border: 1px solid var(--las-border-color);
    border-radius: var(--las-border-radius-sm);
}

.las-color-picker__input:focus {
    outline: none;
    border-color: var(--las-primary-color);
    box-shadow: 0 0 0 2px var(--las-primary-color-alpha);
}
```

**Key Points**:
- Use BEM methodology for class names
- Use CSS custom properties for theming
- Mobile-first responsive design
- Consistent spacing using variables
- Maximum line length: 120 characters

## Testing

### PHP Testing with PHPUnit

**Setup**:
```bash
composer install
./vendor/bin/phpunit --version
```

**Running Tests**:
```bash
# All PHP tests
npm run test:php

# Specific test file
./vendor/bin/phpunit tests/php/TestSettingsManager.php

# With coverage
npm run test:php:coverage
```

**Writing Tests**:
```php
<?php
class TestMyClass extends WP_UnitTestCase {
    
    private $instance;
    
    public function setUp(): void {
        parent::setUp();
        $this->instance = new LAS_MyClass();
    }
    
    public function testMyMethod() {
        $result = $this->instance->myMethod('test');
        $this->assertTrue($result);
    }
}
```

### JavaScript Testing with Jest

**Setup**:
```bash
npm install
npx jest --version
```

**Running Tests**:
```bash
# All JavaScript tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Writing Tests**:
```javascript
describe('MyClass', () => {
    let instance;
    
    beforeEach(() => {
        instance = new MyClass(mockCore);
    });
    
    test('should do something', () => {
        const result = instance.myMethod('test');
        expect(result).toBe(true);
    });
});
```

### End-to-End Testing

**Setup Playwright**:
```bash
npm install @playwright/test
npx playwright install
```

**Running E2E Tests**:
```bash
# All E2E tests
npx playwright test

# Specific test
npx playwright test tests/e2e/live-edit.spec.js
```

### Test Coverage Requirements

- **PHP**: Minimum 70% code coverage
- **JavaScript**: Minimum 80% code coverage
- **Critical paths**: 100% coverage required
- **Integration tests**: Cover all major workflows

## Build Process

### Development Build

```bash
# Install dependencies
npm install
composer install

# Run development build
npm run build

# Watch for changes
npm run dev:watch
```

### Production Build

```bash
# Full production build
npm run build:production

# This includes:
# - Code quality checks
# - All tests
# - Asset optimization
# - Documentation generation
```

### Build Scripts

Available npm scripts:

```bash
# Quality checks
npm run lint              # Lint all code
npm run format            # Format all code
npm run quality           # Full quality check

# Testing
npm run test              # JavaScript tests
npm run test:php          # PHP tests
npm run test:all          # All tests

# Documentation
npm run docs              # Generate documentation
npm run docs:serve        # Serve documentation locally

# Build
npm run build             # Development build
npm run build:production  # Production build
```

### Asset Pipeline

1. **JavaScript**: ES6+ → Babel → Minification
2. **CSS**: PostCSS → Autoprefixer → Minification
3. **Images**: Optimization and compression
4. **Documentation**: JSDoc + PHPDoc generation

## API Reference

### PHP API

#### CoreEngine

```php
// Get instance
$core = LAS_CoreEngine::getInstance();

// Register service
$core->register('service-name', $factory, $dependencies);

// Get service
$service = $core->get('service-name');
```

#### SettingsManager

```php
$settings = $core->get('settings-manager');

// Get setting
$value = $settings->get('menu.background_color');

// Set setting
$settings->set('menu.background_color', '#ff0000');

// Apply preset
$settings->applyPreset('minimal');
```

#### SecurityManager

```php
$security = $core->get('security-manager');

// Validate nonce
$valid = $security->validateNonce($nonce, 'action');

// Sanitize data
$clean = $security->sanitize($data, 'color');
```

### JavaScript API

#### Core Module System

```javascript
// Load module
const module = await LAS.loadModule('module-name');

// Event system
LAS.on('event-name', callback);
LAS.emit('event-name', data);
```

#### Settings Manager

```javascript
const settings = LAS.getModule('settings-manager');

// Get/set settings
const value = settings.get('menu.background_color');
settings.set('menu.background_color', '#ff0000');

// Change listeners
settings.onChange('key', callback);
```

### Hooks and Filters

#### PHP Hooks

```php
// Actions
do_action('las_before_save_settings', $settings);
do_action('las_after_save_settings', $settings);

// Filters
$settings = apply_filters('las_pre_save_settings', $settings);
$css = apply_filters('las_generated_css', $css, $settings);
```

#### JavaScript Events

```javascript
// Core events
LAS.on('core:ready', callback);
LAS.on('core:error', callback);

// Settings events
LAS.on('settings:changed', callback);
LAS.on('settings:saved', callback);
```

## Extending the Plugin

### Adding New Services

1. **Create the service class**:
```php
<?php
class LAS_MyService {
    public function __construct($dependency) {
        $this->dependency = $dependency;
    }
}
```

2. **Register the service**:
```php
$core->register('my-service', function() use ($core) {
    return new LAS_MyService($core->get('dependency'));
}, ['dependency']);
```

### Adding JavaScript Modules

1. **Create the module**:
```javascript
class MyModule {
    constructor(core) {
        this.core = core;
    }
}

// Register module
LAS.registerModule('my-module', MyModule);
```

2. **Load the module**:
```javascript
const myModule = await LAS.loadModule('my-module');
```

### Adding Custom Templates

```php
add_filter('las_available_templates', function($templates) {
    $templates['my-template'] = [
        'name' => 'My Template',
        'description' => 'Custom template description',
        'settings' => [
            // Template settings
        ]
    ];
    return $templates;
});
```

### Adding Custom CSS Variables

```php
add_filter('las_css_variables', function($variables, $settings) {
    $variables['--my-custom-var'] = $settings['my_setting'];
    return $variables;
}, 10, 2);
```

## Debugging

### Debug Mode

Enable debug mode in wp-config.php:

```php
define('LAS_DEBUG', true);
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

### Logging

**PHP Logging**:
```php
if (defined('LAS_DEBUG') && LAS_DEBUG) {
    error_log('[LAS] Debug message');
}
```

**JavaScript Logging**:
```javascript
if (this.core.config.debug) {
    console.log('[LAS] Debug message');
}
```

### Common Debug Scenarios

**Service Not Found**:
1. Check service registration
2. Verify dependencies
3. Check for circular dependencies

**JavaScript Module Issues**:
1. Check browser console for errors
2. Verify module registration
3. Check ES6 compatibility

**CSS Not Applied**:
1. Check CSS generation
2. Verify variable values
3. Check for CSS conflicts

### Debug Tools

**Browser DevTools**:
- Console for JavaScript errors
- Network tab for asset loading
- Elements tab for CSS inspection

**WordPress Debug Tools**:
- Query Monitor plugin
- Debug Bar plugin
- WordPress debug log

## Deployment

### Pre-deployment Checklist

- [ ] All tests pass
- [ ] Code quality checks pass
- [ ] Documentation is updated
- [ ] Version numbers are updated
- [ ] Changelog is updated
- [ ] Translation files are updated

### Version Management

Update version numbers in:
- `live-admin-styler.php` (plugin header)
- `package.json`
- `README.md`
- Any documentation files

### Release Process

1. **Create release branch**: `git checkout -b release/2.0.1`
2. **Update version numbers** and changelog
3. **Run full test suite**: `npm run ci`
4. **Create pull request** for review
5. **Merge to main** after approval
6. **Tag release**: `git tag v2.0.1`
7. **Push tags**: `git push origin --tags`

### Distribution

**WordPress.org Repository**:
1. Update SVN repository
2. Tag new version
3. Update readme.txt

**GitHub Releases**:
1. Create release from tag
2. Upload distribution files
3. Write release notes

### Monitoring

After deployment, monitor:
- Error logs for new issues
- User feedback and support requests
- Performance metrics
- Update adoption rates

---

## Additional Resources

- **WordPress Coding Standards**: https://developer.wordpress.org/coding-standards/
- **JavaScript Style Guide**: https://github.com/WordPress/gutenberg/tree/trunk/packages/eslint-config
- **PHP Documentation**: https://www.php.net/docs.php
- **Jest Testing Framework**: https://jestjs.io/docs/getting-started
- **PHPUnit Documentation**: https://phpunit.de/documentation.html

---

*Live Admin Styler v2.0 - Developer Guide*