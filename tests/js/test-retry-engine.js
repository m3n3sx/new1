/**
 * Unit tests for RetryEngine class
 * Tests retry logic, exponential backoff, error classification, and circuit breaker pattern
 */

// Import the RetryEngine class
let RetryEngine;
if (typeof require !== 'undefined') {
    RetryEngine = require('../../assets/js/modules/retry-engine.js');
} else {
    // Browser environment - assume RetryEngine is loaded globally
    RetryEngine = window.RetryEngine;
}

describe('RetryEngine', () => {
    let retryEngine;

    beforeEach(() => {
        retryEngine = new RetryEngine();
    });

    describe('Constructor and Configuration', () => {
        test('should initialize with default configuration', () => {
            expect(retryEngine.config.maxRetries).toBe(3);
            expect(retryEngine.config.baseDelay).toBe(1000);
            expect(retryEngine.config.maxDelay).toBe(30000);
            expect(retryEngine.config.jitterPercent).toBe(0.1);
        });

        test('should accept custom configuration', () => {
            const customEngine = new RetryEngine({
                maxRetries: 5,
                baseDelay: 2000,
                maxDelay: 60000
            });

            expect(customEngine.config.maxRetries).toBe(5);
            expect(customEngine.config.baseDelay).toBe(2000);
            expect(customEngine.config.maxDelay).toBe(60000);
        });

        test('should allow runtime configuration updates', () => {
            retryEngine.configure({ maxRetries: 10 });
            expect(retryEngine.config.maxRetries).toBe(10);
        });
    });

    describe('Error Classification', () => {
        test('should classify network errors correctly', () => {
            const networkError = new TypeError('Failed to fetch');
            const errorType = retryEngine.classifyError(networkError);
            
            expect(errorType.code).toBe('NETWORK_ERROR');
            expect(errorType.retryable).toBe(true);
        });

        test('should classify timeout errors correctly', () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'AbortError';
            const errorType = retryEngine.classifyError(timeoutError);
            
            expect(errorType.code).toBe('TIMEOUT_ERROR');
            expect(errorType.retryable).toBe(true);
        });

        test('should classify server errors (5xx) as retryable', () => {
            const serverError = new Error('Internal Server Error');
            serverError.status = 500;
            const errorType = retryEngine.classifyError(serverError);
            
            expect(errorType.code).toBe('SERVER_ERROR');
            expect(errorType.retryable).toBe(true);
        });

        test('should classify rate limit errors correctly', () => {
            const rateLimitError = new Error('Too Many Requests');
            rateLimitError.status = 429;
            const errorType = retryEngine.classifyError(rateLimitError);
            
            expect(errorType.code).toBe('RATE_LIMIT_ERROR');
            expect(errorType.retryable).toBe(true);
        });

        test('should classify client errors (4xx) as non-retryable', () => {
            const clientError = new Error('Bad Request');
            clientError.status = 400;
            const errorType = retryEngine.classifyError(clientError);
            
            expect(errorType.code).toBe('CLIENT_ERROR');
            expect(errorType.retryable).toBe(false);
        });

        test('should classify security errors correctly', () => {
            const securityError = new Error('Unauthorized');
            securityError.status = 401;
            const errorType = retryEngine.classifyError(securityError);
            
            expect(errorType.code).toBe('SECURITY_ERROR');
            expect(errorType.retryable).toBe(false);
        });

        test('should classify WordPress nonce errors as security errors', () => {
            const nonceError = new Error('Invalid nonce');
            const errorType = retryEngine.classifyError(nonceError);
            
            expect(errorType.code).toBe('SECURITY_ERROR');
            expect(errorType.retryable).toBe(false);
        });
    });

    describe('Retry Decision Logic', () => {
        test('should allow retry for retryable errors within attempt limit', () => {
            const networkError = new TypeError('Failed to fetch');
            
            expect(retryEngine.shouldRetry(networkError, 0)).toBe(true);
            expect(retryEngine.shouldRetry(networkError, 1)).toBe(true);
            expect(retryEngine.shouldRetry(networkError, 2)).toBe(true);
        });

        test('should not allow retry when max attempts exceeded', () => {
            const networkError = new TypeError('Failed to fetch');
            
            expect(retryEngine.shouldRetry(networkError, 3)).toBe(false);
            expect(retryEngine.shouldRetry(networkError, 4)).toBe(false);
        });

        test('should not allow retry for non-retryable errors', () => {
            const clientError = new Error('Bad Request');
            clientError.status = 400;
            
            expect(retryEngine.shouldRetry(clientError, 0)).toBe(false);
            expect(retryEngine.shouldRetry(clientError, 1)).toBe(false);
        });

        test('should respect custom max retries in config', () => {
            const networkError = new TypeError('Failed to fetch');
            const config = { maxRetries: 1 };
            
            expect(retryEngine.shouldRetry(networkError, 0, config)).toBe(true);
            expect(retryEngine.shouldRetry(networkError, 1, config)).toBe(false);
        });
    });

    describe('Exponential Backoff Calculation', () => {
        test('should calculate exponential backoff correctly', () => {
            const delay0 = retryEngine.calculateDelay(0, 1000);
            const delay1 = retryEngine.calculateDelay(1, 1000);
            const delay2 = retryEngine.calculateDelay(2, 1000);
            
            // Base delay should be around 1000ms (with jitter)
            expect(delay0).toBeGreaterThan(800);
            expect(delay0).toBeLessThan(1200);
            
            // Second attempt should be roughly 2x base (with jitter)
            expect(delay1).toBeGreaterThan(1800);
            expect(delay1).toBeLessThan(2200);
            
            // Third attempt should be roughly 4x base (with jitter)
            expect(delay2).toBeGreaterThan(3600);
            expect(delay2).toBeLessThan(4400);
        });

        test('should respect maximum delay limit', () => {
            const delay = retryEngine.calculateDelay(10, 1000); // Very high attempt
            expect(delay).toBeLessThanOrEqual(30000); // Max delay is 30s
        });

        test('should apply different multipliers for different error types', () => {
            const networkErrorType = retryEngine.errorTypes.NETWORK_ERROR;
            const rateLimitErrorType = retryEngine.errorTypes.RATE_LIMIT_ERROR;
            
            const networkDelay = retryEngine.calculateDelay(1, 1000, networkErrorType);
            const rateLimitDelay = retryEngine.calculateDelay(1, 1000, rateLimitErrorType);
            
            // Rate limit should have higher multiplier (3.0 vs 1.5)
            expect(rateLimitDelay).toBeGreaterThan(networkDelay);
        });

        test('should ensure minimum delay of 100ms', () => {
            const delay = retryEngine.calculateDelay(0, 50); // Very small base delay
            expect(delay).toBeGreaterThanOrEqual(100);
        });
    });

    describe('Circuit Breaker Pattern', () => {
        test('should initialize circuit breaker as closed', () => {
            expect(retryEngine.isCircuitOpen('test-action')).toBe(false);
        });

        test('should track successful requests', () => {
            retryEngine.updateCircuitBreaker('test-action', true);
            const status = retryEngine.getCircuitBreakerStatus('test-action');
            
            expect(status.successes).toBe(1);
            expect(status.failures).toBe(0);
            expect(status.state).toBe('CLOSED');
        });

        test('should track failed requests', () => {
            retryEngine.updateCircuitBreaker('test-action', false);
            const status = retryEngine.getCircuitBreakerStatus('test-action');
            
            expect(status.successes).toBe(0);
            expect(status.failures).toBe(1);
        });

        test('should open circuit after failure threshold exceeded', () => {
            // Need minimum requests before circuit can open
            for (let i = 0; i < 3; i++) {
                retryEngine.updateCircuitBreaker('test-action', true);
            }
            
            // Now add failures to exceed threshold (50%)
            for (let i = 0; i < 4; i++) {
                retryEngine.updateCircuitBreaker('test-action', false);
            }
            
            const status = retryEngine.getCircuitBreakerStatus('test-action');
            expect(status.state).toBe('OPEN');
            expect(retryEngine.isCircuitOpen('test-action')).toBe(true);
        });

        test('should transition to half-open after timeout', (done) => {
            // Configure short timeout for testing
            retryEngine.configure({ circuitBreakerTimeout: 100 });
            
            // Force circuit open
            for (let i = 0; i < 5; i++) {
                retryEngine.updateCircuitBreaker('test-action', false);
            }
            
            expect(retryEngine.isCircuitOpen('test-action')).toBe(true);
            
            // Wait for timeout
            setTimeout(() => {
                expect(retryEngine.isCircuitOpen('test-action')).toBe(false);
                const status = retryEngine.getCircuitBreakerStatus('test-action');
                expect(status.state).toBe('HALF_OPEN');
                done();
            }, 150);
        });

        test('should close circuit after successful request in half-open state', () => {
            // Force circuit to half-open state
            const breaker = {
                state: 'HALF_OPEN',
                failures: 5,
                successes: 0,
                totalRequests: 5,
                lastFailureTime: Date.now(),
                lastSuccessTime: null
            };
            retryEngine.circuitBreakers.set('test-action', breaker);
            
            // Send successful request
            retryEngine.updateCircuitBreaker('test-action', true);
            
            const status = retryEngine.getCircuitBreakerStatus('test-action');
            expect(status.state).toBe('CLOSED');
            expect(status.failures).toBe(0); // Should reset failures
        });

        test('should prevent retries when circuit is open', () => {
            // Force circuit open
            for (let i = 0; i < 5; i++) {
                retryEngine.updateCircuitBreaker('test-action', false);
            }
            
            const networkError = new TypeError('Failed to fetch');
            const config = { action: 'test-action' };
            
            expect(retryEngine.shouldRetry(networkError, 0, config)).toBe(false);
        });

        test('should reset circuit breaker', () => {
            retryEngine.updateCircuitBreaker('test-action', false);
            retryEngine.resetCircuitBreaker('test-action');
            
            const status = retryEngine.getCircuitBreakerStatus('test-action');
            expect(status.state).toBe('CLOSED');
            expect(status.failures).toBe(0);
            expect(status.totalRequests).toBe(0);
        });
    });

    describe('Error Policy Configuration', () => {
        test('should allow custom error policies', () => {
            retryEngine.setErrorPolicy('NETWORK_ERROR', {
                maxRetries: 5,
                backoffMultiplier: 3.0
            });
            
            const errorType = retryEngine.errorTypes.NETWORK_ERROR;
            expect(errorType.maxRetries).toBe(5);
            expect(errorType.backoffMultiplier).toBe(3.0);
        });

        test('should preserve existing policy properties when updating', () => {
            retryEngine.setErrorPolicy('NETWORK_ERROR', {
                maxRetries: 5
            });
            
            const errorType = retryEngine.errorTypes.NETWORK_ERROR;
            expect(errorType.maxRetries).toBe(5);
            expect(errorType.retryable).toBe(true); // Should preserve original
            expect(errorType.code).toBe('NETWORK_ERROR'); // Should preserve original
        });
    });

    describe('Statistics and Monitoring', () => {
        test('should provide retry statistics', () => {
            retryEngine.updateCircuitBreaker('action1', true);
            retryEngine.updateCircuitBreaker('action2', false);
            
            const stats = retryEngine.getRetryStatistics();
            
            expect(stats.circuitBreakers).toBeDefined();
            expect(stats.errorTypes).toBeDefined();
            expect(stats.config).toBeDefined();
            expect(stats.circuitBreakers.action1).toBeDefined();
            expect(stats.circuitBreakers.action2).toBeDefined();
        });

        test('should provide all circuit breaker statuses', () => {
            retryEngine.updateCircuitBreaker('action1', true);
            retryEngine.updateCircuitBreaker('action2', false);
            
            const statuses = retryEngine.getAllCircuitBreakerStatuses();
            
            expect(Object.keys(statuses)).toHaveLength(2);
            expect(statuses.action1.successes).toBe(1);
            expect(statuses.action2.failures).toBe(1);
        });

        test('should calculate failure rates correctly', () => {
            retryEngine.updateCircuitBreaker('test-action', true);
            retryEngine.updateCircuitBreaker('test-action', false);
            retryEngine.updateCircuitBreaker('test-action', false);
            
            const status = retryEngine.getCircuitBreakerStatus('test-action');
            expect(status.failureRate).toBeCloseTo(2/3, 2);
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle complete retry workflow', () => {
            const networkError = new TypeError('Failed to fetch');
            const config = { action: 'save-settings' };
            
            // First attempt should be retryable
            expect(retryEngine.shouldRetry(networkError, 0, config)).toBe(true);
            
            // Calculate delay for first retry
            const delay1 = retryEngine.calculateDelay(0);
            expect(delay1).toBeGreaterThan(0);
            
            // Update circuit breaker with failure
            retryEngine.updateCircuitBreaker('save-settings', false);
            
            // Second attempt should still be retryable
            expect(retryEngine.shouldRetry(networkError, 1, config)).toBe(true);
            
            // After max retries, should not retry
            expect(retryEngine.shouldRetry(networkError, 3, config)).toBe(false);
        });

        test('should handle mixed success/failure patterns', () => {
            const action = 'mixed-test';
            
            // Some successes
            retryEngine.updateCircuitBreaker(action, true);
            retryEngine.updateCircuitBreaker(action, true);
            
            // Some failures
            retryEngine.updateCircuitBreaker(action, false);
            retryEngine.updateCircuitBreaker(action, false);
            
            // More successes
            retryEngine.updateCircuitBreaker(action, true);
            
            const status = retryEngine.getCircuitBreakerStatus(action);
            expect(status.state).toBe('CLOSED'); // Should remain closed
            expect(status.failureRate).toBeCloseTo(0.4, 1); // 2/5 = 40%
        });
    });
});

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    // Export test suite for external test runners
    module.exports = {
        RetryEngine,
        testSuite: describe
    };
}