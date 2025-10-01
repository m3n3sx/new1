/**
 * CSS Architecture Tests
 * 
 * Tests for CSS loading, performance, and integration
 * 
 * @package LiveAdminStyler
 * @since 2.0.0
 */

describe('CSS Architecture', () => {
    let testContainer;
    
    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.className = 'test-container';
        document.body.appendChild(testContainer);
    });
    
    afterEach(() => {
        // Clean up
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    });
    
    describe('CSS Variables', () => {
        test('should support CSS custom properties', () => {
            const testElement = document.createElement('div');
            testElement.style.setProperty('--test-var', 'test-value');
            
            const computedValue = testElement.style.getPropertyValue('--test-var');
            expect(computedValue).toBe('test-value');
        });
        
        test('should have all required CSS variables defined', () => {
            const requiredVariables = [
                '--las-primary',
                '--las-secondary',
                '--las-success',
                '--las-warning',
                '--las-error',
                '--las-space-2',
                '--las-space-4',
                '--las-space-6',
                '--las-text-sm',
                '--las-text-base',
                '--las-radius-base',
                '--las-shadow-sm',
                '--las-transition-base'
            ];
            
            const rootStyles = getComputedStyle(document.documentElement);
            
            requiredVariables.forEach(variable => {
                const value = rootStyles.getPropertyValue(variable).trim();
                expect(value).toBeTruthy();
            });
        });
        
        test('should use 8px grid system for spacing', () => {
            const rootStyles = getComputedStyle(document.documentElement);
            
            const space1 = rootStyles.getPropertyValue('--las-space-1').trim();
            const space2 = rootStyles.getPropertyValue('--las-space-2').trim();
            const space4 = rootStyles.getPropertyValue('--las-space-4').trim();
            const space8 = rootStyles.getPropertyValue('--las-space-8').trim();
            
            expect(space1).toBe('4px');
            expect(space2).toBe('8px');
            expect(space4).toBe('16px');
            expect(space8).toBe('32px');
        });
    });
    
    describe('CSS File Loading', () => {
        test('should load main CSS file', (done) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../assets/css/las-main.css';
            
            link.onload = () => {
                expect(link.sheet).toBeTruthy();
                expect(link.sheet.cssRules.length).toBeGreaterThan(0);
                done();
            };
            
            link.onerror = () => {
                done.fail('Failed to load main CSS file');
            };
            
            document.head.appendChild(link);
        });
        
        test('should load live edit CSS file', (done) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../assets/css/las-live-edit.css';
            
            link.onload = () => {
                expect(link.sheet).toBeTruthy();
                expect(link.sheet.cssRules.length).toBeGreaterThan(0);
                done();
            };
            
            link.onerror = () => {
                done.fail('Failed to load live edit CSS file');
            };
            
            document.head.appendChild(link);
        });
        
        test('should load utilities CSS file', (done) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../assets/css/las-utilities.css';
            
            link.onload = () => {
                expect(link.sheet).toBeTruthy();
                expect(link.sheet.cssRules.length).toBeGreaterThan(0);
                done();
            };
            
            link.onerror = () => {
                done.fail('Failed to load utilities CSS file');
            };
            
            document.head.appendChild(link);
        });
    });
    
    describe('Component Styling', () => {
        test('should style cards correctly', () => {
            const card = document.createElement('div');
            card.className = 'las-card';
            testContainer.appendChild(card);
            
            const styles = getComputedStyle(card);
            
            expect(styles.background).toContain('rgb(255, 255, 255)'); // white
            expect(styles.borderRadius).toBeTruthy();
            expect(styles.boxShadow).toBeTruthy();
        });
        
        test('should style buttons correctly', () => {
            const button = document.createElement('button');
            button.className = 'button button-primary';
            testContainer.appendChild(button);
            
            const styles = getComputedStyle(button);
            
            expect(styles.borderRadius).toBeTruthy();
            expect(styles.padding).toBeTruthy();
            expect(styles.transition).toBeTruthy();
        });
        
        test('should style form inputs correctly', () => {
            const input = document.createElement('input');
            input.type = 'text';
            testContainer.appendChild(input);
            
            const styles = getComputedStyle(input);
            
            expect(styles.border).toBeTruthy();
            expect(styles.borderRadius).toBeTruthy();
            expect(styles.padding).toBeTruthy();
        });
    });
    
    describe('Glassmorphism Effects', () => {
        test('should apply glassmorphism styles', () => {
            const element = document.createElement('div');
            element.className = 'las-glass';
            testContainer.appendChild(element);
            
            const styles = getComputedStyle(element);
            
            // Check for backdrop-filter or fallback
            const hasBackdropFilter = styles.backdropFilter !== 'none' || 
                                     styles.webkitBackdropFilter !== 'none';
            const hasFallbackBackground = styles.background.includes('rgba');
            
            expect(hasBackdropFilter || hasFallbackBackground).toBe(true);
        });
        
        test('should provide fallbacks for unsupported browsers', () => {
            // Mock unsupported browser
            const originalSupports = CSS.supports;
            CSS.supports = jest.fn().mockReturnValue(false);
            
            const element = document.createElement('div');
            element.className = 'las-glass';
            testContainer.appendChild(element);
            
            const styles = getComputedStyle(element);
            expect(styles.background).toBeTruthy();
            
            // Restore original function
            CSS.supports = originalSupports;
        });
    });
    
    describe('Animation Utilities', () => {
        test('should define animation keyframes', () => {
            const animations = [
                'las-fade-in',
                'las-slide-in-left',
                'las-scale-in',
                'las-spin',
                'las-pulse'
            ];
            
            animations.forEach(animation => {
                const element = document.createElement('div');
                element.style.animation = `${animation} 1s ease-out`;
                testContainer.appendChild(element);
                
                const styles = getComputedStyle(element);
                expect(styles.animationName).toBe(animation);
            });
        });
        
        test('should respect reduced motion preferences', () => {
            // Mock reduced motion preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            const element = document.createElement('div');
            element.className = 'las-animate-pulse';
            testContainer.appendChild(element);
            
            // In reduced motion mode, animations should be disabled or minimal
            const styles = getComputedStyle(element);
            const animationDuration = parseFloat(styles.animationDuration);
            
            // Should be very short or 0 in reduced motion mode
            expect(animationDuration).toBeLessThan(0.1);
        });
    });
    
    describe('Responsive Design', () => {
        test('should adapt grid layout on mobile', () => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 600,
            });
            
            const grid = document.createElement('div');
            grid.className = 'las-grid las-grid-cols-4';
            testContainer.appendChild(grid);
            
            // Trigger resize event
            window.dispatchEvent(new Event('resize'));
            
            const styles = getComputedStyle(grid);
            
            // On mobile, multi-column grids should become single column
            expect(styles.gridTemplateColumns).toBe('1fr');
        });
        
        test('should hide elements appropriately on mobile', () => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 600,
            });
            
            const element = document.createElement('div');
            element.className = 'las-shortcuts-help';
            testContainer.appendChild(element);
            
            const styles = getComputedStyle(element);
            
            // Shortcuts help should be hidden on mobile
            expect(styles.display).toBe('none');
        });
    });
    
    describe('Theme Support', () => {
        test('should support light theme', () => {
            document.documentElement.setAttribute('data-theme', 'light');
            
            const rootStyles = getComputedStyle(document.documentElement);
            const backgroundColor = rootStyles.getPropertyValue('--las-content-background').trim();
            
            expect(backgroundColor).toBe('#ffffff');
        });
        
        test('should support dark theme', () => {
            document.documentElement.setAttribute('data-theme', 'dark');
            
            const rootStyles = getComputedStyle(document.documentElement);
            const backgroundColor = rootStyles.getPropertyValue('--las-content-background').trim();
            
            expect(backgroundColor).toBe('#1a1a1a');
        });
        
        test('should respect system color scheme preference', () => {
            // Mock dark color scheme preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-color-scheme: dark)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            // Remove explicit theme attribute to test auto detection
            document.documentElement.removeAttribute('data-theme');
            
            const rootStyles = getComputedStyle(document.documentElement);
            const backgroundColor = rootStyles.getPropertyValue('--las-content-background').trim();
            
            // Should use dark theme colors when system prefers dark
            expect(backgroundColor).toBe('#1a1a1a');
        });
    });
    
    describe('Performance', () => {
        test('should load CSS files within performance budget', (done) => {
            const startTime = performance.now();
            const cssFiles = [
                '../assets/css/las-main.css',
                '../assets/css/las-live-edit.css',
                '../assets/css/las-utilities.css'
            ];
            
            let loadedCount = 0;
            
            cssFiles.forEach(href => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                
                link.onload = () => {
                    loadedCount++;
                    if (loadedCount === cssFiles.length) {
                        const loadTime = performance.now() - startTime;
                        
                        // CSS should load within 2 seconds
                        expect(loadTime).toBeLessThan(2000);
                        done();
                    }
                };
                
                link.onerror = () => {
                    done.fail(`Failed to load CSS file: ${href}`);
                };
                
                document.head.appendChild(link);
            });
        });
        
        test('should have reasonable total CSS size', async () => {
            const cssFiles = [
                '../assets/css/las-main.css',
                '../assets/css/las-live-edit.css',
                '../assets/css/las-utilities.css'
            ];
            
            let totalSize = 0;
            
            for (const file of cssFiles) {
                try {
                    const response = await fetch(file);
                    const text = await response.text();
                    totalSize += new Blob([text]).size;
                } catch (error) {
                    console.warn(`Could not fetch ${file} for size test`);
                }
            }
            
            // Total CSS should be under 100KB (target ~93KB)
            expect(totalSize).toBeLessThan(100 * 1024);
        });
        
        test('should not cause layout thrashing', () => {
            const element = document.createElement('div');
            element.className = 'las-card las-hover-lift';
            testContainer.appendChild(element);
            
            // Measure layout performance
            const startTime = performance.now();
            
            // Trigger hover effect
            element.dispatchEvent(new MouseEvent('mouseenter'));
            
            // Force layout calculation
            element.offsetHeight;
            
            const endTime = performance.now();
            const layoutTime = endTime - startTime;
            
            // Layout should be fast (under 16ms for 60fps)
            expect(layoutTime).toBeLessThan(16);
        });
    });
    
    describe('Accessibility', () => {
        test('should provide high contrast support', () => {
            // Mock high contrast preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-contrast: high)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            const element = document.createElement('div');
            element.className = 'las-glass';
            testContainer.appendChild(element);
            
            const styles = getComputedStyle(element);
            
            // In high contrast mode, should have solid borders
            expect(styles.borderWidth).toBe('2px');
        });
        
        test('should have proper focus styles', () => {
            const button = document.createElement('button');
            button.className = 'las-focus-visible';
            testContainer.appendChild(button);
            
            // Simulate focus
            button.focus();
            
            const styles = getComputedStyle(button, ':focus-visible');
            
            // Should have visible focus outline
            expect(styles.outline).toBeTruthy();
        });
        
        test('should provide screen reader support', () => {
            const element = document.createElement('div');
            element.className = 'las-screen-reader-only';
            element.textContent = 'Screen reader text';
            testContainer.appendChild(element);
            
            const styles = getComputedStyle(element);
            
            // Should be visually hidden but accessible to screen readers
            expect(styles.position).toBe('absolute');
            expect(styles.width).toBe('1px');
            expect(styles.height).toBe('1px');
        });
    });
});

