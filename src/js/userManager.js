// User Manager with Template Storage Integration

// Remove existing userManager if already defined
if (window.userManager) {
    console.log('🔧 Removing existing userManager');
    delete window.userManager;
}

const userManager = {
    currentUser: null,
    currentGroup: null,
    users: [],
    isInitialized: false,

    // Initialize user manager
    async init() {
        console.log('🔧 Initializing userManager...');
        
        // Wait for settingsManager
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!window.settingsManager && attempts < maxAttempts) {
            console.log(`🔧 Waiting for settingsManager... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.settingsManager) {
            console.warn('⚠️ settingsManager not available, using simple mode');
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }
        
        // Check if user management is enabled
        let userManagementEnabled = false;
        try {
            userManagementEnabled = await this.isUserManagementEnabled();
            console.log('🔧 User management enabled check result:', userManagementEnabled);
        } catch (error) {
            console.warn('⚠️ Error checking user management, defaulting to simple mode:', error);
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }
        
        if (!userManagementEnabled) {
            console.log('📝 User management disabled - using simple mode');
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }

        // Load user history for autocomplete suggestions
        this.loadUserHistory();
        
        console.log('👥 User management enabled - ALWAYS showing login dialog...');
        
        // CRITICAL: ALWAYS show login dialog when user management is enabled
        // REMOVE auto-restore logic - user must actively select
        try {
            console.log('🔑 User management active - showing user selection dialog...');
            const userInfo = await this.showLoginModal();
            
            if (userInfo && userInfo.username) {
                await this.setCurrentUser(userInfo.username, userInfo.groupname);
                console.log('✅ User selected from login modal');
                return userInfo;
            } else {
                console.log('❌ Login cancelled - disabling user management');
                
                // If cancelled, disable user management and switch to simple mode
                await window.settingsManager.set('general.user_management_enabled', false);
                this.initSimpleMode();
                return { username: this.currentUser, groupname: this.currentGroup };
            }
        } catch (error) {
            console.warn('❌ Login modal failed, using simple mode:', error);
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }
    },
        
    // Initialize simple mode (no user management)
    initSimpleMode() {
        this.currentUser = 'User';
        this.currentGroup = 'Default';
        this.isInitialized = true;
        
        // Set storage prefix for simple mode
        if (window.storage && window.storage.setUserPrefix) {
            window.storage.setUserPrefix('default');
        }
        
        console.log('✅ Simple mode initialized');
    },

    // Show login modal
    async showLoginModal() {
        if (!window.loginModal) {
            throw new Error('loginModal not available');
        }
        return await window.loginModal.show();
    },

    async setCurrentUser(username, groupname) {
        console.log(`👤 Setting current user with settings: ${username} (${groupname})`);
        
        // Store previous user for logging
        const previousUser = this.currentUser;
        
        // Update user info
        this.currentUser = username;
        this.currentGroup = groupname || 'Default';
        this.isInitialized = true;
        
        // Add to history
        this.addUserToHistory(username, groupname);
        
        // Store as last user
        try {
            localStorage.setItem('metafold_last_user', JSON.stringify({
                username: username,
                groupname: groupname,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('Could not store last user:', error);
        }

        // Update storage prefix
        if (window.storage && window.storage.setUserPrefix) {
            const prefix = `${groupname}_${username}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            window.storage.setUserPrefix(prefix);
            
            // Reinitialize file storage for new user
            if (window.storage.initFileStorage) {
                await window.storage.initFileStorage();
            }
        }

        // NEUE FUNKTION: Switch settings to new user
        if (window.settingsManager && window.settingsManager.switchToUser) {
            try {
                await window.settingsManager.switchToUser(username, groupname);
                console.log('✅ Settings switched for new user');
            } catch (error) {
                console.warn('⚠️ Could not switch settings for new user:', error);
            }
        }

        // Reload templates for new user
        if (window.templateManager && window.templateManager.init) {
            try {
                await window.templateManager.init();
                console.log('✅ Templates reloaded for new user');
            } catch (error) {
                console.warn('⚠️ Could not reload templates for new user:', error);
            }
        }
        this.updateUserDisplay();
        console.log(`✅ User switch completed: ${previousUser || 'None'} → ${username} (${groupname})`);
        
        // FORCE UPDATE USER DISPLAY
        this.forceUpdateUserDisplay();
        this.forceRefreshTemplates();
        return { username, groupname };
    },

    forceUpdateUserDisplay() {
        try {
            console.log('🔄 FORCE updating user display...');
            
            const username = this.currentUser;
            const initials = this.getUserInitials(username);
            const color = this.generateUserColor(username);
            
            console.log(`Force update: ${username} → ${initials} (${color})`);
            
            // Update #currentUserAvatar
            const avatar = document.getElementById('currentUserAvatar');
            if (avatar) {
                avatar.textContent = initials;
                avatar.style.backgroundColor = color;
            }
            
            // Update all template avatars
            document.querySelectorAll('.template-avatar').forEach(el => {
                el.textContent = ` ${initials} `;
                el.style.backgroundColor = color;
            });
            
            // Update all username text elements
            Array.from(document.querySelectorAll('*')).forEach(el => {
                const text = el.textContent?.trim();
                if (text === 'Thomas' || text === 'Kathi' || text === 'User') {
                    if (text !== username) {
                        console.log(`Updating username element: "${text}" → "${username}"`);
                        el.textContent = username;
                    }
                }
            });
            
            console.log('✅ Force user display update completed');
            
        } catch (error) {
            console.error('❌ Error in force user display update:', error);
        }
    },

    
    forceRefreshTemplates() {
        try {
            console.log('🔄 FORCE refreshing templates...');
            
            // 1. Template Manager komplett neu laden
            if (window.templateManager) {
                console.log('🔄 Reinitializing templateManager...');
                
                // Force reload templates from storage
                if (window.templateManager.init) {
                    window.templateManager.init();
                    console.log('✅ templateManager reinitialized');
                }
                
                // Force re-render template list
                if (window.templateManager.renderList) {
                    setTimeout(() => {
                        window.templateManager.renderList();
                        console.log('✅ Template list re-rendered');
                    }, 100);
                }
                
                // Force update template info
                if (window.templateManager.updateTemplateInfo) {
                    setTimeout(() => {
                        window.templateManager.updateTemplateInfo();
                        console.log('✅ Template info updated');
                    }, 150);
                }
            }
            
            // 2. Template Type Manager refresh
            if (window.templateTypeManager) {
                console.log('🔄 Refreshing templateTypeManager...');
                
                const currentType = window.templateTypeManager.currentType || 'folders';
                
                // Force switch to trigger refresh
                setTimeout(() => {
                    if (window.templateTypeManager.switchType) {
                        window.templateTypeManager.switchType(currentType);
                        console.log(`✅ Template type refreshed: ${currentType}`);
                    }
                }, 200);
            }
            
            // 3. Force update integration visibility
            setTimeout(() => {
                if (window.updateAllIntegrationOptions) {
                    window.updateAllIntegrationOptions();
                    console.log('✅ Integration options updated');
                }
            }, 250);
            
            console.log('✅ Template force refresh completed');
            
        } catch (error) {
            console.error('❌ Error in force refresh templates:', error);
        }
    },

    // Update user display in UI
    updateUserDisplay() {
        try {
            console.log('🔄 Updating user display in UI...');
            
            // FIXED: Use correct element IDs from index.html instead of wrong CSS selectors
            const userNameElement = document.getElementById('currentUserName');
            const userGroupElement = document.getElementById('currentUserGroup');
            const userAvatarElement = document.getElementById('currentUserAvatar');
            
            if (userNameElement) {
                userNameElement.textContent = this.currentUser || 'User';
                console.log('✅ Updated username display:', this.currentUser);
            } else {
                console.warn('⚠️ currentUserName element not found');
            }
            
            if (userGroupElement) {
                userGroupElement.textContent = this.currentGroup || 'Default';
                console.log('✅ Updated user group display:', this.currentGroup);
            } else {
                console.warn('⚠️ currentUserGroup element not found');
            }
            
            if (userAvatarElement) {
                const initials = this.getUserInitials(this.currentUser);
                const color = this.generateUserColor(this.currentUser);
                
                userAvatarElement.textContent = initials;
                userAvatarElement.style.backgroundColor = color;
                console.log('✅ Updated avatar display:', initials, color);
            } else {
                console.warn('⚠️ currentUserAvatar element not found');
            }
            
            // ENHANCED: Also trigger the global display update function if available
            if (typeof window.updateCurrentUserDisplay === 'function') {
                try {
                    window.updateCurrentUserDisplay();
                    console.log('✅ Global user display update triggered');
                } catch (error) {
                    console.warn('Could not trigger global user display update:', error);
                }
            }
            
            // Trigger user switched event for other UI components
            if (typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('userSwitched', {
                    detail: { 
                        username: this.currentUser,
                        groupname: this.currentGroup 
                    }
                }));
                console.log('🔄 UserSwitched event dispatched');
            }
            
            // ENHANCED: Update template manager shared toggle visibility
            if (window.templateManager && typeof window.templateManager.updateSharedToggleVisibility === 'function') {
                try {
                    window.templateManager.updateSharedToggleVisibility();
                    console.log('✅ Template shared toggle visibility updated');
                } catch (error) {
                    console.warn('Could not update shared toggle visibility:', error);
                }
            }
            
            console.log('✅ User display update completed successfully');
            
        } catch (error) {
            console.error('❌ Error in updateUserDisplay:', error);
        }
    },
    // New function: Initialize with user-specific settings support
    async initWithSettingsSupport() {
        console.log('🔧 Initializing userManager with settings support...');
        
        // Wait for settingsManager
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!window.settingsManager && attempts < maxAttempts) {
            console.log(`🔧 Waiting for settingsManager... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.settingsManager) {
            console.warn('⚠️ settingsManager not available, using simple mode');
            return this.init(); // Fall back to original init
        }
        
        // Check if user management is enabled
        let userManagementEnabled = false;
        try {
            userManagementEnabled = await this.isUserManagementEnabled();
            console.log('🔧 User management enabled:', userManagementEnabled);
        } catch (error) {
            console.warn('⚠️ Error checking user management, defaulting to simple mode:', error);
            return this.init(); // Fall back to original init
        }
        
        if (!userManagementEnabled) {
            console.log('📝 User management disabled - using simple mode with default user settings');
            this.initSimpleMode();
            
            // Still load settings for default user
            if (window.settingsManager.initUserSpecific) {
                await window.settingsManager.initUserSpecific();
            }
            
            return { username: this.currentUser, groupname: this.currentGroup };
        }
        
        // Load user history for autocomplete suggestions
        this.loadUserHistory();
        
        console.log('👥 User management enabled - ALWAYS showing login dialog...');
        
        // CRITICAL: ALWAYS show login dialog when user management is enabled
        // REMOVED: Auto-restore logic that automatically loaded last user
        try {
            console.log('🔑 User management active - showing user selection dialog...');
            const userInfo = await this.showLoginModal();
            
            if (userInfo && userInfo.username) {
                await this.setCurrentUser(userInfo.username, userInfo.groupname);
                
                // Initialize user-specific settings after login
                if (window.settingsManager.initUserSpecific) {
                    await window.settingsManager.initUserSpecific();
                }
                
                console.log('✅ User selected from login modal with settings support');
                return userInfo;
            } else {
                console.log('❌ Login cancelled - disabling user management');
                
                // If cancelled, disable user management and switch to simple mode
                await window.settingsManager.set('general.user_management_enabled', false);
                this.initSimpleMode();
                
                // Load default settings
                if (window.settingsManager.initUserSpecific) {
                    await window.settingsManager.initUserSpecific();
                }
                
                return { username: this.currentUser, groupname: this.currentGroup };
            }
        } catch (error) {
            console.warn('❌ Login modal failed, using simple mode:', error);
            this.initSimpleMode();
            
            // Load default settings
            if (window.settingsManager.initUserSpecific) {
                await window.settingsManager.initUserSpecific();
            }
            
            return { username: this.currentUser, groupname: this.currentGroup };
        }
    },

    // Get last user
    getLastUser() {
        try {
            const stored = localStorage.getItem('metafold_last_user');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Could not load last user:', error);
            return null;
        }
    },

    // Load user history
    loadUserHistory() {
        try {
            const stored = localStorage.getItem('metafold_user_history');
            this.users = stored ? JSON.parse(stored) : [];
            console.log('📚 User history loaded:', this.users);
        } catch (error) {
            console.warn('Could not load user history:', error);
            this.users = [];
        }
    },

    // Add user to history
    addUserToHistory(username, groupname) {
        if (!this.users.includes(username)) {
            this.users.unshift(username);
            
            // Keep only last 10 users
            if (this.users.length > 10) {
                this.users = this.users.slice(0, 10);
            }
            
            try {
                localStorage.setItem('metafold_user_history', JSON.stringify(this.users));
                
                // Also store group mapping
                const groupMappingKey = 'metafold_user_group_mapping';
                let groupMapping = {};
                try {
                    const stored = localStorage.getItem(groupMappingKey);
                    groupMapping = stored ? JSON.parse(stored) : {};
                } catch (e) {
                    groupMapping = {};
                }
                
                groupMapping[username] = groupname;
                localStorage.setItem(groupMappingKey, JSON.stringify(groupMapping));
                
                console.log('📝 User added to history:', username);
            } catch (error) {
                console.warn('Could not save user history:', error);
            }
        }
    },

    // Get user's group
    getUserGroup(username) {
        // Try to get from stored mapping
        try {
            const groupMappingKey = 'metafold_user_group_mapping';
            const stored = localStorage.getItem(groupMappingKey);
            if (stored) {
                const groupMapping = JSON.parse(stored);
                if (groupMapping[username]) {
                    return groupMapping[username];
                }
            }
        } catch (error) {
            console.warn('Could not load group mapping:', error);
        }
        
        // Fallback: if it's the current user, return current group
        if (username === this.currentUser && this.currentGroup) {
            return this.currentGroup;
        }
        
        return 'Default';
    },

    // Generate user color
    generateUserColor(username) {
        if (!username || typeof username !== 'string' || username.length === 0) {
            console.warn('⚠️ generateUserColor called with invalid username:', username);
            return '#7c3aed';
        }
        
        // Generate consistent color from username
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Convert to HSL for better colors
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    },

    // Get user initials
    getUserInitials(username) {
        if (!username || typeof username !== 'string' || username.length === 0) {
            console.warn('⚠️ getUserInitials called with invalid username:', username);
            return '??';
        }
        
        const words = username.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        } else {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
    },

    // Check if user management is enabled (async)
    async isUserManagementEnabled() {
        if (!window.settingsManager) {
            console.warn('⚠️ settingsManager not available for user management check');
            return false;
        }
        
        try {
            if (typeof window.settingsManager.get === 'function') {
                const enabled = await window.settingsManager.get('general.user_management_enabled');
                console.log('🔧 User management enabled check result:', enabled);
                return enabled === true;
            } else {
                // Fallback: check settings directly
                const settings = window.settingsManager.settings || {};
                const enabled = settings['general.user_management_enabled'];
                console.log('🔧 User management enabled check (fallback):', enabled);
                return enabled === true;
            }
        } catch (error) {
            console.warn('⚠️ Error checking user management setting:', error);
            return false;
        }
    },

    // Synchronous version for backward compatibility
    isEnabled() {
        if (!window.settingsManager || !window.settingsManager.settings) {
            return false;
        }
        
        const setting = window.settingsManager.settings['general.user_management_enabled'];
        return setting === true;
    },

    // Get current user info
    getCurrentUserInfo() {
        return {
            username: this.currentUser,
            groupname: this.currentGroup,
            isEnabled: this.isEnabled(),
            isInitialized: this.isInitialized
        };
    },

    // Switch user
    // ENHANCED: Switch user with automatic OMERO logout
       async switchUser(username, groupname) {
            console.log(`🔄 Switching to user: ${username} (${groupname})`);
            
            // STEP 1: Auto OMERO logout before user switch
            await this.autoLogoutOMERO(username, groupname);
            
            // STEP 2: Set new user (original logic)
            await this.setCurrentUser(username, groupname);
            
            // STEP 3: Reinitialize templates for new user (original logic)
            if (window.templateManager) {
                if (window.storage?.initFileStorage) {
                    await window.storage.initFileStorage();
                }
                if (window.templateManager.init) {
                    await window.templateManager.init();
                }
            }
            
            // STEP 4: Load user-specific template preferences (NEW)
            if (window.templateManager && window.templateManager.refreshUserPreferences) {
                try {
                    await window.templateManager.refreshUserPreferences();
                    console.log('✅ Template preferences refreshed for new user');
                } catch (error) {
                    console.warn('⚠️ Could not refresh template preferences for new user:', error);
                }
            }
            
            // STEP 5: Show success message (original logic)
            if (window.app?.showSuccess) {
                window.app.showSuccess(`Switched to user "${username}" (${groupname})!`);
            }
            
            return { username, groupname };
        },

        // ===================================================================================
        // NEW FUNCTION: Simple auto OMERO logout
        // ===================================================================================
        
        /**
         * Simple automatic OMERO logout before user switch
         * Only logs out if there's an active OMERO session
         */
        async autoLogoutOMERO(newUsername, newGroupname) {
            try {
                // Check if OMERO integration is available
                if (!window.omeroUIIntegration) {
                    console.log('ℹ️ OMERO integration not available');
                    return;
                }
                
                // Check if there's an active OMERO session
                if (!window.omeroAuth?.session || !window.omeroAuth.isSessionValid()) {
                    console.log('ℹ️ No active OMERO session');
                    return;
                }
                
                const currentUser = this.currentUser || 'Current User';
                console.log(`🔬 Auto-logout from OMERO (${currentUser}) before switching to ${newUsername}...`);
                
                // Show brief notification
                if (window.app?.showInfo) {
                    window.app.showInfo(`Logging out from OMERO before switching to ${newUsername}...`);
                }
                
                // Perform simple logout
                const result = await window.omeroUIIntegration.logout();
                
                if (result.success) {
                    console.log('✅ Auto OMERO logout successful');
                } else {
                    console.warn('⚠️ Auto OMERO logout failed, but continuing with user switch');
                }
                
            } catch (error) {
                console.warn('⚠️ Auto OMERO logout error (not blocking user switch):', error.message);
                
                // Force cleanup in case of error
                if (window.omeroAuth) {
                    window.omeroAuth.session = null;
                    console.log('🚨 Forced OMERO session cleanup');
                }
            }
        },

    // Enable user management
    async enableUserManagement() {
        if (window.settingsManager) {
            await window.settingsManager.set('general.user_management_enabled', true);
            console.log('👥 User management force-enabled');
        }
    },

    // Show user selection dialog
    async showUserSelection() {
        try {
            if (!window.loginModal) {
                throw new Error('loginModal not available');
            }
            
            console.log('🔧 Showing user selection dialog...');
            const userInfo = await window.loginModal.show();
            
            if (userInfo && userInfo.username) {
                await this.setCurrentUser(userInfo.username, userInfo.groupname);
                
                // Reinitialize templates
                if (window.templateManager && window.templateManager.init) {
                    await window.templateManager.init();
                }
                
                console.log('✅ User selection completed:', userInfo);
                return userInfo;
            } else {
                console.log('❌ User selection cancelled');
                return null;
            }
        } catch (error) {
            console.error('❌ User selection failed:', error);
            throw error;
        }
    },

    // Get user's templates directory
    async getUserTemplatesDirectory() {
        if (!window.electronAPI || !window.electronAPI.getTemplatesDirectory) {
            return null;
        }
        
        try {
            const userInfo = {
                username: this.currentUser,
                groupname: this.currentGroup
            };
            
            const result = await window.electronAPI.getTemplatesDirectory(userInfo);
            
            if (result.success) {
                return result.directory;
            }
        } catch (error) {
            console.warn('Could not get user templates directory:', error);
        }
        
        return null;
    },

    // Debug status
    async debugStatus() {
        const userMgmtEnabled = await this.isUserManagementEnabled();
        const currentInfo = this.getCurrentUserInfo();
        const storageDir = await this.getUserTemplatesDirectory();
        
        console.log('🐛 UserManager Debug Status:');
        console.log('  - User Management Enabled:', userMgmtEnabled);
        console.log('  - Current User:', currentInfo.username);
        console.log('  - Current Group:', currentInfo.groupname);
        console.log('  - Is Initialized:', currentInfo.isInitialized);
        console.log('  - Settings Manager Available:', !!window.settingsManager);
        console.log('  - Templates Directory:', storageDir);
        
        return {
            userManagementEnabled: userMgmtEnabled,
            currentUser: currentInfo,
            hasSettingsManager: !!window.settingsManager,
            templatesDirectory: storageDir
        };
    },
    // Get current user name (simple string)
    getCurrentUser() {
        return this.currentUser || 'Unknown';
    },

    // Get current group name (simple string)  
    getCurrentGroup() {
        return this.currentGroup || 'Unknown';
    },

    // Get current user information (ENHANCED VERSION)
    // Removed duplicate getCurrentUserInfo definition to fix syntax error.

    // ENHANCED: Force update all user-related displays
    forceUpdateAllDisplays() {
        try {
            console.log('🔄 Force updating all user displays...');
            
            // 1. Update main user display
            this.updateUserDisplay();
            
            // 2. Update global display function
            if (typeof window.updateCurrentUserDisplay === 'function') {
                window.updateCurrentUserDisplay();
            }
            
            // 3. Force template refresh to show group templates
            if (window.templateManager) {
                // Update shared toggle visibility
                if (typeof window.templateManager.updateSharedToggleVisibility === 'function') {
                    window.templateManager.updateSharedToggleVisibility();
                }
                
                // Refresh templates to include group templates
                if (typeof window.templateManager.refresh === 'function') {
                    setTimeout(() => {
                        window.templateManager.refresh();
                        console.log('✅ Templates refreshed after user update');
                    }, 100);
                }
            }
            
            // 4. Dispatch user switched event
            window.dispatchEvent(new CustomEvent('userSwitched', {
                detail: { 
                    username: this.currentUser,
                    groupname: this.currentGroup 
                }
            }));
            
            console.log('✅ All user displays force updated');
            
        } catch (error) {
            console.error('❌ Error in forceUpdateAllDisplays:', error);
        }
    }

};

window.userManager = userManager;
console.log('✅ User manager loaded with storage integration');