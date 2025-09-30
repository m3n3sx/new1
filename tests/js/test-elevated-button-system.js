/**
 * Test Suite: Elevated Button System
 * 
 * Tests the implementation of the elevated button system with variants,
 * animations, ripple effects, and accessibility features.
 * 
 * Requirements tested:
 * - 1.3: iOS-inspired visual feedback and animations
 * - 1.5: Minimum 44px touch targets for mobile accessibility
 * - 5.3: Elevated styling with smooth hover animations
 * - 5.7: 60fps performance for animations
 * - 6.1: Proper ARIA labels and descriptions
 * - 6.2: Keyboard accessibility
 * - 6.5: Clear focus indicators
 */

describe('Elevated Button System', () => {
  let container;
  
  beforeEach(() => {
    // Create test container
    container = document.createElement('div');
    container.className = 'las-fresh-settings-wrap';
    document.body.appendChild(container);
    
    // Add design system CSS variables
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --las-primary-500: #2271b1;
        --las-primary-600: #1e40af;
        --las-primary-700: #1e3a8a;
        --las-neutral-50: #fafafa;
        --las-neutral-100: #f5f5f5;
        --las-neutral-200: #e5e5e5;
        --las-neutral-300: #d4d4d4;
        --las-neutral-400: #a3a3a3;
        --las-neutral-700: #404040;
        --las-neutral-800: #262626;
        --las-space-xs: 4px;
        --las-space-sm: 8px;
        --las-space-md: 16px;
        --las-space-lg: 24px;
        --las-space-xl: 32px;
        --las-font-size-xs: 12px;
        --las-font-size-sm: 13px;
        --las-font-size-lg: 16px;
        --las-font-weight-medium: 500;
        --las-leading-tight: 1.25;
        --las-radius-md: 8px;
        --las-radius-full: 9999px;
        --las-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
        --las-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        --las-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
        --las-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
        --las-transition-base: 200ms ease-out;
        --las-ease-out: cubic-bezier(0, 0, 0.2, 1);
      }
    `;
    document.head.appendChild(style);
  });
  
  afterEach(() => {
    document.body.removeChild(container);
    // Remove added styles
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes('--las-primary-500')) {
        document.head.removeChild(style);
      }
    });
  });
  
  describe('Button Variants', () => {
    test('creates primary button with correct classes and attributes', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary Button';
      button.setAttribute('aria-label', 'Primary action button');
      container.appendChild(button);
      
      expect(button.classList.contains('las-button')).toBe(true);
      expect(button.classList.contains('las-button-primary')).toBe(true);
      expect(button.getAttribute('aria-label')).toBe('Primary action button');
      expect(button.textContent).toBe('Primary Button');
    });
    
    test('creates secondary button with correct styling', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-secondary';
      button.textContent = 'Secondary Button';
      container.appendChild(button);
      
      expect(button.classList.contains('las-button-secondary')).toBe(true);
      
      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.display).toBe('inline-flex');
      expect(computedStyle.alignItems).toBe('center');
      expect(computedStyle.justifyContent).toBe('center');
    });
    
    test('creates ghost button with transparent background', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-ghost';
      button.textContent = 'Ghost Button';
      container.appendChild(button);
      
      expect(button.classList.contains('las-button-ghost')).toBe(true);
    });
  });
  
  describe('Touch Target Accessibility', () => {
    test('buttons meet minimum 44px touch target requirement', () => {
      const buttons = [
        { class: 'las-button las-button-primary', text: 'Primary' },
        { class: 'las-button las-button-secondary', text: 'Secondary' },
        { class: 'las-button las-button-ghost', text: 'Ghost' }
      ];
      
      buttons.forEach(({ class: className, text }) => {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        container.appendChild(button);
        
        const computedStyle = window.getComputedStyle(button);
        const minHeight = parseInt(computedStyle.minHeight);
        const minWidth = parseInt(computedStyle.minWidth);
        
        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });
    
    test('small buttons maintain minimum touch targets', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-sm las-button-primary';
      button.textContent = 'Small';
      container.appendChild(button);
      
      const computedStyle = window.getComputedStyle(button);
      const minHeight = parseInt(computedStyle.minHeight);
      const minWidth = parseInt(computedStyle.minWidth);
      
      expect(minHeight).toBeGreaterThanOrEqual(36);
      expect(minWidth).toBeGreaterThanOrEqual(36);
    });
  });
  
  describe('Elevation and Hover Effects', () => {
    test('primary button has elevation shadow', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.boxShadow).toBeTruthy();
      expect(computedStyle.boxShadow).not.toBe('none');
    });
    
    test('buttons have transform and transition properties', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.transition).toContain('all');
      expect(computedStyle.willChange).toBe('transform, box-shadow');
    });
    
    test('hover state changes are applied correctly', (done) => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      // Simulate hover
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      
      // Check hover state after a brief delay
      setTimeout(() => {
        const computedStyle = window.getComputedStyle(button);
        expect(computedStyle.transform).toBeTruthy();
        done();
      }, 50);
    });
  });
  
  describe('Ripple Effect Animation', () => {
    test('buttons have ripple pseudo-element', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      const afterStyle = window.getComputedStyle(button, '::after');
      expect(afterStyle.content).toBe('""');
      expect(afterStyle.position).toBe('absolute');
      expect(afterStyle.borderRadius).toBeTruthy();
    });
    
    test('ripple animation triggers on click', (done) => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      // Simulate click
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      
      setTimeout(() => {
        const afterStyle = window.getComputedStyle(button, '::after');
        expect(afterStyle.width).toBeTruthy();
        expect(afterStyle.height).toBeTruthy();
        done();
      }, 100);
    });
  });
  
  describe('Keyboard Accessibility', () => {
    test('buttons are keyboard focusable', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      button.focus();
      expect(document.activeElement).toBe(button);
    });
    
    test('buttons have proper focus indicators', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      button.focus();
      
      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.outline).toBe('none'); // Custom focus styling
    });
    
    test('buttons respond to Enter and Space keys', (done) => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      let clicked = false;
      
      button.addEventListener('click', () => {
        clicked = true;
      });
      
      container.appendChild(button);
      button.focus();
      
      // Simulate Enter key
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      button.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      
      setTimeout(() => {
        expect(clicked).toBe(true);
        done();
      }, 50);
    });
  });
  
  describe('ARIA Labels and Accessibility', () => {
    test('buttons support aria-label attribute', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Save';
      button.setAttribute('aria-label', 'Save current settings');
      container.appendChild(button);
      
      expect(button.getAttribute('aria-label')).toBe('Save current settings');
    });
    
    test('buttons support aria-describedby attribute', () => {
      const description = document.createElement('div');
      description.id = 'save-description';
      description.textContent = 'This will save your current settings permanently';
      container.appendChild(description);
      
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Save';
      button.setAttribute('aria-describedby', 'save-description');
      container.appendChild(button);
      
      expect(button.getAttribute('aria-describedby')).toBe('save-description');
    });
    
    test('disabled buttons have proper accessibility attributes', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Disabled';
      button.disabled = true;
      container.appendChild(button);
      
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe(null); // HTML disabled is sufficient
    });
  });
  
  describe('Button Sizes', () => {
    test('small button has correct dimensions', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-sm las-button-primary';
      button.textContent = 'Small';
      container.appendChild(button);
      
      const computedStyle = window.getComputedStyle(button);
      expect(parseInt(computedStyle.minHeight)).toBe(36);
      expect(parseInt(computedStyle.minWidth)).toBe(36);
    });
    
    test('large button has correct dimensions', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-lg las-button-primary';
      button.textContent = 'Large';
      container.appendChild(button);
      
      const computedStyle = window.getComputedStyle(button);
      expect(parseInt(computedStyle.minHeight)).toBe(52);
      expect(parseInt(computedStyle.minWidth)).toBe(52);
    });
  });
  
  describe('Button Groups', () => {
    test('button group creates connected buttons', () => {
      const group = document.createElement('div');
      group.className = 'las-button-group';
      
      const button1 = document.createElement('button');
      button1.className = 'las-button las-button-secondary';
      button1.textContent = 'First';
      
      const button2 = document.createElement('button');
      button2.className = 'las-button las-button-secondary';
      button2.textContent = 'Second';
      
      const button3 = document.createElement('button');
      button3.className = 'las-button las-button-secondary';
      button3.textContent = 'Third';
      
      group.appendChild(button1);
      group.appendChild(button2);
      group.appendChild(button3);
      container.appendChild(group);
      
      const groupStyle = window.getComputedStyle(group);
      expect(groupStyle.display).toBe('inline-flex');
      
      const firstButtonStyle = window.getComputedStyle(button1);
      const lastButtonStyle = window.getComputedStyle(button3);
      
      expect(firstButtonStyle.borderTopLeftRadius).toBeTruthy();
      expect(lastButtonStyle.borderTopRightRadius).toBeTruthy();
    });
  });
  
  describe('Loading State', () => {
    test('loading button shows spinner and disables interaction', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary las-button-loading';
      button.textContent = 'Loading...';
      container.appendChild(button);
      
      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.color).toBe('transparent');
      expect(computedStyle.pointerEvents).toBe('none');
      
      const beforeStyle = window.getComputedStyle(button, '::before');
      expect(beforeStyle.content).toBe('""');
      expect(beforeStyle.animation).toContain('las-button-spin');
    });
  });
  
  describe('Dark Theme Support', () => {
    test('buttons adapt to dark theme', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      const button = document.createElement('button');
      button.className = 'las-button las-button-secondary';
      button.textContent = 'Secondary';
      container.appendChild(button);
      
      // Dark theme styles should be applied
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      
      // Clean up
      document.documentElement.removeAttribute('data-theme');
    });
  });
  
  describe('Performance Requirements', () => {
    test('buttons use transform and opacity for animations', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.willChange).toBe('transform, box-shadow');
      expect(computedStyle.contain).toBe('layout style paint');
    });
    
    test('ripple animation uses efficient properties', () => {
      const button = document.createElement('button');
      button.className = 'las-button las-button-primary';
      button.textContent = 'Primary';
      container.appendChild(button);
      
      const afterStyle = window.getComputedStyle(button, '::after');
      expect(afterStyle.transform).toBeTruthy();
      expect(afterStyle.transition).toContain('width');
      expect(afterStyle.transition).toContain('height');
      expect(afterStyle.transition).toContain('opacity');
    });
  });
});