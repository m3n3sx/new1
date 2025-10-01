/**
 * CardLayout Tests
 * Tests for card-based layout system with glassmorphism effects
 */

import CardLayout from '../../assets/js/modules/card-layout.js';

// Mock core system
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

// Mock DOM environment
const mockDOM = () => {
    global.document = {
        createElement: jest.fn((tag) => ({
            tagName: tag.toUpperCase(),
            className: '',
            innerHTML: '',
            style: {
                setProperty: jest.fn(),
                getProperty: jest.fn()
            },
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                toggle: jest.fn(),
                contains: jest.fn()
            },
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            appendChild: jest.fn(),
            remove: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => []),
            closest: jest.fn()
        })),
        querySelector: jest.fn(),
        addEventListener: jest.fn(),
        body: {
            appendChild: jest.fn(),
            classList: {
                toggle: jest.fn()
            }
        }
    };

    global.window = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        matchMedia: jest.fn(() => ({
            matches: false,
            addListener: jest.fn(),
            removeListener: jest.fn()
        })),
        IntersectionObserver: jest.fn(() => ({
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: jest.fn()
        })),
        CSS: {
            supports: jest.fn(() => true)
        }
    };
};

describe('CardLayout', () => {
    let cardLayout;
    let mockContainer;

    beforeEach(() => {
        mockDOM();
        jest.clearAllMocks();
        
        mockContainer = document.createElement('div');
        cardLayout = new CardLayout(mockCore);
    });

    afterEach(() => {
        if (cardLayout) {
            cardLayout.destroy();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(cardLayout.cards.size).toBe(0);
            expect(cardLayout.containers.size).toBe(0);
            expect(cardLayout.supportsBackdropFilter).toBeDefined();
        });

        test('should emit initialization event', () => {
            const initSpy = jest.fn();
            mockCore.on('card-layout:initialized', initSpy);
            
            new CardLayout(mockCore);
            
            expect(initSpy).toHaveBeenCalled();
        });

        test('should check backdrop-filter support', () => {
            expect(window.CSS.supports).toHaveBeenCalledWith('backdrop-filter', 'blur(1px)');
        });
    });

    describe('Container Management', () => {
        test('should create container with default configuration', () => {
            const container = cardLayout.createContainer(mockContainer);
            
            expect(container.id).toBeDefined();
            expect(container.layout).toBe('grid');
            expect(container.element.className).toContain('las-card-container');
            expect(container.element.className).toContain('las-card-grid');
        });

        test('should create container with custom configuration', () => {
            const config = {
                id: 'custom-container',
                layout: 'flex',
                columns: 3,
                gap: '32px',
                responsive: false,
                className: 'custom-class'
            };

            const container = cardLayout.createContainer(mockContainer, config);
            
            expect(container.id).toBe('custom-container');
            expect(container.layout).toBe('flex');
            expect(container.columns).toBe(3);
            expect(container.gap).toBe('32px');
            expect(container.responsive).toBe(false);
            expect(container.element.className).toContain('custom-class');
        });

        test('should set CSS custom properties for layout', () => {
            const config = {
                gap: '20px',
                columns: 4
            };

            const container = cardLayout.createContainer(mockContainer, config);
            
            expect(container.element.style.setProperty).toHaveBeenCalledWith('--las-card-gap', '20px');
            expect(container.element.style.setProperty).toHaveBeenCalledWith('--las-card-columns', 4);
        });

        test('should emit container creation event', () => {
            const createSpy = jest.fn();
            mockCore.on('card-layout:container-created', createSpy);
            
            const container = cardLayout.createContainer(mockContainer, { id: 'test-container' });
            
            expect(createSpy).toHaveBeenCalledWith({ containerId: 'test-container' });
        });
    });

    describe('Card Creation', () => {
        let containerId;

        beforeEach(() => {
            const container = cardLayout.createContainer(mockContainer, { id: 'test-container' });
            containerId = container.id;
        });

        test('should create card with basic configuration', () => {
            const config = {
                id: 'test-card',
                title: 'Test Card',
                content: 'Test content'
            };

            const card = cardLayout.createCard(containerId, config);
            
            expect(card.id).toBe('test-card');
            expect(card.title).toBe('Test Card');
            expect(card.content).toBe('Test content');
            expect(card.variant).toBe('elevated');
            expect(card.size).toBe('medium');
        });

        test('should create card with all configuration options', () => {
            const config = {
                id: 'full-card',
                title: 'Full Card',
                content: 'Full content',
                image: { src: 'test.jpg', alt: 'Test image' },
                actions: [{ label: 'Action', onClick: jest.fn() }],
                variant: 'glass',
                size: 'large',
                interactive: true,
                loading: true,
                disabled: false
            };

            const card = cardLayout.createCard(containerId, config);
            
            expect(card.variant).toBe('glass');
            expect(card.size).toBe('large');
            expect(card.interactive).toBe(true);
            expect(card.loading).toBe(true);
            expect(card.actions).toHaveLength(1);
        });

        test('should not create card for non-existent container', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const card = cardLayout.createCard('non-existent', { title: 'Test' });
            
            expect(card).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Container with id "non-existent" not found');
            
            consoleSpy.mockRestore();
        });

        test('should add glassmorphism fallback class when not supported', () => {
            cardLayout.supportsBackdropFilter = false;
            
            const card = cardLayout.createCard(containerId, {
                id: 'glass-card',
                variant: 'glass'
            });
            
            expect(card.element.classList.add).toHaveBeenCalledWith('las-card-glass-fallback');
        });

        test('should set proper ARIA attributes for interactive cards', () => {
            const card = cardLayout.createCard(containerId, {
                id: 'interactive-card',
                interactive: true
            });
            
            expect(card.element.setAttribute).toHaveBeenCalledWith('role', 'button');
            expect(card.element.setAttribute).toHaveBeenCalledWith('tabindex', '0');
        });

        test('should emit card creation event', () => {
            const createSpy = jest.fn();
            mockCore.on('card-layout:card-created', createSpy);
            
            cardLayout.createCard(containerId, { id: 'event-card' });
            
            expect(createSpy).toHaveBeenCalledWith({
                cardId: 'event-card',
                containerId: containerId
            });
        });
    });

    describe('Card Updates', () => {
        let containerId, cardId;

        beforeEach(() => {
            const container = cardLayout.createContainer(mockContainer, { id: 'test-container' });
            containerId = container.id;
            
            const card = cardLayout.createCard(containerId, {
                id: 'update-card',
                title: 'Original Title',
                variant: 'elevated',
                size: 'medium'
            });
            cardId = card.id;
        });

        test('should update card content', () => {
            const updates = {
                title: 'Updated Title',
                content: 'Updated content'
            };

            cardLayout.updateCard(cardId, updates);
            
            const card = cardLayout.getCardState(cardId);
            expect(card.title).toBe('Updated Title');
            expect(card.content).toBe('Updated content');
        });

        test('should update card variant and size', () => {
            const updates = {
                variant: 'glass',
                size: 'large'
            };

            cardLayout.updateCard(cardId, updates);
            
            const card = cardLayout.getCardState(cardId);
            expect(card.variant).toBe('glass');
            expect(card.size).toBe('large');
        });

        test('should update loading state', () => {
            cardLayout.updateCard(cardId, { loading: true });
            
            const card = cardLayout.getCardState(cardId);
            expect(card.loading).toBe(true);
            expect(card.element.classList.toggle).toHaveBeenCalledWith('las-card-loading', true);
            expect(card.element.setAttribute).toHaveBeenCalledWith('aria-busy', 'true');
        });

        test('should not update non-existent card', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            cardLayout.updateCard('non-existent', { title: 'Test' });
            
            expect(consoleSpy).toHaveBeenCalledWith('Card with id "non-existent" not found');
            consoleSpy.mockRestore();
        });

        test('should emit card update event', () => {
            const updateSpy = jest.fn();
            mockCore.on('card-layout:card-updated', updateSpy);
            
            const updates = { title: 'New Title' };
            cardLayout.updateCard(cardId, updates);
            
            expect(updateSpy).toHaveBeenCalledWith({ cardId, updates });
        });
    });

    describe('Card Removal', () => {
        let containerId, cardId;

        beforeEach(() => {
            const container = cardLayout.createContainer(mockContainer, { id: 'test-container' });
            containerId = container.id;
            
            const card = cardLayout.createCard(containerId, { id: 'remove-card' });
            cardId = card.id;
        });

        test('should remove card with animation', (done) => {
            const removeSpy = jest.fn();
            mockCore.on('card-layout:card-removed', removeSpy);
            
            cardLayout.removeCard(cardId);
            
            const card = cardLayout.getCardState(cardId);
            expect(card.element.classList.add).toHaveBeenCalledWith('las-card-removing');
            
            // Check that card is removed after timeout
            setTimeout(() => {
                expect(removeSpy).toHaveBeenCalledWith({ cardId });
                done();
            }, 350);
        });

        test('should handle removal of non-existent card gracefully', () => {
            cardLayout.removeCard('non-existent');
            // Should not throw error
            expect(cardLayout.cards.has('non-existent')).toBe(false);
        });
    });

    describe('Container Layout Updates', () => {
        let containerId;

        beforeEach(() => {
            const container = cardLayout.createContainer(mockContainer, { id: 'test-container' });
            containerId = container.id;
        });

        test('should update container layout', () => {
            const updates = {
                layout: 'flex',
                gap: '32px',
                columns: 4
            };

            cardLayout.updateContainerLayout(containerId, updates);
            
            const container = cardLayout.getContainerState(containerId);
            expect(container.layout).toBe('flex');
            expect(container.gap).toBe('32px');
            expect(container.columns).toBe(4);
        });

        test('should emit container update event', () => {
            const updateSpy = jest.fn();
            mockCore.on('card-layout:container-updated', updateSpy);
            
            const updates = { layout: 'masonry' };
            cardLayout.updateContainerLayout(containerId, updates);
            
            expect(updateSpy).toHaveBeenCalledWith({ containerId, updates });
        });
    });

    describe('State Management', () => {
        let containerId, cardId;

        beforeEach(() => {
            const container = cardLayout.createContainer(mockContainer, { id: 'state-container' });
            containerId = container.id;
            
            const card = cardLayout.createCard(containerId, { id: 'state-card', title: 'State Card' });
            cardId = card.id;
        });

        test('should get container state', () => {
            const state = cardLayout.getContainerState(containerId);
            
            expect(state.id).toBe(containerId);
            expect(state.cardCount).toBe(1);
            expect(state.cards).toHaveLength(1);
            expect(state.cards[0].id).toBe(cardId);
        });

        test('should get card state', () => {
            const state = cardLayout.getCardState(cardId);
            
            expect(state.id).toBe(cardId);
            expect(state.title).toBe('State Card');
            expect(state.container).toBe(containerId);
        });

        test('should return null for non-existent container state', () => {
            const state = cardLayout.getContainerState('non-existent');
            expect(state).toBeNull();
        });

        test('should return null for non-existent card state', () => {
            const state = cardLayout.getCardState('non-existent');
            expect(state).toBeNull();
        });
    });

    describe('Responsive Behavior', () => {
        test('should setup responsive media queries', () => {
            cardLayout.setupResponsive();
            
            expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
            expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1023px)');
            expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
        });
    });

    describe('Event Handling', () => {
        let containerId, cardId;

        beforeEach(() => {
            const container = cardLayout.createContainer(mockContainer, { id: 'event-container' });
            containerId = container.id;
            
            const card = cardLayout.createCard(containerId, {
                id: 'event-card',
                interactive: true
            });
            cardId = card.id;
        });

        test('should add event listeners to interactive cards', () => {
            const card = cardLayout.getCardState(cardId);
            
            expect(card.element.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(card.element.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(card.element.addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
            expect(card.element.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
        });

        test('should not add event listeners to non-interactive cards', () => {
            const nonInteractiveCard = cardLayout.createCard(containerId, {
                id: 'non-interactive-card',
                interactive: false
            });
            
            // Should have fewer event listeners (only basic ones)
            expect(nonInteractiveCard.element.addEventListener).not.toHaveBeenCalledWith('click', expect.any(Function));
        });
    });

    describe('Cleanup', () => {
        test('should destroy card layout and clean up resources', () => {
            const container = cardLayout.createContainer(mockContainer, { id: 'cleanup-container' });
            cardLayout.createCard(container.id, { id: 'cleanup-card' });
            
            const destroySpy = jest.fn();
            mockCore.on('card-layout:destroyed', destroySpy);

            cardLayout.destroy();

            expect(cardLayout.cards.size).toBe(0);
            expect(cardLayout.containers.size).toBe(0);
            expect(destroySpy).toHaveBeenCalled();
        });

        test('should disconnect intersection observer on destroy', () => {
            const mockObserver = {
                disconnect: jest.fn(),
                observe: jest.fn(),
                unobserve: jest.fn()
            };
            cardLayout.observer = mockObserver;

            cardLayout.destroy();

            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(cardLayout.observer).toBeNull();
        });
    });

    describe('Accessibility', () => {
        let containerId;

        beforeEach(() => {
            const container = cardLayout.createContainer(mockContainer, { id: 'a11y-container' });
            containerId = container.id;
        });

        test('should set proper ARIA attributes for loading cards', () => {
            const card = cardLayout.createCard(containerId, {
                id: 'loading-card',
                loading: true
            });
            
            expect(card.element.setAttribute).toHaveBeenCalledWith('aria-busy', 'true');
        });

        test('should set proper ARIA attributes for disabled cards', () => {
            const card = cardLayout.createCard(containerId, {
                id: 'disabled-card',
                disabled: true
            });
            
            expect(card.element.setAttribute).toHaveBeenCalledWith('aria-disabled', 'true');
        });

        test('should handle reduced motion preference', () => {
            const mediaQuery = { matches: true, addListener: jest.fn() };
            window.matchMedia.mockReturnValue(mediaQuery);
            
            cardLayout.setupEventListeners();
            
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
        });
    });
});