// Performance monitoring utilities
class CSSPerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            fileSize: 0,
            animationFPS: 0
        };
    }
    
    measureLoadTime() {
        const startTime = performance.now();
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
        
        return Promise.all(Array.from(cssLinks).map(link => {
            return new Promise(resolve => {
                if (link.sheet) {
                    resolve();
                } else {
                    link.addEventListener('load', resolve);
                    link.addEventListener('error', resolve);
                }
            });
        })).then(() => {
            this.metrics.loadTime = performance.now() - startTime;
            return this.metrics.loadTime;
        });
    }
    
    measureRenderTime() {
        const startTime = performance.now();
        
        // Force layout calculation
        document.body.offsetHeight;
        
        this.metrics.renderTime = performance.now() - startTime;
        return this.metrics.renderTime;
    }
    
    async measureFileSize() {
        const cssFiles = [
            '../assets/css/las-main.css',
            '../assets/css/las-live-edit.css',
            '../assets/css/las-utilities.css'
        ];
        
        let totalSize = 0;
        
        for (const file of cssFiles) {
            try {
                const response = await fetch(file);
                const text = await response.text();
                totalSize += new Blob([text]).size;
            } catch (error) {
                console.warn(`Could not measure size of ${file}`);
            }
        }
        
        this.metrics.fileSize = totalSize;
        return totalSize;
    }
    
    measureAnimationFPS() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFrame = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.metrics.animationFPS = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                return this.metrics.animationFPS;
            }
            
            requestAnimationFrame(measureFrame);
        };
        
        requestAnimationFrame(measureFrame);
    }
    
    getMetrics() {
        return this.metrics;
    }
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CSSPerformanceMonitor };
}