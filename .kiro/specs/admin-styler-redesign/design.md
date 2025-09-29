# Design Document

## Overview

Kompleksowe przeprojektowanie wtyczki WordPress Live Admin Styler w celu rozwiązania problemów z funkcjonalnością, poprawy doświadczenia użytkownika oraz modernizacji interfejsu. Projekt obejmuje poprawki nawigacji, podglądu na żywo, zachowania stanu oraz całkowitą modernizację UI/UX.

## Architecture

### Obecna Architektura
- **Główny plik**: `live-admin-styler.php` - inicjalizacja wtyczki, definicje stałych
- **Strona ustawień**: `includes/admin-settings-page.php` - renderowanie interfejsu administracyjnego
- **Obsługa AJAX**: `includes/ajax-handlers.php` - podgląd na żywo
- **JavaScript**: `js/admin-settings.js` + `assets/js/live-preview.js` - interakcje UI i podgląd
- **Style**: `assets/css/admin-style.css` - stylowanie interfejsu wtyczki

### Nowa Architektura
Zachowamy obecną strukturę plików, ale znacząco ulepszymy każdy komponent:

1. **Enhanced State Management** - Dodanie systemu zarządzania stanem dla zakładek i ustawień
2. **Improved Live Preview** - Rozszerzenie funkcjonalności podglądu na żywo
3. **Modern UI Components** - Przeprojektowanie komponentów interfejsu
4. **Better Navigation** - Poprawa nawigacji i widoczności submenu
5. **File Cleanup System** - Automatyczne czyszczenie niepotrzebnych plików

## Components and Interfaces

### 1. State Management System

#### Tab State Persistence
```php
// Nowa funkcja w admin-settings-page.php
function las_fresh_get_active_tab() {
    return get_user_meta(get_current_user_id(), 'las_fresh_active_tab', true) ?: 'general';
}

function las_fresh_save_active_tab($tab) {
    update_user_meta(get_current_user_id(), 'las_fresh_active_tab', sanitize_key($tab));
}
```

#### JavaScript State Manager
```javascript
// Nowy moduł w admin-settings.js
const StateManager = {
    activeTab: null,
    
    saveTabState(tabId) {
        localStorage.setItem('las_active_tab', tabId);
        // AJAX call to save in user meta
    },
    
    restoreTabState() {
        const savedTab = localStorage.getItem('las_active_tab');
        if (savedTab) {
            this.activateTab(savedTab);
        }
    }
};
```

### 2. Enhanced Live Preview System

#### Real-time Preview Manager
```javascript
// Rozszerzenie live-preview.js
const LivePreviewManager = {
    debounceTimer: null,
    
    handleFieldChange(field, value) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.updatePreview(field, value);
        }, 150); // Debounce dla lepszej wydajności
    },
    
    updatePreview(field, value) {
        // Natychmiastowa aktualizacja CSS
        this.applyTemporaryStyles(field, value);
        // AJAX call dla pełnej regeneracji
        this.requestFullUpdate(field, value);
    }
};
```

### 3. Modern UI Components

#### Enhanced Submenu System
```css
/* Nowe style dla submenu w admin-style.css */
#adminmenu .wp-submenu {
    visibility: visible !important;
    opacity: 1 !important;
    transform: translateX(0) !important;
    transition: all 0.2s ease-in-out;
    box-shadow: 2px 2px 8px rgba(0,0,0,0.1);
    border-radius: 4px;
    backdrop-filter: blur(10px);
}

#adminmenu .wp-submenu.hidden {
    visibility: hidden;
    opacity: 0;
    transform: translateX(-10px);
}
```

#### Modern Form Controls
```css
/* Nowoczesne kontrolki formularza */
.las-modern-control {
    background: #fff;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    padding: 12px 16px;
    transition: all 0.2s ease;
    font-size: 14px;
}

.las-modern-control:focus {
    border-color: #007cba;
    box-shadow: 0 0 0 3px rgba(0, 124, 186, 0.1);
    outline: none;
}

.las-modern-slider {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, #007cba 0%, #e1e5e9 0%);
}
```

### 4. Navigation Enhancement

