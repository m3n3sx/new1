<?php
/**
 * CacheManager - Multi-level caching service with performance monitoring
 * 
 * Provides memory caching, WordPress transients, object cache integration,
 * cache metrics collection, performance monitoring, and memory optimization.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * CacheManager class for comprehensive caching and performance monitoring
 */
class LAS_CacheManager {
    
    /**
     * Memory cache storage
     * @var array
     */
    private $memory_cache = [];
    
    /**
     * Cache metrics
     * @var array
     */
    private $metrics = [
        'hits' => 0,
        'misses' => 0,
        'sets' => 0,
        'deletes' => 0,
        'memory_usage' => 0,
        'peak_memory' => 0,
        'start_time' => 0,
        'queries_saved' => 0
    ];
    
    /**
     * Cache configuration
     * @var array
     */
    private $config = [
        'memory_limit' => 10485760, // 10MB default memory limit
        'default_ttl' => 3600, // 1 hour default TTL
        'max_key_length' => 250,
        'enable_object_cache' => true,
        'enable_transients' => true,
        'enable_memory_cache' => true,
        'cleanup_interval' => 300 // 5 minutes
    ];
    
    /**
     * Cache key prefix
     */
    const CACHE_PREFIX = 'las_fresh_';
    
    /**
     * Cache groups for organization
     */
    const GROUP_SETTINGS = 'settings';
    const GROUP_CSS = 'css';
    const GROUP_TEMPLATES = 'templates';
    const GROUP_USER_STATE = 'user_state';
    const GROUP_PERFORMANCE = 'performance';
    
    /**
     * Constructor
     * 
     * @param array $config Optional configuration overrides
     */
    public function __construct($config = []) {
        $this->config = array_merge($this->config, $config);
        $this->metrics['start_time'] = microtime(true);
        
        // Initialize cleanup hooks
        $this->init_cleanup_hooks();
        
        // Initialize performance monitoring
        $this->init_performance_monitoring();
    }
    
    /**
     * Get cached value with fallback callback
     * 
     * @param string $key Cache key
     * @param callable $callback Callback to generate value if not cached
     * @param int $ttl Time to live in seconds
     * @param string $group Cache group
     * @return mixed Cached or generated value
     */
    public function remember($key, $callback, $ttl = null, $group = 'default') {
        $ttl = $ttl ?? $this->config['default_ttl'];
        $full_key = $this->build_key($key, $group);
        
        // Try memory cache first
        if ($this->config['enable_memory_cache']) {
            $memory_value = $this->get_from_memory($full_key);
            if ($memory_value !== null) {
                $this->metrics['hits']++;
                return $memory_value;
            }
        }
        
        // Try object cache
        if ($this->config['enable_object_cache']) {
            $object_value = wp_cache_get($full_key, 'las_cache');
            if ($object_value !== false) {
                $this->metrics['hits']++;
                
                // Store in memory cache for faster access
                if ($this->config['enable_memory_cache']) {
                    $this->set_in_memory($full_key, $object_value, $ttl);
                }
                
                return $object_value;
            }
        }
        
        // Try transients
        if ($this->config['enable_transients']) {
            $transient_value = get_transient($full_key);
            if ($transient_value !== false) {
                $this->metrics['hits']++;
                
                // Store in higher-level caches
                if ($this->config['enable_object_cache']) {
                    wp_cache_set($full_key, $transient_value, 'las_cache', $ttl);
                }
                
                if ($this->config['enable_memory_cache']) {
                    $this->set_in_memory($full_key, $transient_value, $ttl);
                }
                
                return $transient_value;
            }
        }
        
        // Cache miss - generate value
        $this->metrics['misses']++;
        $this->metrics['queries_saved']++; // Assuming callback would make a query
        
        if (!is_callable($callback)) {
            return null;
        }
        
        $start_time = microtime(true);
        $value = call_user_func($callback);
        $generation_time = microtime(true) - $start_time;
        
        // Store in all cache levels
        $this->set($key, $value, $ttl, $group);
        
        // Track performance
        $this->track_generation_time($key, $generation_time);
        
        return $value;
    }
    
