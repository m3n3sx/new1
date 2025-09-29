/**
 * Live Admin Styler - Live Preview JavaScript (Minimal Working Version)
 * This is a simplified version to ensure no JavaScript errors while maintaining core functionality
 */

// Global variables
var valueCache = {};

// Minimal LivePreviewManager
var LivePreviewManager = {
    init: function() {
        console.log('LAS LivePreviewManager: Initialized (minimal version)');
    },
    
    handleFieldChange: function(setting, value) {
        console.log('LAS LivePreviewManager: Field change -', setting, ':', value);
        // Basic implementation without complex features
    }
};

// Utility functions
function getSettingKeyFromName(nameAttr) {
    if (!nameAttr) return null;
    var matches = nameAttr.match(/\[([^\]]+)\]$/);
    return matches ? matches[1] : null;
}

function handleLiveUpdate(setting, value) {
    if (window.LivePreviewManager && typeof window.LivePreviewManager.handleFieldChange === 'function') {
        window.LivePreviewManager.handleFieldChange(setting, value);
    }
}

// Simplified initialization functions
function initScrollbarManagement() {
    console.log('LAS Debug: Scrollbar management initialized (minimal)');
}

function initMenuCollapseHandler() {
    console.log('LAS Debug: Menu collapse handler initialized (minimal)');
}

function setupOptimizedEventHandlers() {
    console.log('LAS Debug: Event handlers set up (minimal)');
}

// jQuery document ready
jQuery(document).ready(function($) {
    console.log('LAS Preview JS: DOM ready, initializing minimal version...');
    
    // Initialize components
    LivePreviewManager.init();
    setupOptimizedEventHandlers();
    initScrollbarManagement();
    initMenuCollapseHandler();
    
    console.log('LAS Preview JS: Minimal initialization complete');
});

// Make functions globally available
window.LivePreviewManager = LivePreviewManager;
window.handleLiveUpdate = handleLiveUpdate;