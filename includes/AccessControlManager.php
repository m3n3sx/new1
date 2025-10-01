<?php
/**
 * Access Control Manager
 * 
 * Comprehensive capability-based access control system for Live Admin Styler.
 * Implements role-based permissions, secure file operations, and granular access control.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Access Control Manager class
 */
class LAS_AccessControlManager {
    
    /**
     * Plugin capabilities
     * @var array
     */
    private $plugin_capabilities = [
        'las_manage_settings' => 'Manage Live Admin Styler settings',
        'las_manage_templates' => 'Manage templates and presets',
        'las_use_live_edit' => 'Use live edit mode',
        'las_manage_advanced' => 'Manage advanced settings and custom CSS',
        'las_export_import' => 'Export and import settings',
        'las_view_analytics' => 'View usage analytics and reports',
        'las_manage_users' => 'Manage user access and permissions'
    ];
    
    /**
     * Role capability mappings
     * @var array
     */
    private $role_capabilities = [
        'administrator' => [
            'las_manage_settings',
            'las_manage_templates',
            'las_use_live_edit',
            'las_manage_advanced',
            'las_export_import',
            'las_view_analytics',
            'las_manage_users'
        ],
        'editor' => [
            'las_manage_settings',
            'las_manage_templates',
            'las_use_live_edit',
            'las_export_import'
        ],
        'author' => [
            'las_use_live_edit'
        ],
        'contributor' => [],
        'subscriber' => []
    ];
    
    /**
     * Allowed file operations
     * @var array
     */
    private $allowed_file_operations = [
        'read' => ['css', 'json', 'txt'],
        'write' => ['css', 'json'],
        'upload' => ['json', 'txt'],
        'delete' => ['json']
    ];
    
