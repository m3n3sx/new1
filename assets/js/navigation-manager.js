/**
 * Modern Navigation Manager
 * Implements modern tab navigation with accessibility, keyboard support, and responsive behavior
 */

class NavigationManager {
    constructor(options = {}) {
        this.options = {
            container: '.las-tabs-container',
            tabSelector: '.las-tab',
            panelSelector: '.las-tab-panel',
            activeClass: 'las-tab-active',
            transitionDuration: 200,
            enableKeyboard: true,
            enableSwipe: true,
            enableScrolling: true,
            ...options
        };
        
        this.container = null;
        this.tabs = [];
        this.panels = [];
        this.activeIndex = 0;
        this.isTransitioning = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        this.init();
    }
    
    configure(newOptions) {
        // Update options
        this.options = { ...this.options, ...newOptions };
        
        // Re-initialize with new options
        this.init();
    }
    
    init() {
        this.container = document.querySelector(this.options.container);
        if (!this.container) {
            console.warn('NavigationManager: Container not found');
            return;
        }
        
        this.setupTabs();
        this.setupPanels();
        this.setupEventListeners();
        this.setupAccessibility();
        this.restoreActiveTab();
        
        console.log('NavigationManager: Initialized with', this.tabs.length, 'tabs');
    }
    
    setupTabs() {
        // Create modern tab structure if using legacy jQuery UI structure
        const legacyTabs = this.container.querySelector('.ui-tabs-nav');
        if (legacyTabs) {
            this.convertLegacyTabs();
        }
        
        this.tabs = Array.from(this.container.querySelectorAll(this.options.tabSelector));
        
        this.tabs.forEach((tab, index) => {
            tab.setAttribute('role', 'tab');
            tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
            tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            tab.setAttribute('aria-controls', this.getPanelId(tab));
            tab.setAttribute('id', this.getTabId(tab, index));
            
            // Add touch target size
            tab.style.minHeight = '44px';
            tab.style.minWidth = '44px';
        });
    }
    
    setupPanels() {
        this.panels = Array.from(this.container.querySelectorAll(this.options.panelSelector));
        
        this.panels.forEach((panel, index) => {
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('tabindex', '0');
            panel.setAttribute('aria-labelledby', this.getTabId(this.tabs[index], index));
            panel.setAttribute('id', this.getPanelId(this.tabs[index]));
            
            if (index !== 0) {
                panel.style.display = 'none';
                panel.setAttribute('aria-hidden', 'true');
            } else {
                panel.setAttribute('aria-hidden', 'false');
            }
        });
    }
    
    convertLegacyTabs() {
        const legacyNav = this.container.querySelector('.ui-tabs-nav');
        const legacyLinks = legacyNav.querySelectorAll('a');
        
        // Create modern tab container
        const tabContainer = document.createElement('div');
        tabContainer.className = 'las-tabs';
        tabContainer.setAttribute('role', 'tablist');
        tabContainer.setAttribute('aria-label', 'Settings navigation');
        
        legacyLinks.forEach((link, index) => {
            const tab = document.createElement('button');
            tab.className = 'las-tab';
            tab.type = 'button';
            
            // Extract icon and text
            const icon = link.querySelector('.las-tab-icon');
            const text = link.textContent.trim();
            
            if (icon) {
                tab.appendChild(icon.cloneNode(true));
            }
            
            const textSpan = document.createElement('span');
            textSpan.className = 'las-tab-text';
            textSpan.textContent = text;
            tab.appendChild(textSpan);
            
            // Set data attributes for panel association
            const href = link.getAttribute('href');
            if (href) {
                tab.setAttribute('data-panel', href.replace('#', ''));
            }
            
            tabContainer.appendChild(tab);
        });
        
        // Replace legacy navigation
        legacyNav.parentNode.replaceChild(tabContainer, legacyNav);
        
        // Update panels to use modern class
        this.panels = Array.from(this.container.querySelectorAll('[id^="las-tab-"]'));
        this.panels.forEach(panel => {
            panel.classList.add('las-tab-panel');
        });
    }
    
