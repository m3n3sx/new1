/**
 * Performance Optimizer Tests
 * 
 * Tests for the LAS Performance Optimizer module functionality,
 * including lazy loading, memory management, and performance monitoring.
 */

describe('LASPerformanceOptimizer', () => {
    let optimizer;
    let mockCore;
    let mockTabManager;
    let mockMenuManager;
    let mockFormManager;

    beforeEach(() => {
        // Mock core system
        mockTabManager = {
            setActiveTab: jest.fn(),
            discoverTabElements: jest.fn()
        };
        
        mockMenuManager = {
            showSubmenu: jest.fn(),
            discoverMenuElements: jest.fn()
        };
        
        mockFormManager = {
            handleControlChange: jest.fn(),
            discoverFormControls: jest.fn()
        };
        
        mockCore = {
            get: jest.fn((name) => {
                switch (name) {
                    case 'tabs': return mockTabManager;
                    case 'menu': return mockMenuManager;
                    case 'forms': return mockFormManager;
                    default: return null;
                }
            }),
            emit: jest.fn()
        };

        // Create optimizer instance
        optimizer = new LASPerformanceOptimizer(mockCore);
        
        // Mock performance API
        global.performance = {
            now: jest.fn(() => Date.now()),
            mark: jest.fn(),
            measure: jest.fn(),
            memory: {
                usedJSHeapSize: 10 * 1024 * 1024, // 10MB
                totalJSHeapSize: 20 * 1024 * 1024, // 20MB
                jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
            }
        };
        
        // Mock observers
        global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
            observe: jest.fn(),
            disconnect: jest.fn()
        }));
        
        global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: jest.fn()
        }));
        
        global.MutationObserver = jest.fn().mockImplementation((callback) => ({
            observe: jest.fn(),
            disconnect: jest.fn()
        }));
        
        // Mock DOM
        document.body.innerHTML = `
            <div class="las-fresh-settings-wrap">
                <div class="las-tab" data-tab="general">General</div>
                <div class="las-tab" data-tab="menu">Menu</div>
                <div class="las-tab-panel" id="las-tab-general">General content</div>
                <div class="las-tab-panel" id="las-tab-menu">Menu content</div>
                <input type="color" id="test-color" data-lazy-load="color-picker">
                <input type="range" id="test-slider" data-lazy-load="slider">
                <div class="las-menu-item" id="menu-1">Menu Item</div>
            </div>
        `;
    });

    afterEach(() => {
        if (optimizer && optimizer.destroy) {
            optimizer.destroy();
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await optimizer.init();
            
            expect(optimizer.initialized).toBe(true);
            expect(mockCore.emit).toHaveBeenCalledWith('performance:dom-changed', expect.any(Object));
        });

        test('should meet initialization time target', async () => {
            const startTime = Date.now();
            await optimizer.init();
            const initTime = Date.now() - startTime;
            
            expect(initTime).toBeLessThan(optimizer.targets.initializationTime);
        });

        test('should set up performance monitoring', async () => {
            await optimizer.init();
            
            expect(global.PerformanceObserver).toHaveBeenCalled();
            expect(global.IntersectionObserver).toHaveBeenCalled();
            expect(global.MutationObserver).toHaveBeenCalled();
        });

        test('should initialize lazy loading queue', async () => {
            await optimizer.init();
            
            expect(optimizer.lazyLoadQueue.size).toBeGreaterThan(0);
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(async () => {
            await optimizer.init();
        });

        test('should record metrics', () => {
            optimizer.recordMetric('test_metric', 100);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.test_metric).toBeDefined();
            expect(metrics.test_metric.current).toBe(100);
        });

        test('should track initialization time', () => {
            optimizer.recordMetric('initialization_time', 1500);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.initialization_time.current).toBe(1500);
            expect(metrics.initialization_time.current).toBeLessThan(optimizer.targets.initializationTime);
        });

        test('should monitor memory usage', () => {
            optimizer.recordMetric('memory_used', 15 * 1024 * 1024); // 15MB
            
            const metrics = optimizer.getMetrics();
            expect(metrics.memory_used.current).toBe(15 * 1024 * 1024);
        });

        test('should generate performance report', () => {
            optimizer.recordMetric('test_metric', 50);
            
            const report = optimizer.getPerformanceReport();
            
            expect(report).toHaveProperty('metrics');
            expect(report).toHaveProperty('targets');
            expect(report).toHaveProperty('optimizations');
            expect(report).toHaveProperty('lazyLoadQueue');
            expect(report.metrics.test_metric).toBeDefined();
        });
    });

    describe('Lazy Loading', () => {
        beforeEach(async () => {
            await optimizer.init();
        });

        test('should identify lazy load components', () => {
            expect(optimizer.lazyLoadQueue.size).toBe(2); // color picker and slider
        });

        test('should load color picker component', () => {
            const colorInput = document.getElementById('test-color');
            
            // Mock jQuery and wpColorPicker
            global.jQuery = jest.fn(() => ({
                wpColorPicker: jest.fn()
            }));
            global.jQuery.fn = { wpColorPicker: jest.fn() };
            
            optimizer.loadLazyComponent(colorInput);
            
            expect(optimizer.lazyLoadQueue.has(colorInput)).toBe(false);
            expect(colorInput.hasAttribute('data-lazy-load')).toBe(false);
        });

        test('should load slider component', () => {
            const sliderInput = document.getElementById('test-slider');
            sliderInput.min = '0';
            sliderInput.max = '100';
            sliderInput.step = '1';
            sliderInput.value = '50';
            
            // Mock jQuery and slider
            global.jQuery = jest.fn(() => ({
                slider: jest.fn()
            }));
            global.jQuery.fn = { slider: jest.fn() };
            
            optimizer.loadLazyComponent(sliderInput);
            
            expect(optimizer.lazyLoadQueue.has(sliderInput)).toBe(false);
        });

        test('should handle unknown component types', () => {
            const unknownElement = document.createElement('div');
            unknownElement.setAttribute('data-lazy-load', 'unknown-type');
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            optimizer.loadLazyComponent(unknownElement);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Unknown lazy component type: unknown-type')
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Event Optimization', () => {
        beforeEach(async () => {
            await optimizer.init();
        });

        test('should handle delegated tab clicks', () => {
            const tabElement = document.querySelector('[data-tab="general"]');
            
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            });
            
            tabElement.dispatchEvent(clickEvent);
            
            expect(mockTabManager.setActiveTab).toHaveBeenCalledWith('general');
        });

        test('should handle delegated menu hover', () => {
            const menuElement = document.getElementById('menu-1');
            
            const mouseEnterEvent = new MouseEvent('mouseenter', {
                bubbles: true,
                cancelable: true
            });
            
            menuElement.dispatchEvent(mouseEnterEvent);
            
            expect(mockMenuManager.showSubmenu).toHaveBeenCalledWith('menu-1');
        });

        test('should handle form control changes', () => {
            const input = document.createElement('input');
            input.id = 'test-input';
            input.value = 'test-value';
            document.body.appendChild(input);
            
            const changeEvent = new Event('change', {
                bubbles: true,
                cancelable: true
            });
            
            input.dispatchEvent(changeEvent);
            
            expect(mockFormManager.handleControlChange).toHaveBeenCalledWith(
                'test-input',
                'test-value',
                { skipSave: false }
            );
        });

        test('should track event handling time', () => {
            const tabElement = document.querySelector('[data-tab="general"]');
            
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            });
            
            tabElement.dispatchEvent(clickEvent);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.event_handling_time).toBeDefined();
        });
    });

    describe('DOM Change Handling', () => {
        beforeEach(async () => {
            await optimizer.init();
        });

        test('should handle added elements', () => {
            const newTab = document.createElement('div');
            newTab.className = 'las-tab';
            newTab.setAttribute('data-tab', 'new-tab');
            
            optimizer.handleAddedElement(newTab);
            
            expect(mockTabManager.discoverTabElements).toHaveBeenCalled();
        });

        test('should handle removed elements', () => {
            const element = document.createElement('div');
            element.setAttribute('data-lazy-load', 'test');
            optimizer.lazyLoadQueue.add(element);
            
            optimizer.handleRemovedElement(element);
            
            expect(optimizer.lazyLoadQueue.has(element)).toBe(false);
        });

        test('should handle class changes', () => {
            const element = document.createElement('div');
            element.setAttribute('data-lazy-load', 'test');
            element.classList.add('hidden');
            optimizer.lazyLoadQueue.add(element);
            
            optimizer.handleClassChange(element);
            
            // Should not load when hidden
            expect(optimizer.lazyLoadQueue.has(element)).toBe(true);
            
            // Remove hidden class
            element.classList.remove('hidden');
            optimizer.handleClassChange(element);
            
            // Should load when visible
            expect(optimizer.lazyLoadQueue.has(element)).toBe(false);
        });

        test('should handle data attribute changes', () => {
            const element = document.createElement('div');
            
            optimizer.handleDataAttributeChange(element, 'data-tab');
            expect(mockTabManager.discoverTabElements).toHaveBeenCalled();
            
            optimizer.handleDataAttributeChange(element, 'data-menu');
            expect(mockMenuManager.discoverMenuElements).toHaveBeenCalled();
        });
    });

    describe('Memory Management', () => {
        beforeEach(async () => {
            await optimizer.init();
        });

        test('should perform memory cleanup', () => {
            // Fill up performance entries
            for (let i = 0; i < 1500; i++) {
                optimizer.performanceEntries.push({
                    name: `test-${i}`,
                    type: 'measure',
                    startTime: i,
                    duration: 10,
                    timestamp: Date.now()
                });
            }
            
            // Fill up metrics
            for (let i = 0; i < 150; i++) {
                optimizer.recordMetric('test_metric', i);
            }
            
            optimizer.performMemoryCleanup();
            
            expect(optimizer.performanceEntries.length).toBeLessThanOrEqual(500);
            expect(optimizer.metrics.get('test_metric').length).toBeLessThanOrEqual(50);
        });

        test('should optimize for background mode', () => {
            optimizer.optimizeForBackground();
            
            expect(mockCore.emit).toHaveBeenCalledWith('performance:background-mode', { active: true });
        });

        test('should optimize for foreground mode', () => {
            optimizer.optimizeForForeground();
            
            expect(mockCore.emit).toHaveBeenCalledWith('performance:background-mode', { active: false });
        });
    });

    describe('Performance Targets', () => {
        beforeEach(async () => {
            await optimizer.init();
        });

        test('should meet initialization time target', () => {
            optimizer.recordMetric('initialization_time', 1500);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.initialization_time.current).toBeLessThan(optimizer.targets.initializationTime);
        });

        test('should meet response time target', () => {
            optimizer.recordMetric('event_handling_time', 50);
            
            const metrics = optimizer.getMetrics();
            expect(metrics.event_handling_time.current).toBeLessThan(optimizer.targets.responseTime);
        });

        test('should warn when targets are exceeded', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Simulate slow event handling
            optimizer.recordMetric('event_handling_time', 150);
            
            // Trigger event handling with slow time
            const originalNow = performance.now;
            let callCount = 0;
            performance.now = jest.fn(() => {
                callCount++;
                return callCount === 1 ? 0 : 150; // 150ms duration
            });
            
            const tabElement = document.querySelector('[data-tab="general"]');
            const clickEvent = new MouseEvent('click', { bubbles: true });
            tabElement.dispatchEvent(clickEvent);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Event handling took 150.00ms')
            );
            
            performance.now = originalNow;
            consoleSpy.mockRestore();
        });
    });

    describe('Cleanup', () => {
        test('should clean up resources on destroy', async () => {
            await optimizer.init();
            
            const observerCount = optimizer.observers.size;
            expect(observerCount).toBeGreaterThan(0);
            
            optimizer.destroy();
            
            expect(optimizer.observers.size).toBe(0);
            expect(optimizer.metrics.size).toBe(0);
            expect(optimizer.performanceEntries.length).toBe(0);
            expect(optimizer.lazyLoadQueue.size).toBe(0);
        });
    });
});