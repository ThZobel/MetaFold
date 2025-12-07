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

    // Sensitive keys that should be encrypted
    sensitiveKeys: [
        'elabftw.api_key',
        'omero.password',
        'rspace.api_key'
    ],

    // Default settings
    defaultSettings: {
        'general.theme': 'light',
        'general.auto_save': true,
        'general.show_tips': true,
        'general.user_management_enabled': true,
        'security.password_system_enabled': false,
        'security.auto_migrate': true,
        'elabftw.enabled': false,
        'elabftw.server_url': '',
        'elabftw.api_key': '',
        'elabftw.auto_sync': false,
        'elabftw.default_category': '',
        'elabftw.verify_ssl': true,
        'elabftw.overwrite_enabled': false,
        'elabftw.versioning_format': 'date',
        'omero.enabled': false,
        'omero.server_url': '',
        'omero.username': '',
        'omero.password': '',
        'omero.default_project_id': '',
        'omero.create_datasets': true,
        'omero.verify_ssl': true,
        'omero.auto_sync': false,
        'omero.use_json_triplets': false,
        'rspace.enabled': false,
        'rspace.server_url': '',
        'rspace.api_key': '',
        'templates.active_category': 'category1',
        'templates.category1_name': 'Main-Project',
        'templates.category1_icon': '🎯',
        'templates.category1_color': '#8b5cf6',
        'templates.category2_name': 'Sub-Project',
        'templates.category2_icon': '📊',
        'templates.category2_color': '#06b6d4',
        'templates.category3_name': 'Action',
        'templates.category3_icon': '⚡',
        'templates.category3_color': '#10b981',
        'templates.category4_name': 'Misc',
        'templates.category4_icon': '📋',
        'templates.category4_color': '#f59e0b'
    },

    // 🔐 NEW: Temporary in-memory password cache (NEVER stored in localStorage!)
    _temporaryPasswordCache: {
        username: null,
        password: null,
        timestamp: null,
        maxAge: 30 * 60 * 1000 // 30 minutes
    },

    /**
     * 🔐 Set current user's password for entropy generation (temporary, in-memory only)
     * @param {string} username - Username
     * @param {string} password - Password (NEVER stored in localStorage!)
     */
    setUserPasswordForEntropy(username, password) {
        this._temporaryPasswordCache = {
            username: username,
            password: password,
            timestamp: Date.now()
        };
        console.log('🔐 User password cached for entropy (in memory only)');
    },

    /**
     * 🔐 Get cached user password (if still valid)
     * @param {string} username - Username to verify
     * @returns {string|null} - Password or null if expired/invalid
     */
    getUserPasswordForEntropy(username) {
        const cache = this._temporaryPasswordCache;

        if (!cache.username || !cache.password || !cache.timestamp) {
            return null;
        }

        if (cache.username !== username) {
            return null;
        }

        const age = Date.now() - cache.timestamp;
        if (age > cache.maxAge) {
            console.warn('🔐 Cached password expired, clearing cache');
            this.clearPasswordCache();
            return null;
        }

        return cache.password;
    },

    /**
     * 🔐 Clear password cache
     */
    clearPasswordCache() {
        this._temporaryPasswordCache = {
            username: null,
            password: null,
            timestamp: null,
            maxAge: 30 * 60 * 1000
        };
        console.log('🔐 Password cache cleared');
    },

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
        if (this.loadSecureCredentials) {
            await this.loadSecureCredentials();
        }

        // Apply initial settings
        this.applyInitialSettings();

        console.log('✅ settingsManager initialized with secure storage support');
        window.dispatchEvent(new Event('settingsLoaded'));
    },

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
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    migrateGlobalSettingsToUser() {
        try {
            const globalSettings = localStorage.getItem('metafold_settings');
            if (globalSettings && window.storage) {
                const userKey = window.storage.getStorageKey('settings');
                const userSettings = localStorage.getItem(userKey);

                // Only migrate if user doesn't have settings yet
                if (!userSettings) {
                    localStorage.setItem(userKey, globalSettings);
                    console.log('📦 Global settings migrated to user-specific');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.warn('Could not migrate global settings:', error);
            return false;
        }
    },

    async initUserSpecific() {
        console.log('🔧 Initializing settingsManager with user-specific support...');

        // Wait for dependencies
        let attempts = 0;
        while ((!window.storage || !window.userManager) && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.storage) {
            console.warn('⚠️ Storage system not available - falling back to global settings');
            this.loadSettings(); // Use original function
            this.applyInitialSettings();
            return;
        }

        // ===== CRITICAL FIX: Clear existing settings before loading =====
        // Problem: Settings könnten bereits global geladen sein von init()
        // Lösung: Settings-Object leeren und neu laden
        console.log('🔄 Clearing existing settings before user-specific load...');
        this.settings = {};

        // Load user-specific settings (now from clean slate)
        this.loadSettingsUserSpecific();
        // Load secure credentials
        if (this.loadSecureCredentials) {
            await this.loadSecureCredentials();
        }

        // Apply initial settings
        this.applyInitialSettings();

        console.log('✅ settingsManager initialized with user-specific support');
        window.dispatchEvent(new Event('settingsLoaded'));
    },

    applyInitialSettings() {
        // Apply active category if exists
        if (this.settings['templates.category']) {
            console.log('🔄 Applying initial category:', this.settings['templates.category']);
            if (window.templateTypeManager) {
                // Small delay to ensure UI is ready
                setTimeout(() => {
                    window.templateTypeManager.switchType(this.settings['templates.category']);
                }, 500);
            }
        }
    },

    async get(key) {
        // Check if this is a sensitive key that should be retrieved securely
        if (this.sensitiveKeys.includes(key)) {
            return await this.getSecureCredential(key);
        }

        // Regular setting retrieval
        const value = this.settings[key] !== undefined ? this.settings[key] : this.defaultSettings[key];

        // Debug log für wichtige Keys
        if (key.startsWith('templates.category')) {
            const storageKey = window.storage ? window.storage.getStorageKey('settings') : 'metafold_settings';
            console.log(`🔍 Get ${key}: "${value}" (from ${storageKey})`);
        }

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

        // ===== CRITICAL FIX: Check if userManager is ACTIVE, not just enabled =====
        // Problem: isUserManagementEnabled() liest aus settings, die noch global sein könnten
        // Lösung: Prüfe ob userManager existiert UND initialisiert ist

        const isUserManagerActive = window.userManager &&
            window.userManager.isInitialized &&
            window.storage &&
            typeof window.storage.getStorageKey === 'function';

        const saved = isUserManagerActive ?
            this.saveSettingsUserSpecific() :  // User-spezifisch wenn userManager aktiv
            this.saveSettings();               // Global als Fallback

        console.log(`💾 Saved using ${isUserManagerActive ? 'user-specific' : 'global'} method`);
        console.log(`   UserManager active: ${!!isUserManagerActive}`);
        console.log(`   Storage key: ${isUserManagerActive && window.storage ? window.storage.getStorageKey('settings') : 'metafold_settings'}`);

        if (saved) {
            this.handleSettingChange(key, value);
        }

        return saved;
    },

    async loadSecureCredentials() {
        try {
            const storageKey = window.storage ?
                window.storage.getStorageKey('secure_credentials') :
                'metafold_secure_credentials';

            console.log('🔐 📂 Loading secure credentials from:', storageKey);

            const storedCredentials = localStorage.getItem(storageKey);

            if (storedCredentials) {
                this.secureCredentials = JSON.parse(storedCredentials);
                console.log('✅ Loaded secure credentials store');
                console.log('🔐 Storage key used:', storageKey);
                console.log('🔐 Keys loaded:', Object.keys(this.secureCredentials));
            } else {
                console.warn('⚠️ No secure credentials found in localStorage');
                console.warn('🔐 Searched in key:', storageKey);
                this.secureCredentials = {};
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

    loadSettingsUserSpecific() {
        if (!window.storage) return false;
        try {
            const userKey = window.storage.getStorageKey('settings');
            const stored = localStorage.getItem(userKey);
            if (stored) {
                this.settings = { ...this.defaultSettings, ...JSON.parse(stored) };
                console.log(`📂 User settings loaded from ${userKey}`);
            } else {
                // Try migration
                if (this.migrateGlobalSettingsToUser && this.migrateGlobalSettingsToUser()) {
                    // Migration successful, settings are now in userKey (via migrate function)
                    // But we need to reload them into this.settings
                    const migrated = localStorage.getItem(userKey);
                    this.settings = { ...this.defaultSettings, ...JSON.parse(migrated) };
                } else {
                    this.settings = { ...this.defaultSettings };
                }
            }
            return true;
        } catch (error) {
            console.warn('Error loading user settings:', error);
            return false;
        }
    },

    saveSettingsUserSpecific() {
        if (!window.storage) return false;
        try {
            const userKey = window.storage.getStorageKey('settings');
            localStorage.setItem(userKey, JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('Error saving user settings:', error);
            return false;
        }
    },

    /**
     * Save current category settings as group standard
     * @param {string} groupname - Group name
     * @returns {Promise<boolean>} - Success status
     */
    async saveAsGroupStandard(groupname) {
        try {
            // Extract current category settings
            const categorySettings = {};

            const categoryKeys = [
                'templates.category1_name', 'templates.category1_icon', 'templates.category1_color',
                'templates.category2_name', 'templates.category2_icon', 'templates.category2_color',
                'templates.category3_name', 'templates.category3_icon', 'templates.category3_color',
                'templates.category4_name', 'templates.category4_icon', 'templates.category4_color',
                'templates.active_category'
            ];

            for (const key of categoryKeys) {
                categorySettings[key] = await this.get(key);
            }

            // Save to group storage
            const groupSettingsKey = `metafold_group_${groupname}_category_settings`;
            localStorage.setItem(groupSettingsKey, JSON.stringify(categorySettings));

            console.log(`✅ Category settings saved as group standard for: ${groupname}`);

            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(`Category settings saved as standard for group "${groupname}"`);
            }
            return true;
        } catch (error) {
            console.error('Error saving group standard settings:', error);
            return false;
        }
    },

    /**
     * Load group standard category settings
     * @param {string} groupname - Group name
     * @returns {Object|null} - Category settings or null if not found
     */
    loadGroupCategorySettings(groupname) {
        try {
            const groupSettingsKey = `metafold_group_${groupname}_category_settings`;
            const stored = localStorage.getItem(groupSettingsKey);
            if (stored) {
                return JSON.parse(stored);
            }
            return null;
        } catch (error) {
            console.error('Error loading group category settings:', error);
            return null;
        }
    },

    /**
     * Check if current settings differ from group standard
     * @param {string} groupname - Group name
     * @returns {boolean} - True if custom settings exist
     */
    hasCustomCategorySettings(groupname) {
        const groupSettings = this.loadGroupCategorySettings(groupname);
        if (!groupSettings) return false;

        // Compare current settings with group settings
        for (const [key, value] of Object.entries(groupSettings)) {
            // We compare with internal settings object directly for speed
            // Note: This assumes settings are loaded
            if (this.settings[key] !== value) {
                return true;
            }
        }
        return false;
    },

    /**
     * Apply group standard settings to current user
     * @param {string} groupname - Group name
     * @returns {Promise<boolean>} - Success status
     */
    async applyGroupCategorySettings(groupname) {
        const groupSettings = this.loadGroupCategorySettings(groupname);
        if (!groupSettings) return false;

        try {
            console.log(`⬇️ Applying group standard settings for ${groupname}...`);

            for (const [key, value] of Object.entries(groupSettings)) {
                await this.set(key, value);
            }

            console.log('✅ Group standard settings applied');
            return true;
        } catch (error) {
            console.error('Error applying group standard settings:', error);
            return false;
        }
    },

    async migrateSecureCredentials() {
        try {
            console.log('🔐 Migrating plaintext credentials to secure storage...');

            const plaintextCredentials = {};
            for (const key of this.sensitiveKeys) {
                if (this.settings[key]) {
                    plaintextCredentials[key] = this.settings[key];
                }
            }

            if (Object.keys(plaintextCredentials).length === 0) {
                console.log('✅ No plaintext credentials found to migrate');
                return;
            }

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

    // Create elabFTW experiment
    async createElabFTWExperiment(projectName, metadata, structure = '', specificCategoryId = null) {
        const serverUrl = await this.getFormattedElabFTWUrl();
        const apiKey = await this.get('elabftw.api_key');

        // Use specific category if provided, otherwise default
        let categoryId = specificCategoryId;
        if (!categoryId) {
            categoryId = await this.get('elabftw.default_category');
        }

        if (!serverUrl) {
            return { success: false, message: 'elabFTW Server URL not configured' };
        }
        if (!apiKey) {
            return { success: false, message: 'elabFTW API Key not configured' };
        }

        try {
            console.log('🧪 FIXED: Creating new elabFTW experiment');

            const cleanTitle = String(projectName).trim();
            if (!cleanTitle) {
                throw new Error('Project name is empty or invalid');
            }

            const experimentData = {
                title: cleanTitle,
                body: this.generateExperimentBody(cleanTitle, metadata, structure)
            };

            if (categoryId && categoryId !== '' && !isNaN(parseInt(categoryId))) {
                experimentData.category_id = parseInt(categoryId);
            }

            console.log('🧪 elabFTW: Sending request with category_id:', experimentData.category_id || 'none');

            let response = await fetch(`${serverUrl}api/v2/experiments`, {
                method: 'POST',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(experimentData)
            });

            // RETRY LOGIC: If 403 Forbidden and we used a category, try again WITHOUT category
            if (response.status === 403 && experimentData.category_id) {
                console.warn(`⚠️ elabFTW: Access forbidden to category ${experimentData.category_id}. Retrying without category...`);

                delete experimentData.category_id;

                response = await fetch(`${serverUrl}api/v2/experiments`, {
                    method: 'POST',
                    headers: {
                        'Authorization': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(experimentData)
                });
            }

            if (response.ok || response.status === 201) {
                const location = response.headers.get('location');
                const experimentId = location ? location.split('/').pop() : null;

                console.log('🧪 FIXED: Experiment created with ID:', experimentId);

                // CRITICAL: Override title immediately after creation (in case template overwrote it)
                if (experimentId) {
                    try {
                        console.log('🧪 FIXED: Ensuring correct title via PATCH override');
                        const titleOverrideResponse = await fetch(`${serverUrl}api/v2/experiments/${experimentId}`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': apiKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                title: cleanTitle
                            })
                        });

                        if (titleOverrideResponse.ok) {
                            console.log('✅ FIXED: Title successfully set to:', cleanTitle);
                        } else {
                            console.warn('⚠️ FIXED: Title override response:', titleOverrideResponse.status);
                        }
                    } catch (titleError) {
                        console.warn('⚠️ FIXED: Title override failed:', titleError.message);
                        // Continue anyway - the experiment was created
                    }
                }

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

    // =================== OMERO PASSWORD SECURITY OPTIONS ===================

    /**
     * Get OMERO "Don't Save Password" setting
     * @returns {boolean} - True if password should NOT be saved
     */
    async getDontSaveOmeroPassword() {
        return await this.get('omero.dontSavePassword') || false;
    },

    /**
     * Set OMERO "Don't Save Password" setting
     * ✅ SECURITY FIX: Löscht DPAPI-Daten wenn aktiviert
     * @param {boolean} value - True to NOT save password
     * @returns {Promise<boolean>} - Success status
     */
    async setDontSaveOmeroPassword(value) {
        console.log(`🔐 SECURITY: Setting don't save OMERO password to: ${value}`);

        // ✅ KRITISCH: Wenn "Don't save" aktiviert wird, lösche alle OMERO-Credentials aus DPAPI
        if (value === true) {
            console.log('🔐 SECURITY: Don\'t save password enabled - removing OMERO credentials from DPAPI...');

            // Lösche OMERO Password aus DPAPI
            await this.setSecureCredential('omero.password', '');
            console.log('✅ OMERO password removed from DPAPI storage');

            // Lösche Username aus DPAPI (falls vorhanden)
            await this.setSecureCredential('omero.username', '');
            console.log('✅ OMERO username removed from DPAPI storage');

            console.log('✅ SECURITY: All OMERO credentials removed from encrypted storage');
        }

        return await this.set('omero.dontSavePassword', value);
    },

    async createOMERODataset(projectName, metadata, options = {}) {
        if (!window.metaFoldOMEROIntegration) {
            return { success: false, message: 'MetaFold OMERO integration module not available' };
        }

        try {
            console.log('🔬 settingsManager: Creating OMERO dataset with Phase 2 support...');

            // Check if enhanced method is available
            if (window.metaFoldOMEROIntegration.createDatasetForMetaFoldProjectEnhanced) {
                console.log('🔬 settingsManager: Using enhanced integration method');
                return await this.createOMERODatasetEnhanced(projectName, metadata, options);
            } else {
                console.log('🔬 settingsManager: Using standard integration method');
                return await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject(projectName, metadata, options);
            }

        } catch (error) {
            console.error('❌ settingsManager: Error in createOMERODataset:', error);
            return {
                success: false,
                message: `Error creating OMERO dataset: ${error.message}`,
                error: error.message
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

        // Dispatch global event
        window.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: { key, value }
        }));

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

        // Notify listeners about the change
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key, value } }));
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

    // NEUE FUNKTION: Prüfe ob userManager AKTIV ist (unabhängig vom Setting)
    isUserManagerActive() {
        return !!(window.userManager &&
            window.userManager.isInitialized &&
            window.storage &&
            typeof window.storage.getStorageKey === 'function');
    },

    // Phase 2: Get OMERO Export Options
    async getOMEROExportOptions() {
        try {
            const options = {
                useJsonTriplets: await this.get('omero.use_json_triplets'),
                useTemplateGroupsAsNamespaces: await this.get('omero.use_template_groups_as_namespaces'),
                integrationLinksAsKeyValue: await this.get('omero.integration_links_as_keyvalue')
            };

            console.log('🔬 Retrieved OMERO export options:', options);
            return options;

        } catch (error) {
            console.error('❌ Error getting OMERO export options:', error);
            // Return safe defaults
            return {
                useJsonTriplets: false,
                useTemplateGroupsAsNamespaces: true,
                integrationLinksAsKeyValue: true
            };
        }
    },

    // Enhanced OMERO dataset creation with Phase 2 support
    async createOMERODatasetEnhanced(projectName, metadata, options = {}) {
        if (!window.metaFoldOMEROIntegration) {
            return { success: false, message: 'MetaFold OMERO integration module not available' };
        }

        try {
            console.log('🔬 settingsManager: Using enhanced OMERO integration...');

            // Get export options and merge with provided options
            const exportOptions = await this.getOMEROExportOptions();
            const enhancedOptions = {
                ...options,
                ...exportOptions
            };

            console.log('🔬 settingsManager: Enhanced options:', enhancedOptions);

            // Use enhanced method if available
            if (window.metaFoldOMEROIntegration.createDatasetForMetaFoldProjectEnhanced) {
                return await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProjectEnhanced(projectName, metadata, enhancedOptions);
            } else {
                // Fallback to standard method
                console.warn('⚠️ Enhanced integration not available, using standard method');
                return await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject(projectName, metadata, enhancedOptions);
            }

        } catch (error) {
            console.error('❌ settingsManager: Error in enhanced OMERO dataset creation:', error);
            return {
                success: false,
                message: `Error creating enhanced OMERO dataset: ${error.message}`,
                error: error.message
            };
        }
    },
    // =================== PASSWORD SYSTEM SETTINGS MANAGEMENT ===================

    /**
     * Get password system configuration
     * @returns {Object} - Password system config
     */
    getPasswordSystemConfig() {
        return {
            enabled: this.get('security.password_system_enabled'),
            requireAdminPassword: this.get('security.require_admin_password'),
            passwordMinLength: this.get('security.password_min_length'),
            autoLogoutMinutes: this.get('security.auto_logout_minutes'),
            showPasswordStrength: this.get('security.show_password_strength'),
            allowPasswordReset: this.get('security.allow_password_reset')
        };
    },

    /**
     * Update password system configuration
     * @param {Object} config - New configuration
     * @returns {Promise<boolean>} - Success status
     */
    async updatePasswordSystemConfig(config) {
        try {
            const updates = {};

            if (config.enabled !== undefined) {
                updates['security.password_system_enabled'] = config.enabled;
            }
            if (config.requireAdminPassword !== undefined) {
                updates['security.require_admin_password'] = config.requireAdminPassword;
            }
            if (config.passwordMinLength !== undefined) {
                updates['security.password_min_length'] = Math.max(1, Math.min(50, config.passwordMinLength));
            }
            if (config.autoLogoutMinutes !== undefined) {
                updates['security.auto_logout_minutes'] = Math.max(0, Math.min(1440, config.autoLogoutMinutes));
            }
            if (config.showPasswordStrength !== undefined) {
                updates['security.show_password_strength'] = config.showPasswordStrength;
            }
            if (config.allowPasswordReset !== undefined) {
                updates['security.allow_password_reset'] = config.allowPasswordReset;
            }

            // Apply updates
            for (const [key, value] of Object.entries(updates)) {
                await this.set(key, value);
            }

            console.log('✅ Password system configuration updated');
            return true;

        } catch (error) {
            console.error('❌ Password system configuration update failed:', error);
            return false;
        }
    },

    /**
     * Reset password system to defaults
     * @returns {Promise<boolean>} - Success status
     */
    async resetPasswordSystemToDefaults() {
        const defaultConfig = {
            enabled: true,
            requireAdminPassword: true,
            passwordMinLength: 3,
            autoLogoutMinutes: 30,
            showPasswordStrength: true,
            allowPasswordReset: true
        };

        return await this.updatePasswordSystemConfig(defaultConfig);
    },

    /**
     * Check if password system settings are valid
     * @returns {Object} - Validation result
     */
    validatePasswordSystemSettings() {
        const config = this.getPasswordSystemConfig();
        const issues = [];

        if (config.passwordMinLength < 1 || config.passwordMinLength > 50) {
            issues.push('Password minimum length must be between 1 and 50 characters');
        }

        if (config.autoLogoutMinutes < 0 || config.autoLogoutMinutes > 1440) {
            issues.push('Auto-logout must be between 0 and 1440 minutes (24 hours)');
        }

        if (config.enabled && !window.secureStorage) {
            issues.push('Password system enabled but secure storage is not available');
        }

        return {
            valid: issues.length === 0,
            issues: issues,
            config: config
        };
    },

    // =================== INTEGRATION WITH EXISTING SETTINGS UI ===================

    /**
     * Get password system settings for UI rendering
     * @returns {Object} - Settings structure for UI
     */
    getPasswordSystemSettingsForUI() {
        const config = this.getPasswordSystemConfig();

        return {
            title: '🔐 Password System',
            description: 'Configure user password requirements and security settings',
            expanded: true,
            settings: [
                {
                    key: 'security.password_system_enabled',
                    label: 'Enable Password System',
                    type: 'toggle',
                    value: config.enabled,
                    description: 'Require passwords for user authentication',
                    requiresRestart: true
                },
                {
                    key: 'security.require_admin_password',
                    label: 'Admin Password Required',
                    type: 'toggle',
                    value: config.requireAdminPassword,
                    description: 'Require admin password for sensitive operations',
                    dependsOn: 'security.password_system_enabled'
                },
                {
                    key: 'security.password_min_length',
                    label: 'Minimum Password Length',
                    type: 'number',
                    value: config.passwordMinLength,
                    min: 1,
                    max: 50,
                    description: 'Minimum number of characters required for passwords',
                    dependsOn: 'security.password_system_enabled'
                },
                {
                    key: 'security.auto_logout_minutes',
                    label: 'Auto-Logout (minutes)',
                    type: 'number',
                    value: config.autoLogoutMinutes,
                    min: 0,
                    max: 1440,
                    description: 'Automatically logout users after inactivity (0 = disabled)',
                    dependsOn: 'security.password_system_enabled'
                },
                {
                    key: 'security.show_password_strength',
                    label: 'Show Password Strength',
                    type: 'toggle',
                    value: config.showPasswordStrength,
                    description: 'Display password strength indicator when setting passwords',
                    dependsOn: 'security.password_system_enabled'
                },
                {
                    key: 'security.allow_password_reset',
                    label: 'Allow Password Reset',
                    type: 'toggle',
                    value: config.allowPasswordReset,
                    description: 'Allow admin to reset user passwords',
                    dependsOn: 'security.password_system_enabled'
                }
            ],
            actions: [
                {
                    label: '👥 Manage Users',
                    action: 'openUserManagement',
                    type: 'secondary'
                },
                {
                    label: '🔄 Reset to Defaults',
                    action: 'resetPasswordSystemDefaults',
                    type: 'danger',
                    confirmMessage: 'Reset password system settings to defaults?'
                }
            ]
        };
    },

    /**
     * Handle password system setting actions
     * @param {string} action - Action to perform
     * @returns {Promise<boolean>} - Success status
     */
    async handlePasswordSystemAction(action) {
        try {
            switch (action) {
                case 'openUserManagement':
                    if (window.userManagementModal) {
                        if (window.userManagementModal.showWithPasswordSupport) {
                            window.userManagementModal.showWithPasswordSupport();
                        } else {
                            window.userManagementModal.show();
                        }
                        return true;
                    }
                    break;

                case 'resetPasswordSystemDefaults':
                    const success = await this.resetPasswordSystemToDefaults();
                    if (success && window.app?.showSuccess) {
                        window.app.showSuccess('Password system settings reset to defaults');
                    }
                    return success;

                default:
                    console.warn('Unknown password system action:', action);
                    return false;
            }
        } catch (error) {
            console.error('Password system action failed:', error);
            return false;
        }

        return false;
    },

    // =================== SETTINGS VALIDATION AND MIGRATION ===================

    /**
     * Migrate old settings to include password system defaults
     * @returns {Promise<boolean>} - Migration success
     */
    async migrateToPasswordSystemSettings() {
        try {
            console.log('🔄 Migrating settings to include password system...');

            let migrationNeeded = false;
            const passwordKeys = [
                'security.password_system_enabled',
                'security.require_admin_password',
                'security.password_min_length',
                'security.auto_logout_minutes',
                'security.show_password_strength',
                'security.allow_password_reset'
            ];

            // Check if any password system settings are missing
            for (const key of passwordKeys) {
                if (this.settings[key] === undefined) {
                    migrationNeeded = true;
                    break;
                }
            }

            if (migrationNeeded) {
                // Add default password system settings
                const defaults = {
                    'security.password_system_enabled': true,
                    'security.require_admin_password': true,
                    'security.password_min_length': 3,
                    'security.auto_logout_minutes': 30,
                    'security.show_password_strength': true,
                    'security.allow_password_reset': true
                };

                for (const [key, defaultValue] of Object.entries(defaults)) {
                    if (this.settings[key] === undefined) {
                        this.settings[key] = defaultValue;
                        console.log(`🔄 Added default setting: ${key} = ${defaultValue}`);
                    }
                }

                // Save migrated settings
                await this.save();
                console.log('✅ Settings migration completed');
            } else {
                console.log('ℹ️ No password system settings migration needed');
            }

            return true;

        } catch (error) {
            console.error('❌ Settings migration failed:', error);
            return false;
        }
    },

    // =================== ENHANCED INITIALIZATION ===================

    /**
     * Enhanced initialization with password system support
     * @returns {Promise<void>}
     */
    async initWithPasswordSupport() {
        try {
            console.log('🔧 Initializing settings manager with password support...');

            // Call original initialization
            if (this.init && typeof this.init === 'function') {
                await this.init();
            }

            // Perform password system migration if needed
            await this.migrateToPasswordSystemSettings();

            // Validate password system settings
            const validation = this.validatePasswordSystemSettings();
            if (!validation.valid) {
                console.warn('⚠️ Password system validation issues:', validation.issues);

                // Auto-fix common issues
                if (validation.issues.some(issue => issue.includes('minimum length'))) {
                    await this.set('security.password_min_length', 3);
                }
                if (validation.issues.some(issue => issue.includes('auto-logout'))) {
                    await this.set('security.auto_logout_minutes', 30);
                }
            }

            console.log('✅ Settings manager initialized with password support');

        } catch (error) {
            console.error('❌ Settings manager password support initialization failed:', error);
        }
    },

    // =================== BACKWARD COMPATIBILITY ===================

    /**
     * Check if password system was previously disabled by user choice
     * @returns {boolean} - True if user explicitly disabled it
     */
    wasPasswordSystemExplicitlyDisabled() {
        // Check for explicit user preference (vs first-time setup)
        const hasUserPreference = localStorage.getItem('metafold_password_system_user_choice');
        const currentSetting = this.get('security.password_system_enabled');

        return hasUserPreference === 'false' || currentSetting === false;
    },

    /**
     * Set user choice for password system
     * @param {boolean} enabled - Whether user chose to enable password system
     */
    setPasswordSystemUserChoice(enabled) {
        localStorage.setItem('metafold_password_system_user_choice', enabled.toString());
    },

    // =================== DEBUG AND MONITORING ===================

    /**
     * Get comprehensive password system status for debugging
     * @returns {Object} - Complete status information
     */
    /**
     * 🔐 Get secure credential
     * @param {string} key - Credential key
     * @returns {Promise<string>} - Decrypted credential
     */
    async getSecureCredential(key) {
        // If secure storage is available, use it
        if (this.isSecureStorageReady && window.secureStorage) {
            try {
                return await window.secureStorage.getItem(key);
            } catch (error) {
                console.warn(`🔐 Failed to retrieve ${key} from secure storage:`, error);
                // Fallback to local storage if available (legacy)
                return this.secureCredentials[key] || '';
            }
        }

        // Fallback to memory store
        return this.secureCredentials[key] || '';
    },

    /**
     * 🔐 Set secure credential
     * @param {string} key - Credential key
     * @param {string} value - Credential value
     * @returns {Promise<boolean>} - Success status
     */
    async setSecureCredential(key, value) {
        // If secure storage is available, use it
        if (this.isSecureStorageReady && window.secureStorage) {
            try {
                await window.secureStorage.setItem(key, value);
                return true;
            } catch (error) {
                console.error(`🔐 Failed to save ${key} to secure storage:`, error);
                return false;
            }
        }

        // Fallback to memory store
        this.secureCredentials[key] = value;
        return this.saveSecureCredentials();
    },

    /**
     * 🔐 Save secure credentials to local storage (fallback)
     */
    saveSecureCredentials() {
        try {
            const storageKey = window.storage ?
                window.storage.getStorageKey('secure_credentials') :
                'metafold_secure_credentials';

            localStorage.setItem(storageKey, JSON.stringify(this.secureCredentials));
            return true;
        } catch (error) {
            console.error('Error saving secure credentials:', error);
            return false;
        }
    },





    /**
     * Get password system debug info
     */
    getPasswordSystemDebugInfo() {
        const config = this.getPasswordSystemConfig();
        const validation = this.validatePasswordSystemSettings();

        return {
            timestamp: new Date().toISOString(),
            configuration: config,
            validation: validation,
            userChoice: this.wasPasswordSystemExplicitlyDisabled(),
            secureStorageAvailable: !!window.secureStorage,
            secureStorageInitialized: window.secureStorage?.isInitialized || false,
            userManagerAvailable: !!window.userManager,
            adminExists: window.secureStorage?.hasUserPassword('Admin') || false,
            totalUsers: window.userManager?.users?.length || 0
        };
    },

    /**
     * Log password system debug information to console
     */
    debugPasswordSystem() {
        const debugInfo = this.getPasswordSystemDebugInfo();

        console.log('🔐 Password System Debug Information:');
        console.log('=====================================');
        console.table(debugInfo.configuration);
        console.log('Validation:', debugInfo.validation);
        console.log('System Status:', {
            userChoice: debugInfo.userChoice,
            secureStorageAvailable: debugInfo.secureStorageAvailable,
            secureStorageInitialized: debugInfo.secureStorageInitialized,
            userManagerAvailable: debugInfo.userManagerAvailable,
            adminExists: debugInfo.adminExists,
            totalUsers: debugInfo.totalUsers
        });

        return debugInfo;
    },

    // =================== TEMPLATE CATEGORIES MANAGEMENT ===================

    /**
     * Get configuration for a template category
     * @param {string} categoryId - Category ID (category1, category2, category3, category4)
     * @returns {Promise<Object>} - Category configuration
     */
    async getCategoryConfig(categoryId) {
        return {
            name: await this.get(`templates.${categoryId}_name`),
            icon: await this.get(`templates.${categoryId}_icon`),
            color: await this.get(`templates.${categoryId}_color`),
            id: categoryId
        };
    },

    /**
     * Get all template categories
     * @returns {Promise<Array>} - Array of category configurations
     */
    async getAllCategories() {
        return await Promise.all([
            this.getCategoryConfig('category1'),
            this.getCategoryConfig('category2'),
            this.getCategoryConfig('category3'),
            this.getCategoryConfig('category4')
        ]);
    },

    /**
     * Update category configuration
     * @param {string} categoryId - Category ID
     * @param {Object} config - Configuration updates
     * @returns {Promise<boolean>} - Success status
     */
    async updateCategory(categoryId, config) {
        try {
            if (config.name !== undefined) {
                await this.set(`templates.${categoryId}_name`, config.name);
            }
            if (config.icon !== undefined) {
                await this.set(`templates.${categoryId}_icon`, config.icon);
            }
            if (config.color !== undefined) {
                await this.set(`templates.${categoryId}_color`, config.color);
            }

            console.log(`✅ Category ${categoryId} updated:`, config);
            return true;
        } catch (error) {
            console.error(`❌ Failed to update category ${categoryId}:`, error);
            return false;
        }
    },

    /**
     * Reset category to defaults
     * @param {string} categoryId - Category ID
     * @returns {Promise<boolean>} - Success status
     */
    async resetCategory(categoryId) {
        const defaults = {
            category1: { name: 'Main-Project', icon: '🎯', color: '#8b5cf6' },
            category2: { name: 'Sub-Project', icon: '📊', color: '#06b6d4' },
            category3: { name: 'Action', icon: '⚡', color: '#10b981' },
            category4: { name: 'Misc', icon: '📋', color: '#f59e0b' }
        };

        const defaultConfig = defaults[categoryId];
        if (!defaultConfig) return false;

        return await this.updateCategory(categoryId, defaultConfig);
    },

    /**
     * Get active category
     * @returns {string} - Active category ID
     */
    getActiveCategory() {
        return this.get('templates.active_category') || 'category1';
    },

    /**
     * Set active category
     * @param {string} categoryId - Category ID to activate
     * @returns {Promise<boolean>} - Success status
     */
    async setActiveCategory(categoryId) {
        if (!['category1', 'category2', 'category3', 'category4'].includes(categoryId)) {
            console.error('Invalid category ID:', categoryId);
            return false;
        }

        return await this.set('templates.active_category', categoryId);
    }

};

// Make globally available
window.settingsManager = settingsManager;
console.log('✅ settingsManager loaded - CLEAN VERSION with elabFTW FIXES');
