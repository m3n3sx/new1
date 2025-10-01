<?php
/**
 * ErrorLogger - Comprehensive error logging and exception handling
 *
 * Provides PHP error logging, exception handling, error categorization,
 * performance monitoring, and integration with WordPress debugging systems.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * ErrorLogger class for comprehensive error handling
 */
class LAS_ErrorLogger {

    /**
     * Error levels
     */
    const LEVEL_DEBUG = 'debug';
    const LEVEL_INFO = 'info';
    const LEVEL_WARNING = 'warning';
    const LEVEL_ERROR = 'error';
    const LEVEL_CRITICAL = 'critical';

    /**
     * Error categories
     */
    const CATEGORY_SYSTEM = 'system';
    const CATEGORY_SECURITY = 'security';
    const CATEGORY_PERFORMANCE = 'performance';
    const CATEGORY_USER = 'user';
    const CATEGORY_NETWORK = 'network';
    const CATEGORY_DATABASE = 'database';

    /**
     * Configuration
     * @var array
     */
    private $config = [
        'enabled' => true,
        'log_to_file' => true,
        'log_to_database' => false,
        'max_log_entries' => 1000,
        'retention_days' => 30,
        'email_critical' => false,
        'admin_email' => '',
        'rate_limit' => 100,
        'include_trace' => true,
        'include_context' => true
    ];

    /**
     * Error statistics
     * @var array
     */
    private $stats = [
        'total_errors' => 0,
        'errors_by_level' => [],
        'errors_by_category' => [],
        'last_error_time' => 0,
        'session_errors' => 0
    ];

    /**
     * Rate limiting storage
     * @var array
     */
    private $rate_limits = [];

    /**
     * Log file path
     * @var string
     */
    private $log_file;

    /**
     * Database table name
     * @var string
     */
    private $table_name;

    /**
     * Constructor
     *
     * @param array $config Configuration options
     */
    public function __construct($config = []) {
        $this->config = array_merge($this->config, $config);

        $upload_dir = wp_upload_dir();
        $this->log_file = $upload_dir['basedir'] . '/las-error.log';

        global $wpdb;
        $this->table_name = $wpdb->prefix . 'las_error_log';

        $this->init();
    }

    /**
     * Initialize error logger
     */
    private function init() {
        if (!$this->config['enabled']) {
            return;
        }

        $this->setup_error_handlers();

        if ($this->config['log_to_database']) {
            $this->create_database_table();
        }

        $this->setup_cleanup_hooks();

        $this->load_statistics();
    }

    /**
     * Set up PHP error handlers
     */
    private function setup_error_handlers() {

        set_error_handler([$this, 'handle_php_error']);

        set_exception_handler([$this, 'handle_exception']);

        register_shutdown_function([$this, 'handle_shutdown']);
    }

    /**
     * Log error message
     *
     * @param string $level Error level
     * @param string $message Error message
     * @param array $context Additional context
     * @param string $category Error category
     * @return bool Success status
     */
    public function log($level, $message, $context = [], $category = self::CATEGORY_SYSTEM) {
        if (!$this->config['enabled']) {
            return false;
        }

        if (!$this->check_rate_limit($level)) {
            return false;
        }

        $error_entry = $this->create_error_entry($level, $message, $context, $category);

        $success = true;

        if ($this->config['log_to_file']) {
            $success = $this->log_to_file($error_entry) && $success;
        }

        if ($this->config['log_to_database']) {
            $success = $this->log_to_database($error_entry) && $success;
        }

        $success = $this->log_to_wp_debug($error_entry) && $success;

        $this->update_statistics($level, $category);

        if ($level === self::LEVEL_CRITICAL) {
            $this->handle_critical_error($error_entry);
        }

        return $success;
    }

    /**
     * Log debug message
     *
     * @param string $message Debug message
     * @param array $context Additional context
     * @param string $category Error category
     * @return bool Success status
     */
    public function debug($message, $context = [], $category = self::CATEGORY_SYSTEM) {
        return $this->log(self::LEVEL_DEBUG, $message, $context, $category);
    }

