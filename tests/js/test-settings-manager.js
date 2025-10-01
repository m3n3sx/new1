/**
 * Unit Tests for LASSettingsManager
 * Tests settings operations, debouncing, validation, and synchronization
 */

describe('LASSettingsManager', () => {
    let mockCore;
    let mockAjaxManager;
    let mockPreviewEngine;
    let mockErrorHandler;
    let settingsManager;
    let originalLocalStorage;
    let originalBroadcastChannel;

    beforeEach(() => {
        // Mock localStorage
        originalLocalStorage = window.localStorage;
        const mockStorage = {
            data: {},
            getItem: jest.fn((key) => mockStorage.data[key] || null),
            setItem: jest.fn((key, value) => { mockStorage.data[key] = value; }),
            removeItem: jest.fn((key) => { delete mockStorage.data[key]; }),
            clear: jest.fn(() => { mockStorage.data = {}; })
        };
        Object.defineProperty(window, 'localStorage', { value: mockStorage });

        // Mock BroadcastChannel
        originalBroadcastChannel = window.BroadcastChannel;
        window.BroadcastChannel = jest.fn().mockImplementation(() => ({
            postMessage: jest.fn(),
            close: jest.fn(),
            onmessage: null
        }));

        // Mock core and modules
        mockErrorHandler = {
            showError: jest.fn(),
            showSuccess: jest.fn()
        };

        mockAjaxManager = {
            saveSettings: jest.fn().mockResolvedValue({ success: true }),
            loadSettings: jest.fn().mockResolvedValue({
                menu_background_color: '#123456',
                menu_text_color: '#ffffff'
            })
        };

        mockPreviewEngine = {
            updateSetting: jest.fn()
        };

        mockCore = {
            get: jest.fn((module) => {
                switch (module) {
                    case 'error': return mockErrorHandler;
                    case 'ajax': return mockAjaxManager;
                    case 'preview': return mockPreviewEngine;
                    default: return null;
                }
            }),
            emit: jest.fn()
        };

        settingsManager = new LASSettingsManager(mockCore);
    });

    afterEach(() => {
        // Restore original implementations
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
        window.BroadcastChannel = originalBroadcastChannel;
        
        // Cleanup
        if (settingsManager) {
            settingsManager.cleanup();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await settingsManager.init();
            
            expect(settingsManager.validator).toBeInstanceOf(LASSettingsValidator);
            expect(settingsManager.broadcastChannel).toBeDefined();
            expect(mockAjaxManager.loadSettings).toHaveBeenCalled();
        });

        test('should fallback to localStorage when server load fails', async () => {
            mockAjaxManager.loadSettings.mockRejectedValue(new Error('Server error'));
            
            // Pre-populate localStorage with backup data
            const backup = {
                settings: { test_setting: 'test_value' },
                timestamp: Date.now(),
                version: '1.0'
            };
            window.localStorage.setItem('las_settings_backup', JSON.stringify(backup));
            
            await settingsManager.init();
            
            expect(settingsManager.get('test_setting')).toBe('test_value');
        });

        test('should use default settings when both server and localStorage fail', async () => {
            mockAjaxManager.loadSettings.mockRejectedValue(new Error('Server error'));
            window.localStorage.getItem.mockReturnValue(null);
            
            await settingsManager.init();
            
            expect(settingsManager.get('menu_background_color')).toBe('#23282d');
            expect(settingsManager.get('enable_live_preview')).toBe(true);
        });
    });

    describe('Setting Operations', () => {
        beforeEach(async () => {
            await settingsManager.init();
        });

        test('should set and get settings correctly', () => {
            settingsManager.set('test_key', 'test_value');
            
            expect(settingsManager.get('test_key')).toBe('test_value');
            expect(mockPreviewEngine.updateSetting).toHaveBeenCalledWith('test_key', 'test_value');
            expect(mockCore.emit).toHaveBeenCalledWith('settings:changed', expect.objectContaining({
                key: 'test_key',
                value: 'test_value'
            }));
        });

        test('should return default value for non-existent settings', () => {
            expect(settingsManager.get('non_existent', 'default')).toBe('default');
            expect(settingsManager.get('non_existent')).toBeNull();
        });

        test('should get all settings', () => {
            settingsManager.set('key1', 'value1');
            settingsManager.set('key2', 'value2');
            
            const allSettings = settingsManager.getAll();
            
            expect(allSettings).toHaveProperty('key1', 'value1');
            expect(allSettings).toHaveProperty('key2', 'value2');
            expect(allSettings).toHaveProperty('menu_background_color'); // Default setting
        });

        test('should skip preview update when skipPreview option is true', () => {
            settingsManager.set('test_key', 'test_value', { skipPreview: true });
            
            expect(mockPreviewEngine.updateSetting).not.toHaveBeenCalled();
        });

        test('should skip save when skipSave option is true', () => {
            jest.useFakeTimers();
            
            settingsManager.set('test_key', 'test_value', { skipSave: true });
            
            // Fast-forward time to trigger debounced save
            jest.advanceTimersByTime(500);
            
            expect(mockAjaxManager.saveSettings).not.toHaveBeenCalled();
            
            jest.useRealTimers();
        });
    });

    describe('Debounced Saving', () => {
        beforeEach(async () => {
            await settingsManager.init();
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should debounce save operations', () => {
            settingsManager.set('test_key', 'value1');
            settingsManager.set('test_key', 'value2');
            settingsManager.set('test_key', 'value3');
            
            // Should not have saved yet
            expect(mockAjaxManager.saveSettings).not.toHaveBeenCalled();
            
            // Fast-forward past debounce delay
            jest.advanceTimersByTime(400);
            
            // Should have saved only once with the final value
            expect(mockAjaxManager.saveSettings).toHaveBeenCalledTimes(1);
            expect(mockAjaxManager.saveSettings).toHaveBeenCalledWith({ test_key: 'value3' });
        });

        test('should handle multiple different keys independently', () => {
            settingsManager.set('key1', 'value1');
            settingsManager.set('key2', 'value2');
            
            jest.advanceTimersByTime(400);
            
            expect(mockAjaxManager.saveSettings).toHaveBeenCalledTimes(2);
            expect(mockAjaxManager.saveSettings).toHaveBeenCalledWith({ key1: 'value1' });
            expect(mockAjaxManager.saveSettings).toHaveBeenCalledWith({ key2: 'value2' });
        });

        test('should force save all pending changes', () => {
            settingsManager.set('key1', 'value1');
            settingsManager.set('key2', 'value2');
            
            // Force save before debounce timer expires
            settingsManager.forceSaveAll();
            
            expect(mockAjaxManager.saveSettings).toHaveBeenCalledWith({
                key1: 'value1',
                key2: 'value2'
            });
        });
    });

    describe('Multi-tab Synchronization', () => {
        beforeEach(async () => {
            await settingsManager.init();
        });

        test('should broadcast changes via BroadcastChannel', () => {
            const mockBroadcastChannel = settingsManager.broadcastChannel;
            
            settingsManager.set('test_key', 'test_value');
            
            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
                type: 'setting_changed',
                key: 'test_key',
                value: 'test_value',
                timestamp: expect.any(Number)
            });
        });

        test('should handle incoming broadcast messages', () => {
            const mockMessage = {
                data: {
                    type: 'setting_changed',
                    key: 'remote_key',
                    value: 'remote_value',
                    timestamp: Date.now()
                }
            };
            
            settingsManager.handleBroadcastMessage(mockMessage);
            
            expect(settingsManager.get('remote_key')).toBe('remote_value');
            expect(mockPreviewEngine.updateSetting).toHaveBeenCalledWith('remote_key', 'remote_value');
            expect(mockCore.emit).toHaveBeenCalledWith('settings:synced', expect.objectContaining({
                key: 'remote_key',
                value: 'remote_value'
            }));
        });

        test('should fallback to localStorage when BroadcastChannel fails', () => {
            // Mock BroadcastChannel to throw error
            settingsManager.broadcastChannel.postMessage.mockImplementation(() => {
                throw new Error('BroadcastChannel error');
            });
            
            settingsManager.set('test_key', 'test_value');
            
            // Should have used localStorage fallback
            expect(window.localStorage.setItem).toHaveBeenCalledWith(
                'las_settings_sync',
                expect.stringContaining('test_key')
            );
        });
    });

    describe('Local Storage Backup', () => {
        beforeEach(async () => {
            await settingsManager.init();
        });

        test('should save to localStorage on setting change', () => {
            settingsManager.set('test_key', 'test_value');
            
            expect(window.localStorage.setItem).toHaveBeenCalledWith(
                'las_settings_backup',
                expect.stringContaining('test_key')
            );
        });

        test('should load from localStorage backup', () => {
            const backup = {
                settings: {
                    backup_key: 'backup_value',
                    menu_background_color: '#654321'
                },
                timestamp: Date.now(),
                version: '1.0'
            };
            
            window.localStorage.getItem.mockReturnValue(JSON.stringify(backup));
            
            const loaded = settingsManager.loadFromLocalStorage();
            
            expect(loaded).toBe(true);
            expect(settingsManager.get('backup_key')).toBe('backup_value');
            expect(settingsManager.get('menu_background_color')).toBe('#654321');
        });

        test('should handle corrupted localStorage data gracefully', () => {
            window.localStorage.getItem.mockReturnValue('invalid json');
            
            const loaded = settingsManager.loadFromLocalStorage();
            
            expect(loaded).toBe(false);
            // Should fallback to defaults
            expect(settingsManager.get('menu_background_color')).toBe('#23282d');
        });
    });

    describe('Reset Operations', () => {
        beforeEach(async () => {
            await settingsManager.init();
        });

        test('should reset individual setting to default', () => {
            settingsManager.set('menu_background_color', '#custom');
            settingsManager.reset('menu_background_color');
            
            expect(settingsManager.get('menu_background_color')).toBe('#23282d');
        });

        test('should reset all settings to defaults', () => {
            settingsManager.set('menu_background_color', '#custom1');
            settingsManager.set('menu_text_color', '#custom2');
            
            settingsManager.resetAll();
            
            expect(settingsManager.get('menu_background_color')).toBe('#23282d');
            expect(settingsManager.get('menu_text_color')).toBe('#ffffff');
            expect(mockCore.emit).toHaveBeenCalledWith('settings:reset', expect.any(Object));
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await settingsManager.init();
        });

        test('should handle validation errors gracefully', () => {
            // Mock validator to throw error
            settingsManager.validator.validateAndSanitize = jest.fn().mockImplementation(() => {
                throw new Error('Validation failed');
            });
            
            settingsManager.set('test_key', 'invalid_value');
            
            expect(mockErrorHandler.showError).toHaveBeenCalledWith(
                expect.stringContaining('Failed to update setting')
            );
        });

        test('should handle save errors gracefully', async () => {
            jest.useFakeTimers();
            
            mockAjaxManager.saveSettings.mockRejectedValue(new Error('Save failed'));
            
            settingsManager.set('test_key', 'test_value');
            
            // Trigger debounced save
            jest.advanceTimersByTime(400);
            
            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockErrorHandler.showError).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save setting')
            );
            
            jest.useRealTimers();
        });

        test('should handle broadcast message errors gracefully', () => {
            const invalidMessage = {
                data: {
                    type: 'setting_changed',
                    // Missing required fields
                }
            };
            
            // Should not throw error
            expect(() => {
                settingsManager.handleBroadcastMessage(invalidMessage);
            }).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        beforeEach(async () => {
            await settingsManager.init();
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should cleanup resources properly', () => {
            settingsManager.set('test_key', 'test_value'); // Create pending save
            
            settingsManager.cleanup();
            
            expect(settingsManager.broadcastChannel.close).toHaveBeenCalled();
            expect(mockAjaxManager.saveSettings).toHaveBeenCalled(); // Force save
            expect(window.localStorage.setItem).toHaveBeenCalledWith(
                'las_settings_backup',
                expect.any(String)
            );
        });
    });
});

