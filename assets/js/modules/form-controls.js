/**
 * FormControls - Advanced form controls with modern styling
 * Implements Material Design 3 inspired form components with 8px grid system
 */
export default class FormControls {
    constructor(core) {
        this.core = core;
        this.controls = new Map();
        this.validators = new Map();
        this.themes = {
            light: 'las-form-light',
            dark: 'las-form-dark',
            auto: 'las-form-auto'
        };
        this.currentTheme = 'auto';
        
        this.init();
    }

    /**
     * Initialize the form controls system
     */
    init() {
        this.setupDefaultValidators();
        this.setupThemeDetection();
        this.setupEventListeners();
        this.core.on('form-controls:ready', this.render.bind(this));
        this.core.emit('form-controls:initialized');
    }

    /**
     * Create a form container with 8px grid system
     */
    createForm(parentElement, config = {}) {
        const {
            id = `form-${Date.now()}`,
            className = '',
            layout = 'vertical', // 'vertical', 'horizontal', 'grid'
            columns = 1,
            gap = '24px', // 3 * 8px grid
            validation = true,
            theme = 'auto'
        } = config;

        const form = document.createElement('form');
        form.className = `las-form las-form-${layout} ${this.themes[theme]} ${className}`.trim();
        form.setAttribute('data-form-id', id);
        form.setAttribute('novalidate', ''); // Use custom validation
        
        // Set CSS custom properties for 8px grid
        form.style.setProperty('--las-form-gap', gap);
        form.style.setProperty('--las-form-columns', columns);
        
        parentElement.appendChild(form);
        
        const formData = {
            id,
            element: form,
            layout,
            columns,
            gap,
            validation,
            theme,
            controls: [],
            errors: new Map()
        };
        
        this.controls.set(id, formData);
        
        // Add form event listeners
        this.addFormEventListeners(form, formData);
        
        this.core.emit('form-controls:form-created', { formId: id });
        
        return formData;
    }

    /**
     * Create a text input field
     */
    createTextField(formId, config) {
        const {
            id = `field-${Date.now()}`,
            label = '',
            placeholder = '',
            value = '',
            type = 'text', // 'text', 'email', 'password', 'url', 'tel'
            required = false,
            disabled = false,
            readonly = false,
            variant = 'outlined', // 'filled', 'outlined'
            size = 'medium', // 'small', 'medium', 'large'
            helperText = '',
            errorText = '',
            maxLength = null,
            pattern = null,
            validation = null,
            className = ''
        } = config;

        const form = this.controls.get(formId);
        if (!form) {
            console.error(`Form with id "${formId}" not found`);
            return null;
        }

        const fieldContainer = document.createElement('div');
        fieldContainer.className = `las-field las-field-${variant} las-field-${size} ${className}`.trim();
        fieldContainer.setAttribute('data-field-id', id);
        
        if (disabled) {
            fieldContainer.classList.add('las-field-disabled');
        }
        
        if (readonly) {
            fieldContainer.classList.add('las-field-readonly');
        }

        // Build field structure
        let fieldHTML = '';
        
        // Label
        if (label) {
            fieldHTML += `
                <label class="las-field-label" for="${id}">
                    ${label}
                    ${required ? '<span class="las-field-required" aria-label="required">*</span>' : ''}
                </label>
            `;
        }
        
        // Input container
        fieldHTML += '<div class="las-field-input-container">';
        
        // Input element
        fieldHTML += `
            <input
                type="${type}"
                id="${id}"
                class="las-field-input"
                placeholder="${placeholder}"
                value="${value}"
                ${required ? 'required' : ''}
                ${disabled ? 'disabled' : ''}
                ${readonly ? 'readonly' : ''}
                ${maxLength ? `maxlength="${maxLength}"` : ''}
                ${pattern ? `pattern="${pattern}"` : ''}
                aria-describedby="${id}-helper ${id}-error"
            />
        `;
        
        // Focus indicator
        fieldHTML += '<div class="las-field-focus-indicator"></div>';
        
        fieldHTML += '</div>';
        
        // Helper text
        if (helperText) {
            fieldHTML += `<div id="${id}-helper" class="las-field-helper">${helperText}</div>`;
        }
        
        // Error text
        fieldHTML += `<div id="${id}-error" class="las-field-error" role="alert" aria-live="polite"></div>`;
        
        fieldContainer.innerHTML = fieldHTML;
        
        // Add to form
        form.element.appendChild(fieldContainer);
        
        const fieldData = {
            id,
            type: 'text',
            element: fieldContainer,
            input: fieldContainer.querySelector('.las-field-input'),
            label,
            required,
            validation,
            value
        };
        
        form.controls.push(fieldData);
        
        // Add field event listeners
        this.addFieldEventListeners(fieldData);
        
        this.core.emit('form-controls:field-created', { formId, fieldId: id });
        
        return fieldData;
    }

