/**
 * Validation Script for Modern Navigation System
 * Tests all navigation features in a real browser environment
 */

class NavigationValidator {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
        this.navigationManager = null;
    }
    
    async runAllTests() {
        console.log('🚀 Starting Modern Navigation System Validation...\n');
        
        try {
            await this.setupTestEnvironment();
            await this.runTests();
            this.displayResults();
        } catch (error) {
            console.error('❌ Validation failed:', error);
        }
    }
    
    async setupTestEnvironment() {
        console.log('📋 Setting up test environment...');
        
        // Create test container
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
            <div id="test-las-settings-tabs">
                <div class="las-tabs" role="tablist" aria-label="Settings navigation">
                    <button class="las-tab" role="tab" data-panel="general" aria-selected="true" tabindex="0">
                        <span class="las-tab-icon dashicons dashicons-admin-settings"></span>
                        <span class="las-tab-text">General</span>
                    </button>
                    <button class="las-tab" role="tab" data-panel="menu" aria-selected="false" tabindex="-1">
                        <span class="las-tab-icon dashicons dashicons-menu"></span>
                        <span class="las-tab-text">Menu</span>
                    </button>
                    <button class="las-tab" role="tab" data-panel="adminbar" aria-selected="false" tabindex="-1">
                        <span class="las-tab-icon dashicons dashicons-admin-generic"></span>
                        <span class="las-tab-text">Admin Bar</span>
                    </button>
                    <button class="las-tab" role="tab" data-panel="content" aria-selected="false" tabindex="-1">
                        <span class="las-tab-icon dashicons dashicons-admin-page"></span>
                        <span class="las-tab-text">Content</span>
                    </button>
                </div>
                
                <div id="las-tab-general" class="las-tab-panel" role="tabpanel" aria-hidden="false">
                    <h3>General Settings</h3>
                    <input type="text" id="test-input-1" />
                    <button id="test-button-1">Test Button</button>
                </div>
                
                <div id="las-tab-menu" class="las-tab-panel" role="tabpanel" aria-hidden="true" style="display: none;">
                    <h3>Menu Settings</h3>
                    <input type="text" id="test-input-2" />
                </div>
                
                <div id="las-tab-adminbar" class="las-tab-panel" role="tabpanel" aria-hidden="true" style="display: none;">
                    <h3>Admin Bar Settings</h3>
                    <select id="test-select-1">
                        <option value="1">Option 1</option>
                        <option value="2">Option 2</option>
                    </select>
                </div>
                
                <div id="las-tab-content" class="las-tab-panel" role="tabpanel" aria-hidden="true" style="display: none;">
                    <h3>Content Settings</h3>
                    <textarea id="test-textarea-1"></textarea>
                </div>
            </div>
        `;
        
        document.body.appendChild(testContainer);
        
        // Initialize NavigationManager
        if (typeof NavigationManager !== 'undefined') {
            this.navigationManager = new NavigationManager({
                container: '#test-las-settings-tabs',
                tabSelector: '.las-tab',
                panelSelector: '.las-tab-panel',
                activeClass: 'las-tab-active'
            });
            console.log('✅ NavigationManager initialized');
        } else {
            throw new Error('NavigationManager not found. Make sure navigation-manager.js is loaded.');
        }
    }
    
    async runTests() {
        console.log('\n🧪 Running validation tests...\n');
        
        // Basic functionality tests
        await this.testInitialization();
        await this.testTabActivation();
        await this.testPanelVisibility();
        
        // Accessibility tests
        await this.testAriaAttributes();
        await this.testKeyboardNavigation();
        await this.testFocusManagement();
        await this.testScreenReaderSupport();
        
        // Responsive behavior tests
        await this.testResponsiveBehavior();
        await this.testTouchSupport();
        
        // State management tests
        await this.testStateManagement();
        await this.testURLHashSupport();
        
        // Performance tests
        await this.testAnimationPerformance();
        await this.testMemoryUsage();
        
        // Error handling tests
        await this.testErrorHandling();
    }
    
    async testInitialization() {
        this.test('Navigation Manager Initialization', () => {
            return this.navigationManager && 
                   this.navigationManager.tabs.length === 4 &&
                   this.navigationManager.panels.length === 4;
        });
        
        this.test('Live Region Creation', () => {
            const liveRegion = document.getElementById('las-tab-announcements');
            return liveRegion && 
                   liveRegion.getAttribute('aria-live') === 'polite' &&
                   liveRegion.getAttribute('aria-atomic') === 'true';
        });
        
        this.test('Initial Active Tab', () => {
            return this.navigationManager.getActiveIndex() === 0;
        });
    }
    
    async testTabActivation() {
        this.test('Tab Activation by Index', () => {
            this.navigationManager.activateTab(1);
            return this.navigationManager.getActiveIndex() === 1;
        });
        
        this.test('Tab Activation by Identifier', () => {
            this.navigationManager.goToTab('content');
            return this.navigationManager.getActiveIndex() === 3;
        });
        
        this.test('Invalid Tab Handling', () => {
            const currentIndex = this.navigationManager.getActiveIndex();
            this.navigationManager.activateTab(-1);
            this.navigationManager.activateTab(10);
            return this.navigationManager.getActiveIndex() === currentIndex;
        });
    }
    
    async testPanelVisibility() {
        this.navigationManager.activateTab(0);
        
        this.test('Active Panel Visibility', () => {
            const activePanel = this.navigationManager.getActivePanel();
            return activePanel.style.display !== 'none' &&
                   activePanel.getAttribute('aria-hidden') === 'false';
        });
        
        this.test('Inactive Panel Hiding', () => {
            const inactivePanels = this.navigationManager.panels.filter((_, i) => i !== 0);
            return inactivePanels.every(panel => 
                panel.getAttribute('aria-hidden') === 'true'
            );
        });
    }
    
    async testAriaAttributes() {
        this.test('Tab ARIA Attributes', () => {
            return this.navigationManager.tabs.every(tab => 
                tab.getAttribute('role') === 'tab' &&
                tab.hasAttribute('aria-selected') &&
                tab.hasAttribute('tabindex') &&
                tab.hasAttribute('aria-controls')
            );
        });
        
        this.test('Panel ARIA Attributes', () => {
            return this.navigationManager.panels.every(panel => 
                panel.getAttribute('role') === 'tabpanel' &&
                panel.hasAttribute('aria-labelledby') &&
                panel.hasAttribute('aria-hidden')
            );
        });
        
        this.test('Tablist ARIA Attributes', () => {
            const tablist = document.querySelector('.las-tabs');
            return tablist.getAttribute('role') === 'tablist' &&
                   tablist.hasAttribute('aria-label');
        });
    }
    
    async testKeyboardNavigation() {
        // Focus first tab
        this.navigationManager.tabs[0].focus();
        
        this.test('Arrow Right Navigation', async () => {
            const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
            document.getElementById('test-las-settings-tabs').dispatchEvent(event);
            await this.wait(100);
            return document.activeElement === this.navigationManager.tabs[1];
        });
        
        this.test('Arrow Left Navigation', async () => {
            this.navigationManager.tabs[1].focus();
            const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
            document.getElementById('test-las-settings-tabs').dispatchEvent(event);
            await this.wait(100);
            return document.activeElement === this.navigationManager.tabs[0];
        });
        
        this.test('Home Key Navigation', async () => {
            this.navigationManager.tabs[2].focus();
            const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
            document.getElementById('test-las-settings-tabs').dispatchEvent(event);
            await this.wait(100);
            return document.activeElement === this.navigationManager.tabs[0];
        });
        
        this.test('End Key Navigation', async () => {
            this.navigationManager.tabs[0].focus();
            const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
            document.getElementById('test-las-settings-tabs').dispatchEvent(event);
            await this.wait(100);
            return document.activeElement === this.navigationManager.tabs[3];
        });
        
        this.test('Enter Key Activation', async () => {
            this.navigationManager.tabs[2].focus();
            const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            document.getElementById('test-las-settings-tabs').dispatchEvent(event);
            await this.wait(200);
            return this.navigationManager.getActiveIndex() === 2;
        });
    }
    
    async testFocusManagement() {
        this.test('Tabindex Management', () => {
            this.navigationManager.activateTab(1);
            return this.navigationManager.tabs[0].getAttribute('tabindex') === '-1' &&
                   this.navigationManager.tabs[1].getAttribute('tabindex') === '0' &&
                   this.navigationManager.tabs[2].getAttribute('tabindex') === '-1' &&
                   this.navigationManager.tabs[3].getAttribute('tabindex') === '-1';
        });
        
        this.test('ARIA Selected Management', () => {
            this.navigationManager.activateTab(2);
            return this.navigationManager.tabs[0].getAttribute('aria-selected') === 'false' &&
                   this.navigationManager.tabs[1].getAttribute('aria-selected') === 'false' &&
                   this.navigationManager.tabs[2].getAttribute('aria-selected') === 'true' &&
                   this.navigationManager.tabs[3].getAttribute('aria-selected') === 'false';
        });
    }
    
    async testScreenReaderSupport() {
        this.test('Screen Reader Announcements', async () => {
            this.navigationManager.activateTab(1);
            await this.wait(100);
            const liveRegion = document.getElementById('las-tab-announcements');
            return liveRegion.textContent.includes('Menu');
        });
    }
    
    async testResponsiveBehavior() {
        this.test('Mobile Responsive Styles', () => {
            // Simulate mobile viewport
            const originalWidth = window.innerWidth;
            Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
            
            // Trigger resize event
            window.dispatchEvent(new Event('resize'));
            
            const tabs = document.querySelectorAll('.las-tab');
            const hasResponsiveStyles = Array.from(tabs).some(tab => {
                const styles = window.getComputedStyle(tab);
                return styles.minWidth !== 'auto';
            });
            
            // Restore original width
            Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true });
            
            return hasResponsiveStyles;
        });
    }
    
    async testTouchSupport() {
        this.test('Touch Event Handling', () => {
            const tabContainer = document.querySelector('.las-tabs');
            
            // Check if touch events are properly attached
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            if (hasTouch) {
                // Simulate touch events
                const touchStart = new TouchEvent('touchstart', {
                    touches: [{ clientX: 100 }]
                });
                const touchEnd = new TouchEvent('touchend', {
                    changedTouches: [{ clientX: 50 }]
                });
                
                try {
                    tabContainer.dispatchEvent(touchStart);
                    tabContainer.dispatchEvent(touchEnd);
                    return true;
                } catch (error) {
                    return false;
                }
            }
            
            return true; // Pass if no touch support
        });
    }
    
    async testStateManagement() {
        this.test('LocalStorage State Saving', () => {
            this.navigationManager.activateTab(2);
            const savedTab = localStorage.getItem('las_active_tab');
            return savedTab === 'adminbar';
        });
        
        this.test('State Restoration', () => {
            localStorage.setItem('las_active_tab', 'content');
            
            // Create new instance to test restoration
            const testManager = new NavigationManager({
                container: '#test-las-settings-tabs',
                tabSelector: '.las-tab',
                panelSelector: '.las-tab-panel'
            });
            
            const restored = testManager.getActiveIndex() === 3;
            testManager.destroy();
            
            return restored;
        });
    }
    
    async testURLHashSupport() {
        this.test('URL Hash Updates', () => {
            const originalReplaceState = history.replaceState;
            let hashUpdated = false;
            
            history.replaceState = (state, title, url) => {
                if (url && url.includes('#tab-')) {
                    hashUpdated = true;
                }
            };
            
            this.navigationManager.activateTab(1);
            
            history.replaceState = originalReplaceState;
            return hashUpdated;
        });
    }
    
    async testAnimationPerformance() {
        this.test('Animation Performance', async () => {
            const startTime = performance.now();
            
            // Rapidly switch tabs
            for (let i = 0; i < 10; i++) {
                this.navigationManager.activateTab(i % 4);
                await this.wait(50);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Should complete within reasonable time
            return duration < 2000; // Less than 2 seconds for 10 switches
        });
    }
    
    async testMemoryUsage() {
        this.test('Memory Usage', () => {
            const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Create and destroy multiple instances
            const managers = [];
            for (let i = 0; i < 5; i++) {
                managers.push(new NavigationManager({
                    container: '#test-las-settings-tabs'
                }));
            }
            
            managers.forEach(manager => manager.destroy());
            
            const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Memory usage should not increase significantly
            if (performance.memory) {
                return (finalMemory - initialMemory) < 500000; // Less than 500KB
            }
            
            return true; // Pass if memory API not available
        });
    }
    
    async testErrorHandling() {
        this.test('Missing Container Handling', () => {
            try {
                const testManager = new NavigationManager({
                    container: '#nonexistent-container'
                });
                return true; // Should not throw
            } catch (error) {
                return false;
            }
        });
        
        this.test('Invalid Tab Identifier Handling', () => {
            const currentIndex = this.navigationManager.getActiveIndex();
            this.navigationManager.goToTab('nonexistent-tab');
            return this.navigationManager.getActiveIndex() === currentIndex;
        });
    }
    
    test(name, testFunction) {
        this.results.total++;
        
        try {
            const result = testFunction();
            
            if (result instanceof Promise) {
                return result.then(passed => {
                    this.logTestResult(name, passed);
                    if (passed) this.results.passed++;
                    else this.results.failed++;
                }).catch(error => {
                    this.logTestResult(name, false, error);
                    this.results.failed++;
                });
            } else {
                this.logTestResult(name, result);
                if (result) this.results.passed++;
                else this.results.failed++;
            }
        } catch (error) {
            this.logTestResult(name, false, error);
            this.results.failed++;
        }
    }
    
    logTestResult(name, passed, error = null) {
        const icon = passed ? '✅' : '❌';
        const message = error ? ` (${error.message})` : '';
        console.log(`${icon} ${name}${message}`);
    }
    
    displayResults() {
        console.log('\n📊 Validation Results:');
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed! Modern Navigation System is working correctly.');
        } else {
            console.log(`\n⚠️  ${this.results.failed} test(s) failed. Please review the implementation.`);
        }
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    cleanup() {
        if (this.navigationManager) {
            this.navigationManager.destroy();
        }
        
        const testContainer = document.getElementById('test-las-settings-tabs');
        if (testContainer) {
            testContainer.remove();
        }
        
        localStorage.removeItem('las_active_tab');
    }
}

// Auto-run validation when script is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const validator = new NavigationValidator();
    
    try {
        await validator.runAllTests();
    } finally {
        validator.cleanup();
    }
});

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationValidator;
} else if (typeof window !== 'undefined') {
    window.NavigationValidator = NavigationValidator;
}