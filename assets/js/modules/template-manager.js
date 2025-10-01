/**
 * Template Manager Module for Live Admin Styler
 * 
 * Handles template operations, preview, and management
 * 
 * @package LiveAdminStyler
 * @version 2.0.0
 */

export default class TemplateManager {
    
    /**
     * Constructor
     * 
     * @param {Object} core - LAS Core instance
     */
    constructor(core) {
        this.core = core;
        this.ajaxManager = null;
        this.settingsManager = null;
        this.livePreview = null;
        
        this.templates = new Map();
        this.currentTemplate = null;
        this.previewMode = false;
        
        this.init();
    }
    
    /**
     * Initialize template manager
     */
    async init() {
        try {
            // Get required modules
            this.ajaxManager = await this.core.getModule('ajax-manager');
            this.settingsManager = await this.core.getModule('settings-manager');
            this.livePreview = await this.core.getModule('live-preview');
            
            // Load templates
            await this.loadTemplates();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.core.emit('template-manager:ready');
        } catch (error) {
            console.error('TemplateManager initialization failed:', error);
            this.core.emit('template-manager:error', { error });
        }
    }
    
    /**
     * Load all templates from server
     */
    async loadTemplates() {
        try {
            const response = await this.ajaxManager.request('get_templates', {});
            
            if (response.success) {
                // Store built-in templates
                if (response.data.built_in) {
                    Object.entries(response.data.built_in).forEach(([id, template]) => {
                        this.templates.set(id, {
                            ...template,
                            id,
                            type: 'built-in'
                        });
                    });
                }
                
                // Store custom templates
                if (response.data.custom) {
                    Object.entries(response.data.custom).forEach(([id, template]) => {
                        this.templates.set(id, {
                            ...template,
                            id,
                            type: 'custom'
                        });
                    });
                }
                
                this.core.emit('templates:loaded', { 
                    count: this.templates.size 
                });
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            throw error;
        }
    }
    
    /**
     * Get all templates
     * 
     * @return {Map}
     */
    getTemplates() {
        return this.templates;
    }
    
    /**
     * Get template by ID
     * 
     * @param {string} templateId
     * @return {Object|null}
     */
    getTemplate(templateId) {
        return this.templates.get(templateId) || null;
    }
    
    /**
     * Get templates by category
     * 
     * @param {string} category
     * @return {Array}
     */
    getTemplatesByCategory(category) {
        const templates = [];
        
        this.templates.forEach((template) => {
            if (template.category === category) {
                templates.push(template);
            }
        });
        
        return templates;
    }
    
    /**
     * Search templates
     * 
     * @param {string} query
     * @param {string} category
     * @return {Array}
     */
    searchTemplates(query = '', category = '') {
        const results = [];
        
        this.templates.forEach((template) => {
            let match = true;
            
            // Filter by category
            if (category && template.category !== category) {
                match = false;
            }
            
            // Filter by search query
            if (query) {
                const searchable = (template.name + ' ' + template.description).toLowerCase();
                if (!searchable.includes(query.toLowerCase())) {
                    match = false;
                }
            }
            
            if (match) {
                results.push(template);
            }
        });
        
        return results;
    }
    
    /**
     * Get template categories
     * 
     * @return {Object}
     */
    getCategories() {
        const categories = {};
        
        this.templates.forEach((template) => {
            const category = template.category;
            if (!categories[category]) {
                categories[category] = {
                    name: category.charAt(0).toUpperCase() + category.slice(1),
                    count: 0
                };
            }
            categories[category].count++;
        });
        
        return categories;
    }
    
    /**
     * Preview template
     * 
     * @param {string} templateId
     * @return {Promise}
     */
    async previewTemplate(templateId) {
        const template = this.getTemplate(templateId);
        
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        try {
            // Enter preview mode
            this.previewMode = true;
            this.currentTemplate = templateId;
            
            // Store current settings for restoration
            this.previewBackup = await this.settingsManager.getAllSettings();
            
            // Apply template settings temporarily
            await this.applyTemplateSettings(template.settings, true);
            
            this.core.emit('template:preview-started', { 
                templateId, 
                template 
            });
            
            return true;
        } catch (error) {
            console.error('Template preview failed:', error);
            this.exitPreview();
            throw error;
        }
    }
    
    /**
     * Exit template preview
     * 
     * @return {Promise}
     */
    async exitPreview() {
        if (!this.previewMode) {
            return;
        }
        
        try {
            // Restore original settings
            if (this.previewBackup) {
                await this.applyTemplateSettings(this.previewBackup, true);
                this.previewBackup = null;
            }
            
            this.previewMode = false;
            this.currentTemplate = null;
            
            this.core.emit('template:preview-ended');
        } catch (error) {
            console.error('Failed to exit template preview:', error);
        }
    }
    
    /**
     * Apply template
     * 
     * @param {string} templateId
     * @param {Object} options
     * @return {Promise}
     */
    async applyTemplate(templateId, options = {}) {
        const template = this.getTemplate(templateId);
        
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        try {
            // Exit preview mode if active
            if (this.previewMode) {
                await this.exitPreview();
            }
            
            // Apply template settings
            await this.applyTemplateSettings(template.settings, false);
            
            // Save template reference
            await this.settingsManager.set('active_template', templateId);
            
            this.core.emit('template:applied', { 
                templateId, 
                template,
                options 
            });
            
            return true;
        } catch (error) {
            console.error('Template application failed:', error);
            throw error;
        }
    }
    
    /**
     * Apply template settings
     * 
     * @param {Object} settings
     * @param {boolean} preview
     * @return {Promise}
     */
    async applyTemplateSettings(settings, preview = false) {
        const promises = [];
        
        // Apply each section of settings
        Object.entries(settings).forEach(([section, sectionSettings]) => {
            Object.entries(sectionSettings).forEach(([key, value]) => {
                const settingKey = `${section}.${key}`;
                promises.push(
                    this.settingsManager.set(settingKey, value, { 
                        preview,
                        skipSave: preview 
                    })
                );
            });
        });
        
        await Promise.all(promises);
        
        // Trigger live preview update
        if (this.livePreview) {
            this.livePreview.updateAll();
        }
    }
    
    /**
     * Create custom template
     * 
     * @param {Object} templateData
     * @return {Promise}
     */
    async createCustomTemplate(templateData) {
        try {
            // Validate template data
            this.validateTemplateData(templateData);
            
            // Get current settings if not provided
            if (!templateData.settings) {
                templateData.settings = await this.settingsManager.getAllSettings();
            }
            
            // Add metadata
            templateData.type = 'custom';
            templateData.created_at = new Date().toISOString();
            templateData.category = templateData.category || 'custom';
            
            // Save to server
            const response = await this.ajaxManager.request('create_custom_template', {
                template_data: templateData
            });
            
            if (response.success) {
                const templateId = response.data.template_id;
                
                // Add to local templates
                this.templates.set(templateId, {
                    ...templateData,
                    id: templateId
                });
                
                this.core.emit('template:created', { 
                    templateId, 
                    template: templateData 
                });
                
                return templateId;
            } else {
                throw new Error(response.data.message || 'Failed to create template');
            }
        } catch (error) {
            console.error('Custom template creation failed:', error);
            throw error;
        }
    }
    
    /**
     * Delete custom template
     * 
     * @param {string} templateId
     * @return {Promise}
     */
    async deleteCustomTemplate(templateId) {
        const template = this.getTemplate(templateId);
        
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        if (template.type !== 'custom') {
            throw new Error('Cannot delete built-in template');
        }
        
        try {
            const response = await this.ajaxManager.request('delete_custom_template', {
                template_id: templateId
            });
            
            if (response.success) {
                // Remove from local templates
                this.templates.delete(templateId);
                
                this.core.emit('template:deleted', { templateId });
                
                return true;
            } else {
                throw new Error(response.data.message || 'Failed to delete template');
            }
        } catch (error) {
            console.error('Template deletion failed:', error);
            throw error;
        }
    }
    
    /**
     * Export template
     * 
     * @param {string} templateId
     * @return {Object}
     */
    exportTemplate(templateId) {
        const template = this.getTemplate(templateId);
        
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        // Create export data
        const exportData = {
            name: template.name,
            description: template.description,
            category: template.category,
            settings: template.settings,
            version: '2.0.0',
            exported_at: new Date().toISOString()
        };
        
        this.core.emit('template:exported', { templateId, exportData });
        
        return exportData;
    }
    
    /**
     * Import template
     * 
     * @param {Object} templateData
     * @return {Promise}
     */
    async importTemplate(templateData) {
        try {
            // Use AJAX import for better validation and server-side processing
            const templateId = await this.importTemplateViaAjax(templateData);
            
            this.core.emit('template:imported', { templateId, templateData });
            
            return templateId;
        } catch (error) {
            console.error('Template import failed:', error);
            throw error;
        }
    }
    
    /**
     * Validate template data
     * 
     * @param {Object} templateData
     */
    validateTemplateData(templateData) {
        if (!templateData.name || typeof templateData.name !== 'string') {
            throw new Error('Template name is required and must be a string');
        }
        
        if (templateData.name.length > 100) {
            throw new Error('Template name must be 100 characters or less');
        }
        
        if (templateData.settings && typeof templateData.settings !== 'object') {
            throw new Error('Template settings must be an object');
        }
    }
    
    /**
     * Validate import data
     * 
     * @param {Object} importData
     */
    validateImportData(importData) {
        this.validateTemplateData(importData);
        
        if (!importData.version) {
            throw new Error('Import data must include version information');
        }
        
        // Check version compatibility
        const majorVersion = importData.version.split('.')[0];
        if (majorVersion !== '2') {
            throw new Error('Template version not compatible with current plugin version');
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for settings changes to update current template
        this.core.on('settings:changed', (data) => {
            if (!this.previewMode && this.currentTemplate) {
                // Settings changed outside of template system
                this.currentTemplate = null;
                this.settingsManager.set('active_template', '');
            }
        });
        
        // Listen for template UI events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-template-action]')) {
                this.handleTemplateAction(e);
            }
        });
    }
    
    /**
     * Handle template action clicks
     * 
     * @param {Event} e
     */
    async handleTemplateAction(e) {
        e.preventDefault();
        
        const action = e.target.dataset.templateAction;
        const templateId = e.target.dataset.templateId;
        
        try {
            switch (action) {
                case 'preview':
                    await this.previewTemplate(templateId);
                    break;
                    
                case 'apply':
                    await this.applyTemplate(templateId);
                    break;
                    
                case 'exit-preview':
                    await this.exitPreview();
                    break;
                    
                case 'delete':
                    if (confirm('Are you sure you want to delete this template?')) {
                        await this.deleteCustomTemplate(templateId);
                    }
                    break;
                    
                case 'export':
                    await this.exportTemplateViaAjax(templateId);
                    break;
                    
                case 'export-local':
                    this.downloadTemplate(templateId);
                    break;
                    
                case 'import':
                    this.triggerImportDialog();
                    break;
            }
        } catch (error) {
            console.error('Template action failed:', error);
            this.core.emit('template:error', { action, templateId, error });
        }
    }
    
    /**
     * Download template as JSON file
     * 
     * @param {string} templateId
     */
    downloadTemplate(templateId) {
        try {
            const exportData = this.exportTemplate(templateId);
            const template = this.getTemplate(templateId);
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Template download failed:', error);
        }
    }
    
    /**
     * Export template via AJAX
     * 
     * @param {string} templateId
     * @return {Promise}
     */
    async exportTemplateViaAjax(templateId) {
        try {
            const response = await this.ajaxManager.request('export_template', {
                template_id: templateId
            });
            
            if (response.success) {
                // Download the exported template
                const blob = new Blob([JSON.stringify(response.data.export_data, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.data.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.core.emit('template:exported-ajax', { 
                    templateId, 
                    filename: response.data.filename 
                });
                
                return true;
            } else {
                throw new Error(response.data.message || 'Export failed');
            }
        } catch (error) {
            console.error('Template AJAX export failed:', error);
            throw error;
        }
    }
    
    /**
     * Import template from file
     * 
     * @param {File} file
     * @return {Promise}
     */
    async importTemplateFromFile(file) {
        try {
            // Validate file type
            if (!file.type.includes('json') && !file.name.endsWith('.json')) {
                throw new Error('Please select a valid JSON file');
            }
            
            // Validate file size (max 1MB)
            if (file.size > 1024 * 1024) {
                throw new Error('File size too large. Maximum size is 1MB');
            }
            
            // Read file content
            const fileContent = await this.readFileAsText(file);
            
            // Parse JSON
            let importData;
            try {
                importData = JSON.parse(fileContent);
            } catch (parseError) {
                throw new Error('Invalid JSON file format');
            }
            
            // Validate import data first
            const validation = await this.validateImportData(importData);
            
            if (!validation.valid) {
                throw new Error('Invalid template file: ' + validation.errors.join(', '));
            }
            
            // Import template
            const templateId = await this.importTemplate(importData);
            
            this.core.emit('template:imported-file', { 
                templateId, 
                filename: file.name,
                validation 
            });
            
            return templateId;
        } catch (error) {
            console.error('Template file import failed:', error);
            throw error;
        }
    }
    
    /**
     * Validate import data via AJAX
     * 
     * @param {Object} importData
     * @return {Promise}
     */
    async validateImportData(importData) {
        try {
            const response = await this.ajaxManager.request('validate_template_import', {
                import_data: JSON.stringify(importData)
            });
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.data.message || 'Validation failed');
            }
        } catch (error) {
            console.error('Import validation failed:', error);
            return {
                valid: false,
                errors: [error.message || 'Validation failed'],
                warnings: [],
                info: []
            };
        }
    }
    
    /**
     * Import template via AJAX
     * 
     * @param {Object} importData
     * @return {Promise}
     */
    async importTemplateViaAjax(importData) {
        try {
            const response = await this.ajaxManager.request('import_template', {
                import_data: JSON.stringify(importData)
            });
            
            if (response.success) {
                // Add to local templates
                this.templates.set(response.data.template_id, {
                    ...importData,
                    id: response.data.template_id,
                    type: 'custom',
                    name: response.data.template_name
                });
                
                this.core.emit('template:imported-ajax', { 
                    templateId: response.data.template_id,
                    templateName: response.data.template_name,
                    originalName: response.data.original_name
                });
                
                return response.data.template_id;
            } else {
                throw new Error(response.data.message || 'Import failed');
            }
        } catch (error) {
            console.error('Template AJAX import failed:', error);
            throw error;
        }
    }
    
    /**
     * Read file as text
     * 
     * @param {File} file
     * @return {Promise<string>}
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Create file input for template import
     * 
     * @return {HTMLInputElement}
     */
    createFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.importTemplateFromFile(file);
                } catch (error) {
                    this.core.emit('template:import-error', { error });
                }
            }
            
            // Clean up
            document.body.removeChild(input);
        });
        
        return input;
    }
    
    /**
     * Trigger file import dialog
     */
    triggerImportDialog() {
        const input = this.createFileInput();
        document.body.appendChild(input);
        input.click();
    }
    
    /**
     * Get current template
     * 
     * @return {string|null}
     */
    getCurrentTemplate() {
        return this.currentTemplate;
    }
    
    /**
     * Check if in preview mode
     * 
     * @return {boolean}
     */
    isPreviewMode() {
        return this.previewMode;
    }
}