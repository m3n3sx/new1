/**
 * LAS Performance Optimizer Module
 * 
 * Handles performance monitoring, optimization strategies, and lazy loading
 * for the Live Admin Styler UI system.
 * 
 * @since 1.0.0
 */

class LASPerformanceOptimizer {
    constructor(core) {
        this.core = core;
        this.metrics = new Map();
        this.observers = new Map();
        this.lazyLoadQueue = new Set();
        this.performanceEntries = [];
        this.memoryThreshold = 25 * 1024 * 1024; // 25MB in bytes
        this.initialized = false;
        
        // Performance targets from requirements
        this.targets = {
            initializationTime: 2000, // 2 seconds max (Requirement 4.5)
            responseTime: 100,        // 100ms UI response (Requirement 6.4)
            memoryUsage: 25 * 1024 * 1024, // 25MB max
            eventBindingTime: 50      // 50ms max for event binding
        };
        
        // Optimization flags
        this.optimizations = {
            lazyLoading: true,
            eventDelegation: true,
            memoryManagement: true,
            performanceMonitoring: true
        };
    }
    
    async init() {
        try {
            console.log('LAS Performance: Initializing Performance Optimizer...');
            const startTime = performance.now();
            
            // Initialize performance monitoring
            this.initializePerformanceMonitoring();
            
            // Set up lazy loading system
            this.initializeLazyLoading();
            
            // Initialize memory management
            this.initializeMemoryManagement();
            
            // Set up event optimization
            this.initializeEventOptimization();
            
            // Start performance tracking
            this.startPerformanceTracking();
            
            const initTime = performance.now() - startTime;
            this.recordMetric('initialization_time', initTime);
            
            this.initialized = true;
            console.log(`LAS Performance: Optimizer initialized in ${initTime.toFixed(2)}ms`);
            
            // Validate initialization time against target
            if (initTime > this.targets.initializationTime) {
                console.warn(`LAS Performance: Initialization time ${initTime.toFixed(2)}ms exceeds target ${this.targets.initializationTime}ms`);
            }
            
        } catch (error) {
            console.error('LAS Performance: Optimizer initialization failed:', error);
            throw error;
        }
    }
    
