<?php
/**
 * AJAX Nonce Refresh Handler
 * Provides secure nonce refresh functionality
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Handle nonce refresh AJAX request
 */
function las_handle_nonce_refresh() {
    // Basic security check - ensure this is an AJAX request
    if (!wp_doing_ajax()) {
        wp_die('Invalid request');
    }
    
    // Check if user has proper capabilities
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Insufficient permissions');
        return;
    }
    
    try {
        // Generate new nonce
        $new_nonce = wp_create_nonce('las_fresh_admin_nonce');
        
        if (!$new_nonce) {
            throw new Exception('Failed to generate new nonce');
        }
        
        // Log the refresh for debugging
        error_log('LAS: Nonce refreshed for user ' . get_current_user_id());
        
        wp_send_json_success([
            'nonce' => $new_nonce,
            'timestamp' => time(),
            'user_id' => get_current_user_id()
        ]);
        
    } catch (Exception $e) {
        error_log('LAS: Nonce refresh failed: ' . $e->getMessage());
        wp_send_json_error('Nonce refresh failed: ' . $e->getMessage());
    }
}

// Register the AJAX handler
add_action('wp_ajax_las_refresh_nonce', 'las_handle_nonce_refresh');