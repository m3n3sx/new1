<?php
/**
 * Database Performance Testing Script for Live Admin Styler
 * 
 * This script performs comprehensive database performance testing including:
 * - Query execution time analysis
 * - Memory usage optimization validation
 * - Cache performance testing
 * - Concurrent access simulation
 * - Database optimization verification
 * 
 * @package LiveAdminStyler
 * @subpackage PerformanceTests
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access not allowed');
}

/**
 * Database Performance Tester class
 */
class LAS_Database_Performance_Tester {
    
    /**
     * Settings storage instance
     * @var LAS_Settings_Storage
     */
    private $storage;
    
    /**
     * Test results
     * @var array
     */
    private $results = [];
    
    /**
     * Performance thresholds
     * @var array
     */
    private $thresholds = [
        'single_save_ms' => 100,      // Single setting save should be under 100ms
        'batch_save_ms' => 500,       // Batch save should be under 500ms
        'single_load_ms' => 50,       // Single setting load should be under 50ms
        'batch_load_ms' => 200,       // Batch load should be under 200ms
        'cache_hit_ratio' => 0.8,     // Cache hit ratio should be above 80%
        'memory_limit_mb' => 50,      // Memory usage should be under 50MB
        'concurrent_operations' => 10  // Should handle 10 concurrent operations
    ];
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->storage = new LAS_Settings_Storage();
    }
    
    /**
     * Run all performance tests
     * 
     * @return array Test results
     */
    public function run_all_tests() {
        echo "Starting Live Admin Styler Database Performance Tests...\n\n";
        
        $this->test_single_operation_performance();
        $this->test_batch_operation_performance();
        $this->test_cache_performance();
        $this->test_memory_usage();
        $this->test_concurrent_access();
        $this->test_database_optimization();
        $this->test_large_dataset_performance();
        $this->test_query_optimization();
        
        $this->generate_performance_report();
        
        return $this->results;
    }
    
    /**
     * Test single operation performance
     */
    private function test_single_operation_performance() {
        echo "Testing Single Operation Performance...\n";
        
        $iterations = 100;
        $save_times = [];
        $load_times = [];
        
        for ($i = 0; $i < $iterations; $i++) {
            $test_key = "perf_test_$i";
            $test_value = "#" . str_pad(dechex(rand(0, 16777215)), 6, '0', STR_PAD_LEFT);
            
            // Test save performance
            $start_time = microtime(true);
            $this->storage->set_setting($test_key, $test_value);
            $save_time = (microtime(true) - $start_time) * 1000;
            $save_times[] = $save_time;
            
            // Test load performance
            $start_time = microtime(true);
            $loaded_value = $this->storage->get_setting($test_key);
            $load_time = (microtime(true) - $start_time) * 1000;
            $load_times[] = $load_time;
            
            // Verify correctness
            if ($loaded_value !== $test_value) {
                $this->results['single_operation_errors'][] = [
                    'iteration' => $i,
                    'expected' => $test_value,
                    'actual' => $loaded_value
                ];
            }
        }
        
        $this->results['single_operation_performance'] = [
            'save_avg_ms' => array_sum($save_times) / count($save_times),
            'save_max_ms' => max($save_times),
            'save_min_ms' => min($save_times),
            'load_avg_ms' => array_sum($load_times) / count($load_times),
            'load_max_ms' => max($load_times),
            'load_min_ms' => min($load_times),
            'iterations' => $iterations,
            'save_threshold_passed' => max($save_times) < $this->thresholds['single_save_ms'],
            'load_threshold_passed' => max($load_times) < $this->thresholds['single_load_ms']
        ];
        
        echo sprintf(
            "Single Operations: Save avg %.2fms (max %.2fms), Load avg %.2fms (max %.2fms)\n\n",
            $this->results['single_operation_performance']['save_avg_ms'],
            $this->results['single_operation_performance']['save_max_ms'],
            $this->results['single_operation_performance']['load_avg_ms'],
            $this->results['single_operation_performance']['load_max_ms']
        );
    }
    
    /**
     * Test batch operation performance
     */
    private function test_batch_operation_performance() {
        echo "Testing Batch Operation Performance...\n";
        
        $batch_sizes = [10, 50, 100, 200];
        $batch_results = [];
        
        foreach ($batch_sizes as $batch_size) {
            $test_settings = [];
            for ($i = 0; $i < $batch_size; $i++) {
                $test_settings["batch_test_$i"] = "#" . str_pad(dechex(rand(0, 16777215)), 6, '0', STR_PAD_LEFT);
            }
            
            // Test batch save performance
            $start_time = microtime(true);
            $save_result = $this->storage->save_settings($test_settings);
            $save_time = (microtime(true) - $start_time) * 1000;
            
            // Test batch load performance
            $start_time = microtime(true);
            $loaded_settings = $this->storage->load_settings(array_keys($test_settings));
            $load_time = (microtime(true) - $start_time) * 1000;
            
            $batch_results[$batch_size] = [
                'save_time_ms' => $save_time,
                'load_time_ms' => $load_time,
                'save_per_item_ms' => $save_time / $batch_size,
                'load_per_item_ms' => $load_time / $batch_size,
                'save_success' => $save_result,
                'data_integrity' => $this->verify_batch_integrity($test_settings, $loaded_settings)
            ];
            
            echo sprintf(
                "Batch size %d: Save %.2fms (%.2fms/item), Load %.2fms (%.2fms/item)\n",
                $batch_size,
                $save_time,
                $save_time / $batch_size,
                $load_time,
                $load_time / $batch_size
            );
        }
        
        $this->results['batch_operation_performance'] = $batch_results;
        echo "\n";
    }
    
    /**
     * Verify batch operation data integrity
     */
    private function verify_batch_integrity($original, $loaded) {
        if (count($original) !== count($loaded)) {
            return false;
        }
        
        foreach ($original as $key => $value) {
            if (!isset($loaded[$key]) || $loaded[$key] !== $value) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Test cache performance
     */
    private function test_cache_performance() {
        echo "Testing Cache Performance...\n";
        
        $test_settings = [];
        for ($i = 0; $i < 50; $i++) {
            $test_settings["cache_test_$i"] = "value_$i";
        }
        
        // Save settings to populate cache
        $this->storage->save_settings($test_settings);
        
        $cache_hits = 0;
        $cache_misses = 0;
        $total_requests = 200;
        
        for ($i = 0; $i < $total_requests; $i++) {
            $random_key = "cache_test_" . rand(0, 49);
            
            // Check if value is in cache before loading
            $cached_value = wp_cache_get($random_key, 'las_settings');
            
            if ($cached_value !== false) {
                $cache_hits++;
            } else {
                $cache_misses++;
            }
            
            // Load the setting (this will cache it if not already cached)
            $this->storage->get_setting($random_key);
        }
        
        $cache_hit_ratio = $cache_hits / $total_requests;
        
        // Test cache invalidation
        $invalidation_start = microtime(true);
        $this->storage->set_setting('cache_test_0', 'new_value');
        $invalidation_time = (microtime(true) - $invalidation_start) * 1000;
        
        $this->results['cache_performance'] = [
            'cache_hits' => $cache_hits,
            'cache_misses' => $cache_misses,
            'cache_hit_ratio' => $cache_hit_ratio,
            'total_requests' => $total_requests,
            'invalidation_time_ms' => $invalidation_time,
            'threshold_passed' => $cache_hit_ratio >= $this->thresholds['cache_hit_ratio']
        ];
        
        echo sprintf(
            "Cache Performance: Hit ratio %.2f%% (%d hits, %d misses), Invalidation %.2fms\n\n",
            $cache_hit_ratio * 100,
            $cache_hits,
            $cache_misses,
            $invalidation_time
        );
    }
    
    /**
     * Test memory usage
     */
    private function test_memory_usage() {
        echo "Testing Memory Usage...\n";
        
        $initial_memory = memory_get_usage(true);
        $peak_memory = memory_get_peak_usage(true);
        
        // Perform memory-intensive operations
        $large_settings = [];
        for ($i = 0; $i < 1000; $i++) {
            $large_settings["memory_test_$i"] = str_repeat('x', 1000); // 1KB per setting
        }
        
        // Save large dataset
        $save_start_memory = memory_get_usage(true);
        $this->storage->save_settings($large_settings);
        $save_end_memory = memory_get_usage(true);
        
        // Load large dataset
        $load_start_memory = memory_get_usage(true);
        $loaded_settings = $this->storage->load_settings();
        $load_end_memory = memory_get_usage(true);
        
        $final_memory = memory_get_usage(true);
        $final_peak_memory = memory_get_peak_usage(true);
        
        $this->results['memory_usage'] = [
            'initial_memory_mb' => $initial_memory / 1024 / 1024,
            'final_memory_mb' => $final_memory / 1024 / 1024,
            'peak_memory_mb' => $final_peak_memory / 1024 / 1024,
            'memory_increase_mb' => ($final_memory - $initial_memory) / 1024 / 1024,
            'save_memory_delta_mb' => ($save_end_memory - $save_start_memory) / 1024 / 1024,
            'load_memory_delta_mb' => ($load_end_memory - $load_start_memory) / 1024 / 1024,
            'threshold_passed' => ($final_peak_memory / 1024 / 1024) < $this->thresholds['memory_limit_mb']
        ];
        
        echo sprintf(
            "Memory Usage: Peak %.2fMB, Increase %.2fMB, Save delta %.2fMB, Load delta %.2fMB\n\n",
            $this->results['memory_usage']['peak_memory_mb'],
            $this->results['memory_usage']['memory_increase_mb'],
            $this->results['memory_usage']['save_memory_delta_mb'],
            $this->results['memory_usage']['load_memory_delta_mb']
        );
    }
    
    /**
     * Test concurrent access simulation
     */
    private function test_concurrent_access() {
        echo "Testing Concurrent Access Simulation...\n";
        
        $concurrent_operations = 20;
        $operations_per_thread = 10;
        $results = [];
        
        // Simulate concurrent operations
        for ($thread = 0; $thread < $concurrent_operations; $thread++) {
            $thread_results = [];
            
            for ($op = 0; $op < $operations_per_thread; $op++) {
                $key = "concurrent_test_{$thread}_{$op}";
                $value = "value_{$thread}_{$op}";
                
                $start_time = microtime(true);
                
                // Perform operation
                $this->storage->set_setting($key, $value);
                $loaded_value = $this->storage->get_setting($key);
                
                $operation_time = (microtime(true) - $start_time) * 1000;
                
                $thread_results[] = [
                    'operation_time_ms' => $operation_time,
                    'data_integrity' => $loaded_value === $value
                ];
            }
            
            $results[$thread] = $thread_results;
        }
        
        // Analyze results
        $total_operations = $concurrent_operations * $operations_per_thread;
        $successful_operations = 0;
        $total_time = 0;
        $max_time = 0;
        
        foreach ($results as $thread_results) {
            foreach ($thread_results as $result) {
                if ($result['data_integrity']) {
                    $successful_operations++;
                }
                $total_time += $result['operation_time_ms'];
                $max_time = max($max_time, $result['operation_time_ms']);
            }
        }
        
        $success_rate = $successful_operations / $total_operations;
        $avg_time = $total_time / $total_operations;
        
        $this->results['concurrent_access'] = [
            'total_operations' => $total_operations,
            'successful_operations' => $successful_operations,
            'success_rate' => $success_rate,
            'avg_operation_time_ms' => $avg_time,
            'max_operation_time_ms' => $max_time,
            'concurrent_threads' => $concurrent_operations,
            'threshold_passed' => $success_rate >= 0.95 // 95% success rate
        ];
        
        echo sprintf(
            "Concurrent Access: %d operations, %.2f%% success rate, avg %.2fms, max %.2fms\n\n",
            $total_operations,
            $success_rate * 100,
            $avg_time,
            $max_time
        );
    }
    
    /**
     * Test database optimization
     */
    private function test_database_optimization() {
        echo "Testing Database Optimization...\n";
        
        // Get initial database stats
        $initial_stats = $this->storage->get_database_stats();
        
        // Add test data
        $test_settings = [];
        for ($i = 0; $i < 100; $i++) {
            $test_settings["optimization_test_$i"] = str_repeat('x', 500);
        }
        $this->storage->save_settings($test_settings);
        
        // Get stats before optimization
        $before_stats = $this->storage->get_database_stats();
        
        // Run optimization
        $optimization_start = microtime(true);
        $optimization_result = $this->storage->optimize_database();
        $optimization_time = (microtime(true) - $optimization_start) * 1000;
        
        // Get stats after optimization
        $after_stats = $this->storage->get_database_stats();
        
        $this->results['database_optimization'] = [
            'optimization_success' => $optimization_result,
            'optimization_time_ms' => $optimization_time,
            'before_option_count' => $before_stats['option_count'],
            'after_option_count' => $after_stats['option_count'],
            'before_total_size_bytes' => $before_stats['total_size_bytes'],
            'after_total_size_bytes' => $after_stats['total_size_bytes'],
            'size_reduction_bytes' => $before_stats['total_size_bytes'] - $after_stats['total_size_bytes'],
            'size_reduction_percent' => (($before_stats['total_size_bytes'] - $after_stats['total_size_bytes']) / $before_stats['total_size_bytes']) * 100
        ];
        
        echo sprintf(
            "Database Optimization: %s in %.2fms, Size reduction: %d bytes (%.2f%%)\n\n",
            $optimization_result ? 'Success' : 'Failed',
            $optimization_time,
            $this->results['database_optimization']['size_reduction_bytes'],
            $this->results['database_optimization']['size_reduction_percent']
        );
    }
    
    /**
     * Test large dataset performance
     */
    private function test_large_dataset_performance() {
        echo "Testing Large Dataset Performance...\n";
        
        $dataset_sizes = [500, 1000, 2000];
        $large_dataset_results = [];
        
        foreach ($dataset_sizes as $size) {
            $large_settings = [];
            for ($i = 0; $i < $size; $i++) {
                $large_settings["large_test_$i"] = str_repeat('x', 100);
            }
            
            // Test save performance
            $save_start = microtime(true);
            $save_result = $this->storage->save_settings($large_settings);
            $save_time = (microtime(true) - $save_start) * 1000;
            
            // Test load performance
            $load_start = microtime(true);
            $loaded_settings = $this->storage->load_settings();
            $load_time = (microtime(true) - $load_start) * 1000;
            
            $large_dataset_results[$size] = [
                'save_time_ms' => $save_time,
                'load_time_ms' => $load_time,
                'save_success' => $save_result,
                'data_integrity' => count($loaded_settings) >= $size,
                'throughput_items_per_second' => $size / ($save_time / 1000)
            ];
            
            echo sprintf(
                "Dataset size %d: Save %.2fms, Load %.2fms, Throughput %.0f items/sec\n",
                $size,
                $save_time,
                $load_time,
                $large_dataset_results[$size]['throughput_items_per_second']
            );
        }
        
        $this->results['large_dataset_performance'] = $large_dataset_results;
        echo "\n";
    }
    
    /**
     * Test query optimization
     */
    private function test_query_optimization() {
        echo "Testing Query Optimization...\n";
        
        global $wpdb;
        
        // Enable query logging
        $wpdb->queries = [];
        define('SAVEQUERIES', true);
        
        // Perform operations that should be optimized
        $test_settings = [];
        for ($i = 0; $i < 50; $i++) {
            $test_settings["query_test_$i"] = "value_$i";
        }
        
        $query_count_before = count($wpdb->queries);
        
        // Save settings (should use batch operations)
        $this->storage->save_settings($test_settings);
        
        $query_count_after_save = count($wpdb->queries);
        
        // Load settings (should use efficient queries)
        $this->storage->load_settings();
        
        $query_count_after_load = count($wpdb->queries);
        
        $save_queries = $query_count_after_save - $query_count_before;
        $load_queries = $query_count_after_load - $query_count_after_save;
        
        // Analyze query efficiency
        $slow_queries = 0;
        $total_query_time = 0;
        
        for ($i = $query_count_before; $i < count($wpdb->queries); $i++) {
            $query_time = $wpdb->queries[$i][1];
            $total_query_time += $query_time;
            
            if ($query_time > 0.1) { // Queries taking more than 100ms
                $slow_queries++;
            }
        }
        
        $this->results['query_optimization'] = [
            'save_query_count' => $save_queries,
            'load_query_count' => $load_queries,
            'total_query_time' => $total_query_time,
            'slow_query_count' => $slow_queries,
            'avg_query_time' => $total_query_time / ($save_queries + $load_queries),
            'queries_per_setting_save' => $save_queries / count($test_settings),
            'queries_per_setting_load' => $load_queries / count($test_settings)
        ];
        
        echo sprintf(
            "Query Optimization: Save %d queries, Load %d queries, %.0f slow queries, avg %.4fs per query\n\n",
            $save_queries,
            $load_queries,
            $slow_queries,
            $this->results['query_optimization']['avg_query_time']
        );
    }
    
    /**
     * Generate comprehensive performance report
     */
    private function generate_performance_report() {
        echo "=== DATABASE PERFORMANCE TEST REPORT ===\n\n";
        
        $overall_score = 0;
        $test_count = 0;
        $failed_tests = [];
        
        // Evaluate each test against thresholds
        $evaluations = [
            'Single Save Performance' => $this->results['single_operation_performance']['save_threshold_passed'] ?? false,
            'Single Load Performance' => $this->results['single_operation_performance']['load_threshold_passed'] ?? false,
            'Cache Hit Ratio' => $this->results['cache_performance']['threshold_passed'] ?? false,
            'Memory Usage' => $this->results['memory_usage']['threshold_passed'] ?? false,
            'Concurrent Access' => $this->results['concurrent_access']['threshold_passed'] ?? false,
            'Database Optimization' => $this->results['database_optimization']['optimization_success'] ?? false
        ];
        
        foreach ($evaluations as $test_name => $passed) {
            echo sprintf("%-25s: %s\n", $test_name, $passed ? 'PASS' : 'FAIL');
            
            if ($passed) {
                $overall_score += 100;
            } else {
                $failed_tests[] = $test_name;
            }
            $test_count++;
        }
        
        $overall_score = $test_count > 0 ? $overall_score / $test_count : 0;
        
        echo "\nOVERALL PERFORMANCE SCORE: {$overall_score}%\n\n";
        
        // Performance recommendations
        if ($overall_score < 90) {
            echo "PERFORMANCE RECOMMENDATIONS:\n";
            
            foreach ($failed_tests as $failed_test) {
                switch ($failed_test) {
                    case 'Single Save Performance':
                        echo "- Optimize single setting save operations\n";
                        break;
                    case 'Single Load Performance':
                        echo "- Improve single setting load performance\n";
                        break;
                    case 'Cache Hit Ratio':
                        echo "- Enhance caching strategy\n";
                        break;
                    case 'Memory Usage':
                        echo "- Optimize memory usage patterns\n";
                        break;
                    case 'Concurrent Access':
                        echo "- Improve concurrent access handling\n";
                        break;
                    case 'Database Optimization':
                        echo "- Fix database optimization issues\n";
                        break;
                }
            }
            echo "\n";
        }
        
        // Save detailed report
        $report_file = WP_CONTENT_DIR . '/las-performance-report-' . date('Y-m-d-H-i-s') . '.json';
        file_put_contents($report_file, json_encode($this->results, JSON_PRETTY_PRINT));
        echo "Detailed report saved to: $report_file\n";
    }
}

// Run the performance tests if called directly
if (defined('WP_CLI') && WP_CLI) {
    $tester = new LAS_Database_Performance_Tester();
    $tester->run_all_tests();
}