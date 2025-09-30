/**
 * Live Admin Styler - Theme Manager Tests
 * 
 * Tests for the ThemeManager class functionality including:
 * - Dark/light mode detection and switching
 * - localStorage persistence
 * - System preference detection
 * - Smooth theme transitions
 */

// Mock localStorage for testing
const localStorageMock = {
  store: {},
  getItem: function(key) {
    return this.store[key] || null;
  },
  setItem: function(key, value) {
    this.store[key] = value.toString();
  },
  removeItem: function(key) {
    delete this.store[key];
  },
  clear: function() {
    this.store = {};
  }
};

// Mock window.matchMedia
const matchMediaMock = (query) => ({
  matches: query.includes('dark') ? false : true, // Default to light mode
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// Mock document methods
const documentMock = {
  documentElement: {
    setAttribute: jest.fn(),
    classList: {
      remove: jest.fn(),
      add: jest.fn()
    }
  },
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  readyState: 'complete'
};

// Mock window methods
const windowMock = {
  localStorage: localStorageMock,
  matchMedia: matchMediaMock,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options ? options.detail : null;
    }
  }
};

describe('ThemeManager', () => {
  let ThemeManager;
  let themeManager;

  beforeEach(() => {
    // Clear mocks
    localStorageMock.clear();
    jest.clearAllMocks();
    
    // Set up global mocks
    global.localStorage = localStorageMock;
    global.window = windowMock;
    global.document = documentMock;
    global.CustomEvent = windowMock.CustomEvent;
    
    // Import ThemeManager class
    delete require.cache[require.resolve('../../assets/js/theme-manager.js')];
    ThemeManager = require('../../assets/js/theme-manager.js');
  });

  afterEach(() => {
    if (themeManager) {
      themeManager = null;
    }
  });

  describe('Theme Detection', () => {
    test('should detect light theme by default', () => {
      themeManager = new ThemeManager();
      expect(themeManager.getCurrentTheme()).toBe('light');
    });

    test('should detect stored theme preference', () => {
      localStorageMock.setItem('las-theme-preference', 'dark');
      themeManager = new ThemeManager();
      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    test('should detect system dark mode preference', () => {
      windowMock.matchMedia = jest.fn((query) => ({
        matches: query.includes('dark') ? true : false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));
      
      themeManager = new ThemeManager();
      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    test('should prioritize stored preference over system preference', () => {
      localStorageMock.setItem('las-theme-preference', 'light');
      windowMock.matchMedia = jest.fn((query) => ({
        matches: query.includes('dark') ? true : false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));
      
      themeManager = new ThemeManager();
      expect(themeManager.getCurrentTheme()).toBe('light');
    });
  });

  describe('Theme Setting', () => {
    beforeEach(() => {
      themeManager = new ThemeManager();
    });

    test('should set theme and update document attribute', () => {
      themeManager.setTheme('dark');
      
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    test('should persist theme preference to localStorage', () => {
      themeManager.setTheme('dark');
      
      expect(localStorageMock.getItem('las-theme-preference')).toBe('dark');
    });

    test('should dispatch theme change event', () => {
      themeManager.setTheme('dark');
      
      expect(windowMock.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'las-theme-change',
          detail: expect.objectContaining({
            theme: 'dark',
            isDark: true,
            isLight: false
          })
        })
      );
    });

    test('should reject invalid theme values', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      themeManager.setTheme('invalid');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'ThemeManager: Invalid theme value. Use "dark" or "light".'
      );
      expect(themeManager.getCurrentTheme()).toBe('light'); // Should remain unchanged
      
      consoleSpy.mockRestore();
    });
  });

  describe('Theme Toggling', () => {
    beforeEach(() => {
      themeManager = new ThemeManager();
    });

    test('should toggle from light to dark', () => {
      themeManager.setTheme('light');
      themeManager.toggleTheme();
      
      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    test('should toggle from dark to light', () => {
      themeManager.setTheme('dark');
      themeManager.toggleTheme();
      
      expect(themeManager.getCurrentTheme()).toBe('light');
    });
  });

  describe('Theme State Helpers', () => {
    beforeEach(() => {
      themeManager = new ThemeManager();
    });

    test('should correctly identify dark theme', () => {
      themeManager.setTheme('dark');
      
      expect(themeManager.isDark()).toBe(true);
      expect(themeManager.isLight()).toBe(false);
    });

    test('should correctly identify light theme', () => {
      themeManager.setTheme('light');
      
      expect(themeManager.isDark()).toBe(false);
      expect(themeManager.isLight()).toBe(true);
    });
  });

  describe('Theme Reset', () => {
    beforeEach(() => {
      themeManager = new ThemeManager();
    });

    test('should reset to system preference', () => {
      // Set a manual preference
      themeManager.setTheme('dark');
      expect(localStorageMock.getItem('las-theme-preference')).toBe('dark');
      
      // Mock system preference as light
      windowMock.matchMedia = jest.fn((query) => ({
        matches: query.includes('dark') ? false : true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));
      
      // Reset theme
      themeManager.resetTheme();
      
      expect(localStorageMock.getItem('las-theme-preference')).toBeNull();
      expect(themeManager.getCurrentTheme()).toBe('light');
    });
  });

  describe('Theme Change Listeners', () => {
    beforeEach(() => {
      themeManager = new ThemeManager();
    });

    test('should add and remove theme change listeners', () => {
      const callback = jest.fn();
      
      const cleanup = themeManager.onThemeChange(callback);
      
      expect(windowMock.addEventListener).toHaveBeenCalledWith('las-theme-change', expect.any(Function));
      
      cleanup();
      
      expect(windowMock.removeEventListener).toHaveBeenCalledWith('las-theme-change', expect.any(Function));
    });
  });

  describe('Theme Statistics', () => {
    beforeEach(() => {
      themeManager = new ThemeManager();
    });

    test('should provide theme statistics', () => {
      themeManager.setTheme('dark');
      
      const stats = themeManager.getThemeStats();
      
      expect(stats).toEqual({
        currentTheme: 'dark',
        hasStoredPreference: true,
        systemPreference: 'light',
        supportsColorScheme: true,
        toggleButtons: 0
      });
    });
  });

  describe('FOUC Prevention', () => {
    beforeEach(() => {
      // Mock querySelector to return a settings wrap element
      documentMock.querySelector = jest.fn((selector) => {
        if (selector === '.las-fresh-settings-wrap') {
          return { style: { opacity: '0' } };
        }
        return null;
      });
      
      themeManager = new ThemeManager();
    });

    test('should prevent flash of unstyled content', (done) => {
      const settingsWrap = { style: { opacity: '0' } };
      documentMock.querySelector.mockReturnValue(settingsWrap);
      
      themeManager.preventFOUC();
      
      // Check that theme loading class is removed
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('las-theme-loading');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('las-theme-loaded');
      
      // Check that settings wrap opacity is set after timeout
      setTimeout(() => {
        expect(settingsWrap.style.opacity).toBe('1');
        done();
      }, 150);
    });
  });
});

// Integration test
describe('ThemeManager Integration', () => {
  test('should work with real DOM elements', () => {
    // Create a real DOM environment for this test
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div class="las-fresh-settings-wrap" style="opacity: 0;">
            <button data-las-theme-toggle data-light-text="☀️ Light" data-dark-text="🌙 Dark">
              Theme Toggle
            </button>
          </div>
        </body>
      </html>
    `);
    
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = localStorageMock;
    global.CustomEvent = dom.window.CustomEvent;
    
    // Mock matchMedia
    dom.window.matchMedia = jest.fn((query) => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));
    
    delete require.cache[require.resolve('../../assets/js/theme-manager.js')];
    const ThemeManager = require('../../assets/js/theme-manager.js');
    
    const themeManager = new ThemeManager();
    
    // Test theme toggle button initialization
    const toggleButton = dom.window.document.querySelector('[data-las-theme-toggle]');
    expect(toggleButton).toBeTruthy();
    
    // Test theme switching
    themeManager.setTheme('dark');
    expect(dom.window.document.documentElement.getAttribute('data-theme')).toBe('dark');
    
    // Test button click
    toggleButton.click();
    expect(themeManager.getCurrentTheme()).toBe('light');
  });
});