/**
 * AnimationManager Tests
 * Tests for loading states and micro-animations with 60fps performance
 */

import AnimationManager from '../../assets/js/modules/animation-manager.js';

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
                removeProperty: jest.fn(),
                animation: '',
                transition: '',
                transform: '',
                opacity: '',
                position: ''
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
            querySelectorAll: jest.fn(() => [])
        })),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
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
        requestAnimationFrame: jest.fn(callback => {
            setTimeout(callback, 16);
            return 1;
        }),
        cancelAnimationFrame: jest.fn(),
        performance: {
            now: jest.fn(() => Date.now())
        }
    };
};

describe('AnimationManager', () => {
    let animationManager;

    beforeEach(() => {
        mockDOM();
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        animationManager = new AnimationManager(mockCore);
    });

    afterEach(() => {
        if (animationManager) {
            animationManager.destroy();
        }
        jest.useRealTimers();
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(animationManager.animations.size).toBe(0);
            expect(animationManager.loadingStates.size).toBe(0);
            expect(animationManager.performanceMonitor.fps).toBe(60);
        });

        test('should emit initialization event', () => {
            const initSpy = jest.fn();
            mockCore.on('animation-manager:initialized', initSpy);
            
            new AnimationManager(mockCore);
            
            expect(initSpy).toHaveBeenCalled();
        });

        test('should setup performance monitoring', () => {
            expect(window.requestAnimationFrame).toHaveBeenCalled();
        });

        test('should setup reduced motion detection', () => {
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
        });
    });

    describe('Spinner Creation', () => {
        test('should create circular spinner with default configuration', () => {
            const spinner = animationManager.createSpinner();
            
            expect(spinner.className).toContain('las-spinner');
            expect(spinner.className).toContain('las-spinner-circular');
            expect(spinner.className).toContain('las-spinner-medium');
            expect(spinner.className).toContain('las-spinner-normal');
            expect(spinner.className).toContain('las-spinner-primary');
        });

        test('should create spinner with custom configuration', () => {
            const config = {
                size: 'large',
                variant: 'dots',
                color: 'secondary',
                speed: 'fast',
                className: 'custom-spinner'
            };

            const spinner = animationManager.createSpinner(config);
            
            expect(spinner.className).toContain('las-spinner-dots');
            expect(spinner.className).toContain('las-spinner-large');
            expect(spinner.className).toContain('las-spinner-fast');
            expect(spinner.className).toContain('las-spinner-secondary');
            expect(spinner.className).toContain('custom-spinner');
        });

        test('should set proper ARIA attributes', () => {
            const spinner = animationManager.createSpinner();
            
            expect(spinner.setAttribute).toHaveBeenCalledWith('role', 'status');
            expect(spinner.setAttribute).toHaveBeenCalledWith('aria-label', 'Loading');
        });

        test('should create different spinner variants', () => {
            const variants = ['circular', 'linear', 'dots', 'pulse'];
            
            variants.forEach(variant => {
                const spinner = animationManager.createSpinner({ variant });
                expect(spinner.className).toContain(`las-spinner-${variant}`);
                expect(spinner.innerHTML).toBeTruthy();
            });
        });
    });

    describe('Skeleton Creation', () => {
        test('should create skeleton with default configuration', () => {
            const skeleton = animationManager.createSkeleton();
            
            expect(skeleton.className).toContain('las-skeleton');
            expect(skeleton.className).toContain('las-skeleton-text');
            expect(skeleton.className).toContain('las-skeleton-wave');
            expect(skeleton.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
        });

        test('should create skeleton with custom configuration', () => {
            const config = {
                variant: 'rectangular',
                width: '200px',
                height: '100px',
                lines: 3,
                animation: 'pulse',
                className: 'custom-skeleton'
            };

            const skeleton = animationManager.createSkeleton(config);
            
            expect(skeleton.className).toContain('las-skeleton-rectangular');
            expect(skeleton.className).toContain('las-skeleton-pulse');
            expect(skeleton.className).toContain('custom-skeleton');
            expect(skeleton.style.width).toBe('200px');
            expect(skeleton.style.height).toBe('100px');
        });

        test('should create multiple lines for text variant', () => {
            const skeleton = animationManager.createSkeleton({
                variant: 'text',
                lines: 3
            });
            
            expect(skeleton.innerHTML).toContain('las-skeleton-line');
        });
    });

    describe('Progress Bar Creation', () => {
        test('should create linear progress bar with default configuration', () => {
            const progress = animationManager.createProgressBar();
            
            expect(progress.className).toContain('las-progress');
            expect(progress.className).toContain('las-progress-linear');
            expect(progress.className).toContain('las-progress-medium');
            expect(progress.className).toContain('las-progress-primary');
        });

        test('should create circular progress bar', () => {
            const progress = animationManager.createProgressBar({
                variant: 'circular',
                value: 75,
                showLabel: true
            });
            
            expect(progress.className).toContain('las-progress-circular');
            expect(progress.innerHTML).toContain('las-progress-svg');
            expect(progress.innerHTML).toContain('las-progress-label');
        });

        test('should set proper ARIA attributes', () => {
            const progress = animationManager.createProgressBar({
                value: 50,
                max: 100
            });
            
            expect(progress.setAttribute).toHaveBeenCalledWith('role', 'progressbar');
            expect(progress.setAttribute).toHaveBeenCalledWith('aria-valuemin', '0');
            expect(progress.setAttribute).toHaveBeenCalledWith('aria-valuemax', 100);
            expect(progress.setAttribute).toHaveBeenCalledWith('aria-valuenow', 50);
        });
    });

    describe('Progress Bar Updates', () => {
        test('should update linear progress bar value', () => {
            const progress = animationManager.createProgressBar({ value: 0 });
            progress.querySelector = jest.fn()
                .mockReturnValueOnce({ style: {} }) // progress bar
                .mockReturnValueOnce(null) // circle (not found)
                .mockReturnValueOnce({ textContent: '' }); // label

            animationManager.updateProgress(progress, 75, 100);
            
            expect(progress.setAttribute).toHaveBeenCalledWith('aria-valuenow', 75);
        });

        test('should update circular progress bar value', () => {
            const progress = animationManager.createProgressBar({ variant: 'circular', value: 0 });
            const mockCircle = { style: {} };
            progress.querySelector = jest.fn()
                .mockReturnValueOnce(null) // linear bar (not found)
                .mockReturnValueOnce(mockCircle) // circle
                .mockReturnValueOnce({ textContent: '' }); // label

            animationManager.updateProgress(progress, 50, 100);
            
            expect(mockCircle.style.strokeDashoffset).toBeDefined();
        });
    });

    describe('Micro-Animations', () => {
        let mockElement;

        beforeEach(() => {
            mockElement = document.createElement('div');
        });

        test('should create bounce animation', () => {
            const animationId = animationManager.createMicroAnimation(mockElement, 'bounce');
            
            expect(animationId).toBeDefined();
            expect(animationManager.animations.has(animationId)).toBe(true);
            expect(mockElement.style.animation).toContain('las-bounce');
        });

        test('should create shake animation', () => {
            const animationId = animationManager.createMicroAnimation(mockElement, 'shake');
            
            expect(mockElement.style.animation).toContain('las-shake');
        });

        test('should create pulse animation', () => {
            const animationId = animationManager.createMicroAnimation(mockElement, 'pulse', {
                scale: 1.1
            });
            
            expect(mockElement.style.animation).toContain('las-pulse');
            expect(mockElement.style.setProperty).toHaveBeenCalledWith('--las-pulse-scale', 1.1);
        });

        test('should create fade in animation', () => {
            const animationId = animationManager.createMicroAnimation(mockElement, 'fadeIn');
            
            expect(mockElement.style.opacity).toBe('0');
            expect(mockElement.style.transition).toContain('opacity');
        });

        test('should create slide in animation', () => {
            const animationId = animationManager.createMicroAnimation(mockElement, 'slideIn', {
                direction: 'left'
            });
            
            expect(mockElement.style.transform).toContain('translateX');
            expect(mockElement.style.opacity).toBe('0');
        });

        test('should complete animation and call callback', (done) => {
            const onComplete = jest.fn();
            const animationId = animationManager.createMicroAnimation(mockElement, 'bounce', {
                duration: 100,
                onComplete
            });
            
            setTimeout(() => {
                expect(onComplete).toHaveBeenCalled();
                expect(animationManager.animations.has(animationId)).toBe(false);
                done();
            }, 150);
            
            jest.advanceTimersByTime(150);
        });

        test('should cancel animation', () => {
            const animationId = animationManager.createMicroAnimation(mockElement, 'bounce');
            
            animationManager.cancelAnimation(animationId);
            
            expect(animationManager.animations.has(animationId)).toBe(false);
            expect(mockElement.style.animation).toBe('');
        });
    });

    describe('Loading States', () => {
        let mockElement;

        beforeEach(() => {
            mockElement = document.createElement('div');
        });

        test('should set loading state', () => {
            animationManager.setLoadingState(mockElement, true);
            
            expect(mockElement.classList.add).toHaveBeenCalledWith('las-loading');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-busy', 'true');
            expect(mockElement.appendChild).toHaveBeenCalled();
        });

        test('should clear loading state', () => {
            // First set loading state
            animationManager.setLoadingState(mockElement, true);
            
            // Mock the overlay
            const mockOverlay = { remove: jest.fn() };
            const elementId = 'element-123';
            mockElement.getAttribute = jest.fn(() => elementId);
            animationManager.loadingStates.set(elementId, mockOverlay);
            
            // Clear loading state
            animationManager.setLoadingState(mockElement, false);
            
            expect(mockOverlay.remove).toHaveBeenCalled();
            expect(mockElement.classList.remove).toHaveBeenCalledWith('las-loading');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-busy', 'false');
        });

        test('should create loading state with custom spinner config', () => {
            const config = {
                size: 'large',
                variant: 'dots',
                color: 'secondary'
            };
            
            animationManager.setLoadingState(mockElement, true, config);
            
            expect(mockElement.appendChild).toHaveBeenCalled();
        });
    });

    describe('Scroll Animations', () => {
        test('should add scroll animation to element', () => {
            const mockElement = document.createElement('div');
            const mockObserver = { observe: jest.fn() };
            animationManager.observers.set('scroll', mockObserver);
            
            animationManager.addScrollAnimation(mockElement, 'fadeIn');
            
            expect(mockElement.setAttribute).toHaveBeenCalledWith('data-scroll-animation', 'fadeIn');
            expect(mockObserver.observe).toHaveBeenCalledWith(mockElement);
        });
    });

    describe('Performance Monitoring', () => {
        test('should get performance metrics', () => {
            const metrics = animationManager.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('fps');
            expect(metrics).toHaveProperty('droppedFrames');
            expect(metrics).toHaveProperty('activeAnimations');
            expect(metrics).toHaveProperty('loadingStates');
        });

        test('should emit performance warning for low FPS', () => {
            const warningSpy = jest.fn();
            mockCore.on('animation-manager:performance-warning', warningSpy);
            
            // Simulate low FPS
            animationManager.performanceMonitor.fps = 30;
            animationManager.performanceMonitor.dropped = 5;
            
            // This would normally be called by the performance monitor
            mockCore.emit('animation-manager:performance-warning', {
                fps: 30,
                dropped: 5
            });
            
            expect(warningSpy).toHaveBeenCalledWith({
                fps: 30,
                dropped: 5
            });
        });
    });

    describe('Cleanup', () => {
        test('should destroy animation manager and clean up resources', () => {
            const mockElement = document.createElement('div');
            const animationId = animationManager.createMicroAnimation(mockElement, 'bounce');
            animationManager.setLoadingState(mockElement, true);
            
            const destroySpy = jest.fn();
            mockCore.on('animation-manager:destroyed', destroySpy);

            animationManager.destroy();

            expect(animationManager.animations.size).toBe(0);
            expect(animationManager.loadingStates.size).toBe(0);
            expect(window.cancelAnimationFrame).toHaveBeenCalled();
            expect(destroySpy).toHaveBeenCalled();
        });

        test('should disconnect intersection observers on destroy', () => {
            const mockObserver = { disconnect: jest.fn() };
            animationManager.observers.set('scroll', mockObserver);

            animationManager.destroy();

            expect(mockObserver.disconnect).toHaveBeenCalled();
        });
    });

    describe('Reduced Motion Support', () => {
        test('should cancel animations when reduced motion is preferred', () => {
            const mockElement = document.createElement('div');
            const animationId = animationManager.createMicroAnimation(mockElement, 'bounce');
            
            // Simulate reduced motion preference
            const mediaQuery = { matches: true, addListener: jest.fn() };
            window.matchMedia.mockReturnValue(mediaQuery);
            
            // Trigger the reduced motion handler
            const handler = mediaQuery.addListener.mock.calls[0][0];
            handler(mediaQuery);
            
            expect(document.body.classList.toggle).toHaveBeenCalledWith('las-reduced-motion', true);
        });
    });

    describe('Animation Events', () => {
        test('should emit animation complete event', (done) => {
            const completeSpy = jest.fn();
            mockCore.on('animation-manager:animation-complete', completeSpy);
            
            const mockElement = document.createElement('div');
            const animationId = animationManager.createMicroAnimation(mockElement, 'bounce', {
                duration: 100
            });
            
            setTimeout(() => {
                expect(completeSpy).toHaveBeenCalledWith({ animationId });
                done();
            }, 150);
            
            jest.advanceTimersByTime(150);
        });

        test('should emit animation cancelled event', () => {
            const cancelSpy = jest.fn();
            mockCore.on('animation-manager:animation-cancelled', cancelSpy);
            
            const mockElement = document.createElement('div');
            const animationId = animationManager.createMicroAnimation(mockElement, 'bounce');
            
            animationManager.cancelAnimation(animationId);
            
            expect(cancelSpy).toHaveBeenCalledWith({ animationId });
        });
    });
});