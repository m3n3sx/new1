/**
 * Accessibility and Validation Compliance Tests
 * Tests form validation with user feedback and accessibility features
 */

// Import the LASFormElementBinder class
const { LASFormElementBinder } = require('../../js/admin-settings.js');

describe('Form Validation and Accessibility', () => {
    let core, settingsManager, formBinder, mockContainer;
    
    beforeEach(() => {
        // Create comprehensive mock DOM container with accessibility attributes
        mockContainer = document.createElement('div');
        mockContainer.innerHTML = `
            <!-- Form with proper labels and ARIA attributes -->
            <form id="test-form" role="form" aria-label="Settings Form">
                
                <!-- Color picker with label -->
                <div class="field-group">
                    <label for="menu_color" id="menu_color_label">Menu Color</label>
                    <input type="color" 
                           id="menu_color" 
                           name="menu_color"
                           data-setting="menu_color" 
                           value="#ff0000"
                           aria-labelledby="menu_color_label"
                           aria-describedby="menu_color_help" />
                    <div id="menu_color_help" class="field-help">Choose your menu background color</div>
                </div>
                
                <!-- Required text input -->
                <div class="field-group">
                    <label for="site_title" id="site_title_label">Site Title *</label>
                    <input type="text" 
                           id="site_title" 
                           name="site_title"
                           data-setting="site_title" 
                           value=""
                           required
                           aria-labelledby="site_title_label"
                           aria-required="true"
                           aria-describedby="site_title_help" />
                    <div id="site_title_help" class="field-help">Enter your site title (required)</div>
                </div>
                
                <!-- URL input with validation -->
                <div class="field-group">
                    <label for="logo_url" id="logo_url_label">Logo URL</label>
                    <input type="url" 
                           id="logo_url" 
                           name="logo_url"
                           data-setting="logo_url" 
                           value=""
                           aria-labelledby="logo_url_label"
                           aria-describedby="logo_url_help" />
                    <div id="logo_url_help" class="field-help">Enter a valid URL for your logo</div>
                </div>
                
                <!-- Number input with range -->
                <div class="field-group">
                    <label for="font_size" id="font_size_label">Font Size</label>
                    <input type="number" 
                           id="font_size" 
                           name="font_size"
                           data-setting="font_size" 
                           value="16"
                           min="10"
                           max="72"
                           aria-labelledby="font_size_label"
                           aria-describedby="font_size_help" />
                    <div id="font_size_help" class="field-help">Font size between 10 and 72 pixels</div>
                </div>
                
                <!-- Checkbox with proper labeling -->
                <div class="field-group">
                    <input type="checkbox" 
                           id="enable_feature" 
                           name="enable_feature"
                           data-setting="enable_feature" 
                           aria-describedby="enable_feature_help" />
                    <label for="enable_feature" id="enable_feature_label">Enable Advanced Features</label>
                    <div id="enable_feature_help" class="field-help">Enable additional customization options</div>
                </div>
                
                <!-- Select with proper labeling -->
                <div class="field-group">
                    <label for="theme_style" id="theme_style_label">Theme Style</label>
                    <select id="theme_style" 
                            name="theme_style"
                            data-setting="theme_style" 
                            aria-labelledby="theme_style_label"
                            aria-describedby="theme_style_help">
                        <option value="">Select a style</option>
                        <option value="modern">Modern</option>
                        <option value="classic">Classic</option>
                        <option value="minimal">Minimal</option>
                    </select>
                    <div id="theme_style_help" class="field-help">Choose your preferred theme style</div>
                </div>
                
                <!-- Textarea with character limit -->
                <div class="field-group">
                    <label for="custom_css" id="custom_css_label">Custom CSS</label>
                    <textarea id="custom_css" 
                              name="custom_css"
                              data-setting="custom_css" 
                              maxlength="5000"
                              aria-labelledby="custom_css_label"
                              aria-describedby="custom_css_help custom_css_count"
                              rows="5"></textarea>
                    <div id="custom_css_help" class="field-help">Add custom CSS rules</div>
                    <div id="custom_css_count" class="character-count" aria-live="polite">0/5000 characters</div>
                </div>
                
                <!-- Fieldset for grouped options -->
                <fieldset>
                    <legend>Color Scheme Options</legend>
                    <div class="field-group">
                        <input type="radio" 
                               id="color_light" 
                               name="color_scheme"
                               data-setting="color_scheme" 
                               value="light" />
                        <label for="color_light">Light Theme</label>
                    </div>
                    <div class="field-group">
                        <input type="radio" 
                               id="color_dark" 
                               name="color_scheme"
                               data-setting="color_scheme" 
                               value="dark" />
                        <label for="color_dark">Dark Theme</label>
                    </div>
                </fieldset>
                
            </form>
            
            <!-- Live region for announcements -->
            <div id="form-announcements" aria-live="polite" aria-atomic="true" class="sr-only"></div>
        `;
        document.body.appendChild(mockContainer);
        
        // Create mock core and settings manager
        core = {
            get: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn()
        };
        
        settingsManager = {
            set: jest.fn(),
            get: jest.fn()
        };
        
        // Mock error handler with accessibility features
        const errorHandler = {
            showError: jest.fn(),
            showSuccess: jest.fn(),
            showWarning: jest.fn(),
            announceToScreenReader: jest.fn()
        };
        
        core.get.mockImplementation((module) => {
            if (module === 'error') return errorHandler;
            return null;
        });
        
        // Create form binder instance
        formBinder = new LASFormElementBinder(core, settingsManager);
    });
    
    afterEach(() => {
        if (mockContainer.parentNode) {
            document.body.removeChild(mockContainer);
        }
        jest.clearAllMocks();
    });
    
    describe('ARIA Attributes and Labels', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should preserve existing ARIA labels', () => {
            const colorInput = document.getElementById('menu_color');
            expect(colorInput.getAttribute('aria-labelledby')).toBe('menu_color_label');
        });
        
        test('should add ARIA labels to elements without them', () => {
            // Remove existing aria-labelledby to test auto-generation
            const urlInput = document.getElementById('logo_url');
            urlInput.removeAttribute('aria-labelledby');
            
            // Also remove the label to force aria-label generation
            const label = document.getElementById('logo_url_label');
            if (label) {
                label.remove();
            }
            
            formBinder.setupAccessibilityFeatures();
            
            expect(urlInput.getAttribute('aria-label')).toBeTruthy();
        });
        
        test('should handle required fields properly', () => {
            const requiredInput = document.getElementById('site_title');
            expect(requiredInput.getAttribute('aria-required')).toBe('true');
        });
        
        test('should associate help text with form controls', () => {
            const colorInput = document.getElementById('menu_color');
            const helpId = colorInput.getAttribute('aria-describedby');
            expect(helpId).toContain('menu_color_help');
            
            const helpElement = document.getElementById('menu_color_help');
            expect(helpElement).toBeTruthy();
        });
    });
    
    describe('Form Validation with Screen Reader Support', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should show accessible error messages', () => {
            const urlInput = document.getElementById('logo_url');
            
            // Trigger validation with invalid URL
            urlInput.value = 'invalid-url';
            urlInput.dispatchEvent(new Event('blur'));
            
            // Check that error element has proper ARIA attributes
            const errorElement = document.querySelector('.las-field-error');
            expect(errorElement).toBeTruthy();
            expect(errorElement.getAttribute('role')).toBe('alert');
            expect(errorElement.getAttribute('aria-live')).toBe('polite');
            
            // Check that input is marked as invalid
            expect(urlInput.getAttribute('aria-invalid')).toBe('true');
            expect(urlInput.classList.contains('las-field-invalid')).toBe(true);
        });
        
        test('should clear error states properly', () => {
            const urlInput = document.getElementById('logo_url');
            
            // Show error first
            formBinder.showFieldError(urlInput, 'Invalid URL');
            expect(urlInput.getAttribute('aria-invalid')).toBe('true');
            
            // Clear error
            formBinder.clearFieldError(urlInput);
            expect(urlInput.getAttribute('aria-invalid')).toBeNull();
            expect(urlInput.classList.contains('las-field-invalid')).toBe(false);
        });
        
        test('should validate color values with proper feedback', () => {
            const colorInput = document.getElementById('menu_color');
            
            // Valid color
            expect(formBinder.validateField(colorInput, '#ff0000')).toBe(true);
            expect(formBinder.validateField(colorInput, 'rgb(255, 0, 0)')).toBe(true);
            expect(formBinder.validateField(colorInput, 'rgba(255, 0, 0, 0.5)')).toBe(true);
            
            // Invalid color should show error
            expect(formBinder.validateField(colorInput, 'not-a-color')).toBe(false);
        });
        
        test('should validate URL values with proper feedback', () => {
            const urlInput = document.getElementById('logo_url');
            
            // Valid URLs
            expect(formBinder.validateField(urlInput, 'https://example.com')).toBe(true);
            expect(formBinder.validateField(urlInput, 'http://test.org/path')).toBe(true);
            
            // Invalid URL should show error
            expect(formBinder.validateField(urlInput, 'not-a-url')).toBe(false);
        });
        
        test('should validate number ranges with proper feedback', () => {
            const numberInput = document.getElementById('font_size');
            
            // Valid numbers within range
            expect(formBinder.validateField(numberInput, 16, 10, 72)).toBe(true);
            expect(formBinder.validateField(numberInput, 10, 10, 72)).toBe(true);
            expect(formBinder.validateField(numberInput, 72, 10, 72)).toBe(true);
            
            // Invalid numbers outside range
            expect(formBinder.validateField(numberInput, 5, 10, 72)).toBe(false);
            expect(formBinder.validateField(numberInput, 100, 10, 72)).toBe(false);
        });
        
        test('should validate CSS content for security', () => {
            const cssTextarea = document.getElementById('custom_css');
            
            // Valid CSS
            expect(formBinder.validateField(cssTextarea, 'body { color: red; }')).toBe(true);
            expect(formBinder.validateField(cssTextarea, '.class { margin: 10px; }')).toBe(true);
            
            // Invalid CSS with dangerous content
            expect(formBinder.validateField(cssTextarea, 'body { background: url(javascript:alert(1)); }')).toBe(false);
            expect(formBinder.validateField(cssTextarea, 'body { behavior: url(evil.htc); }')).toBe(false);
            expect(formBinder.validateField(cssTextarea, '@import url(malicious.css);')).toBe(false);
        });
    });
    
    describe('Keyboard Navigation and Focus Management', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should handle keyboard shortcuts', () => {
            const saveAllSpy = jest.spyOn(formBinder, 'saveAllSettings').mockImplementation(() => {});
            
            // Simulate Ctrl+S
            const event = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true
            });
            
            document.dispatchEvent(event);
            
            expect(saveAllSpy).toHaveBeenCalled();
        });
        
        test('should handle Escape key to clear errors', () => {
            const urlInput = document.getElementById('logo_url');
            
            // Show error first
            formBinder.showFieldError(urlInput, 'Test error');
            expect(urlInput.classList.contains('las-field-invalid')).toBe(true);
            
            // Focus the input
            urlInput.focus();
            
            // Simulate Escape key
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true
            });
            
            document.dispatchEvent(event);
            
            // Error should be cleared
            expect(urlInput.classList.contains('las-field-invalid')).toBe(false);
        });
        
        test('should manage focus properly for error states', () => {
            const urlInput = document.getElementById('logo_url');
            
            // Show error
            formBinder.showFieldError(urlInput, 'Invalid URL');
            
            // Error element should be properly associated
            const errorId = urlInput.getAttribute('aria-describedby');
            expect(errorId).toContain('logo_url-error');
            
            const errorElement = document.getElementById('logo_url-error');
            expect(errorElement).toBeTruthy();
        });
    });
    
    describe('Live Regions and Announcements', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should announce validation errors to screen readers', () => {
            const urlInput = document.getElementById('logo_url');
            const errorHandler = core.get('error');
            
            // Trigger validation error
            formBinder.showFieldError(urlInput, 'Please enter a valid URL');
            
            // Should show error notification
            expect(errorHandler.showError).toHaveBeenCalledWith(
                'Validation error: Please enter a valid URL',
                { duration: 3000 }
            );
        });
        
        test('should use proper ARIA live regions', () => {
            const liveRegion = document.getElementById('form-announcements');
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
        });
    });
    
    describe('Form Field Types and Validation', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should handle required field validation', () => {
            const requiredInput = document.getElementById('site_title');
            
            // Empty required field should be invalid
            requiredInput.value = '';
            requiredInput.dispatchEvent(new Event('blur'));
            
            // Should be marked as required
            expect(requiredInput.getAttribute('aria-required')).toBe('true');
        });
        
        test('should handle select field validation', () => {
            const selectField = document.getElementById('theme_style');
            
            // Valid selection
            selectField.value = 'modern';
            selectField.dispatchEvent(new Event('change'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('theme_style', 'modern');
        });
        
        test('should handle radio button groups', () => {
            const radioLight = document.getElementById('color_light');
            const radioDark = document.getElementById('color_dark');
            
            // Select light theme
            radioLight.checked = true;
            radioLight.dispatchEvent(new Event('change'));
            
            expect(settingsManager.set).toHaveBeenCalledWith('color_scheme', 'light');
        });
        
        test('should handle textarea with character limits', () => {
            const textarea = document.getElementById('custom_css');
            const maxLength = parseInt(textarea.getAttribute('maxlength'));
            
            expect(maxLength).toBe(5000);
            
            // Should handle normal input
            textarea.value = 'body { color: red; }';
            textarea.dispatchEvent(new Event('input'));
            
            // Should be debounced
            expect(settingsManager.set).not.toHaveBeenCalled();
        });
    });
    
    describe('Error Message Accessibility', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should create accessible error messages', () => {
            const input = document.getElementById('logo_url');
            const errorMessage = 'Please enter a valid URL';
            
            formBinder.showFieldError(input, errorMessage);
            
            const errorElement = document.querySelector('.las-field-error');
            expect(errorElement).toBeTruthy();
            expect(errorElement.textContent).toBe(errorMessage);
            expect(errorElement.getAttribute('role')).toBe('alert');
            expect(errorElement.getAttribute('aria-live')).toBe('polite');
        });
        
        test('should associate error messages with form controls', () => {
            const input = document.getElementById('logo_url');
            
            formBinder.showFieldError(input, 'Test error');
            
            const errorId = input.getAttribute('aria-describedby');
            expect(errorId).toContain('logo_url-error');
            
            const errorElement = document.getElementById('logo_url-error');
            expect(errorElement).toBeTruthy();
        });
        
        test('should remove error associations when cleared', () => {
            const input = document.getElementById('logo_url');
            
            // Show error
            formBinder.showFieldError(input, 'Test error');
            expect(input.getAttribute('aria-describedby')).toContain('logo_url-error');
            
            // Clear error
            formBinder.clearFieldError(input);
            expect(input.getAttribute('aria-describedby')).toBeNull();
        });
    });
    
    describe('Fieldset and Legend Support', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should properly handle fieldset groupings', () => {
            const fieldset = document.querySelector('fieldset');
            const legend = fieldset.querySelector('legend');
            
            expect(fieldset).toBeTruthy();
            expect(legend).toBeTruthy();
            expect(legend.textContent).toBe('Color Scheme Options');
        });
        
        test('should bind radio buttons within fieldsets', () => {
            const radioLight = document.getElementById('color_light');
            const radioDark = document.getElementById('color_dark');
            
            expect(formBinder.boundElements.has('color_scheme')).toBe(true);
            
            // Both radio buttons should have the same name
            expect(radioLight.name).toBe('color_scheme');
            expect(radioDark.name).toBe('color_scheme');
        });
    });
    
    describe('Progressive Enhancement', () => {
        test('should work without JavaScript enhancements', () => {
            // Form should still be functional without JavaScript
            const form = document.getElementById('test-form');
            expect(form.getAttribute('role')).toBe('form');
            expect(form.getAttribute('aria-label')).toBe('Settings Form');
        });
        
        test('should enhance existing form elements', () => {
            // Before binding
            const colorInput = document.getElementById('menu_color');
            expect(colorInput.classList.contains('las-field')).toBe(false);
            
            // After binding
            formBinder.bindAllElements();
            
            // Should be enhanced but still functional
            expect(formBinder.boundElements.has('menu_color')).toBe(true);
        });
    });
    
    describe('Screen Reader Compatibility', () => {
        beforeEach(() => {
            formBinder.bindAllElements();
        });
        
        test('should provide screen reader friendly error messages', () => {
            const input = document.getElementById('logo_url');
            
            formBinder.showFieldError(input, 'URL must start with http:// or https://');
            
            const errorElement = document.querySelector('.las-field-error');
            expect(errorElement.getAttribute('role')).toBe('alert');
            expect(errorElement.getAttribute('aria-live')).toBe('polite');
        });
        
        test('should use appropriate ARIA roles', () => {
            const form = document.getElementById('test-form');
            expect(form.getAttribute('role')).toBe('form');
            
            const liveRegion = document.getElementById('form-announcements');
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
        });
        
        test('should provide context for form controls', () => {
            const colorInput = document.getElementById('menu_color');
            const helpText = document.getElementById('menu_color_help');
            
            expect(colorInput.getAttribute('aria-describedby')).toContain('menu_color_help');
            expect(helpText.textContent).toBe('Choose your menu background color');
        });
    });
});