#### Smart Submenu Handler
```javascript
// Nowy komponent dla obsługi submenu
const SubmenuManager = {
    hoverTimeout: null,
    
    init() {
        this.attachEventListeners();
        this.enhanceVisibility();
    },
    
    enhanceVisibility() {
        // Poprawa widoczności submenu
        $('#adminmenu .wp-has-submenu').each(function() {
            const $item = $(this);
            const $submenu = $item.find('.wp-submenu');
            
            $item.on('mouseenter', () => {
                clearTimeout(this.hoverTimeout);
                $submenu.removeClass('hidden').addClass('visible');
            });
            
            $item.on('mouseleave', () => {
                this.hoverTimeout = setTimeout(() => {
                    $submenu.removeClass('visible').addClass('hidden');
                }, 300);
            });
        });
    }
};
```

### 5. File Management System

#### Cleanup Manager
```php
// Nowa klasa w głównym pliku
class LAS_File_Manager {
    private $cleanup_files = [
        'MENU_SIDEBAR_FIXES_SUMMARY.md',
        'TASK_*_SUMMARY.md',
        'integration-verification.js',
        'test-*.html'
    ];
    
    public function cleanup_unnecessary_files() {
        foreach ($this->cleanup_files as $pattern) {
            $files = glob(plugin_dir_path(__FILE__) . $pattern);
            foreach ($files as $file) {
                if (file_exists($file)) {
                    unlink($file);
                }
            }
        }
    }
}
```

## Data Models

### Settings Schema Enhancement
```php
// Rozszerzenie domyślnych opcji
function las_fresh_get_enhanced_default_options() {
    $base_options = las_fresh_get_default_options();
    
    return array_merge($base_options, [
        // UI Enhancement Options
        'ui_theme' => 'modern',
        'animation_speed' => 'normal',
        'submenu_visibility' => 'enhanced',
        
        // State Management
        'remember_tab_state' => true,
        'auto_save_changes' => false,
        
        // Live Preview Settings
        'live_preview_enabled' => true,
        'live_preview_debounce' => 150,
        
        // Advanced Features
        'smart_submenu' => true,
        'enhanced_tooltips' => true,
        'keyboard_shortcuts' => true
    ]);
}
```

### User State Model
```php
// Nowy model dla stanu użytkownika
class LAS_User_State {
    private $user_id;
    
    public function __construct($user_id = null) {
        $this->user_id = $user_id ?: get_current_user_id();
    }
    
    public function get_active_tab() {
        return get_user_meta($this->user_id, 'las_active_tab', true) ?: 'general';
    }
    
    public function set_active_tab($tab) {
        update_user_meta($this->user_id, 'las_active_tab', sanitize_key($tab));
    }
    
    public function get_ui_preferences() {
        return get_user_meta($this->user_id, 'las_ui_preferences', true) ?: [];
    }
}
```

## Error Handling

### Enhanced Error Management
```javascript
// Nowy system obsługi błędów
const ErrorManager = {
    showError(message, type = 'error') {
        const notification = this.createNotification(message, type);
        this.displayNotification(notification);
    },
    
    createNotification(message, type) {
        return {
            id: Date.now(),
            message: message,
            type: type,
            timestamp: new Date(),
            dismissible: true
        };
    },
    
    displayNotification(notification) {
        const $container = $('#las-notifications');
        if (!$container.length) {
            $('body').append('<div id="las-notifications" class="las-notifications-container"></div>');
        }
        
        const $notification = $(`
            <div class="las-notification las-notification-${notification.type}" data-id="${notification.id}">
                <div class="las-notification-content">
                    <span class="las-notification-message">${notification.message}</span>
                    <button class="las-notification-dismiss" aria-label="Zamknij">&times;</button>
                </div>
            </div>
        `);
        
        $('#las-notifications').append($notification);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            $notification.fadeOut(() => $notification.remove());
        }, 5000);
    }
};
```