    initializePerformanceMonitoring() {
        // Set up Performance Observer for navigation timing
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.handlePerformanceEntry(entry);
                    }
                });
                
                observer.observe({ entryTypes: ['navigation', 'measure', 'mark'] });
                this.observers.set('performance', observer);
                
            } catch (error) {
                console.warn('LAS Performance: PerformanceObserver not supported:', error);
            }
        }
        
        // Set up Intersection Observer for lazy loading
        if ('IntersectionObserver' in window) {
            const lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyComponent(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
            
            this.observers.set('lazy', lazyObserver);
        }
        
        // Set up Mutation Observer for DOM changes (Requirement 6.5)
        if ('MutationObserver' in window) {
            const mutationObserver = new MutationObserver((mutations) => {
                this.handleDOMChanges(mutations);
            });
            
            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'data-tab', 'data-menu']
            });
            
            this.observers.set('mutation', mutationObserver);
        }
    }
    
    initializeLazyLoading() {
        // Mark components for lazy loading
        const lazyComponents = document.querySelectorAll('[data-lazy-load]');
        lazyComponents.forEach(component => {
            this.lazyLoadQueue.add(component);
            
            // Add to intersection observer if available
            const lazyObserver = this.observers.get('lazy');
            if (lazyObserver) {
                lazyObserver.observe(component);
            }
        });
        
        console.log(`LAS Performance: ${lazyComponents.length} components queued for lazy loading`);
    }
    
    initializeMemoryManagement() {
        // Set up memory monitoring
        this.startMemoryMonitoring();
        
        // Set up cleanup intervals
        setInterval(() => {
            this.performMemoryCleanup();
        }, 30000); // Every 30 seconds
        
        // Listen for page visibility changes to optimize when hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.optimizeForBackground();
            } else {
                this.optimizeForForeground();
            }
        });
    }
    
    initializeEventOptimization() {
        // Override addEventListener to track event bindings (Requirement 6.4)
        this.setupEventTrackingOverride();
        
        // Set up event delegation optimization
        this.setupEventDelegation();
    }
    
    setupEventTrackingOverride() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        const eventRegistry = new WeakMap();
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // Track event bindings to prevent memory leaks
            if (!eventRegistry.has(this)) {
                eventRegistry.set(this, new Map());
            }
            
            const events = eventRegistry.get(this);
            if (!events.has(type)) {
                events.set(type, new Set());
            }
            
            events.get(type).add(listener);
            
            // Call original method
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            // Update tracking when removing events
            if (eventRegistry.has(this)) {
                const events = eventRegistry.get(this);
                if (events.has(type)) {
                    events.get(type).delete(listener);
                }
            }
            
            // Call original method
            return originalRemoveEventListener.call(this, type, listener, options);
        };
        
        // Store reference for cleanup
        this.eventRegistry = eventRegistry;
    }
    
    setupEventDelegation() {
        // Set up delegated event handlers for common UI interactions
        const delegatedEvents = ['click', 'change', 'input', 'keydown', 'mouseenter', 'mouseleave'];
        
        delegatedEvents.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                this.handleDelegatedEvent(e);
            }, { passive: true, capture: true });
        });
    }
    
    handleDelegatedEvent(event) {
        const startTime = performance.now();
        
        // Handle tab clicks
        if (event.type === 'click' && event.target.matches('.las-tab[data-tab]')) {
            const tabManager = this.core.get('tabs');
            if (tabManager) {
                event.preventDefault();
                tabManager.setActiveTab(event.target.dataset.tab);
            }
        }
        
        // Handle menu interactions
        if (event.type === 'mouseenter' && event.target.matches('.las-menu-item, .wp-menu-name')) {
            const menuManager = this.core.get('menu');
            if (menuManager) {
                menuManager.showSubmenu(event.target.id || event.target.dataset.menuId);
            }
        }
        
        // Handle form control changes
        if ((event.type === 'change' || event.type === 'input') && 
            event.target.matches('input, select, textarea')) {
            const formManager = this.core.get('forms');
            if (formManager) {
                const controlId = event.target.id || event.target.name;
                if (controlId) {
                    formManager.handleControlChange(controlId, event.target.value, {
                        skipSave: event.type === 'input'
                    });
                }
            }
        }
        
        const eventTime = performance.now() - startTime;
        this.recordMetric('event_handling_time', eventTime);
        
        // Warn if event handling is slow
        if (eventTime > this.targets.eventBindingTime) {
            console.warn(`LAS Performance: Event handling took ${eventTime.toFixed(2)}ms (target: ${this.targets.eventBindingTime}ms)`);
        }
    }
    
    handleDOMChanges(mutations) {
        const startTime = performance.now();
        let changesDetected = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // Handle added nodes
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.handleAddedElement(node);
                        changesDetected = true;
                    }
                });
                
                // Handle removed nodes
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.handleRemovedElement(node);
                        changesDetected = true;
                    }
                });
            }
            
            if (mutation.type === 'attributes') {
                this.handleAttributeChange(mutation.target, mutation.attributeName);
                changesDetected = true;
            }
        });
        
        if (changesDetected) {
            const processingTime = performance.now() - startTime;
            this.recordMetric('dom_change_processing', processingTime);
            
            // Emit event for other components to react
            this.core.emit('performance:dom-changed', {
                mutations,
                processingTime
            });
        }
    }
    
    handleAddedElement(element) {
        // Check if element needs lazy loading
        if (element.hasAttribute('data-lazy-load')) {
            this.lazyLoadQueue.add(element);
            
            const lazyObserver = this.observers.get('lazy');
            if (lazyObserver) {
                lazyObserver.observe(element);
            }
        }
        
        // Re-initialize components for new elements
        this.reinitializeComponentsForElement(element);
    }
    
    handleRemovedElement(element) {
        // Clean up lazy loading
        this.lazyLoadQueue.delete(element);
        
        const lazyObserver = this.observers.get('lazy');
        if (lazyObserver) {
            lazyObserver.unobserve(element);
        }
        
        // Clean up event listeners to prevent memory leaks
        this.cleanupElementEvents(element);
    }
    
    handleAttributeChange(element, attributeName) {
        // Handle class changes that might affect UI components
        if (attributeName === 'class') {
            this.handleClassChange(element);
        }
        
        // Handle data attribute changes
        if (attributeName.startsWith('data-')) {
            this.handleDataAttributeChange(element, attributeName);
        }
    }
    
    handleClassChange(element) {
        // Re-evaluate lazy loading if visibility classes changed
        if (element.hasAttribute('data-lazy-load')) {
            const isVisible = !element.classList.contains('hidden') && 
                            !element.classList.contains('las-hidden');
            
            if (isVisible && this.lazyLoadQueue.has(element)) {
                this.loadLazyComponent(element);
            }
        }
    }
    
    handleDataAttributeChange(element, attributeName) {
        // Handle tab data changes
        if (attributeName === 'data-tab') {
            const tabManager = this.core.get('tabs');
            if (tabManager) {
                tabManager.discoverTabElements();
            }
        }
        
        // Handle menu data changes
        if (attributeName === 'data-menu') {
            const menuManager = this.core.get('menu');
            if (menuManager) {
                menuManager.discoverMenuElements();
            }
        }
    }
    
    reinitializeComponentsForElement(element) {
        // Check if element contains form controls
        const formControls = element.querySelectorAll('input, select, textarea');
        if (formControls.length > 0) {
            const formManager = this.core.get('forms');
            if (formManager) {
                formManager.discoverFormControls();
            }
        }
        
        // Check if element contains tabs
        const tabs = element.querySelectorAll('.las-tab[data-tab]');
        if (tabs.length > 0) {
            const tabManager = this.core.get('tabs');
            if (tabManager) {
                tabManager.discoverTabElements();
            }
        }
        
        // Check if element contains menu items
        const menuItems = element.querySelectorAll('.las-menu-item, .wp-menu-name');
        if (menuItems.length > 0) {
            const menuManager = this.core.get('menu');
            if (menuManager) {
                menuManager.discoverMenuElements();
            }
        }
    }
    
    cleanupElementEvents(element) {
        // Remove all event listeners from removed elements
        const allElements = [element, ...element.querySelectorAll('*')];
        
        allElements.forEach(el => {
            if (this.eventRegistry && this.eventRegistry.has(el)) {
                const events = this.eventRegistry.get(el);
                events.forEach((listeners, eventType) => {
                    listeners.forEach(listener => {
                        el.removeEventListener(eventType, listener);
                    });
                });
                this.eventRegistry.delete(el);
            }
        });
    }
    
    loadLazyComponent(element) {
        if (!this.lazyLoadQueue.has(element)) {
            return;
        }
        
        const startTime = performance.now();
        const componentType = element.dataset.lazyLoad;
        
        try {
            // Load component based on type
            switch (componentType) {
                case 'color-picker':
                    this.loadColorPicker(element);
                    break;
                case 'slider':
                    this.loadSlider(element);
                    break;
                case 'rich-editor':
                    this.loadRichEditor(element);
                    break;
                default:
                    console.warn(`LAS Performance: Unknown lazy component type: ${componentType}`);
            }
            
            // Remove from lazy queue
            this.lazyLoadQueue.delete(element);
            element.removeAttribute('data-lazy-load');
            
            const loadTime = performance.now() - startTime;
            this.recordMetric('lazy_load_time', loadTime);
            
            console.log(`LAS Performance: Lazy loaded ${componentType} in ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error(`LAS Performance: Failed to lazy load ${componentType}:`, error);
        }
    }
    
    loadColorPicker(element) {
        if (jQuery && jQuery.fn.wpColorPicker) {
            jQuery(element).wpColorPicker();
        }
    }
    
    loadSlider(element) {
        if (jQuery && jQuery.fn.slider) {
            const min = parseFloat(element.min) || 0;
            const max = parseFloat(element.max) || 100;
            const step = parseFloat(element.step) || 1;
            const value = parseFloat(element.value) || min;
            
            jQuery(element).slider({
                min, max, step, value
            });
        }
    }
    
    loadRichEditor(element) {
        // Placeholder for rich editor initialization
        console.log('LAS Performance: Rich editor lazy loading not implemented');
    }
    
    startMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                this.recordMetric('memory_used', memInfo.usedJSHeapSize);
                this.recordMetric('memory_total', memInfo.totalJSHeapSize);
                this.recordMetric('memory_limit', memInfo.jsHeapSizeLimit);
                
                // Check memory threshold
                if (memInfo.usedJSHeapSize > this.memoryThreshold) {
                    console.warn(`LAS Performance: Memory usage ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(this.memoryThreshold / 1024 / 1024).toFixed(2)}MB`);
                    this.performMemoryCleanup();
                }
            }, 5000); // Every 5 seconds
        }
    }
    
    performMemoryCleanup() {
        // Clean up old performance entries
        if (this.performanceEntries.length > 1000) {
            this.performanceEntries = this.performanceEntries.slice(-500);
        }
        
        // Clean up old metrics
        this.metrics.forEach((values, key) => {
            if (values.length > 100) {
                this.metrics.set(key, values.slice(-50));
            }
        });
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        console.log('LAS Performance: Memory cleanup performed');
    }
    
    optimizeForBackground() {
        // Reduce update frequency when page is hidden
        this.core.emit('performance:background-mode', { active: true });
        console.log('LAS Performance: Optimized for background mode');
    }
    
    optimizeForForeground() {
        // Restore normal update frequency when page is visible
        this.core.emit('performance:background-mode', { active: false });
        console.log('LAS Performance: Optimized for foreground mode');
    }
    
    startPerformanceTracking() {
        // Mark initialization complete
        performance.mark('las-ui-init-complete');
        
        // Measure total initialization time
        try {
            performance.measure('las-ui-initialization', 'las-ui-init-start', 'las-ui-init-complete');
        } catch (error) {
            // Mark might not exist, create it
            performance.mark('las-ui-init-start');
            performance.measure('las-ui-initialization', 'las-ui-init-start', 'las-ui-init-complete');
        }
    }
    
    handlePerformanceEntry(entry) {
        this.performanceEntries.push({
            name: entry.name,
            type: entry.entryType,
            startTime: entry.startTime,
            duration: entry.duration,
            timestamp: Date.now()
        });
        
        // Log important performance entries
        if (entry.name === 'las-ui-initialization') {
            console.log(`LAS Performance: Total initialization time: ${entry.duration.toFixed(2)}ms`);
            
            if (entry.duration > this.targets.initializationTime) {
                console.warn(`LAS Performance: Initialization exceeded target by ${(entry.duration - this.targets.initializationTime).toFixed(2)}ms`);
            }
        }
    }
    
    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const values = this.metrics.get(name);
        values.push({
            value,
            timestamp: Date.now()
        });
        
        // Keep only recent values
        if (values.length > 100) {
            values.shift();
        }
    }
    
    getMetrics() {
        const summary = {};
        
        this.metrics.forEach((values, name) => {
            if (values.length > 0) {
                const recentValues = values.map(v => v.value);
                summary[name] = {
                    current: recentValues[recentValues.length - 1],
                    average: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
                    min: Math.min(...recentValues),
                    max: Math.max(...recentValues),
                    count: recentValues.length
                };
            }
        });
        
        return summary;
    }
    
    getPerformanceReport() {
        return {
            metrics: this.getMetrics(),
            targets: this.targets,
            optimizations: this.optimizations,
            lazyLoadQueue: this.lazyLoadQueue.size,
            performanceEntries: this.performanceEntries.slice(-10), // Last 10 entries
            memoryInfo: 'memory' in performance ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    }
    
    destroy() {
        // Clean up observers
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
        
        // Clean up metrics
        this.metrics.clear();
        this.performanceEntries = [];
        this.lazyLoadQueue.clear();
        
        console.log('LAS Performance: Optimizer destroyed');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LASPerformanceOptimizer;
}

// Global registration
if (typeof window !== 'undefined') {
    window.LASPerformanceOptimizer = LASPerformanceOptimizer;
}