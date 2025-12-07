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

    // Initialize user manager with password support
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

        // ✅ NEW: Ensure Admin account exists before showing login
        console.log('🔐 Ensuring Admin account exists...');
        const adminCheckResult = await this.ensureAdminAccountExists();

        if (adminCheckResult.created) {
            console.log('✅ Admin account was auto-created on startup');
        }

        // Check if Password-System is active
        console.log('👥 User management enabled - checking password system...');

        try {
            // Prüfe ob Password-System aktiviert ist
            const passwordSystemEnabled = await this.isPasswordSystemEnabled();
            console.log('🔐 Password system enabled:', passwordSystemEnabled);

            // ✅ FIX: Zeige Login-Modal mit korrektem Password-Parameter
            console.log('🔑 Showing user selection dialog with password support...');
            const userInfo = await this.showLoginModalWithPasswordCheck(passwordSystemEnabled);

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

    // Show login modal with password support
    async showLoginModal() {
        // ✅ FIX: Prüfe Password-System bevor Login-Modal angezeigt wird
        try {
            const passwordSystemEnabled = await this.isPasswordSystemEnabled();
            console.log('🔐 Password system check for login modal:', passwordSystemEnabled);

            return await this.showLoginModalWithPasswordCheck(passwordSystemEnabled);
        } catch (error) {
            console.warn('⚠️ Could not check password system, showing login without password:', error);
            return await this.showLoginModalWithPasswordCheck(false);
        }
    },

    // NEW: Password-aware login modal
    async showLoginModalWithPasswordCheck(requirePassword = false) {
        if (!window.loginModal) {
            throw new Error('loginModal not available');
        }

        console.log('🔐 Showing login modal with password requirement:', requirePassword);

        // ✅ FIX: Korrekte Parameterübergabe
        return await window.loginModal.show(requirePassword);
    },

    async setCurrentUser(username, groupname) {
        console.log(`👤 Setting current user with settings: ${username} (${groupname})`);

        // Store previous user for logging
        const previousUser = this.currentUser;

        // Update user info
        this.currentUser = username;
        this.currentGroup = groupname || 'Default';

        // 🛡️ NEW: Notify Electron about current user (for DevTools control)
        if (window.electronAPI && window.electronAPI.invoke) {
            try {
                await window.electronAPI.invoke('check-admin-user', username);
            } catch (error) {
                console.warn('Failed to notify Electron about user:', error);
            }
        }

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

        // ===== CRITICAL FIX: Switch settings BEFORE changing storage prefix =====
        // Problem: If we change prefix first, saveSettingsUserSpecific() saves to wrong file
        // Solution: Call switchToUser() BEFORE changing prefix
        console.log('🔧 Switching settings BEFORE storage prefix change...');

        if (window.settingsManager && window.settingsManager.switchToUser) {
            try {
                await window.settingsManager.switchToUser(username, groupname);
                console.log('✅ Settings switched for new user');
            } catch (error) {
                console.warn('⚠️ Could not switch settings for new user:', error);
            }
        }
        // ===========================================================================

        // Update storage prefix AFTER settings switch
        // Note: This is also done in settingsManager.switchToUser(), but we do it here too for file storage
        if (window.storage && window.storage.setUserPrefix) {
            const prefix = `${groupname}_${username}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            window.storage.setUserPrefix(prefix);

            // Reinitialize file storage for new user
            if (window.storage.initFileStorage) {
                await window.storage.initFileStorage();
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


    async forceRefreshTemplates() {
        console.log('🔄 FORCE refreshing templates...');

        // Reinitialize templateManager
        console.log('🔄 Reinitializing templateManager...');
        await window.templateManager.init();
        console.log('✅ templateManager reinitialized');

        // Update template list in UI
        window.templateManager.renderList();
        console.log('✅ Template list re-rendered');

        // Update template info
        window.templateManager.updateTemplateInfo();
        console.log('✅ Template info updated');

        // FIXED: Refresh templateTypeManager properly
        console.log('🔄 Refreshing templateTypeManager...');

        if (window.templateTypeManager) {
            // FIXED: Get active category synchronously
            let activeCategory = 'category1'; // Default

            if (window.settingsManager && window.settingsManager.settings) {
                activeCategory = window.settingsManager.settings['templates.active_category'] || 'category1';
            }

            console.log('🔧 Active category:', activeCategory);

            // FIXED: Switch to the active category without async/await issues
            if (window.templateTypeManager.switchType) {
                window.templateTypeManager.switchType(activeCategory);
            }
        }

        console.log('✅ Template force refresh completed');
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
                window.dispatchEvent(new CustomEvent('UserSwitched', {
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
            console.log('📝 User management disabled - attempting auto-login with last user');

            // Try to recover last user
            try {
                const lastUser = this.getLastUser();

                // Only proceed if we have a valid last user who is NOT the default 'User'
                if (lastUser && lastUser.username && lastUser.username !== 'User') {
                    console.log(`📝 Found last user: ${lastUser.username}, checking password protection...`);

                    // Check if password protected
                    const passwordSystemEnabled = await this.isPasswordSystemEnabled();
                    let userHasPassword = false;

                    if (passwordSystemEnabled && window.secureStorage && window.secureStorage.hasUserPassword) {
                        userHasPassword = window.secureStorage.hasUserPassword(lastUser.username);
                    }

                    if (userHasPassword) {
                        console.log('🔐 Last user has password - requesting verification...');

                        // Use loginModal's promptForPassword directly if available
                        if (window.loginModal && typeof window.loginModal.promptForPassword === 'function') {
                            const passwordResponse = await window.loginModal.promptForPassword(lastUser.username);

                            // Check for Switch User request
                            if (typeof passwordResponse === 'object' && passwordResponse && passwordResponse.action === 'switch_user') {
                                console.log('🔄 User requested switch from password prompt - showing login modal');
                                // Force show login modal
                                const userInfo = await this.showLoginModal();
                                if (userInfo && userInfo.username) {
                                    await this.setCurrentUser(userInfo.username, userInfo.groupname);
                                    if (window.settingsManager.initUserSpecific) {
                                        await window.settingsManager.initUserSpecific();
                                    }
                                    return userInfo;
                                }
                                // If cancelled, continues to simple mode below
                            } else if (passwordResponse) {
                                const password = passwordResponse;
                                // Verify password
                                const isValid = await window.secureStorage.verifyUserPassword(lastUser.username, password);

                                if (isValid) {
                                    console.log('✅ Password verified, logging in as last user');

                                    // Set caching for entropy if supported
                                    if (window.settingsManager && window.settingsManager.setUserPasswordForEntropy) {
                                        window.settingsManager.setUserPasswordForEntropy(lastUser.username, password);
                                    }

                                    await this.setCurrentUser(lastUser.username, lastUser.groupname || 'Default');

                                    // Init user specific settings
                                    if (window.settingsManager.initUserSpecific) {
                                        await window.settingsManager.initUserSpecific();
                                    }

                                    // Ensure login modal is closed if it was somehow opened
                                    if (window.loginModal && window.loginModal.close) {
                                        window.loginModal.close();
                                    }

                                    return { username: this.currentUser, groupname: this.currentGroup };
                                } else {
                                    console.warn('❌ Invalid password for last user');
                                    // Fall through to simple mode
                                    if (window.app && window.app.showError) {
                                        window.app.showError('Invalid password. Starting in simple mode.');
                                    } else {
                                        alert('Invalid password. Starting in simple mode.');
                                    }
                                }
                            } else {
                                console.log('❌ Password prompt cancelled');
                                // Fall through to simple mode
                            }
                        }
                    } else {
                        // No password, just auto-login
                        console.log('🔓 No password required, auto-logging in as last user');
                        await this.setCurrentUser(lastUser.username, lastUser.groupname || 'Default');

                        // Init user specific settings
                        if (window.settingsManager.initUserSpecific) {
                            await window.settingsManager.initUserSpecific();
                        }
                        return { username: this.currentUser, groupname: this.currentGroup };
                    }
                }
            } catch (error) {
                console.error('⚠️ Auto-login failed:', error);
            }

            console.log('📝 Fallback to simple mode (User: "User")');
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

        // ✅ KRITISCH: Cache SOFORT löschen beim Switch (SECURITY FIX)
        console.log('🔐 SECURITY: Clearing password cache before switch...');
        if (window.settingsManager && window.settingsManager.clearPasswordCache) {
            window.settingsManager.clearPasswordCache();
            console.log('✅ Password cache cleared for security');
        }

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

    // =================== PASSWORD SYSTEM MANAGEMENT ===================

    /**
     * Automatically initialize Admin account if password system is enabled but Admin doesn't exist
     * This function should be called during userManager.init()
     * @returns {Promise<Object>} - Initialization result
     */
    async ensureAdminAccountExists() {
        try {
            console.log('🔐 Checking if Admin account initialization is needed...');

            // Wait for secureStorage to be available
            let attempts = 0;
            const maxAttempts = 10;

            while (!window.secureStorage && attempts < maxAttempts) {
                console.log(`🔐 Waiting for secureStorage... (attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.secureStorage) {
                console.warn('⚠️ secureStorage not available, skipping Admin check');
                return { success: false, reason: 'secureStorage_unavailable' };
            }

            // Check if password system is enabled
            const passwordSystemEnabled = await this.isPasswordSystemEnabled();

            if (!passwordSystemEnabled) {
                console.log('ℹ️ Password system not enabled, no Admin account needed');
                return { success: true, reason: 'password_system_disabled' };
            }

            // Check if Admin account already exists
            if (window.secureStorage.hasUserPassword('Admin')) {
                console.log('✅ Admin account already exists');
                return { success: true, reason: 'admin_exists' };
            }

            // Admin doesn't exist but password system is enabled - create it!
            console.log('🔐 Admin account missing - creating default Admin account...');

            const initResult = await window.secureStorage.initializeAdminAccount();

            if (initResult.success && initResult.created) {
                console.log('✅ Admin account created successfully');

                // Show alert to user about default password
                if (window.app?.showInfo) {
                    window.app.showInfo(
                        `Admin account was created with default password.\n\n` +
                        `Username: Admin\n` +
                        `Password: admin\n\n` +
                        `⚠️ IMPORTANT: Please change the admin password immediately!`,
                        10000 // Show for 10 seconds
                    );
                } else {
                    // Fallback alert
                    alert(
                        `Admin Account Created\n\n` +
                        `Username: Admin\n` +
                        `Password: admin\n\n` +
                        `⚠️ Please change the admin password immediately!`
                    );
                }

                return {
                    success: true,
                    created: true,
                    reason: 'admin_created',
                    credentials: {
                        username: 'Admin',
                        defaultPassword: 'admin'
                    }
                };
            } else {
                console.warn('⚠️ Admin account already existed');
                return { success: true, reason: 'admin_existed' };
            }

        } catch (error) {
            console.error('❌ Error ensuring Admin account exists:', error);
            return {
                success: false,
                reason: 'error',
                error: error.message
            };
        }
    },

    /**
     * Check if password system is enabled
     * @returns {Promise<boolean>} - True if password system is enabled
     */
    async isPasswordSystemEnabled() {
        if (!window.settingsManager) {
            return false;
        }

        try {
            const enabled = await window.settingsManager.get('security.password_system_enabled');
            return enabled === true;
        } catch (error) {
            console.warn('⚠️ Error checking password system setting:', error);
            return false;
        }
    },

    /**
     * Initialize password system
     * @returns {Promise<Object>} - Initialization result
     */
    async initializePasswordSystem() {
        try {
            console.log('🔐 Initializing password system...');

            // Ensure secure storage is initialized
            if (window.secureStorage && !window.secureStorage.isInitialized) {
                await window.secureStorage.init();
            }

            // Initialize admin account
            const adminResult = await window.secureStorage.initializeAdminAccount();

            if (adminResult.created) {
                console.log('🔐 Default admin account created');
                return {
                    success: true,
                    adminCreated: true,
                    message: `Default admin account created.\nUsername: ${adminResult.username}\nPassword: ${adminResult.defaultPassword}\n\n⚠️ Please change the admin password immediately!`
                };
            } else {
                console.log('🔐 Admin account already exists');
                return {
                    success: true,
                    adminCreated: false,
                    message: 'Password system initialized. Admin account already exists.'
                };
            }

        } catch (error) {
            console.error('🔐 Password system initialization failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Enable password system
     * @returns {Promise<Object>} - Enable result
     */
    async enablePasswordSystem() {
        try {
            if (!window.settingsManager) {
                throw new Error('Settings manager not available');
            }

            // Initialize the password system first
            const initResult = await this.initializePasswordSystem();

            if (!initResult.success) {
                throw new Error('Password system initialization failed: ' + initResult.error);
            }

            // Enable in settings
            await window.settingsManager.set('security.password_system_enabled', true);
            console.log('✅ Password system enabled');

            return {
                success: true,
                message: initResult.message
            };

        } catch (error) {
            console.error('🔐 Enable password system failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Disable password system
     * @returns {Promise<Object>} - Disable result
     */
    async disablePasswordSystem() {
        try {
            if (!window.settingsManager) {
                throw new Error('Settings manager not available');
            }

            await window.settingsManager.set('security.password_system_enabled', false);
            console.log('✅ Password system disabled');

            return {
                success: true,
                message: 'Password system disabled. Users can now login without passwords.'
            };

        } catch (error) {
            console.error('🔐 Disable password system failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // =================== USER PASSWORD MANAGEMENT ===================

    /**
     * Set password for a user
     * @param {string} username - Username
     * @param {string} password - Plain text password
     * @returns {Promise<Object>} - Set result
     */
    async setUserPassword(username, password) {
        try {
            if (!window.secureStorage) {
                throw new Error('Secure storage not available');
            }

            await window.secureStorage.storeUserPassword(username, password);
            console.log(`🔐 Password set for user: ${username}`);

            return {
                success: true,
                message: `Password set for user "${username}"`
            };

        } catch (error) {
            console.error('🔐 Set user password failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Verify user password
     * @param {string} username - Username
     * @param {string} password - Plain text password
     * @returns {Promise<boolean>} - True if password is correct
     */
    async verifyUserPassword(username, password) {
        try {
            if (!window.secureStorage) {
                console.warn('🔐 Secure storage not available for password verification');
                return false;
            }

            return await window.secureStorage.verifyUserPassword(username, password);
        } catch (error) {
            console.error('🔐 User password verification failed:', error);
            return false;
        }
    },

    /**
     * Check if user has password set
     * @param {string} username - Username
     * @returns {boolean} - True if user has password
     */
    hasUserPassword(username) {
        if (!window.secureStorage) {
            return false;
        }

        return window.secureStorage.hasUserPassword(username);
    },

    /**
     * Remove password for a user
     * @param {string} username - Username
     * @returns {Promise<Object>} - Remove result
     */
    async removeUserPassword(username) {
        try {
            if (!window.secureStorage) {
                throw new Error('Secure storage not available');
            }

            const removed = window.secureStorage.removeUserPassword(username);

            if (removed) {
                console.log(`🔐 Password removed for user: ${username}`);
                return {
                    success: true,
                    message: `Password removed for user "${username}"`
                };
            } else {
                throw new Error('Failed to remove password');
            }

        } catch (error) {
            console.error('🔐 Remove user password failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // =================== ENHANCED LOGIN WITH PASSWORD ===================

    /**
     * Enhanced initialization with password support
     * @returns {Promise<Object>} - User info after login
     */
    async initWithPasswordSupport() {
        console.log('🔐 Initializing userManager with password support...');

        // Wait for dependencies
        await this.waitForDependencies();

        // Check if user management is enabled
        const userManagementEnabled = await this.isUserManagementEnabled();
        if (!userManagementEnabled) {
            console.log('📝 User management disabled - using simple mode');
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }

        // Check if password system is enabled
        const passwordSystemEnabled = await this.isPasswordSystemEnabled();

        console.log('🔐 Password system enabled:', passwordSystemEnabled);

        // Load user history for autocomplete
        this.loadUserHistory();

        // Show login dialog (with or without password requirement)
        try {
            console.log('🔑 Showing login dialog...');
            const userInfo = await this.showLoginModal(passwordSystemEnabled);

            if (userInfo && userInfo.username) {
                await this.setCurrentUser(userInfo.username, userInfo.groupname);

                // Initialize user-specific settings
                if (window.settingsManager?.initUserSpecific) {
                    await window.settingsManager.initUserSpecific();
                }

                console.log('✅ User login completed with password support');
                return userInfo;
            } else {
                console.log('❌ Login cancelled - switching to simple mode');
                await window.settingsManager?.set('general.user_management_enabled', false);
                this.initSimpleMode();
                return { username: this.currentUser, groupname: this.currentGroup };
            }
        } catch (error) {
            console.warn('❌ Login failed, using simple mode:', error);
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }
    },

    /**
     * Wait for dependencies to be available
     * @returns {Promise<void>}
     */
    async waitForDependencies() {
        const dependencies = ['settingsManager', 'secureStorage'];
        const maxAttempts = 20;

        for (const dep of dependencies) {
            let attempts = 0;
            while (!window[dep] && attempts < maxAttempts) {
                console.log(`🔧 Waiting for ${dep}... (attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window[dep]) {
                console.warn(`⚠️ ${dep} not available after ${maxAttempts} attempts`);
            } else {
                console.log(`✅ ${dep} is available`);
            }
        }
    },

    /**
     * Show login modal with optional password requirement
     * @param {boolean} requirePassword - Whether password is required
     * @returns {Promise<Object>} - User info
     */
    async showLoginModal(requirePassword = false) {
        if (!window.loginModal) {
            throw new Error('loginModal not available');
        }

        // Pass password requirement to login modal
        return await window.loginModal.show(requirePassword);
    },

    /**
     * Enhanced user switch with password verification
     * @param {string} username - Username
     * @param {string} groupname - Group name  
     * @param {string} password - Optional password for verification
     * @returns {Promise<Object>} - Switch result
     */
    async switchUserWithPassword(username, groupname, password = null) {
        try {
            console.log(`🔄 Switching to user with password check: ${username} (${groupname})`);

            // Check if password system is enabled
            const passwordEnabled = await this.isPasswordSystemEnabled();

            if (passwordEnabled) {
                // Check if user has a password set
                const hasPassword = this.hasUserPassword(username);

                if (hasPassword) {
                    // Verify password if provided
                    if (!password) {
                        throw new Error('Password required for this user');
                    }

                    const isValidPassword = await this.verifyUserPassword(username, password);
                    if (!isValidPassword) {
                        throw new Error('Invalid password');
                    }

                    console.log('✅ Password verified successfully');
                } else {
                    console.log('ℹ️ User has no password set, skipping verification');
                }
            }

            // Proceed with normal user switch
            return await this.switchUser(username, groupname);

        } catch (error) {
            console.error('🔐 User switch with password failed:', error);
            throw error;
        }
    },

    // =================== PASSWORD SYSTEM STATUS ===================

    /**
     * Get comprehensive password system status
     * @returns {Promise<Object>} - Complete status
     */
    async getPasswordSystemStatus() {
        const passwordEnabled = await this.isPasswordSystemEnabled();
        const userManagementEnabled = await this.isUserManagementEnabled();

        let secureStorageStatus = null;
        if (window.secureStorage) {
            secureStorageStatus = window.secureStorage.getPasswordSystemStatus();
        }

        const users = this.users || [];
        const currentUser = this.getCurrentUser();

        return {
            userManagement: {
                enabled: userManagementEnabled,
                currentUser: currentUser,
                totalUsers: users.length,
                users: users
            },
            passwordSystem: {
                enabled: passwordEnabled,
                initialized: !!window.secureStorage?.isInitialized,
                adminExists: window.secureStorage?.hasUserPassword('Admin') || false
            },
            secureStorage: secureStorageStatus,
            recommendations: this.getPasswordSystemRecommendations(passwordEnabled, users)
        };
    },

    /**
     * Get recommendations for password system setup
     * @param {boolean} passwordEnabled - Whether password system is enabled
     * @param {Array} users - List of users
     * @returns {Array} - List of recommendations
     */
    getPasswordSystemRecommendations(passwordEnabled, users) {
        const recommendations = [];

        if (!passwordEnabled) {
            recommendations.push({
                type: 'info',
                message: 'Password system is disabled. Users can login without passwords.'
            });
        } else {
            if (!window.secureStorage?.hasUserPassword('Admin')) {
                recommendations.push({
                    type: 'warning',
                    message: 'Admin account needs to be initialized.'
                });
            }

            const usersWithoutPassword = users.filter(user =>
                user !== 'Admin' && !window.secureStorage?.hasUserPassword(user)
            );

            if (usersWithoutPassword.length > 0) {
                recommendations.push({
                    type: 'info',
                    message: `${usersWithoutPassword.length} user(s) have no password set: ${usersWithoutPassword.join(', ')}`
                });
            }
        }

        return recommendations;
    },

    // =================== DEBUG HELPERS ===================

    /**
     * Debug password system status (console output)
     */
    async debugPasswordSystem() {
        const status = await this.getPasswordSystemStatus();

        console.log('🔐 Password System Debug Status:');
        console.log('================================');
        console.log('User Management:', status.userManagement);
        console.log('Password System:', status.passwordSystem);
        console.log('Secure Storage:', status.secureStorage);
        console.log('Recommendations:', status.recommendations);

        return status;
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

    // =================== ADMIN DEBUG FUNCTIONS ===================

    /**
     * Debug function to check Admin account status
     * Can be called from browser console: await window.userManager.debugAdminStatus()
     * @returns {Promise<Object>} - Complete Admin status
     */
    async debugAdminStatus() {
        console.log('🔐 =================== ADMIN STATUS DEBUG ===================');

        const status = {
            timestamp: new Date().toISOString(),
            userManagement: null,
            passwordSystem: null,
            adminAccount: null,
            recommendations: []
        };

        try {
            // Check User Management
            const userMgmtEnabled = await this.isUserManagementEnabled();
            status.userManagement = {
                enabled: userMgmtEnabled,
                currentUser: this.currentUser,
                currentGroup: this.currentGroup
            };

            console.log('👥 User Management:', status.userManagement);

            // Check Password System
            if (window.settingsManager) {
                const passwordSystemEnabled = await window.settingsManager.get('security.password_system_enabled');
                status.passwordSystem = {
                    enabled: passwordSystemEnabled === true,
                    settingsManager: '✅ Available'
                };
            } else {
                status.passwordSystem = {
                    enabled: false,
                    settingsManager: '❌ Not Available'
                };
            }

            console.log('🔐 Password System:', status.passwordSystem);

            // Check Admin Account
            if (window.secureStorage) {
                const adminExists = window.secureStorage.hasUserPassword('Admin');

                status.adminAccount = {
                    exists: adminExists,
                    secureStorage: '✅ Available'
                };

                if (adminExists) {
                    console.log('✅ Admin account exists');

                    // Try to verify default password
                    const defaultPasswordWorks = await window.secureStorage.verifyUserPassword('Admin', 'admin');
                    status.adminAccount.usesDefaultPassword = defaultPasswordWorks;

                    if (defaultPasswordWorks) {
                        status.recommendations.push({
                            type: 'warning',
                            message: 'Admin is still using default password "admin" - CHANGE IT IMMEDIATELY!'
                        });
                    }
                } else {
                    console.log('❌ Admin account does NOT exist');
                    status.adminAccount.message = 'Admin account missing - needs to be created';

                    if (status.passwordSystem.enabled) {
                        status.recommendations.push({
                            type: 'critical',
                            message: 'Password system is enabled but Admin account missing - call await window.userManager.ensureAdminAccountExists()'
                        });
                    }
                }
            } else {
                status.adminAccount = {
                    exists: false,
                    secureStorage: '❌ Not Available'
                };
            }

            console.log('🔐 Admin Account:', status.adminAccount);

            // Generate recommendations
            if (!userMgmtEnabled && status.passwordSystem.enabled) {
                status.recommendations.push({
                    type: 'info',
                    message: 'Password system is enabled but user management is disabled - inconsistent state'
                });
            }

            if (userMgmtEnabled && !status.passwordSystem.enabled) {
                status.recommendations.push({
                    type: 'info',
                    message: 'User management enabled without password system - users can login without passwords'
                });
            }

            // Print recommendations
            if (status.recommendations.length > 0) {
                console.log('\n📋 Recommendations:');
                status.recommendations.forEach((rec, i) => {
                    const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                    console.log(`${i + 1}. ${icon} ${rec.message}`);
                });
            }

            console.log('\n🔐 =================== END DEBUG ===================');

            return status;

        } catch (error) {
            console.error('❌ Error in debugAdminStatus:', error);
            status.error = error.message;
            return status;
        }
    },

    /**
     * Quick fix function to create Admin account if missing
     * Can be called from browser console: await window.userManager.quickFixAdminAccount()
     * @returns {Promise<Object>} - Fix result
     */
    async quickFixAdminAccount() {
        console.log('🔧 Quick Fix: Creating Admin account...');

        try {
            // Check if secureStorage is available
            if (!window.secureStorage) {
                throw new Error('secureStorage not available - cannot create Admin account');
            }

            // Initialize if needed
            if (!window.secureStorage.isInitialized) {
                await window.secureStorage.init();
            }

            // Create Admin account
            const result = await window.secureStorage.initializeAdminAccount();

            if (result.created) {
                console.log('✅ Admin account created successfully!');
                console.log('📋 Username: Admin');
                console.log('📋 Password: admin');
                console.log('⚠️ IMPORTANT: Change the password immediately!');

                alert(
                    'Admin Account Created!\n\n' +
                    'Username: Admin\n' +
                    'Password: admin\n\n' +
                    '⚠️ Please change the admin password immediately!'
                );

                return {
                    success: true,
                    message: 'Admin account created',
                    username: 'Admin',
                    defaultPassword: 'admin'
                };
            } else {
                console.log('ℹ️ Admin account already exists');
                return {
                    success: true,
                    message: 'Admin account already exists'
                };
            }

        } catch (error) {
            console.error('❌ Quick fix failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

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
            window.dispatchEvent(new CustomEvent('UserSwitched', {
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