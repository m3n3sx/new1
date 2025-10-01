/**
 * Integration tests for custom template operations
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

import TemplateManager from '../../assets/js/modules/template-manager.js';

describe('Custom Template Operations Integration', () => {
    let templateManager;
    let mockCore;
    let mockAjaxManager;
    let mockSettingsManager;
    let mockLivePreview;
    
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
        
        templateManager = new TemplateManager(mockCore);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });
    
    describe('Custom Template Creation Workflow', () => {
        test('should create custom template from current settings', async () => {
            // Mock current settings
            mockSettingsManager.getAllSettings.mockResolvedValue({
                'general.theme_mode': 'dark',
                'menu.background_color': '#1a1a1a',
                'adminbar.background_color': '#0d1117'
            });
            
            // Mock successful creation
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: { template_id: 'custom_123' }
            });
            
            await templateManager.init();
            
            const templateData = {
                name: 'My Custom Dark Theme',
                description: 'Custom dark theme for development',
                category: 'custom'
            };
            
            const templateId = await templateManager.createCustomTemplate(templateData);
            
            expect(templateId).toBe('custom_123');
            expect(mockAjaxManager.request).toHaveBeenCalledWith('create_custom_template', 
                expect.objectContaining({
                    template_data: expect.objectContaining({
                        name: 'My Custom Dark Theme',
                        type: 'custom',
                        category: 'custom'
                    })
                })
            );
        });
        
        test('should handle template creation validation errors', async () => {
            await templateManager.init();
            
            const invalidTemplate = {
                // Missing name
                description: 'Invalid template'
            };
            
            await expect(templateManager.createCustomTemplate(invalidTemplate))
                .rejects.toThrow('Template name is required');
        });
        
        test('should handle server-side creation errors', async () => {
            mockAjaxManager.request.mockResolvedValue({
                success: false,
                data: { message: 'Database error' }
            });
            
            await templateManager.init();
            
            const templateData = {
                name: 'Test Template',
                settings: {}
            };
            
            await expect(templateManager.createCustomTemplate(templateData))
                .rejects.toThrow('Database error');
        });
    });
    
    describe('Template Import/Export Workflow', () => {
        test('should complete full export-import cycle', async () => {
            await templateManager.init();
            
            // Mock template data
            const originalTemplate = {
                name: 'Export Test Template',
                description: 'Template for export testing',
                category: 'test',
                settings: {
                    general: { theme_mode: 'light' },
                    menu: { background_color: '#ffffff' }
                }
            };
            
            // Add template to manager
            templateManager.templates.set('export_test', {
                ...originalTemplate,
                id: 'export_test',
                type: 'custom'
            });
            
            // Test export
            const exportData = templateManager.exportTemplate('export_test');
            
            expect(exportData).toMatchObject({
                name: originalTemplate.name,
                description: originalTemplate.description,
                settings: originalTemplate.settings,
                version: '2.0.0'
            });
            
            // Mock import validation and creation
            mockAjaxManager.request
                .mockResolvedValueOnce({
                    success: true,
                    data: { valid: true, errors: [], warnings: [], info: [] }
                })
                .mockResolvedValueOnce({
                    success: true,
                    data: { 
                        template_id: 'imported_456',
                        template_name: 'Export Test Template (Imported)'
                    }
                });
            
            // Test import
            const importedId = await templateManager.importTemplate(exportData);
            
            expect(importedId).toBe('imported_456');
            expect(mockAjaxManager.request).toHaveBeenCalledWith('validate_template_import', 
                expect.objectContaining({
                    import_data: JSON.stringify(exportData)
                })
            );
        });
        
        test('should handle file import with validation', async () => {
            await templateManager.init();
            
            const templateData = {
                name: 'File Import Test',
                description: 'Imported from file',
                settings: { general: { theme_mode: 'auto' } },
                version: '2.0.0'
            };
            
            const fileContent = JSON.stringify(templateData);
            const mockFile = new File([fileContent], 'test-template.json', {
                type: 'application/json'
            });
            
            // Mock validation success
            mockAjaxManager.request
                .mockResolvedValueOnce({
                    success: true,
                    data: { 
                        valid: true, 
                        errors: [], 
                        warnings: [],
                        info: ['Template version 2.0.0 is compatible', 'Settings count: 1']
                    }
                })
                .mockResolvedValueOnce({
                    success: true,
                    data: { 
                        template_id: 'file_import_789',
                        template_name: 'File Import Test (Imported)'
                    }
                });
            
            const templateId = await templateManager.importTemplateFromFile(mockFile);
            
            expect(templateId).toBe('file_import_789');
            expect(mockCore.emit).toHaveBeenCalledWith('template:imported-file', 
                expect.objectContaining({
                    templateId: 'file_import_789',
                    filename: 'test-template.json'
                })
            );
        });
        
        test('should reject incompatible template versions', async () => {
            await templateManager.init();
            
            const incompatibleTemplate = {
                name: 'Old Template',
                settings: {},
                version: '1.0.0' // Incompatible version
            };
            
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: {
                    valid: false,
                    errors: ['Template version not compatible with current plugin version'],
                    warnings: [],
                    info: []
                }
            });
            
            const fileContent = JSON.stringify(incompatibleTemplate);
            const mockFile = new File([fileContent], 'old-template.json', {
                type: 'application/json'
            });
            
            await expect(templateManager.importTemplateFromFile(mockFile))
                .rejects.toThrow('Invalid template file');
        });
    });
    
    describe('Template Management UI Integration', () => {
        test('should handle template action buttons', async () => {
            await templateManager.init();
            
            // Create template buttons
            const exportButton = document.createElement('button');
            exportButton.dataset.templateAction = 'export';
            exportButton.dataset.templateId = 'minimal';
            document.body.appendChild(exportButton);
            
            const importButton = document.createElement('button');
            importButton.dataset.templateAction = 'import';
            document.body.appendChild(importButton);
            
            // Mock export response
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: {
                    export_data: { name: 'Minimal', settings: {}, version: '2.0.0' },
                    filename: 'minimal-template.json'
                }
            });
            
            // Mock URL methods
            global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
            global.URL.revokeObjectURL = jest.fn();
            
            // Test export action
            const exportEvent = new MouseEvent('click', { bubbles: true });
            exportButton.dispatchEvent(exportEvent);
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockAjaxManager.request).toHaveBeenCalledWith('export_template', {
                template_id: 'minimal'
            });
            
            // Test import action (should trigger file dialog)
            const createFileInputSpy = jest.spyOn(templateManager, 'createFileInput')
                .mockReturnValue({
                    click: jest.fn()
                });
            jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            
            const importEvent = new MouseEvent('click', { bubbles: true });
            importButton.dispatchEvent(importEvent);
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(createFileInputSpy).toHaveBeenCalled();
        });
        
        test('should handle template deletion workflow', async () => {
            await templateManager.init();
            
            // Add custom template
            templateManager.templates.set('custom_delete_test', {
                id: 'custom_delete_test',
                name: 'Delete Test Template',
                type: 'custom'
            });
            
            // Mock successful deletion
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: { message: 'Template deleted successfully' }
            });
            
            // Mock confirm dialog
            global.confirm = jest.fn(() => true);
            
            const deleteButton = document.createElement('button');
            deleteButton.dataset.templateAction = 'delete';
            deleteButton.dataset.templateId = 'custom_delete_test';
            document.body.appendChild(deleteButton);
            
            const deleteEvent = new MouseEvent('click', { bubbles: true });
            deleteButton.dispatchEvent(deleteEvent);
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this template?');
            expect(mockAjaxManager.request).toHaveBeenCalledWith('delete_custom_template', {
                template_id: 'custom_delete_test'
            });
            expect(templateManager.getTemplate('custom_delete_test')).toBeNull();
        });
    });
    
    describe('Error Handling and Recovery', () => {
        test('should handle network errors gracefully', async () => {
            await templateManager.init();
            
            // Mock network error
            mockAjaxManager.request.mockRejectedValue(new Error('Network error'));
            
            const templateData = {
                name: 'Network Test Template',
                settings: {}
            };
            
            await expect(templateManager.createCustomTemplate(templateData))
                .rejects.toThrow('Network error');
            
            expect(mockCore.emit).toHaveBeenCalledWith('template:error', 
                expect.objectContaining({
                    error: expect.any(Error)
                })
            );
        });
        
        test('should validate file size limits', async () => {
            await templateManager.init();
            
            // Create oversized file (2MB)
            const largeContent = JSON.stringify({
                name: 'Large Template',
                settings: {},
                version: '2.0.0',
                large_data: 'x'.repeat(2 * 1024 * 1024)
            });
            
            const largeFile = new File([largeContent], 'large-template.json', {
                type: 'application/json'
            });
            
            await expect(templateManager.importTemplateFromFile(largeFile))
                .rejects.toThrow('File size too large');
        });
        
        test('should handle malformed JSON files', async () => {
            await templateManager.init();
            
            const malformedJson = '{ "name": "Test", "settings": { invalid json }';
            const badFile = new File([malformedJson], 'bad-template.json', {
                type: 'application/json'
            });
            
            await expect(templateManager.importTemplateFromFile(badFile))
                .rejects.toThrow('Invalid JSON file format');
        });
    });
    
    describe('Performance and Optimization', () => {
        test('should cache template data efficiently', async () => {
            await templateManager.init();
            
            // First call should make AJAX request
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: {
                    built_in: { minimal: { name: 'Minimal' } },
                    custom: {}
                }
            });
            
            await templateManager.loadTemplates();
            
            expect(mockAjaxManager.request).toHaveBeenCalledTimes(1);
            
            // Subsequent calls should use cached data
            const template = templateManager.getTemplate('minimal');
            expect(template).toBeDefined();
            
            // Should not make additional AJAX requests
            expect(mockAjaxManager.request).toHaveBeenCalledTimes(1);
        });
        
        test('should handle concurrent template operations', async () => {
            await templateManager.init();
            
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: { template_id: 'concurrent_test' }
            });
            
            // Start multiple template creation operations
            const promises = [
                templateManager.createCustomTemplate({ name: 'Template 1', settings: {} }),
                templateManager.createCustomTemplate({ name: 'Template 2', settings: {} }),
                templateManager.createCustomTemplate({ name: 'Template 3', settings: {} })
            ];
            
            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result).toBe('concurrent_test');
            });
        });
    });
});