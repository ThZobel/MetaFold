// User Manager - FIXED for async settingsManager

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

    // FIXED: Initialization with better error handling
	async init() {
		console.log('🔧 Initializing userManager...');
		
		// ROBUST: Wait for settingsManager to be available
		let attempts = 0;
		const maxAttempts = 10;
		
		while (!window.settingsManager && attempts < maxAttempts) {
			console.log(`🔧 Waiting for settingsManager... (attempt ${attempts + 1}/${maxAttempts})`);
			await new Promise(resolve => setTimeout(resolve, 100));
			attempts++;
		}
		
		if (!window.settingsManager) {
			console.warn('⚠️ settingsManager not available after waiting, using simple mode');
			this.initSimpleMode();
			return { username: this.currentUser, groupname: this.currentGroup };
		}
		
		// FIXED: Use async settings access with better error handling
		let userManagementEnabled = false;
		try {
			userManagementEnabled = await this.isUserManagementEnabled();
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

		console.log('👥 User management enabled - loading user history and showing login...');
		
		// Load user history
		this.loadUserHistory();
		
		// FIXED: ALWAYS show login dialog when user management is enabled
		// Remove the check for existing user - always prompt for user selection
		console.log('🔑 User management active - showing user selection dialog...');
		
		try {
			const userInfo = await this.showLoginModal();
			await this.setCurrentUser(userInfo.username, userInfo.groupname);
			return userInfo;
		} catch (error) {
			console.warn('❌ Login cancelled or failed, switching to simple mode:', error);
			
			// If login fails or is cancelled, disable user management and use simple mode
			try {
				await window.settingsManager.set('general.user_management_enabled', false);
				console.log('🔧 Auto-disabled user management due to cancelled login');
			} catch (settingsError) {
				console.warn('Could not disable user management setting:', settingsError);
			}
			
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

    async setCurrentUser(username, groupname) {
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
        // FIXED: Handle null/undefined username
        if (!username || typeof username !== 'string' || username.length === 0) {
            console.warn('⚠️ generateUserColor called with invalid username:', username);
            return '#7c3aed'; // Default purple color
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

    getUserInitials(username) {
        // FIXED: Handle null/undefined username
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

    // FIXED: Check if user management is enabled (async) - More robust
	async isUserManagementEnabled() {
		if (!window.settingsManager) {
			console.warn('⚠️ settingsManager not available for user management check');
			return false;
		}
		
		try {
			// ROBUST: Handle both initialized and uninitialized settingsManager
			if (typeof window.settingsManager.get === 'function') {
				const enabled = await window.settingsManager.get('general.user_management_enabled');
				console.log('🔧 User management enabled check result:', enabled);
				return enabled === true;
			} else {
				// Fallback: check settings directly if get method not available
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

    // LEGACY: Synchronous version for backward compatibility
    isEnabled() {
        // This is a synchronous version that should be avoided
        // Use isUserManagementEnabled() instead for new code
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
            isEnabled: this.isEnabled(), // Using sync version for compatibility
            isInitialized: this.isInitialized
        };
    },

    // Switch user (used by user management modal) - FIXED
    async switchUser(username, groupname) {
        console.log(`🔄 Switching to user: ${username} (${groupname})`);
        
        // Set new user
        await this.setCurrentUser(username, groupname);
        
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

    // Force user management mode (for testing) - FIXED
    async enableUserManagement() {
        if (window.settingsManager) {
            await window.settingsManager.set('general.user_management_enabled', true);
            console.log('👥 User management force-enabled');
        }
    },

	// ENHANCED: Show user selection dialog with better error handling
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
					window.templateManager.init();
				}
				
				console.log('✅ User selection completed:', userInfo);
				return userInfo;
			} else {
				console.log('❌ User selection cancelled');
				return null;
			}
		} catch (error) {
			console.error('❌ User selection failed:', error);
			throw error; // Re-throw for proper error handling upstream
		}
	},

    // DEBUG: Show current status
    async debugStatus() {
        const userMgmtEnabled = await this.isUserManagementEnabled();
        const currentInfo = this.getCurrentUserInfo();
        
        console.log('🐛 UserManager Debug Status:');
        console.log('  - User Management Enabled:', userMgmtEnabled);
        console.log('  - Current User:', currentInfo.username);
        console.log('  - Current Group:', currentInfo.groupname);
        console.log('  - Is Initialized:', currentInfo.isInitialized);
        console.log('  - Settings Manager Available:', !!window.settingsManager);
        
        return {
            userManagementEnabled: userMgmtEnabled,
            currentUser: currentInfo,
            hasSettingsManager: !!window.settingsManager
        };
    }
};

window.userManager = userManager;
console.log('✅ userManager loaded (FIXED for async settingsManager)');