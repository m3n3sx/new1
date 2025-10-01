/**
 * Live Admin Styler Core Module System
 * 
 * Main initialization and module loader for LAS v2.0
 * Provides ES6+ module support with IE11 fallbacks
 * 
 * @since 2.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * LASCore - Main module loader and initialization system
     */
    class LASCore {
        constructor() {
            this.modules = new Map();
            this.eventListeners = new Map();
            this.config = window.lasConfig || {};
            this.isInitialized = false;
            this.loadingPromises = new Map();
            
            // Error handling
            this.errorHandler = null;
            this.setupErrorHandling();
            
            // IE11 compatibility check
            this.isModernBrowser = this.checkModernBrowserSupport();
            
            this.log('LASCore initialized', { config: this.config });
        }

        /**
         * Check if browser supports modern features
         * @returns {boolean}
         */
        checkModernBrowserSupport() {
            return !!(
                window.Promise &&
                window.Map &&
                window.Set &&
                Array.prototype.includes &&
                Object.assign
            );
        }

        /**
         * Setup global error handling
         */
        setupErrorHandling() {
            window.addEventListener('error', (event) => {
                this.handleError('Global Error', event.error || event.message, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.handleError('Unhandled Promise Rejection', event.reason, {
                    promise: event.promise
                });
            });
        }

        /**
         * Load a module dynamically
         * @param {string} name - Module name
         * @param {string} path - Optional custom path
         * @returns {Promise<Object>}
         */
        async loadModule(name, path = null) {
            try {
                // Return cached module if already loaded
                if (this.modules.has(name)) {
                    return this.modules.get(name);
                }

                // Return existing loading promise if module is being loaded
                if (this.loadingPromises.has(name)) {
                    return await this.loadingPromises.get(name);
                }

                const loadingPromise = this._loadModuleInternal(name, path);
                this.loadingPromises.set(name, loadingPromise);

                const module = await loadingPromise;
                this.loadingPromises.delete(name);
                
                return module;
            } catch (error) {
                this.loadingPromises.delete(name);
                this.handleError(`Failed to load module: ${name}`, error);
                throw error;
            }
        }

        /**
         * Internal module loading logic
         * @private
         */
        async _loadModuleInternal(name, path) {
            const modulePath = path || `${this.config.assetsUrl || '/wp-content/plugins/live-admin-styler/assets/js'}/modules/${name}.js`;
            
            if (this.isModernBrowser && window.import) {
                // Use dynamic imports for modern browsers
                try {
                    const moduleExports = await import(modulePath);
                    const ModuleClass = moduleExports.default || moduleExports[name];
                    
                    if (typeof ModuleClass === 'function') {
                        const instance = new ModuleClass(this);
                        this.modules.set(name, instance);
                        this.log(`Module loaded: ${name}`, { instance });
                        return instance;
                    } else {
                        throw new Error(`Module ${name} does not export a constructor`);
                    }
                } catch (importError) {
                    // Fallback to script loading
                    return this._loadModuleViaScript(name, modulePath);
                }
            } else {
                // IE11 fallback - load via script tag
                return this._loadModuleViaScript(name, modulePath);
            }
        }

        /**
         * Load module via script tag (IE11 fallback)
         * @private
         */
        _loadModuleViaScript(name, modulePath) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = modulePath;
                script.async = true;
                
                script.onload = () => {
                    try {
                        // Expect module to register itself via LAS.registerModule()
                        const moduleConstructor = window.LASModules && window.LASModules[name];
                        if (typeof moduleConstructor === 'function') {
                            const instance = new moduleConstructor(this);
                            this.modules.set(name, instance);
                            this.log(`Module loaded via script: ${name}`, { instance });
                            resolve(instance);
                        } else {
                            reject(new Error(`Module ${name} not found in global registry`));
                        }
                    } catch (error) {
                        reject(error);
                    } finally {
                        document.head.removeChild(script);
                    }
                };
                
                script.onerror = () => {
                    document.head.removeChild(script);
                    reject(new Error(`Failed to load script: ${modulePath}`));
                };
                
                document.head.appendChild(script);
            });
        }

        /**
         * Register a module (for IE11 compatibility)
         * @param {string} name - Module name
         * @param {Function} constructor - Module constructor
         */
        registerModule(name, constructor) {
            if (!window.LASModules) {
                window.LASModules = {};
            }
            window.LASModules[name] = constructor;
        }

        /**
         * Get a loaded module
         * @param {string} name - Module name
         * @returns {Object|null}
         */
        getModule(name) {
            return this.modules.get(name) || null;
        }

        /**
         * Check if module is loaded
         * @param {string} name - Module name
         * @returns {boolean}
         */
        hasModule(name) {
            return this.modules.has(name);
        }

        /**
         * Event system - Add event listener
         * @param {string} event - Event name
         * @param {Function} callback - Callback function
         * @param {Object} context - Optional context
         */
        on(event, callback, context = null) {
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            
            this.eventListeners.get(event).push({
                callback,
                context
            });
        }

        /**
         * Event system - Remove event listener
         * @param {string} event - Event name
         * @param {Function} callback - Callback function
         */
        off(event, callback) {
            if (!this.eventListeners.has(event)) {
                return;
            }
            
            const listeners = this.eventListeners.get(event);
            const index = listeners.findIndex(listener => listener.callback === callback);
            
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }

        /**
         * Event system - Emit event
         * @param {string} event - Event name
         * @param {*} data - Event data
         */
        emit(event, data = null) {
            if (!this.eventListeners.has(event)) {
                return;
            }
            
            const listeners = this.eventListeners.get(event);
            listeners.forEach(listener => {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, data);
                    } else {
                        listener.callback(data);
                    }
                } catch (error) {
                    this.handleError(`Event handler error for ${event}`, error, { data });
                }
            });
        }

        /**
         * Initialize the core system and load essential modules
         * @returns {Promise<void>}
         */
        async init() {
            if (this.isInitialized) {
                this.log('LASCore already initialized');
                return;
            }

            try {
                this.log('Initializing LASCore...');
                
                // Load essential modules
                const essentialModules = [
                    'settings-manager',
                    'live-preview',
                    'ajax-manager',
                    'live-edit-engine',
                    'micro-panel',
                    'auto-save',
                    'tab-sync',
                    'theme-manager'
                ];

                const loadPromises = essentialModules.map(moduleName => 
                    this.loadModule(moduleName).catch(error => {
                        this.handleError(`Failed to load essential module: ${moduleName}`, error);
                        return null; // Continue with other modules
                    })
                );

                await Promise.all(loadPromises);
                
                this.isInitialized = true;
                this.emit('core:ready');
                this.log('LASCore initialization complete');
                
            } catch (error) {
                this.handleError('LASCore initialization failed', error);
                throw error;
            }
        }

        /**
         * Handle errors with logging and user notification
         * @param {string} message - Error message
         * @param {Error|string} error - Error object or message
         * @param {Object} context - Additional context
         */
        handleError(message, error, context = {}) {
            const errorData = {
                message,
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : null,
                context,
                timestamp: new Date().toISOString()
            };

            // Log to console in debug mode
            if (this.config.debug) {
                console.error('[LAS Error]', errorData);
            }

            // Emit error event for other modules to handle
            this.emit('core:error', errorData);

            // Store error for debugging
            if (!window.lasErrors) {
                window.lasErrors = [];
            }
            window.lasErrors.push(errorData);
        }

        /**
         * Logging utility
         * @param {string} message - Log message
         * @param {Object} data - Additional data
         */
        log(message, data = {}) {
            if (this.config.debug) {
                console.log('[LAS]', message, data);
            }
        }

        /**
         * Get system information for debugging
         * @returns {Object}
         */
        getSystemInfo() {
            return {
                version: this.config.version || '2.0.0',
                isInitialized: this.isInitialized,
                isModernBrowser: this.isModernBrowser,
                loadedModules: Array.from(this.modules.keys()),
                eventListeners: Array.from(this.eventListeners.keys()),
                config: this.config,
                errors: window.lasErrors || []
            };
        }

        /**
         * Cleanup resources
         */
        destroy() {
            // Cleanup modules
            this.modules.forEach(module => {
                if (typeof module.destroy === 'function') {
                    try {
                        module.destroy();
                    } catch (error) {
                        this.handleError('Module cleanup error', error);
                    }
                }
            });

            // Clear collections
            this.modules.clear();
            this.eventListeners.clear();
            this.loadingPromises.clear();

            this.isInitialized = false;
            this.log('LASCore destroyed');
        }
    }

    // Create global instance
    window.LAS = new LASCore();

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.LAS.init().catch(error => {
                console.error('LAS initialization failed:', error);
            });
        });
    } else {
        // DOM already loaded
        setTimeout(() => {
            window.LAS.init().catch(error => {
                console.error('LAS initialization failed:', error);
            });
        }, 0);
    }

})(window, document);