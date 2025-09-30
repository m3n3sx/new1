/**
 * Live Admin Styler - Color Picker Integration
 * 
 * Integration layer for the color picker component with the existing
 * Live Admin Styler admin interface.
 */

class LASColorPickerIntegration {
    constructor() {
        this.colorPickers = new Map();
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeColorPickers());
        } else {
            this.initializeColorPickers();
        }
    }
    
    initializeColorPickers() {
        // Find all color input fields in the admin interface
        const colorInputs = document.querySelectorAll('input[type="color"], .las-color-field');
        
        colorInputs.forEach(input => {
            this.enhanceColorInput(input);
        });
        
        // Initialize color pickers for specific admin settings
        this.initializeAdminColorPickers();
    }
    
    enhanceColorInput(input) {
        // Skip if already enhanced
        if (input.dataset.lasEnhanced) return;
        
        // Create wrapper container
        const wrapper = document.createElement('div');
        wrapper.className = 'las-color-input-wrapper';
        
        // Insert wrapper before input
        input.parentNode.insertBefore(wrapper, input);
        
        // Move input into wrapper (hidden)
        wrapper.appendChild(input);
        input.style.display = 'none';
        
        // Get initial color value
        const initialColor = input.value || '#2271b1';
        
        // Create color picker
        const colorPicker = new LASColorPicker(wrapper, {
            defaultColor: initialColor,
            showPalette: true,
            showContrast: true,
            palette: this.getAdminColorPalette()
        });
        
        // Store reference
        this.colorPickers.set(input.id || input.name, colorPicker);
        
        // Sync color picker with original input
        wrapper.addEventListener('las-color-change', (e) => {
            input.value = e.detail.color;
            
            // Trigger change event on original input
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Update live preview if available
            this.updateLivePreview(input, e.detail.color);
        });
        
        // Mark as enhanced
        input.dataset.lasEnhanced = 'true';
    }
    
    initializeAdminColorPickers() {
        // Define admin color field mappings
        const adminColorFields = [
            {
                selector: '#menu_bg_color',
                label: 'Menu Background Color',
                palette: this.getMenuColorPalette()
            },
            {
                selector: '#menu_text_color',
                label: 'Menu Text Color',
                palette: this.getTextColorPalette()
            },
            {
                selector: '#adminbar_bg_color',
                label: 'Admin Bar Background Color',
                palette: this.getAdminBarColorPalette()
            },
            {
                selector: '#body_bg_color',
                label: 'Body Background Color',
                palette: this.getBackgroundColorPalette()
            }
        ];
        
        adminColorFields.forEach(field => {
            const element = document.querySelector(field.selector);
            if (element) {
                this.createAdminColorPicker(element, field);
            }
        });
    }
    
    createAdminColorPicker(element, config) {
        // Create container for the color picker
        const container = document.createElement('div');
        container.className = 'las-admin-color-picker';
        
        // Insert container after the element
        element.parentNode.insertBefore(container, element.nextSibling);
        
        // Hide original element
        element.style.display = 'none';
        
        // Create color picker with admin-specific configuration
        const colorPicker = new LASColorPicker(container, {
            defaultColor: element.value || '#2271b1',
            showPalette: true,
            showContrast: true,
            palette: config.palette || this.getAdminColorPalette()
        });
        
        // Store reference
        this.colorPickers.set(element.id, colorPicker);
        
        // Sync with original element
        container.addEventListener('las-color-change', (e) => {
            element.value = e.detail.color;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Update live preview
            this.updateLivePreview(element, e.detail.color);
            
            // Log for debugging
            console.log(`Admin color changed: ${element.id} = ${e.detail.color}`);
        });
        
        // Add label if provided
        if (config.label) {
            const label = document.createElement('label');
            label.textContent = config.label;
            label.className = 'las-color-picker-label';
            container.parentNode.insertBefore(label, container);
        }
    }
    
    updateLivePreview(input, color) {
        // Integration with existing live preview system
        if (typeof window.las_live_preview !== 'undefined') {
            // Trigger live preview update
            window.las_live_preview.updateColor(input.id, color);
        }
        
        // Direct CSS updates for immediate feedback
        this.applyDirectColorUpdate(input.id, color);
    }
    
    applyDirectColorUpdate(fieldId, color) {
        // Apply color changes directly to preview elements
        const updates = {
            'menu_bg_color': () => {
                const menuElements = document.querySelectorAll('#adminmenu, .wp-admin #adminmenu');
                menuElements.forEach(el => el.style.backgroundColor = color);
            },
            'menu_text_color': () => {
                const textElements = document.querySelectorAll('#adminmenu a, #adminmenu .wp-menu-name');
                textElements.forEach(el => el.style.color = color);
            },
            'adminbar_bg_color': () => {
                const barElements = document.querySelectorAll('#wpadminbar');
                barElements.forEach(el => el.style.backgroundColor = color);
            },
            'body_bg_color': () => {
                document.body.style.backgroundColor = color;
            }
        };
        
        if (updates[fieldId]) {
            updates[fieldId]();
        }
    }
    
    // Color palette definitions
    getAdminColorPalette() {
        return [
            '#2271b1', '#135e96', '#0073aa', '#005177',
            '#72aee6', '#4f94d4', '#3582c4', '#1e40af',
            '#d63638', '#b32d2e', '#8a2424', '#691a1a',
            '#00a32a', '#007017', '#005a1f', '#004515',
            '#dba617', '#b8860b', '#996b0b', '#7a5208',
            '#6366f1', '#4f46e5', '#4338ca', '#3730a3'
        ];
    }
    
    getMenuColorPalette() {
        return [
            '#23282d', '#32373c', '#1e1e1e', '#2c3338',
            '#0073aa', '#2271b1', '#135e96', '#005177',
            '#464646', '#606060', '#787c82', '#8f98a1',
            '#ffffff', '#f9f9f9', '#f1f1f1', '#e5e5e5'
        ];
    }
    
    getTextColorPalette() {
        return [
            '#ffffff', '#f9f9f9', '#f1f1f1', '#e5e5e5',
            '#d4d4d4', '#a3a3a3', '#737373', '#525252',
            '#404040', '#262626', '#171717', '#000000',
            '#2271b1', '#0073aa', '#d63638', '#00a32a'
        ];
    }
    
    getAdminBarColorPalette() {
        return [
            '#23282d', '#32373c', '#1e1e1e', '#2c3338',
            '#0073aa', '#2271b1', '#135e96', '#005177',
            '#464646', '#606060', '#787c82', '#8f98a1',
            '#d63638', '#b32d2e', '#00a32a', '#007017'
        ];
    }
    
    getBackgroundColorPalette() {
        return [
            '#ffffff', '#f9f9f9', '#f1f1f1', '#e5e5e5',
            '#d4d4d4', '#c5c5c5', '#b6b6b6', '#a7a7a7',
            '#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc',
            '#fef3c7', '#fde68a', '#fcd34d', '#f59e0b'
        ];
    }
    
    // Public API methods
    getColorPicker(id) {
        return this.colorPickers.get(id);
    }
    
    updateColorPicker(id, color) {
        const picker = this.colorPickers.get(id);
        if (picker) {
            picker.setValue(color);
        }
    }
    
    getAllColors() {
        const colors = {};
        this.colorPickers.forEach((picker, id) => {
            colors[id] = picker.getValue();
        });
        return colors;
    }
    
    destroy() {
        // Clean up all color pickers
        this.colorPickers.forEach(picker => {
            picker.destroy();
        });
        this.colorPickers.clear();
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.LASColorPickerIntegration = LASColorPickerIntegration;
    
    // Initialize integration
    window.las_color_picker_integration = new LASColorPickerIntegration();
    
    console.log('🎨 LAS Color Picker Integration initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LASColorPickerIntegration;
}