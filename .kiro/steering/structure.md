# Live Admin Styler - Project Structure

## Root Directory Layout

```
live-admin-styler/
├── live-admin-styler.php      # Main plugin file with core classes
├── package.json               # npm configuration and scripts
├── phpunit.xml.dist          # PHPUnit configuration
├── README.md                 # Project documentation
├── includes/                 # PHP backend components
├── js/                      # Admin JavaScript files
├── assets/                  # Frontend assets (CSS, JS)
├── tests/                   # Test suite (PHP & JS)
├── languages/               # Translation files
└── .kiro/                   # Kiro IDE configuration
```

## Core Directories

### `/includes/` - PHP Backend
- `admin-settings-page.php` - Settings page rendering and tab management
- `ajax-handlers.php` - AJAX endpoint handlers with security validation
- `output-css.php` - Dynamic CSS generation and caching
- `templates.php` - HTML template functions and components

### `/js/` - Admin JavaScript
- `admin-settings.js` - Main admin interface controller

### `/assets/` - Frontend Assets
- `css/admin-style.css` - Admin interface styling
- `js/live-preview.js` - Live preview functionality with error handling

### `/tests/` - Test Suite
- `php/` - PHPUnit test classes
  - `TestStateManagement.php` - User state and preferences tests
  - `TestFileCleanup.php` - File management security tests
  - `TestOutputCss.php` - CSS generation tests
- `js/` - Jest test files
  - `test-state-management.js` - StateManager component tests
  - `test-live-preview.js` - LivePreviewManager tests
  - `test-integration.js` - End-to-end integration tests
- `run-tests.sh` - Comprehensive test runner script
- `validate-tests.php` - Test structure validation

## Key Architecture Components

### Main Plugin File (`live-admin-styler.php`)
- Plugin header and WordPress integration
- `LAS_User_State` class - User preferences and tab state management
- `LAS_File_Manager` class - Secure file cleanup operations
- Core plugin functions and option management

### Settings System
- Tab-based interface (general, menu, adminbar, content, logos, advanced)
- User state persistence with validation
- Live preview integration with debounced updates

### Security Layer
- WordPress nonce validation for all AJAX operations
- Capability checks (`manage_options`) for admin access
- Input sanitization and validation throughout
- File path validation to prevent directory traversal

## Naming Conventions

- **PHP Functions**: `las_fresh_` prefix for all global functions
- **CSS Classes**: `las-` prefix for plugin-specific styles
- **JavaScript**: CamelCase for classes, snake_case for functions
- **Constants**: `LAS_FRESH_` prefix in uppercase
- **Database Options**: `las_fresh_` prefix for WordPress options
- **User Meta**: `las_fresh_` prefix for user metadata keys

## File Organization Principles

- **Separation of Concerns**: Clear separation between PHP backend and JavaScript frontend
- **Security First**: All user-facing files include direct access prevention
- **Modular Design**: Each include file handles specific functionality
- **Test Coverage**: Comprehensive test files mirror the main codebase structure
- **WordPress Standards**: Follows WordPress coding standards and best practices