describe('LASSettingsValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new LASSettingsValidator();
    });

    describe('Color Validation', () => {
        test('should validate hex colors', () => {
            expect(validator.validateAndSanitize('menu_background_color', '#123456')).toBe('#123456');
            expect(validator.validateAndSanitize('menu_background_color', '#abc')).toBe('#aabbcc');
            expect(validator.validateAndSanitize('menu_background_color', '#ABC')).toBe('#AABBCC');
        });

        test('should validate RGB colors', () => {
            const rgb = 'rgb(255, 128, 0)';
            expect(validator.validateAndSanitize('menu_background_color', rgb)).toBe(rgb);
        });

        test('should validate RGBA colors', () => {
            const rgba = 'rgba(255, 128, 0, 0.5)';
            expect(validator.validateAndSanitize('menu_background_color', rgba)).toBe(rgba);
        });

        test('should reject invalid colors and return default', () => {
            expect(validator.validateAndSanitize('menu_background_color', 'invalid')).toBe('#000000');
            expect(validator.validateAndSanitize('menu_background_color', '#gggggg')).toBe('#000000');
        });
    });

    describe('Boolean Validation', () => {
        test('should validate boolean values', () => {
            expect(validator.validateAndSanitize('enable_live_preview', true)).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', false)).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', 'true')).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', 'false')).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', 1)).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', 0)).toBe(false);
        });
    });

    describe('Number Validation', () => {
        test('should validate and convert numbers', () => {
            expect(validator.validateAndSanitize('font_size', '16')).toBe(16);
            expect(validator.validateAndSanitize('font_size', 16)).toBe(16);
            expect(validator.validateAndSanitize('font_size', '16.5')).toBe(16.5);
            expect(validator.validateAndSanitize('font_size', 'invalid')).toBe(0);
        });
    });

    describe('CSS Validation', () => {
        test('should allow safe CSS', () => {
            const safeCss = 'color: red; background: blue;';
            expect(validator.validateAndSanitize('custom_css', safeCss)).toBe(safeCss);
        });

        test('should remove dangerous CSS patterns', () => {
            const dangerousCss = 'color: red; javascript: alert("xss");';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('javascript:');
            expect(result).toContain('color: red;');
        });

        test('should remove expression() calls', () => {
            const dangerousCss = 'width: expression(alert("xss"));';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('expression(');
        });
    });

    describe('String Sanitization', () => {
        test('should escape HTML entities', () => {
            const input = '<script>alert("xss")</script>';
            const result = validator.validateAndSanitize('text_setting', input);
            expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
        });

        test('should limit string length', () => {
            const longString = 'a'.repeat(20000);
            const result = validator.validateAndSanitize('text_setting', longString);
            expect(result.length).toBe(10000);
        });
    });

    describe('Type Detection', () => {
        test('should detect color settings', () => {
            expect(validator.getSettingType('menu_background_color')).toBe('color');
            expect(validator.getSettingType('text_colour')).toBe('color');
        });

        test('should detect boolean settings', () => {
            expect(validator.getSettingType('enable_feature')).toBe('boolean');
            expect(validator.getSettingType('auto_save')).toBe('boolean');
            expect(validator.getSettingType('debug_mode')).toBe('boolean');
        });

        test('should detect number settings', () => {
            expect(validator.getSettingType('font_size')).toBe('number');
            expect(validator.getSettingType('menu_width')).toBe('number');
            expect(validator.getSettingType('animation_delay')).toBe('number');
        });

        test('should detect URL settings', () => {
            expect(validator.getSettingType('logo_url')).toBe('url');
            expect(validator.getSettingType('external_link')).toBe('url');
        });

        test('should detect CSS settings', () => {
            expect(validator.getSettingType('custom_css')).toBe('css');
            expect(validator.getSettingType('additional_style')).toBe('css');
        });

        test('should default to string for unknown types', () => {
            expect(validator.getSettingType('unknown_setting')).toBe('string');
        });
    });
});