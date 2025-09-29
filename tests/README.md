# Live Admin Styler - Test Suite

This directory contains comprehensive tests for the Live Admin Styler WordPress plugin, covering both PHP backend functionality and JavaScript frontend components.

## Test Structure

### PHP Tests (`tests/php/`)

- **TestStateManagement.php** - Tests for user state management, preferences, and tab persistence
- **TestFileCleanup.php** - Tests for the file cleanup system and security validation
- **TestOutputCss.php** - Tests for CSS generation and output functionality

### JavaScript Tests (`tests/js/`)

- **test-state-management.js** - Tests for StateManager and ErrorManager components
- **test-live-preview.js** - Tests for LivePreviewManager and caching functionality
- **test-integration.js** - Integration tests for component interactions and end-to-end workflows

## Running Tests

### PHP Tests

```bash
# Run all PHP tests
npm run test:php

# Run specific test suite
./vendor/bin/phpunit --testsuite state-management
./vendor/bin/phpunit --testsuite file-cleanup
./vendor/bin/phpunit --testsuite css-output

# Run with coverage
npm run test:php:coverage
```

### JavaScript Tests

```bash
# Run all JavaScript tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest tests/js/test-state-management.js
```

### All Tests

```bash
# Run both PHP and JavaScript tests
npm run test:all
```

## Test Requirements Coverage

### Requirements 5.4 (File Cleanup System)
- **TestFileCleanup.php** - Comprehensive testing of file cleanup functionality
- Tests security validation, pattern matching, and cleanup operations
- Covers activation/deactivation cleanup and AJAX handlers

### Requirements 6.4 (Settings Organization)
- **TestStateManagement.php** - Tests user preferences and state management
- **test-state-management.js** - Tests UI state persistence and synchronization
- Covers tab state management and user preference validation

### Requirements 7.4 (Error Handling)
- **test-state-management.js** - Tests ErrorManager notification system
- **test-live-preview.js** - Tests error handling in live preview functionality
- **test-integration.js** - Tests error recovery and cascading error handling

### Requirements 3.1-3.4 (Live Preview)
- **test-live-preview.js** - Comprehensive live preview functionality testing
- Tests debouncing, caching, AJAX handling, and performance optimization
- Covers temporary CSS application and full style updates

## Test Configuration

### PHPUnit Configuration (`phpunit.xml.dist`)
- Configured for WordPress testing environment
- Includes coverage reporting and multiple test suites
- Converts warnings and notices to exceptions for strict testing

### Jest Configuration (`package.json`)
- Node.js test environment with jQuery mocking
- Coverage collection from JavaScript source files
- Custom setup file for global mocks and utilities

### Test Setup (`tests/js/setup.js`)
- Global mocks for WordPress environment (AJAX data, localStorage, etc.)
- jQuery and DOM mocking for frontend testing
- Test utilities for common operations

## Writing Tests

### PHP Test Guidelines

1. Extend `WP_UnitTestCase` for WordPress integration
2. Use `setUp()` and `tearDown()` methods for test isolation
3. Create test users and clean up user meta in tearDown
4. Test both success and failure scenarios
5. Validate input sanitization and security measures

Example:
```php
public function test_user_state_functionality() {
    $user_state = new LAS_User_State($this->user_id);
    $this->assertTrue($user_state->set_active_tab('menu'));
    $this->assertEquals('menu', $user_state->get_active_tab());
}
```

### JavaScript Test Guidelines

1. Use `beforeEach()` and `afterEach()` for test isolation
2. Mock external dependencies (jQuery, AJAX, localStorage)
3. Test both synchronous and asynchronous operations
4. Use `jest.fn()` for function mocking and verification
5. Test error conditions and edge cases

Example:
```javascript
test('should save tab state to localStorage', () => {
    StateManager.saveTabState('menu');
    expect(localStorage.getItem('las_active_tab')).toBe('menu');
    expect(StateManager.activeTab).toBe('menu');
});
```

## Coverage Reports

Test coverage reports are generated in:
- **PHP Coverage**: `tests/coverage/php/` (HTML format)
- **JavaScript Coverage**: `tests/coverage/js/` (HTML format)

## Continuous Integration

The test suite is designed to run in CI environments:
- All tests must pass before deployment
- Coverage thresholds should be maintained
- Both PHP and JavaScript tests run in parallel

## Debugging Tests

### PHP Tests
- Use `--debug` flag with PHPUnit for verbose output
- Add `error_log()` statements for debugging
- Use `WP_DEBUG` constant for WordPress-specific debugging

### JavaScript Tests
- Use `console.log()` in tests (mocked by default)
- Run single test files for focused debugging
- Use `--verbose` flag for detailed test output

## Performance Testing

The test suite includes performance-related tests:
- CSS generation performance (TestOutputCss.php)
- Cache efficiency testing (test-live-preview.js)
- Memory usage validation (test-integration.js)
- Debouncing and throttling verification

## Security Testing

Security aspects are thoroughly tested:
- File path validation and traversal prevention
- Input sanitization and validation
- CSRF protection and nonce verification
- User permission checking

## Mock Data and Fixtures

Test data is generated programmatically:
- User accounts with appropriate capabilities
- Test files for cleanup validation
- Mock AJAX responses for various scenarios
- Simulated user interactions and state changes