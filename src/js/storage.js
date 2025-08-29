// Storage manager with user support and file storage integration

const storage = {
    userPrefix: 'default',
    isAvailable: true,
    fileStorageEnabled: false,
    storageMode: 'localStorage', // 'localStorage', 'files', 'hybrid'

    // Set user prefix for storage keys
    setUserPrefix(prefix) {
        this.userPrefix = prefix;
        console.log(`📦 Storage prefix set to: ${prefix}`);
    },

    // Get storage key with user prefix
    getStorageKey(key) {
        return `metafold_${this.userPrefix}_${key}`;
    },

    // Initialize file storage support
    async initFileStorage() {
        try {
            if (!window.electronAPI || !window.electronAPI.getTemplatesDirectory) {
                console.warn('📦 File storage not available - running in browser mode');
                this.fileStorageEnabled = false;
                this.storageMode = 'localStorage';
                return;
            }

            console.log('📂 Initializing file storage...');

            const userInfo = this.getCurrentUserContext();
            const result = await window.electronAPI.getTemplatesDirectory(userInfo);

            if (result.success) {
                this.fileStorageEnabled = true;
                this.storageMode = 'files'; // Prefer files when available
                console.log(`📁 File storage initialized. Mode: files, Directory: ${result.directory}`);
            } else {
                console.warn('📦 File storage initialization failed - using localStorage');
                this.fileStorageEnabled = false;
                this.storageMode = 'localStorage';
            }

            console.log('✅ File storage initialization completed (no auto-migration)');

        } catch (error) {
            console.error('❌ Error initializing file storage:', error);
            this.fileStorageEnabled = false;
            this.storageMode = 'localStorage';
        }
    },

     // Get user-friendly storage path for display
    getUserFriendlyStoragePath() {
        const userInfo = this.getCurrentUserContext();
        
        if (window.utils && window.utils.getUserFriendlyTemplatePath) {
            return window.utils.getUserFriendlyTemplatePath(userInfo);
        }
        
        // Fallback für manuell berechneten Pfad
        let basePath = '~/MetaFold/Templates/';
        
        if (userInfo.username !== 'Unknown' && userInfo.groupname !== 'Unknown') {
            if (userInfo.groupname && userInfo.groupname !== 'Default') {
                basePath += `${userInfo.groupname}/`;
                
                if (userInfo.username && userInfo.username !== 'User') {
                    basePath += `${userInfo.username}/`;
                }
            } else if (userInfo.username && userInfo.username !== 'User') {
                basePath += `${userInfo.username}/`;
            }
        }
        
        return basePath;
    },


     // Get storage location info for display
    async getStorageLocationInfo() {
        try {
            if (window.electronAPI && window.electronAPI.getStorageLocationInfo) {
                const result = await window.electronAPI.getStorageLocationInfo();
                return result;
            }
            
            // Fallback für Browser-Modus
            return {
                success: true,
                currentPath: 'Browser localStorage',
                fullPath: 'Browser localStorage',
                userFriendlyPath: 'Browser Storage',
                isHomeDirectory: false,
                basePath: 'Browser'
            };
        } catch (error) {
            console.error('❌ Error getting storage location info:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    
    // Load templates (FILES-FIRST with ARRAY guarantee)
    async loadTemplates() {
        if (!this.isAvailable) return [];
        
        try {
            console.log(`📂 Loading templates for user: ${window.userManager?.currentUser} (${window.userManager?.currentGroup})`);
            
            let templates = [];
            
            // Try file storage first
            if (this.fileStorageEnabled && (this.storageMode === 'files' || this.storageMode === 'hybrid')) {
                try {
                    templates = await this.loadTemplatesFromFilesOnly();  
                    console.log(`📂 Loaded ${templates.length} templates from files`);
                } catch (error) {
                    console.warn('Could not load from files:', error);
                }
            }
            
            // Fallback to localStorage if no file templates or localStorage mode
            if (templates.length === 0 || this.storageMode === 'localStorage' || this.storageMode === 'hybrid') {
                try {
                    const localStorageTemplates = this.loadTemplatesFromLocalStorage();
                    if (localStorageTemplates.length > 0) {
                        templates = [...templates, ...localStorageTemplates];
                        console.log(`📦 Added ${localStorageTemplates.length} templates from localStorage`);
                    }
                } catch (error) {
                    console.warn('Could not load from localStorage:', error);
                }
            }
            
            // Add default templates only if no templates found
            if (templates.length === 0) {
                templates = this.getDefaultTemplates();
                console.log('📋 Using default templates');
            }
            
            // WICHTIG: Filter und enhance Templates
            templates = templates.filter(t => t && t.name && t.name !== 'undefined');
            console.log(`📂 Filtered to ${templates.length} valid templates (removed invalid)`);
            
            // Add metadata
            templates = this.addTemplateMetadataStrict(templates);
            console.log(`📂 Enhanced ${templates.length} templates with UI metadata`);
            
            // WICHTIG: Return array, never undefined
            return Array.isArray(templates) ? templates : [];
            
        } catch (error) {
            console.warn('❌ Error loading templates:', error);
            return this.getDefaultTemplates() || [];
        }
    },
    
    // Save templates (FILES-FIRST with AUTO GROUP-SHARING)
    async saveTemplates(templates) {
        if (!this.isAvailable) return false;
        
        // WICHTIG: Ensure templates is an array
        if (!Array.isArray(templates)) {
            console.warn('⚠️ saveTemplates: templates is not an array:', typeof templates);
            return false;
        }
        
        try {
            const templatesWithMeta = templates.map(template => ({
                ...template,
                createdBy: template.createdBy || window.userManager?.currentUser || 'Unknown',
                createdByGroup: template.createdByGroup || window.userManager?.currentGroup || 'Unknown',
                createdAt: template.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            
            let savedToFiles = false;
            let savedToLocalStorage = false;
            
            // Save to files if enabled
            if (this.fileStorageEnabled && (this.storageMode === 'files' || this.storageMode === 'hybrid')) {
                savedToFiles = await this.saveTemplatesToFiles(templatesWithMeta);
                console.log(`💾 Templates saved to files: ${savedToFiles ? 'Success' : 'Failed'}`);
            }
            
            // Save to localStorage if needed (fallback or hybrid mode)
            if (this.storageMode === 'localStorage' || this.storageMode === 'hybrid' || !savedToFiles) {
                savedToLocalStorage = this.saveTemplatesToLocalStorage(templatesWithMeta);
                console.log(`💾 Templates saved to localStorage: ${savedToLocalStorage ? 'Success' : 'Failed'}`);
            }
            
            // REPARIERT: Save to group storage for sharing (with array check)
            if (Array.isArray(templatesWithMeta) && templatesWithMeta.length > 0) {
                this.saveToGroupStorage(templatesWithMeta);
            }
            
            return savedToFiles || savedToLocalStorage;
            
        } catch (error) {
            console.error('❌ Error saving templates:', error);
            return false;
        }
    },

    // Save single template to file immediately
    async saveTemplateToFileImmediately(template, userInfo) {
        try {
            if (!this.fileStorageEnabled) {
                console.warn('📂 File storage not enabled');
                return { success: false, message: 'File storage not available' };
            }

            const templateUserInfo = userInfo || this.getCurrentUserContext();
            
            // ===== FILENAME PRESERVATION LOGIC =====
            let targetFilename;
            let isUpdate = false;
            
            // 1. Check if template already has a filename
            if (template._fileInfo && template._fileInfo.filename) {
                // BESTEHENDE DATEI - Namen beibehalten
                targetFilename = template._fileInfo.filename;
                isUpdate = true;
                console.log(`💾 Updating existing template "${template.name}" in file: ${targetFilename}`);
            } else {
                // NEUE DATEI - Stabilen Namen generieren
                targetFilename = this.generateStableTemplateFilename(template);
                isUpdate = false;
                console.log(`💾 Creating new template "${template.name}" in file: ${targetFilename}`);
            }
            
            // Clean template for storage (but preserve original _fileInfo temporarily)
            const originalFileInfo = template._fileInfo;
            const cleanTemplate = window.utils ? 
                window.utils.cleanTemplateForStorage(template) : 
                this.cleanTemplateBasic(template);

            // ===== RESTORE FILENAME INFO FOR MAIN.JS =====
            // Wichtig: main.js braucht die _fileInfo um zu erkennen ob es ein Update ist
            if (isUpdate && originalFileInfo) {
                cleanTemplate._fileInfo = {
                    ...originalFileInfo,
                    filename: targetFilename  // Ensure filename is preserved
                };
            }

            // Call main.js with preserved file info
            const result = await window.electronAPI.saveTemplateToFile(cleanTemplate, templateUserInfo);
            
            if (result.success) {
                // Update original template with file info
                template._fileInfo = {
                    filename: result.filename,
                    filePath: result.filePath,
                    savedAt: new Date().toISOString(),
                    source: 'file',
                    directory: result.directory,
                    stable: true,
                    isUpdate: isUpdate
                };
                
                if (isUpdate) {
                    console.log(`✅ Template "${template.name}" updated in existing file: ${result.filePath}`);
                } else {
                    console.log(`✅ Template "${template.name}" saved to new file: ${result.filePath}`);
                }
                
                return { 
                    success: true, 
                    filePath: result.filePath, 
                    filename: result.filename,
                    isUpdate: isUpdate
                };
            } else {
                console.error(`❌ Failed to save template: ${result.message}`);
                return { success: false, message: result.message };
            }
            
        } catch (error) {
            console.error('❌ Error in saveTemplateToFileImmediately:', error);
            return { success: false, message: error.message };
        }
    },

    // =================== ZUSÄTZLICHE HELPER-FUNKTION ===================
    // Diese Funktion prüft ob ein Template bereits eine gültige Datei hat

    hasExistingFile(template) {
        return template._fileInfo && 
            template._fileInfo.filename && 
            template._fileInfo.filePath &&
            template._fileInfo.source === 'file';
    },

    // =================== FILE STORAGE METHODS ===================

    // Load templates from files only (strict)
async loadTemplatesFromFilesOnly() {
    try {
        if (!this.fileStorageEnabled) {
            console.warn('📂 File storage not enabled');
            return [];
        }

        const userInfo = this.getCurrentUserContext();
        console.log(`📂 Loading templates for user: ${userInfo.username} (${userInfo.groupname})`);

        const result = await window.electronAPI.loadAllTemplates(userInfo);
        
        if (!result.success) {
            console.warn('📂 Failed to load templates from files:', result.message);
            return [];
        }

        let templates = result.templates || [];
        console.log(`📂 Loaded ${templates.length} templates from files`);

        // ROBUSTE FILTERUNG - nur wirklich kaputte Templates
        const validTemplates = templates.filter((template, index) => {
            // Check für _fileInfo (sollte nach main.js fix immer da sein)
            const hasFileInfo = template._fileInfo && template._fileInfo.filePath;
            if (!hasFileInfo) {
                console.warn(`⚠️ Template ${index} missing file info - filtering out`);
                return false;
            }

            // Check für validen Namen
            if (!template.name || 
                template.name === 'undefined' || 
                template.name.trim() === '' ||
                typeof template.name !== 'string') {
                console.warn(`⚠️ Template with invalid name filtered out: "${template.name}"`);
                return false;
            }

            // Check für validen Typ
            if (!template.type || 
                (template.type !== 'folders' && template.type !== 'experiment')) {
                console.warn(`⚠️ Template "${template.name}" has invalid type: "${template.type}" - auto-fixing`);
                template.type = 'experiment'; // Auto-fix
            }

            return true;
        });

        console.log(`📂 Filtered to ${validTemplates.length} valid templates (removed ${templates.length - validTemplates.length} invalid)`);

        // TEMPLATE ENHANCEMENT für UI Features hinzufügen
        const enhancedTemplates = this.addTemplateMetadataStrict(validTemplates);
        
        // ZUSÄTZLICHE User-Interface Felder hinzufügen
        const uiEnhancedTemplates = enhancedTemplates.map(template => ({
            ...template,
            // Storage-Anzeige Felder
            savedLocally: true,
            storageType: 'file',
            storageDisplay: 'Saved as file',
            storageIcon: '📁',
            
            // UI Status-Felder
            isOwn: template.createdBy === (window.userManager?.currentUser || 'Unknown'),
            isShared: template.createdBy !== (window.userManager?.currentUser || 'Unknown'),
            
            // Display-Namen für UI
            userDisplayName: template.createdBy || 'Unknown',
            groupDisplayName: template.createdByGroup || 'Unknown'
        }));
        
        console.log(`📂 Enhanced ${uiEnhancedTemplates.length} templates with UI metadata`);
        return uiEnhancedTemplates;
        
    } catch (error) {
        console.error('❌ Error loading templates from files:', error);
        return [];
    }
},

    async refreshTemplates() {
        console.log('🔄 Manually refreshing templates...');
        
        try {
            // Clear cache
            if (window.templateManager) {
                window.templateManager.templates = [];
                window.templateManager.filteredTemplates = [];
                window.templateManager.allTemplates = [];
            }
            
            // Reload from files
            const templates = await this.loadTemplates();
            
            // Update UI
            if (window.templateManager) {
                window.templateManager.templates = templates;
                window.templateManager.renderList();
                window.templateManager.updateTemplateInfo();
            }
            
            console.log(`✅ Refreshed ${templates.length} templates`);
            return templates;
            
        } catch (error) {
            console.error('❌ Error refreshing templates:', error);
            return [];
        }
    },
    // Save templates to files
    async saveTemplatesToFiles(templates) {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            return false;
        }

        try {
            const userInfo = this.getCurrentUserContext();
            console.log(`💾 Saving templates for user: ${userInfo.username} (${userInfo.groupname})`);
            
            const savePromises = templates.map(async (template) => {
                // Skip default templates
                if (this.isDefaultTemplate(template)) {
                    return { success: true, skipped: true };
                }
                
                // Clean template for storage
                const cleanTemplate = window.utils ? 
                    window.utils.cleanTemplateForStorage(template) : 
                    this.cleanTemplateBasic(template);
                
                // Use template's own user info if available
                const templateUserInfo = {
                    username: template.createdBy || userInfo.username,
                    groupname: template.createdByGroup || userInfo.groupname
                };
                
                const result = await window.electronAPI.saveTemplateToFile(cleanTemplate, templateUserInfo);
                
                // Update original template with file info
                if (result.success) {
                    template._fileInfo = {
                        filename: result.filename,
                        filePath: result.filePath,
                        savedAt: result.savedAt,
                        source: 'file',
                        directory: result.directory
                    };
                    console.log(`✅ Template "${template.name}" saved to: ${result.filePath}`);
                }
                
                return result;
            });
            
            const results = await Promise.all(savePromises);
            const successCount = results.filter(r => r.success && !r.skipped).length;
            const skippedCount = results.filter(r => r.skipped).length;
            
            console.log(`💾 File storage result: ${successCount} saved, ${skippedCount} skipped`);
            return successCount > 0;
        } catch (error) {
            console.error('❌ Error saving templates to files:', error);
            return false;
        }
    },

    // =================== LOCALSTORAGE METHODS ===================

    // Load templates from localStorage
    loadTemplatesFromLocalStorage() {
        try {
            const userKey = this.getStorageKey('templates');
            let stored = localStorage.getItem(userKey);
            
            // Try legacy storage if no user-specific templates
            if (!stored && this.userPrefix === 'default') {
                stored = localStorage.getItem('folderTemplates');
                if (stored) {
                    console.log('📦 Using legacy templates');
                    const templates = JSON.parse(stored);
                    return templates;
                }
            }
            
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Error loading templates from localStorage:', error);
        }
        
        return [];
    },

    // Save templates to localStorage
    saveTemplatesToLocalStorage(templates) {
        try {
            localStorage.setItem(
                this.getStorageKey('templates'), 
                JSON.stringify(templates)
            );
            console.log(`💾 Saved ${templates.length} templates to localStorage`);
            return true;
        } catch (error) {
            console.error('Error saving templates to localStorage:', error);
            return false;
        }
    },

    // =================== GROUP SHARING METHODS ===================

    // Save to group storage for sharing
    saveToGroupStorage(templates) {
        const currentUser = window.userManager?.currentUser;
        const currentGroup = window.userManager?.currentGroup;
        
        if (!currentUser || !currentGroup || currentGroup === 'Unknown' || currentGroup === 'Default') {
            console.log('🚫 Skipping group storage: Invalid user context');
            return;
        }

        // WICHTIG: Ensure templates is an array
        if (!Array.isArray(templates)) {
            console.warn('⚠️ saveToGroupStorage: templates is not an array:', typeof templates);
            return;
        }

        try {
            const groupKey = `metafold_group_${currentGroup}_templates`;
            
            // Get existing group templates
            let existingGroupTemplates = [];
            try {
                const stored = localStorage.getItem(groupKey);
                existingGroupTemplates = stored ? JSON.parse(stored) : [];
            } catch (error) {
                existingGroupTemplates = [];
            }
            
            // Remove old templates from this user
            const filteredTemplates = existingGroupTemplates.filter(t => t.createdBy !== currentUser);
            
            // Add current user's templates for sharing
            const userTemplatesForGroup = templates
                .filter(t => t && t.name && t.name !== 'undefined' && !this.isDefaultTemplate(t))
                .map(t => ({
                    ...t,
                    sharedBy: currentUser,
                    sharedAt: new Date().toISOString(),
                    // Add file-based metadata
                    storageType: 'shared',
                    originalStorageType: t.storageType || 'file'
                }));
            
            const updatedGroupTemplates = [...filteredTemplates, ...userTemplatesForGroup];
            
            // Save to group storage
            localStorage.setItem(groupKey, JSON.stringify(updatedGroupTemplates));
            
            console.log(`🤝 Shared ${userTemplatesForGroup.length} templates to group "${currentGroup}"`);
            
        } catch (error) {
            console.error('❌ Error in saveToGroupStorage:', error);
        }
    },

    // Load group templates
    loadGroupTemplates(groupName) {
        if (!this.isAvailable || !groupName) {
            return [];
        }

        try {
            const groupKey = `metafold_group_${groupName}_templates`;
            const stored = localStorage.getItem(groupKey);
            let groupTemplates = stored ? JSON.parse(stored) : [];
            
            // Filter out current user's templates
            const currentUser = window.userManager?.currentUser;
            if (currentUser) {
                groupTemplates = groupTemplates.filter(t => t.createdBy !== currentUser);
            }
            
            console.log(`🤝 Loaded ${groupTemplates.length} group templates from "${groupName}"`);
            return this.addTemplateMetadata(groupTemplates);
        } catch (error) {
            console.warn(`Could not load group templates for "${groupName}":`, error);
            return [];
        }
    },

    // =================== TEMPLATE UTILITIES ===================

    // Generate stable filename
    generateStableTemplateFilename(template) {
        const safeName = (template.name || 'template')
            .replace(/[^a-zA-Z0-9\s\-_]/g, '')
            .replace(/\s+/g, '_')
            .toLowerCase()
            .substring(0, 50);

        const safeUser = (template.createdBy || 'unknown')
            .replace(/[^a-zA-Z0-9\-_]/g, '')
            .toLowerCase()
            .substring(0, 20);

        const templateType = template.type || 'template';
        
        return `${safeName}_${safeUser}_${templateType}.json`;
    },

    // Deduplicate templates
    deduplicateTemplates(templates) {
        const seen = new Map();
        const deduplicated = [];
        
        for (const template of templates) {
            const key = `${template.name}_${template.createdBy}_${template.type}`;
            
            if (!seen.has(key)) {
                seen.set(key, template);
                deduplicated.push(template);
            } else {
                // Keep the newer version
                const existing = seen.get(key);
                if (new Date(template.updatedAt || template.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
                    const index = deduplicated.indexOf(existing);
                    if (index >= 0) {
                        deduplicated[index] = template;
                        seen.set(key, template);
                    }
                }
                console.log(`🗑️ Removed duplicate template: ${template.name} (${template.createdBy})`);
            }
        }
        
        return deduplicated;
    },

    // Clean template for storage
    cleanTemplateBasic(template) {
        const clean = { ...template };
        
        // Remove UI-specific properties
        delete clean._uiState;
        delete clean._dirty;
        delete clean._selected;
        delete clean._lastModified;
        delete clean._searchIndex;
        delete clean._cachedHtml;
        delete clean._renderCache;
        delete clean.userDisplayName;
        delete clean.groupDisplayName;
        delete clean.userColor;
        delete clean.userInitials;
        delete clean.isOwn;
        delete clean.isShared;
        delete clean.originalIndex;
        
        return {
            ...clean,
            id: clean.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: clean.name || 'Unnamed Template',
            type: clean.type || 'experiment',
            createdBy: clean.createdBy || 'Unknown',
            createdByGroup: clean.createdByGroup || 'Unknown',
            createdAt: clean.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },

    // Add metadata to templates (strict - no "Unknown" fallbacks)
    addTemplateMetadataStrict(templates) {
        return templates.map(template => {
            const enhanced = { ...template };
            
            // Only add metadata if actually available
            const currentUser = window.userManager?.currentUser;
            const currentGroup = window.userManager?.currentGroup;
            
            if (!enhanced.createdBy && currentUser && currentUser !== 'Unknown') {
                enhanced.createdBy = currentUser;
            }
            
            if (!enhanced.createdByGroup && currentGroup && currentGroup !== 'Unknown') {
                enhanced.createdByGroup = currentGroup;
            }
            
            if (!enhanced.createdAt) {
                enhanced.createdAt = new Date().toISOString();
            }
            
            return enhanced;
        });
    },

    // Add metadata to templates (with fallbacks)
    addTemplateMetadata(templates) {
        return templates.map(template => ({
            ...template,
            createdBy: template.createdBy || 'Unknown',
            createdByGroup: template.createdByGroup || 'Unknown',
            createdAt: template.createdAt || new Date().toISOString()
        }));
    },

    // Check if template is default/system template
    isDefaultTemplate(template) {
        return template.createdBy === 'System' || 
               template.storageType === 'default' ||
               (template.createdAt && new Date(template.createdAt) < new Date('2024-01-01'));
    },

    // Get default templates
    getDefaultTemplates() {
        // Only return default templates for the very first user ever
        const hasAnyUsers = localStorage.getItem('metafold_global_users');
        if (hasAnyUsers && JSON.parse(hasAnyUsers).length > 0) {
            return []; // No default templates for existing users
        }
        
        return [
            {
                name: "Web Project",
                description: "Standard web development structure",
                type: "folders",
                structure: `src/
  components/
  assets/
    images/
    css/
    js/
  pages/
  utils/
public/
docs/
tests/
package.json
README.md`,
                createdBy: 'System',
                createdByGroup: 'System',
                createdAt: new Date().toISOString(),
                storageType: 'default'
            },
            {
                name: "Data Science Experiment",
                description: "Data analysis with metadata",
                type: "experiment", 
                structure: `data/
  raw/
  processed/
analysis/
  notebooks/
  scripts/
results/
  plots/
  reports/
README.md
experiment_log.md`,
                metadata: {
                    "experiment_name": { "type": "text", "label": "Experiment Name", "value": "", "required": true },
                    "researcher": { "type": "text", "label": "Researcher", "value": "", "required": true },
                    "start_date": { "type": "date", "label": "Start Date", "value": "", "required": false },
                    "hypothesis": { "type": "textarea", "label": "Hypothesis", "value": "", "required": true },
                    "data_source": { "type": "dropdown", "label": "Data Source", "options": ["Internal", "External", "Survey", "API"], "value": "", "required": false }
                },
                createdBy: 'System',
                createdByGroup: 'System',
                createdAt: new Date().toISOString(),
                storageType: 'default'
            }
        ];
    },

    // =================== USER CONTEXT METHODS ===================

    // Get current user context
    getCurrentUserContext() {
        // Primary: Get from userManager if available
        if (window.userManager && window.userManager.currentUser) {
            return {
                username: window.userManager.currentUser,
                groupname: window.userManager.currentGroup || 'Default'
            };
        }
        
        // Fallback: Try to get from storage prefix
        if (this.userPrefix && this.userPrefix !== 'default') {
            const parts = this.userPrefix.split('_');
            if (parts.length >= 2) {
                return {
                    username: parts.slice(1).join('_'),
                    groupname: parts[0]
                };
            }
        }
        
        // Final fallback
        return {
            username: 'Unknown',
            groupname: 'Unknown'
        };
    },

    // AUCH ORIGINAL VERSIONEN:

    getCurrentUser() {
        return window.userManager?.currentUser || 'Unknown';
    },

    getCurrentGroup() {
        return window.userManager?.currentGroup || 'Unknown';
    },

    // =================== STORAGE INFORMATION METHODS ===================

    // Get storage statistics
    getStorageStats() {
        const stats = {
            mode: this.storageMode,
            fileStorageEnabled: this.fileStorageEnabled,
            userPrefix: this.userPrefix,
            templates: {
                total: 0,
                localStorage: 0,
                files: 0,
                default: 0
            }
        };
        
        try {
            const templates = this.loadTemplatesFromLocalStorage();
            stats.templates.localStorage = templates.length;
            stats.templates.total = templates.length;
            
            templates.forEach(t => {
                if (t._fileInfo) stats.templates.files++;
                if (this.isDefaultTemplate(t)) stats.templates.default++;
            });
        } catch (error) {
            console.warn('Could not get storage stats:', error);
        }
        
        return stats;
    },

    // Health check
    async healthCheck() {
        const health = {
            localStorageAvailable: this.isAvailable,
            fileStorageAvailable: this.fileStorageEnabled,
            storageMode: this.storageMode,
            errors: []
        };
        
        try {
            // Check localStorage
            const testKey = 'metafold_health_check';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (error) {
            health.localStorageAvailable = false;
            health.errors.push('localStorage not available');
        }
        
        // Check file storage
        if (this.fileStorageEnabled && window.electronAPI) {
            try {
                const result = await window.electronAPI.getTemplatesDirectory();
                if (!result.success) {
                    health.fileStorageAvailable = false;
                    health.errors.push('Cannot access templates directory');
                }
            } catch (error) {
                health.fileStorageAvailable = false;
                health.errors.push('File storage API error');
            }
        }
        
        return health;
    },

    //getFullUserStoragePath für Home Directory
    getFullUserStoragePath() {
        const userInfo = this.getCurrentUserContext();
        
        // Basis Home Directory Pfad
        const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
        let basePath = `${homeDir}/MetaFold/Templates/`;
        
        // Windows Pfad-Style korrigieren
        if (process.platform === 'win32') {
            basePath = basePath.replace(/\//g, '\\');
        }
        
        if (userInfo.username === 'Unknown' || userInfo.groupname === 'Unknown') {
            return basePath;
        }
        
        // User/Group spezifische Pfade hinzufügen
        if (userInfo.groupname && userInfo.groupname !== 'Default') {
            basePath += `${userInfo.groupname}/`;
            
            if (userInfo.username && userInfo.username !== 'User') {
                basePath += `${userInfo.username}/`;
            }
        } else if (userInfo.username && userInfo.username !== 'User') {
            basePath += `${userInfo.username}/`;
        }
        
        // Windows Pfad-Style korrigieren
        if (process.platform === 'win32') {
            basePath = basePath.replace(/\//g, '\\');
        }
        
        return basePath;
    },

    getFullUserStoragePath() {
        const userInfo = this.getCurrentUserContext();
        if (!userInfo.username || !userInfo.groupname || 
            userInfo.username === 'Unknown' || userInfo.groupname === 'Unknown') {
            return 'C:\\Users\\[User]\\MetaFold\\Templates\\';
        }
        
        const userHome = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\[User]';
        return `${userHome}\\MetaFold\\Templates\\${userInfo.groupname}\\${userInfo.username}\\`;
    },

    isUserManagementActive() {
        const userInfo = this.getCurrentUserContext();
        return userInfo.username !== 'Unknown' && 
            userInfo.groupname !== 'Unknown' &&
            window.userManager && 
            window.userManager.isEnabled && 
            window.userManager.isEnabled();
    },

    // =================== LEGACY COMPATIBILITY METHODS ===================

    addTemplate(template, templates) {
        templates.push(template);
        return this.saveTemplates(templates);
    },

    updateTemplate(index, template, templates) {
        if (index >= 0 && index < templates.length) {
            templates[index] = template;
            return this.saveTemplates(templates);
        }
        return false;
    },

    deleteTemplate(index, templates) {
        if (index >= 0 && index < templates.length) {
            templates.splice(index, 1);
            return this.saveTemplates(templates);
        }
        return false;
    },

    // Storage status für Home Directory
    async getHomeDirectoryStorageStats() {
        try {
            const locationInfo = await this.getStorageLocationInfo();
            const templates = await this.loadTemplates();
            const fileTemplates = templates.filter(t => t._fileInfo && t._fileInfo.source === 'file');
            
            return {
                location: locationInfo,
                templates: {
                    total: templates.length,
                    files: fileTemplates.length,
                    localStorage: templates.length - fileTemplates.length,
                    default: templates.filter(t => this.isDefaultTemplate(t)).length
                },
                isHealthy: locationInfo.success && templates.length > 0,
                userFriendlyPath: this.getUserFriendlyStoragePath()
            };
        } catch (error) {
            console.error('❌ Error getting home directory storage stats:', error);
            return {
                location: { success: false, message: error.message },
                templates: { total: 0, files: 0, localStorage: 0, default: 0 },
                isHealthy: false,
                userFriendlyPath: 'Error loading path'
            };
        }
    },


    // =================== CLEANUP METHODS ===================

    // Cleanup localStorage templates
    async cleanupLocalStorageTemplates() {
        try {
            console.log('🧹 Starting localStorage cleanup...');
            
            const keysToRemove = [];
            
            // Current user templates
            const userKey = this.getStorageKey('templates');
            if (localStorage.getItem(userKey)) {
                keysToRemove.push(userKey);
            }
            
            // Legacy templates
            const legacyKeys = [
                'folderTemplates',
                'experimentTemplates', 
                'metafold_default_templates',
                'templates'
            ];
            
            legacyKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    keysToRemove.push(key);
                }
            });
            
            // Group templates
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('_group_') || key.includes('metafold_'))) {
                    if (key.includes('templates') && !keysToRemove.includes(key)) {
                        keysToRemove.push(key);
                    }
                }
            }
            
            // Remove all found keys
            let removedCount = 0;
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    removedCount++;
                    console.log(`🗑️ Removed localStorage key: ${key}`);
                } catch (error) {
                    console.warn(`⚠️ Could not remove key ${key}:`, error);
                }
            });
            
            console.log(`✅ localStorage cleanup completed. Removed ${removedCount} template keys.`);
            return { success: true, removedKeys: keysToRemove, count: removedCount };
            
        } catch (error) {
            console.error('❌ Error during localStorage cleanup:', error);
            return { success: false, error: error.message };
        }
    },

    // Force clean reload
    async forceCleanReload() {
        console.log('🔄 Force cleanup and reload...');
        
        // 1. Cleanup localStorage
        await this.cleanupLocalStorageTemplates();
        
        // 2. Clear any cached templates in templateManager
        if (window.templateManager) {
            window.templateManager.templates = [];
            window.templateManager.filteredTemplates = [];
        }
        
        // 3. Reload templates
        const templates = await this.loadTemplates();
        
        // 4. Update templateManager if available
        if (window.templateManager) {
            window.templateManager.templates = templates;
            window.templateManager.invalidateCache();
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();
        }
        
        console.log(`✅ Force cleanup completed. Now showing ${templates.length} templates.`);
        return templates;
    }

};

    window.showStorageLocation = async function() {
        try {
            const info = await window.storage.getStorageLocationInfo();
            const stats = await window.storage.getHomeDirectoryStorageStats();
            
            console.log('📁 Template Storage Location:');
            console.log('   Path:', info.userFriendlyPath);
            console.log('   Full Path:', info.fullPath);
            console.log('   Home Directory:', info.isHomeDirectory);
            console.log('📊 Storage Stats:');
            console.log('   Total Templates:', stats.templates.total);
            console.log('   File Templates:', stats.templates.files);
            console.log('   Default Templates:', stats.templates.default);
            console.log('✅ Storage Status:', stats.isHealthy ? 'Healthy' : 'Issues detected');
            
            return stats;
        } catch (error) {
            console.error('❌ Error showing storage location:', error);
        }
    };

window.storage = storage;
console.log('✅ Storage manager loaded with file storage support');