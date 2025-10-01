/**
 * Integration tests for LivePreview module
 * 
 * @since 2.0.0
 */

describe('LivePreview', () => {
    let livePreview;
    let mockCore;
    let mockSettingsManager;

    beforeEach(() => {
        // Mock DOM
        document.head.innerHTML = '';
        document.body.innerHTML = `
            <div id="adminmenu"></div>
            <div id="wpadminbar"></div>
            <div id="wpbody-content"></div>
        `;

        // Mock settings manager
        mockSettingsManager = {
            getAll: jest.fn(() => ({
                'menu.background_color': '#23282d',
                'menu.text_color': '#ffffff',
                'adminbar.background_color': '#23282d'
            }))
        };

        // Mock core
        mockCore = {
            log: jest.fn(),
            handleError: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            getModule: jest.fn((name) => {
                if (name === 'settings-manager') return mockSettingsManager;
                return null;
            }),
            config: {
                debug: true
            }
        };

        // Load the module
        require('../../assets/js/modules/live-preview.js');
        livePreview = new window.LASLivePreview(mockCore);
    });

    afterEach(() => {
        if (livePreview && typeof livePreview.destroy === 'function') {
            livePreview.destroy();
        }
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('Initialization', () => {
        test('should initialize with core reference', () => {
            expect(livePreview.core).toBe(mockCore);
            expect(livePreview.debounceDelay).toBe(300);
            expect(livePreview.cacheEnabled).toBe(true);
        });

        test('should create style elements', () => {
            expect(livePreview.styleElements.size).toBe(4);
            expect(livePreview.styleElements.has('main')).toBe(true);
            expect(livePreview.styleElements.has('variables')).toBe(true);
            expect(livePreview.styleElements.has('custom')).toBe(true);
            expect(livePreview.styleElements.has('responsive')).toBe(true);
        });

        test('should create style elements in DOM', () => {
            expect(document.getElementById('las-live-preview-main')).toBeTruthy();
            expect(document.getElementById('las-live-preview-vars')).toBeTruthy();
            expect(document.getElementById('las-live-preview-custom')).toBeTruthy();
            expect(document.getElementById('las-live-preview-responsive')).toBeTruthy();
        });

        test('should setup event listeners', () => {
            expect(mockCore.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('settings:bulk-changed', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('settings:synced', expect.any(Function));
            expect(mockCore.on).toHaveBeenCalledWith('theme:changed', expect.any(Function));
        });

        test('should initialize style map', () => {
            expect(livePreview.styleMap).toBeDefined();
            expect(livePreview.styleMap['menu.background_color']).toBeDefined();
            expect(livePreview.styleMap['menu.background_color'].selector).toBe('#adminmenu, #adminmenu .wp-submenu');
            expect(livePreview.styleMap['menu.background_color'].property).toBe('background-color');
        });
    });

    describe('CSS Generation', () => {
        test('should generate CSS variables from settings', () => {
            const settings = {
                'menu.background_color': '#ff0000',
                'menu.text_color': '#ffffff'
            };
            
            const css = livePreview.generateVariablesCSS(settings);
            
            expect(css).toContain(':root {');
            expect(css).toContain('--las-menu-bg: #ff0000;');
            expect(css).toContain('--las-menu-text: #ffffff;');
        });

        test('should generate main CSS from settings', () => {
            const settings = {
                'menu.background_color': '#ff0000'
            };
            
            const css = livePreview.generateMainCSS(settings);
            
            expect(css).toContain('#adminmenu, #adminmenu .wp-submenu {');
            expect(css).toContain('background-color: #ff0000;');
        });

        test('should generate CSS for specific setting', () => {
            const styleConfig = {
                selector: '#test',
                property: 'color',
                cssVar: '--test-color'
            };
            
            const css = livePreview.generateCSSForSetting('test.color', '#ff0000', styleConfig);
            
            expect(css).toBe('#test {\n  color: #ff0000;\n}');
        });

        test('should handle empty or invalid settings', () => {
            const css = livePreview.generateCSSForSetting('invalid.setting', null, null);
            expect(css).toBe('');
        });

        test('should cache generated CSS', () => {
            const settings = { 'menu.background_color': '#ff0000' };
            
            // First call
            const css1 = livePreview.generateVariablesCSS(settings);
            
            // Second call should use cache
            const css2 = livePreview.generateVariablesCSS(settings);
            
            expect(css1).toBe(css2);
            expect(livePreview.cssCache.size).toBeGreaterThan(0);
        });
    });

    describe('Value Processing', () => {
        test('should process color values correctly', () => {
            expect(livePreview.processColorValue('ff0000')).toBe('#ff0000');
            expect(livePreview.processColorValue('#ff0000')).toBe('#ff0000');
            expect(livePreview.processColorValue('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
            expect(livePreview.processColorValue('transparent')).toBe('transparent');
        });

        test('should process size values correctly', () => {
            expect(livePreview.processSizeValue('16')).toBe('16px');
            expect(livePreview.processSizeValue('16px')).toBe('16px');
            expect(livePreview.processSizeValue('1.5em')).toBe('1.5em');
            expect(livePreview.processSizeValue('100%')).toBe('100%');
        });

        test('should process font family values correctly', () => {
            expect(livePreview.processFontFamily('system')).toContain('-apple-system');
            expect(livePreview.processFontFamily('arial')).toBe('Arial, sans-serif');
            expect(livePreview.processFontFamily('Custom Font')).toBe('Custom Font');
        });

        test('should process values based on property type', () => {
            expect(livePreview.processValue('#ff0000', 'background-color')).toBe('#ff0000');
            expect(livePreview.processValue('16', 'font-size')).toBe('16px');
            expect(livePreview.processValue('system', 'font-family')).toContain('-apple-system');
        });
    });

    describe('Style Updates', () => {
        test('should handle individual setting changes', () => {
            jest.useFakeTimers();
            
            livePreview.handleSettingChange('menu.background_color', '#ff0000', '#000000');
            
            // Should debounce the update
            expect(livePreview.debounceTimers.has('menu.background_color')).toBe(true);
            
            // Fast-forward past debounce delay
            jest.advanceTimersByTime(300);
            
            expect(mockCore.emit).toHaveBeenCalledWith('preview:updated', {
                key: 'menu.background_color',
                value: '#ff0000',
                oldValue: '#000000'
            });
            
            jest.useRealTimers();
        });

        test('should handle bulk setting changes', () => {
            jest.useFakeTimers();
            
            const changes = {
                'menu.background_color': { value: '#ff0000', oldValue: '#000000' },
                'menu.text_color': { value: '#ffffff', oldValue: '#cccccc' }
            };
            
            livePreview.handleBulkSettingChange(changes);
            
            jest.advanceTimersByTime(300);
            
            expect(mockCore.emit).toHaveBeenCalledWith('preview:bulk-updated', { changes });
            
            jest.useRealTimers();
        });

        test('should handle synced changes immediately', () => {
            const changes = {
                'menu.background_color': '#ff0000'
            };
            
            livePreview.handleSyncedChanges(changes);
            
            expect(mockCore.emit).toHaveBeenCalledWith('preview:synced', { changes });
        });

        test('should apply CSS to style elements', () => {
            const css = 'body { color: red; }';
            
            livePreview.applyCSS('main', css);
            
            const styleElement = document.getElementById('las-live-preview-main');
            expect(styleElement.textContent).toBe(css);
        });

        test('should handle CSS application errors', () => {
            livePreview.applyCSS('nonexistent', 'body { color: red; }');
            
            expect(mockCore.handleError).toHaveBeenCalledWith(
                'Style element not found: nonexistent'
            );
        });
    });

    describe('Custom CSS', () => {
        test('should update custom CSS', () => {
            const customCSS = 'body { background: blue; }';
            
            livePreview.updateCustomCSS(customCSS);
            
            const styleElement = document.getElementById('las-live-preview-custom');
            expect(styleElement.textContent).toBe(customCSS);
        });

        test('should sanitize dangerous CSS', () => {
            const dangerousCSS = 'body { background: url(javascript:alert("xss")); }';
            
            livePreview.updateCustomCSS(dangerousCSS);
            
            const styleElement = document.getElementById('las-live-preview-custom');
            expect(styleElement.textContent).not.toContain('javascript:');
        });

        test('should sanitize CSS expressions', () => {
            const expressionCSS = 'body { width: expression(alert("xss")); }';
            
            livePreview.updateCustomCSS(expressionCSS);
            
            const styleElement = document.getElementById('las-live-preview-custom');
            expect(styleElement.textContent).not.toContain('expression(');
        });
    });

    describe('Responsive CSS', () => {
        test('should generate responsive CSS for mobile', () => {
            const settings = {
                'mobile.menu_collapse': true
            };
            
            const css = livePreview.generateResponsiveCSS(settings);
            
            expect(css).toContain('@media (max-width: 782px)');
            expect(css).toContain('#adminmenu { display: none; }');
        });

        test('should generate responsive CSS for tablet', () => {
            const settings = {
                'tablet.sidebar_width': '200px'
            };
            
            const css = livePreview.generateResponsiveCSS(settings);
            
            expect(css).toContain('@media (min-width: 783px) and (max-width: 1024px)');
            expect(css).toContain('#adminmenuwrap { width: 200px; }');
        });
    });

    describe('Performance', () => {
        test('should track performance metrics', () => {
            livePreview.updatePerformanceMetrics();
            
            const metrics = livePreview.getPerformanceMetrics();
            
            expect(metrics.updateCount).toBe(1);
            expect(metrics.lastUpdateTime).toBeGreaterThan(0);
            expect(metrics.cacheSize).toBeGreaterThanOrEqual(0);
        });

        test('should clear CSS cache', () => {
            // Add something to cache
            livePreview.cssCache.set('test', 'test-css');
            
            livePreview.clearCache();
            
            expect(livePreview.cssCache.size).toBe(0);
        });

        test('should enable/disable caching', () => {
            livePreview.setCacheEnabled(false);
            
            expect(livePreview.cacheEnabled).toBe(false);
            expect(livePreview.cssCache.size).toBe(0);
            
            livePreview.setCacheEnabled(true);
            expect(livePreview.cacheEnabled).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle setting change errors', () => {
            // Mock an error in updateStyleForSetting
            jest.spyOn(livePreview, 'updateStyleForSetting').mockImplementation(() => {
                throw new Error('Update error');
            });
            
            livePreview.handleSettingChange('test.key', 'value', 'oldValue');
            
            // Should not throw, error should be handled
            expect(mockCore.handleError).toHaveBeenCalledWith(
                'Failed to handle setting change: test.key',
                expect.any(Error)
            );
        });

        test('should handle CSS generation errors', () => {
            // Mock an error in generateMainCSS
            jest.spyOn(livePreview, 'generateMainCSS').mockImplementation(() => {
                throw new Error('Generation error');
            });
            
            livePreview.generateAndApplyStyles({});
            
            expect(mockCore.handleError).toHaveBeenCalledWith(
                'Failed to generate and apply styles',
                expect.any(Error)
            );
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            // Add some timers and cache
            livePreview.debounceTimers.set('test', setTimeout(() => {}, 1000));
            livePreview.cssCache.set('test', 'test-css');
            
            const initialStyleElements = document.querySelectorAll('style[id^="las-live-preview"]').length;
            
            livePreview.destroy();
            
            expect(livePreview.debounceTimers.size).toBe(0);
            expect(livePreview.styleElements.size).toBe(0);
            expect(livePreview.cssCache.size).toBe(0);
            
            // Style elements should be removed from DOM
            const remainingStyleElements = document.querySelectorAll('style[id^="las-live-preview"]').length;
            expect(remainingStyleElements).toBeLessThan(initialStyleElements);
        });
    });
});