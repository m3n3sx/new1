---
inclusion: always
---

# Live Admin Styler Development Guidelines

## Project Architecture
- **WordPress Plugin**: Modular service-oriented architecture with dependency injection
- **Namespace**: All PHP classes use `LiveAdminStyler\` PSR-4 namespace  
- **Core Pattern**: Service container via `CoreEngine.php` orchestrates all components
- **Module System**: JavaScript ES6+ modules in `assets/js/modules/` extending `LASModule` base class

## Critical Security Requirements
**MANDATORY**: Every AJAX endpoint must implement this exact pattern:
```php
if (!wp_verify_nonce($nonce, 'las_ajax_action') || !current_user_can('manage_options')) {
    wp_die('Security check failed');
}
```
- Sanitize ALL inputs: `sanitize_text_field()`, `wp_kses()`, `absint()`
- Escape ALL outputs: `esc_html()`, `esc_attr()`, `wp_kses_post()`
- Validate user capabilities before any admin operations

## Code Standards

### PHP Requirements
- WordPress Coding Standards (WPCS) compliance mandatory
- PSR-4 autoloading under `LiveAdminStyler\` namespace
- Use WordPress hooks/filters exclusively (no direct calls)
- Implement proper activation/deactivation cleanup hooks
- No direct database queries - use WordPress functions only

### JavaScript Requirements  
- ES6+ modules with Promise-based async operations
- All modules extend `LASModule` base class pattern
- Comprehensive try/catch error handling required
- AJAX timeout: 10 seconds max with exponential backoff retry
- Debounced updates: 300ms minimum for live preview

### CSS Requirements
- BEM methodology for class naming (`las-block__element--modifier`)
- CSS custom properties with `--las-` prefix for theming
- Mobile-first responsive (320px to 4K support)
- Maximum 3 consolidated CSS files for performance

## Performance Benchmarks (Non-negotiable)
- Page load: <2 seconds
- AJAX responses: <500ms  
- Memory usage: <25MB peak
- UI response: <100ms
- Animations: 60fps target

## Error Handling Standard
All errors must use this exact JSON structure:
```json
{
  "success": false,
  "data": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE", 
    "details": "Technical details for debugging"
  }
}
```

## Core Service Architecture
**Primary Services** (all in `includes/`):
1. `CoreEngine.php` - Main orchestrator and dependency injection
2. `SettingsManager.php` - WordPress options integration  
3. `CacheManager.php` - Performance optimization
4. `SecurityManager.php` - Security validation
5. `StyleGenerator.php` - CSS generation
6. `CommunicationManager.php` - AJAX/API handling
7. `AssetLoader.php` - Asset optimization
8. `MemoryManager.php` - Memory monitoring

**Key JavaScript Modules** (all in `assets/js/modules/`):
- `ajax-manager.js` - AJAX communication with retry logic
- `live-preview.js` - Real-time style updates
- `error-handler.js` - Centralized error management
- `request-queue.js` - AJAX request queuing system
- `retry-engine.js` - Exponential backoff retry logic
- `performance-monitor.js` - Performance tracking
- `memory-manager.js` - Memory optimization

## Live Preview System Requirements
- Debounce ALL input changes (300ms minimum)
- Queue AJAX requests to prevent race conditions
- Implement retry logic with exponential backoff (max 3 retries)
- Graceful degradation for failed requests
- Real-time CSS variable updates via `--las-` custom properties
- Memory cleanup after each preview update

## Testing Requirements
- **Unit Tests**: 70%+ coverage for critical functionality
- **Integration Tests**: All PHP services and AJAX endpoints  
- **Cross-browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Performance Tests**: Validate all benchmark requirements
- **Security Tests**: Penetration testing for all AJAX endpoints

## WordPress Compliance
- Compatible with WordPress 6.0+
- Use WordPress Options API exclusively for settings
- RTL language support and WCAG 2.1 AA accessibility
- Proper plugin activation/deactivation hooks
- Transient caching for expensive operations (max 12 hours)

## File Organization
```
includes/           # PHP services and core functionality
assets/js/modules/  # JavaScript ES6+ modules  
assets/css/        # Consolidated CSS files (max 3)
tests/php/         # PHPUnit test suites
tests/js/          # Jest test suites
```

## Development Rules for AI Assistant
- ALWAYS validate user input and escape output
- NEVER bypass WordPress security functions
- ALWAYS use WordPress hooks instead of direct function calls
- ALWAYS implement proper error handling with try/catch blocks
- ALWAYS debounce user input for live preview (300ms minimum)
- ALWAYS queue AJAX requests to prevent conflicts
- ALWAYS monitor memory usage in long-running operations
- ALWAYS maintain backward compatibility within major versions
- ALWAYS follow the established module patterns and naming conventions