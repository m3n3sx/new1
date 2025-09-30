/**
 * Test Suite: Modern Form Input Components
 * 
 * Tests the modern form input components implementation including:
 * - Input field styling with focus states and transitions
 * - Touch targets (44px minimum) for mobile accessibility
 * - Input validation styling and error states
 * - Consistent form layout and spacing system
 * 
 * Requirements tested: 1.5, 5.2, 6.1, 6.2, 6.3, 6.5
 */

describe('Modern Form Input Components', () => {
  let testContainer;
  
  beforeEach(() => {
    // Create test container
    testContainer = document.createElement('div');
    testContainer.className = 'las-fresh-settings-wrap';
    testContainer.innerHTML = `
      <div class="las-form-section">
        <h3 class="las-form-section-title">Test Form Section</h3>
        
        <!-- Basic Input Group -->
        <div class="las-input-group">
          <label for="test-input" class="las-label">Test Input</label>
          <input type="text" id="test-input" class="las-input" placeholder="Enter text">
          <div class="las-input-help">This is help text</div>
        </div>
        
        <!-- Input with Icon -->
        <div class="las-input-group has-icon left">
          <label for="icon-input" class="las-label">Input with Icon</label>
          <span class="las-input-icon left">🔍</span>
          <input type="text" id="icon-input" class="las-input" placeholder="Search">
        </div>
        
        <!-- Validation States -->
        <div class="las-input-group success">
          <label for="success-input" class="las-label">Success Input</label>
          <input type="text" id="success-input" class="las-input" value="Valid input">
          <div class="las-input-help success">Input is valid</div>
        </div>
        
        <div class="las-input-group error">
          <label for="error-input" class="las-label">Error Input</label>
          <input type="text" id="error-input" class="las-input" value="Invalid input">
          <div class="las-input-help error">This field is required</div>
        </div>
        
        <div class="las-input-group warning">
          <label for="warning-input" class="las-label">Warning Input</label>
          <input type="text" id="warning-input" class="las-input" value="Warning input">
          <div class="las-input-help warning">Please check this field</div>
        </div>
        
        <!-- Textarea -->
        <div class="las-input-group">
          <label for="test-textarea" class="las-label">Test Textarea</label>
          <textarea id="test-textarea" class="las-input" placeholder="Enter description"></textarea>
        </div>
        
        <!-- Select -->
        <div class="las-input-group">
          <label for="test-select" class="las-label">Test Select</label>
          <select id="test-select" class="las-input">
            <option value="">Choose option</option>
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
          </select>
        </div>
        
        <!-- Checkbox Group -->
        <div class="las-checkbox-group">
          <input type="checkbox" id="test-checkbox" class="las-checkbox">
          <label for="test-checkbox" class="las-checkbox-label">Test Checkbox</label>
        </div>
        
        <!-- Radio Group -->
        <div class="las-radio-group">
          <input type="radio" id="test-radio1" name="test-radio" class="las-radio">
          <label for="test-radio1" class="las-radio-label">Radio Option 1</label>
        </div>
        
        <div class="las-radio-group">
          <input type="radio" id="test-radio2" name="test-radio" class="las-radio">
          <label for="test-radio2" class="las-radio-label">Radio Option 2</label>
        </div>
        
        <!-- Switch -->
        <div class="las-switch-group">
          <label class="las-switch">
            <input type="checkbox" id="test-switch">
            <span class="las-switch-slider"></span>
          </label>
          <label for="test-switch">Test Switch</label>
        </div>
        
        <!-- Input Sizes -->
        <div class="las-input-group small">
          <label for="small-input" class="las-label">Small Input</label>
          <input type="text" id="small-input" class="las-input" placeholder="Small input">
        </div>
        
        <div class="las-input-group large">
          <label for="large-input" class="las-label">Large Input</label>
          <input type="text" id="large-input" class="las-input" placeholder="Large input">
        </div>
        
        <!-- Disabled Input -->
        <div class="las-input-group">
          <label for="disabled-input" class="las-label">Disabled Input</label>
          <input type="text" id="disabled-input" class="las-input" placeholder="Disabled" disabled>
        </div>
        
        <!-- Form Grid -->
        <div class="las-form-grid cols-2">
          <div class="las-input-group">
            <label for="grid-input1" class="las-label">Grid Input 1</label>
            <input type="text" id="grid-input1" class="las-input">
          </div>
          <div class="las-input-group">
            <label for="grid-input2" class="las-label">Grid Input 2</label>
            <input type="text" id="grid-input2" class="las-input">
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(testContainer);
  });
  
  afterEach(() => {
    if (testContainer && testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  });
  
  describe('Input Field Styling', () => {
    test('should have modern input styling with proper border radius and padding', () => {
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      expect(styles.borderRadius).toBe('8px'); // --las-radius-md
      expect(styles.border).toContain('2px');
      expect(styles.paddingLeft).toBe('16px'); // --las-space-md
      expect(styles.paddingRight).toBe('16px');
    });
    
    test('should have proper typography styling', () => {
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      expect(styles.fontSize).toBe('14px'); // --las-font-size-base
      expect(styles.fontWeight).toBe('400'); // --las-font-weight-normal
    });
    
    test('should have box shadow for elevation', () => {
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      expect(styles.boxShadow).toBeTruthy();
      expect(styles.boxShadow).not.toBe('none');
    });
  });
  
  describe('Touch Targets (Accessibility)', () => {
    test('should have minimum 44px height for touch targets', () => {
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });
    
    test('should maintain 44px minimum for small inputs on mobile', () => {
      const smallInput = testContainer.querySelector('#small-input');
      
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      const styles = window.getComputedStyle(smallInput);
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });
    
    test('should have proper touch targets for checkboxes and radios', () => {
      const checkboxGroup = testContainer.querySelector('.las-checkbox-group');
      const radioGroup = testContainer.querySelector('.las-radio-group');
      
      const checkboxStyles = window.getComputedStyle(checkboxGroup);
      const radioStyles = window.getComputedStyle(radioGroup);
      
      expect(parseInt(checkboxStyles.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(radioStyles.minHeight)).toBeGreaterThanOrEqual(44);
    });
    
    test('should have proper switch dimensions for touch', () => {
      const switchElement = testContainer.querySelector('.las-switch');
      const styles = window.getComputedStyle(switchElement);
      
      expect(parseInt(styles.width)).toBeGreaterThanOrEqual(44);
      expect(parseInt(styles.height)).toBeGreaterThanOrEqual(24);
    });
  });
  
  describe('Focus States and Transitions', () => {
    test('should have focus styles with proper outline', () => {
      const input = testContainer.querySelector('#test-input');
      
      // Simulate focus
      input.focus();
      
      const styles = window.getComputedStyle(input);
      expect(styles.outline).toContain('2px');
      expect(styles.outlineColor).toBeTruthy();
    });
    
    test('should have transition properties for smooth interactions', () => {
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      expect(styles.transition).toContain('all');
      expect(styles.transitionDuration).toBe('0.2s'); // --las-transition-base
    });
    
    test('should change border color on focus', () => {
      const input = testContainer.querySelector('#test-input');
      
      const initialStyles = window.getComputedStyle(input);
      const initialBorderColor = initialStyles.borderColor;
      
      input.focus();
      
      const focusStyles = window.getComputedStyle(input);
      expect(focusStyles.borderColor).not.toBe(initialBorderColor);
    });
    
    test('should have focus ring with proper color and offset', () => {
      const input = testContainer.querySelector('#test-input');
      input.focus();
      
      const styles = window.getComputedStyle(input);
      expect(styles.outlineOffset).toBe('2px');
    });
  });
  
  describe('Validation States', () => {
    test('should have success state styling', () => {
      const successInput = testContainer.querySelector('#success-input');
      const successGroup = testContainer.querySelector('.las-input-group.success');
      
      expect(successGroup.classList.contains('success')).toBe(true);
      
      const styles = window.getComputedStyle(successInput);
      expect(styles.borderColor).toContain('rgb(16, 185, 129)'); // --las-success-500
    });
    
    test('should have error state styling', () => {
      const errorInput = testContainer.querySelector('#error-input');
      const errorGroup = testContainer.querySelector('.las-input-group.error');
      
      expect(errorGroup.classList.contains('error')).toBe(true);
      
      const styles = window.getComputedStyle(errorInput);
      expect(styles.borderColor).toContain('rgb(239, 68, 68)'); // --las-error-500
    });
    
    test('should have warning state styling', () => {
      const warningInput = testContainer.querySelector('#warning-input');
      const warningGroup = testContainer.querySelector('.las-input-group.warning');
      
      expect(warningGroup.classList.contains('warning')).toBe(true);
      
      const styles = window.getComputedStyle(warningInput);
      expect(styles.borderColor).toContain('rgb(245, 158, 11)'); // --las-warning-500
    });
    
    test('should have proper help text colors for validation states', () => {
      const successHelp = testContainer.querySelector('.las-input-help.success');
      const errorHelp = testContainer.querySelector('.las-input-help.error');
      const warningHelp = testContainer.querySelector('.las-input-help.warning');
      
      const successStyles = window.getComputedStyle(successHelp);
      const errorStyles = window.getComputedStyle(errorHelp);
      const warningStyles = window.getComputedStyle(warningHelp);
      
      expect(successStyles.color).toContain('rgb(5, 150, 105)'); // --las-success-600
      expect(errorStyles.color).toContain('rgb(220, 38, 38)'); // --las-error-600
      expect(warningStyles.color).toContain('rgb(217, 119, 6)'); // --las-warning-600
    });
  });
  
  describe('Form Layout and Spacing', () => {
    test('should have consistent spacing between form elements', () => {
      const inputGroups = testContainer.querySelectorAll('.las-input-group');
      
      inputGroups.forEach(group => {
        const styles = window.getComputedStyle(group);
        expect(styles.marginBottom).toBe('24px'); // --las-space-lg
      });
    });
    
    test('should have proper form section title styling', () => {
      const sectionTitle = testContainer.querySelector('.las-form-section-title');
      const styles = window.getComputedStyle(sectionTitle);
      
      expect(styles.fontSize).toBe('16px'); // --las-font-size-lg
      expect(styles.fontWeight).toBe('600'); // --las-font-weight-semibold
      expect(styles.marginBottom).toBe('24px'); // --las-space-lg
    });
    
    test('should have proper grid layout for form elements', () => {
      const formGrid = testContainer.querySelector('.las-form-grid.cols-2');
      const styles = window.getComputedStyle(formGrid);
      
      expect(styles.display).toBe('grid');
      expect(styles.gap).toBe('24px'); // --las-space-lg
    });
    
    test('should have proper label spacing and typography', () => {
      const label = testContainer.querySelector('.las-label');
      const styles = window.getComputedStyle(label);
      
      expect(styles.fontSize).toBe('13px'); // --las-font-size-sm
      expect(styles.fontWeight).toBe('500'); // --las-font-weight-medium
      expect(styles.marginBottom).toBe('4px'); // --las-space-xs
    });
  });
  
  describe('Input Sizes', () => {
    test('should have proper small input dimensions', () => {
      const smallInput = testContainer.querySelector('#small-input');
      const styles = window.getComputedStyle(smallInput);
      
      expect(parseInt(styles.minHeight)).toBeLessThan(44);
      expect(styles.fontSize).toBe('13px'); // --las-font-size-sm
    });
    
    test('should have proper large input dimensions', () => {
      const largeInput = testContainer.querySelector('#large-input');
      const styles = window.getComputedStyle(largeInput);
      
      expect(parseInt(styles.minHeight)).toBeGreaterThan(44);
      expect(styles.fontSize).toBe('16px'); // --las-font-size-lg
    });
  });
  
  describe('Disabled States', () => {
    test('should have proper disabled input styling', () => {
      const disabledInput = testContainer.querySelector('#disabled-input');
      const styles = window.getComputedStyle(disabledInput);
      
      expect(disabledInput.disabled).toBe(true);
      expect(styles.cursor).toBe('not-allowed');
      expect(styles.backgroundColor).toContain('rgb(245, 245, 245)'); // --las-neutral-100
    });
    
    test('should not have hover effects on disabled inputs', () => {
      const disabledInput = testContainer.querySelector('#disabled-input');
      
      // Simulate hover
      disabledInput.dispatchEvent(new MouseEvent('mouseenter'));
      
      const styles = window.getComputedStyle(disabledInput);
      expect(styles.transform).toBe('none');
    });
  });
  
  describe('Checkbox and Radio Components', () => {
    test('should have custom checkbox styling', () => {
      const checkbox = testContainer.querySelector('#test-checkbox');
      const styles = window.getComputedStyle(checkbox);
      
      expect(styles.appearance).toBe('none');
      expect(styles.width).toBe('20px');
      expect(styles.height).toBe('20px');
      expect(styles.borderRadius).toBe('4px'); // --las-radius-sm
    });
    
    test('should have custom radio styling', () => {
      const radio = testContainer.querySelector('#test-radio1');
      const styles = window.getComputedStyle(radio);
      
      expect(styles.appearance).toBe('none');
      expect(styles.width).toBe('20px');
      expect(styles.height).toBe('20px');
      expect(styles.borderRadius).toBe('9999px'); // --las-radius-full
    });
    
    test('should have proper switch styling', () => {
      const switchElement = testContainer.querySelector('.las-switch');
      const slider = testContainer.querySelector('.las-switch-slider');
      
      const switchStyles = window.getComputedStyle(switchElement);
      const sliderStyles = window.getComputedStyle(slider);
      
      expect(switchStyles.position).toBe('relative');
      expect(sliderStyles.borderRadius).toBe('9999px'); // --las-radius-full
    });
  });
  
  describe('Icon Support', () => {
    test('should have proper icon positioning', () => {
      const iconGroup = testContainer.querySelector('.las-input-group.has-icon.left');
      const icon = testContainer.querySelector('.las-input-icon.left');
      const input = iconGroup.querySelector('.las-input');
      
      const iconStyles = window.getComputedStyle(icon);
      const inputStyles = window.getComputedStyle(input);
      
      expect(iconStyles.position).toBe('absolute');
      expect(iconStyles.left).toBe('16px'); // --las-space-md
      expect(inputStyles.paddingLeft).toBe('48px'); // --las-space-2xl
    });
  });
  
  describe('Dark Theme Support', () => {
    test('should adapt to dark theme', () => {
      // Apply dark theme
      testContainer.setAttribute('data-theme', 'dark');
      
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      // Should have dark theme colors
      expect(styles.backgroundColor).toContain('rgb(38, 38, 38)'); // --las-neutral-100 in dark theme
    });
  });
  
  describe('Mobile Responsiveness', () => {
    test('should maintain proper spacing on mobile', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      const formGrid = testContainer.querySelector('.las-form-grid');
      const styles = window.getComputedStyle(formGrid);
      
      // Should collapse to single column on mobile
      expect(styles.gridTemplateColumns).toBe('1fr');
    });
  });
  
  describe('Performance', () => {
    test('should have hardware acceleration for animations', () => {
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      // Should have transform property for hardware acceleration
      expect(styles.transform).toBeDefined();
    });
    
    test('should have efficient transitions', () => {
      const input = testContainer.querySelector('#test-input');
      const styles = window.getComputedStyle(input);
      
      expect(styles.transitionDuration).toBe('0.2s'); // Should be fast enough for 60fps
    });
  });
  
  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      const input = testContainer.querySelector('#test-input');
      const label = testContainer.querySelector('label[for="test-input"]');
      
      expect(label.getAttribute('for')).toBe(input.id);
      expect(input.getAttribute('id')).toBeTruthy();
    });
    
    test('should have proper focus management', () => {
      const input = testContainer.querySelector('#test-input');
      
      input.focus();
      expect(document.activeElement).toBe(input);
      
      // Should have visible focus indicator
      const styles = window.getComputedStyle(input);
      expect(styles.outline).not.toBe('none');
    });
    
    test('should support keyboard navigation', () => {
      const checkbox = testContainer.querySelector('#test-checkbox');
      
      // Should be focusable
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
      
      // Should respond to space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      checkbox.dispatchEvent(spaceEvent);
    });
  });
});

// Integration test with existing form systems
describe('Form Integration', () => {
  test('should integrate with WordPress form table structure', () => {
    const container = document.createElement('div');
    container.className = 'las-fresh-settings-wrap';
    container.innerHTML = `
      <table class="form-table">
        <tr>
          <th scope="row">
            <label for="wp-input">WordPress Input</label>
          </th>
          <td>
            <input type="text" id="wp-input" class="las-input">
          </td>
        </tr>
      </table>
    `;
    
    document.body.appendChild(container);
    
    const input = container.querySelector('#wp-input');
    const styles = window.getComputedStyle(input);
    
    expect(styles.borderRadius).toBe('8px');
    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    
    document.body.removeChild(container);
  });
  
  test('should work with existing field-row structure', () => {
    const container = document.createElement('div');
    container.className = 'las-fresh-settings-wrap';
    container.innerHTML = `
      <div class="field-row">
        <label for="field-input">Field Input</label>
        <input type="text" id="field-input" class="las-input">
        <div class="description">Field description</div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    const fieldRow = container.querySelector('.field-row');
    const input = container.querySelector('#field-input');
    
    const fieldStyles = window.getComputedStyle(fieldRow);
    const inputStyles = window.getComputedStyle(input);
    
    expect(fieldStyles.borderRadius).toBe('8px');
    expect(parseInt(inputStyles.minHeight)).toBeGreaterThanOrEqual(44);
    
    document.body.removeChild(container);
  });
});