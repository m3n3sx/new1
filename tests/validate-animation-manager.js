/**
 * Simple validation test for AnimationManager
 */

// Mock environment
global.document = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        innerHTML: '',
        style: {
            setProperty: () => {},
            removeProperty: () => {},
            animation: '',
            transition: '',
            transform: '',
            opacity: '',
            position: ''
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
        remove: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
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
    requestAnimationFrame: (callback) => {
        setTimeout(callback, 16);
        return 1;
    },
    cancelAnimationFrame: () => {},
    performance: {
        now: () => Date.now()
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

// Import and test AnimationManager
import('../assets/js/modules/animation-manager.js').then(module => {
    const AnimationManager = module.default;
    
    console.log('🧪 Testing AnimationManager...');
    
    try {
        // Test 1: Initialization
        const animationManager = new AnimationManager(mockCore);
        console.log('✅ AnimationManager initialized successfully');
        
        // Test 2: Performance monitor setup
        console.log('✅ Performance monitor FPS:', animationManager.performanceMonitor.fps);
        
        // Test 3: Spinner creation - circular
        const circularSpinner = animationManager.createSpinner({
            size: 'medium',
            variant: 'circular',
            color: 'primary'
        });
        console.log('✅ Circular spinner created successfully');
        
        // Test 4: Spinner creation - linear
        const linearSpinner = animationManager.createSpinner({
            variant: 'linear',
            size: 'large'
        });
        console.log('✅ Linear spinner created successfully');
        
        // Test 5: Spinner creation - dots
        const dotsSpinner = animationManager.createSpinner({
            variant: 'dots',
            speed: 'fast'
        });
        console.log('✅ Dots spinner created successfully');
        
        // Test 6: Skeleton creation
        const skeleton = animationManager.createSkeleton({
            variant: 'text',
            lines: 3,
            animation: 'wave'
        });
        console.log('✅ Skeleton loader created successfully');
        
        // Test 7: Progress bar creation - linear
        const linearProgress = animationManager.createProgressBar({
            variant: 'linear',
            value: 50,
            max: 100,
            showLabel: true
        });
        console.log('✅ Linear progress bar created successfully');
        
        // Test 8: Progress bar creation - circular
        const circularProgress = animationManager.createProgressBar({
            variant: 'circular',
            value: 75,
            showLabel: true
        });
        console.log('✅ Circular progress bar created successfully');
        
        // Test 9: Progress bar update
        animationManager.updateProgress(linearProgress, 80, 100);
        console.log('✅ Progress bar updated successfully');
        
        // Test 10: Micro-animation - bounce
        const mockElement = document.createElement('div');
        const bounceId = animationManager.createMicroAnimation(mockElement, 'bounce', {
            duration: 300
        });
        console.log('✅ Bounce animation created:', bounceId);
        
        // Test 11: Micro-animation - shake
        const shakeId = animationManager.createMicroAnimation(mockElement, 'shake', {
            duration: 500
        });
        console.log('✅ Shake animation created:', shakeId);
        
        // Test 12: Micro-animation - pulse
        const pulseId = animationManager.createMicroAnimation(mockElement, 'pulse', {
            duration: 400,
            scale: 1.1
        });
        console.log('✅ Pulse animation created:', pulseId);
        
        // Test 13: Micro-animation - fade in
        const fadeId = animationManager.createMicroAnimation(mockElement, 'fadeIn', {
            duration: 300
        });
        console.log('✅ Fade in animation created:', fadeId);
        
        // Test 14: Micro-animation - slide in
        const slideId = animationManager.createMicroAnimation(mockElement, 'slideIn', {
            duration: 350,
            direction: 'up'
        });
        console.log('✅ Slide in animation created:', slideId);
        
        // Test 15: Loading state
        const loadingElement = document.createElement('div');
        animationManager.setLoadingState(loadingElement, true, {
            variant: 'circular',
            size: 'medium'
        });
        console.log('✅ Loading state set successfully');
        
        // Test 16: Clear loading state
        animationManager.setLoadingState(loadingElement, false);
        console.log('✅ Loading state cleared successfully');
        
        // Test 17: Scroll animation
        const scrollElement = document.createElement('div');
        animationManager.addScrollAnimation(scrollElement, 'fadeIn');
        console.log('✅ Scroll animation added successfully');
        
        // Test 18: Performance metrics
        const metrics = animationManager.getPerformanceMetrics();
        console.log('✅ Performance metrics:', {
            fps: metrics.fps,
            activeAnimations: metrics.activeAnimations,
            loadingStates: metrics.loadingStates
        });
        
        // Test 19: Animation cancellation
        animationManager.cancelAnimation(bounceId);
        console.log('✅ Animation cancelled successfully');
        
        // Test 20: Cleanup
        animationManager.destroy();
        console.log('✅ AnimationManager destroyed successfully');
        
        console.log('\n🎉 All AnimationManager tests passed!');
        
    } catch (error) {
        console.error('❌ AnimationManager test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Failed to import AnimationManager:', error.message);
    process.exit(1);
});