    /**
     * Create a slider control
     */
    createSlider(formId, config) {
        const {
            id = `slider-${Date.now()}`,
            label = '',
            min = 0,
            max = 100,
            value = 50,
            step = 1,
            disabled = false,
            showValue = true,
            unit = '',
            variant = 'continuous', // 'continuous', 'discrete'
            size = 'medium',
            className = ''
        } = config;

        const form = this.controls.get(formId);
        if (!form) {
            console.error(`Form with id "${formId}" not found`);
            return null;
        }

        const sliderContainer = document.createElement('div');
        sliderContainer.className = `las-slider las-slider-${variant} las-slider-${size} ${className}`.trim();
        sliderContainer.setAttribute('data-slider-id', id);
        
        if (disabled) {
            sliderContainer.classList.add('las-slider-disabled');
        }

        let sliderHTML = '';
        
        // Label and value display
        if (label || showValue) {
            sliderHTML += '<div class="las-slider-header">';
            if (label) {
                sliderHTML += `<label class="las-slider-label" for="${id}">${label}</label>`;
            }
            if (showValue) {
                sliderHTML += `<span class="las-slider-value">${value}${unit}</span>`;
            }
            sliderHTML += '</div>';
        }
        
        // Slider track container
        sliderHTML += `
            <div class="las-slider-container">
                <input
                    type="range"
                    id="${id}"
                    class="las-slider-input"
                    min="${min}"
                    max="${max}"
                    value="${value}"
                    step="${step}"
                    ${disabled ? 'disabled' : ''}
                    aria-valuemin="${min}"
                    aria-valuemax="${max}"
                    aria-valuenow="${value}"
                />
                <div class="las-slider-track">
                    <div class="las-slider-track-inactive"></div>
                    <div class="las-slider-track-active"></div>
                </div>
                <div class="las-slider-thumb"></div>
            </div>
        `;
        
        sliderContainer.innerHTML = sliderHTML;
        
        // Add to form
        form.element.appendChild(sliderContainer);
        
        const sliderData = {
            id,
            type: 'slider',
            element: sliderContainer,
            input: sliderContainer.querySelector('.las-slider-input'),
            min,
            max,
            step,
            unit,
            showValue
        };
        
        form.controls.push(sliderData);
        
        // Add slider event listeners
        this.addSliderEventListeners(sliderData);
        
        this.core.emit('form-controls:slider-created', { formId, sliderId: id });
        
        return sliderData;
    }

    /**
     * Create a toggle switch
     */
    createToggle(formId, config) {
        const {
            id = `toggle-${Date.now()}`,
            label = '',
            checked = false,
            disabled = false,
            size = 'medium',
            variant = 'switch', // 'switch', 'checkbox'
            className = ''
        } = config;

        const form = this.controls.get(formId);
        if (!form) {
            console.error(`Form with id "${formId}" not found`);
            return null;
        }

        const toggleContainer = document.createElement('div');
        toggleContainer.className = `las-toggle las-toggle-${variant} las-toggle-${size} ${className}`.trim();
        toggleContainer.setAttribute('data-toggle-id', id);
        
        if (disabled) {
            toggleContainer.classList.add('las-toggle-disabled');
        }

        let toggleHTML = `
            <label class="las-toggle-container" for="${id}">
                <input
                    type="checkbox"
                    id="${id}"
                    class="las-toggle-input"
                    ${checked ? 'checked' : ''}
                    ${disabled ? 'disabled' : ''}
                />
                <span class="las-toggle-track">
                    <span class="las-toggle-thumb"></span>
                </span>
                ${label ? `<span class="las-toggle-label">${label}</span>` : ''}
            </label>
        `;
        
        toggleContainer.innerHTML = toggleHTML;
        
        // Add to form
        form.element.appendChild(toggleContainer);
        
        const toggleData = {
            id,
            type: 'toggle',
            element: toggleContainer,
            input: toggleContainer.querySelector('.las-toggle-input'),
            label,
            checked
        };
        
        form.controls.push(toggleData);
        
        // Add toggle event listeners
        this.addToggleEventListeners(toggleData);
        
        this.core.emit('form-controls:toggle-created', { formId, toggleId: id });
        
        return toggleData;
    }

