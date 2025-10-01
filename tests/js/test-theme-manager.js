/**
 * Theme Manager Tests
 * 
 * @package LiveAdminStyler
 * @since 2.0.0
 */

import ThemeManager from '../../assets/js/modules/theme-manager.js';

describe('ThemeManager', () => {
    let themeManager;
    let mockCore;
    let mockLocalStorage;
    let mockMatchMedia;

    beforeEach(() => {
        // Mock core
        mockCore = {
            emit: jest.fn(),
            on: jest.fn(),
            once: jest.fn()
        };

        // Mock localStorage
        mockLocalStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });

        // Mock matchMedia
        mockMatchMedia = {
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        window.matchMedia = jest.fn(() => mockMatchMedia);

        // Mock document elements
        document.documentElement = {
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn()
            },
            setAttribute: jest.fn(),
            removeAttribute: jest.fn(),
            style: {
                setProperty: jest.fn(),
                getPropertyValue: jest.fn()
            }
        };

        document.body = {
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            }
        };

        // Mock getComputedStyle
        window.getComputedStyle = jest.fn(() => ({
            getPropertyValue: jest.fn(() => '#ffffff')
        }));

        themeManager = new ThemeManager(mockCore);
    });

    afterEach(() => {
        jest.clearAllMocks();
        if (themeManager) {
            themeManager.destroy();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(themeManager.currentTheme).toBe('auto');
            expect(themeManager.systemTheme).toBe('light');
            expect(themeManager.effectiveTheme).toBe('light');
        });

        test('should emit theme:ready event', () => {
            expect(mockCore.emit).toHaveBeenCalledWith('theme:ready', {
                current: 'auto',
                effective: 'light',
                system: 'light'
            });
        });

        test('should set up media query listener', () => {
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
            expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });
    });

    describe('Theme Detection', () => {
        test('should detect dark system theme', () => {
            mockMatchMedia.matches = true;
            const newThemeManager = new ThemeManager(mockCore);
            expect(newThemeManager.systemTheme).toBe('dark');
        });

        test('should detect light system theme', () => {
            mockMatchMedia.matches = false;
            const newThemeManager = new ThemeManager(mockCore);
            expect(newThemeManager.systemTheme).toBe('light');
        });

        test('should handle system theme changes', () => {
            const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1];
            changeHandler({ matches: true });

            expect(themeManager.systemTheme).toBe('dark');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:system-changed', { theme: 'dark' });
        });
    });

    describe('Theme Persistence', () => {
        test('should load theme preference from localStorage', () => {
            mockLocalStorage.getItem.mockReturnValue('dark');
            const newThemeManager = new ThemeManager(mockCore);
            expect(newThemeManager.currentTheme).toBe('dark');
        });

        test('should save theme preference to localStorage', () => {
            themeManager.setTheme('dark');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('las_theme_preference', 'dark');
        });

        test('should handle localStorage errors gracefully', () => {
            mockLocalStorage.getItem.mockImplementation(() => {
                throw new Error('Storage error');
            });

            const newThemeManager = new ThemeManager(mockCore);
            expect(mockCore.emit).toHaveBeenCalledWith('theme:error', expect.objectContaining({
                type: 'storage_load'
            }));
        });
    });

    describe('Theme Setting', () => {
        test('should set valid theme', () => {
            themeManager.setTheme('dark');
            expect(themeManager.currentTheme).toBe('dark');
            expect(themeManager.effectiveTheme).toBe('dark');
        });

        test('should reject invalid theme', () => {
            themeManager.setTheme('invalid');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:error', expect.objectContaining({
                type: 'invalid_theme'
            }));
        });

        test('should emit theme:mode-changed event', () => {
            themeManager.setTheme('dark');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:mode-changed', {
                from: 'auto',
                to: 'dark',
                effective: 'dark'
            });
        });
    });

    describe('Theme Toggle', () => {
        test('should toggle from light to dark', () => {
            themeManager.setTheme('light');
            themeManager.toggleTheme();
            expect(themeManager.currentTheme).toBe('dark');
        });

        test('should toggle from dark to light', () => {
            themeManager.setTheme('dark');
            themeManager.toggleTheme();
            expect(themeManager.currentTheme).toBe('light');
        });

        test('should toggle from auto to opposite of system theme', () => {
            themeManager.systemTheme = 'light';
            themeManager.toggleTheme();
            expect(themeManager.currentTheme).toBe('dark');
        });
    });

    describe('Theme Application', () => {
        test('should apply theme classes to document', () => {
            themeManager.setTheme('dark');
            
            expect(document.documentElement.classList.add).toHaveBeenCalledWith('las-theme-transitioning');
            expect(document.documentElement.classList.add).toHaveBeenCalledWith('las-theme-dark');
            expect(document.body.classList.add).toHaveBeenCalledWith('las-theme-dark');
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });

        test('should remove old theme classes', () => {
            themeManager.setTheme('dark');
            
            expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
                'las-theme-light', 'las-theme-dark', 'las-theme-auto'
            );
            expect(document.body.classList.remove).toHaveBeenCalledWith(
                'las-theme-light', 'las-theme-dark'
            );
        });

        test('should update CSS custom properties', () => {
            themeManager.setTheme('dark');
            
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--las-content-background', '#1a1a1a'
            );
        });

        test('should emit theme:applied event', () => {
            themeManager.setTheme('dark');
            
            expect(mockCore.emit).toHaveBeenCalledWith('theme:applied', {
                theme: 'dark',
                mode: 'dark'
            });
        });
    });

    describe('Auto Theme Mode', () => {
        test('should use system theme when in auto mode', () => {
            themeManager.systemTheme = 'dark';
            themeManager.setTheme('auto');
            expect(themeManager.effectiveTheme).toBe('dark');
        });

        test('should update effective theme when system changes in auto mode', () => {
            themeManager.setTheme('auto');
            
            const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1];
            changeHandler({ matches: true });
            
            expect(themeManager.effectiveTheme).toBe('dark');
        });
    });

    describe('Theme Information', () => {
        test('should return correct theme info', () => {
            themeManager.setTheme('dark');
            const info = themeManager.getThemeInfo();
            
            expect(info).toEqual({
                current: 'dark',
                effective: 'dark',
                system: 'light',
                supportsSystemDetection: true
            });
        });

        test('should check if dark mode is active', () => {
            themeManager.setTheme('dark');
            expect(themeManager.isDarkMode()).toBe(true);
            expect(themeManager.isLightMode()).toBe(false);
        });

        test('should check if light mode is active', () => {
            themeManager.setTheme('light');
            expect(themeManager.isLightMode()).toBe(true);
            expect(themeManager.isDarkMode()).toBe(false);
        });

        test('should check if auto mode is active', () => {
            expect(themeManager.isAutoMode()).toBe(true);
            themeManager.setTheme('light');
            expect(themeManager.isAutoMode()).toBe(false);
        });
    });

    describe('Color Management', () => {
        test('should get theme color', () => {
            window.getComputedStyle.mockReturnValue({
                getPropertyValue: jest.fn(() => '#ffffff')
            });
            
            const color = themeManager.getThemeColor('primary');
            expect(color).toBe('#ffffff');
        });

        test('should set theme color', () => {
            themeManager.setThemeColor('primary', '#ff0000');
            
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--las-primary', '#ff0000'
            );
            expect(mockCore.emit).toHaveBeenCalledWith('theme:color-changed', {
                color: 'primary',
                value: '#ff0000',
                theme: 'light'
            });
        });
    });

    describe('Theme Preview', () => {
        test('should preview theme temporarily', async () => {
            themeManager.setTheme('light');
            
            const previewPromise = themeManager.previewTheme('dark');
            
            expect(themeManager.effectiveTheme).toBe('dark');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:preview-started', {
                preview: 'dark',
                original: 'light'
            });
            
            // End preview manually
            mockCore.once.mock.calls[0][1]();
            
            await previewPromise;
            
            expect(themeManager.effectiveTheme).toBe('light');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:preview-ended', {
                preview: 'dark',
                restored: 'light'
            });
        });

        test('should reject invalid preview theme', async () => {
            await expect(themeManager.previewTheme('invalid')).rejects.toThrow('Invalid preview theme: invalid');
        });
    });

    describe('Theme Export/Import', () => {
        beforeEach(() => {
            // Mock document.styleSheets
            Object.defineProperty(document, 'styleSheets', {
                value: [{
                    cssRules: [{
                        type: CSSRule.STYLE_RULE,
                        style: ['--las-primary', '--las-secondary']
                    }]
                }],
                writable: true
            });
            
            global.CSSRule = {
                STYLE_RULE: 1
            };
        });

        test('should export theme configuration', () => {
            themeManager.setTheme('dark');
            const config = themeManager.exportTheme();
            
            expect(config).toHaveProperty('mode', 'dark');
            expect(config).toHaveProperty('effective', 'dark');
            expect(config).toHaveProperty('colors');
        });

        test('should import theme configuration', () => {
            const config = {
                mode: 'dark',
                colors: {
                    'primary': '#ff0000'
                }
            };
            
            themeManager.importTheme(config);
            
            expect(themeManager.currentTheme).toBe('dark');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:imported', { config });
        });

        test('should reject invalid import configuration', () => {
            expect(() => themeManager.importTheme(null)).toThrow('Invalid theme configuration');
        });
    });

    describe('Event Handling', () => {
        test('should listen for theme toggle events', () => {
            expect(mockCore.on).toHaveBeenCalledWith('theme:toggle', expect.any(Function));
        });

        test('should listen for theme set events', () => {
            expect(mockCore.on).toHaveBeenCalledWith('theme:set', expect.any(Function));
        });

        test('should listen for settings changes', () => {
            expect(mockCore.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
        });

        test('should handle theme toggle event', () => {
            const toggleHandler = mockCore.on.mock.calls.find(call => call[0] === 'theme:toggle')[1];
            themeManager.setTheme('light');
            
            toggleHandler();
            
            expect(themeManager.currentTheme).toBe('dark');
        });

        test('should handle theme set event', () => {
            const setHandler = mockCore.on.mock.calls.find(call => call[0] === 'theme:set')[1];
            
            setHandler({ theme: 'dark' });
            
            expect(themeManager.currentTheme).toBe('dark');
        });

        test('should handle settings change event', () => {
            const settingsHandler = mockCore.on.mock.calls.find(call => call[0] === 'settings:changed')[1];
            
            settingsHandler({ key: 'theme_mode', value: 'dark' });
            
            expect(themeManager.currentTheme).toBe('dark');
        });
    });

    describe('Cleanup', () => {
        test('should remove event listeners on destroy', () => {
            themeManager.destroy();
            
            expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
                'las-theme-light', 'las-theme-dark', 'las-theme-auto', 'las-theme-transitioning'
            );
            expect(document.body.classList.remove).toHaveBeenCalledWith(
                'las-theme-light', 'las-theme-dark'
            );
            expect(document.documentElement.removeAttribute).toHaveBeenCalledWith('data-theme');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:destroyed');
        });
    });
});