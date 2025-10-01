/**
 * RetryEngine - Handles retry logic with exponential backoff and circuit breaker pattern
 * 
 * Features:
 * - Configurable retry policies
 * - Exponential backoff with jitter
 * - Error classification for retry decisions
 * - Circuit breaker pattern to prevent cascading failures
 * 
 * @class RetryEngine
 */
class RetryEngine {
    constructor(options = {}) {
        this.config = {
            maxRetries: options.maxRetries || 3,
            baseDelay: options.baseDelay || 1000, // 1 second
            maxDelay: options.maxDelay || 30000,  // 30 seconds
            jitterPercent: options.jitterPercent || 0.1, // 10% jitter
            circuitBreakerThreshold: options.circuitBreakerThreshold || 0.5, // 50% failure rate
            circuitBreakerTimeout: options.circuitBreakerTimeout || 60000, // 1 minute
            circuitBreakerMinRequests: options.circuitBreakerMinRequests || 5
        };

        // Circuit breaker state per action
        this.circuitBreakers = new Map();
        
        // Error classification definitions
        this.errorTypes = {
            NETWORK_ERROR: {
                code: 'NETWORK_ERROR',
                retryable: true,
                backoffMultiplier: 1.5,
                maxRetries: 3
            },
            SERVER_ERROR: {
                code: 'SERVER_ERROR', 
                retryable: true,
                backoffMultiplier: 2.0,
                maxRetries: 3
            },
            TIMEOUT_ERROR: {
                code: 'TIMEOUT_ERROR',
                retryable: true,
                backoffMultiplier: 1.2,
                maxRetries: 2
            },
            RATE_LIMIT_ERROR: {
                code: 'RATE_LIMIT_ERROR',
                retryable: true,
                backoffMultiplier: 3.0,
                maxRetries: 2
            },
            CLIENT_ERROR: {
                code: 'CLIENT_ERROR',
                retryable: false,
                backoffMultiplier: 1.0,
                maxRetries: 0
            },
            SECURITY_ERROR: {
                code: 'SECURITY_ERROR',
                retryable: false,
                backoffMultiplier: 1.0,
                maxRetries: 0
            }
        };
    }

    /**
     * Determines if a request should be retried based on error type and attempt count
     * @param {Error} error - The error that occurred
     * @param {number} attempt - Current attempt number (0-based)
     * @param {Object} config - Request configuration
     * @returns {boolean} Whether the request should be retried
     */
    shouldRetry(error, attempt, config = {}) {
        const errorType = this.classifyError(error);
        const action = config.action || 'default';
        
        // Check circuit breaker state
        if (this.isCircuitOpen(action)) {
            return false;
        }
        
        // Check if error type is retryable
        if (!errorType.retryable) {
            return false;
        }
        
        // Check attempt count against max retries
        const maxRetries = config.maxRetries !== undefined ? 
            config.maxRetries : 
            Math.min(errorType.maxRetries, this.config.maxRetries);
            
        return attempt < maxRetries;
    }

    /**
     * Calculates delay for next retry attempt using exponential backoff with jitter
     * @param {number} attempt - Current attempt number (0-based)
     * @param {number} baseDelay - Base delay in milliseconds
     * @param {Object} errorType - Classified error type
     * @returns {number} Delay in milliseconds
     */
    calculateDelay(attempt, baseDelay = null, errorType = null) {
        const base = baseDelay || this.config.baseDelay;
        const multiplier = errorType?.backoffMultiplier || 2.0;
        
        // Calculate exponential backoff: base * (multiplier ^ attempt)
        let delay = base * Math.pow(multiplier, attempt);
        
        // Apply maximum delay limit
        delay = Math.min(delay, this.config.maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitter = delay * this.config.jitterPercent;
        const jitterOffset = (Math.random() - 0.5) * 2 * jitter;
        delay += jitterOffset;
        
        // Ensure minimum delay of 100ms
        return Math.max(100, Math.floor(delay));
    }

    /**
     * Classifies an error to determine retry behavior
     * @param {Error} error - The error to classify
     * @returns {Object} Error type configuration
     */
    classifyError(error) {
        // Network connectivity errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return this.errorTypes.NETWORK_ERROR;
        }
        
        // Timeout errors
        if (error.name === 'AbortError' || error.code === 'TIMEOUT') {
            return this.errorTypes.TIMEOUT_ERROR;
        }
        
        // HTTP status code based classification
        if (error.status) {
            const status = parseInt(error.status);
            
            // Server errors (5xx) - retryable
            if (status >= 500 && status < 600) {
                return this.errorTypes.SERVER_ERROR;
            }
            
            // Rate limiting (429) - retryable with longer backoff
            if (status === 429) {
                return this.errorTypes.RATE_LIMIT_ERROR;
            }
            
            // Client errors (4xx) - not retryable
            if (status >= 400 && status < 500) {
                // Special case for 401/403 - could be security related
                if (status === 401 || status === 403) {
                    return this.errorTypes.SECURITY_ERROR;
                }
                return this.errorTypes.CLIENT_ERROR;
            }
        }
        
        // WordPress/AJAX specific errors
        if (error.message) {
            const message = error.message.toLowerCase();
            
            if (message.includes('nonce') || message.includes('security')) {
                return this.errorTypes.SECURITY_ERROR;
            }
            
            if (message.includes('rate limit') || message.includes('too many')) {
                return this.errorTypes.RATE_LIMIT_ERROR;
            }
            
            if (message.includes('timeout') || message.includes('connection')) {
                return this.errorTypes.NETWORK_ERROR;
            }
        }
        
        // Default to network error for unknown errors (retryable)
        return this.errorTypes.NETWORK_ERROR;
    }