    /**
     * Create a button
     */
    createButton(formId, config) {
        const {
            id = `button-${Date.now()}`,
            label = 'Button',
            type = 'button', // 'button', 'submit', 'reset'
            variant = 'filled', // 'filled', 'outlined', 'text'
            size = 'medium',
            disabled = false,
            loading = false,
            icon = null,
            iconPosition = 'left', // 'left', 'right'
            onClick = null,
            className = ''
        } = config;

        const form = this.controls.get(formId);
        if (!form) {
            console.error(`Form with id "${formId}" not found`);
            return null;
        }

        const button = document.createElement('button');
        button.className = `las-button las-button-${variant} las-button-${size} ${className}`.trim();
        button.setAttribute('data-button-id', id);
        button.type = type;
        button.disabled = disabled;
        
        if (loading) {
            button.classList.add('las-button-loading');
            button.setAttribute('aria-busy', 'true');
        }

        // Build button content
        let buttonHTML = '';
        
        if (loading) {
            buttonHTML += '<span class="las-button-spinner"></span>';
        }
        
        if (icon && iconPosition === 'left') {
            buttonHTML += `<span class="las-button-icon las-button-icon-left">${icon}</span>`;
        }
        
        buttonHTML += `<span class="las-button-label">${label}</span>`;
        
        if (icon && iconPosition === 'right') {
            buttonHTML += `<span class="las-button-icon las-button-icon-right">${icon}</span>`;
        }
        
        button.innerHTML = buttonHTML;
        
        // Add to form
        form.element.appendChild(button);
        
        const buttonData = {
            id,
            type: 'button',
            element: button,
            label,
            onClick
        };
        
        form.controls.push(buttonData);
        
        // Add button event listeners
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        
        this.core.emit('form-controls:button-created', { formId, buttonId: id });
        
        return buttonData;
    }

