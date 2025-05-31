// User and Group Management (with group mappings)

const userManager = {
    currentUser: null,
    currentGroup: null,
    users: [],
    groups: [],
    userGroupMappings: {}, // Neue Eigenschaft für User-Group Zuordnungen

    async init() {
        console.log('🔧 userManager.init() called');
        this.loadUsersAndGroups();
        
        const result = await this.showLoginModal();
        console.log('Login result:', result);
        
        // Use mapped group if available, otherwise use provided group
        const mappedGroup = this.userGroupMappings[result.username] || result.groupname;
        this.setCurrentUser(result.username, mappedGroup);
        
        return result;
    },

    async showLoginModal() {
        return new Promise((resolve, reject) => {
            if (window.loginModal) {
                window.loginModal.show().then(resolve).catch(reject);
            } else {
                setTimeout(() => {
                    this.showLoginModal().then(resolve).catch(reject);
                }, 100);
            }
        });
    },

    setCurrentUser(username, groupname) {
        console.log(`🔧 Setting user: "${username}" in group: "${groupname}"`);
        
        if (!username) {
            console.error('❌ Invalid username!');
            return;
        }
        
        if (!groupname) {
            groupname = 'Default';
        }
        
        this.currentUser = username;
        this.currentGroup = groupname;
        this.addUserToHistory(username, groupname);
        this.updateStoragePrefix();
        console.log(`✅ User set: ${username} (${groupname})`);
    },

    addUserToHistory(username, groupname) {
        if (!this.users.includes(username)) {
            this.users.push(username);
            console.log(`➕ Added user to history: ${username}`);
        }
        
        if (!this.groups.includes(groupname)) {
            this.groups.push(groupname);
            console.log(`➕ Added group to history: ${groupname}`);
        }
        
        // Update user-group mapping
        this.userGroupMappings[username] = groupname;
        
        this.saveUsersAndGroups();
    },

    updateStoragePrefix() {
        if (window.storage && window.storage.setUserPrefix) {
            const prefix = `${this.currentGroup}_${this.currentUser}`;
            window.storage.setUserPrefix(prefix);
            console.log(`📦 Storage prefix updated: ${prefix}`);
        }
    },

    loadUsersAndGroups() {
        try {
            const users = JSON.parse(localStorage.getItem('metafold_global_users') || '[]');
            const groups = JSON.parse(localStorage.getItem('metafold_global_groups') || '[]');
            const mappings = JSON.parse(localStorage.getItem('metafold_global_user_group_mappings') || '{}');
            
            this.users = users;
            this.groups = groups;
            this.userGroupMappings = mappings;
            
            console.log(`📊 Loaded ${users.length} users, ${groups.length} groups, ${Object.keys(mappings).length} mappings`);
        } catch (error) {
            console.warn('Error loading users/groups:', error);
            this.users = [];
            this.groups = [];
            this.userGroupMappings = {};
        }
    },

    saveUsersAndGroups() {
        try {
            localStorage.setItem('metafold_global_users', JSON.stringify(this.users));
            localStorage.setItem('metafold_global_groups', JSON.stringify(this.groups));
            localStorage.setItem('metafold_global_user_group_mappings', JSON.stringify(this.userGroupMappings));
            console.log('💾 Saved users, groups and mappings to localStorage');
        } catch (error) {
            console.warn('Error saving users/groups:', error);
        }
    },

    // Get group for user
    getUserGroup(username) {
        return this.userGroupMappings[username] || 'Default';
    },

    // Update user group mapping
    updateUserGroup(username, groupname) {
        this.userGroupMappings[username] = groupname;
        this.saveUsersAndGroups();
        console.log(`🔧 Updated mapping: ${username} -> ${groupname}`);
    },

    generateUserColor(username) {
        if (!username) return '#666';
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    },

    getUserInitials(username) {
        if (!username) return '??';
        return username.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2);
    }
};

window.userManager = userManager;
console.log('✅ userManager loaded (with group mappings)');