# Live Admin Styler - Technical Stack

## Core Technologies

- **Backend**: PHP 7.4+ with WordPress 5.0+ compatibility
- **Frontend**: Vanilla JavaScript with jQuery integration
- **Styling**: CSS3 with WordPress admin design system
- **Testing**: PHPUnit for PHP, Jest for JavaScript
- **Build System**: npm scripts for task automation

## Key Libraries & Frameworks

- **WordPress APIs**: Settings API, User Meta API, AJAX handlers
- **JavaScript**: Native ES6+ features, jQuery for WordPress compatibility
- **CSS**: WordPress admin styles, custom CSS generation
- **Testing**: Jest (JS testing), PHPUnit (PHP testing), WordPress test framework

## Architecture Patterns

- **Object-Oriented PHP**: Class-based architecture with proper encapsulation
- **State Management**: Centralized user state with LAS_User_State class
- **File Management**: Secure file operations with LAS_File_Manager class
- **AJAX Pattern**: WordPress nonce-protected AJAX for real-time updates
- **Module Pattern**: JavaScript components with clear separation of concerns

## Development Commands

### Testing
```bash
# Run all tests
npm run test:all

# PHP tests only
npm run test:php
./vendor/bin/phpunit

# JavaScript tests only
npm test
npm run test:watch

# Coverage reports
npm run test:coverage
npm run test:php:coverage
```

### Code Quality
```bash
# JavaScript linting
npm run lint:js

# PHP linting (WordPress standards)
npm run lint:php

# Full build with tests and linting
npm run build
```

### Test Execution
```bash
# Run comprehensive test suite
cd tests && ./run-tests.sh

# Validate test structure
php tests/validate-tests.php
```

## Security Standards

- **Input Validation**: All user inputs sanitized and validated
- **Nonce Protection**: CSRF protection for all AJAX operations
- **Capability Checks**: WordPress capability verification (`manage_options`)
- **File Security**: Path validation and directory traversal prevention
- **SQL Safety**: WordPress database API usage, no direct SQL queries