    /**
     * Log info message
     *
     * @param string $message Info message
     * @param array $context Additional context
     * @param string $category Error category
     * @return bool Success status
     */
    public function info($message, $context = [], $category = self::CATEGORY_SYSTEM) {
        return $this->log(self::LEVEL_INFO, $message, $context, $category);
    }

    /**
     * Log warning message
     *
     * @param string $message Warning message
     * @param array $context Additional context
     * @param string $category Error category
     * @return bool Success status
     */
    public function warning($message, $context = [], $category = self::CATEGORY_SYSTEM) {
        return $this->log(self::LEVEL_WARNING, $message, $context, $category);
    }

    /**
     * Log error message
     *
     * @param string $message Error message
     * @param array $context Additional context
     * @param string $category Error category
     * @return bool Success status
     */
    public function error($message, $context = [], $category = self::CATEGORY_SYSTEM) {
        return $this->log(self::LEVEL_ERROR, $message, $context, $category);
    }

    /**
     * Log critical message
     *
     * @param string $message Critical message
     * @param array $context Additional context
     * @param string $category Error category
     * @return bool Success status
     */
    public function critical($message, $context = [], $category = self::CATEGORY_SYSTEM) {
        return $this->log(self::LEVEL_CRITICAL, $message, $context, $category);
    }

    /**
     * Handle PHP errors
     *
     * @param int $errno Error number
     * @param string $errstr Error message
     * @param string $errfile Error file
     * @param int $errline Error line
     * @return bool Whether to continue with normal error handling
     */
    public function handle_php_error($errno, $errstr, $errfile, $errline) {

        if (!(error_reporting() & $errno)) {
            return false;
        }

        $level_map = [
            E_ERROR => self::LEVEL_CRITICAL,
            E_WARNING => self::LEVEL_WARNING,
            E_PARSE => self::LEVEL_CRITICAL,
            E_NOTICE => self::LEVEL_INFO,
            E_CORE_ERROR => self::LEVEL_CRITICAL,
            E_CORE_WARNING => self::LEVEL_WARNING,
            E_COMPILE_ERROR => self::LEVEL_CRITICAL,
            E_COMPILE_WARNING => self::LEVEL_WARNING,
            E_USER_ERROR => self::LEVEL_ERROR,
            E_USER_WARNING => self::LEVEL_WARNING,
            E_USER_NOTICE => self::LEVEL_INFO,
            E_STRICT => self::LEVEL_INFO,
            E_RECOVERABLE_ERROR => self::LEVEL_ERROR,
            E_DEPRECATED => self::LEVEL_INFO,
            E_USER_DEPRECATED => self::LEVEL_INFO
        ];

        $level = $level_map[$errno] ?? self::LEVEL_ERROR;

        $context = [
            'errno' => $errno,
            'file' => $errfile,
            'line' => $errline,
            'php_error' => true
        ];

        $this->log($level, $errstr, $context, self::CATEGORY_SYSTEM);

        return true;
    }

    /**
     * Handle uncaught exceptions
     *
     * @param Throwable $exception Exception object
     */
    public function handle_exception($exception) {
        $context = [
            'exception_class' => get_class($exception),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'previous' => $exception->getPrevious() ? $exception->getPrevious()->getMessage() : null
        ];

        $this->log(self::LEVEL_CRITICAL, $exception->getMessage(), $context, self::CATEGORY_SYSTEM);
    }

