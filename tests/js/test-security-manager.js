/**
 * Test Security Manager
 * 
 * Tests for client-side security features including:
 * - Nonce refresh functionality
 * - Rate limit handling
 * - Security event logging
 * - Error handling for security issues
 */

describe('SecurityManager', function() {
    let SecurityManager;
    let mockAjax;
    let originalLocalStorage;
    
    beforeEach(function() {
        // Mock localStorage
        originalLocalStorage = window.localStorage;
        window.localStorage = {
            data: {},
            getItem: function(key) {
                return this.data[key] || null;
            },
            setItem: function(key, value) {
                this.data[key] = value;
            },
            removeItem: function(key) {
                delete this.data[key];
            },
            clear: function() {
                this.data = {};
            }
        };
        
        // Mock jQuery AJAX
        mockAjax = {
            responses: {},
            post: function(url, data) {
                const action = data.action;
                const response = mockAjax.responses[action];
                
                const deferred = {
                    done: function(callback) {
                        if (response && response.success) {
                            setTimeout(() => callback(response), 10);
                        }
                        return this;
                    },
                    fail: function(callback) {
                        if (response && !response.success) {
                            setTimeout(() => callback({responseText: JSON.stringify(response)}, 'error', 'Error'), 10);
                        }
                        return this;
                    },
                    always: function(callback) {
                        setTimeout(callback, 15);
                        return this;
                    }
                };
                
                return deferred;
            }
        };
        
        // Mock global objects
        window.$ = window.jQuery = function(selector) {
            return {
                post: mockAjax.post,
                on: function() { return this; },
                off: function() { return this; },
                trigger: function() { return this; },
                ajaxError: function() { return this; }
            };
        };
        window.$.post = mockAjax.post;
        
        window.lasFreshData = {
            ajax_url: '/wp-admin/admin-ajax.php',
            nonce: 'test_nonce_123'
        };
        
        window.console = {
            log: function() {},
            warn: function() {},
            error: function() {}
        };
        
        // Initialize SecurityManager
        SecurityManager = {
            nonceRefreshInterval: 43200000,
            refreshTimer: null,
            isRefreshing: false,
            
            init: function() {
                this.setupNonceRefresh();
                this.setupSecurityMonitoring();
            },
            
            setupNonceRefresh: function() {
                // Simplified for testing
            },
            
            refreshNonce: function() {
                if (this.isRefreshing) {
                    return Promise.resolve();
                }
                
                this.isRefreshing = true;
                
                return new Promise((resolve, reject) => {
                    $.post(lasFreshData.ajax_url, {
                        action: 'las_refresh_nonce'
                    })
                    .done((response) => {
                        if (response.success && response.data.nonce) {
                            lasFreshData.nonce = response.data.nonce;
                            localStorage.setItem('las_last_nonce_refresh', Date.now().toString());
                            resolve(response.data.nonce);
                        } else {
                            reject('Invalid response');
                        }
                    })
                    .fail((jqXHR, textStatus, errorThrown) => {
                        reject(textStatus);
                    })
                    .always(() => {
                        this.isRefreshing = false;
                    });
                });
            },
            
            setupSecurityMonitoring: function() {
                // Simplified for testing
            },
            
            handleRateLimit: function(errorData) {
                const retryAfter = errorData.retry_after || 300;
                this.logSecurityEvent('rate_limit_client', {
                    retry_after: retryAfter,
                    timestamp: Date.now()
                });
                return retryAfter;
            },
            
            logSecurityEvent: function(eventType, data) {
                const events = JSON.parse(localStorage.getItem('las_security_events') || '[]');
                events.unshift({
                    type: eventType,
                    data: data,
                    timestamp: Date.now(),
                    url: window.location.href
                });
                
                if (events.length > 50) {
                    events.splice(50);
                }
                
                localStorage.setItem('las_security_events', JSON.stringify(events));
            },
            
            getSecurityStatus: function() {
                return $.post(lasFreshData.ajax_url, {
                    action: 'las_get_security_status',
                    nonce: lasFreshData.nonce
                });
            },
            
            clearSecurityLog: function() {
                return $.post(lasFreshData.ajax_url, {
                    action: 'las_clear_security_log',
                    nonce: lasFreshData.nonce
                });
            },
            
            cleanup: function() {
                if (this.refreshTimer) {
                    clearInterval(this.refreshTimer);
                }
            }
        };
    });
    
    afterEach(function() {
        SecurityManager.cleanup();
        window.localStorage = originalLocalStorage;
    });
    
    describe('Nonce Refresh', function() {
        it('should refresh nonce successfully', function(done) {
            mockAjax.responses['las_refresh_nonce'] = {
                success: true,
                data: {
                    nonce: 'new_nonce_456',
                    expires_in: 43200
                }
            };
            
            SecurityManager.refreshNonce().then(function(newNonce) {
                expect(newNonce).toBe('new_nonce_456');
                expect(lasFreshData.nonce).toBe('new_nonce_456');
                expect(localStorage.getItem('las_last_nonce_refresh')).toBeTruthy();
                done();
            }).catch(done.fail);
        });
        
        it('should handle nonce refresh failure', function(done) {
            mockAjax.responses['las_refresh_nonce'] = {
                success: false,
                data: {
                    message: 'Refresh failed'
                }
            };
            
            SecurityManager.refreshNonce().then(function() {
                done.fail('Should have failed');
            }).catch(function(error) {
                expect(error).toBe('error');
                done();
            });
        });
        
        it('should prevent concurrent nonce refreshes', function() {
            SecurityManager.isRefreshing = true;
            
            const promise1 = SecurityManager.refreshNonce();
            const promise2 = SecurityManager.refreshNonce();
            
            expect(promise1).toBe(promise2);
        });
    });
    
    describe('Rate Limit Handling', function() {
        it('should handle rate limit errors correctly', function() {
            const errorData = {
                retry_after: 300,
                message: 'Rate limit exceeded'
            };
            
            const retryAfter = SecurityManager.handleRateLimit(errorData);
            
            expect(retryAfter).toBe(300);
            
            const events = JSON.parse(localStorage.getItem('las_security_events') || '[]');
            expect(events.length).toBe(1);
            expect(events[0].type).toBe('rate_limit_client');
            expect(events[0].data.retry_after).toBe(300);
        });
        
        it('should use default retry time when not provided', function() {
            const errorData = {
                message: 'Rate limit exceeded'
            };
            
            const retryAfter = SecurityManager.handleRateLimit(errorData);
            
            expect(retryAfter).toBe(300);
        });
    });
    
    describe('Security Event Logging', function() {
        it('should log security events to localStorage', function() {
            SecurityManager.logSecurityEvent('test_event', {
                test_data: 'value'
            });
            
            const events = JSON.parse(localStorage.getItem('las_security_events') || '[]');
            
            expect(events.length).toBe(1);
            expect(events[0].type).toBe('test_event');
            expect(events[0].data.test_data).toBe('value');
            expect(events[0].timestamp).toBeTruthy();
        });
        
        it('should limit the number of stored events', function() {
            // Add more than 50 events
            for (let i = 0; i < 55; i++) {
                SecurityManager.logSecurityEvent('test_event_' + i, {
                    index: i
                });
            }
            
            const events = JSON.parse(localStorage.getItem('las_security_events') || '[]');
            
            expect(events.length).toBe(50);
            expect(events[0].type).toBe('test_event_54'); // Most recent
            expect(events[49].type).toBe('test_event_5'); // 50th from most recent
        });
        
        it('should handle empty localStorage gracefully', function() {
            localStorage.removeItem('las_security_events');
            
            SecurityManager.logSecurityEvent('first_event', {
                data: 'test'
            });
            
            const events = JSON.parse(localStorage.getItem('las_security_events') || '[]');
            
            expect(events.length).toBe(1);
            expect(events[0].type).toBe('first_event');
        });
    });
    
    describe('Security Status', function() {
        it('should request security status from server', function(done) {
            mockAjax.responses['las_get_security_status'] = {
                success: true,
                data: {
                    rate_limit_status: {
                        requests_last_hour: 10,
                        max_requests_hour: 300,
                        is_blocked: false
                    },
                    security_events: {
                        recent_count: 2,
                        total_count: 15
                    }
                }
            };
            
            SecurityManager.getSecurityStatus().done(function(response) {
                expect(response.success).toBe(true);
                expect(response.data.rate_limit_status.requests_last_hour).toBe(10);
                expect(response.data.security_events.recent_count).toBe(2);
                done();
            });
        });
    });
    
    describe('Security Log Management', function() {
        it('should clear security log on server', function(done) {
            mockAjax.responses['las_clear_security_log'] = {
                success: true,
                data: {
                    message: 'Security log cleared successfully'
                }
            };
            
            SecurityManager.clearSecurityLog().done(function(response) {
                expect(response.success).toBe(true);
                expect(response.data.message).toBe('Security log cleared successfully');
                done();
            });
        });
    });
    
    describe('Initialization', function() {
        it('should initialize without errors', function() {
            expect(function() {
                SecurityManager.init();
            }).not.toThrow();
        });
        
        it('should set up nonce refresh and security monitoring', function() {
            spyOn(SecurityManager, 'setupNonceRefresh');
            spyOn(SecurityManager, 'setupSecurityMonitoring');
            
            SecurityManager.init();
            
            expect(SecurityManager.setupNonceRefresh).toHaveBeenCalled();
            expect(SecurityManager.setupSecurityMonitoring).toHaveBeenCalled();
        });
    });
    
    describe('Cleanup', function() {
        it('should clean up timers and resources', function() {
            SecurityManager.refreshTimer = setInterval(function() {}, 1000);
            const timerId = SecurityManager.refreshTimer;
            
            SecurityManager.cleanup();
            
            expect(SecurityManager.refreshTimer).toBe(null);
            // Note: We can't easily test if clearInterval was called, 
            // but we can verify the timer reference is cleared
        });
    });
});