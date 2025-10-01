/**
 * Simple validation test for NavigationManager
 */

// Mock environment
global.document = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        innerHTML: '',
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            toggle: () => {},
            contains: () => false
        },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        insertBefore: () => {},
        remove: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        focus: () => {},
        blur: () => {},
        offsetWidth: 1024
    }),
    querySelector: () => null,
    addEventListener: () => {},
    body: {
        appendChild: () => {}
    }
};

global.window = {
    addEventListener: () => {},
    removeEventListener: () => {}
};

global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

global.ResizeObserver = function() {
    return {
        observe: () => {},
        unobserve: () => {},
        disconnect: () => {}
    };
};

// Mock core
const mockCore = {
    events: new Map(),
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    },
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }
};

// Import and test NavigationManager
import('../assets/js/modules/navigation-manager.js').then(module => {
    const NavigationManager = module.default;
    
    console.log('🧪 Testing NavigationManager...');
    
    try {
        // Test 1: Initialization
        const nav = new NavigationManager(mockCore);
        console.log('✅ NavigationManager initialized successfully');
        
        // Test 2: Container creation
        const mockContainer = document.createElement('div');
        const container = nav.createContainer(mockContainer);
        console.log('✅ Navigation container created successfully');
        
        // Test 3: Add tab
        const tab = nav.addTab({
            id: 'test-tab',
            label: 'Test Tab',
            content: '<div>Test Content</div>'
        });
        console.log('✅ Tab added successfully:', tab.id);
        
        // Test 4: Activate tab
        nav.activateTab('test-tab');
        console.log('✅ Tab activated successfully:', nav.activeTab);
        
        // Test 5: Update badge
        nav.updateBadge('test-tab', '5');
        console.log('✅ Badge updated successfully');
        
        // Test 6: State management
        const state = nav.getState();
        console.log('✅ State retrieved successfully:', state.activeTab);
        
        // Test 7: Keyboard navigation
        const event = { key: 'ArrowRight', preventDefault: () => {} };
        nav.handleKeyNavigation(event, 'test-tab');
        console.log('✅ Keyboard navigation handled successfully');
        
        // Test 8: Responsive layout
        nav.handleResponsiveLayout(600);
        console.log('✅ Responsive layout handled successfully');
        
        // Test 9: Cleanup
        nav.destroy();
        console.log('✅ NavigationManager destroyed successfully');
        
        console.log('\n🎉 All NavigationManager tests passed!');
        
    } catch (error) {
        console.error('❌ NavigationManager test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Failed to import NavigationManager:', error.message);
    process.exit(1);
});