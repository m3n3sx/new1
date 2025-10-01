/**
 * Live Admin Styler - Critical Error Fix
 * Addresses security token and notification container issues
 */

jQuery(document).ready(function($) {
    'use strict';
    
    console.log('LAS Critical Fix: Initializing...');
    
    // Fix 1: Ensure notification container exists before any operations
    function ensureNotificationContainer() {
        if (!window.ErrorManager || !window.ErrorManager.container) {
            console.log('LAS Fix: Creating missing notification container');
            
            // Create a minimal notification system if ErrorManager is broken
            if (!window.ErrorManager) {
                window.ErrorManager = {};
            }
            
            if (!window.ErrorManager.container) {
                window.ErrorManager.container = $('<div id="las-notifications" class="las-notifications-container" role="alert" aria-live="polite"></div>');
                $('body').append(window.ErrorManager.container);
                
                // Add basic notification methods
                window.ErrorManager.showInfo = function(message, options) {
                    options = options || {};
                    var notification = $('<div class="las-notification las-info">' + message + '</div>');
                    this.container.append(notification);
                    
                    setTimeout(function() {
                        notification.addClass('show');
                    }, 10);
                    
                    if (options.duration !== 0) {
                        setTimeout(function() {
                            notification.fadeOut(300, function() {
                                notification.remove();
                            });
                        }, options.duration || 3000);
                    }
                    
                    return notification;
                };
                
                window.ErrorManager.showError = function(message, options) {
                    options = options || {};
                    var notification = $('<div class="las-notification las-error">' + message + '</div>');
                    this.container.append(notification);
                    
                    setTimeout(function() {
                        notification.addClass('show');
                    }, 10);
                    
                    if (options.duration !== 0) {
                        setTimeout(function() {
                            notification.fadeOut(300, function() {
                                notification.remove();
                            });
                        }, options.duration || 5000);
                    }
                    
                    return notification;
                };
            }
        }
    }
    
    // Fix 2: Enhanced nonce management with automatic refresh
    function refreshSecurityToken() {
        console.log('LAS Fix: Refreshing security token...');
        
        return $.post(lasAdminData.ajax_url, {
            action: 'las_refresh_nonce'
        }).done(function(response) {
            if (response.success && response.data && response.data.nonce) {
                lasAdminData.nonce = response.data.nonce;
                console.log('LAS Fix: Security token refreshed successfully');
                
                // Dispatch event for other components
                $(document).trigger('las:nonce-refreshed', [response.data.nonce]);
                
                return response.data.nonce;
            } else {
                console.error('LAS Fix: Failed to refresh security token');
                throw new Error('Nonce refresh failed');
            }
        }).fail(function() {
            console.error('LAS Fix: Network error refreshing security token');
            throw new Error('Network error during nonce refresh');
        });
    }
    
    // Fix 3: Robust AJAX wrapper with automatic retry and nonce refresh
    function secureAjaxRequest(data, options) {
        options = options || {};
        var maxRetries = options.maxRetries || 2;
        var currentRetry = 0;
        
        function attemptRequest() {
            // Ensure nonce is included
            data.nonce = lasAdminData.nonce;
            
            return $.post(lasAdminData.ajax_url, data)
                .fail(function(jqXHR, textStatus, errorThrown) {
                    // Check if it's a security token error
                    if (jqXHR.responseJSON && 
                        jqXHR.responseJSON.data && 
                        (jqXHR.responseJSON.data.includes('Invalid security token') || 
                         jqXHR.responseJSON.data.includes('invalid_nonce'))) {
                        
                        console.log('LAS Fix: Security token invalid, attempting refresh...');
                        
                        if (currentRetry < maxRetries) {
                            currentRetry++;
                            
                            return refreshSecurityToken().then(function() {
                                console.log('LAS Fix: Retrying request with new token (attempt ' + currentRetry + ')');
                                return attemptRequest();
                            }).catch(function() {
                                console.error('LAS Fix: Failed to refresh token, giving up');
                                throw new Error('Security token refresh failed');
                            });
                        } else {
                            console.error('LAS Fix: Max retries exceeded for security token refresh');
                            throw new Error('Max retries exceeded');
                        }
                    } else {
                        // Re-throw other errors
                        throw new Error(textStatus + ': ' + errorThrown);
                    }
                });
        }
        
        return attemptRequest();
    }
    
    // Fix 4: Enhanced updatePreview function with error handling
    function updatePreviewSafe(setting, value) {
        console.log('LAS Fix: Safely updating preview for', setting, '=', value);
        
        // Ensure notification container exists
        ensureNotificationContainer();
        
        // Show loading state
        var loadingNotification = window.ErrorManager.showInfo('Updating preview...', {
            duration: 0,
            persistent: true
        });
        
        // Use secure AJAX request
        secureAjaxRequest({
            action: 'las_get_preview_css',
            setting: setting,
            value: value
        }, {
            maxRetries: 2
        })
        .done(function(response) {
            console.log('LAS Fix: Preview update successful');
            
            if (response.success && response.data && response.data.css) {
                // Apply CSS
                var existingStyles = $('#las-preview-styles');
                existingStyles.remove();
                
                if (response.data.css.trim()) {
                    $('<style id="las-preview-styles">' + response.data.css + '</style>').appendTo('head');
                }
                
                // Show success message
                window.ErrorManager.showInfo('Preview updated successfully', {
                    duration: 2000
                });
            } else {
                console.error('LAS Fix: Invalid response format');
                window.ErrorManager.showError('Failed to update preview: Invalid response', {
                    duration: 4000
                });
            }
        })
        .fail(function(error) {
            console.error('LAS Fix: Preview update failed:', error);
            window.ErrorManager.showError('Failed to update preview: ' + error.message, {
                duration: 5000
            });
        })
        .always(function() {
            // Remove loading notification
            if (loadingNotification) {
                loadingNotification.fadeOut(300, function() {
                    loadingNotification.remove();
                });
            }
        });
    }
    
    // Fix 5: Safe slider initialization with error handling
    function initSlidersWithErrorHandling() {
        console.log('LAS Fix: Initializing sliders with error handling...');
        
        $('.las-slider').each(function() {
            var $slider = $(this);
            var $input = $slider.siblings('input[type="number"]').first();
            
            if ($input.length === 0) {
                $input = $slider.parent().find('input[type="number"]').first();
            }
            
            if ($input.length === 0) {
                console.warn('LAS Fix: No input found for slider, skipping');
                return;
            }
            
            try {
                var min = parseInt($input.attr('min')) || 0;
                var max = parseInt($input.attr('max')) || 100;
                var step = parseInt($input.attr('step')) || 1;
                var value = parseInt($input.val()) || min;
                
                // Use jQuery UI if available, otherwise fallback
                if (typeof $.fn.slider === 'function') {
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
                                console.log('LAS Fix: Slider changed:', setting, '=', ui.value);
                                
                                // Debounced update with error handling
                                clearTimeout(window.sliderTimeout);
                                window.sliderTimeout = setTimeout(function() {
                                    updatePreviewSafe(setting, ui.value);
                                }, 300);
                            }
                        }
                    });
                    
                    console.log('LAS Fix: jQuery UI slider initialized successfully');
                } else {
                    // Fallback to HTML5 range
                    $slider.hide();
                    $input.attr('type', 'range').show();
                    
                    $input.on('input change', function() {
                        var name = $(this).attr('name');
                        var matches = name.match(/\[([^\]]+)\]$/);
                        if (matches) {
                            var setting = matches[1];
                            var value = $(this).val();
                            
                            clearTimeout(window.sliderTimeout);
                            window.sliderTimeout = setTimeout(function() {
                                updatePreviewSafe(setting, value);
                            }, 300);
                        }
                    });
                    
                    console.log('LAS Fix: Fallback slider initialized successfully');
                }
            } catch (error) {
                console.error('LAS Fix: Error initializing slider:', error);
                
                // Ensure notification container exists before showing error
                ensureNotificationContainer();
                window.ErrorManager.showError('Slider initialization failed: ' + error.message, {
                    duration: 3000
                });
            }
        });
    }
    
    // Fix 6: Safe color picker initialization
    function initColorPickersWithErrorHandling() {
        console.log('LAS Fix: Initializing color pickers with error handling...');
        
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
                                console.log('LAS Fix: Color changed:', setting, '=', value);
                                
                                // Debounced update with error handling
                                clearTimeout(window.colorTimeout);
                                window.colorTimeout = setTimeout(function() {
                                    updatePreviewSafe(setting, value);
                                }, 300);
                            }
                        },
                        clear: function() {
                            var name = $input.attr('name');
                            var matches = name.match(/\[([^\]]+)\]$/);
                            if (matches) {
                                var setting = matches[1];
                                console.log('LAS Fix: Color cleared:', setting);
                                updatePreviewSafe(setting, '');
                            }
                        }
                    });
                    
                    console.log('LAS Fix: Color picker initialized successfully');
                } catch (error) {
                    console.error('LAS Fix: Error initializing color picker:', error);
                    
                    // Ensure notification container exists before showing error
                    ensureNotificationContainer();
                    window.ErrorManager.showError('Color picker initialization failed: ' + error.message, {
                        duration: 3000
                    });
                }
            }
        });
    }
    
    // Initialize fixes
    function initializeFixes() {
        console.log('LAS Fix: Starting critical fixes initialization...');
        
        // Ensure we have the required data
        if (typeof lasAdminData === 'undefined') {
            console.error('LAS Fix: lasAdminData not available, cannot proceed');
            return;
        }
        
        // Ensure notification container exists first
        ensureNotificationContainer();
        
        // Initialize components with error handling
        try {
            initSlidersWithErrorHandling();
            initColorPickersWithErrorHandling();
            
            console.log('LAS Fix: All components initialized successfully');
            
            // Show success notification
            window.ErrorManager.showInfo('Live preview system restored', {
                duration: 3000
            });
            
        } catch (error) {
            console.error('LAS Fix: Critical error during initialization:', error);
            window.ErrorManager.showError('Critical initialization error: ' + error.message, {
                duration: 10000
            });
        }
    }
    
    // Override the global updatePreview function if it exists
    if (typeof window.updatePreview !== 'undefined') {
        console.log('LAS Fix: Overriding existing updatePreview function');
        window.updatePreview = updatePreviewSafe;
    }
    
    // Start initialization
    initializeFixes();
    
    // Add CSS for notifications if not present
    if (!$('#las-fix-styles').length) {
        $('<style id="las-fix-styles">' +
            '.las-notifications-container { position: fixed; top: 32px; right: 20px; z-index: 999999; max-width: 300px; }' +
            '.las-notification { background: #fff; border-left: 4px solid #0073aa; padding: 12px 16px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); opacity: 0; transform: translateX(100%); transition: all 0.3s ease; }' +
            '.las-notification.show { opacity: 1; transform: translateX(0); }' +
            '.las-notification.las-error { border-left-color: #dc3232; }' +
            '.las-notification.las-info { border-left-color: #0073aa; }' +
            '</style>').appendTo('head');
    }
    
    console.log('LAS Fix: Critical fixes loaded successfully');
});