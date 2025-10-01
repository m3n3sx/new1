<?php
/**
 * CommunicationManager - AJAX and REST API communication service
 *
 * Provides AJAX handlers, REST API endpoints, nonce protection, request retry logic
 * with exponential backoff, request queuing system, and timeout handling.
 *
 * @package LiveAdminStyler
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CommunicationManager class for handling all communication
 */
class LAS_CommunicationManager {

    /**
     * Security manager instance
     * @var LAS_SecurityManager
     */
    private $security;

    /**
     * Registered AJAX handlers
     * @var array
     */
    private $ajax_handlers = [];

    /**
     * Registered REST routes
     * @var array
     */
    private $rest_routes = [];

    /**
     * Request queue for retry logic
     * @var array
     */
    private $request_queue = [];

    /**
     * Default configuration
     * @var array
     */
    private $config = [
        'max_retries' => 3,
        'base_delay' => 1000,
        'max_delay' => 30000,
        'timeout' => 30,
        'rate_limit' => 60,
        'queue_size' => 100
    ];

    /**
     * REST API namespace
     */
    const REST_NAMESPACE = 'las/v2';

    /**
     * Constructor
     *
     * @param LAS_SecurityManager $security Security manager instance
     * @param array $config Optional configuration overrides
     */
    public function __construct(LAS_SecurityManager $security, $config = []) {
        $this->security = $security;
        $this->config = array_merge($this->config, $config);

        $this->init_hooks();
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {

        add_action('rest_api_init', [$this, 'register_rest_routes']);

        add_action('wp_ajax_las_retry_failed_request', [$this, 'ajax_retry_failed_request']);
        add_action('wp_ajax_las_get_request_status', [$this, 'ajax_get_request_status']);

        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);

        add_action('las_hourly_cleanup', [$this, 'cleanup_request_queue']);
    }

    /**
     * Register AJAX handler with retry logic and security
     *
     * @param string $action AJAX action name
     * @param callable $callback Handler callback
     * @param array $options Handler options
     * @return bool Success status
     */
    public function registerAjaxHandler($action, $callback, $options = []) {
        if (!is_callable($callback)) {
            return false;
        }

        $default_options = [
            'capability' => 'manage_options',
            'nonce_action' => $action,
            'rate_limit' => true,
            'retry_enabled' => true,
            'timeout' => $this->config['timeout'],
            'public' => false
        ];

        $options = array_merge($default_options, $options);

        $this->ajax_handlers[$action] = [
            'callback' => $callback,
            'options' => $options
        ];

        $wrapper = function() use ($action, $callback, $options) {
            $this->handle_ajax_request($action, $callback, $options);
        };

        add_action("wp_ajax_{$action}", $wrapper);

        if ($options['public']) {
            add_action("wp_ajax_nopriv_{$action}", $wrapper);
        }

        return true;
    }

    /**
     * Register REST API route with security and retry logic
     *
     * @param string $route Route pattern
     * @param array $methods HTTP methods
     * @param callable $callback Handler callback
     * @param array $options Route options
     * @return bool Success status
     */
    public function registerRestRoute($route, $methods, $callback, $options = []) {
        if (!is_callable($callback)) {
            return false;
        }

        $default_options = [
            'capability' => 'manage_options',
            'rate_limit' => true,
            'validate_nonce' => true,
            'args' => []
        ];

        $options = array_merge($default_options, $options);

        $this->rest_routes[$route] = [
            'methods' => $methods,
            'callback' => $callback,
            'options' => $options
        ];

        return true;
    }

    /**
     * Register all REST routes
     */
    public function register_rest_routes() {
        foreach ($this->rest_routes as $route => $config) {
            $args = [
                'methods' => $config['methods'],
                'callback' => function($request) use ($route, $config) {
                    return $this->handle_rest_request($request, $route, $config);
                },
                'permission_callback' => function($request) use ($config) {
                    return $this->check_rest_permissions($request, $config);
                },
                'args' => $config['options']['args']
            ];

            register_rest_route(self::REST_NAMESPACE, $route, $args);
        }

        $this->register_builtin_rest_routes();
    }

