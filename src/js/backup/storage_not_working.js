// Storage manager with user support and file storage integration

const storage = {
    userPrefix: 'default',
    isAvailable: true,
    fileStorageEnabled: false,
    storageMode: 'localStorage', // 'localStorage', 'files'
    migrationCompleted: false,

    // Set user prefix for storage keys
    setUserPrefix(prefix) {
        this.userPrefix = prefix;
        console.log(`📦 Storage prefix set to: ${prefix}`);
    },

    // Get storage key with user prefix
    getStorageKey(key) {
        return `metafold_${this.userPrefix}_${key}`;
    },

    // UPDATED: Initialize file storage support (reine Datei-Speicherung)
    async initFileStorage() {
        try {
            if (!window.electronAPI || !window.electronAPI.getTemplatesDirectory) {
                console.log('📦 File storage not available in browser mode - falling back to localStorage');
                this.fileStorageEnabled = false;
                this.storageMode = 'localStorage';
                return false;
            }

            // WICHTIG: Aktuelle User-Info verwenden
            const userInfo = this.getCurrentUserContext();
            console.log('👤 Initializing file storage for user:', userInfo);

            // Check if we can access templates directory
            const result = await window.electronAPI.getTemplatesDirectory(userInfo);
            if (result.success) {
                this.fileStorageEnabled = true;
                this.storageMode = 'files';
                console.log(`📁 File storage initialized. Mode: files-only`);
                console.log(`📁 User directory: ${result.directory}`);
                
                // Setup directory watching for automatic reload
                try {
                    await window.electronAPI.watchTemplatesDirectory(userInfo);
                    console.log('👁️ Directory watching setup completed');
                } catch (error) {
                    console.warn('⚠️ Directory watching setup failed:', error);
                }
                
                // Auto-migrate any remaining localStorage templates
                await this.autoMigrateToFiles();
                
                return true;
            }
        } catch (error) {
            console.warn('📦 File storage initialization failed:', error);
            this.fileStorageEnabled = false;
            this.storageMode = 'localStorage';
        }
        return false;
    },

    // NEW: Automatically migrate localStorage templates to files
    async autoMigrateToFiles() {
        try {
            const localTemplates = this.loadTemplatesFromLocalStorage();
            const userTemplates = localTemplates.filter(t => !this.isDefaultTemplate(t));
            
            if (userTemplates.length > 0) {
                console.log(`🔄 Auto-migrating ${userTemplates.length} templates to files...`);
                await this.saveTemplatesToFiles(userTemplates);
                console.log('✅ Auto-migration completed');
            }
        } catch (error) {
            console.warn('⚠️ Auto-migration failed:', error);
        }
    },

    // UPDATED: Load templates (files-first approach)
    async loadTemplates() {
        try {
            let templates = [];
            
            // Primary: Load from files if available
            if (this.fileStorageEnabled && this.storageMode === 'files') {
                // Load user's own templates
                templates = await this.loadTemplatesFromFiles();
                console.log(`📂 Loaded ${templates.length} user templates from files`);
                
                // Load group templates for sharing
                const userInfo = this.getCurrentUserContext();
                if (userInfo.groupname && userInfo.groupname !== 'Unknown') {
                    try {
                        const groupTemplates = await this.loadGroupTemplates(userInfo.groupname);
                        templates = templates.concat(groupTemplates);
                        console.log(`🤝 Added ${groupTemplates.length} shared templates from group`);
                    } catch (error) {
                        console.warn('⚠️ Failed to load group templates:', error);
                    }
                }
            } else {
                // Fallback: localStorage only (browser mode)
                templates = this.loadTemplatesFromLocalStorage();
                console.log(`📦 Loaded ${templates.length} templates from localStorage (fallback)`);
            }
            
            // Add default templates if needed
            if (templates.length === 0) {
                templates = this.getDefaultTemplates();
                console.log('📋 Using default templates');
            }
            
            // Add template metadata
            return this.addTemplateMetadata(templates);
        } catch (error) {
            console.warn('❌ Error loading templates:', error);
            return this.getDefaultTemplates();
        }
    },

    // UPDATED: Load templates from files (files-first approach)
    async loadTemplatesFromFiles() {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            return [];
        }

        try {
            const userInfo = this.getCurrentUserContext();
            console.log('📂 Loading templates from files for user:', userInfo);
            
            const result = await window.electronAPI.loadAllTemplates(userInfo);
            
            if (result.success) {
                console.log(`📂 Loaded ${result.loadedCount} user templates from files`);
                
                // Ensure all templates have proper _fileInfo
                const templates = result.templates.map(template => {
                    if (!template._fileInfo) {
                        console.warn(`⚠️ Template "${template.name}" missing _fileInfo`);
                    }
                    return template;
                });
                
                return templates;
            } else {
                console.warn('📂 Failed to load templates from files:', result.message);
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading templates from files:', error);
            return [];
        }
    },

    // NEW: Strict file-only loading (no localStorage fallback)
    async loadTemplatesFromFilesOnly() {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            console.warn('📁 File storage not available - cannot load templates');
            return [];
        }

        try {
            const userInfo = this.getCurrentUserContext();
            console.log('📂 Loading templates from files (strict mode) for user:', userInfo);
            
            const result = await window.electronAPI.loadAllTemplates(userInfo);
            
            if (result.success) {
                console.log(`📂 Loaded ${result.loadedCount} templates from files (strict mode)`);
                
                // Only return templates that actually have _fileInfo
                const fileTemplates = result.templates.filter(template => {
                    const hasFileInfo = template._fileInfo && template._fileInfo.filePath;
                    if (!hasFileInfo) {
                        console.warn(`⚠️ Filtering out template "${template.name}" - no valid file info`);
                    }
                    return hasFileInfo;
                });
                
                console.log(`📂 Filtered to ${fileTemplates.length} valid file templates`);
                return fileTemplates;
            } else {
                console.warn('📂 Failed to load templates from files:', result.message);
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading templates from files (strict mode):', error);
            return [];
        }
    },

    // NEW: Load group templates for sharing
    async loadGroupTemplates(groupName) {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            return [];
        }

        try {
            const userInfo = this.getCurrentUserContext();
            console.log(`🤝 Loading group templates for group: ${groupName}`);
            
            const result = await window.electronAPI.loadGroupTemplates(groupName, userInfo);
            
            if (result.success) {
                console.log(`🤝 Loaded ${result.loadedCount} group templates from files`);
                
                // Filter out current user's templates to avoid duplicates
                const currentUser = userInfo.username;
                const groupTemplates = result.templates.filter(t => t.createdBy !== currentUser);
                
                console.log(`🤝 Filtered to ${groupTemplates.length} shared templates`);
                return this.addTemplateMetadata(groupTemplates);
            } else {
                console.warn('🤝 Failed to load group templates:', result.message);
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading group templates:', error);
            return [];
        }
    },

    // UPDATED: Save templates (files-first approach)
    async saveTemplates(templates) {
        if (!this.isAvailable) return false;
        
        try {
            const templatesWithMeta = templates.map(template => ({
                ...template,
                createdBy: template.createdBy || window.userManager?.currentUser || 'Unknown',
                createdByGroup: template.createdByGroup || window.userManager?.currentGroup || 'Unknown',
                createdAt: template.createdAt || new Date().toISOString()
            }));
            
            let savedToFiles = false;
            let savedToLocalStorage = false;
            
            // Primary: Save to files if enabled
            if (this.fileStorageEnabled && this.storageMode === 'files') {
                savedToFiles = await this.saveTemplatesToFiles(templatesWithMeta);
                console.log(`💾 Templates saved to files: ${savedToFiles ? 'Success' : 'Failed'}`);
            } else {
                // Fallback: Save to localStorage (browser mode only)
                savedToLocalStorage = this.saveTemplatesToLocalStorage(templatesWithMeta);
                console.log(`💾 Templates saved to localStorage: ${savedToLocalStorage ? 'Success' : 'Failed'}`);
            }
            
            // Save to group storage for sharing (regardless of primary storage)
            this.saveToGroupStorage(templatesWithMeta);
            
            return savedToFiles || savedToLocalStorage;
        } catch (error) {
            console.error('❌ Error saving templates:', error);
            return false;
        }
    },

    // Save templates to files
    async saveTemplatesToFiles(templates) {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            console.warn('⚠️ File storage not available');
            return false;
        }

        try {
            const userInfo = this.getCurrentUserContext();
            console.log(`💾 Saving ${templates.length} templates to files for user:`, userInfo);
            
            // Filter out default templates - they shouldn't be saved to user files
            const userTemplates = templates.filter(template => !this.isDefaultTemplate(template));
            
            if (userTemplates.length === 0) {
                console.log('📁 No user templates to save to files');
                return true;
            }
            
            console.log(`💾 Saving ${userTemplates.length} user templates to files (skipped ${templates.length - userTemplates.length} default templates)`);
            
            const savePromises = userTemplates.map(async (template) => {
                const templateUserInfo = {
                    username: template.createdBy || userInfo.username,
                    groupname: template.createdByGroup || userInfo.groupname
                };
                
                // Clean template for file storage (remove UI-specific data)
                const cleanTemplate = this.cleanTemplateForFileStorage(template);
                
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
                } else {
                    console.error(`❌ Failed to save template "${template.name}":`, result.message);
                }
                
                return result;
            });
            
            const results = await Promise.all(savePromises);
            const successCount = results.filter(r => r.success && !r.skipped).length;
            const skippedCount = results.filter(r => r.skipped).length;
            
            console.log(`💾 File storage result: ${successCount} saved, ${skippedCount} skipped (default templates)`);
            return successCount > 0;
        } catch (error) {
            console.error('❌ Error saving templates to files:', error);
            return false;
        }
    },

    // NEW: Refresh templates from files only
    async refreshTemplatesFromFiles() {
        if (!this.fileStorageEnabled) {
            console.warn('⚠️ File storage not available for refresh');
            return false;
        }

        try {
            console.log('🔄 Refreshing templates from files...');
            
            // Load fresh templates from files
            const fileTemplates = await this.loadTemplatesFromFilesOnly();
            
            // Update templateManager if available
            if (window.templateManager) {
                window.templateManager.templates = fileTemplates;
                window.templateManager.invalidateCache();
                window.templateManager.buildSearchIndex();
                window.templateManager.renderList();
                window.templateManager.updateTemplateInfo();
            }
            
            console.log(`✅ Refreshed ${fileTemplates.length} templates from files`);
            return true;
        } catch (error) {
            console.error('❌ Error refreshing templates from files:', error);
            return false;
        }
    },

    // Load templates from localStorage (fallback)
    loadTemplatesFromLocalStorage() {
        try {
            const userKey = this.getStorageKey('templates');
            let stored = localStorage.getItem(userKey);
            
            // Try legacy storage if no user-specific templates
            if (!stored && this.userPrefix === 'default') {
                stored = localStorage.getItem('folderTemplates');
                if (stored) {
                    console.log('📦 Migrating legacy templates');
                    const templates = JSON.parse(stored);
                    this.saveTemplates(templates);
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

    // Save templates to localStorage (fallback)
    saveTemplatesToLocalStorage(templates) {
        try {
            localStorage.setItem(
                this.getStorageKey('templates'), 
                JSON.stringify(templates)
            );
            return true;
        } catch (error) {
            console.error('Error saving templates to localStorage:', error);
            return false;
        }
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

    // Check if template is a default/system template
    isDefaultTemplate(template) {
        return template.createdBy === 'System' || 
               template.storageType === 'default' ||
               (template.createdAt && new Date(template.createdAt) < new Date('2024-01-01'));
    },

    // Add metadata to templates
    addTemplateMetadata(templates) {
        return templates.map(template => ({
            ...template,
            createdBy: template.createdBy || 'Unknown',
            createdByGroup: template.createdByGroup || 'Unknown',
            createdAt: template.createdAt || new Date().toISOString()
        }));
    },

    // NEW: Strict metadata addition (no "Unknown" fallbacks)
    addTemplateMetadataStrict(templates) {
        return templates.map(template => {
            // Only add metadata if it's actually available
            const enhanced = { ...template };
            
            // Only set if actually available from user context
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
            
            // Do NOT add "Unknown" fallbacks - just leave missing data as-is
            return enhanced;
        });
    },

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
                    username: parts.slice(1).join('_'), // Handle usernames with underscores
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

    // Get current user/group
    getCurrentUser() {
        return window.userManager?.currentUser || 'Unknown';
    },

    getCurrentGroup() {
        return window.userManager?.currentGroup || 'Unknown';
    },

    // Get user-specific storage path for display
    getUserStoragePath() {
        const userInfo = this.getCurrentUserContext();
        if (!userInfo.username || !userInfo.groupname || 
            userInfo.username === 'Unknown' || userInfo.groupname === 'Unknown') {
            return 'General templates folder';
        }
        
        return `${userInfo.groupname}/${userInfo.username}/`;
    },

    async getFullUserStoragePath() {
        const userInfo = this.getCurrentUserContext();
        if (!userInfo.username || !userInfo.groupname || 
            userInfo.username === 'Unknown' || userInfo.groupname === 'Unknown') {
            return 'Templates folder not available';
        }
        
        try {
            // FIXED: Nutze Electron API statt process.env
            if (window.electronAPI && window.electronAPI.getTemplatesDirectory) {
                const result = await window.electronAPI.getTemplatesDirectory(userInfo);
                if (result.success) {
                    return result.directory;
                }
            }
            
            // Fallback für Browser-Modus
            return `Templates/${userInfo.groupname}/${userInfo.username}/`;
        } catch (error) {
            console.warn('Could not get user storage path:', error);
            return `Templates/${userInfo.groupname}/${userInfo.username}/`;
        }
    },

    // Check if user management is active for storage decisions
    isUserManagementActive() {
        const userInfo = this.getCurrentUserContext();
        return userInfo.username !== 'Unknown' && 
            userInfo.groupname !== 'Unknown' &&
            window.userManager && 
            window.userManager.isEnabled && 
            window.userManager.isEnabled();
    },

    // Save to group storage for sharing
    saveToGroupStorage(templates) {
        const currentUser = window.userManager?.currentUser;
        const currentGroup = window.userManager?.currentGroup;
        
        if (!currentUser || !currentGroup || currentGroup === 'Unknown') {
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
                console.warn('Error loading existing group templates:', error);
                existingGroupTemplates = [];
            }
            
            // Filter out current user's templates from existing group templates
            existingGroupTemplates = existingGroupTemplates.filter(t => t.createdBy !== currentUser);
            
            // Add current user's templates to group storage
            const userTemplates = templates.filter(t => 
                t.createdBy === currentUser && 
                !this.isDefaultTemplate(t)
            );
            
            const updatedGroupTemplates = [...existingGroupTemplates, ...userTemplates];
            
            localStorage.setItem(groupKey, JSON.stringify(updatedGroupTemplates));
            console.log(`🤝 Saved ${userTemplates.length} templates to group "${currentGroup}" storage`);
        } catch (error) {
            console.warn('Error saving to group storage:', error);
        }
    },

    // Load group templates from localStorage
    loadGroupTemplatesFromLocalStorage(groupName) {
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

    // Check if template needs migration
    shouldShowMigrationNotice() {
        if (!this.fileStorageEnabled || this.migrationCompleted) {
            return false;
        }
        
        try {
            const localTemplates = this.loadTemplatesFromLocalStorage();
            
            // Check if any user templates don't have file info
            return localTemplates.some(t => 
                !this.isDefaultTemplate(t) && 
                !t._fileInfo &&
                t.createdBy !== 'System'
            );
        } catch (error) {
            return false;
        }
    },

    // Check if template has structure changes
    hasTemplateStructureChanged(oldTemplate, newTemplate) {
        if (!oldTemplate || !newTemplate) return true;
        
        // Extract structural elements
        const oldStructure = this.extractTemplateStructure(oldTemplate);
        const newStructure = this.extractTemplateStructure(newTemplate);
        
        // Compare structures
        return JSON.stringify(oldStructure) !== JSON.stringify(newStructure);
    },

    // Extract template structure for comparison
    extractTemplateStructure(template) {
        return {
            type: template.type,
            structure: template.structure,
            metadataKeys: template.metadata ? Object.keys(template.metadata).sort() : [],
            metadataTypes: template.metadata ? 
                Object.entries(template.metadata).reduce((acc, [key, field]) => {
                    acc[key] = field.type;
                    return acc;
                }, {}) : {}
        };
    },

    // Clean template for file storage (remove UI-specific data)
    cleanTemplateForFileStorage(template) {
        const cleaned = { ...template };
        
        // Remove UI-specific properties
        delete cleaned._uiState;
        delete cleaned._dirty;
        delete cleaned._selected;
        delete cleaned._lastModified;
        delete cleaned.savedLocally;
        delete cleaned.storageDisplay;
        delete cleaned.storageIcon;
        delete cleaned.isOwn;
        delete cleaned.filteredTemplates;
        
        return cleaned;
    },

    // Check if template has valid file backing
    isValidFileTemplate(template) {
        return template._fileInfo && 
            template._fileInfo.filePath && 
            template.createdBy !== 'Unknown' && 
            template.createdByGroup !== 'Unknown';
    },

    // Get storage statistics
    getStorageStats() {
        const stats = {
            mode: this.storageMode,
            fileStorageEnabled: this.fileStorageEnabled,
            migrationCompleted: this.migrationCompleted,
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
            migrationNeeded: false,
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
                const userInfo = this.getCurrentUserContext();
                const result = await window.electronAPI.getTemplatesDirectory(userInfo);
                if (!result.success) {
                    health.fileStorageAvailable = false;
                    health.errors.push('Cannot access templates directory');
                }
            } catch (error) {
                health.fileStorageAvailable = false;
                health.errors.push('File storage API error');
            }
        }
        
        // Check migration
        health.migrationNeeded = this.shouldShowMigrationNotice();
        
        return health;
    },

    // NEW: Force cleanup and reload templates
    async forceCleanReload() {
        console.log('🔄 Force cleanup and reload...');
        
        try {
            // 1. Clear any cached templates in templateManager
            if (window.templateManager) {
                window.templateManager.templates = [];
                window.templateManager.filteredTemplates = [];
            }
            
            // 2. Reload templates from files only
            const templates = await this.loadTemplates();
            
            // 3. Update templateManager if available
            if (window.templateManager) {
                window.templateManager.templates = templates;
                window.templateManager.invalidateCache();
                window.templateManager.buildSearchIndex();
                window.templateManager.renderList();
                window.templateManager.updateTemplateInfo();
            }
            
            console.log(`✅ Force cleanup completed. Now showing ${templates.length} templates.`);
            return templates;
        } catch (error) {
            console.error('❌ Force reload failed:', error);
            return [];
        }
    },

    // Clean up localStorage templates
    async cleanupLocalStorageTemplates() {
        try {
            console.log('🧹 Starting localStorage cleanup...');
            
            // List all localStorage keys to remove
            const keysToRemove = [];
            
            // Current user templates key
            const userKey = this.getStorageKey('templates');
            if (localStorage.getItem(userKey)) {
                keysToRemove.push(userKey);
            }
            
            // Legacy keys
            const legacyKeys = ['folderTemplates', 'metafold_templates'];
            legacyKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    keysToRemove.push(key);
                }
            });
            
            // Remove identified keys
            let removedCount = 0;
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                removedCount++;
                console.log(`🗑️ Removed localStorage key: ${key}`);
            });
            
            console.log(`🧹 localStorage cleanup completed. Removed ${removedCount} template keys.`);
            return { success: true, removedKeys: keysToRemove, count: removedCount };
            
        } catch (error) {
            console.error('❌ Error during localStorage cleanup:', error);
            return { success: false, error: error.message };
        }
    },

    // Legacy compatibility methods
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
    }
};

window.storage = storage;
console.log('✅ Storage manager loaded with file storage support');