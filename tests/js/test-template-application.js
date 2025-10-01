/**
 * Integration tests for template application functionality
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

import TemplateManager from '../../assets/js/modules/template-manager.js';

describe('Template Application Integration', () => {
    let templateManager;
    let mockCore;
    let mockAjaxManager;
    let mockSettingsManager;
    let mockLivePreview;
    
    // Mock template data
    const mockTemplates = {
        built_in: {
            minimal: {
                name: 'Minimal',
                description: 'Clean design',
                category: 'clean',
                settings: {
                    general: { theme_mode: 'light' },
                    menu: { 
                        background_color: '#ffffff',
                        text_color: '#2c3338'
                    },
                    adminbar: {
                        background_color: '#ffffff',
                        text_color: '#2c3338'
                    }
                }
            },
            glassmorphism: {
                name: 'Glassmorphism',
                description: 'Modern glass effects',
                category: 'modern',
                settings: {
                    general: { theme_mode: 'auto' },
                    menu: { 
                        background_color: 'rgba(255, 255, 255, 0.1)',
                        text_color: '#ffffff'
                    }
                }
            }
        }
    };
    
    beforeEach(() => {
        // Mock core
        mockCore = {
            getModule: jest.fn(),
            emit: jest.fn(),
            on: jest.fn()
        };
        
        // Mock ajax manager
        mockAjaxManager = {
            request: jest.fn()
        };
        
        // Mock settings manager
        mockSettingsManager = {
            set: jest.fn().mockResolvedValue(true),
            get: jest.fn(),
            getAllSettings: jest.fn().mockResolvedValue({})
        };
        
        // Mock live preview
        mockLivePreview = {
            updateAll: jest.fn()
        };
        
        // Setup module mocks
        mockCore.getModule.mockImplementation((name) => {
            switch (name) {
                case 'ajax-manager':
                    return Promise.resolve(mockAjaxManager);
                case 'settings-manager':
                    return Promise.resolve(mockSettingsManager);
                case 'live-preview':
                    return Promise.resolve(mockLivePreview);
                default:
                    return Promise.reject(new Error(`Unknown module: ${name}`));
            }
        });
        
        // Mock successful template loading
        mockAjaxManager.request.mockResolvedValue({
            success: true,
            data: mockTemplates
        });
        
        templateManager = new TemplateManager(mockCore);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('One-Click Template Application', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should apply template with single click', async () => {
            // Apply minimal template
            await templateManager.applyTemplate('minimal');
            
            // Verify settings were applied
            expect(mockSettingsManager.set).toHaveBeenCalledWith('general.theme_mode', 'light', 
                expect.objectContaining({ preview: false, skipSave: false })
            );
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.background_color', '#ffffff', 
                expect.objectContaining({ preview: false, skipSave: false })
            );
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.text_color', '#2c3338', 
                expect.objectContaining({ preview: false, skipSave: false })
            );
            
            // Verify active template was saved
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'minimal');
            
            // Verify live preview was updated
            expect(mockLivePreview.updateAll).toHaveBeenCalled();
            
            // Verify event was emitted
            expect(mockCore.emit).toHaveBeenCalledWith('template:applied', 
                expect.objectContaining({ templateId: 'minimal' })
            );
        });
        
        test('should handle template application with complex settings', async () => {
            // Apply glassmorphism template with rgba colors
            await templateManager.applyTemplate('glassmorphism');
            
            // Verify complex color values are handled
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.background_color', 
                'rgba(255, 255, 255, 0.1)', expect.any(Object)
            );
            
            // Verify all settings sections are processed
            expect(mockSettingsManager.set).toHaveBeenCalledWith('general.theme_mode', 'auto', expect.any(Object));
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.text_color', '#ffffff', expect.any(Object));
        });
        
        test('should preserve existing settings not in template', async () => {
            // Mock existing settings
            mockSettingsManager.getAllSettings.mockResolvedValue({
                'advanced.custom_css': 'body { margin: 0; }',
                'content.font_size': '16px'
            });
            
            await templateManager.applyTemplate('minimal');
            
            // Verify template settings were applied
            expect(mockSettingsManager.set).toHaveBeenCalledWith('general.theme_mode', 'light', expect.any(Object));
            
            // Verify existing settings were not overwritten (they shouldn't be called with set)
            expect(mockSettingsManager.set).not.toHaveBeenCalledWith('advanced.custom_css', expect.any(String), expect.any(Object));
            expect(mockSettingsManager.set).not.toHaveBeenCalledWith('content.font_size', expect.any(String), expect.any(Object));
        });
        
        test('should handle template application errors gracefully', async () => {
            // Mock settings manager error
            mockSettingsManager.set.mockRejectedValue(new Error('Database error'));
            
            await expect(templateManager.applyTemplate('minimal')).rejects.toThrow();
            
            // Verify error handling doesn't break the system
            expect(mockCore.emit).not.toHaveBeenCalledWith('template:applied', expect.any(Object));
        });
        
        test('should exit preview mode before applying template', async () => {
            // Start preview mode
            await templateManager.previewTemplate('glassmorphism');
            expect(templateManager.isPreviewMode()).toBe(true);
            
            // Apply different template
            await templateManager.applyTemplate('minimal');
            
            // Verify preview mode was exited
            expect(templateManager.isPreviewMode()).toBe(false);
            
            // Verify template was applied
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'minimal');
        });
        
        test('should handle rapid template switching', async () => {
            // Apply multiple templates rapidly
            await templateManager.applyTemplate('minimal');
            await templateManager.applyTemplate('glassmorphism');
            await templateManager.applyTemplate('minimal');
            
            // Verify final state
            expect(mockSettingsManager.set).toHaveBeenLastCalledWith('active_template', 'minimal');
            
            // Verify all applications completed (includes preview events)
            expect(mockCore.emit).toHaveBeenCalledWith('template:applied', 
                expect.objectContaining({ templateId: 'minimal' })
            );
            
            // Verify final template was applied
            const appliedCalls = mockCore.emit.mock.calls.filter(call => 
                call[0] === 'template:applied'
            );
            expect(appliedCalls).toHaveLength(3);
        });
    });
    
    describe('Template Conflict Resolution', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should handle conflicting color formats', async () => {
            // Apply template with different color formats
            const templateWithMixedColors = {
                name: 'Mixed Colors',
                settings: {
                    menu: {
                        background_color: '#ff0000',
                        hover_color: 'rgba(0, 255, 0, 0.5)',
                        active_color: 'hsl(240, 100%, 50%)'
                    }
                }
            };
            
            // Mock template retrieval
            templateManager.templates.set('mixed', templateWithMixedColors);
            
            await templateManager.applyTemplate('mixed');
            
            // Verify all color formats are preserved
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.background_color', '#ff0000', expect.any(Object));
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.hover_color', 'rgba(0, 255, 0, 0.5)', expect.any(Object));
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.active_color', 'hsl(240, 100%, 50%)', expect.any(Object));
        });
        
        test('should handle missing template sections gracefully', async () => {
            // Create template with missing sections
            const incompleteTemplate = {
                name: 'Incomplete',
                settings: {
                    menu: {
                        background_color: '#000000'
                    }
                    // Missing adminbar and content sections
                }
            };
            
            templateManager.templates.set('incomplete', incompleteTemplate);
            
            await templateManager.applyTemplate('incomplete');
            
            // Verify only available settings were applied
            expect(mockSettingsManager.set).toHaveBeenCalledWith('menu.background_color', '#000000', expect.any(Object));
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'incomplete');
            
            // Verify no errors occurred
            expect(mockCore.emit).toHaveBeenCalledWith('template:applied', 
                expect.objectContaining({ templateId: 'incomplete' })
            );
        });
    });
    
    describe('Performance and Optimization', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should batch settings updates efficiently', async () => {
            const startTime = Date.now();
            
            await templateManager.applyTemplate('minimal');
            
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            // Verify reasonable execution time (should be under 100ms in tests)
            expect(executionTime).toBeLessThan(100);
            
            // Verify settings were applied (minimal template has 4 settings + active_template)
            expect(mockSettingsManager.set).toHaveBeenCalledWith('general.theme_mode', 'light', expect.any(Object));
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'minimal');
        });
        
        test('should handle large templates efficiently', async () => {
            // Create template with many settings
            const largeTemplate = {
                name: 'Large Template',
                settings: {}
            };
            
            // Add 50 settings across different sections
            ['general', 'menu', 'adminbar', 'content', 'advanced'].forEach(section => {
                largeTemplate.settings[section] = {};
                for (let i = 0; i < 10; i++) {
                    largeTemplate.settings[section][`setting_${i}`] = `value_${i}`;
                }
            });
            
            templateManager.templates.set('large', largeTemplate);
            
            const startTime = Date.now();
            await templateManager.applyTemplate('large');
            const endTime = Date.now();
            
            // Verify reasonable execution time even with many settings
            expect(endTime - startTime).toBeLessThan(200);
            
            // Verify all settings were applied (50 + 1 for active_template)
            expect(mockSettingsManager.set).toHaveBeenCalledTimes(51);
        });
    });
    
    describe('User Experience Features', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should provide immediate visual feedback', async () => {
            await templateManager.applyTemplate('minimal');
            
            // Verify live preview was updated immediately
            expect(mockLivePreview.updateAll).toHaveBeenCalled();
            
            // Verify success event was emitted for UI feedback
            expect(mockCore.emit).toHaveBeenCalledWith('template:applied', 
                expect.objectContaining({ 
                    templateId: 'minimal',
                    template: expect.objectContaining({ name: 'Minimal' })
                })
            );
        });
        
        test('should maintain template state correctly', async () => {
            // Apply template
            await templateManager.applyTemplate('minimal');
            
            // Verify current template is tracked
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'minimal');
            
            // Apply different template
            await templateManager.applyTemplate('glassmorphism');
            
            // Verify state was updated
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'glassmorphism');
        });
    });
});