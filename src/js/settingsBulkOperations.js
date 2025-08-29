// Settings Manager - ENHANCED with Bulk Template Operations

const settingsManager = {
    settings: {},
    secureCredentials: {}, // Separate storage for encrypted credentials
    isSecureStorageReady: false,
    migrationStatus: {
        completed: false,
        lastMigration: null,
        migratedKeys: []
    },
    
    // ENHANCED Default Settings - Add these to settingsManager.js defaultSettings object

	defaultSettings: {
		// General Settings
		'general.user_management_enabled': false,
		'general.theme': 'dark',
		'general.auto_save': true,
		'general.show_tips': true,
		
		// NEW: Template Management Settings
		'templates.auto_backup': true,
		'templates.backup_interval': 'daily', // daily, weekly, monthly
		'templates.max_backups': 10,
		'templates.export_format': 'metafold', // metafold, json, bundle
		'templates.import_conflict_resolution': 'rename', // rename, overwrite, skip
		
		// Security Settings
		'security.encryption_enabled': true,
		'security.auto_migrate': true,
		'security.require_encryption': false,
		
		// elabFTW Integration Settings
		'elabftw.enabled': false,
		'elabftw.server_url': '',
		'elabftw.api_key': '', // Will be moved to secure storage
		'elabftw.auto_sync': false,
		'elabftw.default_category': 1,
		'elabftw.verify_ssl': true,
		
		// NEW: elabFTW Conflict Resolution Settings
		'elabftw.overwrite_enabled': false,        // SAFE MODE by default (versioning)
		'elabftw.versioning_format': 'date',       // date, timestamp, or counter
		
		// OMERO Integration Settings
		'omero.enabled': false,
		'omero.server_url': '',
		'omero.username': '', // Will be moved to secure storage
		'omero.password': '', // Will be moved to secure storage
		'omero.auto_sync': false,
		'omero.default_project_id': '',
		'omero.create_datasets': true,
		'omero.verify_ssl': true,
		'omero.session_timeout': 600000 // 10 minutes
	},

    // Keys that should be stored securely
    sensitiveKeys: [
        'elabftw.api_key',
        'omero.password',
        'omero.username'
    ],

    // =================== INITIALIZATION ===================

    async init() {
        console.log('🔧 Initializing settingsManager with Secure Storage...');
        
        // Initialize secure storage first
        if (window.secureStorage) {
            try {
                await window.secureStorage.init();
                this.isSecureStorageReady = true;
                console.log('🔐 Secure storage ready');
            } catch (error) {
                console.warn('🔐 Secure storage initialization failed:', error);
                this.isSecureStorageReady = false;
            }
        }
        
        // Load settings
        this.loadSettings();
        
        // Load secure credentials
        await this.loadSecureCredentials();
        
        // Check if migration is needed
        await this.checkAndPerformMigration();
        
        // Apply initial settings
        this.applyInitialSettings();
        
        console.log('✅ settingsManager initialized with secure storage support');
    },

    // =================== CORE SETTINGS METHODS ===================

    loadSettings() {
        try {
            const stored = localStorage.getItem('metafold_settings');
            if (stored) {
                this.settings = { ...this.defaultSettings, ...JSON.parse(stored) };
            } else {
                this.settings = { ...this.defaultSettings };
            }
            console.log('📂 Settings loaded');
        } catch (error) {
            console.warn('Error loading settings, using defaults:', error);
            this.settings = { ...this.defaultSettings };
        }
    },

    saveSettings() {
        try {
            localStorage.setItem('metafold_settings', JSON.stringify(this.settings));
            console.log('💾 Settings saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    async get(key) {
        // Check if this is a sensitive key that should be retrieved securely
        if (this.sensitiveKeys.includes(key)) {
            return await this.getSecureCredential(key);
        }
        
        // Regular setting retrieval
        const value = this.settings[key] !== undefined ? this.settings[key] : this.defaultSettings[key];
        return value;
    },

    async set(key, value) {
        console.log(`📝 Set setting "${key}":`, this.sensitiveKeys.includes(key) ? '[HIDDEN]' : value);
        
        // Check if this is a sensitive key that should be stored securely
        if (this.sensitiveKeys.includes(key) && this.isSecureStorageReady) {
            const success = await this.setSecureCredential(key, value);
            if (success) {
                this.handleSettingChange(key, value);
            }
            return success;
        }
        
        // Regular setting storage
        this.settings[key] = value;
        const saved = this.saveSettings();
        
        if (saved) {
            this.handleSettingChange(key, value);
        }
        
        return saved;
    },

    // =================== NEW: BULK TEMPLATE OPERATIONS ===================

    // Export all templates with selection dialog
    async bulkExportTemplates() {
        try {
            console.log('📤 Starting bulk template export...');
            
            if (!window.electronAPI || !window.electronAPI.bulkExportTemplates) {
                throw new Error('Bulk export not available in browser mode');
            }
            
            // Get all templates from template manager
            const allTemplates = this.getAllAvailableTemplates();
            
            if (allTemplates.length === 0) {
                return {
                    success: false,
                    message: 'No templates available for export'
                };
            }
            
            // Use electron's bulk export with selection dialog
            const result = await window.electronAPI.bulkExportTemplates(allTemplates);
            
            if (result.success) {
                console.log(`✅ Bulk export completed: ${result.count} templates`);
                
                // Update export statistics
                await this.updateExportStatistics(result);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error in bulk export:', error);
            return {
                success: false,
                message: `Bulk export error: ${error.message}`
            };
        }
    },

    // Import multiple templates with processing
    async bulkImportTemplates() {
        try {
            console.log('📥 Starting bulk template import...');
            
            if (!window.electronAPI || !window.electronAPI.bulkImportTemplates) {
                throw new Error('Bulk import not available in browser mode');
            }
            
            // Use electron's bulk import
            const result = await window.electronAPI.bulkImportTemplates({
                conflictResolution: await this.get('templates.import_conflict_resolution')
            });
            
            if (result.success && result.totalImported > 0) {
                console.log(`✅ Bulk import completed: ${result.totalImported} templates imported`);
                
                // Process imported templates
                await this.processBulkImportedTemplates(result);
                
                // Update import statistics
                await this.updateImportStatistics(result);
                
                // Refresh template manager
                if (window.templateManager && window.templateManager.refresh) {
                    await window.templateManager.refresh();
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error in bulk import:', error);
            return {
                success: false,
                message: `Bulk import error: ${error.message}`
            };
        }
    },

    // Process imported templates
    async processBulkImportedTemplates(importResult) {
        if (!importResult.results || !window.storage) return;
        
        const conflictResolution = await this.get('templates.import_conflict_resolution');
        let processedCount = 0;
        
        for (const fileResult of importResult.results) {
            if (fileResult.success && fileResult.templates) {
                for (const template of fileResult.templates) {
                    try {
                        // Handle name conflicts
                        const processedTemplate = await this.resolveTemplateNameConflict(template, conflictResolution);
                        
                        // Save template
                        if (window.storage.saveTemplate) {
                            const saveResult = await window.storage.saveTemplate(processedTemplate);
                            if (saveResult) {
                                processedCount++;
                                console.log(`📥 Processed imported template: ${processedTemplate.name}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error processing template ${template.name}:`, error);
                    }
                }
            }
        }
        
        console.log(`📥 Processed ${processedCount} imported templates`);
        return processedCount;
    },

    // Resolve template name conflicts
    async resolveTemplateNameConflict(template, conflictResolution) {
        if (!window.templateManager || !window.templateManager.templates) {
            return template;
        }
        
        const existingTemplates = window.templateManager.templates;
        const existingNames = existingTemplates.map(t => t.name.toLowerCase());
        const templateNameLower = template.name.toLowerCase();
        
        // Check for conflict
        if (!existingNames.includes(templateNameLower)) {
            return template; // No conflict
        }
        
        console.log(`🔄 Name conflict detected for template: ${template.name}`);
        
        switch (conflictResolution) {
            case 'rename':
                return this.generateUniqueTemplateName(template, existingNames);
            case 'overwrite':
                console.log(`🔄 Overwriting existing template: ${template.name}`);
                return template;
            case 'skip':
                console.log(`⏭️ Skipping template due to name conflict: ${template.name}`);
                return null;
            default:
                return this.generateUniqueTemplateName(template, existingNames);
        }
    },

    // Generate unique template name
    generateUniqueTemplateName(template, existingNames) {
        let baseName = template.name;
        let counter = 1;
        let newName = `${baseName} (Imported)`;
        
        while (existingNames.includes(newName.toLowerCase())) {
            counter++;
            newName = `${baseName} (Imported ${counter})`;
        }
        
        return {
            ...template,
            name: newName,
            originalName: baseName,
            nameModified: true,
            nameModificationReason: 'conflict_resolution'
        };
    },

    // Get all available templates
    getAllAvailableTemplates() {
        const templates = [];
        
        // Get templates from template manager
        if (window.templateManager && window.templateManager.templates) {
            templates.push(...window.templateManager.templates);
        }
        
        // Get shared templates if available
        if (window.templateManager && window.templateManager.getAllTemplates) {
            const allTemplates = window.templateManager.getAllTemplates();
            // Filter to avoid duplicates
            const uniqueTemplates = allTemplates.filter(t => 
                !templates.find(existing => 
                    existing.name === t.name && 
                    existing.createdBy === t.createdBy &&
                    existing.createdAt === t.createdAt
                )
            );
            templates.push(...uniqueTemplates);
        }
        
        return templates;
    },

    // Update export statistics
    async updateExportStatistics(exportResult) {
        try {
            const stats = this.getTemplateStatistics();
            stats.exports = stats.exports || [];
            
            stats.exports.push({
                timestamp: new Date().toISOString(),
                count: exportResult.count,
                type: exportResult.type,
                filePath: exportResult.filePath,
                success: exportResult.success
            });
            
            // Keep only last 50 export records
            if (stats.exports.length > 50) {
                stats.exports = stats.exports.slice(-50);
            }
            
            await this.saveTemplateStatistics(stats);
        } catch (error) {
            console.warn('Error updating export statistics:', error);
        }
    },

    // Update import statistics
    async updateImportStatistics(importResult) {
        try {
            const stats = this.getTemplateStatistics();
            stats.imports = stats.imports || [];
            
            stats.imports.push({
                timestamp: new Date().toISOString(),
                totalFiles: importResult.totalFiles,
                totalImported: importResult.totalImported,
                errors: importResult.errors?.length || 0,
                results: importResult.results
            });
            
            // Keep only last 50 import records
            if (stats.imports.length > 50) {
                stats.imports = stats.imports.slice(-50);
            }
            
            await this.saveTemplateStatistics(stats);
        } catch (error) {
            console.warn('Error updating import statistics:', error);
        }
    },

    // Get template statistics
    getTemplateStatistics() {
        try {
            const stored = localStorage.getItem('metafold_template_statistics');
            return stored ? JSON.parse(stored) : {
                exports: [],
                imports: [],
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.warn('Error loading template statistics:', error);
            return {
                exports: [],
                imports: [],
                createdAt: new Date().toISOString()
            };
        }
    },

    // Save template statistics
    async saveTemplateStatistics(stats) {
        try {
            localStorage.setItem('metafold_template_statistics', JSON.stringify(stats));
        } catch (error) {
            console.warn('Error saving template statistics:', error);
        }
    },

    // Create template backup
    async createTemplateBackup() {
        try {
            console.log('💾 Creating template backup...');
            
            const allTemplates = this.getAllAvailableTemplates();
            
            if (allTemplates.length === 0) {
                return {
                    success: false,
                    message: 'No templates to backup'
                };
            }
            
            const backupData = {
                metafoldBackup: {
                    version: '1.1.0',
                    createdAt: new Date().toISOString(),
                    type: 'automatic-backup',
                    templateCount: allTemplates.length,
                    backupSettings: {
                        interval: await this.get('templates.backup_interval'),
                        maxBackups: await this.get('templates.max_backups')
                    }
                },
                templates: allTemplates.map(template => ({
                    ...template,
                    // Clean up internal properties
                    _fileInfo: undefined,
                    isOwn: undefined,
                    isShared: undefined,
                    userColor: undefined,
                    userInitials: undefined,
                    originalIndex: undefined
                }))
            };
            
            // Save backup
            if (window.electronAPI && window.electronAPI.saveJsonFile) {
                const result = await window.electronAPI.saveJsonFile(backupData);
                
                if (result.success) {
                    console.log(`✅ Template backup created with ${allTemplates.length} templates`);
                    return {
                        success: true,
                        message: `Backup created with ${allTemplates.length} templates`,
                        templateCount: allTemplates.length
                    };
                }
            }
            
            return {
                success: false,
                message: 'Could not create backup file'
            };
        } catch (error) {
            console.error('❌ Error creating template backup:', error);
            return {
                success: false,
                message: `Backup error: ${error.message}`
            };
        }
    },

    // Restore from template backup
    async restoreFromBackup() {
        try {
            console.log('📂 Restoring from template backup...');
            
            if (!window.electronAPI || !window.electronAPI.loadJsonFile) {
                throw new Error('File operations not available in browser mode');
            }
            
            const result = await window.electronAPI.loadJsonFile();
            
            if (!result.success) {
                return {
                    success: false,
                    message: result.message || 'Failed to load backup file'
                };
            }
            
            const backupData = result.content;
            
            // Validate backup format
            if (!backupData.metafoldBackup || !backupData.templates) {
                throw new Error('Invalid backup file format');
            }
            
            const templates = backupData.templates;
            console.log(`📂 Found ${templates.length} templates in backup`);
            
            // Process and save templates
            let restoredCount = 0;
            const errors = [];
            
            for (const template of templates) {
                try {
                    // Add restoration metadata
                    const restoredTemplate = {
                        ...template,
                        restorationMetadata: {
                            restoredAt: new Date().toISOString(),
                            originalBackupDate: backupData.metafoldBackup.createdAt,
                            backupVersion: backupData.metafoldBackup.version
                        }
                    };
                    
                    // Save template
                    if (window.storage && window.storage.saveTemplate) {
                        const saveResult = await window.storage.saveTemplate(restoredTemplate);
                        if (saveResult) {
                            restoredCount++;
                        }
                    }
                } catch (error) {
                    errors.push({
                        template: template.name,
                        error: error.message
                    });
                }
            }
            
            // Refresh template manager
            if (window.templateManager && window.templateManager.refresh) {
                await window.templateManager.refresh();
            }
            
            console.log(`✅ Restored ${restoredCount}/${templates.length} templates`);
            
            return {
                success: true,
                message: `Restored ${restoredCount} templates from backup`,
                restoredCount: restoredCount,
                totalTemplates: templates.length,
                errors: errors
            };
        } catch (error) {
            console.error('❌ Error restoring from backup:', error);
            return {
                success: false,
                message: `Restore error: ${error.message}`
            };
        }
    },

    // =================== SECURE CREDENTIAL MANAGEMENT ===================

    async loadSecureCredentials() {
        try {
            const storedCredentials = localStorage.getItem('metafold_secure_credentials');
            if (storedCredentials) {
                this.secureCredentials = JSON.parse(storedCredentials);
                console.log('🔐 Loaded secure credentials store');
            }
            
            // Load migration status
            const migrationStatus = localStorage.getItem('metafold_migration_status');
            if (migrationStatus) {
                this.migrationStatus = { ...this.migrationStatus, ...JSON.parse(migrationStatus) };
            }
        } catch (error) {
            console.warn('🔐 Error loading secure credentials:', error);
            this.secureCredentials = {};
        }
    },

    async saveSecureCredentials() {
        try {
            localStorage.setItem('metafold_secure_credentials', JSON.stringify(this.secureCredentials));
            localStorage.setItem('metafold_migration_status', JSON.stringify(this.migrationStatus));
            console.log('🔐 Saved secure credentials store');
        } catch (error) {
            console.error('🔐 Error saving secure credentials:', error);
        }
    },

    async setSecureCredential(key, value) {
        if (!this.isSecureStorageReady) {
            console.warn('🔐 Secure storage not ready, storing as plaintext');
            return this.set(key, value);
        }

        if (!value || value.trim() === '') {
            // Remove credential if empty
            delete this.secureCredentials[key];
            await this.saveSecureCredentials();
            console.log(`🔐 Removed secure credential: ${key.replace(/password|key/gi, '***')}`);
            return true;
        }

        try {
            const encrypted = await window.secureStorage.storeCredential(key, value, {
                key: key,
                timestamp: new Date().toISOString(),
                source: 'settings'
            });

            this.secureCredentials[key] = encrypted;
            await this.saveSecureCredentials();
            
            console.log(`🔐 Stored secure credential: ${key.replace(/password|key/gi, '***')} using ${encrypted.method}`);
            return true;
        } catch (error) {
            console.error(`🔐 Failed to store secure credential ${key}:`, error);
            
            // Fallback to plaintext if encryption fails
            console.warn('🔐 Falling back to plaintext storage');
            return this.set(key, value);
        }
    },

    async getSecureCredential(key) {
        // Check if credential is stored securely
        if (this.secureCredentials[key]) {
            try {
                const decrypted = await window.secureStorage.retrieveCredential(this.secureCredentials[key]);
                return decrypted || '';
            } catch (error) {
                console.error(`🔐 Failed to decrypt credential ${key}:`, error);
                
                // FIXED: Fallback to plaintext setting WITHOUT recursion
                const plaintextValue = this.settings[key] !== undefined ? this.settings[key] : this.defaultSettings[key];
                console.warn(`🔐 Using plaintext fallback for ${key}`);
                return plaintextValue || '';
            }
        }
        
        // FIXED: Fallback to regular settings WITHOUT recursion
        const regularValue = this.settings[key] !== undefined ? this.settings[key] : this.defaultSettings[key];
        return regularValue || '';
    },

    // =================== MIGRATION LOGIC ===================

    async checkAndPerformMigration() {
        if (this.migrationStatus.completed || !this.isSecureStorageReady) {
            return;
        }

        console.log('🔄 Checking for credential migration...');
        
        const shouldAutoMigrate = this.get('security.auto_migrate');
        let needsMigration = false;
        const plaintextCredentials = {};

        // Check for plaintext sensitive data
        for (const key of this.sensitiveKeys) {
            const value = this.settings[key];
            if (value && typeof value === 'string' && value.trim() !== '') {
                needsMigration = true;
                plaintextCredentials[key] = value;
            }
        }

        if (!needsMigration) {
            console.log('🔄 No migration needed');
            return;
        }

        if (shouldAutoMigrate) {
            console.log('🔄 Auto-migrating credentials...');
            await this.performMigration(plaintextCredentials);
        }
    },

    async performMigration(plaintextCredentials) {
        try {
            console.log('🔄 Starting credential migration...');
            const migrationLog = [];

            for (const [key, value] of Object.entries(plaintextCredentials)) {
                try {
                    await this.setSecureCredential(key, value);
                    
                    // Remove from plaintext settings
                    delete this.settings[key];
                    
                    migrationLog.push({
                        key: key.replace(/password|key/gi, '***'),
                        success: true,
                        method: this.secureCredentials[key]?.method || 'unknown'
                    });
                    
                    console.log(`🔄 Migrated: ${key.replace(/password|key/gi, '***')}`);
                } catch (error) {
                    migrationLog.push({
                        key: key.replace(/password|key/gi, '***'),
                        success: false,
                        error: error.message
                    });
                    console.error(`🔄 Migration failed for ${key}:`, error);
                }
            }

            // Update migration status
            this.migrationStatus = {
                completed: true,
                lastMigration: new Date().toISOString(),
                migratedKeys: migrationLog.filter(log => log.success).map(log => log.key),
                migrationLog: migrationLog
            };

            // Save both stores
            this.saveSettings();
            await this.saveSecureCredentials();
            
            const successCount = migrationLog.filter(log => log.success).length;
            console.log(`✅ Migration completed: ${successCount}/${migrationLog.length} credentials migrated`);
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    },

    // =================== ELABFTW INTEGRATION - FIXED ===================

    // Test elabFTW connection
    async testElabFTWConnection() {
        const serverUrl = await this.get('elabftw.server_url');
        const apiKey = await this.get('elabftw.api_key');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'Server URL and API key are required' };
        }

        const formattedUrl = await this.getFormattedElabFTWUrl();

        try {
            const response = await fetch(`${formattedUrl}api/v2/users/me`, {
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    message: `Connected successfully as ${data.fullname || 'Unknown User'}` 
                };
            } else {
                return { 
                    success: false, 
                    message: `Connection failed: ${response.status} ${response.statusText}` 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                message: `Connection error: ${error.message}` 
            };
        }
    },

    // (All existing elabFTW methods remain exactly the same...)
    // ... (continuing with all existing elabFTW integration code)

    // =================== UTILITY METHODS ===================

    getSecurityStatus() {
        if (!window.secureStorage) {
            return {
                available: false,
                status: 'not_available',
                message: 'Secure storage module not loaded'
            };
        }

        const storageStatus = window.secureStorage.getStatus();
        const encryptedCount = Object.keys(this.secureCredentials).length;
        const plaintextCount = this.sensitiveKeys.filter(key => 
            this.settings[key] && typeof this.settings[key] === 'string'
        ).length;

        return {
            available: storageStatus.initialized,
            method: storageStatus.bestMethod,
            capabilities: storageStatus.capabilities,
            encryptedCredentials: encryptedCount,
            plaintextCredentials: plaintextCount,
            migrationCompleted: this.migrationStatus.completed,
            status: plaintextCount > 0 ? 'needs_migration' : 'secure'
        };
    },

    applyInitialSettings() {
        const theme = this.settings['general.theme'];
        if (theme) {
            this.applyTheme(theme);
        }
    },

	// FIXED handleSettingChange method for settingsManager.js
	
	handleSettingChange(key, value) {
		console.log(`🔧 handleSettingChange called: ${key} = ${value}`);
		
		switch (key) {
			case 'general.user_management_enabled':
				// ASYNC SAFE: Don't call the handler immediately, defer it
				console.log('🔧 Deferring user management toggle...');
				setTimeout(async () => {
					try {
						await this.handleUserManagementToggle(value);
					} catch (error) {
						console.error('❌ Deferred user management toggle failed:', error);
					}
				}, 100);
				break;
				
			case 'general.theme':
				this.applyTheme(value);
				break;
				
			case 'elabftw.enabled':
			case 'elabftw.auto_sync':
				if (window.updateElabFTWOptions) {
					setTimeout(() => window.updateElabFTWOptions(), 50);
				}
				break;
				
			case 'omero.enabled':
			case 'omero.auto_sync':
				if (window.updateOMEROOptions) {
					setTimeout(() => window.updateOMEROOptions(), 50);
				}
				break;
				
			default:
				console.log(`🔧 No special handling for setting: ${key}`);
		}
	},

	// ENHANCED: Immediate user management toggle with user selection  
	async handleUserManagementToggle(enabled) {
		console.log(`👥 User management ${enabled ? 'enabled' : 'disabled'}`);
		
		if (enabled) {
			// User management was just enabled
			console.log('🚀 User management activated - showing user selection...');
			
			if (window.userManager && window.loginModal) {
				try {
					// Show user selection dialog immediately
					const userInfo = await window.userManager.showUserSelection();
					
					if (userInfo) {
						console.log('✅ User selected via immediate activation:', userInfo);
						
						// Show success message
						if (window.app && window.app.showSuccess) {
							window.app.showSuccess(`User management activated! Current user: ${userInfo.username} (${userInfo.groupname})`);
						}
					} else {
						console.log('❌ User selection cancelled - disabling user management');
						
						// User cancelled - disable user management again
						await this.set('general.user_management_enabled', false);
						
						if (window.app && window.app.showError) {
							window.app.showError('User management cancelled. Staying in simple mode.');
						}
					}
				} catch (error) {
					console.error('❌ Error activating user management:', error);
					
					// Error occurred - disable user management again
					await this.set('general.user_management_enabled', false);
					
					if (window.app && window.app.showError) {
						window.app.showError('Error activating user management: ' + error.message);
					}
				}
			} else {
				console.warn('⚠️ userManager or loginModal not available');
				if (window.app && window.app.showError) {
					window.app.showError('User management modules not available');
				}
			}
		} else {
			// User management was disabled
			console.log('📝 User management deactivated - switching to simple mode');
			
			if (window.userManager) {
				// Switch to simple mode
				window.userManager.initSimpleMode();
				
				// Reinitialize templates for simple mode
				if (window.templateManager && window.templateManager.init) {
					window.templateManager.init();
				}
				
				if (window.app && window.app.showSuccess) {
					window.app.showSuccess('Switched to simple mode (no user management)');
				}
			}
		}
	},

    applyTheme(theme) {
        console.log('🎨 Theme changed to:', theme);
    },

    reset() {
        console.log('🔄 Resetting settings to defaults...');
        
        if (Object.keys(this.secureCredentials).length > 0) {
            if (confirm('This will also remove all encrypted credentials. Continue?')) {
                this.secureCredentials = {};
                this.saveSecureCredentials();
            } else {
                return;
            }
        }
        
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        this.applyInitialSettings();
    },

    export() {
        const securityStatus = this.getSecurityStatus();
        const templateStats = this.getTemplateStatistics();
        
        return {
            settings: this.settings,
            securityStatus: securityStatus,
            migrationStatus: this.migrationStatus,
            templateStatistics: templateStats,
            hasEncryptedCredentials: Object.keys(this.secureCredentials).length > 0,
            exportTimestamp: new Date().toISOString(),
            warning: 'This export does not contain encrypted credentials for security reasons'
        };
    },

    import(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            this.settings = { ...this.defaultSettings, ...imported.settings || imported };
            const saved = this.saveSettings();
            
            if (saved) {
                this.applyInitialSettings();
            }
            
            return saved;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    },

    // Enhanced isUserManagementEnabled function
	isUserManagementEnabled() {
		// Synchronous check for backward compatibility
		if (!this.settings) return false;
		return this.settings['general.user_management_enabled'] === true;
	},
};

// Make globally available
window.settingsManager = settingsManager;
console.log('✅ settingsManager loaded - ENHANCED with Bulk Template Operations');