    /**
     * Add form event listeners
     */
    addFormEventListeners(formElement, formData) {
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (formData.validation) {
                const isValid = this.validateForm(formData.id);
                if (!isValid) {
                    return;
                }
            }
            
            const formValues = this.getFormValues(formData.id);
            this.core.emit('form-controls:form-submitted', {
                formId: formData.id,
                values: formValues
            });
        });
    }

    /**
     * Add field event listeners
     */
    addFieldEventListeners(fieldData) {
        const input = fieldData.input;
        
        // Focus/blur events for styling
        input.addEventListener('focus', () => {
            fieldData.element.classList.add('las-field-focused');
        });
        
        input.addEventListener('blur', () => {
            fieldData.element.classList.remove('las-field-focused');
            
            // Validate on blur if validation is enabled
            if (fieldData.validation) {
                this.validateField(fieldData.id);
            }
        });
        
        // Input event for real-time updates
        input.addEventListener('input', (e) => {
            fieldData.value = e.target.value;
            
            // Clear error state on input
            this.clearFieldError(fieldData.id);
            
            this.core.emit('form-controls:field-changed', {
                fieldId: fieldData.id,
                value: e.target.value
            });
        });
    }

    /**
     * Add slider event listeners
     */
    addSliderEventListeners(sliderData) {
        const input = sliderData.input;
        const valueDisplay = sliderData.element.querySelector('.las-slider-value');
        const activeTrack = sliderData.element.querySelector('.las-slider-track-active');
        const thumb = sliderData.element.querySelector('.las-slider-thumb');
        
        const updateSlider = () => {
            const value = parseFloat(input.value);
            const percentage = ((value - sliderData.min) / (sliderData.max - sliderData.min)) * 100;
            
            // Update visual elements
            if (activeTrack) {
                activeTrack.style.width = `${percentage}%`;
            }
            
            if (thumb) {
                thumb.style.left = `${percentage}%`;
            }
            
            if (valueDisplay && sliderData.showValue) {
                valueDisplay.textContent = `${value}${sliderData.unit}`;
            }
            
            // Update ARIA attributes
            input.setAttribute('aria-valuenow', value);
        };
        
        input.addEventListener('input', (e) => {
            updateSlider();
            
            this.core.emit('form-controls:slider-changed', {
                sliderId: sliderData.id,
                value: parseFloat(e.target.value)
            });
        });
        
        // Initialize slider appearance
        updateSlider();
    }

    /**
     * Add toggle event listeners
     */
    addToggleEventListeners(toggleData) {
        const input = toggleData.input;
        
        input.addEventListener('change', (e) => {
            toggleData.checked = e.target.checked;
            
            this.core.emit('form-controls:toggle-changed', {
                toggleId: toggleData.id,
                checked: e.target.checked
            });
        });
    }

    /**
     * Setup default validators
     */
    setupDefaultValidators() {
        this.validators.set('required', (value) => {
            return value && value.trim().length > 0 ? null : 'This field is required';
        });
        
        this.validators.set('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return !value || emailRegex.test(value) ? null : 'Please enter a valid email address';
        });
        
        this.validators.set('minLength', (value, minLength) => {
            return !value || value.length >= minLength ? null : `Minimum ${minLength} characters required`;
        });
        
        this.validators.set('maxLength', (value, maxLength) => {
            return !value || value.length <= maxLength ? null : `Maximum ${maxLength} characters allowed`;
        });
        
        this.validators.set('pattern', (value, pattern) => {
            const regex = new RegExp(pattern);
            return !value || regex.test(value) ? null : 'Please enter a valid format';
        });
    }

    /**
     * Validate a single field
     */
    validateField(fieldId) {
        const form = Array.from(this.controls.values()).find(f => 
            f.controls.some(c => c.id === fieldId)
        );
        
        if (!form) return true;
        
        const field = form.controls.find(c => c.id === fieldId);
        if (!field || !field.validation) return true;
        
        const value = field.input.value;
        let error = null;
        
        // Required validation
        if (field.required) {
            error = this.validators.get('required')(value);
            if (error) {
                this.setFieldError(fieldId, error);
                return false;
            }
        }
        
        // Custom validation
        if (field.validation && typeof field.validation === 'function') {
            error = field.validation(value);
            if (error) {
                this.setFieldError(fieldId, error);
                return false;
            }
        }
        
        this.clearFieldError(fieldId);
        return true;
    }

    /**
     * Validate entire form
     */
    validateForm(formId) {
        const form = this.controls.get(formId);
        if (!form) return true;
        
        let isValid = true;
        
        form.controls.forEach(control => {
            if (control.type === 'text' && !this.validateField(control.id)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    /**
     * Set field error
     */
    setFieldError(fieldId, errorMessage) {
        const form = Array.from(this.controls.values()).find(f => 
            f.controls.some(c => c.id === fieldId)
        );
        
        if (!form) return;
        
        const field = form.controls.find(c => c.id === fieldId);
        if (!field) return;
        
        field.element.classList.add('las-field-error');
        
        const errorElement = field.element.querySelector('.las-field-error');
        if (errorElement) {
            errorElement.textContent = errorMessage;
        }
        
        form.errors.set(fieldId, errorMessage);
    }

    /**
     * Clear field error
     */
    clearFieldError(fieldId) {
        const form = Array.from(this.controls.values()).find(f => 
            f.controls.some(c => c.id === fieldId)
        );
        
        if (!form) return;
        
        const field = form.controls.find(c => c.id === fieldId);
        if (!field) return;
        
        field.element.classList.remove('las-field-error');
        
        const errorElement = field.element.querySelector('.las-field-error');
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        form.errors.delete(fieldId);
    }

    /**
     * Get form values
     */
    getFormValues(formId) {
        const form = this.controls.get(formId);
        if (!form) return {};
        
        const values = {};
        
        form.controls.forEach(control => {
            switch (control.type) {
                case 'text':
                    values[control.id] = control.input.value;
                    break;
                case 'slider':
                    values[control.id] = parseFloat(control.input.value);
                    break;
                case 'toggle':
                    values[control.id] = control.input.checked;
                    break;
            }
        });
        
        return values;
    }

    /**
     * Setup theme detection
     */
    setupThemeDetection() {
        if (typeof window === 'undefined') return;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const updateTheme = (e) => {
            if (this.currentTheme === 'auto') {
                document.body.classList.toggle('las-form-dark-theme', e.matches);
                document.body.classList.toggle('las-form-light-theme', !e.matches);
            }
        };
        
        mediaQuery.addListener(updateTheme);
        updateTheme(mediaQuery);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle reduced motion preference
        if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            const handleReducedMotion = (e) => {
                document.body.classList.toggle('las-form-reduced-motion', e.matches);
            };
            
            mediaQuery.addListener(handleReducedMotion);
            handleReducedMotion(mediaQuery);
        }
    }

    /**
     * Update control value
     */
    updateControl(controlId, value) {
        const form = Array.from(this.controls.values()).find(f => 
            f.controls.some(c => c.id === controlId)
        );
        
        if (!form) return;
        
        const control = form.controls.find(c => c.id === controlId);
        if (!control) return;
        
        switch (control.type) {
            case 'text':
                control.input.value = value;
                control.value = value;
                break;
            case 'slider':
                control.input.value = value;
                // Trigger input event to update visual elements
                control.input.dispatchEvent(new Event('input'));
                break;
            case 'toggle':
                control.input.checked = value;
                control.checked = value;
                break;
        }
    }

    /**
     * Render form controls
     */
    render() {
        // Apply theme classes
        this.setupThemeDetection();
    }

    /**
     * Destroy form controls system
     */
    destroy() {
        this.controls.forEach(form => {
            form.element.remove();
        });
        
        this.controls.clear();
        this.validators.clear();
        
        this.core.emit('form-controls:destroyed');
    }
}