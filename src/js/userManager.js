// User Manager (respects user management setting)

// Remove existing userManager if already defined
if (window.userManager) {
    console.log('🔧 Removing existing userManager');
    delete window.userManager;
}

const userManager = {
    currentUser: null,
    currentGroup: null,
    users: [],

    async init() {
        console.log('🔧 Initializing userManager...');
        
        // Check if user management is enabled in settings
        const userManagementEnabled = window.settingsManager?.isUserManagementEnabled();
        
        if (!userManagementEnabled) {
            console.log('📝 User management disabled - using simple mode');
            // Use default user without prompting
            this.currentUser = 'User';
            this.currentGroup = 'Default';
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
            this.currentUser = 'User';
            this.currentGroup = 'Default';
            return { username: this.currentUser, groupname: this.currentGroup };
        }
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
            } catch (error) {
                console.warn('Could not save user history:', error);
            }
        }
    },

    getUserGroup(username) {
        // Try to get from userManagementModal first
        if (window.userManagementModal && window.userManagementModal.userGroupMap) {
            return window.userManagementModal.userGroupMap[username] || 'Default';
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
    }
};

window.userManager = userManager;
console.log('✅ userManager loaded (with settings integration)');