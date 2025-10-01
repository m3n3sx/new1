<?php
/**
 * Database Optimizer Tests
 * 
 * Unit tests for the LAS_DatabaseOptimizer class
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

class TestDatabaseOptimizer extends WP_UnitTestCase {
    
    private $db_optimizer;
    private $test_table;
    
    public function setUp(): void {
        parent::setUp();
        
        // Create test table
        global $wpdb;
        $this->test_table = $wpdb->prefix . 'las_test_optimizer';
        
        $wpdb->query("CREATE TABLE IF NOT EXISTS `{$this->test_table}` (
            id int(11) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            value text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY name_idx (name)
        )");
        
        $this->db_optimizer = LAS_DatabaseOptimizer::getInstance();
        $this->db_optimizer->resetQueryMetrics();
    }
    
    public function tearDown(): void {
        // Clean up test table
        global $wpdb;
        $wpdb->query("DROP TABLE IF EXISTS `{$this->test_table}`");
        
        parent::tearDown();
    }
    
    /**
     * Test singleton instance
     */
    public function test_singleton_instance() {
        $instance1 = LAS_DatabaseOptimizer::getInstance();
        $instance2 = LAS_DatabaseOptimizer::getInstance();
        
        $this->assertSame($instance1, $instance2);
        $this->assertInstanceOf('LAS_DatabaseOptimizer', $instance1);
    }
    
    /**
     * Test optimized query execution
     */
    public function test_optimized_query_execution() {
        // Insert test data
        global $wpdb;
        $wpdb->insert($this->test_table, [
            'name' => 'test_query',
            'value' => 'test_value'
        ]);
        
        // Execute optimized query
        $result = $this->db_optimizer->query(
            "SELECT * FROM `{$this->test_table}` WHERE name = %s",
            ['test_query'],
            300, // 5 minute cache
            'test_queries'
        );
        
        $this->assertNotEmpty($result);
        $this->assertEquals('test_query', $result[0]->name);
        $this->assertEquals('test_value', $result[0]->value);
        
        // Second query should be cached
        $result2 = $this->db_optimizer->query(
            "SELECT * FROM `{$this->test_table}` WHERE name = %s",
            ['test_query'],
            300,
            'test_queries'
        );
        
        $this->assertEquals($result, $result2);
        
        // Check metrics
        $metrics = $this->db_optimizer->getQueryMetrics();
        $this->assertGreaterThan(0, $metrics['total_queries']);
        $this->assertGreaterThan(0, $metrics['cached_queries']);
    }
    
    /**
     * Test batch insert operation
     */
    public function test_batch_insert_operation() {
        $test_data = [
            ['name' => 'batch_test_1', 'value' => 'value_1'],
            ['name' => 'batch_test_2', 'value' => 'value_2'],
            ['name' => 'batch_test_3', 'value' => 'value_3']
        ];
        
        $result = $this->db_optimizer->batchInsert($this->test_table, $test_data, true);
        
        $this->assertGreaterThan(0, $result);
        
        // Verify data was inserted
        global $wpdb;
        $count = $wpdb->get_var("SELECT COUNT(*) FROM `{$this->test_table}` WHERE name LIKE 'batch_test_%'");
        $this->assertEquals(3, $count);
        
        // Check metrics
        $metrics = $this->db_optimizer->getQueryMetrics();
        $this->assertGreaterThan(0, $metrics['batch_operations']);
    }
    
    /**
     * Test batch update operation
     */
    public function test_batch_update_operation() {
        // Insert test data first
        global $wpdb;
        $wpdb->insert($this->test_table, ['name' => 'update_test_1', 'value' => 'original_1']);
        $wpdb->insert($this->test_table, ['name' => 'update_test_2', 'value' => 'original_2']);
        
        $updates = [
            [
                'data' => ['value' => 'updated_1'],
                'where' => ['name' => 'update_test_1']
            ],
            [
                'data' => ['value' => 'updated_2'],
                'where' => ['name' => 'update_test_2']
            ]
        ];
        
        $result = $this->db_optimizer->batchUpdate($this->test_table, $updates, true);
        
        $this->assertTrue($result);
        
        // Verify updates
        $updated_1 = $wpdb->get_var("SELECT value FROM `{$this->test_table}` WHERE name = 'update_test_1'");
        $updated_2 = $wpdb->get_var("SELECT value FROM `{$this->test_table}` WHERE name = 'update_test_2'");
        
        $this->assertEquals('updated_1', $updated_1);
        $this->assertEquals('updated_2', $updated_2);
    }
    
    /**
     * Test batch delete operation
     */
    public function test_batch_delete_operation() {
        // Insert test data first
        global $wpdb;
        $wpdb->insert($this->test_table, ['name' => 'delete_test_1', 'value' => 'value_1']);
        $wpdb->insert($this->test_table, ['name' => 'delete_test_2', 'value' => 'value_2']);
        
        $conditions = [
            ['name' => 'delete_test_1'],
            ['name' => 'delete_test_2']
        ];
        
        $result = $this->db_optimizer->batchDelete($this->test_table, $conditions, true);
        
        $this->assertTrue($result);
        
        // Verify deletions
        $count = $wpdb->get_var("SELECT COUNT(*) FROM `{$this->test_table}` WHERE name LIKE 'delete_test_%'");
        $this->assertEquals(0, $count);
    }
    
    /**
     * Test batch queue processing
     */
    public function test_batch_queue_processing() {
        // Add operations to queue
        $insert_data = [
            ['name' => 'queue_test_1', 'value' => 'value_1'],
            ['name' => 'queue_test_2', 'value' => 'value_2']
        ];
        
        $result = $this->db_optimizer->batchInsert($this->test_table, $insert_data, false);
        $this->assertTrue($result);
        
        // Process queue
        $this->db_optimizer->processBatchQueue();
        
        // Verify data was inserted
        global $wpdb;
        $count = $wpdb->get_var("SELECT COUNT(*) FROM `{$this->test_table}` WHERE name LIKE 'queue_test_%'");
        $this->assertEquals(2, $count);
    }
    
    /**
     * Test query analysis
     */
    public function test_query_analysis() {
        $query = "SELECT * FROM `{$this->test_table}` WHERE name = 'test'";
        $analysis = $this->db_optimizer->analyzeQuery($query);
        
        $this->assertIsArray($analysis);
        $this->assertArrayHasKey('query', $analysis);
        $this->assertArrayHasKey('explain', $analysis);
        $this->assertArrayHasKey('execution_time', $analysis);
        $this->assertArrayHasKey('recommendations', $analysis);
        
        $this->assertEquals($query, $analysis['query']);
        $this->assertIsFloat($analysis['execution_time']);
        $this->assertIsArray($analysis['recommendations']);
    }
    
    /**
     * Test optimization report generation
     */
    public function test_optimization_report_generation() {
        // Execute some queries to generate metrics
        $this->db_optimizer->query("SELECT 1", [], 300, 'test');
        
        $report = $this->db_optimizer->getOptimizationReport();
        
        $this->assertIsArray($report);
        $this->assertArrayHasKey('query_metrics', $report);
        $this->assertArrayHasKey('batch_queue_status', $report);
        $this->assertArrayHasKey('cache_performance', $report);
        $this->assertArrayHasKey('database_info', $report);
        $this->assertArrayHasKey('configuration', $report);
        $this->assertArrayHasKey('recommendations', $report);
        
        // Check query metrics structure
        $this->assertArrayHasKey('total_queries', $report['query_metrics']);
        $this->assertArrayHasKey('cached_queries', $report['query_metrics']);
        $this->assertArrayHasKey('batch_operations', $report['query_metrics']);
        
        // Check batch queue status
        $this->assertArrayHasKey('inserts_pending', $report['batch_queue_status']);
        $this->assertArrayHasKey('updates_pending', $report['batch_queue_status']);
        $this->assertArrayHasKey('deletes_pending', $report['batch_queue_status']);
        
        // Check database info
        $this->assertArrayHasKey('mysql_version', $report['database_info']);
        $this->assertArrayHasKey('charset', $report['database_info']);
    }
    
    /**
     * Test cache warming
     */
    public function test_cache_warming() {
        // This test verifies that cache warming doesn't throw errors
        // Actual cache warming effectiveness would require integration testing
        
        $this->expectNotToPerformAssertions();
        $this->db_optimizer->warmCache();
    }
    
    /**
     * Test query cache control
     */
    public function test_query_cache_control() {
        // Test enabling/disabling cache
        $this->db_optimizer->disableQueryCaching();
        
        // Execute query - should not be cached
        $result1 = $this->db_optimizer->query("SELECT 1", [], 300, 'test');
        $result2 = $this->db_optimizer->query("SELECT 1", [], 300, 'test');
        
        // Re-enable caching
        $this->db_optimizer->enableQueryCaching();
        
        // Execute query - should be cached
        $result3 = $this->db_optimizer->query("SELECT 2", [], 300, 'test');
        $result4 = $this->db_optimizer->query("SELECT 2", [], 300, 'test');
        
        $metrics = $this->db_optimizer->getQueryMetrics();
        $this->assertGreaterThan(0, $metrics['total_queries']);
    }
    
    /**
     * Test metrics reset
     */
    public function test_metrics_reset() {
        // Generate some metrics
        $this->db_optimizer->query("SELECT 1", [], 300, 'test');
        
        $metrics_before = $this->db_optimizer->getQueryMetrics();
        $this->assertGreaterThan(0, $metrics_before['total_queries']);
        
        // Reset metrics
        $this->db_optimizer->resetQueryMetrics();
        
        $metrics_after = $this->db_optimizer->getQueryMetrics();
        $this->assertEquals(0, $metrics_after['total_queries']);
        $this->assertEquals(0, $metrics_after['cached_queries']);
        $this->assertEquals(0, $metrics_after['batch_operations']);
    }
    
    /**
     * Test error handling
     */
    public function test_error_handling() {
        // Test with invalid query
        $result = $this->db_optimizer->query("SELECT * FROM non_existent_table", [], 300, 'test');
        
        $this->assertFalse($result);
        
        // Test batch insert with empty data
        $result = $this->db_optimizer->batchInsert($this->test_table, [], true);
        $this->assertFalse($result);
        
        // Test batch update with empty data
        $result = $this->db_optimizer->batchUpdate($this->test_table, [], true);
        $this->assertFalse($result);
        
        // Test batch delete with empty conditions
        $result = $this->db_optimizer->batchDelete($this->test_table, [], true);
        $this->assertFalse($result);
    }
}