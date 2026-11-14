// Profile Manager - Groups & Users with RDM/ISA Metadata
// Manages extended user and group profiles stored as local JSON files
// Provides provenance blocks for project metadata and ISA inheritance

// Remove existing profileManager if already defined
if (window.profileManager) {
    console.log('🔧 Removing existing profileManager');
    delete window.profileManager;
}

const profileManager = {
    groups: [],
    users: [],
    isInitialized: false,
    _dataDir: null,

    // =================== INITIALIZATION ===================

    /**
     * Initialize the profile manager
     * Loads existing profiles from JSON files or migrates from localStorage
     */
    async init() {
        console.log('📋 Initializing profileManager...');

        try {
            // Determine data directory
            this._dataDir = await this._getDataDirectory();
            console.log('📁 Profile data directory:', this._dataDir);

            // Load existing profiles
            await this._loadProfiles();

            // Migrate from localStorage if no profiles exist yet
            if (this.users.length === 0 && this.groups.length === 0) {
                await this._migrateFromLocalStorage();
            }

            this.isInitialized = true;
            console.log(`✅ profileManager initialized: ${this.groups.length} groups, ${this.users.length} users`);
        } catch (error) {
            console.error('❌ profileManager initialization failed:', error);
            // Fallback: work with in-memory data
            this.isInitialized = true;
        }
    },

    // =================== DATA DIRECTORY ===================

    /**
     * Get the data directory for profile JSON files
     * Uses ~/MetaFold/Templates as requested by the user
     */
    async _getDataDirectory() {
        try {
            if (!window.electronAPI) {
                console.warn('⚠️ electronAPI not found');
                return null;
            }
            if (!window.electronAPI.getTemplatesDirectory) {
                console.warn('⚠️ getTemplatesDirectory not found on electronAPI.');
                return null;
            }

            const result = await window.electronAPI.getTemplatesDirectory(null);
            if (result.success && result.directory) {
                console.log('📁 Resolved Templates directory for profiles:', result.directory);
                return result.directory;
            } else {
                console.warn('⚠️ getTemplatesDirectory returned false success:', result);
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Could not get data directory via electronAPI:', error);
        }

        return null;
    },

    // =================== FILE I/O ===================

    /**
     * Load profiles from JSON files
     */
    async _loadProfiles() {
        if (!this._dataDir || !window.electronAPI || !window.electronAPI.readFile) {
            console.error('❌ Cannot load profiles: File storage not available');
            this.groups = [];
            this.users = [];
            return;
        }

        const sep = this._dataDir.includes('\\') ? '\\' : '/';

        // Load groups.json
        try {
            const groupsPath = this._dataDir + sep + 'groups.json';
            const groupsData = await window.electronAPI.readFile(groupsPath);
            if (groupsData) {
                const parsed = JSON.parse(groupsData);
                this.groups = parsed.groups || [];
                console.log(`📋 Loaded ${this.groups.length} groups from file`);
            } else {
                console.log('📋 No existing groups.json found (will be created on first save)');
                this.groups = [];
            }
        } catch (e) {
            console.error('❌ Error parsing groups.json:', e);
            this.groups = [];
        }

        // Load users.json
        try {
            const usersPath = this._dataDir + sep + 'users.json';
            const usersData = await window.electronAPI.readFile(usersPath);
            if (usersData) {
                const parsed = JSON.parse(usersData);
                this.users = parsed.users || [];
                console.log(`📋 Loaded ${this.users.length} users from file`);
            } else {
                console.log('📋 No existing users.json found (will be created on first save)');
                this.users = [];
            }
        } catch (e) {
            console.error('❌ Error parsing users.json:', e);
            this.users = [];
        }
    },

    /**
     * Save profiles to JSON files
     */
    async _saveProfiles() {
        if (!this._dataDir || !window.electronAPI || !window.electronAPI.writeFile) {
            console.error('❌ Cannot save profiles: File storage not available', {
                hasDataDir: !!this._dataDir,
                hasElectronAPI: !!window.electronAPI,
                hasWriteFile: window.electronAPI ? !!window.electronAPI.writeFile : false
            });
            return;
        }

        try {
            const sep = this._dataDir.includes('\\') ? '\\' : '/';

            const groupsPath = this._dataDir + sep + 'groups.json';
            const groupsContent = JSON.stringify({ 
                schemaVersion: '0.1',
                schemaType: 'metafold-groups',
                version: '0.1',
                exportedAt: new Date().toISOString(),
                groups: this.groups 
            }, null, 2);
            
            const writeResult1 = await window.electronAPI.writeFile(groupsPath, groupsContent);
            if (writeResult1 && writeResult1.success === false) {
                console.error('❌ Failed to write groups.json:', writeResult1.message);
            }

            const usersPath = this._dataDir + sep + 'users.json';
            const usersContent = JSON.stringify({ 
                schemaVersion: '0.1',
                schemaType: 'metafold-users',
                version: '0.1',
                exportedAt: new Date().toISOString(),
                users: this.users 
            }, null, 2);
            
            const writeResult2 = await window.electronAPI.writeFile(usersPath, usersContent);
            if (writeResult2 && writeResult2.success === false) {
                console.error('❌ Failed to write users.json:', writeResult2.message);
            }

            console.log('💾 Profiles saved to files in:', this._dataDir);
        } catch (error) {
            console.error('❌ Error saving profiles:', error);
        }
    },

    // =================== MIGRATION ===================

    /**
     * Migrate existing user-group mappings from localStorage
     */
    async _migrateFromLocalStorage() {
        console.log('🔄 Migrating existing user data to profile system...');

        try {
            // Read existing user-group mapping
            const mappingStr = localStorage.getItem('metafold_user_group_mapping');
            const mapping = mappingStr ? JSON.parse(mappingStr) : {};

            // Read user history
            const historyStr = localStorage.getItem('metafold_user_history');
            const history = historyStr ? JSON.parse(historyStr) : [];

            if (Object.keys(mapping).length === 0 && history.length === 0) {
                console.log('📋 No existing user data to migrate');
                return;
            }

            // Collect unique groups
            const groupNames = new Set();
            Object.values(mapping).forEach(g => {
                if (g && g !== 'Default' && g !== 'System') groupNames.add(g);
            });

            // Create group profiles
            for (const groupName of groupNames) {
                if (!this.getGroupByName(groupName)) {
                    this.groups.push({
                        id: this._generateId('grp'),
                        name: groupName,
                        principalInvestigator: '',
                        piEmail: '',
                        piOrcid: '',
                        institution: '',
                        department: '',
                        description: '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            }

            // Create user profiles from history + mapping
            const allUsers = new Set([...history, ...Object.keys(mapping)]);
            for (const username of allUsers) {
                if (username === 'Admin') continue; // Skip Admin
                if (this.getUserByUsername(username)) continue; // Skip if already exists

                const groupName = mapping[username] || 'Default';
                const group = this.getGroupByName(groupName);

                this.users.push({
                    id: this._generateId('usr'),
                    username: username,
                    title: '',
                    firstName: '',
                    lastName: '',
                    email: '',
                    orcid: '',
                    affiliation: '',
                    role: '',
                    groupIds: group ? [group.id] : [],
                    primaryGroupId: group ? group.id : null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            await this._saveProfiles();
            console.log(`✅ Migration complete: ${this.groups.length} groups, ${this.users.length} users`);

        } catch (error) {
            console.warn('⚠️ Migration failed:', error);
        }
    },

    // =================== GROUP CRUD ===================

    /**
     * Create a new group
     */
    async createGroup(groupData) {
        const group = {
            id: this._generateId('grp'),
            name: groupData.name || '',
            principalInvestigator: groupData.principalInvestigator || '',
            email: groupData.email || '',
            institution: groupData.institution || '',
            department: groupData.department || '',
            description: groupData.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };



        // Check for duplicate name
        if (this.getGroupByName(group.name)) {
            throw new Error(`Group "${group.name}" already exists`);
        }

        this.groups.push(group);
        await this._saveProfiles();

        // Also update localStorage mapping for backward compatibility
        this._syncGroupMappingToLocalStorage();

        console.log(`✅ Group created: ${group.name} (${group.id})`);
        return group;
    },

    /**
     * Update an existing group
     */
    async updateGroup(groupId, updates) {
        const group = this.getGroupById(groupId);
        if (!group) throw new Error(`Group not found: ${groupId}`);



        // Check for duplicate name if name changed
        if (updates.name && updates.name !== group.name && this.getGroupByName(updates.name)) {
            throw new Error(`Group "${updates.name}" already exists`);
        }

        Object.assign(group, updates, { updatedAt: new Date().toISOString() });
        await this._saveProfiles();
        this._syncGroupMappingToLocalStorage();

        console.log(`✅ Group updated: ${group.name}`);
        return group;
    },

    /**
     * Delete a group
     */
    async deleteGroup(groupId) {
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index === -1) throw new Error(`Group not found: ${groupId}`);

        const group = this.groups[index];

        // Remove group from users
        this.users.forEach(user => {
            user.groupIds = user.groupIds.filter(id => id !== groupId);
            if (user.primaryGroupId === groupId) {
                user.primaryGroupId = user.groupIds[0] || null;
            }
        });

        this.groups.splice(index, 1);
        await this._saveProfiles();
        this._syncGroupMappingToLocalStorage();

        console.log(`🗑️ Group deleted: ${group.name}`);
        return group;
    },

    /**
     * Get group by ID
     */
    getGroupById(groupId) {
        return this.groups.find(g => g.id === groupId) || null;
    },

    /**
     * Get group by name
     */
    getGroupByName(name) {
        return this.groups.find(g => g.name === name) || null;
    },

    /**
     * Get all groups
     */
    getAllGroups() {
        return [...this.groups];
    },

    // =================== USER CRUD ===================

    /**
     * Create or update a user profile
     * If user with same username exists, update instead of create
     */
    async createOrUpdateUser(userData) {
        let user = this.getUserByUsername(userData.username);

        if (user) {
            // Update existing user
            return await this.updateUser(user.id, userData);
        }

        // Create new user
        const groupName = userData.groupName || userData.groupname || 'Default';
        let group = this.getGroupByName(groupName);
        
        // Auto-create group if it doesn't exist and has a non-default name
        if (!group && groupName && groupName !== 'Default') {
            group = await this.createGroup({ name: groupName });
        }

        user = {
            id: this._generateId('usr'),
            username: userData.username,
            title: userData.title || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            orcid: userData.orcid || '',
            affiliation: userData.affiliation || '',
            role: userData.role || '',
            groupIds: group ? [group.id] : [],
            primaryGroupId: group ? group.id : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Validate ORCID if provided
        if (user.orcid && !this.validateOrcid(user.orcid)) {
            throw new Error('Invalid ORCID format. Expected: 0000-0000-0000-0000');
        }

        this.users.push(user);
        await this._saveProfiles();
        this._syncGroupMappingToLocalStorage();

        console.log(`✅ User created: ${user.username} (${user.id})`);
        return user;
    },

    /**
     * Update an existing user
     */
    async updateUser(userId, updates) {
        const user = this.getUserById(userId);
        if (!user) throw new Error(`User not found: ${userId}`);

        // Validate ORCID if provided
        if (updates.orcid && !this.validateOrcid(updates.orcid)) {
            throw new Error('Invalid ORCID format. Expected: 0000-0000-0000-0000');
        }

        // Handle group assignment
        if (updates.groupName || updates.groupname) {
            const groupName = updates.groupName || updates.groupname;
            let group = this.getGroupByName(groupName);
            
            if (!group && groupName && groupName !== 'Default') {
                group = await this.createGroup({ name: groupName });
            }

            if (group) {
                if (!user.groupIds.includes(group.id)) {
                    user.groupIds.push(group.id);
                }
                user.primaryGroupId = group.id;
            }

            // Remove temporary keys
            delete updates.groupName;
            delete updates.groupname;
        }

        // Apply other updates
        const allowedKeys = ['username', 'title', 'firstName', 'lastName', 'email', 'orcid', 
                           'affiliation', 'role', 'groupIds', 'primaryGroupId'];
        for (const key of allowedKeys) {
            if (updates[key] !== undefined) {
                user[key] = updates[key];
            }
        }

        user.updatedAt = new Date().toISOString();
        await this._saveProfiles();
        this._syncGroupMappingToLocalStorage();

        console.log(`✅ User updated: ${user.username}`);
        return user;
    },

    /**
     * Delete a user
     */
    async deleteUser(userId) {
        const index = this.users.findIndex(u => u.id === userId);
        if (index === -1) throw new Error(`User not found: ${userId}`);

        const user = this.users[index];
        this.users.splice(index, 1);
        await this._saveProfiles();
        this._syncGroupMappingToLocalStorage();

        console.log(`🗑️ User deleted: ${user.username}`);
        return user;
    },

    /**
     * Get user by ID
     */
    getUserById(userId) {
        return this.users.find(u => u.id === userId) || null;
    },

    /**
     * Get user by username
     */
    getUserByUsername(username) {
        return this.users.find(u => u.username === username) || null;
    },

    /**
     * Get all users
     */
    getAllUsers() {
        return [...this.users];
    },

    /**
     * Get users in a specific group
     */
    getUsersByGroup(groupId) {
        return this.users.filter(u => {
            if (Array.isArray(u.groupIds) && u.groupIds.includes(groupId)) return true;
            if (u.primaryGroupId === groupId) return true;
            return false;
        });
    },

    /**
     * Get primary group name for a user
     */
    getUserPrimaryGroupName(username) {
        const user = this.getUserByUsername(username);
        if (!user || !user.primaryGroupId) return 'Default';
        
        const group = this.getGroupById(user.primaryGroupId);
        return group ? group.name : 'Default';
    },

    // =================== PREFERENCES ===================

    /**
     * Update user preferences in the user profile
     * @param {string} username - The username
     * @param {Object} preferences - The preferences object
     */
    async updateUserPreferences(username, preferences) {
        if (!username) return false;
        const user = this.getUserByUsername(username);
        if (!user) {
            console.warn(`⚠️ updateUserPreferences: User ${username} not found in profiles`);
            return false;
        }

        user.preferences = { ...preferences };
        user.updatedAt = new Date().toISOString();
        await this._saveProfiles();
        console.log(`✅ Preferences updated for user: ${username}`);
        return true;
    },

    /**
     * Get user preferences from the user profile
     * @param {string} username - The username
     * @returns {Object|null}
     */
    getUserPreferences(username) {
        if (!username) return null;
        const user = this.getUserByUsername(username);
        if (!user || !user.preferences) return null;
        return { ...user.preferences };
    },

    // =================== PROVENANCE ===================

    /**
     * Generate provenance block for project metadata (ISA-compatible)
     * This gets embedded into ReadyToImport.json
     * @param {string} username - Current username
     * @returns {Object} - Provenance block
     */
    getProvenanceBlock(username) {
        const user = this.getUserByUsername(username);
        const provenance = {
            creator: {
                username: username || 'Unknown'
            },
            group: {},
            createdAt: new Date().toISOString(),
            metafoldVersion: '0.1'
        };

        if (user) {
            provenance.creator = {
                username: user.username,
                title: user.title || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                orcid: user.orcid || '',
                affiliation: user.affiliation || '',
                role: user.role || ''
            };

            // Remove empty fields from creator
            Object.keys(provenance.creator).forEach(key => {
                if (!provenance.creator[key]) delete provenance.creator[key];
            });
            // Always keep username
            provenance.creator.username = user.username;

            // Add group info
            if (user.primaryGroupId) {
                const group = this.getGroupById(user.primaryGroupId);
                if (group) {
                    provenance.group = {
                        name: group.name
                    };

                    // Add non-empty group fields
                    if (group.principalInvestigator) provenance.group.pi = group.principalInvestigator;
                    if (group.email) provenance.group.email = group.email;
                    if (group.institution) provenance.group.institution = group.institution;
                    if (group.department) provenance.group.department = group.department;
                }
            }
        }

        // Remove empty group object
        if (Object.keys(provenance.group).length === 0) {
            delete provenance.group;
        }

        return provenance;
    },

    // =================== IMPORT / EXPORT ===================

    /**
     * Export profiles as a portable JSON (without passwords)
     * Supports scoping by all, group, or user
     * @param {Object} [scope={ type: 'all' }] - Export scope { type: 'all'|'group'|'user', name: string }
     * @returns {Object} - Export data
     */
    getExportData(scope = {}) {
        let groupsToExport = [];
        let usersToExport = [];

        if (scope.type === 'user' && scope.name) {
            const user = this.getUserByUsername(scope.name);
            if (user) {
                usersToExport.push({ ...user });
                const groupIds = user.groupIds || (user.primaryGroupId ? [user.primaryGroupId] : []);
                for (const gid of groupIds) {
                    const grp = this.getGroupById(gid) || this.getGroupByName(gid);
                    if (grp && !groupsToExport.some(g => g.id === grp.id)) {
                        groupsToExport.push({ ...grp });
                    }
                }
                if (groupsToExport.length === 0 && user.primaryGroup) {
                    const grp = this.getGroupByName(user.primaryGroup) || this.getGroupById(user.primaryGroup);
                    if (grp && !groupsToExport.some(g => g.id === grp.id)) {
                        groupsToExport.push({ ...grp });
                    }
                }
                if (groupsToExport.length === 0) {
                    const grpName = this.getUserPrimaryGroupName(user.username);
                    const grp = this.getGroupByName(grpName);
                    if (grp && !groupsToExport.some(g => g.id === grp.id)) {
                        groupsToExport.push({ ...grp });
                    }
                }
            }
        } else if (scope.type === 'group' && scope.name) {
            const grp = this.getGroupByName(scope.name) || this.getGroupById(scope.name);
            if (grp) {
                groupsToExport.push({ ...grp });
                const members = this.getUsersByGroup(grp.id);
                for (const m of members) {
                    usersToExport.push({ ...m });
                }
            }
        } else {
            groupsToExport = this.groups.map(g => ({ ...g }));
            usersToExport = this.users.map(u => ({ ...u }));
        }

        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            exportedFrom: 'MetaFold Profile Manager',
            scope: scope.type || 'all',
            targetName: scope.name || null,
            groups: groupsToExport,
            users: usersToExport.map(u => ({ ...u }))
        };
    },

    /**
     * Get templates associated with a scope
     * @param {Object} scope - { type: 'all'|'group'|'user', name: string }
     * @returns {Array} - Array of template objects
     */
    async getTemplatesForScope(scope = {}) {
        let allTemplates = [];
        if (window.templateManager) {
            try {
                if (typeof window.templateManager.getAllTemplates === 'function') {
                    allTemplates = window.templateManager.getAllTemplates(true) || [];
                }
            } catch (e) {}
            if (allTemplates.length === 0 && Array.isArray(window.templateManager.templates)) {
                allTemplates = [...window.templateManager.templates];
            }
        }

        // If templateManager has none (e.g. before login), read templates from disk directly
        if (allTemplates.length === 0 && this._dataDir && window.electronAPI?.listDirectory && window.electronAPI?.readFile) {
            try {
                const dirList = await window.electronAPI.listDirectory(this._dataDir);
                if (dirList && Array.isArray(dirList)) {
                    const sep = this._dataDir.includes('\\') ? '\\' : '/';
                    for (const item of dirList) {
                        const name = (typeof item === 'string') ? item : item.name;
                        if (name && name.endsWith('.json') && name !== 'users.json' && name !== 'groups.json' && name !== 'user_index.json') {
                            try {
                                const content = await window.electronAPI.readFile(this._dataDir + sep + name);
                                if (content) {
                                    const parsed = JSON.parse(content);
                                    if (parsed && (parsed.structure || parsed.metadata || parsed.type === 'experiment')) {
                                        allTemplates.push(parsed);
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not read templates from disk:', e);
            }
        }

        if (scope.type === 'user' && scope.name) {
            const targetLower = scope.name.toLowerCase();
            return allTemplates.filter(t => (t.createdBy && t.createdBy.toLowerCase() === targetLower));
        } else if (scope.type === 'group' && scope.name) {
            const targetLower = scope.name.toLowerCase();
            return allTemplates.filter(t => (t.createdByGroup && t.createdByGroup.toLowerCase() === targetLower));
        } else {
            return allTemplates.filter(t => {
                if (t.isDefault === true || t.createdBy === 'System') return false;
                if (window.storage?.isDefaultTemplate && window.storage.isDefaultTemplate(t)) return false;
                return true;
            });
        }
    },

    /**
     * Export profiles and templates as ZIP archive, folder, or JSON file
     * @param {Object} [scope={ type: 'all' }] - Export scope { type: 'all'|'group'|'user', name: string }
     * @param {string} [exportMode='zip'] - 'zip' (ZIP Archive), 'folder' (Folder with separate JSONs), or 'file' (Single JSON file)
     * @param {boolean} [includeTemplates=true] - Whether to include associated templates
     */
    async exportProfiles(scope = { type: 'all' }, exportMode = 'zip', includeTemplates = true) {
        const exportData = this.getExportData(scope);
        const templates = includeTemplates ? await this.getTemplatesForScope(scope) : [];
        if (includeTemplates) {
            exportData.templates = templates;
        }

        const safeName = (scope.name ? scope.name : 'all').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const dateStr = new Date().toISOString().slice(0, 10);

        if (exportMode === 'zip') {
            const defaultFileName = `metafold-export-${safeName}-${dateStr}.zip`;
            const filesToZip = [
                {
                    path: 'metafold-profiles.json',
                    data: JSON.stringify(exportData, null, 2)
                },
                {
                    path: 'users.json',
                    data: JSON.stringify({ version: '1.0', users: exportData.users }, null, 2)
                },
                {
                    path: 'groups.json',
                    data: JSON.stringify({ version: '1.0', groups: exportData.groups }, null, 2)
                }
            ];

            if (templates.length > 0) {
                for (const t of templates) {
                    const safeTName = (t.name || 'template').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '.json';
                    filesToZip.push({
                        path: `templates/${safeTName}`,
                        data: JSON.stringify(t, null, 2)
                    });
                }
            }

            if (window.electronAPI && window.electronAPI.showSaveDialog && window.electronAPI.writeZipFile) {
                const titleLabel = scope.type === 'user' ? `User "${scope.name}"` :
                    scope.type === 'group' ? `Group "${scope.name}"` : 'All Profiles';

                const result = await window.electronAPI.showSaveDialog({
                    title: `Export ${titleLabel} Package`,
                    defaultPath: defaultFileName,
                    filters: [{ name: 'ZIP Archive (*.zip)', extensions: ['zip'] }]
                });

                const filePath = (typeof result === 'string') ? result : result?.filePath;
                if (!filePath) {
                    return { success: false, canceled: true };
                }

                try {
                    const zipRes = await window.electronAPI.writeZipFile(filePath, filesToZip);
                    if (!zipRes || !zipRes.success) {
                        throw new Error(zipRes?.error || 'Failed to write ZIP file');
                    }

                    console.log('📦 Exported ZIP package to:', filePath);

                    if (typeof window.showExportSuccessModal === 'function') {
                        const folderPath = filePath.replace(/[\\/][^\\/]+$/, '');
                        const fileName = filePath.split(/[\\/]/).pop();
                        window.showExportSuccessModal({
                            title: 'Export Completed',
                            message: `Successfully exported profiles & ${templates.length} template(s) into ${fileName}.`,
                            folderPath: folderPath,
                            files: [{ name: fileName, path: filePath, icon: '📦', label: 'ZIP Package' }]
                        });
                    }

                    return { success: true, path: filePath };
                } catch (err) {
                    console.error('❌ ZIP export failed:', err);
                    return { success: false, error: err.message };
                }
            } else {
                return { success: false, error: 'ZIP export is not supported in this environment' };
            }

        } else if (exportMode === 'folder') {
            if (!window.electronAPI || !window.electronAPI.selectFolder || !window.electronAPI.writeFile) {
                return { success: false, error: 'Folder selection is not available' };
            }

            const chosenFolder = await window.electronAPI.selectFolder();
            if (!chosenFolder) {
                return { success: false, canceled: true };
            }

            const sep = chosenFolder.includes('\\') ? '\\' : '/';
            const subDirName = `MetaFold_Export_${safeName}_${dateStr}`;
            const targetDir = chosenFolder + sep + subDirName;

            if (window.electronAPI.ensureDir) {
                await window.electronAPI.ensureDir(targetDir);
            }

            const exportedFiles = [];

            // 1. Write bundle JSON
            const bundlePath = targetDir + sep + 'metafold-profiles.json';
            await window.electronAPI.writeFile(bundlePath, JSON.stringify(exportData, null, 2));
            exportedFiles.push({ name: 'metafold-profiles.json', path: bundlePath, icon: '📋', label: 'Profiles & Data' });

            // 2. Write users.json and groups.json
            const usersPath = targetDir + sep + 'users.json';
            await window.electronAPI.writeFile(usersPath, JSON.stringify({ version: '1.0', users: exportData.users }, null, 2));

            const groupsPath = targetDir + sep + 'groups.json';
            await window.electronAPI.writeFile(groupsPath, JSON.stringify({ version: '1.0', groups: exportData.groups }, null, 2));

            // 3. Write individual template JSON files
            if (templates.length > 0) {
                const templatesDir = targetDir + sep + 'templates';
                if (window.electronAPI.ensureDir) {
                    await window.electronAPI.ensureDir(templatesDir);
                }
                for (const t of templates) {
                    const safeTName = (t.name || 'template').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '.json';
                    const tPath = templatesDir + sep + safeTName;
                    await window.electronAPI.writeFile(tPath, JSON.stringify(t, null, 2));
                    exportedFiles.push({ name: safeTName, path: tPath, icon: '📑', label: 'Template' });
                }
            }

            console.log('📤 Export completed in folder:', targetDir);
            if (typeof window.showExportSuccessModal === 'function') {
                window.showExportSuccessModal({
                    title: 'Export Completed',
                    message: `Exported ${scope.type === 'user' ? `user "${scope.name}"` : scope.type === 'group' ? `group "${scope.name}"` : 'all profiles'} and ${templates.length} template(s) as JSON files.`,
                    folderPath: targetDir,
                    files: exportedFiles
                });
            }

            return { success: true, folderPath: targetDir, filesCount: exportedFiles.length };

        } else {
            // Single JSON file export
            const defaultFileName = `metafold-export-${safeName}.json`;
            const jsonStr = JSON.stringify(exportData, null, 2);

            if (window.electronAPI && window.electronAPI.showSaveDialog) {
                const titleLabel = scope.type === 'user' ? `User "${scope.name}"` :
                    scope.type === 'group' ? `Group "${scope.name}"` : 'All Profiles';

                const result = await window.electronAPI.showSaveDialog({
                    title: `Export ${titleLabel}`,
                    defaultPath: defaultFileName,
                    filters: [{ name: 'JSON Files (*.json)', extensions: ['json'] }]
                });

                const filePath = (typeof result === 'string') ? result : result?.filePath;
                if (!filePath) {
                    return { success: false, canceled: true };
                }

                await window.electronAPI.writeFile(filePath, jsonStr);
                console.log('📤 Exported JSON file to:', filePath);

                if (typeof window.showExportSuccessModal === 'function') {
                    const folderPath = filePath.replace(/[\\/][^\\/]+$/, '');
                    const fileName = filePath.split(/[\\/]/).pop();
                    window.showExportSuccessModal({
                        title: 'Export Completed',
                        message: `Successfully exported profiles & templates to ${fileName}.`,
                        folderPath: folderPath,
                        files: [{ name: fileName, path: filePath, icon: '👤', label: 'Export JSON' }]
                    });
                }

                return { success: true, path: filePath };
            }

            // Fallback: download via browser
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            a.click();
            URL.revokeObjectURL(url);

            return { success: true, method: 'browser-download' };
        }
    },

    /**
     * Import profiles from JSON or ZIP file
     * @param {string} [mode='merge'] - 'merge' (add new, skip existing) or 'replace' (overwrite all)
     */
    async importProfiles(mode = 'merge') {
        let filePath = null;

        if (window.electronAPI && (window.electronAPI.selectFile || window.electronAPI.showOpenDialog)) {
            try {
                const dialogFilters = [
                    { name: 'Supported Files (*.zip, *.json)', extensions: ['zip', 'json'] },
                    { name: 'ZIP Archives (*.zip)', extensions: ['zip'] },
                    { name: 'JSON Files (*.json)', extensions: ['json'] }
                ];

                if (window.electronAPI.selectFile) {
                    filePath = await window.electronAPI.selectFile({
                        title: 'Import User & Group Profiles or ZIP Package',
                        filters: dialogFilters
                    });
                } else if (window.electronAPI.showOpenDialog) {
                    const result = await window.electronAPI.showOpenDialog({
                        title: 'Import User & Group Profiles or ZIP Package',
                        filters: dialogFilters,
                        properties: ['openFile']
                    });
                    filePath = (typeof result === 'string') ? result : result?.filePaths?.[0] || result?.filePath;
                }
            } catch (error) {
                console.error('❌ Import dialog failed:', error);
                return { success: false, error: error.message };
            }
        } else if (typeof document !== 'undefined') {
            const fileData = await new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json';
                input.onchange = (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return resolve(null);
                    const reader = new FileReader();
                    reader.onload = (re) => resolve(re.target.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsText(file);
                };
                input.click();
            });
            if (!fileData) return { success: false, canceled: true, error: 'No file selected' };
            return await this.importFromJson(fileData, mode);
        }

        if (!filePath) {
            return { success: false, canceled: true, error: 'No file selected' };
        }

        // Handle ZIP archive import
        if (filePath.toLowerCase().endsWith('.zip')) {
            if (window.electronAPI && window.electronAPI.readZipFile) {
                try {
                    const zipRes = await window.electronAPI.readZipFile(filePath);
                    if (!zipRes || !zipRes.success || !Array.isArray(zipRes.files)) {
                        throw new Error(zipRes?.error || 'Failed to read ZIP archive');
                    }
                    return await this.importFromZipFiles(zipRes.files, mode);
                } catch (err) {
                    console.error('❌ ZIP import failed:', err);
                    return { success: false, error: err.message };
                }
            } else {
                return { success: false, error: 'ZIP extraction is not available' };
            }
        }

        let jsonStr = null;
        if (window.electronAPI && window.electronAPI.readFile) {
            jsonStr = await window.electronAPI.readFile(filePath);
        }

        if (!jsonStr) {
            return { success: false, error: 'Could not read selected file' };
        }

        return await this.importFromJson(jsonStr, mode);
    },

    /**
     * Import profiles and templates from extracted ZIP files
     * @param {Array<{path: string, content: string}>} files - Extracted files
     * @param {string} mode - 'merge' or 'replace'
     */
    async importFromZipFiles(files, mode = 'merge') {
        try {
            let bundleJson = null;
            let usersJson = null;
            let groupsJson = null;
            const templateFiles = [];

            for (const file of files) {
                const normPath = file.path.replace(/\\/g, '/');
                if (normPath === 'metafold-profiles.json' || normPath.endsWith('/metafold-profiles.json')) {
                    bundleJson = file.content;
                } else if (normPath === 'users.json' || normPath.endsWith('/users.json')) {
                    usersJson = file.content;
                } else if (normPath === 'groups.json' || normPath.endsWith('/groups.json')) {
                    groupsJson = file.content;
                } else if (normPath.startsWith('templates/') || normPath.includes('/templates/')) {
                    if (normPath.endsWith('.json')) {
                        templateFiles.push(file);
                    }
                }
            }

            let data = null;
            if (bundleJson) {
                data = JSON.parse(bundleJson);
            } else {
                data = {
                    version: '1.0',
                    groups: groupsJson ? (JSON.parse(groupsJson).groups || JSON.parse(groupsJson)) : [],
                    users: usersJson ? (JSON.parse(usersJson).users || JSON.parse(usersJson)) : [],
                    templates: []
                };
            }

            // Extract templates to disk
            let templatesExtracted = 0;
            if (templateFiles.length > 0 && this._dataDir && window.electronAPI?.writeFile) {
                const sep = this._dataDir.includes('\\') ? '\\' : '/';
                for (const tf of templateFiles) {
                    try {
                        const parsedT = JSON.parse(tf.content);
                        const fileName = (parsedT.name || tf.path.split('/').pop().replace('.json', ''))
                            .replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '.json';
                        const destPath = this._dataDir + sep + fileName;
                        await window.electronAPI.writeFile(destPath, JSON.stringify(parsedT, null, 2));
                        templatesExtracted++;
                    } catch (e) {
                        console.warn('Failed to parse template from ZIP:', tf.path, e);
                    }
                }
            }

            const result = await this.importFromJson(JSON.stringify(data), mode);
            if (result && result.success && result.stats) {
                result.stats.templatesImported = (result.stats.templatesImported || 0) + templatesExtracted;
            }

            return result;
        } catch (error) {
            console.error('❌ Failed to process ZIP files:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Import profiles from JSON string
     * @param {string} jsonStr - JSON content
     * @param {string} mode - 'merge' or 'replace'
     * @returns {Object} - Import result
     */
    async importFromJson(jsonStr, mode = 'merge') {
        try {
            const data = JSON.parse(jsonStr);

            // Handle case where user selected an individual template file
            if (!data.groups && !data.users && (data.structure || data.metadata || data.type === 'experiment')) {
                if (this._dataDir && window.electronAPI?.writeFile && data.name) {
                    const sep = this._dataDir.includes('\\') ? '\\' : '/';
                    const safeName = data.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
                    const destPath = this._dataDir + sep + `${safeName}.json`;
                    await window.electronAPI.writeFile(destPath, JSON.stringify(data, null, 2));
                    if (window.templateManager?.init) {
                        try { await window.templateManager.init(); } catch (e) {}
                    }
                    return { success: true, stats: { groupsAdded: 0, groupsSkipped: 0, usersAdded: 0, usersSkipped: 0, templatesImported: 1, usersNeedPassword: [] } };
                }
            }

            if (!data.groups && !data.users && !data.templates) {
                throw new Error('Invalid export file: missing groups, users, or templates');
            }

            const stats = { groupsAdded: 0, groupsSkipped: 0, usersAdded: 0, usersSkipped: 0, templatesImported: 0, usersNeedPassword: [] };

            if (mode === 'replace') {
                this.groups = [];
                this.users = [];
            }

            // Import groups
            if (data.groups && Array.isArray(data.groups)) {
                for (const importGroup of data.groups) {
                    const existing = this.getGroupByName(importGroup.name);
                    if (existing && mode === 'merge') {
                        stats.groupsSkipped++;
                        continue;
                    }

                    if (existing) {
                        // Replace mode: update existing
                        Object.assign(existing, importGroup, { updatedAt: new Date().toISOString() });
                    } else {
                        // Ensure unique ID
                        importGroup.id = importGroup.id || this._generateId('grp');
                        importGroup.updatedAt = new Date().toISOString();
                        this.groups.push(importGroup);
                    }
                    stats.groupsAdded++;
                }
            }

            // Import users
            if (data.users && Array.isArray(data.users)) {
                for (const importUser of data.users) {
                    const existing = this.getUserByUsername(importUser.username);
                    if (existing && mode === 'merge') {
                        stats.usersSkipped++;
                        continue;
                    }

                    if (existing) {
                        // Replace mode: update existing
                        Object.assign(existing, importUser, { updatedAt: new Date().toISOString() });
                    } else {
                        // Ensure unique ID
                        importUser.id = importUser.id || this._generateId('usr');
                        importUser.updatedAt = new Date().toISOString();
                        this.users.push(importUser);
                    }
                    stats.usersAdded++;
                    stats.usersNeedPassword.push(importUser.username);
                }
            }

            // Import templates (if bundled in the JSON file)
            if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
                if (this._dataDir && window.electronAPI && window.electronAPI.writeFile) {
                    const sep = this._dataDir.includes('\\') ? '\\' : '/';
                    for (const t of data.templates) {
                        if (t && t.name) {
                            const safeTName = t.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
                            const destPath = this._dataDir + sep + `${safeTName}.json`;
                            await window.electronAPI.writeFile(destPath, JSON.stringify(t, null, 2));
                            stats.templatesImported++;
                        }
                    }
                }
            }

            await this._saveProfiles();
            this._syncGroupMappingToLocalStorage();

            // Refresh templates if any were imported
            if (stats.templatesImported > 0 && window.templateManager && typeof window.templateManager.init === 'function') {
                try {
                    await window.templateManager.init();
                    console.log(`🔄 templateManager reloaded after importing ${stats.templatesImported} template(s)`);
                } catch (e) {
                    console.warn('⚠️ templateManager reload failed:', e);
                }
            }

            console.log(`📥 Import complete:`, stats);
            return { success: true, stats };

        } catch (error) {
            console.error('❌ Import failed:', error);
            return { success: false, error: error.message };
        }
    },

    // =================== VALIDATION ===================

    /**
     * Validate ORCID format
     * @param {string} orcid - ORCID string
     * @returns {boolean}
     */
    validateOrcid(orcid) {
        if (!orcid || orcid.trim() === '') return true; // Empty is OK (optional)
        // ORCID format: 0000-0000-0000-000X (last char can be X)
        const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
        return orcidRegex.test(orcid.trim());
    },

    /**
     * Get profile completeness for a user (for visual hints)
     * @param {string} username
     * @returns {Object} - Completeness info
     */
    getProfileCompleteness(username) {
        const user = this.getUserByUsername(username);
        if (!user) return { score: 0, missing: ['User profile not found'], total: 0, filled: 0 };

        const fields = [
            { key: 'email', label: 'E-Mail' },
            { key: 'orcid', label: 'ORCID' },
            { key: 'firstName', label: 'Vorname' },
            { key: 'lastName', label: 'Nachname' },
            { key: 'affiliation', label: 'Affiliation' },
            { key: 'role', label: 'Rolle' }
        ];

        const missing = [];
        let filled = 0;

        for (const field of fields) {
            if (user[field.key] && user[field.key].trim() !== '') {
                filled++;
            } else {
                missing.push(field.label);
            }
        }

        return {
            score: Math.round((filled / fields.length) * 100),
            missing,
            total: fields.length,
            filled
        };
    },

    // =================== BACKWARD COMPATIBILITY ===================

    /**
     * Sync group mappings back to localStorage for backward compatibility
     * This ensures userManager and loginModal still work with the old mapping
     */
    _syncGroupMappingToLocalStorage() {
        if (typeof localStorage === 'undefined') return;
        try {
            const mapping = {};
            for (const user of this.users) {
                const groupName = this.getUserPrimaryGroupName(user.username);
                mapping[user.username] = groupName;
            }
            localStorage.setItem('metafold_user_group_mapping', JSON.stringify(mapping));
        } catch (error) {
            console.warn('⚠️ Could not sync group mapping to localStorage:', error);
        }
    },

    // =================== UTILITY ===================

    /**
     * Generate a unique ID
     * @param {string} prefix - 'grp' or 'usr'
     * @returns {string}
     */
    _generateId(prefix) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${timestamp}_${random}`;
    },

    /**
     * Get predefined roles list (ISA + DFG compatible)
     * @returns {string[]}
     */
    getPredefinedRoles() {
        return [
            'Principal Investigator',
            'Co-PI',
            'PostDoc',
            'PhD Student',
            'Master Student',
            'Bachelor Student',
            'Research Technician',
            'Lab Manager',
            'Guest Researcher',
            'Other'
        ];
    },

    /**
     * Debug status output
     */
    debugStatus() {
        console.log('📋 =================== PROFILE MANAGER STATUS ===================');
        console.log('Initialized:', this.isInitialized);
        console.log('Data Directory:', this._dataDir);
        console.log('Groups:', this.groups.length);
        this.groups.forEach(g => {
            console.log(`  📁 ${g.name} (${g.id}) - PI: ${g.principalInvestigator || 'not set'}`);
        });
        console.log('Users:', this.users.length);
        this.users.forEach(u => {
            const groupName = this.getUserPrimaryGroupName(u.username);
            console.log(`  👤 ${u.username} (${u.id}) - Group: ${groupName}, ORCID: ${u.orcid || 'not set'}`);
        });
        console.log('📋 ================================================================');
        return { groups: this.groups, users: this.users };
    }
};

// Make available globally
window.profileManager = profileManager;
console.log('✅ Profile Manager loaded');