    /**
     * Register built-in REST routes
     */
    private function register_builtin_rest_routes() {

        register_rest_route(self::REST_NAMESPACE, '/settings', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'rest_handle_settings'],
            'permission_callback' => function() {
                return $this->security->checkCapability();
            }
        ]);

        register_rest_route(self::REST_NAMESPACE, '/user-state', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'rest_handle_user_state'],
            'permission_callback' => function() {
                return $this->security->checkCapability();
            }
        ]);

        register_rest_route(self::REST_NAMESPACE, '/presets', [
            'methods' => ['GET', 'POST', 'DELETE'],
            'callback' => [$this, 'rest_handle_presets'],
            'permission_callback' => function() {
                return $this->security->checkCapability();
            }
        ]);

        register_rest_route(self::REST_NAMESPACE, '/status', [
            'methods' => 'GET',
            'callback' => [$this, 'rest_handle_status'],
            'permission_callback' => function() {
                return $this->security->checkCapability();
            }
        ]);
    }

    /**
     * Handle AJAX request with security and retry logic
     *
     * @param string $action Action name
     * @param callable $callback Handler callback
     * @param array $options Handler options
     */
    private function handle_ajax_request($action, $callback, $options) {
        $request_id = $this->generate_request_id();

        try {

            if ($options['rate_limit']) {
                $rate_check = $this->security->checkRateLimit($action, $this->config['rate_limit']);
                if (is_wp_error($rate_check)) {
                    $this->send_error_response($rate_check, $request_id);
                    return;
                }
            }

            if (!$this->security->checkCapability($options['capability'])) {
                $this->send_error_response(
                    new WP_Error('insufficient_permissions', 'Insufficient permissions'),
                    $request_id
                );
                return;
            }

            $nonce = $_POST['nonce'] ?? $_GET['nonce'] ?? '';
            if (!$this->security->validateNonce($nonce, $options['nonce_action'])) {
                $this->send_error_response(
                    new WP_Error('invalid_nonce', 'Security check failed'),
                    $request_id
                );
                return;
            }

            $data = $this->sanitize_request_data($_POST);

            if ($options['timeout'] > 0) {
                set_time_limit($options['timeout']);
            }

            $start_time = microtime(true);
            $result = call_user_func($callback, $data);
            $execution_time = microtime(true) - $start_time;

            $this->log_request($action, 'success', $execution_time, $request_id);

            $this->send_success_response($result, $request_id, [
                'execution_time' => round($execution_time * 1000, 2)
            ]);

        } catch (Exception $e) {

            $this->log_request($action, 'error', 0, $request_id, $e->getMessage());

            if ($options['retry_enabled']) {
                $this->queue_for_retry($action, $_POST, $request_id);
            }

            $this->send_error_response(
                new WP_Error('request_failed', $e->getMessage()),
                $request_id
            );
        }
    }

    /**
     * Handle REST request with security
     *
     * @param WP_REST_Request $request REST request object
     * @param string $route Route pattern
     * @param array $config Route configuration
     * @return WP_REST_Response|WP_Error Response
     */
    private function handle_rest_request($request, $route, $config) {
        $request_id = $this->generate_request_id();

        try {

            if ($config['options']['rate_limit']) {
                $rate_check = $this->security->checkRateLimit($route, $this->config['rate_limit']);
                if (is_wp_error($rate_check)) {
                    return $rate_check;
                }
            }

            if ($config['options']['validate_nonce'] && in_array($request->get_method(), ['POST', 'PUT', 'DELETE'])) {
                $nonce = $request->get_header('X-WP-Nonce') ?? $request->get_param('nonce');
                if (!$this->security->validateNonce($nonce, 'wp_rest')) {
                    return new WP_Error('invalid_nonce', 'Security check failed', ['status' => 403]);
                }
            }

            $params = $this->sanitize_rest_params($request->get_params());
            $request->set_query_params($params);

            $start_time = microtime(true);
            $result = call_user_func($config['callback'], $request);
            $execution_time = microtime(true) - $start_time;

            $this->log_request($route, 'success', $execution_time, $request_id);

            if (is_wp_error($result)) {
                return $result;
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => $result,
                'request_id' => $request_id,
                'execution_time' => round($execution_time * 1000, 2)
            ]);

        } catch (Exception $e) {

            $this->log_request($route, 'error', 0, $request_id, $e->getMessage());

            return new WP_Error('request_failed', $e->getMessage(), ['status' => 500]);
        }
    }

    /**
     * Check REST API permissions
     *
     * @param WP_REST_Request $request REST request
     * @param array $config Route configuration
     * @return bool Permission status
     */
    private function check_rest_permissions($request, $config) {
        return $this->security->checkCapability($config['options']['capability']);
    }

    /**
     * Queue request for retry
     *
     * @param string $action Action name
     * @param array $data Request data
     * @param string $request_id Request ID
     * @return bool Success status
     */
    private function queue_for_retry($action, $data, $request_id) {

        if (count($this->request_queue) >= $this->config['queue_size']) {
            return false;
        }

        $retry_data = [
            'action' => $action,
            'data' => $data,
            'request_id' => $request_id,
            'attempts' => 0,
            'next_retry' => time() + ($this->config['base_delay'] / 1000),
            'created' => time()
        ];

        $this->request_queue[$request_id] = $retry_data;

        $queue_option = get_option('las_fresh_request_queue', []);
        $queue_option[$request_id] = $retry_data;
        update_option('las_fresh_request_queue', $queue_option);

        return true;
    }

    /**
     * Process retry queue
     *
     * @return array Processing results
     */
    public function processRetryQueue() {
        $queue = get_option('las_fresh_request_queue', []);
        $results = [
            'processed' => 0,
            'succeeded' => 0,
            'failed' => 0,
            'deferred' => 0
        ];

        $current_time = time();

        foreach ($queue as $request_id => $retry_data) {
            $results['processed']++;

            if ($retry_data['next_retry'] > $current_time) {
                $results['deferred']++;
                continue;
            }

            if ($retry_data['attempts'] >= $this->config['max_retries']) {
                unset($queue[$request_id]);
                $results['failed']++;
                continue;
            }

            $success = $this->attempt_retry($retry_data);

            if ($success) {
                unset($queue[$request_id]);
                $results['succeeded']++;
            } else {

                $retry_data['attempts']++;
                $delay = min(
                    $this->config['base_delay'] * pow(2, $retry_data['attempts']),
                    $this->config['max_delay']
                );
                $retry_data['next_retry'] = $current_time + ($delay / 1000);

                $queue[$request_id] = $retry_data;
                $results['deferred']++;
            }
        }

        update_option('las_fresh_request_queue', $queue);

        return $results;
    }

    /**
     * Attempt to retry a failed request
     *
     * @param array $retry_data Retry data
     * @return bool Success status
     */
    private function attempt_retry($retry_data) {
        $action = $retry_data['action'];

        if (!isset($this->ajax_handlers[$action])) {
            return false;
        }

        $handler = $this->ajax_handlers[$action];

        try {

            $original_post = $_POST;
            $_POST = $retry_data['data'];

            $result = call_user_func($handler['callback'], $retry_data['data']);

            $_POST = $original_post;

            $this->log_request($action, 'retry_success', 0, $retry_data['request_id']);

            return true;

        } catch (Exception $e) {

            $_POST = $original_post;

            $this->log_request($action, 'retry_failed', 0, $retry_data['request_id'], $e->getMessage());

            return false;
        }
    }

    /**
     * AJAX handler for manual retry
     */
    public function ajax_retry_failed_request() {
        if (!$this->security->validateNonce($_POST['nonce'] ?? '', 'retry_request')) {
            wp_die('Security check failed');
        }

        if (!$this->security->checkCapability()) {
            wp_die('Insufficient permissions');
        }

        $request_id = sanitize_text_field($_POST['request_id'] ?? '');

        if (empty($request_id)) {
            wp_send_json_error('Invalid request ID');
        }

        $queue = get_option('las_fresh_request_queue', []);

        if (!isset($queue[$request_id])) {
            wp_send_json_error('Request not found in queue');
        }

        $retry_data = $queue[$request_id];
        $success = $this->attempt_retry($retry_data);

        if ($success) {
            unset($queue[$request_id]);
            update_option('las_fresh_request_queue', $queue);
            wp_send_json_success('Request retried successfully');
        } else {
            wp_send_json_error('Retry failed');
        }
    }

    /**
     * AJAX handler for getting request status
     */
    public function ajax_get_request_status() {
        if (!$this->security->validateNonce($_POST['nonce'] ?? '', 'get_status')) {
            wp_die('Security check failed');
        }

        if (!$this->security->checkCapability()) {
            wp_die('Insufficient permissions');
        }

        $request_id = sanitize_text_field($_POST['request_id'] ?? '');

        if (empty($request_id)) {
            wp_send_json_error('Invalid request ID');
        }

        $queue = get_option('las_fresh_request_queue', []);

        if (isset($queue[$request_id])) {
            wp_send_json_success([
                'status' => 'queued',
                'attempts' => $queue[$request_id]['attempts'],
                'next_retry' => $queue[$request_id]['next_retry'],
                'max_retries' => $this->config['max_retries']
            ]);
        } else {
            wp_send_json_success([
                'status' => 'completed'
            ]);
        }
    }

    /**
     * Built-in REST endpoint handlers
     */

    /**
     * Handle settings REST requests
     *
     * @param WP_REST_Request $request REST request
     * @return array|WP_Error Response data
     */
    public function rest_handle_settings($request) {
        $method = $request->get_method();

        $core = LAS_CoreEngine::getInstance();
        $settings_manager = $core->get('SettingsManager');

        switch ($method) {
            case 'GET':
                $group = $request->get_param('group');
                $key = $request->get_param('key');

                if ($key) {
                    return ['value' => $settings_manager->get($key)];
                } elseif ($group) {
                    return ['settings' => $settings_manager->get($group)];
                } else {
                    return ['settings' => $settings_manager->getAll()];
                }

            case 'POST':
                $settings = $request->get_param('settings');
                $key = $request->get_param('key');
                $value = $request->get_param('value');

                if ($key && $value !== null) {
                    $result = $settings_manager->set($key, $value);
                } elseif ($settings && is_array($settings)) {
                    $result = $settings_manager->setMultiple($settings);
                } else {
                    return new WP_Error('invalid_params', 'Invalid parameters');
                }

                if (is_wp_error($result)) {
                    return $result;
                }

                return ['success' => true];

            default:
                return new WP_Error('method_not_allowed', 'Method not allowed');
        }
    }

    /**
     * Handle user state REST requests
     *
     * @param WP_REST_Request $request REST request
     * @return array|WP_Error Response data
     */
    public function rest_handle_user_state($request) {
        $method = $request->get_method();

        $core = LAS_CoreEngine::getInstance();
        $settings_manager = $core->get('SettingsManager');

        switch ($method) {
            case 'GET':
                $property = $request->get_param('property');

                if ($property) {
                    return ['value' => $settings_manager->getUserStateProperty($property)];
                } else {
                    return ['state' => $settings_manager->getUserState()];
                }

            case 'POST':
                $state = $request->get_param('state');
                $property = $request->get_param('property');
                $value = $request->get_param('value');

                if ($property && $value !== null) {
                    $result = $settings_manager->setUserStateProperty($property, $value);
                } elseif ($state && is_array($state)) {
                    $result = $settings_manager->setUserState($state);
                } else {
                    return new WP_Error('invalid_params', 'Invalid parameters');
                }

                if (!$result) {
                    return new WP_Error('save_failed', 'Failed to save user state');
                }

                return ['success' => true];

            default:
                return new WP_Error('method_not_allowed', 'Method not allowed');
        }
    }

    /**
     * Handle presets REST requests
     *
     * @param WP_REST_Request $request REST request
     * @return array|WP_Error Response data
     */
    public function rest_handle_presets($request) {
        $method = $request->get_method();

        $core = LAS_CoreEngine::getInstance();
        $settings_manager = $core->get('SettingsManager');

        switch ($method) {
            case 'GET':
                $preset_id = $request->get_param('preset_id');
                $include_custom = $request->get_param('include_custom') !== 'false';

                if ($preset_id) {
                    $preset = $settings_manager->getPreset($preset_id);
                    if (!$preset) {
                        return new WP_Error('preset_not_found', 'Preset not found');
                    }
                    return ['preset' => $preset];
                } else {
                    return ['presets' => $settings_manager->getPresets($include_custom)];
                }

            case 'POST':
                $preset_id = $request->get_param('preset_id');
                $action = $request->get_param('action');

                if ($action === 'apply') {
                    $merge = $request->get_param('merge') === 'true';
                    $result = $settings_manager->applyPreset($preset_id, $merge);
                } elseif ($action === 'save') {
                    $name = $request->get_param('name');
                    $description = $request->get_param('description');
                    $settings = $request->get_param('settings');
                    $result = $settings_manager->savePreset($preset_id, $name, $description, $settings);
                } else {
                    return new WP_Error('invalid_action', 'Invalid action');
                }

                if (is_wp_error($result)) {
                    return $result;
                }

                return ['success' => true];

            case 'DELETE':
                $preset_id = $request->get_param('preset_id');
                $result = $settings_manager->deletePreset($preset_id);

                if (is_wp_error($result)) {
                    return $result;
                }

                return ['success' => true];

            default:
                return new WP_Error('method_not_allowed', 'Method not allowed');
        }
    }

    /**
     * Handle system status REST requests
     *
     * @param WP_REST_Request $request REST request
     * @return array Response data
     */
    public function rest_handle_status($request) {
        $core = LAS_CoreEngine::getInstance();

        $status = [
            'version' => '2.0.0',
            'wordpress_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
            'memory_usage' => $core->getMemoryStats(),
            'services' => [
                'registered' => $core->getRegisteredServices(),
                'instantiated' => $core->getInstantiatedServices()
            ],
            'request_queue' => [
                'size' => count(get_option('las_fresh_request_queue', [])),
                'max_size' => $this->config['queue_size']
            ],
            'configuration' => [
                'max_retries' => $this->config['max_retries'],
                'timeout' => $this->config['timeout'],
                'rate_limit' => $this->config['rate_limit']
            ]
        ];

        if ($core->has('CacheManager')) {
            $cache_manager = $core->get('CacheManager');
            $status['cache'] = $cache_manager->getMetrics();
        }

        return $status;
    }

    /**
     * Enqueue communication scripts
     *
     * @param string $hook_suffix Current admin page
     */
    public function enqueue_scripts($hook_suffix) {

        if (strpos($hook_suffix, 'live-admin-styler') === false) {
            return;
        }

        wp_enqueue_script(
            'las-communication',
            plugins_url('assets/js/communication-manager.js', dirname(__FILE__)),
            ['jquery'],
            '2.0.0',
            true
        );

        wp_localize_script('las-communication', 'lasComm', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url(self::REST_NAMESPACE . '/'),
            'nonces' => [
                'ajax' => $this->security->createNonce('las_ajax'),
                'rest' => wp_create_nonce('wp_rest'),
                'retry' => $this->security->createNonce('retry_request'),
                'status' => $this->security->createNonce('get_status')
            ],
            'config' => [
                'maxRetries' => $this->config['max_retries'],
                'baseDelay' => $this->config['base_delay'],
                'maxDelay' => $this->config['max_delay'],
                'timeout' => $this->config['timeout'] * 1000
            ],
            'strings' => [
                'retryFailed' => __('Request failed. Retrying...', 'live-admin-styler'),
                'maxRetriesReached' => __('Maximum retries reached. Please try again later.', 'live-admin-styler'),
                'networkError' => __('Network error. Please check your connection.', 'live-admin-styler'),
                'serverError' => __('Server error. Please try again.', 'live-admin-styler')
            ]
        ]);
    }

    /**
     * Utility methods
     */

    /**
     * Generate unique request ID
     *
     * @return string Request ID
     */
    private function generate_request_id() {
        return 'req_' . uniqid() . '_' . wp_generate_password(8, false);
    }

    /**
     * Sanitize request data
     *
     * @param array $data Request data
     * @return array Sanitized data
     */
    private function sanitize_request_data($data) {
        if (!is_array($data)) {
            return [];
        }

        $sanitized = [];

        foreach ($data as $key => $value) {
            $key = sanitize_key($key);

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitize_request_data($value);
            } else {

                $sanitized[$key] = sanitize_text_field($value);
            }
        }

        return $sanitized;
    }

    /**
     * Sanitize REST parameters
     *
     * @param array $params REST parameters
     * @return array Sanitized parameters
     */
    private function sanitize_rest_params($params) {
        if (!is_array($params)) {
            return [];
        }

        $sanitized = [];

        foreach ($params as $key => $value) {
            $key = sanitize_key($key);

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitize_rest_params($value);
            } else {
                $sanitized[$key] = sanitize_text_field($value);
            }
        }

        return $sanitized;
    }

    /**
     * Send success response
     *
     * @param mixed $data Response data
     * @param string $request_id Request ID
     * @param array $meta Additional metadata
     */
    private function send_success_response($data, $request_id, $meta = []) {
        $response = array_merge([
            'success' => true,
            'data' => $data,
            'request_id' => $request_id,
            'timestamp' => current_time('timestamp')
        ], $meta);

        wp_send_json($response);
    }

    /**
     * Send error response
     *
     * @param WP_Error $error Error object
     * @param string $request_id Request ID
     * @param array $meta Additional metadata
     */
    private function send_error_response($error, $request_id, $meta = []) {
        $response = array_merge([
            'success' => false,
            'error' => [
                'code' => $error->get_error_code(),
                'message' => $error->get_error_message(),
                'data' => $error->get_error_data()
            ],
            'request_id' => $request_id,
            'timestamp' => current_time('timestamp')
        ], $meta);

        wp_send_json($response);
    }

    /**
     * Log request
     *
     * @param string $action Action name
     * @param string $status Request status
     * @param float $execution_time Execution time in seconds
     * @param string $request_id Request ID
     * @param string $error_message Optional error message
     */
    private function log_request($action, $status, $execution_time, $request_id, $error_message = '') {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $user_id = get_current_user_id();
            $log_message = sprintf(
                '[LAS CommunicationManager] %s - Action: %s, Status: %s, Time: %.3fs, User: %d, Request: %s',
                current_time('mysql'),
                $action,
                $status,
                $execution_time,
                $user_id,
                $request_id
            );

            if ($error_message) {
                $log_message .= ', Error: ' . $error_message;
            }

            error_log($log_message);
        }
    }

    /**
     * Cleanup request queue (scheduled task)
     */
    public function cleanup_request_queue() {
        $queue = get_option('las_fresh_request_queue', []);
        $cleaned = 0;
        $current_time = time();

        foreach ($queue as $request_id => $retry_data) {
            if (($current_time - $retry_data['created']) > 86400) {
                unset($queue[$request_id]);
                $cleaned++;
            }
        }

        if ($cleaned > 0) {
            update_option('las_fresh_request_queue', $queue);

            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log("[LAS CommunicationManager] Cleaned {$cleaned} expired requests from queue");
            }
        }
    }

    /**
     * Get communication statistics
     *
     * @return array Statistics
     */
    public function getStatistics() {
        $queue = get_option('las_fresh_request_queue', []);

        $stats = [
            'registered_ajax_handlers' => count($this->ajax_handlers),
            'registered_rest_routes' => count($this->rest_routes),
            'queued_requests' => count($queue),
            'queue_utilization' => round((count($queue) / $this->config['queue_size']) * 100, 2),
            'configuration' => $this->config
        ];

        if (!empty($queue)) {
            $attempts = array_column($queue, 'attempts');
            $ages = array_map(function($item) {
                return time() - $item['created'];
            }, $queue);

            $stats['queue_analysis'] = [
                'avg_attempts' => round(array_sum($attempts) / count($attempts), 2),
                'max_attempts' => max($attempts),
                'avg_age_seconds' => round(array_sum($ages) / count($ages)),
                'oldest_request_age' => max($ages)
            ];
        }

        return $stats;
    }

    /**
     * Force process retry queue (for manual triggering)
     *
     * @return array Processing results
     */
    public function forceProcessRetryQueue() {
        return $this->processRetryQueue();
    }

    /**
     * Clear retry queue
     *
     * @return bool Success status
     */
    public function clearRetryQueue() {
        delete_option('las_fresh_request_queue');
        $this->request_queue = [];
        return true;
    }

    /**
     * Get retry queue contents
     *
     * @return array Queue contents
     */
    public function getRetryQueue() {
        return get_option('las_fresh_request_queue', []);
    }
}