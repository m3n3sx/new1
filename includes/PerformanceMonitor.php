<?php
/**
 * Performance Monitor Class
 * 
 * Handles performance monitoring, timing, memory tracking, and Lighthouse-compatible metrics
 * for Live Admin Styler v2.0
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class LAS_PerformanceMonitor {
    
    /**
     * Singleton instance
     * @var LAS_PerformanceMonitor
     */
    private static $instance = null;
    
    /**
     * Performance metrics storage
     * @var array
     */
    private $metrics = [];
    
    /**
     * Timing markers
     * @var array
     */
    private $timers = [];
    
    /**
     * Memory usage tracking
     * @var array
     */
    private $memory_snapshots = [];
    
    /**
     * Performance thresholds
     * @var array
     */
    private $thresholds = [
        'page_load_time' => 2.0,      // 2 seconds max
        'ajax_response_time' => 0.5,   // 500ms max
        'cache_operation_time' => 0.1, // 100ms max
        'memory_base' => 12 * 1024 * 1024,  // 12MB base
        'memory_peak' => 25 * 1024 * 1024,  // 25MB peak
        'lighthouse_score' => 90       // Lighthouse Performance Score > 90
    ];
    
    /**
     * Alert callbacks
     * @var array
     */
    private $alert_callbacks = [];
    
    /**
     * Get singleton instance
     * 
     * @return LAS_PerformanceMonitor
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
     * Initialize performance monitoring
     */
    private function init() {
        // Start initial memory tracking
        $this->recordMemorySnapshot('init');
        
        // Hook into WordPress actions for automatic monitoring
        add_action('admin_init', [$this, 'startPageLoadTimer']);
        add_action('admin_footer', [$this, 'endPageLoadTimer']);
        add_action('wp_ajax_las_performance_report', [$this, 'handlePerformanceReport']);
        
        // Monitor AJAX requests
        add_action('wp_ajax_nopriv_las_ajax', [$this, 'startAjaxTimer']);
        add_action('wp_ajax_las_ajax', [$this, 'startAjaxTimer']);
        
        // Register shutdown function for final metrics
        register_shutdown_function([$this, 'recordShutdownMetrics']);
    }
    
    /**
     * Start a performance timer
     * 
     * @param string $name Timer name
     * @return float Start time
     */
    public function startTimer($name) {
        $start_time = microtime(true);
        $this->timers[$name] = [
            'start' => $start_time,
            'end' => null,
            'duration' => null
        ];
        
        return $start_time;
    }
    
    /**
     * End a performance timer
     * 
     * @param string $name Timer name
     * @return float|null Duration in seconds
     */
    public function endTimer($name) {
        if (!isset($this->timers[$name])) {
            return null;
        }
        
        $end_time = microtime(true);
        $duration = $end_time - $this->timers[$name]['start'];
        
        $this->timers[$name]['end'] = $end_time;
        $this->timers[$name]['duration'] = $duration;
        
        // Check against thresholds
        $this->checkThreshold($name, $duration);
        
        return $duration;
    }
    
    /**
     * Get timer duration
     * 
     * @param string $name Timer name
     * @return float|null Duration in seconds
     */
    public function getTimerDuration($name) {
        return isset($this->timers[$name]) ? $this->timers[$name]['duration'] : null;
    }
    
    /**
     * Record memory snapshot
     * 
     * @param string $label Snapshot label
     * @return array Memory usage data
     */
    public function recordMemorySnapshot($label) {
        $memory_data = [
            'label' => $label,
            'timestamp' => microtime(true),
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'memory_limit' => $this->getMemoryLimit()
        ];
        
        $this->memory_snapshots[] = $memory_data;
        
        // Check memory thresholds
        $this->checkMemoryThresholds($memory_data);
        
        return $memory_data;
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
     * Check performance thresholds
     * 
     * @param string $metric_name Metric name
     * @param float $value Metric value
     */
    private function checkThreshold($metric_name, $value) {
        $threshold_map = [
            'page_load' => 'page_load_time',
            'ajax_request' => 'ajax_response_time',
            'cache_operation' => 'cache_operation_time'
        ];
        
        $threshold_key = isset($threshold_map[$metric_name]) ? $threshold_map[$metric_name] : $metric_name;
        
        if (isset($this->thresholds[$threshold_key]) && $value > $this->thresholds[$threshold_key]) {
            $this->triggerAlert($metric_name, $value, $this->thresholds[$threshold_key]);
        }
    }
    
    /**
     * Check memory thresholds
     * 
     * @param array $memory_data Memory usage data
     */
    private function checkMemoryThresholds($memory_data) {
        if ($memory_data['memory_usage'] > $this->thresholds['memory_peak']) {
            $this->triggerAlert('memory_peak', $memory_data['memory_usage'], $this->thresholds['memory_peak']);
        }
    }
    
    /**
     * Trigger performance alert
     * 
     * @param string $metric Metric name
     * @param float $value Current value
     * @param float $threshold Threshold value
     */
    private function triggerAlert($metric, $value, $threshold) {
        $alert_data = [
            'metric' => $metric,
            'value' => $value,
            'threshold' => $threshold,
            'timestamp' => current_time('mysql'),
            'url' => $_SERVER['REQUEST_URI'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ];
        
        // Log the alert
        error_log(sprintf(
            '[LAS Performance Alert] %s exceeded threshold: %.3f > %.3f at %s',
            $metric,
            $value,
            $threshold,
            $alert_data['url']
        ));
        
        // Store alert for reporting
        $this->metrics['alerts'][] = $alert_data;
        
        // Call registered alert callbacks
        foreach ($this->alert_callbacks as $callback) {
            if (is_callable($callback)) {
                call_user_func($callback, $alert_data);
            }
        }
    }
    
    /**
     * Register alert callback
     * 
     * @param callable $callback Alert callback function
     */
    public function registerAlertCallback($callback) {
        if (is_callable($callback)) {
            $this->alert_callbacks[] = $callback;
        }
    }
    
    /**
     * Start page load timer (WordPress hook)
     */
    public function startPageLoadTimer() {
        if (isset($_GET['page']) && $_GET['page'] === 'live-admin-styler') {
            $this->startTimer('page_load');
        }
    }
    
    /**
     * End page load timer (WordPress hook)
     */
    public function endPageLoadTimer() {
        if (isset($_GET['page']) && $_GET['page'] === 'live-admin-styler') {
            $this->endTimer('page_load');
            $this->recordMemorySnapshot('page_complete');
        }
    }
    
    /**
     * Start AJAX timer
     */
    public function startAjaxTimer() {
        $this->startTimer('ajax_request');
        $this->recordMemorySnapshot('ajax_start');
    }
    
    /**
     * End AJAX timer
     */
    public function endAjaxTimer() {
        $this->endTimer('ajax_request');
        $this->recordMemorySnapshot('ajax_end');
    }
    
    /**
     * Get comprehensive performance report
     * 
     * @return array Performance metrics
     */
    public function getPerformanceReport() {
        return [
            'timers' => $this->timers,
            'memory_snapshots' => $this->memory_snapshots,
            'current_memory' => [
                'usage' => memory_get_usage(true),
                'peak' => memory_get_peak_usage(true),
                'limit' => $this->getMemoryLimit()
            ],
            'thresholds' => $this->thresholds,
            'alerts' => $this->metrics['alerts'] ?? [],
            'lighthouse_metrics' => $this->getLighthouseMetrics(),
            'server_info' => [
                'php_version' => PHP_VERSION,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'opcache_enabled' => function_exists('opcache_get_status') && opcache_get_status()
            ]
        ];
    }
    
    /**
     * Get Lighthouse-compatible performance metrics
     * 
     * @return array Lighthouse metrics
     */
    public function getLighthouseMetrics() {
        $page_load_time = $this->getTimerDuration('page_load');
        
        return [
            'first_contentful_paint' => $page_load_time ? $page_load_time * 1000 : null, // Convert to ms
            'largest_contentful_paint' => $page_load_time ? $page_load_time * 1000 : null,
            'cumulative_layout_shift' => 0, // Admin pages typically have stable layout
            'total_blocking_time' => 0,
            'performance_score' => $this->calculatePerformanceScore(),
            'metrics_collected_at' => current_time('mysql')
        ];
    }
    
    /**
     * Calculate performance score (0-100, Lighthouse-style)
     * 
     * @return int Performance score
     */
    private function calculatePerformanceScore() {
        $score = 100;
        
        // Deduct points for slow page loads
        $page_load_time = $this->getTimerDuration('page_load');
        if ($page_load_time) {
            if ($page_load_time > 2.0) {
                $score -= 30;
            } elseif ($page_load_time > 1.5) {
                $score -= 15;
            } elseif ($page_load_time > 1.0) {
                $score -= 5;
            }
        }
        
        // Deduct points for high memory usage
        $current_memory = memory_get_usage(true);
        if ($current_memory > $this->thresholds['memory_peak']) {
            $score -= 20;
        } elseif ($current_memory > $this->thresholds['memory_base']) {
            $score -= 10;
        }
        
        // Deduct points for alerts
        $alert_count = count($this->metrics['alerts'] ?? []);
        $score -= min($alert_count * 5, 30);
        
        return max($score, 0);
    }
    
    /**
     * Handle AJAX performance report request
     */
    public function handlePerformanceReport() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'las_performance_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check capabilities
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $report = $this->getPerformanceReport();
        wp_send_json_success($report);
    }
    
    /**
     * Record shutdown metrics
     */
    public function recordShutdownMetrics() {
        $this->recordMemorySnapshot('shutdown');
        
        // Store metrics in transient for later retrieval
        set_transient('las_performance_metrics', $this->getPerformanceReport(), HOUR_IN_SECONDS);
    }
    
    /**
     * Benchmark a function execution
     * 
     * @param callable $callback Function to benchmark
     * @param string $name Benchmark name
     * @return mixed Function result
     */
    public function benchmark($callback, $name = 'benchmark') {
        $this->startTimer($name);
        $this->recordMemorySnapshot($name . '_start');
        
        $result = call_user_func($callback);
        
        $this->recordMemorySnapshot($name . '_end');
        $this->endTimer($name);
        
        return $result;
    }
    
    /**
     * Clear all metrics
     */
    public function clearMetrics() {
        $this->metrics = [];
        $this->timers = [];
        $this->memory_snapshots = [];
        delete_transient('las_performance_metrics');
    }
    
    /**
     * Export metrics to JSON
     * 
     * @return string JSON encoded metrics
     */
    public function exportMetrics() {
        return json_encode($this->getPerformanceReport(), JSON_PRETTY_PRINT);
    }
}