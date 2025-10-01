/**
 * Unit tests for TemplateManager module
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

import TemplateManager from '../../assets/js/modules/template-manager.js';

describe('TemplateManager', () => {
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
                    menu: { background_color: '#ffffff' }
                }
            },
            glassmorphism: {
                name: 'Glassmorphism',
                description: 'Modern glass effects',
                category: 'modern',
                settings: {
                    general: { theme_mode: 'auto' },
                    menu: { background_color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        },
        custom: {
            custom1: {
                name: 'Custom Template',
                description: 'User created',
                category: 'custom',
                settings: {
                    general: { theme_mode: 'dark' }
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
        document.body.innerHTML = '';
    });
    
    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await templateManager.init();
            
            expect(mockCore.getModule).toHaveBeenCalledWith('ajax-manager');
            expect(mockCore.getModule).toHaveBeenCalledWith('settings-manager');
            expect(mockCore.getModule).toHaveBeenCalledWith('live-preview');
            expect(mockAjaxManager.request).toHaveBeenCalledWith('get_templates', {});
            expect(mockCore.emit).toHaveBeenCalledWith('template-manager:ready');
        });
        
        test('should handle initialization errors', async () => {
            mockCore.getModule.mockRejectedValue(new Error('Module not found'));
            
            await templateManager.init();
            
            expect(mockCore.emit).toHaveBeenCalledWith('template-manager:error', 
                expect.objectContaining({ error: expect.any(Error) })
            );
        });
        
        test('should load templates correctly', async () => {
            await templateManager.init();
            
            const templates = templateManager.getTemplates();
            expect(templates.size).toBe(3); // 2 built-in + 1 custom
            
            expect(templates.get('minimal')).toEqual(
                expect.objectContaining({
                    name: 'Minimal',
                    type: 'built-in',
                    id: 'minimal'
                })
            );
            
            expect(templates.get('custom1')).toEqual(
                expect.objectContaining({
                    name: 'Custom Template',
                    type: 'custom',
                    id: 'custom1'
                })
            );
        });
    });
    
    describe('Template Retrieval', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should get template by ID', () => {
            const template = templateManager.getTemplate('minimal');
            
            expect(template).toBeDefined();
            expect(template.name).toBe('Minimal');
            expect(template.id).toBe('minimal');
        });
        
        test('should return null for non-existent template', () => {
            const template = templateManager.getTemplate('non_existent');
            expect(template).toBeNull();
        });
        
        test('should get templates by category', () => {
            const modernTemplates = templateManager.getTemplatesByCategory('modern');
            
            expect(modernTemplates).toHaveLength(1);
            expect(modernTemplates[0].name).toBe('Glassmorphism');
        });
        
        test('should get template categories', () => {
            const categories = templateManager.getCategories();
            
            expect(categories).toHaveProperty('clean');
            expect(categories).toHaveProperty('modern');
            expect(categories).toHaveProperty('custom');
            
            expect(categories.clean.count).toBe(1);
            expect(categories.modern.count).toBe(1);
            expect(categories.custom.count).toBe(1);
        });
    });
    
    describe('Template Search', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should search templates by name', () => {
            const results = templateManager.searchTemplates('minimal');
            
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Minimal');
        });
        
        test('should search templates by description', () => {
            const results = templateManager.searchTemplates('glass');
            
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Glassmorphism');
        });
        
        test('should filter templates by category', () => {
            const results = templateManager.searchTemplates('', 'modern');
            
            expect(results).toHaveLength(1);
            expect(results[0].category).toBe('modern');
        });
        
        test('should return empty array for no matches', () => {
            const results = templateManager.searchTemplates('nonexistent');
            expect(results).toHaveLength(0);
        });
        
        test('should search with both query and category', () => {
            const results = templateManager.searchTemplates('glass', 'modern');
            
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Glassmorphism');
        });
    });
    
    describe('Template Preview', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should start template preview', async () => {
            mockSettingsManager.getAllSettings.mockResolvedValue({
                'general.theme_mode': 'dark'
            });
            
            await templateManager.previewTemplate('minimal');
            
            expect(templateManager.isPreviewMode()).toBe(true);
            expect(templateManager.getCurrentTemplate()).toBe('minimal');
            expect(mockCore.emit).toHaveBeenCalledWith('template:preview-started', 
                expect.objectContaining({ templateId: 'minimal' })
            );
        });
        
        test('should exit template preview', async () => {
            // Start preview first
            await templateManager.previewTemplate('minimal');
            
            // Exit preview
            await templateManager.exitPreview();
            
            expect(templateManager.isPreviewMode()).toBe(false);
            expect(templateManager.getCurrentTemplate()).toBeNull();
            expect(mockCore.emit).toHaveBeenCalledWith('template:preview-ended');
        });
        
        test('should handle preview errors', async () => {
            mockSettingsManager.set.mockRejectedValue(new Error('Settings error'));
            
            await expect(templateManager.previewTemplate('minimal')).rejects.toThrow();
            expect(templateManager.isPreviewMode()).toBe(false);
        });
        
        test('should throw error for non-existent template preview', async () => {
            await expect(templateManager.previewTemplate('non_existent'))
                .rejects.toThrow('Template not found: non_existent');
        });
    });
    
    describe('Template Application', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should apply template successfully', async () => {
            await templateManager.applyTemplate('minimal');
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('general.theme_mode', 'light', 
                expect.objectContaining({ preview: false, skipSave: false })
            );
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'minimal');
            expect(mockLivePreview.updateAll).toHaveBeenCalled();
            expect(mockCore.emit).toHaveBeenCalledWith('template:applied', 
                expect.objectContaining({ templateId: 'minimal' })
            );
        });
        
        test('should exit preview before applying template', async () => {
            // Start preview
            await templateManager.previewTemplate('glassmorphism');
            expect(templateManager.isPreviewMode()).toBe(true);
            
            // Apply different template
            await templateManager.applyTemplate('minimal');
            
            expect(templateManager.isPreviewMode()).toBe(false);
        });
        
        test('should throw error for non-existent template application', async () => {
            await expect(templateManager.applyTemplate('non_existent'))
                .rejects.toThrow('Template not found: non_existent');
        });
    });
    
    describe('Custom Template Management', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should create custom template', async () => {
            const templateData = {
                name: 'My Custom Template',
                description: 'Custom description',
                category: 'custom',
                settings: {
                    general: { theme_mode: 'light' }
                }
            };
            
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: { template_id: 'custom_new' }
            });
            
            const templateId = await templateManager.createCustomTemplate(templateData);
            
            expect(templateId).toBe('custom_new');
            expect(mockAjaxManager.request).toHaveBeenCalledWith('create_custom_template', 
                expect.objectContaining({ template_data: expect.objectContaining(templateData) })
            );
            expect(mockCore.emit).toHaveBeenCalledWith('template:created', 
                expect.objectContaining({ templateId: 'custom_new' })
            );
        });
        
        test('should validate template data before creation', async () => {
            const invalidData = { description: 'Missing name' };
            
            await expect(templateManager.createCustomTemplate(invalidData))
                .rejects.toThrow('Template name is required');
        });
        
        test('should delete custom template', async () => {
            mockAjaxManager.request.mockResolvedValue({ success: true });
            
            await templateManager.deleteCustomTemplate('custom1');
            
            expect(mockAjaxManager.request).toHaveBeenCalledWith('delete_custom_template', 
                { template_id: 'custom1' }
            );
            expect(templateManager.getTemplate('custom1')).toBeNull();
            expect(mockCore.emit).toHaveBeenCalledWith('template:deleted', 
                { templateId: 'custom1' }
            );
        });
        
        test('should not delete built-in template', async () => {
            await expect(templateManager.deleteCustomTemplate('minimal'))
                .rejects.toThrow('Cannot delete built-in template');
        });
    });
    
    describe('Template Import/Export', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should export template', () => {
            const exportData = templateManager.exportTemplate('minimal');
            
            expect(exportData).toHaveProperty('name', 'Minimal');
            expect(exportData).toHaveProperty('description');
            expect(exportData).toHaveProperty('settings');
            expect(exportData).toHaveProperty('version', '2.0.0');
            expect(exportData).toHaveProperty('exported_at');
            
            expect(mockCore.emit).toHaveBeenCalledWith('template:exported', 
                expect.objectContaining({ templateId: 'minimal', exportData })
            );
        });
        
        test('should export template via AJAX', async () => {
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: {
                    export_data: {
                        name: 'Minimal',
                        settings: {},
                        version: '2.0.0'
                    },
                    filename: 'minimal-template.json'
                }
            });
            
            // Mock URL.createObjectURL and related DOM methods
            global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
            global.URL.revokeObjectURL = jest.fn();
            
            const result = await templateManager.exportTemplateViaAjax('minimal');
            
            expect(result).toBe(true);
            expect(mockAjaxManager.request).toHaveBeenCalledWith('export_template', {
                template_id: 'minimal'
            });
            expect(mockCore.emit).toHaveBeenCalledWith('template:exported-ajax', 
                expect.objectContaining({ templateId: 'minimal' })
            );
        });
        
        test('should import template', async () => {
            const importData = {
                name: 'Imported Template',
                description: 'Imported from file',
                category: 'imported',
                settings: { general: { theme_mode: 'auto' } },
                version: '2.0.0'
            };
            
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: { 
                    template_id: 'imported_1',
                    template_name: 'Imported Template (Imported)',
                    original_name: 'Imported Template'
                }
            });
            
            const templateId = await templateManager.importTemplate(importData);
            
            expect(templateId).toBe('imported_1');
            expect(mockCore.emit).toHaveBeenCalledWith('template:imported-ajax', 
                expect.objectContaining({ templateId: 'imported_1' })
            );
        });
        
        test('should validate import data via AJAX', async () => {
            const importData = {
                name: 'Test Template',
                settings: { general: {} },
                version: '2.0.0'
            };
            
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: {
                    valid: true,
                    errors: [],
                    warnings: [],
                    info: ['Template version 2.0.0 is compatible']
                }
            });
            
            const validation = await templateManager.validateImportData(importData);
            
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(mockAjaxManager.request).toHaveBeenCalledWith('validate_template_import', {
                import_data: JSON.stringify(importData)
            });
        });
        
        test('should handle invalid import data', async () => {
            const invalidData = {
                name: 'Test',
                // Missing settings and version
            };
            
            mockAjaxManager.request.mockResolvedValue({
                success: true,
                data: {
                    valid: false,
                    errors: ['Missing required field: settings', 'Missing required field: version'],
                    warnings: [],
                    info: []
                }
            });
            
            const validation = await templateManager.validateImportData(invalidData);
            
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Missing required field: settings');
            expect(validation.errors).toContain('Missing required field: version');
        });
        
        test('should import template from file', async () => {
            const fileContent = JSON.stringify({
                name: 'File Template',
                description: 'From file',
                settings: { general: { theme_mode: 'light' } },
                version: '2.0.0'
            });
            
            const mockFile = new File([fileContent], 'template.json', {
                type: 'application/json'
            });
            
            // Mock validation response
            mockAjaxManager.request
                .mockResolvedValueOnce({
                    success: true,
                    data: { valid: true, errors: [], warnings: [], info: [] }
                })
                .mockResolvedValueOnce({
                    success: true,
                    data: { 
                        template_id: 'file_import_1',
                        template_name: 'File Template (Imported)'
                    }
                });
            
            const templateId = await templateManager.importTemplateFromFile(mockFile);
            
            expect(templateId).toBe('file_import_1');
            expect(mockCore.emit).toHaveBeenCalledWith('template:imported-file', 
                expect.objectContaining({ templateId: 'file_import_1' })
            );
        });
        
        test('should reject invalid file types', async () => {
            const mockFile = new File(['content'], 'template.txt', {
                type: 'text/plain'
            });
            
            await expect(templateManager.importTemplateFromFile(mockFile))
                .rejects.toThrow('Please select a valid JSON file');
        });
        
        test('should reject large files', async () => {
            const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
            const mockFile = new File([largeContent], 'template.json', {
                type: 'application/json'
            });
            
            await expect(templateManager.importTemplateFromFile(mockFile))
                .rejects.toThrow('File size too large');
        });
        
        test('should handle invalid JSON in file', async () => {
            const invalidJson = '{ invalid json }';
            const mockFile = new File([invalidJson], 'template.json', {
                type: 'application/json'
            });
            
            await expect(templateManager.importTemplateFromFile(mockFile))
                .rejects.toThrow('Invalid JSON file format');
        });
        
        test('should create file input for import', () => {
            const input = templateManager.createFileInput();
            
            expect(input.type).toBe('file');
            expect(input.accept).toBe('.json,application/json');
            expect(input.style.display).toBe('none');
        });
        
        test('should trigger import dialog', () => {
            const mockInput = {
                click: jest.fn()
            };
            
            jest.spyOn(templateManager, 'createFileInput').mockReturnValue(mockInput);
            jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            
            templateManager.triggerImportDialog();
            
            expect(document.body.appendChild).toHaveBeenCalledWith(mockInput);
            expect(mockInput.click).toHaveBeenCalled();
        });
    });
    
    describe('Template Actions', () => {
        beforeEach(async () => {
            await templateManager.init();
        });
        
        test('should handle template preview action', async () => {
            const button = document.createElement('button');
            button.dataset.templateAction = 'preview';
            button.dataset.templateId = 'minimal';
            document.body.appendChild(button);
            
            const event = new MouseEvent('click', { bubbles: true });
            button.dispatchEvent(event);
            
            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(templateManager.isPreviewMode()).toBe(true);
        });
        
        test('should handle template apply action', async () => {
            const button = document.createElement('button');
            button.dataset.templateAction = 'apply';
            button.dataset.templateId = 'minimal';
            document.body.appendChild(button);
            
            const event = new MouseEvent('click', { bubbles: true });
            button.dispatchEvent(event);
            
            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockSettingsManager.set).toHaveBeenCalledWith('active_template', 'minimal');
        });
        
        test('should handle exit preview action', async () => {
            // Start preview first
            await templateManager.previewTemplate('minimal');
            
            const button = document.createElement('button');
            button.dataset.templateAction = 'exit-preview';
            document.body.appendChild(button);
            
            const event = new MouseEvent('click', { bubbles: true });
            button.dispatchEvent(event);
            
            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(templateManager.isPreviewMode()).toBe(false);
        });
    });
    
    describe('Data Validation', () => {
        test('should validate template data correctly', () => {
            const validData = {
                name: 'Valid Template',
                settings: { general: {} }
            };
            
            expect(() => templateManager.validateTemplateData(validData)).not.toThrow();
        });
        
        test('should reject invalid template data', () => {
            expect(() => templateManager.validateTemplateData({}))
                .toThrow('Template name is required');
            
            expect(() => templateManager.validateTemplateData({ name: 123 }))
                .toThrow('Template name is required and must be a string');
            
            expect(() => templateManager.validateTemplateData({ 
                name: 'a'.repeat(101) 
            })).toThrow('Template name must be 100 characters or less');
            
            expect(() => templateManager.validateTemplateData({ 
                name: 'Valid', 
                settings: 'invalid' 
            })).toThrow('Template settings must be an object');
        });
    });
});