    /**
     * Set cache value
     * 
     * @param string $key Cache key
     * @param mixed $value Value to cache
     * @param int $ttl Time to live in seconds
     * @param string $group Cache group
     * @return bool Success status
     */
    public function set($key, $value, $ttl = null, $group = 'default') {
        $ttl = $ttl ?? $this->config['default_ttl'];
        $full_key = $this->build_key($key, $group);
        
        $this->metrics['sets']++;
        
        $success = true;
        
        // Set in memory cache
        if ($this->config['enable_memory_cache']) {
            $success = $this->set_in_memory($full_key, $value, $ttl) && $success;
        }
        
        // Set in object cache
        if ($this->config['enable_object_cache']) {
            $success = wp_cache_set($full_key, $value, 'las_cache', $ttl) && $success;
        }
        
        // Set in transients
        if ($this->config['enable_transients']) {
            $success = set_transient($full_key, $value, $ttl) && $success;
        }
        
        return $success;
    }
    
    /**
     * Get cache value
     * 
     * @param string $key Cache key
     * @param string $group Cache group
     * @param mixed $default Default value if not found
     * @return mixed Cached value or default
     */
    public function get($key, $group = 'default', $default = null) {
        $full_key = $this->build_key($key, $group);
        
        // Try memory cache first
        if ($this->config['enable_memory_cache']) {
            $memory_value = $this->get_from_memory($full_key);
            if ($memory_value !== null) {
                $this->metrics['hits']++;
                return $memory_value;
            }
        }
        
        // Try object cache
        if ($this->config['enable_object_cache']) {
            $object_value = wp_cache_get($full_key, 'las_cache');
            if ($object_value !== false) {
                $this->metrics['hits']++;
                
                // Store in memory cache
                if ($this->config['enable_memory_cache']) {
                    $this->set_in_memory($full_key, $object_value);
                }
                
                return $object_value;
            }
        }
        
        // Try transients
        if ($this->config['enable_transients']) {
            $transient_value = get_transient($full_key);
            if ($transient_value !== false) {
                $this->metrics['hits']++;
                
                // Store in higher-level caches
                if ($this->config['enable_object_cache']) {
                    wp_cache_set($full_key, $transient_value, 'las_cache');
                }
                
                if ($this->config['enable_memory_cache']) {
                    $this->set_in_memory($full_key, $transient_value);
                }
                
                return $transient_value;
            }
        }
        
        $this->metrics['misses']++;
        return $default;
    }
    
    /**
     * Delete cache value
     * 
     * @param string $key Cache key
     * @param string $group Cache group
     * @return bool Success status
     */
    public function delete($key, $group = 'default') {
        $full_key = $this->build_key($key, $group);
        
        $this->metrics['deletes']++;
        
        $success = true;
        
        // Delete from memory cache
        if ($this->config['enable_memory_cache']) {
            unset($this->memory_cache[$full_key]);
        }
        
        // Delete from object cache
        if ($this->config['enable_object_cache']) {
            $success = wp_cache_delete($full_key, 'las_cache') && $success;
        }
        
        // Delete from transients
        if ($this->config['enable_transients']) {
            $success = delete_transient($full_key) && $success;
        }
        
        return $success;
    }
    
    /**
     * Clear cache by group or pattern
     * 
     * @param string $group Cache group to clear
     * @param string $pattern Optional key pattern to match
     * @return bool Success status
     */
    public function clear($group = null, $pattern = null) {
        if ($group === null && $pattern === null) {
            // Clear all cache
            $this->memory_cache = [];
            wp_cache_flush_group('las_cache');
            
            // Clear transients (more complex as WordPress doesn't provide group clearing)
            $this->clear_transients_by_prefix(self::CACHE_PREFIX);
            
            return true;
        }
        
        if ($group !== null) {
            return $this->clear_by_group($group);
        }
        
        if ($pattern !== null) {
            return $this->clear_by_pattern($pattern);
        }
        
        return false;
    }
    
    /**
     * Get cache statistics and metrics
     * 
     * @return array Cache metrics
     */
    public function getMetrics() {
        $current_memory = $this->calculate_memory_usage();
        $this->metrics['memory_usage'] = $current_memory;
        
        if ($current_memory > $this->metrics['peak_memory']) {
            $this->metrics['peak_memory'] = $current_memory;
        }
        
        $runtime = microtime(true) - $this->metrics['start_time'];
        
        return array_merge($this->metrics, [
            'hit_rate' => $this->calculate_hit_rate(),
            'memory_usage_mb' => round($current_memory / 1024 / 1024, 2),
            'peak_memory_mb' => round($this->metrics['peak_memory'] / 1024 / 1024, 2),
            'runtime_seconds' => round($runtime, 2),
            'cache_efficiency' => $this->calculate_cache_efficiency(),
            'memory_cache_count' => count($this->memory_cache),
            'average_generation_time' => $this->get_average_generation_time()
        ]);
    }
    