    setupEventListeners() {
        // Tab click handlers
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.activateTab(index);
            });
        });
        
        // Keyboard navigation
        if (this.options.enableKeyboard) {
            this.container.addEventListener('keydown', this.handleKeydown.bind(this));
        }
        
        // Touch/swipe support for mobile
        if (this.options.enableSwipe) {
            this.setupTouchEvents();
        }
        
        // Responsive behavior
        this.setupResponsiveHandlers();
        
        // Focus management
        this.setupFocusManagement();
    }
    
    handleKeydown(e) {
        const focusedTab = document.activeElement;
        const focusedIndex = this.tabs.indexOf(focusedTab);
        
        if (focusedIndex === -1) return;
        
        let newIndex = focusedIndex;
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = focusedIndex > 0 ? focusedIndex - 1 : this.tabs.length - 1;
                break;
                
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = focusedIndex < this.tabs.length - 1 ? focusedIndex + 1 : 0;
                break;
                
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
                
            case 'End':
                e.preventDefault();
                newIndex = this.tabs.length - 1;
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.activateTab(focusedIndex);
                return;
                
            default:
                return;
        }
        
        this.focusTab(newIndex);
    }
    
    setupTouchEvents() {
        const tabContainer = this.container.querySelector('.las-tabs');
        if (!tabContainer) return;
        
        tabContainer.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
        }, { passive: true });
        
        tabContainer.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].clientX;
            this.handleSwipe();
        }, { passive: true });
    }
    
    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) < swipeThreshold) return;
        
        if (diff > 0 && this.activeIndex < this.tabs.length - 1) {
            // Swipe left - next tab
            this.activateTab(this.activeIndex + 1);
        } else if (diff < 0 && this.activeIndex > 0) {
            // Swipe right - previous tab
            this.activateTab(this.activeIndex - 1);
        }
    }
    
    setupResponsiveHandlers() {
        const tabContainer = this.container.querySelector('.las-tabs');
        if (!tabContainer) return;
        
        // Handle horizontal scrolling on mobile
        const handleScroll = () => {
            if (window.innerWidth < 768) {
                this.ensureActiveTabVisible();
            }
        };
        
        window.addEventListener('resize', handleScroll);
        this.activateTab = ((originalActivate) => {
            return function(index) {
                originalActivate.call(this, index);
                handleScroll();
            };
        })(this.activateTab);
    }
    
    ensureActiveTabVisible() {
        const tabContainer = this.container.querySelector('.las-tabs');
        const activeTab = this.tabs[this.activeIndex];
        
        if (!tabContainer || !activeTab) return;
        
        const containerRect = tabContainer.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        
        if (tabRect.left < containerRect.left) {
            tabContainer.scrollLeft -= (containerRect.left - tabRect.left) + 20;
        } else if (tabRect.right > containerRect.right) {
            tabContainer.scrollLeft += (tabRect.right - containerRect.right) + 20;
        }
    }
    
    setupFocusManagement() {
        // Focus trap within tab panels
        this.panels.forEach(panel => {
            const focusableElements = panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            panel.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab') return;
                
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });
        });
    }
    
    setupAccessibility() {
        const tabContainer = this.container.querySelector('.las-tabs');
        if (tabContainer) {
            tabContainer.setAttribute('role', 'tablist');
            tabContainer.setAttribute('aria-label', 'Settings navigation');
        }
        
        // Add live region for screen reader announcements
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'las-sr-only';
        liveRegion.id = 'las-tab-announcements';
        document.body.appendChild(liveRegion);
    }
    
    activateTab(index) {
        if (index < 0 || index >= this.tabs.length || index === this.activeIndex || this.isTransitioning) {
            return;
        }
        
        this.isTransitioning = true;
        const previousIndex = this.activeIndex;
        this.activeIndex = index;
        
        // Update tab states
        this.tabs.forEach((tab, i) => {
            tab.classList.toggle(this.options.activeClass, i === index);
            tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
            tab.setAttribute('tabindex', i === index ? '0' : '-1');
        });
        
        // Update panel states with animation
        this.animatePanelTransition(previousIndex, index);
        
        // Save state
        this.saveActiveTab(index);
        
        // Announce to screen readers
        this.announceTabChange(index);
        
        // Dispatch custom event
        this.dispatchTabChangeEvent(index, previousIndex);
        
        setTimeout(() => {
            this.isTransitioning = false;
        }, this.options.transitionDuration);
    }
    
    animatePanelTransition(fromIndex, toIndex) {
        const fromPanel = this.panels[fromIndex];
        const toPanel = this.panels[toIndex];
        
        if (!fromPanel || !toPanel) return;
        
        // Set up transition
        toPanel.style.display = 'block';
        toPanel.style.opacity = '0';
        toPanel.style.transform = 'translateX(20px)';
        toPanel.setAttribute('aria-hidden', 'false');
        
        // Force reflow
        toPanel.offsetHeight;
        
        // Animate in
        toPanel.style.transition = `opacity ${this.options.transitionDuration}ms ease-out, transform ${this.options.transitionDuration}ms ease-out`;
        toPanel.style.opacity = '1';
        toPanel.style.transform = 'translateX(0)';
        
        // Animate out previous panel
        fromPanel.style.transition = `opacity ${this.options.transitionDuration}ms ease-out`;
        fromPanel.style.opacity = '0';
        
        setTimeout(() => {
            fromPanel.style.display = 'none';
            fromPanel.setAttribute('aria-hidden', 'true');
            
            // Clean up styles
            toPanel.style.transition = '';
            toPanel.style.transform = '';
            fromPanel.style.transition = '';
            fromPanel.style.opacity = '';
        }, this.options.transitionDuration);
    }
    
    focusTab(index) {
        if (index >= 0 && index < this.tabs.length) {
            this.tabs[index].focus();
        }
    }
    
    saveActiveTab(index) {
        const tabId = this.getTabIdentifier(index);
        localStorage.setItem('las_active_tab', tabId);
        
        // Update URL hash
        if (history.replaceState) {
            const newUrl = window.location.pathname + window.location.search + '#tab-' + tabId;
            history.replaceState(null, null, newUrl);
        }
    }
    
    restoreActiveTab() {
        let savedTab = null;
        
        // Check URL hash first
        const hash = window.location.hash;
        if (hash && hash.indexOf('#tab-') === 0) {
            savedTab = hash.replace('#tab-', '');
        }
        
        // Check localStorage
        if (!savedTab) {
            savedTab = localStorage.getItem('las_active_tab');
        }
        
        // Find tab index
        let tabIndex = 0;
        if (savedTab) {
            tabIndex = this.findTabIndex(savedTab);
        }
        
        this.activateTab(tabIndex);
    }
    
    findTabIndex(identifier) {
        return this.tabs.findIndex(tab => {
            const panelId = tab.getAttribute('data-panel') || 
                           tab.getAttribute('aria-controls') || 
                           this.getPanelId(tab);
            return panelId === identifier || panelId === 'las-tab-' + identifier;
        });
    }
    
    getTabIdentifier(index) {
        const tab = this.tabs[index];
        if (!tab) return 'general';
        
        const panelId = tab.getAttribute('data-panel') || 
                       tab.getAttribute('aria-controls') || 
                       this.getPanelId(tab);
        
        return panelId.replace('las-tab-', '');
    }
    
    getTabId(tab, index) {
        return `las-tab-button-${index}`;
    }
    
    getPanelId(tab) {
        const dataPanel = tab.getAttribute('data-panel');
        if (dataPanel) {
            return dataPanel.startsWith('las-tab-') ? dataPanel : 'las-tab-' + dataPanel;
        }
        
        // Fallback to href or generate from index
        const href = tab.getAttribute('href');
        if (href) {
            return href.replace('#', '');
        }
        
        return 'las-tab-general';
    }
    
    announceTabChange(index) {
        const tab = this.tabs[index];
        const tabText = tab.querySelector('.las-tab-text')?.textContent || tab.textContent;
        const announcement = `Switched to ${tabText} tab`;
        
        const liveRegion = document.getElementById('las-tab-announcements');
        if (liveRegion) {
            liveRegion.textContent = announcement;
        }
    }
    
    dispatchTabChangeEvent(newIndex, previousIndex) {
        const event = new CustomEvent('las-tab-change', {
            detail: {
                activeIndex: newIndex,
                previousIndex: previousIndex,
                activeTab: this.tabs[newIndex],
                activePanel: this.panels[newIndex],
                tabId: this.getTabIdentifier(newIndex)
            }
        });
        
        this.container.dispatchEvent(event);
    }
    
    // Public API methods
    getActiveIndex() {
        return this.activeIndex;
    }
    
    getActiveTab() {
        return this.tabs[this.activeIndex];
    }
    
    getActivePanel() {
        return this.panels[this.activeIndex];
    }
    
    goToTab(identifier) {
        const index = typeof identifier === 'number' ? identifier : this.findTabIndex(identifier);
        if (index >= 0) {
            this.activateTab(index);
        }
    }
    
    destroy() {
        // Remove event listeners
        this.tabs.forEach(tab => {
            tab.removeEventListener('click', this.activateTab);
        });
        
        this.container.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.ensureActiveTabVisible);
        
        // Remove live region
        const liveRegion = document.getElementById('las-tab-announcements');
        if (liveRegion) {
            liveRegion.remove();
        }
        
        console.log('NavigationManager: Destroyed');
    }
}

// Create global instance and static init method for backward compatibility
NavigationManager.init = function(options) {
    if (!window.lasNavigationManager) {
        window.lasNavigationManager = new NavigationManager(options);
    }
    return window.lasNavigationManager;
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NavigationManager.init();
    });
} else {
    NavigationManager.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
} else if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
}