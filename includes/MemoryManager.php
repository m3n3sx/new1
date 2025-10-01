<?php
/**
 * Memory Manager Class
 * 
 * Handles memory usage monitoring, leak detection, and garbage collection
 * for Live Admin Styler v2.0
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class LAS_MemoryManager {
    
    /**
     * Singleton instance
     * @var LAS_MemoryManager
     */
    private static $instance = null;
    
    /**
     * Memory usage snapshots
     * @var array
     */
    private $memory_snapshots = [];
    
    /**
     * Memory thresholds in bytes
     * @var array
     */
    private $thresholds = [
        'base_usage' => 12 * 1024 * 1024,    // 12MB base
        'peak_usage' => 25 * 1024 * 1024,    // 25MB peak
        'warning_usage' => 20 * 1024 * 1024, // 20MB warning
        'critical_usage' => 40 * 1024 * 1024, // 40MB critical
        'leak_threshold' => 5 * 1024 * 1024   // 5MB increase = potential leak
    ];
    
    /**
     * Large objects registry for cleanup
     * @var array
     */
    private $large_objects = [];
    
    /**
     * Memory leak detection data
     * @var array
     */
    private $leak_detection = [
        'baseline' => null,
        'samples' => [],
        'trend' => 0,
        'alerts' => []
    ];
    
    /**
     * Cleanup callbacks
     * @var array
     */
    private $cleanup_callbacks = [];
    
    /**
     * Monitoring enabled flag
     * @var bool
     */
    private $monitoring_enabled = true;
    
    /**
     * Get singleton instance
     * 
     * @return LAS_MemoryManager
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Private constructor for singleton
     */
    private function __construct() {
        $this->init();
    }
    
    /**
     * Initialize memory management
     */
    private function init() {
        // Set baseline memory usage
        $this->leak_detection['baseline'] = memory_get_usage(true);
        
        // Record initial snapshot
        $this->recordSnapshot('init');
        
        // Set up monitoring hooks
        add_action('init', [$this, 'startMonitoring'], 1);
        add_action('wp_loaded', [$this, 'recordSnapshot'], 10, ['wp_loaded']);
        add_action('admin_init', [$this, 'recordSnapshot'], 10, ['admin_init']);
        add_action('wp_footer', [$this, 'recordSnapshot'], 10, ['wp_footer']);
        add_action('admin_footer', [$this, 'recordSnapshot'], 10, ['admin_footer']);
        
        // Register shutdown function for cleanup
        register_shutdown_function([$this, 'shutdown']);
        
        // Set up periodic monitoring
        if (wp_doing_ajax() || is_admin()) {
            add_action('wp_ajax_las_memory_report', [$this, 'handleMemoryReport']);
        }
    }
    
    /**
     * Start memory monitoring
     */
    public function startMonitoring() {
        if (!$this->monitoring_enabled) {
            return;
        }
        
        // Schedule periodic checks
        if (!wp_next_scheduled('las_memory_check')) {
            wp_schedule_event(time(), 'hourly', 'las_memory_check');
        }
        
        add_action('las_memory_check', [$this, 'performPeriodicCheck']);
    }
    
    /**
     * Record memory snapshot
     * 
     * @param string $label Snapshot label
     * @return array Memory snapshot data
     */
    public function recordSnapshot($label = '') {
        if (!$this->monitoring_enabled) {
            return null;
        }
        
        $snapshot = [
            'label' => $label,
            'timestamp' => microtime(true),
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'memory_limit' => $this->getMemoryLimit(),
            'objects_count' => count($this->large_objects),
            'php_version' => PHP_VERSION
        ];
        
        $this->memory_snapshots[] = $snapshot;
        
        // Keep only last 50 snapshots to prevent memory bloat
        if (count($this->memory_snapshots) > 50) {
            array_shift($this->memory_snapshots);
        }
        
        // Check for memory issues
        $this->checkMemoryThresholds($snapshot);
        $this->detectMemoryLeaks($snapshot);
        
        return $snapshot;
    }
    
    /**
     * Get memory limit in bytes
     * 
     * @return int Memory limit
     */
    private function getMemoryLimit() {
        $limit = ini_get('memory_limit');
        if ($limit == -1) {
            return PHP_INT_MAX;
        }
        
        $limit = trim($limit);
        $last = strtolower($limit[strlen($limit) - 1]);
        $limit = (int) $limit;
        
        switch ($last) {
            case 'g':
                $limit *= 1024;
            case 'm':
                $limit *= 1024;
            case 'k':
                $limit *= 1024;
        }
        
        return $limit;
    }
    
    /**
     * Check memory thresholds
     * 
     * @param array $snapshot Memory snapshot
     */
    private function checkMemoryThresholds($snapshot) {
        $usage = $snapshot['memory_usage'];
        
        if ($usage > $this->thresholds['critical_usage']) {
            $this->triggerAlert('critical_memory', $usage, $this->thresholds['critical_usage']);
            $this->performEmergencyCleanup();
        } elseif ($usage > $this->thresholds['warning_usage']) {
            $this->triggerAlert('warning_memory', $usage, $this->thresholds['warning_usage']);
            $this->performCleanup();
        } elseif ($usage > $this->thresholds['peak_usage']) {
            $this->triggerAlert('peak_memory', $usage, $this->thresholds['peak_usage']);
        }
    }
    
    /**
     * Detect memory leaks
     * 
     * @param array $snapshot Current memory snapshot
     */
    private function detectMemoryLeaks($snapshot) {
        $this->leak_detection['samples'][] = [
            'timestamp' => $snapshot['timestamp'],
            'usage' => $snapshot['memory_usage']
        ];
        
        // Keep only last 10 samples
        if (count($this->leak_detection['samples']) > 10) {
            array_shift($this->leak_detection['samples']);
        }
        
        // Need at least 5 samples to detect trend
        if (count($this->leak_detection['samples']) < 5) {
            return;
        }
        
        $trend = $this->calculateMemoryTrend();
        $this->leak_detection['trend'] = $trend;
        
        // Check for memory leak (consistent upward trend)
        if ($trend > $this->thresholds['leak_threshold']) {
            $this->triggerAlert('memory_leak', $trend, $this->thresholds['leak_threshold']);
            $this->performLeakMitigation();
        }
    }
    
    /**
     * Calculate memory usage trend
     * 
     * @return float Memory trend in bytes per sample
     */
    private function calculateMemoryTrend() {
        $samples = $this->leak_detection['samples'];
        $count = count($samples);
        
        if ($count < 2) {
            return 0;
        }
        
        // Calculate linear regression slope
        $sum_x = 0;
        $sum_y = 0;
        $sum_xy = 0;
        $sum_x2 = 0;
        
        foreach ($samples as $i => $sample) {
            $x = $i;
            $y = $sample['usage'];
            
            $sum_x += $x;
            $sum_y += $y;
            $sum_xy += $x * $y;
            $sum_x2 += $x * $x;
        }
        
        $slope = ($count * $sum_xy - $sum_x * $sum_y) / ($count * $sum_x2 - $sum_x * $sum_x);
        
        return $slope;
    }
    
    /**
     * Register large object for cleanup
     * 
     * @param string $key Object key
     * @param mixed $object Object reference
     * @param callable $cleanup_callback Optional cleanup callback
     */
    public function registerLargeObject($key, &$object, $cleanup_callback = null) {
        $this->large_objects[$key] = [
            'object' => &$object,
            'size' => $this->estimateObjectSize($object),
            'created' => microtime(true),
            'cleanup_callback' => $cleanup_callback
        ];
    }
    
    /**
     * Unregister large object
     * 
     * @param string $key Object key
     */
    public function unregisterLargeObject($key) {
        if (isset($this->large_objects[$key])) {
            unset($this->large_objects[$key]);
        }
    }
    
    /**
     * Estimate object memory size
     * 
     * @param mixed $object Object to estimate
     * @return int Estimated size in bytes
     */
    private function estimateObjectSize($object) {
        if (function_exists('memory_get_usage')) {
            $before = memory_get_usage();
            $temp = serialize($object);
            $after = memory_get_usage();
            unset($temp);
            return $after - $before;
        }
        
        // Fallback estimation
        if (is_string($object)) {
            return strlen($object);
        } elseif (is_array($object)) {
            return count($object) * 100; // Rough estimate
        } elseif (is_object($object)) {
            return 1000; // Rough estimate for objects
        }
        
        return 100; // Default estimate
    }
    
    /**
     * Perform memory cleanup
     */
    public function performCleanup() {
        $cleaned = 0;
        
        // Clean up large objects
        foreach ($this->large_objects as $key => $data) {
            if (isset($data['cleanup_callback']) && is_callable($data['cleanup_callback'])) {
                call_user_func($data['cleanup_callback']);
                $cleaned += $data['size'];
            }
        }
        
        // Call registered cleanup callbacks
        foreach ($this->cleanup_callbacks as $callback) {
            if (is_callable($callback)) {
                $result = call_user_func($callback);
                if (is_numeric($result)) {
                    $cleaned += $result;
                }
            }
        }
        
        // Clear WordPress object cache if available
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
        
        // Force garbage collection
        if (function_exists('gc_collect_cycles')) {
            $collected = gc_collect_cycles();
            error_log("[LAS Memory Manager] Garbage collection freed {$collected} cycles");
        }
        
        error_log("[LAS Memory Manager] Cleanup completed, estimated {$cleaned} bytes freed");
        
        return $cleaned;
    }
    
    /**
     * Perform emergency cleanup
     */
    public function performEmergencyCleanup() {
        error_log('[LAS Memory Manager] Emergency cleanup triggered');
        
        // Clear all large objects
        foreach ($this->large_objects as $key => $data) {
            if (isset($data['cleanup_callback']) && is_callable($data['cleanup_callback'])) {
                call_user_func($data['cleanup_callback']);
            }
            unset($this->large_objects[$key]);
        }
        
        // Clear memory snapshots except the last 5
        $this->memory_snapshots = array_slice($this->memory_snapshots, -5);
        
        // Clear leak detection samples
        $this->leak_detection['samples'] = array_slice($this->leak_detection['samples'], -3);
        
        // Force aggressive garbage collection
        if (function_exists('gc_collect_cycles')) {
            gc_collect_cycles();
            gc_collect_cycles(); // Run twice for better cleanup
        }
        
        // Clear all WordPress caches
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
        
        // Clear transients
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_%'");
        
        $this->recordSnapshot('emergency_cleanup_complete');
    }
    
    /**
     * Perform memory leak mitigation
     */
    private function performLeakMitigation() {
        error_log('[LAS Memory Manager] Memory leak detected, performing mitigation');
        
        // Perform standard cleanup
        $this->performCleanup();
        
        // Reset leak detection baseline
        $this->leak_detection['baseline'] = memory_get_usage(true);
        $this->leak_detection['samples'] = [];
        
        // Disable monitoring temporarily to prevent cascade
        $this->monitoring_enabled = false;
        
        // Re-enable monitoring after 5 minutes
        wp_schedule_single_event(time() + 300, 'las_reenable_memory_monitoring');
        add_action('las_reenable_memory_monitoring', function() {
            $this->monitoring_enabled = true;
            error_log('[LAS Memory Manager] Memory monitoring re-enabled');
        });
    }
    
    /**
     * Register cleanup callback
     * 
     * @param callable $callback Cleanup callback function
     */
    public function registerCleanupCallback($callback) {
        if (is_callable($callback)) {
            $this->cleanup_callbacks[] = $callback;
        }
    }
    
    /**
     * Trigger memory alert
     * 
     * @param string $type Alert type
     * @param int $value Current value
     * @param int $threshold Threshold value
     */
    private function triggerAlert($type, $value, $threshold) {
        $alert = [
            'type' => $type,
            'value' => $value,
            'threshold' => $threshold,
            'timestamp' => current_time('mysql'),
            'memory_limit' => $this->getMemoryLimit(),
            'php_version' => PHP_VERSION
        ];
        
        $this->leak_detection['alerts'][] = $alert;
        
        // Log the alert
        error_log(sprintf(
            '[LAS Memory Alert] %s: %s (threshold: %s)',
            $type,
            $this->formatBytes($value),
            $this->formatBytes($threshold)
        ));
        
        // Trigger action for other components
        do_action('las_memory_alert', $alert);
    }
    
    /**
     * Format bytes for human reading
     * 
     * @param int $bytes Bytes
     * @return string Formatted string
     */
    private function formatBytes($bytes) {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
    
    /**
     * Perform periodic memory check
     */
    public function performPeriodicCheck() {
        $this->recordSnapshot('periodic_check');
        
        // Check if cleanup is needed
        $current_usage = memory_get_usage(true);
        if ($current_usage > $this->thresholds['warning_usage']) {
            $this->performCleanup();
        }
    }
    
    /**
     * Get memory usage report
     * 
     * @return array Memory report
     */
    public function getMemoryReport() {
        $current_usage = memory_get_usage(true);
        $peak_usage = memory_get_peak_usage(true);
        $memory_limit = $this->getMemoryLimit();
        
        return [
            'current_usage' => $current_usage,
            'current_usage_formatted' => $this->formatBytes($current_usage),
            'peak_usage' => $peak_usage,
            'peak_usage_formatted' => $this->formatBytes($peak_usage),
            'memory_limit' => $memory_limit,
            'memory_limit_formatted' => $this->formatBytes($memory_limit),
            'usage_percentage' => round(($current_usage / $memory_limit) * 100, 2),
            'thresholds' => array_map([$this, 'formatBytes'], $this->thresholds),
            'snapshots' => $this->memory_snapshots,
            'large_objects_count' => count($this->large_objects),
            'large_objects' => array_map(function($obj) {
                return [
                    'size' => $this->formatBytes($obj['size']),
                    'created' => date('Y-m-d H:i:s', $obj['created']),
                    'has_cleanup' => isset($obj['cleanup_callback'])
                ];
            }, $this->large_objects),
            'leak_detection' => [
                'baseline' => $this->formatBytes($this->leak_detection['baseline']),
                'trend' => $this->formatBytes($this->leak_detection['trend']),
                'samples_count' => count($this->leak_detection['samples']),
                'alerts_count' => count($this->leak_detection['alerts'])
            ],
            'monitoring_enabled' => $this->monitoring_enabled,
            'php_info' => [
                'version' => PHP_VERSION,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'gc_enabled' => gc_enabled()
            ]
        ];
    }
    
    /**
     * Handle AJAX memory report request
     */
    public function handleMemoryReport() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_memory_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check capabilities
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $report = $this->getMemoryReport();
        wp_send_json_success($report);
    }
    
    /**
     * Enable memory monitoring
     */
    public function enableMonitoring() {
        $this->monitoring_enabled = true;
        error_log('[LAS Memory Manager] Monitoring enabled');
    }
    
    /**
     * Disable memory monitoring
     */
    public function disableMonitoring() {
        $this->monitoring_enabled = false;
        error_log('[LAS Memory Manager] Monitoring disabled');
    }
    
    /**
     * Check if monitoring is enabled
     * 
     * @return bool Monitoring status
     */
    public function isMonitoringEnabled() {
        return $this->monitoring_enabled;
    }
    
    /**
     * Get memory usage statistics
     * 
     * @return array Memory statistics
     */
    public function getMemoryStats() {
        return [
            'current' => memory_get_usage(true),
            'peak' => memory_get_peak_usage(true),
            'limit' => $this->getMemoryLimit(),
            'snapshots_count' => count($this->memory_snapshots),
            'large_objects_count' => count($this->large_objects),
            'alerts_count' => count($this->leak_detection['alerts']),
            'trend' => $this->leak_detection['trend']
        ];
    }
    
    /**
     * Shutdown handler
     */
    public function shutdown() {
        if ($this->monitoring_enabled) {
            $this->recordSnapshot('shutdown');
            
            // Store final report in transient
            set_transient('las_memory_final_report', $this->getMemoryReport(), HOUR_IN_SECONDS);
        }
    }
    
    /**
     * Clear all memory data
     */
    public function clearMemoryData() {
        $this->memory_snapshots = [];
        $this->large_objects = [];
        $this->leak_detection = [
            'baseline' => memory_get_usage(true),
            'samples' => [],
            'trend' => 0,
            'alerts' => []
        ];
        $this->cleanup_callbacks = [];
        
        delete_transient('las_memory_final_report');
    }
}