    /**
     * Warm up cache with commonly used data
     * 
     * @param array $keys_and_callbacks Array of key => callback pairs
     * @param string $group Cache group
     * @return array Results of cache warming
     */
    public function warmUp($keys_and_callbacks, $group = 'default') {
        $results = [];
        
        foreach ($keys_and_callbacks as $key => $callback) {
            $start_time = microtime(true);
            $value = $this->remember($key, $callback, null, $group);
            $time_taken = microtime(true) - $start_time;
            
            $results[$key] = [
                'success' => $value !== null,
                'time_taken' => $time_taken,
                'cached' => $time_taken < 0.001 // Likely was already cached
            ];
        }
        
        return $results;
    }
    
    /**
     * Optimize memory usage by cleaning expired entries
     * 
     * @return array Cleanup results
     */
    public function optimizeMemory() {
        $before_count = count($this->memory_cache);
        $before_memory = $this->calculate_memory_usage();
        
        $current_time = time();
        $cleaned = 0;
        
        foreach ($this->memory_cache as $key => $data) {
            if (isset($data['expires']) && $data['expires'] < $current_time) {
                unset($this->memory_cache[$key]);
                $cleaned++;
            }
        }
        
        // If still over memory limit, remove oldest entries
        if ($this->calculate_memory_usage() > $this->config['memory_limit']) {
            $cleaned += $this->cleanup_by_lru();
        }
        
        $after_count = count($this->memory_cache);
        $after_memory = $this->calculate_memory_usage();
        
        return [
            'entries_before' => $before_count,
            'entries_after' => $after_count,
            'entries_cleaned' => $cleaned,
            'memory_before' => $before_memory,
            'memory_after' => $after_memory,
            'memory_freed' => $before_memory - $after_memory
        ];
    }
    
    /**
     * Build cache key with prefix and group
     * 
     * @param string $key Base key
     * @param string $group Cache group
     * @return string Full cache key
     */
    private function build_key($key, $group = 'default') {
        $key = sanitize_key($key);
        $group = sanitize_key($group);
        
        $full_key = self::CACHE_PREFIX . $group . '_' . $key;
        
        // Ensure key length doesn't exceed limits
        if (strlen($full_key) > $this->config['max_key_length']) {
            $full_key = self::CACHE_PREFIX . $group . '_' . md5($key);
        }
        
        return $full_key;
    }
    
    /**
     * Get value from memory cache
     * 
     * @param string $key Cache key
     * @return mixed|null Cached value or null if not found/expired
     */
    private function get_from_memory($key) {
        if (!isset($this->memory_cache[$key])) {
            return null;
        }
        
        $data = $this->memory_cache[$key];
        
        // Check expiration
        if (isset($data['expires']) && $data['expires'] < time()) {
            unset($this->memory_cache[$key]);
            return null;
        }
        
        // Update access time for LRU
        $this->memory_cache[$key]['accessed'] = time();
        
        return $data['value'];
    }
    
    /**
     * Set value in memory cache
     * 
     * @param string $key Cache key
     * @param mixed $value Value to cache
     * @param int $ttl Time to live in seconds
     * @return bool Success status
     */
    private function set_in_memory($key, $value, $ttl = null) {
        $ttl = $ttl ?? $this->config['default_ttl'];
        
        // Check memory limit before adding
        if ($this->calculate_memory_usage() > $this->config['memory_limit']) {
            $this->cleanup_by_lru();
        }
        
        $this->memory_cache[$key] = [
            'value' => $value,
            'expires' => time() + $ttl,
            'created' => time(),
            'accessed' => time()
        ];
        
        return true;
    }
    
    /**
     * Calculate current memory usage of cache
     * 
     * @return int Memory usage in bytes
     */
    private function calculate_memory_usage() {
        return strlen(serialize($this->memory_cache));
    }
    
