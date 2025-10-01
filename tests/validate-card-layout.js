/**
 * Simple validation test for CardLayout
 */

// Mock environment
global.document = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        innerHTML: '',
        style: {
            setProperty: () => {},
            getProperty: () => null
        },
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
        closest: () => null,
        offsetWidth: 1024
    }),
    querySelector: () => null,
    addEventListener: () => {},
    body: {
        appendChild: () => {},
        classList: {
            toggle: () => {}
        }
    }
};

global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {}
    }),
    IntersectionObserver: function() {
        return {
            observe: () => {},
            unobserve: () => {},
            disconnect: () => {}
        };
    },
    CSS: {
        supports: () => true
    }
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

// Import and test CardLayout
import('../assets/js/modules/card-layout.js').then(module => {
    const CardLayout = module.default;
    
    console.log('🧪 Testing CardLayout...');
    
    try {
        // Test 1: Initialization
        const cardLayout = new CardLayout(mockCore);
        console.log('✅ CardLayout initialized successfully');
        
        // Test 2: Backdrop filter support check
        console.log('✅ Backdrop filter support:', cardLayout.supportsBackdropFilter);
        
        // Test 3: Container creation
        const mockContainer = document.createElement('div');
        const container = cardLayout.createContainer(mockContainer, {
            id: 'test-container',
            layout: 'grid',
            columns: 3,
            gap: '24px'
        });
        console.log('✅ Container created successfully:', container.id);
        
        // Test 4: Card creation - basic
        const basicCard = cardLayout.createCard('test-container', {
            id: 'basic-card',
            title: 'Test Card',
            content: 'This is a test card',
            variant: 'elevated'
        });
        console.log('✅ Basic card created successfully:', basicCard.id);
        
        // Test 5: Card creation - with all options
        const fullCard = cardLayout.createCard('test-container', {
            id: 'full-card',
            title: 'Full Featured Card',
            content: 'This card has all features',
            image: { src: 'test.jpg', alt: 'Test image' },
            variant: 'glass',
            size: 'large',
            interactive: true,
            actions: [
                {
                    label: 'Primary Action',
                    variant: 'filled',
                    onClick: () => console.log('Primary action clicked')
                },
                {
                    label: 'Secondary Action',
                    variant: 'text',
                    onClick: () => console.log('Secondary action clicked')
                }
            ]
        });
        console.log('✅ Full featured card created successfully:', fullCard.id);
        
        // Test 6: Card update
        cardLayout.updateCard('basic-card', {
            title: 'Updated Card Title',
            loading: true
        });
        console.log('✅ Card updated successfully');
        
        // Test 7: Container state
        const containerState = cardLayout.getContainerState('test-container');
        console.log('✅ Container state retrieved:', containerState.cardCount, 'cards');
        
        // Test 8: Card state
        const cardState = cardLayout.getCardState('basic-card');
        console.log('✅ Card state retrieved:', cardState.title);
        
        // Test 9: Container layout update
        cardLayout.updateContainerLayout('test-container', {
            layout: 'flex',
            gap: '32px'
        });
        console.log('✅ Container layout updated successfully');
        
        // Test 10: Responsive setup
        cardLayout.setupResponsive();
        console.log('✅ Responsive behavior setup successfully');
        
        // Test 11: Card removal
        cardLayout.removeCard('full-card');
        console.log('✅ Card removed successfully');
        
        // Test 12: Cleanup
        cardLayout.destroy();
        console.log('✅ CardLayout destroyed successfully');
        
        console.log('\n🎉 All CardLayout tests passed!');
        
    } catch (error) {
        console.error('❌ CardLayout test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Failed to import CardLayout:', error.message);
    process.exit(1);
});