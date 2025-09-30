/**
 * Live Admin Styler - Enhanced Live Preview JavaScript
 * Optimized version with proper event handling and memory management
 */

jQuery(document).ready(function($) {
    'use strict';
    
    console.log('LAS Enhanced Preview: Starting initialization...');
    
    // Check if required data is available
    if (typeof lasAdminData === 'undefined') {
        console.error('LAS: lasAdminData not available');
        return;
    }
    
    console.log('LAS: lasAdminData available:', lasAdminData);
    
    // Event namespace for proper cleanup
    var eventNamespace = '.las-live-preview';
    
    // Memory management - store references for cleanup
    var activeTimers = [];
    var activeRequests = [];
    
    // Forward declarations for functions used in initialization
    var updatePreview, updatePreviewDebounced;
    
    // Debounced update preview function for performance (defined early for use in init functions)
    updatePreviewDebounced = (function() {
        var timeout;
        return function(setting, value) {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                updatePreview(setting, value);
            }, 300);
            activeTimers.push(timeout);
        };
    })();
    
    // Initialize color pickers
    function initColorPickers() {
        console.log('LAS: Initializing color pickers...');
        
        $('.las-fresh-color-picker').each(function() {
            var $input = $(this);
            
            if (!$input.hasClass('wp-color-picker')) {
                try {
                    $input.wpColorPicker({
                        change: function(event, ui) {
                            var name = $input.attr('name');
                            var matches = name.match(/\[([^\]]+)\]$/);
                            if (matches) {
                                var setting = matches[1];
                                var value = ui.color.toString();
                                console.log('Color changed:', setting, '=', value);
                                updatePreviewDebounced(setting, value);
                            }
                        },
                        clear: function() {
                            var name = $input.attr('name');
                            var matches = name.match(/\[([^\]]+)\]$/);
                            if (matches) {
                                var setting = matches[1];
                                console.log('Color cleared:', setting);
                                updatePreview(setting, '');
                            }
                        }
                    });
                } catch (error) {
                    console.error('LAS: Error initializing color picker:', error);
                }
            }
        });
        
        console.log('LAS: Color pickers initialized');
    }
    
    // Initialize sliders
    function initSliders() {
        console.log('LAS: Initializing sliders...');
        
        $('.las-slider').each(function() {
            var $slider = $(this);
            var $input = $slider.siblings('input[type="number"]').first();
            
            if ($input.length === 0) {
                $input = $slider.parent().find('input[type="number"]').first();
            }
            
            if ($input.length === 0) {
                console.warn('LAS: No input found for slider');
                return;
            }
            
            var min = parseInt($input.attr('min')) || 0;
            var max = parseInt($input.attr('max')) || 100;
            var step = parseInt($input.attr('step')) || 1;
            var value = parseInt($input.val()) || min;
            
            console.log('LAS: Setting up slider for', $input.attr('name'), 'min:', min, 'max:', max, 'value:', value);
            
            // Check if jQuery UI slider is available
            if (typeof $.fn.slider === 'function' && lasAdminData.jquery_ui && lasAdminData.jquery_ui.slider) {
                try {
                    $slider.slider({
                        min: min,
                        max: max,
                        step: step,
                        value: value,
                        slide: function(event, ui) {
                            $input.val(ui.value);
                            
                            var name = $input.attr('name');
                            var matches = name.match(/\[([^\]]+)\]$/);
                            if (matches) {
                                var setting = matches[1];
                                console.log('Slider changed:', setting, '=', ui.value);
                                
                                // Debounce the update
                                clearTimeout(window.sliderTimeout);
                                window.sliderTimeout = setTimeout(function() {
                                    updatePreview(setting, ui.value);
                                }, 300);
                            }
                        }
                    });
                    
                    // Sync input changes back to slider with namespaced events
                    $input.on('input' + eventNamespace + ' change' + eventNamespace, function() {
                        var newValue = parseInt($(this).val()) || min;
                        newValue = Math.max(min, Math.min(max, newValue));
                        $slider.slider('value', newValue);
                    });
                    
                    console.log('LAS: jQuery UI slider initialized for', $input.attr('name'));
                } catch (error) {
                    console.error('LAS: Error initializing jQuery UI slider:', error);
                    initFallbackSlider($slider, $input);
                }
            } else {
                console.warn('LAS: jQuery UI slider not available, using fallback');
                initFallbackSlider($slider, $input);
            }
        });
        
        console.log('LAS: Sliders initialized');
    }
    
    // Fallback slider using HTML5 range input
    function initFallbackSlider($slider, $input) {
        $slider.hide();
        $input.attr('type', 'range').show().addClass('las-fallback-slider');
        
        $input.on('input' + eventNamespace + ' change' + eventNamespace, function() {
            var name = $(this).attr('name');
            var matches = name.match(/\[([^\]]+)\]$/);
            if (matches) {
                var setting = matches[1];
                var value = $(this).val();
                console.log('Fallback slider changed:', setting, '=', value);
                
                // Debounce the update
                clearTimeout(window.sliderTimeout);
                window.sliderTimeout = setTimeout(function() {
                    updatePreview(setting, value);
                }, 300);
            }
        });
        
        console.log('LAS: Fallback slider initialized for', $input.attr('name'));
    }
    
    // Enhanced update preview function with modern UI integration
    updatePreview = function(setting, value) {
        console.log('LAS: Updating preview for', setting, '=', value);
        
        // Dispatch preview start event for modern UI integration
        document.dispatchEvent(new CustomEvent('livepreview:start', {
            detail: { setting: setting, value: value }
        }));
        
        // Show modern loading states
        var loadingId = null;
        var fieldLoadingId = null;
        var $field = $('[name*="[' + setting + ']"]');
        
        // Use modern LoadingManager if available
        if (window.lasLoadingManager) {
            // Show field-specific loading
            if ($field.length) {
                fieldLoadingId = window.lasLoadingManager.showProgress($field.closest('.las-input-group'), {
                    value: null, // Indeterminate progress
                    height: 2
                });
                
                // Add modern field loading state
                $field.addClass('las-field-updating');
                
                // Add subtle loading animation to the field
                $field.css({
                    'background-image': 'linear-gradient(90deg, transparent 25%, rgba(34, 113, 177, 0.1) 50%, transparent 75%)',
                    'background-size': '200% 100%',
                    'animation': 'las-field-shimmer 1.5s infinite'
                });
            }
            
            // Show global preview loading overlay
            var previewContainer = $('.las-live-preview-container, .wrap').first();
            if (previewContainer.length) {
                loadingId = window.lasLoadingManager.showOverlay(previewContainer, {
                    message: 'Updating preview...',
                    spinner: true,
                    size: 'small'
                });
            }
        } else {
            // Fallback to legacy loading system
            if (window.ErrorManager) {
                loadingId = window.ErrorManager.showInfo('Updating preview...', {
                    duration: 0,
                    persistent: true,
                    id: 'las-preview-loading',
                    showProgress: true,
                    progressText: 'Generating CSS...'
                });
                
                // Add visual loading state to the field
                if ($field.length) {
                    $field.addClass('las-field-updating');
                    var progressIndicator = $('<div class="las-field-progress"><div class="las-field-progress-bar"></div></div>');
                    $field.after(progressIndicator);
                    
                    // Animate progress bar
                    setTimeout(function() {
                        progressIndicator.find('.las-field-progress-bar').css('width', '30%');
                    }, 100);
                }
            }
        }
        
        var request = $.post(lasAdminData.ajax_url, {
            action: 'las_get_preview_css',
            nonce: lasAdminData.nonce,
            setting: setting,
            value: value
        });
        
        // Track request for cleanup
        activeRequests.push(request);
        
        request
        .done(function(response) {
            console.log('LAS: AJAX response:', response);
            
            // Handle modern loading cleanup
            if (window.lasLoadingManager) {
                // Update field progress to 80%
                if (fieldLoadingId) {
                    window.lasLoadingManager.updateProgress(fieldLoadingId, 80);
                }
            } else {
                // Legacy progress update
                if (progressIndicator) {
                    progressIndicator.find('.las-field-progress-bar').css('width', '80%');
                }
            }
            
            if (response.success && response.data && response.data.css) {
                // Complete field progress
                if (window.lasLoadingManager && fieldLoadingId) {
                    window.lasLoadingManager.updateProgress(fieldLoadingId, 100);
                }
                
                // Apply CSS with smooth transition
                var existingStyles = $('#las-preview-styles');
                var newCSS = response.data.css.trim();
                
                if (newCSS) {
                    // Create new style element
                    var newStyles = $('<style id="las-preview-styles-new">' + newCSS + '</style>');
                    
                    // Add transition for smooth style changes
                    if (existingStyles.length) {
                        // Fade out old styles and fade in new ones
                        $('body').addClass('las-preview-transitioning');
                        
                        setTimeout(function() {
                            existingStyles.remove();
                            newStyles.attr('id', 'las-preview-styles').appendTo('head');
                            
                            setTimeout(function() {
                                $('body').removeClass('las-preview-transitioning');
                            }, 200);
                        }, 100);
                    } else {
                        // First time application
                        newStyles.attr('id', 'las-preview-styles').appendTo('head');
                    }
                    
                    console.log('LAS: CSS applied successfully with smooth transition');
                    
                    // Enhanced success feedback with modern UI
                    var successMessage = 'Preview updated';
                    var changeSignificance = 'minor';
                    
                    if (response.data.css.length > 500) {
                        successMessage = 'Major style changes applied';
                        changeSignificance = 'major';
                    } else if (response.data.css.length > 100) {
                        successMessage = 'Style changes applied';
                        changeSignificance = 'moderate';
                    } else {
                        successMessage = 'Minor adjustment applied';
                        changeSignificance = 'minor';
                    }
                    
                    // Show modern success notification
                    if (window.ErrorManager) {
                        var successOptions = { 
                            duration: changeSignificance === 'major' ? 3000 : (changeSignificance === 'moderate' ? 2000 : 1500),
                            showCheckmark: true
                        };
                        
                        // Add performance info
                        if (response.data.performance && response.data.performance.execution_time_ms) {
                            successOptions.details = 'Generated in ' + response.data.performance.execution_time_ms + 'ms';
                        }
                        
                        window.ErrorManager.showSuccess(successMessage, successOptions);
                    }
                    
                    // Modern field success animation
                    if ($field && $field.length) {
                        $field.addClass('las-field-success');
                        
                        // Add ripple effect for significant changes
                        if (changeSignificance !== 'minor') {
                            var ripple = $('<div class="las-field-ripple"></div>');
                            $field.append(ripple);
                            
                            setTimeout(function() {
                                ripple.addClass('animate');
                                setTimeout(function() {
                                    ripple.remove();
                                }, 600);
                            }, 50);
                        }
                        
                        setTimeout(function() {
                            $field.removeClass('las-field-success');
                        }, 2000);
                    }
                } else {
                    // Remove existing styles if new CSS is empty
                    existingStyles.remove();
                }
                
                // Handle performance warnings with actionable guidance
                if (response.data.performance && response.data.performance.execution_time_ms > 1000) {
                    if (window.ErrorManager) {
                        var perfTime = response.data.performance.execution_time_ms;
                        var warningMessage = 'Slow preview generation (' + perfTime + 'ms)';
                        var warningOptions = {
                            duration: 8000,
                            details: 'This may indicate complex styling or server load',
                            actions: []
                        };
                        
                        // Add specific guidance based on performance
                        if (perfTime > 3000) {
                            warningOptions.actions.push({
                                text: 'Report Performance Issue',
                                action: function() {
                                    window.ErrorManager.reportPerformanceIssue({
                                        setting: setting,
                                        value: value,
                                        execution_time: perfTime,
                                        memory_usage: response.data.performance.memory_usage_mb
                                    });
                                }
                            });
                        }
                        
                        if (perfTime > 2000) {
                            warningOptions.actions.push({
                                text: 'Optimize Settings',
                                action: function() {
                                    window.ErrorManager.showOptimizationTips(setting);
                                }
                            });
                        }
                        
                        window.ErrorManager.showWarning(warningMessage, warningOptions);
                    }
                }
                
                // Handle nonce refresh suggestions
                if (response.data.nonce_status && response.data.nonce_status.should_refresh) {
                    if (window.SecurityManager) {
                        window.SecurityManager.refreshNonce();
                    } else if (window.ErrorManager) {
                        window.ErrorManager.showInfo('Security token will be refreshed automatically', {
                            duration: 3000
                        });
                    }
                }
                
            } else {
                console.error('LAS: Invalid response:', response);
                
                if (window.ErrorManager) {
                    var errorMessage = 'Failed to update preview';
                    var errorOptions = {
                        details: null,
                        actions: [{
                            text: 'Retry',
                            action: function() { updatePreview(setting, value); }
                        }]
                    };
                    
                    // Provide specific error messages and guidance
                    if (response.data && response.data.message) {
                        errorMessage = response.data.message;
                    }
                    
                    if (response.data && response.data.code) {
                        errorOptions.details = 'Error code: ' + response.data.code;
                        
                        // Add specific guidance based on error code
                        switch (response.data.code) {
                            case 'css_generation_failed':
                                errorOptions.details += ' - CSS generation encountered an error';
                                errorOptions.actions.push({
                                    text: 'Reset to Default',
                                    action: function() {
                                        // Reset field to default value
                                        var defaultValue = getDefaultValue(setting);
                                        if (defaultValue !== null) {
                                            updateFieldValue(setting, defaultValue);
                                            updatePreview(setting, defaultValue);
                                        }
                                    }
                                });
                                break;
                            case 'invalid_setting':
                                errorOptions.details += ' - The setting key is not recognized';
                                errorOptions.actions = [{
                                    text: 'Refresh Page',
                                    action: function() { window.location.reload(); }
                                }];
                                break;
                            case 'validation_failed':
                                errorOptions.details += ' - The value did not pass validation';
                                errorOptions.actions.push({
                                    text: 'Show Valid Values',
                                    action: function() {
                                        window.ErrorManager.showValidationHelp(setting);
                                    }
                                });
                                break;
                        }
                    }
                    
                    window.ErrorManager.showError(errorMessage, errorOptions);
                }
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error('LAS: AJAX failed:', textStatus, errorThrown);
            
            // Modern loading cleanup
            if (window.lasLoadingManager) {
                if (loadingId) {
                    window.lasLoadingManager.hideLoading(loadingId);
                }
                if (fieldLoadingId) {
                    window.lasLoadingManager.hideLoading(fieldLoadingId);
                }
            } else {
                // Legacy cleanup
                if (window.ErrorManager && loadingId) {
                    window.ErrorManager.dismiss(loadingId);
                }
                
                if (progressIndicator) {
                    progressIndicator.fadeOut(300, function() {
                        progressIndicator.remove();
                    });
                }
            }
            
            // Enhanced field error state
            if ($field && $field.length) {
                $field.removeClass('las-field-updating').addClass('las-field-error');
                
                // Remove shimmer animation
                $field.css({
                    'background-image': '',
                    'background-size': '',
                    'animation': ''
                });
                
                // Add error shake animation
                $field.addClass('las-field-shake');
                setTimeout(function() {
                    $field.removeClass('las-field-error las-field-shake');
                }, 3000);
            }
            
            if (window.ErrorManager) {
                var errorMessage = 'Network error updating preview';
                var errorOptions = {
                    details: textStatus + (errorThrown ? ': ' + errorThrown : ''),
                    actions: [{
                        text: 'Retry',
                        action: function() { updatePreview(setting, value); }
                    }]
                };
                
                // Handle specific error types with detailed guidance
                if (jqXHR.status === 0) {
                    if (navigator.onLine === false) {
                        errorMessage = 'You appear to be offline';
                        errorOptions.details = 'Check your internet connection and try again';
                        errorOptions.actions = [
                            {
                                text: 'Retry when online',
                                action: function() { 
                                    // Queue for retry when online
                                    window.ErrorManager.queueForRetry(function() {
                                        updatePreview(setting, value);
                                    });
                                }
                            },
                            {
                                text: 'Check Connection',
                                action: function() { 
                                    window.ErrorManager.checkConnectionStatus();
                                }
                            }
                        ];
                    } else {
                        errorMessage = 'Connection failed - server may be unreachable';
                        errorOptions.details = 'This could be a temporary network issue';
                        errorOptions.actions.push({
                            text: 'Test Connection',
                            action: function() { 
                                window.ErrorManager.testConnection();
                            }
                        });
                    }
                } else if (jqXHR.status === 403) {
                    errorMessage = 'Permission denied - session may have expired';
                    errorOptions.details = 'Your login session may have expired or you lack permissions';
                    errorOptions.actions = [
                        {
                            text: 'Refresh Page',
                            action: function() { window.location.reload(); }
                        },
                        {
                            text: 'Check Login Status',
                            action: function() { 
                                window.ErrorManager.checkLoginStatus();
                            }
                        }
                    ];
                } else if (jqXHR.status === 404) {
                    errorMessage = 'Service not found (404)';
                    errorOptions.details = 'The preview service endpoint was not found';
                    errorOptions.actions = [
                        {
                            text: 'Refresh Page',
                            action: function() { window.location.reload(); }
                        },
                        {
                            text: 'Report Issue',
                            action: function() { 
                                window.ErrorManager.reportTechnicalIssue({
                                    error_type: '404_endpoint_missing',
                                    status: jqXHR.status,
                                    setting: setting,
                                    value: value
                                });
                            }
                        }
                    ];
                } else if (jqXHR.status >= 500) {
                    errorMessage = 'Server error (' + jqXHR.status + ')';
                    errorOptions.details = 'The server encountered an internal error';
                    errorOptions.actions.push({
                        text: 'Report Server Error',
                        action: function() { 
                            window.ErrorManager.reportServerError({
                                status: jqXHR.status,
                                setting: setting,
                                value: value,
                                response_text: jqXHR.responseText
                            });
                        }
                    });
                } else if (jqXHR.status === 429) {
                    errorMessage = 'Too many requests - please wait';
                    errorOptions.details = 'You are making requests too quickly';
                    errorOptions.actions = [{
                        text: 'Retry in 5 seconds',
                        action: function() { 
                            setTimeout(function() {
                                updatePreview(setting, value);
                            }, 5000);
                        }
                    }];
                }
                
                window.ErrorManager.showError(errorMessage, errorOptions);
            }
        })
        .always(function() {
            // Modern loading cleanup
            if (window.lasLoadingManager) {
                if (loadingId) {
                    setTimeout(function() {
                        window.lasLoadingManager.hideLoading(loadingId);
                    }, 300); // Small delay for smooth UX
                }
                if (fieldLoadingId) {
                    setTimeout(function() {
                        window.lasLoadingManager.hideLoading(fieldLoadingId);
                    }, 500); // Slightly longer for field feedback
                }
            } else {
                // Legacy cleanup
                if (window.ErrorManager && loadingId) {
                    window.ErrorManager.dismiss(loadingId);
                }
            }
            
            // Clean up field animations
            if ($field && $field.length) {
                setTimeout(function() {
                    $field.removeClass('las-field-updating');
                    $field.css({
                        'background-image': '',
                        'background-size': '',
                        'animation': ''
                    });
                }, 600);
            }
            
            // Dispatch preview complete event
            document.dispatchEvent(new CustomEvent('livepreview:complete', {
                detail: { setting: setting, value: value }
            }));
            
            // Remove request from active requests
            var index = activeRequests.indexOf(request);
            if (index > -1) {
                activeRequests.splice(index, 1);
            }
        });
    };
    
    // Enhanced Field Change Detection System
    var FieldChangeDetector = {
        // Supported field types and their configurations
        fieldTypes: {
            'text': { debounce: true, validate: 'text' },
            'number': { debounce: true, validate: 'number' },
            'email': { debounce: true, validate: 'email' },
            'url': { debounce: true, validate: 'url' },
            'textarea': { debounce: true, validate: 'text' },
            'select': { debounce: false, validate: 'select' },
            'checkbox': { debounce: false, validate: 'boolean' },
            'radio': { debounce: false, validate: 'radio' },
            'range': { debounce: true, validate: 'number' },
            'color': { debounce: true, validate: 'color' },
            'file': { debounce: false, validate: 'file' }
        },
        
        // Custom control types
        customControls: {
            'wp-color-picker': { handler: 'handleColorPicker', validate: 'color' },
            'las-slider': { handler: 'handleSlider', validate: 'number' },
            'las-toggle': { handler: 'handleToggle', validate: 'boolean' },
            'las-multi-select': { handler: 'handleMultiSelect', validate: 'array' }
        },
        
        // Validation rules
        validators: {
            text: function(value) {
                return typeof value === 'string' && value.length <= 1000;
            },
            number: function(value, element) {
                var num = parseFloat(value);
                if (isNaN(num)) return false;
                
                var min = parseFloat(element.attr('min'));
                var max = parseFloat(element.attr('max'));
                
                if (!isNaN(min) && num < min) return false;
                if (!isNaN(max) && num > max) return false;
                
                return true;
            },
            email: function(value) {
                var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !value || emailRegex.test(value);
            },
            url: function(value) {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            color: function(value) {
                if (!value) return true;
                // Support hex, rgb, rgba, hsl, hsla, and named colors
                var colorRegex = /^(#([0-9a-f]{3}){1,2}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|[a-z]+)$/i;
                return colorRegex.test(value);
            },
            boolean: function(value) {
                return typeof value === 'boolean' || value === 'true' || value === 'false' || value === '1' || value === '0';
            },
            select: function(value, element) {
                // Check if value exists in options
                var validOptions = element.find('option').map(function() {
                    return $(this).val();
                }).get();
                return validOptions.indexOf(value) !== -1;
            },
            radio: function(value, element) {
                // Check if value exists in radio group
                var name = element.attr('name');
                var validValues = $('input[name="' + name + '"]').map(function() {
                    return $(this).val();
                }).get();
                return validValues.indexOf(value) !== -1;
            },
            array: function(value) {
                return Array.isArray(value) || typeof value === 'string';
            },
            file: function(value, element) {
                if (!value) return true;
                var allowedTypes = element.attr('accept');
                if (!allowedTypes) return true;
                
                var file = element[0].files[0];
                if (!file) return true;
                
                var allowedTypesArray = allowedTypes.split(',').map(function(type) {
                    return type.trim();
                });
                
                return allowedTypesArray.some(function(type) {
                    return file.type.match(type.replace('*', '.*'));
                });
            }
        },
        
        init: function() {
            console.log('LAS: Initializing enhanced field change detection...');
            this.setupEventDelegation();
            this.setupCustomControls();
            this.setupDynamicContentObserver();
            console.log('LAS: Field change detection initialized');
        },
        
        setupEventDelegation: function() {
            var self = this;
            
            // Use event delegation for all standard input types
            $(document).on('input' + eventNamespace + ' change' + eventNamespace, 'input, textarea, select', function(e) {
                self.handleFieldChange($(this), e);
            });
            
            // Special handling for file inputs
            $(document).on('change' + eventNamespace, 'input[type="file"]', function(e) {
                self.handleFileChange($(this), e);
            });
            
            // Handle focus/blur for validation feedback
            $(document).on('focus' + eventNamespace, 'input, textarea, select', function(e) {
                self.handleFieldFocus($(this), e);
            });
            
            $(document).on('blur' + eventNamespace, 'input, textarea, select', function(e) {
                self.handleFieldBlur($(this), e);
            });
        },
        
        setupCustomControls: function() {
            var self = this;
            
            // Handle WordPress color pickers
            $(document).on('change' + eventNamespace, '.wp-color-picker', function(e) {
                self.handleColorPicker($(this), e);
            });
            
            // Handle custom sliders
            $(document).on('slide' + eventNamespace, '.las-slider', function(e, ui) {
                self.handleSlider($(this), e, ui);
            });
            
            // Handle toggle switches
            $(document).on('change' + eventNamespace, '.las-toggle input', function(e) {
                self.handleToggle($(this), e);
            });
            
            // Handle multi-select controls
            $(document).on('change' + eventNamespace, '.las-multi-select', function(e) {
                self.handleMultiSelect($(this), e);
            });
        },
        
        setupDynamicContentObserver: function() {
            // Use MutationObserver to detect dynamically added content
            if (window.MutationObserver) {
                var self = this;
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.nodeType === 1) { // Element node
                                    self.initializeNewFields($(node));
                                }
                            });
                        }
                    });
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                // Store observer for cleanup
                activeTimers.push(observer);
            }
        },
        
        initializeNewFields: function($container) {
            var self = this;
            
            // Initialize color pickers in new content
            $container.find('.las-fresh-color-picker').each(function() {
                if (!$(this).hasClass('wp-color-picker')) {
                    initColorPickers();
                }
            });
            
            // Initialize sliders in new content
            $container.find('.las-slider').each(function() {
                if (!$(this).hasClass('ui-slider')) {
                    initSliders();
                }
            });
            
            console.log('LAS: Initialized fields in dynamic content');
        },
        
        handleFieldChange: function($element, event) {
            var name = $element.attr('name');
            
            // Only handle LAS fields
            if (!this.isLASField(name)) {
                return;
            }
            
            // Skip if this is a color picker input (handled separately)
            if ($element.hasClass('wp-color-picker')) {
                return;
            }
            
            var fieldType = this.getFieldType($element);
            var fieldConfig = this.fieldTypes[fieldType];
            
            if (!fieldConfig) {
                console.warn('LAS: Unknown field type:', fieldType);
                return;
            }
            
            var setting = this.extractSetting(name);
            if (!setting) {
                console.warn('LAS: Could not extract setting from name:', name);
                return;
            }
            
            var value = this.getFieldValue($element, fieldType);
            
            // Validate the value
            if (!this.validateField($element, value, fieldConfig.validate)) {
                this.showValidationError($element, 'Invalid value');
                return;
            }
            
            // Clear any existing validation errors
            this.clearValidationError($element);
            
            console.log('LAS: Field changed:', setting, '=', value, '(type:', fieldType + ')');
            
            // Update preview with appropriate debouncing
            if (fieldConfig.debounce) {
                updatePreviewDebounced(setting, value);
            } else {
                updatePreview(setting, value);
            }
        },
        
        handleFileChange: function($element, event) {
            var name = $element.attr('name');
            
            if (!this.isLASField(name)) {
                return;
            }
            
            var setting = this.extractSetting(name);
            if (!setting) {
                return;
            }
            
            var file = $element[0].files[0];
            if (!file) {
                updatePreview(setting, '');
                return;
            }
            
            // Validate file
            if (!this.validateField($element, file, 'file')) {
                this.showValidationError($element, 'Invalid file type');
                return;
            }
            
            // For file uploads, we might need to handle differently
            // For now, just pass the file name
            console.log('LAS: File changed:', setting, '=', file.name);
            updatePreview(setting, file.name);
        },
        
        handleColorPicker: function($element, event) {
            var name = $element.attr('name');
            
            if (!this.isLASField(name)) {
                return;
            }
            
            var setting = this.extractSetting(name);
            if (!setting) {
                return;
            }
            
            var value = $element.val();
            
            if (!this.validateField($element, value, 'color')) {
                this.showValidationError($element, 'Invalid color value');
                return;
            }
            
            this.clearValidationError($element);
            
            console.log('LAS: Color picker changed:', setting, '=', value);
            updatePreviewDebounced(setting, value);
        },
        
        handleSlider: function($element, event, ui) {
            var $input = $element.siblings('input[type="number"]').first();
            if ($input.length === 0) {
                $input = $element.parent().find('input[type="number"]').first();
            }
            
            if ($input.length === 0) {
                return;
            }
            
            var name = $input.attr('name');
            
            if (!this.isLASField(name)) {
                return;
            }
            
            var setting = this.extractSetting(name);
            if (!setting) {
                return;
            }
            
            var value = ui ? ui.value : $element.slider('value');
            
            if (!this.validateField($input, value, 'number')) {
                this.showValidationError($input, 'Invalid number value');
                return;
            }
            
            this.clearValidationError($input);
            
            console.log('LAS: Slider changed:', setting, '=', value);
            updatePreviewDebounced(setting, value);
        },
        
        handleToggle: function($element, event) {
            var name = $element.attr('name');
            
            if (!this.isLASField(name)) {
                return;
            }
            
            var setting = this.extractSetting(name);
            if (!setting) {
                return;
            }
            
            var value = $element.is(':checked');
            
            console.log('LAS: Toggle changed:', setting, '=', value);
            updatePreview(setting, value);
        },
        
        handleMultiSelect: function($element, event) {
            var name = $element.attr('name');
            
            if (!this.isLASField(name)) {
                return;
            }
            
            var setting = this.extractSetting(name);
            if (!setting) {
                return;
            }
            
            var value = $element.val(); // This will be an array for multi-select
            
            if (!this.validateField($element, value, 'array')) {
                this.showValidationError($element, 'Invalid selection');
                return;
            }
            
            this.clearValidationError($element);
            
            console.log('LAS: Multi-select changed:', setting, '=', value);
            updatePreview(setting, value);
        },
        
        handleFieldFocus: function($element, event) {
            // Add focus styling or behavior if needed
            $element.addClass('las-field-focused');
        },
        
        handleFieldBlur: function($element, event) {
            // Remove focus styling
            $element.removeClass('las-field-focused');
            
            // Perform final validation on blur
            var name = $element.attr('name');
            if (this.isLASField(name)) {
                var fieldType = this.getFieldType($element);
                var fieldConfig = this.fieldTypes[fieldType];
                
                if (fieldConfig) {
                    var value = this.getFieldValue($element, fieldType);
                    if (!this.validateField($element, value, fieldConfig.validate)) {
                        this.showValidationError($element, 'Please enter a valid value');
                    }
                }
            }
        },
        
        isLASField: function(name) {
            return name && name.includes('las_fresh_options');
        },
        
        extractSetting: function(name) {
            var matches = name.match(/\[([^\]]+)\]$/);
            return matches ? matches[1] : null;
        },
        
        getFieldType: function($element) {
            var type = $element.attr('type');
            var tagName = $element.prop('tagName').toLowerCase();
            
            if (tagName === 'select') {
                return 'select';
            } else if (tagName === 'textarea') {
                return 'textarea';
            } else if (type) {
                return type;
            }
            
            return 'text';
        },
        
        getFieldValue: function($element, fieldType) {
            switch (fieldType) {
                case 'checkbox':
                    return $element.is(':checked') ? ($element.val() || true) : false;
                case 'radio':
                    return $element.is(':checked') ? $element.val() : null;
                case 'number':
                case 'range':
                    var val = $element.val();
                    return val === '' ? '' : parseFloat(val);
                case 'file':
                    return $element[0].files[0] || null;
                default:
                    return $element.val();
            }
        },
        
        validateField: function($element, value, validationType) {
            if (!validationType || !this.validators[validationType]) {
                return true;
            }
            
            try {
                return this.validators[validationType](value, $element);
            } catch (error) {
                console.error('LAS: Validation error:', error);
                return false;
            }
        },
        
        showValidationError: function($element, message) {
            // Remove existing error
            this.clearValidationError($element);
            
            // Add error class
            $element.addClass('las-field-error');
            
            // Create error message
            var $error = $('<div class="las-field-error-message">' + message + '</div>');
            $error.css({
                color: '#dc3232',
                fontSize: '12px',
                marginTop: '4px',
                display: 'block'
            });
            
            // Insert error message after the field
            $element.after($error);
            
            // Show error notification if ErrorManager is available
            if (window.ErrorManager) {
                window.ErrorManager.showWarning('Field validation error: ' + message, {
                    duration: 3000
                });
            }
        },
        
        clearValidationError: function($element) {
            $element.removeClass('las-field-error');
            $element.siblings('.las-field-error-message').remove();
        },
        
        cleanup: function() {
            console.log('LAS: Cleaning up field change detection...');
            
            // Remove event listeners
            $(document).off(eventNamespace);
            
            // Clear validation errors
            $('.las-field-error').removeClass('las-field-error');
            $('.las-field-error-message').remove();
            
            console.log('LAS: Field change detection cleanup complete');
        }
    };
    
    // Initialize the field change detector
    FieldChangeDetector.init();
    
    // Initialize components with delay to ensure DOM is ready
    setTimeout(function() {
        try {
            initColorPickers();
            initSliders();
            
            console.log('LAS Enhanced Preview: Initialization complete');
        } catch (error) {
            console.error('LAS: Initialization error:', error);
            
            // Report initialization error if ErrorManager is available and ready
            if (window.ErrorManager && typeof window.ErrorManager.showError === 'function') {
                window.ErrorManager.showError('Failed to initialize live preview', {
                    details: error.message,
                    actions: [{
                        text: 'Reload Page',
                        action: function() { window.location.reload(); }
                    }]
                });
            }
        }
    }, 1000); // Zwiększam opóźnienie do 1 sekundy
    
    // Cleanup function for memory management
    function cleanup() {
        console.log('LAS: Cleaning up live preview resources...');
        
        // Clear all active timers
        activeTimers.forEach(function(timer) {
            if (timer && typeof timer.disconnect === 'function') {
                // MutationObserver
                timer.disconnect();
            } else {
                // Regular timer
                clearTimeout(timer);
            }
        });
        activeTimers = [];
        
        // Abort active AJAX requests
        activeRequests.forEach(function(request) {
            if (request && request.abort) {
                request.abort();
            }
        });
        activeRequests = [];
        
        // Cleanup field change detector
        if (FieldChangeDetector && FieldChangeDetector.cleanup) {
            FieldChangeDetector.cleanup();
        }
        
        // Remove event listeners
        $(document).off(eventNamespace);
        
        // Remove preview styles
        $('#las-preview-styles').remove();
        
        console.log('LAS: Cleanup complete');
    }
    
    // Enhanced client-side error reporting
    function reportClientError(error, context) {
        if (typeof lasAdminData === 'undefined' || !lasAdminData.ajax_url) {
            console.error('LAS: Cannot report error - admin data not available');
            return;
        }
        
        var errorData = {
            action: 'las_report_client_error',
            nonce: lasAdminData.nonce,
            message: error.message || 'Unknown error',
            source: error.filename || error.source || 'unknown',
            line: error.lineno || error.line || 0,
            column: error.colno || error.column || 0,
            stack: error.stack || '',
            url: window.location.href,
            user_agent: navigator.userAgent,
            timestamp: Date.now(),
            language: navigator.language || 'unknown',
            platform: navigator.platform || 'unknown',
            cookie_enabled: navigator.cookieEnabled,
            online: navigator.onLine,
            screen_resolution: screen.width + 'x' + screen.height,
            viewport_size: window.innerWidth + 'x' + window.innerHeight,
            context: context || {}
        };
        
        // Send error report asynchronously
        $.post(lasAdminData.ajax_url, errorData)
            .done(function(response) {
                if (response.success) {
                    console.log('LAS: Error reported successfully', response.data);
                } else {
                    console.warn('LAS: Error reporting failed', response.data);
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.warn('LAS: Failed to send error report', textStatus, errorThrown);
            });
    }
    
    // Global error handler for live preview
    window.addEventListener('error', function(event) {
        // Only report errors from our plugin files
        if (event.filename && event.filename.includes('live-admin-styler')) {
            reportClientError(event, {
                component: 'live-preview',
                action: 'global_error_handler'
            });
        }
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        reportClientError({
            message: event.reason ? event.reason.toString() : 'Unhandled promise rejection',
            source: 'promise',
            stack: event.reason && event.reason.stack ? event.reason.stack : ''
        }, {
            component: 'live-preview',
            action: 'promise_rejection'
        });
    });
    
    // Global cleanup function for external access
    window.LASLivePreview = {
        cleanup: cleanup,
        updatePreview: updatePreview,
        updatePreviewDebounced: updatePreviewDebounced,
        reportError: reportClientError,
        FieldChangeDetector: FieldChangeDetector,
        updateMultipleSettings: updateMultipleSettings,
        getDefaultValue: getDefaultValue,
        updateFieldValue: updateFieldValue,
        ProgressTracker: ProgressTracker
    };
    
    // Modern UI Integration
    function initModernUIIntegration() {
        console.log('LAS: Initializing modern UI integration for live preview...');
        
        // Initialize loading integration if available
        if (window.lasLoadingIntegration) {
            window.lasLoadingIntegration.setupLivePreviewLoading();
            console.log('LAS: Loading integration initialized');
        }
        
        // Set up theme-aware preview updates
        if (window.lasThemeManager) {
            document.addEventListener('las-theme-change', function(e) {
                console.log('LAS: Theme changed, updating preview styles for new theme');
                // Trigger a preview update to apply theme-specific styles
                var activeField = $('.las-field-updating').first();
                if (activeField.length) {
                    var name = activeField.attr('name');
                    var matches = name.match(/\[([^\]]+)\]$/);
                    if (matches) {
                        var setting = matches[1];
                        var value = activeField.val();
                        updatePreviewDebounced(setting, value);
                    }
                }
            });
        }
        
        // Set up responsive preview updates
        if (window.lasResponsiveManager) {
            document.addEventListener('las-breakpoint-change', function(e) {
                console.log('LAS: Breakpoint changed to', e.detail.breakpoint);
                // Could trigger responsive-specific preview updates here
            });
        }
        
        // Set up accessibility announcements
        if (window.lasAccessibilityManager) {
            document.addEventListener('livepreview:start', function(e) {
                window.lasAccessibilityManager.announce('Updating preview for ' + e.detail.setting);
            });
            
            document.addEventListener('livepreview:complete', function(e) {
                window.lasAccessibilityManager.announce('Preview updated successfully');
            });
        }
        
        console.log('LAS: Modern UI integration complete');
    }
    
    // Initialize modern UI integration
    initModernUIIntegration();
    
    // Cleanup on page unload
    $(window).on('beforeunload' + eventNamespace, cleanup);
    
    // Cleanup on page visibility change (for SPA compatibility)
    if (document.addEventListener) {
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                cleanup();
            }
        });
    }
    
    // Utility functions for enhanced user feedback
    function getDefaultValue(setting) {
        // This would get the default value for a setting from the defaults object
        if (typeof lasAdminData.defaults !== 'undefined' && lasAdminData.defaults[setting]) {
            return lasAdminData.defaults[setting];
        }
        return null;
    }
    
    function updateFieldValue(setting, value) {
        // Update the field value in the UI
        var $field = $('[name*="[' + setting + ']"]');
        if ($field.length) {
            if ($field.hasClass('wp-color-picker')) {
                $field.wpColorPicker('color', value);
            } else if ($field.is('input[type="range"]') || $field.siblings('.las-slider').length) {
                $field.val(value);
                if ($field.siblings('.las-slider').length) {
                    $field.siblings('.las-slider').slider('value', value);
                }
            } else {
                $field.val(value);
            }
            
            // Trigger change event
            $field.trigger('change');
        }
    }
    
    // Enhanced progress tracking for long operations
    var ProgressTracker = {
        activeOperations: {},
        
        start: function(operationId, steps) {
            this.activeOperations[operationId] = {
                steps: steps || ['Initializing', 'Processing', 'Finalizing'],
                currentStep: 0,
                startTime: Date.now()
            };
            
            return this.showProgress(operationId);
        },
        
        update: function(operationId, stepIndex, message) {
            if (this.activeOperations[operationId]) {
                this.activeOperations[operationId].currentStep = stepIndex;
                if (message) {
                    this.activeOperations[operationId].steps[stepIndex] = message;
                }
                this.updateProgress(operationId);
            }
        },
        
        complete: function(operationId) {
            if (this.activeOperations[operationId]) {
                this.hideProgress(operationId);
                delete this.activeOperations[operationId];
            }
        },
        
        showProgress: function(operationId) {
            var operation = this.activeOperations[operationId];
            if (!operation || !window.ErrorManager) return null;
            
            var progressId = window.ErrorManager.showInfo('Processing...', {
                duration: 0,
                persistent: true,
                id: 'progress-' + operationId,
                showProgress: true,
                progressText: operation.steps[0]
            });
            
            operation.progressId = progressId;
            return progressId;
        },
        
        updateProgress: function(operationId) {
            var operation = this.activeOperations[operationId];
            if (!operation || !window.ErrorManager) return;
            
            var progress = ((operation.currentStep + 1) / operation.steps.length) * 100;
            var currentStepText = operation.steps[operation.currentStep];
            
            // Update the notification if possible
            var notification = $('#las-notifications [data-id="progress-' + operationId + '"]');
            if (notification.length) {
                notification.find('.las-notification-progress-text').text(currentStepText);
                notification.find('.las-notification-progress-bar').css('width', progress + '%');
            }
        },
        
        hideProgress: function(operationId) {
            if (window.ErrorManager) {
                window.ErrorManager.dismiss('progress-' + operationId);
            }
        }
    };
    
    // Enhanced batch operations with progress tracking
    function updateMultipleSettings(settingsMap, showProgress) {
        if (showProgress && Object.keys(settingsMap).length > 3) {
            var operationId = 'batch-update-' + Date.now();
            var steps = ['Validating settings', 'Generating CSS', 'Applying changes'];
            
            ProgressTracker.start(operationId, steps);
            
            // Simulate progress updates
            setTimeout(function() {
                ProgressTracker.update(operationId, 1, 'Generating CSS for ' + Object.keys(settingsMap).length + ' settings');
            }, 500);
            
            setTimeout(function() {
                ProgressTracker.update(operationId, 2, 'Applying changes to interface');
            }, 1000);
            
            setTimeout(function() {
                ProgressTracker.complete(operationId);
                if (window.ErrorManager) {
                    window.ErrorManager.showSuccess('Batch update completed', {
                        duration: 3000,
                        details: Object.keys(settingsMap).length + ' settings updated'
                    });
                }
            }, 1500);
        }
        
        // Process each setting
        Object.keys(settingsMap).forEach(function(setting, index) {
            setTimeout(function() {
                updatePreview(setting, settingsMap[setting]);
            }, index * 100); // Stagger updates to prevent overwhelming the server
        });
    }
    

    
    console.log('LAS Enhanced Preview: Utility functions loaded');
});