    /**
     * Updates circuit breaker state based on request outcome
     * @param {string} action - The action/endpoint identifier
     * @param {boolean} success - Whether the request was successful
     */
    updateCircuitBreaker(action, success) {
        if (!this.circuitBreakers.has(action)) {
            this.circuitBreakers.set(action, {
                state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
                failures: 0,
                successes: 0,
                totalRequests: 0,
                lastFailureTime: null,
                lastSuccessTime: null
            });
        }
        
        const breaker = this.circuitBreakers.get(action);
        breaker.totalRequests++;
        
        if (success) {
            breaker.successes++;
            breaker.lastSuccessTime = Date.now();
            
            // If circuit was open or half-open, consider closing it
            if (breaker.state === 'HALF_OPEN') {
                breaker.state = 'CLOSED';
                breaker.failures = 0; // Reset failure count
            }
        } else {
            breaker.failures++;
            breaker.lastFailureTime = Date.now();
            
            // Check if we should open the circuit
            if (breaker.totalRequests >= this.config.circuitBreakerMinRequests) {
                const failureRate = breaker.failures / breaker.totalRequests;
                
                if (failureRate >= this.config.circuitBreakerThreshold) {
                    breaker.state = 'OPEN';
                }
            }
        }
        
        this.circuitBreakers.set(action, breaker);
    }

    /**
     * Checks if circuit breaker is open for a given action
     * @param {string} action - The action/endpoint identifier
     * @returns {boolean} Whether the circuit is open
     */
    isCircuitOpen(action) {
        if (!this.circuitBreakers.has(action)) {
            return false;
        }
        
        const breaker = this.circuitBreakers.get(action);
        
        if (breaker.state === 'CLOSED') {
            return false;
        }
        
        if (breaker.state === 'OPEN') {
            // Check if enough time has passed to try half-open
            const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
            
            if (timeSinceLastFailure >= this.config.circuitBreakerTimeout) {
                breaker.state = 'HALF_OPEN';
                this.circuitBreakers.set(action, breaker);
                return false; // Allow one request in half-open state
            }
            
            return true; // Circuit is still open
        }
        
        // HALF_OPEN state - allow the request but monitor closely
        return false;
    }

    /**
     * Gets circuit breaker status for a given action
     * @param {string} action - The action/endpoint identifier
     * @returns {Object} Circuit breaker status
     */
    getCircuitBreakerStatus(action) {
        if (!this.circuitBreakers.has(action)) {
            return {
                state: 'CLOSED',
                failures: 0,
                successes: 0,
                totalRequests: 0,
                failureRate: 0,
                lastFailureTime: null,
                lastSuccessTime: null
            };
        }
        
        const breaker = this.circuitBreakers.get(action);
        const failureRate = breaker.totalRequests > 0 ? 
            breaker.failures / breaker.totalRequests : 0;
            
        return {
            ...breaker,
            failureRate: failureRate
        };
    }

    /**
     * Resets circuit breaker for a given action
     * @param {string} action - The action/endpoint identifier
     */
    resetCircuitBreaker(action) {
        if (this.circuitBreakers.has(action)) {
            this.circuitBreakers.delete(action);
        }
    }

    /**
     * Gets all circuit breaker statuses
     * @returns {Object} Map of action to circuit breaker status
     */
    getAllCircuitBreakerStatuses() {
        const statuses = {};
        
        for (const [action, breaker] of this.circuitBreakers.entries()) {
            statuses[action] = this.getCircuitBreakerStatus(action);
        }
        
        return statuses;
    }

    /**
     * Configures retry policies
     * @param {Object} options - Configuration options
     */
    configure(options) {
        this.config = { ...this.config, ...options };
    }

    /**
     * Creates a retry policy for a specific error type
     * @param {string} errorType - Error type key
     * @param {Object} policy - Policy configuration
     */
    setErrorPolicy(errorType, policy) {
        if (this.errorTypes[errorType]) {
            this.errorTypes[errorType] = { ...this.errorTypes[errorType], ...policy };
        }
    }

    /**
     * Gets retry statistics for monitoring
     * @returns {Object} Retry statistics
     */
    getRetryStatistics() {
        const stats = {
            circuitBreakers: this.getAllCircuitBreakerStatuses(),
            errorTypes: { ...this.errorTypes },
            config: { ...this.config }
        };
        
        return stats;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RetryEngine;
} else if (typeof window !== 'undefined') {
    window.RetryEngine = RetryEngine;
}