    /**
     * Handle fatal errors on shutdown
     */
    public function handle_shutdown() {
        $error = error_get_last();

        if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            $context = [
                'type' => $error['type'],
                'file' => $error['file'],
                'line' => $error['line'],
                'fatal_error' => true
            ];

            $this->log(self::LEVEL_CRITICAL, $error['message'], $context, self::CATEGORY_SYSTEM);
        }
    }

    /**
     * Create error entry
     *
     * @param string $level Error level
     * @param string $message Error message
     * @param array $context Additional context
     * @param string $category Error category
     * @return array Error entry
     */
    private function create_error_entry($level, $message, $context, $category) {
        $entry = [
            'timestamp' => current_time('mysql'),
            'level' => $level,
            'message' => $message,
            'category' => $category,
            'user_id' => get_current_user_id(),
            'ip_address' => $this->get_client_ip(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? '',
            'memory_usage' => memory_get_usage(true),
            'peak_memory' => memory_get_peak_usage(true)
        ];

        if ($this->config['include_context'] && !empty($context)) {
            $entry['context'] = $context;
        }

        if ($this->config['include_trace'] && !isset($context['trace'])) {
            $entry['trace'] = $this->get_stack_trace();
        }

        return $entry;
    }

    /**
     * Log to file
     *
     * @param array $error_entry Error entry
     * @return bool Success status
     */
    private function log_to_file($error_entry) {
        if (!$this->config['log_to_file']) {
            return false;
        }

        $log_line = $this->format_log_entry($error_entry);

        $log_dir = dirname($this->log_file);
        if (!file_exists($log_dir)) {
            wp_mkdir_p($log_dir);
        }

        $result = file_put_contents($this->log_file, $log_line . PHP_EOL, FILE_APPEND | LOCK_EX);

        if ($result && filesize($this->log_file) > 10 * 1024 * 1024) {
            $this->rotate_log_file();
        }

        return $result !== false;
    }

    /**
     * Log to database
     *
     * @param array $error_entry Error entry
     * @return bool Success status
     */
    private function log_to_database($error_entry) {
        if (!$this->config['log_to_database']) {
            return false;
        }

        global $wpdb;

        $data = [
            'timestamp' => $error_entry['timestamp'],
            'level' => $error_entry['level'],
            'message' => $error_entry['message'],
            'category' => $error_entry['category'],
            'user_id' => $error_entry['user_id'],
            'ip_address' => $error_entry['ip_address'],
            'user_agent' => substr($error_entry['user_agent'], 0, 255),
            'request_uri' => substr($error_entry['request_uri'], 0, 255),
            'request_method' => $error_entry['request_method'],
            'memory_usage' => $error_entry['memory_usage'],
            'peak_memory' => $error_entry['peak_memory'],
            'context' => isset($error_entry['context']) ? wp_json_encode($error_entry['context']) : null,
            'trace' => isset($error_entry['trace']) ? $error_entry['trace'] : null
        ];

        $result = $wpdb->insert($this->table_name, $data);

        return $result !== false;
    }

    /**
     * Log to WordPress debug log
     *
     * @param array $error_entry Error entry
     * @return bool Success status
     */
    private function log_to_wp_debug($error_entry) {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return false;
        }

        $log_message = sprintf(
            '[LAS %s] %s: %s',
            strtoupper($error_entry['level']),
            $error_entry['category'],
            $error_entry['message']
        );

        if (isset($error_entry['context']['file']) && isset($error_entry['context']['line'])) {
            $log_message .= sprintf(' in %s:%d', $error_entry['context']['file'], $error_entry['context']['line']);
        }

        error_log($log_message);

        return true;
    }

    /**
     * Format log entry for file output
     *
     * @param array $error_entry Error entry
     * @return string Formatted log entry
     */
    private function format_log_entry($error_entry) {
        $parts = [
            '[' . $error_entry['timestamp'] . ']',
            strtoupper($error_entry['level']),
            $error_entry['category'],
            $error_entry['message']
        ];

        if (isset($error_entry['context']['file']) && isset($error_entry['context']['line'])) {
            $parts[] = 'in ' . $error_entry['context']['file'] . ':' . $error_entry['context']['line'];
        }

        if ($error_entry['user_id']) {
            $parts[] = 'User:' . $error_entry['user_id'];
        }

        $parts[] = 'Memory:' . size_format($error_entry['memory_usage']);

        $log_line = implode(' | ', $parts);

        if (isset($error_entry['context']) && !empty($error_entry['context'])) {
            $log_line .= ' | Context: ' . wp_json_encode($error_entry['context']);
        }

        return $log_line;
    }

    /**
     * Check rate limiting
     *
     * @param string $level Error level
     * @return bool Whether logging is allowed
     */
    private function check_rate_limit($level) {
        $current_hour = floor(time() / 3600);
        $key = $level . '_' . $current_hour;

        if (!isset($this->rate_limits[$key])) {
            $this->rate_limits[$key] = 0;
        }

        $this->rate_limits[$key]++;

        if ($level === self::LEVEL_CRITICAL) {
            return true;
        }

        return $this->rate_limits[$key] <= $this->config['rate_limit'];
    }

    /**
     * Update error statistics
     *
     * @param string $level Error level
     * @param string $category Error category
     */
    private function update_statistics($level, $category) {
        $this->stats['total_errors']++;
        $this->stats['session_errors']++;
        $this->stats['last_error_time'] = time();

        if (!isset($this->stats['errors_by_level'][$level])) {
            $this->stats['errors_by_level'][$level] = 0;
        }
        $this->stats['errors_by_level'][$level]++;

        if (!isset($this->stats['errors_by_category'][$category])) {
            $this->stats['errors_by_category'][$category] = 0;
        }
        $this->stats['errors_by_category'][$category]++;

        if ($this->stats['session_errors'] % 10 === 0) {
            $this->save_statistics();
        }
    }

    /**
     * Handle critical errors
     *
     * @param array $error_entry Error entry
     */
    private function handle_critical_error($error_entry) {

        if ($this->config['email_critical'] && !empty($this->config['admin_email'])) {
            $this->send_critical_error_email($error_entry);
        }

        if (function_exists('syslog')) {
            syslog(LOG_CRIT, 'LAS Critical Error: ' . $error_entry['message']);
        }
    }

    /**
     * Send critical error email
     *
     * @param array $error_entry Error entry
     */
    private function send_critical_error_email($error_entry) {
        $subject = 'Live Admin Styler Critical Error - ' . get_bloginfo('name');

        $message = "A critical error occurred in Live Admin Styler:\n\n";
        $message .= "Time: " . $error_entry['timestamp'] . "\n";
        $message .= "Message: " . $error_entry['message'] . "\n";
        $message .= "Category: " . $error_entry['category'] . "\n";

        if (isset($error_entry['context']['file'])) {
            $message .= "File: " . $error_entry['context']['file'] . "\n";
        }

        if (isset($error_entry['context']['line'])) {
            $message .= "Line: " . $error_entry['context']['line'] . "\n";
        }

        $message .= "User ID: " . $error_entry['user_id'] . "\n";
        $message .= "IP Address: " . $error_entry['ip_address'] . "\n";
        $message .= "Memory Usage: " . size_format($error_entry['memory_usage']) . "\n";

        if (isset($error_entry['trace'])) {
            $message .= "\nStack Trace:\n" . $error_entry['trace'] . "\n";
        }

        wp_mail($this->config['admin_email'], $subject, $message);
    }

    /**
     * Get client IP address
     *
     * @return string Client IP address
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

        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * Get stack trace
     *
     * @return string Stack trace
     */
    private function get_stack_trace() {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);

        $filtered_trace = array_filter($trace, function($frame) {
            return !isset($frame['class']) || $frame['class'] !== __CLASS__;
        });

        $trace_lines = [];
        foreach ($filtered_trace as $i => $frame) {
            $file = $frame['file'] ?? 'unknown';
            $line = $frame['line'] ?? 'unknown';
            $function = $frame['function'] ?? 'unknown';
            $class = isset($frame['class']) ? $frame['class'] . '::' : '';

            $trace_lines[] = "#{$i} {$file}({$line}): {$class}{$function}()";
        }

        return implode("\n", $trace_lines);
    }

    /**
     * Create database table
     */
    private function create_database_table() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            timestamp datetime NOT NULL,
            level varchar(20) NOT NULL,
            message text NOT NULL,
            category varchar(50) NOT NULL,
            user_id bigint(20) unsigned DEFAULT NULL,
            ip_address varchar(45) DEFAULT NULL,
            user_agent varchar(255) DEFAULT NULL,
            request_uri varchar(255) DEFAULT NULL,
            request_method varchar(10) DEFAULT NULL,
            memory_usage bigint(20) unsigned DEFAULT NULL,
            peak_memory bigint(20) unsigned DEFAULT NULL,
            context longtext DEFAULT NULL,
            trace longtext DEFAULT NULL,
            PRIMARY KEY (id),
            KEY level (level),
            KEY category (category),
            KEY timestamp (timestamp),
            KEY user_id (user_id)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    /**
     * Rotate log file
     */
    private function rotate_log_file() {
        if (!file_exists($this->log_file)) {
            return;
        }

        $backup_file = $this->log_file . '.' . date('Y-m-d-H-i-s');

        if (rename($this->log_file, $backup_file)) {

            if (function_exists('gzopen')) {
                $this->compress_log_file($backup_file);
            }

            $this->cleanup_old_log_files();
        }
    }

    /**
     * Compress log file
     *
     * @param string $file_path File path to compress
     */
    private function compress_log_file($file_path) {
        $compressed_file = $file_path . '.gz';

        $source = fopen($file_path, 'rb');
        $dest = gzopen($compressed_file, 'wb9');

        if ($source && $dest) {
            while (!feof($source)) {
                gzwrite($dest, fread($source, 8192));
            }

            fclose($source);
            gzclose($dest);

            unlink($file_path);
        }
    }

    /**
     * Clean up old log files
     */
    private function cleanup_old_log_files() {
        $log_dir = dirname($this->log_file);
        $log_basename = basename($this->log_file);

        $files = glob($log_dir . '/' . $log_basename . '.*');

        if (empty($files)) {
            return;
        }

        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });

        $files_to_delete = array_slice($files, 10);

        foreach ($files_to_delete as $file) {
            unlink($file);
        }
    }

    /**
     * Setup cleanup hooks
     */
    private function setup_cleanup_hooks() {

        if (!wp_next_scheduled('las_error_log_cleanup')) {
            wp_schedule_event(time(), 'daily', 'las_error_log_cleanup');
        }

        add_action('las_error_log_cleanup', [$this, 'cleanup_old_entries']);
    }

    /**
     * Clean up old log entries
     */
    public function cleanup_old_entries() {
        if ($this->config['log_to_database']) {
            $this->cleanup_database_entries();
        }

        $this->cleanup_old_log_files();
    }

    /**
     * Clean up old database entries
     */
    private function cleanup_database_entries() {
        global $wpdb;

        $retention_date = date('Y-m-d H:i:s', strtotime('-' . $this->config['retention_days'] . ' days'));

        $deleted = $wpdb->query($wpdb->prepare(
            "DELETE FROM {$this->table_name} WHERE timestamp < %s",
            $retention_date
        ));

        $total_entries = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");

        if ($total_entries > $this->config['max_log_entries']) {
            $excess = $total_entries - $this->config['max_log_entries'];

            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$this->table_name} ORDER BY timestamp ASC LIMIT %d",
                $excess
            ));
        }

        $wpdb->query("OPTIMIZE TABLE {$this->table_name}");
    }

    /**
     * Load statistics from database
     */
    private function load_statistics() {
        $saved_stats = get_option('las_error_statistics', []);

        if (!empty($saved_stats)) {
            $this->stats = array_merge($this->stats, $saved_stats);
        }
    }

    /**
     * Save statistics to database
     */
    private function save_statistics() {
        update_option('las_error_statistics', $this->stats);
    }

    /**
     * Get error statistics
     *
     * @return array Error statistics
     */
    public function getStatistics() {
        return array_merge($this->stats, [
            'rate_limits' => $this->rate_limits,
            'configuration' => $this->config,
            'log_file_size' => file_exists($this->log_file) ? filesize($this->log_file) : 0,
            'log_file_exists' => file_exists($this->log_file)
        ]);
    }

    /**
     * Get recent errors
     *
     * @param int $limit Number of errors to retrieve
     * @param string $level Optional level filter
     * @param string $category Optional category filter
     * @return array Recent errors
     */
    public function getRecentErrors($limit = 50, $level = null, $category = null) {
        if (!$this->config['log_to_database']) {
            return $this->get_recent_errors_from_file($limit, $level, $category);
        }

        global $wpdb;

        $where_conditions = [];
        $where_values = [];

        if ($level) {
            $where_conditions[] = 'level = %s';
            $where_values[] = $level;
        }

        if ($category) {
            $where_conditions[] = 'category = %s';
            $where_values[] = $category;
        }

        $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

        $query = "SELECT * FROM {$this->table_name} {$where_clause} ORDER BY timestamp DESC LIMIT %d";
        $where_values[] = $limit;

        $results = $wpdb->get_results($wpdb->prepare($query, $where_values), ARRAY_A);

        foreach ($results as &$result) {
            if ($result['context']) {
                $result['context'] = json_decode($result['context'], true);
            }
        }

        return $results;
    }

    /**
     * Get recent errors from file
     *
     * @param int $limit Number of errors to retrieve
     * @param string $level Optional level filter
     * @param string $category Optional category filter
     * @return array Recent errors
     */
    private function get_recent_errors_from_file($limit, $level, $category) {
        if (!file_exists($this->log_file)) {
            return [];
        }

        $lines = file($this->log_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $lines = array_reverse($lines);

        $errors = [];
        $count = 0;

        foreach ($lines as $line) {
            if ($count >= $limit) {
                break;
            }

            $parsed = $this->parse_log_line($line);

            if ($parsed &&
                (!$level || $parsed['level'] === $level) &&
                (!$category || $parsed['category'] === $category)) {

                $errors[] = $parsed;
                $count++;
            }
        }

        return $errors;
    }

    /**
     * Parse log line
     *
     * @param string $line Log line
     * @return array|null Parsed log entry
     */
    private function parse_log_line($line) {

        if (preg_match('/^\[([^\]]+)\]\s+(\w+)\s+(\w+)\s+(.+)/', $line, $matches)) {
            return [
                'timestamp' => $matches[1],
                'level' => strtolower($matches[2]),
                'category' => $matches[3],
                'message' => $matches[4]
            ];
        }

        return null;
    }

    /**
     * Clear all logs
     *
     * @return bool Success status
     */
    public function clearLogs() {
        $success = true;

        if (file_exists($this->log_file)) {
            $success = unlink($this->log_file) && $success;
        }

        if ($this->config['log_to_database']) {
            global $wpdb;
            $result = $wpdb->query("TRUNCATE TABLE {$this->table_name}");
            $success = ($result !== false) && $success;
        }

        $this->stats = [
            'total_errors' => 0,
            'errors_by_level' => [],
            'errors_by_category' => [],
            'last_error_time' => 0,
            'session_errors' => 0
        ];

        $this->save_statistics();

        return $success;
    }

    /**
     * Export logs
     *
     * @param string $format Export format (json, csv, txt)
     * @param int $limit Number of entries to export
     * @return string|false Exported data or false on failure
     */
    public function exportLogs($format = 'json', $limit = 1000) {
        $errors = $this->getRecentErrors($limit);

        switch ($format) {
            case 'json':
                return wp_json_encode($errors, JSON_PRETTY_PRINT);

            case 'csv':
                return $this->export_to_csv($errors);

            case 'txt':
                return $this->export_to_txt($errors);

            default:
                return false;
        }
    }

    /**
     * Export to CSV format
     *
     * @param array $errors Error entries
     * @return string CSV data
     */
    private function export_to_csv($errors) {
        if (empty($errors)) {
            return '';
        }

        $output = fopen('php:

        $headers = array_keys($errors[0]);
        fputcsv($output, $headers);

        foreach ($errors as $error) {

            foreach ($error as &$value) {
                if (is_array($value)) {
                    $value = wp_json_encode($value);
                }
            }
            fputcsv($output, $error);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }

    /**
     * Export to text format
     *
     * @param array $errors Error entries
     * @return string Text data
     */
    private function export_to_txt($errors) {
        $lines = [];

        foreach ($errors as $error) {
            $line = sprintf(
                '[%s] %s %s: %s',
                $error['timestamp'],
                strtoupper($error['level']),
                $error['category'],
                $error['message']
            );

            if (isset($error['context']['file']) && isset($error['context']['line'])) {
                $line .= sprintf(' in %s:%d', $error['context']['file'], $error['context']['line']);
            }

            $lines[] = $line;
        }

        return implode("\n", $lines);
    }

    /**
     * Get error summary
     *
     * @param int $days Number of days to analyze
     * @return array Error summary
     */
    public function getErrorSummary($days = 7) {
        if (!$this->config['log_to_database']) {
            return ['message' => 'Database logging not enabled'];
        }

        global $wpdb;

        $start_date = date('Y-m-d H:i:s', strtotime("-{$days} days"));

        $level_counts = $wpdb->get_results($wpdb->prepare(
            "SELECT level, COUNT(*) as count FROM {$this->table_name}
             WHERE timestamp >= %s
             GROUP BY level
             ORDER BY count DESC",
            $start_date
        ), ARRAY_A);

        $category_counts = $wpdb->get_results($wpdb->prepare(
            "SELECT category, COUNT(*) as count FROM {$this->table_name}
             WHERE timestamp >= %s
             GROUP BY category
             ORDER BY count DESC",
            $start_date
        ), ARRAY_A);

        $hourly_counts = $wpdb->get_results($wpdb->prepare(
            "SELECT HOUR(timestamp) as hour, COUNT(*) as count FROM {$this->table_name}
             WHERE timestamp >= %s
             GROUP BY HOUR(timestamp)
             ORDER BY hour",
            $start_date
        ), ARRAY_A);

        $common_errors = $wpdb->get_results($wpdb->prepare(
            "SELECT message, COUNT(*) as count FROM {$this->table_name}
             WHERE timestamp >= %s
             GROUP BY message
             ORDER BY count DESC
             LIMIT 10",
            $start_date
        ), ARRAY_A);

        return [
            'period' => $days . ' days',
            'start_date' => $start_date,
            'level_distribution' => $level_counts,
            'category_distribution' => $category_counts,
            'hourly_distribution' => $hourly_counts,
            'most_common_errors' => $common_errors,
            'total_errors' => array_sum(array_column($level_counts, 'count'))
        ];
    }

    /**
     * Test error logging
     *
     * @return array Test results
     */
    public function testErrorLogging() {
        $results = [
            'file_logging' => false,
            'database_logging' => false,
            'wp_debug_logging' => false,
            'error_handling' => false
        ];

        if ($this->config['log_to_file']) {
            $test_message = 'Test error log entry - ' . time();
            $this->debug($test_message, ['test' => true], 'test');

            if (file_exists($this->log_file)) {
                $log_content = file_get_contents($this->log_file);
                $results['file_logging'] = strpos($log_content, $test_message) !== false;
            }
        }

        if ($this->config['log_to_database']) {
            global $wpdb;

            $test_message = 'Test database log entry - ' . time();
            $this->info($test_message, ['test' => true], 'test');

            $count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE message = %s",
                $test_message
            ));

            $results['database_logging'] = $count > 0;
        }

        $results['wp_debug_logging'] = defined('WP_DEBUG') && WP_DEBUG;

        $results['error_handling'] = true;

        return $results;
    }
}