    /**
     * Calculate cache hit rate
     * 
     * @return float Hit rate as percentage
     */
    private function calculate_hit_rate() {
        $total = $this->metrics['hits'] + $this->metrics['misses'];
        return $total > 0 ? ($this->metrics['hits'] / $total) * 100 : 0;
    }
    
    /**
     * Calculate cache efficiency (hits + queries saved)
     * 
     * @return float Efficiency score
     */
    private function calculate_cache_efficiency() {
        $total_operations = $this->metrics['hits'] + $this->metrics['misses'];
        $beneficial_operations = $this->metrics['hits'] + $this->metrics['queries_saved'];
        
        return $total_operations > 0 ? ($beneficial_operations / $total_operations) * 100 : 0;
    }
    
    /**
     * Clean up memory cache using LRU strategy
     * 
     * @return int Number of entries removed
     */
    private function cleanup_by_lru() {
        if (empty($this->memory_cache)) {
            return 0;
        }
        
        // Sort by access time (oldest first)
        uasort($this->memory_cache, function($a, $b) {
            return $a['accessed'] - $b['accessed'];
        });
        
        $removed = 0;
        $target_memory = $this->config['memory_limit'] * 0.8; // Clean to 80% of limit
        
        while ($this->calculate_memory_usage() > $target_memory && !empty($this->memory_cache)) {
            array_shift($this->memory_cache);
            $removed++;
        }
        
        return $removed;
    }
    
    /**
     * Clear cache by group
     * 
     * @param string $group Group to clear
     * @return bool Success status
     */
    private function clear_by_group($group) {
        $prefix = self::CACHE_PREFIX . sanitize_key($group) . '_';
        $cleared = 0;
        
        // Clear memory cache
        foreach ($this->memory_cache as $key => $data) {
            if (strpos($key, $prefix) === 0) {
                unset($this->memory_cache[$key]);
                $cleared++;
            }
        }
        
        // Clear transients by prefix
        $this->clear_transients_by_prefix($prefix);
        
        return $cleared > 0;
    }
    
    /**
     * Clear cache by pattern
     * 
     * @param string $pattern Pattern to match
     * @return bool Success status
     */
    private function clear_by_pattern($pattern) {
        $cleared = 0;
        
        foreach ($this->memory_cache as $key => $data) {
            if (fnmatch($pattern, $key)) {
                unset($this->memory_cache[$key]);
                $cleared++;
            }
        }
        
        return $cleared > 0;
    }
    
    /**
     * Clear WordPress transients by prefix
     * 
     * @param string $prefix Prefix to match
     */
    private function clear_transients_by_prefix($prefix) {
        global $wpdb;
        
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
            '_transient_' . $prefix . '%',
            '_transient_timeout_' . $prefix . '%'
        ));
    }
    
    /**
     * Initialize cleanup hooks
     */
    private function init_cleanup_hooks() {
        // Schedule regular cleanup
        if (!wp_next_scheduled('las_cache_cleanup')) {
            wp_schedule_event(time(), 'hourly', 'las_cache_cleanup');
        }
        
        add_action('las_cache_cleanup', [$this, 'optimizeMemory']);
        
        // Cleanup on shutdown
        add_action('shutdown', [$this, 'cleanup_on_shutdown']);
    }
    
    /**
     * Initialize performance monitoring
     */
    private function init_performance_monitoring() {
        // Track generation times
        $this->generation_times = [];
    }
    
    /**
     * Track cache generation time
     * 
     * @param string $key Cache key
     * @param float $time Generation time in seconds
     */
    private function track_generation_time($key, $time) {
        if (!isset($this->generation_times)) {
            $this->generation_times = [];
        }
        
        $this->generation_times[$key] = $time;
        
        // Keep only last 100 entries
        if (count($this->generation_times) > 100) {
            $this->generation_times = array_slice($this->generation_times, -100, null, true);
        }
    }
    
    /**
     * Get average generation time
     * 
     * @return float Average generation time in seconds
     */
    private function get_average_generation_time() {
        if (empty($this->generation_times)) {
            return 0;
        }
        
        return array_sum($this->generation_times) / count($this->generation_times);
    }
    
    /**
     * Cleanup on shutdown
     */
    public function cleanup_on_shutdown() {
        // Only keep essential data in memory cache
        if (count($this->memory_cache) > 50) {
            $this->cleanup_by_lru();
        }
    }
}