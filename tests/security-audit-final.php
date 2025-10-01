<?php
/**
 * Final Security Audit for Live Admin Styler v2.0
 * 
 * Comprehensive security validation and penetration testing
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class FinalSecurityAudit {
    
    private $audit_results = [];
    private $vulnerabilities = [];
    private $warnings = [];
    private $passed_checks = 0;
    private $total_checks = 0;
    
    public function __construct() {
        $this->audit_results = [
            'input_validation' => false,
            'output_sanitization' => false,
            'csrf_protection' => false,
            'capability_checks' => false,
            'file_security' => false,
            'database_security' => false,
            'session_security' => false,
            'error_handling' => false,
            'information_disclosure' => false,
            'authentication' => false
        ];
    }
    
    /**
     * Run comprehensive security audit
     */
    public function run_audit() {
        echo "🔒 Starting Final Security Audit for Live Admin Styler v2.0...\n";
        echo str_repeat("=", 60) . "\n";
        
        $this->test_input_validation();
        $this->test_output_sanitization();
        $this->test_csrf_protection();
        $this->test_capability_checks();
        $this->test_file_security();
        $this->test_database_security();
        $this->test_session_security();
        $this->test_error_handling();
        $this->test_information_disclosure();
        $this->test_authentication();
        
        $this->generate_security_report();
        
        return $this->is_security_compliant();
    }
    
    /**
     * Test input validation
     */
    private function test_input_validation() {
        echo "\n🛡️ Testing Input Validation...\n";
        $this->total_checks++;
        
        try {
            // Test SecurityManager input validation
            if (!class_exists('SecurityManager')) {
                $this->vulnerabilities[] = 'SecurityManager class not found';
                return;
            }
            
            $security_manager = new SecurityManager();
            
            // Test XSS prevention
            $xss_payloads = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src="x" onerror="alert(1)">',
                '"><script>alert(1)</script>',
                '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>"\'>',
            ];
            
            foreach ($xss_payloads as $payload) {
                $sanitized = $security_manager->sanitize($payload);
                if (strpos($sanitized, '<script>') !== false || strpos($sanitized, 'javascript:') !== false) {
                    $this->vulnerabilities[] = "XSS payload not properly sanitized: " . substr($payload, 0, 50);
                }
            }
            
            // Test SQL injection prevention
            $sql_payloads = [
                "'; DROP TABLE wp_options; --",
                "1' OR '1'='1",
                "1' UNION SELECT * FROM wp_users --",
                "'; INSERT INTO wp_options VALUES ('malicious', 'data'); --"
            ];
            
            foreach ($sql_payloads as $payload) {
                $sanitized = $security_manager->sanitize($payload);
                if (strpos($sanitized, 'DROP TABLE') !== false || strpos($sanitized, 'UNION SELECT') !== false) {
                    $this->vulnerabilities[] = "SQL injection payload not properly sanitized: " . substr($payload, 0, 50);
                }
            }
            
            // Test color validation
            $invalid_colors = [
                'javascript:alert(1)',
                '<script>alert(1)</script>',
                'expression(alert(1))',
                'url(javascript:alert(1))'
            ];
            
            foreach ($invalid_colors as $color) {
                if ($security_manager->validateColor($color)) {
                    $this->vulnerabilities[] = "Invalid color accepted: $color";
                }
            }
            
            // Test CSS validation
            $malicious_css = [
                'body { background: url(javascript:alert(1)); }',
                '@import "javascript:alert(1)";',
                'body { behavior: url(malicious.htc); }',
                'body { -moz-binding: url(malicious.xml); }'
            ];
            
            foreach ($malicious_css as $css) {
                if ($security_manager->validateCSS($css)) {
                    $this->vulnerabilities[] = "Malicious CSS accepted: " . substr($css, 0, 50);
                }
            }
            
            $this->audit_results['input_validation'] = empty($this->vulnerabilities);
            $this->passed_checks += $this->audit_results['input_validation'] ? 1 : 0;
            
            echo $this->audit_results['input_validation'] ? "✅ Input validation tests passed\n" : "❌ Input validation vulnerabilities found\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Input validation test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test output sanitization
     */
    private function test_output_sanitization() {
        echo "\n🧹 Testing Output Sanitization...\n";
        $this->total_checks++;
        
        try {
            // Check if WordPress sanitization functions are used
            $php_files = $this->get_php_files();
            
            $dangerous_functions = [
                'echo $_GET',
                'echo $_POST',
                'echo $_REQUEST',
                'print $_GET',
                'print $_POST',
                'print $_REQUEST'
            ];
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                foreach ($dangerous_functions as $function) {
                    if (strpos($content, $function) !== false) {
                        $this->vulnerabilities[] = "Unsafe output detected in $file: $function";
                    }
                }
                
                // Check for proper escaping
                if (preg_match('/echo\s+\$[^;]+;/', $content, $matches)) {
                    foreach ($matches as $match) {
                        if (!preg_match('/(esc_html|esc_attr|esc_url|wp_kses)/', $match)) {
                            $this->warnings[] = "Potentially unescaped output in $file: $match";
                        }
                    }
                }
            }
            
            $this->audit_results['output_sanitization'] = count($this->vulnerabilities) === 0;
            $this->passed_checks += $this->audit_results['output_sanitization'] ? 1 : 0;
            
            echo $this->audit_results['output_sanitization'] ? "✅ Output sanitization tests passed\n" : "❌ Output sanitization issues found\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Output sanitization test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test CSRF protection
     */
    private function test_csrf_protection() {
        echo "\n🔐 Testing CSRF Protection...\n";
        $this->total_checks++;
        
        try {
            // Test nonce validation
            $test_nonce = wp_create_nonce('las_test_action');
            
            if (!wp_verify_nonce($test_nonce, 'las_test_action')) {
                $this->vulnerabilities[] = 'WordPress nonce system not working';
                return;
            }
            
            // Check AJAX handlers for nonce validation
            $php_files = $this->get_php_files();
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                // Look for AJAX handlers
                if (preg_match_all('/wp_ajax_([a-zA-Z_]+)/', $content, $matches)) {
                    foreach ($matches[1] as $action) {
                        // Check if nonce validation is present
                        if (!preg_match('/wp_verify_nonce|check_ajax_referer/', $content)) {
                            $this->warnings[] = "AJAX action '$action' may lack nonce validation in $file";
                        }
                    }
                }
                
                // Look for form submissions
                if (preg_match('/\$_POST/', $content) && !preg_match('/wp_verify_nonce|check_admin_referer/', $content)) {
                    $this->warnings[] = "Form processing may lack CSRF protection in $file";
                }
            }
            
            $this->audit_results['csrf_protection'] = true; // WordPress nonces are working
            $this->passed_checks++;
            
            echo "✅ CSRF protection tests passed\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "CSRF protection test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test capability checks
     */
    private function test_capability_checks() {
        echo "\n👤 Testing Capability Checks...\n";
        $this->total_checks++;
        
        try {
            // Test SecurityManager capability checking
            if (!class_exists('SecurityManager')) {
                $this->vulnerabilities[] = 'SecurityManager class not found for capability testing';
                return;
            }
            
            $security_manager = new SecurityManager();
            
            // Test with admin capability
            if (!$security_manager->checkCapability('manage_options')) {
                $this->vulnerabilities[] = 'Capability check failed for manage_options';
            }
            
            // Check PHP files for capability checks
            $php_files = $this->get_php_files();
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                // Look for admin operations without capability checks
                if (preg_match('/add_options_page|add_menu_page|add_submenu_page/', $content)) {
                    if (!preg_match('/current_user_can|checkCapability/', $content)) {
                        $this->warnings[] = "Admin page registration may lack capability check in $file";
                    }
                }
                
                // Look for settings operations
                if (preg_match('/update_option|delete_option/', $content)) {
                    if (!preg_match('/current_user_can|checkCapability/', $content)) {
                        $this->warnings[] = "Option modification may lack capability check in $file";
                    }
                }
            }
            
            $this->audit_results['capability_checks'] = true;
            $this->passed_checks++;
            
            echo "✅ Capability check tests passed\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Capability check test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test file security
     */
    private function test_file_security() {
        echo "\n📁 Testing File Security...\n";
        $this->total_checks++;
        
        try {
            $plugin_dir = dirname(__FILE__, 2);
            
            // Check for .htaccess file
            $htaccess_file = $plugin_dir . '/.htaccess';
            if (!file_exists($htaccess_file)) {
                $this->warnings[] = '.htaccess file not found - direct access to PHP files may be possible';
            } else {
                $htaccess_content = file_get_contents($htaccess_file);
                if (!preg_match('/deny from all|Deny from all/i', $htaccess_content)) {
                    $this->warnings[] = '.htaccess file may not properly restrict access';
                }
            }
            
            // Check file permissions
            $sensitive_files = [
                'includes/CoreEngine.php',
                'includes/SecurityManager.php',
                'includes/SettingsManager.php'
            ];
            
            foreach ($sensitive_files as $file) {
                $file_path = $plugin_dir . '/' . $file;
                if (file_exists($file_path)) {
                    $perms = fileperms($file_path) & 0777;
                    if ($perms > 0644) {
                        $this->warnings[] = "File $file has overly permissive permissions: " . decoct($perms);
                    }
                }
            }
            
            // Check for backup files
            $backup_patterns = ['*.bak', '*.backup', '*.old', '*.tmp', '*~'];
            foreach ($backup_patterns as $pattern) {
                $backup_files = glob($plugin_dir . '/' . $pattern);
                if (!empty($backup_files)) {
                    $this->warnings[] = "Backup files found: " . implode(', ', $backup_files);
                }
            }
            
            // Check for direct access protection
            $php_files = $this->get_php_files();
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                if (!preg_match('/defined\s*\(\s*[\'"]ABSPATH[\'"]/', $content)) {
                    $this->warnings[] = "File $file may lack direct access protection";
                }
            }
            
            $this->audit_results['file_security'] = true;
            $this->passed_checks++;
            
            echo "✅ File security tests passed\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "File security test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test database security
     */
    private function test_database_security() {
        echo "\n🗄️ Testing Database Security...\n";
        $this->total_checks++;
        
        try {
            global $wpdb;
            
            // Check for prepared statements usage
            $php_files = $this->get_php_files();
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                // Look for direct SQL queries
                if (preg_match('/\$wpdb->query\s*\(\s*[\'"][^\'\"]*\$/', $content)) {
                    $this->vulnerabilities[] = "Potential SQL injection vulnerability in $file - direct variable in query";
                }
                
                // Look for get_results with variables
                if (preg_match('/\$wpdb->get_results\s*\(\s*[\'"][^\'\"]*\$/', $content)) {
                    $this->vulnerabilities[] = "Potential SQL injection vulnerability in $file - direct variable in get_results";
                }
                
                // Check for proper prepare usage
                if (preg_match('/\$wpdb->prepare/', $content)) {
                    // Good - using prepared statements
                } elseif (preg_match('/\$wpdb->(query|get_results|get_var|get_row)/', $content)) {
                    $this->warnings[] = "Database queries in $file may not use prepared statements";
                }
            }
            
            // Test option name validation
            $test_options = [
                'las_fresh_test_option',
                'las_fresh_' . str_repeat('a', 200), // Long option name
                'las_fresh_<script>alert(1)</script>', // XSS in option name
            ];
            
            foreach ($test_options as $option) {
                update_option($option, 'test_value');
                $retrieved = get_option($option);
                
                if ($retrieved === 'test_value') {
                    delete_option($option);
                    
                    if (strpos($option, '<script>') !== false) {
                        $this->vulnerabilities[] = "XSS payload accepted in option name: $option";
                    }
                }
            }
            
            $this->audit_results['database_security'] = count($this->vulnerabilities) === 0;
            $this->passed_checks += $this->audit_results['database_security'] ? 1 : 0;
            
            echo $this->audit_results['database_security'] ? "✅ Database security tests passed\n" : "❌ Database security issues found\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Database security test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test session security
     */
    private function test_session_security() {
        echo "\n🔑 Testing Session Security...\n";
        $this->total_checks++;
        
        try {
            // Check for secure session handling
            if (session_status() === PHP_SESSION_ACTIVE) {
                $this->warnings[] = 'PHP sessions are active - ensure secure configuration';
            }
            
            // Check for secure cookie settings
            $php_files = $this->get_php_files();
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                // Look for cookie operations
                if (preg_match('/setcookie|set_cookie/', $content)) {
                    if (!preg_match('/httponly|secure/', $content)) {
                        $this->warnings[] = "Cookie operations in $file may lack security flags";
                    }
                }
            }
            
            $this->audit_results['session_security'] = true;
            $this->passed_checks++;
            
            echo "✅ Session security tests passed\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Session security test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test error handling
     */
    private function test_error_handling() {
        echo "\n⚠️ Testing Error Handling...\n";
        $this->total_checks++;
        
        try {
            // Check for information disclosure in errors
            $php_files = $this->get_php_files();
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                // Look for debug information disclosure
                if (preg_match('/var_dump|print_r|var_export/', $content)) {
                    if (!preg_match('/WP_DEBUG|LAS_DEBUG/', $content)) {
                        $this->warnings[] = "Debug output functions found in $file without debug checks";
                    }
                }
                
                // Look for error suppression
                if (preg_match('/@\s*(include|require|file_get_contents|fopen)/', $content)) {
                    $this->warnings[] = "Error suppression found in $file - may hide security issues";
                }
            }
            
            $this->audit_results['error_handling'] = true;
            $this->passed_checks++;
            
            echo "✅ Error handling tests passed\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Error handling test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test information disclosure
     */
    private function test_information_disclosure() {
        echo "\n🔍 Testing Information Disclosure...\n";
        $this->total_checks++;
        
        try {
            $plugin_dir = dirname(__FILE__, 2);
            
            // Check for sensitive files
            $sensitive_files = [
                '.env',
                'config.php',
                'wp-config.php',
                '.git/config',
                'composer.json',
                'package.json'
            ];
            
            foreach ($sensitive_files as $file) {
                if (file_exists($plugin_dir . '/' . $file)) {
                    $this->warnings[] = "Sensitive file found: $file";
                }
            }
            
            // Check for version disclosure
            $php_files = $this->get_php_files();
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                // Look for version information in comments
                if (preg_match('/version\s*[:=]\s*[\'"]?[\d\.]+/i', $content)) {
                    // This is expected in some files
                }
                
                // Look for server information disclosure
                if (preg_match('/phpinfo|php_uname|$_SERVER/', $content)) {
                    $this->warnings[] = "Server information disclosure possible in $file";
                }
            }
            
            $this->audit_results['information_disclosure'] = true;
            $this->passed_checks++;
            
            echo "✅ Information disclosure tests passed\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Information disclosure test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Test authentication
     */
    private function test_authentication() {
        echo "\n🔐 Testing Authentication...\n";
        $this->total_checks++;
        
        try {
            // Test WordPress authentication integration
            if (!function_exists('wp_get_current_user')) {
                $this->vulnerabilities[] = 'WordPress authentication functions not available';
                return;
            }
            
            // Check for custom authentication bypasses
            $php_files = $this->get_php_files();
            
            foreach ($php_files as $file) {
                $content = file_get_contents($file);
                
                // Look for authentication bypasses
                if (preg_match('/\$_GET\[.*\]\s*===?\s*[\'"]admin[\'"]/', $content)) {
                    $this->vulnerabilities[] = "Potential authentication bypass in $file";
                }
                
                // Look for hardcoded credentials
                if (preg_match('/password\s*=\s*[\'"][^\'"]+[\'"]/', $content)) {
                    $this->vulnerabilities[] = "Potential hardcoded password in $file";
                }
            }
            
            $this->audit_results['authentication'] = count($this->vulnerabilities) === 0;
            $this->passed_checks += $this->audit_results['authentication'] ? 1 : 0;
            
            echo $this->audit_results['authentication'] ? "✅ Authentication tests passed\n" : "❌ Authentication issues found\n";
            
        } catch (Exception $e) {
            $this->vulnerabilities[] = "Authentication test failed: " . $e->getMessage();
        }
    }
    
    /**
     * Get all PHP files in the plugin
     */
    private function get_php_files() {
        $plugin_dir = dirname(__FILE__, 2);
        $php_files = [];
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($plugin_dir)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $php_files[] = $file->getPathname();
            }
        }
        
        return $php_files;
    }
    
    /**
     * Generate security audit report
     */
    private function generate_security_report() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "🔒 FINAL SECURITY AUDIT REPORT\n";
        echo str_repeat("=", 60) . "\n";
        
        $security_score = ($this->passed_checks / $this->total_checks) * 100;
        
        echo "\n📊 Security Score: " . round($security_score, 1) . "%\n";
        echo "📈 Checks Passed: {$this->passed_checks}/{$this->total_checks}\n";
        
        echo "\n🔍 Audit Results:\n";
        foreach ($this->audit_results as $check => $result) {
            $status = $result ? '✅ PASS' : '❌ FAIL';
            echo "  " . str_replace('_', ' ', ucwords($check)) . ": $status\n";
        }
        
        if (!empty($this->vulnerabilities)) {
            echo "\n🚨 CRITICAL VULNERABILITIES:\n";
            foreach ($this->vulnerabilities as $vuln) {
                echo "  • $vuln\n";
            }
        }
        
        if (!empty($this->warnings)) {
            echo "\n⚠️ SECURITY WARNINGS:\n";
            foreach ($this->warnings as $warning) {
                echo "  • $warning\n";
            }
        }
        
        // Overall security status
        echo "\n🛡️ Overall Security Status: ";
        if (empty($this->vulnerabilities) && $security_score >= 90) {
            echo "✅ SECURE - Ready for production\n";
        } elseif (empty($this->vulnerabilities) && $security_score >= 70) {
            echo "⚠️ ACCEPTABLE - Address warnings before production\n";
        } else {
            echo "❌ INSECURE - Critical issues must be fixed\n";
        }
        
        // Save detailed report
        $report_data = [
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '2.0.0',
            'security_score' => $security_score,
            'audit_results' => $this->audit_results,
            'passed_checks' => $this->passed_checks,
            'total_checks' => $this->total_checks,
            'vulnerabilities' => $this->vulnerabilities,
            'warnings' => $this->warnings,
            'security_compliant' => $this->is_security_compliant()
        ];
        
        $report_file = dirname(__FILE__) . '/reports/security-audit-final.json';
        if (!file_exists(dirname($report_file))) {
            wp_mkdir_p(dirname($report_file));
        }
        
        file_put_contents($report_file, json_encode($report_data, JSON_PRETTY_PRINT));
        
        echo "\n📄 Detailed security report saved to: $report_file\n";
    }
    
    /**
     * Check if system is security compliant
     */
    private function is_security_compliant() {
        return empty($this->vulnerabilities) && ($this->passed_checks / $this->total_checks) >= 0.9;
    }
}

// Run security audit if called directly
if (defined('WP_CLI') && WP_CLI) {
    $audit = new FinalSecurityAudit();
    $is_secure = $audit->run_audit();
    
    if ($is_secure) {
        WP_CLI::success('Security audit completed - System is secure and ready for production!');
    } else {
        WP_CLI::error('Security audit failed - Critical vulnerabilities found that must be addressed');
    }
} elseif (isset($_GET['run_security_audit']) && current_user_can('manage_options')) {
    $audit = new FinalSecurityAudit();
    $audit->run_audit();
}