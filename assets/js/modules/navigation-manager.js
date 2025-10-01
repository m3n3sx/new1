/**
 * NavigationManager - Modern navigation system with tab management
 * Implements Material Design 3 inspired navigation with state persistence
 */
export default class NavigationManager {
    constructor(core) {
        this.core = core;
        this.tabs = new Map();
        this.activeTab = null;
        this.container = null;
        this.state = {
            activeTabId: null,
            tabOrder: [],
            collapsedTabs: []
        };
        
        this.init();
    }

    /**
     * Initialize the navigation system
     */
    init() {
        this.loadState();
        this.setupEventListeners();
        this.core.on('navigation:ready', this.render.bind(this));
        this.core.emit('navigation:initialized');
    }

    /**
     * Create navigation container with Material Design 3 styling
     */
    createContainer(parentElement) {
        this.container = document.createElement('nav');
        this.container.className = 'las-navigation';
        this.container.setAttribute('role', 'tablist');
        this.container.setAttribute('aria-label', 'Main navigation');
        
        // Add responsive wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'las-navigation-wrapper';
        wrapper.appendChild(this.container);
        
        parentElement.appendChild(wrapper);
        return this.container;
    }

    /**
     * Add a new tab to the navigation
     */
    addTab(config) {
        const {
            id,
            label,
            icon = null,
            content = null,
            disabled = false,
            closable = false,
            badge = null
        } = config;

        if (this.tabs.has(id)) {
            console.warn(`Tab with id "${id}" already exists`);
            return;
        }

        const tab = {
            id,
            label,
            icon,
            content,
            disabled,
            closable,
            badge,
            element: null,
            contentElement: null,
            active: false
        };

        this.tabs.set(id, tab);
        this.state.tabOrder.push(id);
        
        if (this.container) {
            this.renderTab(tab);
        }

        this.core.emit('navigation:tab-added', { tabId: id });
        return tab;
    }

    /**
     * Remove a tab from the navigation
     */
    removeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        if (tab.element) {
            tab.element.remove();
        }
        if (tab.contentElement) {
            tab.contentElement.remove();
        }

        this.tabs.delete(tabId);
        this.state.tabOrder = this.state.tabOrder.filter(id => id !== tabId);

        // If removing active tab, activate another
        if (this.activeTab === tabId) {
            const nextTab = this.state.tabOrder[0];
            if (nextTab) {
                this.activateTab(nextTab);
            } else {
                this.activeTab = null;
            }
        }

