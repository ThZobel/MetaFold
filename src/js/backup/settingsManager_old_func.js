// Settings Manager - Complete Clean Version with elabFTW Fix

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

    // Create elabFTW experiment - FIXED
    async createElabFTWExperiment(projectName, metadata, structure = '') {
        const serverUrl = await this.getFormattedElabFTWUrl();
        const apiKey = await this.get('elabftw.api_key');
        const categoryId = await this.get('elabftw.default_category');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'elabFTW not configured' };
        }

        try {
            console.log('🧪 FIXED: Creating new elabFTW experiment');
            
            const experimentData = {
                title: projectName,
                body: this.generateExperimentBody(projectName, metadata, structure)
            };

            if (categoryId && categoryId !== '') {
                experimentData.category_id = parseInt(categoryId);
            }

            const response = await fetch(`${serverUrl}api/v2/experiments`, {
                method: 'POST',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(experimentData)
            });

            if (response.ok || response.status === 201) {
                const location = response.headers.get('location');
                const experimentId = location ? location.split('/').pop() : null;
                
                console.log('🧪 FIXED: Experiment created with ID:', experimentId);
                
                // Add metadata using the FIXED merge logic
                if (metadata && Object.keys(metadata).length > 0 && experimentId) {
                    console.log('🧪 FIXED: Adding metadata using merge logic');
                    await this.updateExperimentWithMetadata(serverUrl, apiKey, experimentId, metadata);
                }
                
                return {
                    success: true,
                    message: 'Experiment created in elabFTW successfully!',
                    id: experimentId,
                    url: `${serverUrl}experiments.php?mode=view&id=${experimentId}`,
                    metadataFields: metadata ? Object.keys(metadata).length : 0
                };
            } else {
                const errorText = await response.text();
                throw new Error(`elabFTW API error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ FIXED: Error in createElabFTWExperiment:', error);
            return {
                success: false,
                message: `Error creating elabFTW experiment: ${error.message}`
            };
        }
    },



	// Update existing elabFTW experiment - ENHANCED with Conflict Resolution
	async updateExistingElabFTWExperiment(experimentId, metadata) {
		const serverUrl = await this.getFormattedElabFTWUrl();
		const apiKey = await this.get('elabftw.api_key');
		
		if (!serverUrl || !apiKey) {
			return { success: false, message: 'elabFTW not configured' };
		}

		try {
			console.log('🧪 ENHANCED: Starting GET-MERGE-PATCH workflow with conflict resolution for experiment', experimentId);
			
			// STEP 1: GET existing experiment to load current metadata
			const getResponse = await fetch(`${serverUrl}api/v2/experiments/${experimentId}`, {
				headers: {
					'Authorization': apiKey,
					'Content-Type': 'application/json'
				}
			});

			if (!getResponse.ok) {
				throw new Error(`Failed to fetch existing experiment: ${getResponse.status} ${getResponse.statusText}`);
			}

			const existingExperiment = await getResponse.json();
			console.log('🧪 ENHANCED: Successfully loaded existing experiment data');
			
			// STEP 2: Parse existing metadata
			let existingMetadata = {
				elabftw: {
					display_main_text: true
				},
				extra_fields: {}
			};
			
			try {
				if (existingExperiment.metadata) {
					let parsedMetadata;
					
					if (typeof existingExperiment.metadata === 'string') {
						parsedMetadata = JSON.parse(existingExperiment.metadata);
					} else if (typeof existingExperiment.metadata === 'object') {
						parsedMetadata = existingExperiment.metadata;
					} else {
						parsedMetadata = {};
					}
					
					if (parsedMetadata.elabftw) {
						existingMetadata.elabftw = { 
							display_main_text: true, 
							...parsedMetadata.elabftw 
						};
					}
					
					if (parsedMetadata.extra_fields && typeof parsedMetadata.extra_fields === 'object') {
						existingMetadata.extra_fields = { ...parsedMetadata.extra_fields };
					}
					
					const existingFieldNames = Object.keys(existingMetadata.extra_fields);
					console.log('🧪 ENHANCED: Existing extra_fields:', existingFieldNames.length, 'fields');
					console.log('🧪 ENHANCED: Existing field names:', existingFieldNames);
					
				} else {
					console.log('🧪 ENHANCED: No existing metadata found, starting fresh');
				}
			} catch (parseError) {
				console.warn('🧪 ENHANCED: Could not parse existing metadata, starting fresh:', parseError);
				existingMetadata = {
					elabftw: { display_main_text: true },
					extra_fields: {}
				};
			}

			// STEP 3: Convert new MetaFold metadata to elabFTW format
			const newElabftwFields = this.convertMetadataToElabFTW(metadata);
			const newFieldNames = Object.keys(newElabftwFields);
			console.log('🧪 ENHANCED: New metadata fields to add:', newFieldNames.length, 'fields');
			console.log('🧪 ENHANCED: New field names:', newFieldNames);

			// STEP 4: ENHANCED CONFLICT RESOLUTION
			const { mergedFields, conflictLog } = await this.resolveFieldConflicts(
				existingMetadata.extra_fields, 
				newElabftwFields
			);

			// STEP 5: Create final merged metadata
			const mergedMetadata = {
				elabftw: {
					display_main_text: true,
					...existingMetadata.elabftw
				},
				extra_fields: mergedFields
			};

			// Preserve groups if they exist
			if (existingMetadata.elabftw && existingMetadata.elabftw.extra_fields_groups) {
				mergedMetadata.elabftw.extra_fields_groups = existingMetadata.elabftw.extra_fields_groups;
			}

			// ENHANCED DEBUG: Show conflict resolution results
			const existingFieldCount = Object.keys(existingMetadata.extra_fields).length;
			const newFieldCount = Object.keys(newElabftwFields).length;
			const totalFieldCount = Object.keys(mergedFields).length;
			
			console.log('🧪 ENHANCED: Conflict resolution results:');
			console.log('  - Existing fields:', existingFieldCount, Object.keys(existingMetadata.extra_fields));
			console.log('  - New fields:', newFieldCount, Object.keys(newElabftwFields));
			console.log('  - Final merged fields:', totalFieldCount, Object.keys(mergedFields));
			console.log('  - Conflicts resolved:', conflictLog.length);
			
			if (conflictLog.length > 0) {
				console.log('🧪 ENHANCED: Conflict details:');
				conflictLog.forEach(conflict => {
					console.log(`    - ${conflict.action}: "${conflict.originalName}" → "${conflict.finalName}"`);
				});
			}

			// STEP 6: PATCH with merged metadata
			const updateData = {
				metadata: JSON.stringify(mergedMetadata)
			};

			console.log('🧪 ENHANCED: Sending PATCH with conflict-resolved metadata...');
			
			const patchResponse = await fetch(`${serverUrl}api/v2/experiments/${experimentId}`, {
				method: 'PATCH',
				headers: {
					'Authorization': apiKey,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (patchResponse.ok) {
				const experimentUrl = `${serverUrl}experiments.php?mode=view&id=${experimentId}`;
				
				console.log('✅ ENHANCED: Successfully updated experiment with conflict-resolved metadata');
				console.log('🔗 ENHANCED: View experiment at:', experimentUrl);
				
				return {
					success: true,
					message: `Experiment ${experimentId} updated in elabFTW (${newFieldCount} new fields, ${conflictLog.length} conflicts resolved)`,
					id: experimentId,
					url: experimentUrl,
					mergeInfo: {
						existingFields: existingFieldCount,
						newFields: newFieldCount,
						totalFields: totalFieldCount,
						conflictsResolved: conflictLog.length,
						preservedFields: Object.keys(existingMetadata.extra_fields),
						addedFields: Object.keys(newElabftwFields),
						finalFields: Object.keys(mergedFields),
						conflictLog: conflictLog
					}
				};
			} else {
				const errorText = await patchResponse.text();
				console.error('❌ ENHANCED: PATCH failed:', patchResponse.status, errorText);
				throw new Error(`PATCH failed: ${patchResponse.status} - ${errorText}`);
			}

		} catch (error) {
			console.error('❌ ENHANCED: Error in updateExistingElabFTWExperiment:', error);
			return {
				success: false,
				message: `Error updating elabFTW experiment: ${error.message}`
			};
		}
	},

	// NEW METHOD: Resolve field conflicts based on user settings
	async resolveFieldConflicts(existingFields, newFields) {
		const overwriteEnabled = await this.get('elabftw.overwrite_enabled');
		const versioningFormat = await this.get('elabftw.versioning_format');
		
		console.log('🧪 CONFLICT: Resolving conflicts with settings:', {
			overwriteEnabled: overwriteEnabled,
			versioningFormat: versioningFormat
		});
		
		const mergedFields = { ...existingFields }; // Start with existing fields
		const conflictLog = [];
		
		for (const [newFieldName, newFieldData] of Object.entries(newFields)) {
			if (existingFields.hasOwnProperty(newFieldName)) {
				// CONFLICT DETECTED!
				console.log(`🧪 CONFLICT: Field "${newFieldName}" already exists`);
				
				if (overwriteEnabled) {
					// OVERWRITE MODE: Replace existing field
					mergedFields[newFieldName] = newFieldData;
					conflictLog.push({
						action: 'OVERWRITE',
						originalName: newFieldName,
						finalName: newFieldName,
						reason: 'Overwrite mode enabled'
					});
					console.log(`🧪 CONFLICT: OVERWRITE "${newFieldName}"`);
					
				} else {
					// VERSIONING MODE: Create versioned field name
					const versionedName = this.generateVersionedFieldName(newFieldName, existingFields, versioningFormat);
					mergedFields[versionedName] = newFieldData;
					conflictLog.push({
						action: 'VERSION',
						originalName: newFieldName,
						finalName: versionedName,
						reason: `Versioning mode (${versioningFormat})`
					});
					console.log(`🧪 CONFLICT: VERSION "${newFieldName}" → "${versionedName}"`);
				}
			} else {
				// NO CONFLICT: Add new field directly
				mergedFields[newFieldName] = newFieldData;
				console.log(`🧪 CONFLICT: ADD "${newFieldName}" (no conflict)`);
			}
		}
		
		return { mergedFields, conflictLog };
	},

	// NEW METHOD: Generate versioned field names
	generateVersionedFieldName(originalName, existingFields, versioningFormat) {
		const now = new Date();
		let versionedName;
		
		switch (versioningFormat) {
			case 'timestamp':
				const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
				versionedName = `${originalName}_${timestamp}`;
				break;
				
			case 'date':
				const date = now.toISOString().split('T')[0];
				versionedName = `${originalName}_${date}`;
				break;
				
			case 'counter':
				let counter = 2;
				versionedName = `${originalName}_v${counter}`;
				while (existingFields.hasOwnProperty(versionedName)) {
					counter++;
					versionedName = `${originalName}_v${counter}`;
				}
				break;
				
			default:
				// Fallback to date format
				const fallbackDate = now.toISOString().split('T')[0];
				versionedName = `${originalName}_${fallbackDate}`;
		}
		
		// Ensure the versioned name is unique (safety check)
		let finalName = versionedName;
		let safetyCounter = 1;
		while (existingFields.hasOwnProperty(finalName) && safetyCounter < 100) {
			finalName = `${versionedName}_${safetyCounter}`;
			safetyCounter++;
		}
		return finalName;
	},
	
	
    // Update experiment with metadata using PATCH - FIXED
    async updateExperimentWithMetadata(serverUrl, apiKey, experimentId, metadata) {
        try {
            console.log('🧪 FIXED: updateExperimentWithMetadata using merge logic');
            
            // Use the same GET-MERGE-PATCH logic for consistency
            const result = await this.updateExistingElabFTWExperiment(experimentId, metadata);
            
            if (result.success) {
                console.log('✅ FIXED: Metadata successfully merged into experiment');
                return true;
            } else {
                console.error('❌ FIXED: Failed to merge metadata into experiment:', result.message);
                return false;
            }
            
        } catch (error) {
            console.error('❌ FIXED: Error in updateExperimentWithMetadata:', error);
            return false;
        }
    },

    // =================== ELABFTW HELPER METHODS ===================

    // Get formatted elabFTW URL
    async getFormattedElabFTWUrl() {
        const serverUrl = await this.get('elabftw.server_url');
        if (!serverUrl) return null;

        let formattedUrl = serverUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        if (!formattedUrl.endsWith('/')) {
            formattedUrl += '/';
        }
        return formattedUrl;
    },

    // Convert MetaFold metadata to elabFTW format - FIXED NULL CHECK
	convertMetadataToElabFTW(metadata) {
		console.log('🔧 convertMetadataToElabFTW called with:', typeof metadata, metadata);
		
		const elabftwFields = {};
		
		// ✅ FIX: Add null/undefined check
		if (!metadata || typeof metadata !== 'object') {
			console.warn('⚠️ convertMetadataToElabFTW: Invalid metadata provided:', metadata);
			return elabftwFields; // Return empty object
		}
		
		// ✅ FIX: Add check for empty object
		if (Object.keys(metadata).length === 0) {
			console.warn('⚠️ convertMetadataToElabFTW: Empty metadata object provided');
			return elabftwFields;
		}
		
		try {
			Object.entries(metadata).forEach(([key, fieldInfo]) => {
				// Skip if fieldInfo is not valid
				if (!fieldInfo || typeof fieldInfo !== 'object') {
					console.warn(`⚠️ Skipping invalid field: ${key}`, fieldInfo);
					return;
				}
				
				// Skip group headers
				if (fieldInfo.type === 'group') return;

				const elabField = {
					type: this.mapFieldTypeToElabFTW(fieldInfo.type),
					value: this.formatValueForElabFTW(fieldInfo.value, fieldInfo.type)
				};

				if (fieldInfo.description) {
					elabField.description = fieldInfo.description;
				}

				if (fieldInfo.required) {
					elabField.required = true;
				}

				if (fieldInfo.type === 'textarea') {
					elabField.multiline = true;
				}

				if (fieldInfo.type === 'dropdown' && fieldInfo.options) {
					elabField.options = fieldInfo.options.map(opt => String(opt));
				}

				if (fieldInfo.type === 'number') {
					if (fieldInfo.min !== undefined) elabField.min = fieldInfo.min;
					if (fieldInfo.max !== undefined) elabField.max = fieldInfo.max;
				}

				const fieldKey = fieldInfo.label || key;
				elabftwFields[fieldKey] = elabField;
			});
			
			console.log('✅ convertMetadataToElabFTW: Successfully converted', Object.keys(elabftwFields).length, 'fields');
			
		} catch (error) {
			console.error('❌ convertMetadataToElabFTW: Error processing metadata:', error);
			console.error('❌ Original metadata:', metadata);
		}

		return elabftwFields;
	},

    // Map field types to elabFTW types
    mapFieldTypeToElabFTW(type) {
        const typeMap = {
            'text': 'text',
            'number': 'number',
            'date': 'date',
            'textarea': 'text',
            'dropdown': 'select',
            'checkbox': 'checkbox'
        };
        
        return typeMap[type] || 'text';
    },

    // Format values for elabFTW
    formatValueForElabFTW(value, type) {
        switch (type) {
            case 'checkbox':
                return (value === true || value === 'true' || value === 'on') ? "on" : "";
            case 'number':
                return String(value !== undefined && value !== null && value !== '' ? value : 0);
            case 'dropdown':
                return String(value || '');
            default:
                return String(value || '');
        }
    },

    // Generate experiment body for elabFTW
    generateExperimentBody(projectName, metadata, structure = '') {
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let body = `<h1>${projectName}</h1>\n\n`;
        body += `<p><strong>Created:</strong> ${date}</p>\n\n`;
        
        if (metadata && Object.keys(metadata).length > 0) {
            body += `<h2>Experiment Metadata</h2>\n<ul>\n`;
            
            Object.entries(metadata).forEach(([key, fieldInfo]) => {
                if (fieldInfo.type !== 'group') {
                    const value = fieldInfo.value || 'Not filled';
                    const label = fieldInfo.label || key;
                    
                    if (fieldInfo.type === 'checkbox') {
                        const checkValue = (value === true || value === 'true' || value === 'on') ? '✅ Yes' : '❌ No';
                        body += `<li><strong>${label}:</strong> ${checkValue}</li>\n`;
                    } else {
                        body += `<li><strong>${label}:</strong> ${value}</li>\n`;
                    }
                }
            });
            
            body += `</ul>\n\n`;
        }
        
        if (structure && structure.trim() !== '') {
            body += `<h2>Project Structure</h2>\n<pre>${structure}</pre>\n\n`;
        }
        
        body += `<h2>Description</h2>\n<p><em>Add your project description here...</em></p>\n\n`;
        body += `<h2>Methodology</h2>\n<p><em>Describe your methodology here...</em></p>\n\n`;
        body += `<h2>Results</h2>\n<p><em>Document your results here...</em></p>\n\n`;
        body += `<h2>Notes</h2>\n<p><em>Add any additional notes here...</em></p>\n`;
        
        return body;
    },

    // =================== OMERO INTEGRATION ===================

    async testOMEROConnection() {
        if (!window.omeroUIIntegration) {
            return { success: false, message: 'OMERO UI integration module not available' };
        }
        
        try {
            return await window.omeroUIIntegration.testConnection();
        } catch (error) {
            return { 
                success: false, 
                message: `OMERO connection test failed: ${error.message}` 
            };
        }
    },

    async createOMERODataset(projectName, metadata, options = {}) {
        if (!window.metaFoldOMEROIntegration) {
            return { success: false, message: 'MetaFold OMERO integration module not available' };
        }
        
        try {
            console.log('🔬 settingsManager: Delegating to metaFoldOMEROIntegration.createDatasetForMetaFoldProject');
            return await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject(projectName, metadata, options);
        } catch (error) {
            console.error('❌ settingsManager: Error in createOMERODataset:', error);
            return {
                success: false,
                message: `Error creating OMERO dataset: ${error.message}`
            };
        }
    },

    // =================== SECURITY & UTILITY METHODS ===================

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

    handleUserManagementToggle(enabled) {
        console.log(`👥 User management ${enabled ? 'enabled' : 'disabled'}`);
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
        
        return {
            settings: this.settings,
            securityStatus: securityStatus,
            migrationStatus: this.migrationStatus,
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
console.log('✅ settingsManager loaded - CLEAN VERSION with elabFTW FIXES');