    /**
     * Secure directories
     * @var array
     */
    private $secure_directories = [];
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init_secure_directories();
        $this->init_hooks();
    }
    
    /**
     * Initialize secure directories
     */
    private function init_secure_directories() {
        $upload_dir = wp_upload_dir();
        
        $this->secure_directories = [
            'templates' => $upload_dir['basedir'] . '/las-templates/',
            'exports' => $upload_dir['basedir'] . '/las-exports/',
            'cache' => $upload_dir['basedir'] . '/las-cache/',
            'logs' => $upload_dir['basedir'] . '/las-logs/'
        ];
        
        // Create secure directories if they don't exist
        foreach ($this->secure_directories as $dir) {
            if (!file_exists($dir)) {
                wp_mkdir_p($dir);
                $this->secure_directory($dir);
            }
        }
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        add_action('init', [$this, 'register_capabilities']);
        add_action('admin_init', [$this, 'check_access_permissions']);
        add_filter('user_has_cap', [$this, 'filter_user_capabilities'], 10, 4);
        add_action('wp_ajax_las_check_permission', [$this, 'ajax_check_permission']);
        add_action('wp_ajax_las_manage_user_permissions', [$this, 'ajax_manage_user_permissions']);
    }
    
    /**
     * Register plugin capabilities
     */
    public function register_capabilities() {
        // Add capabilities to roles on plugin activation
        if (get_option('las_fresh_capabilities_registered') !== '2.0.0') {
            $this->add_capabilities_to_roles();
            update_option('las_fresh_capabilities_registered', '2.0.0');
        }
    }
    
    /**
     * Add capabilities to WordPress roles
     */
    private function add_capabilities_to_roles() {
        foreach ($this->role_capabilities as $role_name => $capabilities) {
            $role = get_role($role_name);
            
            if ($role) {
                foreach ($capabilities as $capability) {
                    $role->add_cap($capability);
                }
            }
        }
        
        // Log capability registration
        error_log('[LAS] Capabilities registered for all roles');
    }
    
    /**
     * Remove capabilities from WordPress roles (for deactivation)
     */
    public function remove_capabilities_from_roles() {
        foreach ($this->role_capabilities as $role_name => $capabilities) {
            $role = get_role($role_name);
            
            if ($role) {
                foreach ($capabilities as $capability) {
                    $role->remove_cap($capability);
                }
            }
        }
        
        delete_option('las_fresh_capabilities_registered');
        error_log('[LAS] Capabilities removed from all roles');
    }
    
    /**
     * Check if current user has specific capability
     * 
     * @param string $capability Capability to check
     * @param int|null $user_id User ID (default: current user)
     * @return bool True if user has capability
     */
    public function user_can($capability, $user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        // Check if user exists
        if (!$user_id || !get_userdata($user_id)) {
            $this->log_access_attempt($capability, $user_id, false, 'User does not exist');
            return false;
        }
        
        // Check WordPress capability
        $has_capability = user_can($user_id, $capability);
        
        // Additional security checks
        if ($has_capability) {
            $has_capability = $this->additional_security_checks($capability, $user_id);
        }
        
        // Log access attempt
        $this->log_access_attempt($capability, $user_id, $has_capability);
        
        return $has_capability;
    }
    
    /**
     * Additional security checks
     * 
     * @param string $capability Capability being checked
     * @param int $user_id User ID
     * @return bool True if additional checks pass
     */
    private function additional_security_checks($capability, $user_id) {
        // Check if user account is active
        $user = get_userdata($user_id);
        if (!$user || $user->user_status !== '0') {
            return false;
        }
        
        // Check for capability-specific restrictions
        switch ($capability) {
            case 'las_manage_advanced':
                // Advanced settings require additional verification
                return $this->verify_advanced_access($user_id);
                
            case 'las_manage_users':
                // User management requires super admin in multisite
                if (is_multisite() && !is_super_admin($user_id)) {
                    return false;
                }
                break;
                
            case 'las_export_import':
                // Export/import may be restricted in some environments
                if (defined('LAS_DISABLE_EXPORT_IMPORT') && LAS_DISABLE_EXPORT_IMPORT) {
                    return false;
                }
                break;
        }
        
        return true;
    }
    
    /**
     * Verify advanced access
     * 
     * @param int $user_id User ID
     * @return bool True if user can access advanced features
     */
    private function verify_advanced_access($user_id) {
        // Check if user has been granted advanced access
        $advanced_users = get_option('las_fresh_advanced_users', []);
        
        if (!in_array($user_id, $advanced_users)) {
            // Auto-grant to administrators
            if (user_can($user_id, 'manage_options')) {
                $advanced_users[] = $user_id;
                update_option('las_fresh_advanced_users', $advanced_users);
                return true;
            }
            
            return false;
        }
        
        return true;
    }
    
    /**
     * Check access permissions for admin pages
     */
    public function check_access_permissions() {
        if (!is_admin()) {
            return;
        }
        
        $current_screen = get_current_screen();
        
        if (!$current_screen || strpos($current_screen->id, 'live-admin-styler') === false) {
            return;
        }
        
        // Determine required capability based on page
        $required_capability = $this->get_required_capability_for_page($current_screen->id);
        
        if (!$this->user_can($required_capability)) {
            wp_die(
                __('You do not have sufficient permissions to access this page.', 'live-admin-styler'),
                __('Access Denied', 'live-admin-styler'),
                ['response' => 403]
            );
        }
    }
    
    /**
     * Get required capability for admin page
     * 
     * @param string $page_id Page ID
     * @return string Required capability
     */
    private function get_required_capability_for_page($page_id) {
        $capability_map = [
            'toplevel_page_live-admin-styler' => 'las_manage_settings',
            'live-admin-styler_page_las-templates' => 'las_manage_templates',
            'live-admin-styler_page_las-live-edit' => 'las_use_live_edit',
            'live-admin-styler_page_las-advanced' => 'las_manage_advanced',
            'live-admin-styler_page_las-export-import' => 'las_export_import',
            'live-admin-styler_page_las-analytics' => 'las_view_analytics',
            'live-admin-styler_page_las-users' => 'las_manage_users'
        ];
        
        return $capability_map[$page_id] ?? 'las_manage_settings';
    }
    
    /**
     * Filter user capabilities
     * 
     * @param array $allcaps All capabilities
     * @param array $caps Required capabilities
     * @param array $args Arguments
     * @param WP_User $user User object
     * @return array Filtered capabilities
     */
    public function filter_user_capabilities($allcaps, $caps, $args, $user) {
        // Don't modify capabilities for non-LAS capabilities
        $las_caps = array_keys($this->plugin_capabilities);
        $has_las_cap = false;
        
        foreach ($caps as $cap) {
            if (in_array($cap, $las_caps)) {
                $has_las_cap = true;
                break;
            }
        }
        
        if (!$has_las_cap) {
            return $allcaps;
        }
        
        // Apply additional security filters
        foreach ($caps as $cap) {
            if (in_array($cap, $las_caps) && isset($allcaps[$cap]) && $allcaps[$cap]) {
                // Perform additional checks
                if (!$this->additional_security_checks($cap, $user->ID)) {
                    $allcaps[$cap] = false;
                }
            }
        }
        
        return $allcaps;
    }
    
    /**
     * Secure file operation
     * 
     * @param string $operation Operation type (read, write, upload, delete)
     * @param string $file_path File path
     * @param string $capability Required capability
     * @return bool|WP_Error True if allowed, WP_Error if denied
     */
    public function secure_file_operation($operation, $file_path, $capability = 'las_manage_settings') {
        // Check user capability
        if (!$this->user_can($capability)) {
            return new WP_Error('insufficient_capability', 'Insufficient permissions for file operation');
        }
        
        // Validate file path
        $path_validation = $this->validate_file_path($file_path);
        if (is_wp_error($path_validation)) {
            return $path_validation;
        }
        
        // Check file extension
        $file_extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));
        
        if (!isset($this->allowed_file_operations[$operation]) || 
            !in_array($file_extension, $this->allowed_file_operations[$operation])) {
            
            $this->log_security_event('file_operation_denied', [
                'operation' => $operation,
                'file_path' => $file_path,
                'extension' => $file_extension,
                'user_id' => get_current_user_id()
            ]);
            
            return new WP_Error('file_operation_denied', 'File operation not allowed for this file type');
        }
        
        // Check if file is in secure directory
        $is_in_secure_dir = false;
        foreach ($this->secure_directories as $secure_dir) {
            if (strpos(realpath($file_path), realpath($secure_dir)) === 0) {
                $is_in_secure_dir = true;
                break;
            }
        }
        
        if (!$is_in_secure_dir) {
            return new WP_Error('insecure_directory', 'File operation only allowed in secure directories');
        }
        
        // Log successful file operation
        $this->log_security_event('file_operation_allowed', [
            'operation' => $operation,
            'file_path' => $file_path,
            'user_id' => get_current_user_id()
        ]);
        
        return true;
    }
    
    /**
     * Validate file path for security
     * 
     * @param string $file_path File path to validate
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    private function validate_file_path($file_path) {
        // Remove null bytes
        $file_path = str_replace(chr(0), '', $file_path);
        
        // Check for directory traversal
        if (strpos($file_path, '..') !== false) {
            return new WP_Error('directory_traversal', 'Directory traversal detected in file path');
        }
        
        // Check for absolute paths outside allowed directories
        $real_path = realpath($file_path);
        if ($real_path) {
            $allowed = false;
            foreach ($this->secure_directories as $secure_dir) {
                if (strpos($real_path, realpath($secure_dir)) === 0) {
                    $allowed = true;
                    break;
                }
            }
            
            if (!$allowed) {
                return new WP_Error('path_outside_allowed', 'File path is outside allowed directories');
            }
        }
        
        // Check for dangerous file names
        $dangerous_names = ['.htaccess', '.htpasswd', 'wp-config.php', 'index.php'];
        $file_name = basename($file_path);
        
        if (in_array(strtolower($file_name), $dangerous_names)) {
            return new WP_Error('dangerous_filename', 'Dangerous file name detected');
        }
        
        return true;
    }
    
    /**
     * Secure directory by adding protection files
     * 
     * @param string $directory Directory path
     */
    private function secure_directory($directory) {
        // Add .htaccess file to prevent direct access
        $htaccess_content = "# Live Admin Styler Security\n";
        $htaccess_content .= "Options -Indexes\n";
        $htaccess_content .= "<Files *.php>\n";
        $htaccess_content .= "    Require all denied\n";
        $htaccess_content .= "</Files>\n";
        
        file_put_contents($directory . '.htaccess', $htaccess_content);
        
        // Add index.php file to prevent directory listing
        $index_content = "<?php\n// Silence is golden.\n";
        file_put_contents($directory . 'index.php', $index_content);
    }
    
    /**
     * AJAX handler for permission checking
     */
    public function ajax_check_permission() {
        check_ajax_referer('las_check_permission', 'nonce');
        
        $capability = sanitize_text_field($_POST['capability'] ?? '');
        $user_id = intval($_POST['user_id'] ?? get_current_user_id());
        
        if (empty($capability)) {
            wp_send_json_error(['message' => 'Capability parameter is required']);
        }
        
        // Only allow checking own permissions or if user can manage users
        if ($user_id !== get_current_user_id() && !$this->user_can('las_manage_users')) {
            wp_send_json_error(['message' => 'Insufficient permissions to check other users']);
        }
        
        $has_permission = $this->user_can($capability, $user_id);
        
        wp_send_json_success([
            'has_permission' => $has_permission,
            'capability' => $capability,
            'user_id' => $user_id
        ]);
    }
    
    /**
     * AJAX handler for managing user permissions
     */
    public function ajax_manage_user_permissions() {
        check_ajax_referer('las_manage_user_permissions', 'nonce');
        
        if (!$this->user_can('las_manage_users')) {
            wp_send_json_error(['message' => 'Insufficient permissions to manage user permissions']);
        }
        
        $action = sanitize_text_field($_POST['action_type'] ?? '');
        $user_id = intval($_POST['user_id'] ?? 0);
        $capability = sanitize_text_field($_POST['capability'] ?? '');
        
        if (!$user_id || !get_userdata($user_id)) {
            wp_send_json_error(['message' => 'Invalid user ID']);
        }
        
        if (!in_array($capability, array_keys($this->plugin_capabilities))) {
            wp_send_json_error(['message' => 'Invalid capability']);
        }
        
        $user = new WP_User($user_id);
        
        switch ($action) {
            case 'grant':
                $user->add_cap($capability);
                $message = "Capability '{$capability}' granted to user";
                break;
                
            case 'revoke':
                $user->remove_cap($capability);
                $message = "Capability '{$capability}' revoked from user";
                break;
                
            default:
                wp_send_json_error(['message' => 'Invalid action']);
        }
        
        // Log permission change
        $this->log_security_event('permission_changed', [
            'action' => $action,
            'capability' => $capability,
            'target_user_id' => $user_id,
            'admin_user_id' => get_current_user_id()
        ]);
        
        wp_send_json_success(['message' => $message]);
    }
    
    /**
     * Get user permissions summary
     * 
     * @param int $user_id User ID
     * @return array User permissions
     */
    public function get_user_permissions($user_id) {
        if (!$this->user_can('las_manage_users') && $user_id !== get_current_user_id()) {
            return new WP_Error('insufficient_permissions', 'Cannot view other user permissions');
        }
        
        $user = get_userdata($user_id);
        if (!$user) {
            return new WP_Error('invalid_user', 'User not found');
        }
        
        $permissions = [];
        
        foreach ($this->plugin_capabilities as $capability => $description) {
            $permissions[$capability] = [
                'has_capability' => user_can($user_id, $capability),
                'description' => $description,
                'granted_by_role' => $this->is_capability_granted_by_role($capability, $user->roles),
                'explicitly_granted' => $user->has_cap($capability)
            ];
        }
        
        return [
            'user_id' => $user_id,
            'user_login' => $user->user_login,
            'user_roles' => $user->roles,
            'permissions' => $permissions
        ];
    }
    
    /**
     * Check if capability is granted by user role
     * 
     * @param string $capability Capability to check
     * @param array $user_roles User roles
     * @return bool True if granted by role
     */
    private function is_capability_granted_by_role($capability, $user_roles) {
        foreach ($user_roles as $role_name) {
            if (isset($this->role_capabilities[$role_name]) && 
                in_array($capability, $this->role_capabilities[$role_name])) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Log access attempt
     * 
     * @param string $capability Capability checked
     * @param int $user_id User ID
     * @param bool $granted Whether access was granted
     * @param string $reason Additional reason
     */
    private function log_access_attempt($capability, $user_id, $granted, $reason = '') {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }
        
        $user = get_userdata($user_id);
        $user_login = $user ? $user->user_login : 'unknown';
        
        $log_entry = sprintf(
            '[LAS ACCESS] User: %s (ID: %d), Capability: %s, Granted: %s, IP: %s',
            $user_login,
            $user_id,
            $capability,
            $granted ? 'YES' : 'NO',
            $this->get_client_ip()
        );
        
        if ($reason) {
            $log_entry .= ', Reason: ' . $reason;
        }
        
        error_log($log_entry);
    }
    
    /**
     * Log security event
     * 
     * @param string $event Event type
     * @param array $data Event data
     */
    private function log_security_event($event, $data = []) {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }
        
        $log_entry = sprintf(
            '[LAS SECURITY] Event: %s, Data: %s, IP: %s, Time: %s',
            $event,
            json_encode($data),
            $this->get_client_ip(),
            current_time('mysql')
        );
        
        error_log($log_entry);
    }
    
    /**
     * Get client IP address
     * 
     * @return string Client IP
     */
    private function get_client_ip() {
        $ip_keys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    }
    
    /**
     * Get all plugin capabilities
     * 
     * @return array Plugin capabilities
     */
    public function get_plugin_capabilities() {
        return $this->plugin_capabilities;
    }
    
    /**
     * Get role capability mappings
     * 
     * @return array Role capabilities
     */
    public function get_role_capabilities() {
        return $this->role_capabilities;
    }
    
    /**
     * Get secure directories
     * 
     * @return array Secure directories
     */
    public function get_secure_directories() {
        return $this->secure_directories;
    }
}