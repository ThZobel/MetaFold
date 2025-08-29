// Storage manager with user support and file storage integration

const storage = {
    userPrefix: 'default',
    isAvailable: true,
    fileStorageEnabled: false,
    storageMode: 'localStorage', // 'localStorage', 'files', 'hybrid'
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

    // Initialize file storage support
// UPDATED: Initialize file storage support (reine Datei-Speicherung)
    async initFileStorage() {
        try {
            if (!window.electronAPI || !window.electronAPI.getTemplatesDirectory) {
                console.warn('📦 File storage not available - running in browser mode');
                this.fileStorageEnabled = false;
                this.storageMode = 'localStorage';
                return;
            }

            console.log('📂 Initializing file storage (files-only mode)...');

            const userInfo = this.getCurrentUserContext();
            const result = await window.electronAPI.getTemplatesDirectory(userInfo);

            if (result.success) {
                this.fileStorageEnabled = true;
                this.storageMode = 'files';  // ALWAYS files-only
                console.log(`📁 File storage initialized. Mode: files-only, Directory: ${result.directory}`);
            } else {
                console.warn('📦 File storage initialization failed');
                this.fileStorageEnabled = false;
                this.storageMode = 'localStorage';
            }

            // NO AUTO-MIGRATION - completely removed!
            console.log('✅ File storage initialization completed (no migration, no localStorage)');

        } catch (error) {
            console.error('❌ Error initializing file storage:', error);
            this.fileStorageEnabled = false;
            this.storageMode = 'localStorage';
        }
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
                
                // ONLY files - no localStorage at all
                if (this.fileStorageEnabled && this.storageMode === 'files') {
                    templates = await this.loadTemplatesFromFilesOnly();
                    console.log(`📂 Loaded ${templates.length} templates from files (files-only mode)`);
                } else {
                    console.warn('📦 File storage not available - no templates loaded');
                    templates = [];
                }
                
                // Add system default templates ONLY for completely new users
                if (templates.length === 0 && this.isFirstTimeUser()) {
                    templates = this.getSystemDefaultTemplates();
                    console.log('📋 Using system default templates (first-time user)');
                }
                
                // Add template metadata
                return this.addTemplateMetadataStrict(templates);
            } catch (error) {
                console.warn('❌ Error loading templates:', error);
                return [];
            }
        },

        // UPDATED: Save templates (files-first approach)
        async saveTemplates(templates) {
            if (!this.isAvailable) return false;
            
            try {
                // ONLY save to files - no localStorage
                if (this.fileStorageEnabled && this.storageMode === 'files') {
                    const templatesWithMeta = templates.map(template => ({
                        ...template,
                        createdBy: template.createdBy || window.userManager?.currentUser || 'Unknown',
                        createdByGroup: template.createdByGroup || window.userManager?.currentGroup || 'Unknown',
                        createdAt: template.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }));
                    
                    const savedToFiles = await this.saveTemplatesToFiles(templatesWithMeta);
                    console.log(`💾 Templates saved to files: ${savedToFiles ? 'Success' : 'Failed'}`);
                    return savedToFiles;
                } else {
                    console.warn('📦 File storage not available - templates not saved');
                    return false;
                }
                
            } catch (error) {
                console.error('❌ Error saving templates:', error);
                return false;
            }
        },

        // NEW: Force save single template to file immediately
        async saveTemplateToFileImmediately(template, userInfo) {
            try {
                if (!this.fileStorageEnabled) {
                    console.warn('📂 File storage not enabled');
                    return { success: false, message: 'File storage not available' };
                }

                // Generate stable filename based on template name and creator (no timestamps!)
                const stableFilename = this.generateStableTemplateFilename(template);
                const templateUserInfo = userInfo || this.getCurrentUserContext();
                
                // Clean template for storage (remove UI artifacts)
                const cleanTemplate = window.utils ? 
                    window.utils.cleanTemplateForStorage(template) : 
                    this.cleanTemplateBasic(template);

                console.log(`💾 Saving template "${template.name}" to stable file: ${stableFilename}`);

                const result = await window.electronAPI.saveTemplateToFile(cleanTemplate, templateUserInfo);
                
                if (result.success) {
                    // Update template with file info (stable info, no changing timestamps)
                    template._fileInfo = {
                        filename: stableFilename,
                        filePath: result.filePath,
                        savedAt: new Date().toISOString(),
                        source: 'file',
                        directory: result.directory,
                        stable: true // Mark as using stable filename
                    };
                    
                    console.log(`✅ Template saved to stable file: ${result.filePath}`);
                    return { success: true, filePath: result.filePath, filename: stableFilename };
                } else {
                    console.error(`❌ Failed to save template: ${result.message}`);
                    return { success: false, message: result.message };
                }
                
            } catch (error) {
                console.error('❌ Error in saveTemplateToFileImmediately:', error);
                return { success: false, message: error.message };
            }
        },



        // UPDATED: Get storage mode (always files if available)
        async getStorageMode() {
            // Always prefer files if available
            if (this.fileStorageEnabled) {
                return 'files';
            }
            return 'localStorage';
        },

        // UPDATED: Get storage statistics
        getStorageStats() {
            const stats = {
                mode: this.storageMode,
                fileStorageEnabled: this.fileStorageEnabled,
                migrationCompleted: true, // Always true in files-only mode
                userPrefix: this.userPrefix,
                templates: {
                    total: 0,
                    localStorage: 0,
                    files: 0,
                    default: 0
                }
            };
            
            try {
                // Only count localStorage templates in fallback mode
                if (!this.fileStorageEnabled) {
                    const templates = this.loadTemplatesFromLocalStorage();
                    stats.templates.localStorage = templates.length;
                    stats.templates.total = templates.length;
                    
                    templates.forEach(t => {
                        if (this.isDefaultTemplate(t)) stats.templates.default++;
                    });
                } else {
                    // In files mode, we assume all user templates are in files
                    stats.templates.files = stats.templates.total;
                }
            } catch (error) {
                console.warn('Could not get storage stats:', error);
            }
            
            return stats;
        },

    // Get current storage mode from settings
    async getStorageMode() {
        try {
            if (window.settingsManager && window.settingsManager.get) {
                const mode = await window.settingsManager.get('templates.storage_mode');
                return mode || 'hybrid';
            }
        } catch (error) {
            console.warn('Could not get storage mode from settings:', error);
        }
        return 'hybrid';
    },

    // Check if migration is needed
    async checkMigrationStatus() {
        try {
            // Check if we have templates in localStorage
            const localTemplates = this.loadTemplatesFromLocalStorage();
            
            if (localTemplates.length > 0) {
                // Check if any templates need migration
                const needsMigration = localTemplates.some(t => 
                    !t._fileInfo && !this.isDefaultTemplate(t)
                );
                
                if (needsMigration && !this.migrationCompleted) {
                    console.log('📦 Templates need migration to file storage');
                    return true;
                }
            }
            
            // Check migration completion flag
            this.migrationCompleted = localStorage.getItem('metafold_migration_completed') === 'true';
            return false;
        } catch (error) {
            console.error('📦 Error checking migration status:', error);
            return false;
        }
    },

    // Check if template is a default/system template
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

        // Load templates with file storage support
        async loadTemplates() {
            try {
                let templates = [];
                
                // STRICT FILES-ONLY MODE
                if (this.fileStorageEnabled && this.storageMode === 'files') {
                    templates = await this.loadTemplatesFromFilesOnly();
                    console.log(`📂 Loaded ${templates.length} templates from files (files-only mode)`);
                } else {
                    // Fallback: localStorage only (browser mode) - but with warning
                    console.warn('📦 Fallback to localStorage - file storage not available');
                    templates = this.loadTemplatesFromLocalStorage();
                    console.log(`📦 Loaded ${templates.length} templates from localStorage (fallback)`);
                }
                
                // Add default templates if no user templates found
                if (templates.length === 0) {
                    templates = this.getDefaultTemplates();
                    console.log('📋 Using default templates');
                }
                
                // Add template metadata (but NOT "Unknown" entries for missing data)
                return this.addTemplateMetadataStrict(templates);
            } catch (error) {
                console.warn('❌ Error loading templates:', error);
                return this.getDefaultTemplates();
            }
        },



    // Load templates from file storage
    async loadTemplatesFromFiles() {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            return [];
        }

        try {
            const userInfo = this.getCurrentUserContext();
            const result = await window.electronAPI.loadAllTemplates(userInfo);
            
            if (result.success) {
                console.log(`📂 Loaded ${result.loadedCount} templates from files`);
                
                // Ensure all templates have proper _fileInfo
                return result.templates.map(template => {
                    if (!template._fileInfo) {
                        console.warn(`⚠️ Template "${template.name}" missing _fileInfo`);
                    }
                    return template;
                });
            }
            
            return [];
        } catch (error) {
            console.error('Error loading templates from files:', error);
            return [];
        }
    },


    // Save templates with file storage support
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
            
            // Save to files if enabled
            if (this.fileStorageEnabled && (this.storageMode === 'files' || this.storageMode === 'hybrid')) {
                savedToFiles = await this.saveTemplatesToFiles(templatesWithMeta);
            }
            
            // Save to localStorage if needed
            if (this.storageMode === 'localStorage' || this.storageMode === 'hybrid' || !savedToFiles) {
                savedToLocalStorage = this.saveTemplatesToLocalStorage(templatesWithMeta);
            }
            
            // Also save to group storage for sharing
            this.saveToGroupStorage(templatesWithMeta);
            
            return savedToFiles || savedToLocalStorage;
        } catch (error) {
            console.warn('Error saving templates:', error);
            return false;
        }
    },


    async saveTemplatesToFiles(templates) {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            return false;
        }

        try {
            // Get current user context for directory structure
            const userInfo = this.getCurrentUserContext();
            console.log(`💾 Saving templates for user: ${userInfo.username} (${userInfo.groupname})`);
            
            const savePromises = templates.map(async (template) => {
                // Skip default templates
                if (this.isDefaultTemplate(template)) {
                    return { success: true, skipped: true };
                }
                
                // Clean template for storage
                const cleanTemplate = window.utils.cleanTemplateForStorage(template);
                
                // IMPORTANT: Pass user context to determine directory structure
                // Use template's own user info if available, otherwise current user
                const templateUserInfo = {
                    username: template.createdBy || userInfo.username,
                    groupname: template.createdByGroup || userInfo.groupname
                };
                
                console.log(`📁 Saving template "${template.name}" to user folder: ${templateUserInfo.groupname}/${templateUserInfo.username}`);
                
                // Save template with user context for directory structure
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

generateStableTemplateFilename(template) {
    const safeName = (template.name || 'template')
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')  // Remove special chars
        .replace(/\s+/g, '_')               // Replace spaces with underscores
        .toLowerCase()                      // Lowercase
        .substring(0, 50);                  // Limit length

    const safeUser = (template.createdBy || 'unknown')
        .replace(/[^a-zA-Z0-9\-_]/g, '')
        .toLowerCase()
        .substring(0, 20);

    const templateType = template.type || 'template';
    
    // Simple, stable filename: templatename_user_type.json
    return `${safeName}_${safeUser}_${templateType}.json`;
},

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

            // Deduplicate templates by stable identifier
            templates = this.deduplicateTemplates(templates);
            console.log(`📂 After deduplication: ${templates.length} templates`);

            // Add metadata and enhance
            return this.addTemplateMetadataStrict(templates);
            
        } catch (error) {
            console.error('❌ Error loading templates from files:', error);
            return [];
        }
    },

        generateStableTemplateFilename(template) {
            const safeName = (template.name || 'template')
                .replace(/[^a-zA-Z0-9\s\-_]/g, '')  // Remove special chars
                .replace(/\s+/g, '_')               // Replace spaces with underscores
                .toLowerCase()                      // Lowercase
                .substring(0, 50);                  // Limit length

            const safeUser = (template.createdBy || 'unknown')
                .replace(/[^a-zA-Z0-9\-_]/g, '')
                .toLowerCase()
                .substring(0, 20);

            const templateType = template.type || 'template';
            
            // Simple, stable filename: templatename_user_type.json
            return `${safeName}_${safeUser}_${templateType}.json`;
        },

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

                // Deduplicate templates by stable identifier
                templates = this.deduplicateTemplates(templates);
                console.log(`📂 After deduplication: ${templates.length} templates`);

                // Add metadata and enhance
                return this.addTemplateMetadataStrict(templates);
                
            } catch (error) {
                console.error('❌ Error loading templates from files:', error);
                return [];
            }
        },

        deduplicateTemplates(templates) {
            const seen = new Map();
            const deduplicated = [];
            
            for (const template of templates) {
                const key = `${template.name}_${template.createdBy}_${template.type}`;
                
                if (!seen.has(key)) {
                    seen.set(key, template);
                    deduplicated.push(template);
                } else {
                    // Keep the newer version if there are duplicates
                    const existing = seen.get(key);
                    if (new Date(template.updatedAt || template.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
                        // Replace with newer version
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

        cleanTemplateBasic(template) {
            const clean = { ...template };
            
            // Remove problematic UI properties
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
            
            // Ensure required fields
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

deduplicateTemplates(templates) {
    const seen = new Map();
    const deduplicated = [];
    
    for (const template of templates) {
        const key = `${template.name}_${template.createdBy}_${template.type}`;
        
        if (!seen.has(key)) {
            seen.set(key, template);
            deduplicated.push(template);
        } else {
            // Keep the newer version if there are duplicates
            const existing = seen.get(key);
            if (new Date(template.updatedAt || template.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
                // Replace with newer version
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

cleanTemplateBasic(template) {
    const clean = { ...template };
    
    // Remove problematic UI properties
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
    
    // Ensure required fields
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
                existingGroupTemplates = [];
            }
            
            // Remove old templates from this user
            const filteredTemplates = existingGroupTemplates.filter(t => t.createdBy !== currentUser);
            
            // Add current user's templates for sharing
            const userTemplatesForGroup = templates
                .filter(t => !this.isDefaultTemplate(t))
                .map(t => ({
                    ...t,
                    sharedBy: currentUser,
                    sharedAt: new Date().toISOString()
                }));
            
            const updatedGroupTemplates = [...filteredTemplates, ...userTemplatesForGroup];
            
            // Save to group storage
            localStorage.setItem(groupKey, JSON.stringify(updatedGroupTemplates));
            
            console.log(`🤝 Shared ${userTemplatesForGroup.length} templates to group "${currentGroup}"`);
        } catch (error) {
            console.warn('Could not save to group templates:', error);
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

    // Add metadata to templates
    addTemplateMetadata(templates) {
        return templates.map(template => ({
            ...template,
            createdBy: template.createdBy || 'Unknown',
            createdByGroup: template.createdByGroup || 'Unknown',
            createdAt: template.createdAt || new Date().toISOString()
        }));
    },

    // Get current user context
    getCurrentUserContext() {
        return {
            username: window.userManager?.currentUser || 'Unknown',
            groupname: window.userManager?.currentGroup || 'Unknown'
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

    // Get full user-specific directory path for display  
    getFullUserStoragePath() {
        const userInfo = this.getCurrentUserContext();
        if (!userInfo.username || !userInfo.groupname || 
            userInfo.username === 'Unknown' || userInfo.groupname === 'Unknown') {
            return 'C:\\Users\\[User]\\MetaFold\\Templates\\';
        }
        
        // NEUER PFAD: Home-Verzeichnis statt AppData
        const userHome = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\[User]';
        return `${userHome}\\MetaFold\\Templates\\${userInfo.groupname}\\${userInfo.username}\\`;
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

    // Enhanced getCurrentUserContext with fallbacks
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
        
        // Check migration
        health.migrationNeeded = this.shouldShowMigrationNotice();
        
        return health;
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
    },

        async cleanupLocalStorageTemplates() {
        try {
            console.log('🧹 Starting localStorage cleanup...');
            
            // List all localStorage keys to remove
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
            
            // Group templates (scan for all group keys)
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

    // NEW: Strict file-only loading (no localStorage fallback)
    async loadTemplatesFromFilesOnly() {
        if (!this.fileStorageEnabled || !window.electronAPI) {
            console.warn('📁 File storage not available - cannot load templates');
            return [];
        }

        try {
            const userInfo = this.getCurrentUserContext();
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
            console.error('❌ Error loading templates from files:', error);
            return [];
        }
    },

    // UPDATED: Modified loadTemplates for strict file-only mode
    async loadTemplates() {
        try {
            let templates = [];
            
            // STRICT FILES-ONLY MODE
            if (this.fileStorageEnabled && this.storageMode === 'files') {
                templates = await this.loadTemplatesFromFilesOnly();
                console.log(`📂 Loaded ${templates.length} templates from files (files-only mode)`);
            } else {
                // Fallback: localStorage only (browser mode) - but with warning
                console.warn('📦 Fallback to localStorage - file storage not available');
                templates = this.loadTemplatesFromLocalStorage();
                console.log(`📦 Loaded ${templates.length} templates from localStorage (fallback)`);
            }
            
            // Add default templates if no user templates found
            if (templates.length === 0) {
                templates = this.getDefaultTemplates();
                console.log('📋 Using default templates');
            }
            
            // Add template metadata (but NOT "Unknown" entries for missing data)
            return this.addTemplateMetadataStrict(templates);
        } catch (error) {
            console.warn('❌ Error loading templates:', error);
            return this.getDefaultTemplates();
        }
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

    // NEW: Check if template has valid file backing
    isValidFileTemplate(template) {
        return template._fileInfo && 
            template._fileInfo.filePath && 
            template.createdBy !== 'Unknown' && 
            template.createdByGroup !== 'Unknown';
    },

    // NEW: Force cleanup and reload templates
    async forceCleanReload() {
        console.log('🔄 Force cleanup and reload...');
        
        // 1. Cleanup localStorage
        await this.cleanupLocalStorageTemplates();
        
        // 2. Clear any cached templates in templateManager
        if (window.templateManager) {
            window.templateManager.templates = [];
            window.templateManager.filteredTemplates = [];
        }
        
        // 3. Reload templates from files only
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

window.storage = storage;
console.log('✅ Storage manager loaded with file storage support');