### PHP Error Handling
```php
// Rozszerzenie obsługi błędów AJAX
function las_ajax_get_preview_css_enhanced() {
    try {
        // Walidacja bezpieczeństwa
        if (!las_validate_ajax_request()) {
            throw new Exception('Invalid request');
        }
        
        // Przetwarzanie ustawień
        $result = las_process_preview_settings();
        
        wp_send_json_success($result);
        
    } catch (Exception $e) {
        error_log('LAS Preview Error: ' . $e->getMessage());
        wp_send_json_error([
            'message' => 'Wystąpił błąd podczas generowania podglądu',
            'debug' => WP_DEBUG ? $e->getMessage() : null
        ]);
    }
}
```

## Testing Strategy

### Unit Tests
```php
// tests/php/TestEnhancedFeatures.php
class TestEnhancedFeatures extends WP_UnitTestCase {
    
    public function test_tab_state_persistence() {
        $user_id = $this->factory->user->create();
        $state = new LAS_User_State($user_id);
        
        $state->set_active_tab('menu');
        $this->assertEquals('menu', $state->get_active_tab());
    }
    
    public function test_live_preview_generation() {
        $options = las_fresh_get_enhanced_default_options();
        $options['admin_menu_bg_color'] = '#ff0000';
        
        $css = las_fresh_generate_admin_css_output($options);
        $this->assertStringContains('background-color: #ff0000', $css);
    }
}
```

### JavaScript Tests
```javascript
// tests/js/test-state-management.js
describe('StateManager', function() {
    it('should save and restore tab state', function() {
        StateManager.saveTabState('menu');
        expect(localStorage.getItem('las_active_tab')).toBe('menu');
        
        StateManager.restoreTabState();
        expect(StateManager.activeTab).toBe('menu');
    });
});
```

### Integration Tests
```javascript
// tests/js/test-live-preview.js
describe('LivePreviewManager', function() {
    it('should update preview on field change', function(done) {
        const mockField = { name: 'las_fresh_options[admin_menu_bg_color]' };
        const mockValue = '#ff0000';
        
        LivePreviewManager.handleFieldChange(mockField, mockValue);
        
        setTimeout(() => {
            const styles = document.getElementById('las-live-preview-style');
            expect(styles.innerHTML).toContain('#ff0000');
            done();
        }, 200);
    });
});
```

## Performance Considerations

### Optimization Strategies

1. **Debouncing**: Wszystkie zmiany w podglądzie na żywo będą debounced (150ms)
2. **CSS Caching**: Generowany CSS będzie cachowany po stronie klienta
3. **Lazy Loading**: Zaawansowane opcje będą ładowane na żądanie
4. **Memory Management**: Automatyczne czyszczenie event listenerów

### Resource Management
```javascript
// Optymalizacja pamięci
const ResourceManager = {
    cleanup() {
        // Czyszczenie event listenerów
        $(document).off('.las-namespace');
        
        // Czyszczenie timerów
        clearTimeout(this.debounceTimer);
        
        // Czyszczenie cache
        if (window.valueCache) {
            window.valueCache = {};
        }
    }
};

// Automatyczne czyszczenie przy opuszczeniu strony
$(window).on('beforeunload', () => {
    ResourceManager.cleanup();
});
```

## Security Enhancements

### Enhanced Validation
```php
// Ulepszona walidacja danych
function las_enhanced_sanitize_options($input) {
    $sanitized = [];
    $defaults = las_fresh_get_enhanced_default_options();
    
    foreach ($defaults as $key => $default_value) {
        if (!isset($input[$key])) {
            $sanitized[$key] = $default_value;
            continue;
        }
        
        $value = $input[$key];
        
        // Walidacja na podstawie typu i nazwy klucza
        $sanitized[$key] = las_sanitize_setting_value($key, $value, $default_value);
    }
    
    return $sanitized;
}
```

### CSRF Protection
```javascript
// Wzmocniona ochrona CSRF
const SecurityManager = {
    validateNonce(action) {
        return lasAdminData.nonce && 
               lasAdminData.nonce.length > 0 && 
               action === 'las_admin_nonce';
    },
    
    refreshNonce() {
        // Odświeżanie nonce co 12 godzin
        if (this.isNonceExpired()) {
            location.reload();
        }
    }
};
```