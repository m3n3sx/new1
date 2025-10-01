<?php
/**
 * CoreEngine - Dependency Injection Container and Service Registry
 *
 * Provides centralized service management with lazy loading, circular dependency
 * detection, and error handling for Live Admin Styler v2.0
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CoreEngine class implementing dependency injection container
 */
class LAS_CoreEngine {

    /**
     * Singleton instance
     * @var LAS_CoreEngine|null
     */
    private static $instance = null;

    /**
     * Service factory container
     * @var array
     */
    private $container = [];

    /**
     * Instantiated services cache
     * @var array
     */
    private $services = [];

    /**
     * Service dependency graph for circular dependency detection
     * @var array
     */
    private $dependency_graph = [];

    /**
     * Currently resolving services (for circular dependency detection)
     * @var array
     */
    private $resolving = [];

    /**
     * Error logger instance
     * @var object|null
     */
    private $logger = null;

    /**
     * Private constructor to enforce singleton pattern
     */
    private function __construct() {
        $this->init_error_logging();
    }

    /**
     * Get singleton instance
     *
     * @return LAS_CoreEngine
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Prevent cloning
     */
    private function __clone() {}

    /**
     * Prevent unserialization
     */
    public function __wakeup() {
        throw new Exception('Cannot unserialize singleton');
    }

    /**
     * Register a service factory
     *
     * @param string $name Service name
     * @param callable $factory Factory function
     * @param array $dependencies Optional dependencies
     * @return self
     */
    public function register($name, $factory, $dependencies = []) {
        if (!is_callable($factory)) {
            $this->log_error("Service factory for '{$name}' must be callable");
            throw new InvalidArgumentException("Service factory for '{$name}' must be callable");
        }

        $this->container[$name] = $factory;
        $this->dependency_graph[$name] = $dependencies;

        $this->log_debug("Registered service: {$name}");

        return $this;
    }

    /**
     * Get service instance with lazy loading
     *
     * @param string $name Service name
     * @return mixed Service instance
     * @throws Exception If service not found or circular dependency detected
     */
    public function get($name) {

        if (isset($this->services[$name])) {
            return $this->services[$name];
        }

        if (!isset($this->container[$name])) {
            $this->log_error("Service '{$name}' not found");
            throw new Exception("Service '{$name}' not found");
        }

        if (in_array($name, $this->resolving)) {
            $cycle = implode(' -> ', $this->resolving) . ' -> ' . $name;
            $this->log_error("Circular dependency detected: {$cycle}");
            throw new Exception("Circular dependency detected: {$cycle}");
        }

        $this->resolving[] = $name;

        try {

            $dependencies = [];
            if (isset($this->dependency_graph[$name])) {
                foreach ($this->dependency_graph[$name] as $dependency) {
                    $dependencies[] = $this->get($dependency);
                }
            }

            $factory = $this->container[$name];
            $service = call_user_func_array($factory, $dependencies);

            $this->services[$name] = $service;

            $this->log_debug("Instantiated service: {$name}");

            return $service;

        } catch (Exception $e) {
            $this->log_error("Failed to instantiate service '{$name}': " . $e->getMessage());
            throw $e;
        } finally {

            array_pop($this->resolving);
        }
    }

    /**
     * Check if service is registered
     *
     * @param string $name Service name
     * @return bool
     */
    public function has($name) {
        return isset($this->container[$name]);
    }

    /**
     * Get all registered service names
     *
     * @return array
     */
    public function getRegisteredServices() {
        return array_keys($this->container);
    }

    /**
     * Get all instantiated service names
     *
     * @return array
     */
    public function getInstantiatedServices() {
        return array_keys($this->services);
    }

    /**
     * Clear service cache (useful for testing)
     *
     * @param string|null $name Specific service name or null for all
     * @return self
     */
    public function clearCache($name = null) {
        if ($name === null) {
            $this->services = [];
            $this->log_debug("Cleared all service cache");
        } elseif (isset($this->services[$name])) {
            unset($this->services[$name]);
            $this->log_debug("Cleared service cache: {$name}");
        }

        return $this;
    }

    /**
     * Get dependency graph for debugging
     *
     * @return array
     */
    public function getDependencyGraph() {
        return $this->dependency_graph;
    }

    /**
     * Initialize error logging
     */
    private function init_error_logging() {

        if (defined('WP_DEBUG') && WP_DEBUG) {
            $this->logger = true;
        }
    }

    /**
     * Log error message
     *
     * @param string $message Error message
     */
    private function log_error($message) {
        if ($this->logger) {
            error_log('[LAS CoreEngine ERROR] ' . $message);
        }
    }

    /**
     * Log debug message
     *
     * @param string $message Debug message
     */
    private function log_debug($message) {
        if ($this->logger && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log('[LAS CoreEngine DEBUG] ' . $message);
        }
    }

    /**
     * Get memory usage statistics
     *
     * @return array
     */
    public function getMemoryStats() {
        return [
            'current_usage' => memory_get_usage(true),
            'peak_usage' => memory_get_peak_usage(true),
            'services_count' => count($this->services),
            'registered_count' => count($this->container)
        ];
    }
}