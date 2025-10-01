<?php
/**
 * Database Optimizer Class
 * 
 * Handles database query optimization, batch operations, and caching strategies
 * for Live Admin Styler v2.0
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class LAS_DatabaseOptimizer {
    
    /**
     * Singleton instance
     * @var LAS_DatabaseOptimizer
     */
    private static $instance = null;
    
    /**
     * Cache manager instance
     * @var LAS_CacheManager
     */
    private $cache_manager;
    
    /**
     * Query performance metrics
     * @var array
     */
    private $query_metrics = [
        'total_queries' => 0,
        'cached_queries' => 0,
        'batch_operations' => 0,
        'optimization_time_saved' => 0,
        'slow_queries' => []
    ];
    
    /**
     * Batch operation queue
     * @var array
     */
    private $batch_queue = [
        'inserts' => [],
        'updates' => [],
        'deletes' => []
    ];
    
    /**
     * Query cache configuration
     * @var array
     */
    private $query_cache_config = [
        'enabled' => true,
        'default_ttl' => 3600, // 1 hour
        'slow_query_threshold' => 0.1, // 100ms
        'max_batch_size' => 100,
        'cache_warming_enabled' => true
    ];
    
    /**
     * Optimized query patterns
     * @var array
     */
    private $optimized_queries = [];
    
    /**
     * Get singleton instance
     * 
     * @return LAS_DatabaseOptimizer
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
     * Initialize database optimizer
     */
    private function init() {
        // Get cache manager instance
        $core_engine = LAS_CoreEngine::getInstance();
        $this->cache_manager = $core_engine->get('CacheManager');
        
        // Set up query monitoring
        $this->setupQueryMonitoring();
        
        // Set up batch processing
        $this->setupBatchProcessing();
        
        // Set up cache warming
        $this->setupCacheWarming();
        
        // Register shutdown hook for batch processing
        register_shutdown_function([$this, 'processBatchQueue']);
    }
    
    /**
     * Setup query monitoring
     */
    private function setupQueryMonitoring() {
        // Monitor slow queries
        add_filter('query', [$this, 'monitorQuery'], 10, 1);
        
        // Log query performance
        add_action('shutdown', [$this, 'logQueryPerformance']);
    }
    
    /**
     * Setup batch processing
     */
    private function setupBatchProcessing() {
        // Schedule batch processing
        if (!wp_next_scheduled('las_process_batch_queue')) {
            wp_schedule_event(time(), 'hourly', 'las_process_batch_queue');
        }
        
        add_action('las_process_batch_queue', [$this, 'processBatchQueue']);
    }
    
    /**
     * Setup cache warming
     */
    private function setupCacheWarming() {
        if ($this->query_cache_config['cache_warming_enabled']) {
            // Schedule cache warming
            if (!wp_next_scheduled('las_warm_cache')) {
                wp_schedule_event(time(), 'twicedaily', 'las_warm_cache');
            }
            
            add_action('las_warm_cache', [$this, 'warmCache']);
        }
    }
    
    /**
     * Execute optimized query with caching
     * 
     * @param string $query SQL query
     * @param array $params Query parameters
     * @param int $ttl Cache TTL
     * @param string $cache_group Cache group
     * @return mixed Query results
     */
    public function query($query, $params = [], $ttl = null, $cache_group = 'queries') {
        global $wpdb;
        
        $start_time = microtime(true);
        $this->query_metrics['total_queries']++;
        
        // Prepare query with parameters
        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }
        
        // Generate cache key
        $cache_key = $this->generateQueryCacheKey($query);
        
        // Try to get from cache first
        if ($this->query_cache_config['enabled']) {
            $cached_result = $this->cache_manager->remember(
                $cache_key,
                null,
                $ttl ?? $this->query_cache_config['default_ttl'],
                $cache_group
            );
            
            if ($cached_result !== null) {
                $this->query_metrics['cached_queries']++;
                $this->query_metrics['optimization_time_saved'] += microtime(true) - $start_time;
                return $cached_result;
            }
        }
        
        // Execute query
        $result = $wpdb->get_results($query);
        
        // Check for errors
        if ($wpdb->last_error) {
            error_log("[LAS Database Optimizer] Query error: {$wpdb->last_error}");
            return false;
        }
        
        $execution_time = microtime(true) - $start_time;
        
        // Log slow queries
        if ($execution_time > $this->query_cache_config['slow_query_threshold']) {
            $this->logSlowQuery($query, $execution_time);
        }
        
        // Cache the result
        if ($this->query_cache_config['enabled'] && $result !== false) {
            $this->cache_manager->set(
                $cache_key,
                $result,
                $ttl ?? $this->query_cache_config['default_ttl'],
                $cache_group
            );
        }
        
        return $result;
    }
    
    /**
     * Execute batch insert operation
     * 
     * @param string $table Table name
     * @param array $data Array of data rows
     * @param bool $immediate Execute immediately or queue
     * @return bool|int Success or number of affected rows
     */
    public function batchInsert($table, $data, $immediate = false) {
        if (empty($data)) {
            return false;
        }
        
        if ($immediate) {
            return $this->executeBatchInsert($table, $data);
        }
        
        // Add to batch queue
        if (!isset($this->batch_queue['inserts'][$table])) {
            $this->batch_queue['inserts'][$table] = [];
        }
        
        $this->batch_queue['inserts'][$table] = array_merge(
            $this->batch_queue['inserts'][$table],
            $data
        );
        
        // Process if queue is full
        if (count($this->batch_queue['inserts'][$table]) >= $this->query_cache_config['max_batch_size']) {
            return $this->processBatchInserts($table);
        }
        
        return true;
    }
    
    /**
     * Execute batch update operation
     * 
     * @param string $table Table name
     * @param array $updates Array of update operations
     * @param bool $immediate Execute immediately or queue
     * @return bool Success
     */
    public function batchUpdate($table, $updates, $immediate = false) {
        if (empty($updates)) {
            return false;
        }
        
        if ($immediate) {
            return $this->executeBatchUpdate($table, $updates);
        }
        
        // Add to batch queue
        if (!isset($this->batch_queue['updates'][$table])) {
            $this->batch_queue['updates'][$table] = [];
        }
        
        $this->batch_queue['updates'][$table] = array_merge(
            $this->batch_queue['updates'][$table],
            $updates
        );
        
        // Process if queue is full
        if (count($this->batch_queue['updates'][$table]) >= $this->query_cache_config['max_batch_size']) {
            return $this->processBatchUpdates($table);
        }
        
        return true;
    }
    
    /**
     * Execute batch delete operation
     * 
     * @param string $table Table name
     * @param array $conditions Array of delete conditions
     * @param bool $immediate Execute immediately or queue
     * @return bool Success
     */
    public function batchDelete($table, $conditions, $immediate = false) {
        if (empty($conditions)) {
            return false;
        }
        
        if ($immediate) {
            return $this->executeBatchDelete($table, $conditions);
        }
        
        // Add to batch queue
        if (!isset($this->batch_queue['deletes'][$table])) {
            $this->batch_queue['deletes'][$table] = [];
        }
        
        $this->batch_queue['deletes'][$table] = array_merge(
            $this->batch_queue['deletes'][$table],
            $conditions
        );
        
        // Process if queue is full
        if (count($this->batch_queue['deletes'][$table]) >= $this->query_cache_config['max_batch_size']) {
            return $this->processBatchDeletes($table);
        }
        
        return true;
    }
    
    /**
     * Execute batch insert
     * 
     * @param string $table Table name
     * @param array $data Data rows
     * @return int Number of affected rows
     */
    private function executeBatchInsert($table, $data) {
        global $wpdb;
        
        if (empty($data)) {
            return 0;
        }
        
        $start_time = microtime(true);
        
        // Get column names from first row
        $columns = array_keys($data[0]);
        $column_list = '`' . implode('`, `', $columns) . '`';
        
        // Build values string
        $values = [];
        foreach ($data as $row) {
            $row_values = [];
            foreach ($columns as $column) {
                $row_values[] = $wpdb->prepare('%s', $row[$column] ?? '');
            }
            $values[] = '(' . implode(', ', $row_values) . ')';
        }
        
        $values_string = implode(', ', $values);
        
        // Execute batch insert
        $query = "INSERT INTO `{$table}` ({$column_list}) VALUES {$values_string}";
        $result = $wpdb->query($query);
        
        $execution_time = microtime(true) - $start_time;
        
        if ($result !== false) {
            $this->query_metrics['batch_operations']++;
            error_log("[LAS Database Optimizer] Batch insert: {$result} rows in {$execution_time}s");
        } else {
            error_log("[LAS Database Optimizer] Batch insert failed: {$wpdb->last_error}");
        }
        
        return $result;
    }
    
    /**
     * Execute batch update
     * 
     * @param string $table Table name
     * @param array $updates Update operations
     * @return bool Success
     */
    private function executeBatchUpdate($table, $updates) {
        global $wpdb;
        
        if (empty($updates)) {
            return false;
        }
        
        $start_time = microtime(true);
        $success_count = 0;
        
        // Group updates by similar structure for optimization
        $grouped_updates = $this->groupUpdatesByStructure($updates);
        
        foreach ($grouped_updates as $group) {
            $result = $this->executeGroupedUpdates($table, $group);
            if ($result) {
                $success_count++;
            }
        }
        
        $execution_time = microtime(true) - $start_time;
        
        if ($success_count > 0) {
            $this->query_metrics['batch_operations']++;
            error_log("[LAS Database Optimizer] Batch update: {$success_count} groups in {$execution_time}s");
        }
        
        return $success_count > 0;
    }
    
    /**
     * Execute batch delete
     * 
     * @param string $table Table name
     * @param array $conditions Delete conditions
     * @return bool Success
     */
    private function executeBatchDelete($table, $conditions) {
        global $wpdb;
        
        if (empty($conditions)) {
            return false;
        }
        
        $start_time = microtime(true);
        
        // Build WHERE clause for batch delete
        $where_clauses = [];
        foreach ($conditions as $condition) {
            if (is_array($condition)) {
                $condition_parts = [];
                foreach ($condition as $column => $value) {
                    $condition_parts[] = $wpdb->prepare("`{$column}` = %s", $value);
                }
                $where_clauses[] = '(' . implode(' AND ', $condition_parts) . ')';
            }
        }
        
        if (empty($where_clauses)) {
            return false;
        }
        
        $where_string = implode(' OR ', $where_clauses);
        $query = "DELETE FROM `{$table}` WHERE {$where_string}";
        
        $result = $wpdb->query($query);
        
        $execution_time = microtime(true) - $start_time;
        
        if ($result !== false) {
            $this->query_metrics['batch_operations']++;
            error_log("[LAS Database Optimizer] Batch delete: {$result} rows in {$execution_time}s");
        } else {
            error_log("[LAS Database Optimizer] Batch delete failed: {$wpdb->last_error}");
        }
        
        return $result !== false;
    }
    
    /**
     * Group updates by similar structure for optimization
     * 
     * @param array $updates Update operations
     * @return array Grouped updates
     */
    private function groupUpdatesByStructure($updates) {
        $groups = [];
        
        foreach ($updates as $update) {
            if (!isset($update['data']) || !isset($update['where'])) {
                continue;
            }
            
            // Create a signature based on data and where keys
            $data_keys = array_keys($update['data']);
            $where_keys = array_keys($update['where']);
            sort($data_keys);
            sort($where_keys);
            
            $signature = md5(implode(',', $data_keys) . '|' . implode(',', $where_keys));
            
            if (!isset($groups[$signature])) {
                $groups[$signature] = [];
            }
            
            $groups[$signature][] = $update;
        }
        
        return $groups;
    }
    
    /**
     * Execute grouped updates
     * 
     * @param string $table Table name
     * @param array $group Update group
     * @return bool Success
     */
    private function executeGroupedUpdates($table, $group) {
        global $wpdb;
        
        if (empty($group)) {
            return false;
        }
        
        $success_count = 0;
        
        foreach ($group as $update) {
            $result = $wpdb->update($table, $update['data'], $update['where']);
            if ($result !== false) {
                $success_count++;
            }
        }
        
        return $success_count > 0;
    }
    
    /**
     * Process batch queue
     */
    public function processBatchQueue() {
        // Process inserts
        foreach ($this->batch_queue['inserts'] as $table => $data) {
            if (!empty($data)) {
                $this->processBatchInserts($table);
            }
        }
        
        // Process updates
        foreach ($this->batch_queue['updates'] as $table => $updates) {
            if (!empty($updates)) {
                $this->processBatchUpdates($table);
            }
        }
        
        // Process deletes
        foreach ($this->batch_queue['deletes'] as $table => $conditions) {
            if (!empty($conditions)) {
                $this->processBatchDeletes($table);
            }
        }
        
        // Clear queue
        $this->batch_queue = [
            'inserts' => [],
            'updates' => [],
            'deletes' => []
        ];
    }
    
    /**
     * Process batch inserts for a table
     * 
     * @param string $table Table name
     * @return bool Success
     */
    private function processBatchInserts($table) {
        if (!isset($this->batch_queue['inserts'][$table]) || empty($this->batch_queue['inserts'][$table])) {
            return false;
        }
        
        $data = $this->batch_queue['inserts'][$table];
        $result = $this->executeBatchInsert($table, $data);
        
        // Clear processed data
        $this->batch_queue['inserts'][$table] = [];
        
        return $result !== false;
    }
    
    /**
     * Process batch updates for a table
     * 
     * @param string $table Table name
     * @return bool Success
     */
    private function processBatchUpdates($table) {
        if (!isset($this->batch_queue['updates'][$table]) || empty($this->batch_queue['updates'][$table])) {
            return false;
        }
        
        $updates = $this->batch_queue['updates'][$table];
        $result = $this->executeBatchUpdate($table, $updates);
        
        // Clear processed data
        $this->batch_queue['updates'][$table] = [];
        
        return $result;
    }
    
    /**
     * Process batch deletes for a table
     * 
     * @param string $table Table name
     * @return bool Success
     */
    private function processBatchDeletes($table) {
        if (!isset($this->batch_queue['deletes'][$table]) || empty($this->batch_queue['deletes'][$table])) {
            return false;
        }
        
        $conditions = $this->batch_queue['deletes'][$table];
        $result = $this->executeBatchDelete($table, $conditions);
        
        // Clear processed data
        $this->batch_queue['deletes'][$table] = [];
        
        return $result;
    }
    
    /**
     * Generate cache key for query
     * 
     * @param string $query SQL query
     * @return string Cache key
     */
    private function generateQueryCacheKey($query) {
        return 'query_' . md5($query);
    }
    
    /**
     * Monitor query execution
     * 
     * @param string $query SQL query
     * @return string Query (unchanged)
     */
    public function monitorQuery($query) {
        // Skip monitoring for certain queries
        if ($this->shouldSkipMonitoring($query)) {
            return $query;
        }
        
        $start_time = microtime(true);
        
        // Store query start time for later measurement
        $this->optimized_queries[md5($query)] = [
            'query' => $query,
            'start_time' => $start_time
        ];
        
        return $query;
    }
    
    /**
     * Check if query should be skipped from monitoring
     * 
     * @param string $query SQL query
     * @return bool Should skip
     */
    private function shouldSkipMonitoring($query) {
        $skip_patterns = [
            'SHOW TABLES',
            'DESCRIBE',
            'EXPLAIN',
            'SET NAMES',
            'SET SQL_MODE'
        ];
        
        foreach ($skip_patterns as $pattern) {
            if (stripos($query, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Log slow query
     * 
     * @param string $query SQL query
     * @param float $execution_time Execution time
     */
    private function logSlowQuery($query, $execution_time) {
        $this->query_metrics['slow_queries'][] = [
            'query' => $query,
            'execution_time' => $execution_time,
            'timestamp' => current_time('mysql'),
            'backtrace' => wp_debug_backtrace_summary()
        ];
        
        // Keep only last 50 slow queries
        if (count($this->query_metrics['slow_queries']) > 50) {
            array_shift($this->query_metrics['slow_queries']);
        }
        
        error_log("[LAS Database Optimizer] Slow query ({$execution_time}s): " . substr($query, 0, 200));
    }
    
    /**
     * Log query performance
     */
    public function logQueryPerformance() {
        if ($this->query_metrics['total_queries'] > 0) {
            $cache_hit_rate = ($this->query_metrics['cached_queries'] / $this->query_metrics['total_queries']) * 100;
            
            error_log(sprintf(
                "[LAS Database Optimizer] Session stats - Queries: %d, Cached: %d (%.1f%%), Batches: %d, Time saved: %.3fs",
                $this->query_metrics['total_queries'],
                $this->query_metrics['cached_queries'],
                $cache_hit_rate,
                $this->query_metrics['batch_operations'],
                $this->query_metrics['optimization_time_saved']
            ));
        }
    }
    
    /**
     * Warm cache with frequently used queries
     */
    public function warmCache() {
        $queries_to_warm = [
            // Settings queries
            [
                'query' => "SELECT option_name, option_value FROM {$GLOBALS['wpdb']->options} WHERE option_name LIKE 'las_fresh_%'",
                'cache_key' => 'all_settings',
                'group' => 'settings',
                'ttl' => 3600
            ],
            // User state queries
            [
                'query' => "SELECT meta_key, meta_value FROM {$GLOBALS['wpdb']->usermeta} WHERE meta_key LIKE 'las_%' AND user_id = %d",
                'cache_key' => 'user_state_' . get_current_user_id(),
                'group' => 'user_state',
                'ttl' => 1800,
                'params' => [get_current_user_id()]
            ],
            // Template queries
            [
                'query' => "SELECT option_value FROM {$GLOBALS['wpdb']->options} WHERE option_name = 'las_fresh_templates'",
                'cache_key' => 'templates',
                'group' => 'templates',
                'ttl' => 7200
            ]
        ];
        
        foreach ($queries_to_warm as $query_config) {
            $this->warmSingleQuery($query_config);
        }
        
        error_log("[LAS Database Optimizer] Cache warming completed");
    }
    
    /**
     * Warm single query cache
     * 
     * @param array $config Query configuration
     */
    private function warmSingleQuery($config) {
        try {
            $this->query(
                $config['query'],
                $config['params'] ?? [],
                $config['ttl'],
                $config['group']
            );
        } catch (Exception $e) {
            error_log("[LAS Database Optimizer] Cache warming failed for query: " . $e->getMessage());
        }
    }
    
    /**
     * Optimize database tables
     * 
     * @return array Optimization results
     */
    public function optimizeTables() {
        global $wpdb;
        
        $results = [];
        $tables_to_optimize = [
            $wpdb->options,
            $wpdb->usermeta,
            $wpdb->postmeta
        ];
        
        foreach ($tables_to_optimize as $table) {
            $start_time = microtime(true);
            $result = $wpdb->query("OPTIMIZE TABLE `{$table}`");
            $execution_time = microtime(true) - $start_time;
            
            $results[$table] = [
                'success' => $result !== false,
                'execution_time' => $execution_time,
                'error' => $result === false ? $wpdb->last_error : null
            ];
        }
        
        return $results;
    }
    
    /**
     * Analyze query performance
     * 
     * @param string $query SQL query
     * @return array Analysis results
     */
    public function analyzeQuery($query) {
        global $wpdb;
        
        $analysis = [
            'query' => $query,
            'explain' => null,
            'execution_time' => null,
            'recommendations' => []
        ];
        
        // Get query execution plan
        $explain_query = "EXPLAIN " . $query;
        $start_time = microtime(true);
        $explain_result = $wpdb->get_results($explain_query);
        $analysis['execution_time'] = microtime(true) - $start_time;
        
        if ($explain_result) {
            $analysis['explain'] = $explain_result;
            $analysis['recommendations'] = $this->generateQueryRecommendations($explain_result);
        }
        
        return $analysis;
    }
    
    /**
     * Generate query optimization recommendations
     * 
     * @param array $explain_result EXPLAIN query result
     * @return array Recommendations
     */
    private function generateQueryRecommendations($explain_result) {
        $recommendations = [];
        
        foreach ($explain_result as $row) {
            // Check for table scans
            if ($row->type === 'ALL') {
                $recommendations[] = "Consider adding an index to table '{$row->table}' to avoid full table scan";
            }
            
            // Check for large row examinations
            if (isset($row->rows) && $row->rows > 1000) {
                $recommendations[] = "Query examines {$row->rows} rows in table '{$row->table}' - consider optimizing WHERE clause";
            }
            
            // Check for filesort
            if (isset($row->Extra) && strpos($row->Extra, 'Using filesort') !== false) {
                $recommendations[] = "Query uses filesort on table '{$row->table}' - consider adding appropriate index for ORDER BY";
            }
            
            // Check for temporary tables
            if (isset($row->Extra) && strpos($row->Extra, 'Using temporary') !== false) {
                $recommendations[] = "Query creates temporary table - consider optimizing JOIN or GROUP BY clauses";
            }
        }
        
        return $recommendations;
    }
    
    /**
     * Get database optimization report
     * 
     * @return array Optimization report
     */
    public function getOptimizationReport() {
        global $wpdb;
        
        return [
            'query_metrics' => $this->query_metrics,
            'batch_queue_status' => [
                'inserts_pending' => array_sum(array_map('count', $this->batch_queue['inserts'])),
                'updates_pending' => array_sum(array_map('count', $this->batch_queue['updates'])),
                'deletes_pending' => array_sum(array_map('count', $this->batch_queue['deletes']))
            ],
            'cache_performance' => $this->cache_manager->getMetrics(),
            'database_info' => [
                'mysql_version' => $wpdb->db_version(),
                'charset' => $wpdb->charset,
                'collate' => $wpdb->collate,
                'queries_count' => get_num_queries(),
                'query_time' => timer_stop()
            ],
            'configuration' => $this->query_cache_config,
            'slow_queries_count' => count($this->query_metrics['slow_queries']),
            'recommendations' => $this->generateOptimizationRecommendations()
        ];
    }
    
    /**
     * Generate optimization recommendations
     * 
     * @return array Recommendations
     */
    private function generateOptimizationRecommendations() {
        $recommendations = [];
        
        // Check cache hit rate
        if ($this->query_metrics['total_queries'] > 0) {
            $cache_hit_rate = ($this->query_metrics['cached_queries'] / $this->query_metrics['total_queries']) * 100;
            
            if ($cache_hit_rate < 50) {
                $recommendations[] = "Low cache hit rate ({$cache_hit_rate}%) - consider increasing cache TTL or warming more queries";
            }
        }
        
        // Check slow queries
        if (count($this->query_metrics['slow_queries']) > 10) {
            $recommendations[] = "High number of slow queries detected - review and optimize database queries";
        }
        
        // Check batch operations
        if ($this->query_metrics['batch_operations'] === 0 && $this->query_metrics['total_queries'] > 50) {
            $recommendations[] = "No batch operations used - consider batching similar operations for better performance";
        }
        
        return $recommendations;
    }
    
    /**
     * Clear query cache
     * 
     * @param string $group Optional cache group to clear
     */
    public function clearQueryCache($group = null) {
        if ($group) {
            $this->cache_manager->flush($group);
        } else {
            $this->cache_manager->flush();
        }
        
        error_log("[LAS Database Optimizer] Query cache cleared" . ($group ? " for group: {$group}" : ""));
    }
    
    /**
     * Enable query caching
     */
    public function enableQueryCaching() {
        $this->query_cache_config['enabled'] = true;
        error_log("[LAS Database Optimizer] Query caching enabled");
    }
    
    /**
     * Disable query caching
     */
    public function disableQueryCaching() {
        $this->query_cache_config['enabled'] = false;
        error_log("[LAS Database Optimizer] Query caching disabled");
    }
    
    /**
     * Get query metrics
     * 
     * @return array Query metrics
     */
    public function getQueryMetrics() {
        return $this->query_metrics;
    }
    
    /**
     * Reset query metrics
     */
    public function resetQueryMetrics() {
        $this->query_metrics = [
            'total_queries' => 0,
            'cached_queries' => 0,
            'batch_operations' => 0,
            'optimization_time_saved' => 0,
            'slow_queries' => []
        ];
    }
}