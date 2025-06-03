// User Manager (Enhanced with better settings integration)

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

    async init() {
        console.log('🔧 Initializing userManager...');
        
        if (!window.settingsManager) {
            console.warn('⚠️ settingsManager not available, using simple mode');
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }
        
        // Check if user management is enabled in settings
        const userManagementEnabled = window.settingsManager.isUserManagementEnabled();
        
        if (!userManagementEnabled) {
            console.log('📝 User management disabled - using simple mode');
            this.initSimpleMode();
            return { username: this.currentUser, groupname: this.currentGroup };
        }

        console.log('👥 User management enabled - checking for existing user...');
        
        // Load user history
        this.loadUserHistory();
        
        // Check if we have a current user stored
        const lastUser = this.getLastUser();
        if (lastUser && lastUser.username) {
            console.log('📋 Found last user:', lastUser.username);
            this.currentUser = lastUser.username;
            this.currentGroup = lastUser.groupname || 'Default';
            this.isInitialized = true;
            
            // Update storage prefix for this user
            if (window.storage && window.storage.setUserPrefix) {
                window.storage.setUserPrefix(this.currentUser);
            }
            
            return lastUser;
        }

        // No user found, show login modal
        console.log('❓ No user found, showing login...');
        try {
            const userInfo = await this.showLoginModal();
            this.setCurrentUser(userInfo.username, userInfo.groupname);
            return userInfo;
        } catch (error) {
            console.warn('Login cancelled or failed, using default user');
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

    async showLoginModal() {
        if (!window.loginModal) {
            throw new Error('loginModal not available');
        }
        return await window.loginModal.show();
    },

    setCurrentUser(username, groupname) {
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
            window.storage.setUserPrefix(username);
        }

        console.log(`✅ Current user set: ${username} (${groupname})`);
    },

    getLastUser() {
        try {
            const stored = localStorage.getItem('metafold_last_user');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Could not load last user:', error);
            return null;
        }
    },

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

    addUserToHistory(username, groupname) {
        if (!this.users.includes(username)) {
            this.users.unshift(username);
            
            // Keep only last 10 users
            if (this.users.length > 10) {
                this.users = this.users.slice(0, 10);
            }
            
            try {
                localStorage.setItem('metafold_user_history', JSON.stringify(this.users));
                
                // Also store group mapping for userManagementModal
                if (window.userManagementModal && window.userManagementModal.userGroupMap) {
                    window.userManagementModal.userGroupMap[username] = groupname;
                    window.userManagementModal.saveUserGroupMapping();
                }
                
                console.log('📝 User added to history:', username);
            } catch (error) {
                console.warn('Could not save user history:', error);
            }
        }
    },

    getUserGroup(username) {
        // Try to get from userManagementModal first
        if (window.userManagementModal && window.userManagementModal.userGroupMap) {
            const group = window.userManagementModal.userGroupMap[username];
            if (group) {
                return group;
            }
        }
        
        // Fallback: if it's the current user, return current group
        if (username === this.currentUser && this.currentGroup) {
            return this.currentGroup;
        }
        
        return 'Default';
    },

    generateUserColor(username) {
        // Generate consistent color from username
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Convert to HSL for better colors
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    },

    getUserInitials(username) {
        if (!username) return '??';
        
        const words = username.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        } else {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
    },

    // Check if user management is enabled
    isEnabled() {
        return window.settingsManager?.isUserManagementEnabled() || false;
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

    // Switch user (used by user management modal)
    async switchUser(username, groupname) {
        console.log(`🔄 Switching to user: ${username} (${groupname})`);
        
        // Set new user
        this.setCurrentUser(username, groupname);
        
        // Reinitialize templates for new user
        if (window.templateManager && window.templateManager.init) {
            window.templateManager.init();
        }
        
        // Show success message
        if (window.app && window.app.showSuccess) {
            window.app.showSuccess(`Switched to user "${username}" (${groupname})!`);
        }
        
        return { username, groupname };
    },

    // Force user management mode (for testing)
    enableUserManagement() {
        if (window.settingsManager) {
            window.settingsManager.set('general.user_management_enabled', true);
            console.log('👥 User management force-enabled');
        }
    },

    // Show user selection dialog (manual trigger)
    async showUserSelection() {
        try {
            const userInfo = await this.showLoginModal();
            this.setCurrentUser(userInfo.username, userInfo.groupname);
            
            // Reinitialize templates
            if (window.templateManager && window.templateManager.init) {
                window.templateManager.init();
            }
            
            return userInfo;
        } catch (error) {
            console.warn('User selection cancelled:', error);
            return null;
        }
    }
};

window.userManager = userManager;
console.log('✅ userManager loaded (Enhanced with settings integration)');