        this.saveState();
        this.core.emit('navigation:tab-removed', { tabId });
    }

    /**
     * Activate a specific tab
     */
    activateTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || tab.disabled) return;

        // Deactivate current tab
        if (this.activeTab) {
            const currentTab = this.tabs.get(this.activeTab);
            if (currentTab) {
                currentTab.active = false;
                currentTab.element?.classList.remove('active');
                currentTab.contentElement?.classList.remove('active');
                currentTab.element?.setAttribute('aria-selected', 'false');
                currentTab.element?.setAttribute('tabindex', '-1');
            }
        }

        // Activate new tab
        tab.active = true;
        this.activeTab = tabId;
        this.state.activeTabId = tabId;

        if (tab.element) {
            tab.element.classList.add('active');
            tab.element.setAttribute('aria-selected', 'true');
            tab.element.setAttribute('tabindex', '0');
            tab.element.focus();
        }

        if (tab.contentElement) {
            tab.contentElement.classList.add('active');
        }

        this.saveState();
        this.core.emit('navigation:tab-activated', { tabId, tab });
    }

    /**
     * Render a single tab element
     */
    renderTab(tab) {
        const tabElement = document.createElement('button');
        tabElement.className = 'las-tab';
        tabElement.setAttribute('role', 'tab');
        tabElement.setAttribute('aria-controls', `las-panel-${tab.id}`);
        tabElement.setAttribute('aria-selected', tab.active ? 'true' : 'false');
        tabElement.setAttribute('tabindex', tab.active ? '0' : '-1');
        tabElement.setAttribute('data-tab-id', tab.id);

        if (tab.disabled) {
            tabElement.disabled = true;
            tabElement.setAttribute('aria-disabled', 'true');
        }

        // Build tab content
        let tabContent = '';
        
        if (tab.icon) {
            tabContent += `<span class="las-tab-icon">${tab.icon}</span>`;
        }
        
        tabContent += `<span class="las-tab-label">${tab.label}</span>`;
        
        if (tab.badge) {
            tabContent += `<span class="las-tab-badge" aria-label="${tab.badge} notifications">${tab.badge}</span>`;
        }
        
        if (tab.closable) {
            tabContent += `<button class="las-tab-close" aria-label="Close ${tab.label} tab" tabindex="-1">×</button>`;
        }

        tabElement.innerHTML = tabContent;
        
        // Add event listeners
        tabElement.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('las-tab-close')) {
                this.removeTab(tab.id);
            } else {
                this.activateTab(tab.id);
            }
        });

        tabElement.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e, tab.id);
        });

        tab.element = tabElement;
        this.container.appendChild(tabElement);

        // Create content panel if content provided
        if (tab.content) {
            this.createContentPanel(tab);
        }
    }

    /**
     * Create content panel for tab
     */
    createContentPanel(tab) {
        const panel = document.createElement('div');
        panel.className = 'las-tab-panel';
        panel.id = `las-panel-${tab.id}`;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.element.id);
        panel.setAttribute('tabindex', '0');

        if (typeof tab.content === 'string') {
            panel.innerHTML = tab.content;
        } else if (tab.content instanceof HTMLElement) {
            panel.appendChild(tab.content);
        }

        if (!tab.active) {
            panel.classList.add('hidden');
        }

        tab.contentElement = panel;
        
        // Find or create content container
        let contentContainer = document.querySelector('.las-tab-content');
        if (!contentContainer) {
            contentContainer = document.createElement('div');
            contentContainer.className = 'las-tab-content';
            if (this.container && this.container.parentElement) {
                this.container.parentElement.appendChild(contentContainer);
            } else {
                // Fallback: append to body or create temporary container
                const fallbackContainer = document.body || document.createElement('div');
                fallbackContainer.appendChild(contentContainer);
            }
        }
        
        contentContainer.appendChild(panel);
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyNavigation(event, currentTabId) {
        const { key } = event;
        const tabIds = this.state.tabOrder.filter(id => !this.tabs.get(id)?.disabled);
        const currentIndex = tabIds.indexOf(currentTabId);

        switch (key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1;
                this.activateTab(tabIds[prevIndex]);
                break;

            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                const nextIndex = currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0;
                this.activateTab(tabIds[nextIndex]);
                break;

            case 'Home':
                event.preventDefault();
                this.activateTab(tabIds[0]);
                break;

            case 'End':
                event.preventDefault();
                this.activateTab(tabIds[tabIds.length - 1]);
                break;

            case 'Delete':
                if (this.tabs.get(currentTabId)?.closable) {
                    event.preventDefault();
                    this.removeTab(currentTabId);
                }
                break;
        }
    }

    /**
     * Update tab badge
     */
    updateBadge(tabId, badge) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.badge = badge;
        
        if (tab.element) {
            const badgeElement = tab.element.querySelector('.las-tab-badge');
            if (badge) {
                if (badgeElement) {
                    badgeElement.textContent = badge;
                    badgeElement.setAttribute('aria-label', `${badge} notifications`);
                } else {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'las-tab-badge';
                    newBadge.textContent = badge;
                    newBadge.setAttribute('aria-label', `${badge} notifications`);
                    tab.element.appendChild(newBadge);
                }
            } else if (badgeElement) {
                badgeElement.remove();
            }
        }
    }

    /**
     * Enable/disable tab
     */
    setTabDisabled(tabId, disabled) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.disabled = disabled;
        
        if (tab.element) {
            tab.element.disabled = disabled;
            tab.element.setAttribute('aria-disabled', disabled ? 'true' : 'false');
            
            if (disabled && this.activeTab === tabId) {
                // Find next available tab
                const availableTab = this.state.tabOrder.find(id => 
                    id !== tabId && !this.tabs.get(id)?.disabled
                );
                if (availableTab) {
                    this.activateTab(availableTab);
                }
            }
        }
    }

    /**
     * Setup responsive behavior
     */
    setupResponsive() {
        if (!this.container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                this.handleResponsiveLayout(width);
            }
        });

        observer.observe(this.container.parentElement);
    }

    /**
     * Handle responsive layout changes
     */
    handleResponsiveLayout(width) {
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;

        this.container.classList.toggle('las-navigation-mobile', isMobile);
        this.container.classList.toggle('las-navigation-tablet', isTablet);
        this.container.classList.toggle('las-navigation-desktop', width >= 1024);

        if (isMobile) {
            this.enableMobileNavigation();
        } else {
            this.disableMobileNavigation();
        }
    }

    /**
     * Enable mobile navigation features
     */
    enableMobileNavigation() {
        // Add mobile menu toggle if not exists
        if (!this.container.querySelector('.las-mobile-toggle')) {
            const toggle = document.createElement('button');
            toggle.className = 'las-mobile-toggle';
            toggle.setAttribute('aria-label', 'Toggle navigation menu');
            toggle.innerHTML = '<span class="las-hamburger"></span>';
            
            toggle.addEventListener('click', () => {
                this.container.classList.toggle('las-navigation-open');
                const isOpen = this.container.classList.contains('las-navigation-open');
                toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            if (this.container.parentElement) {
                this.container.parentElement.insertBefore(toggle, this.container);
            }
        }
    }

    /**
     * Disable mobile navigation features
     */
    disableMobileNavigation() {
        const toggle = this.container.parentElement?.querySelector('.las-mobile-toggle');
        if (toggle) {
            toggle.remove();
        }
        this.container.classList.remove('las-navigation-open');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle window resize for responsive behavior
        window.addEventListener('resize', () => {
            if (this.container && this.container.parentElement) {
                const width = this.container.parentElement.offsetWidth;
                this.handleResponsiveLayout(width);
            }
        });

        // Handle focus management
        document.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('las-tab')) {
                // Ensure proper tab focus management
                const tabId = e.target.getAttribute('data-tab-id');
                if (tabId && this.activeTab !== tabId) {
                    this.activateTab(tabId);
                }
            }
        });
    }

    /**
     * Load navigation state from storage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('las-navigation-state');
            if (saved) {
                this.state = { ...this.state, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load navigation state:', error);
        }
    }

    /**
     * Save navigation state to storage
     */
    saveState() {
        try {
            localStorage.setItem('las-navigation-state', JSON.stringify(this.state));
        } catch (error) {
            console.warn('Failed to save navigation state:', error);
        }
    }

    /**
     * Render the complete navigation system
     */
    render() {
        if (!this.container) return;

        // Clear existing content
        this.container.innerHTML = '';

        // Render tabs in order
        this.state.tabOrder.forEach(tabId => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                this.renderTab(tab);
            }
        });

        // Activate saved tab or first available tab
        if (this.state.activeTabId && this.tabs.has(this.state.activeTabId)) {
            this.activateTab(this.state.activeTabId);
        } else if (this.state.tabOrder.length > 0) {
            this.activateTab(this.state.tabOrder[0]);
        }

        // Setup responsive behavior
        this.setupResponsive();
    }

    /**
     * Get current navigation state
     */
    getState() {
        return {
            activeTab: this.activeTab,
            tabs: Array.from(this.tabs.values()),
            tabOrder: this.state.tabOrder
        };
    }

    /**
     * Destroy navigation system
     */
    destroy() {
        if (this.container) {
            this.container.remove();
        }
        
        this.tabs.clear();
        this.activeTab = null;
        this.container = null;
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResponsiveLayout);
        
        this.core.emit('navigation:destroyed');
    }
}