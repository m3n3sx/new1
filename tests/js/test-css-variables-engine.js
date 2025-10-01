/**
 * Live Admin Styler - CSS Variables Engine Tests
 * 
 * Comprehensive tests for the CSS variables engine including
 * variable management, scoping, theming, and browser compatibility.
 */

import CSSVariablesEngine from '../../assets/js/modules/css-variables-engine.js';

describe('CSSVariablesEngine Module', () => {
    let engine;
    let mockCore;
    
    beforeEach(() => {
        // Create mock core
        mockCore = {
            on: jest.fn(),
            emit: jest.fn(),
            get: jest.fn()
        };
        
        // Mock CSS.supports
        global.CSS = {
            supports: jest.fn((property, value) => {
                if (property === 'color' && value === 'var(--test)') return true;
                if (property === 'color' && value === 'color-mix(in srgb, red, blue)') return false;
                return true;
            })
        };
        
        // Mock localStorage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });
        
        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        });
        
        // Mock getComputedStyle
        Object.defineProperty(window, 'getComputedStyle', {
            value: jest.fn(() => ({
                getPropertyValue: jest.fn(() => '#2271b1')
            }))
        });
        
        // Initialize engine
        engine = new CSSVariablesEngine(mockCore);
    });
    
    afterEach(() => {
        if (engine) {
            engine.destroy();
        }
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(engine.variables).toBeInstanceOf(Map);
            expect(engine.scopes).toBeInstanceOf(Map);
            expect(engine.themes).toBeInstanceOf(Map);
            expect(engine.currentTheme).toBe('default');
        });
        
        test('should detect browser support', () => {
            expect(engine.supportsCustomProperties).toBe(true);
            expect(engine.supportsColorMix).toBe(false);
        });
        
        test('should setup root scope', () => {
            expect(engine.scopes.has('root')).toBe(true);
            const rootScope = engine.scopes.get('root');
            expect(rootScope.element).toBe(document.documentElement);
            expect(rootScope.parent).toBe(null);
        });
        
        test('should bind core events', () => {
            expect(mockCore.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('theme:change', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('css-variables:set', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('css-variables:get', expect.any(Function));
        });
        
        test('should load default themes', () => {
            expect(engine.themes.has('default')).toBe(true);
            expect(engine.themes.has('dark')).toBe(true);
            expect(engine.themes.has('light')).toBe(true);
        });
    });
    
    describe('Variable Management', () => {
        test('should set variable with normalized name', () => {
            const result = engine.setVariable('primary-color', '#ff0000');
            
            expect(result).toBe(true);
            expect(engine.variables.has('--las-primary-color')).toBe(true);
            expect(engine.getVariable('--las-primary-color')).toBe('#ff0000');
        });
        
        test('should set variable with already normalized name', () => {
            const result = engine.setVariable('--las-secondary-color', '#00ff00');
            
            expect(result).toBe(true);
            expect(engine.variables.has('--las-secondary-color')).toBe(true);
            expect(engine.getVariable('--las-secondary-color')).toBe('#00ff00');
        });
        
        test('should validate color values', () => {
            expect(engine.setVariable('test-color', '#ff0000')).toBe(true);
            expect(engine.setVariable('test-color', 'rgb(255, 0, 0)')).toBe(true);
            expect(engine.setVariable('test-color', 'invalid-color')).toBe(false);
        });
        
        test('should validate size values', () => {
            expect(engine.setVariable('test-size', '16px')).toBe(true);
            expect(engine.setVariable('test-size', '1.5rem')).toBe(true);
            expect(engine.setVariable('test-size', '100%')).toBe(true);
            expect(engine.setVariable('test-size', 'invalid-size')).toBe(false);
        });
        
        test('should get variable from registry', () => {
            engine.setVariable('test-var', 'test-value');
            expect(engine.getVariable('test-var')).toBe('test-value');
        });
        
        test('should get variable from computed styles', () => {
            expect(engine.getVariable('non-existent-var')).toBe('#2271b1');
        });
        
        test('should remove variable', () => {
            engine.setVariable('temp-var', 'temp-value');
            expect(engine.variables.has('--las-temp-var')).toBe(true);
            
            engine.removeVariable('temp-var');
            expect(engine.variables.has('--las-temp-var')).toBe(false);
        });
        
        test('should emit events when variable changes', () => {
            engine.setVariable('event-test', 'value');
            
            expect(mockCore.emit).toHaveBeenCalledWith('css-variables:changed', {
                name: '--las-event-test',
                value: 'value',
                scope: 'root'
            });
        });
    });
    
    describe('Scope Management', () => {
        test('should create new scope', () => {
            const element = document.createElement('div');
            const result = engine.createScope('test-scope', element);
            
            expect(result).toBe(true);
            expect(engine.scopes.has('test-scope')).toBe(true);
            
            const scope = engine.scopes.get('test-scope');
            expect(scope.element).toBe(element);
            expect(scope.parent).toBe(engine.scopes.get('root'));
        });
        
        test('should not create duplicate scope', () => {
            const element = document.createElement('div');
            engine.createScope('duplicate-scope', element);
            
            const result = engine.createScope('duplicate-scope', element);
            expect(result).toBe(false);
        });
        
        test('should remove scope', () => {
            const element = document.createElement('div');
            engine.createScope('removable-scope', element);
            engine.setVariable('scoped-var', 'value', 'removable-scope');
            
            const result = engine.removeScope('removable-scope');
            
            expect(result).toBe(true);
            expect(engine.scopes.has('removable-scope')).toBe(false);
        });
        
        test('should not remove root scope', () => {
            const result = engine.removeScope('root');
            expect(result).toBe(false);
            expect(engine.scopes.has('root')).toBe(true);
        });
        
        test('should set variable in specific scope', () => {
            const element = document.createElement('div');
            engine.createScope('custom-scope', element);
            
            engine.setVariable('scoped-var', 'scoped-value', 'custom-scope');
            
            const scope = engine.scopes.get('custom-scope');
            expect(scope.variables.has('--las-scoped-var')).toBe(true);
        });
    });
    
    describe('Theme Management', () => {
        test('should apply theme', () => {
            const result = engine.applyTheme('dark');
            
            expect(result).toBe(true);
            expect(engine.currentTheme).toBe('dark');
            expect(mockCore.emit).toHaveBeenCalledWith('theme:applied', {
                theme: 'dark',
                previousTheme: 'default'
            });
        });
        
        test('should not apply non-existent theme', () => {
            const result = engine.applyTheme('non-existent');
            
            expect(result).toBe(false);
            expect(engine.currentTheme).toBe('default');
        });
        
        test('should create custom theme', () => {
            const customVariables = {
                '--las-custom-color': '#123456'
            };
            
            const result = engine.createTheme('custom', customVariables);
            
            expect(result).toBe(true);
            expect(engine.themes.has('custom')).toBe(true);
            
            const theme = engine.themes.get('custom');
            expect(theme.variables['--las-custom-color']).toBe('#123456');
        });
        
        test('should delete custom theme', () => {
            engine.createTheme('deletable', { '--test': 'value' });
            
            const result = engine.deleteTheme('deletable');
            
            expect(result).toBe(true);
            expect(engine.themes.has('deletable')).toBe(false);
        });
        
        test('should not delete built-in themes', () => {
            const result = engine.deleteTheme('default');
            
            expect(result).toBe(false);
            expect(engine.themes.has('default')).toBe(true);
        });
        
        test('should get all themes', () => {
            const themes = engine.getThemes();
            
            expect(themes.default).toBeDefined();
            expect(themes.dark).toBeDefined();
            expect(themes.light).toBeDefined();
        });
        
        test('should get current theme', () => {
            engine.applyTheme('dark');
            expect(engine.getCurrentTheme()).toBe('dark');
        });
    });
    
    describe('Theme Structure', () => {
        test('should have complete default theme', () => {
            const defaultTheme = engine.themes.get('default');
            
            expect(defaultTheme.variables['--las-primary-500']).toBeDefined();
            expect(defaultTheme.variables['--las-neutral-100']).toBeDefined();
            expect(defaultTheme.variables['--las-success']).toBeDefined();
            expect(defaultTheme.variables['--las-space-md']).toBeDefined();
            expect(defaultTheme.variables['--las-font-size-base']).toBeDefined();
            expect(defaultTheme.variables['--las-radius-md']).toBeDefined();
            expect(defaultTheme.variables['--las-shadow-md']).toBeDefined();
            expect(defaultTheme.variables['--las-transition-base']).toBeDefined();
        });
        
        test('should have dark theme variations', () => {
            const darkTheme = engine.themes.get('dark');
            const defaultTheme = engine.themes.get('default');
            
            // Dark theme should have different neutral colors
            expect(darkTheme.variables['--las-neutral-50']).not.toBe(defaultTheme.variables['--las-neutral-50']);
            expect(darkTheme.variables['--las-neutral-900']).not.toBe(defaultTheme.variables['--las-neutral-900']);
        });
    });
    
    describe('Value Validation', () => {
        test('should validate color values', () => {
            expect(engine.isValidColor('#ff0000')).toBe(true);
            expect(engine.isValidColor('#fff')).toBe(true);
            expect(engine.isValidColor('rgb(255, 0, 0)')).toBe(true);
            expect(engine.isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
            expect(engine.isValidColor('hsl(0, 100%, 50%)')).toBe(true);
            expect(engine.isValidColor('var(--color)')).toBe(true);
            expect(engine.isValidColor('invalid')).toBe(false);
        });
        
        test('should validate size values', () => {
            expect(engine.isValidSize('16px')).toBe(true);
            expect(engine.isValidSize('1.5rem')).toBe(true);
            expect(engine.isValidSize('100%')).toBe(true);
            expect(engine.isValidSize('50vh')).toBe(true);
            expect(engine.isValidSize('0')).toBe(true);
            expect(engine.isValidSize('auto')).toBe(true);
            expect(engine.isValidSize('var(--size)')).toBe(true);
            expect(engine.isValidSize('invalid')).toBe(false);
        });
        
        test('should normalize variable names', () => {
            expect(engine.normalizeVariableName('color')).toBe('--las-color');
            expect(engine.normalizeVariableName('--custom-var')).toBe('--custom-var');
            expect(engine.normalizeVariableName('--las-existing')).toBe('--las-existing');
        });
    });
    
    describe('Fallback Generation', () => {
        test('should generate color fallbacks', () => {
            expect(engine.generateColorFallback('color-mix(in srgb, red, blue)')).toBe('#2271b1');
            expect(engine.generateColorFallback('var(--primary)')).toBe('#2271b1');
            expect(engine.generateColorFallback('#ff0000')).toBe('#ff0000');
        });
        
        test('should generate appropriate fallbacks by variable type', () => {
            expect(engine.generateFallback('--las-shadow-md', 'complex-shadow')).toBe('none');
            expect(engine.generateFallback('--las-radius-lg', '12px')).toBe('0');
            expect(engine.generateFallback('--las-color-primary', '#ff0000')).toBe('#2271b1');
        });
    });
    
    describe('Observer Pattern', () => {
        test('should observe variable changes', () => {
            const callback = jest.fn();
            const unobserve = engine.observe('test-var', callback);
            
            engine.setVariable('test-var', 'new-value');
            
            expect(callback).toHaveBeenCalledWith('new-value', '--las-test-var', 'root');
            
            // Test unobserve
            unobserve();
            engine.setVariable('test-var', 'another-value');
            expect(callback).toHaveBeenCalledTimes(1);
        });
        
        test('should handle observer errors gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Observer error');
            });
            
            engine.observe('error-var', errorCallback);
            
            // Should not throw
            expect(() => {
                engine.setVariable('error-var', 'value');
            }).not.toThrow();
        });
    });
    
    describe('Event Handling', () => {
        test('should handle settings change events', () => {
            engine.handleSettingsChange({ key: 'color_primary', value: '#ff0000' });
            
            expect(engine.getVariable('--las-color-primary')).toBe('#ff0000');
        });
        
        test('should handle theme change events', () => {
            engine.handleThemeChange({ theme: 'dark' });
            
            expect(engine.currentTheme).toBe('dark');
        });
        
        test('should handle variable set events', () => {
            engine.handleVariableSet({
                name: 'event-var',
                value: 'event-value',
                scope: 'root',
                options: {}
            });
            
            expect(engine.getVariable('--las-event-var')).toBe('event-value');
        });
        
        test('should handle variable get events with callback', () => {
            const callback = jest.fn();
            engine.setVariable('callback-var', 'callback-value');
            
            engine.handleVariableGet({
                name: 'callback-var',
                scope: 'root',
                callback: callback
            });
            
            expect(callback).toHaveBeenCalledWith('callback-value');
        });
    });
    
    describe('System Theme Detection', () => {
        test('should handle system theme changes', () => {
            const mockEvent = { matches: true };
            engine.handleSystemThemeChange(mockEvent);
            
            expect(engine.currentTheme).toBe('dark');
        });
        
        test('should handle light system theme', () => {
            const mockEvent = { matches: false };
            engine.handleSystemThemeChange(mockEvent);
            
            expect(engine.currentTheme).toBe('light');
        });
    });
    
    describe('Import/Export', () => {
        test('should export theme', () => {
            const exported = engine.exportTheme('default');
            
            expect(exported).toBeDefined();
            expect(exported.name).toBe('Default');
            expect(exported.variables).toBeDefined();
            expect(exported.exported).toBeDefined();
        });
        
        test('should not export non-existent theme', () => {
            const exported = engine.exportTheme('non-existent');
            expect(exported).toBe(null);
        });
        
        test('should import theme', () => {
            const themeData = {
                name: 'imported',
                variables: {
                    '--las-imported-color': '#123456'
                }
            };
            
            const result = engine.importTheme(themeData);
            
            expect(result).toBe(true);
            expect(engine.themes.has('imported')).toBe(true);
        });
        
        test('should not import invalid theme data', () => {
            const invalidData = { name: 'invalid' }; // missing variables
            
            const result = engine.importTheme(invalidData);
            expect(result).toBe(false);
        });
    });
    
    describe('Browser Compatibility', () => {
        test('should enable fallback mode when CSS custom properties not supported', () => {
            // Mock unsupported browser
            CSS.supports.mockImplementation(() => false);
            
            const fallbackEngine = new CSSVariablesEngine(mockCore);
            
            expect(fallbackEngine.supportsCustomProperties).toBe(false);
            expect(fallbackEngine.fallbackMode).toBe(true);
        });
        
        test('should create fallback stylesheet in fallback mode', () => {
            engine.enableFallbackMode();
            
            expect(engine.fallbackStylesheet).toBeDefined();
            expect(engine.fallbackStylesheet.id).toBe('las-css-variables-fallback');
        });
    });
    
    describe('Public API', () => {
        test('should get all variables in scope', () => {
            engine.setVariable('api-var-1', 'value1');
            engine.setVariable('api-var-2', 'value2');
            
            const variables = engine.getVariables('root');
            
            expect(variables['--las-api-var-1']).toBe('value1');
            expect(variables['--las-api-var-2']).toBe('value2');
        });
        
        test('should reset to default state', () => {
            engine.setVariable('temp-var', 'temp-value');
            engine.applyTheme('dark');
            
            engine.reset();
            
            expect(engine.currentTheme).toBe('default');
            expect(engine.getVariable('--las-temp-var')).toBe(null);
        });
    });
    
    describe('Memory Management', () => {
        test('should clean up on destroy', () => {
            engine.setVariable('cleanup-var', 'value');
            engine.createScope('cleanup-scope', document.createElement('div'));
            
            engine.destroy();
            
            expect(engine.variables.size).toBe(0);
            expect(engine.scopes.size).toBe(0);
            expect(engine.themes.size).toBe(0);
        });
    });
});